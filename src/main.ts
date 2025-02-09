/**
 * Represents the name of a resource.
 */
type ResourceName = string;

/**
 * Represents the name of an action that can be performed on a resource.
 */
type ActionName = string;

/**
 * Represents the configuration for an action, which is currently null.
 */
type ActionConfig = null;

/**
 * Defines the base configuration structure for resources and actions.
 */
export interface ResourceConfig {
  resources: Record<
    ResourceName,
    {
      /** The type of data associated with the resource. */
      dataType: unknown;
      /** The available actions for the resource. */
      actions: Record<ActionName, ActionConfig>;
    }
  >;
}

/**
 * Defines role-based permissions for given roles, configuration, and authenticated user type.
 */
export type ResourceActionPermissionsMap<
  Roles extends string,
  Config extends ResourceConfig,
  AuthUser
> = {
  [role in Roles]: ResourceActionPermissions<Config, AuthUser>;
};

/**
 * Represents permissions for each resource and its actions.
 */
type ResourceActionPermissions<
  Config extends ResourceConfig,
  AuthUser
> = Partial<{
  [R in keyof Config["resources"]]: {
    [A in keyof Config["resources"][R]["actions"]]: PermissionValidation<
      AuthUser,
      Config["resources"][R]["dataType"]
    >;
  };
}>;

/**
 * Defines a permission check mechanism, which can be a boolean or a function with a description.
 */
type PermissionValidation<AuthUser, DataType> =
  | boolean
  | {
      /** Function to check if a user has permission based on data. */
      checkFunction: (user: AuthUser, resourceData?: DataType) => boolean;
      /** Description of the permission check logic. */
      description: string;
    };

/**
 * Defines role modes: single role or multi-role.
 */
type RoleModeBase = "multiRole" | "singleRole";

/**
 * Represents an authenticated user with either single or multiple roles.
 */
type BaseAuthUser<
  Roles extends string,
  RoleMode extends RoleModeBase
> = RoleMode extends "singleRole"
  ? SingleRoleAuthUser<Roles>
  : MultipleRolesAuthUser<Roles>;

/**
 * Represents a user with a single role.
 */
type SingleRoleAuthUser<Roles extends string> = {
  role: Roles;
};

/**
 * Represents a user with multiple roles.
 */
type MultipleRolesAuthUser<Roles extends string> = {
  roles: Roles[];
};

/**
 * Checks if a user has multiple roles.
 */
function isMultiRoleUser<Roles extends string>(
  user: BaseAuthUser<Roles, RoleModeBase>,
  userRoleMode: RoleModeBase
): user is MultipleRolesAuthUser<Roles> {
  return userRoleMode === "multiRole";
}

/**
 * Represents the return type for the `genPermit` function, providing permission checks and documentation generation.
 */
type GenPermitReturn<
  Roles extends string,
  RoleMode extends RoleModeBase,
  AuthUser extends BaseAuthUser<Roles, RoleMode>,
  Config extends ResourceConfig
> = {
  /**
   * Checks if a user has permission to perform an action on a resource.
   */
  hasPermission: <
    R extends keyof Config["resources"],
    A extends keyof Config["resources"][R]["actions"]
  >(
    user: AuthUser | null,
    resource: R,
    action: A,
    data?: Config["resources"][R]["dataType"]
  ) => boolean;

  /**
   * Generates documentation for the (Attribute-Based Access Control) configuration.
   */
  generatePermissionDocs: () => PermissionDocumentationReport;
};

/**
 * Represents documentation configuration with action descriptions.
 */
export type ActionDescriptionConfig<C extends ResourceConfig> = {
  actionDescriptions: {
    [R in keyof C["resources"]]: {
      [A in keyof C["resources"][R]["actions"]]: {
        description: string;
      };
    };
  };
};

/**
 * Generates permission checks and documentation based on roles, configuration, and documentation configuration.
 * @param userRoleMode The mode for user roles: single or multi-role.
 * @param permissionsConfig The configuration for role-based permissions.
 * @param actionDocsConfig The configuration for action descriptions.
 * @returns Permission checks and documentation generation.
 * @template Roles The type of roles.
 * @template AuthUser The type of authenticated user.
 * @template Config The type of resource configuration.
 * @template RoleMode The type of role mode.
 */
export function bakeAuthorization<
  Roles extends string,
  AuthUser extends BaseAuthUser<Roles, RoleMode>,
  Config extends ResourceConfig,
  RoleMode extends RoleModeBase
>({
  userRoleMode,
  permissionsConfig,
  actionDocsConfig,
}: {
  userRoleMode: RoleMode;
  permissionsConfig: ResourceActionPermissionsMap<Roles, Config, AuthUser>;
  actionDocsConfig: ActionDescriptionConfig<Config>;
}): GenPermitReturn<Roles, RoleMode, AuthUser, Config> {
  /**
   * Determines if a user has permission for a given action on a resource.
   * @param authUser The authenticated user.
   * @param resource The resource to check.
   * @param action The action to check.
   * @param resourceData The data associated with the resource.
   * @returns True if the user has permission; otherwise, false.
   */
  function hasPermission<
    R extends keyof Config["resources"],
    A extends keyof Config["resources"][R]["actions"]
  >(
    authUser: AuthUser | null,
    resource: R,
    action: A,
    resourceData?: Config["resources"][R]["dataType"]
  ): boolean {
    if (!authUser) return false;

    if (isMultiRoleUser(authUser, userRoleMode)) {
      if (!authUser.roles || authUser.roles.length === 0) return false;
      return authUser.roles.some((role) => {
        const PermissionValidation =
          permissionsConfig[role]?.[resource]?.[action] ?? false;
        return typeof PermissionValidation === "boolean"
          ? PermissionValidation
          : PermissionValidation.checkFunction?.(authUser, resourceData) ??
              false;
      });
    }

    if (!authUser.role) return false;
    const PermissionValidation =
      permissionsConfig[authUser.role]?.[resource]?.[action] ?? false;
    return typeof PermissionValidation === "boolean"
      ? PermissionValidation
      : PermissionValidation.checkFunction?.(authUser, resourceData) ?? false;
  }

  /**
   * Generates documentation report based on the configuration.
   * @returns The documentation report.
   */
  function generatePermissionDocs(): PermissionDocumentationReport {
    const roles = Object.keys(permissionsConfig) as Roles[];
    const mapResourceNameToActions = new Map<ResourceName, Set<ActionName>>();

    for (const r of roles) {
      const roleConfig = permissionsConfig[r];
      const roleResourceNames = Object.keys(roleConfig) as ResourceName[];
      for (const rn of roleResourceNames) {
        const resourceRoleConfig = roleConfig[rn];
        const resourceActionNames = Object.keys(
          resourceRoleConfig as object
        ) as ActionName[];

        if (!mapResourceNameToActions.has(rn)) {
          mapResourceNameToActions.set(rn, new Set());
        }

        const actionSet = mapResourceNameToActions.get(rn);
        for (const an of resourceActionNames) {
          actionSet?.add(an);
        }
      }
    }

    const report: PermissionDocumentationReport["report"] = {};

    for (const [resource, actions] of mapResourceNameToActions) {
      report[resource] = {};
      for (const action of actions) {
        report[resource][action] = {};
        for (const role of roles) {
          const roleConfig = permissionsConfig[role];
          const resourceConfig = roleConfig[resource];
          if (!resourceConfig) {
            report[resource][action][role] = "Denied";
            continue;
          }

          const PermissionValidation = resourceConfig[action];
          if (
            PermissionValidation == null ||
            PermissionValidation == undefined
          ) {
            report[resource][action][role] = "Denied";
            continue;
          }

          if (typeof PermissionValidation === "boolean") {
            report[resource][action][role] = PermissionValidation
              ? "Allowed"
              : "Denied";
          } else {
            report[resource][action][
              role
            ] = `Conditional: ${PermissionValidation.description}`;
          }
        }
      }
    }

    const reportRows: PermissionDocumentationReport["reportRows"] = [];
    for (const resource of Object.keys(report)) {
      for (const action of Object.keys(report[resource])) {
        const permissionDescription =
          actionDocsConfig.actionDescriptions[resource][action].description;
        const row: PermissionDocumentationReport["reportRows"][number] = [
          resource,
          action,
          permissionDescription,
        ];

        for (const role of roles) {
          row.push(report[resource][action][role]);
        }

        reportRows.push(row);
      }
    }

    const documentation: PermissionDocumentationReport = {
      userRoleMode,
      report,
      reportHeader: [
        {
          columnName: "resourceArea",
          isRole: false,
        },
        {
          columnName: "permission",
          isRole: false,
        },
        {
          columnName: "permissionDescription",
          isRole: false,
        },
        ...roles.map((role) => ({
          columnName: role,
          isRole: true,
        })),
      ],
      reportRows,
    };

    return documentation;
  }

  return {
    hasPermission,
    generatePermissionDocs,
  };
}

/**
 * Represents the status of an action-role relationship.
 */
export type ActionPermissionStatus =
  | "Allowed"
  | "Denied"
  | `Conditional: ${string}`;

/**
 * Defines the structure for the documentation.
 */
export type PermissionDocumentationReport = {
  userRoleMode: RoleModeBase;
  report: Record<
    ResourceName,
    Record<ActionName, Record<string, ActionPermissionStatus>>
  >;
  reportHeader: Array<{
    columnName: string;
    isRole: boolean;
  }>;
  reportRows: Array<[string, string, string, ...ActionPermissionStatus[]]>;
};

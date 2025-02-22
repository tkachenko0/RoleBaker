type ResourceName = string;

type ActionName = string;

export interface ResourceConfig {
  resources: Record<
    ResourceName,
    {
      dataType: unknown;
      action: string;
    }
  >;
}

export type ResourceActionPermissionsMap<
  Roles extends string,
  Config extends ResourceConfig,
  AuthUser
> = {
  [role in Roles]: ResourceActionPermissions<Config, AuthUser>;
};

type ResourceActionPermissions<
  Config extends ResourceConfig,
  AuthUser
> = Partial<{
  [R in keyof Config["resources"]]: {
    [A in Config["resources"][R]["action"]]: PermissionValidation<
      AuthUser,
      Config["resources"][R]["dataType"]
    >;
  };
}>;

type PermissionValidation<AuthUser, DataType> =
  | boolean
  | {
      checkFunction: (user: AuthUser, resourceData?: DataType) => boolean;
      description?: string;
    };

type RoleModeBase = "multiRole" | "singleRole";

type BaseAuthUser<
  Roles extends string,
  RoleMode extends RoleModeBase
> = RoleMode extends "singleRole"
  ? SingleRoleAuthUser<Roles>
  : MultipleRolesAuthUser<Roles>;

type SingleRoleAuthUser<Roles extends string> = {
  role: Roles;
};

type MultipleRolesAuthUser<Roles extends string> = {
  roles: Roles[];
};

function isMultiRoleUser<Roles extends string>(
  user: BaseAuthUser<Roles, RoleModeBase>,
  userRoleMode: RoleModeBase
): user is MultipleRolesAuthUser<Roles> {
  return userRoleMode === "multiRole";
}

type GenPermitReturn<
  Roles extends string,
  RoleMode extends RoleModeBase,
  AuthUser extends BaseAuthUser<Roles, RoleMode>,
  Config extends ResourceConfig
> = {
  hasPermission: <
    R extends keyof Config["resources"],
    A extends Config["resources"][R]["action"]
  >(
    user: AuthUser | null,
    resource: R,
    action: A,
    data?: Config["resources"][R]["dataType"]
  ) => boolean;

  generatePermissionDocs: () => PermissionDocumentationReport;
};

export type ActionDescriptionConfig<C extends ResourceConfig> = {
  [R in keyof C["resources"]]: {
    [A in C["resources"][R]["action"]]: string;
  };
};

export function bakeAuthorization<
  Roles extends string,
  AuthUser extends BaseAuthUser<Roles, RoleMode>,
  Config extends ResourceConfig,
  RoleMode extends RoleModeBase = AuthUser extends SingleRoleAuthUser<Roles>
    ? "singleRole"
    : "multiRole"
>({
  userRoleMode,
  permissionsConfig,
  actionDocs,
}: {
  userRoleMode: RoleMode;
  permissionsConfig: ResourceActionPermissionsMap<Roles, Config, AuthUser>;
  actionDocs?: ActionDescriptionConfig<Config>;
}): GenPermitReturn<Roles, RoleMode, AuthUser, Config> {
  function hasPermission<
    R extends keyof Config["resources"],
    A extends Config["resources"][R]["action"]
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

          const PermissionValidation =
            resourceConfig[action as keyof typeof resourceConfig];
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
            report[resource][action][role] = `Conditional: ${
              PermissionValidation.description || "No description provided"
            }`;
          }
        }
      }
    }

    const reportRows: PermissionDocumentationReport["reportRows"] = [];
    for (const resource of Object.keys(report)) {
      for (const action of Object.keys(report[resource])) {
        const actionDescription = !!actionDocs
          ? actionDocs[resource][action as keyof typeof actionDocs.resource]
          : "No description provided";
        const row: PermissionDocumentationReport["reportRows"][number] = [
          resource,
          action,
          actionDescription,
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

export type ActionPermissionStatus =
  | "Allowed"
  | "Denied"
  | `Conditional: ${string}`;

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

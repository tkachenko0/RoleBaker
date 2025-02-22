import { bakeAuthorization } from "../src";
import { UserRoles, MyResourceConfig, ACTIONS_DOC, ToDoModel } from "./setup";

interface AuthUser {
  userId: string;
  roles: UserRoles[];
  // other user properties
}

const { hasPermission } = bakeAuthorization<
  UserRoles,
  AuthUser,
  MyResourceConfig
>({
  userRoleMode: "multiRole",
  actionDocs: ACTIONS_DOC,
  permissionsConfig: {
    admin: {
      todos: { read: true, write: true, delete: true },
    },
    moderator: {
      todos: { read: true, write: false, delete: false },
    },
    user: {
      todos: {
        read: true,
        write: false,
        delete: {
          checkFunction: (authUser, todo) => todo?.authorId === authUser.userId,
          description: "Only the author can delete their own to-dos",
        },
      },
    },
    betaTester: {
      betaResource: { view: true },
    },
  },
});

describe("Authorization Tests", () => {
  test("admin should have full permission for all actions", () => {
    const adminUser: AuthUser = { roles: [UserRoles.Admin], userId: "admin1" };

    expect(hasPermission(adminUser, "todos", "read")).toBe(true);
    expect(hasPermission(adminUser, "todos", "write")).toBe(true);
    expect(hasPermission(adminUser, "todos", "delete")).toBe(true);
  });

  test("moderator should only have read permission", () => {
    const moderatorUser: AuthUser = {
      roles: [UserRoles.Moderator],
      userId: "mod1",
    };

    expect(hasPermission(moderatorUser, "todos", "read")).toBe(true);
    expect(hasPermission(moderatorUser, "todos", "write")).toBe(false);
    expect(hasPermission(moderatorUser, "todos", "delete")).toBe(false);
  });

  test("user should have read permission but restricted write and delete", () => {
    const regularUser: AuthUser = { roles: [UserRoles.User], userId: "user1" };

    expect(hasPermission(regularUser, "todos", "read")).toBe(true);
    expect(hasPermission(regularUser, "todos", "write")).toBe(false);
    expect(hasPermission(regularUser, "todos", "delete")).toBe(false);
  });

  test("user should have delete permission if they are the author", () => {
    const authorUser: AuthUser = { roles: [UserRoles.User], userId: "user1" };
    const resourceData: ToDoModel = {
      authorId: "user1",
      title: "title",
      description: "description",
    };

    expect(hasPermission(authorUser, "todos", "delete", resourceData)).toBe(
      true
    );
  });

  test("user should not have delete permission if they are not the author", () => {
    const regularUser: AuthUser = { roles: [UserRoles.User], userId: "user2" };
    const resourceData: ToDoModel = {
      authorId: "user1",
      title: "title",
      description: "description",
    };

    expect(hasPermission(regularUser, "todos", "delete", resourceData)).toBe(
      false
    );
  });

  test("should return false if user is not authenticated", () => {
    const unauthenticatedUser: AuthUser | null = null;

    expect(hasPermission(unauthenticatedUser, "todos", "read")).toBe(false);
    expect(hasPermission(unauthenticatedUser, "todos", "write")).toBe(false);
    expect(hasPermission(unauthenticatedUser, "todos", "delete")).toBe(false);
  });

  test("should generate correct permission description for actions", () => {
    const user: AuthUser = { roles: [UserRoles.User], userId: "user1" };
    const resourceData: ToDoModel = {
      authorId: "user1",
      title: "title",
      description: "description",
    };

    expect(hasPermission(user, "todos", "read")).toBe(true);

    expect(hasPermission(user, "todos", "delete", resourceData)).toBe(true);
  });

  test("beta tester should have permission to view beta resource", () => {
    const betaTester: AuthUser = {
      roles: [UserRoles.BetaTester, UserRoles.Admin],
      userId: "beta1",
    };

    expect(hasPermission(betaTester, "betaResource", "view")).toBe(true);
  });

  test("if not beta tester, should not have permission to view beta resource", () => {
    const regularUser: AuthUser = { roles: [UserRoles.User], userId: "user1" };

    expect(hasPermission(regularUser, "betaResource", "view")).toBe(false);
  });
});

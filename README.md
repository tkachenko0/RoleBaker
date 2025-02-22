# RoleBaker 🎂

**RoleBaker** is a powerful, flexible library for handling **Attribute-Based Access Control (ABAC)** with type safety in a **framework-agnostic** way. It simplifies managing user permissions and generating automatic documentation, providing a clear and structured approach to handling user roles and resource actions.

---

## 🛠️ Features & Benefits

### 1. **Attribute-Based Access Control (ABAC)** 🛡️

RoleBaker allows you to define permissions based on attributes (e.g., user roles, resource data), providing flexibility in handling access control.

### 2. **Type Safety** 🔒

The library ensures that all roles, resources, and actions are defined as literal types, not generic strings, ensuring type safety throughout the application. This avoids bugs related to string mismatches and helps maintain a robust access control structure.

### 3. **Framework-Agnostic** 🌍

RoleBaker is designed to work in any JavaScript/TypeScript environment, without being tied to a specific framework. Whether you’re building with Node.js, React, Angular, or anything else, RoleBaker fits right in.

### 4. **Automatic Documentation** 📚

RoleBaker automatically generates documentation for your access control configurations. This makes it easier to manage and understand permissions across different roles and resources. It can also be used to automatically generate tables for roles and permissions analysis.

### 5. **Support for Single or Multiple Roles** ⚖️

RoleBaker supports both single and multi-role user structures, making it versatile for applications with different user models. You can configure each role's permissions across multiple resources and actions.

### 6. **Flexibility** 🔄

The library provides flexibility in how permissions are defined and checked. Permissions can be set to simple booleans or complex functions that take user data and resource information into account.

---

## 📦 Installation

To install RoleBaker, you can use npm or yarn:

```bash
npm install rolebaker
```

or

```bash
yarn add rolebaker
```

---

## 📝 Usage Example

### **Single Role Example**

Here’s how you can define roles and permissions for a simple to-do app:

```typescript
// user.model.ts

export enum UserRoles {
  Admin = "admin",
  User = "user",
  Moderator = "moderator",
  BetaTester = "betaTester",
}

export type AuthUser = {
  userId: string;
  role: UserRoles;
  // other fields
};
```

```typescript
// ToDoModel.model.ts

export type ToDoModel = {
  title: string;
  description: string;
  authorId: string;
};
```

You can then use `bakeAuthorization` to generate permission checks for a user:

```typescript
import { ResourceConfig, bakeAuthorization } from "rolebaker";
import { ToDoModel, AuthUser, UserRoles } from "your-file";

export interface MyResourceConfig extends ResourceConfig {
  resources: {
    todos: {
      dataType: ToDoModel;
      action: "read" | "write" | "delete";
    };
    betaResource: {
      dataType: string;
      action: "view";
    };
  };
}

const { hasPermission } = bakeAuthorization<
  UserRoles,
  AuthUser,
  MyResourceConfig
>({
  userRoleMode: "singleRole",
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
```

### **Multiple Roles Example**

RoleBaker also supports users with multiple roles. Here’s how you can define permissions for a user with multiple roles:

```typescript

```

### **Permission Checking**

You can use `hasPermission` to check if a user can perform a specific action on a resource:

```typescript
const user = { roles: ["user"], userId: "123" };

const canDeleteToDoModel = hasPermission(user, "ToDoModels", "delete", {
  authorId: "123",
});
console.log(canDeleteToDoModel); // true if the user is the author, otherwise false
```

---

## 📄 Documentation Generation

You can also generate the permission documentation report:

```typescript

```

The generated documentation will include:

- Resource names
- Actions and descriptions
- Permissions for each role
- Conditional permissions, if any

---

## 🚀 Pros

- **Type Safety**: Avoid runtime errors with literal string types for roles and actions.
- **Automatic Documentation**: Easily generate documentation for roles and permissions.
- **Framework Agnostic**: Works with any JavaScript/TypeScript framework.
- **Flexible Permissions**: Supports both boolean-based and function-based permission checks.
- **Single & Multi-Role Support**: Accommodates both single and multi-role user configurations.
- **Role-Based Access Control**: Manage who can perform which actions on which resources.

---

## 📖 Conclusion

**RoleBaker** offers an elegant, type-safe solution for managing roles and permissions in your applications. With support for both simple boolean-based permissions and complex function-based checks, along with automatic documentation generation, RoleBaker simplifies access control management while ensuring type safety across your application.

Happy coding! 👨‍💻👩‍💻

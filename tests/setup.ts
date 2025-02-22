import { ResourceConfig, ActionDescriptionConfig } from "../src";

export enum UserRoles {
  Admin = "admin",
  User = "user",
  Moderator = "moderator",
  BetaTester = "betaTester",
}

export type ToDoModel = {
  authorId: string;
  title: string;
  description: string;
};

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

export const ACTIONS_DOC: ActionDescriptionConfig<MyResourceConfig> = {
  todos: {
    read: "Read to-dos",
    write: "Write to-dos",
    delete: "Delete to-dos",
  },
  betaResource: {
    view: "View beta resource",
  },
};

import { ResourceConfig, ActionDescriptionConfig } from "../src";

export enum UserRoles {
  Admin = "admin",
  User = "user",
  Moderator = "moderator",
  BetaTester = "betaTester",
}

export type ToDo = {
  title: string;
  description: string;
  authorId: string;
};

export interface MyResourceConfig extends ResourceConfig {
  resources: {
    todos: {
      dataType: ToDo;
      actions: {
        read: null;
        write: null;
        delete: null;
      };
    };
    betaResource: {
      dataType: string;
      actions: {
        view: null;
      };
    };
  };
}

export const DOC_CONFIG: ActionDescriptionConfig<MyResourceConfig> = {
  actionDescriptions: {
    todos: {
      read: {
        description: "Read to-dos",
      },
      write: {
        description: "Write to-dos",
      },
      delete: {
        description: "Delete to-dos",
      },
    },
    betaResource: {
      view: {
        description: "View beta resource",
      },
    },
  },
};

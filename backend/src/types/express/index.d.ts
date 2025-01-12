// src/types/express/index.d.ts
import { IUser } from '../../models/User';
import { IWorkspace } from '../../models/Workspace';

declare global {
  namespace Express {
    export interface Request {
      user?: IUser;
      workspace?: IWorkspace;
      auth?: {
        payload: {
          sub: string;
        };
      };
    }
  }
}

export {};
  
// src/types/express/index.d.ts
declare namespace Express {
    export interface Request {
      user: {
        _id: string;
        [key: string]: any;
      };
    }
  }
  
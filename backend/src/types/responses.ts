// src/types/responses.ts
import { Types } from 'mongoose';

interface UserWithWorkspaceAndChannels {
    user: {
      _id: Types.ObjectId;
      auth0Id: string;
      email: string;
      displayName: string;
      avatarUrl: string;
    };
    workspaces: Array<{
      _id: Types.ObjectId;
      name: string;
      ownerId: Types.ObjectId;
      channels: Array<{
        _id: Types.ObjectId;
        name: string;
        type: 'public' | 'private';
        members: Array<{
          userId: Types.ObjectId;
          role: 'admin' | 'member';
        }>;
        description?: string;
      }>;
    }>;
  }
  
// src/services/WorkspaceService.ts
import Workspace, { IWorkspace } from '../models/Workspace';
import { Types } from 'mongoose';
import Channel, { IChannel } from '../models/Channel';


interface CreateWorkspaceDto {
  name: string;
  ownerId: Types.ObjectId;
  members: Array<{
    userId: Types.ObjectId;
    role: 'admin' | 'member';
  }>;
}

class WorkspaceService {
  async createWorkspace(workspaceData: CreateWorkspaceDto): Promise<IWorkspace> {
    try {
      const workspace = new Workspace({
        name: workspaceData.name,
        ownerId: workspaceData.ownerId,
        members: [{ userId: workspaceData.ownerId, role: 'admin' }],
      });

      await workspace.save();
      return workspace;
    } catch (error) {
      throw error;
    }
  }

  async getWorkspacesByUserId(userId: string): Promise<IWorkspace[]> {
    return Workspace.find({
      'members.userId': new Types.ObjectId(userId)
    })
    .populate('ownerId', '_id displayName username avatarUrl')
    .populate('members.userId', '_id displayName username avatarUrl')
    .populate({
      path: 'channels',
      populate: [
        {
          path: 'members.userId',
          select: '_id displayName username avatarUrl'
        },
        {
          path: 'messages',
          options: { limit: 15, sort: { createdAt: -1 } },
          populate: {
            path: 'user',
            select: '_id displayName username avatarUrl'
          }
        }
      ]
    });
  }

  async getWorkspaceById(workspaceId: string): Promise<IWorkspace | null> {
    return Workspace.findById(workspaceId)
      .populate('ownerId', 'displayName email username avatarUrl')
      .populate('members.userId', 'displayName email username avatarUrl')
      .populate({
        path: 'channels',
        populate: [
          {
            path: 'members.userId',
            select: 'displayName username avatarUrl'
          },
          {
            path: 'messages',
            options: { limit: 15, sort: { createdAt: -1 } },
            populate: {
              path: 'user',
              select: 'displayName username avatarUrl'
            }
          }
        ]
      });
  }

  getWorkspaceChannels(workspaceId: string): Promise<IChannel[]> {
    return Channel.find({ workspaceId: new Types.ObjectId(workspaceId) });
  }

  getWorkspacesForUser(userId: string): Promise<IWorkspace[]> {
    return Workspace.find({
      'members.userId': new Types.ObjectId(userId)
    })
    .populate('ownerId', '_id displayName username avatarUrl')
    .populate('members.userId', 'displayName username avatarUrl')
    .populate({
      path: 'channels',
      populate: {
        path: 'members.userId',
        select: '_id displayName username avatarUrl'
      }
    });
  }

  async addMemberToWorkspace(workspaceId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    const wsId = typeof workspaceId === 'object' ? workspaceId : workspaceId;
    
    await Workspace.findByIdAndUpdate(wsId, {
      $addToSet: {
        members: { 
          userId: new Types.ObjectId(userId), 
          role 
        }
      }
    });
  }
}

export default new WorkspaceService();

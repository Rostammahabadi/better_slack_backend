// src/services/WorkspaceService.ts
import Workspace, { IWorkspace } from '../models/Workspace';
import { Types } from 'mongoose';
import Channel, { IChannel } from '../models/Channel';
import Invite from '../models/Invite';
import crypto from 'crypto';


interface CreateWorkspaceDto {
  name: string;
  ownerId: Types.ObjectId;
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
}

export default new WorkspaceService();

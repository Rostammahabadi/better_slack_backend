// src/services/ChannelService.ts
import { Types } from 'mongoose';
import Channel, { IChannel } from '../models/Channel';

interface CreateChannelDto {
  name: string;
  workspaceId: Types.ObjectId;
  type: 'public' | 'private';
  description?: string;
  createdBy: Types.ObjectId;
}

class ChannelService {
  async createChannel(channelData: CreateChannelDto): Promise<IChannel> {
    try {
      // Check if channel already exists in workspace
      const existingChannel = await Channel.findOne({
        workspaceId: channelData.workspaceId,
        name: channelData.name
      });

      if (existingChannel) {
        throw new Error('Channel already exists in this workspace');
      }

      // Create new channel with creator as first member
      const channel = new Channel({
        ...channelData,
        members: [{
          userId: channelData.createdBy,
          role: 'admin'
        }]
      });

      await channel.save();
      return channel;
    } catch (error) {
      throw error;
    }
  }

  async getWorkspaceChannels(workspaceId: string): Promise<IChannel[]> {
    try {
      return await Channel.find({ 
        workspaceId: new Types.ObjectId(workspaceId) 
      })
      .populate('members.userId', 'username displayName avatarUrl')
      .populate('createdBy', 'username displayName avatarUrl')
      .populate({
        path: 'messages',
        populate: {
          path: 'user',
          select: 'username displayName avatarUrl'
        }
      })
      .sort({ createdAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async getChannelsByWorkspaceId(workspaceId: string): Promise<IChannel[]> {
    return Channel.find({ workspaceId })
      .populate('members.userId', 'username displayName avatarUrl')
      .populate('createdBy', 'username displayName')
      .populate({
        path: 'messages',
        populate: {
          path: 'user',
          select: 'username displayName avatarUrl'
        }
      });
  }

  async getChannelById(channelId: string): Promise<IChannel | null> {
    return Channel.findById(channelId)
      .populate('members.userId', 'username displayName avatarUrl')
      .populate('createdBy', 'username displayName');
  }

  async addMemberToChannel(
    channelId: string, 
    userId: Types.ObjectId,
    role: 'admin' | 'member' = 'member'
  ): Promise<IChannel | null> {
    return Channel.findByIdAndUpdate(
      channelId,
      {
        $addToSet: {
          members: { userId, role }
        }
      },
      { new: true }
    );
  }
}

export default new ChannelService();

// src/services/MessageService.ts
import { Types } from 'mongoose';
import Message from '../models/Message';
import Redis from 'ioredis';
import { redisClient } from '../config/redis';

export interface IMessage {
  channelId: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  threadId?: Types.ObjectId;
  attachments?: string[];
  status: 'sent' | 'delivered' | 'read';
}

export class MessageService {
  // private redis: Redis;

  // constructor() {
  //   this.redis = redisClient;
  // }

  // async createMessage(messageData: IMessage): Promise<any> {
  //   try {
  //     // Create message in MongoDB
  //     const message = new Message(messageData);
  //     await message.save();

  //     // Cache message in Redis
  //     const cacheKey = `channel:messages:${messageData.channelId}`;
  //     await this.redis.lpush(cacheKey, JSON.stringify(message));
  //     await this.redis.ltrim(cacheKey, 0, 99); // Keep last 100 messages

  //     // Publish message event
  //     await this.redis.publish('messages.new', JSON.stringify(message));

  //     return message;
  //   } catch (error) {
  //     console.error('Error creating message:', error);
  //     throw error;
  //   }
  // }

  async createMessage(channelId: string, messageData: IMessage): Promise<any> {
    const message = await Message.create({ 
        ...messageData, 
        channelId: new Types.ObjectId(channelId)
    });
    
    return Message.findById(message._id)
        .populate('user', 'displayName avatarUrl');
  }

  async getMessagesByChannelId(channelId: string): Promise<any[]> {
    return Message.find({ channelId: new Types.ObjectId(channelId) })
      .sort({ createdAt: -1 })
      .populate('user', 'username displayName avatarUrl')
      .exec();
  }

  async getChannelMessages(
    channelId: string,
    limit: number = 50,
    before?: Date
  ): Promise<any[]> {
    try {
      const query = before 
        ? { channelId, createdAt: { $lt: before } }
        : { channelId };

      return await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'username displayName avatarUrl')
        .exec();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  async updateMessageStatus(
    messageId: string,
    status: 'delivered' | 'read'
  ): Promise<any> {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status },
        { new: true }
      );

      // if (message) {
      //   await this.redis.publish('messages.updated', JSON.stringify(message));
      // }

      return message;
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const message = await Message.findOne({
        _id: messageId,
        user: userId
      });

      if (!message) {
        throw new Error('Message not found or unauthorized');
      }

      await Message.deleteOne({ _id: messageId });
      // await this.redis.publish('messages.deleted', messageId);

      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}

export default new MessageService();

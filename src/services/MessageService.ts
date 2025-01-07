// src/services/MessageService.ts
import { Types } from 'mongoose';
import Message from '../models/Message';
import Redis from 'ioredis';
import { redisClient } from '../config/redis';
import { Server as SocketServer } from 'socket.io';

export interface IMessage {
  channelId: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  threadId?: Types.ObjectId;
  attachments?: string[];
  status: 'sent' | 'delivered' | 'read';
}

export class MessageService {
  private static instance: MessageService;
  private redis: Redis;
  private static io: SocketServer;

  private constructor() {
    this.redis = redisClient;
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      throw new Error('MessageService must be initialized with Socket.IO before use');
    }
    return MessageService.instance;
  }

  public static initialize(io: SocketServer): MessageService {
    if (!MessageService.instance) {
      MessageService.io = io;
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  async createMessage(channelId: string, messageData: IMessage): Promise<any> {
    const message = await Message.create({ 
        ...messageData, 
        channelId: new Types.ObjectId(channelId)
    });
    MessageService.io.to(`channel:${channelId}`).emit('message:new', message);

    this.redis.publish('messages.new', JSON.stringify(message));
    return Message.findById(message._id)
        .populate('user', 'displayName avatarUrl');
  }

  async getMessagesByChannelId(channelId: string): Promise<any[]> {
    return Message.find({ channelId: new Types.ObjectId(channelId) })
      .sort({ createdAt: -1 })
      .populate('user', '_id username displayName avatarUrl')
      .populate('reactions', '_id emoji user')
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
        .populate('user', '_id username displayName avatarUrl')
        .populate('reactions', '_id emoji user')
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

export const initializeMessageService = (io: SocketServer): MessageService => {
    return MessageService.initialize(io);
};

export default MessageService;

// src/services/MessageService.ts
import { Types } from 'mongoose';
import Message from '../models/Message';
import Redis from 'ioredis';
import { redisClient } from '../config/redis';

export interface IMessage {
  _id: Types.ObjectId;
  channelId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  threadId?: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  type: 'channel' | 'conversation' | 'thread';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  status: 'sent' | 'delivered' | 'read';
}

export class MessageService {
  private redis: Redis;

  constructor() {
    this.redis = redisClient;
  }

  async createMessage(channelId: string, messageData: IMessage): Promise<any> {
    const message = await Message.create({ 
        ...messageData, 
        channelId: new Types.ObjectId(channelId)
    });

    const populatedMessage = await Message.findById(message._id)
        .populate('user', '_id username displayName avatarUrl')
        .populate('reactions', '_id emoji user');

    return populatedMessage;
  }

  async getMessagesByChannelId(channelId: string): Promise<any[]> {
    return Message.find({ channelId: new Types.ObjectId(channelId) })
      .sort({ createdAt: -1 })
      .populate('user', '_id username displayName avatarUrl')
      .populate('reactions', '_id emoji user')
      .exec();
  }

  async updateMessage(messageId: string, messageData: IMessage): Promise<any> {
    const message = await Message.findByIdAndUpdate(messageId, messageData, { new: true });
    return message;
  }

  static async getChannelMessages(
    channelId: string,
    limit: number = 30,
    before?: string
  ): Promise<IMessage[]> {
    const query: any = {
      channelId: new Types.ObjectId(channelId),
      type: 'channel'
    };

    if (before) {
      query._id = { $lt: new Types.ObjectId(before) };
    }

    return Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('user', 'displayName username avatarUrl')
      .lean();
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

  static async createThreadReply(
    channelId: string,
    parentMessageId: string,
    userId: string,
    content: string,
    type: 'channel'
  ): Promise<IMessage | null> {
    const message = await Message.create({
      content,
      type: 'thread',
      channelId: new Types.ObjectId(channelId),
      threadId: new Types.ObjectId(parentMessageId),
      user: new Types.ObjectId(userId),
      status: 'sent'
    }) as IMessage;

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'displayName username avatarUrl')
      .lean() as IMessage | null;

    return populatedMessage;
  }
}

export default new MessageService();

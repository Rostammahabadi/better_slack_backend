import Conversation, { IConversation } from '../models/Conversation';
import Message, { IMessage } from '../models/Message';
import { Types } from 'mongoose';
import mongoose from 'mongoose';

class ConversationService {
  static async getOrCreateConversation(userId1: string, userId2: string): Promise<IConversation> {
    const conversation = await Conversation.findOne({
      participants: { 
        $all: [
          new Types.ObjectId(userId1), 
          new Types.ObjectId(userId2)
        ]
      }
    });

    if (conversation) return conversation;

    return await Conversation.create({
      participants: [userId1, userId2]
    });
  }

  static async getMessages(
    conversationId: string,
    limit: number = 50,
    cursor?: string
  ): Promise<{
    messages: IMessage[];
    nextCursor?: string;
  }> {
    const query: any = { 
      conversationId: new Types.ObjectId(conversationId),
      type: 'conversation'
    };
    
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('user', 'displayName avatarUrl')
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    return {
      messages,
      nextCursor: hasMore ? messages[messages.length - 1]._id.toString() : undefined
    };
  }

  static async createMessage(
    conversationId: string,
    userId: string,
    content: string
  ): Promise<IMessage | null> {
    const message = await Message.create({
      content,
      type: 'conversation',
      conversationId: new Types.ObjectId(conversationId),
      user: new Types.ObjectId(userId),
      status: 'sent'
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $push: { messages: message._id },
      $set: { lastMessage: message._id, lastMessageAt: new Date() },
      $inc: { messageCount: 1 }
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'displayName username avatarUrl')
      .lean();

    return populatedMessage;
  }

  static async getRecentConversations(userId: string): Promise<IConversation[]> {
    return Conversation.find({
      participants: new Types.ObjectId(userId),
      type: { $ne: 'bot' }
    })
    .sort({ lastMessageAt: -1 })
    .populate('lastMessage')
    .populate('participants', 'displayName avatarUrl')
    .populate({
      path: 'messages',
      match: { type: 'conversation' },
      options: { 
        sort: { createdAt: -1 },
        limit: 10
      },
      populate: {
        path: 'user',
        select: 'displayName avatarUrl'
      }
    });
  }

  static async getConversationWithMessages(
    conversationId: string,
    limit: number = 50,
    before?: Date
  ): Promise<IConversation | null> {
    const query = { _id: new Types.ObjectId(conversationId) };
    
    const populateOptions: any = {
      path: 'messages',
      match: { type: 'conversation' },
      options: { 
        sort: { createdAt: -1 },
        limit: limit
      },
      populate: {
        path: 'user',
        select: 'displayName avatarUrl'
      }
    };

    if (before) {
      populateOptions.match = { 
        type: 'conversation',
        createdAt: { $lt: before }
      };
    }

    return Conversation.findOne(query)
      .populate(populateOptions)
      .populate('participants', 'displayName avatarUrl')
      .populate('lastMessage');
  }

  static async createGroupConversation(
    participants: string[],
    message: string,
    userId: string
  ): Promise<IConversation | null> {
    try {
      // Ensure sender is included in participants
      const allParticipants = [...new Set([...participants, userId])];

      // Create conversation with all participants
      const conversation = await Conversation.create({
        participants: allParticipants.map(id => new Types.ObjectId(id)),
        messageCount: 0,
        lastMessageAt: new Date()
      });

      // Create initial message
      const newMessage = await Message.create({
        content: message,
        type: 'conversation',
        conversationId: conversation._id,
        user: new Types.ObjectId(userId),
        status: 'sent'
      });

      // Update conversation with first message
      conversation.messages = [newMessage._id];
      conversation.lastMessage = newMessage._id;
      conversation.messageCount = 1;
      await conversation.save();

      // Return populated conversation
      return await Conversation.findById(conversation._id)
        .populate('participants', 'displayName username avatarUrl')
        .populate('lastMessage')
        .populate({
          path: 'messages',
          match: { type: 'conversation' },
          options: { sort: { createdAt: -1 }, limit: 10 },
          populate: { path: 'user', select: 'displayName avatarUrl' }
        });

    } catch (error) {
      throw error;
    }
  }

  static async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    before?: string
  ): Promise<IMessage[]> {
    const query: any = {
      conversationId: new Types.ObjectId(conversationId)
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

  static async createThreadReply(
    conversationId: string,
    parentMessageId: string,
    userId: string,
    content: string
  ): Promise<IMessage | null> {
    const message = await Message.create({
      content,
      type: 'thread',
      conversationId: new Types.ObjectId(conversationId),
      threadId: new Types.ObjectId(parentMessageId),
      user: new Types.ObjectId(userId),
      status: 'sent'
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('user', 'displayName username avatarUrl')
      .lean();

    return populatedMessage;
  }

  static async updateMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<IMessage | null> {
    const message = await Message.findOneAndUpdate(
      { _id: new Types.ObjectId(messageId), user: new Types.ObjectId(userId) },
      { content, updatedAt: new Date() },
      { new: true }
    )
      .populate('user', 'displayName username avatarUrl')
      .lean();

    return message;
  }
}

export default ConversationService; 
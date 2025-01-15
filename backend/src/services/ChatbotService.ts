import Conversation from '../models/Conversation';
import Message, { IMessage } from '../models/Message';
import { Types } from 'mongoose';
import UserService from './UserService';
import { IUser } from '../models/User';

class ChatbotService {
  static async getOrCreateBotConversation(user: IUser, workspaceId: string) {
    // Try to find existing bot conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [user._id] },
      type: 'bot'
    }).populate({
      path: 'messages',
      populate: {
        path: 'user',
        select: 'displayName username avatarUrl'
      }
    });

    // If no conversation exists, create one with initial message
    if (!conversation) {
        conversation = await Conversation.create({
          participants: [user._id, new Types.ObjectId("000000000000000000000000")],
          type: 'bot',
          messages: [],
          lastMessage: null,
          lastMessageAt: new Date(),
          messageCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          workspaceId: new Types.ObjectId(workspaceId)  // Add workspace context
        });
        await conversation.save();
        // Create welcome message
        const welcomeMessage = await Message.create({
          content: "👋 Hi! I'm your AI assistant. How can I help you today?",
          type: 'bot',
          conversationId: conversation._id,
          user: new Types.ObjectId("000000000000000000000000"),  // Set bot as sender
          workspaceId: new Types.ObjectId(workspaceId),
          status: 'sent',
          containerType: 'conversation',
          containerId: conversation._id,
          senderUsername: "chatgenius",
          senderDisplayName: "ChatGenius",
          senderProfileFormality: "neutral",
          senderProfileTone: "neutral",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      
        conversation.messages = [welcomeMessage._id];
        conversation.lastMessage = welcomeMessage._id;
        await conversation.save();
      
        // Populate the new conversation with messages and user details
        conversation = await Conversation.findById(conversation._id)
          .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 } },
            populate: {
              path: 'user',
              select: 'displayName username avatarUrl isBot'
            }
          })
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'user',
              select: 'displayName username avatarUrl isBot'
            }
          });
      }

    return conversation;
  }

  static async saveBotMessage(message: IMessage) {
    const savedMessage = await Message.create(message);

    // Update conversation with new message
    await Conversation.findByIdAndUpdate(
      message.conversationId,
      {
        $push: { messages: savedMessage._id },
        $set: { lastMessage: savedMessage._id, lastMessageAt: new Date() },
        $inc: { messageCount: 1 }
      }
    );

    return Message.findById(savedMessage._id)
      .populate('user', 'displayName username avatarUrl')
      .lean();
  }
}

export default ChatbotService; 
// src/services/ReactionService.ts
import Reaction, { IReaction } from '../models/Reaction';
import { Types } from 'mongoose';

class ReactionService {
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IReaction> {
    try {
      const reaction = await Reaction.create({
        messageId: new Types.ObjectId(messageId),
        user: new Types.ObjectId(userId),
        emoji
      });

      return reaction;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error('Reaction already exists');
      }
      throw error;
    }
  }

  async removeReaction(
    messageId: string,
    userId: string,
    reactionId: string
  ): Promise<boolean> {
    const result = await Reaction.deleteOne({
      _id: new Types.ObjectId(reactionId)
    });
    return result.deletedCount > 0;
  }

  async getMessageReactions(messageId: string): Promise<IReaction[]> {
    return Reaction.find({
      messageId: new Types.ObjectId(messageId)
    })
    .populate('user', 'display_name avatar_url')
    .sort({ createdAt: 1 });
  }
}

export default new ReactionService();

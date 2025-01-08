// src/models/Reaction.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReaction extends Document {
  messageId: Types.ObjectId;
  user: Types.ObjectId;
  emoji: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReactionSchema = new Schema({
  messageId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message', 
    required: true 
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  emoji: { 
    type: String, 
    required: true 
  }
}, {
  timestamps: true
});

// Compound index for unique reactions per user per message
ReactionSchema.index({ messageId: 1, user: 1, emoji: 1 }, { unique: true });

export default mongoose.model<IReaction>('Reaction', ReactionSchema);

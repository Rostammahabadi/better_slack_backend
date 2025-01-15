import mongoose, { Schema, Document, Types } from 'mongoose';
import { IMessage } from './Message';

export interface IConversation extends Document {
  participants: Types.ObjectId[];
  messages: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
}

const ConversationSchema = new Schema({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: false
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['conversation', 'bot'],
    default: 'conversation'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ messageCount: 1 });
ConversationSchema.index({ 'participants': 1, 'lastMessageAt': -1 });
ConversationSchema.index({ messages: 1 });

export default mongoose.model<IConversation>('Conversation', ConversationSchema); 
// src/models/Message.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageType = 'channel' | 'conversation' | 'thread';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  content: string;
  threadId?: Types.ObjectId;
  type: MessageType;
  channelId?: Types.ObjectId;
  conversationId?: Types.ObjectId;
  user: Types.ObjectId;
  attachments: Array<{
    url: string;
    type: string;
    name: string;
  }>;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Array<{
    emoji: string;
    userId: Types.ObjectId;
  }>;
  edited: boolean;
  editHistory?: Array<{
    content: string;
    editedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  content: { 
    type: String, 
    required: true,
    maxlength: 4000
  },
  type: {
    type: String,
    enum: ['channel', 'conversation', 'thread'],
    required: true
  },
  channelId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Channel',
    required: function(this: any) {
      return this.type === 'channel';
    }
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: function(this: any) {
      return this.type === 'conversation';
    }
  },
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  threadId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message' 
  },
  attachments: [{
    url: String,
    type: String,
    name: String
  }],
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

MessageSchema.virtual('reactions', {
  ref: 'Reaction',
  localField: '_id',
  foreignField: 'messageId',
  options: { sort: { createdAt: 1 } }
});

MessageSchema.pre('find', function() {
  this.sort({ createdAt: 1 });
});

MessageSchema.pre('findOne', function() {
  this.sort({ createdAt: 1 });
});

// Indexes for query optimization
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ type: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);

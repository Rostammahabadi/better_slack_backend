// src/models/Message.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  content: string;
  channelId: Types.ObjectId;
  user: Types.ObjectId;
  threadId?: Types.ObjectId;
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
  channelId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Channel', 
    required: true 
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
  }]
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

// Indexes for query optimization
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ threadId: 1, createdAt: 1 });
MessageSchema.index({ user: 1 }); // Changed from senderId to user to match schema

export default mongoose.model<IMessage>('Message', MessageSchema);

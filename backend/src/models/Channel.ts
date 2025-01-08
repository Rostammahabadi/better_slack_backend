// src/models/Channel.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  workspaceId: mongoose.Types.ObjectId;
  type: 'public' | 'private';
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'member';
  }>;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  messages?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 80
  },
  workspaceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Workspace', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['public', 'private'], 
    default: 'public' 
  },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
  }],
  description: { 
    type: String,
    maxlength: 250
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

// Virtual populate for messages
ChannelSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'channelId'
});

// Enable virtuals
ChannelSchema.set('toJSON', { virtuals: true });
ChannelSchema.set('toObject', { virtuals: true });

// Indexes for better query performance
ChannelSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
ChannelSchema.index({ 'members.userId': 1 });

export default mongoose.model<IChannel>('Channel', ChannelSchema);

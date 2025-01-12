// src/models/Invite.ts
import mongoose, { Schema, Document } from 'mongoose';
import { randomBytes } from 'crypto';

export interface IInvite extends Document {
  token: string;
  workspaceId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    default: () => randomBytes(32).toString('hex')
  },
  workspaceId: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, {
  timestamps: true
});

// Indexes
InviteSchema.index({ token: 1 }, { unique: true });
InviteSchema.index({ workspaceId: 1 });
InviteSchema.index({ invitedEmail: 1 });
InviteSchema.index({ status: 1 });
InviteSchema.index({ expiresAt: 1 });
InviteSchema.index({ createdAt: 1 });

export default mongoose.model<IInvite>('Invite', InviteSchema);

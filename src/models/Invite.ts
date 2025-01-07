// src/models/Invite.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface Invite extends Document {
  _id: Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema({
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
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  token: { 
    type: String, 
    required: true,
    unique: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 days from creation
  }
}, {
  timestamps: true
});

// Indexes for query optimization
InviteSchema.index({ workspaceId: 1, invitedEmail: 1 }, { unique: true });
InviteSchema.index({ token: 1 });
InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-deletion

export default mongoose.model<Invite>('Invite', InviteSchema);

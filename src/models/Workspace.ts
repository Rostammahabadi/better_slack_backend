// src/models/Workspace.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  members: Array<{
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'member';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema({
  name: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
  }]
}, {
  timestamps: true
});

WorkspaceSchema.virtual('channels', {
  ref: 'Channel',
  localField: '_id',
  foreignField: 'workspaceId'
});

WorkspaceSchema.set('toJSON', { virtuals: true });
WorkspaceSchema.set('toObject', { virtuals: true });

WorkspaceSchema.index({ ownerId: 1 });
WorkspaceSchema.index({ 'members.userId': 1 });

export default mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);

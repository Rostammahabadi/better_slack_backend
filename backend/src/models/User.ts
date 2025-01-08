// src/models/User.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  auth0Id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
  theme: string;
  notificationPreferences: object;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema({
  auth0Id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  displayName: String,
  avatarUrl: String,
  status: { type: String, default: 'active' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  theme: { type: String, default: 'dark' },
  notificationPreferences: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

UserSchema.index({ auth0Id: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export default mongoose.model<IUser>('User', UserSchema);

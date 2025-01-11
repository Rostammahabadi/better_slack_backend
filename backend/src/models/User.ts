import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define interface for notification preferences
interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  [key: string]: boolean | undefined;
}

// Define methods interface
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Main user interface
export interface IUser extends Document, IUserMethods {
  _id: Types.ObjectId;
  auth0Id: string;
  email: string;
  password: string;
  verificationToken?: string;
  isVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  failedLoginAttempts: number;
  lockUntil?: Date;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  isOnline: boolean;
  lastSeen: Date;
  workspaces: Types.ObjectId[];
  theme: 'dark' | 'light';
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema({
  auth0Id: { 
    type: String, 
    required: false, 
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: false,
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  verificationToken: {
    type: String,
    select: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and dashes']
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters']
  },
  avatarUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || /^(https?:\/\/)?.+\..+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  status: { 
    type: String, 
    default: 'active',
    enum: {
      values: ['active', 'inactive', 'suspended'],
      message: '{VALUE} is not a valid status'
    }
  },
  isOnline: { 
    type: Boolean, 
    default: false
  },
  lastSeen: { 
    type: Date, 
    default: Date.now
  },
  theme: { 
    type: String, 
    default: 'dark',
    enum: {
      values: ['dark', 'light'],
      message: '{VALUE} is not a valid theme'
    }
  },
  notificationPreferences: {
    type: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    default: { email: true, push: true }
  },
  workspaces: [{
    type: Schema.Types.ObjectId,
    ref: 'Workspace'
  }]
}, { 
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.verificationToken;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.failedLoginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Password hashing middleware
// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
  
//   try {
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error: any) {
//     next(error);
//   }
// });

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const user = await this.model('User').findById(this._id).select('+password');
    if (!user || !user.password) return false;
    return await bcrypt.compare(candidatePassword, user.password);
  } catch (error) {
    return false;
  }
};

// Create compound index for online users query
UserSchema.index({ isOnline: 1, lastSeen: -1 });

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
// realtime/src/server.ts
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';

dotenv.config();

class RealtimeServer {
  private httpServer;
  private io!: SocketServer;
  private redis!: Redis;
  private channels: Map<string, Map<string, any>>;
  private workspaces: Map<string, Map<string, any>>;
  private userSessions: Map<string, Set<string>>;

  constructor() {
    this.httpServer = createServer();
    this.channels = new Map();
    this.workspaces = new Map();
    this.userSessions = new Map();
  }

  private async initializeServices(): Promise<void> {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  private async configureSocketIO(): Promise<void> {
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    if (this.redis) {
      const pubClient = this.redis.duplicate();
      const subClient = this.redis.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      this.authenticateConnection(socket);

      socket.on('workspace:join', (workspaceId: string, userId: string) => {
        console.log('workspace:join', {
          workspaceId,
          userId
        });
        // Join the workspace room for receiving updates
        const roomName = `workspace:${workspaceId}`;
        socket.join(roomName);

        // Initialize workspace users map if it doesn't exist
        if (!this.workspaces.has(workspaceId)) {
          this.workspaces.set(workspaceId, new Map());
        }

        // Add user to workspace users map with their socket id and status
        this.workspaces.get(workspaceId)?.set(socket.id, {
          userId,
          status: 'online'
        });

        // Notify all workspace users about the new user
        const workspaceUsers = Array.from(this.workspaces.get(workspaceId)?.values() || []);
        this.io.to(roomName).emit('workspace:users', workspaceUsers);
      });

      socket.on('channel:join', (channelId: string, userId: string) => {
        const roomName = `channel:${channelId}`;
        socket.join(roomName);
        
        if (!this.channels.has(channelId)) {
          this.channels.set(channelId, new Map());
        }
        
        this.channels.get(channelId)?.set(socket.id, {
          userId,
          status: 'online'
        });
        
        if (!this.userSessions.has(socket.id)) {
          this.userSessions.set(socket.id, new Set());
        }
        this.userSessions.get(socket.id)?.add(channelId);
        
        const channelMembers = Array.from(this.channels.get(channelId)?.values() || []);
        
        this.io.to(roomName).emit('channel:users', channelMembers);
        this.io.to(roomName).emit('channel:user_joined', {
          userId,
          channelId
        });
      });

      socket.on('channel:message', async (message) => {
        try {
          const roomName = `channel:${message.channelId}`;
          this.io.to(roomName).emit('channel:message', message);
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to save message',
            error: error.message
          });
        }
      });

      socket.on('channel:create', (channel) => {
        try {
          this.io.to(`workspace:${channel.workspaceId}`).emit('channel:create', {
            channel
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to create channel',
            error: error.message
          });
        }
      });

      socket.on('channel:edit_message', ({ channelId, messageId, message }) => {
        try {
          console.log('channel:edit_message', {
            messageId,
            message,
            channelId
          });
          this.io.to(`channel:${channelId}`).emit('channel:edit_message', {
            messageId,
            message,
            channelId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to edit message',
            error: error.message
          });
        }
      });

      socket.on('channel:typing', ({ channelId, isTyping }) => {
        const channel = this.channels.get(channelId);
        if (channel && channel.has(socket.id)) {
          const user = channel.get(socket.id);
          socket.to(`channel:${channelId}`).emit('channel:typing', {
            userId: socket.id,
            username: user?.username,
            isTyping
          });
        }
      });

      socket.on('channel:reaction', ({ channelId, messageId, reaction }) => {
        try {
          this.io.to(`channel:${channelId}`).emit('channel:reaction', {
            messageId,
            reaction,
            channelId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to save reaction',
            error: error.message
          });
        }
      });

      socket.on('channel:reaction_removed', ({ channelId, messageId, reaction }) => {
        try {
          console.log('channel:reaction_removed', {
            messageId,
            reaction,
            channelId
          });
          this.io.to(`channel:${channelId}`).emit('channel:reaction_removed', {
            messageId,
            reaction,
            channelId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to remove reaction',
            error: error.message
          });
        }
      });

      socket.on('channel:leave', ({ channelId }) => {
        this.handleChannelLeave(socket, channelId);
      });

      socket.on('disconnect', () => {
        if (this.userSessions.has(socket.id)) {
          const userChannels = this.userSessions.get(socket.id);
          userChannels?.forEach(channelId => {
            this.handleChannelLeave(socket, channelId);
          });
          this.userSessions.delete(socket.id);
        }
      });
    });
  }

  private handleChannelLeave(socket: any, channelId: string): void {
    const roomName = `channel:${channelId}`;
    socket.leave(roomName);
    
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.delete(socket.id);
      if (channel.size === 0) {
        this.channels.delete(channelId);
      }
    }
    
    this.userSessions.get(socket.id)?.delete(channelId);
    
    this.io.to(roomName).emit('channel:user_left', {
      userId: socket.id,
      channelId
    });
  }

  private authenticateConnection(socket: any): void {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect();
      return;
    }
  }

  public async start(): Promise<void> {
    await this.initializeServices();
    await this.configureSocketIO();
    const port = process.env.REALTIME_PORT || 3001;
    this.httpServer.listen(port, () => {
      console.log(`Realtime Server running on port ${port}`);
    });
  }
}

const server = new RealtimeServer();
server.start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
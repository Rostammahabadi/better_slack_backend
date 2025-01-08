import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Socket, Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { KubeMQClient } from 'kubemq-js';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import { SOCKET_EVENTS } from './socketio/events';
import MessageService, { IMessage, initializeMessageService } from './services/MessageService';

// Route Imports
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import channelRoutes from './routes/channelRoutes';
import workspaceRoutes from './routes/workspaceRoutes';
import reactionRoutes from './routes/reactionRoutes';

// Middleware Imports
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';

dotenv.config();

class Server {
  private app: Application;
  private httpServer: any;
  private io!: SocketServer;
  private redis!: Redis;
  private kubemq!: KubeMQClient;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.configureMiddleware();
    this.configureRoutes();
    this.initializeServices().then(() => {
      this.configureSocketIO();
      console.log('Services initialized');
    }).catch(error => {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    });
  }

  private configureSocketIO(): void {
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6 // 1 MB
    });
    const channels = new Map(); // Store channel info and members
    const userSessions = new Map(); // Track which channels a user is in

    // Initialize MessageService with Socket.IO instance
    initializeMessageService(this.io);
    
    // Setup Redis adapter for Socket.IO
    if (this.redis) {
      const pubClient = this.redis.duplicate();
      const subClient = this.redis.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));

      // Subscribe to Redis message events
      subClient.subscribe('messages.new', (err) => {
        if (err) {
          console.error('Failed to subscribe to messages.new:', err);
          return;
        }
        console.log('Subscribed to messages.new channel');
      });

      // Handle incoming Redis messages
      subClient.on('message', (channel, message) => {
        if (channel === 'messages.new') {
          try {
            const data = JSON.parse(message);
            const { payload } = data;
            // Broadcast to all clients in the channel
            this.io.to(`channel:${payload.channelId}`).emit('message:new', data);
          } catch (error) {
            console.error('Error handling Redis message:', error);
          }
        }
      });
    }

    // Handle socket connections
    this.io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id);

      // Authenticate socket connection
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        return;
      }

      // Join message rooms
      socket.on('channel:join', (channelId: string, userId: string) => {
        const roomName = `channel:${channelId}`;
        socket.join(roomName);
        
        if (!channels.has(channelId)) {
          channels.set(channelId, new Map());
        }
        
        channels.get(channelId).set(socket.id, {
          userId,
          status: 'online'
        });
        
        if (!userSessions.has(socket.id)) {
          userSessions.set(socket.id, new Set());
        }
        userSessions.get(socket.id).add(channelId);
        
        const channelMembers = Array.from(channels.get(channelId).values());
        
        // Use the roomName when emitting
        this.io.to(roomName).emit('channel:users', channelMembers);
        this.io.to(roomName).emit('channel:user_joined', {
          userId,
          channelId
        });
        
        console.log(`Socket ${socket.id} joined ${roomName}`);
      });

      socket.on('channel:message', async (message) => {
        try {
          console.log('Received message:', message);
          const roomName = `channel:${message.channelId}`;
          // Broadcast to everyone in the channel including sender
          this.io.to(roomName).emit('channel:message', message);
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to save message',
            error: error.message
          });
        }
      });
      socket.on('channel:typing', ({ channelId, isTyping }) => {
        const channel = channels.get(channelId);
        if (channel && channel.has(socket.id)) {
          const user = channel.get(socket.id);
          socket.to(channelId).emit('channel:typing', {
            userId: socket.id,
            username: user.username,
            isTyping
          });
        }
      });
    
      // Handle leaving a channel
      socket.on('channel:leave', ({ channelId }) => {
        handleChannelLeave(socket, channelId);
      });
    
      // Handle disconnection
      socket.on('disconnect', () => {
        // Clean up all channels the user was in
        if (userSessions.has(socket.id)) {
          const userChannels = userSessions.get(socket.id);
          userChannels.forEach(channelId => {
            handleChannelLeave(socket, channelId);
          });
          userSessions.delete(socket.id);
        }
      });
    });

    function handleChannelLeave(socket: Socket, channelId: string) {
      const channel = channels.get(channelId);
      if (channel) {
        const user = channel.get(socket.id);
        if (user) {
          channel.delete(socket.id);
          socket.leave(channelId);
          
          // If channel is empty, remove it
          if (channel.size === 0) {
            channels.delete(channelId);
          } else {
            // Notify remaining channel members
            this.io.to(channelId).emit('channel:user_left', {
              userId: socket.id,
              username: user.username
            });
            this.io.to(channelId).emit('channel:users', Array.from(channel.values()));
          }
        }
      }
    }
  }

  private configureMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(rateLimiter);
    this.app.use(errorHandler);
  }

  private configureRoutes(): void {
    this.app.use('/api/users', authenticate, userRoutes);
    this.app.use('/api/messages', authenticate, messageRoutes);
    this.app.use('/api/channels', authenticate, channelRoutes);
    this.app.use('/api/workspaces', authenticate, workspaceRoutes);
    this.app.use('/api', authenticate, reactionRoutes);

    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD
      });

      // Initialize KubeMQ
      this.kubemq = new KubeMQClient({
        address: process.env.KUBEMQ_ADDRESS,
        clientId: `server-${process.env.POD_NAME || 'main'}`
      });

      // Initialize MongoDB
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log('Connected to MongoDB');

    } catch (error) {
      console.error('Failed to initialize services:', error);
      process.exit(1);
    }
  }

  public getIO(): SocketServer {
    return this.io;
  }

  public emitToWorkspace(workspaceId: string, event: string, data: any): void {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  public emitToChannel(channelId: string, event: string, data: any): void {
    this.io.to(`channel:${channelId}`).emit(event, data);
  }

  public async start(): Promise<void> {
    try {
      const port = process.env.PORT || 3000;
      
      this.httpServer.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      await mongoose.connection.close();
      await this.redis.quit();
      this.kubemq.close();
      this.httpServer.close();
      console.log('Server shut down successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create server instance
const server = new Server();

// Export socket instance for use in other parts of the application
export const socketServer = {
  io: server.getIO(),
  emitToWorkspace: server.emitToWorkspace.bind(server),
  emitToChannel: server.emitToChannel.bind(server)
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  await server.shutdown();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Starting graceful shutdown...');
  await server.shutdown();
});

// Start the server
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default server;

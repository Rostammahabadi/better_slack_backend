import express, { Application } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { Redis } from 'ioredis';
import { KubeMQClient } from 'kubemq-js';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import { SOCKET_EVENTS } from './socketio/events';
import { initializeMessageService } from './services/MessageService';

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
      this.configureSockets(); // Move this after Redis initialization
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
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6 // 1 MB
    });
    
    // Initialize MessageService with Socket.IO instance
    initializeMessageService(this.io);
    
    // Setup Redis adapter for Socket.IO
    if (this.redis) {
      const pubClient = this.redis.duplicate();
      const subClient = this.redis.duplicate();
      this.io.adapter(createAdapter(pubClient, subClient));
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

  private configureSockets(): void {
    // Setup Redis adapter for Socket.IO
    const pubClient = this.redis.duplicate();
    const subClient = this.redis.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    this.io.on('connection', async (socket) => {
      console.log('Client connected:', socket.id);

      // Authenticate socket connection
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        return;
      }

      // Handle workspace events
      socket.on(SOCKET_EVENTS.WORKSPACE.JOIN, (workspaceId: string) => {
        socket.join(`workspace:${workspaceId}`);
        console.log('Joined workspace:', workspaceId);
      });

      socket.on(SOCKET_EVENTS.CHANNEL.JOIN, (channelId: string) => {
        socket.join(`channel:${channelId}`);
        console.log('Joined channel:', channelId);
      });

      socket.on(SOCKET_EVENTS.CHANNEL.LEAVE, (channelId: string) => {
        socket.leave(`channel:${channelId}`);
        console.log('Left channel:', channelId);
      });

      socket.on(SOCKET_EVENTS.WORKSPACE.LEAVE, (workspaceId: string) => {
        socket.leave(`workspace:${workspaceId}`);
        console.log('Left workspace:', workspaceId);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
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
      await this.kubemq.close();
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

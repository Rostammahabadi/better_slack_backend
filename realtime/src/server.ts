// realtime/src/server.ts
import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import Redis  from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import axios from 'axios';
import { Pinecone, ScoredPineconeRecord } from '@pinecone-database/pinecone';
import fetch from 'node-fetch';
import OpenAI from "openai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "langchain/document";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { PromptTemplate } from "@langchain/core/prompts";
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY || '',
});
global.fetch = fetch as any;
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || ''
});


const index = pinecone.Index("chatgenius"); // Replace with your index name

// Add template definition before initializeLangChain function
const TEMPLATE = `You are an AI assistant helping users with their queries in a conversational Slack-like environment. 
Always respond in a clear, concise, and helpful manner, focusing only on addressing the user's question or need. 
Avoid mentioning your AI nature, the context provided, or how the response is generated.

Context: {context}

User Question: {question}

Provide a helpful response based on the relevant information and user query.`;

// Move initialization into async function
async function initializeLangChain() {
  const chatModel = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.1,
    openAIApiKey: process.env.OPEN_AI_API_KEY,
  });

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings({
      openAIApiKey: process.env.OPEN_AI_API_KEY,
      modelName: "text-embedding-3-large"
    }),
    {
      pineconeIndex: index,
      textKey: "content",
    }
  );

  const prompt = PromptTemplate.fromTemplate(TEMPLATE);

  // Test Pinecone connection
  try {
    const testQuery = await vectorStore.similaritySearch("test", 1);
    console.log('Pinecone connection test:', {
      success: true,
      indexStats: await index.describeIndexStats()
    });
  } catch (error) {
    console.error('Failed to connect to Pinecone:', error);
  }

  return RunnableSequence.from([
    {
      context: async (input: { question: string; channelId?: string }) => {
        console.log('Starting similarity search with:', {
          question: input.question,
          channelId: input.channelId,
          filterQuery: { channelId: input.channelId }
        });

        try {
          const relevantDocs = await vectorStore.similaritySearch(input.question, 4, {
            channelId: input.channelId,
          });
          
          console.log('Pinecone search results:', {
            numResults: relevantDocs.length,
            docs: relevantDocs
          });

          const context = relevantDocs.map(doc => doc.pageContent).join("\n");
          console.log('Final context:', context);
          
          return context;
        } catch (error) {
          console.error('Error in similarity search:', error);
          throw error;
        }
      },
      question: (input: { question: string; channelId?: string }) => input.question,
    },
    prompt,
    chatModel,
    new StringOutputParser(),
  ]);
}

let chain: Awaited<ReturnType<typeof initializeLangChain>>;

class RealtimeServer {
  private httpServer;
  private io!: SocketServer;
  private redis!: Redis;
  private channels: Map<string, Map<string, any>>;
  private workspaces: Map<string, Map<string, any>>;
  private userSessions: Map<string, Set<string>>;
  private conversations: Map<string, Map<string, any>>;
  private botConnections: Map<string, Set<string>>;

  constructor() {
    this.httpServer = createServer();
    this.channels = new Map();
    this.workspaces = new Map();
    this.userSessions = new Map();
    this.conversations = new Map();
    this.botConnections = new Map();
  }

  private async initializeServices(): Promise<void> {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(REDIS_URL, {
      retryStrategy: (times: number) => {
        // Maximum retry delay is 3000ms
        const delay = Math.min(times * 50, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });
  }

  private async configureSocketIO(): Promise<void> {
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
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

      socket.onAny((eventName, ...args) => {
        console.log('Received socket event:', eventName, args);
      });

      this.authenticateConnection(socket);

      socket.on('workspace:leave', (workspaceId: string) => {
        console.log('workspace:leave', {
          workspaceId
        });
        socket.leave(`workspace:${workspaceId}`);
        this.workspaces.get(workspaceId)?.delete(socket.id);
      });

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
          console.log('channel:message', {
            message
          });
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

      socket.on('channel:edit_message', ({ channelId, messageId, content }) => {
        try {
          console.log('channel:edit_message', {
            messageId,
            content,
            channelId
          });
          this.io.to(`channel:${channelId}`).emit('channel:edit_message', {
            messageId,
            content,
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

      socket.on('conversation:connect', (conversationId: string, userId: string) => {
        const roomName = `conversation:${conversationId}`;
        socket.join(roomName);
        
        if (!this.conversations.has(conversationId)) {
          this.conversations.set(conversationId, new Map());
        }
        
        this.conversations.get(conversationId)?.set(socket.id, {
          userId,
          status: 'online'
        });
        
        if (!this.userSessions.has(socket.id)) {
          this.userSessions.set(socket.id, new Set());
        }
        this.userSessions.get(socket.id)?.add(conversationId);
        
        const conversationMembers = Array.from(this.conversations.get(conversationId)?.values() || []);
        this.io.to(roomName).emit('conversation:users', conversationMembers);
        console.log('conversation:connect', {
          conversationId,
          userId
        });
      });

      socket.on('conversation:leave', ({ conversationId }) => {
        this.handleConversationLeave(socket, conversationId);
      });

      socket.on('conversation:message', async (message) => {
        try {
          const roomName = `conversation:${message.conversationId}`;
          this.io.to(roomName).emit('conversation:message', message);
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to send conversation message',
            error: error.message
          });
        }
      });

      socket.on('conversation:typing', ({ conversationId, isTyping }) => {
        const conversation = this.conversations.get(conversationId);
        if (conversation && conversation.has(socket.id)) {
          const user = conversation.get(socket.id);
          socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
            userId: user?.userId,
            isTyping
          });
        }
      });

      socket.on('conversation:edit_message', ({ conversationId, messageId, content }) => {
        console.log('conversation:edit_message', {
          messageId,
          content,
          conversationId
        });
        try {
          this.io.to(`conversation:${conversationId}`).emit('conversation:edit_message', {
            messageId,
            content,
            conversationId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to edit conversation message',
            error: error.message
          });
        }
      });

      socket.on('conversation:reaction', ({ conversationId, messageId, reaction }) => {
        try {
          this.io.to(`conversation:${conversationId}`).emit('conversation:reaction', {
            messageId,
            reaction,
            conversationId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to add reaction',
            error: error.message
          });
        }
      });

      socket.on('conversation:reaction_removed', ({ conversationId, messageId, reaction }) => {
        try {
          this.io.to(`conversation:${conversationId}`).emit('conversation:reaction_removed', {
            messageId,
            reaction,
            conversationId
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to remove reaction',
            error: error.message
          });
        }
      });

      socket.on('channel:thread_reply', ({ channelId, threadId, reply }) => {
        try {
          console.log('channel:thread_reply', {
            channelId,
            threadId,
            reply
          });
          
          const roomName = `channel:${channelId}`;
          this.io.to(roomName).emit('channel:thread_reply', {
            channelId,
            threadId,
            reply,
            userId: reply.userId,
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to send thread reply',
            error: error.message
          });
        }
      });

      socket.on('bot:connect', ({ userId }) => {
        const roomName = `bot:${userId}`;
        socket.join(roomName);
        
        if (!this.botConnections.has(userId)) {
          this.botConnections.set(userId, new Set());
        }
        this.botConnections.get(userId)?.add(socket.id);
        
        if (!this.userSessions.has(socket.id)) {
          this.userSessions.set(socket.id, new Set());
        }
        this.userSessions.get(socket.id)?.add(`bot:${userId}`);

        console.log('Bot connection added:', {
          userId,
          socketId: socket.id,
          activeConnections: this.botConnections.get(userId)?.size
        });

        this.io.to(roomName).emit('bot:connect', {
          content: 'Hello! I am your AI assistant. How can I help you today?',
          sender: 'bot',
          timestamp: new Date().toISOString(),
          type: 'bot'
        });
      });

      socket.on('bot:message', async (payload) => {
        console.log("=== BOT MESSAGE HANDLER START ===");
        
        // Handle the array format we're seeing in the logs
        const data = Array.isArray(payload) ? payload[0] : payload;
        const { userId, message: messageContent } = data;
        console.log(userId)
        console.log(messageContent)
        
        console.log("Extracted data:", { userId, messageContent });
        
        const message = {
          content: messageContent,
          channelId: userId
        };
        
        console.log("Processed payload:", { userId, message });
        
        const roomName = `bot:${userId}`;
        try {
          if (!chain) {
            console.error("Chain not initialized!");
            throw new Error("RAG system not initialized");
          }

          console.log('Processing message with RAG...');
          const response = await chain.invoke({
            question: message.content,
            channelId: message.channelId,
          });

          console.log('RAG response received:', response);

          const botMessage = {
            content: response,
            userId: 'BOT_ID',
            channelId: message.channelId,
            createdAt: new Date().toISOString(),
          };

          this.io.to(roomName).emit('bot:message', botMessage);
          console.log('Sent bot response:', botMessage);
        } catch (error) {
          console.error('Detailed error in bot-message:', error);
          socket.emit('error', {
            message: 'Failed to generate bot response',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      socket.on('conversation:thread_reply', ({ conversationId, threadId, reply }) => {
        try {
          console.log('conversation:thread_reply', {
            conversationId,
            threadId,
            reply
          });
          
          const roomName = `conversation:${conversationId}`;
          this.io.to(roomName).emit('conversation:thread_reply', {
            conversationId,
            threadId,
            reply,
            userId: reply.userId,
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          socket.emit('error', {
            message: 'Failed to send thread reply',
            error: error.message
          });
        }
      });

      socket.on('disconnect', () => {
        if (this.userSessions.has(socket.id)) {
          const userSessions = this.userSessions.get(socket.id);
          userSessions?.forEach(id => {
            if (id.startsWith('bot:')) {
              const userId = id.replace('bot:', '');
              this.botConnections.get(userId)?.delete(socket.id);
              if (this.botConnections.get(userId)?.size === 0) {
                this.botConnections.delete(userId);
              }
              console.log('Bot connection removed:', {
                userId,
                socketId: socket.id,
                remainingConnections: this.botConnections.get(userId)?.size
              });
            } else if (id.startsWith('channel:')) {
              this.handleChannelLeave(socket, id.replace('channel:', ''));
            } else {
              this.handleConversationLeave(socket, id.replace('conversation:', ''));
            }
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

  private handleConversationLeave(socket: any, conversationId: string): void {
    const roomName = `conversation:${conversationId}`;
    socket.leave(roomName);
    
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const user = conversation.get(socket.id);
      conversation.delete(socket.id);
      if (conversation.size === 0) {
        this.conversations.delete(conversationId);
      }
      
      this.userSessions.get(socket.id)?.delete(conversationId);
      
      this.io.to(roomName).emit('conversation:user_left', {
        userId: user?.userId,
        conversationId
      });
    }
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
    chain = await initializeLangChain();  // Initialize LangChain
    const port = process.env.PORT || 3001;
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

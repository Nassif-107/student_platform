import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { setOnline, setOffline } from '../utils/presence.js';
import { ChatMessageModel } from '../modules/groups/chat.model.js';
import { UserModel } from '../modules/users/users.model.js';
import { formatFullName } from '../utils/format.js';

let io: SocketIOServer | null = null;

export interface SocketUser {
  id: string;
  email: string;
  role: string;
}

/** Strip HTML tags from user-provided text to prevent XSS via WebSocket */
function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

export function setupSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as {
        id?: string;
        sub?: string;
        email: string;
        role: string;
      };

      const user: SocketUser = {
        id: payload.id || payload.sub || '',
        email: payload.email,
        role: payload.role,
      };

      if (!user.id) {
        return next(new Error('Invalid token payload'));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`[Socket.io] User connected: ${user.id}`);

    // Fetch display name async — store as a promise so message handlers can await it
    const userNameReady = (async () => {
      try {
        const dbUser = await UserModel.findById(user.id).select('name').lean();
        socket.data.userName = dbUser ? formatFullName(dbUser.name) : user.email.split('@')[0];
      } catch {
        socket.data.userName = user.email.split('@')[0];
      }
      return socket.data.userName as string;
    })();

    // Register all handlers synchronously (no race condition)
    socket.join(`user:${user.id}`);
    setOnline(user.id);

    socket.on('heartbeat', () => {
      setOnline(user.id);
    });

    socket.on('join-group', (groupId: string) => {
      socket.join(`group:${groupId}`);
    });

    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('group-message', async (data: { groupId: string; text: string }) => {
      const sanitized = sanitizeText(data.text);
      if (!sanitized) return;

      // Await userName to be ready (resolved once on connect, instant after first message)
      const userName = await userNameReady;

      // Persist to MongoDB
      try {
        const doc = await ChatMessageModel.create({
          groupId: data.groupId,
          userId: user.id,
          userName,
          text: sanitized,
        });

        const msg = {
          id: doc._id.toString(),
          userId: user.id,
          userName: doc.userName,
          text: sanitized,
          timestamp: doc.createdAt.toISOString(),
        };

        // Broadcast to all group members including sender
        socket.to(`group:${data.groupId}`).emit('group-message', msg);
        socket.emit('group-message', { ...msg, isMine: true });
      } catch (err) {
        logger.error(err, '[Socket.io] Failed to save group message');
        socket.emit('group-message-error', { text: data.text, error: 'Не удалось отправить сообщение' });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.io] User disconnected: ${user.id} (${reason})`);
      setOffline(user.id);
    });
  });

  logger.info('[Socket.io] Server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('[Socket.io] Server not initialized. Call setupSocket() first.');
  }
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const server = getIO();
  server.to(`user:${userId}`).emit(event, data);
}

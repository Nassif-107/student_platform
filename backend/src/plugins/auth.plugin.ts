import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'Токен аутентификации не предоставлен',
      },
    });
    return;
  }

  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Недействительный или истёкший токен аутентификации',
      },
    });
  }
}

export function authorize(...allowedRoles: string[]) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    await authenticate(request, reply);

    if (reply.sent) return;

    if (allowedRoles.length > 0 && !allowedRoles.includes(request.user.role)) {
      reply.code(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Недостаточно прав',
        },
      });
    }
  };
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorate('authenticate', authenticate);
  fastify.log.info('Auth plugin registered');
}

export const authPluginRegistered = fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: [],
});

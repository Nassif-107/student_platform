import type { FastifyPluginAsync, RouteHandlerMethod } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../plugins/auth.plugin.js';
import { validate } from '../../middleware/validate.js';
import {
  listFriends,
  addFriend,
  removeFriend,
  friendSuggestions,
  classmates,
  listRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  checkPresence,
} from './social.controller.js';

const idParamSchema = z.object({
  id: z.string().min(1),
});

export const socialRoutes: FastifyPluginAsync = async (app) => {
  // All social routes require authentication
  app.addHook('preHandler', authenticate);

  // GET /friends — my friends list
  app.get('/friends', listFriends as RouteHandlerMethod);

  // POST /friends/:id — add friend
  app.post(
    '/friends/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    addFriend as RouteHandlerMethod
  );

  // DELETE /friends/:id — remove friend
  app.delete(
    '/friends/:id',
    { preHandler: [validate({ params: idParamSchema })] },
    removeFriend as RouteHandlerMethod
  );

  // GET /suggestions — friend recommendations
  app.get('/suggestions', friendSuggestions as RouteHandlerMethod);

  // GET /classmates — people sharing 2+ courses
  app.get('/classmates', classmates as RouteHandlerMethod);

  // GET /requests — list pending friend requests
  app.get('/requests', listRequests as RouteHandlerMethod);

  // POST /requests/:id/accept — accept friend request
  app.post(
    '/requests/:id/accept',
    { preHandler: [validate({ params: idParamSchema })] },
    acceptFriendRequest as RouteHandlerMethod
  );

  // POST /requests/:id/reject — reject friend request
  app.post(
    '/requests/:id/reject',
    { preHandler: [validate({ params: idParamSchema })] },
    rejectFriendRequest as RouteHandlerMethod
  );

  // POST /presence — check online status for user IDs
  app.post(
    '/presence',
    {
      preHandler: [
        validate({
          body: z.object({ userIds: z.array(z.string().min(1)).max(100) }),
        }),
      ],
    },
    checkPresence as RouteHandlerMethod
  );
};

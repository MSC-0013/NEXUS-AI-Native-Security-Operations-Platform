import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotificationChannelsService } from "./notification-channels.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

const CHANNEL_TYPES = ["email", "slack", "webhook", "sms", "teams"] as const;

export async function notificationChannelsRoutes(app: FastifyInstance) {
  const service = new NotificationChannelsService(app.db, app.pgClient);

  app.get("/v1/alerts/notification-channels", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/alerts/notification-channels", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      type: z.enum(CHANNEL_TYPES),
      target: z.string().min(1),
      config: z.record(z.unknown()).optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, {
      ...body,
      createdBy: getUser(request).name,
    });
    return reply.status(201).send(item);
  });

  app.patch("/v1/alerts/notification-channels/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      type: z.enum(CHANNEL_TYPES).optional(),
      target: z.string().min(1).optional(),
      config: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body ?? {});
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Notification channel not found");
    return reply.send(item);
  });

  app.delete("/v1/alerts/notification-channels/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

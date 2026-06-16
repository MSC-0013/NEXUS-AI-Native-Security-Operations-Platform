import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { RoutingRulesService } from "./routing-rules.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function routingRulesRoutes(app: FastifyInstance) {
  const service = new RoutingRulesService(app.db, app.pgClient);

  app.get("/v1/alerts/routing-rules", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/alerts/routing-rules", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      conditions: z.record(z.unknown()).optional(),
      channelId: z.string().uuid().nullable().optional(),
      priority: z.number().int().min(0).max(1000).optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/alerts/routing-rules/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      conditions: z.record(z.unknown()).optional(),
      channelId: z.string().uuid().nullable().optional(),
      priority: z.number().int().min(0).max(1000).optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body ?? {});
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Routing rule not found");
    return reply.send(item);
  });

  app.delete("/v1/alerts/routing-rules/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

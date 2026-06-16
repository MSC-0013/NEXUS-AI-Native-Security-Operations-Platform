import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SuppressionRulesService } from "./suppression-rules.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function suppressionRulesRoutes(app: FastifyInstance) {
  const service = new SuppressionRulesService(app.db, app.pgClient);

  app.get("/v1/alerts/suppression-rules", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/alerts/suppression-rules", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      condition: z.string().min(1),
      expiresAt: z.string().datetime().optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, {
      ...body,
      createdBy: getUser(request).name,
    });
    return reply.status(201).send(item);
  });

  app.patch("/v1/alerts/suppression-rules/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      condition: z.string().min(1).optional(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
    }).parse(request.body ?? {});
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Suppression rule not found");
    return reply.send(item);
  });

  app.delete("/v1/alerts/suppression-rules/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

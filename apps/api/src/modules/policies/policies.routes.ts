import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PoliciesService } from "./policies.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function policiesRoutes(app: FastifyInstance) {
  const service = new PoliciesService(app.db, app.pgClient);

  app.get("/v1/policies", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const { category } = (request.query ?? {}) as { category?: string };
    const items = await service.list(getUser(request).orgId, category);
    return reply.send({ items });
  });

  app.post("/v1/policies", {
    preHandler: authGuard(app.env, "manage:platform"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/policies/:id/toggle", {
    preHandler: authGuard(app.env, "manage:platform"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isEnabled } = z.object({ isEnabled: z.boolean() }).parse(request.body);
    const item = await service.toggle(getUser(request).orgId, id, isEnabled);
    if (!item) throw new NotFoundError("Policy not found");
    return reply.send(item);
  });

  app.delete("/v1/policies/:id", {
    preHandler: authGuard(app.env, "manage:platform"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

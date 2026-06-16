import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EscalationPoliciesService } from "./escalation-policies.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

const StepSchema = z.object({
  order: z.number().int().min(0),
  delayMinutes: z.number().int().min(0),
  channelId: z.string().uuid().nullable().optional(),
  notifyRole: z.string().optional(),
});

export async function escalationPoliciesRoutes(app: FastifyInstance) {
  const service = new EscalationPoliciesService(app.db, app.pgClient);

  app.get("/v1/alerts/escalation-policies", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/alerts/escalation-policies", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      steps: z.array(StepSchema).optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, {
      ...body,
      createdBy: getUser(request).name,
    });
    return reply.status(201).send(item);
  });

  app.patch("/v1/alerts/escalation-policies/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      steps: z.array(StepSchema).optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body ?? {});
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Escalation policy not found");
    return reply.send(item);
  });

  app.delete("/v1/alerts/escalation-policies/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

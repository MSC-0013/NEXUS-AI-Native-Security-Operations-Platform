import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { RunbooksService } from "./runbooks.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function runbooksRoutes(app: FastifyInstance) {
  const service = new RunbooksService(app.db, app.pgClient);

  app.get("/v1/runbooks", {
    preHandler: authGuard(app.env, "view:automation"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/runbooks/:id", {
    preHandler: authGuard(app.env, "view:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await service.getById(getUser(request).orgId, id);
    if (!item) throw new NotFoundError("Runbook not found");
    return reply.send(item);
  });

  app.post("/v1/runbooks", {
    preHandler: authGuard(app.env, "act:automation"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      steps: z.array(z.object({
        stepOrder: z.number().int().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        stepType: z.string().optional(),
        config: z.record(z.unknown()).optional(),
        isRequired: z.boolean().optional(),
      })).optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/runbooks/:id", {
    preHandler: authGuard(app.env, "act:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body);
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Runbook not found");
    return reply.send(item);
  });

  app.delete("/v1/runbooks/:id", {
    preHandler: authGuard(app.env, "act:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await service.delete(getUser(request).orgId, id);
    if (!deleted) throw new NotFoundError("Runbook not found");
    return reply.status(204).send();
  });

  app.post("/v1/runbooks/:id/assign", {
    preHandler: authGuard(app.env, "act:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      assignee: z.string().min(1),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    }).parse(request.body);
    const assignment = await service.assign(getUser(request).orgId, id, body.assignee, body.priority);
    if (!assignment) throw new NotFoundError("Runbook not found");
    return reply.status(201).send(assignment);
  });

  app.post("/v1/runbooks/:id/execute", {
    preHandler: authGuard(app.env, "act:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      incidentId: z.string().uuid().optional(),
      context: z.record(z.unknown()).optional(),
    }).parse(request.body ?? {});
    const execution = await service.execute(
      getUser(request).orgId,
      id,
      getUser(request).sub,
      body,
    );
    if (!execution) throw new NotFoundError("Runbook not found");
    return reply.status(202).send(execution);
  });

  app.get("/v1/runbooks/:id/executions", {
    preHandler: authGuard(app.env, "view:automation"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listExecutions(getUser(request).orgId, id);
    return reply.send({ items });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DetectionRulesService } from "./detection-rules.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function detectionRulesRoutes(app: FastifyInstance) {
  const service = new DetectionRulesService(app.db, app.pgClient);

  app.get("/v1/detection-rules", {
    preHandler: authGuard(app.env, "view:detection-rules"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/detection-rules", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      query: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      dataSources: z.array(z.string()).optional(),
      runFrequencyMinutes: z.number().int().min(1).optional(),
      lookbackMinutes: z.number().int().min(1).optional(),
      thresholdCount: z.number().int().min(1).optional(),
      dedupWindowMinutes: z.number().int().min(1).optional(),
    }).parse(request.body);
    const rule = await service.create(getUser(request).orgId, {
      ...body,
      createdBy: getUser(request).sub,
    });
    if (!rule) throw new NotFoundError("Failed to create detection rule");
    return reply.status(201).send(rule);
  });

  app.patch("/v1/detection-rules/:id", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      query: z.string().min(1).optional(),
      severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
      isEnabled: z.boolean().optional(),
      runFrequencyMinutes: z.number().int().min(1).optional(),
      lookbackMinutes: z.number().int().min(1).optional(),
      thresholdCount: z.number().int().min(1).optional(),
    }).parse(request.body);
    const rule = await service.update(getUser(request).orgId, id, body);
    if (!rule) throw new NotFoundError("Detection rule not found");
    return reply.send(rule);
  });

  app.delete("/v1/detection-rules/:id", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await service.delete(getUser(request).orgId, id);
    if (!deleted) throw new NotFoundError("Detection rule not found");
    return reply.status(204).send();
  });

  app.post("/v1/detection-rules/:id/test", {
    preHandler: authGuard(app.env, "view:detection-rules"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.test(getUser(request).orgId, id);
    if (!result) throw new NotFoundError("Detection rule not found");
    return reply.send(result);
  });

  app.post("/v1/detection-rules/:id/enable", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await service.update(getUser(request).orgId, id, { isEnabled: true });
    if (!rule) throw new NotFoundError("Detection rule not found");
    return reply.send(rule);
  });

  app.post("/v1/detection-rules/:id/disable", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rule = await service.update(getUser(request).orgId, id, { isEnabled: false });
    if (!rule) throw new NotFoundError("Detection rule not found");
    return reply.send(rule);
  });

  app.post("/v1/detection-rules/import", {
    preHandler: authGuard(app.env, "manage:detection-rules"),
  }, async (request, reply) => {
    const body = z.object({
      rules: z.array(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        query: z.string().min(1),
        severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
        dataSources: z.array(z.string()).optional(),
      })).min(1).max(50),
    }).parse(request.body);
    const imported = await service.importRules(getUser(request).orgId, body.rules, getUser(request).sub);
    return reply.status(201).send({ imported: imported.length, items: imported });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HuntService } from "./hunt.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function huntRoutes(app: FastifyInstance) {
  const service = new HuntService(app.db, app.pgClient);

  app.get("/v1/hunt/queries", {
    preHandler: authGuard(app.env),
  }, async (request, reply) => {
    const items = await service.listQueries(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/hunt/anomalies", {
    preHandler: authGuard(app.env),
  }, async (request, reply) => {
    const items = await service.listAnomalies(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/hunt/queries", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      query: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "info"]).optional(),
      scheduleMinutes: z.number().int().min(1).optional(),
    }).parse(request.body);
    const user = getUser(request);
    const item = await service.createQuery(user.orgId, user.sub, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/hunt/queries/:id", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      query: z.string().min(1).optional(),
      severity: z.enum(["critical", "high", "medium", "info"]).optional(),
      scheduleMinutes: z.number().int().min(1).nullable().optional(),
      isEnabled: z.boolean().optional(),
    }).parse(request.body ?? {});
    const item = await service.updateQuery(getUser(request).orgId, id, body);
    return reply.send(item);
  });

  app.delete("/v1/hunt/queries/:id", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteQuery(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.post("/v1/hunt/queries/:id/run", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.runQuery(getUser(request).orgId, id);
    return reply.send(result);
  });

  app.get("/v1/hunt/results", {
    preHandler: authGuard(app.env),
  }, async (request, reply) => {
    const query = z.object({
      query: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      offset: z.coerce.number().int().min(0).default(0),
    }).parse(request.query);
    const result = await service.executeQuery(getUser(request).orgId, query.query ?? "", query.limit, query.offset);
    return reply.send(result);
  });
}

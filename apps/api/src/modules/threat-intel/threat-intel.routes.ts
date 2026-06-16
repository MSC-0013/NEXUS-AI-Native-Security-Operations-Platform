import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ThreatIntelService } from "./threat-intel.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function threatIntelRoutes(app: FastifyInstance) {
  const service = new ThreatIntelService(app.db, app.pgClient);

  app.get("/v1/threat-intel/actors", {
    preHandler: authGuard(app.env, "view:threat-intel"),
  }, async (request, reply) => {
    const q = z.object({ search: z.string().optional(), limit: z.coerce.number().default(30) }).parse(request.query);
    const items = await service.listActors(q.search, q.limit);
    return reply.send({ items });
  });

  app.get("/v1/threat-intel/iocs", {
    preHandler: authGuard(app.env, "view:threat-intel"),
  }, async (request, reply) => {
    const items = await service.listIocs(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/threat-intel/iocs", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      iocType: z.string().min(1),
      value: z.string().min(1),
      context: z.string().optional(),
      confidenceScore: z.number().int().min(0).max(100).optional(),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      threatActorId: z.string().uuid().optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(request.body);
    const item = await service.createIoc(getUser(request).orgId, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/threat-intel/iocs/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      context: z.string().optional(),
      confidenceScore: z.number().int().min(0).max(100).optional(),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      isActive: z.boolean().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
    }).parse(request.body ?? {});
    const item = await service.updateIoc(getUser(request).orgId, id, body);
    return reply.send(item);
  });

  app.delete("/v1/threat-intel/iocs/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteIoc(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.post("/v1/threat-intel/iocs/import", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      items: z.array(z.object({
        iocType: z.string().min(1),
        value: z.string().min(1),
        severity: z.enum(["critical", "high", "medium", "low"]).optional(),
        confidenceScore: z.number().int().min(0).max(100).optional(),
      })).min(1).max(500),
    }).parse(request.body);
    const result = await service.importIocs(getUser(request).orgId, body.items);
    return reply.status(201).send(result);
  });

  app.get("/v1/threat-intel/ransomware", {
    preHandler: authGuard(app.env, "view:threat-intel"),
  }, async (request, reply) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(20).default(12) }).parse(request.query);
    const items = await service.listRansomware(getUser(request).orgId, q.limit);
    return reply.send({ items });
  });

  app.get("/v1/threat-intel/campaigns", {
    preHandler: authGuard(app.env, "view:threat-intel"),
  }, async (request, reply) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(20).default(10) }).parse(request.query);
    const items = await service.listCampaigns(getUser(request).orgId, q.limit);
    return reply.send({ items });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IncidentListQuerySchema, UpdateIncidentStatusSchema } from "@nexus/shared";
import { IncidentsService } from "./incidents.service.js";
import { authenticate, requirePermission } from "../../middleware/authenticate.js";
import { NotFoundError } from "../../lib/errors.js";

export async function incidentsRoutes(app: FastifyInstance) {
  const service = new IncidentsService(app.db, app.pgClient);

  app.get("/v1/incidents", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const query = IncidentListQuerySchema.parse(request.query);
    const result = await service.list(request.user!.orgId, query);
    return reply.send(result);
  });

  app.get("/v1/incidents/:id", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    let incident = await service.getById(request.user!.orgId, id);
    if (!incident) incident = await service.getByCode(request.user!.orgId, id);
    if (!incident) throw new NotFoundError("Incident not found");
    return reply.send(incident);
  });

  app.patch("/v1/incidents/:id/status", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateIncidentStatusSchema.parse(request.body);
    const incident = await service.updateStatus(
      request.user!.orgId,
      id,
      body,
      request.user!.name,
    );
    return reply.send(incident);
  });

  app.get("/v1/incidents/:id/timeline", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.getTimeline(request.user!.orgId, id);
    return reply.send({ items });
  });

  app.get("/v1/incidents/:id/comments", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listComments(request.user!.orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/incidents/:id/comments", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ content: z.string().min(1) }).parse(request.body);
    const item = await service.addComment(
      request.user!.orgId,
      id,
      request.user!.sub,
      body.content,
    );
    return reply.status(201).send(item);
  });

  app.get("/v1/incidents/:id/evidence", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listEvidence(request.user!.orgId, id);
    return reply.send({ items });
  });
}

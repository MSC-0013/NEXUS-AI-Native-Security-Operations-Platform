import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SecurityEventListQuerySchema } from "@nexus/shared";
import { EventsService } from "./events.service.js";
import { authenticate, requirePermission } from "../../middleware/authenticate.js";
import { NotFoundError } from "../../lib/errors.js";

export async function eventsRoutes(app: FastifyInstance) {
  const service = new EventsService(app.db, app.pgClient);

  app.get("/v1/events", {
    preHandler: [authenticate(app.env), requirePermission("view:events")],
  }, async (request, reply) => {
    const query = SecurityEventListQuerySchema.parse(request.query);
    const result = await service.list(request.user!.orgId, query);
    return reply.send(result);
  });

  app.get("/v1/events/:id", {
    preHandler: [authenticate(app.env), requirePermission("view:events")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await service.getById(request.user!.orgId, id);
    if (!event) throw new NotFoundError("Event not found");
    return reply.send(event);
  });

  app.post("/v1/events/:id/investigation", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const investigation = await service.createInvestigation(request.user!.orgId, id, request.user!.sub);
    if (!investigation) throw new NotFoundError("Event not found");
    return reply.status(201).send(investigation);
  });

  app.post("/v1/events/:id/suppress-similar", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
    const result = await service.suppressSimilar(
      request.user!.orgId,
      id,
      { id: request.user!.sub, name: request.user!.name, email: request.user!.email },
      body.reason,
    );
    if (!result) throw new NotFoundError("Event not found");
    return reply.send(result);
  });

  app.post("/v1/events/:id/incident", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await service.createIncidentFromEvent(
      request.user!.orgId,
      id,
      { id: request.user!.sub, name: request.user!.name, email: request.user!.email },
    );
    if (!incident) throw new NotFoundError("Event not found");
    return reply.status(201).send(incident);
  });
}

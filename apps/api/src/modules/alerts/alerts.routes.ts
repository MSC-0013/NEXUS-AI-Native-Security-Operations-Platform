import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AlertListQuerySchema } from "@nexus/shared";
import { AlertsService } from "./alerts.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function alertsRoutes(app: FastifyInstance) {
  const service = new AlertsService(app.db, app.pgClient);

  app.get("/v1/alerts", {
    preHandler: authGuard(app.env, "view:alerts"),
  }, async (request, reply) => {
    const query = AlertListQuerySchema.parse(request.query);
    const result = await service.list(getUser(request).orgId, query);
    return reply.send(result);
  });

  app.patch("/v1/alerts/:id/acknowledge", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const alert = await service.acknowledge(getUser(request).orgId, id);
    if (!alert) throw new NotFoundError("Alert not found");
    return reply.send(alert);
  });

  app.patch("/v1/alerts/:id/suppress-similar", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
    const result = await service.suppressSimilar(getUser(request).orgId, id, getUser(request).name, body.reason);
    if (!result) throw new NotFoundError("Alert not found");
    return reply.send(result);
  });

  app.post("/v1/alerts/:id/incident", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
    }).parse(request.body ?? {});
    const incident = await service.createIncidentFromAlert(getUser(request).orgId, id, getUser(request).name, body);
    if (!incident) throw new NotFoundError("Alert not found");
    return reply.status(201).send(incident);
  });
}

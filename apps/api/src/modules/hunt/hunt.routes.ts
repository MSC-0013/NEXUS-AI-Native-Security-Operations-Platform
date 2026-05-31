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

  app.get("/v1/hunt/results", {
    preHandler: authGuard(app.env),
  }, async (request, reply) => {
    const query = z.object({ query: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(25) }).parse(request.query);
    const items = await service.executeQuery(getUser(request).orgId, query.query ?? "", query.limit);
    return reply.send({ items });
  });
}

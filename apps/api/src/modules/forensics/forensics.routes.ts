import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ForensicsService } from "./forensics.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function forensicsRoutes(app: FastifyInstance) {
  const service = new ForensicsService(app.db, app.pgClient);

  app.get("/v1/forensics/:endpointId", {
    preHandler: authGuard(app.env, "view:endpoints"),
  }, async (request, reply) => {
    const { endpointId } = request.params as { endpointId: string };
    z.string().uuid().optional().parse(endpointId);
    const data = await service.getForensicsData(getUser(request).orgId, endpointId);
    return reply.send(data);
  });
}

import type { FastifyInstance } from "fastify";
import { DetectionRulesService } from "./detection-rules.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function detectionRulesRoutes(app: FastifyInstance) {
  const service = new DetectionRulesService(app.db, app.pgClient);

  app.get("/v1/detection-rules", {
    preHandler: authGuard(app.env, "view:detection-rules"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });
}

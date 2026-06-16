import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { VulnerabilitiesService } from "./vulnerabilities.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function vulnerabilitiesRoutes(app: FastifyInstance) {
  const service = new VulnerabilitiesService(app.db, app.pgClient);

  app.get("/v1/vulnerabilities", {
    preHandler: authGuard(app.env, "view:vulnerabilities"),
  }, async (request, reply) => {
    const q = z.object({
      search: z.string().optional(),
      limit: z.coerce.number().max(200).default(50),
    }).parse(request.query);
    const items = await service.list(getUser(request).orgId, q.search, q.limit);
    return reply.send({ items });
  });

  app.patch("/v1/vulnerabilities/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      patchStatus: z.enum(["unpatched", "patched", "in_progress", "dismissed"]).optional(),
    }).parse(request.body);
    const user = getUser(request);
    const vuln = await service.updateStatus(user.orgId, id, body, { id: user.sub, email: user.email });
    if (!vuln) throw new NotFoundError("Vulnerability not found");
    return reply.send(vuln);
  });

  app.get("/v1/vulnerabilities/:id", {
    preHandler: authGuard(app.env, "view:vulnerabilities"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const vuln = await service.getById(getUser(request).orgId, id);
    if (!vuln) throw new NotFoundError("Vulnerability not found");
    return reply.send(vuln);
  });

  app.post("/v1/vulnerabilities/:id/exception", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      assetId: z.string().uuid().optional(),
      reason: z.string().optional(),
    }).parse(request.body ?? {});
    const user = getUser(request);
    const result = await service.createException(user.orgId, id, body, { id: user.sub, email: user.email });
    return reply.status(201).send(result);
  });
}

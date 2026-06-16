import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CloudService } from "./cloud.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function cloudRoutes(app: FastifyInstance) {
  const service = new CloudService(app.db, app.pgClient);

  app.get("/v1/cloud/accounts", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    const items = await service.listAccounts(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/cloud/accounts", {
    preHandler: authGuard(app.env, "manage:integrations"),
  }, async (request, reply) => {
    const body = z.object({
      provider: z.enum(["aws", "azure", "gcp"]),
      accountId: z.string().min(1),
      accountAlias: z.string().optional(),
      regions: z.array(z.string()).optional(),
      credentials: z.record(z.string()).optional(),
    }).parse(request.body);
    const item = await service.connectAccount(getUser(request).orgId, body, app.env.ENCRYPTION_KEY);
    return reply.status(201).send(item);
  });

  app.delete("/v1/cloud/accounts/:id", {
    preHandler: authGuard(app.env, "manage:integrations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteAccount(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.post("/v1/cloud/accounts/:id/sync", {
    preHandler: authGuard(app.env, "manage:integrations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.syncAccount(getUser(request).orgId, id);
    return reply.send(result);
  });

  app.patch("/v1/cloud/iam-findings/:id/resolve", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.resolveIamFinding(getUser(request).orgId, id);
    return reply.send(result);
  });

  app.get("/v1/cloud/summary", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    return reply.send(await service.summary(getUser(request).orgId));
  });

  app.get("/v1/cloud/resources", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    const items = await service.listResources(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/cloud/iam-findings", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    const items = await service.listIamFindings(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/cloud/storage", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    const items = await service.listStorageBuckets(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/cloud/compliance", {
    preHandler: authGuard(app.env, "view:cloud"),
  }, async (request, reply) => {
    const items = await service.listCompliance(getUser(request).orgId);
    return reply.send({ items });
  });
}

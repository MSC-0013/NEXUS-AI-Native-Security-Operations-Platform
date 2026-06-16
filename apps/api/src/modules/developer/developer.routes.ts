import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DeveloperService } from "./developer.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";

export async function developerRoutes(app: FastifyInstance) {
  const service = new DeveloperService(app.db, app.pgClient);

  app.get("/v1/developer/api-keys", {
    preHandler: authGuard(app.env, "view:developer"),
  }, async (request, reply) => {
    const items = await service.listApiKeys(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/developer/api-keys", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      scopes: z.array(z.string()).default(["read:events"]),
    }).parse(request.body);
    const key = await service.createApiKey(getUser(request).orgId, body.name, body.scopes);
    return reply.status(201).send(key);
  });

  app.get("/v1/developer/webhooks", {
    preHandler: authGuard(app.env, "view:developer"),
  }, async (request, reply) => {
    const items = await service.listWebhooks(getUser(request).orgId);
    return reply.send({ items });
  });

  app.delete("/v1/developer/api-keys/:id", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteApiKey(getUser(request).orgId, id);
    return reply.send({ ok: true });
  });

  app.post("/v1/developer/webhooks", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const body = z.object({
      name: z.string().min(1),
      endpointUrl: z.string().url(),
      subscribedEvents: z.array(z.string()).default(["alert.created"]),
    }).parse(request.body);
    const row = await service.createWebhook(
      getUser(request).orgId,
      body.name,
      body.endpointUrl,
      body.subscribedEvents,
    );
    return reply.status(201).send(row);
  });

  app.delete("/v1/developer/webhooks/:id", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteWebhook(getUser(request).orgId, id);
    return reply.send({ ok: true });
  });

  app.patch("/v1/developer/webhooks/:id", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().min(1).optional(),
      endpointUrl: z.string().url().optional(),
      subscribedEvents: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body ?? {});
    const row = await service.updateWebhook(getUser(request).orgId, id, body);
    return reply.send(row);
  });

  app.post("/v1/developer/webhooks/:id/test", {
    preHandler: authGuard(app.env, "manage:settings"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await service.testWebhook(getUser(request).orgId, id);
    return reply.send(result);
  });

  app.get("/v1/developer/webhooks/:id/deliveries", {
    preHandler: authGuard(app.env, "view:developer"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listDeliveries(getUser(request).orgId, id);
    return reply.send({ items });
  });
}

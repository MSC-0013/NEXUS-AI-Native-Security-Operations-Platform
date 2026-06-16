import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CasesService } from "./cases.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function casesRoutes(app: FastifyInstance) {
  const service = new CasesService(app.db, app.pgClient);

  app.get("/v1/cases", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const q = z.object({ search: z.string().optional(), status: z.string().optional() }).parse(request.query);
    const items = await service.list(getUser(request).orgId, q);
    return reply.send({ items });
  });

  app.get("/v1/cases/:id", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await service.getById(getUser(request).orgId, id);
    if (!item) throw new NotFoundError("Case not found");
    return reply.send(item);
  });

  app.post("/v1/cases", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      tags: z.array(z.string()).default([]),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/cases/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["open", "in_progress", "review", "closed"]).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      ownerId: z.string().uuid().optional(),
      tags: z.array(z.string()).optional(),
    }).parse(request.body);
    const user = getUser(request);
    const item = await service.update(user.orgId, id, body, { id: user.sub, email: user.email });
    if (!item) throw new NotFoundError("Case not found");
    return reply.send(item);
  });

  app.delete("/v1/cases/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.get("/v1/cases/:id/evidence", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listEvidence(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/cases/:id/evidence", {
    preHandler: authGuard(app.env, "manage:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      type: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      storageUri: z.string().optional(),
      hashSha256: z.string().optional(),
    }).parse(request.body);
    const user = getUser(request);
    const item = await service.addEvidence(user.orgId, id, { id: user.sub, name: user.name }, body);
    return reply.status(201).send(item);
  });

  app.delete("/v1/cases/:id/evidence/:evidenceId", {
    preHandler: authGuard(app.env, "manage:cases"),
  }, async (request, reply) => {
    const { id, evidenceId } = request.params as { id: string; evidenceId: string };
    await service.deleteEvidence(getUser(request).orgId, id, evidenceId);
    return reply.status(204).send();
  });

  app.get("/v1/cases/:id/tasks", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listTasks(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/cases/:id/tasks", {
    preHandler: authGuard(app.env, "manage:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      assigneeId: z.string().uuid().optional(),
      dueDate: z.string().datetime().optional(),
    }).parse(request.body);
    const user = getUser(request);
    const item = await service.createTask(user.orgId, id, { id: user.sub, name: user.name }, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/cases/:id/tasks/:taskId", {
    preHandler: authGuard(app.env, "manage:cases"),
  }, async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["open", "in_progress", "done"]).optional(),
      assigneeId: z.string().uuid().optional(),
      dueDate: z.string().datetime().nullable().optional(),
    }).parse(request.body ?? {});
    const user = getUser(request);
    const item = await service.updateTask(user.orgId, id, taskId, { id: user.sub, name: user.name }, body);
    return reply.send(item);
  });

  app.delete("/v1/cases/:id/tasks/:taskId", {
    preHandler: authGuard(app.env, "manage:cases"),
  }, async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    await service.deleteTask(getUser(request).orgId, id, taskId);
    return reply.status(204).send();
  });

  app.get("/v1/cases/:id/activity", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listActivity(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.get("/v1/cases/:id/watchers", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listWatchers(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/cases/:id/watchers", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ userId: z.string().uuid().optional() }).parse(request.body ?? {});
    const user = getUser(request);
    const result = await service.addWatcher(user.orgId, id, body.userId ?? user.sub);
    return reply.status(201).send(result);
  });

  app.delete("/v1/cases/:id/watchers/:userId", {
    preHandler: authGuard(app.env, "view:cases"),
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const result = await service.removeWatcher(getUser(request).orgId, id, userId);
    return reply.send(result);
  });
}

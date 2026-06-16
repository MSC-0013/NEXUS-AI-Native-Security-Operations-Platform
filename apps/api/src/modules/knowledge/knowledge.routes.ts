import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { KnowledgeService } from "./knowledge.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function knowledgeRoutes(app: FastifyInstance) {
  const service = new KnowledgeService(app.db, app.pgClient);

  app.get("/v1/knowledge", {
    preHandler: authGuard(app.env, "view:knowledge"),
  }, async (request, reply) => {
    const q = z.object({
      search: z.string().optional(),
      category: z.string().optional(),
    }).parse(request.query);
    const items = await service.list(getUser(request).orgId, q.search, q.category);
    return reply.send({ items });
  });

  app.get("/v1/knowledge/:id", {
    preHandler: authGuard(app.env, "view:knowledge"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await service.getById(getUser(request).orgId, id);
    if (!item) throw new NotFoundError("Article not found");
    return reply.send(item);
  });

  app.post("/v1/knowledge", {
    preHandler: authGuard(app.env, "manage:knowledge"),
  }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1),
      category: z.string().optional(),
      content: z.string().min(1),
      tags: z.array(z.string()).default([]),
      isPublished: z.boolean().default(false),
    }).parse(request.body);
    const article = await service.create(getUser(request).orgId, getUser(request).sub, body);
    return reply.status(201).send(article);
  });

  app.patch("/v1/knowledge/:id", {
    preHandler: authGuard(app.env, "manage:knowledge"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      category: z.string().optional(),
      content: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
    }).parse(request.body);
    const article = await service.update(getUser(request).orgId, id, body);
    if (!article) throw new NotFoundError("Article not found");
    return reply.send(article);
  });

  app.delete("/v1/knowledge/:id", {
    preHandler: authGuard(app.env, "manage:knowledge"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await service.delete(getUser(request).orgId, id);
    if (!deleted) throw new NotFoundError("Article not found");
    return reply.status(204).send();
  });

  app.get("/v1/knowledge/bookmarks", {
    preHandler: authGuard(app.env, "view:knowledge"),
  }, async (request, reply) => {
    const user = getUser(request);
    const items = await service.listBookmarks(user.orgId, user.sub);
    return reply.send({ items });
  });

  app.post("/v1/knowledge/:id/bookmark", {
    preHandler: authGuard(app.env, "view:knowledge"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);
    const result = await service.bookmark(user.orgId, user.sub, id);
    return reply.status(201).send(result);
  });

  app.delete("/v1/knowledge/:id/bookmark", {
    preHandler: authGuard(app.env, "view:knowledge"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = getUser(request);
    const result = await service.unbookmark(user.orgId, user.sub, id);
    return reply.send(result);
  });
}

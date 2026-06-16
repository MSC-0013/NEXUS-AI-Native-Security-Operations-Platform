import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { InvestigationsService } from "./investigations.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function investigationsRoutes(app: FastifyInstance) {
  const service = new InvestigationsService(app.db, app.pgClient);

  app.get("/v1/investigations", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.get("/v1/investigations/:id", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const item = await service.getById(getUser(request).orgId, id);
    if (!item) throw new NotFoundError("Investigation not found");
    return reply.send(item);
  });

  app.post("/v1/investigations", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1),
      content: z.string().optional(),
      caseId: z.string().uuid().optional(),
      incidentId: z.string().uuid().optional(),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.patch("/v1/investigations/:id", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      isPublished: z.boolean().optional(),
      caseId: z.string().uuid().optional(),
      incidentId: z.string().uuid().optional(),
    }).parse(request.body);
    const item = await service.update(getUser(request).orgId, id, body);
    if (!item) throw new NotFoundError("Investigation not found");
    return reply.send(item);
  });

  app.delete("/v1/investigations/:id", {
    preHandler: authGuard(app.env, "act:incidents"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.get("/v1/investigations/:id/notes", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listNotes(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/investigations/:id/notes", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ body: z.string().min(1).max(4000) }).parse(request.body);
    const user = getUser(request);
    const note = await service.addNote(
      user.orgId,
      id,
      { id: user.sub, name: user.name, email: user.email },
      body.body,
    );
    if (!note) throw new NotFoundError("Investigation not found");
    return reply.status(201).send(note);
  });

  app.get("/v1/investigations/:id/evidence", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listEvidence(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/investigations/:id/evidence", {
    preHandler: authGuard(app.env, "act:investigations"),
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
    const item = await service.addEvidence(getUser(request).orgId, id, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.delete("/v1/investigations/:id/evidence/:evidenceId", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id, evidenceId } = request.params as { id: string; evidenceId: string };
    await service.deleteEvidence(getUser(request).orgId, id, evidenceId);
    return reply.status(204).send();
  });

  app.get("/v1/investigations/:id/entities", {
    preHandler: authGuard(app.env, "view:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listEntities(getUser(request).orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/investigations/:id/entities", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      entityType: z.string().min(1),
      entityValue: z.string().min(1),
      notes: z.string().optional(),
    }).parse(request.body);
    const item = await service.addEntity(getUser(request).orgId, id, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.delete("/v1/investigations/:id/entities/:entityId", {
    preHandler: authGuard(app.env, "act:investigations"),
  }, async (request, reply) => {
    const { id, entityId } = request.params as { id: string; entityId: string };
    await service.deleteEntity(getUser(request).orgId, id, entityId);
    return reply.status(204).send();
  });
}

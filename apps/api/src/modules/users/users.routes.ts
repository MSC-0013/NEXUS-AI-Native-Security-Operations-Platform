import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { UsersService } from "./users.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

export async function usersRoutes(app: FastifyInstance) {
  const service = new UsersService(app.db, app.pgClient);

  app.get("/v1/users", {
    preHandler: authGuard(app.env, "manage:org"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/users", {
    preHandler: authGuard(app.env, "manage:accounts"),
  }, async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      fullName: z.string().min(1),
      role: z.string().default("viewer"),
    }).parse(request.body);
    const user = await service.create(getUser(request).orgId, body);
    return reply.status(201).send(user);
  });

  app.patch("/v1/users/:id", {
    preHandler: authGuard(app.env, "manage:accounts"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      fullName: z.string().min(1).optional(),
      role: z.string().optional(),
      status: z.enum(["active", "suspended", "pending"]).optional(),
    }).parse(request.body);
    const user = await service.update(getUser(request).orgId, id, body);
    if (!user) throw new NotFoundError("User not found");
    return reply.send(user);
  });

  app.delete("/v1/users/:id", {
    preHandler: authGuard(app.env, "manage:accounts"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (id === getUser(request).sub) {
      return reply.status(400).send({ error: "Cannot delete your own account" });
    }
    await service.delete(getUser(request).orgId, id);
    return reply.status(204).send();
  });

  app.get("/v1/users/identity-anomalies", {
    preHandler: authGuard(app.env, "view:identity"),
  }, async (request, reply) => {
    const items = await service.listIdentityAnomalies(getUser(request).orgId);
    return reply.send({ items });
  });
}

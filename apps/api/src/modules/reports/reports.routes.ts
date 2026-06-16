import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ReportsService } from "./reports.service.js";
import { authGuard, getUser } from "../../lib/route-helpers.js";
import { NotFoundError } from "../../lib/errors.js";

const CRON_FIELD = /^[\d*/,-]+$/;
const cronSchema = z.string().refine(
  (expr) => {
    const parts = expr.trim().split(/\s+/);
    return parts.length === 5 && parts.every((p) => CRON_FIELD.test(p));
  },
  { message: "Must be a 5-field cron expression (minute hour day month weekday)" },
);

export async function reportsRoutes(app: FastifyInstance) {
  const service = new ReportsService(app.db, app.pgClient);

  app.get("/v1/reports", {
    preHandler: authGuard(app.env, "view:reports"),
  }, async (request, reply) => {
    const items = await service.list(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/reports", {
    preHandler: authGuard(app.env, "view:reports"),
  }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1),
      reportType: z.string().min(1),
    }).parse(request.body);
    const item = await service.create(getUser(request).orgId, body);
    return reply.status(201).send(item);
  });

  app.get("/v1/reports/:id/download", {
    preHandler: authGuard(app.env, "view:reports"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await service.getById(getUser(request).orgId, id);
    if (!report) throw new NotFoundError("Report not found");

    const csv = await service.generateCsv(getUser(request).orgId, report);
    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="${report.title.replace(/\s+/g, "_")}.csv"`);
    return reply.send(csv);
  });

  app.get("/v1/reports/schedules", {
    preHandler: authGuard(app.env, "view:reports"),
  }, async (request, reply) => {
    const items = await service.listSchedules(getUser(request).orgId);
    return reply.send({ items });
  });

  app.post("/v1/reports/schedule", {
    preHandler: authGuard(app.env, "act:reports"),
  }, async (request, reply) => {
    const body = z.object({
      reportType: z.string().min(1),
      title: z.string().min(1),
      cronSchedule: cronSchema,
      recipients: z.array(z.string().email()).min(1),
      parameters: z.record(z.unknown()).optional(),
    }).parse(request.body);
    const item = await service.schedule(getUser(request).orgId, getUser(request).sub, body);
    return reply.status(201).send(item);
  });

  app.delete("/v1/reports/schedule/:id", {
    preHandler: authGuard(app.env, "act:reports"),
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await service.deleteSchedule(getUser(request).orgId, id);
    return reply.status(204).send();
  });
}

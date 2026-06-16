import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { IncidentListQuerySchema, UpdateIncidentStatusSchema } from "@nexus/shared";
import { IncidentsService } from "./incidents.service.js";
import { InvestigationsService } from "../investigations/investigations.service.js";
import { authenticate, requirePermission } from "../../middleware/authenticate.js";
import { NotFoundError } from "../../lib/errors.js";

export async function incidentsRoutes(app: FastifyInstance) {
  const service = new IncidentsService(app.db, app.pgClient);
  const investigationsService = new InvestigationsService(app.db, app.pgClient);

  const resolveIncident = async (orgId: string, id: string) => {
    let incident = await service.getById(orgId, id);
    if (!incident) incident = await service.getByCode(orgId, id);
    if (!incident) throw new NotFoundError("Incident not found");
    return incident;
  };

  // ── List ────────────────────────────────────────────────────────────────────

  app.get("/v1/incidents", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const query = IncidentListQuerySchema.parse(request.query);
    const result = await service.list(request.user!.orgId, query);
    return reply.send(result);
  });

  // ── Create ──────────────────────────────────────────────────────────────────

  app.post("/v1/incidents", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      category: z.string().optional(),
      affectedAssetsCount: z.number().int().min(0).optional(),
      affectedUsersCount: z.number().int().min(0).optional(),
      slaHours: z.number().int().min(1).optional(),
      leadInvestigatorId: z.string().uuid().optional(),
      mitreTechniques: z.array(z.object({
        mitreId: z.string().min(1),
        mitreName: z.string().optional(),
        mitreTactic: z.string().optional(),
      })).optional(),
    }).parse(request.body);

    const incident = await service.create(
      request.user!.orgId,
      request.user!.sub,
      request.user!.email,
      body,
    );
    return reply.status(201).send(incident);
  });

  // ── Get by ID ───────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    return reply.send(incident);
  });

  // ── Update ──────────────────────────────────────────────────────────────────

  app.patch("/v1/incidents/:id", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const body = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      severity: z.enum(["critical", "high", "medium", "low"]).optional(),
      category: z.string().optional(),
      summary: z.string().optional(),
      remediationSteps: z.string().optional(),
      affectedAssetsCount: z.number().int().min(0).optional(),
      affectedUsersCount: z.number().int().min(0).optional(),
    }).parse(request.body);
    const updated = await service.update(
      request.user!.orgId,
      incident.id,
      request.user!.sub,
      request.user!.email,
      body,
    );
    return reply.send(updated);
  });

  app.patch("/v1/incidents/:id/status", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = UpdateIncidentStatusSchema.parse(request.body);
    const incident = await service.updateStatus(
      request.user!.orgId,
      id,
      body,
      request.user!.name,
    );
    return reply.send(incident);
  });

  // ── Delete ──────────────────────────────────────────────────────────────────

  app.delete("/v1/incidents/:id", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    await service.delete(
      request.user!.orgId,
      incident.id,
      request.user!.sub,
      request.user!.email,
    );
    return reply.status(204).send();
  });

  // ── Investigation ────────────────────────────────────────────────────────────

  app.post("/v1/incidents/:id/investigation", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const investigation = await investigationsService.getOrCreateForIncident(
      request.user!.orgId,
      { id: incident.id, code: incident.code, title: incident.title },
      { id: request.user!.sub, name: request.user!.name, email: request.user!.email },
    );
    if (investigation.created && incident.status === "open") {
      await service.updateStatus(request.user!.orgId, incident.id, { status: "investigating" }, request.user!.name);
    }
    return reply.status(investigation.created ? 201 : 200).send(investigation);
  });

  // ── Responders ───────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/responders", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const items = await service.listResponders(request.user!.orgId, incident.id);
    return reply.send({ items });
  });

  app.post("/v1/incidents/:id/responders", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const body = z.object({
      userId: z.string().uuid(),
      role: z.enum(["lead", "support", "reviewer"]).default("support"),
    }).parse(request.body);
    const responder = await service.addResponder(request.user!.orgId, incident.id, body.userId, body.role);
    return reply.status(201).send(responder);
  });

  app.delete("/v1/incidents/:id/responders/:userId", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    await service.removeResponder(request.user!.orgId, incident.id, userId);
    return reply.status(204).send();
  });

  // ── Timeline ─────────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/timeline", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.getTimeline(request.user!.orgId, id);
    return reply.send({ items });
  });

  // ── Comments ──────────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/comments", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listComments(request.user!.orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/incidents/:id/comments", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ content: z.string().min(1) }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    const item = await service.addComment(
      request.user!.orgId,
      incident.id,
      request.user!.sub,
      body.content,
    );
    return reply.status(201).send(item);
  });

  // ── Evidence ──────────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/evidence", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listEvidence(request.user!.orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/incidents/:id/evidence", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      type: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      fileName: z.string().optional(),
      fileSizeBytes: z.number().optional(),
      mimeType: z.string().optional(),
      storageUri: z.string().optional(),
      hashSha256: z.string().optional(),
      isSensitive: z.boolean().optional(),
    }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    const item = await service.addEvidence(
      request.user!.orgId,
      incident.id,
      request.user!.sub,
      body,
    );
    return reply.status(201).send(item);
  });

  // ── SLA ────────────────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/sla", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const sla = incident.sla;
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(sla.startedAt)) / 60_000));
    return reply.send({
      id: incident.id,
      ...sla,
      breached: sla.breached || elapsedMinutes > sla.targetMinutes,
      remainingMinutes: Math.max(0, sla.targetMinutes - elapsedMinutes),
      percentUsed: Math.min(100, Math.round((elapsedMinutes / sla.targetMinutes) * 100)),
      elapsedMinutes,
    });
  });

  // ── Escalation ────────────────────────────────────────────────────────────────

  app.post("/v1/incidents/:id/escalate", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      reason: z.string().min(1),
      newSeverity: z.enum(["low", "medium", "high", "critical"]).optional(),
    }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    const updated = await service.escalate(
      request.user!.orgId,
      incident.id,
      body.reason,
      body.newSeverity,
      request.user!.name,
    );
    return reply.status(201).send(updated);
  });

  app.get("/v1/incidents/:id/escalations", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const escalations = incident.timeline
      .filter((t) => t.action === "escalation" || t.action === "severity_change")
      .map((t, index) => ({
        id: `${incident.id}-esc-${index}`,
        reason: t.detail,
        at: t.at,
        by: t.actor,
        action: t.action,
      }));
    return reply.send({ items: escalations });
  });

  // ── Assignee / RCA / Postmortem ──────────────────────────────────────────────

  app.patch("/v1/incidents/:id/assignee", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({ assigneeId: z.string().min(1) }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    const updated = await service.updateAssignee(request.user!.orgId, incident.id, body.assigneeId, request.user!.name);
    return reply.send(updated);
  });

  app.patch("/v1/incidents/:id/rca", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      step: z.enum(["identify", "analyze", "confirm", "document"]),
      notes: z.string().optional(),
    }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    await service.addComment(
      request.user!.orgId,
      incident.id,
      request.user!.sub,
      `[RCA:${body.step.toUpperCase()}] ${body.notes ?? "Step advanced"}`,
    );
    if (body.step === "document" && body.notes) {
      await service.updateRca(request.user!.orgId, incident.id, body.notes, request.user!.name);
    }
    return reply.send({ step: body.step, savedAt: new Date().toISOString() });
  });

  app.post("/v1/incidents/:id/postmortem", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const incident = await resolveIncident(request.user!.orgId, id);
    const postmortem = service.generatePostmortemTemplate(incident);
    return reply.send(postmortem);
  });

  // ── Remediations ──────────────────────────────────────────────────────────────

  app.get("/v1/incidents/:id/remediations", {
    preHandler: [authenticate(app.env), requirePermission("view:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const items = await service.listRemediations(request.user!.orgId, id);
    return reply.send({ items });
  });

  app.post("/v1/incidents/:id/remediations", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z.object({
      title: z.string().min(1),
      assignee: z.string().optional(),
      dueDate: z.string().optional(),
    }).parse(request.body);
    const incident = await resolveIncident(request.user!.orgId, id);
    const item = await service.createRemediation(request.user!.orgId, incident.id, body, request.user!.name);
    return reply.status(201).send(item);
  });

  app.patch("/v1/incidents/:id/remediations/:remId", {
    preHandler: [authenticate(app.env), requirePermission("act:incidents")],
  }, async (request, reply) => {
    const { remId } = request.params as { id: string; remId: string };
    const body = z.object({
      status: z.enum(["pending", "in_progress", "complete", "failed"]),
    }).parse(request.body);
    const item = await service.updateRemediationStatus(remId, body.status, request.user!.name);
    return reply.send(item);
  });
}

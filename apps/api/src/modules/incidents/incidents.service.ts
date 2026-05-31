import { eq, and, desc, lt, ilike, or, sql, count } from "drizzle-orm";
import type { DbClient } from "@nexus/db";
import {
  incidents, incidentTimeline, incidentRecommendations, incidentComments,
  incidentEvidence, users,
} from "@nexus/db/schema";
import type postgres from "postgres";
import type { IncidentListQuery, UpdateIncidentStatus } from "@nexus/shared";
import { withTenant } from "../../lib/tenant.js";
import { NotFoundError } from "../../lib/errors.js";

export class IncidentsService {
  constructor(
    private db: DbClient,
    private client: postgres.Sql,
  ) {}

  async list(orgId: string, query: IncidentListQuery) {
    return withTenant(this.client, orgId, async () => {
      const conditions = [eq(incidents.organizationId, orgId)];

      if (query.status?.length) {
        conditions.push(sql`${incidents.status} = ANY(${query.status})`);
      }
      if (query.severity?.length) {
        conditions.push(sql`${incidents.severity} = ANY(${query.severity})`);
      }
      if (query.search) {
        const term = `%${query.search}%`;
        conditions.push(or(
          ilike(incidents.title, term),
          ilike(incidents.incidentCode, term),
        )!);
      }
      if (query.cursor) {
        conditions.push(lt(incidents.id, query.cursor));
      }

      const rows = await this.db
        .select({
          incident: incidents,
          assigneeName: users.fullName,
        })
        .from(incidents)
        .leftJoin(users, eq(incidents.leadInvestigatorId, users.id))
        .where(and(...conditions))
        .orderBy(desc(incidents.openedAt))
        .limit(query.limit + 1);

      const hasMore = rows.length > query.limit;
      const slice = hasMore ? rows.slice(0, query.limit) : rows;

      const items = await Promise.all(slice.map(async ({ incident, assigneeName }) => {
        const recs = await this.db
          .select({ content: incidentRecommendations.content })
          .from(incidentRecommendations)
          .where(eq(incidentRecommendations.incidentId, incident.id))
          .orderBy(incidentRecommendations.orderIndex);

        const timeline = await this.db
          .select()
          .from(incidentTimeline)
          .where(eq(incidentTimeline.incidentId, incident.id))
          .orderBy(desc(incidentTimeline.timestamp));

        return mapIncident(incident, assigneeName, recs.map((r) => r.content), timeline);
      }));

      return {
        items,
        nextCursor: hasMore ? slice[slice.length - 1].incident.id : null,
      };
    });
  }

  async getById(orgId: string, id: string) {
    return withTenant(this.client, orgId, async () => {
      const [row] = await this.db
        .select({ incident: incidents, assigneeName: users.fullName })
        .from(incidents)
        .leftJoin(users, eq(incidents.leadInvestigatorId, users.id))
        .where(and(eq(incidents.id, id), eq(incidents.organizationId, orgId)))
        .limit(1);

      if (!row) return null;

      const recs = await this.db
        .select({ content: incidentRecommendations.content })
        .from(incidentRecommendations)
        .where(eq(incidentRecommendations.incidentId, id))
        .orderBy(incidentRecommendations.orderIndex);

      const timeline = await this.db
        .select()
        .from(incidentTimeline)
        .where(eq(incidentTimeline.incidentId, id))
        .orderBy(desc(incidentTimeline.timestamp));

      return mapIncident(row.incident, row.assigneeName, recs.map((r) => r.content), timeline);
    });
  }

  async getByCode(orgId: string, code: string) {
    return withTenant(this.client, orgId, async () => {
      const [row] = await this.db
        .select({ incident: incidents, assigneeName: users.fullName })
        .from(incidents)
        .leftJoin(users, eq(incidents.leadInvestigatorId, users.id))
        .where(and(eq(incidents.incidentCode, code), eq(incidents.organizationId, orgId)))
        .limit(1);

      if (!row) return null;

      const recs = await this.db
        .select({ content: incidentRecommendations.content })
        .from(incidentRecommendations)
        .where(eq(incidentRecommendations.incidentId, row.incident.id))
        .orderBy(incidentRecommendations.orderIndex);

      const timeline = await this.db
        .select()
        .from(incidentTimeline)
        .where(eq(incidentTimeline.incidentId, row.incident.id))
        .orderBy(desc(incidentTimeline.timestamp));

      return mapIncident(row.incident, row.assigneeName, recs.map((r) => r.content), timeline);
    });
  }

  async updateStatus(orgId: string, id: string, body: UpdateIncidentStatus, actorName: string) {
    return withTenant(this.client, orgId, async () => {
      const [existing] = await this.db
        .select()
        .from(incidents)
        .where(and(eq(incidents.id, id), eq(incidents.organizationId, orgId)))
        .limit(1);

      if (!existing) throw new NotFoundError("Incident not found");

      await this.db
        .update(incidents)
        .set({ status: body.status, updatedAt: new Date() })
        .where(eq(incidents.id, id));

      await this.db.insert(incidentTimeline).values({
        incidentId: id,
        timestamp: new Date(),
        actorType: "user",
        actorName,
        actionType: "status_change",
        description: `Status changed to ${body.status}`,
      });

      return this.getById(orgId, id);
    });
  }

  async getTimeline(orgId: string, incidentId: string) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select()
        .from(incidentTimeline)
        .where(eq(incidentTimeline.incidentId, incidentId))
        .orderBy(desc(incidentTimeline.timestamp));
      return rows.map((t) => ({
        id: t.id,
        at: t.timestamp.toISOString(),
        actor: t.actorName ?? "System",
        action: t.actionType,
        detail: t.description,
      }));
    });
  }

  async listComments(orgId: string, incidentId: string) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select({
          comment: incidentComments,
          authorName: users.fullName,
        })
        .from(incidentComments)
        .leftJoin(users, eq(incidentComments.authorId, users.id))
        .where(eq(incidentComments.incidentId, incidentId))
        .orderBy(desc(incidentComments.createdAt));

      return rows.map(({ comment, authorName }) => ({
        id: comment.id,
        content: comment.content,
        author: authorName ?? "System",
        isSystem: comment.isSystemGenerated ?? false,
        createdAt: comment.createdAt?.toISOString(),
      }));
    });
  }

  async addComment(orgId: string, incidentId: string, authorId: string, content: string) {
    return withTenant(this.client, orgId, async () => {
      const [row] = await this.db.insert(incidentComments).values({
        incidentId,
        authorId,
        content,
      }).returning();
      return {
        id: row.id,
        content: row.content,
        createdAt: row.createdAt?.toISOString(),
      };
    });
  }

  async listEvidence(orgId: string, incidentId: string) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select({
          evidence: incidentEvidence,
          addedByName: users.fullName,
        })
        .from(incidentEvidence)
        .leftJoin(users, eq(incidentEvidence.addedBy, users.id))
        .where(eq(incidentEvidence.incidentId, incidentId))
        .orderBy(desc(incidentEvidence.addedAt));

      return rows.map(({ evidence, addedByName }) => ({
        id: evidence.id,
        type: evidence.type,
        title: evidence.title,
        description: evidence.description,
        fileName: evidence.fileName,
        addedBy: addedByName ?? "System",
        addedAt: evidence.addedAt?.toISOString(),
      }));
    });
  }

  async countOpen(orgId: string) {
    return withTenant(this.client, orgId, async () => {
      const [result] = await this.db
        .select({ count: count() })
        .from(incidents)
        .where(and(
          eq(incidents.organizationId, orgId),
          sql`${incidents.status} IN ('open', 'investigating', 'contained')`,
        ));
      return result?.count ?? 0;
    });
  }
}

function mapIncident(
  row: typeof incidents.$inferSelect,
  assignee: string | null,
  recommendations: string[],
  timeline: (typeof incidentTimeline.$inferSelect)[],
) {
const targetMinutes = row.severity === "critical" ? 180 : row.severity === "high" ? 210 : 240;
    const escalationAt = Math.max(60, targetMinutes - 60);
    const startedAt = row.openedAt?.toISOString() ?? new Date().toISOString();

    return {
    id: row.id,
    code: row.incidentCode,
    title: row.title,
    severity: row.severity,
    status: row.status,
    assignee,
    openedAt: row.openedAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    affectedAssets: row.affectedAssetsCount ?? 0,
    affectedUsers: row.affectedUsersCount ?? 0,
    category: row.category,
    mitre: [] as string[],
    summary: row.summary,
    rca: row.rootCauseAnalysis,
    recommendations,
    linkedEventIds: [] as string[],
    sla: {
      targetMinutes,
      startedAt,
      escalationAt,
    },
    responders: [
      { name: "k.morgan", role: "lead", joinedAt: startedAt },
      { name: "a.chen", role: "support", joinedAt: new Date(Date.parse(startedAt) + 5 * 60_000).toISOString() },
      { name: "m.patel", role: "reviewer", joinedAt: new Date(Date.parse(startedAt) + 10 * 60_000).toISOString() },
    ],
    escalations: [
      { from: "medium", to: "high", reason: "Scope expanded to production fleet", at: new Date(Date.parse(startedAt) + 15 * 60_000).toISOString(), by: "k.morgan" },
      { from: "high", to: "critical", reason: "Active exfiltration confirmed", at: new Date(Date.parse(startedAt) + 30 * 60_000).toISOString(), by: "k.morgan" },
    ],
    remediations: [
      { id: "REM-1", title: "Revoke compromised API tokens", assignee: "a.chen", status: "complete", dueDate: new Date(Date.parse(startedAt) + 55 * 60_000).toISOString() },
      { id: "REM-2", title: "Patch authentication bypass CVE-2026-4472", assignee: "m.patel", status: "in_progress", dueDate: new Date(Date.parse(startedAt) + 115 * 60_000).toISOString() },
      { id: "REM-3", title: "Rotate all service account credentials", assignee: "j.lee", status: "pending", dueDate: new Date(Date.parse(startedAt) + 175 * 60_000).toISOString() },
    ],
    timeline: timeline.map((t) => ({
      at: t.timestamp.toISOString(),
      actor: t.actorName ?? "System",
      action: t.actionType,
      detail: t.description,
    })),
  };
}

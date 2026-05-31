import { eq, desc } from "drizzle-orm";
import type { DbClient } from "@nexus/db";
import { reports } from "@nexus/db/schema";
import type postgres from "postgres";
import { withTenant } from "../../lib/tenant.js";

export class ReportsService {
  constructor(private db: DbClient, private client: postgres.Sql) {}

  async list(orgId: string) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select()
        .from(reports)
        .where(eq(reports.organizationId, orgId))
        .orderBy(desc(reports.createdAt))
        .limit(50);

      return rows.map((r) => ({
        id: r.id,
        reportType: r.reportType,
        title: r.title,
        status: r.status,
        storageUri: r.storageUri,
        generatedAt: r.generatedAt?.toISOString(),
        createdAt: r.createdAt?.toISOString(),
      }));
    });
  }

  async create(orgId: string, data: { title: string; reportType: string }) {
    return withTenant(this.client, orgId, async () => {
      const [row] = await this.db.insert(reports).values({
        organizationId: orgId,
        title: data.title,
        reportType: data.reportType,
        status: "pending",
      }).returning();

      return {
        id: row.id,
        reportType: row.reportType,
        title: row.title,
        status: row.status,
        generatedAt: row.generatedAt?.toISOString() ?? null,
        createdAt: row.createdAt?.toISOString(),
      };
    });
  }
}

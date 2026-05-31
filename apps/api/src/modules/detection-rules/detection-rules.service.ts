import { eq, desc } from "drizzle-orm";
import type { DbClient } from "@nexus/db";
import { alertRules } from "@nexus/db/schema";
import type postgres from "postgres";
import { withTenant } from "../../lib/tenant.js";

export class DetectionRulesService {
  constructor(private db: DbClient, private client: postgres.Sql) {}

  async list(orgId: string) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select()
        .from(alertRules)
        .where(eq(alertRules.organizationId, orgId))
        .orderBy(desc(alertRules.updatedAt))
        .limit(100);

      return rows.map((r) => {
        const dataSources = (r.dataSources as string[]) ?? [];
        const logSource = dataSources[0] ?? "events";
        const status = r.isEnabled
          ? (r.falsePositiveCount > 5 && r.truePositiveCount === 0 ? "testing" : "active")
          : "disabled";

        return {
          id: r.id,
          code: `SIG-${r.id.slice(0, 8).toUpperCase()}`,
          name: r.name,
          description: r.description,
          query: r.query,
          severity: r.severity,
          logSource,
          dataSources,
          isEnabled: r.isEnabled ?? true,
          matches24h: (r.truePositiveCount ?? 0) + Math.min(r.falsePositiveCount ?? 0, 3),
          lastMatchAt: r.updatedAt?.toISOString() ?? null,
          status: status as "active" | "testing" | "disabled",
        };
      });
    });
  }
}

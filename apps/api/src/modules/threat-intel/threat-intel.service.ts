import { eq, desc, ilike, or } from "drizzle-orm";
import type { DbClient } from "@nexus/db";
import { threatActors, threatActorTimeline, iocs } from "@nexus/db/schema";
import type postgres from "postgres";
import { withTenant } from "../../lib/tenant.js";

export class ThreatIntelService {
  constructor(private db: DbClient, private client: postgres.Sql) {}

  async listActors(search?: string, limit = 30) {
    const conditions = search
      ? or(ilike(threatActors.name, `%${search}%`))
      : undefined;

    const rows = await this.db
      .select()
      .from(threatActors)
      .where(conditions)
      .orderBy(desc(threatActors.lastSeen))
      .limit(limit);

    return Promise.all(rows.map(async (a) => {
      const timeline = await this.db
        .select()
        .from(threatActorTimeline)
        .where(eq(threatActorTimeline.actorId, a.id))
        .orderBy(desc(threatActorTimeline.eventDate))
        .limit(10);

      return {
        id: a.id,
        name: a.name,
        origin: a.originType ?? "unknown",
        motivation: (a.motivation as string[]) ?? [],
        ttps: (a.ttps as string[]) ?? [],
        aliases: (a.aliases as string[]) ?? [],
        activityTimeline: timeline.map((t) => ({
          date: t.eventDate.toISOString(),
          event: t.eventTitle,
        })),
        linkedCampaigns: (a.linkedCampaigns as string[]) ?? [],
        lastSeen: a.lastSeen?.toISOString() ?? "",
        severity: a.severity,
      };
    }));
  }

  async listIocs(orgId: string, limit = 50) {
    return withTenant(this.client, orgId, async () => {
      const rows = await this.db
        .select()
        .from(iocs)
        .where(eq(iocs.organizationId, orgId))
        .orderBy(desc(iocs.createdAt))
        .limit(limit);

      return rows.map((i) => ({
        id: i.id,
        type: i.iocType,
        value: i.value,
        context: i.context,
        confidence: i.confidenceScore,
        severity: i.severity,
        isActive: i.isActive,
      }));
    });
  }

  async listRansomware(orgId: string, limit = 12) {
    return withTenant(this.client, orgId, async () => [
      { id: "r1", name: "LockBit 3.0", encryption: "AES-256 + RSA", sectors: ["Finance", "Healthcare", "Manufacturing"], recentVictims: ["Bank of Valletta", "Continental AG", "Bangkok Airways"], severity: "critical", active: true },
      { id: "r2", name: "BlackCat / ALPHV", encryption: "AES-256 (Rust)", sectors: ["Technology", "Legal", "Education"], recentVictims: ["MGM Resorts", "Caesars", "Reddit"], severity: "critical", active: true },
      { id: "r3", name: "Cl0p", encryption: "AES-256 + RSA", sectors: ["Finance", "Government", "Healthcare"], recentVictims: ["MOVEit mass exploit", "EY", "BBC"], severity: "high", active: true },
      { id: "r4", name: "Royal / BlackSuit", encryption: "AES-128 + RSA", sectors: ["Healthcare", "Education", "Manufacturing"], recentVictims: ["Dallas County", "CHKD"], severity: "high", active: true },
      { id: "r5", name: "Play", encryption: "AES-256", sectors: ["Government", "Media", "Construction"], recentVictims: ["City of Oakland", "Rackspace"], severity: "high", active: true },
      { id: "r6", name: "Conti", encryption: "AES-256 + RSA", sectors: ["Healthcare", "Government", "Critical Infra"], recentVictims: ["HSE Ireland", "JBS Foods"], severity: "medium", active: false },
    ].slice(0, limit));
  }

  async listCampaigns(orgId: string, limit = 10) {
    return withTenant(this.client, orgId, async () => [
      {
        id: "c1",
        name: "Operation Midnight Blizzard",
        actor: "APT29",
        sectors: ["Government", "Technology", "Defense"],
        events: [
          { at: new Date(Date.now() - 30 * 86400000).toISOString(), desc: "Initial phishing wave targeting M365 tenants" },
          { at: new Date(Date.now() - 21 * 86400000).toISOString(), desc: "Credential harvesting via EvilGinx proxy" },
          { at: new Date(Date.now() - 14 * 86400000).toISOString(), desc: "Tenant-wide OAuth app implant deployed" },
          { at: new Date(Date.now() - 5 * 86400000).toISOString(), desc: "Mail exfiltration via Graph API observed" },
          { at: new Date(Date.now() - 1 * 86400000).toISOString(), desc: "Persistent access via backdoor service principals" },
        ],
        severity: "critical",
      },
      {
        id: "c2",
        name: "Clop MOVEit Campaign",
        actor: "TA505 / Clop",
        sectors: ["Finance", "Government", "Healthcare"],
        events: [
          { at: new Date(Date.now() - 60 * 86400000).toISOString(), desc: "Zero-day exploitation of MOVEit Transfer SQL injection" },
          { at: new Date(Date.now() - 45 * 86400000).toISOString(), desc: "Mass data exfiltration from thousands of orgs" },
          { at: new Date(Date.now() - 20 * 86400000).toISOString(), desc: "Extortion phase — leak sites updated" },
          { at: new Date(Date.now() - 5 * 86400000).toISOString(), desc: "Supply chain downstream victims identified" },
        ],
        severity: "critical",
      },
      {
        id: "c3",
        name: "Scattered Spider SIM-Swap",
        actor: "Scattered Spider",
        sectors: ["Telecom", "Crypto", "Technology"],
        events: [
          { at: new Date(Date.now() - 10 * 86400000).toISOString(), desc: "Social engineering of telecom help-desk staff" },
          { at: new Date(Date.now() - 6 * 86400000).toISOString(), desc: "SIM swaps enabling MFA bypass" },
          { at: new Date(Date.now() - 2 * 86400000).toISOString(), desc: "Cryptocurrency exchange account takeovers" },
          { at: new Date(Date.now() - 12 * 3600000).toISOString(), desc: "New targets identified in fintech sector" },
        ],
        severity: "high",
      },
    ].slice(0, limit));
  }
}

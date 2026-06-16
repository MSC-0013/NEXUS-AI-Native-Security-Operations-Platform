import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { BookOpen, Search, Tag, Bookmark, FileText, Shield, TriangleAlert as AlertTriangle, Plus, Clock, User, ChevronRight, Skull, Crosshair, ListChecks, FlaskConical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useCreateKnowledgeArticle, useKnowledge } from "@/lib/api-hooks";

export const Route = createFileRoute("/_app/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — NEXUS" },
      { name: "description", content: "Security runbooks, remediation guides, and threat documentation." },
    ],
  }),
  component: KnowledgePage,
});

/* ── types ── */

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
}

interface Article {
  id: string;
  title: string;
  categoryId: string;
  updatedAt: string;
  author: string;
  tags: string[];
  bookmarked: boolean;
  excerpt: string;
  content?: string;
}

/* ── mock data ── */

const h = (hours: number) => new Date(Date.now() - 3600000 * hours).toISOString();
const d = (days: number) => new Date(Date.now() - 86400000 * days).toISOString();

const CATEGORIES: Category[] = [
  { id: "runbooks", label: "Runbooks", icon: BookOpen, count: 3 },
  { id: "remediation", label: "Remediation Guides", icon: Zap, count: 2 },
  { id: "attack-refs", label: "Attack References", icon: Crosshair, count: 2 },
  { id: "threat-docs", label: "Threat Documentation", icon: Skull, count: 2 },
  { id: "playbooks", label: "Security Playbooks", icon: Shield, count: 2 },
  { id: "ir-procedures", label: "Incident Response Procedures", icon: ListChecks, count: 1 },
];

const ARTICLES: Article[] = [
  {
    id: "kb-001", title: "Ransomware containment and recovery runbook", categoryId: "runbooks",
    updatedAt: h(2), author: "amelia.lee", tags: ["ransomware", "containment", "recovery"], bookmarked: true,
    excerpt: "Step-by-step procedure for containing active ransomware incidents and initiating recovery.",
    content: `## Overview\nThis runbook covers the full lifecycle of a ransomware containment event — from initial detection through recovery verification.\n\n## Phase 1: Detection & Triage\n1. Confirm ransomware indicators (mass file encryption, ransom note discovery)\n2. Classify the ransomware family using hash lookups against VirusTotal and internal sandbox\n3. Assign severity based on blast radius and data classification\n\n## Phase 2: Containment\n1. **Network isolation** — Apply EDR network containment policy to all affected endpoints\n2. **Disable shared drives** — Prevent lateral encryption via SMB/NFS shares\n3. **Block C2** — Add IOCs to firewall and DNS sinkhole rules\n4. **Preserve evidence** — Capture memory dumps before shutdown where possible\n\n## Phase 3: Eradication\n1. Remove persistence mechanisms (scheduled tasks, registry run keys, startup items)\n2. Scan all endpoints with updated signatures\n3. Reset the krbtgt account password twice (12-hour gap)\n\n## Phase 4: Recovery\n1. Verify backup integrity (checksum validation against known-good manifests)\n2. Restore from last clean backup — prioritize Tier 1 systems\n3. Rebuild compromised endpoints from golden images\n\n## Phase 5: Post-Incident\n- Update detection rules with new IOCs\n- Conduct lessons-learned review within 72 hours\n- File regulatory notifications if PII/PHI impacted`,
  },
  {
    id: "kb-002", title: "Credential stuffing response runbook", categoryId: "runbooks",
    updatedAt: d(1), author: "n.patel", tags: ["credential-stuffing", "MFA", "okta"], bookmarked: false,
    excerpt: "Procedures for detecting and mitigating credential stuffing campaigns against SSO infrastructure.",
  },
  {
    id: "kb-003", title: "DNS tunneling C2 detection and mitigation", categoryId: "runbooks",
    updatedAt: d(3), author: "j.okafor", tags: ["dns-tunneling", "C2", "dga"], bookmarked: false,
    excerpt: "How to identify DNS-based command-and-control channels and deploy countermeasures.",
  },
  {
    id: "kb-004", title: "Privilege escalation remediation — AWS IAM", categoryId: "remediation",
    updatedAt: h(5), author: "h.tanaka", tags: ["AWS", "IAM", "privilege-escalation"], bookmarked: true,
    excerpt: "Remediation steps for wildcard IAM policies and over-privileged service accounts in AWS.",
  },
  {
    id: "kb-005", title: "K8s pod escape — containment and hardening", categoryId: "remediation",
    updatedAt: d(2), author: "h.tanaka", tags: ["kubernetes", "container-escape", "hardening"], bookmarked: false,
    excerpt: "Procedures for containing container escape incidents and hardening K8s security posture.",
  },
  {
    id: "kb-006", title: "MITRE ATT&CK T1078 — Valid Accounts", categoryId: "attack-refs",
    updatedAt: d(4), author: "s.ivanov", tags: ["MITRE", "T1078", "valid-accounts"], bookmarked: false,
    excerpt: "Reference for techniques using valid credentials to bypass access controls and persist in environments.",
  },
  {
    id: "kb-007", title: "MITRE ATT&CK T1486 — Data Encrypted for Impact", categoryId: "attack-refs",
    updatedAt: d(5), author: "amelia.lee", tags: ["MITRE", "T1486", "ransomware"], bookmarked: false,
    excerpt: "Technique reference for ransomware actors encrypting data to disrupt availability and extort victims.",
  },
  {
    id: "kb-008", title: "APT29 — Cozy Bear threat profile", categoryId: "threat-docs",
    updatedAt: d(1), author: "s.ivanov", tags: ["APT29", "espionage", "Russia"], bookmarked: true,
    excerpt: "Detailed profile of APT29 including TTPs, known campaigns, and associated malware families.",
  },
  {
    id: "kb-009", title: "Lazarus Group — financial threat actor profile", categoryId: "threat-docs",
    updatedAt: d(2), author: "marco.cruz", tags: ["lazarus", "financial", "DPRK"], bookmarked: false,
    excerpt: "Threat actor profile covering Lazarus Group operations targeting financial institutions and cryptocurrency exchanges.",
  },
  {
    id: "kb-010", title: "Phishing campaign response playbook", categoryId: "playbooks",
    updatedAt: h(8), author: "n.patel", tags: ["phishing", "social-engineering", "email-security"], bookmarked: false,
    excerpt: "End-to-end playbook for identifying, containing, and remediating phishing campaigns.",
  },
  {
    id: "kb-011", title: "Cloud account takeover playbook", categoryId: "playbooks",
    updatedAt: d(6), author: "h.tanaka", tags: ["cloud", "account-takeover", "IAM"], bookmarked: false,
    excerpt: "Playbook for responding to compromised cloud service accounts and preventing re-access.",
  },
  {
    id: "kb-012", title: "Severity classification and escalation matrix", categoryId: "ir-procedures",
    updatedAt: d(0), author: "amelia.lee", tags: ["severity", "escalation", "SLA"], bookmarked: true,
    excerpt: "Official severity definitions, SLA targets, and escalation paths for all incident categories.",
  },
];

/* ── component ── */

function KnowledgePage() {
  const [query, setQuery] = useState("");
  const { data: knowledgeData, isLoading } = useKnowledge(query || undefined);
  const createArticle = useCreateKnowledgeArticle();
  const articles: Article[] = useMemo(
    () =>
      (knowledgeData?.items ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        categoryId: a.category.toLowerCase().replace(/\s+/g, "-") || "runbooks",
        updatedAt: a.updatedAt,
        author: "NEXUS",
        tags: a.tags,
        bookmarked: false,
        excerpt: a.excerpt,
        content: a.excerpt,
      })),
    [knowledgeData],
  );
  const displayArticles = articles.length > 0 ? articles : ARTICLES;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("New response runbook");
  const [draftCategory, setDraftCategory] = useState("Runbooks");
  const [draftTags, setDraftTags] = useState("runbook,response");
  const [draftContent, setDraftContent] = useState("## Purpose\nDocument the response workflow.\n\n## Steps\n1. Triage the signal\n2. Gather evidence\n3. Assign owner\n4. Track remediation");
  const effectiveArticleId = selectedArticleId ?? displayArticles[0]?.id ?? "";

  const allTags = useMemo(() => {
    const set = new Set<string>();
    displayArticles.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [displayArticles]);

  const filtered = useMemo(() => {
    return displayArticles.filter((a) => {
      if (selectedCat && a.categoryId !== selectedCat) return false;
      if (showBookmarked && !a.bookmarked) return false;
      if (activeTag && !a.tags.includes(activeTag)) return false;
      if (query) {
        const q = query.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)) || a.author.includes(q);
      }
      return true;
    });
  }, [selectedCat, showBookmarked, activeTag, query, displayArticles]);

  const selectedArticle = displayArticles.find((a) => a.id === effectiveArticleId) ?? displayArticles[0];
  const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      {/* panel 1 — categories sidebar */}
      <div className="w-full lg:w-[220px] lg:min-w-[220px] border-r border-border bg-surface/40 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Library</div>
          <h1 className="text-xl font-semibold tracking-tight mt-0.5">Knowledge Base</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => setSelectedCat(null)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                !selectedCat ? "bg-surface-2/80 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/40",
              )}
            >
              <BookOpen className="size-4" />
              <span className="flex-1">All categories</span>
              <span className="text-[10px] font-mono text-muted-foreground">{isLoading ? "…" : displayArticles.length}</span>
            </button>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                    selectedCat === cat.id ? "bg-surface-2/80 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/40",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 truncate">{cat.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{cat.count}</span>
                </button>
              );
            })}
          </div>

          {/* tags section */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <Tag className="size-3" /> Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {allTags.slice(0, 16).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[10px] font-mono transition-colors",
                    activeTag === tag
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* panel 2 — article list */}
      <div className="w-full lg:w-[360px] lg:min-w-[360px] border-r border-border bg-background flex flex-col">
        {/* search & filter bar */}
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 rounded-md border border-border bg-surface px-3 py-1.5">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookmarked((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider transition-colors",
                showBookmarked
                  ? "border-high/40 bg-high/10 text-high"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Bookmark className={cn("size-3.5", showBookmarked && "fill-high")} /> Bookmarked
            </button>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-mono text-primary"
              >
                <Tag className="size-3" /> {activeTag}
                <span className="ml-0.5 text-primary/60">&times;</span>
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="size-3.5" /> Create Article
            </button>
          </div>
        </div>

        {/* article list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No articles match your filters.</div>
          ) : (
            filtered.map((article) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticleId(article.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/60 transition-colors",
                  selectedArticleId === article.id
                    ? "bg-surface-2/80 border-l-2 border-l-primary"
                    : "hover:bg-surface-2/40",
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{article.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">{catLabel(article.categoryId)}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><User className="size-3" />{article.author}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatDistanceToNow(new Date(article.updatedAt), { addSuffix: true })}</span>
                      {article.bookmarked && <Bookmark className="size-3 fill-high text-high" />}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded border border-border bg-background px-1 py-0 text-[9px] font-mono text-muted-foreground">{tag}</span>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-[9px] font-mono text-muted-foreground">+{article.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* panel 3 — article detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-5 max-w-[900px] mx-auto">
          {/* header */}
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              <FileText className="size-3" />
              {catLabel(selectedArticle.categoryId)}
            </div>
            <h2 className="text-xl font-semibold tracking-tight">{selectedArticle.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1"><User className="size-3" />{selectedArticle.author}</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />Updated {formatDistanceToNow(new Date(selectedArticle.updatedAt), { addSuffix: true })}</span>
              <button
                onClick={() => {
                  const idx = ARTICLES.findIndex((a) => a.id === selectedArticle.id);
                  if (idx >= 0) ARTICLES[idx].bookmarked = !ARTICLES[idx].bookmarked;
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 transition-colors",
                  selectedArticle.bookmarked
                    ? "border-high/40 bg-high/10 text-high"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <Bookmark className={cn("size-3", selectedArticle.bookmarked && "fill-high")} />
                {selectedArticle.bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedArticle.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  <Tag className="size-2.5" />{tag}
                </span>
              ))}
            </div>
          </div>

          {/* content */}
          <section className="rounded-lg border border-border bg-surface/60">
            <div className="px-5 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5" /> Content
            </div>
            <div className="p-5">
              {selectedArticle.content ? (
                <MarkdownContent text={selectedArticle.content} />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{selectedArticle.excerpt}</p>
                  <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center">
                    <FileText className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                    <div className="text-sm text-muted-foreground">Full article content available in production</div>
                    <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">Contact the author for complete documentation</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* bookmarked articles quick access */}
          <section className="rounded-lg border border-border bg-surface/60">
            <div className="px-4 py-2.5 border-b border-border text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Bookmark className="size-3.5" /> Bookmarked Articles
            </div>
            <div className="divide-y divide-border/50">
              {ARTICLES.filter((a) => a.bookmarked).map((article) => (
                <button
                  key={article.id}
                  onClick={() => setSelectedArticleId(article.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/40",
                    selectedArticleId === article.id && "bg-surface-2/60",
                  )}
                >
                  <Bookmark className="size-3.5 fill-high text-high shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{article.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{catLabel(article.categoryId)}</div>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Knowledge article</div>
                <h2 className="text-lg font-semibold">Create article</h2>
              </div>
              <button onClick={() => setCreateOpen(false)} className="text-muted-foreground hover:text-foreground">close</button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Article title"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={draftCategory}
                  onChange={(event) => setDraftCategory(event.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Category"
                />
                <input
                  value={draftTags}
                  onChange={(event) => setDraftTags(event.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Tags comma separated"
                />
              </div>
              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                rows={8}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring font-mono"
              />
              <button
                onClick={() =>
                  createArticle.mutate(
                    {
                      title: draftTitle.trim(),
                      category: draftCategory.trim() || "General",
                      content: draftContent.trim(),
                      tags: draftTags.split(",").map((tag) => tag.trim()).filter(Boolean),
                    },
                    {
                      onSuccess: (article) => {
                        setSelectedArticleId(article.id);
                        setCreateOpen(false);
                      },
                    },
                  )
                }
                disabled={createArticle.isPending || !draftTitle.trim() || !draftContent.trim()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Create and publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── minimal markdown-like renderer ── */

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) return <div key={idx} className="h-2" />;

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-base font-semibold tracking-tight mt-4 text-foreground">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-sm font-semibold tracking-tight mt-3 text-foreground">
              {trimmed.slice(4)}
            </h4>
          );
        }

        if (/^\d+\.\s/.test(trimmed)) {
          const content = trimmed.replace(/^\d+\.\s/, "");
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-muted-foreground tabular-nums min-w-[1.5ch]">{trimmed.match(/^\d+/)?.[0]}.</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <div key={idx} className="flex gap-2 ml-2">
              <span className="text-muted-foreground">&bull;</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <strong key={match.index} className="font-semibold text-foreground">
        {match[1]}
      </strong>,
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

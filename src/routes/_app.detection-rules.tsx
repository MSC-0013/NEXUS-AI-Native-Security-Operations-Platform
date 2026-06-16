import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "@/components/severity-badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAlertRules, useAuditLog, useUpdateAlertRule, useCreateAlertRule, useTestDetectionRule, useImportDetectionRules, type TestRuleResult } from "@/lib/api-hooks";
import type { AlertRuleDto } from "@nexus/shared";
import type { SeverityLevel } from "@nexus/shared";
import { FileText, Play, GitBranch, Shield, Plus, Copy, Download, Eye, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/detection-rules")({
  head: () => ({ meta: [{ title: "Detection Rules — NEXUS" }] }),
  component: DetectionRulesPage,
});

const TEMPLATES = [
  { name: "Authentication Anomaly", description: "Detect failed auth patterns and brute force", fields: ["user", "source_ip", "action", "count"] },
  { name: "Process Execution", description: "Monitor suspicious parent-child process relationships", fields: ["process_name", "parent_process", "command_line", "user"] },
  { name: "Network Beaconing", description: "Detect periodic outbound connections to C2 infrastructure", fields: ["destination_ip", "frequency", "bytes", "protocol"] },
  { name: "IAM Policy Change", description: "Alert on IAM privilege escalation and policy modifications", fields: ["role", "action", "resource", "principal"] },
];

type RuleRow = AlertRuleDto & { logSource: string };

function DetectionRulesPage() {
  const { data, isLoading } = useAlertRules();
  const updateRule = useUpdateAlertRule();
  const createRule = useCreateAlertRule();
  const apiRules = data?.items ?? [];
  const [localEnabled, setLocalEnabled] = useState<Record<string, boolean>>({});
  const [selectedRule, setSelectedRule] = useState<RuleRow | null>(null);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    name: "",
    description: "",
    query: "",
    severity: "medium" as SeverityLevel,
    dataSources: ["events"],
    runFrequencyMinutes: 5,
    lookbackMinutes: 60,
    thresholdCount: 1,
  });
  const testRule = useTestDetectionRule();
  const importRules = useImportDetectionRules();
  const [testResult, setTestResult] = useState<TestRuleResult | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const { data: auditData } = useAuditLog(selectedRule?.name);

  const rules: RuleRow[] = useMemo(
    () =>
      apiRules.map((r) => ({
        ...r,
        logSource: r.dataSources[0] ?? "general",
        severity: r.severity as SeverityLevel,
      })),
    [apiRules],
  );

  const isEnabled = (r: RuleRow) => localEnabled[r.id] ?? r.isEnabled;

  const toggleRule = (id: string, current: boolean) => {
    setLocalEnabled((prev) => ({ ...prev, [id]: !current }));
    updateRule.mutate({ id, isEnabled: !current });
  };

  const handleCreateRule = () => {
    createRule.mutate(newRuleForm, {
      onSuccess: () => {
        setShowNewRuleModal(false);
        setNewRuleForm({
          name: "",
          description: "",
          query: "",
          severity: "medium",
          dataSources: ["events"],
          runFrequencyMinutes: 5,
          lookbackMinutes: 60,
          thresholdCount: 1,
        });
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Detection Rules</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowNewRuleModal(true)}
            className="text-xs px-3 py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />New Rule
          </button>
          <button onClick={() => setShowImportDialog(true)} className="text-xs px-3 py-1.5 rounded bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"><Download className="h-3 w-3" />Import</button>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Rules</TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center gap-1.5 text-xs"><GitBranch className="h-3.5 w-3.5" />Builder</TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" />Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="rounded-lg border border-border bg-surface/60 mt-4 divide-y divide-border">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading detection rules…</div>
            )}
            {!isLoading && rules.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No detection rules configured.</div>
            )}
            {rules.map((r) => {
              const enabled = isEnabled(r);
              const status = enabled ? (r.status === "testing" ? "testing" : "active") : "disabled";
              const lastMatch = r.lastMatchAt ? new Date(r.lastMatchAt) : undefined;
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors">
                  <Switch checked={enabled} onCheckedChange={() => toggleRule(r.id, enabled)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{r.name}</span>
                      <SeverityBadge severity={r.severity as SeverityLevel} />
                      <span className={cn("text-[8px] font-mono px-1.5 py-0.5 rounded", status === "active" ? "bg-healthy/10 text-healthy border border-healthy/30" : status === "testing" ? "bg-medium/10 text-medium border border-medium/30" : "bg-surface text-muted-foreground border border-border")}>
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                      <span className="truncate max-w-[120px]">{r.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{r.logSource}</span>
                      <span>•</span>
                      <span>{r.matches24h} matches/24h</span>
                      {lastMatch && <><span>•</span><span>Last: {formatDistanceToNow(lastMatch, { addSuffix: true })}</span></>}
                    </div>
                  </div>
                  <button
                    onClick={() => { setTestingId(r.id); testRule.mutate(r.id, { onSuccess: (res) => { setTestResult(res); setTestingId(null); }, onError: () => setTestingId(null) }); }}
                    disabled={testingId === r.id}
                    className="text-xs px-2 py-1 rounded bg-surface hover:bg-background border border-border text-muted-foreground flex items-center gap-1 disabled:opacity-50"
                  >{testingId === r.id ? "Testing…" : <><Play className="h-3 w-3" />Test</>}</button>
                  <button
                    onClick={() => setSelectedRule(r)}
                    className="text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> Details
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="builder">
          <div className="rounded-lg border border-border bg-surface/60 mt-4 p-5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4">Condition Builder</div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">AND</span>
                <select className="bg-background border border-border rounded px-2 py-1 text-xs font-mono"><option>event_type</option><option>source</option><option>severity</option></select>
                <select className="bg-background border border-border rounded px-2 py-1 text-xs font-mono"><option>equals</option><option>contains</option><option>matches</option></select>
                <input className="bg-background border border-border rounded px-2 py-1 text-xs font-mono flex-1" placeholder="network" />
                <button className="text-xs text-muted-foreground hover:text-foreground">+</button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Generated Query</div>
              <div className="bg-background p-3 rounded font-mono text-xs text-muted-foreground">event_type = "network" AND frequency &gt; 5/min</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="rounded-lg border border-border bg-surface/60 p-4">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.fields.map((f) => (
                    <span key={f} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-border bg-background">{f}</span>
                  ))}
                </div>
                <button className="mt-3 text-xs px-3 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors">Use Template</button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {selectedRule && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-lg border border-border bg-surface shadow-xl">
            <header className="flex items-start justify-between border-b border-border p-5">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{selectedRule.code}</div>
                <h2 className="text-lg font-semibold">{selectedRule.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedRule.description ?? "No description"}</p>
              </div>
              <button onClick={() => setSelectedRule(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 p-5">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Detection query</div>
                  <pre className="rounded-md border border-border bg-background p-3 text-xs font-mono whitespace-pre-wrap">{selectedRule.query}</pre>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Audit log details</div>
                  <div className="rounded-md border border-border divide-y divide-border">
                    {(auditData?.items ?? []).slice(0, 6).map((entry) => (
                      <div key={entry.id} className="px-3 py-2 text-xs">
                        <div className="font-mono">{entry.action}</div>
                        <div className="text-muted-foreground">{entry.actor} - {new Date(entry.timestamp).toLocaleString()}</div>
                      </div>
                    ))}
                    {(auditData?.items ?? []).length === 0 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground">No audit entries match this rule yet.</div>
                    )}
                  </div>
                </div>
              </div>
              <aside className="space-y-3">
                <SeverityBadge severity={selectedRule.severity as SeverityLevel} />
                <div className="rounded-md border border-border bg-background p-3 text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-mono">{selectedRule.status}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Matches 24h</span><span className="font-mono">{selectedRule.matches24h}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Log source</span><span className="font-mono">{selectedRule.logSource}</span></div>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Data sources</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedRule.dataSources.map((source) => (
                      <span key={source} className="rounded border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{source}</span>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
      {showNewRuleModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-surface shadow-xl">
            <header className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold">Create New Detection Rule</h2>
                <p className="mt-1 text-sm text-muted-foreground">Define a new detection rule for your security events</p>
              </div>
              <button onClick={() => setShowNewRuleModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name *</Label>
                <Input
                  id="rule-name"
                  value={newRuleForm.name}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                  placeholder="e.g., Suspicious PowerShell Execution"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-description">Description</Label>
                <Textarea
                  id="rule-description"
                  value={newRuleForm.description}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                  placeholder="Describe what this rule detects"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-query">Detection Query *</Label>
                <Textarea
                  id="rule-query"
                  value={newRuleForm.query}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, query: e.target.value })}
                  placeholder="event_type = 'process' AND command_line LIKE '%powershell%'"
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-severity">Severity *</Label>
                  <Select
                    value={newRuleForm.severity}
                    onValueChange={(value: SeverityLevel) => setNewRuleForm({ ...newRuleForm, severity: value })}
                  >
                    <SelectTrigger id="rule-severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-threshold">Threshold Count</Label>
                  <Input
                    id="rule-threshold"
                    type="number"
                    min="1"
                    value={newRuleForm.thresholdCount}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, thresholdCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-frequency">Run Frequency (minutes)</Label>
                  <Input
                    id="rule-frequency"
                    type="number"
                    min="1"
                    value={newRuleForm.runFrequencyMinutes}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, runFrequencyMinutes: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-lookback">Lookback (minutes)</Label>
                  <Input
                    id="rule-lookback"
                    type="number"
                    min="1"
                    value={newRuleForm.lookbackMinutes}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, lookbackMinutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-datasources">Data Sources</Label>
                <Input
                  id="rule-datasources"
                  value={newRuleForm.dataSources.join(", ")}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, dataSources: e.target.value.split(",").map((s: string) => s.trim()) })}
                  placeholder="events, edr, cloudtrail"
                />
              </div>
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border p-5">
              <Button
                variant="outline"
                onClick={() => setShowNewRuleModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRule}
                disabled={!newRuleForm.name || !newRuleForm.query || createRule.isPending}
              >
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </footer>
          </div>
        </div>
      )}

      {/* ---- Test result overlay ---- */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTestResult(null)}>
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Test Result — {testResult.ruleName}</h3>
              <button onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-md bg-surface p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-healthy font-medium capitalize">{testResult.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Matches (24h)</span><span className="font-mono font-medium">{testResult.matchCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tested at</span><span className="font-mono text-xs">{new Date(testResult.testedAt).toLocaleTimeString()}</span></div>
            </div>
            <p className="text-xs text-muted-foreground">{testResult.message}</p>
            <Button variant="outline" className="w-full" onClick={() => setTestResult(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* ---- Import dialog ---- */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImportDialog(false)}>
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">Import Detection Rules</h2>
              <button onClick={() => setShowImportDialog(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </header>
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">Paste a JSON array of rules. Each rule needs <code className="font-mono bg-surface px-1 rounded">name</code>, <code className="font-mono bg-surface px-1 rounded">query</code>, and optionally <code className="font-mono bg-surface px-1 rounded">severity</code>, <code className="font-mono bg-surface px-1 rounded">description</code>.</p>
              <Textarea
                className="font-mono text-xs h-48"
                placeholder={'[{"name":"Brute Force","query":"count(*) > 5","severity":"high","description":"..."}]'}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
              />
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-border p-5">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
              <Button
                disabled={!importJson.trim() || importRules.isPending}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(importJson);
                    const rules = Array.isArray(parsed) ? parsed : [parsed];
                    importRules.mutate(rules, {
                      onSuccess: (res) => {
                        setImportJson("");
                        setShowImportDialog(false);
                        alert(`Imported ${res.imported} rule${res.imported !== 1 ? "s" : ""} successfully.`);
                      },
                    });
                  } catch {
                    alert("Invalid JSON. Please check your input.");
                  }
                }}
              >
                {importRules.isPending ? "Importing…" : "Import Rules"}
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

export type Role =
  | "super_admin"
  | "security_admin"
  | "soc_analyst"
  | "threat_hunter"
  | "incident_responder"
  | "compliance_officer"
  | "viewer";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  security_admin: "Security Admin",
  soc_analyst: "SOC Analyst",
  threat_hunter: "Threat Hunter",
  incident_responder: "Incident Responder",
  compliance_officer: "Compliance Officer",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  super_admin: "Full platform & org control",
  security_admin: "Operational + integrations + settings",
  soc_analyst: "Triage events, act on incidents",
  threat_hunter: "Read-only investigation & hunting",
  incident_responder: "Take action on active incidents",
  compliance_officer: "Compliance, audit, governance",
  viewer: "Read-only across operational views",
};

export type Permission =
  // operate
  | "view:dashboard"
  | "view:executive"
  | "view:events"
  | "view:incidents"
  | "act:incidents"
  | "view:alerts"
  | "view:notifications"
  | "view:cases"
  // detect
  | "view:threat-intel"
  | "view:endpoints"
  | "view:identity"
  | "view:cloud"
  | "view:vulnerabilities"
  | "view:network"
  // investigate
  | "view:attack-graph"
  | "view:copilot"
  | "view:investigations"
  | "view:hunt"
  | "view:forensics"
  | "view:timeline"
  // analyze
  | "view:security-graph"
  | "view:query"
  | "view:detection-rules"
  | "view:policies"
  // govern
  | "view:compliance"
  | "view:audit"
  | "view:sso"
  | "view:automation"
  | "view:ownership"
  // platform
  | "view:reports"
  | "view:developer"
  | "view:status"
  | "view:knowledge"
  | "view:platform-health"
  | "view:digital-twin"
  | "view:attack-replay"
  | "view:threat-simulation"
  // write
  | "manage:knowledge"
  | "manage:cases"
  | "manage:sso"
  | "manage:policies"
  | "manage:detection-rules"
  | "act:investigations"
  | "act:reports"
  | "act:automation"
  // admin
  | "manage:settings"
  | "manage:billing"
  | "view:onboarding"
  | "manage:integrations"
  | "manage:org"
  | "manage:accounts"
  | "view:access-matrix";

const ALL: Permission[] = [
  "view:dashboard", "view:executive", "view:events", "view:incidents", "act:incidents",
  "view:alerts", "view:notifications", "view:cases",
  "view:threat-intel", "view:endpoints", "view:identity", "view:cloud", "view:vulnerabilities", "view:network",
  "view:attack-graph", "view:copilot", "view:investigations", "view:hunt", "view:forensics", "view:timeline",
  "view:security-graph", "view:query", "view:detection-rules", "view:policies",
  "view:compliance", "view:audit", "view:sso", "view:automation", "view:ownership",
  "view:reports", "view:developer", "view:status", "view:knowledge", "view:platform-health",
  "view:digital-twin", "view:attack-replay", "view:threat-simulation",
  "manage:knowledge", "manage:cases", "manage:sso", "manage:policies",
  "manage:detection-rules", "act:investigations", "act:reports", "act:automation",
  "manage:settings", "manage:billing", "view:onboarding", "manage:integrations", "manage:org", "manage:accounts", "view:access-matrix",
];

const OPERATE_READ: Permission[] = [
  "view:dashboard", "view:events", "view:incidents", "view:alerts", "view:notifications", "view:cases",
];
const DETECT_READ: Permission[] = [
  "view:threat-intel", "view:endpoints", "view:identity", "view:cloud", "view:vulnerabilities", "view:network",
];
const INVESTIGATE_READ: Permission[] = [
  "view:attack-graph", "view:copilot", "view:investigations", "view:hunt", "view:forensics", "view:timeline",
];
const ANALYZE_READ: Permission[] = [
  "view:security-graph", "view:query", "view:detection-rules", "view:policies",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  security_admin: ALL.filter((p) => p !== "manage:org"),
  soc_analyst: [
    ...OPERATE_READ, "act:incidents",
    ...DETECT_READ,
    ...INVESTIGATE_READ,
    "act:investigations",
    "view:security-graph", "view:query", "view:detection-rules", "manage:detection-rules",
    "view:audit", "view:status", "view:knowledge", "manage:knowledge",
    "view:reports", "act:reports",
    "view:automation", "act:automation",
    "manage:cases",
  ],
  threat_hunter: [
    "view:dashboard", "view:events", "view:incidents", "view:alerts", "view:notifications",
    ...DETECT_READ,
    ...INVESTIGATE_READ,
    "act:investigations",
    "view:security-graph", "view:query", "view:detection-rules", "manage:detection-rules",
    "view:audit", "view:knowledge", "view:reports", "view:threat-simulation", "view:attack-replay",
  ],
  incident_responder: [
    ...OPERATE_READ, "act:incidents",
    "view:endpoints", "view:identity", "view:network",
    "view:attack-graph", "view:investigations", "act:investigations", "view:forensics", "view:timeline", "view:copilot",
    "view:audit", "view:status", "manage:cases",
    "view:automation", "act:automation",
  ],
  compliance_officer: [
    "view:dashboard", "view:executive",
    "view:compliance", "view:audit", "view:policies", "manage:policies", "view:ownership",
    "view:reports", "view:knowledge", "view:access-matrix",
  ],
  viewer: [
    "view:dashboard", "view:events", "view:incidents", "view:alerts", "view:notifications",
    "view:compliance", "view:status", "view:knowledge", "view:reports",
  ],
};

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

/** Map a pathname to the permission required to access it. */
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/dashboard": "view:dashboard",
  "/executive": "view:executive",
  "/events": "view:events",
  "/incidents": "view:incidents",
  "/alerts": "view:alerts",
  "/notifications": "view:notifications",
  "/cases": "view:cases",
  "/threat-intelligence": "view:threat-intel",
  "/endpoints": "view:endpoints",
  "/identity": "view:identity",
  "/cloud-security": "view:cloud",
  "/vulnerabilities": "view:vulnerabilities",
  "/network": "view:network",
  "/attack-graph": "view:attack-graph",
  "/copilot": "view:copilot",
  "/investigations": "view:investigations",
  "/hunt": "view:hunt",
  "/forensics": "view:forensics",
  "/timeline": "view:timeline",
  "/security-graph": "view:security-graph",
  "/query": "view:query",
  "/detection-rules": "view:detection-rules",
  "/policies": "view:policies",
  "/compliance": "view:compliance",
  "/audit": "view:audit",
  "/sso": "view:sso",
  "/automation": "view:automation",
  "/ownership": "view:ownership",
  "/reports": "view:reports",
  "/developer": "view:developer",
  "/status": "view:status",
  "/knowledge": "view:knowledge",
  "/platform-health": "view:platform-health",
  "/digital-twin": "view:digital-twin",
  "/attack-replay": "view:attack-replay",
  "/threat-simulation": "view:threat-simulation",
  "/settings": "manage:settings",
  "/billing": "manage:billing",
  "/onboarding": "view:onboarding",
  "/integrations": "manage:integrations",
  "/organizations": "manage:org",
  "/access-matrix": "view:access-matrix",
};

export function permissionForPath(pathname: string): Permission | null {
  // exact match
  if (ROUTE_PERMISSIONS[pathname]) return ROUTE_PERMISSIONS[pathname];
  // prefix match (handles /incidents/:id, etc.)
  const hit = Object.keys(ROUTE_PERMISSIONS).find((p) => pathname === p || pathname.startsWith(p + "/"));
  return hit ? ROUTE_PERMISSIONS[hit] : null;
}

export function hasPermission(userPerms: Permission[], required: Permission): boolean {
  return userPerms.includes(required);
}

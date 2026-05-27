import type { Role } from "./rbac";

/**
 * Role hierarchy (higher rank = more power).
 * A role can create/manage accounts strictly BELOW its own rank.
 * Super Admin sits at the top and can manage every other role.
 */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  security_admin: 80,
  soc_analyst: 60,
  incident_responder: 55,
  threat_hunter: 50,
  compliance_officer: 40,
  viewer: 10,
};

export const ROLE_PARENT: Record<Role, Role | null> = {
  super_admin: null,
  security_admin: "super_admin",
  soc_analyst: "security_admin",
  incident_responder: "security_admin",
  threat_hunter: "security_admin",
  compliance_officer: "security_admin",
  viewer: "security_admin",
};

/** Roles ordered from highest to lowest rank. */
export const ROLES_BY_RANK: Role[] = (
  Object.keys(ROLE_RANK) as Role[]
).sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);

/** Can `actor` create / edit / delete accounts of `target` role? */
export function canManageRole(actor: Role | undefined, target: Role): boolean {
  if (!actor) return false;
  if (actor === "super_admin") return true;
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** Roles that `actor` is allowed to assign when creating an account. */
export function assignableRoles(actor: Role | undefined): Role[] {
  return ROLES_BY_RANK.filter((r) => canManageRole(actor, r));
}

/** Build a tree (super_admin → children → …) for display. */
export interface HierarchyNode {
  role: Role;
  children: HierarchyNode[];
}
export function buildHierarchyTree(): HierarchyNode {
  const make = (role: Role): HierarchyNode => ({
    role,
    children: (Object.entries(ROLE_PARENT) as [Role, Role | null][])
      .filter(([, p]) => p === role)
      .map(([r]) => make(r))
      .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role]),
  });
  return make("super_admin");
}

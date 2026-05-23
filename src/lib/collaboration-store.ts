import { create } from "zustand";

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: "active" | "idle" | "offline";
  currentPage?: string;
  lastSeen: Date;
}

export interface Comment {
  id: string;
  threadId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mentions: string[];
  createdAt: Date;
  updatedAt?: Date;
  reactions: Record<string, string[]>;
  resolved: boolean;
}

export interface Thread {
  id: string;
  entityType: "investigation" | "incident" | "alert" | "case" | "endpoint";
  entityId: string;
  title: string;
  comments: Comment[];
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Annotation {
  id: string;
  entityType: string;
  entityId: string;
  authorId: string;
  authorName: string;
  content: string;
  position: { x: number; y: number };
  createdAt: Date;
}

interface CollaborationState {
  collaborators: Collaborator[];
  threads: Thread[];
  annotations: Annotation[];

  addComment: (threadId: string, comment: Omit<Comment, "id" | "createdAt" | "reactions" | "resolved">) => void;
  resolveThread: (threadId: string) => void;
  addReaction: (commentId: string, emoji: string, userId: string) => void;
  addAnnotation: (annotation: Omit<Annotation, "id" | "createdAt">) => void;
  updateCollaboratorStatus: (userId: string, status: Collaborator["status"], page?: string) => void;
  getEntityThreads: (entityType: string, entityId: string) => Thread[];
  getPageCollaborators: (page: string) => Collaborator[];
}

const COLLABORATORS: Collaborator[] = [
  { id: "u-1", name: "Sarah Chen", avatar: "SC", color: "#10b981", status: "active", currentPage: "/incidents", lastSeen: new Date() },
  { id: "u-2", name: "James Miller", avatar: "JM", color: "#3b82f6", status: "active", currentPage: "/investigations", lastSeen: new Date() },
  { id: "u-3", name: "Priya Sharma", avatar: "PS", color: "#f59e0b", status: "idle", currentPage: "/dashboard", lastSeen: new Date(Date.now() - 300000) },
  { id: "u-4", name: "Alex Rivera", avatar: "AR", color: "#ef4444", status: "offline", lastSeen: new Date(Date.now() - 3600000) },
  { id: "u-5", name: "Morgan Lee", avatar: "ML", color: "#8b5cf6", status: "active", currentPage: "/alerts", lastSeen: new Date() },
];

const THREADS: Thread[] = [
  {
    id: "th-1",
    entityType: "incident",
    entityId: "INC-2847",
    title: "Root cause analysis for INC-2847",
    comments: [
      { id: "c-1", threadId: "th-1", authorId: "u-1", authorName: "Sarah Chen", authorAvatar: "SC", content: "Initial triage suggests lateral movement from compromised web server. @u-2 can you check the process tree?", mentions: ["u-2"], createdAt: new Date(Date.now() - 7200000), reactions: { "👍": ["u-2", "u-3"] }, resolved: false },
      { id: "c-2", threadId: "th-1", parentId: "c-1", authorId: "u-2", authorName: "James Miller", authorAvatar: "JM", content: "Confirmed — found suspicious PowerShell spawning from w3wp.exe. Matches Cobalt Strike pattern.", mentions: [], createdAt: new Date(Date.now() - 5400000), reactions: {}, resolved: false },
      { id: "c-3", threadId: "th-1", authorId: "u-5", authorName: "Morgan Lee", authorAvatar: "ML", content: "IOCs match APT29 campaign from last month. Cross-referencing threat intel now.", mentions: [], createdAt: new Date(Date.now() - 1800000), reactions: { "🔥": ["u-1"] }, resolved: false },
    ],
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: "th-2",
    entityType: "alert",
    entityId: "ALT-4291",
    title: "False positive assessment for anomalous DNS",
    comments: [
      { id: "c-4", threadId: "th-2", authorId: "u-3", authorName: "Priya Sharma", authorAvatar: "PS", content: "This looks like a scheduled health check endpoint. Recommend suppression rule.", mentions: ["u-1"], createdAt: new Date(Date.now() - 86400000), reactions: {}, resolved: true },
    ],
    createdAt: new Date(Date.now() - 86400000),
    resolvedAt: new Date(Date.now() - 43200000),
  },
  {
    id: "th-3",
    entityType: "investigation",
    entityId: "INV-0042",
    title: "Evidence chain for insider threat case",
    comments: [
      { id: "c-5", threadId: "th-3", authorId: "u-2", authorName: "James Miller", authorAvatar: "JM", content: "Collected USB insertion logs and after-hours VPN sessions. Timeline is building.", mentions: [], createdAt: new Date(Date.now() - 43200000), reactions: { "👀": ["u-1", "u-5"] }, resolved: false },
    ],
    createdAt: new Date(Date.now() - 43200000),
  },
  {
    id: "th-4",
    entityType: "case",
    entityId: "CASE-7001",
    title: "SLA breach risk — need additional responder",
    comments: [
      { id: "c-6", threadId: "th-4", authorId: "u-1", authorName: "Sarah Chen", authorAvatar: "SC", content: "We're at 85% SLA window. @u-4 can you join as second responder?", mentions: ["u-4"], createdAt: new Date(Date.now() - 3600000), reactions: {}, resolved: false },
    ],
    createdAt: new Date(Date.now() - 3600000),
  },
];

const ANNOTATIONS: Annotation[] = [
  { id: "ann-1", entityType: "attack-graph", entityId: "graph-1", authorId: "u-2", authorName: "James Miller", content: "This is the initial entry point — phishing email", position: { x: 0.15, y: 0.3 }, createdAt: new Date(Date.now() - 7200000) },
  { id: "ann-2", entityType: "attack-graph", entityId: "graph-1", authorId: "u-1", authorName: "Sarah Chen", content: "Crown jewel at risk — escalate to P1", position: { x: 0.72, y: 0.45 }, createdAt: new Date(Date.now() - 5400000) },
  { id: "ann-3", entityType: "timeline", entityId: "tl-main", authorId: "u-5", authorName: "Morgan Lee", content: "Correlated with APT29 TTPs", position: { x: 0.45, y: 0.12 }, createdAt: new Date(Date.now() - 1800000) },
  { id: "ann-4", entityType: "endpoint", entityId: "prod-web-01", authorId: "u-3", authorName: "Priya Sharma", content: "Suspicious scheduled task found", position: { x: 0.6, y: 0.8 }, createdAt: new Date(Date.now() - 900000) },
];

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  collaborators: COLLABORATORS,
  threads: THREADS,
  annotations: ANNOTATIONS,

  addComment: (threadId, comment) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId
          ? { ...t, comments: [...t.comments, { ...comment, id: `c-${Date.now()}`, createdAt: new Date(), reactions: {}, resolved: false }] }
          : t,
      ),
    })),

  resolveThread: (threadId) =>
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === threadId ? { ...t, resolvedAt: new Date(), comments: t.comments.map((c) => ({ ...c, resolved: true })) } : t,
      ),
    })),

  addReaction: (commentId, emoji, userId) =>
    set((s) => ({
      threads: s.threads.map((t) => ({
        ...t,
        comments: t.comments.map((c) => {
          if (c.id !== commentId) return c;
          const existing = c.reactions[emoji] ?? [];
          const updated = existing.includes(userId) ? existing.filter((id) => id !== userId) : [...existing, userId];
          return { ...c, reactions: { ...c.reactions, [emoji]: updated } };
        }),
      })),
    })),

  addAnnotation: (annotation) =>
    set((s) => ({
      annotations: [...s.annotations, { ...annotation, id: `ann-${Date.now()}`, createdAt: new Date() }],
    })),

  updateCollaboratorStatus: (userId, status, page) =>
    set((s) => ({
      collaborators: s.collaborators.map((c) =>
        c.id === userId ? { ...c, status, currentPage: page ?? c.currentPage, lastSeen: new Date() } : c,
      ),
    })),

  getEntityThreads: (entityType, entityId) =>
    get().threads.filter((t) => t.entityType === entityType && t.entityId === entityId),

  getPageCollaborators: (page) =>
    get().collaborators.filter((c) => c.currentPage === page && c.status !== "offline"),
}));

import { createHash } from "crypto";
import type { FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import type { DbClient } from "@nexus/db";
import { apiKeys } from "@nexus/db/schema";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import type { JwtPayload } from "./authenticate.js";

/**
 * Validates an API key from the Authorization header (Bearer <key> or X-API-Key header).
 * Sets request.user from the key's associated org/permissions so downstream handlers
 * behave identically regardless of auth method.
 */
export function apiKeyAuth(db: DbClient, requiredScopes: string[] = []) {
  return async (request: FastifyRequest) => {
    // Allow JWT auth to take priority
    if (request.user) return;

    const header = request.headers.authorization;
    const xApiKey = request.headers["x-api-key"] as string | undefined;
    const rawKey = xApiKey ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);

    if (!rawKey) throw new UnauthorizedError("Missing API key");

    const hashed = hashApiKey(rawKey);
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashed), eq(apiKeys.isActive, true)))
      .limit(1);

    if (!key) throw new UnauthorizedError("Invalid API key");
    if (key.expiresAt && key.expiresAt < new Date()) throw new UnauthorizedError("API key expired");

    const keyScopes = (key.scopes as string[]) ?? [];
    for (const scope of requiredScopes) {
      if (!keyScopes.includes(scope) && !keyScopes.includes("*")) {
        throw new ForbiddenError(`API key missing scope: ${scope}`);
      }
    }

    // Update last used timestamp (fire-and-forget)
    void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));

    request.user = {
      sub: `apikey:${key.id}`,
      orgId: key.organizationId,
      role: "api_key",
      permissions: keyScopes,
      email: `apikey:${key.name}`,
      name: key.name,
    } satisfies JwtPayload;
  };
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

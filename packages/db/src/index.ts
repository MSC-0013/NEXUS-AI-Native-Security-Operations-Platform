import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type DbClient = ReturnType<typeof createDb>["db"];

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 20, idle_timeout: 20 });
  const db = drizzle(client, { schema });
  return { db, client };
}

/**
 * Session-scoped tenant context — use ONLY within a single reserved connection,
 * never on a pooled client. Prefer withTenantTxn for normal service calls.
 */
export async function setTenantContext(client: postgres.Sql, orgId: string) {
  await client`SELECT set_config('app.current_org', ${orgId}, true)`;
}

/**
 * Transaction-scoped tenant pinning (P0 security fix).
 * Reserves a connection, sets SET LOCAL so the config cannot bleed to other
 * pooled connections, then runs fn inside that transaction.
 */
export async function withTenantTxn<T>(
  client: postgres.Sql,
  orgId: string,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  return client.begin(async (txClient) => {
    await txClient`SELECT set_config('app.current_org', ${orgId}, true)`;
    return fn(txClient);
  });
}

export { schema };

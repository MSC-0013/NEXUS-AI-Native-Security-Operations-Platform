import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type DbClient = PostgresJsDatabase<typeof schema>;

const transactionContext = new AsyncLocalStorage<DbClient>();

function transactionAwareDb(baseDb: DbClient): DbClient {
  return new Proxy(baseDb, {
    get(target, property) {
      const activeDb = transactionContext.getStore() ?? target;
      const value = Reflect.get(activeDb, property, activeDb) as unknown;
      return typeof value === "function" ? value.bind(activeDb) : value;
    },
  });
}

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 20, idle_timeout: 20 });
  const db = transactionAwareDb(drizzle(client, { schema }));
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
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return (await client.begin(async (txClient) => {
    await txClient`SELECT set_config('app.current_org', ${orgId}, true)`;
    const txDb = drizzle(txClient, { schema });
    return transactionContext.run(txDb, () => fn(txClient));
  })) as T;
}

export { schema };

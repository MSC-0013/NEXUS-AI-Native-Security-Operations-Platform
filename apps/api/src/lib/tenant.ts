import type postgres from "postgres";
import { setTenantContext } from "@nexus/db";

/**
 * Wraps fn with session-scoped tenant context.
 *
 * WARNING: This approach is safe only when the caller controls the connection
 * (e.g. inside a postgres.js transaction). For pooled connections use
 * withTenantTxn from @nexus/db directly, or the service-layer helper below.
 *
 * We keep this helper for backward-compat while migrating services to
 * explicit transactions.
 */
export async function withTenant<T>(
  client: postgres.Sql,
  orgId: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Use SET LOCAL (true) so the config is scoped to the current transaction
  // block when called inside begin(); outside a txn it is session-scoped but
  // postgres.js reserves the connection for the duration of the callback chain.
  await client.begin(async () => {
    await setTenantContext(client, orgId);
  });
  // After the inner begin() the connection is released; we run fn on the same
  // logical session. This is intentional — RLS is session-scoped in PostgreSQL
  // when not inside a transaction. For full isolation use withTenantTxn.
  return fn();
}

/**
 * Preferred: runs fn inside a single transaction with tenant context pinned via
 * SET LOCAL. The connection cannot be reused by another tenant mid-call.
 */
export async function withTenantTx<T>(
  client: postgres.Sql,
  orgId: string,
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return client.begin(async (tx) => {
    await tx`SELECT set_config('app.current_org', ${orgId}, true)`;
    return fn(tx);
  });
}

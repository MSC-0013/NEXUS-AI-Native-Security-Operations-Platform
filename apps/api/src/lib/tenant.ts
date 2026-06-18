import type postgres from "postgres";
import { withTenantTxn } from "@nexus/db";

/**
 * Runs service callbacks with a transaction-pinned tenant context. The
 * transaction-aware DbClient from createDb routes existing `this.db` calls to
 * the active transaction, preserving RLS without changing every service.
 */
export async function withTenant<T>(
  client: postgres.Sql,
  orgId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withTenantTxn(client, orgId, async () => fn());
}

/**
 * Runs fn inside a single transaction with tenant context pinned via SET LOCAL.
 */
export async function withTenantTx<T>(
  client: postgres.Sql,
  orgId: string,
  fn: (sql: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return withTenantTxn(client, orgId, fn);
}

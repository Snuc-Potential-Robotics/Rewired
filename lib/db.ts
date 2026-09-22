import { Pool, QueryResult, QueryResultRow } from "pg";

// Global singleton pool for Next.js hot-reloading in development
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_PqJRKdjE9Cl7@ep-fancy-darkness-b32xs1ho-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export const pool: Pool =
  global._pgPool ||
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development" && duration > 500) {
    console.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
  }
  return res;
}

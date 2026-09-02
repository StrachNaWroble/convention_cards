import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

export type DatabaseClient = {
  db: Database;
  pool: Pool;
};

export type DatabaseClientOptions = {
  ssl?: boolean;
};

export function createDatabaseClient(databaseUrl: string, options: DatabaseClientOptions = {}): DatabaseClient {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  });

  return {
    db: drizzle(pool, { schema }),
    pool,
  };
}

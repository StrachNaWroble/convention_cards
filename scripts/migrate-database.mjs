import "dotenv/config";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const migrationPath = fileURLToPath(
  new URL("../backend/src/db/migrations/0001_initial_auth_and_cards.sql", import.meta.url),
);

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const sql = await readFile(migrationPath, "utf8");
  const name = basename(migrationPath);
  const checksum = createHash("sha256").update(sql).digest("hex");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const existing = await pool.query("SELECT checksum FROM app_migrations WHERE name = $1", [name]);

    if (existing.rowCount && existing.rows[0].checksum === checksum) {
      console.log(`Migration already applied: ${name}`);
      return;
    }

    if (existing.rowCount) {
      throw new Error(`Migration ${name} changed after it was applied.`);
    }

    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query("INSERT INTO app_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
    await pool.query("COMMIT");

    console.log(`Migration applied: ${name}`);
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

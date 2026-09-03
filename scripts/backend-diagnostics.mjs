import "dotenv/config";

import pg from "pg";

const { Pool } = pg;
const CLEANUP_JOB_NAME = "purge-archived-convention-cards-daily";

function printHelp() {
  console.log(`Backend diagnostics

Usage:
  npm run backend:diagnostics
  npm run backend:diagnostics -- --json

Checks:
  - PostgreSQL connectivity
  - archived-card cleanup cron job registration
  - latest archived-card cleanup cron runs
  - durable archived-card deletion log summary
`);
}

function shouldPrintJson() {
  return process.argv.includes("--json");
}

function isHelpRequested() {
  return process.argv.includes("--help") || process.argv.includes("-h");
}

async function optionalQuery(pool, label, query, params = []) {
  try {
    const result = await pool.query(query, params);
    return {
      available: true,
      rows: result.rows,
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : `Could not query ${label}.`,
      rows: [],
    };
  }
}

function printText(report) {
  console.log("Backend diagnostics");
  console.log("");
  console.log(`Database: ${report.database.ok ? "ok" : "failed"}`);

  if (report.database.ok) {
    console.log(`Checked at: ${report.database.checkedAt}`);
    console.log(`Database name: ${report.database.name}`);
  } else {
    console.log(`Error: ${report.database.error}`);
  }

  console.log("");
  console.log(`Cleanup cron job: ${report.cleanupCron.available ? "available" : "unavailable"}`);
  if (report.cleanupCron.available) {
    console.log(`Registered: ${report.cleanupCron.job ? "yes" : "no"}`);
    if (report.cleanupCron.job) {
      console.log(`Schedule: ${report.cleanupCron.job.schedule}`);
      console.log(`Active: ${report.cleanupCron.job.active}`);
    }
    console.log(`Recent runs: ${report.cleanupCron.recentRuns.length}`);
  } else {
    console.log(`Error: ${report.cleanupCron.error}`);
  }

  console.log("");
  console.log(`Cleanup deletion log: ${report.cleanupLog.available ? "available" : "unavailable"}`);
  if (report.cleanupLog.available) {
    console.log(`Total logged deletions: ${report.cleanupLog.totalDeletions}`);
    console.log(`Last deletion: ${report.cleanupLog.lastDeletedAt ?? "none"}`);
  } else {
    console.log(`Error: ${report.cleanupLog.error}`);
  }
}

async function buildReport(pool) {
  const databaseResult = await pool.query("SELECT now() AS checked_at, current_database() AS database_name");
  const cleanupCron = await optionalQuery(
    pool,
    "cleanup cron job",
    `
      SELECT jobid, jobname, schedule, active, command
      FROM cron.job
      WHERE jobname = $1
      LIMIT 1
    `,
    [CLEANUP_JOB_NAME],
  );
  const cleanupRuns = await optionalQuery(
    pool,
    "cleanup cron runs",
    `
      SELECT status, start_time, end_time, return_message
      FROM cron.job_run_details
      WHERE jobid = $1
      ORDER BY start_time DESC
      LIMIT 5
    `,
    [cleanupCron.rows[0]?.jobid ?? -1],
  );
  const cleanupLog = await optionalQuery(
    pool,
    "cleanup deletion log",
    `
      SELECT
        count(*)::integer AS total_deletions,
        max(deleted_at) AS last_deleted_at
      FROM app_private.convention_card_deletion_log
    `,
  );

  return {
    database: {
      ok: true,
      checkedAt: databaseResult.rows[0].checked_at,
      name: databaseResult.rows[0].database_name,
    },
    cleanupCron: {
      available: cleanupCron.available && cleanupRuns.available,
      error: cleanupCron.error ?? cleanupRuns.error,
      job: cleanupCron.rows[0] ?? null,
      recentRuns: cleanupRuns.rows,
    },
    cleanupLog: {
      available: cleanupLog.available,
      error: cleanupLog.error,
      totalDeletions: cleanupLog.rows[0]?.total_deletions ?? 0,
      lastDeletedAt: cleanupLog.rows[0]?.last_deleted_at ?? null,
    },
  };
}

async function main() {
  if (isHelpRequested()) {
    printHelp();
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL.");
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const report = await buildReport(pool);

    if (shouldPrintJson()) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printText(report);
    }
  } catch (error) {
    const report = {
      database: {
        ok: false,
        error: error instanceof Error ? error.message : "Could not connect to the database.",
      },
    };

    if (shouldPrintJson()) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printText({
        ...report,
        cleanupCron: { available: false, error: "Database check failed.", job: null, recentRuns: [] },
        cleanupLog: { available: false, error: "Database check failed.", totalDeletions: 0, lastDeletedAt: null },
      });
    }

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();

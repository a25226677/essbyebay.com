const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");
const files = [
  path.join(root, "supabase", "migrations", "20260610_000034_rebalance_catalog.sql"),
  path.join(root, "catalog_cleanup_8000.sql"),
];

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvFile(envLocalPath);

function getConnectionString() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const host = process.env.SUPABASE_DB_HOST || process.env.POSTGRES_HOST;
  const port = process.env.SUPABASE_DB_PORT || process.env.POSTGRES_PORT || "5432";
  const database = process.env.SUPABASE_DB_NAME || process.env.POSTGRES_DB || "postgres";
  const user = process.env.SUPABASE_DB_USER || process.env.POSTGRES_USER || "postgres";
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
  if (host && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

async function main() {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Missing DB connection string.\n" +
      "Add SUPABASE_DB_URL to .env.local\n" +
      "Get it from: Supabase Dashboard -> Project Settings -> Database -> URI (Session mode port 5432)"
    );
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 0,
    query_timeout: 0,
  });

  await client.connect();
  console.log("Connected to database.\n");

  for (const file of files) {
    const label = path.relative(root, file);
    console.log(`>>> Running ${label}`);
    const sql = fs.readFileSync(file, "utf8");
    await client.query(sql);
    console.log(`>>> Finished ${label}\n`);
  }

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("\nERROR:", err.message);
  process.exit(1);
});

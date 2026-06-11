const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const root = path.resolve(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");

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

async function getExpensiveProductCount(client) {
  const result = await client.query(
    `SELECT COUNT(*)::bigint AS count FROM public.products WHERE price > 2000`
  );
  return parseInt(result.rows[0].count, 10);
}

async function deleteBatch(client, batchSize = 500) {
  const result = await client.query(`
    WITH tp AS (SELECT id FROM public.products WHERE price > 2000 LIMIT $1),
    variants AS (SELECT id FROM public.product_variants pv WHERE pv.product_id IN (SELECT id FROM tp)),
    cart_items_deleted AS (
      DELETE FROM public.cart_items ci WHERE ci.product_id IN (SELECT id FROM tp) RETURNING 1
    ),
    wishlist_deleted AS (
      DELETE FROM public.wishlist_items wi WHERE wi.product_id IN (SELECT id FROM tp) RETURNING 1
    ),
    product_images_deleted AS (
      DELETE FROM public.product_images pi WHERE pi.product_id IN (SELECT id FROM tp) RETURNING 1
    ),
    product_variants_deleted AS (
      DELETE FROM public.product_variants pv WHERE pv.id IN (SELECT id FROM variants) RETURNING 1
    ),
    order_items_deleted AS (
      DELETE FROM public.order_items oi WHERE oi.product_id IN (SELECT id FROM tp) OR oi.variant_id IN (SELECT id FROM variants) RETURNING 1
    ),
    reviews_deleted AS (
      DELETE FROM public.reviews r WHERE r.product_id IN (SELECT id FROM tp) RETURNING 1
    ),
    products_deleted AS (
      DELETE FROM public.products p WHERE p.id IN (SELECT id FROM tp) RETURNING 1
    )
    SELECT
      (SELECT COUNT(*)::bigint FROM cart_items_deleted) AS cart_items_deleted,
      (SELECT COUNT(*)::bigint FROM wishlist_deleted) AS wishlist_items_deleted,
      (SELECT COUNT(*)::bigint FROM product_images_deleted) AS product_images_deleted,
      (SELECT COUNT(*)::bigint FROM product_variants_deleted) AS product_variants_deleted,
      (SELECT COUNT(*)::bigint FROM order_items_deleted) AS order_items_deleted,
      (SELECT COUNT(*)::bigint FROM reviews_deleted) AS reviews_deleted,
      (SELECT COUNT(*)::bigint FROM products_deleted) AS products_deleted
  `, [batchSize]);

  return result.rows[0];
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
  console.log("🗑️  Starting cleanup of products priced > $2000\n");

  let batchNum = 0;
  let totalDeleted = 0;

  try {
    while (true) {
      const remaining = await getExpensiveProductCount(client);

      if (remaining === 0) {
        console.log(`\n✅ DONE - All expensive products deleted!`);
        console.log(`📊 Total products deleted: ${totalDeleted}\n`);
        break;
      }

      batchNum++;
      const batchSize = Math.min(500, remaining);
      const result = await deleteBatch(client, batchSize);

      const productsDeleted = parseInt(result.products_deleted, 10);
      totalDeleted += productsDeleted;

      console.log(
        `Batch ${batchNum}: Deleted ${productsDeleted} products | ` +
        `Remaining: ${remaining - productsDeleted}`
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n❌ ERROR:", err.message);
  process.exit(1);
});

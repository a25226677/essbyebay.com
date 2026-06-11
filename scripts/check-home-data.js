const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const m = env.match(/SUPABASE_DB_URL=(.+)/);

const client = new Client({
  connectionString: m[1].trim(),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const banners = await client.query(
    "SELECT id, title, is_active, LEFT(image_url, 70) AS img FROM public.banners ORDER BY sort_order"
  );
  console.log("=== BANNERS ===");
  console.table(banners.rows);

  const counts = await client.query(`
    SELECT c.name, COUNT(p.id)::int AS products
    FROM public.categories c
    LEFT JOIN public.products p ON p.category_id = c.id AND p.is_active = true
    GROUP BY c.name ORDER BY c.name
  `);
  console.log("=== CATEGORY PRODUCT COUNTS (active) ===");
  console.table(counts.rows);

  const totals = await client.query(
    "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_active)::int AS active FROM public.products"
  );
  console.log("=== PRODUCT TOTALS ===");
  console.table(totals.rows);

  await client.end();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

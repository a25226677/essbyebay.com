require("dotenv").config({ path: require("path").join(__dirname, ".env.scraper") });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function count(table) {
  // 'exact' COUNT(*) times out on large tables — use 'estimated' (pg statistics)
  const { count: c } = await supabase
    .from(table).select("id", { count: "estimated", head: true });
  return c || 0;
}

// Drain a table fast — no cascade, just brute fetch+delete loop
// Large BATCH = fast; safe because child tables are pre-cleared
async function drain(table, batch) {
  let b = batch || 500;
  let total = 0;
  const start = Date.now();
  while (true) {
    const { data, error: sErr } = await supabase
      .from(table).select("id").limit(b);
    if (sErr) throw new Error("select " + table + ": " + sErr.message);
    if (!data || data.length === 0) break;
    const ids = data.map(r => r.id);
    const { error: dErr } = await supabase.from(table).delete().in("id", ids);
    if (dErr) {
      const isTimeout = dErr.code === "57014";
      const isNetwork = !dErr.code && dErr.message && (dErr.message.includes("fetch failed") || dErr.message.includes("ECONNRESET") || dErr.message.includes("network"));
      if (isTimeout && b > 25) {
        b = Math.max(25, Math.floor(b / 2));
        process.stdout.write("\n  [" + table + "] timeout — reducing batch to " + b + "\n");
        continue;
      }
      if (isNetwork) {
        process.stdout.write("\n  [" + table + "] network error — waiting 5s then retrying\n");
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      console.error("\n  [" + table + "] delete error:", JSON.stringify(dErr));
      throw new Error("delete " + table + ": " + dErr.message);
    }
    total += ids.length;
    const rate = Math.round(total / ((Date.now() - start) / 1000));
    process.stdout.write("\r  [" + table + "] " + total.toLocaleString() + " deleted  (~" + rate + "/s, batch=" + b + ")    ");
  }
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log("\r  [" + table + "] " + total.toLocaleString() + " deleted in " + secs + "s" + "                  ");
  return total;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const productsBefore = await count("products");

  console.log("=== Fast Catalog Purge" + (dryRun ? " [DRY RUN]" : "") + " ===");
  console.log("Products in DB: " + productsBefore.toLocaleString() + "\n");

  if (dryRun) {
    console.log("Would delete all " + productsBefore.toLocaleString() + " products + child rows.");
    return;
  }

  const totalStart = Date.now();

  // ── Step 1: Nuke all child tables first (no cascade overhead later) ──────────
  // These all cascade FROM products, so clearing them first lets us delete
  // products in large batches without any per-row cascade cost.
  console.log("Step 1/2 — Clear child tables (parallel to remove cascade overhead)");

  // Tables that use RESTRICT or may have huge row counts needing smaller batches
  const childConfig = [
    { table: "order_items",    batch: 500  }, // RESTRICT — must go first
    { table: "cart_items",     batch: 500  },
    { table: "wishlist",       batch: 500  },
    { table: "reviews",        batch: 500  },
    { table: "product_images", batch: 200  }, // can be huge — smaller batch
    { table: "product_variants", batch: 200 },
    { table: "storehouse_items", batch: 500 },
  ];

  for (const { table, batch } of childConfig) {
    const n = await count(table);
    if (n > 0) await drain(table, batch);
    else console.log("  [" + table + "] empty, skipping");
  }

  // ── Step 2: Delete products — 500/batch (child tables already cleared, no cascade) ──
  console.log("\nStep 2/2 — Delete products (children already cleared)");
  await drain("products", 500);

  const elapsed = Math.round((Date.now() - totalStart) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const remaining = await count("products");

  console.log("\n=== Done in " + mins + "m " + secs + "s — products remaining: " + remaining + " ===");
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });

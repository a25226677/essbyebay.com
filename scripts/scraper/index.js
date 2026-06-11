require("dotenv").config({ path: require("path").join(__dirname, ".env.scraper") });

const { launchBrowser, newStealthContext, newStealthPage } = require("./browser.js");
const { scrapeSearchUrls }              = require("./search-scraper.js");
const { scrapeProduct }                 = require("./product-scraper.js");
const { mapToDbProduct, mapToDbImages, buildVariantRows } = require("./mapper.js");
const { downloadAndUploadImages }       = require("./image-handler.js");
const {
  createSupabaseClient, isDuplicate, findOrCreateCategory,
  findOrCreateBrand, insertProduct, insertProductImages, insertVariants,
} = require("./db-push.js");
const { CATEGORIES, PRODUCTS_PER_CATEGORY, TIERS, BATCH_SIZE } = require("./config.js");
const { randomDelay } = require("./utils.js");

// ── CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CATEGORY_FILTER = (() => {
  const idx = args.indexOf("--category");
  return idx !== -1 ? args[idx + 1] : null;
})();
// --tier low|mid|high  (run a single tier only)
const TIER_FILTER = (() => {
  const idx = args.indexOf("--tier");
  return idx !== -1 ? args[idx + 1] : null;
})();

if (DRY_RUN) console.log("[DRY RUN] No DB writes, no image uploads.\n");

// ── Process one product URL ───────────────────────────────
async function processProduct(supabase, ctx, url, category, tier, dryRun) {
  const { page } = await newStealthPage(ctx);
  try {
    const raw = await scrapeProduct(page, url);
    if (!raw) return "error";

    // Validate scraped price falls within this tier's range
    if (raw.price < tier.min || raw.price > tier.max) return "skip-price";
    if (!dryRun && await isDuplicate(supabase, raw.itemId)) return "duplicate";

    const categoryId = dryRun ? "dry-cat" : await findOrCreateCategory(supabase, category.name);
    const brandId    = dryRun ? null      : await findOrCreateBrand(supabase, raw.brand);

    const imageUrls  = await downloadAndUploadImages(supabase, raw.images, category.slug, raw.itemId, dryRun);
    const mainImage  = imageUrls[0] || null;
    const productRow = mapToDbProduct(raw, categoryId, brandId, mainImage);

    if (dryRun) {
      console.log("    [DRY] \"" + raw.title.slice(0, 55) + "\" $" + raw.price +
        " | imgs:" + imageUrls.length);
      return "dry-run";
    }

    const productId   = await insertProduct(supabase, productRow);
    const imageRows   = mapToDbImages(productId, imageUrls);
    const variantRows = buildVariantRows(productId, raw.variants, raw.stockCount);

    await insertProductImages(supabase, imageRows);
    await insertVariants(supabase, variantRows);

    console.log("    [OK] \"" + raw.title.slice(0, 50) + "\" $" + raw.price);
    return "inserted";
  } catch (err) {
    console.error("    [ERR] " + err.message.slice(0, 80));
    return "error";
  } finally {
    await page.close();
  }
}

// ── Process one tier within a category ───────────────────
async function processTier(supabase, browser, category, tier) {
  console.log("\n  ── Tier: " + tier.name.toUpperCase() +
    " ($" + tier.min + "–$" + tier.max + ", target " + tier.count + ") ──");

  const ctx = await newStealthContext(browser);
  const searchPage = await ctx.newPage();
  let urls = [];
  try {
    urls = await scrapeSearchUrls(searchPage, category.keyword, tier.count, tier);
  } finally {
    await searchPage.close();
  }

  console.log("  Found " + urls.length + " URLs for " + tier.name + " tier\n");

  const stats = { inserted: 0, duplicate: 0, skipped: 0, error: 0 };

  try {
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(url => processProduct(supabase, ctx, url, category, tier, DRY_RUN)));
      results.forEach(result => {
        if (result === "inserted" || result === "dry-run") stats.inserted++;
        else if (result === "duplicate")                   stats.duplicate++;
        else if (result === "skip-price")                  stats.skipped++;
        else                                               stats.error++;
      });
      if (i + BATCH_SIZE < urls.length) await randomDelay(500, 1000);
    }
  } finally {
    await ctx.close();
  }

  console.log("  Tier " + tier.name + " done — ins:" + stats.inserted +
    " dup:" + stats.duplicate + " skip:" + stats.skipped + " err:" + stats.error);
  return stats;
}

// ── Process all tiers for one category ───────────────────
async function processCategory(supabase, browser, category) {
  console.log("\n" + "=".repeat(60));
  console.log("Category: " + category.name + " (target: " + PRODUCTS_PER_CATEGORY + ")");
  console.log("=".repeat(60));

  const tiersToRun = TIER_FILTER
    ? TIERS.filter(t => t.name === TIER_FILTER)
    : TIERS;

  const totals = { inserted: 0, duplicate: 0, skipped: 0, error: 0 };

  for (let i = 0; i < tiersToRun.length; i++) {
    const stats = await processTier(supabase, browser, category, tiersToRun[i]);
    totals.inserted  += stats.inserted;
    totals.duplicate += stats.duplicate;
    totals.skipped   += stats.skipped;
    totals.error     += stats.error;
    // Brief pause between tiers to avoid triggering eBay rate limits
    if (i < tiersToRun.length - 1) await randomDelay(1500, 2000);
  }

  console.log("\n  Category total — ins:" + totals.inserted +
    " dup:" + totals.duplicate + " skip:" + totals.skipped + " err:" + totals.error);
  return totals;
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  const supabase = createSupabaseClient();
  const browser  = await launchBrowser();
  const start    = Date.now();

  const toRun = CATEGORY_FILTER
    ? CATEGORIES.filter(c => c.name.toLowerCase().includes(CATEGORY_FILTER.toLowerCase()))
    : CATEGORIES;

  if (toRun.length === 0) {
    console.error("No category matching: " + CATEGORY_FILTER);
    process.exit(1);
  }

  console.log("\n⚡ FAST SCRAPER - Parallel processing enabled\n"); console.log("Target: " + toRun.length + " categories × " + PRODUCTS_PER_CATEGORY +
    " products = " + (toRun.length * PRODUCTS_PER_CATEGORY) + " total");
  console.log("Tiers: Low " + TIERS[0].count + " | Mid " + TIERS[1].count +
    " | High " + TIERS[2].count + "\n");

  const totals = { inserted: 0, duplicate: 0, skipped: 0, error: 0 };

  try {
    for (let i = 0; i < toRun.length; i++) {
      const stats = await processCategory(supabase, browser, toRun[i]);
      totals.inserted  += stats.inserted;
      totals.duplicate += stats.duplicate;
      totals.skipped   += stats.skipped;
      totals.error     += stats.error;
      if (i < toRun.length - 1) await randomDelay(2000, 3000);
    }
  } finally {
    await browser.close();
  }

  const mins = Math.round((Date.now() - start) / 60000);
  console.log("\n" + "═".repeat(50));
  console.log("Run complete — " + toRun.length + " categories");
  console.log("  Inserted : " + totals.inserted);
  console.log("  Skipped  : " + (totals.duplicate + totals.skipped) + " (dup/price)");
  console.log("  Errors   : " + totals.error);
  console.log("  Duration : " + mins + " min");
  console.log("═".repeat(50));
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

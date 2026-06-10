require("dotenv").config({ path: require("path").join(__dirname, ".env.scraper") });

const { launchBrowser, newStealthContext, newStealthPage } = require("./browser.js");
const { scrapeSearchUrls }              = require("./search-scraper.js");
const { scrapeProduct }                 = require("./product-scraper.js");
const { mapToDbProduct, mapToDbImages, buildVariantRows, isPriceInRange } = require("./mapper.js");
const { downloadAndUploadImages }       = require("./image-handler.js");
const {
  createSupabaseClient, isDuplicate, findOrCreateCategory,
  findOrCreateBrand, insertProduct, insertProductImages, insertVariants,
} = require("./db-push.js");
const { CATEGORIES, PRODUCTS_PER_CATEGORY, BATCH_SIZE } = require("./config.js");
const { randomDelay } = require("./utils.js");

// ── CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CATEGORY_FILTER = (() => {
  const idx = args.indexOf("--category");
  return idx !== -1 ? args[idx + 1] : null;
})();
const LIMIT = (() => {
  const idx = args.indexOf("--limit");
  return idx !== -1 ? parseInt(args[idx + 1], 10) : PRODUCTS_PER_CATEGORY;
})();

if (DRY_RUN) console.log("[DRY RUN] No DB writes, no image uploads.\n");

// ── Process a single product URL (reuses shared context for session cookies) ──
async function processProduct(supabase, ctx, url, category, dryRun) {
  const { page } = await newStealthPage(ctx);
  try {
    const raw = await scrapeProduct(page, url);
    if (!raw) return "error";
    if (!isPriceInRange(raw.price)) return "skip-price";
    if (!dryRun && await isDuplicate(supabase, raw.itemId)) return "duplicate";

    const categoryId = dryRun ? "dry-cat" : await findOrCreateCategory(supabase, category.name);
    const brandId    = dryRun ? null      : await findOrCreateBrand(supabase, raw.brand);

    const imageUrls  = await downloadAndUploadImages(supabase, raw.images, category.slug, raw.itemId, dryRun);
    const mainImage  = imageUrls[0] || null;
    const productRow = mapToDbProduct(raw, categoryId, brandId, mainImage);

    if (dryRun) {
      console.log("  [DRY] \"" + raw.title.slice(0, 60) + "\" $" + raw.price +
        " | images:" + imageUrls.length + " variants:" + (raw.variants ? raw.variants.length : 0));
      return "dry-run";
    }

    const productId   = await insertProduct(supabase, productRow);
    const imageRows   = mapToDbImages(productId, imageUrls);
    const variantRows = buildVariantRows(productId, raw.variants, raw.stockCount);

    await insertProductImages(supabase, imageRows);
    await insertVariants(supabase, variantRows);

    console.log("  [OK] \"" + raw.title.slice(0, 55) + "\" $" + raw.price + " id:" + productId);
    return "inserted";
  } catch (err) {
    console.error("  [ERR] " + err.message + " — " + url);
    return "error";
  } finally {
    await page.close();
  }
}

// ── Process a whole category ─────────────────────────────
async function processCategory(supabase, browser, category, limit) {
  console.log("\n" + "=".repeat(60));
  console.log("Category: " + category.name + " (target: " + limit + ")");
  console.log("=".repeat(60));

  // One shared context per category so product pages inherit session cookies
  // from the search page navigation (no explicit warmup needed)
  const ctx = await newStealthContext(browser);

  // Collect URLs using a dedicated search page
  const searchPage = await ctx.newPage();
  let urls = [];
  try {
    urls = await scrapeSearchUrls(searchPage, category.keyword, limit);
  } finally {
    await searchPage.close();
  }

  console.log("  Found " + urls.length + " product URLs\n");

  const stats = { inserted: 0, duplicate: 0, skipped: 0, error: 0 };

  try {
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      // Sequential within batch — eBay rate-limits parallel requests
      for (const url of batch) {
        const result = await processProduct(supabase, ctx, url, category, DRY_RUN);
        if (result === "inserted" || result === "dry-run") stats.inserted++;
        else if (result === "duplicate")                   stats.duplicate++;
        else if (result === "skip-price")                  stats.skipped++;
        else                                               stats.error++;
        await randomDelay(2000, 4000);
      }
      if (i + BATCH_SIZE < urls.length) await randomDelay(3000, 5000);
    }
  } finally {
    await ctx.close();
  }

  console.log("\n  Stats — inserted:" + stats.inserted +
    " dup:" + stats.duplicate + " skip:" + stats.skipped + " err:" + stats.error);
  return stats;
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

  const totals = { inserted: 0, duplicate: 0, skipped: 0, error: 0 };

  try {
    for (const category of toRun) {
      const stats = await processCategory(supabase, browser, category, LIMIT);
      totals.inserted  += stats.inserted;
      totals.duplicate += stats.duplicate;
      totals.skipped   += stats.skipped;
      totals.error     += stats.error;
      if (toRun.indexOf(category) < toRun.length - 1) await randomDelay(5000, 10000);
    }
  } finally {
    await browser.close();
  }

  const mins = Math.round((Date.now() - start) / 60000);
  console.log("\n" + "═".repeat(42));
  console.log("Run complete — " + toRun.length + " categories");
  console.log("  Inserted : " + totals.inserted);
  console.log("  Skipped  : " + (totals.duplicate + totals.skipped) + " (dup/price)");
  console.log("  Errors   : " + totals.error);
  console.log("  Duration : " + mins + " min");
  console.log("═".repeat(42));
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
const { createClient } = require("@supabase/supabase-js");
const slugify = require("slugify");
require("dotenv").config({ path: require("path").join(__dirname, ".env.scraper") });

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.scraper");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function isDuplicate(supabase, sku, title) {
  // Check by SKU (eBay item ID)
  const { data: bySku, error: e1 } = await supabase
    .from("products")
    .select("id")
    .eq("sku", sku)
    .maybeSingle();
  if (e1) throw e1;
  if (bySku) return true;

  // Check by exact title (case-insensitive) — mirrors the DB unique index
  if (title && title.trim().length > 0) {
    const { data: byTitle, error: e2 } = await supabase
      .from("products")
      .select("id")
      .ilike("title", title.trim())
      .maybeSingle();
    if (e2) throw e2;
    if (byTitle) return true;
  }

  return false;
}

async function findOrCreateCategory(supabase, name) {
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const slug = slugify(name, { lower: true, strict: true });
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function findOrCreateBrand(supabase, name) {
  if (!name || name === "Unbranded" || name === "N/A" || name === "Does not apply") return null;

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const base = slugify(name, { lower: true, strict: true });
  const slug = base + "-" + Date.now();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function insertProduct(supabase, product) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("id")
    .single();

  if (error) {
    // Postgres unique_violation — title already exists despite pre-check
    if (error.code === "23505") return "duplicate";
    throw error;
  }

  return data.id;
}

async function insertProductImages(supabase, imageRows) {
  if (!imageRows || imageRows.length === 0) return;
  const { error } = await supabase.from("product_images").insert(imageRows);
  if (error) throw error;
}

async function insertVariants(supabase, variantRows) {
  if (!variantRows || variantRows.length === 0) return;
  const { error } = await supabase.from("product_variants").insert(variantRows);
  if (error) throw error;
}

module.exports = {
  createSupabaseClient,
  isDuplicate,
  findOrCreateCategory,
  findOrCreateBrand,
  insertProduct,
  insertProductImages,
  insertVariants,
};
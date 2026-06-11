const sharp = require("sharp");
const fetch = require("node-fetch");
const { retry } = require("./utils.js");

async function fetchImageBuffer(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://www.ebay.com/",
    },
    timeout: 15000,
  });
  if (!res.ok) throw new Error("Image fetch " + res.status + " " + url.slice(0, 60));
  return Buffer.from(await res.arrayBuffer());
}

async function processImage(buffer) {
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function uploadToStorage(supabase, buffer, storagePath) {
  const { error } = await supabase.storage
    .from("product-images")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error("Upload failed: " + error.message);
  const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
  return data.publicUrl;
}

// Try s-l1600 first, fall back to s-l800 if CDN rate-limits with 503
async function fetchWithFallback(url) {
  try {
    return await fetchImageBuffer(url);
  } catch (err) {
    if (err.message.includes("503")) {
      const fallback = url.replace("s-l1600", "s-l800");
      return fetchImageBuffer(fallback);
    }
    throw err;
  }
}

async function downloadAndUploadImages(supabase, imageUrls, categorySlug, sku, dryRun) {
  if (dryRun) {
    // Skip network calls entirely in dry-run
    return imageUrls.slice(0, 7).map((_, i) => "[DRY-RUN] scraped/" + categorySlug + "/" + sku + "/" + i + ".jpg");
  }

  const publicUrls = [];
  const limit = Math.min(imageUrls.length, 7);

  for (let i = 0; i < limit; i++) {
    // Force .jpg — eBay CDN 503s on .webp at s-l1600 but serves .jpg fine
    const url = imageUrls[i].replace(/\.webp(\?.*)?$/, ".jpg");
    try {
      const buffer    = await retry(() => fetchWithFallback(url), 2, [3000, 8000]);
      const processed = await processImage(buffer);
      const storagePath = "scraped/" + categorySlug + "/" + sku + "/" + i + ".jpg";
      const publicUrl = await retry(
        () => uploadToStorage(supabase, processed, storagePath),
        2, [3000, 8000]
      );
      publicUrls.push(publicUrl);
    } catch (err) {
      console.warn("    Image " + i + " skipped: " + err.message.slice(0, 80));
    }
  }

  return publicUrls;
}

module.exports = { downloadAndUploadImages };
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

async function downloadAndUploadImages(supabase, imageUrls, categorySlug, sku, dryRun) {
  const publicUrls = [];
  const limit = Math.min(imageUrls.length, 7);

  for (let i = 0; i < limit; i++) {
    const url = imageUrls[i];
    try {
      const buffer  = await retry(() => fetchImageBuffer(url), 3, [3000, 8000, 15000]);
      const processed = await processImage(buffer);
      const storagePath = "scraped/" + categorySlug + "/" + sku + "/" + i + ".jpg";

      if (dryRun) {
        publicUrls.push("[DRY-RUN] " + storagePath);
      } else {
        const publicUrl = await retry(
          () => uploadToStorage(supabase, processed, storagePath),
          3, [3000, 8000, 15000]
        );
        publicUrls.push(publicUrl);
      }
    } catch (err) {
      console.warn("    Image " + i + " skipped: " + err.message);
    }
  }

  return publicUrls;
}

module.exports = { downloadAndUploadImages };
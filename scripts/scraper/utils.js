const slugify = require("slugify");

function randomDelay(minMs = 2000, maxMs = 5000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry(fn, maxAttempts = 3, backoffs = [5000, 15000, 30000]) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const wait = backoffs[attempt] != null ? backoffs[attempt] : 30000;
        console.warn(`  Retry ${attempt + 1}/${maxAttempts - 1} after ${wait}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }
  throw lastError;
}

function generateSlug(title, sku) {
  const base = slugify(title.slice(0, 80), { lower: true, strict: true });
  return `${base}-${sku}`;
}

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 5000);
}

function parsePrice(str) {
  if (!str) return null;
  const cleaned = str.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseStock(str) {
  if (!str) return 1;
  const match = str.match(/(\d+)\s+available/i);
  if (match) return parseInt(match[1], 10);
  if (/last one/i.test(str)) return 1;
  if (/out of stock/i.test(str)) return 0;
  return 1;
}

function extractItemId(url) {
  const match = url.match(/\/itm\/(\d+)/);
  return match ? match[1] : null;
}

module.exports = { randomDelay, retry, generateSlug, stripHtml, parsePrice, parseStock, extractItemId };
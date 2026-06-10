const { NAV_TIMEOUT } = require("./config.js");
const { randomDelay, parsePrice, parseStock, extractItemId, stripHtml } = require("./utils.js");
const { isCaptchaPage } = require("./browser.js");

async function safeText(locator, fallback) {
  try {
    const text = await locator.first().textContent({ timeout: 3000 });
    return (text && text.trim()) || (fallback !== undefined ? fallback : null);
  } catch (_) {
    return fallback !== undefined ? fallback : null;
  }
}

async function scrapeProduct(page, url) {
  const itemId = extractItemId(url);
  if (!itemId) return null;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT, referer: "https://www.ebay.com/" });
  // Wait for eBay React app to hydrate and render product fields
  await page.waitForFunction(
    () => document.querySelectorAll("h1").length > 0 || document.title.includes("|"),
    { timeout: 12000 }
  ).catch(() => {});
  await randomDelay(2000, 4000);

  if (await isCaptchaPage(page)) {
    console.warn("  CAPTCHA on product " + itemId + ". Waiting 30s...");
    await new Promise(r => setTimeout(r, 30000));
    await page.reload({ waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await randomDelay(3000, 6000);
    if (await isCaptchaPage(page)) return null;
  }

  await page.evaluate(() => window.scrollTo(0, 400));
  await randomDelay(800, 1500);

  // Title — multiple fallback selectors
  const title = await safeText(page.locator(
    ".x-item-title__mainTitle .ux-textspans, h1[itemprop=\"name\"], .it-ttl#itemTitle"
  ));
  if (!title) return null;

  // Price
  const priceRaw = await safeText(page.locator(
    ".x-price-primary span, [data-testid=\"x-bin-price\"] .x-price-primary span, #prcIsum"
  ));
  const price = parsePrice(priceRaw);
  if (!price) return null;

  // Compare-at price (Was price)
  const wasRaw = await safeText(page.locator(
    ".x-additional-info .ux-textspans--STRIKETHROUGH, [data-testid=\"x-original-retail-price\"] .ux-textspans--STRIKETHROUGH"
  ));
  const compareAtPrice = parsePrice(wasRaw);

  // Stock
  const stockRaw = await safeText(page.locator(
    ".x-quantity__availability .ux-textspans, [data-testid=\"x-quantity-availability\"], #qtySubTxt"
  ), "");
  const stockCount = parseStock(stockRaw);

  // Brand from Item Specifics
  let brand = null;
  try {
    const specRows = await page.locator(".ux-labels-values--item-specifics .ux-labels-values").all();
    for (const row of specRows) {
      const label = await safeText(row.locator(".ux-labels-values__labels-content"), "");
      if (label && label.toLowerCase().includes("brand")) {
        brand = await safeText(row.locator(".ux-labels-values__values-content .ux-textspans"));
        break;
      }
    }
  } catch (_) {}

  // Images — full resolution
  const images = await page.evaluate(() => {
    const seen = new Set();
    const result = [];
    const selectors = [
      ".ux-image-carousel-item img",
      ".ux-image-magnify__image--original",
      "#icImg",
    ];
    for (const sel of selectors) {
      for (const img of document.querySelectorAll(sel)) {
        let src = img.dataset.src || img.src || "";
        src = src.replace(/s-l\d+/, "s-l1600").replace(/\?.*$/, "");
        if (src && src.startsWith("http") && !seen.has(src)) {
          seen.add(src);
          result.push(src);
        }
      }
      if (result.length > 0) break;
    }
    return result.slice(0, 7);
  });

  // Description from iframe or fallback
  let description = "";
  try {
    const descFrame = page.frameLocator("#desc_ifr");
    const descHtml = await descFrame.locator("body").innerHTML({ timeout: 5000 });
    description = stripHtml(descHtml);
  } catch (_) {
    description = await safeText(page.locator(".x-item-description, .viTabs_content"), "") || "";
  }

  // Variants
  const variants = await page.evaluate(() => {
    const groups = [];
    const selects = document.querySelectorAll(".x-msku-select-box select, select[id^=\"msku-sel-\"]");
    selects.forEach(sel => {
      const labelEl = sel.closest(".x-msku-select-box") &&
        sel.closest(".x-msku-select-box").querySelector(".x-msku-select-box__label");
      const label = (labelEl && labelEl.textContent && labelEl.textContent.trim()) || "Option";
      const options = Array.from(sel.options)
        .map(o => o.value && o.value.trim())
        .filter(v => v && v !== "- Select -" && v !== "Select");
      if (options.length > 0) groups.push({ label, options });
    });
    if (groups.length === 0) {
      const pills = document.querySelectorAll("[data-testid*=\"variation\"] .x-msku__item");
      if (pills.length > 0) {
        const options = Array.from(pills).map(p => p.textContent && p.textContent.trim()).filter(Boolean);
        if (options.length > 0) groups.push({ label: "Variant", options });
      }
    }
    return groups;
  });

  return { itemId, title, price, compareAtPrice, stockCount, brand, images, description, variants };
}

module.exports = { scrapeProduct };
const { buildSearchUrl, PRODUCTS_PER_CATEGORY, NAV_TIMEOUT } = require("./config.js");
const { randomDelay, extractItemId } = require("./utils.js");
const { isCaptchaPage } = require("./browser.js");

async function scrapeSearchUrls(page, keyword, targetCount) {
  const count = targetCount || PRODUCTS_PER_CATEGORY;
  const urls = new Set();
  let pageNum = 1;

  while (urls.size < count) {
    const searchUrl = buildSearchUrl(keyword, pageNum);
    console.log("  Search page " + pageNum + ": " + searchUrl.slice(0, 90) + "...");

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
      await randomDelay(8000, 15000);

      if (await isCaptchaPage(page)) {
        console.warn("  CAPTCHA on search page. Waiting 30s...");
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }

      // Human-like scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await randomDelay(1000, 2000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1000, 2000);

      const links = await page.evaluate(() => {
        const selectors = [
          ".s-item__wrapper a.s-item__link",
          ".s-item a.s-item__link",
          "li.s-item a[href*=\"/itm/\"]",
        ];
        for (const sel of selectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) return Array.from(els).map(a => a.href);
        }
        return [];
      });

      const productLinks = links.filter(url => {
        const id = extractItemId(url);
        return id && !url.includes("rover.ebay.com");
      });

      if (productLinks.length === 0) {
        console.warn("  No products on page " + pageNum + ". Stopping.");
        break;
      }

      for (const url of productLinks) {
        if (urls.size >= count) break;
        const itemId = extractItemId(url);
        if (itemId) urls.add("https://www.ebay.com/itm/" + itemId);
      }

      console.log("  Collected " + urls.size + "/" + count + " URLs (page " + pageNum + ")");

      const hasNextPage =
        (await page.locator("a[aria-label=\"Go to next search page\"]").count()) > 0 ||
        (await page.locator(".pagination__next").count()) > 0;

      if (!hasNextPage) {
        console.log("  No next page.");
        break;
      }

      pageNum++;
    } catch (err) {
      console.error("  Search page error: " + err.message);
      break;
    }
  }

  return Array.from(urls).slice(0, count);
}

module.exports = { scrapeSearchUrls };
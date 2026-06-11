const { buildSearchUrl, PRODUCTS_PER_CATEGORY, NAV_TIMEOUT } = require("./config.js");
const { randomDelay, extractItemId } = require("./utils.js");
const { isCaptchaPage } = require("./browser.js");

// tier: { name, min, max, count, sop } — controls price range + sort order
async function scrapeSearchUrls(page, keyword, targetCount, tier) {
  const count = targetCount || PRODUCTS_PER_CATEGORY;
  const urls = new Set();
  let pageNum = 1;
  let captchaStrikes = 0;

  while (urls.size < count) {
    const searchUrl = buildSearchUrl(keyword, pageNum, tier);
    console.log("  Search page " + pageNum + ": " + searchUrl.slice(0, 90) + "...");

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

      // Wait for eBay's React hydration to render product cards (up to 20s)
      await page.waitForFunction(
        () => document.querySelectorAll("a[href*='/itm/']").length > 20,
        { timeout: 20000 }
      ).catch(() => {});

      await new Promise(r => setTimeout(r, 3000));

      if (await isCaptchaPage(page)) {
        captchaStrikes++;
        console.warn("  CAPTCHA on search page (strike " + captchaStrikes + "/3). Waiting 30s...");
        if (captchaStrikes >= 3) {
          console.error("  3 consecutive CAPTCHAs — aborting category.");
          break;
        }
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      captchaStrikes = 0;

      // Scroll to trigger lazy-loaded items
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await randomDelay(1500, 2500);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1500, 2500);

      const links = await page.evaluate(() => {
        // eBay 2024+ no longer uses .s-item__link — collect all /itm/ hrefs directly
        return Array.from(document.querySelectorAll("a[href]"))
          .map(a => a.href)
          .filter(h => h && h.includes("/itm/"));
      });

      const productLinks = links.filter(url => {
        const id = extractItemId(url);
        // eBay uses itm/123456 as a placeholder — real IDs are 9+ digits
        return id && id.length >= 9 && !url.includes("rover.ebay.com");
      });

      if (productLinks.length === 0) {
        const dbgTitle = await page.title().catch(() => "?");
        const dbgUrl   = page.url();
        console.warn("  No products on page " + pageNum + " — title: " + JSON.stringify(dbgTitle));
        console.warn("  URL: " + dbgUrl.slice(0, 120));
        // Dump first few raw links to diagnose selector issues
        const rawLinks = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]")).map(a => a.href).filter(h => h.includes("ebay.com")).slice(0, 5)
        ).catch(() => []);
        console.warn("  Sample links: " + JSON.stringify(rawLinks));
        break;
      }

      const sizeBefore = urls.size;
      for (const url of productLinks) {
        if (urls.size >= count) break;
        const itemId = extractItemId(url);
        if (itemId) urls.add("https://www.ebay.com/itm/" + itemId);
      }

      const newCount = urls.size - sizeBefore;
      console.log("  Collected " + urls.size + "/" + count + " URLs (page " + pageNum +
        ", +" + newCount + " new)");

      // eBay is looping — no new unique products on this page
      if (newCount === 0) {
        console.log("  No new URLs on page " + pageNum + " — eBay exhausted.");
        break;
      }

      const hasNextPage = await page.evaluate(() => {
        const next = document.querySelector(
          "a[aria-label='Go to next search page'], .pagination__next, a[href*='_pgn=']"
        );
        return !!next;
      });

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
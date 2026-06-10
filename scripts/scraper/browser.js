const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { randomUA } = require("./config.js");

chromium.use(StealthPlugin());

// Use system Chrome — far less detectable than the Playwright headless shell
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--disable-extensions",
      "--start-maximized",
    ],
  });
  return browser;
}

async function newStealthContext(browser) {
  const width = 1280 + Math.floor(Math.random() * 640);
  const context = await browser.newContext({
    userAgent: randomUA(),
    viewport: { width, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });
  return context;
}

async function newStealthPage(browserOrContext) {
  // Accept either a browser (creates a new context) or an existing context
  let context, ownsContext;
  if (browserOrContext.newContext) {
    context = await newStealthContext(browserOrContext);
    ownsContext = true;
  } else {
    context = browserOrContext;
    ownsContext = false;
  }
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    window.chrome = { runtime: {} };
  });
  return { page, context, ownsContext };
}

async function warmupContext(context) {
  // Visit eBay homepage to establish session cookies before scraping
  const page = await context.newPage();
  try {
    await page.goto("https://www.ebay.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.warn("  Warmup warning:", err.message);
  }
  await page.close();
}

async function isCaptchaPage(page) {
  const title = await page.title().catch(() => "");
  // Match known eBay block/CAPTCHA page titles only
  const isBlocked = /^(security check|access denied|robot check|verify you are human|sorry.*something went wrong)$/i.test(title.trim());

  // Visible CAPTCHA iframe (not hidden honeypots)
  const hasVisibleCaptcha = await page.locator("iframe[src*='captcha']:visible, iframe[title*='captcha' i]:visible").count() > 0;

  if (isBlocked || hasVisibleCaptcha) {
    console.warn("  [isCaptchaPage] title=" + JSON.stringify(title) + " visibleCaptcha=" + hasVisibleCaptcha);
  }

  return isBlocked || hasVisibleCaptcha;
}

module.exports = { launchBrowser, newStealthContext, newStealthPage, warmupContext, isCaptchaPage };
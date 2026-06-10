const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { randomUA } = require("./config.js");

chromium.use(StealthPlugin());

async function launchBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--window-size=1920,1080",
    ],
  });
  return browser;
}

async function newStealthPage(browser) {
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
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    window.chrome = { runtime: {} };
  });
  return { page, context };
}

async function isCaptchaPage(page) {
  const content = await page.content();
  return (
    content.includes("captcha") ||
    content.includes("CAPTCHA") ||
    content.includes("robot") ||
    content.includes("unusual traffic") ||
    content.includes("security check")
  );
}

module.exports = { launchBrowser, newStealthPage, isCaptchaPage };
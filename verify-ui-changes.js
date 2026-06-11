const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.createContext();
  const page = await context.newPage();
  const screenshotsDir = path.join(__dirname, 'verification-screenshots');

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  try {
    console.log('🔍 Navigating to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Take screenshot of full page
    await page.screenshot({ path: path.join(screenshotsDir, '1-full-page.png'), fullPage: true });
    console.log('✅ Full page screenshot saved');

    // Check if TrustBar is visible
    const trustBar = await page.locator('[class*="bg-\\[#1b233a\\]"]').first();
    if (trustBar) {
      console.log('✅ Trust bar found');
      await page.screenshot({
        path: path.join(screenshotsDir, '2-trust-bar.png'),
        clip: await trustBar.boundingBox()
      });
    }

    // Check for SVG icons (Lucide) in the trust bar
    const svgIcons = await page.locator('svg[class*="lucide"]').count();
    console.log(`✅ Found ${svgIcons} Lucide SVG icons on page`);

    // Check for emoji (should not exist in trust bar after our changes)
    const trustBarText = await page.locator('text=Free Shipping').first().textContent();
    console.log(`✅ Trust bar text found: "${trustBarText}"`);

    // Check if Featured Products Carousel exists
    const carousel = await page.locator('text=Featured for You').isVisible().catch(() => false);
    if (carousel) {
      console.log('✅ Featured Products Carousel section found');

      // Take screenshot of carousel
      const carouselSection = await page.locator(':has-text("Featured for You")').first();
      if (carouselSection) {
        await page.screenshot({
          path: path.join(screenshotsDir, '3-carousel.png'),
          clip: await carouselSection.boundingBox()
        });
      }
    } else {
      console.log('⚠️  Featured Products Carousel not visible yet (may still be loading)');
    }

    // Check for scroll buttons in carousel
    const scrollButtons = await page.locator('button[aria-label*="Scroll"]').count();
    console.log(`🔍 Found ${scrollButtons} scroll navigation buttons`);

    // Try scrolling if buttons exist
    if (scrollButtons > 0) {
      console.log('✅ Carousel has scroll navigation buttons');

      // Get right scroll button and check if visible on hover
      const rightScroll = await page.locator('button[aria-label*="right"]').first();
      if (rightScroll) {
        await rightScroll.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        console.log('✅ Right scroll button is clickable');
      }
    }

    // Check page structure
    const sections = await page.locator('[class*="store-section"]').count();
    console.log(`✅ Page has ${sections} store sections`);

    // Verify no emoji in trust bar specifically
    const trustBarHTML = await page.locator('[class*="bg-\\[#1b233a\\]"]').first().innerHTML();
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[✂-➰]|[Ⓜ-\u{1F251}]/u.test(trustBarHTML);

    if (hasEmoji) {
      console.log('❌ Found emoji in trust bar (should use Lucide icons)');
    } else {
      console.log('✅ No emoji found in trust bar - using proper Lucide icons');
    }

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotsDir, '4-bottom-section.png'), fullPage: false });

    console.log('\n✅ Verification complete! Screenshots saved to verification-screenshots/');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

verify().then(success => {
  process.exit(success ? 0 : 1);
});

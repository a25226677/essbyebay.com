const PRICE_MIN = 50;
const PRICE_MAX = 2000;
const PRODUCTS_PER_CATEGORY = 100;
const BATCH_SIZE = 5;
const PAGE_TIMEOUT = 30000;
const NAV_TIMEOUT = 60000;

const CATEGORIES = [
  { name: "Automobile & Motorcycle",  slug: "automobile-motorcycle",  keyword: "automobile motorcycle parts accessories" },
  { name: "Beauty, Health & Hair",    slug: "beauty-health-hair",     keyword: "beauty health hair care products" },
  { name: "Computer & Accessories",   slug: "computer-accessories",   keyword: "computer laptop accessories" },
  { name: "Jewelry & Watches",        slug: "jewelry-watches",        keyword: "jewelry watches" },
  { name: "Kids & Toy",               slug: "kids-toy",               keyword: "kids toys children" },
  { name: "Men Clothing & Fashion",   slug: "men-clothing-fashion",   keyword: "men clothing fashion" },
  { name: "Phone Accessories",        slug: "phone-accessories",      keyword: "phone accessories case charger" },
  { name: "Sports & Outdoor",         slug: "sports-outdoor",         keyword: "sports outdoor equipment" },
  { name: "Women Clothing & Fashion", slug: "women-clothing-fashion", keyword: "women clothing fashion" },
  { name: "Women's Fashion Bag",      slug: "womens-fashion-bag",     keyword: "women fashion bag handbag purse" },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function buildSearchUrl(keyword, page) {
  const p = page || 1;
  const params = new URLSearchParams({
    _nkw: keyword,
    _udlo: String(PRICE_MIN),
    _udhi: String(PRICE_MAX),
    LH_BIN: "1",
    _sop: "12",
    _pgn: String(p),
  });
  return "https://www.ebay.com/sch/i.html?" + params.toString();
}

module.exports = {
  PRICE_MIN, PRICE_MAX, PRODUCTS_PER_CATEGORY, BATCH_SIZE,
  PAGE_TIMEOUT, NAV_TIMEOUT, CATEGORIES, USER_AGENTS,
  randomUA, buildSearchUrl,
};
const slugify = require("slugify");
const { PRICE_MIN, PRICE_MAX } = require("./config.js");

function generateSlug(title, sku) {
  const base = slugify(title.slice(0, 80), { lower: true, strict: true });
  return base + "-" + sku;
}

function mapToDbProduct(raw, categoryId, brandId, imageUrl) {
  const { itemId, title, price, compareAtPrice, stockCount, description } = raw;
  return {
    title: title.slice(0, 500),
    slug: generateSlug(title, itemId),
    sku: itemId,
    description: description || null,
    price: price,
    compare_at_price: (compareAtPrice && compareAtPrice > price) ? compareAtPrice : null,
    stock_count: Math.max(0, stockCount != null ? stockCount : 1),
    image_url: imageUrl || null,
    category_id: categoryId || null,
    brand_id: brandId || null,
    is_active: true,
    is_featured: false,
    is_promoted: false,
    today_deal: false,
    seller_id: null,
    shop_id: null,
    rating: 0,
    review_count: 0,
    sale_count: 0,
  };
}

function mapToDbImages(productId, imageUrls) {
  return imageUrls.map((url, index) => ({
    product_id: productId,
    image_url: url,
    sort_order: index,
  }));
}

function buildVariantRows(productId, variantGroups, totalStock) {
  if (!variantGroups || variantGroups.length === 0) return [];

  const colorGroup = variantGroups.find(g => /color|colour/i.test(g.label)) || variantGroups[0];
  const sizeGroup  = variantGroups.find(g => /size/i.test(g.label));

  const colors = (colorGroup && colorGroup.options) || ["Default"];
  const sizes  = (sizeGroup  && sizeGroup.options)  || [null];

  const combos = [];
  for (const color of colors) {
    for (const size of sizes) {
      combos.push({ color_name: color, size: size || null });
    }
  }

  const stockPerVariant = Math.max(1, Math.floor((totalStock || 1) / combos.length));

  return combos.map(combo => ({
    product_id: productId,
    color_name: combo.color_name !== "Default" ? combo.color_name : null,
    size: combo.size,
    color_hex: null,
    sku: null,
    price_delta: 0,
    stock_count: stockPerVariant,
  }));
}

function isPriceInRange(price) {
  return price >= PRICE_MIN && price <= PRICE_MAX;
}

module.exports = { mapToDbProduct, mapToDbImages, buildVariantRows, isPriceInRange };
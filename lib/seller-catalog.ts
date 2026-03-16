type ProductIdentity = {
  id?: string | null;
  title?: string | null;
  source_product_id?: string | null;
};

export function normalizeCatalogTitle(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCanonicalSourceProductId(product: ProductIdentity) {
  const sourceId = product.source_product_id?.trim();
  const directId = product.id?.trim();

  return sourceId || directId || "";
}

export function buildOwnedCatalogLookup(products: ProductIdentity[]) {
  const ownedSourceIds = new Set<string>();
  const ownedTitles = new Set<string>();

  for (const product of products) {
    const canonicalSourceId = getCanonicalSourceProductId(product);
    if (canonicalSourceId) ownedSourceIds.add(canonicalSourceId);

    const normalizedTitle = normalizeCatalogTitle(product.title);
    if (normalizedTitle) ownedTitles.add(normalizedTitle);
  }

  return { ownedSourceIds, ownedTitles };
}

export function isOwnedCatalogProduct(
  product: ProductIdentity,
  lookup: ReturnType<typeof buildOwnedCatalogLookup>,
) {
  const canonicalSourceId = getCanonicalSourceProductId(product);
  if (canonicalSourceId && lookup.ownedSourceIds.has(canonicalSourceId)) {
    return true;
  }

  const normalizedTitle = normalizeCatalogTitle(product.title);
  return normalizedTitle ? lookup.ownedTitles.has(normalizedTitle) : false;
}
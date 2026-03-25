import Link from "next/link";
import type { Metadata } from "next";
import { searchStoreProducts } from "@/lib/storefront-data";
import { ProductCard } from "@/components/product-card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { buildMetadata } from "@/lib/seo";

const PER_PAGE = 24;

type SearchProps = {
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const suffix = query ? `: ${query}` : "";

  return buildMetadata({
    title: `Search${suffix}`,
    description: query
      ? `Search results for ${query} on ESS by eBay.`
      : "Search products on ESS by eBay.",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const { products: results, total } = query
    ? await searchStoreProducts(query, currentPage, PER_PAGE)
    : { products: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Build page URL helper
  function pageUrl(page: number) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (page > 1) sp.set("page", String(page));
    return `/search?${sp.toString()}`;
  }

  // Build visible page range (1 … 3 4 [5] 6 7 … 20)
  function getPageRange(): (number | "…")[] {
    const range: (number | "…")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        range.push(i);
      } else if (range[range.length - 1] !== "…") {
        range.push("…");
      }
    }
    return range;
  }

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav
          items={[{ label: query ? `Search: "${query}"` : "Search" }]}
        />

        {query ? (
          <>
            <h1 className="text-xl font-bold mb-1">
              Search results for &quot;{query}&quot;
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              {total} product{total !== 1 ? "s" : ""} found
              {totalPages > 1 && (
                <span className="ml-1">
                  — Page {currentPage} of {totalPages}
                </span>
              )}
            </p>

            {results.length > 0 ? (
              <>
                <div className="store-surface p-4 md:p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {results.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Search results pagination"
                    className="flex items-center justify-center gap-1 mt-6"
                  >
                    {/* Previous */}
                    {currentPage > 1 ? (
                      <Link
                        href={pageUrl(currentPage - 1)}
                        className="inline-flex items-center justify-center size-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="size-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center size-9 rounded-lg text-gray-300 cursor-not-allowed">
                        <ChevronLeft className="size-4" />
                      </span>
                    )}

                    {/* Page numbers */}
                    {getPageRange().map((item, idx) =>
                      item === "…" ? (
                        <span key={`e-${idx}`} className="px-1.5 text-sm text-gray-400 select-none">
                          …
                        </span>
                      ) : (
                        <Link
                          key={item}
                          href={pageUrl(item)}
                          className={`inline-flex items-center justify-center size-9 rounded-lg text-sm font-medium transition-colors ${
                            item === currentPage
                              ? "bg-[#f77f00] text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          aria-current={item === currentPage ? "page" : undefined}
                        >
                          {item}
                        </Link>
                      ),
                    )}

                    {/* Next */}
                    {currentPage < totalPages ? (
                      <Link
                        href={pageUrl(currentPage + 1)}
                        className="inline-flex items-center justify-center size-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center size-9 rounded-lg text-gray-300 cursor-not-allowed">
                        <ChevronRight className="size-4" />
                      </span>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="store-surface flex flex-col items-center justify-center min-h-[30vh] text-center p-6">
                <SearchIcon size={48} className="text-muted-foreground/40 mb-3" />
                <h2 className="font-semibold mb-1">No Products Found</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  We couldn&apos;t find any products matching &quot;{query}&quot;.
                  Try a different search term.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="store-surface flex flex-col items-center justify-center min-h-[40vh] text-center p-6">
            <SearchIcon size={48} className="text-muted-foreground/40 mb-3" />
            <h2 className="font-semibold mb-1">Search Products</h2>
            <p className="text-sm text-muted-foreground">
              Enter a keyword in the search bar to find products.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { searchStoreProducts } from "@/lib/storefront-data";
import { ProductCard } from "@/components/product-card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Search as SearchIcon } from "lucide-react";

type SearchProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const results = query ? await searchStoreProducts(query) : [];

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
              {results.length} product{results.length !== 1 ? "s" : ""} found
            </p>

            {results.length > 0 ? (
              <div className="store-surface p-4 md:p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {results.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
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

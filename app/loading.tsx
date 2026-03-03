export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />

      {/* Hero skeleton */}
      <div className="flex gap-6 mb-10">
        <div className="hidden md:block w-64 space-y-3 flex-shrink-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded w-full" />
          ))}
        </div>
        <div className="flex-1 h-64 md:h-80 bg-gray-200 rounded-lg" />
      </div>

      {/* Section header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-44 bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

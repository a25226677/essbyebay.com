import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  // Get all products owned by this seller
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, title")
    .eq("seller_id", userId);

  if (prodErr) {
    return NextResponse.json({ error: prodErr.message }, { status: 500 });
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ reviews: [] });
  }

  const productIds = products.map((p) => p.id);
  const productMap = new Map(products.map((p) => [p.id, p.title]));

  // Get all reviews for these products — batched to avoid PostgREST URL-length 400
  type ReviewRow = { id: string; product_id: string; user_id: string; rating: number; comment: string | null; created_at: string; profiles: unknown };
  const { data: reviews, error: revErr } = await import("@/lib/supabase/query-helpers").then(({ queryInBatches }) =>
    queryInBatches<ReviewRow>(
      (chunk) =>
        supabase
          .from("reviews")
          .select("id, product_id, user_id, rating, comment, created_at, profiles!reviews_user_id_fkey(full_name)")
          .in("product_id", chunk)
          .order("created_at", { ascending: false }) as unknown as PromiseLike<{ data: ReviewRow[] | null; error: { message: string } | null }>,
      productIds,
    )
  );

  if (revErr) {
    return NextResponse.json({ error: revErr.message }, { status: 500 });
  }

  const items = (reviews ?? []).map((r) => {
    const profile = r.profiles as unknown as { full_name: string | null } | null;
    return {
      id: r.id,
      product: productMap.get(r.product_id) || "Unknown Product",
      productId: r.product_id,
      customer: profile?.full_name || "Anonymous",
      customerId: r.user_id,
      rating: r.rating,
      comment: r.comment || "",
      date: new Date(r.created_at).toISOString().slice(0, 10),
    };
  });

  return NextResponse.json({ reviews: items });
}

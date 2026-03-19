import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("product_id");
    if (!productId) return NextResponse.json({ error: "Missing product_id" }, { status: 400 });

    const admin = createAdminServiceClient();
    const { data, error } = await admin
      .from("reviews")
      .select("id, rating, comment, created_at, profiles(full_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const reviews = (data || []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      author: (r.profiles && r.profiles[0]?.full_name) || "Customer",
      date: r.created_at,
    }));

    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("GET /api/reviews error", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const server = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            return;
          },
        },
      }
    );

    const { data: userData } = await server.auth.getUser();
    const user = userData?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = body.productId as string | undefined;
    const rating = Number(body.rating);
    const comment = String(body.comment || "").trim();

    if (!productId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Prevent duplicate reviews by same user
    const admin = createAdminServiceClient();
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You have already reviewed this product" }, { status: 400 });
    }

    const { error: insertError } = await admin.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment,
    });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    // Recompute aggregates for product
    const { data: agg } = await admin
      .from("reviews")
      .select("rating", { count: "exact" })
      .eq("product_id", productId);

    // compute average
    const { data: rows } = await admin.from("reviews").select("rating").eq("product_id", productId);
    const ratings = (rows || []).map((r: any) => Number(r.rating) || 0);
    const count = ratings.length;
    const avg = count > 0 ? ratings.reduce((s, v) => s + v, 0) / count : 0;

    await admin.from("products").update({ review_count: count, rating: avg }).eq("id", productId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/reviews error", err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}

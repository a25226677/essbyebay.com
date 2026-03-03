import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import { sendReviewDeletedEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const product_id = sp.get("product_id") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("reviews")
    .select(
      `id, rating, comment, created_at, user_id,
       products(id, title, slug, image_url),
       profiles!reviews_user_id_fkey(id, full_name, avatar_url)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (product_id) query = query.eq("product_id", product_id);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function DELETE(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Get review details before deleting for email notification
  const { data: review } = await db
    .from("reviews")
    .select("user_id, products(title), profiles!reviews_user_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.from("reviews").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send notification email to the reviewer
  if (review?.user_id) {
    try {
      const { data: authUser } = await db.auth.admin.getUserById(review.user_id);
      const email = authUser?.user?.email;
      if (email) {
        const name = (review as Record<string, unknown>).profiles
          ? ((review as Record<string, unknown>).profiles as Record<string, string>)?.full_name || "Customer"
          : "Customer";
        const productTitle = (review as Record<string, unknown>).products
          ? ((review as Record<string, unknown>).products as Record<string, string>)?.title || "a product"
          : "a product";
        sendReviewDeletedEmail(email, name, productTitle).catch(() => {});
      }
    } catch {}
  }

  return NextResponse.json({ success: true });
}

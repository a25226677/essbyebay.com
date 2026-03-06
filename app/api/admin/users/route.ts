import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendRoleChangedEmail,
  sendAdminNewUserNotification,
} from "@/lib/email";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search = (sp.get("search") || "").trim();
  const role = sp.get("role") || "";
  const is_active = sp.get("is_active") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const seller_approved = sp.get("seller_approved") || "";

  let query = db
    .from("profiles")
    .select(
      `id, full_name, phone, avatar_url, role, is_active, is_virtual, disable_login,
       wallet_balance, credit_score, package,
       pending_balance, seller_views, comment_permission, home_display,
       verification_info, invitation_code, salesman_id, identity_card_url,
       total_recharge, total_withdrawn, seller_approved,
       created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }
  if (role) query = query.eq("role", role);
  if (is_active !== "") query = query.eq("is_active", is_active === "true");
  if (seller_approved !== "") query = query.eq("seller_approved", seller_approved === "true");

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails from auth.users for each profile
  const profiles = data || [];
  let itemsWithEmail = profiles;

  if (profiles.length > 0) {
    try {
      const emailMap = new Map<string, string>();
      const batch = profiles.map((p) =>
        db.auth.admin
          .getUserById(p.id)
          .then((r) => {
            if (r.data?.user?.email) emailMap.set(p.id, r.data.user.email);
          })
          .catch(() => {})
      );
      await Promise.all(batch);
      itemsWithEmail = profiles.map((p) => ({ ...p, email: emailMap.get(p.id) || null }));
    } catch {
      itemsWithEmail = profiles.map((p) => ({ ...p, email: null }));
    }
  }

  // For sellers, also include shop info
  if (role === "seller" && itemsWithEmail.length > 0) {
    const sellerIds = itemsWithEmail.map((s) => s.id);
    const { data: shops } = await db
      .from("shops")
      .select("id, name, slug, is_verified, rating, product_count, owner_id")
      .in("owner_id", sellerIds);

    const shopMap = new Map((shops || []).map((s) => [s.owner_id, s]));
    itemsWithEmail = itemsWithEmail.map((s) => ({
      ...s,
      shops: shopMap.get(s.id) ? [shopMap.get(s.id)] : [],
    }));
  }

  return NextResponse.json({
    items: itemsWithEmail,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

// Create a new user (admin only)
export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  try {
    const body = await request.json();
    const { email, password, full_name, phone, role: bodyRole } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const validRoles = ["customer", "seller", "admin"];
    const userRole = validRoles.includes(bodyRole) ? bodyRole : "customer";
    const name = full_name || email.split("@")[0];

    // Create auth user
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Update profile with role and phone
    if (authData.user) {
      const updates: Record<string, unknown> = { role: userRole };
      if (full_name) updates.full_name = full_name;
      if (phone) updates.phone = phone;
      await db.from("profiles").update(updates).eq("id", authData.user.id);

      // Send welcome email
      sendWelcomeEmail(email, name).catch(() => {});
      if (userRole !== "customer") {
        sendRoleChangedEmail(email, name, userRole).catch(() => {});
      }
      sendAdminNewUserNotification(name, email, userRole).catch(() => {});
    }

    return NextResponse.json({ success: true, userId: authData.user?.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";
import {
  sendAccountSuspendedEmail,
  sendAccountRestoredEmail,
  sendRoleChangedEmail,
} from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

// GET single user with full details
export async function GET(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role, is_active, is_virtual, disable_login, wallet_balance, credit_score, package, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get email from auth
  let email: string | null = null;
  try {
    const { data } = await db.auth.admin.getUserById(id);
    email = data?.user?.email || null;
  } catch {}

  // Get addresses
  const { data: addresses } = await db.from("addresses").select("*").eq("user_id", id).order("created_at", { ascending: false });

  // Get orders count & total
  const { count: orderCount } = await db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", id);
  const { data: orderTotals } = await db.from("orders").select("total_amount").eq("user_id", id);
  const totalSpent = (orderTotals || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Get shop if seller
  let shop = null;
  if (profile.role === "seller") {
    const { data: shopData } = await db.from("shops").select("*").eq("owner_id", id).maybeSingle();
    shop = shopData;
  }

  // Get reviews count
  const { count: reviewCount } = await db.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", id);

  return NextResponse.json({
    item: {
      ...profile,
      email,
      addresses: addresses || [],
      orderCount: orderCount || 0,
      totalSpent,
      reviewCount: reviewCount || 0,
      shop,
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.role === "string") {
      const allowed = ["customer", "seller", "admin"];
      if (!allowed.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updates.role = body.role;
    }

    if (typeof body.full_name === "string") updates.full_name = body.full_name;
    if (typeof body.phone === "string") updates.phone = body.phone;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
    if (typeof body.credit_score === "number") updates.credit_score = body.credit_score;
    if (typeof body.package === "string") updates.package = body.package || null;
    if (typeof body.disable_login === "boolean") updates.disable_login = body.disable_login;

    // Seller-specific fields
    if (typeof body.seller_approved === "boolean")     updates.seller_approved = body.seller_approved;
    if (typeof body.guarantee_money === "number")      updates.guarantee_money = body.guarantee_money;
    if (typeof body.pending_balance === "number")      updates.pending_balance = body.pending_balance;
    if (typeof body.seller_views === "number")         updates.seller_views = body.seller_views;
    if (typeof body.comment_permission === "boolean")  updates.comment_permission = body.comment_permission;
    if (typeof body.home_display === "boolean")        updates.home_display = body.home_display;
    if (typeof body.verification_info === "string")    updates.verification_info = body.verification_info || null;
    if (typeof body.invitation_code === "string")      updates.invitation_code = body.invitation_code || null;
    if (typeof body.identity_card_url === "string")    updates.identity_card_url = body.identity_card_url || null;
    if (typeof body.total_recharge === "number")       updates.total_recharge = body.total_recharge;
    if (typeof body.total_withdrawn === "number")      updates.total_withdrawn = body.total_withdrawn;

    // Wallet recharge — adds amount to existing balance
    if (typeof body.recharge_amount === "number" && body.recharge_amount > 0) {
      const { data: current } = await db.from("profiles").select("wallet_balance").eq("id", id).maybeSingle();
      const newBalance = Number(current?.wallet_balance ?? 0) + body.recharge_amount;
      updates.wallet_balance = newBalance;
      // Record transaction
      await db.from("wallet_transactions").insert({
        user_id: id, amount: body.recharge_amount, type: "recharge",
        note: body.recharge_note || "Admin recharge",
      }).throwOnError();
    }

    // Direct wallet_balance set
    if (typeof body.wallet_balance === "number") updates.wallet_balance = body.wallet_balance;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // Get current profile for comparison
    const { data: currentProfile } = await db
      .from("profiles")
      .select("full_name, role, is_active, wallet_balance")
      .eq("id", id)
      .maybeSingle();

    const { error } = await db.from("profiles").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send email notifications for status/role changes
    let email: string | null = null;
    try {
      const { data } = await db.auth.admin.getUserById(id);
      email = data?.user?.email || null;
    } catch {}

    if (email && currentProfile) {
      const name = (updates.full_name as string) || currentProfile.full_name || "User";
      const reason = typeof body.reason === "string" ? body.reason : undefined;

      // Account suspended
      if (updates.is_active === false && currentProfile.is_active === true) {
        sendAccountSuspendedEmail(email, name, reason).catch(() => {});
      }

      // Account restored
      if (updates.is_active === true && currentProfile.is_active === false) {
        sendAccountRestoredEmail(email, name).catch(() => {});
      }

      // Role changed
      if (updates.role && updates.role !== currentProfile.role) {
        sendRoleChangedEmail(email, name, updates.role as string).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

// DELETE user (admin only)
export async function DELETE(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  // Delete auth user (cascade will handle profile via trigger)
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

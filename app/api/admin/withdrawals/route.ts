import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import { sendWalletWithdrawalEmail } from "@/lib/email";

// Columns that may be missing in older production schemas
const OPTIONAL_WITHDRAWAL_COLS = ["account_info", "withdraw_type"];

function buildWithdrawalsSelect(exclude: Set<string>) {
  const cols = [
    "id", "seller_id", "amount", "status", "method",
    "account_info", "withdraw_type", "notes", "created_at", "updated_at",
  ].filter((c) => !exclude.has(c));
  return cols.join(", ");
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const status    = sp.get("status") || "";
  const sellerId  = sp.get("seller_id") || "";
  const page  = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const excludedCols = new Set<string>();
  let data: Record<string, unknown>[] | null = null;
  let count: number | null = null;

  // Retry loop — strip one missing column per iteration
  for (let attempt = 0; attempt <= OPTIONAL_WITHDRAWAL_COLS.length; attempt++) {
    const selectCols = buildWithdrawalsSelect(excludedCols);
    let query = db
      .from("withdrawals")
      .select(selectCols, { count: "exact" })
      .order("created_at", { ascending: false });
    if (status)   query = query.eq("status", status);
    if (sellerId) query = query.eq("seller_id", sellerId);
    query = query.range(offset, offset + limit - 1);

    const result = await query;
    if (!result.error) {
      data  = (result.data as unknown as Record<string, unknown>[]) || [];
      count = result.count;
      break;
    }

    // Detect missing column and retry without it
    const msg = result.error.message;
    const match = msg.match(/column (?:withdrawals\.)?"?(\w+)"? does not exist/);
    if (match && OPTIONAL_WITHDRAWAL_COLS.includes(match[1])) {
      excludedCols.add(match[1]);
      continue;
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (data === null) {
    return NextResponse.json({ error: "Unable to query withdrawals" }, { status: 500 });
  }

  // Fill defaults for stripped optional columns
  const filledData = data.map((row) => ({
    account_info:  null,
    withdraw_type: "bank",
    ...row,
  }));

  // Attach shop name for each withdrawal
  const items = filledData;
  // Batch-fetch seller profiles and shops
  const sellerIds = [...new Set(items.map((w: Record<string, unknown>) => w.seller_id as string).filter(Boolean))];
  const profileMap = new Map<string, Record<string, unknown>>();
  const shopMap = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id, full_name, phone, avatar_url, wallet_balance").in("id", sellerIds);
    (profiles || []).forEach((p: Record<string, unknown>) => profileMap.set(p.id as string, p));
    const { data: shops } = await db.from("shops").select("name, owner_id").in("owner_id", sellerIds);
    (shops || []).forEach((s: Record<string, unknown>) => shopMap.set(s.owner_id as string, s.name as string));
  }
  const enriched = items.map((w: Record<string, unknown>) => ({
    ...w,
    profiles: profileMap.get(w.seller_id as string) || null,
    shop_name: shopMap.get(w.seller_id as string) || null,
  }));

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { seller_id, amount, method, account_info, notes } = body;
  if (!seller_id || !amount) return NextResponse.json({ error: "seller_id and amount required" }, { status: 400 });

  const { data, error } = await db.from("withdrawals").insert({
    seller_id, amount, method: method || "bank",
    account_info: account_info || null,
    notes: notes || null,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { id, status, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: currentWithdrawal } = await db
    .from("withdrawals")
    .select("id, seller_id, amount, status, method, withdraw_type")
    .eq("id", id)
    .single();

  if (!currentWithdrawal) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (status) updates.status = String(status).toLowerCase();
  if (notes !== undefined) updates.notes = notes;
  updates.updated_at = new Date().toISOString();

  // If paid → deduct from seller wallet + record seller_payment
  let currentBalance: number | undefined;
  if (updates.status === "paid" && currentWithdrawal.status !== "paid") {
    const { data: prof } = await db
      .from("profiles")
      .select("wallet_balance, total_withdrawn")
      .eq("id", currentWithdrawal.seller_id)
      .single();
    const newBal = Math.max(0, Number(prof?.wallet_balance ?? 0) - Number(currentWithdrawal.amount));
    const newWithdrawn = Number(prof?.total_withdrawn ?? 0) + Number(currentWithdrawal.amount);
    currentBalance = newBal;
    await db
      .from("profiles")
      .update({ wallet_balance: newBal, total_withdrawn: newWithdrawn })
      .eq("id", currentWithdrawal.seller_id);
      // Record seller payment entry
    await db.from("seller_payments").insert({
        seller_id: currentWithdrawal.seller_id,
        amount: currentWithdrawal.amount,
        payment_details: `Withdrawal payout (${body.withdraw_type || "bank"})`,
        trx_id: `WD-${Date.now()}`,
      });
  }

  const { error } = await db.from("withdrawals").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify seller on withdrawal status update (non-blocking)
  if (status) {
    try {
      const { data: { user } } = await db.auth.admin.getUserById(currentWithdrawal.seller_id);
      if (user?.email) {
        const { data: profile } = await db
            .from("profiles")
            .select("full_name,wallet_balance,role")
            .eq("id", currentWithdrawal.seller_id)
            .single();

        await sendWalletWithdrawalEmail({
          to: user.email,
          customerName: profile?.full_name || "Seller",
          amount: Number(currentWithdrawal.amount || 0),
          status: String(status),
          method: currentWithdrawal.method || currentWithdrawal.withdraw_type || undefined,
          reference: currentWithdrawal.id,
            balance: currentBalance ?? Number(profile?.wallet_balance ?? 0),
            note: typeof notes === "string" ? notes : undefined,
            role: profile?.role || "seller",
        });
      }
    } catch {
      // Non-blocking
    }
  }

  return NextResponse.json({ success: true });
}

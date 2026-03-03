import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";
import { sendWithdrawalRequestEmail } from "@/lib/email";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  const [payoutsResult, withdrawalsResult] = await Promise.all([
    supabase.from("seller_payouts").select("net_amount").eq("seller_id", userId),
    supabase
      .from("withdrawals")
      .select("id,amount,method,status,notes,created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const totalPayouts = (payoutsResult.data ?? []).reduce(
    (s, p) => s + Number(p.net_amount),
    0,
  );
  const totalWithdrawn = (withdrawalsResult.data ?? [])
    .filter((w) => w.status === "completed" || w.status === "approved")
    .reduce((s, w) => s + Number(w.amount), 0);
  const balance = Math.max(0, totalPayouts - totalWithdrawn);

  const history = (withdrawalsResult.data ?? []).map((w, idx) => ({
    id: w.id,
    index: idx + 1,
    date: new Date(w.created_at).toISOString().slice(0, 10),
    amount: Number(w.amount),
    method: w.method || "Bank Transfer",
    status: w.status.charAt(0).toUpperCase() + w.status.slice(1),
    notes: w.notes,
  }));

  return NextResponse.json({ balance, history });
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const method = String(body.method || "Bank Transfer").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Check available balance
    const [payoutsResult, withdrawalsResult] = await Promise.all([
      supabase.from("seller_payouts").select("net_amount").eq("seller_id", userId),
      supabase
        .from("withdrawals")
        .select("amount,status")
        .eq("seller_id", userId),
    ]);

    const totalPayouts = (payoutsResult.data ?? []).reduce(
      (s, p) => s + Number(p.net_amount),
      0,
    );
    const totalWithdrawn = (withdrawalsResult.data ?? [])
      .filter((w) => w.status === "completed" || w.status === "approved")
      .reduce((s, w) => s + Number(w.amount), 0);
    const pendingWithdrawals = (withdrawalsResult.data ?? [])
      .filter((w) => w.status === "pending")
      .reduce((s, w) => s + Number(w.amount), 0);

    const available = Math.max(0, totalPayouts - totalWithdrawn - pendingWithdrawals);

    if (amount > available) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${available.toFixed(2)}` },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("withdrawals").insert({
      seller_id: userId,
      amount,
      method,
      status: "pending",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send withdrawal request confirmation email
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
        await sendWithdrawalRequestEmail(
          user.email,
          profile?.full_name || "Seller",
          amount.toFixed(2)
        );
      }
    } catch {
      // Email failure is non-blocking
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

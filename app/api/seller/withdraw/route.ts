import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";
import { sendWithdrawalRequestEmail } from "@/lib/email";

function toTitleCase(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function GET(req: any) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(req.url || "http://localhost/");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const [withdrawalsResult, profileResult, frozeResult, methodsResult, offlineRechargesResult, guaranteeRechargesResult, sellerPaymentsResult] = await Promise.all([
    supabase
      .from("withdrawals")
      .select("id,amount,method,status,notes,created_at,withdraw_type,account_info", { count: "exact" })
      .eq("seller_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("profiles")
      .select("pending_balance,guarantee_money,wallet_balance")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("froze_orders")
      .select("id,order_code,amount,profit,payment_status,pickup_status,unfreeze_date,created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_methods")
      .select("id,heading,logo_url")
      .eq("is_active", true),
    supabase
      .from("offline_recharges")
      .select("id,amount,method,txn_id,photo_url,is_approved,type,notes,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("guarantee_recharges")
      .select("id,amount,method,photo_url,status,notes,created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("seller_payments")
      .select("id,amount,payment_details,trx_id,created_at")
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const pendingBalance = Number(profileResult.data?.pending_balance ?? 0);
  const walletMoney = Number(profileResult.data?.wallet_balance ?? 0);
  const guaranteeMoney = Number(profileResult.data?.guarantee_money ?? 0);

  const withdrawHistory = (withdrawalsResult.data ?? []).map((w, idx) => ({
    id: w.id,
    index: idx + 1,
    created_at: w.created_at,
    date: formatDate(w.created_at),
    amount: Number(w.amount),
    method: w.method || "Bank",
    type: "Withdraw",
    status: toTitleCase(w.status, "Pending"),
    withdraw_type: w.withdraw_type || "Bank",
    remarks: w.notes || "",
    message: w.account_info || "",
  }));

  const rechargeHistory = (offlineRechargesResult.data ?? []).map((item) => ({
    id: item.id,
    created_at: item.created_at,
    date: formatDate(item.created_at),
    amount: Number(item.amount),
    payment_method: item.method || "Bank",
    payment_details: item.notes || "Offline wallet recharge",
    approval: item.is_approved ? "Yes" : "No",
    offline_payment: "Yes",
    type: item.type || "Wallet Recharge",
    receipt: item.txn_id || null,
    slip_url: item.photo_url || null,
  }));

  const guaranteeHistory = (guaranteeRechargesResult.data ?? []).map((item) => ({
    id: item.id,
    created_at: item.created_at,
    date: formatDate(item.created_at),
    amount: Number(item.amount),
    payment_method: item.method || "Bank",
    payment_details: item.notes || "Guarantee recharge request",
    approval: item.status === "approved" ? "Yes" : item.status === "rejected" ? "Rejected" : "Pending",
    offline_payment: "Yes",
    type: "Guarantee Recharge",
    receipt: null,
    slip_url: item.photo_url || null,
  }));

  const walletHistory = [...rechargeHistory, ...guaranteeHistory]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((item, idx) => ({
      ...item,
      index: idx + 1,
    }));

  const paymentHistory = (sellerPaymentsResult.data ?? [])
    .map((item) => {
      const methodMatch = item.payment_details?.match(/\(([^)]+)\)/);

      return {
        id: item.id,
        created_at: item.created_at,
        date: formatDate(item.created_at),
        amount: Number(item.amount),
        payment_details: item.payment_details || "Seller payment",
        payment_method: methodMatch?.[1] || (item.trx_id ? "Transaction" : "Admin"),
        trx_id: item.trx_id || null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((item, idx) => ({
      ...item,
      index: idx + 1,
    }));

  const frozeOrders = (frozeResult.data ?? []).map((f, idx) => ({
    id: f.id,
    index: idx + 1,
    order_code: f.order_code,
    amount: Number(f.amount),
    profit: Number(f.profit),
    payment_status: f.payment_status === "paid" ? "Paid" : "Un-Paid",
    pickup_status: f.pickup_status === "picked_up" ? "Picked Up" : "Unpicked Up",
    date: new Date(f.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }),
    unfreeze_countdown: f.unfreeze_date
      ? (() => {
          const diff = new Date(f.unfreeze_date).getTime() - Date.now();
          if (diff <= 0) return "Unfrozen";
          const days = Math.floor(diff / 86400000);
          return days > 0 ? `${days} days` : "< 1 day";
        })()
      : "Unpicked Up",
  }));

  return NextResponse.json({
    pendingBalance,
    walletMoney,
    guaranteeMoney,
    history: withdrawHistory,
    withdrawHistory,
    withdrawPagination: { page, limit, total: withdrawalsResult.count || 0, pages: Math.ceil((withdrawalsResult.count || 0) / limit) },
    walletHistory,
    paymentHistory,
    frozeOrders,
    paymentMethods: methodsResult.data ?? [],
    bankInfo: null,
  });
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const method = String(body.method || "Bank").trim();
    const operaType = String(body.opera_type || "User Balance").trim();
    const message = String(body.message || "").trim();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Check available balance
      const [withdrawalsResult, profileResult] = await Promise.all([
        supabase
        .from("withdrawals")
        .select("amount,status")
        .eq("seller_id", userId),
        supabase.from("profiles").select("guarantee_money,wallet_balance").eq("id", userId).maybeSingle(),
    ]);

    if (operaType === "Guarantee Balance") {
      const gBalance = Number(profileResult.data?.guarantee_money ?? 0);
      if (amount > gBalance) {
        return NextResponse.json(
          { error: `Insufficient guarantee balance. Available: $${gBalance.toFixed(2)}` },
          { status: 400 },
        );
      }
    } else {
      const pendingWithdrawals = (withdrawalsResult.data ?? [])
        .filter((w) => w.status === "pending")
        .reduce((s, w) => s + Number(w.amount), 0);
      const available = Math.max(0, Number(profileResult.data?.wallet_balance ?? 0) - pendingWithdrawals);

      if (amount > available) {
        return NextResponse.json(
          { error: `Insufficient balance. Available: $${available.toFixed(2)}` },
          { status: 400 },
        );
      }
    }

    const { error } = await supabase.from("withdrawals").insert({
      seller_id: userId,
      amount,
      method,
      status: "pending",
      withdraw_type: method.toLowerCase(),
      account_info: message || null,
      notes: operaType,
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

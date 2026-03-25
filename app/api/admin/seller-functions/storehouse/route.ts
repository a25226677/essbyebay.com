import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

const KEY = "seller_storehouse_factor";

function parseNumber(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

export async function GET() {
  try {
    const context = await getAdminContext();
    if (context instanceof NextResponse) return context;
    const { db } = context;

    const { data } = await db.from("website_settings").select("setting_value").eq("setting_key", KEY).maybeSingle();
    const factor = data?.setting_value ? parseNumber(data.setting_value, 0.7) : 0.7;

    // normalize: if stored as percent (70) convert to fraction
    const storehouseFactor = factor > 1 ? factor / 100 : factor;

    return NextResponse.json({ data: { storehouseFactor, sellerProfitPercent: Number(((1 - storehouseFactor) * 100).toFixed(2)) } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAdminContext();
    if (context instanceof NextResponse) return context;
    const { db } = context;

    const body = await req.json();
    const profitPercent = parseNumber(body?.sellerProfitPercent, NaN);
    const applyToPending = Boolean(body?.applyToPending);

    if (Number.isNaN(profitPercent) || profitPercent < 0 || profitPercent > 100) {
      return NextResponse.json({ error: "Invalid sellerProfitPercent" }, { status: 400 });
    }

    const storehouseFactor = 1 - profitPercent / 100;

    const now = new Date().toISOString();
    const { error: upsertErr } = await db.from("website_settings").upsert({ setting_key: KEY, setting_value: String(storehouseFactor), updated_at: now }, { onConflict: "setting_key" });
    if (upsertErr) throw upsertErr;

    let updated = 0;

    if (applyToPending) {
      // Recalculate pending froze_orders profit and adjust profiles.pending_balance
      const { data: pending, error: pErr } = await db
        .from("froze_orders")
        .select("id, order_id, seller_id, profit")
        .eq("payment_status", "paid")
        .neq("pickup_status", "picked_up");

      if (pErr) throw pErr;

      for (const row of pending || []) {
        // fetch order items for this order and seller
        const { data: items } = await db.from("order_items").select("unit_price,quantity").eq("order_id", row.order_id).eq("seller_id", row.seller_id);
        const subtotal = (items || []).reduce((s: number, it: any) => s + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);
        const storehouseTotal = (items || []).reduce((s: number, it: any) => s + Number(it.unit_price || 0) * Number(it.quantity || 0) * storehouseFactor, 0);
        const newProfit = Math.max(0, Number((subtotal - storehouseTotal).toFixed(2)));

        // update froze_orders and adjust profile.pending_balance by diff
        const diff = Number(newProfit) - Number(row.profit || 0);

        const { error: uErr } = await db.from("froze_orders").update({ profit: newProfit, amount: Number(storehouseTotal.toFixed(2)) }).eq("id", row.id);
        if (uErr) continue;

        if (diff !== 0) {
          const { data: prof } = await db.from("profiles").select("pending_balance").eq("id", row.seller_id).maybeSingle();
          const currentPending = Number(prof?.pending_balance ?? 0);
          const newPending = Math.max(0, Number((currentPending + diff).toFixed(2)));
          await db.from("profiles").update({ pending_balance: newPending }).eq("id", row.seller_id);
        }

        updated += 1;
      }
    }

    return NextResponse.json({ success: true, data: { storehouseFactor, sellerProfitPercent: profitPercent, updated } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

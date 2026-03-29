import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

const KEY = "seller_storehouse_factor";
const DEFAULT_STOREFRONT_FACTOR = 0.8;

function parseNumber(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function normalizeFactor(raw: number, fallback = DEFAULT_STOREFRONT_FACTOR) {
  let factor = Number(raw);
  if (Number.isNaN(factor)) return fallback;
  if (factor > 1) factor = factor / 100;
  if (factor <= 0 || factor > 1) return fallback;
  return factor;
}

export async function GET() {
  try {
    const context = await getAdminContext();
    if (context instanceof NextResponse) return context;
    const { db } = context;

    const { data } = await db.from("website_settings").select("setting_value").eq("setting_key", KEY).maybeSingle();
    const factor = data?.setting_value
      ? parseNumber(data.setting_value, DEFAULT_STOREFRONT_FACTOR)
      : DEFAULT_STOREFRONT_FACTOR;
    const storehouseFactor = normalizeFactor(factor);

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

    const body = (await req.json()) as {
      sellerProfitPercent?: unknown;
      applyToPending?: unknown;
      applyToAllOrders?: unknown;
      rebuildBalances?: unknown;
    };
    const profitPercent = parseNumber(body?.sellerProfitPercent, NaN);

    if (Number.isNaN(profitPercent) || profitPercent < 0 || profitPercent > 100) {
      return NextResponse.json({ error: "Invalid sellerProfitPercent" }, { status: 400 });
    }

    // Legacy payload keys are accepted for backward compatibility, but behavior
    // is always a global rebuild as per the new policy.
    void body.applyToPending;
    void body.applyToAllOrders;
    void body.rebuildBalances;

    const storehouseFactor = normalizeFactor(1 - profitPercent / 100);
    const { data: rpcData, error: rebuildErr } = await db.rpc("rebuild_seller_financials", {
      p_storehouse_factor: storehouseFactor,
    });
    if (rebuildErr) throw rebuildErr;

    const row = Array.isArray(rpcData) ? rpcData[0] : null;
    const updatedOrderItems = Number(row?.updated_order_items ?? 0);
    const updatedFrozeOrders = Number(row?.updated_froze_orders ?? 0);
    const updatedProfiles = Number(row?.updated_profiles ?? 0);
    const appliedFactor = normalizeFactor(
      Number(row?.applied_storehouse_factor ?? storehouseFactor),
      storehouseFactor,
    );
    const sellerProfitPercent = Number(((1 - appliedFactor) * 100).toFixed(2));

    return NextResponse.json({
      success: true,
      data: {
        storehouseFactor: appliedFactor,
        sellerProfitPercent,
        updatedOrderItems,
        updatedFrozeOrders,
        updatedProfiles,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

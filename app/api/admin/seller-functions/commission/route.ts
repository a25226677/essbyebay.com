import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

const DEFAULTS = {
  defaultRate: 5,
  vipRate: 3,
  newSellerRate: 7,
} as const;

const KEY_DEFAULT = "seller_commission_default_rate";
const KEY_VIP = "seller_commission_vip_rate";
const KEY_NEW = "seller_commission_new_seller_rate";

function toRate(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function GET() {
  try {
    const context = await getAdminContext();
    if (context instanceof NextResponse) return context;

    const { db } = context;
    const { data, error } = await db
      .from("website_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [KEY_DEFAULT, KEY_VIP, KEY_NEW]);

    if (error) throw error;

    const map = new Map((data || []).map((row) => [row.setting_key, row.setting_value]));

    return NextResponse.json({
      data: {
        defaultRate: toRate(map.get(KEY_DEFAULT), DEFAULTS.defaultRate),
        vipRate: toRate(map.get(KEY_VIP), DEFAULTS.vipRate),
        newSellerRate: toRate(map.get(KEY_NEW), DEFAULTS.newSellerRate),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Failed to load settings") },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getAdminContext();
    if (context instanceof NextResponse) return context;

    const { db } = context;
    const body = await req.json();

    const defaultRate = toRate(body?.defaultRate, DEFAULTS.defaultRate);
    const vipRate = toRate(body?.vipRate, DEFAULTS.vipRate);
    const newSellerRate = toRate(body?.newSellerRate, DEFAULTS.newSellerRate);
    const applyToAllSellers = Boolean(body?.applyToAllSellers);

    const now = new Date().toISOString();

    const { error: upsertError } = await db.from("website_settings").upsert(
      [
        { setting_key: KEY_DEFAULT, setting_value: String(defaultRate), updated_at: now },
        { setting_key: KEY_VIP, setting_value: String(vipRate), updated_at: now },
        { setting_key: KEY_NEW, setting_value: String(newSellerRate), updated_at: now },
      ],
      { onConflict: "setting_key" },
    );

    if (upsertError) throw upsertError;

    let affectedPayouts = 0;

    if (applyToAllSellers) {
      const { data: pendingRows, error: pendingError } = await db
        .from("seller_payouts")
        .select("id, gross_amount, paid_at")
        .is("paid_at", null);

      if (pendingError) throw pendingError;

      for (const row of pendingRows || []) {
        const gross = Number(row.gross_amount || 0);
        const commissionAmount = Number(((gross * defaultRate) / 100).toFixed(2));
        const netAmount = Number((gross - commissionAmount).toFixed(2));

        const { error: rowError } = await db
          .from("seller_payouts")
          .update({
            commission_rate: defaultRate,
            commission_amount: commissionAmount,
            net_amount: netAmount,
          })
          .eq("id", row.id);

        if (!rowError) affectedPayouts += 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: { defaultRate, vipRate, newSellerRate, affectedPayouts },
    });
  } catch (e) {
    return NextResponse.json(
      { error: getErrorMessage(e, "Failed to save settings") },
      { status: 500 },
    );
  }
}

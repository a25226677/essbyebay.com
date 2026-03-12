import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextRequest, NextResponse } from "next/server";
import { sendSupportTicketEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("support_tickets")
    .select("id,subject,message,status,created_at,updated_at,order_id", { count: "exact" })
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tickets = (data ?? []).map((t, idx) => ({
    id: t.id,
    index: idx + 1,
    subject: t.subject,
    message: t.message,
    status: t.status,
    orderId: t.order_id,
    createdAt: new Date(t.created_at).toISOString().slice(0, 10),
    updatedAt: new Date(t.updated_at).toISOString().slice(0, 10),
  }));

  return NextResponse.json({
    tickets,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function POST(req: NextRequest) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { subject, message } = await req.json();

  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: userId,
      seller_id: userId,
      subject: subject.trim(),
      message: message.trim(),
      status: "open",
    })
    .select("id,subject,status,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send support ticket confirmation email
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && data?.id) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      await sendSupportTicketEmail(
        user.email,
        profile?.full_name || "Seller",
        data.id,
        subject.trim()
      );
    }
  } catch {
    // Email failure is non-blocking
  }

  return NextResponse.json({ ticket: data });
}

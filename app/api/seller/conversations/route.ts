import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(req.url);
  const convId = searchParams.get("id");

  // Return messages for a specific conversation
  if (convId) {
    const { data, error } = await supabase
      .from("messages")
      .select("id,sender_id,body,created_at,profiles(full_name,avatar_url)")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const messages = (data ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      createdAt: m.created_at,
      senderName:
        (m.profiles as unknown as { full_name: string }[] | null)?.[0]?.full_name ?? "User",
      isSeller: m.sender_id === userId,
    }));

    return NextResponse.json({ messages });
  }

  // Return list of conversations with last message
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const { data: convs, error: convError, count } = await supabase
    .from("conversations")
    .select("id,created_at,updated_at,customer_id,profiles!conversations_customer_id_fkey(full_name,avatar_url)", { count: "exact" })
    .eq("seller_id", userId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (convError) return NextResponse.json({ error: convError.message }, { status: 500 });

  // Fetch last message for each conversation
  const convIds = (convs ?? []).map((c) => c.id);
  const { data: lastMessages } = convIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id,body,created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
    : { data: [] as { conversation_id: string; body: string; created_at: string }[] };

  const lastMsgMap: Record<string, { body: string; created_at: string }> = {};
  for (const m of lastMessages ?? []) {
    if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m;
  }

  const conversations = (convs ?? []).map((c) => ({
    id: c.id,
    customerName:
      (c.profiles as unknown as { full_name: string }[] | null)?.[0]?.full_name ?? "Customer",
    customerAvatar:
      (c.profiles as unknown as { avatar_url: string }[] | null)?.[0]?.avatar_url ?? null,
    lastMessage: lastMsgMap[c.id]?.body ?? null,
    lastAt: lastMsgMap[c.id]?.created_at ?? c.created_at,
    updatedAt: c.updated_at,
  }));

  return NextResponse.json({
    conversations,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function POST(req: NextRequest) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { conversationId, body } = await req.json();

  if (!conversationId || !body?.trim()) {
    return NextResponse.json({ error: "conversationId and body are required" }, { status: 400 });
  }

  // Verify seller owns this conversation
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("seller_id", userId)
    .maybeSingle();

  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: body.trim() })
    .select("id,sender_id,body,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bump conversation updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ message: { ...msg, isSeller: true } });
}

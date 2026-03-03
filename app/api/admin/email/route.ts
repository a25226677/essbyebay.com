import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import { sendCustomEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "to, subject, and message are required" },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];
    const results = await Promise.allSettled(
      recipients.map((email: string) => sendCustomEmail(email, subject, message))
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as { success: boolean }).success).length;
    const failed = results.length - sent;

    return NextResponse.json({ success: true, sent, failed, total: recipients.length });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

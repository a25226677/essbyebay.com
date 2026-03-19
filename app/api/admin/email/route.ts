import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import { sendCustomEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  try {
    const body = await request.json();
    const { to, user_id, user_ids, subject, message } = body;

    if ((!to && !user_id && !user_ids) || !subject || !message) {
      return NextResponse.json(
        { error: "subject, message, and at least one recipient (to, user_id, user_ids) are required" },
        { status: 400 }
      );
    }

    const directRecipients = to ? (Array.isArray(to) ? to : [to]) : [];
    const userIds = [
      ...(user_id ? [String(user_id)] : []),
      ...(Array.isArray(user_ids) ? user_ids.map(String) : []),
    ];

    let authRecipients: string[] = [];
    if (userIds.length > 0) {
      const resolved = await Promise.allSettled(
        userIds.map(async (id: string) => {
          const { data } = await db.auth.admin.getUserById(id);
          return data?.user?.email || null;
        })
      );

      authRecipients = resolved
        .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((email): email is string => Boolean(email));
    }

    const recipients = [...new Set([...directRecipients, ...authRecipients])];

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient emails were found" },
        { status: 400 }
      );
    }

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

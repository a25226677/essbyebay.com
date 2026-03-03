import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendWelcomeEmail,
  sendAdminNewUserNotification,
} from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fullName, role } = await request.json();
    const name = fullName || user.user_metadata?.full_name || "User";
    const email = user.email!;

    // Send welcome email to the new user
    await sendWelcomeEmail(email, name);

    // Notify admin about new registration
    await sendAdminNewUserNotification(name, email, role || "customer");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Email sending failed" }, { status: 500 });
  }
}

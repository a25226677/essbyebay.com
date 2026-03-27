import { NextRequest, NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import {
  sendAdminNewShopNotification,
  sendAdminNewUserNotification,
  sendSellerApplicationEmail,
  sendWelcomeEmail,
} from "@/lib/email";

const ALLOWED_FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type RouteError = Error & { status?: number };

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function createShopSlug(shopName: string) {
  return `${shopName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
}

async function uploadCertificate(
  db: ReturnType<typeof createAdminServiceClient>,
  file: File | null,
  userId: string,
  folder: string,
) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!ALLOWED_FILE_TYPES.has(file.type)) {
    throw new Error("Certificate files must be JPG, PNG, WEBP, or PDF.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Certificate files must be 5MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${folder}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await db.storage.from("seller-files").upload(path, buffer, {
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = db.storage.from("seller-files").getPublicUrl(path);

  return publicUrl;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  // server-side captcha token (frontend should send `captchaToken` from reCAPTCHA)
  const captchaToken = getRequiredString(formData, "captchaToken");

  // Development/testing helper: allow skipping external captcha verification when
  // a special header is present and we're not in production. This makes it
  // possible to write integration scripts that exercise server-side validation
  // without needing an actual Google reCAPTCHA token.
  const skipCaptchaHeader = request.headers.get("x-skip-captcha");
  const skipCaptchaAllowed = skipCaptchaHeader === "1" && process.env.NODE_ENV !== "production";

  if (!captchaToken && !skipCaptchaAllowed) {
    return NextResponse.json({ error: "CAPTCHA token is required" }, { status: 400 });
  }

  if (!skipCaptchaAllowed) {
    // Verify reCAPTCHA token with Google's API
    try {
      const secret = process.env.RECAPTCHA_SECRET_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY;
      if (!secret) {
        return NextResponse.json({ error: "Server captcha configuration missing" }, { status: 500 });
      }

      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: captchaToken }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyJson.success) {
        return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Failed to verify CAPTCHA" }, { status: 500 });
    }
  }

  const fullName = getRequiredString(formData, "fullName");
  const email = getRequiredString(formData, "email").toLowerCase();
  const phone = getRequiredString(formData, "phone");
  const password = getRequiredString(formData, "password");
  const transactionPassword = getRequiredString(formData, "transactionPassword");
  const shopName = getRequiredString(formData, "shopName");
  const address = getRequiredString(formData, "address");
  const certificateType = getRequiredString(formData, "certificateType") || "id_card";
  const invitationCode = getRequiredString(formData, "invitationCode");

  // Basic server-side file validations (before creating user)
  const certFrontFileRaw = formData.get("certFrontFile");
  const certBackFileRaw = formData.get("certBackFile");
  const certFrontFile = certFrontFileRaw instanceof File ? certFrontFileRaw : null;
  const certBackFile = certBackFileRaw instanceof File ? certBackFileRaw : null;

  if (!certFrontFile && !certBackFile) {
    return NextResponse.json({ error: "Identity document is required" }, { status: 400 });
  }

  // Validate file types and sizes early to avoid creating user then failing later
  const allowed = ALLOWED_FILE_TYPES;
  const maxSize = MAX_FILE_SIZE;

  for (const f of [certFrontFile, certBackFile]) {
    if (!f) continue;
    if (!allowed.has(f.type)) {
      return NextResponse.json({ error: "Certificate files must be JPG, PNG, WEBP, or PDF." }, { status: 400 });
    }
    if (f.size > maxSize) {
      return NextResponse.json({ error: "Certificate files must be 5MB or smaller." }, { status: 400 });
    }
  }

  // Server-side validation: invitation code required
  if (!invitationCode) {
    return NextResponse.json({ error: "Invitation code is required" }, { status: 400 });
  }





  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  if (!/^\d{6}$/.test(transactionPassword)) {
    return NextResponse.json(
      { error: "Transaction password must be exactly 6 digits" },
      { status: 400 },
    );
  }

  if (!shopName) {
    return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
  }

  const db = createAdminServiceClient();
  let createdUserId: string | null = null;

  try {
    const { data: existingProfile } = await db
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: "This phone number is already in use." },
        { status: 409 },
      );
    }

    const { data: userResult, error: userError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (userError || !userResult.user) {
      const message = userError?.message || "Failed to create account.";
      const status = /already registered|already exists|duplicate/i.test(message) ? 409 : 500;

      return NextResponse.json({ error: message }, { status });
    }

    createdUserId = userResult.user.id;

    const certFrontFile = formData.get("certFrontFile");
    const certBackFile = formData.get("certBackFile");

    const certFrontUrl = await uploadCertificate(
      db,
      certFrontFile instanceof File ? certFrontFile : null,
      createdUserId,
      "certificate-front",
    );
    const certBackUrl = await uploadCertificate(
      db,
      certBackFile instanceof File ? certBackFile : null,
      createdUserId,
      "certificate-back",
    );

// Hardcoded invitation code validation
    if (invitationCode !== "51214") {
      await db.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      return NextResponse.json(
        { error: "Invalid invitation code. Must be exactly 51214." },
        { status: 400 },
      );
    }

    // Require at least one identity document
    if (!certFrontUrl && !certBackUrl) {
      return NextResponse.json({ error: "Identity document is required" }, { status: 400 });
    }

    const { error: profileError } = await db.from("profiles").upsert({
      id: createdUserId,
      full_name: fullName,
      role: "seller",
      phone,
      credit_score: 100,
      transaction_password: transactionPassword,
      certificate_type: certificateType,
      certificate_front_url: certFrontUrl,
      certificate_back_url: certBackUrl,
      invitation_code: invitationCode || null,
    });

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: shopError } = await db.from("shops").insert({
      owner_id: createdUserId,
      seller_id: createdUserId,
      name: shopName,
      slug: createShopSlug(shopName),
      address: address || null,
      is_verified: false,
    });

    if (shopError) {
      if (/unique|duplicate/i.test(shopError.message)) {
        const duplicateShopError: RouteError = new Error(
          "You already have a shop or this shop name is taken.",
        );
        duplicateShopError.status = 409;
        throw duplicateShopError;
      }

      throw new Error(shopError.message);
    }

    void Promise.allSettled([
      sendWelcomeEmail(email, fullName),
      sendAdminNewUserNotification(fullName, email, "seller"),
      sendSellerApplicationEmail(email, fullName, shopName),
      sendAdminNewShopNotification(fullName, email, shopName),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (createdUserId) {
      await db.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    }

    const routeError = error instanceof Error ? (error as RouteError) : null;
    const message = routeError?.message || "Failed to register shop.";
    return NextResponse.json({ error: message }, { status: routeError?.status || 500 });
  }
}
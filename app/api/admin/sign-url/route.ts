import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/sign-url?url=<storedPublicOrAbsoluteUrl>&bucket=seller-files&expires=3600
 *
 * Converts a stored Supabase Storage URL (public or private) into a short-lived
 * signed URL using the service-role client, bypassing bucket RLS.
 * Only accessible to authenticated admins (enforced by getAdminContext).
 */
export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp     = request.nextUrl.searchParams;
  const rawUrl = sp.get("url") || "";
  const bucket = sp.get("bucket") || "seller-files";
  const expires = Math.min(3600, Math.max(60, parseInt(sp.get("expires") || "3600", 10)));

  if (!rawUrl) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  // Extract the storage path from a full Supabase storage URL.
  // Stored URLs look like:
  //   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  //   or just a relative path like  <userId>/certificate-front/file.jpg
  let storagePath = rawUrl;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerSign = `/storage/v1/object/sign/${bucket}/`;
  if (rawUrl.includes(marker)) {
    storagePath = rawUrl.split(marker)[1] ?? rawUrl;
  } else if (rawUrl.includes(markerSign)) {
    storagePath = rawUrl.split(markerSign)[1]?.split("?")[0] ?? rawUrl;
  }

  // Strip any query params from path
  storagePath = storagePath.split("?")[0];

  const { data, error } = await db.storage
    .from(bucket)
    .createSignedUrl(storagePath, expires);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message || "Failed to create signed URL" },
      { status: 400 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}

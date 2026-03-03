import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/seller/files — list files uploaded by the current seller
 * Query params: bucket (default "seller-files"), folder (optional)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const bucket = url.searchParams.get("bucket") || "seller-files";
  const folder = url.searchParams.get("folder");
  const prefix = folder ? `${user.id}/${folder}` : user.id;

  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build full URLs for each file
  const files = (data ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder")
    .map((f) => {
      const filePath = `${prefix}/${f.name}`;
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return {
        id: f.id,
        name: f.name,
        size: f.metadata?.size ?? 0,
        type: f.metadata?.mimetype ?? "unknown",
        url: publicUrl,
        path: filePath,
        bucket,
        createdAt: f.created_at,
      };
    });

  return NextResponse.json({ files });
}

/**
 * DELETE /api/seller/files — delete a file from storage
 * Body: { bucket, path }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { bucket, path } = body as { bucket: string; path: string };

  if (!bucket || !path) {
    return NextResponse.json(
      { error: "bucket and path are required" },
      { status: 400 },
    );
  }

  // Ensure the file belongs to the current user
  if (!path.startsWith(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

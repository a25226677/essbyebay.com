import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/seller/files — list files uploaded by the current seller
 * Query params: bucket (default "seller-files"), folder (optional), page, limit
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
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const prefix = folder ? `${user.id}/${folder}` : user.id;

  // Get total count by listing all files
  const { data: allFiles, error: countError } = await supabase.storage.from(bucket).list(prefix, {
    limit: 10000,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const allFileCount = (allFiles ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder").length;

  // Get paginated results
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: limit,
    offset: offset,
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

  return NextResponse.json({
    files,
    pagination: { page, limit, total: allFileCount, pages: Math.ceil(allFileCount / limit) },
  });
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

"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Trash2, MoreVertical, Copy, ExternalLink, RefreshCcw, Upload, Image as ImageIcon,
  FileText, Film, FileArchive, X, Check, Grid, List, Search, CloudUpload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UploadedFile {
  id: string; file_name: string; file_url: string; file_size: number; mime_type: string; created_at: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="size-5 text-blue-400" />;
  if (mime.startsWith("video/")) return <Film className="size-5 text-purple-400" />;
  if (mime.includes("pdf")) return <FileText className="size-5 text-red-400" />;
  if (mime.includes("zip") || mime.includes("rar")) return <FileArchive className="size-5 text-amber-400" />;
  return <FileText className="size-5 text-gray-400" />;
}

export default function UploadedFilesPage() {
  const [data, setData] = useState<UploadedFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailFile, setDetailFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const perPage = 24;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/setup-configurations/uploaded-files?page=${page}`);
      const j = await r.json();
      setData(j.data || []);
      setTotal(j.total || 0);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close menu on outside click
  useEffect(() => {
    const h = () => setOpenMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  // Upload files to Supabase storage then register in DB
  const uploadFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;

    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split(".").pop() || "bin";
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
        const fileUrl = urlData.publicUrl;

        // Register in uploaded_files table
        const res = await fetch("/api/admin/setup-configurations/uploaded-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: safeName,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type || "application/octet-stream",
          }),
        });
        if (!res.ok) throw new Error("Failed to register file");
        successCount++;
      } catch (e: any) {
        errorCount++;
        console.error("Upload error:", e);
      }
    }

    setUploading(false);
    if (successCount) toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
    if (errorCount) toast.error(`${errorCount} file${errorCount > 1 ? "s" : ""} failed`);
    fetchData();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete file?")) return;
    await fetch(`/api/admin/setup-configurations/uploaded-files?id=${id}`, { method: "DELETE" });
    toast.success("Deleted");
    setDetailFile(null);
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    fetchData();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} file(s)?`)) return;
    for (const id of selected) {
      await fetch(`/api/admin/setup-configurations/uploaded-files?id=${id}`, { method: "DELETE" });
    }
    toast.success(`${selected.size} files deleted`);
    setSelected(new Set());
    fetchData();
  };

  const handleCopy = (url: string) => { navigator.clipboard.writeText(url); toast.success("URL copied to clipboard"); };

  const toggleSelect = (id: string) => {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const filtered = search ? data.filter((f) => f.file_name.toLowerCase().includes(search.toLowerCase())) : data;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,.pdf,.zip,.doc,.docx,.xls,.xlsx"
        onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Media Library</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} file{total !== 1 ? "s" : ""} uploaded</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600">
              <Trash2 className="size-3.5" /> Delete {selected.size}
            </button>
          )}
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCcw className={"size-4 " + (loading ? "animate-spin" : "")} />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Upload className="size-4" /> Upload Files
          </button>
        </div>
      </div>

      {/* Drag and Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <CloudUpload className={`size-10 ${dragOver ? "text-indigo-500" : "text-gray-300"}`} />
            <p className="text-sm text-gray-600">
              <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400">Images, Videos, PDFs, ZIPs — up to 5 MB</p>
          </div>
        )}
      </div>

      {/* Toolbar: search + view toggle */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 max-w-xs flex-1">
          <Search className="size-4 text-gray-400" />
          <input type="text" placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md ${view === "grid" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}>
            <Grid className="size-4" />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded-md ${view === "list" ? "bg-white shadow-sm text-gray-800" : "text-gray-400"}`}>
            <List className="size-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <CloudUpload className="size-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No uploaded files</p>
          <p className="text-xs mt-1">Upload your first file to get started</p>
        </div>
      ) : view === "grid" ? (
        /* ========== GRID VIEW ========== */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((file) => (
            <div key={file.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-all group cursor-pointer ${
                selected.has(file.id) ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-100"
              }`}
              onClick={() => setDetailFile(file)}
            >
              {/* Checkbox */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <div className="absolute top-1.5 left-1.5 z-10" onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}>
                  <div className={`size-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                    selected.has(file.id) ? "bg-indigo-600 border-indigo-600" : "bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100"
                  }`}>
                    {selected.has(file.id) && <Check className="size-3 text-white" />}
                  </div>
                </div>
                {file.mime_type.startsWith("image/") ? (
                  <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    {fileIcon(file.mime_type)}
                    <span className="text-[9px] text-gray-400 uppercase">{file.mime_type.split("/")[1]}</span>
                  </div>
                )}
                {/* Menu */}
                <div className="absolute top-1.5 right-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === file.id ? null : file.id); }}
                    className="p-1 rounded bg-white/80 hover:bg-white shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="size-3.5" />
                  </button>
                  {openMenu === file.id && (
                    <div className="absolute right-0 top-7 bg-white rounded-lg shadow-xl border border-gray-100 z-20 w-36 py-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleCopy(file.file_url)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <Copy className="size-3" />Copy URL
                      </button>
                      <a href={file.file_url} target="_blank" rel="noopener" className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <ExternalLink className="size-3" />Open
                      </a>
                      <button onClick={() => handleDelete(file.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3" />Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-gray-700 truncate font-medium" title={file.file_name}>{file.file_name}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.file_size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ========== LIST VIEW ========== */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left w-8">
                  <input type="checkbox" className="rounded"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={(e) => { setSelected(e.target.checked ? new Set(filtered.map((f) => f.id)) : new Set()); }}
                  />
                </th>
                <th className="px-3 py-2.5 text-left">File</th>
                <th className="px-3 py-2.5 text-left">Type</th>
                <th className="px-3 py-2.5 text-right">Size</th>
                <th className="px-3 py-2.5 text-left">Uploaded</th>
                <th className="px-3 py-2.5 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setDetailFile(file)}>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {file.mime_type.startsWith("image/") ? (
                        <img src={file.file_url} alt="" className="size-8 rounded object-cover" />
                      ) : (
                        <div className="size-8 rounded bg-gray-100 flex items-center justify-center">{fileIcon(file.mime_type)}</div>
                      )}
                      <span className="text-xs font-medium text-gray-800 truncate max-w-[200px]">{file.file_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{file.mime_type.split("/")[1]}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 text-right">{formatSize(file.file_size)}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{new Date(file.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopy(file.file_url)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Copy URL">
                        <Copy className="size-3.5" />
                      </button>
                      <a href={file.file_url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Open">
                        <ExternalLink className="size-3.5" />
                      </a>
                      <button onClick={() => handleDelete(file.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p === page ? "bg-indigo-600 text-white" : "border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
          ))}
          {totalPages > 10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
        </div>
      )}

      {/* ========== Detail side panel ========== */}
      {detailFile && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetailFile(null)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-sm font-semibold text-gray-800">File Details</h2>
              <button onClick={() => setDetailFile(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Preview */}
              <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                {detailFile.mime_type.startsWith("image/") ? (
                  <img src={detailFile.file_url} alt={detailFile.file_name} className="w-full max-h-72 object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    {fileIcon(detailFile.mime_type)}
                    <span className="text-xs text-gray-400 uppercase">{detailFile.mime_type.split("/")[1]}</span>
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-medium">File Name</label>
                  <p className="text-sm text-gray-800 break-all">{detailFile.file_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-medium">Type</label>
                    <p className="text-sm text-gray-700">{detailFile.mime_type}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-medium">Size</label>
                    <p className="text-sm text-gray-700">{formatSize(detailFile.file_size)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-medium">Uploaded</label>
                  <p className="text-sm text-gray-700">{new Date(detailFile.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-medium">URL</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-xs text-blue-600 break-all flex-1">{detailFile.file_url}</p>
                    <button onClick={() => handleCopy(detailFile.file_url)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0">
                      <Copy className="size-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <a href={detailFile.file_url} target="_blank" rel="noopener"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                  <ExternalLink className="size-3.5" /> Open File
                </a>
                <button onClick={() => handleDelete(detailFile.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

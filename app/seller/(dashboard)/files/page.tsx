"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileUp,
  Search,
  Upload,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  FileIcon,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUploadDropzone } from "@/components/seller/file-upload-dropzone";
import { toast } from "sonner";

type StoredFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  bucket: string;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${units[i]}`;
}

export default function UploadedFilesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploader, setShowUploader] = useState(false);
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<"seller-files" | "product-images" | "shop-assets">("seller-files");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/seller/files?bucket=${activeBucket}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) {
        setFiles(json.files ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeBucket]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadComplete = () => {
    // Refresh file list after successful upload
    loadFiles();
    setShowUploader(false);
  };

  const deleteFile = async (file: StoredFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setDeleting(file.id);
    try {
      await fetch("/api/seller/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: file.bucket, path: file.path }),
      });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const filtered = searchQuery
    ? files.filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.type.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : files;

  const buckets = [
    { id: "seller-files" as const, label: "My Files" },
    { id: "product-images" as const, label: "Product Images" },
    { id: "shop-assets" as const, label: "Shop Assets" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Uploaded Files</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFiles}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="bg-sky-500 hover:bg-sky-600 text-white"
            onClick={() => setShowUploader(!showUploader)}
          >
            <Upload className="size-4 mr-1" />
            Upload New File
          </Button>
        </div>
      </div>

      {/* Upload dropzone */}
      {showUploader && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Upload Files
          </h2>
          <FileUploadDropzone
            bucket={activeBucket}
            multiple
            accept={
              activeBucket === "product-images"
                ? { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] }
                : activeBucket === "shop-assets"
                  ? { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"] }
                  : {
                      "application/pdf": [".pdf"],
                      "application/zip": [".zip"],
                      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
                      "video/mp4": [".mp4"],
                    }
            }
            maxSizeMB={activeBucket === "seller-files" ? 50 : 5}
            onChange={handleUploadComplete}
            hint={
              activeBucket === "seller-files"
                ? "PDF, ZIP, images, videos (max 50MB)"
                : "Images only (max 5MB)"
            }
          />
        </div>
      )}

      {/* Bucket tabs */}
      <div className="flex gap-2">
        {buckets.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBucket(b.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeBucket === b.id
                ? "bg-sky-500 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* File list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            All Files{" "}
            {!loading && (
              <span className="text-gray-400 font-normal">({files.length})</span>
            )}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Preview</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Size</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Loader2 className="size-8 animate-spin text-sky-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <FileUp className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">
                      {files.length === 0
                        ? "No files uploaded yet"
                        : "No files match your search"}
                    </p>
                    {files.length === 0 && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowUploader(true)}
                      >
                        <Upload className="size-4 mr-1" />
                        Upload your first file
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((file, i) => (
                  <tr
                    key={file.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="size-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {file.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.url}
                            alt={file.name}
                            className="size-full object-cover"
                          />
                        ) : (
                          <FileIcon className="size-5 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium max-w-[200px] truncate">
                      {file.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {file.type.split("/")[1]?.toUpperCase() || file.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                          title="Open"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(file.url);
                            toast.success("URL copied to clipboard");
                          }}
                          className="p-1.5 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                          title="Copy URL"
                        >
                          <Download className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteFile(file)}
                          disabled={deleting === file.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === file.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

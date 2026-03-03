"use client";

import { useCallback, useState } from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { Upload, X, FileIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useSupabaseUpload,
  type UploadedFile,
  type UploadProgress,
} from "@/lib/hooks/use-supabase-upload";

// ── Types ──

type FileUploadDropzoneProps = {
  /** Supabase storage bucket name */
  bucket: string;
  /** Sub-folder inside user's folder (e.g. "products", "gallery") */
  folder?: string;
  /** Max file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Whether to accept multiple files */
  multiple?: boolean;
  /** Accept map for react-dropzone (e.g. { "image/*": [".jpg", ".png"] }) */
  accept?: Accept;
  /** MIME type prefixes for validation (e.g. ["image/"]) */
  acceptedTypes?: string[];
  /** Label shown above the dropzone */
  label?: string;
  /** Optional hint text */
  hint?: string;
  /** Variant */
  variant?: "default" | "compact" | "avatar";
  /** Already uploaded files to display */
  value?: UploadedFile[];
  /** Called when files are uploaded or removed */
  onChange?: (files: UploadedFile[]) => void;
  /** Optional class name */
  className?: string;
};

// ── Component ──

export function FileUploadDropzone({
  bucket,
  folder,
  maxSizeMB = 5,
  multiple = false,
  accept,
  acceptedTypes,
  label,
  hint,
  variant = "default",
  value = [],
  onChange,
  className,
}: FileUploadDropzoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(value);

  const handleUploadComplete = useCallback(
    (files: UploadedFile[]) => {
      const next = multiple ? [...uploadedFiles, ...files] : files;
      setUploadedFiles(next);
      onChange?.(next);
    },
    [multiple, uploadedFiles, onChange],
  );

  const { uploads, isUploading, uploadFiles, removeUpload } =
    useSupabaseUpload({
      bucket,
      folder,
      maxSizeMB,
      acceptedTypes,
      onUploadComplete: handleUploadComplete,
    });

  const onDrop = useCallback(
    (acceptedDropFiles: File[]) => {
      uploadFiles(acceptedDropFiles);
    },
    [uploadFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: isUploading,
  });

  const removeFile = (index: number) => {
    const next = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(next);
    onChange?.(next);
  };

  // ── Avatar variant ──
  if (variant === "avatar") {
    const preview = uploadedFiles[0]?.url;
    return (
      <div className={cn("space-y-2", className)}>
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        <div
          {...getRootProps()}
          className={cn(
            "relative group size-24 rounded-full border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:border-sky-400 transition-colors",
            isDragActive && "border-sky-500 bg-sky-50",
            isUploading && "pointer-events-none opacity-70",
          )}
        >
          <input {...getInputProps()} />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="size-full object-cover" />
          ) : (
            <div className="flex items-center justify-center size-full">
              {isUploading ? (
                <Loader2 className="size-6 animate-spin text-sky-500" />
              ) : (
                <Upload className="size-6 text-gray-400 group-hover:text-sky-500" />
              )}
            </div>
          )}
        </div>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }

  // ── Compact variant ──
  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        <div className="flex items-center gap-3">
          <div
            {...getRootProps()}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-colors",
              isDragActive && "border-sky-500 bg-sky-50",
              isUploading && "pointer-events-none opacity-70",
            )}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <Loader2 className="size-4 animate-spin text-sky-500" />
            ) : (
              <Upload className="size-4 text-gray-500" />
            )}
            <span className="text-sm text-gray-600">
              {isDragActive ? "Drop here" : "Browse or drop files"}
            </span>
          </div>
          {uploadedFiles.length > 0 && (
            <span className="text-xs text-gray-500">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* In-progress uploads */}
        <UploadProgressList uploads={uploads} onRemove={removeUpload} />

        {/* Uploaded preview */}
        <UploadedFilesList files={uploadedFiles} onRemove={removeFile} compact />

        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }

  // ── Default variant ──
  return (
    <div className={cn("space-y-3", className)}>
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-sky-500 bg-sky-50"
            : "border-gray-300 hover:border-sky-400 hover:bg-gray-50",
          isUploading && "pointer-events-none opacity-70",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="size-10 animate-spin text-sky-500" />
          ) : (
            <div className="size-12 rounded-full bg-sky-50 flex items-center justify-center">
              <Upload className="size-6 text-sky-500" />
            </div>
          )}
          <p className="text-sm font-medium text-gray-700">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop files here, or click to browse"}
          </p>
          <p className="text-xs text-gray-400">
            Max file size: {maxSizeMB}MB
            {acceptedTypes && ` • ${acceptedTypes.join(", ")}`}
          </p>
        </div>
      </div>

      {/* In-progress uploads */}
      <UploadProgressList uploads={uploads} onRemove={removeUpload} />

      {/* Uploaded files preview */}
      <UploadedFilesList files={uploadedFiles} onRemove={removeFile} />

      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Upload progress list ──

function UploadProgressList({
  uploads,
  onRemove,
}: {
  uploads: UploadProgress[];
  onRemove: (i: number) => void;
}) {
  if (uploads.length === 0) return null;

  return (
    <div className="space-y-2">
      {uploads.map((u, i) => (
        <div
          key={`${u.file.name}-${i}`}
          className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2"
        >
          {u.status === "uploading" && (
            <Loader2 className="size-4 animate-spin text-sky-500 shrink-0" />
          )}
          {u.status === "done" && (
            <CheckCircle2 className="size-4 text-green-500 shrink-0" />
          )}
          {u.status === "error" && (
            <AlertCircle className="size-4 text-red-500 shrink-0" />
          )}
          {u.status === "pending" && (
            <FileIcon className="size-4 text-gray-400 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 truncate">{u.file.name}</p>
            {u.status === "uploading" && (
              <Progress value={u.progress} className="h-1 mt-1" />
            )}
            {u.error && (
              <p className="text-[10px] text-red-500 mt-0.5">{u.error}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Uploaded files list ──

function UploadedFilesList({
  files,
  onRemove,
  compact = false,
}: {
  files: UploadedFile[];
  onRemove: (i: number) => void;
  compact?: boolean;
}) {
  if (files.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <div
            key={f.path}
            className="relative group"
          >
            {f.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.url}
                alt={f.name}
                className="size-14 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="size-14 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50">
                <FileIcon className="size-5 text-gray-400" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {files.map((f, i) => (
        <div
          key={f.path}
          className="relative group rounded-xl border border-gray-200 overflow-hidden"
        >
          {f.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.url}
              alt={f.name}
              className="w-full h-28 object-cover"
            />
          ) : (
            <div className="w-full h-28 flex flex-col items-center justify-center bg-gray-50">
              <FileIcon className="size-8 text-gray-400" />
              <p className="text-[10px] text-gray-500 mt-1 truncate max-w-[90%]">
                {f.name}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-2 right-2 size-6 bg-red-500/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="size-3.5" />
          </button>

          <div className="px-2 py-1.5 bg-white">
            <p className="text-[10px] text-gray-600 truncate">{f.name}</p>
            <p className="text-[9px] text-gray-400">
              {(f.size / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

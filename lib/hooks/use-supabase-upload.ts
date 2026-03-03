"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  bucket: string;
};

export type UploadProgress = {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  result?: UploadedFile;
};

type UseSupabaseUploadOptions = {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (files: UploadedFile[]) => void;
};

function generateId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function useSupabaseUpload({
  bucket,
  folder,
  maxSizeMB = 5,
  acceptedTypes,
  onUploadComplete,
}: UseSupabaseUploadOptions) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const supabase = createClient();

      // Get user for folder structure
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload files.");
      }

      const maxBytes = maxSizeMB * 1024 * 1024;

      // Validate files
      const validFiles = files.filter((file) => {
        if (file.size > maxBytes) return false;
        if (acceptedTypes && !acceptedTypes.some((t) => file.type.startsWith(t.replace("/*", "/")) || file.type === t)) {
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      const initial: UploadProgress[] = validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));

      setUploads(initial);
      setIsUploading(true);

      const results: UploadedFile[] = [];

      const updated = [...initial];
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const ext = file.name.split(".").pop() || "bin";
        const fileId = generateId();
        const basePath = folder
          ? `${user.id}/${folder}/${fileId}.${ext}`
          : `${user.id}/${fileId}.${ext}`;

        updated[i] = { ...updated[i], status: "uploading", progress: 30 };
        setUploads([...updated]);

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(basePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (error) {
          updated[i] = {
            ...updated[i],
            status: "error",
            progress: 0,
            error: error.message,
          };
          setUploads([...updated]);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path);

        const uploaded: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          path: data.path,
          bucket,
        };

        results.push(uploaded);
        updated[i] = {
          ...updated[i],
          status: "done",
          progress: 100,
          result: uploaded,
        };
        setUploads([...updated]);
      }

      setIsUploading(false);
      if (results.length > 0) {
        onUploadComplete?.(results);
      }

      return results;
    },
    [bucket, folder, maxSizeMB, acceptedTypes, onUploadComplete],
  );

  const removeUpload = useCallback((index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  return { uploads, isUploading, uploadFiles, removeUpload, clearUploads };
}

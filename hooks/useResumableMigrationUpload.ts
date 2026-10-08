"use client";

import { useState, useCallback, useRef } from "react";
import { api } from "@/lib/api/client";

export interface MigrationUploadOptions {
  companyId: string | number;
  domain?: string;
  dryRun?: boolean;
  autoCreateMasterData?: boolean;
  onUploadProgress?: (percent: number) => void;
}

export interface JobInitResponse {
  jobId: string;
  chunkSize: number;
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export function useResumableMigrationUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isCancelledRef = useRef(false);

  const cancelUpload = useCallback(() => {
    isCancelledRef.current = true;
    setIsUploading(false);
  }, []);

  const uploadFile = useCallback(
    async (file: File, options: MigrationUploadOptions): Promise<string> => {
      setIsUploading(true);
      setUploadPercent(0);
      setUploadError(null);
      isCancelledRef.current = false;

      try {
        // Step 1: Initialize the migration job on the backend
        const initPayload = {
          fileName: file.name,
          fileSize: file.size,
          companyId: Number(options.companyId),
          domain: options.domain || "CATALOG",
          dryRun: Boolean(options.dryRun),
          autoCreateMasterData: options.autoCreateMasterData ?? true,
        };

        const initRes = await api.post<JobInitResponse>("/migrations/jobs", initPayload);
        const resData = (initRes.data as any)?.data ?? initRes.data ?? initRes;
        const jobId = resData?.jobId;
        const chunkSize = Number(resData?.chunkSize) || DEFAULT_CHUNK_SIZE;

        if (!jobId) {
          throw new Error(
            "Failed to initialize migration job: No valid jobId returned by server."
          );
        }

        // Step 2: Compute chunks
        const calculatedTotalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        setTotalChunks(calculatedTotalChunks);

        for (let chunkIndex = 0; chunkIndex < calculatedTotalChunks; chunkIndex++) {
          if (isCancelledRef.current) {
            throw new Error("Upload was cancelled by user.");
          }

          setCurrentChunk(chunkIndex + 1);
          const start = chunkIndex * chunkSize;
          const end = Math.min(file.size, start + chunkSize);
          const chunkBlob = file.slice(start, end);

          let attempt = 0;
          let chunkSuccess = false;
          let lastError: any = null;

          // Retry up to 4 times with exponential backoff on network issues
          while (!chunkSuccess && attempt < 4) {
            if (isCancelledRef.current) break;
            try {
              const formData = new FormData();
              formData.append("chunk", chunkBlob, `${file.name}.part${chunkIndex}`);
              formData.append("chunkIndex", chunkIndex.toString());
              formData.append("totalChunks", calculatedTotalChunks.toString());

              await api.post(`/migrations/jobs/${jobId}/chunk`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 45000,
              });

              chunkSuccess = true;
            } catch (err: any) {
              attempt++;
              lastError = err;
              console.warn(
                `Chunk ${chunkIndex + 1}/${calculatedTotalChunks} failed (attempt ${attempt}/4). Retrying in ${
                  attempt * 1.5
                }s...`,
                err
              );
              if (attempt < 4) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
              }
            }
          }

          if (!chunkSuccess) {
            const errorMsg =
              lastError?.message ||
              `Network error while uploading chunk ${chunkIndex + 1}. Please check your internet connection.`;
            setUploadError(errorMsg);
            throw new Error(errorMsg);
          }

          const percent = Math.round(((chunkIndex + 1) / calculatedTotalChunks) * 100);
          setUploadPercent(percent);
          options.onUploadProgress?.(percent);
        }

        // Step 3: Trigger async processing on backend
        await api.post(`/migrations/jobs/${jobId}/execute`);
        return jobId;
      } catch (err: any) {
        const message = err?.message || "Failed to complete resilient upload";
        setUploadError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    uploadFile,
    cancelUpload,
    isUploading,
    uploadPercent,
    currentChunk,
    totalChunks,
    uploadError,
  };
}

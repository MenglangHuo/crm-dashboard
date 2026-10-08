// ============================================================
// File Upload Service & Factory Pattern
// Supports API upload (/api/v1/files/upload & /api/v1/files/batch-uploads)
// and S3 presigned upload (/api/v1/storage/upload-url)
// ============================================================

import { api } from "@/lib/api/client";
import type { ServerFileResponse } from "@/lib/types";

export interface UploadOptions {
	folder?: string;
	isPublic?: boolean;
	category?: string;
	description?: string;
	branchId?: string | number;
	onProgress?: (percent: number) => void;
	extraParams?: Record<string, any>;
}

export interface UploadResult {
	id?: string | number;
	fileName: string;
	originalFileName?: string;
	fileKey: string;
	storageKey?: string;
	url: string;
	imageUrl?: string;
	mimeType?: string;
	fileType?: string;
	size?: number;
	storageStrategy?: "LOCAL" | "S3" | string;
	createdAt?: string;
	raw?: any;
}

export interface IFileUploader {
	readonly type: "api" | "s3" | string;
	uploadSingle(file: File, options?: UploadOptions): Promise<UploadResult>;
	uploadBatch(files: File[], options?: UploadOptions): Promise<UploadResult[]>;
}

/**
 * Normalizes raw backend file upload responses to a consistent UploadResult structure.
 */
export function normalizeUploadResult(
	raw: any,
	fallbackFile?: File,
	strategy: "LOCAL" | "S3" | string = "LOCAL",
): UploadResult {
	const item = raw?.data || raw || {};
	const fileName =
		item.fileName ||
		item.filename ||
		item.name ||
		fallbackFile?.name ||
		"unnamed_file";
	const originalFileName =
		item.originalFileName ||
		item.originalFilename ||
		fallbackFile?.name ||
		fileName;
	const fileKey =
		item.fileKey || item.storageKey || item.key || item.url || fileName;
	const storageKey = item.storageKey || item.fileKey || fileKey;
	const url =
		item.imageUrl ||
		item.url ||
		item.fileUrl ||
		item.downloadUrl ||
		(fileKey
			? fileKey.startsWith("http") || fileKey.startsWith("/")
				? fileKey
				: `/api/v1/storage/object/${encodeURIComponent(fileKey)}`
			: "");
	const imageUrl = item.imageUrl || url;
	const mimeType =
		item.mimeType ||
		item.contentType ||
		fallbackFile?.type ||
		"application/octet-stream";
	const fileType =
		item.fileType || (mimeType.startsWith("image/") ? "IMAGE" : "DOCUMENT");
	const size =
		typeof item.size === "number" ? item.size : fallbackFile?.size || 0;
	const storageStrategy = item.storageStrategy || strategy;

	return {
		id: item.id,
		fileName,
		originalFileName,
		fileKey,
		storageKey,
		url,
		imageUrl,
		mimeType,
		fileType,
		size,
		storageStrategy,
		createdAt: item.createdAt || new Date().toISOString(),
		raw,
	};
}

/**
 * Strategy 1: Direct CRM Backend API Uploader
 * - Single upload: POST /api/v1/files/upload (Body key: file)
 * - Multiple upload: POST /api/v1/files/batch-uploads (Body key: files)
 */
export class ApiFileUploader implements IFileUploader {
	readonly type = "api" as const;

	async uploadSingle(
		file: File,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const formData = new FormData();
		// Required endpoint body key: file -> file
		formData.append("file", file);

		if (options?.folder) formData.append("folder", options.folder);
		if (options?.isPublic !== undefined)
			formData.append("isPublic", String(options.isPublic));
		if (options?.category) formData.append("category", options.category);
		if (options?.description)
			formData.append("description", options.description);
		if (options?.branchId !== undefined)
			formData.append("branchId", String(options.branchId));

		if (options?.extraParams) {
			Object.entries(options.extraParams).forEach(([key, val]) => {
				if (val !== undefined && val !== null) {
					formData.append(key, String(val));
				}
			});
		}

		const isPublic = Boolean(options?.isPublic);
		const primaryEndpoint = isPublic ? "/public/files/upload" : "/files/upload";
		const fallbackEndpoint = isPublic ? "/v1/public/files/upload" : "/v1/files/upload";

		try {
			const res = await api.post<ServerFileResponse | any>(
				primaryEndpoint,
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
					onUploadProgress: (progressEvent) => {
						if (progressEvent.total && options?.onProgress) {
							const percent = Math.round(
								(progressEvent.loaded * 100) / progressEvent.total,
							);
							options.onProgress(percent);
						}
					},
				},
			);

			return normalizeUploadResult(res.data, file, "LOCAL");
		} catch (err: any) {
			// If 404 or prefix issue, attempt with fallback endpoint directly
			if (err?.status === 404 || err?.response?.status === 404) {
				const fallbackRes = await api.post<ServerFileResponse | any>(
					fallbackEndpoint,
					formData,
					{
						headers: { "Content-Type": "multipart/form-data" },
						onUploadProgress: (progressEvent) => {
							if (progressEvent.total && options?.onProgress) {
								const percent = Math.round(
									(progressEvent.loaded * 100) / progressEvent.total,
								);
								options.onProgress(percent);
							}
						},
					},
				);
				return normalizeUploadResult(fallbackRes.data, file, "LOCAL");
			}
			throw err;
		}
	}

	async uploadBatch(
		files: File[],
		options?: UploadOptions,
	): Promise<UploadResult[]> {
		if (!files || files.length === 0) return [];

		const formData = new FormData();
		// Required endpoint body key: files -> file[]
		files.forEach((f) => {
			formData.append("files", f);
		});

		if (options?.folder) formData.append("folder", options.folder);
		if (options?.isPublic !== undefined)
			formData.append("isPublic", String(options.isPublic));
		if (options?.category) formData.append("category", options.category);
		if (options?.description)
			formData.append("description", options.description);
		if (options?.branchId !== undefined)
			formData.append("branchId", String(options.branchId));

		if (options?.extraParams) {
			Object.entries(options.extraParams).forEach(([key, val]) => {
				if (val !== undefined && val !== null) {
					formData.append(key, String(val));
				}
			});
		}

		const isPublic = Boolean(options?.isPublic);
		const primaryEndpoint = isPublic
			? "/public/files/batch-uploads"
			: "/files/batch-uploads";
		const fallbackEndpoint = isPublic
			? "/v1/public/files/batch-uploads"
			: "/v1/files/batch-uploads";

		try {
			const res = await api.post<ServerFileResponse[] | any>(
				primaryEndpoint,
				formData,
				{
					headers: { "Content-Type": "multipart/form-data" },
					onUploadProgress: (progressEvent) => {
						if (progressEvent.total && options?.onProgress) {
							const percent = Math.round(
								(progressEvent.loaded * 100) / progressEvent.total,
							);
							options.onProgress(percent);
						}
					},
				},
			);

			const rawItems = Array.isArray(res.data)
				? res.data
				: Array.isArray(res.data?.data)
					? res.data.data
					: [res.data];

			return rawItems.map((item: any, idx: number) =>
				normalizeUploadResult(item, files[idx] || files[0], "LOCAL"),
			);
		} catch (err: any) {
			if (err?.status === 404 || err?.response?.status === 404) {
				const fallbackRes = await api.post<ServerFileResponse[] | any>(
					fallbackEndpoint,
					formData,
					{
						headers: { "Content-Type": "multipart/form-data" },
						onUploadProgress: (progressEvent) => {
							if (progressEvent.total && options?.onProgress) {
								const percent = Math.round(
									(progressEvent.loaded * 100) / progressEvent.total,
								);
								options.onProgress(percent);
							}
						},
					},
				);
				const rawItems = Array.isArray(fallbackRes.data)
					? fallbackRes.data
					: Array.isArray(fallbackRes.data?.data)
						? fallbackRes.data.data
						: [fallbackRes.data];
				return rawItems.map((item: any, idx: number) =>
					normalizeUploadResult(item, files[idx] || files[0], "LOCAL"),
				);
			}
			throw err;
		}
	}
}

/**
 * Strategy 2: Direct AWS S3 Presigned Upload (via /storage/upload-url)
 */
export class S3FileUploader implements IFileUploader {
	readonly type = "s3" as const;

	async uploadSingle(
		file: File,
		options?: UploadOptions,
	): Promise<UploadResult> {
		const payload = {
			fileName: file.name,
			contentType: file.type || "application/octet-stream",
			isPublic: options?.isPublic ?? true,
			folder: options?.folder || options?.category?.toLowerCase() || "uploads",
		};

		const { uploadUrl, fileKey } = await api
			.post<{ uploadUrl: string; fileKey: string }>(
				"/storage/upload-url",
				payload,
			)
			.then((r) => r.data);

		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("PUT", uploadUrl, true);
			xhr.setRequestHeader(
				"Content-Type",
				file.type || "application/octet-stream",
			);

			if (xhr.upload && options?.onProgress) {
				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						const percent = Math.round((e.loaded / e.total) * 100);
						options.onProgress?.(percent);
					}
				};
			}

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve();
				} else {
					reject(new Error(`S3 upload failed with status ${xhr.status}`));
				}
			};

			xhr.onerror = () =>
				reject(new Error("Network error during file upload to S3"));
			xhr.send(file);
		});

		const finalUrl = fileKey.startsWith("public/")
			? `https://public-crm-amz-s3.s3.us-east-1.amazonaws.com/${fileKey}`
			: `/api/v1/storage/object/${fileKey.split("/").map(encodeURIComponent).join("/")}`;

		return {
			fileName: file.name,
			originalFileName: file.name,
			fileKey,
			storageKey: fileKey,
			url: finalUrl,
			mimeType: file.type || "application/octet-stream",
			fileType: file.type?.startsWith("image/") ? "IMAGE" : "DOCUMENT",
			size: file.size,
			storageStrategy: "S3",
			createdAt: new Date().toISOString(),
		};
	}

	async uploadBatch(
		files: File[],
		options?: UploadOptions,
	): Promise<UploadResult[]> {
		if (!files || files.length === 0) return [];
		const results: UploadResult[] = [];
		for (const file of files) {
			const res = await this.uploadSingle(file, options);
			results.push(res);
		}
		return results;
	}
}

export type UploaderStrategyType = "api" | "s3" | "server";

/**
 * File Uploader Factory
 * Provides unified instantiation and strategy switching between API and S3.
 */
export class FileUploaderFactory {
	private static instances = new Map<string, IFileUploader>();
	private static defaultType: UploaderStrategyType = "api";

	public static setDefaultType(type: UploaderStrategyType): void {
		FileUploaderFactory.defaultType = type;
	}

	public static getDefaultType(): UploaderStrategyType {
		return FileUploaderFactory.defaultType;
	}

	public static getUploader(type?: UploaderStrategyType): IFileUploader {
		const rawType = (type || FileUploaderFactory.defaultType).toLowerCase();
		const targetType = rawType === "server" ? "api" : rawType;

		if (!FileUploaderFactory.instances.has(targetType)) {
			if (targetType === "s3") {
				FileUploaderFactory.instances.set("s3", new S3FileUploader());
			} else {
				FileUploaderFactory.instances.set("api", new ApiFileUploader());
			}
		}

		return FileUploaderFactory.instances.get(targetType)!;
	}

	public static registerUploader(type: string, uploader: IFileUploader): void {
		FileUploaderFactory.instances.set(type.toLowerCase(), uploader);
	}
}

/**
 * Global Convenience Upload Service
 */
export const uploadService = {
	uploadSingle: (
		file: File,
		options?: UploadOptions,
		strategy?: UploaderStrategyType,
	): Promise<UploadResult> => {
		return FileUploaderFactory.getUploader(strategy).uploadSingle(
			file,
			options,
		);
	},
	uploadBatch: (
		files: File[],
		options?: UploadOptions,
		strategy?: UploaderStrategyType,
	): Promise<UploadResult[]> => {
		return FileUploaderFactory.getUploader(strategy).uploadBatch(
			files,
			options,
		);
	},
	uploadPublicSingle: (
		file: File,
		options?: UploadOptions,
	): Promise<UploadResult> => {
		return FileUploaderFactory.getUploader("api").uploadSingle(file, {
			...options,
			isPublic: true,
		});
	},
	getUploader: (strategy?: UploaderStrategyType): IFileUploader => {
		return FileUploaderFactory.getUploader(strategy);
	},
	setDefaultStrategy: (strategy: UploaderStrategyType): void => {
		FileUploaderFactory.setDefaultType(strategy);
	},
};

"use client";

import React, { useState, useRef } from "react";
import {
	uploadService,
	type UploaderStrategyType,
} from "@/lib/services/file-uploader";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	UploadCloud,
	X,
	CheckCircle2,
	Server,
	Cloud,
} from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
	onUploadSuccess: (
		fileKey: string,
		fileName: string,
		storageStrategy?: string,
	) => void;
	accept?: string;
	maxSizeMB?: number;
	isPublic?: boolean;
	folder?: string;
	mode?: "s3" | "server";
	multiple?: boolean;
}

export function FileUpload({
	onUploadSuccess,
	accept = "*",
	maxSizeMB = 10,
	isPublic,
	folder,
	mode = "server",
	multiple = false,
}: FileUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [uploadedFiles, setUploadedFiles] = useState<
		{ name: string; key: string }[]
	>([]);
	const [activeMode, setActiveMode] = useState<"s3" | "server">(mode);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const filesList = event.target.files;
		if (!filesList || filesList.length === 0) return;

		const files = Array.from(filesList);

		for (const f of files) {
			if (f.size > maxSizeMB * 1024 * 1024) {
				toast.error(
					`File ${f.name} exceeds maximum size limit of ${maxSizeMB}MB`,
				);
				return;
			}
		}

		setIsUploading(true);
		const strategy: UploaderStrategyType =
			activeMode === "server" ? "api" : "s3";
		try {
			if (multiple && files.length > 1) {
				const results = await uploadService.uploadBatch(
					files,
					{ isPublic, folder },
					strategy,
				);
				const newEntries = results.map((r) => ({
					name: r.originalFileName || r.fileName,
					key: r.storageKey || r.fileKey || r.url,
				}));
				setUploadedFiles((prev) => [...prev, ...newEntries]);
				results.forEach((r) => {
					onUploadSuccess(
						r.storageKey || r.fileKey || r.url,
						r.originalFileName || r.fileName,
						r.storageStrategy || (strategy === "api" ? "LOCAL" : "S3"),
					);
				});
				toast.success(`${results.length} file(s) uploaded successfully`);
			} else {
				const file = files[0];
				const result = await uploadService.uploadSingle(
					file,
					{ isPublic, folder },
					strategy,
				);
				const key = result.storageKey || result.fileKey || result.url;
				const name = result.originalFileName || result.fileName;
				const entry = { name, key };
				setUploadedFiles([entry]);
				onUploadSuccess(
					key,
					name,
					result.storageStrategy || (strategy === "api" ? "LOCAL" : "S3"),
				);
				toast.success(
					strategy === "api"
						? "File uploaded to local server directory"
						: "File uploaded to AWS S3 storage",
				);
			}
		} catch (error: any) {
			toast.error(error?.message || "Failed to upload file");
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const triggerSelect = () => {
		fileInputRef.current?.click();
	};

	const clearUploads = () => {
		setUploadedFiles([]);
	};

	return (
		<div className="w-full space-y-2">
			<input
				type="file"
				ref={fileInputRef}
				onChange={handleFileChange}
				accept={accept}
				multiple={multiple}
				className="hidden"
			/>

			{/* Mode Switcher */}
			<div className="flex items-center justify-between text-xs pb-1">
				<span className="text-slate-500 font-medium">Storage Destination:</span>
				<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border">
					<button
						type="button"
						onClick={() => setActiveMode("server")}
						className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
							activeMode === "server"
								? "bg-white text-indigo-600 shadow-xs"
								: "text-slate-500 hover:text-slate-800"
						}`}
					>
						<Server className="h-3 w-3" /> Server Directory
					</button>
					<button
						type="button"
						onClick={() => setActiveMode("s3")}
						className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all ${
							activeMode === "s3"
								? "bg-white text-indigo-600 shadow-xs"
								: "text-slate-500 hover:text-slate-800"
						}`}
					>
						<Cloud className="h-3 w-3" /> AWS S3
					</button>
				</div>
			</div>

			{uploadedFiles.length > 0 ? (
				<div className="space-y-2">
					{uploadedFiles.map((file, idx) => (
						<div
							key={idx}
							className="flex items-center justify-between p-3 border rounded-xl bg-slate-50 dark:bg-slate-900"
						>
							<div className="flex items-center gap-3 overflow-hidden">
								<div className="bg-emerald-500/10 p-2 rounded-lg shrink-0">
									<CheckCircle2 className="h-4 w-4 text-emerald-600" />
								</div>
								<div className="truncate">
									<p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
										{file.name}
									</p>
									<p className="text-[10px] text-slate-400 font-mono truncate">
										{file.key}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearUploads}
								className="h-7 w-7 text-slate-400 hover:text-slate-700"
								type="button"
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					))}
				</div>
			) : (
				<div
					onClick={isUploading ? undefined : triggerSelect}
					className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-colors ${
						isUploading
							? "opacity-50 cursor-not-allowed bg-slate-50"
							: "cursor-pointer hover:bg-slate-50 hover:border-indigo-400"
					}`}
				>
					<div className="bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-full">
						{isUploading ? (
							<Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
						) : (
							<UploadCloud className="h-5 w-5 text-indigo-600" />
						)}
					</div>
					<div className="text-center">
						<p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
							{isUploading
								? "Uploading..."
								: `Click to select ${multiple ? "files" : "file"}`}
						</p>
						<p className="text-[10px] text-slate-400 mt-0.5">
							Destination:{" "}
							{activeMode === "server"
								? "Local Server (/public/files)"
								: "AWS S3 Bucket"}{" "}
							• Max: {maxSizeMB}MB
						</p>
					</div>
				</div>
			)}
		</div>
	);
}

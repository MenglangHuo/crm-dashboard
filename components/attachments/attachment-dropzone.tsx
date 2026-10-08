"use client";

import * as React from "react";
import {
	Upload,
	X,
	CheckCircle2,
	AlertCircle,
	FileText,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { uploadFileWithAttachment } from "@/lib/api/endpoints";
import type { Attachment } from "@/lib/types";
import { formatBytes } from "./attachment-card";
import { toast } from "sonner";

export const CATEGORY_OPTIONS = [
	{ value: "DOCUMENTS", label: "Documents" },
	{ value: "IMAGES", label: "Images" },
	{ value: "CONTRACTS", label: "Contracts" },
	{ value: "PRODUCT", label: "Product Media" },
	{ value: "AVATAR", label: "Avatar & Profiles" },
	{ value: "RECEIPT", label: "Receipts & Invoices" },
	{ value: "FINANCE", label: "Finance & Banking" },
	{ value: "OTHER", label: "Other" },
];

interface FileItemState {
	id: string;
	file: File;
	progress: number;
	status: "pending" | "uploading" | "success" | "error";
	errorMessage?: string;
	result?: Attachment;
}

interface AttachmentDropzoneProps {
	onUploadComplete?: (attachments: Attachment[]) => void;
	defaultCategory?: string;
	branchId?: number | string;
	isPublic?: boolean;
	multiple?: boolean;
	maxFiles?: number;
}

export function AttachmentDropzone({
	onUploadComplete,
	defaultCategory = "DOCUMENTS",
	branchId,
	isPublic = true,
	multiple = true,
	maxFiles = 10,
}: AttachmentDropzoneProps) {
	const [isDragging, setIsDragging] = React.useState(false);
	const [category, setCategory] = React.useState(defaultCategory);
	const [description, setDescription] = React.useState("");
	const [queue, setQueue] = React.useState<FileItemState[]>([]);
	const [isUploading, setIsUploading] = React.useState(false);

	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	const processFiles = (files: FileList | File[]) => {
		const selectedFiles = Array.from(files).slice(0, multiple ? maxFiles : 1);
		if (selectedFiles.length === 0) return;

		const newItems: FileItemState[] = selectedFiles.map((file) => ({
			id: Math.random().toString(36).substring(2, 9),
			file,
			progress: 0,
			status: "pending",
		}));

		setQueue((prev) => (multiple ? [...prev, ...newItems] : newItems));
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			processFiles(e.dataTransfer.files);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			processFiles(e.target.files);
		}
	};

	const removeItem = (id: string) => {
		setQueue((prev) => prev.filter((item) => item.id !== id));
	};

	const startUpload = async () => {
		const pendingItems = queue.filter(
			(i) => i.status === "pending" || i.status === "error",
		);
		if (pendingItems.length === 0) return;

		setIsUploading(true);
		const completedAttachments: Attachment[] = [];

		for (const item of pendingItems) {
			setQueue((prev) =>
				prev.map((i) =>
					i.id === item.id ? { ...i, status: "uploading", progress: 5 } : i,
				),
			);

			try {
				const attachment = await uploadFileWithAttachment(item.file, {
					category,
					description: description.trim() || undefined,
					branchId,
					isPublic,
					onProgress: (percent) => {
						setQueue((prev) =>
							prev.map((i) =>
								i.id === item.id ? { ...i, progress: percent } : i,
							),
						);
					},
				});

				setQueue((prev) =>
					prev.map((i) =>
						i.id === item.id
							? { ...i, status: "success", progress: 100, result: attachment }
							: i,
					),
				);
				completedAttachments.push(attachment);
			} catch (err: any) {
				setQueue((prev) =>
					prev.map((i) =>
						i.id === item.id
							? {
									...i,
									status: "error",
									errorMessage: err?.message || "Upload failed",
								}
							: i,
					),
				);
				toast.error(`Failed to upload ${item.file.name}`);
			}
		}

		setIsUploading(false);
		if (completedAttachments.length > 0) {
			toast.success(
				`Successfully uploaded ${completedAttachments.length} file(s)!`,
			);
			onUploadComplete?.(completedAttachments);
		}
	};

	return (
		<div className="flex flex-col gap-5">
			{/* Category & Description Configuration */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
						Target Category
					</Label>
					<Select
						value={category}
						onValueChange={(val) => val && setCategory(val)}
					>
						<SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900">
							<SelectValue placeholder="Select Category" />
						</SelectTrigger>
						<SelectContent className="rounded-xl dark:bg-slate-950">
							{CATEGORY_OPTIONS.map((cat) => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1.5">
					<Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
						File Description (Optional)
					</Label>
					<Input
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="e.g. Approved contract document signed by client"
						className="h-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900"
					/>
				</div>
			</div>

			{/* Drag & Drop Zone */}
			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
					isDragging
						? "border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 scale-[1.01]"
						: "border-slate-300 dark:border-slate-700 hover:border-purple-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
				}`}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple={multiple}
					onChange={handleFileChange}
					className="hidden"
				/>

				<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shadow-inner group-hover:scale-110 transition-transform duration-200">
					<Upload className="h-7 w-7" />
				</div>

				<div className="mt-4 flex flex-col gap-1">
					<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
						Click to upload or drag & drop files here
					</p>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						Supports Images, PDF documents, Spreadsheets, Archives & Media up to
						50MB
					</p>
				</div>
			</div>

			{/* Queued Files List */}
			{queue.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Upload Queue ({queue.length})
						</h4>
						{queue.some((i) => i.status === "pending") && (
							<Button
								onClick={startUpload}
								disabled={isUploading}
								size="sm"
								className="h-8 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium px-4"
							>
								{isUploading ? (
									<>
										<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
										Uploading...
									</>
								) : (
									`Start Upload (${queue.filter((i) => i.status === "pending").length})`
								)}
							</Button>
						)}
					</div>

					<div className="space-y-2 max-h-60 overflow-y-auto pr-1">
						{queue.map((item) => (
							<div
								key={item.id}
								className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs"
							>
								<div className="flex items-center gap-3 min-w-0 flex-1">
									<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
										<FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between">
											<span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
												{item.file.name}
											</span>
											<span className="text-[11px] text-slate-400">
												{formatBytes(item.file.size)}
											</span>
										</div>

										{item.status === "uploading" && (
											<div className="mt-1 flex items-center gap-2">
												<Progress
													value={item.progress}
													className="h-1.5 flex-1 bg-purple-100 dark:bg-purple-950"
												/>
												<span className="text-[10px] font-bold text-purple-600">
													{item.progress}%
												</span>
											</div>
										)}

										{item.status === "error" && (
											<p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-0.5">
												<AlertCircle className="h-3 w-3" />
												{item.errorMessage}
											</p>
										)}
									</div>
								</div>

								<div className="ml-3 flex items-center gap-2">
									{item.status === "success" && (
										<Badge
											variant="outline"
											className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-200 dark:border-emerald-800 text-[10px] px-2"
										>
											<CheckCircle2 className="mr-1 h-3 w-3" />
											Uploaded
										</Badge>
									)}

									{!isUploading && (
										<Button
											variant="ghost"
											size="icon"
											onClick={() => removeItem(item.id)}
											className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
										>
											<X className="h-4 w-4" />
										</Button>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

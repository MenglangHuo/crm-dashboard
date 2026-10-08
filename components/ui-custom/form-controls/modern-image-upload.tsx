"use client";

import React, { useState, useRef } from "react";
import {
	UploadCloud,
	Plus,
	X,
	Image as ImageIcon,
	Loader2,
	Eye,
	Link as LinkIcon,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { uploadService } from "@/lib/services/file-uploader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ModernImageUploadProps {
	label?: string;
	description?: string;
	value?: string[];
	onChange?: (urls: string[]) => void;
	maxFiles?: number;
	maxSizeMB?: number;
	disabled?: boolean;
	className?: string;
	fallbackAvatar?: string;
}

export function ModernImageUpload({
	label = "Storefront & Profile Images",
	description = "Upload high-quality storefront images, customer shop logos, or paste online image URLs.",
	value = [],
	onChange,
	maxFiles = 8,
	maxSizeMB = 10,
	disabled = false,
	className,
	fallbackAvatar = "/images/default-customer.png",
}: ModernImageUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
	const [pastedUrl, setPastedUrl] = useState("");
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const urlsList = Array.isArray(value) ? value : value ? [value] : [];

	const handleFiles = async (files: File[]) => {
		if (files.length === 0) return;
		if (urlsList.length + files.length > maxFiles) {
			toast.error(`Maximum of ${maxFiles} images allowed`);
			return;
		}

		for (const f of files) {
			if (f.size > maxSizeMB * 1024 * 1024) {
				toast.error(`File ${f.name} exceeds ${maxSizeMB}MB limit`);
				return;
			}
			if (!f.type.startsWith("image/")) {
				toast.error(`File ${f.name} is not an image`);
				return;
			}
		}

		setIsUploading(true);
		try {
			if (files.length > 1) {
				const res = await uploadService.uploadBatch(files, {
					category: "IMAGES",
				});
				const uploadedUrls = res
					.map((r) => r.url || r.fileKey || r.storageKey || "")
					.filter(Boolean);
				const updated = [...urlsList, ...uploadedUrls];
				onChange?.(updated);
				toast.success(`${files.length} images uploaded successfully`);
			} else {
				const res = await uploadService.uploadSingle(files[0], {
					category: "IMAGES",
				});
				const uploadedUrl = res.url || res.fileKey || res.storageKey || "";
				const updated = [...urlsList, uploadedUrl].filter(Boolean);
				onChange?.(updated);
				toast.success("Image uploaded successfully");
			}
		} catch (err: any) {
			// Fallback to local Data URL preview if server upload fails in offline/demo mode
			toast.warning("Server upload error, using instant preview");
			const localDataUrls: string[] = [];
			for (const f of files) {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						localDataUrls.push(String(e.target.result));
						if (localDataUrls.length === files.length) {
							onChange?.([...urlsList, ...localDataUrls]);
						}
					}
				};
				reader.readAsDataURL(f);
			}
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			handleFiles(Array.from(e.target.files));
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!disabled) setIsDragging(true);
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
		if (disabled || isUploading) return;

		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFiles(Array.from(e.dataTransfer.files));
		}
	};

	const handleAddPastedUrl = () => {
		if (!pastedUrl.trim()) return;
		const updated = [...urlsList, pastedUrl.trim()];
		onChange?.(updated);
		setPastedUrl("");
		setIsUrlModalOpen(false);
		toast.success("Image URL added to gallery");
	};

	const handleRemoveImage = (index: number, e: React.MouseEvent) => {
		e.stopPropagation();
		const updated = urlsList.filter((_, i) => i !== index);
		onChange?.(updated);
	};

	return (
		<div className={cn("space-y-2.5", className)}>
			<div className="flex items-center justify-between">
				<div>
					{label && (
						<Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
							{label}
						</Label>
					)}
					{description && (
						<p className="text-[11px] text-slate-500">{description}</p>
					)}
				</div>
				<span className="text-[11px] font-semibold text-slate-400">
					{urlsList.length}/{maxFiles} images
				</span>
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				onChange={handleFileSelect}
				className="hidden"
				disabled={disabled || isUploading}
			/>

			{/* Image Thumbnails Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-2.5">
				{urlsList.map((url, idx) => (
					<div
						key={idx}
						className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-2xs transition-all"
					>
						<img
							src={url}
							alt={`Upload ${idx + 1}`}
							onError={(e) => {
								(e.currentTarget as HTMLImageElement).src = fallbackAvatar;
							}}
							className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
						/>

						{/* Badge for Primary / First */}
						{idx === 0 && (
							<Badge className="absolute top-1.5 left-1.5 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] py-0 px-1.5 font-bold shadow-xs">
								Primary
							</Badge>
						)}

						{/* Overlay Actions */}
						<div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
							<button
								type="button"
								onClick={() => setPreviewImage(url)}
								className="h-7 w-7 rounded-lg bg-white/90 hover:bg-white text-slate-900 flex items-center justify-center shadow-xs transition-colors"
								title="Preview"
							>
								<Eye className="h-3.5 w-3.5" />
							</button>
							{!disabled && (
								<button
									type="button"
									onClick={(e) => handleRemoveImage(idx, e)}
									className="h-7 w-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs transition-colors"
									title="Remove"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>
					</div>
				))}

				{/* Add / Upload Dropzone Button */}
				{urlsList.length < maxFiles && (
					<div
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() => {
							if (!disabled && !isUploading) fileInputRef.current?.click();
						}}
						className={cn(
							"aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all",
							isDragging
								? "border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 scale-[0.99]"
								: "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/30",
							disabled && "opacity-50 cursor-not-allowed",
							isUploading && "pointer-events-none",
						)}
					>
						{isUploading ? (
							<div className="flex flex-col items-center gap-1">
								<Loader2 className="h-5 w-5 animate-spin text-purple-600" />
								<span className="text-[10px] font-semibold text-slate-500">
									Uploading...
								</span>
							</div>
						) : (
							<div className="flex flex-col items-center gap-1">
								<div className="h-7 w-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
									<UploadCloud className="h-3.5 w-3.5" />
								</div>
								<span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
									Upload Photos
								</span>
								<span className="text-[9px] text-slate-400">
									Drag & Drop or Click
								</span>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Paste URL Option Strip */}
			<div className="flex items-center justify-between text-xs pt-0.5">
				{!isUrlModalOpen ? (
					<button
						type="button"
						onClick={() => setIsUrlModalOpen(true)}
						className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
					>
						<LinkIcon className="h-3 w-3" /> Or paste image web link (URL)
					</button>
				) : (
					<div className="flex items-center gap-1.5 flex-1 max-w-md animate-in fade-in duration-150">
						<input
							type="text"
							value={pastedUrl}
							onChange={(e) => setPastedUrl(e.target.value)}
							placeholder="https://example.com/storefront.jpg"
							className="flex-1 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-100"
						/>
						<Button
							type="button"
							size="sm"
							onClick={handleAddPastedUrl}
							disabled={!pastedUrl.trim()}
							className="h-8 rounded-xl text-xs font-bold px-3"
						>
							Add
						</Button>
						<button
							type="button"
							onClick={() => setIsUrlModalOpen(false)}
							className="text-slate-400 hover:text-slate-600 p-1"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
				)}
			</div>

			{/* Lightbox Preview Modal */}
			{previewImage && (
				<div
					onClick={() => setPreviewImage(null)}
					className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
				>
					<div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden bg-black border border-white/20 shadow-2xl">
						<img
							src={previewImage}
							alt="Preview"
							onError={(e) => {
								(e.currentTarget as HTMLImageElement).src = fallbackAvatar;
							}}
							className="max-w-full max-h-[85vh] object-contain"
						/>
						<button
							type="button"
							onClick={() => setPreviewImage(null)}
							className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

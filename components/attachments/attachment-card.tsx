"use client";

import * as React from "react";
import {
	FileText,
	FileImage,
	FileSpreadsheet,
	FileCode,
	Film,
	Music,
	Archive,
	File,
	MoreVertical,
	Download,
	Eye,
	Trash2,
	Copy,
	Check,
	Globe,
	Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Attachment } from "@/lib/types";
import { storageApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

export function formatBytes(
	bytes: number | null | undefined,
	decimals = 1,
): string {
	if (!bytes || bytes === 0) return "0 B";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileCategoryColor(category?: string | null): string {
	switch (category?.toUpperCase()) {
		case "IMAGES":
		case "IMAGE":
		case "AVATAR":
		case "PRODUCT":
			return "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50";
		case "DOCUMENTS":
		case "CONTRACT":
		case "CONTRACTS":
			return "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
		case "RECEIPT":
		case "FINANCE":
			return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
		default:
			return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
	}
}

export function isImageMime(
	mimeType?: string | null,
	fileName?: string | null,
): boolean {
	if (mimeType?.startsWith("image/")) return true;
	if (!fileName) return false;
	const ext = fileName.split(".").pop()?.toLowerCase();
	return ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(
		ext || "",
	);
}

export function getFileIcon(
	mimeType?: string | null,
	fileName?: string | null,
) {
	const mime = mimeType?.toLowerCase() || "";
	const ext = fileName?.split(".").pop()?.toLowerCase() || "";

	if (
		mime.startsWith("image/") ||
		["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)
	) {
		return FileImage;
	}
	if (
		mime.includes("pdf") ||
		mime.includes("word") ||
		["pdf", "doc", "docx", "txt", "rtf"].includes(ext)
	) {
		return FileText;
	}
	if (
		mime.includes("sheet") ||
		mime.includes("excel") ||
		["xls", "xlsx", "csv"].includes(ext)
	) {
		return FileSpreadsheet;
	}
	if (
		mime.startsWith("video/") ||
		["mp4", "mov", "avi", "mkv", "webm"].includes(ext)
	) {
		return Film;
	}
	if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext)) {
		return Music;
	}
	if (
		mime.includes("zip") ||
		mime.includes("compressed") ||
		["zip", "rar", "7z", "tar", "gz"].includes(ext)
	) {
		return Archive;
	}
	if (
		mime.includes("json") ||
		mime.includes("javascript") ||
		["html", "css", "js", "ts", "json"].includes(ext)
	) {
		return FileCode;
	}
	return File;
}

interface AttachmentCardProps {
	attachment: Attachment;
	isSelected?: boolean;
	onSelect?: () => void;
	onViewDetails?: () => void;
	onDelete?: () => void;
	selectable?: boolean;
}

export function AttachmentCard({
	attachment,
	isSelected = false,
	onSelect,
	onViewDetails,
	onDelete,
	selectable = true,
}: AttachmentCardProps) {
	const [copied, setCopied] = React.useState(false);
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(
		attachment.fileUrl || null,
	);
	const [downloading, setDownloading] = React.useState(false);

	const isImage = isImageMime(attachment.mimeType, attachment.fileName);
	const FileIconComponent = getFileIcon(
		attachment.mimeType,
		attachment.fileName,
	);

	// Fetch presigned URL for image preview if fileUrl is not available or direct S3 key is present
	React.useEffect(() => {
		let isMounted = true;
		if (attachment.fileUrl) {
			setPreviewUrl(attachment.fileUrl);
		} else if (
			isImage &&
			attachment.fileKey &&
			!attachment.fileKey.startsWith("http") &&
			!attachment.fileKey.startsWith("/")
		) {
			storageApi
				.getDownloadUrl(attachment.fileKey)
				.then((res) => {
					if (isMounted && res?.downloadUrl) {
						setPreviewUrl(res.downloadUrl);
					}
				})
				.catch(() => {
					// ignore preview error fallback to icon
				});
		}
		return () => {
			isMounted = false;
		};
	}, [attachment.fileKey, attachment.fileUrl, isImage]);

	const handleDownload = async (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setDownloading(true);
		try {
			let downloadLink = attachment.fileUrl;
			if (
				!downloadLink ||
				(!downloadLink.startsWith("http") && !downloadLink.startsWith("/"))
			) {
				try {
					const res = await storageApi.getDownloadUrl(attachment.fileKey);
					if (res?.downloadUrl) {
						downloadLink = res.downloadUrl;
					}
				} catch (ignored) {}
			}

			if (downloadLink) {
				const link = document.createElement("a");
				link.href = downloadLink;
				link.target = "_blank";
				link.download = attachment.fileName;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				toast.success(`Downloading ${attachment.fileName}`);
			} else {
				toast.error("Failed to generate download link");
			}
		} catch (err: any) {
			toast.error(err?.message || "Failed to download file");
		} finally {
			setDownloading(false);
		}
	};

	const handleCopyKey = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(attachment.fileKey);
		setCopied(true);
		toast.success("File key copied to clipboard!");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<Card
			onClick={() => {
				if (selectable && onSelect) {
					onSelect();
				} else if (onViewDetails) {
					onViewDetails();
				}
			}}
			className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer ${
				isSelected
					? "border-purple-600 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 shadow-md shadow-purple-500/10 ring-2 ring-purple-600/30"
					: "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg hover:shadow-purple-500/5"
			}`}
		>
			{/* Top Bar Overlay */}
			<div className="flex items-center justify-between p-3 pb-0 z-10">
				{selectable ? (
					<div
						onClick={(e) => {
							e.stopPropagation();
							onSelect?.();
						}}
						className="flex items-center justify-center p-1"
					>
						<Checkbox
							checked={isSelected}
							onCheckedChange={() => onSelect?.()}
							className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 h-5 w-5 rounded-md"
						/>
					</div>
				) : (
					<Badge
						variant="outline"
						className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getFileCategoryColor(
							attachment.category,
						)}`}
					>
						{attachment.category || "General"}
					</Badge>
				)}

				<div className="flex items-center gap-1.5 ml-auto">
					{attachment.isPublic ? (
						<span
							title="Public access"
							className="text-slate-400 dark:text-slate-500"
						>
							<Globe className="h-3.5 w-3.5" />
						</span>
					) : (
						<span
							title="Private access"
							className="text-slate-400 dark:text-slate-500"
						>
							<Lock className="h-3.5 w-3.5" />
						</span>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
									onClick={(e) => e.stopPropagation()}
								/>
							}
						>
							<MoreVertical className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="w-48 rounded-xl shadow-xl dark:bg-slate-950"
						>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onViewDetails?.();
								}}
							>
								<Eye className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
								<span>View Details</span>
							</DropdownMenuItem>

							<DropdownMenuItem onClick={handleDownload} disabled={downloading}>
								<Download className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
								<span>Download</span>
							</DropdownMenuItem>

							<DropdownMenuItem onClick={handleCopyKey}>
								{copied ? (
									<Check className="mr-2 h-4 w-4 text-emerald-600" />
								) : (
									<Copy className="mr-2 h-4 w-4 text-slate-500" />
								)}
								<span>Copy File Key</span>
							</DropdownMenuItem>

							{onDelete && (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onDelete();
										}}
										className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										<span>Delete File</span>
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Preview Section */}
			<div className="relative flex aspect-[4/3] w-full items-center justify-center p-4">
				{isImage && previewUrl ? (
					<div className="relative h-full w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800/80">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={previewUrl}
							alt={attachment.fileName}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					</div>
				) : (
					<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 text-purple-600 dark:text-purple-400 shadow-inner">
						<FileIconComponent className="h-10 w-10" />
					</div>
				)}
			</div>

			{/* Footer Info */}
			<div className="flex flex-col gap-1 p-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
				<div className="flex items-center justify-between gap-2">
					<span
						className="truncate font-semibold text-xs text-slate-800 dark:text-slate-200"
						title={attachment.fileName}
					>
						{attachment.fileName}
					</span>
				</div>
				<div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
					<span>{formatBytes(attachment.fileSize)}</span>
					{selectable && (
						<Badge
							variant="outline"
							className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 rounded-md ${getFileCategoryColor(
								attachment.category,
							)}`}
						>
							{attachment.category || "GENERAL"}
						</Badge>
					)}
				</div>
			</div>
		</Card>
	);
}

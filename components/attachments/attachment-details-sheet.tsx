"use client";

import * as React from "react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Download,
	Copy,
	Check,
	Globe,
	Lock,
	ExternalLink,
	Calendar,
	HardDrive,
	User,
	Key,
	Save,
	Loader2,
} from "lucide-react";
import type { Attachment } from "@/lib/types";
import {
	useUpdateAttachment,
	useAttachmentDownloadUrl,
} from "@/hooks/use-attachments";
import { storageApi } from "@/lib/api/endpoints";
import {
	formatBytes,
	getFileCategoryColor,
	isImageMime,
	getFileIcon,
} from "./attachment-card";
import { CATEGORY_OPTIONS } from "./attachment-dropzone";
import { toast } from "sonner";

interface AttachmentDetailsSheetProps {
	attachment: Attachment | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AttachmentDetailsSheet({
	attachment,
	open,
	onOpenChange,
}: AttachmentDetailsSheetProps) {
	const [fileName, setFileName] = React.useState("");
	const [category, setCategory] = React.useState("DOCUMENTS");
	const [description, setDescription] = React.useState("");
	const [isPublic, setIsPublic] = React.useState(true);

	const [copiedKey, setCopiedKey] = React.useState(false);
	const [copiedLink, setCopiedLink] = React.useState(false);
	const [presignedUrl, setPresignedUrl] = React.useState<string | null>(null);
	const [generatingLink, setGeneratingLink] = React.useState(false);

	const updateMutation = useUpdateAttachment();

	// Sync form state when attachment changes
	React.useEffect(() => {
		if (attachment) {
			setFileName(attachment.fileName || "");
			setCategory(attachment.category || "DOCUMENTS");
			setDescription(attachment.description || "");
			setIsPublic(attachment.isPublic ?? true);
			setPresignedUrl(attachment.fileUrl || null);
		}
	}, [attachment]);

	if (!attachment) return null;

	const isImage = isImageMime(attachment.mimeType, attachment.fileName);
	const FileIconComponent = getFileIcon(
		attachment.mimeType,
		attachment.fileName,
	);

	const handleGenerateLink = async () => {
		if (
			attachment.fileUrl &&
			(attachment.fileUrl.startsWith("http") ||
				attachment.fileUrl.startsWith("/"))
		) {
			setPresignedUrl(attachment.fileUrl);
			toast.success("File link ready!");
			return;
		}
		setGeneratingLink(true);
		try {
			const res = await storageApi.getDownloadUrl(attachment.fileKey);
			if (res?.downloadUrl) {
				setPresignedUrl(res.downloadUrl);
				toast.success("Generated presigned S3 download link!");
			}
		} catch (err: any) {
			toast.error("Failed to generate download link");
		} finally {
			setGeneratingLink(false);
		}
	};

	const handleCopyLink = () => {
		if (!presignedUrl) return;
		navigator.clipboard.writeText(presignedUrl);
		setCopiedLink(true);
		toast.success("Download link copied to clipboard");
		setTimeout(() => setCopiedLink(false), 2000);
	};

	const handleCopyKey = () => {
		navigator.clipboard.writeText(attachment.fileKey);
		setCopiedKey(true);
		toast.success("File key copied to clipboard");
		setTimeout(() => setCopiedKey(false), 2000);
	};

	const handleSaveMetadata = async () => {
		try {
			await updateMutation.mutateAsync({
				id: attachment.id,
				data: {
					fileName: fileName.trim(),
					category,
					description: description.trim(),
					isPublic,
				},
			});
			toast.success("Attachment metadata updated successfully!");
		} catch (err: any) {
			toast.error(err?.message || "Failed to update attachment");
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:max-w-md md:max-w-lg p-0 dark:bg-slate-950 flex flex-col h-full"
			>
				{/* Header */}
				<SheetHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
					<div className="flex items-center justify-between">
						<Badge
							variant="outline"
							className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${getFileCategoryColor(
								category,
							)}`}
						>
							{category}
						</Badge>
						<div className="flex items-center gap-2">
							{isPublic ? (
								<Badge
									variant="outline"
									className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-200 text-[10px] px-2"
								>
									<Globe className="mr-1 h-3 w-3" /> Public
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] px-2"
								>
									<Lock className="mr-1 h-3 w-3" /> Private
								</Badge>
							)}
						</div>
					</div>
					<SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-2">
						{attachment.fileName}
					</SheetTitle>
					<SheetDescription className="text-xs text-slate-500">
						Uploaded on {new Date(attachment.createdAt).toLocaleDateString()} •{" "}
						{formatBytes(attachment.fileSize)}
					</SheetDescription>
				</SheetHeader>

				{/* Content Body */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{/* Media Preview Box */}
					<div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-inner">
						{isImage && presignedUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={presignedUrl}
								alt={attachment.fileName}
								className="h-full w-full object-contain"
							/>
						) : (
							<div className="flex flex-col items-center gap-3 text-purple-600 dark:text-purple-400">
								<FileIconComponent className="h-16 w-16" />
								<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
									{attachment.mimeType || "Binary File"}
								</span>
							</div>
						)}
					</div>

					{/* Action Row: Presigned Link & Download */}
					<div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
								S3 Download Access
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={handleGenerateLink}
								disabled={generatingLink}
								className="h-8 rounded-lg text-xs font-medium"
							>
								{generatingLink ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
								) : (
									<ExternalLink className="h-3.5 w-3.5 mr-1" />
								)}
								Get Temp Link
							</Button>
						</div>

						{presignedUrl ? (
							<div className="flex items-center gap-2">
								<Input
									value={presignedUrl}
									readOnly
									className="h-8 text-xs font-mono rounded-lg border-slate-200 dark:border-slate-800"
								/>
								<Button
									size="icon"
									variant="secondary"
									onClick={handleCopyLink}
									className="h-8 w-8 rounded-lg shrink-0"
								>
									{copiedLink ? (
										<Check className="h-3.5 w-3.5 text-emerald-600" />
									) : (
										<Copy className="h-3.5 w-3.5" />
									)}
								</Button>
								<a
									href={presignedUrl}
									target="_blank"
									rel="noreferrer"
									download={attachment.fileName}
								>
									<Button
										size="icon"
										className="h-8 w-8 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shrink-0"
									>
										<Download className="h-3.5 w-3.5" />
									</Button>
								</a>
							</div>
						) : (
							<p className="text-[11px] text-slate-500">
								Generate a temporary presigned AWS S3 URL for downloading or
								viewing this secure asset.
							</p>
						)}
					</div>

					{/* Editable Metadata Form */}
					<div className="space-y-4">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							File Properties
						</h4>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold">Display File Name</Label>
							<Input
								value={fileName}
								onChange={(e) => setFileName(e.target.value)}
								className="h-10 rounded-xl border-slate-200 dark:border-slate-800"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold">Category Tag</Label>
							<Select
								value={category}
								onValueChange={(val) => val && setCategory(val)}
							>
								<SelectTrigger className="h-10 rounded-xl border-slate-200 dark:border-slate-800">
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
							<Label className="text-xs font-semibold">Description</Label>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
								placeholder="Add notes or context for this attachment..."
								className="rounded-xl border-slate-200 dark:border-slate-800 text-xs"
							/>
						</div>

						<div className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
							<div className="flex flex-col gap-0.5">
								<span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
									Public Visibility
								</span>
								<span className="text-[11px] text-slate-500">
									Allow public access to this object key
								</span>
							</div>
							<Switch checked={isPublic} onCheckedChange={setIsPublic} />
						</div>
					</div>

					{/* Technical Metadata Details */}
					<div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
							Technical Details
						</h4>

						<div className="grid grid-cols-2 gap-3 text-xs">
							<div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
								<Key className="h-3.5 w-3.5 text-slate-400" />
								<span className="font-medium">File Key:</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate">
								<span className="truncate">{attachment.fileKey}</span>
								<button
									onClick={handleCopyKey}
									className="ml-1 text-slate-400 hover:text-slate-600"
								>
									{copiedKey ? (
										<Check className="h-3 w-3 text-emerald-600" />
									) : (
										<Copy className="h-3 w-3" />
									)}
								</button>
							</div>

							<div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
								<HardDrive className="h-3.5 w-3.5 text-slate-400" />
								<span className="font-medium">Size:</span>
							</div>
							<div className="text-slate-800 dark:text-slate-200">
								{formatBytes(attachment.fileSize)}
							</div>

							<div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
								<Calendar className="h-3.5 w-3.5 text-slate-400" />
								<span className="font-medium">Created:</span>
							</div>
							<div className="text-slate-800 dark:text-slate-200">
								{new Date(attachment.createdAt).toLocaleString()}
							</div>

							<div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
								<User className="h-3.5 w-3.5 text-slate-400" />
								<span className="font-medium">Uploaded By:</span>
							</div>
							<div className="text-slate-800 dark:text-slate-200">
								User #{attachment.uploadedByUserId || "System"}
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<SheetFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
					<Button
						onClick={handleSaveMetadata}
						disabled={updateMutation.isPending}
						className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md shadow-purple-600/20"
					>
						{updateMutation.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving Changes...
							</>
						) : (
							<>
								<Save className="mr-2 h-4 w-4" />
								Save Properties
							</>
						)}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

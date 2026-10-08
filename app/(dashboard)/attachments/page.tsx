"use client";

import * as React from "react";
import {
	Search,
	Upload,
	Grid,
	List,
	Filter,
	Trash2,
	Download,
	Folder,
	Globe,
	HardDrive,
	FileText,
	Plus,
	RefreshCw,
	MoreHorizontal,
	Eye,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
	EmptyMedia,
	EmptyContent,
} from "@/components/ui/empty";
import type { Attachment } from "@/lib/types";
import { useAttachments, useDeleteAttachment } from "@/hooks/use-attachments";
import {
	AttachmentCard,
	formatBytes,
	getFileCategoryColor,
	getFileIcon,
} from "@/components/attachments/attachment-card";
import {
	AttachmentDropzone,
	CATEGORY_OPTIONS,
} from "@/components/attachments/attachment-dropzone";
import { AttachmentDetailsSheet } from "@/components/attachments/attachment-details-sheet";
import { storageApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

export default function AttachmentsPage() {
	const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");
	const [searchQuery, setSearchQuery] = React.useState("");
	const [categoryFilter, setCategoryFilter] = React.useState("ALL");
	const [page, setPage] = React.useState(1);

	// Selection state
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

	// Dialog & Sheet States
	const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
	const [activeAttachment, setActiveAttachment] =
		React.useState<Attachment | null>(null);
	const [detailsSheetOpen, setDetailsSheetOpen] = React.useState(false);
	const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(
		null,
	);
	const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] =
		React.useState(false);

	// Fetch Attachments API
	const {
		data: pageData,
		isLoading,
		isRefetching,
		refetch,
	} = useAttachments({
		category: categoryFilter === "ALL" ? undefined : categoryFilter,
		search: searchQuery.trim() || undefined,
		page: page,
		limit: 20,
	});

	const deleteMutation = useDeleteAttachment();

	const items = pageData?.items || [];
	const total = pageData?.total || 0;
	const totalPages = pageData?.totalPages || 1;

	// Compute metrics
	const totalSize = React.useMemo(() => {
		return items.reduce((acc, item) => acc + (item.fileSize || 0), 0);
	}, [items]);

	const publicCount = React.useMemo(() => {
		return items.filter((item) => item.isPublic).length;
	}, [items]);

	// Multi-selection handlers
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedIds(new Set(items.map((i) => i.id)));
		} else {
			setSelectedIds(new Set());
		}
	};

	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleDeleteSingle = async () => {
		if (!deleteTargetId) return;
		try {
			await deleteMutation.mutateAsync(deleteTargetId);
			toast.success("Attachment deleted successfully");
			setDeleteTargetId(null);
			setSelectedIds((prev) => {
				const next = new Set(prev);
				next.delete(deleteTargetId);
				return next;
			});
		} catch (err: any) {
			toast.error(err?.message || "Failed to delete attachment");
		}
	};

	const handleBulkDelete = async () => {
		const ids = Array.from(selectedIds);
		if (ids.length === 0) return;

		let successCount = 0;
		for (const id of ids) {
			try {
				await deleteMutation.mutateAsync(id);
				successCount++;
			} catch (err) {
				// continue batch
			}
		}

		toast.success(`Deleted ${successCount} attachment(s)`);
		setSelectedIds(new Set());
		setBulkDeleteConfirmOpen(false);
	};

	const handleDownloadSingle = async (attachment: Attachment) => {
		try {
			const res = await storageApi.getDownloadUrl(attachment.fileKey);
			if (res?.downloadUrl) {
				window.open(res.downloadUrl, "_blank");
				toast.success(`Downloading ${attachment.fileName}`);
			}
		} catch (err: any) {
			toast.error("Failed to generate download URL");
		}
	};

	return (
		<div className="flex flex-col gap-6 p-6 md:p-8 max-w-[1600px] mx-auto w-full">
			{/* Top Header & Quick Action */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
						<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20">
							<Folder className="h-5 w-5" />
						</div>
						Attachments Management
					</h1>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
						Store, view, and organize S3 media assets and system documents
						securely.
					</p>
				</div>

				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isRefetching}
						className="h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-medium"
					>
						<RefreshCw
							className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
					<Button
						onClick={() => setUploadDialogOpen(true)}
						size="sm"
						className="h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-purple-600/20 text-xs px-4"
					>
						<Plus className="mr-2 h-4 w-4" />
						Upload Asset
					</Button>
				</div>
			</div>

			{/* Metrics Banner */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
					<CardContent className="p-0 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								Total Assets
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{total}
							</h3>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
							<FileText className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
					<CardContent className="p-0 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								Total Size (Page)
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{formatBytes(totalSize)}
							</h3>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
							<HardDrive className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
					<CardContent className="p-0 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								Public Visibility
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{publicCount}
							</h3>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
							<Globe className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
					<CardContent className="p-0 flex items-center justify-between">
						<div>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								Active Filter
							</p>
							<h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-2 uppercase tracking-wide">
								{categoryFilter}
							</h3>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
							<Filter className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Toolbar: Search, Filters, Bulk Actions & View Switcher */}
			<div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
				<div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
					{/* Search Box */}
					<div className="relative w-full sm:w-80">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							value={searchQuery}
							onChange={(e) => {
								setSearchQuery(e.target.value);
								setPage(1);
							}}
							placeholder="Search file name or keyword..."
							className="pl-10 h-10 rounded-xl border-slate-200 dark:border-slate-800 text-xs"
						/>
					</div>

					{/* Category Filter */}
					<Select
						value={categoryFilter}
						onValueChange={(val) => {
							if (val) {
								setCategoryFilter(val);
								setPage(1);
							}
						}}
					>
						<SelectTrigger className="h-10 w-full sm:w-48 rounded-xl border-slate-200 dark:border-slate-800 text-xs">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent className="rounded-xl dark:bg-slate-950">
							<SelectItem value="ALL">All Categories</SelectItem>
							{CATEGORY_OPTIONS.map((cat) => (
								<SelectItem key={cat.value} value={cat.value}>
									{cat.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Right Actions & Layout Switcher */}
				<div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
					{/* Bulk Selection Actions Bar */}
					{selectedIds.size > 0 && (
						<div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 px-3 py-1.5 rounded-xl">
							<span className="text-xs font-bold text-purple-700 dark:text-purple-300">
								{selectedIds.size} Selected
							</span>
							<Button
								variant="destructive"
								size="sm"
								onClick={() => setBulkDeleteConfirmOpen(true)}
								className="h-7 text-xs rounded-lg px-2.5"
							>
								<Trash2 className="mr-1 h-3.5 w-3.5" />
								Delete Selected
							</Button>
						</div>
					)}

					{/* View Toggle */}
					<div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setViewMode("grid")}
							className={`h-8 px-3 rounded-lg text-xs font-semibold ${
								viewMode === "grid"
									? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
									: "text-slate-500 hover:text-slate-900"
							}`}
						>
							<Grid className="mr-1.5 h-3.5 w-3.5" />
							Grid
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setViewMode("table")}
							className={`h-8 px-3 rounded-lg text-xs font-semibold ${
								viewMode === "table"
									? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
									: "text-slate-500 hover:text-slate-900"
							}`}
						>
							<List className="mr-1.5 h-3.5 w-3.5" />
							Table
						</Button>
					</div>
				</div>
			</div>

			{/* Main Attachments Display Content */}
			{isLoading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton
							key={i}
							className="aspect-[4/3] w-full rounded-2xl bg-slate-100 dark:bg-slate-800"
						/>
					))}
				</div>
			) : items.length === 0 ? (
				<div className="py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-center">
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<Folder className="h-12 w-12 text-slate-300 dark:text-slate-600" />
							</EmptyMedia>
							<EmptyTitle>No attachments found</EmptyTitle>
							<EmptyDescription>
								Upload your first S3 document or image asset to populate your
								media repository.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button
								onClick={() => setUploadDialogOpen(true)}
								size="sm"
								className="mt-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
							>
								<Upload className="mr-2 h-4 w-4" />
								Upload Asset Now
							</Button>
						</EmptyContent>
					</Empty>
				</div>
			) : viewMode === "grid" ? (
				/* Grid Layout View */
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{items.map((attachment) => (
						<AttachmentCard
							key={attachment.id}
							attachment={attachment}
							isSelected={selectedIds.has(attachment.id)}
							onSelect={() => handleToggleSelect(attachment.id)}
							onViewDetails={() => {
								setActiveAttachment(attachment);
								setDetailsSheetOpen(true);
							}}
							onDelete={() => setDeleteTargetId(attachment.id)}
							selectable={true}
						/>
					))}
				</div>
			) : (
				/* Table Layout View */
				<div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
					<Table>
						<TableHeader className="bg-slate-50 dark:bg-slate-800/50">
							<TableRow className="border-slate-200 dark:border-slate-800">
								<TableHead className="w-12 text-center">
									<Checkbox
										checked={
											items.length > 0 && selectedIds.size === items.length
										}
										onCheckedChange={(checked) =>
											handleSelectAll(Boolean(checked))
										}
										className="data-[state=checked]:bg-purple-600 h-4 w-4"
									/>
								</TableHead>
								<TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
									File Name
								</TableHead>
								<TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Category
								</TableHead>
								<TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Size
								</TableHead>
								<TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Access
								</TableHead>
								<TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
									Uploaded
								</TableHead>
								<TableHead className="w-20 text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((attachment) => {
								const FileIconComp = getFileIcon(
									attachment.mimeType,
									attachment.fileName,
								);
								return (
									<TableRow
										key={attachment.id}
										onClick={() => {
											setActiveAttachment(attachment);
											setDetailsSheetOpen(true);
										}}
										className={`cursor-pointer hover:bg-purple-50/30 dark:hover:bg-purple-950/20 border-slate-100 dark:border-slate-800/80 ${
											selectedIds.has(attachment.id)
												? "bg-purple-50/50 dark:bg-purple-950/30"
												: ""
										}`}
									>
										<TableCell
											onClick={(e) => e.stopPropagation()}
											className="text-center"
										>
											<Checkbox
												checked={selectedIds.has(attachment.id)}
												onCheckedChange={() =>
													handleToggleSelect(attachment.id)
												}
												className="data-[state=checked]:bg-purple-600 h-4 w-4"
											/>
										</TableCell>
										<TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200">
											<div className="flex items-center gap-2.5">
												<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
													<FileIconComp className="h-4 w-4" />
												</div>
												<span className="truncate max-w-xs">
													{attachment.fileName}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge
												variant="outline"
												className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getFileCategoryColor(
													attachment.category,
												)}`}
											>
												{attachment.category || "GENERAL"}
											</Badge>
										</TableCell>
										<TableCell className="text-xs text-slate-500">
											{formatBytes(attachment.fileSize)}
										</TableCell>
										<TableCell>
											{attachment.isPublic ? (
												<Badge
													variant="outline"
													className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-200 text-[10px]"
												>
													Public
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]"
												>
													Private
												</Badge>
											)}
										</TableCell>
										<TableCell className="text-xs text-slate-500">
											{new Date(attachment.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell
											onClick={(e) => e.stopPropagation()}
											className="text-right"
										>
											<DropdownMenu>
												<DropdownMenuTrigger
													render={
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
														>
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													}
												/>
												<DropdownMenuContent
													align="end"
													className="w-40 rounded-xl dark:bg-slate-950"
												>
													<DropdownMenuItem
														onClick={() => {
															setActiveAttachment(attachment);
															setDetailsSheetOpen(true);
														}}
													>
														<Eye className="mr-2 h-3.5 w-3.5 text-purple-600" />
														View Details
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleDownloadSingle(attachment)}
													>
														<Download className="mr-2 h-3.5 w-3.5 text-blue-600" />
														Download
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => setDeleteTargetId(attachment.id)}
														className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
													>
														<Trash2 className="mr-2 h-3.5 w-3.5" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Pagination Footer */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2 text-xs text-slate-500">
					<span>
						Page {page} of {totalPages} ({total} items total)
					</span>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							className="h-8 rounded-lg text-xs"
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={page >= totalPages}
							onClick={() => setPage((p) => p + 1)}
							className="h-8 rounded-lg text-xs"
						>
							Next
						</Button>
					</div>
				</div>
			)}

			{/* Direct Upload Dialog */}
			<Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
				<DialogContent className="sm:max-w-xl rounded-3xl p-6 dark:bg-slate-950">
					<DialogHeader>
						<DialogTitle className="text-lg font-bold flex items-center gap-2">
							<Upload className="h-5 w-5 text-purple-600" />
							Upload Assets to S3 Storage
						</DialogTitle>
						<DialogDescription className="text-xs text-slate-500">
							Files uploaded here generate S3 presigned upload URLs and register
							attachment records automatically.
						</DialogDescription>
					</DialogHeader>

					<div className="mt-4">
						<AttachmentDropzone
							onUploadComplete={() => {
								refetch();
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>

			{/* Attachment Details Sheet Drawer */}
			<AttachmentDetailsSheet
				attachment={activeAttachment}
				open={detailsSheetOpen}
				onOpenChange={setDetailsSheetOpen}
			/>

			{/* Single Delete Confirmation Dialog */}
			<AlertDialog
				open={Boolean(deleteTargetId)}
				onOpenChange={(open) => !open && setDeleteTargetId(null)}
			>
				<AlertDialogContent className="rounded-3xl dark:bg-slate-950">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-lg font-bold">
							Delete Attachment?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-xs text-slate-500">
							This action permanently deletes the attachment metadata record.
							This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-4">
						<AlertDialogCancel className="rounded-xl text-xs">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteSingle}
							className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
						>
							Yes, Delete File
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk Delete Confirmation Dialog */}
			<AlertDialog
				open={bulkDeleteConfirmOpen}
				onOpenChange={setBulkDeleteConfirmOpen}
			>
				<AlertDialogContent className="rounded-3xl dark:bg-slate-950">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-lg font-bold">
							Delete {selectedIds.size} Selected Files?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-xs text-slate-500">
							Are you sure you want to delete all {selectedIds.size} selected
							attachment files?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-4">
						<AlertDialogCancel className="rounded-xl text-xs">
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkDelete}
							className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
						>
							Delete Selected
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

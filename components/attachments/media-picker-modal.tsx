"use client";

import * as React from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
	EmptyMedia,
} from "@/components/ui/empty";
import {
	Search,
	Folder,
	Upload,
	Check,
	X,
	FileImage,
	Filter,
	RefreshCw,
} from "lucide-react";
import type { Attachment } from "@/lib/types";
import { useAttachments } from "@/hooks/use-attachments";
import { AttachmentCard, formatBytes } from "./attachment-card";
import { AttachmentDropzone, CATEGORY_OPTIONS } from "./attachment-dropzone";
import { useTranslation } from "@/lib/i18n/context";

interface MediaPickerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (attachments: Attachment[]) => void;
	multiple?: boolean;
	allowedCategory?: string;
	title?: string;
	description?: string;
}

export function MediaPickerModal({
	open,
	onOpenChange,
	onSelect,
	multiple = false,
	allowedCategory,
	title,
	description,
}: MediaPickerModalProps) {
	const { t } = useTranslation();
	const modalTitle = title || t("products.selectMedia");
	const modalDescription = description || t("products.selectMediaDesc");
	const [activeTab, setActiveTab] = React.useState<"library" | "upload">(
		"library",
	);
	const [searchQuery, setSearchQuery] = React.useState("");
	const [selectedCategory, setSelectedCategory] = React.useState<string>(
		allowedCategory || "ALL",
	);
	const [selectedMap, setSelectedMap] = React.useState<Map<string, Attachment>>(
		new Map(),
	);

	// Fetch Attachments query (only when modal is open)
	const {
		data: pageData,
		isLoading,
		isRefetching,
		refetch,
	} = useAttachments(
		{
			category: selectedCategory === "ALL" ? undefined : selectedCategory,
			search: searchQuery.trim() || undefined,
			limit: 30,
		},
		open,
	);

	// Clear selections when modal opens/closes
	React.useEffect(() => {
		if (!open) {
			setSelectedMap(new Map());
			setSearchQuery("");
		}
	}, [open]);

	const handleToggleSelect = (attachment: Attachment) => {
		setSelectedMap((prev) => {
			const next = new Map(prev);
			if (next.has(attachment.id)) {
				next.delete(attachment.id);
			} else {
				if (!multiple) {
					next.clear();
				}
				next.set(attachment.id, attachment);
			}
			return next;
		});
	};

	const handleConfirmSelection = () => {
		const selectedList = Array.from(selectedMap.values());
		onSelect(selectedList);
		onOpenChange(false);
	};

	const handleUploadComplete = (newlyUploaded: Attachment[]) => {
		if (newlyUploaded.length > 0) {
			refetch();
			// Auto-select uploaded files
			setSelectedMap((prev) => {
				const next = multiple ? new Map(prev) : new Map();
				newlyUploaded.forEach((att) => next.set(att.id, att));
				return next;
			});
			// Switch back to library tab
			setActiveTab("library");
		}
	};

	const selectedCount = selectedMap.size;
	const items = pageData?.items || [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] p-0 flex flex-col rounded-3xl overflow-hidden dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
				{/* Header */}
				<DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20">
								<FileImage className="h-5 w-5" />
							</div>
							<div>
								<DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
									{modalTitle}
								</DialogTitle>
								<DialogDescription className="text-xs text-slate-500">
									{modalDescription}
								</DialogDescription>
							</div>
						</div>

						{selectedCount > 0 && (
							<Badge
								variant="secondary"
								className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold text-xs px-3 py-1 rounded-full"
							>
								{selectedCount} {t("common.selected") || "Selected"}
							</Badge>
						)}
					</div>
				</DialogHeader>

				{/* Tab Navigation */}
				<Tabs
					value={activeTab}
					onValueChange={(v) => setActiveTab(v as any)}
					className="flex-1 flex flex-col overflow-hidden"
				>
					<div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between">
						<TabsList className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
							<TabsTrigger
								value="library"
								className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
							>
								<Folder className="mr-2 h-3.5 w-3.5 text-purple-600" />
								{t("products.mediaLibrary")}
							</TabsTrigger>
							<TabsTrigger
								value="upload"
								className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
							>
								<Upload className="mr-2 h-3.5 w-3.5 text-indigo-600" />
								{t("products.uploadNew")}
							</TabsTrigger>
						</TabsList>

						{activeTab === "library" && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => refetch()}
								disabled={isRefetching}
								className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700"
							>
								<RefreshCw
									className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
								/>
							</Button>
						)}
					</div>

					{/* Media Library View */}
					<TabsContent
						value="library"
						className="flex-1 flex flex-col min-h-0 m-0 p-6 space-y-4 overflow-hidden"
					>
						{/* Filter Bar */}
						<div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
							<div className="relative w-full sm:w-72">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
								<Input
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={t("products.searchFileName")}
									className="pl-9 h-9 rounded-xl border-slate-200 dark:border-slate-800 text-xs"
								/>
								{searchQuery && (
									<button
										onClick={() => setSearchQuery("")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							<div className="flex items-center gap-2 w-full sm:w-auto">
								<Filter className="h-3.5 w-3.5 text-slate-400 hidden sm:inline-block" />
								<Select
									value={selectedCategory}
									onValueChange={(val) => val && setSelectedCategory(val)}
								>
									<SelectTrigger className="h-9 w-full sm:w-44 rounded-xl border-slate-200 dark:border-slate-800 text-xs">
										<SelectValue placeholder={t("products.category")} />
									</SelectTrigger>
									<SelectContent className="rounded-xl dark:bg-slate-950">
										<SelectItem value="ALL">
											{t("products.allCategories")}
										</SelectItem>
										{CATEGORY_OPTIONS.map((cat) => (
											<SelectItem key={cat.value} value={cat.value}>
												{cat.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Grid Content */}
						<div className="flex-1 overflow-y-auto pr-1">
							{isLoading ? (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{Array.from({ length: 8 }).map((_, i) => (
										<Skeleton
											key={i}
											className="aspect-[4/3] w-full rounded-2xl bg-slate-100 dark:bg-slate-900"
										/>
									))}
								</div>
							) : items.length === 0 ? (
								<div className="py-12 flex items-center justify-center">
									<Empty>
										<EmptyHeader>
											<EmptyMedia>
												<Folder className="h-10 w-10 text-slate-300" />
											</EmptyMedia>
											<EmptyTitle>
												{t("products.noAttachmentsFound")}
											</EmptyTitle>
											<EmptyDescription>
												{t("products.noAttachmentsDesc")}
											</EmptyDescription>
										</EmptyHeader>
									</Empty>
								</div>
							) : (
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
									{items.map((attachment) => (
										<AttachmentCard
											key={attachment.id}
											attachment={attachment}
											isSelected={selectedMap.has(attachment.id)}
											onSelect={() => handleToggleSelect(attachment)}
											selectable={true}
										/>
									))}
								</div>
							)}
						</div>
					</TabsContent>

					{/* Upload New Tab */}
					<TabsContent
						value="upload"
						className="flex-1 p-6 overflow-y-auto m-0"
					>
						<AttachmentDropzone
							onUploadComplete={handleUploadComplete}
							defaultCategory={
								selectedCategory !== "ALL" ? selectedCategory : "DOCUMENTS"
							}
							multiple={multiple}
						/>
					</TabsContent>
				</Tabs>

				{/* Selected Items Tray & Footer */}
				<DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
					{selectedCount > 0 ? (
						<div className="flex items-center gap-2 overflow-x-auto max-w-md py-1">
							{Array.from(selectedMap.values()).map((item) => (
								<Badge
									key={item.id}
									variant="secondary"
									className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs px-2.5 py-1 rounded-lg"
								>
									<span className="truncate max-w-[120px]">
										{item.fileName}
									</span>
									<button
										onClick={() => handleToggleSelect(item)}
										className="text-slate-400 hover:text-red-500 ml-1"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					) : (
						<span className="text-xs text-slate-400">
							{multiple
								? "Select one or more items from the library"
								: "Select an asset to attach"}
						</span>
					)}

					<div className="flex items-center gap-2 w-full sm:w-auto">
						{selectedCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedMap(new Map())}
								className="text-xs text-slate-500 hover:text-slate-700"
							>
								{t("common.reset") || "Clear"}
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
							className="rounded-xl text-xs"
						>
							{t("common.cancel")}
						</Button>
						<Button
							onClick={handleConfirmSelection}
							disabled={selectedCount === 0}
							size="sm"
							className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium shadow-md shadow-purple-600/20 text-xs px-5"
						>
							<Check className="mr-1.5 h-3.5 w-3.5" />
							{t("products.useSelected")} ({selectedCount})
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

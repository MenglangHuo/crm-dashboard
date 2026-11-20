"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortableList } from "@/hooks/use-sortable-list";
import { DEFAULT_IMAGE_URL, safeImageUrl } from "@/lib/api/endpoints";
import { useTranslation } from "@/lib/i18n/context";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsDownUp,
	ChevronsUpDown,
	FolderPlus,
	GripVertical,
	Layers,
	Loader2,
	Pencil,
	Plus,
	Tags,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

interface CategoryGridViewProps {
	categories: Category[];
	categoryMap: Map<string, string>;
	isLoading: boolean;
	isReordering: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canCreate: boolean;
	reorderDisabledReason?: string;
	pageOffset: number;
	onOpenCreate: (parentId?: string | number) => void;
	onOpenEdit: (category: Category) => void;
	onDelete: (id: string | number) => void;
	onReorderParents: (reordered: Category[]) => void;
	onReorderChildren: (parent: Category, reorderedChildren: Category[]) => void;
}

function getCategoryActive(cat: Category): boolean {
	return cat.status
		? cat.status.toLowerCase() === "active"
		: (cat.isActive ?? true);
}

function sortChildrenByOrder(children?: Category[]): Category[] {
	if (!Array.isArray(children) || children.length === 0) return [];
	return [...children].sort(
		(a, b) =>
			(a.sortOrder ?? 0) - (b.sortOrder ?? 0) || Number(a.id) - Number(b.id),
	);
}

interface SubcategorySortableListProps {
	parent: Category;
	childrenItems: Category[];
	canReorder: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	onEdit: (cat: Category) => void;
	onDelete: (id: string | number) => void;
	onReorder: (reordered: Category[]) => void;
}

function SubcategorySortableList({
	parent,
	childrenItems,
	canReorder,
	canUpdate,
	canDelete,
	onEdit,
	onDelete,
	onReorder,
}: SubcategorySortableListProps) {
	const { t } = useTranslation();
	const accentColor = parent.color || "#6366f1";

	const sortable = useSortableList<Category>({
		items: childrenItems,
		getId: (c) => c.id,
		getLabel: (c) => c.name,
		disabled: !canReorder,
		axis: "vertical",
		onReorder: (reordered) => onReorder(reordered),
	});

	return (
		<div className="relative pl-3 space-y-1.5">
			{/* Subtle vertical tree rail */}
			<span
				aria-hidden="true"
				className="absolute left-1 top-1 bottom-1 w-0.5 rounded-full opacity-45"
				style={{ backgroundColor: accentColor }}
			/>

			<p role="status" className="sr-only">
				{sortable.statusMessage}
			</p>

			<div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5 custom-scrollbar">
				{sortable.displayedItems.map((child, idx) => {
					const idStr = String(child.id);
					const isChildActive = getCategoryActive(child);
					const childImg = child.logoUrl || child.imageUrl;
					const isDragged =
						sortable.draggedId === idStr && sortable.isDragging;
					const isOver = sortable.overId === idStr;
					const isGrabbed = sortable.keyboardGrabbedId === idStr;

					return (
						<article
							key={child.id}
							ref={sortable.registerItemRef(child.id)}
							style={
								isDragged
									? {
											transform: `translate3d(${sortable.dragOffset.x}px, ${sortable.dragOffset.y}px, 0) scale(1.02)`,
										}
									: undefined
							}
							className={cn(
								"sortable-card group/sub relative flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 transition-all duration-150",
								"bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800/90",
								"hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs",
								isDragged &&
									"z-30 shadow-lg ring-2 ring-primary/40 opacity-95 pointer-events-none",
								isOver &&
									"ring-2 ring-primary border-primary/60 bg-primary/[0.04] dark:bg-primary/10",
								isGrabbed &&
									"ring-2 ring-primary shadow-md bg-primary/[0.04] dark:bg-primary/10",
							)}
						>
							<div className="flex items-center gap-2 min-w-0 flex-1">
								{canReorder && childrenItems.length > 1 && (
									<button
										type="button"
										ref={sortable.registerHandleRef(child.id)}
										onPointerDown={sortable.handlePointerDown(child, idx)}
										onKeyDown={sortable.handleKeyDownOnHandle(child)}
										onBlur={sortable.handleBlurOnHandle(child)}
										aria-label={`Reorder subcategory ${child.name}. Position ${idx + 1} of ${childrenItems.length}`}
										aria-pressed={isGrabbed}
										title="Drag or press Space to reorder"
										className={cn(
											"sortable-drag-handle shrink-0 flex h-6 w-5 items-center justify-center rounded-md text-slate-400 transition-colors",
											"hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200",
											"focus-visible:bg-primary/10 focus-visible:text-primary",
											isGrabbed && "bg-primary/15 text-primary",
										)}
									>
										<GripVertical className="h-3.5 w-3.5" />
									</button>
								)}

								{/* Mini Avatar / Color Initial */}
								<div className="relative h-7 w-7 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950 overflow-hidden flex items-center justify-center shrink-0">
									{childImg ? (
										<img
											src={safeImageUrl(childImg)}
											alt={child.name}
											className="h-full w-full object-contain p-0.5"
											onError={(e) => {
												e.currentTarget.onerror = null;
												e.currentTarget.src = DEFAULT_IMAGE_URL;
											}}
										/>
									) : (
										<span
											className="h-full w-full flex items-center justify-center text-[10px] font-bold text-white"
											style={{
												backgroundColor: child.color || accentColor,
											}}
										>
											{child.name.slice(0, 2).toUpperCase()}
										</span>
									)}
								</div>

								{/* Name + Sort Pill */}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={() => onEdit(child)}
											className="text-left text-xs font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-primary transition-colors cursor-pointer"
											title={child.name}
										>
											{child.name}
										</button>
										<span
											className={cn(
												"h-1.5 w-1.5 rounded-full shrink-0",
												isChildActive
													? "bg-emerald-500"
													: "bg-slate-300 dark:bg-slate-600",
											)}
											title={isChildActive ? "Active" : "Inactive"}
										/>
									</div>
									<div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono leading-tight">
										<span>#{child.sortOrder ?? idx + 1}</span>
										{child.description && (
											<>
												<span>·</span>
												<span className="truncate font-sans">
													{child.description}
												</span>
											</>
										)}
									</div>
								</div>
							</div>

							{/* Subcategory Quick Actions */}
							<div className="flex items-center gap-0.5 shrink-0">
								{canReorder && childrenItems.length > 1 && (
									<div className="hidden sm:flex items-center opacity-0 group-hover/sub:opacity-100 focus-within:opacity-100 transition-opacity">
										<button
											type="button"
											disabled={idx === 0}
											onClick={(e) => {
												e.stopPropagation();
												sortable.moveItemBy(idx, -1);
											}}
											aria-label={`Move ${child.name} up`}
											title="Move up"
											className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
										>
											<ArrowUp className="h-3 w-3" />
										</button>
										<button
											type="button"
											disabled={idx === childrenItems.length - 1}
											onClick={(e) => {
												e.stopPropagation();
												sortable.moveItemBy(idx, 1);
											}}
											aria-label={`Move ${child.name} down`}
											title="Move down"
											className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
										>
											<ArrowDown className="h-3 w-3" />
										</button>
									</div>
								)}
								{canUpdate && (
									<button
										type="button"
										onClick={() => onEdit(child)}
										className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
										title={t("common.edit")}
									>
										<Pencil className="h-3 w-3" />
									</button>
								)}
								{canDelete && (
									<button
										type="button"
										onClick={() => onDelete(child.id)}
										className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
										title={t("common.delete")}
									>
										<Trash2 className="h-3 w-3" />
									</button>
								)}
							</div>
						</article>
					);
				})}
			</div>
		</div>
	);
}

export function CategoryGridView({
	categories,
	categoryMap,
	isLoading,
	isReordering,
	canUpdate,
	canDelete,
	canCreate,
	reorderDisabledReason,
	pageOffset,
	onOpenCreate,
	onOpenEdit,
	onDelete,
	onReorderParents,
	onReorderChildren,
}: CategoryGridViewProps) {
	const { t } = useTranslation();
	const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(
		() => new Set(),
	);

	const canReorder = canUpdate && !reorderDisabledReason && !isReordering;

	const parentIdsWithChildren = useMemo(
		() =>
			categories
				.filter((c) => Array.isArray(c.children) && c.children.length > 0)
				.map((c) => String(c.id)),
		[categories],
	);

	const allExpanded =
		parentIdsWithChildren.length > 0 &&
		parentIdsWithChildren.every((id) => expandedCardIds.has(id));

	const toggleExpandAll = () => {
		if (allExpanded) {
			setExpandedCardIds(new Set());
		} else {
			setExpandedCardIds(new Set(parentIdsWithChildren));
		}
	};

	const toggleCard = (id: string | number) => {
		const key = String(id);
		setExpandedCardIds((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};

	const sortable = useSortableList<Category>({
		items: categories,
		getId: (c) => c.id,
		getLabel: (c) => c.name,
		disabled: !canReorder,
		axis: "grid",
		onReorder: (reordered) => onReorderParents(reordered),
	});

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="h-60 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (categories.length === 0) {
		return (
			<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
				<div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
					<Tags className="h-7 w-7 text-slate-400" />
				</div>
				<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
					{t("products.noCategoriesFound")}
				</h4>
				<p className="text-xs text-slate-500 max-w-xs mx-auto">
					{t("products.createCategoryDesc")}
				</p>
				{canCreate && (
					<Button
						onClick={() => onOpenCreate()}
						className="gap-2 text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						{t("products.addCategory")}
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Polite live region for screen-reader reorder announcements */}
			<p role="status" className="sr-only">
				{sortable.statusMessage}
			</p>

			{/* Subtle Reorder & Hierarchy Helper Strip */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-1">
				<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
					{isReordering ? (
						<span className="inline-flex items-center gap-1.5 font-medium text-primary">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Saving sort order…
						</span>
					) : reorderDisabledReason ? (
						<span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
							<GripVertical className="h-3.5 w-3.5 opacity-60" />
							{reorderDisabledReason}
						</span>
					) : canUpdate && categories.length > 1 ? (
						<span className="inline-flex items-center gap-1.5">
							<GripVertical className="h-3.5 w-3.5 text-slate-400" />
							Drag handle or use arrows to reorder parent &amp; subcategories
						</span>
					) : null}
				</div>

				{parentIdsWithChildren.length > 0 && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={toggleExpandAll}
						className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-primary rounded-lg gap-1.5"
					>
						{allExpanded ? (
							<>
								<ChevronsDownUp className="h-3.5 w-3.5" />
								Collapse subcategories
							</>
						) : (
							<>
								<ChevronsUpDown className="h-3.5 w-3.5" />
								Expand all subcategories ({parentIdsWithChildren.length})
							</>
						)}
					</Button>
				)}
			</div>

			{/* Responsive Category Cards Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
				{sortable.displayedItems.map((cat, index) => {
					const idStr = String(cat.id);
					const img = cat.logoUrl || cat.imageUrl;
					const accentColor = cat.color || "#3b82f6";
					const isCatActive = getCategoryActive(cat);
					const sortedChildren = sortChildrenByOrder(cat.children);
					const hasChildren = sortedChildren.length > 0;
					const isExpanded = expandedCardIds.has(idStr);

					const isDragged =
						sortable.draggedId === idStr && sortable.isDragging;
					const isOver = sortable.overId === idStr;
					const isGrabbed = sortable.keyboardGrabbedId === idStr;

					return (
						<article
							key={cat.id}
							ref={sortable.registerItemRef(cat.id)}
							style={
								isDragged
									? {
											transform: `translate3d(${sortable.dragOffset.x}px, ${sortable.dragOffset.y}px, 0) scale(1.02)`,
										}
									: undefined
							}
							className={cn(
								"sortable-card group relative flex flex-col rounded-2xl border overflow-hidden transition-all duration-200",
								"bg-white dark:bg-slate-900/85 border-slate-200/85 dark:border-slate-800/90 shadow-2xs",
								"hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
								isDragged &&
									"z-40 shadow-xl ring-2 ring-primary/50 opacity-95 pointer-events-none",
								isOver &&
									"ring-2 ring-primary border-primary bg-primary/[0.03] dark:bg-primary/10 scale-[0.99]",
								isGrabbed &&
									"ring-2 ring-primary shadow-lg bg-primary/[0.03] dark:bg-primary/10",
							)}
						>
							{/* Top Accent Bar */}
							<div
								aria-hidden="true"
								className="h-1 w-full shrink-0"
								style={{
									background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
								}}
							/>

							<div className="sortable-card-inner p-4 flex flex-col gap-3.5 flex-1">
								{/* Header: Drag Handle + Logo + Title & Metadata */}
								<header className="flex items-start gap-3">
									{/* Drag Handle */}
									{canReorder && categories.length > 1 && (
										<button
											type="button"
											ref={sortable.registerHandleRef(cat.id)}
											onPointerDown={sortable.handlePointerDown(cat, index)}
											onKeyDown={sortable.handleKeyDownOnHandle(cat)}
											onBlur={sortable.handleBlurOnHandle(cat)}
											aria-label={`Reorder category ${cat.name}. Position ${index + 1} of ${categories.length}`}
											aria-pressed={isGrabbed}
											title="Drag or press Space to reorder"
											className={cn(
												"sortable-drag-handle -ml-1 mt-0.5 flex h-8 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors",
												"hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200",
												"focus-visible:bg-primary/10 focus-visible:text-primary",
												isGrabbed && "bg-primary/15 text-primary",
											)}
										>
											<GripVertical className="h-4 w-4" />
										</button>
									)}

									{/* Crisp Logo / Icon Tile */}
									<div
										className="relative h-12 w-12 rounded-xl border border-slate-200/70 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs"
										style={{
											backgroundColor: img
												? undefined
												: `${accentColor}16`,
										}}
									>
										{img ? (
											<img
												src={safeImageUrl(img)}
												alt={cat.name}
												className="h-full w-full object-contain p-1.5 bg-slate-50 dark:bg-slate-950/60 group-hover:scale-105 transition-transform duration-300"
												onError={(e) => {
													e.currentTarget.onerror = null;
													e.currentTarget.src = DEFAULT_IMAGE_URL;
												}}
											/>
										) : (
											<Tags
												className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
												style={{ color: accentColor }}
											/>
										)}
									</div>

									{/* Title + Status + Sort Pill */}
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex items-start justify-between gap-2">
											<h4 className="min-w-0 flex-1">
												<button
													type="button"
													onClick={() => onOpenEdit(cat)}
													title={cat.name}
													className="text-left font-bold text-sm leading-snug text-slate-900 dark:text-slate-100 truncate block w-full hover:text-primary transition-colors cursor-pointer"
												>
													{cat.name}
												</button>
											</h4>
											<Badge
												variant="secondary"
												className="text-[10px] font-mono font-bold px-1.5 py-0 h-5 shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
												title="Sort order"
											>
												#{cat.sortOrder ?? pageOffset + index + 1}
											</Badge>
										</div>

										<div className="flex items-center gap-2 flex-wrap">
											<span
												className={cn(
													"inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
													isCatActive
														? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
														: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
												)}
											>
												<span
													className={cn(
														"h-1.5 w-1.5 rounded-full",
														isCatActive
															? "bg-emerald-500"
															: "bg-slate-400",
													)}
												/>
												{isCatActive ? "Active" : "Inactive"}
											</span>

											<span className="text-[10px] text-slate-400 font-medium truncate">
												{cat.parentId &&
												categoryMap.has(String(cat.parentId))
													? `${t("products.subcategoryOf")}: ${categoryMap.get(String(cat.parentId))}`
													: t("products.topLevelRoot")}
											</span>
										</div>
									</div>
								</header>

								{/* Keyboard Grab Hint */}
								{isGrabbed && (
									<div
										aria-hidden="true"
										className="text-[11px] font-medium text-primary bg-primary/10 rounded-lg px-2.5 py-1 text-center"
									>
										Arrows to move · Space to drop · Esc to cancel
									</div>
								)}

								{/* Description */}
								{cat.description && (
									<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
										{cat.description}
									</p>
								)}

								{/* Subcategories Hierarchy Panel */}
								<div className="rounded-xl bg-slate-50/75 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80 p-2.5 space-y-2">
									{hasChildren ? (
										<>
											<div className="flex items-center justify-between gap-2">
												<button
													type="button"
													onClick={() => toggleCard(cat.id)}
													aria-expanded={isExpanded}
													className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors cursor-pointer min-w-0"
												>
													<Layers
														className="h-3.5 w-3.5 shrink-0"
														style={{ color: accentColor }}
													/>
													<span className="truncate">
														{t("products.subcategories")}
													</span>
													<span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
														{sortedChildren.length}
													</span>
													<ChevronDown
														className={cn(
															"h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
															isExpanded && "rotate-180 text-primary",
														)}
													/>
												</button>

												{canCreate && (
													<button
														type="button"
														onClick={() => onOpenCreate(cat.id)}
														className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary hover:bg-primary/10 px-1.5 py-0.5 rounded-md transition-colors shrink-0 cursor-pointer"
														title="Add subcategory"
													>
														<Plus className="h-3 w-3" />
														<span>Sub</span>
													</button>
												)}
											</div>

											{/* Collapsed Preview Chips */}
											{!isExpanded && (
												<div className="flex flex-wrap gap-1.5 pt-0.5">
													{sortedChildren.slice(0, 3).map((child) => (
														<button
															key={child.id}
															type="button"
															onClick={() => onOpenEdit(child)}
															className="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
															title={child.name}
														>
															<span
																className="h-1.5 w-1.5 rounded-full shrink-0"
																style={{
																	backgroundColor:
																		child.color || accentColor,
																}}
															/>
															<span className="truncate max-w-[100px]">
																{child.name}
															</span>
														</button>
													))}
													{sortedChildren.length > 3 && (
														<button
															type="button"
															onClick={() => toggleCard(cat.id)}
															className="inline-flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
														>
															+{sortedChildren.length - 3} more
														</button>
													)}
												</div>
											)}

											{/* Expanded Sortable Subcategory Cards */}
											{isExpanded && (
												<SubcategorySortableList
													parent={cat}
													childrenItems={sortedChildren}
													canReorder={canReorder}
													canUpdate={canUpdate}
													canDelete={canDelete}
													onEdit={onOpenEdit}
													onDelete={onDelete}
													onReorder={(reordered) =>
														onReorderChildren(cat, reordered)
													}
												/>
											)}
										</>
									) : (
										<div className="flex items-center justify-between gap-2">
											<span className="text-[11px] text-slate-400">
												No subcategories yet
											</span>
											{canCreate && (
												<button
													type="button"
													onClick={() => onOpenCreate(cat.id)}
													className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
												>
													<FolderPlus className="h-3 w-3" />
													<span>Add sub</span>
												</button>
											)}
										</div>
									)}
								</div>

								{/* Footer: Quick Move Controls + CRUD Actions */}
								<footer className="pt-2.5 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
									<div className="flex items-center gap-1">
										{canReorder && categories.length > 1 ? (
											<div className="flex items-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-0.5">
												<button
													type="button"
													disabled={index === 0}
													onClick={() => sortable.moveItemBy(index, -1)}
													aria-label={`Move ${cat.name} earlier`}
													title="Move earlier"
													className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
												>
													<ChevronLeft className="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													disabled={index === categories.length - 1}
													onClick={() => sortable.moveItemBy(index, 1)}
													aria-label={`Move ${cat.name} later`}
													title="Move later"
													className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
												>
													<ChevronRight className="h-3.5 w-3.5" />
												</button>
											</div>
										) : (
											<span className="text-[10px] font-mono text-slate-400">
												ID #{cat.id}
											</span>
										)}
									</div>

									<div className="flex items-center gap-1">
										{canUpdate && (
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onOpenEdit(cat)}
												className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10"
												title={t("common.edit")}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
										)}
										{canDelete && (
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onDelete(cat.id)}
												className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
												title={t("common.delete")}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										)}
									</div>
								</footer>
							</div>
						</article>
					);
				})}
			</div>
		</div>
	);
}

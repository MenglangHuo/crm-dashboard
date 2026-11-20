"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSortableList } from "@/hooks/use-sortable-list";
import { DEFAULT_IMAGE_URL, safeImageUrl } from "@/lib/api/endpoints";
import { useTranslation } from "@/lib/i18n/context";
import type { Brand } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
	Bookmark,
	ChevronLeft,
	ChevronRight,
	GripVertical,
	Loader2,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";

interface BrandGridViewProps {
	brands: Brand[];
	isLoading: boolean;
	isReordering: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canCreate: boolean;
	reorderDisabledReason?: string;
	pageOffset: number;
	onOpenCreate: () => void;
	onOpenEdit: (brand: Brand) => void;
	onDelete: (id: string | number) => void;
	onReorder: (reordered: Brand[]) => void;
}

function getBrandActive(brand: Brand): boolean {
	return brand.status
		? brand.status.toLowerCase() === "active"
		: (brand.isActive ?? true);
}

export function BrandGridView({
	brands,
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
	onReorder,
}: BrandGridViewProps) {
	const { t } = useTranslation();
	const canReorder = canUpdate && !reorderDisabledReason && !isReordering;

	const sortable = useSortableList<Brand>({
		items: brands,
		getId: (b) => b.id,
		getLabel: (b) => b.name,
		disabled: !canReorder,
		axis: "grid",
		onReorder: (reordered) => onReorder(reordered),
	});

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="h-56 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse"
					/>
				))}
			</div>
		);
	}

	if (brands.length === 0) {
		return (
			<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
				<div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
					<Bookmark className="h-7 w-7 text-slate-400" />
				</div>
				<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
					{t("products.noBrandsFound")}
				</h4>
				<p className="text-xs text-slate-500 max-w-xs mx-auto">
					{t("products.createBrandDesc")}
				</p>
				{canCreate && (
					<Button
						onClick={onOpenCreate}
						className="gap-2 text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						{t("products.addBrand")}
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

			{/* Subtle Reorder Helper Strip */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-1">
				<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
					{isReordering ? (
						<span className="inline-flex items-center gap-1.5 font-medium text-primary">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Saving brand sort order…
						</span>
					) : reorderDisabledReason ? (
						<span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
							<GripVertical className="h-3.5 w-3.5 opacity-60" />
							{reorderDisabledReason}
						</span>
					) : canUpdate && brands.length > 1 ? (
						<span className="inline-flex items-center gap-1.5">
							<GripVertical className="h-3.5 w-3.5 text-slate-400" />
							Drag handle or use arrows to reorder brands
						</span>
					) : null}
				</div>
			</div>

			{/* Responsive Brand Cards Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{sortable.displayedItems.map((brand, index) => {
					const idStr = String(brand.id);
					const logo = brand.logoUrl || (brand as any).imageUrl;
					const isBrandActive = getBrandActive(brand);

					const isDragged =
						sortable.draggedId === idStr && sortable.isDragging;
					const isOver = sortable.overId === idStr;
					const isGrabbed = sortable.keyboardGrabbedId === idStr;

					return (
						<article
							key={brand.id}
							ref={sortable.registerItemRef(brand.id)}
							style={
								isDragged
									? {
											transform: `translate3d(${sortable.dragOffset.x}px, ${sortable.dragOffset.y}px, 0) scale(1.02)`,
										}
									: undefined
							}
							className={cn(
								"sortable-card group relative flex flex-col justify-between rounded-2xl border overflow-hidden transition-all duration-200",
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
							<div className="sortable-card-inner p-4 flex flex-col gap-3 flex-1">
								{/* Top Row: Drag Handle + Sort Order + Status */}
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-1.5">
										{canReorder && brands.length > 1 && (
											<button
												type="button"
												ref={sortable.registerHandleRef(brand.id)}
												onPointerDown={sortable.handlePointerDown(brand, index)}
												onKeyDown={sortable.handleKeyDownOnHandle(brand)}
												onBlur={sortable.handleBlurOnHandle(brand)}
												aria-label={`Reorder brand ${brand.name}. Position ${index + 1} of ${brands.length}`}
												aria-pressed={isGrabbed}
												title="Drag or press Space to reorder"
												className={cn(
													"sortable-drag-handle -ml-1 flex h-7 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors",
													"hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200",
													"focus-visible:bg-primary/10 focus-visible:text-primary",
													isGrabbed && "bg-primary/15 text-primary",
												)}
											>
												<GripVertical className="h-4 w-4" />
											</button>
										)}
										<Badge
											variant="secondary"
											className="text-[10px] font-mono font-bold px-1.5 py-0 h-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
											title="Sort order"
										>
											#{brand.sortOrder ?? pageOffset + index + 1}
										</Badge>
									</div>

									<span
										className={cn(
											"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
											isBrandActive
												? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
												: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
										)}
									>
										<span
											className={cn(
												"h-1.5 w-1.5 rounded-full",
												isBrandActive ? "bg-emerald-500" : "bg-slate-400",
											)}
										/>
										{isBrandActive ? "Active" : "Inactive"}
									</span>
								</div>

								{/* Logo Showcase */}
								<div className="relative h-28 w-full rounded-xl bg-slate-50/90 dark:bg-slate-950/60 overflow-hidden border border-slate-100 dark:border-slate-800/80 flex items-center justify-center p-3">
									{logo ? (
										<img
											src={safeImageUrl(logo)}
											alt={brand.name}
											className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
											onError={(e) => {
												e.currentTarget.onerror = null;
												e.currentTarget.src = DEFAULT_IMAGE_URL;
											}}
										/>
									) : (
										<div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
											<Bookmark className="size-7" />
										</div>
									)}
								</div>

								{/* Keyboard Grab Hint */}
								{isGrabbed && (
									<div
										aria-hidden="true"
										className="text-[11px] font-medium text-primary bg-primary/10 rounded-lg px-2.5 py-1 text-center"
									>
										Arrows to move · Space to drop · Esc to cancel
									</div>
								)}

								{/* Brand Name & Description */}
								<div className="space-y-1">
									<div className="flex items-center justify-between gap-2">
										<h4 className="min-w-0 flex-1">
											<button
												type="button"
												onClick={() => onOpenEdit(brand)}
												title={brand.name}
												className="text-left font-bold text-sm text-slate-900 dark:text-slate-100 truncate block w-full hover:text-primary transition-colors cursor-pointer"
											>
												{brand.name}
											</button>
										</h4>
										<span className="text-[10px] font-mono text-slate-400 shrink-0">
											ID #{brand.id}
										</span>
									</div>
									{brand.description && (
										<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
											{brand.description}
										</p>
									)}
								</div>

								{/* Footer: Quick Move Controls + CRUD Actions */}
								<footer className="pt-2.5 mt-auto border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
									<div>
										{canReorder && brands.length > 1 ? (
											<div className="flex items-center rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-0.5">
												<button
													type="button"
													disabled={index === 0}
													onClick={() => sortable.moveItemBy(index, -1)}
													aria-label={`Move ${brand.name} earlier`}
													title="Move earlier"
													className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
												>
													<ChevronLeft className="h-3.5 w-3.5" />
												</button>
												<button
													type="button"
													disabled={index === brands.length - 1}
													onClick={() => sortable.moveItemBy(index, 1)}
													aria-label={`Move ${brand.name} later`}
													title="Move later"
													className="h-6 w-6 rounded-md flex items-center justify-center text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
												>
													<ChevronRight className="h-3.5 w-3.5" />
												</button>
											</div>
										) : null}
									</div>

									<div className="flex items-center gap-1">
										{canUpdate && (
											<Button
												size="sm"
												variant="ghost"
												onClick={() => onOpenEdit(brand)}
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
												onClick={() => onDelete(brand.id)}
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

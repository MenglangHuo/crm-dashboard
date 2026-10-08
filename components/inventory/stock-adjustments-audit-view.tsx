"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { stockAdjustmentsApi } from "@/lib/api/endpoints";
import { StockAdjustmentAudit, StockAdjustmentItem } from "@/lib/types";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { DynamicFilterModal } from "@/components/ui-custom/data-table/dynamic-filter-modal";
import { STOCK_ADJUSTMENT_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import { FilterCriterion } from "@/components/ui-custom/data-table/search-filter-types";
import {
	History,
	Search,
	RefreshCw,
	SlidersHorizontal,
	User,
	Calendar,
	FileText,
	Boxes,
	ChevronDown,
	ChevronRight,
	Code,
	X,
	CheckCircle2,
	AlertCircle,
	ArrowDownLeft,
	ArrowUpRight,
	Building2,
	Copy,
	Check,
	Eye,
	Clock,
	RotateCcw,
	Layers,
	Tag,
	Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

export function StockAdjustmentsAuditView() {
	const { t } = useTranslation();

	// Search & Pagination
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	// Dynamic Filter Modal State (with full operator controls)
	const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>([]);
	const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

	// Expanded Rows State
	const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);

	// Inspect Modal State (for full details / raw JSON)
	const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustmentAudit | null>(null);
	const [showRawJsonModal, setShowRawJsonModal] = useState<StockAdjustmentAudit | null>(null);

	// Copy UUID State
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const handleCopy = useCallback((text: string) => {
		if (!navigator?.clipboard) return;
		navigator.clipboard.writeText(text);
		setCopiedId(text);
		toast.success("Adjustment ID copied to clipboard");
		setTimeout(() => setCopiedId(null), 2000);
	}, []);

	// Construct backend search request payload with full operator criteria
	const searchPayload = useMemo(() => {
		const criteria: FilterCriterion[] = [];

		// Quick search input: searches adjustedBy (auditor username)
		if (search.trim()) {
			const hasAuditorFilter = activeFilters.some(
				(f) => f.field === "adjustedBy",
			);
			if (!hasAuditorFilter) {
				criteria.push({
					field: "adjustedBy",
					operator: "LIKE",
					value: search.trim(),
				});
			}
		}

		// Active dynamic filters from DynamicFilterModal (including operator selection)
		if (activeFilters && activeFilters.length > 0) {
			activeFilters.forEach((f) => {
				if (f.field === "search" && search.trim()) return;

				if (f.operator === "BETWEEN") {
					criteria.push({
						field: f.field,
						operator: f.operator,
						value: f.value,
						valueTo: f.valueTo,
					});
				} else if (f.operator === "IN" || f.operator === "NOT_IN") {
					criteria.push({
						field: f.field,
						operator: f.operator,
						values: f.values,
						value: f.values?.[0],
					});
				} else {
					criteria.push({
						field: f.field,
						operator: f.operator,
						value: f.value,
					});
				}
			});
		}

		return {
			page: Math.max(0, page - 1),
			size: pageSize,
			sort: [{ field: "adjustedAt", direction: "DESC" }],
			filterGroup: {
				logicalOperator: "AND",
				criteria,
			},
		};
	}, [search, activeFilters, page, pageSize]);

	// Fetch stock adjustments data
	const { data, isLoading, isFetching, refetch } = useQuery({
		queryKey: ["stock-adjustments-search", searchPayload, page, pageSize],
		queryFn: () => stockAdjustmentsApi.search(searchPayload),
	});

	const items: StockAdjustmentAudit[] = data?.items || [];
	const totalElements = data?.total || 0;

	// Toggle row expansion
	const toggleRowExpand = useCallback((rowId: string) => {
		setExpandedRowIds((prev) =>
			prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId],
		);
	}, []);

	// Table columns configuration
	const columns = useMemo<ColumnDef<StockAdjustmentAudit>[]>(
		() => [
			{
				id: "expand",
				header: "",
				width: 44,
				cell: ({ row }: { row: StockAdjustmentAudit }) => {
					const rowId = row.id || "";
					const isExpanded = expandedRowIds.includes(rowId);

					return (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								toggleRowExpand(rowId);
							}}
							className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
							title={isExpanded ? "Collapse item breakdown" : "Expand item breakdown"}
						>
							{isExpanded ? (
								<ChevronDown className="size-4 text-primary" />
							) : (
								<ChevronRight className="size-4" />
							)}
						</button>
					);
				},
			},
			{
				id: "adjustedAt",
				header: "Date & Time",
				render: (row: StockAdjustmentAudit) => {
					const rawDate = row.adjustedAt || row.createdAt;
					if (!rawDate) return <span className="text-muted-foreground">—</span>;

					const dateObj = new Date(rawDate);
					const isValid = !isNaN(dateObj.getTime());

					return (
						<div className="flex flex-col gap-0.5">
							<span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
								<Calendar className="size-3.5 text-slate-400 shrink-0" />
								<span>{isValid ? dateObj.toLocaleDateString() : rawDate}</span>
							</span>
							<span className="text-[11px] text-muted-foreground ml-5 flex items-center gap-1">
								<Clock className="size-3 text-slate-400/80 shrink-0" />
								<span>{isValid ? dateObj.toLocaleTimeString() : ""}</span>
							</span>
						</div>
					);
				},
			},
			{
				id: "warehouseName",
				header: "Warehouse",
				render: (row: StockAdjustmentAudit) => (
					<div className="flex items-center gap-1.5 max-w-[180px]">
						<Building2 className="size-3.5 text-primary/70 shrink-0" />
						<span className="font-medium text-xs text-foreground truncate">
							{row.warehouseName || "Main Warehouse"}
						</span>
					</div>
				),
			},
			{
				id: "adjustedBy",
				header: "Auditor / User",
				render: (row: StockAdjustmentAudit) => {
					const username = row.adjustedBy?.username || row.username || "System";
					const userId = row.adjustedBy?.userId || row.userId;

					return (
						<div className="flex items-center gap-2">
							<div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-semibold text-xs">
								{username ? username.charAt(0).toUpperCase() : <User className="size-3.5" />}
							</div>
							<div className="flex flex-col min-w-0">
								<span className="font-semibold text-xs text-foreground truncate max-w-[150px]">
									{username}
								</span>
								{userId && (
									<span className="text-[10px] text-muted-foreground font-mono">
										ID: {userId}
									</span>
								)}
							</div>
						</div>
					);
				},
			},
			{
				id: "totalQuantityAdjusted",
				header: "Quantity Adjusted",
				render: (row: StockAdjustmentAudit) => {
					const qty = row.totalQuantityAdjusted ?? 0;
					const itemCount = row.totalItems ?? row.items?.length ?? 1;
					const isDecrease = String(row.adjustmentType || "").toUpperCase().includes("DECREASE");

					return (
						<div className="flex flex-col gap-0.5">
							<span
								className={cn(
									"font-mono font-bold text-xs flex items-center gap-1",
									isDecrease ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400",
								)}
							>
								{isDecrease ? `-${qty}` : `+${qty}`} units
							</span>
							<span className="text-[11px] text-muted-foreground">
								across {itemCount} {itemCount === 1 ? "item" : "items"}
							</span>
						</div>
					);
				},
			},
			{
				id: "reason",
				header: "Reason & Notes",
				render: (row: StockAdjustmentAudit) => {
					const primaryReason = row.reason || row.metadata?.reason || "Variance Adjustment";
					const notes = row.notes || row.metadata?.notes;

					return (
						<div className="flex flex-col gap-0.5 max-w-[240px]">
							<span className="font-semibold text-xs text-foreground truncate">
								{primaryReason}
							</span>
							{notes && (
								<span className="text-[11px] text-muted-foreground truncate italic">
									{notes}
								</span>
							)}
						</div>
					);
				},
			},
			{
				id: "status",
				header: "Status",
				render: (row: StockAdjustmentAudit) => {
					const st = (row.status || "SUCCESS").toUpperCase();
					if (st === "SUCCESS") {
						return (
							<Badge
								variant="outline"
								className="text-[10px] font-bold border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1"
							>
								<CheckCircle2 className="size-3" />
								<span>Success</span>
							</Badge>
						);
					}
					if (st === "FAILED" || st === "ERROR") {
						return (
							<Badge
								variant="outline"
								className="text-[10px] font-bold border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 gap-1"
							>
								<AlertCircle className="size-3" />
								<span>Failed</span>
							</Badge>
						);
					}
					return (
						<Badge
							variant="outline"
							className="text-[10px] font-bold border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
						>
							{st}
						</Badge>
					);
				},
			},
			{
				id: "actions",
				header: "",
				width: 80,
				render: (row: StockAdjustmentAudit) => (
					<div className="flex items-center justify-end gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setSelectedAdjustment(row)}
							className="h-7 px-2 text-[11px] gap-1 font-medium text-primary hover:bg-primary/10"
							title="View adjustment details"
						>
							<Eye className="size-3.5" />
							<span>Details</span>
						</Button>
					</div>
				),
			},
		],
		[expandedRowIds, toggleRowExpand],
	);

	// Expandable Row Item Breakdown Renderer (NO heavy image UI)
	const renderSubComponent = useCallback((row: StockAdjustmentAudit) => {
		const itemsList: StockAdjustmentItem[] = row.items || [];

		return (
			<div className="p-4 rounded-xl border border-border/80 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
					<div className="flex items-center gap-2">
						<Boxes className="size-4 text-primary" />
						<span className="font-bold text-xs text-foreground">
							Adjusted Items Breakdown ({itemsList.length} {itemsList.length === 1 ? "item" : "items"})
						</span>
					</div>
					{row.id && (
						<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
							<span>UUID: {row.id}</span>
							<button
								onClick={() => handleCopy(row.id!)}
								className="text-muted-foreground hover:text-foreground p-0.5"
								title="Copy Adjustment UUID"
							>
								{copiedId === row.id ? (
									<Check className="size-3 text-emerald-600" />
								) : (
									<Copy className="size-3" />
								)}
							</button>
						</div>
					)}
				</div>

				{itemsList.length > 0 ? (
					<div className="overflow-x-auto rounded-lg border border-border/70 bg-card">
						<table className="w-full text-left text-xs">
							<thead className="bg-muted/50 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase">
								<tr>
									<th className="py-2.5 px-3">#</th>
									<th className="py-2.5 px-3">Product & Variant</th>
									<th className="py-2.5 px-3">SKU / Barcode</th>
									<th className="py-2.5 px-3 text-right">Adjustment Qty</th>
									<th className="py-2.5 px-3">Unit</th>
									<th className="py-2.5 px-3">Reason / Notes</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/60 font-sans">
								{itemsList.map((item, idx) => {
									const isDec = String(item.adjustmentType || row.adjustmentType || "").toUpperCase().includes("DECREASE");
									const qty = Math.abs(Number(item.adjustmentQuantity || 0));
									return (
										<tr key={idx} className="hover:bg-muted/30 transition-colors">
											<td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
												{idx + 1}
											</td>
											<td className="py-2 px-3">
												<div className="flex flex-col">
													<span className="font-semibold text-foreground text-xs">
														{item.productName || "Product"}
													</span>
													{item.variantName && (
														<span className="text-[11px] text-muted-foreground">
															{item.variantName}
														</span>
													)}
												</div>
											</td>
											<td className="py-2 px-3">
												<div className="flex flex-col gap-0.5">
													{item.sku && (
														<span className="font-mono text-[11px] font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded w-fit">
															{item.sku}
														</span>
													)}
													{item.barcode && (
														<span className="font-mono text-[10px] text-muted-foreground">
															{item.barcode}
														</span>
													)}
												</div>
											</td>
											<td className="py-2 px-3 text-right">
												<span
													className={cn(
														"font-mono font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
														isDec
															? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
															: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
													)}
												>
													{isDec ? <ArrowDownLeft className="size-3 shrink-0" /> : <ArrowUpRight className="size-3 shrink-0" />}
													<span>{isDec ? `-${qty}` : `+${qty}`}</span>
												</span>
											</td>
											<td className="py-2 px-3 text-muted-foreground text-xs font-medium">
												{item.unitName || item.unitSymbol || "—"}
											</td>
											<td className="py-2 px-3">
												<div className="flex flex-col max-w-[200px]">
													<span className="text-foreground text-xs font-medium truncate">
														{item.reason || "Physical count variance"}
													</span>
													{item.notes && (
														<span className="text-[11px] text-muted-foreground italic truncate">
															{item.notes}
														</span>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				) : (
					<div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground flex items-center justify-between">
						<span>No item breakdown returned for this transaction.</span>
						{row.metadata && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowRawJsonModal(row)}
								className="h-6 text-[10px] gap-1"
							>
								<Code className="size-3" />
								<span>View Raw Metadata</span>
							</Button>
						)}
					</div>
				)}
			</div>
		);
	}, [handleCopy, copiedId]);

	return (
		<div className="space-y-3.5">
			{/* Unified Clean Header Toolbar (Replaces old clunky bars shown in screenshot) */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-border bg-card shadow-2xs">
				{/* Search Input */}
				<div className="relative flex-1 min-w-[240px] max-w-md">
					<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					<Input
						placeholder="Search adjustments by auditor, username..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9 pr-8 h-9 text-xs rounded-xl bg-muted/40 border-border focus-visible:ring-primary/30"
					/>
					{search && (
						<button
							onClick={() => {
								setSearch("");
								setPage(1);
							}}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>

				{/* Toolbar Actions: Filter Button & Refresh Button */}
				<div className="flex items-center gap-2 shrink-0">
					<Button
						variant={activeFilters.length > 0 ? "default" : "outline"}
						size="sm"
						onClick={() => setIsFilterModalOpen(true)}
						className={cn(
							"h-9 px-3.5 rounded-xl text-xs font-semibold gap-2 border-border transition-all",
							activeFilters.length > 0 && "bg-primary text-primary-foreground shadow-sm",
						)}
					>
						<SlidersHorizontal className="size-3.5" />
						<span>Filters</span>
						{activeFilters.length > 0 && (
							<Badge
								variant="secondary"
								className="ml-0.5 px-1.5 py-0 h-4 text-[10px] font-bold rounded-full bg-white/20 text-white"
							>
								{activeFilters.length}
							</Badge>
						)}
					</Button>

					<Button
						variant="outline"
						size="icon"
						onClick={() => refetch()}
						disabled={isFetching}
						className="h-9 w-9 rounded-xl border-border hover:bg-muted"
						title="Reload stock adjustments"
					>
						<RefreshCw
							className={cn(
								"size-4 text-muted-foreground",
								isFetching && "animate-spin text-primary",
							)}
						/>
					</Button>
				</div>
			</div>

			{/* Active Filter Chips / Pills Bar */}
			{activeFilters.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 p-2.5 px-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
					<span className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1 mr-1">
						<Filter className="size-3" />
						<span>Active Criteria:</span>
					</span>

					{activeFilters.map((f, i) => {
						const fieldDef = STOCK_ADJUSTMENT_DOMAIN_FILTERS.find(
							(df) => df.field === f.field,
						);
						const label = fieldDef?.label || f.field;

						let displayVal = "";
						if (f.operator === "BETWEEN") {
							const from = f.value ? String(f.value).slice(0, 10) : "Start";
							const to = f.valueTo ? String(f.valueTo).slice(0, 10) : "End";
							displayVal = `${from} → ${to}`;
						} else if (f.values && f.values.length > 0) {
							displayVal = f.values.join(", ");
						} else {
							displayVal = String(f.value ?? "");
						}

						return (
							<Badge
								key={`${f.field}-${f.operator}-${i}`}
								variant="secondary"
								className="gap-1.5 text-[11px] bg-background border border-border text-foreground px-2 py-0.5"
							>
								<span className="font-semibold text-primary">{label}</span>
								<span className="text-[10px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
									{f.operator}
								</span>
								<span className="font-mono text-foreground">{displayVal}</span>
								<X
									className="size-3 cursor-pointer text-muted-foreground hover:text-foreground"
									onClick={() => {
										setActiveFilters((prev) => prev.filter((_, idx) => idx !== i));
										setPage(1);
									}}
								/>
							</Badge>
						);
					})}

					<button
						onClick={() => {
							setActiveFilters([]);
							setPage(1);
						}}
						className="text-[11px] font-semibold text-primary hover:underline ml-auto"
					>
						Clear All
					</button>
				</div>
			)}

			{/* Clean Data Table (hideHeader and hideToolbar suppress the duplicate cluttered bars) */}
			<DataTable<StockAdjustmentAudit>
				data={items}
				columns={columns}
				getRowId={(row, index) => row.id || `adj-${index}`}
				isLoading={isLoading}
				manualPagination={true}
				page={page}
				pageSize={pageSize}
				totalCount={totalElements}
				onPageChange={setPage}
				onPageSizeChange={(newSize: number) => {
					setPageSize(newSize);
					setPage(1);
				}}
				hideHeader={true}
				hideToolbar={true}
				expandedRowIds={expandedRowIds}
				renderSubComponent={renderSubComponent}
			/>

			{/* Dynamic Filter Studio Modal (Submits exact operator criteria request payload) */}
			<DynamicFilterModal
				open={isFilterModalOpen}
				onOpenChange={setIsFilterModalOpen}
				fields={STOCK_ADJUSTMENT_DOMAIN_FILTERS}
				activeFilters={activeFilters}
				onApplyFilters={(filters) => {
					setActiveFilters(filters);
					setPage(1);
				}}
				onResetFilters={() => {
					setActiveFilters([]);
					setPage(1);
				}}
				domainTitle="Stock Adjustments Audit Filter Studio"
				searchValue={search}
			/>

			{/* Full Details Modal */}
			{selectedAdjustment && (() => {
				const adjType = String(selectedAdjustment.adjustmentType || "").toUpperCase();
				const isDec = adjType.includes("DECREASE");
				const isInc = adjType.includes("INCREASE");

				return (
					<ModernModal
						isOpen={Boolean(selectedAdjustment)}
						onClose={() => setSelectedAdjustment(null)}
						title={
							<div className="flex items-center gap-2.5">
								<div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
									<Boxes className="size-4.5" />
								</div>
								<div>
									<span className="text-sm sm:text-base font-bold text-foreground block">
										Stock Adjustment Transaction Details
									</span>
									{selectedAdjustment.id && (
										<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono mt-0.5">
											<span>ID: {selectedAdjustment.id}</span>
											<button
												type="button"
												onClick={() => selectedAdjustment.id && handleCopy(selectedAdjustment.id)}
												className="text-muted-foreground hover:text-foreground inline-flex items-center"
												title="Copy Transaction ID"
											>
												{copiedId === selectedAdjustment.id ? (
													<Check className="size-3 text-emerald-600" />
												) : (
													<Copy className="size-3" />
												)}
											</button>
										</div>
									)}
								</div>
							</div>
						}
						size="xl"
					>
						<div className="space-y-4 py-2 text-xs">
							{/* Enhanced Unified Header Card */}
							<div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3.5">
								{/* Top Row: Warehouse & Status Badges */}
								<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
									<div className="flex items-center gap-3">
										<div className="size-10 rounded-xl bg-background border border-border shadow-2xs flex items-center justify-center text-primary shrink-0">
											<Building2 className="size-5" />
										</div>
										<div>
											<span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
												Warehouse
											</span>
											<span className="text-sm font-bold text-foreground">
												{selectedAdjustment.warehouseName || "Main Warehouse"}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-2 flex-wrap">
										{/* Adjustment Type Badge */}
										<Badge
											variant="outline"
											className={cn(
												"text-xs font-bold gap-1 px-2.5 py-1",
												isDec
													? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
													: isInc
													? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
													: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
											)}
										>
											{isDec ? (
												<ArrowDownLeft className="size-3.5 shrink-0" />
											) : isInc ? (
												<ArrowUpRight className="size-3.5 shrink-0" />
											) : (
												<Tag className="size-3.5 shrink-0" />
											)}
											<span>{selectedAdjustment.adjustmentType || "DECREASE"}</span>
										</Badge>

										{/* Total Quantity Adjusted */}
										<Badge
											variant="outline"
											className="text-xs font-bold gap-1.5 px-2.5 py-1 bg-background border-border text-foreground font-mono"
										>
											<Boxes className="size-3.5 text-primary" />
											<span>{selectedAdjustment.totalQuantityAdjusted ?? 0} units</span>
										</Badge>

										{/* Execution Status Badge */}
										<Badge
											variant="outline"
											className={cn(
												"text-xs font-bold gap-1 px-2.5 py-1",
												selectedAdjustment.status === "SUCCESS"
													? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
													: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
											)}
										>
											{selectedAdjustment.status === "SUCCESS" ? (
												<CheckCircle2 className="size-3.5 shrink-0" />
											) : (
												<AlertCircle className="size-3.5 shrink-0" />
											)}
											<span>{selectedAdjustment.status || "SUCCESS"}</span>
										</Badge>
									</div>
								</div>

								{/* Bottom Row: 4-Column Metadata Grid */}
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
									<div className="space-y-0.5">
										<span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
											<User className="size-3.5 text-muted-foreground/80 shrink-0" />
											<span>Auditor</span>
										</span>
										<p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
											<span>
												{selectedAdjustment.adjustedBy?.username ||
													selectedAdjustment.username ||
													"System"}
											</span>
											{selectedAdjustment.adjustedBy?.userId && (
												<span className="text-[10px] font-mono font-normal text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border/50">
													ID: {selectedAdjustment.adjustedBy.userId}
												</span>
											)}
										</p>
									</div>

									<div className="space-y-0.5">
										<span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
											<Calendar className="size-3.5 text-muted-foreground/80 shrink-0" />
											<span>Date & Time</span>
										</span>
										<p className="font-semibold text-foreground truncate">
											{selectedAdjustment.adjustedAt
												? new Date(selectedAdjustment.adjustedAt).toLocaleString()
												: "—"}
										</p>
									</div>

									<div className="space-y-0.5">
										<span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
											<FileText className="size-3.5 text-muted-foreground/80 shrink-0" />
											<span>Reason</span>
										</span>
										<p className="font-semibold text-foreground truncate">
											{selectedAdjustment.reason || "Physical count variance"}
										</p>
									</div>

									<div className="space-y-0.5">
										<span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
											<Clock className="size-3.5 text-muted-foreground/80 shrink-0" />
											<span>Notes</span>
										</span>
										<p className="text-muted-foreground italic truncate">
											{selectedAdjustment.notes || "—"}
										</p>
									</div>
								</div>
							</div>

							{/* Items Adjusted Section */}
							<div className="space-y-2 pt-1">
								<div className="flex items-center justify-between">
									<span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
										<Layers className="size-3.5 text-primary" />
										<span>Items Adjusted ({selectedAdjustment.items?.length || 0})</span>
									</span>
								</div>

								{selectedAdjustment.items && selectedAdjustment.items.length > 0 ? (
									<div className="overflow-x-auto rounded-xl border border-border">
										<table className="w-full text-left text-xs">
											<thead className="bg-muted/60 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
												<tr>
													<th className="py-2.5 px-3">#</th>
													<th className="py-2.5 px-3">Product Name</th>
													<th className="py-2.5 px-3">Variant</th>
													<th className="py-2.5 px-3">SKU / Barcode</th>
													<th className="py-2.5 px-3 text-right">Adjustment Qty</th>
													<th className="py-2.5 px-3">Unit</th>
													<th className="py-2.5 px-3">Reason / Notes</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border">
												{selectedAdjustment.items.map((item, idx) => {
													const itemType = String(
														item.adjustmentType ||
															selectedAdjustment.adjustmentType ||
															"",
													).toUpperCase();
													const isItemDec = itemType.includes("DECREASE");
													const qty = Math.abs(Number(item.adjustmentQuantity || 0));

													return (
														<tr
															key={idx}
															className="hover:bg-muted/30 transition-colors"
														>
															<td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
																{idx + 1}
															</td>
															<td className="py-2.5 px-3 font-semibold text-foreground">
																{item.productName || "Product"}
															</td>
															<td className="py-2.5 px-3 text-muted-foreground">
																{item.variantName || "—"}
															</td>
															<td className="py-2.5 px-3">
																<div className="flex flex-col gap-0.5">
																	{item.sku && (
																		<span className="font-mono text-[11px] font-medium text-foreground bg-muted/60 px-1.5 py-0.5 rounded w-fit">
																			{item.sku}
																		</span>
																	)}
																	{item.barcode && (
																		<span className="font-mono text-[10px] text-muted-foreground">
																			{item.barcode}
																		</span>
																	)}
																	{!item.sku && !item.barcode && <span>—</span>}
																</div>
															</td>
															<td className="py-2.5 px-3 text-right">
																<span
																	className={cn(
																		"font-mono font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-1",
																		isItemDec
																			? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
																			: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
																	)}
																>
																	{isItemDec ? (
																		<ArrowDownLeft className="size-3 shrink-0" />
																	) : (
																		<ArrowUpRight className="size-3 shrink-0" />
																	)}
																	<span>{isItemDec ? `-${qty}` : `+${qty}`}</span>
																</span>
															</td>
															<td className="py-2.5 px-3 text-muted-foreground font-medium">
																{item.unitName || item.unitSymbol || "—"}
															</td>
															<td className="py-2.5 px-3">
																<div className="flex flex-col max-w-[220px]">
																	<span className="text-foreground text-xs font-medium truncate">
																		{item.reason ||
																			selectedAdjustment.reason ||
																			"Physical count variance"}
																	</span>
																	{item.notes && (
																		<span className="text-[11px] text-muted-foreground italic truncate">
																			{item.notes}
																		</span>
																	)}
																</div>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								) : (
									<p className="text-muted-foreground italic">No item list available.</p>
								)}
							</div>
						</div>

						<ModernModalFooter>
							<ModernModalCancelButton onClick={() => setSelectedAdjustment(null)}>
								Close
							</ModernModalCancelButton>
						</ModernModalFooter>
					</ModernModal>
				);
			})()}

			{/* Raw JSON Inspector Modal */}
			{showRawJsonModal && (
				<ModernModal
					isOpen={Boolean(showRawJsonModal)}
					onClose={() => setShowRawJsonModal(null)}
					title="Raw Audit Payload (JSON)"
					size="lg"
				>
					<div className="py-2">
						<pre className="p-4 rounded-xl border border-border bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed max-h-96 overflow-auto">
							{JSON.stringify(showRawJsonModal, null, 2)}
						</pre>
					</div>
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setShowRawJsonModal(null)}>
							Close
						</ModernModalCancelButton>
					</ModernModalFooter>
				</ModernModal>
			)}
		</div>
	);
}

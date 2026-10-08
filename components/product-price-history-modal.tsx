"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { priceHistoryApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui-custom/data-table";
import { useTranslation } from "@/lib/i18n/context";
import {
	History,
	TrendingUp,
	TrendingDown,
	RefreshCw,
	User,
	Package,
	Layers,
	Search,
	Filter,
	DollarSign,
	Calendar,
	Sparkles,
	ArrowUpRight,
	ArrowDownRight,
	MinusCircle,
	Tag,
} from "lucide-react";

interface ProductPriceHistoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	productId: number | string | null;
	productName?: string;
	productVariants?: any[];
	productUnits?: any[];
}

export function ProductPriceHistoryModal({
	isOpen,
	onClose,
	productId,
	productName,
	productVariants = [],
	productUnits = [],
}: ProductPriceHistoryModalProps) {
	const { t } = useTranslation();
	const [selectedVariantId, setSelectedVariantId] = useState<string>("ALL");
	const [selectedUnitId, setSelectedUnitId] = useState<string>("ALL");
	const [directionFilter, setDirectionFilter] = useState<string>("ALL");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [viewMode, setViewMode] = useState<"timeline" | "matrix">("timeline");

	// Query ERP summary and current snapshots
	const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
		queryKey: ["product-price-history-summary", productId],
		queryFn: () => priceHistoryApi.getProductSummary(productId!),
		enabled: !!productId && isOpen,
	});

	// Query search history list
	const { data: searchData, isLoading: isLoadingSearch } = useQuery({
		queryKey: [
			"product-price-history-search",
			productId,
			selectedVariantId,
			selectedUnitId,
			directionFilter,
			searchQuery,
		],
		queryFn: () =>
			priceHistoryApi.search({
				productId: productId ? Number(productId) : undefined,
				variantId:
					selectedVariantId !== "ALL" ? Number(selectedVariantId) : undefined,
				unitId: selectedUnitId !== "ALL" ? Number(selectedUnitId) : undefined,
				direction: directionFilter !== "ALL" ? directionFilter : undefined,
				search: searchQuery.trim() || undefined,
				size: 100,
			}),
		enabled: !!productId && isOpen,
	});

	const historyItems =
		searchData?.content ||
		searchData?.items ||
		(Array.isArray(searchData) ? searchData : []);

	const renderTrendBadge = (item: any) => {
		const dir = item.changeDirection || "NO_CHANGE";
		const diff = item.priceChange !== undefined ? Number(item.priceChange) : 0;
		const pct =
			item.priceChangePercentage !== undefined
				? Number(item.priceChangePercentage)
				: 0;

		if (dir === "INITIAL" || item.isInitialPrice) {
			return (
				<Badge className="bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 text-[10px] font-bold gap-1">
					<Tag className="h-3 w-3 text-sky-600" /> Base Initial Price
				</Badge>
			);
		}

		if (dir === "INCREASE" || diff > 0) {
			return (
				<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 text-[10px] font-bold gap-1">
					<TrendingUp className="h-3 w-3 text-emerald-600" /> +$
					{diff.toFixed(2)} (+{pct.toFixed(1)}%)
				</Badge>
			);
		}

		if (dir === "DECREASE" || diff < 0) {
			return (
				<Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 text-[10px] font-bold gap-1">
					<TrendingDown className="h-3 w-3 text-rose-600" /> -$
					{Math.abs(diff).toFixed(2)} ({pct.toFixed(1)}%)
				</Badge>
			);
		}

		if (dir === "DISCOUNT_ONLY") {
			return (
				<Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 text-[10px] font-bold gap-1">
					<RefreshCw className="h-3 w-3 text-amber-600" /> Discount Shift (
					{item.discountBefore || 0}% &rarr; {item.discountAfter || 0}%)
				</Badge>
			);
		}

		return (
			<Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold gap-1">
				<MinusCircle className="h-3 w-3 text-slate-400" /> Unchanged
			</Badge>
		);
	};

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
						<History className="h-5 w-5" />
					</div>
					<div>
						<h3 className="font-bold text-lg text-slate-900 dark:text-white">
							{t("products.priceHistoryModalTitle")}
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{t("products.priceHistoryModalSubtitle")}
						</p>
					</div>
				</div>
			}
			className="max-w-5xl"
		>
			<div className="space-y-6">
				{/* TOP SUMMARY KPI BANNER */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<div className="flex items-center justify-between text-slate-500 text-xs mb-1">
							<span>{t("products.priceChange")}</span>
							<History className="h-4 w-4 text-purple-500" />
						</div>
						<div className="text-xl font-extrabold text-slate-900 dark:text-white">
							{summaryData?.totalPriceChanges ?? 0}
						</div>
						<span className="text-[10px] text-slate-400">
							{t("common.entries")}
						</span>
					</div>

					<div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<div className="flex items-center justify-between text-slate-500 text-xs mb-1">
							<span>{t("products.sellingPrice")} ↑</span>
							<ArrowUpRight className="h-4 w-4 text-emerald-500" />
						</div>
						<div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
							{summaryData?.priceIncreaseCount ?? 0}
						</div>
						<span className="text-[10px] text-emerald-600/80 font-medium">
							{t("common.active")}
						</span>
					</div>

					<div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<div className="flex items-center justify-between text-slate-500 text-xs mb-1">
							<span>{t("products.sellingPrice")} ↓</span>
							<ArrowDownRight className="h-4 w-4 text-rose-500" />
						</div>
						<div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
							{summaryData?.priceDecreaseCount ?? 0}
						</div>
						<span className="text-[10px] text-rose-600/80 font-medium">
							{t("common.active")}
						</span>
					</div>

					<div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<div className="flex items-center justify-between text-slate-500 text-xs mb-1">
							<span>{t("products.pricingTiers")}</span>
							<DollarSign className="h-4 w-4 text-sky-500" />
						</div>
						<div className="text-xl font-extrabold text-slate-900 dark:text-white">
							$
							{summaryData?.averagePriceShift
								? Number(summaryData.averagePriceShift).toFixed(2)
								: "0.00"}
						</div>
						<span className="text-[10px] text-slate-400">
							Peak: $
							{summaryData?.highestHistoricalPrice
								? Number(summaryData.highestHistoricalPrice).toFixed(2)
								: "0.00"}
						</span>
					</div>
				</div>

				{/* CONTROLS & FILTER TOOLBAR */}
				<div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						{/* Search Input */}
						<div className="relative flex-1 min-w-[220px]">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
							<input
								type="text"
								placeholder={t("common.search")}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
							/>
						</div>

						{/* Variant Dropdown */}
						{productVariants.length > 0 && (
							<div className="w-44">
								<ModernSelect
									label=""
									value={selectedVariantId}
									onChange={(val) => setSelectedVariantId(val)}
									options={[
										{ value: "ALL", label: t("common.all") },
										...productVariants.map((v: any) => ({
											value: String(v.id),
											label: v.name || v.sku,
										})),
									]}
								/>
							</div>
						)}

						{/* Unit Dropdown */}
						{productUnits.length > 0 && (
							<div className="w-44">
								<ModernSelect
									label=""
									value={selectedUnitId}
									onChange={(val) => setSelectedUnitId(val)}
									options={[
										{ value: "ALL", label: t("common.all") },
										...productUnits.map((u: any) => ({
											value: String(u.unitId || u.id),
											label: u.name || u.unitName || `Unit #${u.unitId}`,
										})),
									]}
								/>
							</div>
						)}

						{/* View Mode Switcher */}
						<div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
							<button
								type="button"
								onClick={() => setViewMode("timeline")}
								className={cn(
									"px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
									viewMode === "timeline"
										? "bg-purple-600 text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900",
								)}
							>
								{t("products.timelineView")}
							</button>
							<button
								type="button"
								onClick={() => setViewMode("matrix")}
								className={cn(
									"px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
									viewMode === "matrix"
										? "bg-purple-600 text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900",
								)}
							>
								{t("products.matrixView")}
							</button>
						</div>
					</div>

					{/* Direction Filter Pills */}
					<div className="flex items-center gap-2 pt-1">
						<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
							Direction:
						</span>
						<div className="flex flex-wrap gap-1.5">
							{[
								{ id: "ALL", label: "All Shifts" },
								{ id: "INCREASE", label: "Price Up 📈" },
								{ id: "DECREASE", label: "Price Down 📉" },
								{ id: "DISCOUNT_ONLY", label: "Discount Shift 🏷️" },
								{ id: "INITIAL", label: "Initial Base 🚀" },
							].map((pill) => (
								<button
									key={pill.id}
									type="button"
									onClick={() => setDirectionFilter(pill.id)}
									className={cn(
										"px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all border",
										directionFilter === pill.id
											? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
											: "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100",
									)}
								>
									{pill.label}
								</button>
							))}
						</div>
					</div>
				</div>

				{/* CONTENT AREA */}
				{viewMode === "timeline" ? (
					<DataTable<any>
						data={historyItems}
						columns={[
							{
								id: "reason",
								header: `${t("products.reason")} & ${t("orders.orderDate")}`,
								cell: ({ row }) => (
									<div className="space-y-0.5">
										<span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
											{row.reason || t("products.priceChange")}
										</span>
										<div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
											<Calendar className="h-3 w-3 text-slate-400" />
											{row.createdAt
												? new Date(row.createdAt).toLocaleString()
												: "—"}
										</div>
									</div>
								),
							},
							{
								id: "variantSku",
								header: `${t("products.editVariant")}`,
								cell: ({ row }) => (
									<div className="space-y-0.5">
										<span className="font-mono font-medium text-slate-700 dark:text-slate-300 text-xs block">
											{row.variantSku || "Default Variant"}
										</span>
										{row.formattedAttributes && (
											<span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">
												{row.formattedAttributes}
											</span>
										)}
									</div>
								),
							},
							{
								id: "unitName",
								header: t("products.unit"),
								cell: ({ row }) => (
									<Badge
										variant="outline"
										className="text-[10px] bg-slate-50 font-semibold dark:bg-slate-900"
									>
										{row.unitName || t("products.baseUnit")}{" "}
										{row.unitSymbol ? `(${row.unitSymbol})` : ""}
									</Badge>
								),
							},
							{
								id: "priceComparison",
								header: `${t("products.oldPrice")} → ${t("products.newPrice")}`,
								cell: ({ row }) => {
									const before =
										row.priceBefore !== undefined && row.priceBefore !== null
											? Number(row.priceBefore)
											: null;
									const after = Number(row.priceAfter || 0);
									return (
										<div className="flex items-center gap-2 text-xs">
											{before !== null ? (
												<span className="text-slate-400 line-through">
													${before.toFixed(2)}
												</span>
											) : (
												<span className="text-slate-400 text-[10px] font-mono">
													N/A
												</span>
											)}
											<span className="text-slate-400">&rarr;</span>
											<span className="font-extrabold text-emerald-600 dark:text-emerald-400">
												${after.toFixed(2)}
											</span>
										</div>
									);
								},
							},
							{
								id: "trend",
								header: t("products.priceChange"),
								cell: ({ row }) => renderTrendBadge(row),
							},
							{
								id: "changedBy",
								header: t("products.changedBy"),
								cell: ({ row }) => (
									<div className="flex items-center gap-1.5 text-xs">
										<div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
											{(row.changedByName || row.changedByUsername || "A")
												.charAt(0)
												.toUpperCase()}
										</div>
										<span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
											{row.changedByName ||
												row.changedByUsername ||
												"System Admin"}
										</span>
									</div>
								),
							},
						]}
						title={t("products.priceHistoryModalTitle")}
						isLoading={isLoadingSearch}
						pageSizeOptions={[5, 10, 20]}
					/>
				) : (
					/* ODOO MATRIX VIEW */
					<div className="space-y-4">
						{summaryData?.variantUnitSnapshots &&
						summaryData.variantUnitSnapshots.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{summaryData.variantUnitSnapshots.map(
									(snap: any, idx: number) => (
										<div
											key={idx}
											className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
										>
											<div className="flex items-start justify-between">
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<Package className="h-4 w-4 text-purple-500" />
														<h4 className="font-bold text-slate-900 dark:text-white text-sm">
															{snap.variantSku ||
																snap.variantName ||
																"Default Variant"}
														</h4>
													</div>
													{snap.formattedAttributes && (
														<p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
															{snap.formattedAttributes}
														</p>
													)}
													<Badge
														variant="outline"
														className="text-[10px] bg-slate-50 dark:bg-slate-950 font-semibold"
													>
														{t("products.unit")}: {snap.unitName}{" "}
														{snap.unitSymbol ? `(${snap.unitSymbol})` : ""}
													</Badge>
												</div>

												<div className="text-right">
													<span className="text-[10px] text-slate-400 block font-semibold">
														{t("products.sellingPrice")}
													</span>
													<strong className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
														$
														{snap.currentPrice !== undefined
															? Number(snap.currentPrice).toFixed(2)
															: "0.00"}
													</strong>
													{snap.currentDiscount > 0 && (
														<span className="text-[10px] text-rose-500 font-bold block">
															Disc: {snap.currentDiscount}% (Eff: $
															{Number(snap.effectivePrice).toFixed(2)})
														</span>
													)}
												</div>
											</div>

											<div className="pt-2 border-t dark:border-slate-800 flex items-center justify-between text-xs">
												<div>
													<span className="text-slate-400 block text-[10px]">
														{t("products.oldPrice")}
													</span>
													<span className="font-bold text-slate-700 dark:text-slate-300">
														{snap.previousPrice !== null &&
														snap.previousPrice !== undefined
															? `$${Number(snap.previousPrice).toFixed(2)}`
															: "N/A"}
													</span>
												</div>

												<div>
													<span className="text-slate-400 block text-[10px]">
														{t("products.priceChange")}
													</span>
													<span
														className={cn(
															"font-bold text-xs",
															snap.lastChangeAmount > 0
																? "text-emerald-600"
																: snap.lastChangeAmount < 0
																	? "text-rose-600"
																	: "text-slate-600",
														)}
													>
														{snap.lastChangeAmount > 0 ? "+" : ""}$
														{Number(snap.lastChangeAmount).toFixed(2)} (
														{Number(snap.lastChangePercentage).toFixed(1)}%)
													</span>
												</div>

												<div>
													<span className="text-slate-400 block text-[10px]">
														{t("dashboard.horizonsTracked")}
													</span>
													<Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold">
														{snap.changeCount} {t("common.entries")}
													</Badge>
												</div>
											</div>
										</div>
									),
								)}
							</div>
						) : (
							<div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border text-slate-400 text-xs">
								No matrix records available.
							</div>
						)}
					</div>
				)}
			</div>

			<ModernModalFooter>
				<ModernModalCancelButton onClick={onClose} />
			</ModernModalFooter>
		</ModernModal>
	);
}

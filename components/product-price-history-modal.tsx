"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import type { ApexOptions } from "apexcharts";
import { priceHistoryApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { ModernSelect } from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui-custom/data-table";
import { useTranslation } from "@/lib/i18n/context";
import {
	History,
	TrendingUp,
	TrendingDown,
	RefreshCw,
	DollarSign,
	Calendar,
	ArrowUpRight,
	ArrowDownRight,
	MinusCircle,
	Tag,
	BarChart3,
	Package,
	Layers,
	Loader2,
} from "lucide-react";

// Dynamically import ApexCharts with SSR disabled for Next.js
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ProductPriceHistoryModalProps {
	isOpen: boolean;
	onClose: () => void;
	productId: number | string | null;
	productName?: string;
	productVariants?: any[];
	productUnits?: any[];
	defaultVariantId?: string | number | null;
}

export function ProductPriceHistoryModal({
	isOpen,
	onClose,
	productId,
	productName,
	productVariants = [],
	productUnits = [],
	defaultVariantId,
}: ProductPriceHistoryModalProps) {
	const { t } = useTranslation();
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const [selectedVariantId, setSelectedVariantId] = useState<string>(
		defaultVariantId ? String(defaultVariantId) : "ALL",
	);
	const [selectedUnitId, setSelectedUnitId] = useState<string>("ALL");
	const [viewMode, setViewMode] = useState<"timeline" | "matrix">("timeline");

	// Reset or sync state when opening or when defaultVariantId changes
	useEffect(() => {
		if (isOpen) {
			setSelectedVariantId(defaultVariantId ? String(defaultVariantId) : "ALL");
			setSelectedUnitId("ALL");
		}
	}, [defaultVariantId, isOpen]);

	// Fetch all price history records for this product (for Timeline & KPI cards)
	const {
		data: rawHistory = [],
		isLoading: isLoadingHistory,
		refetch: refetchProductHistory,
	} = useQuery({
		queryKey: ["product-price-history", productId, defaultVariantId],
		queryFn: async () => {
			if (productId) {
				return priceHistoryApi.getByProduct(productId, 0, 50);
			}
			if (defaultVariantId) {
				return priceHistoryApi.getByVariant(defaultVariantId, 0, 50);
			}
			return [];
		},
		enabled: (Boolean(productId) || Boolean(defaultVariantId)) && isOpen,
	});

	// Normalize history list
	const historyList: any[] = useMemo(() => {
		if (Array.isArray(rawHistory)) return rawHistory;
		if (rawHistory && Array.isArray((rawHistory as any).content)) {
			return (rawHistory as any).content;
		}
		if (rawHistory && Array.isArray((rawHistory as any).items)) {
			return (rawHistory as any).items;
		}
		return [];
	}, [rawHistory]);

	// Extract unique available variants
	const availableVariants = useMemo(() => {
		const map = new Map<string, { value: string; label: string }>();
		map.set("ALL", { value: "ALL", label: t("common.all", "All Variants") });

		productVariants.forEach((v: any) => {
			const id = String(v.id || v.variantId);
			const label = v.name || v.variantName || v.sku || `Variant #${id}`;
			map.set(id, { value: id, label });
		});

		historyList.forEach((h: any) => {
			if (h.variantId) {
				const id = String(h.variantId);
				const label = h.variantName || h.variantSku || `Variant #${id}`;
				if (!map.has(id)) {
					map.set(id, { value: id, label });
				}
			}
		});

		return Array.from(map.values());
	}, [productVariants, historyList, t]);

	// Extract unique available units (scoped by selected variant if one is selected)
	const availableUnits = useMemo(() => {
		const map = new Map<string, { value: string; label: string }>();
		map.set("ALL", { value: "ALL", label: t("common.all", "All Units") });

		// Units from productUnits prop
		productUnits.forEach((u: any) => {
			const id = String(u.unitId || u.id);
			const label = u.name || u.unitName || u.unit?.name || `Unit #${id}`;
			map.set(id, { value: id, label });
		});

		// Units from productVariants
		const targetVariants =
			selectedVariantId !== "ALL"
				? productVariants.filter(
						(v: any) => String(v.id || v.variantId) === String(selectedVariantId),
				  )
				: productVariants;

		targetVariants.forEach((v: any) => {
			(v.units || []).forEach((u: any) => {
				const id = String(u.unitId || u.id || u.unit?.id);
				const label = u.name || u.unitName || u.unit?.name || `Unit #${id}`;
				map.set(id, { value: id, label });
			});
		});

		// Units from history items
		const targetHistory =
			selectedVariantId !== "ALL"
				? historyList.filter(
						(h: any) => String(h.variantId) === String(selectedVariantId),
				  )
				: historyList;

		targetHistory.forEach((h: any) => {
			if (h.unitId) {
				const id = String(h.unitId);
				const label = h.unitName || `Unit #${id}`;
				map.set(id, { value: id, label });
			}
		});

		return Array.from(map.values());
	}, [productUnits, productVariants, selectedVariantId, historyList, t]);

	// Resolved active variant ID for the Pricing Matrix Chart
	const activeVariantId = useMemo(() => {
		if (selectedVariantId !== "ALL") return String(selectedVariantId);
		if (defaultVariantId) return String(defaultVariantId);
		if (productVariants && productVariants.length > 0) {
			return String(productVariants[0].id || productVariants[0].variantId);
		}
		if (availableVariants.length > 1) {
			return availableVariants[1].value;
		}
		return null;
	}, [selectedVariantId, defaultVariantId, productVariants, availableVariants]);

	// Active variant object and its display label
	const activeVariant = useMemo(() => {
		return productVariants.find(
			(v: any) => String(v.id || v.variantId) === String(activeVariantId),
		);
	}, [productVariants, activeVariantId]);

	const activeVariantLabel = useMemo(() => {
		if (!activeVariantId) return "Default Variant";
		const match = availableVariants.find((v) => v.value === String(activeVariantId));
		return match?.label || activeVariant?.name || activeVariant?.sku || `Variant #${activeVariantId}`;
	}, [activeVariantId, availableVariants, activeVariant]);

	// Target units belonging to activeVariantId for the Pricing Matrix Chart
	const targetUnitsForVariant = useMemo(() => {
		const list: { id: string | number; name: string; symbol?: string }[] = [];
		const seen = new Set<string>();

		if (activeVariant?.units && Array.isArray(activeVariant.units)) {
			activeVariant.units.forEach((u: any) => {
				const id = String(u.unitId || u.id || u.unit?.id);
				if (!seen.has(id)) {
					seen.add(id);
					list.push({
						id,
						name: u.unitName || u.name || `Unit #${id}`,
						symbol: u.symbol || u.unitSymbol,
					});
				}
			});
		}

		productUnits.forEach((u: any) => {
			const id = String(u.unitId || u.id);
			if (!seen.has(id)) {
				seen.add(id);
				list.push({
					id,
					name: u.unitName || u.name || `Unit #${id}`,
					symbol: u.symbol || u.unitSymbol,
				});
			}
		});

		historyList.forEach((h: any) => {
			if (String(h.variantId) === String(activeVariantId) && h.unitId) {
				const id = String(h.unitId);
				if (!seen.has(id)) {
					seen.add(id);
					list.push({
						id,
						name: h.unitName || `Unit #${id}`,
						symbol: h.unitSymbol,
					});
				}
			}
		});

		return list;
	}, [activeVariant, productUnits, historyList, activeVariantId]);

	// =========================================================================
	// REQUIREMENT 5: ASYNC MULTI-CALL FOR PRICING MATRIX CHART
	// Calls GET /price-history/variant/{variant_id}/unit/{dynamic_unit_id}
	// multiple times asynchronously based on amount of units when tab is matrix.
	// =========================================================================
	const {
		data: unitHistoryResults = [],
		isLoading: isLoadingChart,
		refetch: refetchMatrixChart,
	} = useQuery({
		queryKey: [
			"pricing-matrix-chart-units",
			activeVariantId,
			targetUnitsForVariant.map((u) => u.id).sort().join(","),
		],
		queryFn: async () => {
			if (!activeVariantId || targetUnitsForVariant.length === 0) return [];
			// Execute parallel asynchronous requests for every unit of this variant
			const results = await Promise.all(
				targetUnitsForVariant.map(async (unit) => {
					try {
						const data = await priceHistoryApi.getByVariantAndUnit(
							activeVariantId,
							unit.id,
							0,
							20,
						);
						const records = Array.isArray(data)
							? data
							: (data as any)?.content || [];
						return {
							unitId: String(unit.id),
							unitName: unit.name,
							symbol: unit.symbol,
							records,
						};
					} catch {
						return {
							unitId: String(unit.id),
							unitName: unit.name,
							symbol: unit.symbol,
							records: [],
						};
					}
				}),
			);
			return results;
		},
		enabled:
			isOpen &&
			viewMode === "matrix" &&
			Boolean(activeVariantId) &&
			targetUnitsForVariant.length > 0,
		staleTime: 60 * 1000,
	});

	// Compute KPI summary banner dynamically from history data
	const summaryData = useMemo(() => {
		const target = historyList;
		const relevant =
			selectedVariantId !== "ALL"
				? target.filter(
						(h: any) => String(h.variantId) === String(selectedVariantId),
				  )
				: target;

		const scoped =
			selectedUnitId !== "ALL"
				? relevant.filter(
						(h: any) => String(h.unitId) === String(selectedUnitId),
				  )
				: relevant;

		const totalPriceChanges = scoped.length;
		let priceIncreaseCount = 0;
		let priceDecreaseCount = 0;
		let totalShift = 0;
		let shiftCount = 0;
		let highestHistoricalPrice = 0;

		scoped.forEach((item: any) => {
			const dir = item.changeDirection;
			const diff =
				item.priceChange !== undefined && item.priceChange !== null
					? Number(item.priceChange)
					: item.priceAfter !== undefined &&
					  item.priceBefore !== undefined &&
					  item.priceBefore !== null
					? Number(item.priceAfter) - Number(item.priceBefore)
					: 0;

			if (dir === "INCREASE" || diff > 0) {
				priceIncreaseCount++;
			} else if (dir === "DECREASE" || diff < 0) {
				priceDecreaseCount++;
			}

			if (diff !== 0) {
				totalShift += Math.abs(diff);
				shiftCount++;
			}

			const after = Number(item.priceAfter || 0);
			if (after > highestHistoricalPrice) {
				highestHistoricalPrice = after;
			}
		});

		const averagePriceShift = shiftCount > 0 ? totalShift / shiftCount : 0;

		return {
			totalPriceChanges,
			priceIncreaseCount,
			priceDecreaseCount,
			averagePriceShift,
			highestHistoricalPrice,
		};
	}, [historyList, selectedVariantId, selectedUnitId]);

	// Filter history list for Timeline view
	const filteredHistoryItems = useMemo(() => {
		let items = historyList;

		if (selectedVariantId !== "ALL") {
			items = items.filter(
				(item: any) => String(item.variantId) === String(selectedVariantId),
			);
		}

		if (selectedUnitId !== "ALL") {
			items = items.filter(
				(item: any) => String(item.unitId) === String(selectedUnitId),
			);
		}

		return items;
	}, [historyList, selectedVariantId, selectedUnitId]);

	// Build Chart Data (Categories & Series) for Pricing Matrix
	const chartData = useMemo(() => {
		if (!unitHistoryResults || unitHistoryResults.length === 0) {
			return { categories: [], series: [] };
		}

		// Filter by selectedUnitId if specific unit selected
		const activeUnits =
			selectedUnitId !== "ALL"
				? unitHistoryResults.filter(
						(u) => String(u.unitId) === String(selectedUnitId),
				  )
				: unitHistoryResults;

		// Collect unique timestamps across units
		const timestampSet = new Set<string>();
		activeUnits.forEach((u) => {
			u.records.forEach((r: any) => {
				if (r.createdAt) timestampSet.add(r.createdAt);
			});
		});

		const sortedTimestamps = Array.from(timestampSet).sort(
			(a, b) => new Date(a).getTime() - new Date(b).getTime(),
		);

		// If there is only 1 timestamp but records have priceBefore, synthesize an initial base point
		const hasInitialBeforePoint =
			sortedTimestamps.length <= 1 &&
			activeUnits.some((u) =>
				u.records.some(
					(r: any) =>
						r.priceBefore !== null &&
						r.priceBefore !== undefined &&
						Number(r.priceBefore) > 0,
				),
			);

		const categories: string[] = [];
		if (hasInitialBeforePoint) {
			categories.push("Initial Price");
		}
		sortedTimestamps.forEach((ts) => {
			try {
				const d = new Date(ts);
				const formatted =
					d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
					" " +
					d.toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					});
				categories.push(formatted);
			} catch {
				categories.push(ts);
			}
		});

		if (categories.length === 0) {
			return { categories: [], series: [] };
		}

		const series = activeUnits.map((unit) => {
			const sortedRecords = [...unit.records].sort(
				(a: any, b: any) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			);

			const dataPoints: number[] = [];
			let lastKnown = sortedRecords[0]?.priceAfter
				? Number(sortedRecords[0].priceAfter)
				: 0;

			if (hasInitialBeforePoint) {
				const firstBefore =
					sortedRecords[0]?.priceBefore !== null &&
					sortedRecords[0]?.priceBefore !== undefined
						? Number(sortedRecords[0].priceBefore)
						: lastKnown;
				dataPoints.push(firstBefore);
			}

			sortedTimestamps.forEach((ts) => {
				const match = sortedRecords.find((r: any) => r.createdAt === ts);
				if (match) {
					lastKnown = Number(match.priceAfter || 0);
				}
				dataPoints.push(lastKnown);
			});

			return {
				name: unit.unitName || `Unit #${unit.unitId}`,
				data: dataPoints,
			};
		});

		return { categories, series };
	}, [unitHistoryResults, selectedUnitId]);

	// ApexCharts Multi-line configuration
	const chartColors = [
		"#0284c7", // Sky blue
		"#10b981", // Emerald green
		"#8b5cf6", // Purple
		"#f97316", // Orange
		"#ec4899", // Pink
		"#06b6d4", // Cyan
		"#eab308", // Yellow
	];

	const chartOptions = useMemo<ApexOptions>(() => {
		return {
			chart: {
				type: "line",
				height: 350,
				background: "transparent",
				toolbar: {
					show: true,
					tools: {
						download: true,
						selection: false,
						zoom: false,
						zoomin: false,
						zoomout: false,
						pan: false,
						reset: false,
					},
				},
				animations: {
					enabled: true,
					speed: 450,
				},
			},
			stroke: {
				curve: "smooth",
				width: 3,
			},
			markers: {
				size: 5,
				strokeWidth: 2,
				strokeColors: isDark ? "#0f172a" : "#ffffff",
				hover: {
					size: 7,
				},
			},
			colors: chartColors,
			grid: {
				borderColor: isDark ? "#1e293b" : "#f1f5f9",
				strokeDashArray: 3,
				padding: {
					top: 10,
					right: 25,
					bottom: 10,
					left: 20,
				},
			},
			xaxis: {
				categories: chartData.categories,
				labels: {
					style: {
						colors: isDark ? "#94a3b8" : "#64748b",
						fontSize: "11px",
						fontWeight: 500,
					},
				},
				axisBorder: {
					color: isDark ? "#334155" : "#cbd5e1",
				},
				axisTicks: {
					color: isDark ? "#334155" : "#cbd5e1",
				},
			},
			yaxis: {
				labels: {
					style: {
						colors: isDark ? "#94a3b8" : "#64748b",
						fontSize: "11px",
						fontWeight: 500,
					},
					formatter: (val) => `$${Number(val).toFixed(2)}`,
				},
			},
			legend: {
				position: "bottom",
				horizontalAlign: "center",
				fontSize: "12px",
				fontWeight: 600,
				labels: {
					colors: isDark ? "#cbd5e1" : "#475569",
				},
				markers: {
					shape: "circle",
					size: 5,
				},
				itemMargin: {
					horizontal: 14,
					vertical: 8,
				},
			},
			tooltip: {
				theme: isDark ? "dark" : "light",
				y: {
					formatter: (val) => `$${Number(val).toFixed(2)}`,
				},
			},
		};
	}, [chartData.categories, isDark]);

	const renderTrendBadge = (item: any) => {
		const dir = item.changeDirection || "NO_CHANGE";
		const diff =
			item.priceChange !== undefined && item.priceChange !== null
				? Number(item.priceChange)
				: item.priceAfter !== undefined &&
				  item.priceBefore !== undefined &&
				  item.priceBefore !== null
				? Number(item.priceAfter) - Number(item.priceBefore)
				: 0;

		const pct =
			item.priceChangePercent !== undefined && item.priceChangePercent !== null
				? Number(item.priceChangePercent)
				: item.priceChangePercentage !== undefined &&
				  item.priceChangePercentage !== null
				? Number(item.priceChangePercentage)
				: item.priceBefore && Number(item.priceBefore) > 0
				? (diff / Number(item.priceBefore)) * 100
				: 0;

		if (
			dir === "INITIAL" ||
			item.isInitialPrice ||
			item.priceBefore === null ||
			item.priceBefore === undefined
		) {
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

		if (
			dir === "DISCOUNT_ONLY" ||
			(diff === 0 && item.discountBefore !== item.discountAfter)
		) {
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
							{productName ? `${productName} — ` : ""}
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
			<div className="space-y-5">
				{/* TOP SUMMARY KPI BANNER */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
						<div className="flex items-center justify-between text-slate-500 text-xs mb-1">
							<span>{t("products.priceChange")}</span>
							<History className="h-4 w-4 text-purple-500" />
						</div>
						<div className="text-xl font-extrabold text-slate-900 dark:text-white">
							{summaryData.totalPriceChanges}
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
							{summaryData.priceIncreaseCount}
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
							{summaryData.priceDecreaseCount}
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
							{summaryData.averagePriceShift
								? Number(summaryData.averagePriceShift).toFixed(2)
								: "0.00"}
						</div>
						<span className="text-[10px] text-slate-400">
							Peak: $
							{summaryData.highestHistoricalPrice
								? Number(summaryData.highestHistoricalPrice).toFixed(2)
								: "0.00"}
						</span>
					</div>
				</div>

				{/* =========================================================================
				    REQUIREMENTS 1, 2, 3, 4:
				    - Removed duplicate middle card container.
				    - Removed import/export button.
				    - Placed clean Tabs near Variant & Unit filters in a unified header bar.
				    ========================================================================= */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
					{/* Left: Title & Live Count Badge */}
					<div className="flex items-center gap-2.5 px-1">
						<div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 shrink-0">
							{viewMode === "timeline" ? (
								<History className="h-4 w-4" />
							) : (
								<BarChart3 className="h-4 w-4" />
							)}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-base font-bold text-slate-900 dark:text-white">
									{viewMode === "timeline"
										? t("products.priceHistoryModalTitle")
										: t("products.matrixView")}
								</h3>
								<Badge
									variant="secondary"
									className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
								>
									{viewMode === "timeline"
										? filteredHistoryItems.length
										: targetUnitsForVariant.length}
								</Badge>
							</div>
							<p className="text-[11px] text-slate-400">
								{viewMode === "timeline"
									? "Audit log of confirmed price modifications"
									: `Unit pricing curve analysis for ${activeVariantLabel}`}
							</p>
						</div>
					</div>

					{/* Right: Clean Tabs Switcher, Variant Filter, Unit Filter, Refresh Button */}
					<div className="flex items-center gap-2.5 flex-wrap">
						{/* Clean Tabs Switcher */}
						<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
							<button
								type="button"
								onClick={() => setViewMode("timeline")}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
									viewMode === "timeline"
										? "bg-purple-600 text-white shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
								)}
							>
								<History className="h-3.5 w-3.5" />
								<span>{t("products.timelineView")}</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("matrix")}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
									viewMode === "matrix"
										? "bg-purple-600 text-white shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
								)}
							>
								<TrendingUp className="h-3.5 w-3.5" />
								<span>{t("products.matrixView")}</span>
							</button>
						</div>

						{/* Variant Filter Dropdown */}
						{availableVariants.length > 1 && (
							<div className="w-40">
								<ModernSelect
									label=""
									value={selectedVariantId}
									onChange={(val) => {
										setSelectedVariantId(val);
										setSelectedUnitId("ALL");
									}}
									options={availableVariants}
								/>
							</div>
						)}

						{/* Unit Filter Dropdown */}
						{availableUnits.length > 1 && (
							<div className="w-36">
								<ModernSelect
									label=""
									value={selectedUnitId}
									onChange={(val) => setSelectedUnitId(val)}
									options={availableUnits}
								/>
							</div>
						)}

						{/* Refresh Button */}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								refetchProductHistory();
								if (viewMode === "matrix") refetchMatrixChart();
							}}
							disabled={isLoadingHistory || isLoadingChart}
							className="h-9 w-9 p-0 text-slate-500 hover:text-purple-600 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
							title={t("common.reload", "Reload")}
						>
							<RefreshCw
								className={cn(
									"h-4 w-4",
									(isLoadingHistory || isLoadingChart) && "animate-spin",
								)}
							/>
						</Button>
					</div>
				</div>

				{/* CONTENT AREA */}
				{viewMode === "timeline" ? (
					/* =========================================================================
					    REQUIREMENT 1:
					    DataTable with hideToolbar={true}, hideHeader={true}, hideSearch={true},
					    and hideImportExport={true} to remove search, sort, column, view.
					    ========================================================================= */
					<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden p-2">
						<DataTable<any>
							data={filteredHistoryItems}
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
												{row.variantName || row.variantSku || "Default Variant"}
											</span>
											{row.variantSku && row.variantName && (
												<span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block font-mono">
													{row.variantSku}
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
							hideHeader={true}
							hideToolbar={true}
							hideSearch={true}
							hideImportExport={true}
							selectable={false}
							isLoading={isLoadingHistory}
							pageSizeOptions={[5, 10, 20]}
						/>
					</div>
				) : (
					/* =========================================================================
					    REQUIREMENT 5: PRICING MATRIX CHART VIEW
					    Multi-line comparative chart across all units of the variant.
					    ========================================================================= */
					<div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
						{/* Chart Sub-header */}
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
							<div className="space-y-0.5">
								<h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
									<Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
									<span>Pricing Trajectories by Unit Tier</span>
								</h4>
								<p className="text-xs text-slate-400">
									Tracking {chartData.series.length} unit tier(s) for{" "}
									<strong className="text-slate-700 dark:text-slate-300">
										{activeVariantLabel}
									</strong>
								</p>
							</div>

							<div className="flex items-center gap-2">
								<Badge
									variant="outline"
									className="text-[11px] font-mono border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300"
								>
									{targetUnitsForVariant.length} Unit(s) Connected
								</Badge>
							</div>
						</div>

						{/* Chart Display Area */}
						{isLoadingChart ? (
							<div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
								<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
								<span className="text-xs font-medium">
									Loading pricing matrix history across units...
								</span>
							</div>
						) : chartData.series.length > 0 && chartData.categories.length > 0 ? (
							<div className="w-full">
								<Chart
									options={chartOptions}
									series={chartData.series}
									type="line"
									height={350}
								/>

								{/* Unit Snapshots Legend & Live Metrics */}
								<div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
									{unitHistoryResults.map((unit, index) => {
										const latestRecord = unit.records[0];
										const color = chartColors[index % chartColors.length];
										const price = latestRecord?.priceAfter
											? Number(latestRecord.priceAfter)
											: 0;
										const diff =
											latestRecord?.priceChange !== undefined &&
											latestRecord?.priceChange !== null
												? Number(latestRecord.priceChange)
												: 0;

										return (
											<div
												key={unit.unitId}
												className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-2"
											>
												<div className="flex items-center gap-2 min-w-0">
													<span
														className="w-3 h-3 rounded-full shrink-0 shadow-xs"
														style={{ backgroundColor: color }}
													/>
													<div className="min-w-0">
														<p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
															{unit.unitName}
														</p>
														<span className="text-[10px] text-slate-400 font-mono">
															{unit.records.length} update(s)
														</span>
													</div>
												</div>

												<div className="text-right shrink-0">
													<p className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
														${price.toFixed(2)}
													</p>
													{diff !== 0 && (
														<span
															className={cn(
																"text-[9px] font-bold block",
																diff > 0 ? "text-emerald-500" : "text-rose-500",
															)}
														>
															{diff > 0 ? "+" : ""}
															${diff.toFixed(2)}
														</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
								<Package className="h-8 w-8 text-slate-300 dark:text-slate-700" />
								<p className="text-xs font-semibold">
									No price history records found for this variant's units.
								</p>
								<p className="text-[11px] text-slate-400">
									Price changes made to this variant will be graphed dynamically
									here.
								</p>
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

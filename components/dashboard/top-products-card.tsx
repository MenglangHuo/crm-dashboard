"use client";

import * as React from "react";
import Link from "next/link";
import {
	ArrowUpRight,
	Boxes,
	CircleDollarSign,
	Crown,
	Medal,
	Package,
	Sparkles,
	Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardTopProductItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export interface TopProductsCardProps {
	byRevenue?: DashboardTopProductItem[];
	byQuantity?: DashboardTopProductItem[];
	isLoading?: boolean;
}

type Mode = "revenue" | "quantity";

function formatMoney(val: number): string {
	const num = typeof val === "number" && !isNaN(val) ? val : Number(val) || 0;
	return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TopProductsCard({
	byRevenue = [],
	byQuantity = [],
	isLoading,
}: TopProductsCardProps) {
	const { t } = useTranslation();
	const [mode, setMode] = React.useState<Mode>("revenue");

	const normalizedRevenue = React.useMemo(() => {
		return (byRevenue || []).map((p: any, idx: number) => ({
			rank: p.rank ?? idx + 1,
			productName:
				p.productName ||
				p.product_name ||
				p.name ||
				`Product #${p.productId || idx + 1}`,
			sku: p.sku || p.code || p.productSku || "-",
			totalRevenue: Number(p.totalRevenue ?? p.total_revenue ?? p.revenue ?? 0),
			totalQuantity: Number(
				p.totalQuantity ?? p.total_quantity ?? p.quantity ?? p.qty ?? 0,
			),
		}));
	}, [byRevenue]);

	const normalizedQuantity = React.useMemo(() => {
		return (byQuantity || []).map((p: any, idx: number) => ({
			rank: p.rank ?? idx + 1,
			productName:
				p.productName ||
				p.product_name ||
				p.name ||
				`Product #${p.productId || idx + 1}`,
			sku: p.sku || p.code || p.productSku || "-",
			totalRevenue: Number(p.totalRevenue ?? p.total_revenue ?? p.revenue ?? 0),
			totalQuantity: Number(
				p.totalQuantity ?? p.total_quantity ?? p.quantity ?? p.qty ?? 0,
			),
		}));
	}, [byQuantity]);

	const items = mode === "revenue" ? normalizedRevenue : normalizedQuantity;
	const maxRevenue = Math.max(
		...normalizedRevenue.map((p) => p.totalRevenue || 0),
		1,
	);
	const maxQuantity = Math.max(
		...normalizedQuantity.map((p) => p.totalQuantity || 0),
		1,
	);

	if (isLoading) {
		return (
			<div className="h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
				<div className="flex items-center justify-between pb-4">
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-8 w-44 rounded-xl" />
				</div>
				<div className="space-y-3 flex-1 overflow-hidden">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-14 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-6">
			{/* Header with Switcher Tabs in a single line without descriptions */}
			<div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
				<div className="flex items-center gap-2 shrink-0">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
						<Trophy className="h-4 w-4" />
					</div>
					<h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
						{t("dashboard.topPerformingProducts")}
					</h2>
				</div>

				{/* Mode Toggle with no line breaks */}
				<div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setMode("revenue")}
						className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
							mode === "revenue"
								? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						}`}
					>
						<CircleDollarSign className="h-3.5 w-3.5 shrink-0" />
						<span>{t("dashboard.tabRevenue")}</span>
					</button>
					<button
						type="button"
						onClick={() => setMode("quantity")}
						className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
							mode === "quantity"
								? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						}`}
					>
						<Boxes className="h-3.5 w-3.5 shrink-0" />
						<span>{t("dashboard.tabQuantity")}</span>
					</button>
				</div>
			</div>

			{/* Products List (Scrollable with maximum responsiveness) */}
			<div className="mt-4 flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-1.5 max-h-[380px] scrollbar-thin">
				{items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
						<Package className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
						<p>{t("dashboard.noTopProducts")}</p>
					</div>
				) : (
					items.map((prod) => {
						const rank = prod.rank;
						const progress =
							mode === "revenue"
								? (prod.totalRevenue / maxRevenue) * 100
								: (prod.totalQuantity / maxQuantity) * 100;

						const avgUnitPrice =
							prod.totalQuantity > 0
								? prod.totalRevenue / prod.totalQuantity
								: 0;

						return (
							<div
								key={`${prod.sku}-${rank}`}
								className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all duration-150 hover:bg-slate-100/70 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-800/60"
							>
								{/* Progress bar fill background */}
								<div
									className="pointer-events-none absolute inset-y-0 left-0 bg-blue-500/5 transition-all duration-300 dark:bg-blue-400/5"
									style={{ width: `${progress}%` }}
								/>

								<div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
									{/* Left: Rank & Title */}
									<div className="flex items-center gap-3 min-w-0">
										<div
											className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-2xs ${
												rank === 1
													? "bg-amber-400/20 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/60"
													: rank === 2
														? "bg-slate-200/80 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200 border border-slate-300/60"
														: rank === 3
															? "bg-amber-700/15 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-600/20"
															: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
											}`}
										>
											{rank === 1 ? (
												<Crown className="h-3.5 w-3.5 fill-current" />
											) : (
												`#${rank}`
											)}
										</div>

										<div className="min-w-0 space-y-0.5">
											<h4 className="truncate text-xs font-semibold text-slate-900 dark:text-white">
												{prod.productName}
											</h4>
											<div className="flex flex-wrap items-center gap-1.5">
												<Badge
													variant="outline"
													className="rounded-md border-slate-200 bg-white/80 px-1.5 py-0 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 truncate max-w-[200px]"
												>
													{prod.sku}
												</Badge>
												<span className="text-[10px] text-slate-400">
													{t("dashboard.avgUnitPrice", {
														price: formatMoney(avgUnitPrice),
													})}
												</span>
											</div>
										</div>
									</div>

									{/* Right: Metrics */}
									<div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
										<div className="text-left sm:text-right">
											<span className="block text-[10px] font-medium text-slate-400">
												{t("dashboard.tabRevenue")}
											</span>
											<span className="text-xs font-bold text-blue-600 dark:text-blue-400">
												{formatMoney(prod.totalRevenue)}
											</span>
										</div>

										<div className="text-right">
											<span className="block text-[10px] font-medium text-slate-400">
												{t("dashboard.unitsSold")}
											</span>
											<span className="text-xs font-bold text-slate-800 dark:text-white">
												{prod.totalQuantity.toLocaleString()}
											</span>
										</div>
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Footer Link */}
			<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800/80">
				<span className="text-[11px] text-slate-400">
					{t("dashboard.showingTopItems", {
						count: items.length,
						type:
							mode === "revenue"
								? t("dashboard.salesRevenue")
								: t("dashboard.unitsDispatched"),
					})}
				</span>
				<Link
					href="/products"
					className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
				>
					{t("dashboard.productCatalog")}{" "}
					<ArrowUpRight className="ml-1 h-3 w-3" />
				</Link>
			</div>
		</div>
	);
}

"use client";

import * as React from "react";
import {
	ArrowDownRight,
	ArrowUpRight,
	Calendar,
	ChevronRight,
	DollarSign,
	Layers,
	Minus,
	Scale,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { IncomeComparisonData, IncomeComparisonItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export interface IncomeComparisonWidgetProps {
	data?: IncomeComparisonData;
	isLoading?: boolean;
}

function formatMoney(val: number): string {
	const isNeg = val < 0;
	const abs = Math.abs(val);
	const formatted = abs.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return isNeg ? `-$${formatted}` : `$${formatted}`;
}

export function IncomeComparisonWidget({
	data,
	isLoading,
}: IncomeComparisonWidgetProps) {
	const { t } = useTranslation();
	const comparisons = data?.comparisons || [];

	const formatPeriodName = (period: string): string => {
		switch (period) {
			case "YESTERDAY":
				return t("dashboard.periodYesterday");
			case "TODAY":
				return t("dashboard.periodToday");
			case "LAST_WEEK":
				return t("dashboard.periodLastWeek");
			case "LAST_MONTH":
				return t("dashboard.periodLastMonth");
			case "LAST_QUARTER":
				return t("dashboard.periodLastQuarter");
			case "LAST_SEMESTER":
				return t("dashboard.periodLastSemester");
			case "LAST_MID_YEAR":
				return t("dashboard.periodMidYear");
			case "LAST_YEAR":
				return t("dashboard.periodLastYear");
			default:
				return period
					.split("_")
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
					.join(" ");
		}
	};

	// Default selected period for deep inspection
	const [selectedPeriod, setSelectedPeriod] = React.useState<string>(() => {
		return comparisons[0]?.period || "YESTERDAY";
	});

	React.useEffect(() => {
		if (
			comparisons.length > 0 &&
			!comparisons.some((c) => c.period === selectedPeriod)
		) {
			setSelectedPeriod(comparisons[0].period);
		}
	}, [comparisons, selectedPeriod]);

	const activeComparison =
		comparisons.find((c) => c.period === selectedPeriod) || comparisons[0];

	if (isLoading) {
		return (
			<div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
				<div className="flex items-center justify-between pb-4">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-8 w-28 rounded-xl" />
				</div>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	const currentInc = activeComparison?.currentIncome ?? 0;
	const prevInc = activeComparison?.previousIncome ?? 0;
	const diff = currentInc - prevInc;
	const percent = activeComparison?.changePercent ?? 0;
	const isUp = activeComparison?.trend === "UP" || diff > 0;
	const isDown = activeComparison?.trend === "DOWN" || diff < 0;

	return (
		<div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-6">
			{/* Header */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
							<Scale className="h-4 w-4" />
						</div>
						<h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
							{t("dashboard.incomeVarianceTitle")}
						</h2>
					</div>
					<p className="text-xs font-normal text-slate-400 dark:text-slate-500">
						{t("dashboard.incomeVarianceSubtitle")}
					</p>
				</div>

				<div className="flex items-center gap-1.5">
					<Badge
						variant="outline"
						className="rounded-lg border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						{comparisons.length} {t("dashboard.horizonsTracked")}
					</Badge>
				</div>
			</div>

			{/* Selected Period Spotlight Card */}
			{activeComparison && (
				<div className="my-4 rounded-2xl border border-indigo-100/90 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
								{t("dashboard.selectedPeriodLabel")}:{" "}
								{formatPeriodName(activeComparison.period)}
							</span>
							<div className="flex flex-wrap items-baseline gap-3">
								<div>
									<span className="text-[11px] text-slate-400">
										{t("dashboard.current")}:
									</span>{" "}
									<span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
										{formatMoney(currentInc)}
									</span>
								</div>
								<span className="text-slate-300 dark:text-slate-600 font-light">
									vs
								</span>
								<div>
									<span className="text-[11px] text-slate-400">
										{t("dashboard.previous")}:
									</span>{" "}
									<span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
										{formatMoney(prevInc)}
									</span>
								</div>
							</div>
						</div>

						{/* Delta Badge */}
						<div className="flex items-center gap-3">
							<div
								className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
									isUp
										? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
										: isDown
											? "bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
											: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
								}`}
							>
								{isUp ? (
									<TrendingUp className="h-4 w-4" />
								) : isDown ? (
									<TrendingDown className="h-4 w-4" />
								) : (
									<Minus className="h-4 w-4" />
								)}
								<span>
									{percent > 0
										? `+${percent.toFixed(1)}%`
										: `${percent.toFixed(1)}%`}
								</span>
							</div>

							<div className="text-right">
								<span className="block text-[10px] font-medium text-slate-400">
									{t("dashboard.dollarVariance")}
								</span>
								<span
									className={`text-xs font-bold ${
										diff >= 0
											? "text-emerald-600 dark:text-emerald-400"
											: "text-rose-600 dark:text-rose-400"
									}`}
								>
									{diff >= 0 ? `+${formatMoney(diff)}` : formatMoney(diff)}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Period Cards Grid */}
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
				{comparisons.map((c) => {
					const isSelected = selectedPeriod === c.period;
					const itemDiff = c.currentIncome - c.previousIncome;
					const trendUp = c.trend === "UP" || itemDiff > 0;
					const trendDown = c.trend === "DOWN" || itemDiff < 0;

					return (
						<button
							key={c.period}
							type="button"
							onClick={() => setSelectedPeriod(c.period)}
							className={`flex flex-col justify-between rounded-2xl border p-3 text-left transition-all duration-150 cursor-pointer ${
								isSelected
									? "border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/40"
									: "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100/60 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:bg-slate-800/60"
							}`}
						>
							<div className="flex items-center justify-between gap-1">
								<span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
									{formatPeriodName(c.period)}
								</span>
								{trendUp ? (
									<ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
								) : trendDown ? (
									<ArrowDownRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
								) : (
									<Minus className="h-3.5 w-3.5 text-slate-400 shrink-0" />
								)}
							</div>

							<div className="mt-2 space-y-0.5">
								<div className="text-xs font-bold text-slate-900 dark:text-white">
									{formatMoney(c.currentIncome)}
								</div>
								<div className="flex items-center justify-between text-[10px] text-slate-400">
									<span>Prev: {formatMoney(c.previousIncome)}</span>
									<span
										className={`font-semibold ${
											trendUp
												? "text-emerald-600 dark:text-emerald-400"
												: trendDown
													? "text-rose-600 dark:text-rose-400"
													: "text-slate-400"
										}`}
									>
										{c.changePercent > 0
											? `+${c.changePercent}%`
											: `${c.changePercent}%`}
									</span>
								</div>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	BadgePercent,
	Boxes,
	CircleDollarSign,
	CreditCard,
	FileCheck,
	FileText,
	Package,
	Percent,
	Receipt,
	ShieldAlert,
	ShoppingCart,
	TrendingDown,
	TrendingUp,
	Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardReportData } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export interface FinancialKpiGridProps {
	data?: DashboardReportData;
	isLoading?: boolean;
}

function formatCurrency(val?: number): string {
	if (val === undefined || val === null || isNaN(val)) return "$0.00";
	const isNegative = val < 0;
	const absVal = Math.abs(val).toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return isNegative ? `-$${absVal}` : `$${absVal}`;
}

function formatNumber(val?: number): string {
	if (val === undefined || val === null || isNaN(val)) return "0";
	return val.toLocaleString("en-US");
}

const cardBaseClass =
	"group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-black/20 dark:hover:border-slate-700";

export function FinancialKpiGrid({ data, isLoading }: FinancialKpiGridProps) {
	const { t } = useTranslation();

	if (isLoading) {
		return (
			<div className="relative z-10 space-y-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className={`${cardBaseClass} space-y-3`}>
							<div className="flex items-center justify-between">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-9 w-9 rounded-xl" />
							</div>
							<Skeleton className="h-8 w-32" />
							<Skeleton className="h-3 w-44" />
						</div>
					))}
				</div>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80"
						>
							<Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
							<div className="min-w-0 space-y-1.5 flex-1">
								<Skeleton className="h-3 w-16" />
								<Skeleton className="h-5 w-12" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	const netRevenue = data?.netRevenue ?? 0;
	const grossSales = data?.grossSales ?? 0;
	const grossProfit = data?.grossProfit ?? 0;
	const totalDiscount = data?.totalDiscount ?? 0;
	const totalPaymentDiscount = data?.totalPaymentDiscount ?? 0;
	const totalOrders = data?.totalOrders ?? 0;
	const totalInvoices = data?.totalInvoices ?? 0;
	const lowStockCount = data?.lowStockCount ?? 0;
	const outOfStockCount = data?.outOfStockCount ?? 0;
	const totalUnpaid = data?.totalUnpaid ?? 0;
	const totalTaxAmount = data?.totalTaxAmount ?? 0;
	const totalShippingAmount = data?.totalShippingAmount ?? 0;
	const totalProducts = data?.totalProducts ?? 0;

	const isProfitPositive = grossProfit >= 0;
	const profitMarginPercent =
		grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : "0.0";

	const paymentDiscountPercent =
		grossSales > 0
			? ((totalPaymentDiscount / grossSales) * 100).toFixed(1)
			: "0.0";
	const allDiscountsSum = totalDiscount + totalPaymentDiscount;

	return (
		<div className="relative z-10 space-y-4">
			{/* Top Main 5 Primary KPI Cards (Executive Financial Overview) */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
				{/* 1. Gross Sales Card */}
				<div className={`${cardBaseClass} flex flex-col justify-between`}>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
								{t("dashboard.kpiGrossSales")}
							</span>
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
									{formatCurrency(grossSales)}
								</span>
							</div>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 shrink-0">
							<TrendingUp className="h-5 w-5" />
						</div>
					</div>

					<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs text-slate-500 dark:text-slate-400">
						<div className="flex items-center gap-1.5">
							<span className="text-slate-400">{t("finance.discount")}:</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200">
								{totalDiscount > 0
									? `-${formatCurrency(totalDiscount)}`
									: "$0.00"}
							</span>
						</div>
						{totalDiscount > 0 && (
							<Badge
								variant="outline"
								className="rounded-md border-amber-200/80 bg-amber-50/80 px-1.5 py-0 text-[10px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
							>
								-{formatCurrency(totalDiscount)}
							</Badge>
						)}
					</div>
				</div>

				{/* 2. Net Revenue Card (Blue Color) */}
				<div className={`${cardBaseClass} flex flex-col justify-between`}>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">
								{t("dashboard.kpiRevenue")}
							</span>
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 sm:text-3xl">
									{formatCurrency(netRevenue)}
								</span>
							</div>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 shrink-0">
							<CircleDollarSign className="h-5 w-5" />
						</div>
					</div>

					<div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs text-slate-500 dark:text-slate-400">
						<div className="flex items-center gap-1.5">
							<span className="text-slate-400">
								{t("dashboard.vsLastMonth")}
							</span>
						</div>
						<span className="font-semibold text-blue-600 dark:text-blue-400">
							{grossSales > 0
								? `${((netRevenue / grossSales) * 100).toFixed(0)}%`
								: "100%"}
						</span>
					</div>
				</div>

				{/* 3. Gross Profit Card (Green / Red based on profit) */}
				<div className={`${cardBaseClass} flex flex-col justify-between`}>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400/80">
								{t("dashboard.kpiGrossProfit")}
							</span>
							<div className="flex items-baseline gap-2">
								<span
									className={`text-2xl font-bold tracking-tight sm:text-3xl ${
										isProfitPositive
											? "text-emerald-600 dark:text-emerald-400"
											: "text-rose-600 dark:text-rose-400"
									}`}
								>
									{formatCurrency(grossProfit)}
								</span>
								<span
									className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
										isProfitPositive
											? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
											: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
									}`}
								>
									{isProfitPositive ? (
										<TrendingUp className="h-3 w-3" />
									) : (
										<TrendingDown className="h-3 w-3" />
									)}
									{profitMarginPercent}%
								</span>
							</div>
						</div>
						<div
							className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
								isProfitPositive
									? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
									: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
							}`}
						>
							<Percent className="h-5 w-5" />
						</div>
					</div>

					<div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs text-slate-500 dark:text-slate-400">
						<span className="text-slate-400">{t("common.status")}</span>
						<span
							className={`font-semibold ${isProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
						>
							{isProfitPositive ? t("common.success") : t("common.error")}
						</span>
					</div>
				</div>

				{/* 4. Total Payment Discount Card (Violet Theme) */}
				<div className={`${cardBaseClass} flex flex-col justify-between`}>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-violet-600/80 dark:text-violet-400/80">
								{t("dashboard.kpiPaymentDiscount", "Payment Discount")}
							</span>
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold tracking-tight text-violet-700 dark:text-violet-300 sm:text-3xl">
									{totalPaymentDiscount > 0
										? `-${formatCurrency(totalPaymentDiscount)}`
										: formatCurrency(0)}
								</span>
								{totalPaymentDiscount > 0 && (
									<span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
										-{paymentDiscountPercent}%
									</span>
								)}
							</div>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 shrink-0">
							<BadgePercent className="h-5 w-5" />
						</div>
					</div>

					<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs text-slate-500 dark:text-slate-400">
						<div className="flex items-center gap-1.5 truncate">
							<span className="text-slate-400">
								{t("dashboard.kpiTotalAllDiscounts", "Total Discounts")}:
							</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200">
								{allDiscountsSum > 0
									? `-${formatCurrency(allDiscountsSum)}`
									: "$0.00"}
							</span>
						</div>
						{totalPaymentDiscount > 0 ? (
							<Badge
								variant="outline"
								className="rounded-md border-violet-200/80 bg-violet-50/80 px-1.5 py-0 text-[10px] font-semibold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300"
							>
								-{formatCurrency(totalPaymentDiscount)}
							</Badge>
						) : (
							<span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.kpiPaymentDiscountSub", "Settlement discount")}
							</span>
						)}
					</div>
				</div>

				{/* 5. Unpaid Invoices & Receivables (Amber Card) */}
				<div className={`${cardBaseClass} flex flex-col justify-between`}>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80">
								{t("dashboard.kpiReceivables")}
							</span>
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 sm:text-3xl">
									{formatCurrency(totalUnpaid)}
								</span>
							</div>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 shrink-0">
							<CreditCard className="h-5 w-5" />
						</div>
					</div>

					<div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs text-slate-500 dark:text-slate-400">
						<Link
							href="/invoices"
							className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
						>
							<span>{t("dashboard.recentInvoices")}</span>
							<ArrowUpRight className="h-3.5 w-3.5" />
						</Link>
					</div>
				</div>
			</div>

			{/* Secondary Quick Metrics Strip (All clickable & redirected to respective pages/tabs) */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{/* 1. Low Stock Warning -> /inventory/stock?tab=low_stock */}
				<Link
					href="/inventory/stock?tab=low_stock"
					className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-amber-500/40 cursor-pointer"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
						<AlertTriangle className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
							{t("dashboard.kpiLowStock")}
						</span>
						<span className="text-base font-bold text-slate-900 dark:text-white">
							{formatNumber(lowStockCount)}
						</span>
					</div>
				</Link>

				{/* 2. Out of Stock Warning -> /inventory/stock?tab=out_of_stock */}
				<Link
					href="/inventory/stock?tab=out_of_stock"
					className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-rose-500/40 cursor-pointer"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
						<Boxes className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
							{t("dashboard.kpiOutOfStock")}
						</span>
						<div className="flex items-center gap-1.5">
							<span className="text-base font-bold text-rose-600 dark:text-rose-400">
								{formatNumber(outOfStockCount)}
							</span>
							{outOfStockCount > 0 && (
								<span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
									{t("common.warning")}
								</span>
							)}
						</div>
					</div>
				</Link>

				{/* 3. Total Orders -> /orders */}
				<Link
					href="/orders"
					className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-indigo-500/40 cursor-pointer"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
						<ShoppingCart className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
							{t("dashboard.kpiOrders")}
						</span>
						<span className="text-base font-bold text-slate-900 dark:text-white">
							{formatNumber(totalOrders)}
						</span>
					</div>
				</Link>

				{/* 4. Total Invoices -> /invoices */}
				<Link
					href="/invoices"
					className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-blue-500/40 cursor-pointer"
				>
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
						<Receipt className="h-4 w-4" />
					</div>
					<div className="min-w-0">
						<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
							{t("dashboard.kpiInvoices")}
						</span>
						<span className="text-base font-bold text-slate-900 dark:text-white">
							{formatNumber(totalInvoices)}
						</span>
					</div>
				</Link>
			</div>
		</div>
	);
}

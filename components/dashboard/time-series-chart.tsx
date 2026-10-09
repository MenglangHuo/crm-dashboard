"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import type { ApexOptions } from "apexcharts";
import {
	Activity,
	BarChart3,
	CircleDollarSign,
	CreditCard,
	FileCheck,
	LineChart,
	Percent,
	ShoppingCart,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeSeriesMetricItem } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface TimeSeriesChartProps {
	data?: TimeSeriesMetricItem[];
	isLoading?: boolean;
}

type ChartTab = "revenue" | "operations" | "payments";

function formatMoney(val: number) {
	if (val === undefined || val === null || isNaN(val)) return "$0.00";
	const isNeg = val < 0;
	const abs = Math.abs(val);
	if (abs >= 1000000)
		return `${isNeg ? "-" : ""}$${(abs / 1000000).toFixed(1)}M`;
	if (abs >= 1000) return `${isNeg ? "-" : ""}$${(abs / 1000).toFixed(1)}k`;
	return `${isNeg ? "-" : ""}$${abs.toFixed(2)}`;
}

function TimeSeriesChartComponent({ data, isLoading }: TimeSeriesChartProps) {
	const { t } = useTranslation();
	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";
	const [activeTab, setActiveTab] = React.useState<ChartTab>("revenue");

	// Theme-aware chart tokens
	const chartTheme = React.useMemo(() => {
		return {
			textColor: isDark ? "#cbd5e1" : "#475569",
			mutedColor: isDark ? "#64748b" : "#94a3b8",
			borderColor: isDark ? "#1e293b" : "#e2e8f0",
			tooltipTheme: (isDark ? "dark" : "light") as "dark" | "light",
			revenueColor: "#3b82f6",
			profitColor: "#10b981",
			lossColor: "#ef4444",
			ordersColor: "#6366f1",
			invoicesColor: "#a855f7",
			paymentsColor: "#06b6d4",
		};
	}, [isDark]);

	// Extract individual series datasets purely from dynamic API data
	const revenueData = React.useMemo(() => {
		const item = data?.find((m) => m.metric?.toLowerCase() === "revenue");
		return item?.series || [];
	}, [data]);

	const ordersData = React.useMemo(() => {
		const item = data?.find((m) => m.metric?.toLowerCase() === "orders");
		return item?.series || [];
	}, [data]);

	const invoicesData = React.useMemo(() => {
		const item = data?.find((m) => m.metric?.toLowerCase() === "invoices");
		return item?.series || [];
	}, [data]);

	const paymentsData = React.useMemo(() => {
		const item = data?.find((m) => m.metric?.toLowerCase() === "payments");
		return item?.series || [];
	}, [data]);

	// Aggregate stats for tab badges
	const totalRevenue = React.useMemo(
		() => revenueData.reduce((acc, p) => acc + (p.value || 0), 0),
		[revenueData],
	);
	const totalProfit = React.useMemo(
		() => revenueData.reduce((acc, p) => acc + (p.profit || 0), 0),
		[revenueData],
	);
	const totalOrdersCount = React.useMemo(
		() => ordersData.reduce((acc, p) => acc + (p.count || 0), 0),
		[ordersData],
	);
	const totalInvoicesCount = React.useMemo(
		() => invoicesData.reduce((acc, p) => acc + (p.count || 0), 0),
		[invoicesData],
	);
	const totalPayments = React.useMemo(
		() => paymentsData.reduce((acc, p) => acc + (p.value || 0), 0),
		[paymentsData],
	);

	// 1. REVENUE & PROFIT CHART OPTIONS
	const isRevenueSingle = revenueData.length === 1;
	const revenueChartType = isRevenueSingle ? "bar" : "area";

	const revenueChartOptions = React.useMemo<ApexOptions>(
		() => ({
			chart: {
				type: revenueChartType,
				background: "transparent",
				toolbar: { show: false },
				animations: { enabled: true, speed: 400 },
			},
			...(isRevenueSingle
				? {
						plotOptions: {
							bar: {
								horizontal: false,
								columnWidth: "40%",
								borderRadius: 6,
							},
						},
					}
				: {
						stroke: {
							curve: "smooth",
							width: [2.5, 2.5],
						},
						fill: {
							type: "gradient",
							gradient: {
								shadeIntensity: 1,
								opacityFrom: 0.35,
								opacityTo: 0.05,
								stops: [0, 95, 100],
							},
						},
					}),
			colors: [chartTheme.revenueColor, chartTheme.profitColor],
			xaxis: {
				categories: revenueData.map((d) => d.date),
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
				},
				axisBorder: { color: chartTheme.borderColor },
				axisTicks: { color: chartTheme.borderColor },
			},
			yaxis: {
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
					formatter: (val) => formatMoney(val),
				},
			},
			grid: {
				borderColor: chartTheme.borderColor,
				strokeDashArray: 3,
				padding: { top: 0, right: 10, bottom: 0, left: 10 },
			},
			dataLabels: { enabled: false },
			legend: {
				position: "top",
				horizontalAlign: "right",
				fontSize: "11px",
				fontWeight: 600,
				labels: { colors: chartTheme.textColor },
				markers: { shape: "circle", size: 5 },
			},
			tooltip: {
				theme: chartTheme.tooltipTheme,
				y: {
					formatter: (val) => {
						if (typeof val !== "number" || isNaN(val)) return "$0.00";
						const isNeg = val < 0;
						return `${isNeg ? "-" : ""}$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
					},
				},
			},
		}),
		[isRevenueSingle, revenueChartType, revenueData, chartTheme],
	);

	const revenueSeries = React.useMemo(
		() => [
			{
				name: t("dashboard.netRevenue"),
				data: revenueData.map((d) => d.value ?? 0),
			},
			{
				name: t("dashboard.grossProfitLoss"),
				data: revenueData.map((d) => d.profit ?? 0),
			},
		],
		[revenueData, t],
	);

	// 2. OPERATIONS (ORDERS & INVOICES) CHART OPTIONS
	const opDates = React.useMemo(
		() =>
			Array.from(
				new Set([
					...ordersData.map((d) => d.date),
					...invoicesData.map((d) => d.date),
				]),
			).sort(),
		[ordersData, invoicesData],
	);
	const isOpSingle = opDates.length === 1;
	const operationsChartType = isOpSingle ? "bar" : "line";

	const operationsChartOptions = React.useMemo<ApexOptions>(
		() => ({
			chart: {
				type: operationsChartType,
				background: "transparent",
				toolbar: { show: false },
				animations: { enabled: true, speed: 400 },
			},
			...(isOpSingle
				? {
						plotOptions: {
							bar: {
								horizontal: false,
								columnWidth: "40%",
								borderRadius: 6,
							},
						},
					}
				: {
						stroke: {
							curve: "smooth",
							width: [3, 3],
						},
						markers: {
							size: 4,
							strokeWidth: 2,
							hover: { size: 6 },
						},
					}),
			colors: [chartTheme.ordersColor, chartTheme.invoicesColor],
			xaxis: {
				categories: opDates,
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
				},
				axisBorder: { color: chartTheme.borderColor },
				axisTicks: { color: chartTheme.borderColor },
			},
			yaxis: {
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
					formatter: (val) =>
						typeof val === "number" && !isNaN(val)
							? `${Math.round(val)}`
							: "0",
				},
			},
			grid: {
				borderColor: chartTheme.borderColor,
				strokeDashArray: 3,
				padding: { top: 0, right: 10, bottom: 0, left: 10 },
			},
			dataLabels: { enabled: false },
			legend: {
				position: "top",
				horizontalAlign: "right",
				fontSize: "11px",
				fontWeight: 600,
				labels: { colors: chartTheme.textColor },
				markers: { shape: "circle", size: 5 },
			},
			tooltip: {
				theme: chartTheme.tooltipTheme,
				y: {
					formatter: (val) =>
						`${typeof val === "number" && !isNaN(val) ? val : 0} ${t("common.entries")}`,
				},
			},
		}),
		[isOpSingle, operationsChartType, opDates, chartTheme, t],
	);

	const operationsSeries = React.useMemo(
		() => [
			{
				name: t("dashboard.kpiOrders"),
				data: opDates.map((date) => {
					const item = ordersData.find((d) => d.date === date);
					return item?.count ?? 0;
				}),
			},
			{
				name: t("dashboard.kpiInvoices"),
				data: opDates.map((date) => {
					const item = invoicesData.find((d) => d.date === date);
					return item?.count ?? 0;
				}),
			},
		],
		[opDates, ordersData, invoicesData, t],
	);

	// 3. CASH FLOW & PAYMENTS INFLOW CHART OPTIONS
	const isPaySingle = paymentsData.length === 1;
	const paymentsChartType = isPaySingle ? "bar" : "area";

	const paymentsChartOptions = React.useMemo<ApexOptions>(
		() => ({
			chart: {
				type: paymentsChartType,
				background: "transparent",
				toolbar: { show: false },
				animations: { enabled: true, speed: 400 },
			},
			...(isPaySingle
				? {
						plotOptions: {
							bar: {
								horizontal: false,
								columnWidth: "40%",
								borderRadius: 6,
							},
						},
					}
				: {
						stroke: {
							curve: "smooth",
							width: 2.5,
						},
						fill: {
							type: "gradient",
							gradient: {
								shadeIntensity: 1,
								opacityFrom: 0.35,
								opacityTo: 0.05,
								stops: [0, 95, 100],
							},
						},
					}),
			colors: [chartTheme.paymentsColor],
			xaxis: {
				categories: paymentsData.map((d) => d.date),
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
				},
				axisBorder: { color: chartTheme.borderColor },
				axisTicks: { color: chartTheme.borderColor },
			},
			yaxis: {
				labels: {
					style: {
						colors: chartTheme.mutedColor,
						fontSize: "11px",
						fontWeight: 500,
					},
					formatter: (val) => formatMoney(val),
				},
			},
			grid: {
				borderColor: chartTheme.borderColor,
				strokeDashArray: 3,
				padding: { top: 0, right: 10, bottom: 0, left: 10 },
			},
			dataLabels: { enabled: false },
			legend: {
				position: "top",
				horizontalAlign: "right",
				fontSize: "11px",
				fontWeight: 600,
				labels: { colors: chartTheme.textColor },
				markers: { shape: "circle", size: 5 },
			},
			tooltip: {
				theme: chartTheme.tooltipTheme,
				y: {
					formatter: (val) => {
						if (typeof val !== "number" || isNaN(val)) return "$0.00";
						const isNeg = val < 0;
						return `${isNeg ? "-" : ""}$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
					},
				},
			},
		}),
		[isPaySingle, paymentsChartType, paymentsData, chartTheme],
	);

	const paymentsSeries = React.useMemo(
		() => [
			{
				name: t("dashboard.tabPayments"),
				data: paymentsData.map((d) => d.value ?? 0),
			},
		],
		[paymentsData, t],
	);

	if (isLoading) {
		return (
			<div className="h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85">
				<div className="flex items-center justify-between pb-4">
					<Skeleton className="h-6 w-44" />
					<Skeleton className="h-8 w-60 rounded-xl" />
				</div>
				<Skeleton className="h-72 w-full rounded-xl" />
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-6">
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
				<div className="flex items-center gap-2 shrink-0">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
						<Activity className="h-4 w-4" />
					</div>
					<h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
						{t("dashboard.timeSeriesTrends")}
					</h2>
				</div>

				<div className="inline-flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("revenue")}
						className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
							activeTab === "revenue"
								? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						}`}
					>
						<CircleDollarSign className="h-3.5 w-3.5 shrink-0" />
						<span>{t("dashboard.tabRevenue")}</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("operations")}
						className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
							activeTab === "operations"
								? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						}`}
					>
						<ShoppingCart className="h-3.5 w-3.5 shrink-0" />
						<span>{t("dashboard.tabOrders")}</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("payments")}
						className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
							activeTab === "payments"
								? "bg-white text-cyan-600 shadow-xs dark:bg-slate-700 dark:text-cyan-300"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						}`}
					>
						<CreditCard className="h-3.5 w-3.5 shrink-0" />
						<span>{t("dashboard.tabPayments")}</span>
					</button>
				</div>
			</div>

			<div className="my-4 h-72 w-full">
				{activeTab === "revenue" &&
					(revenueData.length > 0 ? (
						<Chart
							key={`revenue-${revenueChartType}`}
							options={revenueChartOptions}
							series={revenueSeries}
							type={revenueChartType}
							height={288}
							width="100%"
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center text-center text-xs text-slate-400">
							<BarChart3 className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
							<p>{t("dashboard.noRevenueData")}</p>
						</div>
					))}
				{activeTab === "operations" &&
					(opDates.length > 0 ? (
						<Chart
							key={`operations-${operationsChartType}`}
							options={operationsChartOptions}
							series={operationsSeries}
							type={operationsChartType}
							height={288}
							width="100%"
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center text-center text-xs text-slate-400">
							<ShoppingCart className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
							<p>{t("dashboard.noOrdersData")}</p>
						</div>
					))}
				{activeTab === "payments" &&
					(paymentsData.length > 0 ? (
						<Chart
							key={`payments-${paymentsChartType}`}
							options={paymentsChartOptions}
							series={paymentsSeries}
							type={paymentsChartType}
							height={288}
							width="100%"
						/>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center text-center text-xs text-slate-400">
							<CreditCard className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
							<p>{t("dashboard.noPaymentsData")}</p>
						</div>
					))}
			</div>

			<div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800/80 sm:grid-cols-4">
				{activeTab === "revenue" && (
					<>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.periodRevenue")}
							</span>
							<span className="text-sm font-bold text-blue-600 dark:text-blue-400">
								$
								{totalRevenue.toLocaleString("en-US", {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.grossProfitDeficit")}
							</span>
							<span
								className={`text-sm font-bold ${
									totalProfit >= 0
										? "text-emerald-600 dark:text-emerald-400"
										: "text-rose-600 dark:text-rose-400"
								}`}
							>
								$
								{totalProfit.toLocaleString("en-US", {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.profitMargin")}
							</span>
							<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
								{totalRevenue > 0
									? ((totalProfit / totalRevenue) * 100).toFixed(1)
									: "0.0"}
								%
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.activeMonths")}
							</span>
							<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
								{revenueData.length} {t("dashboard.recorded")}
							</span>
						</div>
					</>
				)}

				{activeTab === "operations" && (
					<>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.kpiOrders")}
							</span>
							<span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
								{totalOrdersCount}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.kpiInvoices")}
							</span>
							<span className="text-sm font-bold text-purple-600 dark:text-purple-400">
								{totalInvoicesCount}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.conversionRate")}
							</span>
							<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
								{totalOrdersCount > 0
									? ((totalInvoicesCount / totalOrdersCount) * 100).toFixed(0)
									: "0"}
								%
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.operationalHealth")}
							</span>
							<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
								{t("common.active")}
							</span>
						</div>
					</>
				)}

				{activeTab === "payments" && (
					<>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.totalInflow")}
							</span>
							<span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
								$
								{totalPayments.toLocaleString("en-US", {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.latestInflow")}
							</span>
							<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
								$
								{(
									paymentsData[paymentsData.length - 1]?.value ?? 0
								).toLocaleString("en-US", {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.historicalPeak")}
							</span>
							<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
								$
								{Math.max(
									0,
									...paymentsData.map((d) => d.value ?? 0),
								).toLocaleString("en-US", {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="rounded-2xl bg-slate-50/80 p-3 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800/40">
							<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500">
								{t("dashboard.collectionStatus")}
							</span>
							<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
								{t("dashboard.reconciled")}
							</span>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export const TimeSeriesChart = React.memo(TimeSeriesChartComponent);


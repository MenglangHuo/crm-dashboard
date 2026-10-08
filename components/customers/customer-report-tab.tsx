"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customerReportsApi } from "@/lib/api/endpoints";
import dynamic from "next/dynamic";
import {
	DollarSign,
	ShoppingCart,
	FileText,
	TrendingUp,
	CreditCard,
	Percent,
	Truck,
	Receipt,
	Clock,
	Calendar,
} from "lucide-react";

import { useTheme } from "next-themes";
import type { ApexOptions } from "apexcharts";

// Dynamically import ApexCharts for Next.js SSR compatibility
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
	ssr: false,
});

import { ModernButton } from "@/components/ui-custom/button";

interface Props {
	customerId: number | string;
	customerName?: string;
	currency?: string;
}

import { useTranslation } from "@/lib/i18n/context";

export function CustomerReportTab({
	customerId,
	customerName,
	currency = "USD",
}: Props) {
	const { t } = useTranslation();
	const [dateRange, setDateRange] = useState<"30d" | "90d" | "1y" | "all">(
		"30d",
	);
	const [activeChartMetric, setActiveChartMetric] = useState<
		"revenue" | "orders" | "payments"
	>("revenue");

	const getDates = () => {
		const end = new Date();
		const start = new Date();
		if (dateRange === "30d") start.setDate(end.getDate() - 30);
		else if (dateRange === "90d") start.setDate(end.getDate() - 90);
		else if (dateRange === "1y") start.setFullYear(end.getFullYear() - 1);
		else return {};

		return {
			startDate: start.toISOString(),
			endDate: end.toISOString(),
		};
	};

	const filterDates = getDates();

	// 1. Fetch Aggregate Customer Financial Summary
	const { data: summary, isLoading: isLoadingSummary } = useQuery({
		queryKey: ["customer-report-summary", String(customerId), dateRange],
		queryFn: () =>
			customerReportsApi.getReport({
				customerId,
				...filterDates,
			}),
	});

	// 2. Fetch Time-Series Curves
	const { data: timeSeries = [], isLoading: isLoadingSeries } = useQuery({
		queryKey: ["customer-report-timeseries", String(customerId), dateRange],
		queryFn: () =>
			customerReportsApi.getTimeSeries({
				customerId,
				...filterDates,
			}),
	});

	const revenueMetric = timeSeries.find((m) => m.metric === "revenue");
	const ordersMetric = timeSeries.find((m) => m.metric === "orders");
	const invoicesMetric = timeSeries.find((m) => m.metric === "invoices");
	const paymentsMetric = timeSeries.find((m) => m.metric === "payments");

	const categories =
		revenueMetric?.series.map((p) => p.date) ||
		ordersMetric?.series.map((p) => p.date) ||
		[];

	const revenueValues =
		revenueMetric?.series.map((p) => Number(p.value || 0)) || [];
	const profitValues =
		revenueMetric?.series.map((p) => Number(p.profit || 0)) || [];
	const orderCounts =
		ordersMetric?.series.map((p) => Number(p.count || 0)) || [];
	const invoiceCounts =
		invoicesMetric?.series.map((p) => Number(p.count || 0)) || [];
	const paymentValues =
		paymentsMetric?.series.map((p) => Number(p.value || 0)) || [];

	const formatMoney = (amount?: number) => {
		if (amount === undefined || amount === null) return "$0.00";
		return `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	const { resolvedTheme } = useTheme();
	const isDark = resolvedTheme === "dark";

	const chartTheme = React.useMemo(() => {
		return {
			textColor: isDark ? "#cbd5e1" : "#475569",
			mutedColor: isDark ? "#64748b" : "#94a3b8",
			borderColor: isDark ? "#1e293b" : "#e2e8f0",
			tooltipTheme: (isDark ? "dark" : "light") as "dark" | "light",
			revenueColor: "#3b82f6",
			profitColor: "#10b981",
			ordersColor: "#6366f1",
			invoicesColor: "#f59e0b",
			paymentsColor: "#8b5cf6",
		};
	}, [isDark]);

	// Revenue & Profit Chart Options
	const isRevenueSingle = revenueMetric?.series ? revenueMetric.series.length <= 1 : true;
	const revenueChartType = isRevenueSingle ? "bar" : "area";
	const revenueCategories = revenueMetric?.series.map((p) => p.date) || [];

	const revenueChartOptions: ApexOptions = {
		chart: {
			type: revenueChartType,
			toolbar: { show: false },
			background: "transparent",
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
					stroke: { curve: "smooth", width: [2.5, 2.5] },
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
			categories: revenueCategories,
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
				formatter: (val) => `$${Number(val).toLocaleString()}`,
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
		},
		tooltip: {
			theme: chartTheme.tooltipTheme,
			y: {
				formatter: (val) =>
					`$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
			},
		},
	};

	// Operations (Orders & Invoices) Chart Options
	const opDates = React.useMemo(() => {
		const orderDates = ordersMetric?.series.map((p) => p.date) || [];
		const invoiceDates = invoicesMetric?.series.map((p) => p.date) || [];
		return Array.from(new Set([...orderDates, ...invoiceDates])).sort();
	}, [ordersMetric, invoicesMetric]);

	const isOpSingle = opDates.length <= 1;
	const operationsChartType = isOpSingle ? "bar" : "line";

	const operationsChartOptions: ApexOptions = {
		chart: {
			type: operationsChartType,
			toolbar: { show: false },
			background: "transparent",
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
					stroke: { curve: "smooth", width: [3, 3] },
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
				formatter: (val) => `${Math.round(val)}`,
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
		},
		tooltip: {
			theme: chartTheme.tooltipTheme,
			y: {
				formatter: (val) => `${val} entries`,
			},
		},
	};

	const operationsSeries = [
		{
			name: "Orders Placed",
			data: opDates.map((d) => {
				const item = ordersMetric?.series.find((p) => p.date === d);
				return item?.count ?? 0;
			}),
		},
		{
			name: "Invoices Generated",
			data: opDates.map((d) => {
				const item = invoicesMetric?.series.find((p) => p.date === d);
				return item?.count ?? 0;
			}),
		},
	];

	// Payments Chart Options
	const paymentDates = paymentsMetric?.series.map((p) => p.date) || [];
	const isPaySingle = paymentDates.length <= 1;
	const paymentsChartType = isPaySingle ? "bar" : "area";

	const paymentsChartOptions: ApexOptions = {
		chart: {
			type: paymentsChartType,
			toolbar: { show: false },
			background: "transparent",
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
					stroke: { curve: "smooth", width: 2.5 },
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
			categories: paymentDates,
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
				formatter: (val) => `$${Number(val).toLocaleString()}`,
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
		},
		tooltip: {
			theme: chartTheme.tooltipTheme,
			y: {
				formatter: (val) =>
					`$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
			},
		},
	};

	return (
		<div className="space-y-6">
			{/* Header & Date Range Filter */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
				<div>
					<h3 className="text-base font-bold text-slate-950 dark:text-white">
						{t("customers.financialTitle")}
					</h3>
					<p className="text-xs text-slate-500 mt-0.5">
						{t("customers.financialSubtitle")}
					</p>
				</div>

				<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
					{(["30d", "90d", "1y", "all"] as const).map((r) => (
						<button
							key={r}
							onClick={() => setDateRange(r)}
							className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
								dateRange === r
									? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							{r === "30d"
								? t("customers.last30Days")
								: r === "90d"
									? t("customers.last90Days")
									: r === "1y"
										? t("customers.last1Year")
										: t("customers.allTime")}
						</button>
					))}
				</div>
			</div>

			{/* Financial KPI Summary Cards Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
				{/* Unpaid Balance */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/60 shadow-xs">
					<span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
						{t("customers.unpaidBalance")}
					</span>
					<div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
						{isLoadingSummary ? "..." : formatMoney(summary?.totalUnpaid)}
					</div>
				</div>

				{/* Net Revenue */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/60 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						{t("customers.netRevenue")}
					</span>
					<div className="text-lg font-black text-slate-950 dark:text-white mt-1">
						{isLoadingSummary ? "..." : formatMoney(summary?.netRevenue)}
					</div>
				</div>

				{/* Gross Profit */}
				<div className="rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 p-3.5 bg-emerald-500/5 shadow-xs">
					<span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
						{t("customers.grossProfit")}
					</span>
					<div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
						{isLoadingSummary ? "..." : formatMoney(summary?.grossProfit)}
					</div>
				</div>

				{/* Total Orders */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/60 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						{t("customers.ordersPlaced")}
					</span>
					<div className="text-lg font-black text-slate-950 dark:text-white mt-1">
						{isLoadingSummary ? "..." : summary?.totalOrders || 0}
					</div>
				</div>

				{/* Total Invoices */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/60 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						{t("customers.invoices")}
					</span>
					<div className="text-lg font-black text-slate-950 dark:text-white mt-1">
						{isLoadingSummary ? "..." : summary?.totalInvoices || 0}
					</div>
				</div>

				{/* Gross Sales */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/60 shadow-xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
						{t("customers.grossSales")}
					</span>
					<div className="text-lg font-black text-slate-950 dark:text-white mt-1">
						{isLoadingSummary ? "..." : formatMoney(summary?.grossSales)}
					</div>
				</div>
			</div>

			{/* Main Interactive Chart Section */}
			<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xs space-y-4">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
					<div>
						<h4 className="text-sm font-bold text-slate-900 dark:text-white">
							{activeChartMetric === "revenue"
								? t("customers.revenueTrendTitle")
								: activeChartMetric === "orders"
									? t("customers.ordersTrendTitle")
									: t("customers.paymentsTrendTitle")}
						</h4>
						<p className="text-xs text-slate-500 mt-0.5">
							{t("customers.timeSeriesSubtitle")}
						</p>
					</div>

					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
						<button
							onClick={() => setActiveChartMetric("revenue")}
							className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								activeChartMetric === "revenue"
									? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<DollarSign className="h-3.5 w-3.5" />
							<span>{t("customers.revenueAndProfit")}</span>
						</button>
						<button
							onClick={() => setActiveChartMetric("orders")}
							className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								activeChartMetric === "orders"
									? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<ShoppingCart className="h-3.5 w-3.5" />
							<span>{t("customers.ordersAndInvoices")}</span>
						</button>
						<button
							onClick={() => setActiveChartMetric("payments")}
							className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all inline-flex items-center gap-1.5 cursor-pointer ${
								activeChartMetric === "payments"
									? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<CreditCard className="h-3.5 w-3.5" />
							<span>{t("customers.payments")}</span>
						</button>
					</div>
				</div>

				{isLoadingSeries ? (
					<div className="h-72 flex items-center justify-center text-xs text-slate-400">
						<Clock className="mr-2 h-4 w-4 animate-spin" /> Loading analytics
						charts...
					</div>
				) : (
					<div>
						{activeChartMetric === "revenue" && (
							revenueCategories.length === 0 ? (
								<div className="h-64 flex items-center justify-center text-xs text-slate-400">
									No revenue transaction records found for this period.
								</div>
							) : (
								<ReactApexChart
									type={revenueChartType}
									height={320}
									series={[
										{ name: "Net Revenue", data: revenueValues },
										{ name: "Gross Profit", data: profitValues },
									]}
									options={revenueChartOptions}
								/>
							)
						)}

						{activeChartMetric === "orders" && (
							opDates.length === 0 ? (
								<div className="h-64 flex items-center justify-center text-xs text-slate-400">
									No order or invoice records found for this period.
								</div>
							) : (
								<ReactApexChart
									type={operationsChartType}
									height={320}
									series={operationsSeries}
									options={operationsChartOptions}
								/>
							)
						)}

						{activeChartMetric === "payments" && (
							paymentDates.length === 0 ? (
								<div className="h-64 flex items-center justify-center text-xs text-slate-400">
									No payment records found for this period.
								</div>
							) : (
								<ReactApexChart
									type={paymentsChartType}
									height={320}
									series={[{ name: "Payments Collected", data: paymentValues }]}
									options={paymentsChartOptions}
								/>
							)
						)}
					</div>
				)}
			</div>
		</div>
	);
}

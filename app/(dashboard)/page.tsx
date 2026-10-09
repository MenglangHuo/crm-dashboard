"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	reportsApi,
	feedbackApi,
	usersApi,
	safeImageUrl,
} from "@/lib/api/endpoints";
import {
	DashboardHeader,
	FinancialKpiGrid,
	TimeSeriesChart,
	IncomeComparisonWidget,
	TopProductsCard,
} from "@/components/dashboard";
import {
	getDateRangeForPreset,
	type DateRangeValue,
} from "@/components/ui-custom/form-controls/modern-date-range-picker";
import { useCompanyContext } from "@/components/providers/company-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	ArrowUpRight,
	CheckCircle2,
	Download,
	Inbox,
	Loader2,
	MessageSquare,
	Sparkles,
	Star,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";
import type {
	DashboardReportData,
	TimeSeriesMetricItem,
	IncomeComparisonData,
} from "@/lib/types";

// Empty fallback structure for initial unpopulated state
const EMPTY_DASHBOARD_DATA: DashboardReportData = {
	totalProducts: 0,
	totalOrders: 0,
	totalInvoices: 0,
	lowStockCount: 0,
	outOfStockCount: 0,
	netRevenue: 0,
	grossSales: 0,
	grossProfit: 0,
	totalDiscount: 0,
	totalTaxAmount: 0,
	totalShippingAmount: 0,
	totalUnpaid: 0,
	totalPaymentDiscount: 0,
	topProductsByRevenue: [],
	topProductsByQuantity: [],
};

const cardClass =
	"rounded-2xl border border-slate-200/80 bg-white/90 shadow-xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/85";

export default function DashboardPage() {
	const queryClient = useQueryClient();
	const { selectedCompanyId, companies, isSystemAdmin } = useCompanyContext();
	const { t } = useTranslation();

	// 1. Date Range & Preset Filter State (Today is default)
	const initialToday = React.useMemo(() => getDateRangeForPreset("today"), []);
	const [dateRange, setDateRange] = React.useState<DateRangeValue>({
		startDate: initialToday.startDate,
		endDate: initialToday.endDate,
		preset: "today",
	});

	// 2. Staff / User Filter State (Option to filter by specific staff or all users)
	const [selectedUserId, setSelectedUserId] = React.useState<
		string | number | null
	>(null);

	// 3. Modals & Refresh State
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const [lastRefreshedTime, setLastRefreshedTime] = React.useState<string>("");

	React.useEffect(() => {
		setLastRefreshedTime(
			new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			}),
		);
	}, []);

	// 4. Fetch Users in Company for the Staff Filter dropdown
	const { data: usersData, isLoading: isLoadingUsers } = useQuery({
		queryKey: ["users-list-dashboard", selectedCompanyId],
		queryFn: () => usersApi.list({ page: 1, limit: 100 }),
		staleTime: 5 * 60 * 1000,
	});
	const users = usersData?.items || [];
	const selectedCompany = companies.find(
		(c) => String(c.id) === String(selectedCompanyId),
	);

	// 5. Report API Queries (POST with body payload containing companyId, userId, startDate, endDate)
	const {
		data: dashboardData,
		isLoading: isLoadingDashboard,
		isFetching: isFetchingDashboard,
		refetch: refetchDashboard,
	} = useQuery({
		queryKey: [
			"dashboard-report",
			dateRange.startDate,
			dateRange.endDate,
			selectedCompanyId,
			selectedUserId,
		],
		queryFn: () =>
			reportsApi.getDashboard({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				companyId: selectedCompanyId,
				userId: selectedUserId,
			}),
		retry: 1,
	});

	const {
		data: timeSeriesData,
		isLoading: isLoadingTimeSeries,
		refetch: refetchTimeSeries,
	} = useQuery({
		queryKey: [
			"time-series-report",
			dateRange.startDate,
			dateRange.endDate,
			selectedCompanyId,
			selectedUserId,
		],
		queryFn: () =>
			reportsApi.getTimeSeries({
				startDate: dateRange.startDate,
				endDate: dateRange.endDate,
				companyId: selectedCompanyId,
				userId: selectedUserId,
			}),
		retry: 1,
	});

	const {
		data: incomeData,
		isLoading: isLoadingIncome,
		refetch: refetchIncome,
	} = useQuery({
		queryKey: ["income-comparison-report"],
		queryFn: () => reportsApi.getIncomeComparison(),
		retry: 1,
	});

	// 5d. Fetch Feedback Templates to dynamically get template info
	const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
		queryKey: ["feedback-templates-summary", selectedCompanyId],
		queryFn: () => feedbackApi.searchTemplates({ size: 20 }),
		staleTime: 60 * 1000,
	});
	const templatesList = templatesData?.items || [];
	const firstTemplateId = templatesList[0]?.templateId;

	// 5e. Recent CSAT & customer feedback evaluations from API
	const {
		data: submissionsData,
		isLoading: isLoadingSubmissions,
		refetch: refetchSubmissions,
	} = useQuery({
		queryKey: [
			"feedback-submissions-summary",
			selectedCompanyId,
			firstTemplateId,
		],
		queryFn: async () => {
			if (firstTemplateId) {
				return feedbackApi.searchSubmissions(firstTemplateId, { size: 6 });
			}
			return feedbackApi.listSubmissions({ limit: 6 });
		},
		enabled: Boolean(firstTemplateId || !isLoadingTemplates),
		staleTime: 45 * 1000,
	});

	// 6. Dynamic Real-time API Data
	const finalDashboard = dashboardData || EMPTY_DASHBOARD_DATA;
	const finalTimeSeries = timeSeriesData || [];
	const finalIncome = incomeData || { comparisons: [] };

	// 7. Refresh Reports action
	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			const res = await reportsApi.refreshReports();
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["dashboard-report"] }),
				queryClient.invalidateQueries({ queryKey: ["time-series-report"] }),
				queryClient.invalidateQueries({
					queryKey: ["income-comparison-report"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["feedback-submissions-summary"],
				}),
			]);
			const nowStr = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			setLastRefreshedTime(nowStr);
			toast.success(res?.message || "Dashboard report generated successfully", {
				description: `Synced latest transactions at ${nowStr}`,
			});
		} catch {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["dashboard-report"] }),
				queryClient.invalidateQueries({ queryKey: ["time-series-report"] }),
				queryClient.invalidateQueries({
					queryKey: ["income-comparison-report"],
				}),
				queryClient.invalidateQueries({
					queryKey: ["feedback-submissions-summary"],
				}),
			]);
			const nowStr = new Date().toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
			setLastRefreshedTime(nowStr);
			toast.success("Dashboard metrics refreshed successfully");
		} finally {
			setIsRefreshing(false);
		}
	};

	// Live Customer Feedback evaluations strictly from API
	const feedbackRows = React.useMemo(() => {
		if (!submissionsData?.items || submissionsData.items.length === 0) {
			return [];
		}
		return submissionsData.items.map((sub: any, i: number) => {
			const matchedTemplate =
				sub.template?.name ||
				templatesList.find(
					(t) => String(t.templateId) === String(sub.templateId),
				)?.name ||
				"CSAT Survey";
			const customerDisplayName =
				sub.customerName ||
				sub.userName ||
				(sub.customer
					? `${sub.customer.firstName || ""} ${sub.customer.lastName || ""}`.trim() ||
						sub.customer.name
					: null) ||
				(sub.customerId
					? `Customer #${sub.customerId}`
					: `Feedback #${sub.submissionId || i + 1}`);

			const formattedDate = sub.submittedAt
				? new Date(sub.submittedAt).toLocaleDateString()
				: sub.createdAt
					? new Date(sub.createdAt).toLocaleDateString()
					: "—";

			return {
				id: `SUB-${sub.submissionId || sub.id || i + 1}`,
				name: customerDisplayName,
				templateName: matchedTemplate,
				date: formattedDate,
				channel: sub.channel || "WEB",
				score:
					sub.totalScore !== undefined && sub.totalScore !== null
						? Number(sub.totalScore).toFixed(1)
						: "—",
				status: sub.status || "COMPLETED",
				imageUrl: sub.customerAvatar || sub.customer?.avatar || "",
			};
		});
	}, [submissionsData, templatesList]);

	return (
		<div className="space-y-6 pb-12">
			{/* 1. Header with Live Status, Date Preset Selector, Staff Filter, Range Picker & Refresh Button */}
			<DashboardHeader
				title={t("dashboard.title")}
				description={t("dashboard.description")}
				lastUpdated={lastRefreshedTime}
				isRefreshing={isRefreshing || isFetchingDashboard}
				onRefresh={handleRefresh}
				dateRange={dateRange}
				onDateRangeChange={setDateRange}
				selectedUserId={selectedUserId}
				onUserIdChange={setSelectedUserId}
				users={users}
				isLoadingUsers={isLoadingUsers}
				selectedCompanyName={isSystemAdmin ? selectedCompany?.name : null}
			/>

			{/* 2. Primary Financial & Operational KPI Cards Grid */}
			<FinancialKpiGrid
				data={finalDashboard}
				isLoading={isLoadingDashboard && !dashboardData}
			/>

			{/* 3. Performance Timeline Chart & Top Products Row (Equal Height) */}
			<section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
				{/* Time-Series Analytics (7 cols) */}
				<div className="lg:col-span-7 flex flex-col">
					<TimeSeriesChart
						data={finalTimeSeries}
						isLoading={isLoadingTimeSeries && !timeSeriesData}
					/>
				</div>

				{/* Top Performing Products (5 cols) */}
				<div className="lg:col-span-5 flex flex-col">
					<TopProductsCard
						byRevenue={finalDashboard.topProductsByRevenue}
						byQuantity={finalDashboard.topProductsByQuantity}
						isLoading={isLoadingDashboard && !dashboardData}
					/>
				</div>
			</section>

			{/* 4. Income Variance & Period Comparison Analysis */}
			<section>
				<IncomeComparisonWidget
					data={finalIncome}
					isLoading={isLoadingIncome && !incomeData}
				/>
			</section>

			{/* 5. Recent Customer Feedback & Evaluations Section */}
			<section className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90 space-y-4 sm:p-6">
				<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400">
								<MessageSquare className="h-4 w-4" />
							</div>
							<h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
								{t("dashboard.recentFeedback")}
							</h2>
						</div>
						<p className="text-xs font-normal text-slate-400 dark:text-slate-500">
							{t("dashboard.recentFeedbackSub")}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							render={<Link href="/feedback" />}
							variant="default"
							size="sm"
							className="h-9 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-2xs"
						>
							<MessageSquare className="mr-1.5 h-3.5 w-3.5" />{" "}
							{t("dashboard.feedbackPortal")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="h-9 rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
						>
							<Download className="mr-1.5 h-3.5 w-3.5 text-slate-400" />{" "}
							{t("dashboard.exportData")}
						</Button>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
					<Table>
						<TableHeader className="bg-slate-50/80 dark:bg-slate-900">
							<TableRow className="border-b border-slate-100 dark:border-slate-800">
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("dashboard.submissionId")}
								</TableHead>
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("orders.customer")}
								</TableHead>
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("dashboard.surveyTemplate")}
								</TableHead>
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("dashboard.channel")}
								</TableHead>
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("dashboard.ratingScore")}
								</TableHead>
								<TableHead className="text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("dashboard.submittedDate")}
								</TableHead>
								<TableHead className="text-right text-xs font-bold text-slate-500 dark:text-slate-400">
									{t("common.status")}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoadingSubmissions || isLoadingTemplates ? (
								Array.from({ length: 4 }).map((_, i) => (
									<TableRow key={i} className="border-b border-slate-100 dark:border-slate-800/60">
										<TableCell><Skeleton className="h-4 w-16" /></TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Skeleton className="h-7 w-7 rounded-lg" />
												<Skeleton className="h-4 w-24" />
											</div>
										</TableCell>
										<TableCell><Skeleton className="h-4 w-28" /></TableCell>
										<TableCell><Skeleton className="h-4 w-12" /></TableCell>
										<TableCell><Skeleton className="h-4 w-10" /></TableCell>
										<TableCell><Skeleton className="h-4 w-20" /></TableCell>
										<TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded-full" /></TableCell>
									</TableRow>
								))
							) : feedbackRows.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="h-32 text-center text-xs text-muted-foreground"
									>
										<div className="flex flex-col items-center justify-center gap-2 py-4">
											<Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
											<p className="font-medium text-slate-500 dark:text-slate-400">
												{t(
													"dashboard.noFeedback",
													"No feedback submissions found yet",
												)}
											</p>
											<Link
												href="/feedback"
												className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline dark:text-pink-400"
											>
												{t(
													"dashboard.goToFeedbackPortal",
													"Open Feedback Portal",
												)}{" "}
												&rarr;
											</Link>
										</div>
									</TableCell>
								</TableRow>
							) : (
								feedbackRows.map((row) => {
									const scoreNum = parseFloat(row.score);
									const isHigh = !isNaN(scoreNum) && scoreNum >= 4.5;
									const isMed =
										!isNaN(scoreNum) && scoreNum >= 3.5 && scoreNum < 4.5;
									return (
										<TableRow
											key={row.id}
											className="border-b border-slate-100/70 hover:bg-slate-50/70 dark:border-slate-800/70 dark:hover:bg-slate-800/45"
										>
											<TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200">
												{row.id}
											</TableCell>
											<TableCell className="text-xs font-semibold text-slate-950 dark:text-white">
												<div className="flex items-center gap-2">
													<Avatar className="h-7 w-7 rounded-lg">
														<AvatarImage
															src={safeImageUrl(row.imageUrl)}
															alt={row.name}
														/>
														<AvatarFallback className="rounded-lg bg-pink-100 text-[10px] font-bold text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
															{row.name?.[0] || "C"}
														</AvatarFallback>
													</Avatar>
													<span>{row.name}</span>
												</div>
											</TableCell>
											<TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
												{row.templateName}
											</TableCell>
											<TableCell className="text-xs text-slate-500 dark:text-slate-400">
												<Badge
													variant="outline"
													className="rounded-md border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
												>
													{row.channel}
												</Badge>
											</TableCell>
											<TableCell className="text-xs font-bold">
												<div
													className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold"
													style={{
														backgroundColor: isHigh
															? "#10b98118"
															: isMed
																? "#3b82f618"
																: "#f59e0b18",
														color: isHigh
															? "#10b981"
															: isMed
																? "#2563eb"
																: "#d97706",
													}}
												>
													<Star className="h-3 w-3 fill-current" />
													<span>{row.score}</span>
												</div>
											</TableCell>
											<TableCell className="text-xs text-slate-500 dark:text-slate-400">
												{row.date}
											</TableCell>
											<TableCell className="text-right">
												<Badge
													variant="secondary"
													className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-semibold ${
														row.status === "COMPLETED" ||
														row.status === "Resolved"
															? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-300"
															: row.status === "IN_PROGRESS" ||
																	row.status === "In Progress"
																? "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/30 dark:bg-violet-500/12 dark:text-violet-300"
																: "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-300"
													}`}
												>
													{row.status}
												</Badge>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>
			</section>
		</div>
	);
}

"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	subscriptionsApi,
	planPricesApi,
	companiesApi,
} from "@/lib/api/endpoints";
import {
	ActiveSubscription,
	PlanPriceGroupResponse,
	PlanDetail,
	PlanPriceDetail,
	SubscribeRequest,
	SubscriptionStatus,
	CompanySubscriptionGroup,
} from "@/types/subscription";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Building2,
	Search,
	Crown,
	Sparkles,
	Calendar,
	CreditCard,
	TrendingUp,
	ShieldCheck,
	Zap,
	ArrowRight,
	RefreshCw,
	Clock,
	ChevronRight,
	Layers,
	Users,
	CheckCircle2,
	AlertTriangle,
	FileText,
	Filter,
	Check,
	SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import { useTranslation } from "@/lib/i18n/context";

const STATUS_BADGE_CONFIG: Record<
	SubscriptionStatus,
	{ labelKey: string; defaultLabel: string; className: string; dot: string }
> = {
	ACTIVE: {
		labelKey: "subscriptions.monitorTab.active",
		defaultLabel: "Active",
		className:
			"border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
		dot: "bg-emerald-500",
	},
	TRIAL: {
		labelKey: "subscriptions.monitorTab.trial",
		defaultLabel: "Trial",
		className:
			"border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
		dot: "bg-sky-500",
	},
	PAST_DUE: {
		labelKey: "subscriptions.monitorTab.pastDue",
		defaultLabel: "Past Due",
		className:
			"border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse",
		dot: "bg-amber-500",
	},
	EXPIRED: {
		labelKey: "subscriptions.monitorTab.expired",
		defaultLabel: "Expired",
		className:
			"border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
		dot: "bg-slate-400",
	},
	CANCELLED: {
		labelKey: "subscriptions.monitorTab.cancelled",
		defaultLabel: "Cancelled",
		className:
			"border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
		dot: "bg-rose-500",
	},
};

interface CompanyMonitorTabProps {
	onSelectCompanyAndInspect: (companyId: string) => void;
}

export function CompanyMonitorTab({
	onSelectCompanyAndInspect,
}: CompanyMonitorTabProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

	// Dispatch / Quick Subscribe Modal
	const [dispatchCompany, setDispatchCompany] = useState<{
		companyId: string | number;
		companyName: string;
	} | null>(null);
	const [selectedPlanPriceId, setSelectedPlanPriceId] = useState<string>("");
	const [promoCode, setPromoCode] = useState("");

	// Queries
	const {
		data: companyGroups = [],
		isLoading: isLoadingGroups,
		refetch: refetchGroups,
	} = useQuery({
		queryKey: ["subscriptions-grouped-by-company"],
		queryFn: () => subscriptionsApi.searchGroupedByCompany({}),
		select: (res) => res.items,
		staleTime: 5 * 60 * 1000,
	});

	const { data: groupedPricesData = [] } = useQuery({
		queryKey: ["subscription-plan-prices-grouped"],
		queryFn: () => planPricesApi.getGrouped(),
		staleTime: 10 * 60 * 1000,
	});

	const { data: companiesList = [] } = useQuery({
		queryKey: ["companies-selector-list"],
		queryFn: () =>
			companiesApi.list({ page: 1, limit: 100 }).then((r) => r.items),
		staleTime: 10 * 60 * 1000,
	});

	// Mutation
	const subscribeMutation = useMutation({
		mutationFn: (data: SubscribeRequest) => subscriptionsApi.subscribe(data),
		onSuccess: () => {
			toast.success("Subscription dispatched & activated successfully!");
			setDispatchCompany(null);
			setSelectedPlanPriceId("");
			setPromoCode("");
			queryClient.invalidateQueries({
				queryKey: ["subscriptions-grouped-by-company"],
			});
			queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to dispatch subscription");
		},
	});

	// Combine company groups with full company list for complete oversight
	const fullGroupList = useMemo(() => {
		const groupMap = new Map<string, CompanySubscriptionGroup>();
		companyGroups.forEach((g) => {
			groupMap.set(String(g.companyId), g);
		});

		// Also include companies that might not have subscription group yet
		companiesList.forEach((c) => {
			const idStr = String(c.id);
			if (!groupMap.has(idStr)) {
				groupMap.set(idStr, {
					companyId: c.id,
					companyName: c.name || `Company #${c.id}`,
					businessId: (c as any).code || `COMP-${c.id}`,
					activeSubscription: null,
					subscriptions: [],
					totalSubscriptions: 0,
				});
			}
		});

		return Array.from(groupMap.values());
	}, [companyGroups, companiesList]);

	// Filtered List
	const filteredCompanies = useMemo(() => {
		return fullGroupList.filter((g) => {
			const q = searchTerm.toLowerCase().trim();
			const matchesQuery =
				!q ||
				g.companyName.toLowerCase().includes(q) ||
				(g.businessId && g.businessId.toLowerCase().includes(q)) ||
				(g.activeSubscription?.plan?.displayName &&
					g.activeSubscription.plan.displayName.toLowerCase().includes(q)) ||
				(g.activeSubscription?.plan?.name &&
					g.activeSubscription.plan.name.toLowerCase().includes(q));

			const status = g.activeSubscription?.status || "NO_SUB";
			const matchesStatus =
				statusFilter === "ALL" ||
				(statusFilter === "NO_SUB" && !g.activeSubscription) ||
				status === statusFilter;

			return matchesQuery && matchesStatus;
		});
	}, [fullGroupList, searchTerm, statusFilter]);

	// Aggregate KPI stats
	const stats = useMemo(() => {
		const total = fullGroupList.length;
		let active = 0;
		let trial = 0;
		let pastDue = 0;
		let expired = 0;
		let mrr = 0;

		fullGroupList.forEach((g) => {
			const s = g.activeSubscription;
			if (s) {
				if (s.status === "ACTIVE") active++;
				else if (s.status === "TRIAL") trial++;
				else if (s.status === "PAST_DUE") pastDue++;
				else if (s.status === "EXPIRED" || s.status === "CANCELLED") expired++;

				if (s.status === "ACTIVE" && s.subscribedAmount) {
					const amt = Number(s.subscribedAmount);
					const cycle = s.planPrice?.billingCycle || "MONTHLY";
					mrr += cycle === "YEARLY" ? amt / 12 : amt;
				}
			}
		});

		return { total, active, trial, pastDue, expired, mrr };
	}, [fullGroupList]);

	// Available Plan Options for Quick Dispatch
	const planOptions = useMemo(() => {
		const opts: { label: string; value: string }[] = [];
		groupedPricesData.forEach((gp) => {
			const plan = gp.plan || (gp as any);
			const prices = Array.isArray(gp.prices)
				? gp.prices
				: Array.isArray((gp as any).planPrice)
					? (gp as any).planPrice
					: [];
			prices.forEach((price: any) => {
				if (price.active !== false) {
					opts.push({
						label: `${plan.displayName || plan.name || "Plan"} — ${price.billingCycle} ($${Number(price.amount).toFixed(2)} ${price.currency || "USD"})`,
						value: String(price.id),
					});
				}
			});
		});
		return opts;
	}, [groupedPricesData]);

	const handleOpenDispatch = (group: CompanySubscriptionGroup) => {
		setDispatchCompany({
			companyId: group.companyId,
			companyName: group.companyName,
		});
		if (planOptions.length > 0) {
			setSelectedPlanPriceId(planOptions[0].value);
		}
	};

	const handleConfirmDispatch = (e: React.FormEvent) => {
		e.preventDefault();
		if (!dispatchCompany || !selectedPlanPriceId) return;
		subscribeMutation.mutate({
			companyId: String(dispatchCompany.companyId),
			planPriceId: Number(selectedPlanPriceId) || selectedPlanPriceId,
			promoCodeId: promoCode.trim() || undefined,
		});
	};

	// Table Columns
	const columns: ColumnDef<CompanySubscriptionGroup>[] = [
		{
			id: "company",
			header: t("subscriptions.monitorTab.columns.company", "Company / Tenant"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2.5">
					<div className="flex size-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-black text-xs border border-purple-200/80 dark:border-purple-800/80">
						{row.companyName.charAt(0).toUpperCase()}
					</div>
					<div>
						<div className="font-bold text-xs text-slate-900 dark:text-white">
							{row.companyName}
						</div>
						<div className="font-mono text-[10px] text-slate-400">
							ID: {row.businessId || `comp_${row.companyId}`}
						</div>
					</div>
				</div>
			),
		},
		{
			id: "plan",
			header: t(
				"subscriptions.monitorTab.columns.activePlan",
				"Active Plan Tier",
			),
			cell: ({ row }) => {
				const active = row.activeSubscription;
				if (!active) {
					return (
						<span className="text-xs text-slate-400 italic">
							{t("subscriptions.monitorTab.noSubscription", "No Subscription")}
						</span>
					);
				}
				return (
					<div className="space-y-0.5">
						<div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
							<Crown className="size-3.5 text-primary" />
							<span>
								{active.plan?.displayName ||
									active.plan?.name ||
									active.plan?.code ||
									t("subscriptions.monitorTab.unnamedPlan", "Active Plan")}
							</span>
						</div>
						<div className="text-[10px] text-slate-500 dark:text-slate-400">
							{active.plan?.tier ? `${active.plan.tier} • ` : ""}
							{active.planPrice?.billingCycle || "MONTHLY"} ($
							{Number(active.subscribedAmount || 0).toFixed(2)}{" "}
							{active.subscribedCurrency || "USD"})
						</div>
					</div>
				);
			},
		},
		{
			id: "status",
			header: t(
				"subscriptions.monitorTab.columns.status",
				"Subscription Status",
			),
			cell: ({ row }) => {
				const active = row.activeSubscription;
				if (!active) {
					return (
						<Badge
							variant="outline"
							className="text-[10px] text-slate-400 border-slate-200 dark:border-slate-800"
						>
							{t("subscriptions.monitorTab.noSubscription", "No Subscription")}
						</Badge>
					);
				}
				const cfg =
					STATUS_BADGE_CONFIG[active.status as SubscriptionStatus] ||
					STATUS_BADGE_CONFIG.ACTIVE;
				return (
					<Badge
						variant="outline"
						className={`text-[10px] px-2 py-0.5 font-semibold rounded-md ${cfg.className}`}
					>
						<span
							className={`mr-1 size-1.5 rounded-full inline-block ${cfg.dot}`}
						/>
						{t(cfg.labelKey, cfg.defaultLabel)}
					</Badge>
				);
			},
		},
		{
			id: "period",
			header: t(
				"subscriptions.monitorTab.columns.nextBilling",
				"Next Billing Date",
			),
			cell: ({ row }) => {
				const active = row.activeSubscription;
				if (!active) return <span className="text-xs text-slate-400">—</span>;
				return (
					<div className="text-xs text-slate-600 dark:text-slate-300">
						{active.endDate
							? new Date(active.endDate).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})
							: "Ongoing"}
						{active.autoRenew && (
							<span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
								{t(
									"subscriptions.subscribeTab.autoRenewEnabled",
									"Auto-Renew Enabled",
								)}
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "invoices",
			header: t("subscriptions.monitorTab.columns.userSeats", "User Seats"),
			cell: ({ row }) => (
				<span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
					{row.totalSubscriptions || (row.activeSubscription ? 1 : 0)} records
				</span>
			),
		},
		{
			id: "actions",
			header: t("subscriptions.monitorTab.columns.actions", "Actions"),
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5">
					<Button
						size="sm"
						variant="ghost"
						onClick={() => onSelectCompanyAndInspect(String(row.companyId))}
						className="h-8 rounded-xl px-2.5 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
					>
						<span>
							{t("subscriptions.monitorTab.inspectEntitlement", "Inspect")}
						</span>
						<ArrowRight className="size-3 ml-1" />
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleOpenDispatch(row)}
						className="h-8 rounded-xl px-2.5 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						<Zap className="size-3 mr-1 text-amber-500" />
						<span>
							{t("subscriptions.monitorTab.dispatchSubscription", "Dispatch")}
						</span>
					</Button>
				</div>
			),
		},
	];

	return (
		<div className="space-y-6">
			{/* 1. Header & KPI Cards Overview */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 space-y-1">
					<div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t("subscriptions.monitorTab.totalCompanies", "Total Companies")}
						</span>
						<Building2 className="size-4 text-purple-600" />
					</div>
					<div className="text-2xl font-black text-slate-950 dark:text-white">
						{stats.total}
					</div>
					<p className="text-[10px] text-slate-400">
						Registered client tenants
					</p>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 space-y-1">
					<div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t(
								"subscriptions.monitorTab.activeSubscriptions",
								"Active Subscriptions",
							)}
						</span>
						<ShieldCheck className="size-4 text-emerald-600" />
					</div>
					<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
						{stats.active}
					</div>
					<p className="text-[10px] text-slate-400">
						Current paid subscriptions
					</p>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 space-y-1">
					<div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t("subscriptions.monitorTab.trialCompanies", "Free Trials")}
						</span>
						<Sparkles className="size-4 text-sky-600" />
					</div>
					<div className="text-2xl font-black text-sky-600 dark:text-sky-400">
						{stats.trial}
					</div>
					<p className="text-[10px] text-slate-400">Active trial evaluations</p>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 space-y-1">
					<div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t(
								"subscriptions.monitorTab.pastDueCompanies",
								"Past Due / Grace",
							)}
						</span>
						<AlertTriangle className="size-4 text-amber-600" />
					</div>
					<div className="text-2xl font-black text-amber-600 dark:text-amber-400">
						{stats.pastDue}
					</div>
					<p className="text-[10px] text-slate-400">
						Requires billing settlement
					</p>
				</div>

				<div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/90 space-y-1">
					<div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
						<span className="text-[11px] font-bold uppercase tracking-wider">
							{t(
								"subscriptions.monitorTab.estimatedMrr",
								"Estimated MRR Revenue",
							)}
						</span>
						<TrendingUp className="size-4 text-primary" />
					</div>
					<div className="text-2xl font-black text-slate-900 dark:text-white">
						${stats.mrr.toFixed(2)}
					</div>
					<p className="text-[10px] text-slate-400">
						Monthly recurring run-rate
					</p>
				</div>
			</div>

			{/* 2. Search & Controls Bar */}
			<div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/85 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-2.5">
					<div className="relative min-w-[220px] max-w-sm flex-1">
						<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
						<Input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder={t(
								"subscriptions.monitorTab.searchPlaceholder",
								"Search company name, code, or plan...",
							)}
							className="h-9 rounded-xl pl-8.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
						/>
					</div>

					{/* Filter Pills */}
					<div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950 text-xs">
						{[
							{
								id: "ALL",
								label: t(
									"subscriptions.monitorTab.allStatuses",
									"All Statuses",
								),
							},
							{
								id: "ACTIVE",
								label: t("subscriptions.monitorTab.active", "Active"),
							},
							{
								id: "TRIAL",
								label: t("subscriptions.monitorTab.trial", "Free Trial"),
							},
							{
								id: "PAST_DUE",
								label: t("subscriptions.monitorTab.pastDue", "Past Due"),
							},
							{
								id: "NO_SUB",
								label: t(
									"subscriptions.monitorTab.noSubscription",
									"No Subscription",
								),
							},
						].map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setStatusFilter(f.id)}
								className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
									statusFilter === f.id
										? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white font-bold"
										: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
							>
								{f.label}
							</button>
						))}
					</div>
				</div>

				{/* View mode toggle & Refresh */}
				<div className="flex items-center gap-2 self-end sm:self-auto">
					<div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
						<button
							type="button"
							onClick={() => setViewMode("GRID")}
							className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
								viewMode === "GRID"
									? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							{t("subscriptions.monitorTab.gridView", "Grid View")}
						</button>
						<button
							type="button"
							onClick={() => setViewMode("TABLE")}
							className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
								viewMode === "TABLE"
									? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							{t("subscriptions.monitorTab.tableView", "Table View")}
						</button>
					</div>

					<Button
						size="sm"
						variant="outline"
						onClick={() => refetchGroups()}
						className="h-9 rounded-xl px-3 text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs"
					>
						<RefreshCw className="size-3.5 mr-1" />
						<span>{t("subscriptions.sync", "Sync")}</span>
					</Button>
				</div>
			</div>

			{/* 3. Grid or Table View of Monitored Companies */}
			{viewMode === "TABLE" ? (
				<DataTable
					columns={columns}
					data={filteredCompanies}
					emptyState={
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Building2 className="size-8 text-slate-400 mb-2 opacity-50" />
							<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
								No company subscriptions found
							</p>
							<p className="text-xs text-slate-400 mt-1 max-w-xs">
								Try clearing or adjusting your search filters.
							</p>
						</div>
					}
				/>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredCompanies.map((group) => {
						const active = group.activeSubscription;
						const status = active?.status || "EXPIRED";
						const statusCfg =
							STATUS_BADGE_CONFIG[status as SubscriptionStatus] ||
							STATUS_BADGE_CONFIG.ACTIVE;

						return (
							<div
								key={group.companyId}
								className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-xs transition-all hover:border-primary/30 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/80"
							>
								<div className="space-y-4">
									{/* Top Company Title & Status Badge */}
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-3">
											<div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 text-primary font-black text-sm border border-primary/20 shadow-2xs">
												{group.companyName.charAt(0).toUpperCase()}
											</div>
											<div>
												<h4 className="font-extrabold text-sm text-slate-950 dark:text-white line-clamp-1">
													{group.companyName}
												</h4>
												<span className="font-mono text-[10px] text-slate-400">
													{group.businessId || `ID: ${group.companyId}`}
												</span>
											</div>
										</div>

										{active ? (
											<Badge
												variant="outline"
												className={`text-[10px] px-2 py-0.5 rounded-lg font-bold shrink-0 ${statusCfg.className}`}
											>
												<span
													className={`mr-1 size-1.5 rounded-full inline-block ${statusCfg.dot}`}
												/>
												{t(statusCfg.labelKey, statusCfg.defaultLabel)}
											</Badge>
										) : (
											<Badge
												variant="outline"
												className="text-[10px] px-2 py-0.5 rounded-lg font-medium text-slate-400 border-slate-200 dark:border-slate-800 shrink-0"
											>
												{t(
													"subscriptions.monitorTab.noActiveSub",
													"No Active Sub",
												)}
											</Badge>
										)}
									</div>

									{/* Plan Information Box */}
									<div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-900 dark:bg-slate-900/60 space-y-2 text-xs">
										<div className="flex justify-between items-center">
											<span className="text-slate-500 font-medium">
												{t(
													"subscriptions.monitorTab.columns.activePlan",
													"Active Plan Tier",
												)}
												:
											</span>
											<strong className="text-slate-900 dark:text-white font-bold flex items-center gap-1">
												<Crown className="size-3 text-purple-600" />
												{active?.plan?.displayName ||
													active?.plan?.name ||
													active?.plan?.code ||
													(active ? "Plan" : t("subscriptions.monitorTab.noPlan", "None"))}
											</strong>
										</div>

										<div className="flex justify-between items-center">
											<span className="text-slate-500 font-medium">
												{t(
													"subscriptions.monitorTab.columns.billingRate",
													"Billing Rate / Cycle",
												)}
												:
											</span>
											<span className="font-mono font-bold text-slate-900 dark:text-white">
												{active
													? `$${Number(active.subscribedAmount || 0).toFixed(2)} / ${active.planPrice?.billingCycle?.toLowerCase() || "monthly"}`
													: "—"}
											</span>
										</div>

										<div className="flex justify-between items-center">
											<span className="text-slate-500 font-medium">
												{t(
													"subscriptions.monitorTab.columns.nextBilling",
													"Next Billing Date",
												)}
												:
											</span>
											<span className="text-slate-700 dark:text-slate-300">
												{active?.endDate
													? new Date(active.endDate).toLocaleDateString(
															"en-US",
															{
																month: "short",
																day: "numeric",
																year: "numeric",
															},
														)
													: active
														? "No active end date"
														: "—"}
											</span>
										</div>
									</div>

									{/* Feature Pill Tags */}
									{active?.plan?.features &&
										active.plan.features.length > 0 && (
											<div className="flex flex-wrap gap-1.5 pt-1">
												{active.plan.features.slice(0, 3).map((f) => (
													<span
														key={f.id}
														className="inline-flex items-center gap-1 rounded-md bg-blue-50/70 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
													>
														<Check className="size-2.5 text-blue-600" />
														{f.name}
													</span>
												))}
												{active.plan.features.length > 3 && (
													<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
														+{active.plan.features.length - 3} more
													</span>
												)}
											</div>
										)}
								</div>

								{/* Card Actions */}
								<div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center gap-2">
									<Button
										onClick={() =>
											onSelectCompanyAndInspect(String(group.companyId))
										}
										variant="outline"
										className="flex-1 h-8.5 rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
									>
										<span>
											{t(
												"subscriptions.monitorTab.inspectEntitlement",
												"Inspect Details",
											)}
										</span>
										<ArrowRight className="size-3.5 ml-1" />
									</Button>

									<Button
										onClick={() => handleOpenDispatch(group)}
										size="sm"
										className="h-8.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 cursor-pointer shadow-2xs"
									>
										<Zap className="size-3.5 mr-1 text-amber-400" />
										<span>
											{t(
												"subscriptions.monitorTab.dispatchSubscription",
												"Dispatch",
											)}
										</span>
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Quick Dispatch Modal */}
			<ModernModal
				open={Boolean(dispatchCompany)}
				onOpenChange={(open) => {
					if (!open) setDispatchCompany(null);
				}}
				title={`Dispatch Subscription Plan: ${dispatchCompany?.companyName}`}
				description="Select a subscription tier and pricing cycle to activate or update for this tenant company."
				icon={<Zap className="size-5 text-amber-500" />}
			>
				<form onSubmit={handleConfirmDispatch} className="space-y-4 py-2">
					<div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 text-xs text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-200 space-y-1">
						<div className="font-bold flex items-center gap-1.5">
							<Building2 className="size-3.5" />
							<span>Target Tenant: {dispatchCompany?.companyName}</span>
						</div>
						<p className="text-[11px] text-amber-800 dark:text-amber-300">
							This action will dispatch the selected plan price and immediately
							generate an active subscription with full feature entitlements.
						</p>
					</div>

					<ModernSelect
						label="Select Subscription Plan & Cycle"
						value={selectedPlanPriceId}
						onChange={setSelectedPlanPriceId}
						options={planOptions}
						required
					/>

					<ModernInput
						label="Promo / Voucher Code (Optional)"
						placeholder="e.g. VIP_DISPATCH_100"
						value={promoCode}
						onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
						helperText="Apply custom promo discount"
					/>

					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setDispatchCompany(null)} />
						<ModernModalSubmitButton loading={subscribeMutation.isPending}>
							{subscribeMutation.isPending
								? "Dispatching..."
								: "Dispatch & Activate Subscription"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>
		</div>
	);
}

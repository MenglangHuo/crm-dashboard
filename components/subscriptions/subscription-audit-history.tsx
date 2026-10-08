"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionsApi } from "@/lib/api/endpoints";
import { SubscriptionAuditLog, SubscriptionStatus } from "@/types/subscription";
import { SubscriptionAuditDetailModal } from "./subscription-audit-detail-modal";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import {
	Clock,
	Search,
	Filter,
	Eye,
	TrendingUp,
	TrendingDown,
	Sparkles,
	Crown,
	RefreshCw,
	XCircle,
	Zap,
	ArrowRight,
	UserCheck,
	Building2,
	Calendar,
	Layers,
	FileText,
} from "lucide-react";

const ACTION_BADGE_CONFIG: Record<
	string,
	{
		labelKey: string;
		defaultLabel: string;
		className: string;
		icon: React.ReactNode;
	}
> = {
	UPGRADE: {
		labelKey: "subscriptions.auditHistory.actionUpgrade",
		defaultLabel: "Upgrade",
		className:
			"border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
		icon: (
			<TrendingUp className="size-3 text-emerald-600 dark:text-emerald-400" />
		),
	},
	TRIAL_START: {
		labelKey: "subscriptions.auditHistory.actionTrialStart",
		defaultLabel: "Trial Start",
		className:
			"border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
		icon: <Sparkles className="size-3 text-sky-600 dark:text-sky-400" />,
	},
	SUBSCRIBE: {
		labelKey: "subscriptions.auditHistory.actionSubscribe",
		defaultLabel: "Subscribe",
		className:
			"border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300",
		icon: <Crown className="size-3 text-purple-600 dark:text-purple-400" />,
	},
	DOWNGRADE: {
		labelKey: "subscriptions.auditHistory.actionDowngrade",
		defaultLabel: "Downgrade",
		className:
			"border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
		icon: (
			<TrendingDown className="size-3 text-amber-600 dark:text-amber-400" />
		),
	},
	RENEW: {
		labelKey: "subscriptions.auditHistory.actionRenew",
		defaultLabel: "Renew",
		className:
			"border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
		icon: <RefreshCw className="size-3 text-indigo-600 dark:text-indigo-400" />,
	},
	CANCEL: {
		labelKey: "subscriptions.auditHistory.actionCancel",
		defaultLabel: "Cancel",
		className:
			"border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
		icon: <XCircle className="size-3 text-rose-600 dark:text-rose-400" />,
	},
};

const STATUS_BADGE_STYLE: Record<string, string> = {
	ACTIVE:
		"border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
	TRIAL:
		"border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
	PAST_DUE:
		"border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
	EXPIRED:
		"border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
	CANCELLED:
		"border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

interface SubscriptionAuditHistorySectionProps {
	effectiveCompanyId?: string | number | null;
	isSystemAdmin?: boolean;
}

export function SubscriptionAuditHistorySection({
	effectiveCompanyId,
	isSystemAdmin,
}: SubscriptionAuditHistorySectionProps) {
	const { t } = useTranslation();
	const [searchTerm, setSearchTerm] = useState("");
	const [actionFilter, setActionFilter] = useState<string>("ALL");
	const [selectedAuditLog, setSelectedAuditLog] =
		useState<SubscriptionAuditLog | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Fetch subscription history audit log from API
	const {
		data: pagedResult,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["subscription-history-audit", effectiveCompanyId],
		queryFn: () =>
			subscriptionsApi.getHistory({
				companyId: effectiveCompanyId,
				page: 0,
				size: 50,
			}),
		staleTime: 60 * 1000,
	});

	// Normalize response history list
	const rawHistoryList = useMemo(() => {
		if (!pagedResult) return [];
		if (Array.isArray(pagedResult)) return pagedResult;
		if (Array.isArray((pagedResult as any).content))
			return (pagedResult as any).content;
		return pagedResult.items || [];
	}, [pagedResult]);

	// Normalize list into SubscriptionAuditLog structure
	const auditLogs: SubscriptionAuditLog[] = useMemo(() => {
		return rawHistoryList.map((item: any, idx: number) => {
			// If item already follows SubscriptionAuditLog format
			if (item.action || item.oldPlan || item.newPlan) {
				return item as SubscriptionAuditLog;
			}

			// Map legacy ActiveSubscription item into SubscriptionAuditLog format
			const status = item.status || "ACTIVE";
			return {
				id: item.id || `hist_${idx + 1}`,
				companyId: item.companyId || effectiveCompanyId || undefined,
				companyName: item.companyName,
				oldPlan: null,
				newPlan: item.plan || null,
				oldStatus: null,
				newStatus: status,
				action:
					status === "TRIAL"
						? "TRIAL_START"
						: status === "CANCELLED"
							? "CANCEL"
							: "SUBSCRIBE",
				createdBy: 1,
				remark:
					item.cancellationReason ||
					(item.plan?.displayName || item.plan?.name
						? `Subscription event (${item.plan.displayName || item.plan.name})`
						: `Subscription transaction #${item.id || idx + 1}`),
				createdAt: item.createdAt || item.startDate || new Date().toISOString(),
				subscribedAmount: item.subscribedAmount,
				subscribedCurrency: item.subscribedCurrency,
				startDate: item.startDate,
				endDate: item.endDate,
				autoRenew: item.autoRenew,
			};
		});
	}, [rawHistoryList, effectiveCompanyId]);

	// Filtered audit logs
	const filteredAuditLogs = useMemo(() => {
		return auditLogs.filter((log) => {
			const q = searchTerm.toLowerCase().trim();
			const matchesSearch =
				!q ||
				String(log.id).includes(q) ||
				(log.remark && log.remark.toLowerCase().includes(q)) ||
				(log.action && log.action.toLowerCase().includes(q)) ||
				(log.newPlanPrice?.billingCycle &&
					log.newPlanPrice.billingCycle.toLowerCase().includes(q)) ||
				(log.newPlan?.displayName &&
					log.newPlan.displayName.toLowerCase().includes(q)) ||
				(log.newPlan?.name && log.newPlan.name.toLowerCase().includes(q)) ||
				(log.oldPlan?.displayName &&
					log.oldPlan.displayName.toLowerCase().includes(q)) ||
				(log.oldPlan?.name && log.oldPlan.name.toLowerCase().includes(q));

			const matchesAction =
				actionFilter === "ALL" ||
				(log.action && log.action.toUpperCase() === actionFilter.toUpperCase());

			return matchesSearch && matchesAction;
		});
	}, [auditLogs, searchTerm, actionFilter]);

	const handleOpenDetailModal = (log: SubscriptionAuditLog) => {
		setSelectedAuditLog(log);
		setIsModalOpen(true);
	};

	// Table Columns Setup
	const columns: ColumnDef<SubscriptionAuditLog>[] = [
		{
			id: "subscribedPlan",
			header: t(
				"subscriptions.auditHistory.columns.subscribedPlan",
				"Subscribed Plan",
			),
			cell: ({ row }) => {
				const newPlan = row.newPlan;

				if (!newPlan) {
					return (
						<span className="text-xs text-rose-500 font-semibold italic">
							{t("subscriptions.auditHistory.planCancelled", "Plan Cancelled")}
						</span>
					);
				}

				return (
					<div className="flex items-center gap-2.5 max-w-xs">
						<div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs shrink-0">
							<Crown className="size-3.5" />
						</div>
						<div className="space-y-0.5 truncate">
							<div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
								{newPlan.displayName || newPlan.name}
							</div>
							<div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
								<span className="font-semibold text-purple-700 dark:text-purple-300">
									{newPlan.tier}
								</span>
								<span>•</span>
								<span>
									{t(
										"subscriptions.subscribeTab.usersCount",
										"{{count}} users",
										{ count: newPlan.maxUsers },
									)}
								</span>
							</div>
						</div>
					</div>
				);
			},
		},
		{
			id: "price",
			header: t("subscriptions.plansTab.columns.priceAmount", "Price"),
			cell: ({ row }) => {
				const planPrice = row.newPlanPrice;
				const amt = planPrice?.amount ?? row.subscribedAmount;
				const cycle = planPrice?.billingCycle;
				const curr = planPrice?.currency || row.subscribedCurrency || "USD";

				if (amt !== undefined && amt !== null) {
					if (
						amt === 0 ||
						row.newPlan?.tier === "FREE_TRIAL" ||
						row.action === "TRIAL_START"
					) {
						return (
							<Badge
								variant="outline"
								className="font-mono text-[10px] font-bold border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
							>
								Free / $0.00
							</Badge>
						);
					}
					return (
						<div className="space-y-0.5">
							<div className="font-mono text-xs font-black text-slate-900 dark:text-white">
								${Number(amt).toFixed(2)} {curr}
							</div>
							{cycle && (
								<div className="text-[10px] text-slate-400 font-medium uppercase font-mono">
									/{cycle.toLowerCase()}
								</div>
							)}
						</div>
					);
				}

				const newP = row.newPlan;
				if (!newP || row.action === "CANCEL") {
					return (
						<span className="font-mono text-xs font-semibold text-slate-400">
							$0.00
						</span>
					);
				}
				if (
					newP.tier === "FREE_TRIAL" ||
					newP.trial ||
					row.action === "TRIAL_START"
				) {
					return (
						<Badge
							variant="outline"
							className="font-mono text-[10px] font-bold border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
						>
							Free / $0.00
						</Badge>
					);
				}
				return (
					<span className="font-mono text-xs font-semibold text-slate-500">
						$0.00 USD
					</span>
				);
			},
		},
		{
			id: "logId",
			header: t("subscriptions.auditHistory.columns.logAction", "Log & Action"),
			cell: ({ row }) => {
				const action = (row.action || "SUBSCRIBE").toUpperCase();
				const cfg = ACTION_BADGE_CONFIG[action] || {
					labelKey: "",
					defaultLabel: action,
					className:
						"border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
					icon: <Zap className="size-3 text-primary" />,
				};

				return (
					<div className="flex items-center gap-2">
						<Badge
							variant="outline"
							className={`text-[10px] px-2 py-0.5 font-bold rounded-lg ${cfg.className}`}
						>
							<span className="mr-1">{cfg.icon}</span>
							{cfg.labelKey
								? t(cfg.labelKey, cfg.defaultLabel)
								: cfg.defaultLabel}
						</Badge>
						<span className="font-mono text-[10px] font-semibold text-slate-400">
							#{row.id}
						</span>
					</div>
				);
			},
		},
		{
			id: "subscriptionPeriod",
			header: t(
				"subscriptions.auditHistory.columns.subscriptionPeriod",
				"Subscription Period",
			),
			cell: ({ row }) => {
				const start = row.subscribeDate || row.startDate;
				const end = row.expireDate || row.endDate;

				if (!start && !end) {
					return <span className="text-xs text-slate-400">—</span>;
				}

				return (
					<div className="text-xs text-slate-600 dark:text-slate-300">
						<div className="font-semibold text-slate-800 dark:text-slate-200">
							{start
								? new Date(start).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})
								: "Start"}
							{" — "}
							{end
								? new Date(end).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})
								: "Ongoing"}
						</div>
						{row.newPlanPrice?.durationDays ? (
							<div className="text-[10px] text-slate-400 font-mono">
								{t(
									"subscriptions.plansTab.durationDays",
									"{{count}} billing days",
									{ count: row.newPlanPrice.durationDays },
								)}
							</div>
						) : null}
					</div>
				);
			},
		},
		{
			id: "statusShift",
			header: t(
				"subscriptions.auditHistory.columns.statusShift",
				"Status Shift",
			),
			cell: ({ row }) => {
				const oldS = row.oldStatus;
				const newS = row.newStatus;

				if (!oldS && !newS) {
					return <span className="text-xs text-slate-400">—</span>;
				}

				return (
					<div className="flex items-center gap-1.5 text-xs">
						{oldS && (
							<Badge
								variant="outline"
								className={`text-[9px] px-1.5 py-0.5 font-semibold rounded ${
									STATUS_BADGE_STYLE[oldS] ||
									"border-slate-200 text-slate-600 dark:border-slate-800"
								}`}
							>
								{oldS}
							</Badge>
						)}
						{oldS && newS && (
							<ArrowRight className="size-3 text-slate-400 shrink-0" />
						)}
						{newS && (
							<Badge
								variant="outline"
								className={`text-[9px] px-1.5 py-0.5 font-extrabold rounded ${
									STATUS_BADGE_STYLE[newS] ||
									"border-emerald-200 text-emerald-700 dark:border-emerald-900"
								}`}
							>
								{newS}
							</Badge>
						)}
					</div>
				);
			},
		},
		{
			id: "remark",
			header: t(
				"subscriptions.auditHistory.columns.remarkNotes",
				"Remark & Notes",
			),
			cell: ({ row }) => (
				<div className="space-y-0.5 max-w-xs">
					<p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
						{row.remark || "Subscription history event"}
					</p>
					<div className="flex items-center gap-1 text-[10px] text-slate-400">
						<UserCheck className="size-3" />
						<span>
							{t(
								"subscriptions.auditHistory.createdBy",
								"Created by ID: #{{id}}",
								{ id: row.createdBy || 1 },
							)}
						</span>
					</div>
				</div>
			),
		},
		{
			id: "createdAt",
			header: t("subscriptions.auditHistory.columns.timestamp", "Timestamp"),
			cell: ({ row }) => (
				<div className="text-xs text-slate-600 dark:text-slate-300">
					<div className="font-semibold text-slate-900 dark:text-white">
						{new Date(row.createdAt).toLocaleDateString("en-US", {
							month: "short",
							day: "numeric",
							year: "numeric",
						})}
					</div>
					<div className="text-[10px] text-slate-400">
						{new Date(row.createdAt).toLocaleTimeString("en-US", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			),
		},
		{
			id: "actions",
			header: t("subscriptions.featuresTab.columns.actions", "Actions"),
			cell: ({ row }) => (
				<Button
					size="sm"
					variant="outline"
					onClick={() => handleOpenDetailModal(row)}
					className="h-8 gap-1.5 rounded-xl border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
				>
					<Eye className="size-3.5 text-primary" />
					<span>
						{t("subscriptions.auditHistory.viewDetails", "View Details")}
					</span>
				</Button>
			),
		},
	];

	return (
		<div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-800">
			{/* Top Title & Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
						<Clock className="size-5 text-primary" />
						{t(
							"subscriptions.auditHistory.title",
							"Subscription Audit History Log",
						)}
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
						{t(
							"subscriptions.auditHistory.subtitle",
							"Audit logs tracking subscription upgrades, free trials, plan switches, and feature entitlements.",
						)}
					</p>
				</div>

				<div className="flex items-center gap-2 self-start sm:self-auto">
					<Button
						size="sm"
						variant="outline"
						onClick={() => refetch()}
						className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold px-3 hover:bg-slate-50 cursor-pointer shadow-2xs"
					>
						<RefreshCw className="size-3.5 text-slate-500" />
						<span>{t("subscriptions.sync", "Sync")}</span>
					</Button>
				</div>
			</div>

			{/* Filter & Search Toolbar */}
			<div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900/85 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative min-w-[220px] max-w-md flex-1">
					<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
					<Input
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						placeholder={t(
							"subscriptions.auditHistory.searchPlaceholder",
							"Search audit logs by remark, plan name, or action...",
						)}
						className="h-9 rounded-xl pl-8.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
					/>
				</div>

				{/* Action Filter Pills */}
				<div className="flex flex-wrap items-center gap-1 text-xs">
					{[
						{
							id: "ALL",
							label: t("subscriptions.monitorTab.allStatuses", "All Actions"),
						},
						{
							id: "UPGRADE",
							label: t("subscriptions.auditHistory.actionUpgrade", "Upgrade"),
						},
						{
							id: "TRIAL_START",
							label: t(
								"subscriptions.auditHistory.actionTrialStart",
								"Trial Start",
							),
						},
						{
							id: "SUBSCRIBE",
							label: t(
								"subscriptions.auditHistory.actionSubscribe",
								"Subscribe",
							),
						},
						{
							id: "DOWNGRADE",
							label: t(
								"subscriptions.auditHistory.actionDowngrade",
								"Downgrade",
							),
						},
						{
							id: "CANCEL",
							label: t("subscriptions.auditHistory.actionCancel", "Cancel"),
						},
					].map((act) => (
						<button
							key={act.id}
							type="button"
							onClick={() => setActionFilter(act.id)}
							className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
								actionFilter === act.id
									? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs"
									: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-800"
							}`}
						>
							{act.label}
						</button>
					))}
				</div>
			</div>

			{/* Data Table */}
			<DataTable
				columns={columns}
				data={filteredAuditLogs}
				emptyState={
					<div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
						<FileText className="size-9 text-slate-400 opacity-40" />
						<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
							{t(
								"subscriptions.auditHistory.emptyTitle",
								"No subscription audit log entries found",
							)}
						</p>
						<p className="text-xs text-slate-400 max-w-xs">
							{t(
								"subscriptions.auditHistory.emptyDesc",
								"Subscription changes, upgrades, and trial activations will be recorded here automatically.",
							)}
						</p>
					</div>
				}
			/>

			{/* Plan Details Modal */}
			<SubscriptionAuditDetailModal
				log={selectedAuditLog}
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
			/>
		</div>
	);
}

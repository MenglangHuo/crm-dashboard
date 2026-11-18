"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	featuresApi,
	subscriptionsApi,
	planPricesApi,
	companiesApi,
	usersApi,
} from "@/lib/api/endpoints";
import {
	PlanDetail,
	PlanPriceDetail,
	SubscribeRequest,
	CancelSubscriptionRequest,
	SubscriptionStatus,
	FeatureItem,
} from "@/types/subscription";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Crown,
	Sparkles,
	Zap,
	Check,
	AlertTriangle,
	AlertOctagon,
	Clock,
	ArrowRight,
	CreditCard,
	Users,
	RefreshCw,
	XCircle,
	Calendar,
	CheckCircle2,
	Lock,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { SubscriptionAuditHistorySection } from "./subscription-audit-history";
import { useTranslation } from "@/lib/i18n/context";

const STATUS_BADGE_CONFIG: Record<
	SubscriptionStatus,
	{ labelKey: string; defaultLabel: string; className: string; dot: string }
> = {
	ACTIVE: {
		labelKey: "subscriptions.status.active",
		defaultLabel: "Active Subscription",
		className:
			"border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
		dot: "bg-emerald-500",
	},
	TRIAL: {
		labelKey: "subscriptions.status.trial",
		defaultLabel: "14-Day Free Trial",
		className:
			"border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
		dot: "bg-sky-500",
	},
	PAST_DUE: {
		labelKey: "subscriptions.status.pastDue",
		defaultLabel: "Past Due (Grace Period)",
		className:
			"border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse",
		dot: "bg-amber-500",
	},
	EXPIRED: {
		labelKey: "subscriptions.status.expired",
		defaultLabel: "Expired",
		className:
			"border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
		dot: "bg-slate-400",
	},
	CANCELLED: {
		labelKey: "subscriptions.status.cancelled",
		defaultLabel: "Cancelled",
		className:
			"border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
		dot: "bg-rose-500",
	},
};

// Fallback feature descriptions if not returned by list API
const FEATURE_CATALOG_FALLBACK: Record<
	string,
	{ name: string; description: string }
> = {
	CONTACT_MGMT: {
		name: "Contact & Lead Management",
		description:
			"Manage customer contacts, leads, activities, and 360-degree timeline view.",
	},
	DEAL_PIPELINE: {
		name: "Sales Deals & Kanban Pipeline",
		description:
			"Visual kanban board for opportunity stage tracking and sales pipeline forecasting.",
	},
	ADVANCED_ANALYTICS: {
		name: "Advanced Analytics & Cohorts",
		description:
			"Generate sales revenue forecasting, cohort analysis, and executive KPI reports.",
	},
	WORKFLOW_AUTOMATION: {
		name: "Workflow Automation & Triggers",
		description:
			"Automate sales follow-up triggers, email notifications, and task assignments.",
	},
	INVOICE_BILLING: {
		name: "Invoicing & POS Billing",
		description:
			"Generate POS invoices, scan KHQR payments, and manage partial settlements.",
	},
	INVENTORY_TRACKING: {
		name: "Multi-Warehouse Inventory",
		description:
			"Real-time stock level monitoring, serial numbers, and warehouse transfers.",
	},
};

interface SubscribeTabProps {
	isSystemAdmin: boolean;
	selectedCompanyId?: string | number | null;
	onSelectCompany?: (id: string | null) => void;
}

export function SubscribeTab({
	isSystemAdmin,
	selectedCompanyId,
	onSelectCompany: _onSelectCompany,
}: SubscribeTabProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [billingCycleToggle, setBillingCycleToggle] = useState<
		"MONTHLY" | "YEARLY"
	>("MONTHLY");

	// Modals
	const [selectedPlanForSubscribe, setSelectedPlanForSubscribe] = useState<{
		plan: PlanDetail;
		price: PlanPriceDetail;
		isRenewal?: boolean;
	} | null>(null);
	const [promoCode, setPromoCode] = useState("");
	const [targetCompanyId, setTargetCompanyId] = useState<string>(
		selectedCompanyId ? String(selectedCompanyId) : "",
	);

	// Keep targetCompanyId in sync with selectedCompanyId
	React.useEffect(() => {
		if (selectedCompanyId) {
			setTargetCompanyId(String(selectedCompanyId));
		}
	}, [selectedCompanyId]);

	const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
	const [cancelImmediate, setCancelImmediate] = useState(false);
	const [cancelReason, setCancelReason] = useState("");

	// Effective companyId for queries
	const effectiveCompanyId = isSystemAdmin ? selectedCompanyId : undefined;

	// 1. Company-specific Queries (Only these refetch when companyId changes)
	const {
		data: entitlement,
		isLoading: _isLoadingEntitlement,
		refetch: _refetchEntitlement,
	} = useQuery({
		queryKey: ["company-entitlements", effectiveCompanyId],
		queryFn: () => featuresApi.getEntitlement(effectiveCompanyId),
		staleTime: 0,
	});

	const {
		data: activeSub,
		isLoading: _isLoadingActiveSub,
		refetch: _refetchActiveSub,
	} = useQuery({
		queryKey: ["active-subscription", effectiveCompanyId],
		queryFn: () =>
			subscriptionsApi.getActive(effectiveCompanyId).catch(() => null),
		staleTime: 0,
	});

	// 2. Static Catalog Queries (Cached with long staleTime so they never refetch when company changes)
	const { data: groupedPricesData = [], isLoading: isLoadingPricing } =
		useQuery({
			queryKey: ["subscription-plan-prices-grouped"],
			queryFn: () => planPricesApi.getGrouped(),
			staleTime: 10 * 60 * 1000,
		});

	const { data: featureCatalog = [] } = useQuery({
		queryKey: ["subscription-features-list"],
		queryFn: () => featuresApi.list(),
		enabled: Boolean(isSystemAdmin),
		staleTime: 10 * 60 * 1000,
	});

	const { data: companiesList = [] } = useQuery({
		queryKey: ["companies-selector-list"],
		queryFn: () =>
			companiesApi.list({ page: 1, limit: 100 }).then((r) => r.items),
		enabled: isSystemAdmin,
		staleTime: 10 * 60 * 1000,
	});

	// Query real user count from server
	const { data: usersData } = useQuery({
		queryKey: ["tenant-users-count", effectiveCompanyId],
		queryFn: () => usersApi.list({ page: 1, limit: 1 }),
		staleTime: 60 * 1000,
	});

	// Mutations
	const startTrialMutation = useMutation({
		mutationFn: () => subscriptionsApi.startTrial(effectiveCompanyId),
		onSuccess: () => {
			toast.success("14-Day Free Trial activated successfully!");
			queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
			queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history-audit"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
			queryClient.invalidateQueries({
				queryKey: ["subscriptions-grouped-by-company"],
			});
			queryClient.refetchQueries({ queryKey: ["company-entitlements"] });
			queryClient.refetchQueries({ queryKey: ["active-subscription"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to start free trial");
		},
	});

	const subscribeMutation = useMutation({
		mutationFn: (data: SubscribeRequest) => subscriptionsApi.subscribe(data),
		onSuccess: () => {
			toast.success(
				"Subscription updated & active plan dispatched successfully!",
			);
			setSelectedPlanForSubscribe(null);
			setPromoCode("");
			queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
			queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history-audit"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
			queryClient.invalidateQueries({
				queryKey: ["subscriptions-grouped-by-company"],
			});
			queryClient.refetchQueries({ queryKey: ["company-entitlements"] });
			queryClient.refetchQueries({ queryKey: ["active-subscription"] });
			queryClient.refetchQueries({ queryKey: ["subscription-history-audit"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to process subscription");
		},
	});

	const cancelMutation = useMutation({
		mutationFn: (data: CancelSubscriptionRequest) =>
			subscriptionsApi.cancel(data),
		onSuccess: () => {
			toast.success("Subscription cancellation processed");
			setIsCancelModalOpen(false);
			setCancelReason("");
			queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
			queryClient.invalidateQueries({
				queryKey: ["subscriptions-grouped-by-company"],
			});
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to cancel subscription");
		},
	});

	// Feature map for quick lookup
	const featureMap = useMemo(() => {
		const map = new Map<string, FeatureItem>();
		featureCatalog.forEach((f) => {
			map.set(f.code, f);
		});
		return map;
	}, [featureCatalog]);

	// Current company name if selected
	const _selectedCompany = companiesList.find(
		(c) => String(c.id) === String(selectedCompanyId),
	);

	// Real server-driven calculations
	const hasActiveSubscription = Boolean(
		(activeSub &&
			(activeSub.status === "ACTIVE" ||
				activeSub.status === "TRIAL" ||
				activeSub.status === "PAST_DUE")) ||
			(entitlement &&
				entitlement.active &&
				(entitlement.planDisplayName ||
					entitlement.planName ||
					entitlement.planId)),
	);

	const rawStatus = (
		entitlement?.subscriptionStatus ||
		activeSub?.status ||
		(hasActiveSubscription ? "ACTIVE" : "NO_SUB")
	).toUpperCase();

	const statusCfg =
		STATUS_BADGE_CONFIG[rawStatus as SubscriptionStatus] ||
		(hasActiveSubscription
			? STATUS_BADGE_CONFIG.ACTIVE
			: {
					labelKey: "subscriptions.status.notSubscribed",
					defaultLabel: "Not Subscribed",
					className:
						"border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400",
					dot: "bg-slate-400",
				});

	const { isAdmin, can } = usePermissions();
	const canManage =
		isSystemAdmin ||
		isAdmin ||
		can("SUBSCRIPTION", "WRITE") ||
		can("SUBSCRIPTION", "UPDATE");

	const currentStatus = rawStatus;
	const isPastDue = currentStatus === "PAST_DUE";

	// Real capacity calculation using server user count
	const maxUsers = entitlement?.maxUsers || activeSub?.plan?.maxUsers || 0;
	const currentUsers = usersData?.total ?? 0;
	const userPercent =
		maxUsers > 0
			? Math.min(100, Math.round((currentUsers / maxUsers) * 100))
			: 0;

	const handleOpenSubscribeModal = (
		plan: PlanDetail,
		price: PlanPriceDetail,
		isRenewal = false,
	) => {
		if (selectedCompanyId) {
			setTargetCompanyId(String(selectedCompanyId));
		}
		setSelectedPlanForSubscribe({ plan, price, isRenewal });
	};

	const handleConfirmSubscribe = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedPlanForSubscribe) return;
		subscribeMutation.mutate({
			planPriceId: selectedPlanForSubscribe.price.id,
			promoCodeId: promoCode.trim() || undefined,
			companyId: isSystemAdmin ? targetCompanyId : undefined,
		});
	};

	const handleConfirmCancel = (e: React.FormEvent) => {
		e.preventDefault();
		cancelMutation.mutate({
			immediate: cancelImmediate,
			cancellationReason:
				cancelReason.trim() || "User requested plan cancellation",
		});
	};

	// Resolved active plan details from server data (NO fake mock fallback)
	const activePlanDisplayName =
		activeSub?.plan?.displayName ||
		activeSub?.plan?.name ||
		entitlement?.planDisplayName ||
		entitlement?.planName ||
		(hasActiveSubscription
			? "Active Subscription"
			: t("subscriptions.subscribeTab.noSubscription", "No Active Subscription"));

	const activeTier =
		activeSub?.plan?.tier || entitlement?.tier || null;

	const currentBillingCycle = (
		activeSub?.planPrice?.billingCycle ||
		entitlement?.billingCycle ||
		"MONTHLY"
	).toUpperCase();

	const activeAmount = Number(
		activeSub?.planPrice?.amount ??
			activeSub?.subscribedAmount ??
			entitlement?.amount ??
			0,
	);

	const activeStartDate = activeSub?.startDate || entitlement?.startDate || null;
	const activeEndDate =
		activeSub?.endDate ||
		activeSub?.nextBillingDate ||
		entitlement?.nextBillingDate ||
		entitlement?.endDate;
	const autoRenew = activeSub?.autoRenew ?? entitlement?.autoRenew ?? false;

	// Enhanced subscription timeline metrics for clarity on expiration and progress
	const timeline = useMemo(() => {
		if (!activeEndDate) {
			return {
				endDate: null,
				startDate: null,
				daysRemaining: null,
				isExpired: false,
				isExpiringSoon: false,
				isCriticalExpiring: false,
				percentElapsed: 0,
				formattedEndDate: "",
				formattedStartDate: "",
				durationDays: 0,
				elapsedDays: 0,
				urgencyText: "",
			};
		}

		const now = new Date();
		const end = new Date(activeEndDate);
		const diffMs = end.getTime() - now.getTime();
		const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

		const isExpired = daysRemaining < 0 || rawStatus === "EXPIRED";
		const isCriticalExpiring = !isExpired && daysRemaining <= 2;
		const isExpiringSoon = !isExpired && daysRemaining <= 7;

		const start = activeStartDate
			? new Date(activeStartDate)
			: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

		const totalDurationMs = Math.max(1000, end.getTime() - start.getTime());
		const elapsedMs = now.getTime() - start.getTime();
		const percentElapsed = isExpired
			? 100
			: Math.min(
					100,
					Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)),
			  );

		const durationDays = Math.max(
			1,
			Math.round(totalDurationMs / (1000 * 60 * 60 * 24)),
		);
		const elapsedDays = Math.max(
			0,
			Math.min(
				durationDays,
				Math.round(elapsedMs / (1000 * 60 * 60 * 24)),
			),
		);

		const formattedEndDate = end.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

		const formattedStartDate = start.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});

		let urgencyText = "";
		if (isExpired) {
			urgencyText =
				daysRemaining < 0
					? t(
							"subscriptions.subscribeTab.expiredDaysAgo",
							"Expired {{count}} days ago",
							{ count: Math.abs(daysRemaining) },
					  )
					: t("subscriptions.status.expired", "Expired");
		} else if (daysRemaining === 0) {
			urgencyText = t(
				"subscriptions.subscribeTab.expiresToday",
				"Expires Today",
			);
		} else if (daysRemaining === 1) {
			urgencyText = t(
				"subscriptions.subscribeTab.oneDayRemaining",
				"1 day remaining",
			);
		} else {
			urgencyText = t(
				"subscriptions.subscribeTab.daysRemaining",
				"{{count}} days remaining",
				{ count: daysRemaining },
			);
		}

		return {
			endDate: end,
			startDate: start,
			daysRemaining,
			isExpired,
			isExpiringSoon,
			isCriticalExpiring,
			percentElapsed,
			formattedEndDate,
			formattedStartDate,
			durationDays,
			elapsedDays,
			urgencyText,
		};
	}, [activeEndDate, activeStartDate, rawStatus, t]);

	// Lookup active plan & price pair for quick 1-click renewal from hero card
	const activePlanPrice = useMemo(() => {
		if (activeSub?.plan && activeSub?.planPrice) {
			return { plan: activeSub.plan, price: activeSub.planPrice };
		}
		const currentPlanId = activeSub?.plan?.id ?? entitlement?.planId;
		const currentPlanCode = activeSub?.plan?.code ?? entitlement?.planCode;
		const currentPriceId = activeSub?.planPrice?.id ?? entitlement?.planPriceId;

		for (const item of groupedPricesData) {
			const plan = item.plan || item;
			const prices: PlanPriceDetail[] = Array.isArray(item.prices)
				? item.prices
				: Array.isArray(item.planPrice)
					? item.planPrice
					: [];

			const isMatch =
				(currentPlanId != null && String(currentPlanId) === String(plan.id)) ||
				(currentPlanCode && currentPlanCode === plan.code) ||
				(plan.name &&
					entitlement?.planName &&
					plan.name.toLowerCase() === entitlement.planName.toLowerCase()) ||
				(plan.displayName &&
					entitlement?.planDisplayName &&
					plan.displayName.toLowerCase() ===
						entitlement.planDisplayName.toLowerCase());

			if (isMatch) {
				let price = prices.find((p) => String(p.id) === String(currentPriceId));
				if (!price) {
					price = prices.find(
						(p) =>
							p.billingCycle === currentBillingCycle && p.active !== false,
					);
				}
				if (!price) {
					price = prices[0];
				}
				if (price) {
					return { plan, price };
				}
			}
		}
		return null;
	}, [activeSub, entitlement, groupedPricesData, currentBillingCycle]);

	// Calculate new projected expiration date upon renewal
	const projectedNewEndDate = useMemo(() => {
		if (!selectedPlanForSubscribe) return null;
		const cycle = selectedPlanForSubscribe.price.billingCycle;
		const durationDays =
			selectedPlanForSubscribe.price.durationDays ||
			(cycle === "YEARLY" ? 365 : 30);

		let baseDate = new Date();
		if (timeline.endDate && !timeline.isExpired && timeline.endDate > baseDate) {
			baseDate = new Date(timeline.endDate);
		}
		const newEnd = new Date(
			baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
		);
		return newEnd.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}, [selectedPlanForSubscribe, timeline.endDate, timeline.isExpired]);

	// Active feature codes directly from entitlement or activeSub - NO FAKE DEFAULTS
	const activeFeatureCodes =
		entitlement?.featureCodes ||
		activeSub?.plan?.features?.map((f) => f.code) ||
		[];

	return (
		<div className="space-y-8">
			{/* Proactive Urgency Banner: Expired State */}
			{hasActiveSubscription && timeline.isExpired && (
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-rose-300 bg-rose-50/90 dark:border-rose-900 dark:bg-rose-950/60 p-5 shadow-xs text-rose-950 dark:text-rose-200">
					<div className="flex items-start gap-3.5">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-rose-200/80 dark:bg-rose-900/80 text-rose-700 dark:text-rose-200">
							<AlertOctagon className="size-5" />
						</div>
						<div className="space-y-1">
							<div className="flex flex-wrap items-center gap-2">
								<h4 className="text-sm font-black tracking-tight">
									{t(
										"subscriptions.subscribeTab.expiredAlertTitle",
										"Subscription Expired on {{date}}",
										{ date: timeline.formattedEndDate },
									)}
								</h4>
								<Badge
									variant="destructive"
									className="text-[10px] uppercase font-bold px-2 py-0.5"
								>
									{timeline.urgencyText}
								</Badge>
							</div>
							<p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed max-w-2xl">
								{t(
									"subscriptions.subscribeTab.expiredAlertDesc",
									"Your subscription has expired. Premium CRM features and record creation may be restricted. Resubscribe now to restore full access.",
								)}
							</p>
						</div>
					</div>
					{activePlanPrice && (
						<Button
							onClick={() =>
								handleOpenSubscribeModal(
									activePlanPrice.plan,
									activePlanPrice.price,
									true,
								)
							}
							className="shrink-0 h-10 gap-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 cursor-pointer"
						>
							<RefreshCw className="size-4" />
							<span>
								{t(
									"subscriptions.subscribeTab.resubscribeNow",
									"Resubscribe Now",
								)}
							</span>
						</Button>
					)}
				</div>
			)}

			{/* Proactive Urgency Banner: Expiring Soon State (<= 7 days) */}
			{hasActiveSubscription &&
				timeline.isExpiringSoon &&
				!timeline.isExpired && (
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-amber-300 bg-amber-50/90 dark:border-amber-900 dark:bg-amber-950/60 p-5 shadow-xs text-amber-950 dark:text-amber-200">
						<div className="flex items-start gap-3.5">
							<div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-amber-200/80 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
								<AlertTriangle className="size-5" />
							</div>
							<div className="space-y-1">
								<div className="flex flex-wrap items-center gap-2">
									<h4 className="text-sm font-black tracking-tight">
										{t(
											"subscriptions.subscribeTab.expiringSoonAlertTitle",
											"Subscription Expiring Soon ({{days}} days remaining)",
											{ days: timeline.daysRemaining ?? 0 },
										)}
									</h4>
									<Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 animate-pulse">
										{timeline.urgencyText}
									</Badge>
								</div>
								<p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed max-w-2xl">
									{t(
										"subscriptions.subscribeTab.expiringSoonAlertDesc",
										"Your plan will expire on {{date}}. Renew now to prevent service interruption or team access loss.",
										{ date: timeline.formattedEndDate },
									)}
								</p>
							</div>
						</div>
						{activePlanPrice && (
							<Button
								onClick={() =>
									handleOpenSubscribeModal(
										activePlanPrice.plan,
										activePlanPrice.price,
										true,
									)
								}
								className="shrink-0 h-10 gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/25 cursor-pointer"
							>
								<RefreshCw className="size-4" />
								<span>
									{t("subscriptions.subscribeTab.quickRenew", "Renew Now")}
								</span>
							</Button>
						)}
					</div>
				)}

			{/* 1. Subscription and Plan Card (Company Entitlement) */}
			<div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/60 to-purple-50/20 p-6 shadow-md backdrop-blur-xl dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/50 dark:to-purple-950/20 md:p-8 space-y-6">
				{/* Subtle Decorative Gradient Orb */}
				<div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-primary/10 blur-3xl" />

				<div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					{/* Current Plan Overview Info */}
					<div className="space-y-3 max-w-xl">
						<div className="flex flex-wrap items-center gap-2.5">
							<Badge
								variant="outline"
								className={`text-xs px-3 py-1 font-semibold rounded-xl ${
									timeline.isExpired
										? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
										: timeline.isExpiringSoon
											? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse"
											: statusCfg?.className || ""
								}`}
							>
								<span
									className={`mr-1.5 size-2 rounded-full inline-block ${
										timeline.isExpired
											? "bg-rose-500"
											: timeline.isExpiringSoon
												? "bg-amber-500"
												: statusCfg?.dot || "bg-emerald-500"
									}`}
								/>
								{t(
									statusCfg?.labelKey || "subscriptions.status.active",
									statusCfg?.defaultLabel || "Active Subscription",
								)}
							</Badge>

							{activeTier ? (
								<Badge
									variant="secondary"
									className="text-xs px-2.5 py-0.5 bg-purple-100/70 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold uppercase tracking-wider"
								>
									{t("subscriptions.subscribeTab.tier", "{{tier}} TIER", {
										tier: activeTier,
									})}
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="text-xs px-2.5 py-0.5 border-slate-200 text-slate-500 font-bold uppercase tracking-wider dark:border-slate-800 dark:text-slate-400"
								>
									{t("subscriptions.subscribeTab.noTier", "NO TIER")}
								</Badge>
							)}

							{/* High-visibility Expiration Countdown Badge */}
							{hasActiveSubscription && timeline.urgencyText && (
								<Badge
									variant="outline"
									className={`text-xs px-2.5 py-0.5 font-bold rounded-xl flex items-center gap-1 ${
										timeline.isExpired
											? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
											: timeline.isExpiringSoon
												? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse"
												: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
									}`}
								>
									<Clock className="size-3" />
									<span>{timeline.urgencyText}</span>
								</Badge>
							)}

							{/* Auto-renew vs Manual Renewal tag */}
							{hasActiveSubscription && (
								autoRenew ? (
									<span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium dark:text-emerald-400">
										<CheckCircle2 className="size-3.5" />{" "}
										{t(
											"subscriptions.subscribeTab.autoRenewEnabled",
											"Auto-Renew Enabled",
										)}
									</span>
								) : (
									<span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium dark:text-slate-400">
										<Clock className="size-3.5 text-amber-500" />{" "}
										{t(
											"subscriptions.subscribeTab.manualRenewalRequired",
											"Manual Renewal Required",
										)}
									</span>
								)
							)}
						</div>

						<div>
							<h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
								{activePlanDisplayName}
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
								{hasActiveSubscription
									? t(
											"subscriptions.subscribeTab.activeFeatureEntitlementsDesc",
											"Active corporate subscription providing feature entitlements, API access, and workflow pipelines.",
										)
									: t(
											"subscriptions.subscribeTab.noActiveSubscriptionDesc",
											"This company currently has no active subscription. Choose a tier from the catalog below or start a 14-day free trial.",
										)}
							</p>
						</div>
					</div>

					{/* Actions Panel */}
					<div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
						{canManage ? (
							<>
								{/* Quick Renew / Extend Button right in Hero Card */}
								{hasActiveSubscription && activePlanPrice && (
									<Button
										onClick={() =>
											handleOpenSubscribeModal(
												activePlanPrice.plan,
												activePlanPrice.price,
												true,
											)
										}
										className="h-10 gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 text-xs font-bold px-4 cursor-pointer transition-all"
									>
										<RefreshCw className="size-4" />
										<span>
											{timeline.isExpired
												? t(
														"subscriptions.subscribeTab.resubscribePlan",
														"Resubscribe Current Plan",
													)
												: t(
														"subscriptions.subscribeTab.renewSubscription",
														"Renew / Extend Subscription",
													)}
										</span>
									</Button>
								)}

								<Button
									onClick={() => {
										const el = document.getElementById(
											"public-pricing-matrix",
										);
										el?.scrollIntoView({ behavior: "smooth" });
									}}
									variant={hasActiveSubscription ? "outline" : "default"}
									className={`h-10 gap-2 rounded-2xl text-xs font-bold px-4 cursor-pointer transition-all ${
										!hasActiveSubscription
											? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90"
											: "border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
									}`}
								>
									<Zap className="size-4 text-primary" />
									<span>
										{hasActiveSubscription
											? t(
													"subscriptions.subscribeTab.changeUpgradePlan",
													"Change / Upgrade Plan",
												)
											: t(
													"subscriptions.subscribeTab.choosePlan",
													"Choose Subscription Plan",
												)}
									</span>
								</Button>

								{currentStatus !== "TRIAL" && !hasActiveSubscription && (
									<Button
										onClick={() => startTrialMutation.mutate()}
										disabled={startTrialMutation.isPending}
										variant="outline"
										className="h-10 gap-2 rounded-2xl border-sky-200 bg-sky-50/60 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300 text-xs font-semibold px-4 cursor-pointer"
									>
										<Sparkles className="size-4 text-sky-600" />
										<span>
											{startTrialMutation.isPending
												? t(
														"subscriptions.subscribeTab.activating",
														"Activating...",
													)
												: t(
														"subscriptions.subscribeTab.startTrial",
														"Start 14-Day Trial",
													)}
										</span>
									</Button>
								)}

								{hasActiveSubscription && (
									<Button
										onClick={() => setIsCancelModalOpen(true)}
										variant="ghost"
										className="h-10 gap-2 rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-xs font-medium px-4 cursor-pointer"
									>
										<XCircle className="size-4" />
										<span>
											{t("subscriptions.subscribeTab.cancelPlan", "Cancel Plan")}
										</span>
									</Button>
								)}
							</>
						) : (
							<div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 space-y-1 max-w-xs shadow-2xs">
								<div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
									<Lock className="size-3.5 text-primary" />
									<span>
										{t(
											"subscriptions.subscribeTab.managedSubscriptionTitle",
											"Managed Subscription",
										)}
									</span>
								</div>
								<p className="text-[11px] text-slate-400">
									{t(
										"subscriptions.subscribeTab.managedSubscriptionDesc",
										"Subscription plan tier and billing cycles are managed centrally by the platform administrator.",
									)}
								</p>
							</div>
						)}
					</div>
				</div>

				{/* Grace Period Alert */}
				{isPastDue && (
					<div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
						<AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
						<div className="space-y-1">
							<h4 className="text-xs font-bold uppercase tracking-wider">
								{t(
									"subscriptions.subscribeTab.gracePeriodTitle",
									"Payment Past Due (Grace Period Active)",
								)}
							</h4>
							<p className="text-xs text-amber-800 dark:text-amber-300">
								{t(
									"subscriptions.subscribeTab.gracePeriodDesc",
									"Payment renewal could not be settled. System features remain active for 3 more days until grace period expires.",
								)}
							</p>
						</div>
					</div>
				)}

				{/* Odoo-style 4-Tile Smart Subscription Metrics Ribbon */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
					{/* 1. Contract Expiration / Next Renewal */}
					<div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{autoRenew
									? t(
											"subscriptions.subscribeTab.nextScheduledRenewal",
											"Next Scheduled Renewal",
										)
									: t(
											"subscriptions.subscribeTab.contractExpiration",
											"Contract Expiration",
										)}
							</span>
							<Calendar className="size-4 text-primary" />
						</div>
						<div className="mt-2 space-y-1">
							<div className="text-base font-black text-slate-900 dark:text-white">
								{timeline.formattedEndDate ||
									t(
										"subscriptions.subscribeTab.noScheduledRenewal",
										"No scheduled renewal",
									)}
							</div>
							<div className="flex items-center gap-1.5">
								{timeline.urgencyText && (
									<Badge
										variant="outline"
										className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
											timeline.isExpired
												? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
												: timeline.isExpiringSoon
													? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse"
													: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
										}`}
									>
										{timeline.urgencyText}
									</Badge>
								)}
							</div>
						</div>
					</div>

					{/* 2. Billing Rate & Auto-Renew Frequency */}
					<div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{t("subscriptions.subscribeTab.billingRate", "Billing Rate")}
							</span>
							<CreditCard className="size-4 text-emerald-600" />
						</div>
						<div className="mt-2 space-y-1">
							<div className="text-base font-black text-slate-900 dark:text-white">
								{hasActiveSubscription ? (
									<>
										${(!isNaN(activeAmount) ? activeAmount : 0).toFixed(2)}{" "}
										<span className="text-xs font-semibold text-slate-400">
											/ {currentBillingCycle.toLowerCase()}
										</span>
									</>
								) : (
									<span className="text-sm font-semibold text-slate-400">
										$0.00
									</span>
								)}
							</div>
							<div className="text-[11px] font-medium text-slate-500">
								{hasActiveSubscription ? (
									autoRenew ? (
										t(
											"subscriptions.subscribeTab.autoRenewEnabled",
											"Auto-Renew Enabled",
										)
									) : (
										t(
											"subscriptions.subscribeTab.manualRenewalRequired",
											"Manual Renewal Required",
										)
									)
								) : (
									t(
										"subscriptions.subscribeTab.noSubscription",
										"No Active Subscription",
									)
								)}
							</div>
						</div>
					</div>

					{/* 3. Cycle Elapsed Progress */}
					<div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{t(
									"subscriptions.subscribeTab.cycleProgress",
									"Billing Cycle Progress",
								)}
							</span>
							<Clock className="size-4 text-purple-600" />
						</div>
						<div className="mt-2 space-y-2">
							<div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
								<span>
									{hasActiveSubscription && timeline.formattedEndDate
										? t(
												"subscriptions.subscribeTab.cycleProgressDesc",
												"Day {{elapsed}} of {{total}} ({{percent}}% elapsed)",
												{
													elapsed: timeline.elapsedDays,
													total: timeline.durationDays,
													percent: timeline.percentElapsed,
												},
											)
										: t(
												"subscriptions.subscribeTab.noSubscription",
												"No Active Subscription",
											)}
								</span>
							</div>
							<Progress
								value={hasActiveSubscription ? timeline.percentElapsed : 0}
								className="h-2 rounded-full"
							/>
						</div>
					</div>

					{/* 4. Team Seats Allocation */}
					<div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90">
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
								{t(
									"subscriptions.subscribeTab.teamSeatAllocation",
									"Team Seat Allocation",
								)}
							</span>
							<Users className="size-4 text-sky-600" />
						</div>
						<div className="mt-2 space-y-2">
							<div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
								<span>
									{maxUsers > 0
										? `${currentUsers} of ${maxUsers} seats (${userPercent}%)`
										: `${currentUsers} members (Unlimited)`}
								</span>
							</div>
							<Progress value={userPercent} className="h-2 rounded-full" />
						</div>
					</div>
				</div>

				{/* Clean Features & Descriptions Section */}
				<div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Sparkles className="size-3.5 text-primary" />
								{t(
									"subscriptions.subscribeTab.activeFeatureEntitlements",
									"Active Plan Feature Entitlements ({{count}} enabled)",
									{ count: activeFeatureCodes.length },
								)}
							</h3>
							<p className="text-[11px] text-slate-400 mt-0.5">
								{t(
									"subscriptions.subscribeTab.activeFeatureEntitlementsDesc",
									"Granular capabilities and system permissions unlocked under the active plan tier.",
								)}
							</p>
						</div>
						{hasActiveSubscription && (
							<Badge
								variant="outline"
								className="text-[10px] px-2 py-0.5 font-mono text-emerald-600 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
							>
								{t(
									"subscriptions.subscribeTab.gatedAndVerified",
									"Gated & Verified",
								)}
							</Badge>
						)}
					</div>

					{/* Clean Feature Cards Grid */}
					{activeFeatureCodes.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center space-y-1.5">
							<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
								{hasActiveSubscription
									? t(
											"subscriptions.subscribeTab.noPlanFeatures",
											"No specific feature flags are attached to this plan tier.",
										)
									: t(
											"subscriptions.subscribeTab.subscribeToUnlockFeatures",
											"No active feature entitlements. Subscribe to a plan below to activate CRM capabilities.",
										)}
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{activeFeatureCodes.map((code) => {
								const featFromCatalog = featureMap.get(code);
								const featFallback = FEATURE_CATALOG_FALLBACK[code] || {
									name: code
										.replace(/_/g, " ")
										.toLowerCase()
										.replace(/\b\w/g, (l) => l.toUpperCase()),
									description:
										"Standard CRM business feature unlocked for this company.",
								};
								const name = featFromCatalog?.name || featFallback.name;
								const description =
									featFromCatalog?.description || featFallback.description;

								return (
									<div
										key={code}
										className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/90"
									>
										<div className="space-y-2">
											<div className="flex items-start justify-between gap-2">
												<div className="flex items-center gap-2">
													<div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
														<Check className="size-4 font-bold" />
													</div>
													<h4 className="font-bold text-xs text-slate-950 dark:text-white line-clamp-1">
														{name}
													</h4>
												</div>
												<Badge
													variant="outline"
													className="font-mono text-[9px] px-1.5 py-0.5 rounded-md border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
												>
													{code}
												</Badge>
											</div>

											<p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
												{description}
											</p>
										</div>

										<div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
											<span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
												<CheckCircle2 className="size-3" />{" "}
												{t(
													"subscriptions.subscribeTab.includedInTier",
													"Included in Tier",
												)}
											</span>
											<span className="text-slate-400">
												{t(
													"subscriptions.subscribeTab.statusActive",
													"Status: Active",
												)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* 2. Choose the Perfect Tier for Your Business (Pricing Matrix) */}
			<div id="public-pricing-matrix" className="space-y-6 pt-4">
				<div className="flex flex-col items-center justify-center text-center space-y-3">
					<Badge
						variant="outline"
						className="text-xs px-3 py-1 font-semibold rounded-full border-primary/30 bg-primary/10 text-primary"
					>
						<Sparkles className="size-3.5 mr-1" />
						{t(
							"subscriptions.subscribeTab.transparentPlans",
							"Transparent Subscription Plans",
						)}
					</Badge>
					<h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
						{t(
							"subscriptions.subscribeTab.chooseTierTitle",
							"Choose the Perfect Tier for Your Business",
						)}
					</h2>
					<p className="text-xs text-slate-500 max-w-lg">
						{t(
							"subscriptions.subscribeTab.chooseTierDesc",
							"Scale seamlessly from startup to enterprise with flexible billing cycles and granular feature flags.",
						)}
					</p>

					{/* Monthly vs Yearly Toggle Switch */}
					<div className="flex items-center gap-3 pt-2">
						<div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
							<button
								type="button"
								onClick={() => setBillingCycleToggle("MONTHLY")}
								className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
									billingCycleToggle === "MONTHLY"
										? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
										: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
							>
								{t(
									"subscriptions.subscribeTab.monthlyBilling",
									"Monthly Billing",
								)}
							</button>
							<button
								type="button"
								onClick={() => setBillingCycleToggle("YEARLY")}
								className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
									billingCycleToggle === "YEARLY"
										? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
										: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
							>
								<span>
									{t(
										"subscriptions.subscribeTab.yearlyBilling",
										"Yearly Billing",
									)}
								</span>
								<span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
									{t("subscriptions.subscribeTab.save20", "Save 20%")}
								</span>
							</button>
						</div>
					</div>
				</div>

				{/* Pricing Cards Grid */}
				{isLoadingPricing ? (
					<div className="flex items-center justify-center p-12 text-xs text-slate-400">
						<RefreshCw className="size-4 animate-spin mr-2 text-primary" />
						<span>Loading subscription plans from server...</span>
					</div>
				) : groupedPricesData.length === 0 ? (
					<div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-2">
						<Crown className="size-8 text-slate-400 mx-auto" />
						<p className="text-sm font-bold text-slate-700 dark:text-slate-300">
							No Published Plans Found
						</p>
						<p className="text-xs text-slate-400 max-w-sm mx-auto">
							Subscription plans can be created and managed in the Plan & PlanPrice tab by a platform administrator.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
						{groupedPricesData.map((item) => {
						const plan = item.plan || item;
						const prices = Array.isArray(item.prices)
							? item.prices
							: Array.isArray(item.planPrice)
								? item.planPrice
								: [];

						// Active state checks
						const isPlanActive = Boolean(
							entitlement?.active ||
								(activeSub &&
									(activeSub.status === "ACTIVE" ||
										activeSub.status === "TRIAL")),
						);

						const currentPlanId =
							activeSub?.plan?.id ?? entitlement?.planId;
						const currentPlanCode =
							activeSub?.plan?.code ?? entitlement?.planCode;

						const isMatchingPlan = Boolean(
							isPlanActive &&
								((currentPlanId != null &&
									String(currentPlanId) === String(plan.id)) ||
									(currentPlanCode && currentPlanCode === plan.code) ||
									(plan.name &&
										entitlement?.planName &&
										plan.name.toLowerCase() ===
											entitlement.planName.toLowerCase()) ||
									(plan.displayName &&
										entitlement?.planDisplayName &&
										plan.displayName.toLowerCase() ===
											entitlement.planDisplayName.toLowerCase()) ||
									(plan.displayName &&
										activeSub?.plan?.displayName &&
										plan.displayName.toLowerCase() ===
											activeSub.plan.displayName.toLowerCase())),
						);

						const isSameCycle =
							currentBillingCycle === billingCycleToggle.toUpperCase();
						const isCurrentPlanAndCycle = isMatchingPlan && isSameCycle;
						const isCanSwitchCycle = isMatchingPlan && !isSameCycle;

						// Find price for selected cycle or fallback
						const price =
							prices.find(
								(p) =>
									p.billingCycle === billingCycleToggle && p.active !== false,
							) ||
							prices.find((p) => p.active !== false) ||
							prices[0];

						const isPro = plan.tier === "PROFESSIONAL";

						return (
							<div
								key={plan.id}
								className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 ${
									isMatchingPlan
										? "border-2 border-primary bg-white shadow-xl shadow-primary/10 ring-4 ring-primary/10 dark:bg-slate-900"
										: "border border-slate-200/90 bg-white/90 shadow-sm hover:shadow-md dark:border-slate-800 dark:bg-slate-950/90"
								}`}
							>
								{isMatchingPlan ? (
									<div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
										<span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[11px] font-extrabold tracking-wider text-primary-foreground uppercase shadow-md shadow-primary/30">
											<Check className="size-3" />{" "}
											{isCurrentPlanAndCycle
												? t(
														"subscriptions.subscribeTab.currentActivePlanBadge",
														"Active Plan",
													)
												: t(
														"subscriptions.subscribeTab.activeCycleBadge",
														"Active ({{cycle}})",
														{ cycle: currentBillingCycle.toLowerCase() },
													)}
										</span>
									</div>
								) : isPro ? (
									<div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
										<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-0.5 text-[11px] font-extrabold tracking-wider text-slate-700 dark:text-slate-300 uppercase shadow-xs">
											<Sparkles className="size-3 text-amber-500" />{" "}
											{t(
												"subscriptions.subscribeTab.mostPopular",
												"Most Popular",
											)}
										</span>
									</div>
								) : null}

								<div className="space-y-4">
									{/* Tier & Name */}
									<div className="space-y-1">
										<div className="flex items-center justify-between">
											<Badge
												variant="outline"
												className="text-[10px] font-bold uppercase tracking-wider"
											>
												{plan.tier}
											</Badge>
											<span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
												<Users className="size-3" />{" "}
												{t(
													"subscriptions.subscribeTab.usersCount",
													"{{count}} users",
													{ count: plan.maxUsers },
												)}
											</span>
										</div>
										<h3 className="text-lg font-black text-slate-900 dark:text-white">
											{plan.displayName || plan.name}
										</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400 min-h-[32px] line-clamp-2">
											{plan.description ||
												"Comprehensive CRM management tools."}
										</p>
									</div>

									{/* Price Amount */}
									<div className="py-2 border-y border-slate-100 dark:border-slate-800/80">
										<div className="flex items-baseline gap-1">
											<span className="text-3xl font-black text-slate-900 dark:text-white">
												$
												{price
													? Number(price.amount) === 0
														? "0"
														: Number(price.amount).toFixed(2)
													: plan.trial
														? "0"
														: "0.00"}
											</span>
											<span className="text-xs font-semibold text-slate-400">
												/{" "}
												{price?.billingCycle === "YEARLY"
													? t("subscriptions.subscribeTab.perYear", "year")
													: t("subscriptions.subscribeTab.perMonth", "month")}
											</span>
										</div>
										<div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
											<span>
												{plan.trial && (!price || Number(price.amount) === 0)
													? t(
															"subscriptions.subscribeTab.freeTrialDesc",
															"14-Day Free Evaluation • Zero Cost",
														)
													: price
														? t(
																"subscriptions.subscribeTab.billedCycle",
																"Billed {{cycle}} • {{currency}}",
																{
																	cycle: price?.billingCycle
																		? price.billingCycle.toLowerCase()
																		: "monthly",
																	currency: price?.currency || "USD",
																},
															)
														: t(
																"subscriptions.subscribeTab.standardPricing",
																"Standard Tier Pricing",
															)}
											</span>
											{price?.billingCycle === "YEARLY" && Number(price.amount) > 0 && (
												<span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-900/60">
													${(Number(price.amount) / 12).toFixed(2)}/mo
												</span>
											)}
										</div>
									</div>

									{/* Features List */}
									<div className="space-y-2.5">
										<span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
											{t(
												"subscriptions.subscribeTab.includedCapabilities",
												"Included Capabilities:",
											)}
										</span>
										<ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
											{(plan.features || []).map((feat) => (
												<li key={feat.id} className="flex items-start gap-2">
													<Check className="size-3.5 text-primary shrink-0 mt-0.5" />
													<div>
														<span className="text-xs font-semibold text-slate-900 dark:text-white">
															{feat.name}
														</span>
														{feat.description && (
															<p className="text-[10px] text-slate-400 line-clamp-1">
																{feat.description}
															</p>
														)}
													</div>
												</li>
											))}
											{(!plan.features || plan.features.length === 0) && (
												<li className="text-slate-400 italic text-[11px]">
													Core CRM features included
												</li>
											)}
										</ul>
									</div>
								</div>

								{/* Card Action Button */}
								<div className="mt-6 pt-4">
									{isCurrentPlanAndCycle ? (
										<div className="space-y-1.5">
											<Button
												onClick={() => {
													if (price) {
														handleOpenSubscribeModal(plan, price, true);
													} else if (plan.trial) {
														startTrialMutation.mutate();
													}
												}}
												disabled={!price && !plan.trial}
												className="w-full h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
											>
												<RefreshCw className="size-3.5" />
												<span>
													{timeline.isExpired
														? t(
																"subscriptions.subscribeTab.resubscribePlan",
																"Resubscribe Current Plan",
															)
														: t(
																"subscriptions.subscribeTab.renewPlan",
																"Renew / Extend Plan",
															)}
												</span>
											</Button>
											<p className="text-center text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
												{timeline.isExpired
													? t(
															"subscriptions.subscribeTab.expiredReactivate",
															"Expired • Click to reactivate",
														)
													: timeline.formattedEndDate
														? t(
																"subscriptions.subscribeTab.activeUntil",
																"Active until {{date}} ({{days}}d left)",
																{
																	date: timeline.formattedEndDate,
																	days: timeline.daysRemaining ?? 0,
																},
															)
														: t(
																"subscriptions.subscribeTab.currentActivePlan",
																"Current Active Plan",
															)}
											</p>
										</div>
									) : canManage ? (
										<Button
											onClick={() => {
												if (price) {
													handleOpenSubscribeModal(plan, price, isMatchingPlan);
												} else if (plan.trial) {
													startTrialMutation.mutate();
												}
											}}
											disabled={!price && !plan.trial}
											className={`w-full h-10 rounded-2xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
												isCanSwitchCycle
													? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
													: isMatchingPlan
														? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
														: isPro
															? "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
															: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
											}`}
										>
											<span>
												{isCanSwitchCycle
													? billingCycleToggle === "YEARLY"
														? t(
																"subscriptions.subscribeTab.switchToYearly",
																"Switch to Yearly Billing",
															)
														: t(
																"subscriptions.subscribeTab.switchToMonthly",
																"Switch to Monthly Billing",
															)
													: plan.trial && !price
														? t(
																"subscriptions.subscribeTab.startTrial",
																"Start 14-Day Trial",
															)
														: t(
																"subscriptions.subscribeTab.selectPlan",
																"Select {{name}}",
																{ name: plan.displayName || plan.name },
															)}
											</span>
											<ArrowRight className="size-3.5 ml-1" />
										</Button>
									) : (
										<Button
											disabled
											variant="outline"
											className="w-full h-10 rounded-2xl text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 cursor-not-allowed opacity-75"
										>
											<Lock className="size-3.5 mr-1.5 text-slate-400" />
											<span>
												{t(
													"subscriptions.subscribeTab.upgradeViaAdmin",
													"Upgrade via Admin",
												)}
											</span>
										</Button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
			</div>

			{/* 3. Subscription Audit History Log */}
			<SubscriptionAuditHistorySection
				effectiveCompanyId={effectiveCompanyId}
				isSystemAdmin={isSystemAdmin}
			/>

			{/* Subscribe / Renew Confirmation Modal */}
			<ModernModal
				open={Boolean(selectedPlanForSubscribe)}
				onOpenChange={(open) => {
					if (!open) setSelectedPlanForSubscribe(null);
				}}
				title={
					selectedPlanForSubscribe?.isRenewal
						? t(
								"subscriptions.subscribeModal.renewTitle",
								"Renew / Extend Subscription: {{name}}",
								{
									name:
										selectedPlanForSubscribe?.plan.displayName ||
										selectedPlanForSubscribe?.plan.name ||
										"",
								},
							)
						: t(
								"subscriptions.subscribeModal.title",
								"Subscribe to {{name}}",
								{
									name:
										selectedPlanForSubscribe?.plan.displayName ||
										selectedPlanForSubscribe?.plan.name ||
										"",
								},
							)
				}
				description={
					selectedPlanForSubscribe?.isRenewal
						? t(
								"subscriptions.subscribeModal.renewDesc",
								"Extend your subscription period, apply promotional codes, and confirm renewal for your company.",
							)
						: t(
								"subscriptions.subscribeModal.desc",
								"Review tier features, select target tenant company, and confirm subscription activation.",
							)
				}
				icon={
					selectedPlanForSubscribe?.isRenewal ? (
						<RefreshCw className="size-5 text-emerald-600" />
					) : (
						<Crown className="size-5 text-primary" />
					)
				}
			>
				<form onSubmit={handleConfirmSubscribe} className="space-y-4 py-2">
					{/* Summary Box */}
					<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10 space-y-2.5">
						<div className="flex justify-between items-center text-xs">
							<span className="text-slate-500 font-medium">
								{t(
									"subscriptions.subscribeModal.selectedTier",
									"Selected Tier:",
								)}
							</span>
							<strong className="text-slate-900 dark:text-white font-bold">
								{selectedPlanForSubscribe?.plan.displayName ||
									selectedPlanForSubscribe?.plan.name}{" "}
								({selectedPlanForSubscribe?.plan.tier})
							</strong>
						</div>
						<div className="flex justify-between items-center text-xs">
							<span className="text-slate-500 font-medium">
								{t(
									"subscriptions.subscribeModal.billingInterval",
									"Billing Interval:",
								)}
							</span>
							<strong className="text-slate-900 dark:text-white font-bold">
								{selectedPlanForSubscribe?.price.billingCycle} ($
								{Number(selectedPlanForSubscribe?.price.amount).toFixed(2)}{" "}
								{selectedPlanForSubscribe?.price.currency})
							</strong>
						</div>
						<div className="flex justify-between items-center text-xs">
							<span className="text-slate-500 font-medium">
								{t(
									"subscriptions.subscribeModal.teamMemberCap",
									"Team Member Cap:",
								)}
							</span>
							<strong className="text-slate-900 dark:text-white font-bold">
								{t(
									"subscriptions.subscribeModal.upToUsers",
									"Up to {{count}} users",
									{ count: selectedPlanForSubscribe?.plan.maxUsers || 0 },
								)}
							</strong>
						</div>

						{/* Expiration Extension Preview if Renewal */}
						{selectedPlanForSubscribe?.isRenewal && (
							<>
								<div className="pt-2 border-t border-primary/10 space-y-1.5">
									{timeline.formattedEndDate && (
										<div className="flex justify-between items-center text-xs">
											<span className="text-slate-500 font-medium">
												{t(
													"subscriptions.subscribeModal.currentExpiration",
													"Current Expiration:",
												)}
											</span>
											<span className="text-slate-700 dark:text-slate-300 font-semibold">
												{timeline.formattedEndDate} ({timeline.urgencyText})
											</span>
										</div>
									)}
									{projectedNewEndDate && (
										<div className="flex justify-between items-center text-xs">
											<span className="text-slate-500 font-medium">
												{t(
													"subscriptions.subscribeModal.newExpiration",
													"New Projected Expiration:",
												)}
											</span>
											<strong className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
												<Calendar className="size-3 text-emerald-600" />
												{projectedNewEndDate}
											</strong>
										</div>
									)}
								</div>

								<div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
									<CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
									<span>
										{t(
											"subscriptions.subscribeModal.renewalExtensionNotice",
											"Renewing will extend your active subscription by 1 {{cycle}} without service disruption.",
											{
												cycle:
													selectedPlanForSubscribe.price.billingCycle.toLowerCase(),
											},
										)}
									</span>
								</div>
							</>
						)}
					</div>

					{isSystemAdmin && (
						<ModernSelect
							label={t(
								"subscriptions.subscribeModal.targetCompany",
								"Target Company",
							)}
							value={targetCompanyId}
							onChange={setTargetCompanyId}
							options={companiesList.map((c) => ({
								label: `${c.name} (${c.email || c.id})`,
								value: String(c.id),
							}))}
							helperText={t(
								"subscriptions.subscribeModal.targetCompanyHelper",
								"System Admin smart dispatch option",
							)}
							required
						/>
					)}

					<ModernInput
						label={t(
							"subscriptions.subscribeModal.promoCode",
							"Promo / Voucher Code",
						)}
						placeholder={t(
							"subscriptions.subscribeModal.promoCodePlaceholder",
							"e.g. SUMMER_PROMO_2026",
						)}
						value={promoCode}
						onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
						helperText={t(
							"subscriptions.subscribeModal.promoCodeHelper",
							"Optional promotional discount code",
						)}
					/>

					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setSelectedPlanForSubscribe(null)}
						/>
						<ModernModalSubmitButton loading={subscribeMutation.isPending}>
							{subscribeMutation.isPending
								? t("subscriptions.subscribeModal.processing", "Processing...")
								: selectedPlanForSubscribe?.isRenewal
									? timeline.isExpired
										? t(
												"subscriptions.subscribeModal.confirmResubscribe",
												"Confirm & Resubscribe",
											)
										: t(
												"subscriptions.subscribeModal.confirmRenew",
												"Confirm & Renew Subscription",
											)
									: t(
											"subscriptions.subscribeModal.confirmActivate",
											"Confirm & Activate Subscription",
										)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* Cancel Subscription Modal */}
			<ModernModal
				open={isCancelModalOpen}
				onOpenChange={setIsCancelModalOpen}
				title={t(
					"subscriptions.cancelModal.title",
					"Cancel Active Subscription",
				)}
				description={t(
					"subscriptions.cancelModal.desc",
					"Confirm cancellation preferences for this tenant company.",
				)}
				icon={<AlertTriangle className="size-5 text-rose-500" />}
			>
				<form onSubmit={handleConfirmCancel} className="space-y-4 py-2">
					<div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 space-y-1.5">
						<h5 className="font-bold">
							{t("subscriptions.cancelModal.termsTitle", "Cancellation Terms")}
						</h5>
						<p>
							{t(
								"subscriptions.cancelModal.termsDesc",
								"The subscription will remain active until the end of the current billing cycle unless you select immediate termination.",
							)}
						</p>
					</div>

					<label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
						<input
							type="checkbox"
							checked={cancelImmediate}
							onChange={(e) => setCancelImmediate(e.target.checked)}
							className="size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5"
						/>
						<div>
							<span className="font-semibold text-slate-900 dark:text-white">
								{t(
									"subscriptions.cancelModal.immediateTitle",
									"Immediate Cancellation",
								)}
							</span>
							<p className="text-[11px] text-slate-500">
								{t(
									"subscriptions.cancelModal.immediateDesc",
									"Cancel immediately and terminate feature entitlements right now instead of at the end of the billing period.",
								)}
							</p>
						</div>
					</label>

					<ModernTextarea
						label={t(
							"subscriptions.cancelModal.reasonLabel",
							"Reason for Cancellation",
						)}
						placeholder={t(
							"subscriptions.cancelModal.reasonPlaceholder",
							"Tell us why you are canceling or what could be improved...",
						)}
						value={cancelReason}
						onChange={(e) => setCancelReason(e.target.value)}
						rows={3}
						required
					/>

					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsCancelModalOpen(false)}
						/>
						<Button
							type="submit"
							variant="destructive"
							className="rounded-xl text-xs font-semibold px-4 cursor-pointer"
							disabled={cancelMutation.isPending}
						>
							{cancelMutation.isPending
								? t("subscriptions.cancelModal.cancelling", "Cancelling...")
								: t(
										"subscriptions.cancelModal.confirmCancellation",
										"Confirm Cancellation",
									)}
						</Button>
					</ModernModalFooter>
				</form>
			</ModernModal>
		</div>
	);
}

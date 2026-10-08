"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plansApi, planPricesApi, featuresApi } from "@/lib/api/endpoints";
import {
	PlanDetail,
	PlanRequest,
	PlanPriceDetail,
	PlanPriceRequest,
	PlanTier,
	BillingCycle,
	IntervalUnit,
	FeatureItem,
} from "@/types/subscription";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Layers,
	Plus,
	Search,
	CheckCircle2,
	Trash2,
	Edit,
	DollarSign,
	Users,
	Shield,
	Crown,
	Sparkles,
	Eye,
	EyeOff,
	Check,
	Zap,
	Tag,
	AlertCircle,
	TrendingUp,
	Clock,
	ChevronDown,
	ChevronRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
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
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

const TIER_OPTIONS: {
	labelKey: string;
	defaultLabel: string;
	value: PlanTier;
	color: string;
	desc: string;
}[] = [
	{
		labelKey: "subscriptions.plansTab.tierOptions.freeTrial",
		defaultLabel: "Free Trial (0)",
		value: "FREE_TRIAL",
		color:
			"border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
		desc: "14-day zero cost evaluation tier",
	},
	{
		labelKey: "subscriptions.plansTab.tierOptions.starter",
		defaultLabel: "Starter (1)",
		value: "STARTER",
		color:
			"border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300",
		desc: "Base sales essentials for small businesses",
	},
	{
		labelKey: "subscriptions.plansTab.tierOptions.professional",
		defaultLabel: "Professional (2)",
		value: "PROFESSIONAL",
		color:
			"border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300",
		desc: "Advanced automations, funnels & team collaboration",
	},
	{
		labelKey: "subscriptions.plansTab.tierOptions.enterprise",
		defaultLabel: "Enterprise (3)",
		value: "ENTERPRISE",
		color:
			"border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
		desc: "Full CRM power, custom integrations & highest limits",
	},
];

const BILLING_CYCLES: {
	labelKey: string;
	defaultLabel: string;
	value: BillingCycle;
}[] = [
	{
		labelKey: "subscriptions.plansTab.billingCycles.monthly",
		defaultLabel: "Monthly",
		value: "MONTHLY",
	},
	{
		labelKey: "subscriptions.plansTab.billingCycles.yearly",
		defaultLabel: "Yearly (Annual)",
		value: "YEARLY",
	},
	{
		labelKey: "subscriptions.plansTab.billingCycles.quarterly",
		defaultLabel: "Quarterly",
		value: "QUARTERLY",
	},
	{
		labelKey: "subscriptions.plansTab.billingCycles.oneTime",
		defaultLabel: "One-Time Settlement",
		value: "ONE_TIME",
	},
];

const INTERVAL_UNITS: {
	labelKey: string;
	defaultLabel: string;
	value: IntervalUnit;
}[] = [
	{
		labelKey: "subscriptions.plansTab.intervalUnits.month",
		defaultLabel: "Month",
		value: "MONTH",
	},
	{
		labelKey: "subscriptions.plansTab.intervalUnits.year",
		defaultLabel: "Year",
		value: "YEAR",
	},
	{
		labelKey: "subscriptions.plansTab.intervalUnits.day",
		defaultLabel: "Day",
		value: "DAY",
	},
];

export function PlansTab({ isSystemAdmin }: { isSystemAdmin: boolean }) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [subView, setSubView] = useState<"PLANS" | "PRICES">("PLANS");
	const [search, setSearch] = useState("");
	const [expandedPlanIds, setExpandedPlanIds] = useState<string[]>([]);

	const toggleExpandPlan = (planId: number | string) => {
		const idStr = String(planId);
		setExpandedPlanIds((prev) =>
			prev.includes(idStr)
				? prev.filter((id) => id !== idStr)
				: [...prev, idStr],
		);
	};

	// Modals
	const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
	const [editingPlan, setEditingPlan] = useState<PlanDetail | null>(null);

	const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
	const [editingPrice, setEditingPrice] = useState<PlanPriceDetail | null>(
		null,
	);
	const [presetPlanIdForPrice, setPresetPlanIdForPrice] = useState<
		number | string | null
	>(null);

	// Plan Form State
	const [planForm, setPlanForm] = useState<PlanRequest>({
		code: "",
		name: "",
		displayName: "",
		description: "",
		maxUsers: 10,
		trial: false,
		publiclyVisible: true,
		tier: "STARTER",
		featureIds: [],
		sortOrder: 0,
	});

	// Price Form State
	const [priceForm, setPriceForm] = useState<PlanPriceRequest>({
		planId: 1,
		billingCycle: "MONTHLY",
		amount: 29,
		currency: "USD",
		intervalCount: 1,
		intervalUnit: "MONTH",
		durationDays: 30,
	});

	// Queries
	const { data: plansData = [], isLoading: isLoadingPlans } = useQuery({
		queryKey: ["subscription-plans"],
		queryFn: () => plansApi.search({}),
		select: (res) => res.items,
	});

	const { data: groupedPricesData = [], isLoading: isLoadingPrices } = useQuery(
		{
			queryKey: ["subscription-plan-prices-grouped"],
			queryFn: () => planPricesApi.getGrouped(),
		},
	);

	const { data: allFeatures = [] } = useQuery({
		queryKey: ["subscription-features"],
		queryFn: () => featuresApi.list(),
	});

	// Mutations
	const createPlanMutation = useMutation({
		mutationFn: (data: PlanRequest) => plansApi.create(data),
		onSuccess: () => {
			toast.success("Subscription plan created successfully");
			setIsPlanModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
			queryClient.invalidateQueries({ queryKey: ["public-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to create plan");
		},
	});

	const updatePlanMutation = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number | string;
			data: Partial<PlanRequest>;
		}) => plansApi.update(id, data),
		onSuccess: () => {
			toast.success("Plan details updated successfully");
			setEditingPlan(null);
			setIsPlanModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
			queryClient.invalidateQueries({ queryKey: ["public-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to update plan");
		},
	});

	const togglePlanActiveMutation = useMutation({
		mutationFn: ({ id, active }: { id: number | string; active: boolean }) =>
			plansApi.toggleActive(id, active),
		onSuccess: (_, variables) => {
			toast.success(
				`Plan ${variables.active ? "enabled" : "disabled"} successfully`,
			);
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
		},
		onError: (err) => {
			toast.error(
				getErrorMessage(err) || "Failed to toggle plan active status",
			);
		},
	});

	const createPriceMutation = useMutation({
		mutationFn: (data: PlanPriceRequest) => planPricesApi.create(data),
		onSuccess: () => {
			toast.success("Pricing option created successfully");
			setIsPriceModalOpen(false);
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to create price");
		},
	});

	const updatePriceMutation = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number | string;
			data: Partial<PlanPriceRequest>;
		}) => planPricesApi.update(id, data),
		onSuccess: () => {
			toast.success("Price updated successfully");
			setEditingPrice(null);
			setIsPriceModalOpen(false);
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to update price");
		},
	});

	const togglePriceActiveMutation = useMutation({
		mutationFn: ({ id, active }: { id: number | string; active: boolean }) =>
			planPricesApi.toggleActive(id, active),
		onSuccess: () => {
			toast.success("Pricing option status updated");
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to toggle price status");
		},
	});

	const deletePriceMutation = useMutation({
		mutationFn: (id: number | string) => planPricesApi.remove(id),
		onSuccess: () => {
			toast.success("Price removed successfully");
			queryClient.invalidateQueries({
				queryKey: ["subscription-plan-prices-grouped"],
			});
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to delete price");
		},
	});

	// Handlers
	const handleOpenCreatePlan = () => {
		setEditingPlan(null);
		setPlanForm({
			code: "",
			name: "",
			displayName: "",
			description: "",
			maxUsers: 10,
			trial: false,
			publiclyVisible: true,
			tier: "STARTER",
			featureIds: allFeatures.slice(0, 3).map((f) => f.id),
			sortOrder: plansData.length,
		});
		setIsPlanModalOpen(true);
	};

	const handleOpenEditPlan = (plan: PlanDetail) => {
		setEditingPlan(plan);
		setPlanForm({
			code: plan.code,
			name: plan.name,
			displayName: plan.displayName || plan.name,
			description: plan.description || "",
			maxUsers: plan.maxUsers,
			trial: plan.trial,
			publiclyVisible: plan.publiclyVisible,
			tier: plan.tier,
			featureIds: (plan.features || []).map((f) => f.id),
			sortOrder: plan.sortOrder ?? 0,
		});
		setIsPlanModalOpen(true);
	};

	const handleSavePlan = (e: React.FormEvent) => {
		e.preventDefault();
		if (!planForm.code.trim() || !planForm.name.trim()) {
			toast.error("Plan code and name are required");
			return;
		}

		if (editingPlan) {
			updatePlanMutation.mutate({
				id: editingPlan.id,
				data: planForm,
			});
		} else {
			createPlanMutation.mutate(planForm);
		}
	};

	const handleOpenCreatePrice = (planId?: number | string) => {
		setEditingPrice(null);
		const targetPlanId = planId || plansData[0]?.id || 1;
		setPresetPlanIdForPrice(targetPlanId);
		setPriceForm({
			planId: targetPlanId,
			billingCycle: "MONTHLY",
			amount: 49,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "MONTH",
			durationDays: 30,
		});
		setIsPriceModalOpen(true);
	};

	const handleOpenEditPrice = (price: PlanPriceDetail) => {
		setEditingPrice(price);
		setPresetPlanIdForPrice(price.planId);
		setPriceForm({
			planId: price.planId,
			billingCycle: price.billingCycle,
			amount: price.amount,
			currency: price.currency,
			intervalCount: price.intervalCount,
			intervalUnit: price.intervalUnit,
			durationDays: price.durationDays,
		});
		setIsPriceModalOpen(true);
	};

	const handleSavePrice = (e: React.FormEvent) => {
		e.preventDefault();
		if (priceForm.amount === undefined || isNaN(Number(priceForm.amount))) {
			toast.error("Valid amount is required");
			return;
		}

		if (editingPrice) {
			updatePriceMutation.mutate({
				id: editingPrice.id,
				data: priceForm,
			});
		} else {
			createPriceMutation.mutate(priceForm);
		}
	};

	// Filtered Plans
	const filteredPlans = useMemo(() => {
		return plansData.filter((p) => {
			const q = search.toLowerCase().trim();
			return (
				!q ||
				p.code.toLowerCase().includes(q) ||
				p.name.toLowerCase().includes(q) ||
				(p.displayName && p.displayName.toLowerCase().includes(q)) ||
				p.tier.toLowerCase().includes(q)
			);
		});
	}, [plansData, search]);

	// Flat price list
	const flatPrices = useMemo(() => {
		const list: { price: PlanPriceDetail; plan: PlanDetail }[] = [];
		for (const g of groupedPricesData) {
			const plan = g.plan || (g as any);
			const prices = Array.isArray(g.prices)
				? g.prices
				: Array.isArray((g as any).planPrice)
					? (g as any).planPrice
					: [];
			for (const p of prices) {
				list.push({ price: p, plan });
			}
		}
		return list.filter((item) => {
			const q = search.toLowerCase().trim();
			return (
				!q ||
				(item.plan.name || "").toLowerCase().includes(q) ||
				(item.price.billingCycle || "").toLowerCase().includes(q) ||
				(item.price.currency || "").toLowerCase().includes(q)
			);
		});
	}, [groupedPricesData, search]);

	// Render Plan Prices Tree View inside expanded plan row
	const renderPlanPricesTree = (plan: PlanDetail) => {
		const planGroup = groupedPricesData.find(
			(g) => String((g.plan || (g as any)).id) === String(plan.id),
		);
		const groupPrices = planGroup
			? Array.isArray(planGroup.prices)
				? planGroup.prices
				: Array.isArray((planGroup as any).planPrice)
					? (planGroup as any).planPrice
					: []
			: [];
		const prices = groupPrices.length > 0 ? groupPrices : plan.prices || [];

		return (
			<div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-slate-500/5 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-slate-900/30 border border-purple-200/80 dark:border-purple-900/50 space-y-4 my-1">
				{/* Tree Header */}
				<div className="flex items-center justify-between gap-3 border-b border-purple-100 dark:border-purple-900/40 pb-3">
					<div className="flex items-center gap-2.5">
						<div className="flex size-8 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 ring-1 ring-purple-500/20">
							<DollarSign className="size-4" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
									{plan.displayName || plan.name} —{" "}
									{t(
										"subscriptions.plansTab.pricingTreeTitle",
										"Pricing Tree & Rate Cards",
									)}
								</h4>
								<Badge
									variant="outline"
									className="text-[10px] font-mono font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
								>
									{prices.length}{" "}
									{prices.length === 1
										? t("subscriptions.plansTab.optionSingular", "Option")
										: t("subscriptions.plansTab.optionPlural", "Options")}
								</Badge>
							</div>
							<p className="text-[11px] text-muted-foreground">
								{t(
									"subscriptions.plansTab.pricingTreeDesc",
									"Configured billing cycles and rate cards for this subscription plan. Click edit on any pricing option to modify.",
								)}
							</p>
						</div>
					</div>

					<Button
						size="sm"
						onClick={() => handleOpenCreatePrice(plan.id)}
						className="h-8 gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
					>
						<Plus className="size-3.5" />
						<span>
							{t("subscriptions.plansTab.addPriceOption", "Add Price Option")}
						</span>
					</Button>
				</div>

				{/* Tree Nodes List */}
				{prices.length > 0 ? (
					<div className="relative pl-3 space-y-3 before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-purple-200 dark:before:bg-purple-900/60">
						{prices.map((price: any, idx: number) => (
							<div
								key={price.id || idx}
								className="relative flex items-center justify-between gap-4 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-purple-300 transition-all group"
							>
								{/* Tree Branch Connector & Info */}
								<div className="flex items-center gap-3 min-w-0">
									<div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-purple-100 group-hover:text-purple-700 transition-colors">
										<Tag className="size-3.5" />
									</div>
									<div>
										<div className="flex items-center gap-2 flex-wrap">
											<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-purple-200 dark:border-purple-900">
												{price.billingCycle}
											</Badge>
											<span className="text-sm font-extrabold text-slate-900 dark:text-white">
												${Number(price.amount).toFixed(2)}
											</span>
											<span className="text-[10px] font-bold text-slate-400 font-mono">
												{price.currency}
											</span>
										</div>
										<div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
											<Clock className="size-3 text-slate-400" />
											<span>
												{t(
													"subscriptions.plansTab.everyInterval",
													"Every {{count}} {{unit}}(s)",
													{
														count: price.intervalCount,
														unit: price.intervalUnit?.toLowerCase() || "month",
													},
												)}
											</span>
											<span>•</span>
											<span>
												{t(
													"subscriptions.plansTab.durationDays",
													"{{count}} billing days",
													{ count: price.durationDays },
												)}
											</span>
										</div>
									</div>
								</div>

								{/* Node Actions */}
								<div className="flex items-center gap-2.5 shrink-0">
									<div className="flex items-center gap-2 border-r pr-3 border-slate-200 dark:border-slate-800">
										<Switch
											checked={price.active !== false}
											disabled={togglePriceActiveMutation.isPending}
											onCheckedChange={(checked) =>
												togglePriceActiveMutation.mutate({
													id: price.id,
													active: checked,
												})
											}
										/>
										<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
											{price.active !== false
												? t("subscriptions.featuresTab.statusActive", "Active")
												: t(
														"subscriptions.featuresTab.statusInactive",
														"Disabled",
													)}
										</span>
									</div>

									<Button
										size="sm"
										variant="outline"
										onClick={() => handleOpenEditPrice(price)}
										className="h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg border-purple-200 bg-purple-50/60 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300 cursor-pointer"
									>
										<Edit className="size-3" />
										<span>
											{t("subscriptions.plansTab.editPrice", "Edit Price")}
										</span>
									</Button>

									<Button
										size="sm"
										variant="ghost"
										onClick={() => deletePriceMutation.mutate(price.id)}
										className="h-7 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
										title="Remove this price option"
									>
										<Trash2 className="size-3" />
									</Button>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-6 text-center bg-white/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-purple-200 dark:border-purple-900/40">
						<DollarSign className="size-6 text-purple-400 mb-1 opacity-60" />
						<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
							{t(
								"subscriptions.plansTab.noPricingAttached",
								"No Pricing Options Attached",
							)}
						</p>
						<p className="text-[11px] text-muted-foreground mt-0.5 mb-3">
							{t(
								"subscriptions.plansTab.addPriceOptionDesc",
								"Add monthly, annual, or custom pricing tiers for this plan.",
							)}
						</p>
						<Button
							size="sm"
							onClick={() => handleOpenCreatePrice(plan.id)}
							className="h-7 gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 cursor-pointer"
						>
							<Plus className="size-3" />
							<span>
								{t(
									"subscriptions.plansTab.createFirstPriceTag",
									"Create First Price Tag",
								)}
							</span>
						</Button>
					</div>
				)}
			</div>
		);
	};

	// Plan Columns
	const planColumns: ColumnDef<PlanDetail>[] = [
		{
			id: "plan",
			header: t("subscriptions.plansTab.columns.planDetails", "Plan Details"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => {
				const tierCfg =
					TIER_OPTIONS.find((t) => t.value === row.tier) || TIER_OPTIONS[1];
				const isExpanded = expandedPlanIds.includes(String(row.id));
				const planGroup = groupedPricesData.find(
					(g) => String((g.plan || (g as any)).id) === String(row.id),
				);
				const groupPrices = planGroup
					? Array.isArray(planGroup.prices)
						? planGroup.prices
						: Array.isArray((planGroup as any).planPrice)
							? (planGroup as any).planPrice
							: []
					: [];
				const priceCount = groupPrices.length || row.prices?.length || 0;

				return (
					<div className="flex items-start gap-2.5">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								toggleExpandPlan(row.id);
							}}
							className={cn(
								"mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer",
								isExpanded
									? "bg-purple-600 text-white border-purple-600 shadow-2xs rotate-180"
									: "bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
							)}
							title={
								isExpanded
									? "Collapse pricing tree"
									: "Expand pricing tree view"
							}
						>
							<ChevronDown className="size-4 transition-transform duration-200" />
						</button>

						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 ring-1 ring-purple-500/20">
							<Crown className="size-4.5" />
						</div>

						<div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="font-bold text-xs text-slate-900 dark:text-white">
									{row.displayName || row.name}
								</span>
								<Badge
									variant="outline"
									className={`text-[10px] px-2 py-0.5 font-semibold rounded-md border ${tierCfg.color}`}
								>
									{row.tier}
								</Badge>
								{row.trial && (
									<Badge
										variant="secondary"
										className="text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
									>
										{t("subscriptions.status.trial", "14-Day Free Trial")}
									</Badge>
								)}
								<Badge
									variant="outline"
									onClick={(e) => {
										e.stopPropagation();
										toggleExpandPlan(row.id);
									}}
									className={cn(
										"text-[10px] font-mono font-bold cursor-pointer transition-all flex items-center gap-1",
										priceCount > 0
											? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 hover:bg-purple-100"
											: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400",
									)}
								>
									<DollarSign className="size-2.5 text-purple-600" />
									<span>
										{t(
											"subscriptions.plansTab.pricesCount",
											"{{count}} Price(s)",
											{ count: priceCount },
										)}
									</span>
									<ChevronDown
										className={cn(
											"size-2.5 transition-transform",
											isExpanded && "rotate-180",
										)}
									/>
								</Badge>
							</div>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="font-mono text-[11px] text-slate-400">
									Code: {row.code}
								</span>
								<span className="text-slate-300 dark:text-slate-700">•</span>
								<span className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
									{row.description}
								</span>
							</div>
						</div>
					</div>
				);
			},
		},
		{
			id: "maxUsers",
			header: t("subscriptions.plansTab.columns.userLimit", "User Limit"),
			accessorKey: "maxUsers",
			sortable: true,
			cell: ({ value }) => (
				<div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-200">
					<Users className="size-3.5 text-slate-400" />
					<span>
						{t("subscriptions.plansTab.usersMax", "{{count}} max users", {
							count: value,
						})}
					</span>
				</div>
			),
		},
		{
			id: "features",
			header: t(
				"subscriptions.plansTab.columns.includedFeatures",
				"Included Features",
			),
			cell: ({ row }) => {
				const count = row.features?.length || 0;
				return (
					<div className="flex flex-wrap gap-1 max-w-xs">
						<Badge
							variant="outline"
							className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
						>
							<Sparkles className="size-2.5 mr-1" />
							{t(
								"subscriptions.plansTab.entitlementsCount",
								"{{count}} Entitlements",
								{ count },
							)}
						</Badge>
					</div>
				);
			},
		},
		{
			id: "visibility",
			header: t(
				"subscriptions.plansTab.columns.publicDisplay",
				"Public Display",
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5">
					{row.publiclyVisible ? (
						<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
							<Eye className="size-3" />{" "}
							{t("subscriptions.plansTab.visible", "Visible")}
						</span>
					) : (
						<span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
							<EyeOff className="size-3" />{" "}
							{t("subscriptions.plansTab.hidden", "Hidden")}
						</span>
					)}
				</div>
			),
		},
		{
			id: "active",
			header: t("subscriptions.featuresTab.columns.status", "Status"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Switch
						checked={row.active}
						disabled={!isSystemAdmin || togglePlanActiveMutation.isPending}
						onCheckedChange={(checked) =>
							togglePlanActiveMutation.mutate({ id: row.id, active: checked })
						}
					/>
					<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
						{row.active
							? t("subscriptions.featuresTab.statusActive", "Active")
							: t("subscriptions.featuresTab.statusInactive", "Disabled")}
					</span>
				</div>
			),
		},
		{
			id: "actions",
			header: t("subscriptions.featuresTab.columns.actions", "Actions"),
			cell: ({ row }) => {
				const isExpanded = expandedPlanIds.includes(String(row.id));

				return (
					<div className="flex items-center gap-1.5 justify-end">
						<Button
							size="sm"
							variant="outline"
							onClick={() => toggleExpandPlan(row.id)}
							className={cn(
								"h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg transition-all cursor-pointer",
								isExpanded
									? "bg-purple-600 text-white border-purple-600"
									: "border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300",
							)}
						>
							<ChevronDown
								className={cn(
									"size-3 transition-transform",
									isExpanded && "rotate-180",
								)}
							/>
							<span>
								{t("subscriptions.plansTab.pricesTree", "Prices Tree")}
							</span>
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleOpenEditPlan(row)}
							className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
						>
							<Edit className="size-3" />
							<span>{t("subscriptions.featuresTab.actions.edit", "Edit")}</span>
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleOpenCreatePrice(row.id)}
							className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer"
						>
							<Plus className="size-3" />
							<span>+ {t("subscriptions.plansTab.priceTag", "Price")}</span>
						</Button>
					</div>
				);
			},
		},
	];

	const planRowActions: RowAction<PlanDetail>[] = [
		{
			label: t("subscriptions.plansTab.editPlan", "Edit Plan"),
			icon: <Edit className="size-3.5" />,
			onClick: (row) => handleOpenEditPlan(row),
		},
		{
			label: t(
				"subscriptions.plansTab.addPriceTagButton",
				"Add Pricing Option",
			),
			icon: <Plus className="size-3.5 text-blue-600" />,
			onClick: (row) => handleOpenCreatePrice(row.id),
		},
	];

	// Price Columns
	const priceColumns: ColumnDef<{
		price: PlanPriceDetail;
		plan: PlanDetail;
	}>[] = [
		{
			id: "planName",
			header: t("subscriptions.plansTab.columns.planTarget", "Plan Target"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Crown className="size-3.5 text-purple-600" />
					<span className="font-semibold text-xs text-slate-900 dark:text-white">
						{row.plan.displayName || row.plan.name}
					</span>
					<Badge variant="outline" className="text-[10px] px-1.5 py-0">
						{row.plan.tier}
					</Badge>
				</div>
			),
		},
		{
			id: "cycle",
			header: t("subscriptions.plansTab.columns.billingCycle", "Billing Cycle"),
			cell: ({ row }) => (
				<Badge
					variant="secondary"
					className="text-xs font-mono font-bold uppercase tracking-wider"
				>
					{row.price.billingCycle}
				</Badge>
			),
		},
		{
			id: "amount",
			header: t("subscriptions.plansTab.columns.priceAmount", "Price Amount"),
			cell: ({ row }) => (
				<div className="flex items-baseline gap-1">
					<span className="text-sm font-extrabold text-slate-900 dark:text-white">
						${Number(row.price.amount).toFixed(2)}
					</span>
					<span className="text-[10px] font-bold text-slate-400">
						{row.price.currency}
					</span>
				</div>
			),
		},
		{
			id: "interval",
			header: t(
				"subscriptions.plansTab.columns.durationInterval",
				"Duration / Interval",
			),
			cell: ({ row }) => (
				<span className="text-xs text-slate-600 dark:text-slate-300">
					{t(
						"subscriptions.plansTab.intervalSummary",
						"Every {{count}} {{unit}}(s) • ({{days}} days)",
						{
							count: row.price.intervalCount,
							unit: row.price.intervalUnit.toLowerCase(),
							days: row.price.durationDays,
						},
					)}
				</span>
			),
		},
		{
			id: "status",
			header: t("subscriptions.plansTab.columns.priceStatus", "Price Status"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Switch
						checked={row.price.active !== false}
						disabled={togglePriceActiveMutation.isPending}
						onCheckedChange={(checked) =>
							togglePriceActiveMutation.mutate({
								id: row.price.id,
								active: checked,
							})
						}
					/>
					<span className="text-xs font-medium text-slate-600 dark:text-slate-300">
						{row.price.active !== false
							? t("subscriptions.featuresTab.statusActive", "Active")
							: t("subscriptions.featuresTab.statusInactive", "Disabled")}
					</span>
				</div>
			),
		},
		{
			id: "actions",
			header: t("subscriptions.featuresTab.columns.actions", "Actions"),
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 justify-end">
					<Button
						size="sm"
						variant="outline"
						onClick={() => handleOpenEditPrice(row.price)}
						className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
					>
						<Edit className="size-3" />
						<span>{t("subscriptions.featuresTab.actions.edit", "Edit")}</span>
					</Button>
					<Button
						size="sm"
						variant="ghost"
						onClick={() => deletePriceMutation.mutate(row.price.id)}
						className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
					>
						<Trash2 className="size-3" />
						<span>
							{t("subscriptions.featuresTab.actions.archive", "Delete")}
						</span>
					</Button>
				</div>
			),
		},
	];

	const priceRowActions: RowAction<{
		price: PlanPriceDetail;
		plan: PlanDetail;
	}>[] = [
		{
			label: t("subscriptions.plansTab.editPrice", "Edit Price"),
			icon: <Edit className="size-3.5" />,
			onClick: (row) => handleOpenEditPrice(row.price),
		},
		{
			label: t("subscriptions.plansTab.removePrice", "Remove Price"),
			icon: <Trash2 className="size-3.5 text-rose-500" />,
			variant: "destructive",
			onClick: (row) => deletePriceMutation.mutate(row.price.id),
		},
	];

	return (
		<div className="space-y-6">
			{/* Control Bar & Search */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 flex-wrap items-center gap-3">
					{/* Subview Selector */}
					<div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
						<button
							type="button"
							onClick={() => setSubView("PLANS")}
							className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
								subView === "PLANS"
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<Layers className="size-3.5" />
							<span>
								{t(
									"subscriptions.plansTab.subscriptionPlansCount",
									"Subscription Plans ({{count}})",
									{ count: plansData.length },
								)}
							</span>
						</button>
						<button
							type="button"
							onClick={() => setSubView("PRICES")}
							className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
								subView === "PRICES"
									? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-bold"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<DollarSign className="size-3.5" />
							<span>
								{t(
									"subscriptions.plansTab.pricingIntervalsCount",
									"Pricing Intervals ({{count}})",
									{ count: flatPrices.length },
								)}
							</span>
						</button>
					</div>

					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t(
								"subscriptions.plansTab.searchPlaceholder",
								"Search...",
							)}
							className="h-9 rounded-xl pl-8.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						onClick={handleOpenCreatePlan}
						className="h-9 gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 text-xs font-semibold px-3.5 cursor-pointer"
					>
						<Plus className="size-4" />
						<span>{t("subscriptions.plansTab.newPlanButton", "New Plan")}</span>
					</Button>
					<Button
						onClick={() => handleOpenCreatePrice()}
						variant="outline"
						className="h-9 gap-1.5 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold px-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
					>
						<Plus className="size-4" />
						<span>
							{t("subscriptions.plansTab.addPriceTagButton", "Add Price Tag")}
						</span>
					</Button>
				</div>
			</div>

			{/* Main Content View */}
			{subView === "PLANS" ? (
				<DataTable
					columns={planColumns}
					data={filteredPlans}
					isLoading={isLoadingPlans}
					customRowActions={planRowActions}
					onEditRow={(row) => handleOpenEditPlan(row)}
					onCreateNew={handleOpenCreatePlan}
					createButtonLabel={t(
						"subscriptions.plansTab.newPlanButton",
						"New Plan",
					)}
					expandedRowIds={expandedPlanIds}
					onToggleExpandRow={(rowId) => toggleExpandPlan(rowId)}
					renderSubComponent={renderPlanPricesTree}
					emptyState={
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<Crown className="size-8 text-slate-400 mb-2 opacity-50" />
							<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
								{t(
									"subscriptions.plansTab.emptyPlansTitle",
									"No plans defined",
								)}
							</p>
							<p className="text-xs text-slate-400 mt-1 max-w-xs">
								{t(
									"subscriptions.plansTab.emptyPlansDesc",
									"Create subscription plans to package features and user seat capacities.",
								)}
							</p>
						</div>
					}
				/>
			) : (
				<DataTable
					columns={priceColumns}
					data={flatPrices}
					isLoading={isLoadingPrices}
					customRowActions={priceRowActions}
					onEditRow={(row) => handleOpenEditPrice(row.price)}
					onDeleteRow={(row) => deletePriceMutation.mutate(row.price.id)}
					onCreateNew={() => handleOpenCreatePrice()}
					createButtonLabel={t(
						"subscriptions.plansTab.addPriceTagButton",
						"Add Price Tag",
					)}
					emptyState={
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<DollarSign className="size-8 text-slate-400 mb-2 opacity-50" />
							<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
								{t(
									"subscriptions.plansTab.emptyPricesTitle",
									"No pricing intervals found",
								)}
							</p>
							<p className="text-xs text-slate-400 mt-1 max-w-xs">
								{t(
									"subscriptions.plansTab.emptyPricesDesc",
									"Attach billing cycles and recurring prices to plans.",
								)}
							</p>
						</div>
					}
				/>
			)}

			{/* Create / Edit Plan Modal */}
			<ModernModal
				open={isPlanModalOpen}
				onOpenChange={setIsPlanModalOpen}
				title={
					editingPlan
						? t(
								"subscriptions.plansTab.planModal.editTitle",
								"Edit Subscription Plan",
							)
						: t(
								"subscriptions.plansTab.planModal.createTitle",
								"Create Subscription Plan",
							)
				}
				description={t(
					"subscriptions.plansTab.planModal.desc",
					"Define tier level, maximum user capacity, and assign feature entitlements.",
				)}
				icon={<Crown className="size-5 text-purple-600" />}
			>
				<form onSubmit={handleSavePlan} className="space-y-4 py-2">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<ModernInput
							label={t(
								"subscriptions.plansTab.planModal.codeLabel",
								"Plan Code",
							)}
							placeholder={t(
								"subscriptions.plansTab.planModal.codePlaceholder",
								"e.g. CRM_PRO",
							)}
							value={planForm.code}
							onChange={(e) =>
								setPlanForm((prev) => ({
									...prev,
									code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
								}))
							}
							required
							helperText={t(
								"subscriptions.plansTab.planModal.codeHelper",
								"Unique uppercase identifier (e.g. CRM_STARTER)",
							)}
						/>

						<ModernInput
							label={t(
								"subscriptions.plansTab.planModal.internalNameLabel",
								"Internal Name",
							)}
							placeholder={t(
								"subscriptions.plansTab.planModal.internalNamePlaceholder",
								"e.g. CRM Professional",
							)}
							value={planForm.name}
							onChange={(e) =>
								setPlanForm((prev) => ({ ...prev, name: e.target.value }))
							}
							required
						/>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<ModernInput
							label={t(
								"subscriptions.plansTab.planModal.displayNameLabel",
								"Display Name (For Customers)",
							)}
							placeholder={t(
								"subscriptions.plansTab.planModal.displayNamePlaceholder",
								"e.g. Professional CRM Plan",
							)}
							value={planForm.displayName}
							onChange={(e) =>
								setPlanForm((prev) => ({
									...prev,
									displayName: e.target.value,
								}))
							}
						/>

						<ModernSelect
							label={t(
								"subscriptions.plansTab.planModal.tierLabel",
								"Tier Level",
							)}
							value={planForm.tier}
							onChange={(val) =>
								setPlanForm((prev) => ({ ...prev, tier: val as PlanTier }))
							}
							options={TIER_OPTIONS.map((tItem) => ({
								label: t(tItem.labelKey, tItem.defaultLabel),
								value: tItem.value,
							}))}
						/>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<ModernInput
							label={t(
								"subscriptions.plansTab.planModal.maxUsersLabel",
								"Max User Seats",
							)}
							type="number"
							min={1}
							value={String(planForm.maxUsers)}
							onChange={(e) =>
								setPlanForm((prev) => ({
									...prev,
									maxUsers: parseInt(e.target.value, 10) || 1,
								}))
							}
							required
							helperText={t(
								"subscriptions.plansTab.planModal.maxUsersHelper",
								"Maximum allowed team members on this plan",
							)}
						/>

						<div className="flex flex-col gap-2 pt-2">
							<label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
								{t("subscriptions.plansTab.planModal.flagsLabel", "Plan Flags")}
							</label>
							<div className="flex items-center gap-4">
								<label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
									<input
										type="checkbox"
										checked={planForm.publiclyVisible}
										onChange={(e) =>
											setPlanForm((prev) => ({
												...prev,
												publiclyVisible: e.target.checked,
											}))
										}
										className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
									/>
									<span>
										{t(
											"subscriptions.plansTab.planModal.publicPricing",
											"Public Pricing Page",
										)}
									</span>
								</label>
								<label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
									<input
										type="checkbox"
										checked={planForm.trial}
										onChange={(e) =>
											setPlanForm((prev) => ({
												...prev,
												trial: e.target.checked,
											}))
										}
										className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
									/>
									<span>
										{t(
											"subscriptions.plansTab.planModal.freeTrialTier",
											"Free Trial Tier",
										)}
									</span>
								</label>
							</div>
						</div>
					</div>

					<ModernTextarea
						label={t(
							"subscriptions.featuresTab.modal.descLabel",
							"Plan Description",
						)}
						placeholder={t(
							"subscriptions.plansTab.planModal.descPlaceholder",
							"Outline who this plan is for and key value propositions...",
						)}
						value={planForm.description}
						onChange={(e) =>
							setPlanForm((prev) => ({ ...prev, description: e.target.value }))
						}
						rows={2}
					/>

					{/* Feature Checklist */}
					<div className="space-y-2 pt-1">
						<div className="flex items-center justify-between">
							<label className="text-xs font-bold uppercase tracking-wider text-slate-500">
								{t(
									"subscriptions.plansTab.planModal.includedFeaturesChecklist",
									"Included Features Checklist ({{count}} selected)",
									{ count: planForm.featureIds.length },
								)}
							</label>
							<button
								type="button"
								onClick={() =>
									setPlanForm((prev) => ({
										...prev,
										featureIds:
											prev.featureIds.length === allFeatures.length
												? []
												: allFeatures.map((f) => f.id),
									}))
								}
								className="text-xs text-primary font-semibold hover:underline"
							>
								{planForm.featureIds.length === allFeatures.length
									? t(
											"subscriptions.plansTab.planModal.deselectAll",
											"Deselect All",
										)
									: t(
											"subscriptions.plansTab.planModal.selectAll",
											"Select All",
										)}
							</button>
						</div>

						<div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
							{allFeatures.map((feat) => {
								const isSelected = planForm.featureIds.some(
									(id) => String(id) === String(feat.id),
								);
								return (
									<div
										key={feat.id}
										onClick={() => {
											setPlanForm((prev) => {
												const exists = prev.featureIds.some(
													(id) => String(id) === String(feat.id),
												);
												return {
													...prev,
													featureIds: exists
														? prev.featureIds.filter(
																(id) => String(id) !== String(feat.id),
															)
														: [...prev.featureIds, feat.id],
												};
											});
										}}
										className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
											isSelected
												? "bg-primary/10 border border-primary/30 text-primary font-medium dark:bg-primary/20"
												: "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
										}`}
									>
										<div className="flex items-center gap-2">
											<div
												className={`size-4 rounded flex items-center justify-center border ${isSelected ? "bg-primary border-primary text-white" : "border-slate-400"}`}
											>
												{isSelected && <Check className="size-3 stroke-[3]" />}
											</div>
											<span className="font-mono text-xs font-semibold">
												{feat.code}
											</span>
											<span className="text-xs text-slate-500 font-normal">
												— {feat.name}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsPlanModalOpen(false)}
						/>
						<ModernModalSubmitButton
							loading={
								createPlanMutation.isPending || updatePlanMutation.isPending
							}
						>
							{editingPlan
								? t(
										"subscriptions.plansTab.planModal.saveChanges",
										"Save Plan Changes",
									)
								: t(
										"subscriptions.plansTab.planModal.createPlan",
										"Create Plan",
									)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* Create / Edit Price Modal */}
			<ModernModal
				open={isPriceModalOpen}
				onOpenChange={setIsPriceModalOpen}
				title={
					editingPrice
						? t(
								"subscriptions.plansTab.priceModal.editTitle",
								"Edit Pricing Option",
							)
						: t(
								"subscriptions.plansTab.priceModal.createTitle",
								"Add Plan Pricing Option",
							)
				}
				description={t(
					"subscriptions.plansTab.priceModal.desc",
					"Set billing cycle frequency, recurring amounts, interval count, and duration.",
				)}
				icon={<DollarSign className="size-5 text-emerald-600" />}
			>
				<form onSubmit={handleSavePrice} className="space-y-4 py-2">
					<ModernSelect
						label={t(
							"subscriptions.plansTab.priceModal.targetPlan",
							"Target Plan",
						)}
						value={String(priceForm.planId)}
						onChange={(val) =>
							setPriceForm((prev) => ({ ...prev, planId: val }))
						}
						options={plansData.map((p) => ({
							label: `${p.displayName || p.name} (${p.tier})`,
							value: String(p.id),
						}))}
					/>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<ModernSelect
							label={t(
								"subscriptions.plansTab.columns.billingCycle",
								"Billing Cycle",
							)}
							value={priceForm.billingCycle}
							onChange={(val) => {
								const cycle = val as BillingCycle;
								setPriceForm((prev) => ({
									...prev,
									billingCycle: cycle,
									durationDays:
										cycle === "YEARLY" ? 365 : cycle === "QUARTERLY" ? 90 : 30,
									intervalUnit: cycle === "YEARLY" ? "YEAR" : "MONTH",
								}));
							}}
							options={BILLING_CYCLES.map((c) => ({
								label: t(c.labelKey, c.defaultLabel),
								value: c.value,
							}))}
						/>

						<div className="grid grid-cols-2 gap-2">
							<ModernInput
								label={t("subscriptions.plansTab.priceModal.amount", "Amount")}
								type="number"
								step="0.01"
								min="0"
								value={String(priceForm.amount)}
								onChange={(e) =>
									setPriceForm((prev) => ({
										...prev,
										amount: parseFloat(e.target.value) || 0,
									}))
								}
								required
							/>

							<ModernInput
								label={t(
									"subscriptions.plansTab.priceModal.currency",
									"Currency",
								)}
								value={priceForm.currency}
								onChange={(e) =>
									setPriceForm((prev) => ({
										...prev,
										currency: e.target.value.toUpperCase(),
									}))
								}
								required
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<ModernInput
							label={t(
								"subscriptions.plansTab.priceModal.intervalCount",
								"Interval Count",
							)}
							type="number"
							min={1}
							value={String(priceForm.intervalCount)}
							onChange={(e) =>
								setPriceForm((prev) => ({
									...prev,
									intervalCount: parseInt(e.target.value, 10) || 1,
								}))
							}
							required
							helperText={t(
								"subscriptions.plansTab.priceModal.intervalCountHelper",
								"e.g. 1 (per month)",
							)}
						/>

						<ModernSelect
							label={t(
								"subscriptions.plansTab.priceModal.intervalUnit",
								"Interval Unit",
							)}
							value={priceForm.intervalUnit}
							onChange={(val) =>
								setPriceForm((prev) => ({
									...prev,
									intervalUnit: val as IntervalUnit,
								}))
							}
							options={INTERVAL_UNITS.map((u) => ({
								label: t(u.labelKey, u.defaultLabel),
								value: u.value,
							}))}
						/>

						<ModernInput
							label={t(
								"subscriptions.plansTab.priceModal.durationDays",
								"Duration Days",
							)}
							type="number"
							min={1}
							value={String(priceForm.durationDays)}
							onChange={(e) =>
								setPriceForm((prev) => ({
									...prev,
									durationDays: parseInt(e.target.value, 10) || 30,
								}))
							}
							required
							helperText={t(
								"subscriptions.plansTab.priceModal.durationDaysHelper",
								"Active period (e.g. 30, 365)",
							)}
						/>
					</div>

					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsPriceModalOpen(false)}
						/>
						<ModernModalSubmitButton
							loading={
								createPriceMutation.isPending || updatePriceMutation.isPending
							}
						>
							{editingPrice
								? t(
										"subscriptions.plansTab.priceModal.updatePrice",
										"Update Price",
									)
								: t(
										"subscriptions.plansTab.priceModal.savePrice",
										"Save Pricing Option",
									)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>
		</div>
	);
}

"use client";

import React from "react";
import { SubscriptionAuditLog, FeatureItem } from "@/types/subscription";
import { useTranslation } from "@/lib/i18n/context";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Crown,
	Sparkles,
	TrendingUp,
	TrendingDown,
	RefreshCw,
	XCircle,
	Zap,
	ArrowRight,
	CheckCircle2,
	AlertCircle,
	Users,
	ShieldCheck,
	Calendar,
	UserCheck,
	Check,
	Minus,
	Plus,
	Info,
	Layers,
	CreditCard,
	Clock,
} from "lucide-react";

interface SubscriptionAuditDetailModalProps {
	log: SubscriptionAuditLog | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const ACTION_CONFIG: Record<
	string,
	{
		labelKey: string;
		defaultLabel: string;
		className: string;
		icon: React.ReactNode;
		border: string;
		bg: string;
	}
> = {
	UPGRADE: {
		labelKey: "subscriptions.auditHistory.actionUpgrade",
		defaultLabel: "Tier Upgrade",
		className:
			"border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
		border: "border-emerald-200 dark:border-emerald-900",
		bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
		icon: (
			<TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />
		),
	},
	TRIAL_START: {
		labelKey: "subscriptions.auditHistory.actionTrialStart",
		defaultLabel: "Trial Activated",
		className:
			"border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
		border: "border-sky-200 dark:border-sky-900",
		bg: "bg-sky-50/60 dark:bg-sky-950/30",
		icon: <Sparkles className="size-4 text-sky-600 dark:text-sky-400" />,
	},
	SUBSCRIBE: {
		labelKey: "subscriptions.auditHistory.actionSubscribe",
		defaultLabel: "Plan Subscribed",
		className:
			"border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
		border: "border-purple-200 dark:border-purple-900",
		bg: "bg-purple-50/60 dark:bg-purple-950/30",
		icon: <Crown className="size-4 text-purple-600 dark:text-purple-400" />,
	},
	DOWNGRADE: {
		labelKey: "subscriptions.auditHistory.actionDowngrade",
		defaultLabel: "Tier Downgrade",
		className:
			"border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
		border: "border-amber-200 dark:border-amber-900",
		bg: "bg-amber-50/60 dark:bg-amber-950/30",
		icon: (
			<TrendingDown className="size-4 text-amber-600 dark:text-amber-400" />
		),
	},
	RENEW: {
		labelKey: "subscriptions.auditHistory.actionRenew",
		defaultLabel: "Subscription Renewed",
		className:
			"border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
		border: "border-indigo-200 dark:border-indigo-900",
		bg: "bg-indigo-50/60 dark:bg-indigo-950/30",
		icon: <RefreshCw className="size-4 text-indigo-600 dark:text-indigo-400" />,
	},
	CANCEL: {
		labelKey: "subscriptions.auditHistory.actionCancel",
		defaultLabel: "Plan Cancelled",
		className:
			"border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
		border: "border-rose-200 dark:border-rose-900",
		bg: "bg-rose-50/60 dark:bg-rose-950/30",
		icon: <XCircle className="size-4 text-rose-600 dark:text-rose-400" />,
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

export function SubscriptionAuditDetailModal({
	log,
	open,
	onOpenChange,
}: SubscriptionAuditDetailModalProps) {
	const { t } = useTranslation();
	if (!log) return null;

	const actionCfg = ACTION_CONFIG[log.action] || {
		label: log.action || "Subscription Change",
		className:
			"border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
		border: "border-slate-200 dark:border-slate-800",
		bg: "bg-slate-50 dark:bg-slate-900/40",
		icon: <Zap className="size-4 text-primary" />,
	};

	const oldPlan = log.oldPlan;
	const newPlan = log.newPlan;
	const planPrice = log.newPlanPrice;

	const subscribeDate = log.subscribeDate || log.startDate;
	const expireDate = log.expireDate || log.endDate;

	// Map features comparison
	const oldFeaturesMap = new Map<string | number, FeatureItem>();
	const newFeaturesMap = new Map<string | number, FeatureItem>();

	if (oldPlan?.features) {
		oldPlan.features.forEach((f) => oldFeaturesMap.set(f.code || f.id, f));
	}
	if (newPlan?.features) {
		newPlan.features.forEach((f) => newFeaturesMap.set(f.code || f.id, f));
	}

	// Combined feature list
	const featureComparisonList: {
		feature: FeatureItem;
		inOld: boolean;
		inNew: boolean;
		changeType: "ADDED" | "RETAINED" | "REMOVED";
	}[] = [];

	const processedCodes = new Set<string | number>();

	if (newPlan?.features) {
		newPlan.features.forEach((f) => {
			const key = f.code || f.id;
			processedCodes.add(key);
			const inOld = oldFeaturesMap.has(key);
			featureComparisonList.push({
				feature: f,
				inOld,
				inNew: true,
				changeType: inOld ? "RETAINED" : "ADDED",
			});
		});
	}

	if (oldPlan?.features) {
		oldPlan.features.forEach((f) => {
			const key = f.code || f.id;
			if (!processedCodes.has(key)) {
				processedCodes.add(key);
				featureComparisonList.push({
					feature: f,
					inOld: true,
					inNew: false,
					changeType: "REMOVED",
				});
			}
		});
	}

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			title={t(
				"subscriptions.auditDetailModal.title",
				"Subscription Plan Details — Log #{{id}}",
				{ id: log.id },
			)}
			description={t(
				"subscriptions.auditDetailModal.desc",
				"Comprehensive audit inspection of plan transition, pricing model, validity dates, and feature entitlement differences.",
			)}
			icon={actionCfg.icon}
			maxWidth="3xl"
		>
			<div className="space-y-6 py-2 max-h-[75vh] overflow-y-auto pr-1">
				{/* 1. Header Overview Banner */}
				<div
					className={`rounded-2xl border ${actionCfg.border} ${actionCfg.bg} p-4 space-y-3`}
				>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<Badge
								variant="outline"
								className={`text-xs px-2.5 py-1 font-bold rounded-xl ${actionCfg.className}`}
							>
								<span className="mr-1.5">{actionCfg.icon}</span>
								{t(actionCfg.labelKey, actionCfg.defaultLabel)}
							</Badge>
							<Badge
								variant="outline"
								className="font-mono text-xs px-2.5 py-1 rounded-xl border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300"
							>
								Log Entry #{log.id}
							</Badge>
						</div>

						<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
							<Calendar className="size-3.5 text-slate-400" />
							<span>
								{new Date(log.createdAt).toLocaleString("en-US", {
									dateStyle: "medium",
									timeStyle: "medium",
								})}
							</span>
						</div>
					</div>

					<div>
						<h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
							<Info className="size-4 text-primary shrink-0" />
							<span>
								{log.remark || "Subscription audit log event recorded."}
							</span>
						</h4>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-300">
						<div className="flex items-center gap-1.5 font-medium">
							<UserCheck className="size-3.5 text-slate-400" />
							<span>
								{t(
									"subscriptions.auditHistory.createdBy",
									"Created by ID: #{{id}}",
									{ id: log.createdBy || 1 },
								)}
							</span>
						</div>

						{log.oldStatus || log.newStatus ? (
							<div className="flex items-center gap-1.5">
								<span className="text-slate-400 text-[11px]">
									{t(
										"subscriptions.auditHistory.columns.statusShift",
										"Status Shift",
									)}
									:
								</span>
								{log.oldStatus && (
									<Badge
										variant="outline"
										className={`text-[10px] px-2 py-0.5 font-semibold ${STATUS_BADGE_STYLE[log.oldStatus] || "border-slate-200 text-slate-600"}`}
									>
										{log.oldStatus}
									</Badge>
								)}
								<ArrowRight className="size-3 text-slate-400" />
								{log.newStatus && (
									<Badge
										variant="outline"
										className={`text-[10px] px-2 py-0.5 font-bold ${STATUS_BADGE_STYLE[log.newStatus] || "border-emerald-200 text-emerald-700"}`}
									>
										{log.newStatus}
									</Badge>
								)}
							</div>
						) : null}
					</div>
				</div>

				{/* 2. Pricing & Validity Dates Banner */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{/* Price & Billing Cycle Box */}
					<div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 space-y-1.5">
						<div className="flex items-center justify-between text-xs text-slate-500">
							<span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400">
								{t(
									"subscriptions.auditDetailModal.planRateModel",
									"Plan Rate & Billing Model",
								)}
							</span>
							<CreditCard className="size-4 text-emerald-600" />
						</div>
						<div className="flex items-baseline gap-2">
							<span className="text-2xl font-black text-slate-950 dark:text-white font-mono">
								{planPrice?.amount !== undefined
									? `$${Number(planPrice.amount).toFixed(2)}`
									: log.subscribedAmount !== undefined
										? `$${Number(log.subscribedAmount).toFixed(2)}`
										: newPlan?.tier === "FREE_TRIAL"
											? "Free"
											: "$0.00"}
							</span>
							<span className="text-xs font-semibold text-slate-500 uppercase font-mono">
								{planPrice?.currency || log.subscribedCurrency || "USD"}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs pt-0.5">
							<Badge
								variant="secondary"
								className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
							>
								{planPrice?.billingCycle || "Standard Billing"}
							</Badge>
							{planPrice?.durationDays && (
								<span className="text-[11px] text-slate-400 font-medium">
									{t(
										"subscriptions.plansTab.durationDays",
										"{{count}} billing days",
										{ count: planPrice.durationDays },
									)}
								</span>
							)}
						</div>
					</div>

					{/* Subscribe & Expire Dates Box */}
					<div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 space-y-1.5">
						<div className="flex items-center justify-between text-xs text-slate-500">
							<span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400">
								{t(
									"subscriptions.auditDetailModal.validityPeriod",
									"Subscription Validity Period",
								)}
							</span>
							<Clock className="size-4 text-primary" />
						</div>

						{subscribeDate || expireDate ? (
							<div className="space-y-1 text-xs">
								<div className="flex justify-between items-center">
									<span className="text-slate-500">
										{t(
											"subscriptions.auditDetailModal.startDate",
											"Start / Subscribe Date",
										)}
										:
									</span>
									<strong className="text-slate-900 dark:text-white font-mono">
										{subscribeDate
											? new Date(subscribeDate).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})
											: "Instant"}
									</strong>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-slate-500">
										{t(
											"subscriptions.auditDetailModal.endDate",
											"End / Expire Date",
										)}
										:
									</span>
									<strong className="text-primary font-mono font-bold">
										{expireDate
											? new Date(expireDate).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
													year: "numeric",
												})
											: "Ongoing"}
									</strong>
								</div>
							</div>
						) : (
							<div className="text-xs text-slate-400 py-1">
								No explicit validity dates attached.
							</div>
						)}
					</div>
				</div>

				{/* 3. Side-by-Side Plan Comparison (Old Plan vs New Plan) */}
				<div className="space-y-3">
					<h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Layers className="size-4 text-primary" />
						{t(
							"subscriptions.auditDetailModal.transitionTitle",
							"Plan Tier & Capability Transition",
						)}
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative">
						{/* Old Plan Card */}
						<div
							className={`rounded-2xl border p-4 flex flex-col justify-between ${oldPlan ? "border-slate-200/90 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90" : "border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30"}`}
						>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
										{t(
											"subscriptions.auditDetailModal.previousPlan",
											"Previous Plan",
										)}
									</span>
									{oldPlan?.tier && (
										<Badge variant="outline" className="text-[10px] font-bold">
											{oldPlan.tier}
										</Badge>
									)}
								</div>

								{oldPlan ? (
									<>
										<div>
											<h4 className="text-base font-black text-slate-900 dark:text-white">
												{oldPlan.displayName || oldPlan.name}
											</h4>
											<span className="font-mono text-[10px] text-slate-400">
												Code: {oldPlan.code} • ID: {oldPlan.id}
											</span>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
												{oldPlan.description ||
													"Previous CRM subscription plan."}
											</p>
										</div>

										<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
											<div className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
												<Users className="size-3.5 text-slate-500" />
												<span>
													{t(
														"subscriptions.plansTab.usersMax",
														"{{count}} max users",
														{ count: oldPlan.maxUsers },
													)}
												</span>
											</div>
											<div className="flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 font-semibold">
												<Crown className="size-3.5" />
												<span>
													{t(
														"subscriptions.auditDetailModal.featuresCount",
														"{{count}} Features",
														{ count: oldPlan.features?.length || 0 },
													)}
												</span>
											</div>
										</div>
									</>
								) : (
									<div className="py-6 text-center space-y-1">
										<AlertCircle className="size-6 text-slate-400 mx-auto opacity-60" />
										<p className="text-xs font-bold text-slate-600 dark:text-slate-300">
											{t(
												"subscriptions.auditDetailModal.noPriorPlan",
												"No Prior Plan",
											)}
										</p>
										<p className="text-[11px] text-slate-400">
											Initial registration or trial initiation event.
										</p>
									</div>
								)}
							</div>
						</div>

						{/* New Plan Card */}
						<div
							className={`rounded-2xl border-2 p-4 flex flex-col justify-between ${newPlan ? "border-primary/50 bg-gradient-to-br from-white via-slate-50/50 to-primary/5 shadow-sm dark:border-primary/40 dark:from-slate-900 dark:to-primary/10" : "border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30"}`}
						>
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
										{t(
											"subscriptions.auditDetailModal.newActivePlan",
											"New Active Plan",
										)}
									</span>
									{newPlan?.tier && (
										<Badge
											variant="secondary"
											className="text-[10px] font-bold bg-primary text-primary-foreground"
										>
											{newPlan.tier}
										</Badge>
									)}
								</div>

								{newPlan ? (
									<>
										<div>
											<h4 className="text-base font-black text-slate-900 dark:text-white">
												{newPlan.displayName || newPlan.name}
											</h4>
											<span className="font-mono text-[10px] text-slate-400">
												Code: {newPlan.code} • ID: {newPlan.id}
											</span>
											<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
												{newPlan.description || "Active CRM subscription plan."}
											</p>
										</div>

										<div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
											<div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-primary font-bold">
												<Users className="size-3.5 text-primary" />
												<span>
													{t(
														"subscriptions.plansTab.usersMax",
														"{{count}} max users",
														{ count: newPlan.maxUsers },
													)}
												</span>
											</div>
											<div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold">
												<ShieldCheck className="size-3.5" />
												<span>
													{t(
														"subscriptions.auditDetailModal.featuresCount",
														"{{count}} Features",
														{ count: newPlan.features?.length || 0 },
													)}
												</span>
											</div>
										</div>
									</>
								) : (
									<div className="py-6 text-center space-y-1">
										<XCircle className="size-6 text-rose-400 mx-auto opacity-60" />
										<p className="text-xs font-bold text-slate-600 dark:text-slate-300">
											{t(
												"subscriptions.auditDetailModal.planCancelledSuspended",
												"Plan Cancelled / Suspended",
											)}
										</p>
										<p className="text-[11px] text-slate-400">
											Subscription termination event.
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* 4. Detailed Feature Comparison Matrix */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<Sparkles className="size-4 text-emerald-600" />
							{t(
								"subscriptions.auditDetailModal.featureComparisonEvaluated",
								"Feature Entitlements Comparison ({{count}} items evaluated)",
								{ count: featureComparisonList.length },
							)}
						</h3>
					</div>

					{featureComparisonList.length > 0 ? (
						<div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
							<div className="divide-y divide-slate-100 dark:divide-slate-800">
								{featureComparisonList.map(
									({ feature, changeType, inOld, inNew }) => {
										return (
											<div
												key={feature.id || feature.code}
												className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
											>
												<div className="space-y-0.5 max-w-lg">
													<div className="flex items-center gap-2">
														<span className="font-extrabold text-xs text-slate-900 dark:text-white">
															{feature.name}
														</span>
														<Badge
															variant="outline"
															className="font-mono text-[9px] px-1.5 py-0 rounded border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
														>
															{feature.code}
														</Badge>
													</div>
													{feature.description && (
														<p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
															{feature.description}
														</p>
													)}
												</div>

												<div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
													{changeType === "ADDED" && (
														<Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 border-emerald-300">
															<Plus className="size-3 text-emerald-600" />{" "}
															{t(
																"subscriptions.auditDetailModal.newlyAdded",
																"Newly Added",
															)}
														</Badge>
													)}

													{changeType === "RETAINED" && (
														<Badge
															variant="outline"
															className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5"
														>
															<Check className="size-3 text-blue-600" />{" "}
															{t(
																"subscriptions.auditDetailModal.included",
																"Included",
															)}
														</Badge>
													)}

													{changeType === "REMOVED" && (
														<Badge className="gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 border-rose-300">
															<Minus className="size-3 text-rose-600" />{" "}
															{t(
																"subscriptions.auditDetailModal.removed",
																"Removed",
															)}
														</Badge>
													)}
												</div>
											</div>
										);
									},
								)}
							</div>
						</div>
					) : (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400">
							No specific feature comparison list attached to this audit record.
						</div>
					)}
				</div>
			</div>

			<ModernModalFooter>
				<ModernModalCancelButton onClick={() => onOpenChange(false)}>
					{t("common.close", "Close")}
				</ModernModalCancelButton>
			</ModernModalFooter>
		</ModernModal>
	);
}

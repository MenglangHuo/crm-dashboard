"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { profileApi, featuresApi } from "@/lib/api/endpoints";
import { useCompanyContext } from "@/components/providers/company-context";
import {
	CreditCard,
	Sparkles,
	Crown,
	RefreshCw,
	Building2,
	ShieldAlert,
	Lock,
	ChevronDown,
	Search,
	Check,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SubscribeTab } from "@/components/subscriptions/subscribe-tab";
import { CompanyMonitorTab } from "@/components/subscriptions/company-monitor-tab";
import { FeaturesTab } from "@/components/subscriptions/features-tab";
import { PlansTab } from "@/components/subscriptions/plans-tab";
import { useTranslation } from "@/lib/i18n/context";

function SubscriptionsContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const {
		selectedCompanyId,
		setSelectedCompanyId,
		companies,
		isLoadingCompanies,
		isSystemAdmin,
	} = useCompanyContext();

	const [activeTab, setActiveTab] = useState<string>("subscribe");
	const [companySearch, setCompanySearch] = useState("");

	const queryClient = useQueryClient();

	// Read companyId from searchParams on load/change
	const urlCompanyId = searchParams.get("companyId");

	useEffect(() => {
		if (isSystemAdmin && urlCompanyId && urlCompanyId !== selectedCompanyId) {
			setSelectedCompanyId(urlCompanyId);
		}
	}, [urlCompanyId, isSystemAdmin]);

	// Refetch all queries whenever selectedCompanyId changes
	useEffect(() => {
		queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
		queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
		queryClient.invalidateQueries({ queryKey: ["subscription-history-audit"] });
		queryClient.invalidateQueries({ queryKey: ["company-subscriptions"] });
		queryClient.invalidateQueries({ queryKey: ["company-monitor-stats"] });
	}, [selectedCompanyId, queryClient]);

	// Handle changing company from system admin filter
	const handleSelectCompany = (id: string | null) => {
		if (id === selectedCompanyId) return;
		setSelectedCompanyId(id);

		// Immediately trigger query refetching for the current page
		queryClient.invalidateQueries({ queryKey: ["company-entitlements"] });
		queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
		queryClient.invalidateQueries({ queryKey: ["subscription-history-audit"] });
		queryClient.invalidateQueries({ queryKey: ["company-subscriptions"] });
		queryClient.invalidateQueries({ queryKey: ["company-monitor-stats"] });
		queryClient.refetchQueries({ queryKey: ["company-entitlements", id] });
		queryClient.refetchQueries({ queryKey: ["active-subscription", id] });
		queryClient.refetchQueries({
			queryKey: ["subscription-history-audit", id],
		});

		const targetComp = companies.find((c) => String(c.id) === String(id));
		const compLabel =
			targetComp?.name || (id ? `Company #${id}` : "All Companies");

		toast.success(`Switched view to ${compLabel}`, {
			description:
				"Refetched active subscriptions, entitlements, and audit history.",
		});

		const params = new URLSearchParams(searchParams.toString());
		if (id) {
			params.set("companyId", id);
		} else {
			params.delete("companyId");
		}
		router.replace(`${pathname}?${params.toString()}`, { scroll: false });
	};

	// Handle inspecting a company from the Company Monitor tab
	const handleSelectCompanyAndInspect = (companyId: string) => {
		handleSelectCompany(companyId);
		setActiveTab("subscribe");
	};

	// Effective companyId for entitlement lookup
	const effectiveCompanyId = isSystemAdmin ? selectedCompanyId : undefined;

	const { data: entitlement, refetch: refetchEntitlement } = useQuery({
		queryKey: ["company-entitlements", effectiveCompanyId],
		queryFn: () => featuresApi.getEntitlement(effectiveCompanyId),
		staleTime: 0,
	});

	// Selected company object for display
	const currentCompany = companies.find(
		(c) => String(c.id) === String(selectedCompanyId),
	);

	const filteredCompanies = companies.filter((c) => {
		if (!companySearch.trim()) return true;
		const term = companySearch.toLowerCase();
		return (
			c.name?.toLowerCase().includes(term) ||
			(c as any).code?.toLowerCase().includes(term) ||
			String(c.id).includes(term)
		);
	});

	return (
		<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
			{/* Top Header & Breadcrumbs */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1.5">
					<Breadcrumb>
						<BreadcrumbList className="text-xs">
							<BreadcrumbItem>
								<BreadcrumbLink
									href="/"
									className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
								>
									{t("subscriptions.dashboard", "Dashboard")}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<span className="text-slate-400">
									{t("subscriptions.systemSettings", "System Settings")}
								</span>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="font-semibold text-slate-900 dark:text-white">
									{t("subscriptions.subscription", "Subscription")}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex flex-wrap items-center gap-3">
						<h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
							{t("subscriptions.title", "Subscription & Plans")}
						</h1>
						{entitlement && entitlement.active && (entitlement.planDisplayName || entitlement.planName) && (
							<Badge
								variant="outline"
								className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:border-purple-900 dark:bg-purple-950/50 dark:text-purple-300"
							>
								<Crown className="size-3 text-purple-600 dark:text-purple-400" />
								<span>
									{entitlement.planDisplayName ||
										entitlement.planName}
								</span>
							</Badge>
						)}
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400">
						{t(
							"subscriptions.subtitle",
							"Unified subscription lifecycle, feature gating catalog, pricing matrix, and enterprise entitlements.",
						)}
					</p>
				</div>

				{/* Header Badges & Actions */}
				<div className="flex flex-wrap items-center gap-2.5">
					{/* System Admin Company Selector Filter */}
					{isSystemAdmin && (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										className="flex h-9 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
									/>
								}
							>
								<Building2 className="size-3.5 text-primary shrink-0" />
								<span className="max-w-[140px] truncate">
									{currentCompany?.name ||
										(selectedCompanyId
											? `Company #${selectedCompanyId}`
											: t("subscriptions.selectCompany", "Select Company"))}
								</span>
								<ChevronDown className="size-3 text-slate-400 shrink-0" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-64 p-1.5">
								<div className="p-1.5 pb-2">
									<div className="relative">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
										<input
											type="text"
											placeholder={t(
												"subscriptions.filterCompanies",
												"Filter companies...",
											)}
											value={companySearch}
											onChange={(e) => setCompanySearch(e.target.value)}
											className="w-full h-8 pl-7.5 pr-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border-none outline-none focus:ring-1 focus:ring-primary"
										/>
									</div>
								</div>
								<div className="max-h-56 overflow-y-auto space-y-0.5">
									<DropdownMenuItem
										onClick={() => handleSelectCompany(null)}
										className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer border-b border-slate-100 dark:border-slate-800 mb-1"
									>
										<div className="flex items-center gap-2 truncate">
											<Building2 className="size-3 text-primary shrink-0" />
											<span
												className={
													!selectedCompanyId
														? "font-bold text-primary"
														: "text-slate-600 dark:text-slate-300"
												}
											>
												{t(
													"subscriptions.allCompaniesGlobal",
													"All Companies (Global)",
												)}
											</span>
										</div>
										{!selectedCompanyId && (
											<Check className="size-3.5 text-primary shrink-0" />
										)}
									</DropdownMenuItem>
									{filteredCompanies.map((comp) => {
										const isSelected =
											String(comp.id) === String(selectedCompanyId);
										return (
											<DropdownMenuItem
												key={comp.id}
												onClick={() => handleSelectCompany(String(comp.id))}
												className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg cursor-pointer"
											>
												<div className="flex items-center gap-2 truncate">
													<Building2 className="size-3 text-slate-400 shrink-0" />
													<span
														className={
															isSelected
																? "font-bold text-primary truncate"
																: "truncate"
														}
													>
														{comp.name}
													</span>
												</div>
												{isSelected && (
													<Check className="size-3.5 text-primary shrink-0" />
												)}
											</DropdownMenuItem>
										);
									})}
									{filteredCompanies.length === 0 && (
										<div className="py-3 text-center text-xs text-slate-400">
											{t(
												"subscriptions.noCompaniesFound",
												"No companies found",
											)}
										</div>
									)}
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{isSystemAdmin && (
						<Badge
							variant="outline"
							className="gap-1.5 rounded-xl border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
						>
							<ShieldAlert className="size-3.5 text-amber-600" />
							<span>{t("subscriptions.adminMode", "Admin Mode")}</span>
						</Badge>
					)}

					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchEntitlement();
							queryClient.invalidateQueries({
								queryKey: ["company-entitlements"],
							});
							queryClient.invalidateQueries({
								queryKey: ["active-subscription"],
							});
							queryClient.invalidateQueries({
								queryKey: ["subscription-history-audit"],
							});
							queryClient.refetchQueries({
								queryKey: ["company-entitlements"],
							});
							queryClient.refetchQueries({
								queryKey: ["active-subscription"],
							});
							queryClient.refetchQueries({
								queryKey: ["subscription-history-audit"],
							});
							toast.info("Subscriptions & entitlements refreshed");
						}}
						className="h-9 gap-1.5 rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-xs font-semibold px-3 hover:bg-slate-50 cursor-pointer shadow-2xs"
					>
						<RefreshCw className="size-3.5" />
						<span>{t("subscriptions.sync", "Sync")}</span>
					</Button>
				</div>
			</div>

			{/* Main Tabs Navigation */}
			<ModernTabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-6"
			>
				<ModernTabsList
					variant="glass"
					size="lg"
					className="flex flex-wrap gap-1"
				>
					<ModernTabsTrigger
						value="subscribe"
						variant="glass"
						icon={<CreditCard className="size-4" />}
					>
						{t("subscriptions.tabs.subscribe", "Subscribe & Billing")}
					</ModernTabsTrigger>

					{isSystemAdmin && (
						<ModernTabsTrigger
							value="monitor"
							variant="glass"
							icon={<Building2 className="size-4" />}
							badge={companies.length || undefined}
							badgeColor="purple"
						>
							{t("subscriptions.tabs.monitor", "Company Subscriptions Monitor")}
						</ModernTabsTrigger>
					)}

					<ModernTabsTrigger
						value="features"
						variant="glass"
						disabled={!isSystemAdmin}
						icon={
							!isSystemAdmin ? (
								<Lock className="size-3.5 text-slate-400" />
							) : (
								<Sparkles className="size-4" />
							)
						}
						badge={
							!isSystemAdmin
								? t("subscriptions.adminOnly", "Admin Only")
								: undefined
						}
						badgeColor="slate"
					>
						{t("subscriptions.tabs.features", "Features")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="plans"
						variant="glass"
						disabled={!isSystemAdmin}
						icon={
							!isSystemAdmin ? (
								<Lock className="size-3.5 text-slate-400" />
							) : (
								<Crown className="size-4" />
							)
						}
						badge={
							!isSystemAdmin
								? t("subscriptions.adminOnly", "Admin Only")
								: undefined
						}
						badgeColor="slate"
					>
						{t("subscriptions.tabs.plans", "Plan & PlanPrice")}
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* Tab 1: Subscribe & Billing */}
				<ModernTabsContent value="subscribe">
					<SubscribeTab
						isSystemAdmin={isSystemAdmin}
						selectedCompanyId={selectedCompanyId}
						onSelectCompany={handleSelectCompany}
					/>
				</ModernTabsContent>

				{/* Tab 2: System Admin Company Subscriptions Monitor (Admin Only) */}
				{isSystemAdmin && (
					<ModernTabsContent value="monitor">
						<CompanyMonitorTab
							onSelectCompanyAndInspect={handleSelectCompanyAndInspect}
						/>
					</ModernTabsContent>
				)}

				{/* Tab 3: Features Catalog (Admin Only) */}
				{isSystemAdmin && (
					<ModernTabsContent value="features">
						<FeaturesTab isSystemAdmin={isSystemAdmin} />
					</ModernTabsContent>
				)}

				{/* Tab 4: Plan & PlanPrice (Admin Only) */}
				{isSystemAdmin && (
					<ModernTabsContent value="plans">
						<PlansTab isSystemAdmin={isSystemAdmin} />
					</ModernTabsContent>
				)}
			</ModernTabs>
		</div>
	);
}

export default function SubscriptionsPage() {
	return (
		<Suspense
			fallback={
				<div className="p-8 text-xs text-slate-400">
					Loading subscription workspace...
				</div>
			}
		>
			<SubscriptionsContent />
		</Suspense>
	);
}

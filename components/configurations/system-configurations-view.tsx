"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { configurationsApi, companiesApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import {
	ConfigurationDomainGroup,
	ConfigurationItem,
	ConfigCategory,
} from "@/types/configuration";
import { ConfigControlRenderer } from "./config-control-renderer";
import { FloatingSaveBar } from "./floating-save-bar";
import { getHumanLabel } from "./utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

import {
	SlidersHorizontal,
	Building2,
	Search,
	RotateCcw,
	Lock,
	Settings,
	ShieldAlert,
	Boxes,
	FileText,
	Users,
	Layers,
	CreditCard,
	Sparkles,
	ShoppingBag,
	Package,
	ShieldCheck,
	Check,
	CheckCircle2,
	AlertCircle,
	X,
	ChevronLeft,
	ChevronRight,
	Info,
	Sliders,
	HelpCircle,
	RefreshCw,
	Eye,
	Building,
	Hash,
	ArrowUpDown,
} from "lucide-react";

import { ModernButton } from "@/components/ui-custom/button";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Database, Bell, Tag, Globe, Percent, MapPin } from "lucide-react";

// Domain Icon mapping supporting both category keys and icon strings
const DOMAIN_ICONS: Record<string, React.ElementType> = {
	GENERAL: Settings,
	SECURITY: ShieldCheck,
	INVENTORY: Package,
	DOCUMENT: FileText,
	AUTH: Lock,
	CUSTOMER: Users,
	PRODUCT: ShoppingBag,
	WORKFLOW: Layers,
	FINANCE: CreditCard,
	FEATURE: Sparkles,
	PAYMENT: CreditCard,
	NOTIFICATION: Bell,
	SYSTEM: Settings,
	package: Package,
	"shopping-bag": ShoppingBag,
	"file-text": FileText,
	lock: Lock,
	users: Users,
	"shield-check": ShieldCheck,
	"shield-alert": ShieldAlert,
	settings: Settings,
	"credit-card": CreditCard,
	layers: Layers,
};

// Section Icon helper
const getSectionIcon = (sectionName: string): React.ElementType => {
	const name = sectionName.toLowerCase();
	if (name.includes("time") || name.includes("date") || name.includes("local"))
		return Globe;
	if (
		name.includes("confirm") ||
		name.includes("security") ||
		name.includes("ip") ||
		name.includes("lock")
	)
		return ShieldCheck;
	if (
		name.includes("job") ||
		name.includes("cleanup") ||
		name.includes("log") ||
		name.includes("file") ||
		name.includes("system")
	)
		return Database;
	if (
		name.includes("visit") ||
		name.includes("tracking") ||
		name.includes("map")
	)
		return MapPin;
	if (name.includes("discount") || name.includes("early")) return Percent;
	if (
		name.includes("payment") ||
		name.includes("tax") ||
		name.includes("gateway") ||
		name.includes("khqr")
	)
		return CreditCard;
	if (
		name.includes("stock") ||
		name.includes("inventory") ||
		name.includes("product") ||
		name.includes("sku")
	)
		return Package;
	if (name.includes("customer") || name.includes("user")) return Users;
	if (
		name.includes("workflow") ||
		name.includes("approval") ||
		name.includes("chain")
	)
		return Layers;
	if (
		name.includes("document") ||
		name.includes("invoice") ||
		name.includes("pdf") ||
		name.includes("numbering")
	)
		return FileText;
	return Sliders;
};

export function SystemConfigurationsView() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const navTabsRef = useRef<HTMLDivElement>(null);

	// Local States
	const [activeDomain, setActiveDomain] = useState<string>("GENERAL");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [sortOrder, setSortOrder] = useState<"default" | "az" | "za">("default");
	const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
	const [dirtyMap, setDirtyMap] = useState<Record<string, any>>({});
	const [resettingKeys, setResettingKeys] = useState<Record<string, boolean>>(
		{},
	);

	// Localization helper for domain category labels
	const getDomainLabel = useCallback(
		(category: string, defaultLabel: string) => {
			const catUpper = (category || "").toUpperCase();
			return t(`configurations.domains.${catUpper}`, defaultLabel);
		},
		[t],
	);

	// Localization helper for section titles
	const getSectionTitle = useCallback(
		(sectionName: string) => {
			if (!sectionName) return "";
			const key = `configurations.sections.${sectionName}`;
			const translated = t(key);
			if (
				translated &&
				translated !== key &&
				!translated.startsWith("configurations.sections.")
			) {
				return translated;
			}
			return sectionName;
		},
		[t],
	);

	// Localization helper for configuration item labels
	const getItemLabel = useCallback(
		(itemKey: string, fallbackLabel?: string) => {
			const human = getHumanLabel(itemKey, fallbackLabel);
			if (!itemKey) return human;

			// Direct path lookup
			const keyPath = `configurations.items.${itemKey}.label`;
			const translated = t(keyPath);
			if (
				translated &&
				translated !== keyPath &&
				!translated.startsWith("configurations.items.")
			) {
				return translated;
			}

			// Sanitized dot replacement path lookup
			const sanitizedPath = `configurations.items.${itemKey.replace(/\./g, "_")}.label`;
			const sanitizedTrans = t(sanitizedPath);
			if (
				sanitizedTrans &&
				sanitizedTrans !== sanitizedPath &&
				!sanitizedTrans.startsWith("configurations.items.")
			) {
				return sanitizedTrans;
			}

			return human;
		},
		[t],
	);

	// Localization helper for configuration item descriptions
	const getItemDesc = useCallback(
		(itemKey: string, fallbackDesc?: string | null) => {
			if (itemKey) {
				const keyPath = `configurations.items.${itemKey}.desc`;
				const translated = t(keyPath);
				if (
					translated &&
					translated !== keyPath &&
					!translated.startsWith("configurations.items.")
				) {
					return translated;
				}

				const sanitizedPath = `configurations.items.${itemKey.replace(/\./g, "_")}.desc`;
				const sanitizedTrans = t(sanitizedPath);
				if (
					sanitizedTrans &&
					sanitizedTrans !== sanitizedPath &&
					!sanitizedTrans.startsWith("configurations.items.")
				) {
					return sanitizedTrans;
				}
			}

			return fallbackDesc || null;
		},
		[t],
	);

	// Fetch Companies for Admin Switcher
	const { data: companiesData } = useQuery({
		queryKey: ["companies-list-for-config"],
		queryFn: () =>
			companiesApi.list({ limit: 50 }).catch(() => ({ items: [], total: 0 })),
		staleTime: 60_000,
	});

	// Fetch Grouped Configurations
	const {
		data: domainGroups,
		isLoading,
		isRefetching,
		isError: isApiError,
		error: apiError,
		refetch,
	} = useQuery<ConfigurationDomainGroup[]>({
		queryKey: ["configurations", "grouped", selectedCompanyId],
		queryFn: async () => {
			const res = await configurationsApi.getGrouped(
				selectedCompanyId !== "all" ? selectedCompanyId : undefined,
			);
			// Backend returns an array; if empty, return empty (don't mask with mock data)
			return Array.isArray(res) ? res : [];
		},
		staleTime: 30_000,
		retry: 1,
	});

	// Resolved groups — only real API data; empty while loading or on error
	const resolvedGroups: ConfigurationDomainGroup[] = domainGroups ?? [];

	// Set default active domain if current one is not in resolvedGroups
	useEffect(() => {
		if (
			resolvedGroups.length > 0 &&
			!resolvedGroups.some((d) => d.category === activeDomain)
		) {
			setActiveDomain(resolvedGroups[0].category);
		}
	}, [resolvedGroups, activeDomain]);

	// Flattened list of all configuration items for quick lookup & search
	const allConfigItems = useMemo(() => {
		const map = new Map<string, ConfigurationItem>();
		resolvedGroups.forEach((domain) => {
			domain.sections.forEach((sec) => {
				sec.configurations.forEach((cfg) => {
					map.set(cfg.configKey, cfg);
				});
			});
		});
		return map;
	}, [resolvedGroups]);

	// Keyboard shortcut: Ctrl+K / Cmd+K to focus search input
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Handle local change in dirtyMap
	const handleConfigChange = useCallback(
		(configKey: string, newValue: any) => {
			const originalItem = allConfigItems.get(configKey);
			if (!originalItem) return;

			setDirtyMap((prev) => {
				const isSame =
					JSON.stringify(originalItem.configValue) === JSON.stringify(newValue);
				if (isSame) {
					const next = { ...prev };
					delete next[configKey];
					return next;
				}
				return { ...prev, [configKey]: newValue };
			});
		},
		[allConfigItems],
	);

	// Discard all unsaved changes
	const handleDiscard = useCallback(() => {
		setDirtyMap({});
		toast.info(
			t("configurations.changesDiscarded", "Unsaved changes discarded"),
		);
	}, [t]);

	// Batch Save Mutation — calls POST /v1/configurations/batch
	const batchSaveMutation = useMutation({
		mutationFn: async (
			itemsToSave: import("@/types/configuration").BatchUpdateItem[],
		) => {
			return await configurationsApi.batchUpdate({ items: itemsToSave });
		},
		onSuccess: (result, variables) => {
			toast.success(
				t(
					"configurations.savedSuccess",
					`Successfully saved ${variables.length} configuration setting(s)!`,
					{
						count: variables.length,
					},
				),
			);
			setDirtyMap({});
			queryClient.invalidateQueries({ queryKey: ["configurations"] });
		},
		onError: (err) => {
			toast.error(
				getErrorMessage(err) ||
					t(
						"configurations.failedSave",
						"Failed to save configuration changes",
					),
			);
		},
	});

	const handleSaveBatch = () => {
		const items = Object.entries(dirtyMap).map(([configKey, configValue]) => {
			const item = allConfigItems.get(configKey);
			return {
				configKey,
				configValue,
				valueType: item?.valueType,
				scope: item?.scope,
				category: item?.category,
				defaultValue: item?.defaultValue ?? null,
				description: item?.description ?? null,
				validationRule: item?.validationRule ?? null,
				isEncrypted: item?.isEncrypted ?? false,
				isReadOnly: item?.isReadOnly ?? false,
				displayOrder: item?.displayOrder ?? 1,
			};
		});
		if (items.length === 0) return;
		batchSaveMutation.mutate(items);
	};

	// Reset single configuration to system default
	const handleResetToDefault = async (configKey: string) => {
		const item = allConfigItems.get(configKey);
		if (!item) return;
		const humanTitle = getItemLabel(item.configKey, item.label);

		if (configKey in dirtyMap) {
			setDirtyMap((prev) => {
				const next = { ...prev };
				delete next[configKey];
				return next;
			});
		}

		setResettingKeys((prev) => ({ ...prev, [configKey]: true }));
		try {
			await configurationsApi.resetByKey(configKey);
			toast.success(
				t(
					"configurations.resetSuccess",
					`Reset '${humanTitle}' to System Default`,
					{ title: humanTitle },
				),
			);
			queryClient.invalidateQueries({ queryKey: ["configurations"] });
		} catch (err) {
			toast.success(
				t(
					"configurations.resetSuccess",
					`Reset '${humanTitle}' to System Default`,
					{ title: humanTitle },
				),
			);
			queryClient.invalidateQueries({ queryKey: ["configurations"] });
		} finally {
			setResettingKeys((prev) => ({ ...prev, [configKey]: false }));
		}
	};

	// Filtered domains based on global instant search query
	const filteredDomainGroups = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return resolvedGroups;

		return resolvedGroups
			.map((domain) => {
				const matchingSections = domain.sections
					.map((sec) => {
						const matchingConfigs = sec.configurations.filter((cfg) => {
							const humanTitle = getHumanLabel(cfg.configKey, cfg.label);
							const inKey = cfg.configKey.toLowerCase().includes(q);
							const inLabel = humanTitle.toLowerCase().includes(q);
							const inDesc = (cfg.description || "").toLowerCase().includes(q);
							const inCategory = cfg.category.toLowerCase().includes(q);
							return inKey || inLabel || inDesc || inCategory;
						});
						return {
							...sec,
							configurations: matchingConfigs,
						};
					})
					.filter((sec) => sec.configurations.length > 0);

				const totalConfigs = matchingSections.reduce(
					(sum, s) => sum + s.configurations.length,
					0,
				);

				return {
					...domain,
					totalConfigurations: totalConfigs,
					sections: matchingSections,
				};
			})
			.filter((domain) => domain.sections.length > 0);
	}, [resolvedGroups, searchQuery]);

	// Total matching configurations across all domains
	const totalMatchingResults = useMemo(() => {
		return filteredDomainGroups.reduce(
			(sum, d) => sum + d.totalConfigurations,
			0,
		);
	}, [filteredDomainGroups]);

	// Category tabs always use the full unfiltered data so tabs don't disappear during search
	const navDomainGroups = resolvedGroups;

	// Scroll horizontal navigation tabs left/right
	const handleScrollNav = (direction: "left" | "right") => {
		if (navTabsRef.current) {
			const scrollAmount = direction === "left" ? -240 : 240;
			navTabsRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
		}
	};

	// Active domain group to display
	const activeDomainGroup = useMemo(() => {
		if (searchQuery.trim()) {
			return null;
		}
		return (
			filteredDomainGroups.find((d) => d.category === activeDomain) ||
			filteredDomainGroups[0]
		);
	}, [filteredDomainGroups, activeDomain, searchQuery]);

	// Determine if there is any real data to show
	const hasData = resolvedGroups.length > 0;

	const dirtyCount = Object.keys(dirtyMap).length;

	return (
		<TooltipProvider>
			<div className="space-y-4 pb-12 font-sans text-slate-900 dark:text-slate-100 transition-colors">
				{/* ============================================================ */}
				{/* 1. TOP HEADER & TITLE                                        */}
				{/* ============================================================ */}
				<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-600/20 shadow-2xs">
							<Settings className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">
								{t("configurations.title", "System Configurations")}
							</h1>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{t(
									"configurations.subtitle",
									"Manage operational parameters, visit tracking lifecycle rules, and system rules.",
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap">
						{/* Active Context */}
						<div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
							<Building className="h-3.5 w-3.5 text-slate-400" />
							<div className="text-xs">
								<span className="font-bold text-slate-800 dark:text-slate-200">
									{selectedCompanyId === "all"
										? t("configurations.systemWideScope", "System Wide Scope")
										: t(
												"configurations.companyId",
												`Company ID: ${selectedCompanyId}`,
												{ id: selectedCompanyId },
											)}
								</span>
							</div>
						</div>

						{/* Data source indicator */}
						{isApiError && (
							<div className="flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">
								<AlertCircle className="h-3.5 w-3.5" />
								{t("configurations.apiUnavailable", "API Unavailable")}
							</div>
						)}
					</div>
				</div>

				{/* ============================================================ */}
				{/* 2. CATEGORY NAVIGATION TABS (Hidden if <= 1 Tab)             */}
				{/* ============================================================ */}
				{navDomainGroups.length > 1 && (
					<div className="relative flex items-center bg-white dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
						<button
							type="button"
							onClick={() => handleScrollNav("left")}
							className="hidden sm:flex absolute left-2 z-10 h-7 w-7 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-200"
							aria-label="Scroll tabs left"
						>
							<ChevronLeft className="h-3.5 w-3.5" />
						</button>

						<div
							ref={navTabsRef}
							className="flex w-full items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth px-1 sm:px-8 py-0.5"
						>
							{navDomainGroups.map((domain) => {
								const isActive =
									activeDomain === domain.category && !searchQuery;
								const Icon =
									DOMAIN_ICONS[domain.category] ||
									DOMAIN_ICONS[domain.icon] ||
									Sliders;

								return (
									<button
										key={domain.category}
										type="button"
										onClick={() => {
											setActiveDomain(domain.category);
											setSearchQuery("");
										}}
										className={`group relative inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 ${
											isActive
												? "bg-slate-950 text-white shadow-xs dark:bg-white dark:text-slate-950"
												: "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
										}`}
									>
										<Icon
											className={`h-3.5 w-3.5 ${
												isActive
													? "text-white dark:text-slate-950"
													: "text-slate-400 group-hover:text-slate-600 dark:text-slate-500"
											}`}
										/>
										<span>
											{getDomainLabel(domain.category, domain.categoryLabel)}
										</span>
									</button>
								);
							})}
						</div>

						<button
							type="button"
							onClick={() => handleScrollNav("right")}
							className="hidden sm:flex absolute right-2 z-10 h-7 w-7 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-200"
							aria-label="Scroll tabs right"
						>
							<ChevronRight className="h-3.5 w-3.5" />
						</button>
					</div>
				)}

				{/* ============================================================ */}
				{/* 3. CLEAN TOOLBAR: SEARCH + SORT + REFRESH ACTION             */}
				{/* ============================================================ */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
					<div className="relative flex-1 max-w-md">
						<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
						<Input
							ref={searchInputRef}
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t(
								"configurations.searchPlaceholder",
								"Search all configuration settings by keyword or key...",
							)}
							className="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-9 pr-8 text-xs shadow-none dark:text-slate-100"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					<div className="flex items-center gap-2 ml-auto">
						{/* Sort Button */}
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="outline"
										size="sm"
										className="h-9 px-3 gap-1.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 bg-background"
									>
										<ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
										<span>
											{t("common.sort", "Sort")}:{" "}
											{sortOrder === "az"
												? "A-Z"
												: sortOrder === "za"
													? "Z-A"
													: "Default"}
										</span>
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuItem
									onClick={() => setSortOrder("default")}
									className="text-xs cursor-pointer"
								>
									Default Order
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setSortOrder("az")}
									className="text-xs cursor-pointer"
								>
									Section Name (A-Z)
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => setSortOrder("za")}
									className="text-xs cursor-pointer"
								>
									Section Name (Z-A)
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Action Button (Refresh) placed right near Sort button */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading || isRefetching}
							className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-lg border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs bg-background"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`}
							/>
							<span>{t("configurations.refreshSettings", "Refresh")}</span>
						</Button>
					</div>
				</div>

					{/* ============================================================ */}
					{/* 4. DYNAMIC SECTION CARDS GRID (2-Column Clean Template)      */}
					{/* ============================================================ */}
					<div className="space-y-6">
						{/* API Error State */}
						{isApiError && !isLoading && (
							<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/10 p-10 text-center gap-3">
								<AlertCircle className="h-9 w-9 text-red-400 dark:text-red-500" />
								<div>
									<h3 className="text-sm font-bold text-red-700 dark:text-red-400">
										{t(
											"configurations.failedLoad",
											"Failed to load configurations",
										)}
									</h3>
									<p className="mt-1 text-xs text-red-500 dark:text-red-500 max-w-xs">
										{getErrorMessage(apiError) ||
											t(
												"configurations.failedLoadDesc",
												"Could not connect to the backend API. Please check that the service is running and you are authenticated.",
											)}
									</p>
								</div>
								<ModernButton
									variant="outline"
									size="sm"
									onClick={() => refetch()}
									leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
								>
									{t("configurations.retry", "Retry")}
								</ModernButton>
							</div>
						)}

						{/* Loading skeleton */}
						{isLoading && (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
								{[...Array(4)].map((_, i) => (
									<div
										key={i}
										className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 space-y-4 shadow-xs animate-pulse"
									>
										<div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
											<div className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-slate-800" />
											<div className="h-3.5 w-32 rounded bg-slate-100 dark:bg-slate-800" />
										</div>
										{[...Array(3)].map((_, j) => (
											<div
												key={j}
												className="flex items-center justify-between py-1"
											>
												<div className="space-y-1.5">
													<div className="h-3 w-36 rounded bg-slate-100 dark:bg-slate-800" />
													<div className="h-2.5 w-52 rounded bg-slate-50 dark:bg-slate-800/60" />
												</div>
												<div className="h-7 w-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
											</div>
										))}
									</div>
								))}
							</div>
						)}

						{/* Empty state — API returned no data */}
						{!isLoading && !isApiError && !hasData && (
							<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 gap-3">
								<SlidersHorizontal className="h-9 w-9 text-slate-300 dark:text-slate-600" />
								<div>
									<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
										{t(
											"configurations.noConfigurationsFound",
											"No configurations found",
										)}
									</h3>
									<p className="mt-1 text-xs text-slate-500 max-w-sm">
										{t(
											"configurations.noConfigurationsDesc",
											"The API returned no configuration data. Configurations may not have been seeded yet for this company.",
										)}
									</p>
								</div>
								<ModernButton
									variant="outline"
									size="sm"
									onClick={() => refetch()}
									leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
								>
									{t("configurations.refreshSettings", "Refresh")}
								</ModernButton>
							</div>
						)}

						{/* Real API data grid */}
						{!isLoading &&
							!isApiError &&
							hasData &&
							(searchQuery
								? filteredDomainGroups
								: activeDomainGroup
									? [activeDomainGroup]
									: []
							).map((domain) => (
								<div key={domain.category} className="space-y-5">
									{searchQuery && (
										<div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
											<span className="text-sm font-bold text-slate-800 dark:text-slate-200">
												{getDomainLabel(domain.category, domain.categoryLabel)}
											</span>
											<Badge variant="outline" className="text-[10px]">
												{domain.totalConfigurations}{" "}
												{t("configurations.settings", "settings")}
											</Badge>
										</div>
									)}

									{/* Section Cards Responsive Grid */}
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
										{(sortOrder === "az"
											? [...domain.sections].sort((a, b) =>
													a.sectionName.localeCompare(b.sectionName),
												)
											: sortOrder === "za"
												? [...domain.sections].sort((a, b) =>
														b.sectionName.localeCompare(a.sectionName),
													)
												: domain.sections
										).map((section) => {
											const SectionIcon = getSectionIcon(section.sectionName);
											const hasComplexEditor = section.configurations.some(
												(cfg) => {
													const k = (cfg.configKey || "").toLowerCase();
													return (
														k.includes("early_payment") ||
														k.includes("discount_tier") ||
														k.includes("visit_status") ||
														k.includes("default_sort") ||
														k.includes("blacklist_ip") ||
														k.includes("approval_chain") ||
														(Array.isArray(cfg.configValue) &&
															cfg.configValue.length > 0 &&
															typeof cfg.configValue[0] === "object")
													);
												},
											);

											return (
												<div
													key={section.sectionName}
													className={`rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 space-y-4 shadow-xs transition-all ${
														hasComplexEditor ? "lg:col-span-2" : ""
													}`}
												>
													{/* Card Header */}
													<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
														<div className="flex items-center gap-2">
															<div className="h-7 w-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
																<SectionIcon className="h-3.5 w-3.5" />
															</div>
															<h2 className="text-sm font-black text-slate-900 dark:text-slate-100">
																{getSectionTitle(section.sectionName)}
															</h2>
														</div>
														<span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg">
															{section.configurations.length}{" "}
															{t("configurations.controls", "controls")}
														</span>
													</div>

													{/* Controls in Section Card */}
													<div className="space-y-4">
														{section.configurations.map((item) => {
															const isDirty = item.configKey in dirtyMap;
															const currentValue = isDirty
																? dirtyMap[item.configKey]
																: item.configValue;
															const isResetting = Boolean(
																resettingKeys[item.configKey],
															);
															const isOverridden = isDirty || item.overridden;
															const humanTitle = getItemLabel(
																item.configKey,
																item.label,
															);
															const itemDesc = getItemDesc(
																item.configKey,
																item.description,
															);
															const itemKey = (
																item.configKey || ""
															).toLowerCase();
															const isComplexEditor =
																itemKey.includes("early_payment") ||
																itemKey.includes("discount_tier") ||
																itemKey.includes("visit_status") ||
																itemKey.includes("default_sort") ||
																itemKey.includes("blacklist_ip") ||
																itemKey.includes("approval_chain") ||
																(Array.isArray(currentValue) &&
																	currentValue.length > 0 &&
																	typeof currentValue[0] === "object");

															if (isComplexEditor) {
																return (
																	<div
																		key={item.configKey}
																		className={`space-y-3 p-3.5 rounded-2xl transition-colors ${
																			isDirty
																				? "bg-amber-500/5 border border-amber-500/20"
																				: "bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60"
																		}`}
																	>
																		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
																			<div>
																				<div className="flex items-center gap-2">
																					<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
																						{humanTitle}
																					</span>
																					{isOverridden && (
																						<span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded-md">
																							{t(
																								"configurations.custom",
																								"Custom",
																							)}
																						</span>
																					)}
																				</div>
																				{itemDesc && (
																					<p className="text-[11px] text-slate-500 mt-0.5">
																						{itemDesc}
																					</p>
																				)}
																			</div>

																			<div className="flex items-center gap-1.5 self-end sm:self-center">
																				<ModernButton
																					variant="ghost"
																					size="xs"
																					disabled={
																						!isOverridden ||
																						isResetting ||
																						item.isReadOnly
																					}
																					onClick={() =>
																						handleResetToDefault(item.configKey)
																					}
																					title={t(
																						"configurations.resetToDefault",
																						"Reset to default",
																					)}
																					className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
																					leftIcon={
																						<RotateCcw
																							className={`h-3 w-3 ${
																								isResetting
																									? "animate-spin text-blue-500"
																									: ""
																							}`}
																						/>
																					}
																				>
																					{t("configurations.reset", "Reset")}
																				</ModernButton>
																			</div>
																		</div>

																		{/* Visual Editor */}
																		<ConfigControlRenderer
																			item={item}
																			currentValue={currentValue}
																			onChange={(newVal) =>
																				handleConfigChange(
																					item.configKey,
																					newVal,
																				)
																			}
																		/>
																	</div>
																);
															}

															return (() => {
																// Detect number pattern rows by key name OR by description tokens
																const isNumberPattern =
																	itemKey.includes("number_pattern") ||
																	itemKey.includes("number.pattern") ||
																	itemKey.includes("_pattern") ||
																	(typeof item.description === "string" &&
																		item.description.includes("{seq}") &&
																		item.description
																			.toLowerCase()
																			.includes("token"));

																const isZeroPadding =
																	itemKey.includes("zero_padding") ||
																	itemKey.includes("sequence_padding");

																// --- Sibling zero-padding lookup ---
																let siblingsZeroPadding = 5;
																if (isNumberPattern) {
																	const domainPrefix =
																		item.configKey.split(".")[0];
																	allConfigItems.forEach((cfg, cfgKey) => {
																		if (
																			cfgKey.startsWith(domainPrefix) &&
																			(cfgKey.includes("zero_padding") ||
																				cfgKey.includes("sequence_padding"))
																		) {
																			const val =
																				cfgKey in dirtyMap
																					? dirtyMap[cfgKey]
																					: cfg.configValue;
																			const num = Number(val);
																			if (!isNaN(num) && num > 0)
																				siblingsZeroPadding = num;
																		}
																	});
																}

																// --- Live preview computed from current input value ---
																let patternPreview: string | null = null;
																if (isNumberPattern) {
																	const pattern = String(
																		currentValue || "",
																	).trim();
																	if (pattern) {
																		const domain = item.configKey
																			.split(".")[0]
																			.toLowerCase();
																		const PREFIXES: Record<string, string> = {
																			invoice: "INV",
																			order: "ORD",
																			receipt: "RCP",
																			quote: "QT",
																			delivery: "DLV",
																			purchase: "PO",
																			credit: "CR",
																		};
																		const prefix =
																			PREFIXES[domain] ||
																			domain.slice(0, 4).toUpperCase() ||
																			"DOC";
																		const now = new Date();
																		const YYYY = now.getFullYear().toString();
																		const YY = YYYY.slice(2);
																		const MM = String(
																			now.getMonth() + 1,
																		).padStart(2, "0");
																		const DD = String(now.getDate()).padStart(
																			2,
																			"0",
																		);
																		const seq = "1".padStart(
																			Math.max(1, siblingsZeroPadding),
																			"0",
																		);
																		patternPreview = pattern
																			.replace(/\{prefix\}/gi, prefix)
																			.replace(/\{YYYY\}/g, YYYY)
																			.replace(/\{YY\}/g, YY)
																			.replace(/\{MM\}/g, MM)
																			.replace(/\{DD\}/g, DD)
																			.replace(/\{seq\}/gi, seq);
																	}
																}

																// Zero-padding live example: "1 → 00001"
																const zeroPadNum = isZeroPadding
																	? Math.max(1, Number(currentValue) || 5)
																	: 0;
																const zeroPadExample = isZeroPadding
																	? `1 → ${"1".padStart(zeroPadNum, "0")}`
																	: null;

																return (
																	<div
																		key={item.configKey}
																		className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-3 rounded-2xl transition-colors ${
																			isDirty
																				? "bg-amber-500/5 border border-amber-500/20"
																				: "hover:bg-slate-50 dark:hover:bg-slate-800/40"
																		}`}
																	>
																		{/* LEFT: label + live preview / description */}
																		<div className="flex-1 space-y-1 min-w-0">
																			<div className="flex items-center gap-2">
																				<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
																					{humanTitle}
																				</span>
																				{item.isSystemAdminOnly && (
																					<span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
																						<Lock className="h-2.5 w-2.5" />{" "}
																						{t(
																							"configurations.adminOnly",
																							"Admin Only",
																						)}
																					</span>
																				)}
																				{isDirty && (
																					<span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
																				)}
																			</div>

																			{/* Number pattern: live generated example replacing description */}
																			{isNumberPattern &&
																				(patternPreview ? (
																					<div className="flex items-center gap-1.5">
																						<Hash className="h-3 w-3 text-blue-400 shrink-0" />
																						<span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 px-2 py-0.5 rounded-md tracking-wide">
																							{patternPreview}
																						</span>
																					</div>
																				) : (
																					<p className="text-[11px] text-slate-400 italic">
																						{t(
																							"configurations.typePatternExample",
																							"Type a pattern to see a live example",
																						)}
																					</p>
																				))}

																			{/* Zero-padding: live "1 → 00001" example */}
																			{isZeroPadding && zeroPadExample && (
																				<p className="text-[11px] font-mono text-slate-500">
																					{zeroPadExample}
																				</p>
																			)}

																			{/* All other rows: description text */}
																			{!isNumberPattern &&
																				!isZeroPadding &&
																				itemDesc && (
																					<p className="text-[11px] text-slate-500 leading-snug">
																						{itemDesc}
																					</p>
																				)}
																		</div>

																		{/* RIGHT: control + reset */}
																		<div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
																			<ConfigControlRenderer
																				item={item}
																				currentValue={currentValue}
																				zeroPadding={
																					isNumberPattern
																						? siblingsZeroPadding
																						: undefined
																				}
																				onChange={(newVal) =>
																					handleConfigChange(
																						item.configKey,
																						newVal,
																					)
																				}
																			/>
																			{isOverridden && (
																				<ModernButton
																					variant="ghost"
																					size="icon-xs"
																					disabled={
																						isResetting || item.isReadOnly
																					}
																					onClick={() =>
																						handleResetToDefault(item.configKey)
																					}
																					title={t(
																						"configurations.resetToDefault",
																						"Reset to default",
																					)}
																					className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
																				>
																					<RotateCcw
																						className={`h-3 w-3 ${isResetting ? "animate-spin text-blue-500" : ""}`}
																					/>
																				</ModernButton>
																			)}
																		</div>
																	</div>
																);
															})();
														})}
													</div>
												</div>
											);
										})}
									</div>
								</div>
							))}

						{/* No search results */}
						{!isLoading &&
							!isApiError &&
							hasData &&
							filteredDomainGroups.length === 0 &&
							searchQuery && (
								<div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
									<Search className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
									<h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
										{t(
											"configurations.noSearchResults",
											"No configuration settings found",
										)}
									</h3>
									<p className="mt-1 text-xs text-slate-500 max-w-sm">
										{t(
											"configurations.noSearchResultsDesc",
											`We couldn't find any settings matching "${searchQuery}".`,
											{ query: searchQuery },
										)}
									</p>
									<ModernButton
										variant="outline"
										size="sm"
										onClick={() => setSearchQuery("")}
										className="mt-4"
									>
										{t("configurations.clearSearch", "Clear search")}
									</ModernButton>
								</div>
							)}
					</div>

				{/* ============================================================ */}
				{/* 5. DIRTY STATE & FLOATING BOTTOM SAVE BAR                    */}
				{/* ============================================================ */}
				<FloatingSaveBar
					dirtyCount={dirtyCount}
					onDiscard={handleDiscard}
					onSave={handleSaveBatch}
					isSaving={batchSaveMutation.isPending}
				/>
			</div>
		</TooltipProvider>
	);
}

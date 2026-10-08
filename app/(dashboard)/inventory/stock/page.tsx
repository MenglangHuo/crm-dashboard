"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	stocksApi,
	warehousesApi,
	inventoryImportsApi,
	stockMovementsApi,
	productsApi,
	categoriesApi,
	brandsApi,
	unitsApi,
	safeImageUrl,
	DEFAULT_IMAGE_URL,
} from "@/lib/api/endpoints";
import {
	StockProductItem,
	StockVariantItem,
	StockAdjustmentPayload,
	StockAdjustmentItemInput,
	StockMovementVariantItem,
	StockMovement,
	InventoryImport,
} from "@/lib/types";
import { DynamicInventoryStudioModal } from "@/components/inventory/dynamic-inventory-studio-modal";
import { StockAdjustmentsAuditView } from "@/components/inventory/stock-adjustments-audit-view";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Boxes,
	Warehouse as WarehouseIcon,
	AlertTriangle,
	ArrowDownLeft,
	ArrowUpRight,
	Plus,
	Loader2,
	Truck,
	History,
	TrendingUp,
	SlidersHorizontal,
	CheckCircle2,
	Search,
	X,
	RefreshCw,
	Layers,
	ChevronDown,
	ChevronRight,
	PackageCheck,
	Scale,
	Minus,
	FileText,
	BarChart3,
	Building2,
	Tag,
	DollarSign,
	Info,
	Coins,
	CircleDollarSign,
	Receipt,
	ArrowRight,
	GitFork,
	LayoutGrid,
	LayoutList,
	List,
} from "lucide-react";
import {
	DataTable,
	ColumnDef,
	StatusBadgeCell,
} from "@/components/ui-custom/data-table";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { DynamicFilterModal } from "@/components/ui-custom/data-table/dynamic-filter-modal";
import {
	DomainFilterField,
	FilterCriterion,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table/search-filter-types";
import { STOCK_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { getErrorMessage } from "@/lib/api/client";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

// Reusable Safe Product/Variant Image with Automatic Fallback Handling
function StockProductImage({
	src,
	alt,
	className = "size-9 rounded-lg border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative",
	imgClassName = "h-full w-full object-cover",
}: {
	src?: string | null;
	alt?: string;
	className?: string;
	imgClassName?: string;
}) {
	const [currentSrc, setCurrentSrc] = useState<string>(() => safeImageUrl(src));
	const [hasError, setHasError] = useState(false);

	React.useEffect(() => {
		setCurrentSrc(safeImageUrl(src));
		setHasError(false);
	}, [src]);

	const isDefault = !src || currentSrc === DEFAULT_IMAGE_URL || hasError;

	return (
		<div className={cn(className, "relative")}>
			{!isDefault ? (
				<img
					src={currentSrc}
					alt={alt || "Product"}
					className={imgClassName}
					loading="lazy"
					onError={() => {
						setHasError(true);
					}}
				/>
			) : (
				<div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/20 text-purple-600 dark:text-purple-400">
					<Boxes className="size-4.5" />
				</div>
			)}
		</div>
	);
}

function extractStockImageUrl(
	item?: any,
	productsMap?: Map<string | number, any>,
): string {
	if (!item) return DEFAULT_IMAGE_URL;
	const rawUrl =
		item.imageUrl ||
		item.image ||
		item.photoUrl ||
		item.thumbnail ||
		item.logoUrl ||
		item.avatarUrl ||
		item.productImageUrl ||
		item.productImage ||
		item.product?.imageUrl ||
		item.product?.image ||
		item.product?.thumbnail ||
		item.product?.photoUrl ||
		item.product?.logoUrl ||
		item.variants?.[0]?.imageUrl ||
		item.variants?.[0]?.thumbnail ||
		item.variants?.[0]?.image ||
		item.variants?.[0]?.photoUrl ||
		item.variants?.[0]?.productImageUrl ||
		"";

	if (rawUrl && safeImageUrl(rawUrl) !== DEFAULT_IMAGE_URL) {
		return safeImageUrl(rawUrl);
	}

	if (productsMap) {
		const prodId = item.productId ?? item.id;
		const pUuid = item.productUuid ?? item.uuid;
		const pName = item.productName || item.name;
		const entry =
			(prodId && productsMap.get(prodId)) ||
			(prodId && productsMap.get(Number(prodId))) ||
			(prodId && productsMap.get(String(prodId))) ||
			(pUuid && productsMap.get(pUuid)) ||
			(pName && productsMap.get(pName.toLowerCase().trim()));

		if (entry?.imageUrl && safeImageUrl(entry.imageUrl) !== DEFAULT_IMAGE_URL) {
			return safeImageUrl(entry.imageUrl);
		}

		if (entry?.variantsMap && entry.variantsMap.size > 0) {
			for (const vImg of entry.variantsMap.values()) {
				if (vImg && safeImageUrl(vImg) !== DEFAULT_IMAGE_URL) {
					return safeImageUrl(vImg);
				}
			}
		}
	}

	return safeImageUrl(rawUrl);
}

function extractVariantImageUrl(
	variant?: any,
	parentProduct?: any,
	productsMap?: Map<string | number, any>,
): string {
	if (!variant && !parentProduct) return DEFAULT_IMAGE_URL;
	const rawUrl =
		variant?.imageUrl ||
		variant?.thumbnail ||
		variant?.image ||
		variant?.photoUrl ||
		variant?.productImageUrl ||
		variant?.product?.imageUrl ||
		variant?.product?.image ||
		variant?.product?.thumbnail ||
		parentProduct?.imageUrl ||
		parentProduct?.image ||
		parentProduct?.photoUrl ||
		parentProduct?.thumbnail ||
		parentProduct?.logoUrl ||
		parentProduct?.productImageUrl ||
		parentProduct?.productImage ||
		parentProduct?.product?.imageUrl ||
		parentProduct?.product?.image ||
		parentProduct?.product?.thumbnail ||
		"";

	if (rawUrl && safeImageUrl(rawUrl) !== DEFAULT_IMAGE_URL) {
		return safeImageUrl(rawUrl);
	}

	if (productsMap) {
		const parentId =
			parentProduct?.productId ?? parentProduct?.id ?? variant?.productId;
		const pUuid = parentProduct?.productUuid ?? parentProduct?.uuid;
		const pName = parentProduct?.productName || parentProduct?.name;
		const entry =
			(parentId && productsMap.get(parentId)) ||
			(parentId && productsMap.get(Number(parentId))) ||
			(parentId && productsMap.get(String(parentId))) ||
			(pUuid && productsMap.get(pUuid)) ||
			(pName && productsMap.get(pName.toLowerCase().trim()));

		const varKey = variant?.variantId ?? variant?.id ?? variant?.sku;
		if (entry?.variantsMap) {
			const vImg =
				entry.variantsMap.get(varKey) ||
				(varKey ? entry.variantsMap.get(String(varKey)) : null) ||
				(variant?.sku
					? entry.variantsMap.get(variant.sku.toLowerCase().trim())
					: null);

			if (vImg && safeImageUrl(vImg) !== DEFAULT_IMAGE_URL) {
				return safeImageUrl(vImg);
			}
		}

		if (entry?.imageUrl && safeImageUrl(entry.imageUrl) !== DEFAULT_IMAGE_URL) {
			return safeImageUrl(entry.imageUrl);
		}
	}

	return safeImageUrl(rawUrl);
}

function StockPageContent() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const tabParam = searchParams.get("tab");

	// ------------------------------------------------------------
	const [activeTab, setActiveTab] = useState<
		"search" | "low_stock" | "out_of_stock"
	>(() => {
		if (
			tabParam === "low_stock" ||
			tabParam === "out_of_stock" ||
			tabParam === "search"
		) {
			return tabParam;
		}
		return "search";
	});

	// Sync activeTab if searchParam changes
	React.useEffect(() => {
		if (
			tabParam === "low_stock" ||
			tabParam === "out_of_stock" ||
			tabParam === "search"
		) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	// Search & Filter Studio State for Stock Search
	const [search, setSearch] = useState("");
	const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>([]);
	const [isFilterStudioOpen, setIsFilterStudioOpen] = useState(false);
	const [searchPage, setSearchPage] = useState(0); // 0-indexed for backend API
	const [searchSize, setSearchSize] = useState(10);

	// Low Stock & Out of Stock Pagination
	const [lowStockPage, setLowStockPage] = useState(0);
	const [outStockPage, setOutStockPage] = useState(0);

	// Expanded Product Table Rows state
	const [expandedProducts, setExpandedProducts] = useState<
		Record<string | number, boolean>
	>({});

	// Variant View Mode (Card vs Table / List) - Global default and per-product
	const [globalVariantViewMode, setGlobalVariantViewMode] = useState<
		"card" | "list"
	>("list");
	const [productViewModes, setProductViewModes] = useState<
		Record<string | number, "card" | "list">
	>({});

	// Variant Movement History Modal State (Supports Warehouse Filtering)
	const [selectedVariantForMovements, setSelectedVariantForMovements] =
		useState<{
			variantId: number;
			variantName: string;
			sku: string;
			warehouseId?: number | string;
			warehouseName?: string;
		} | null>(null);
	const [variantMovementWarehouseFilter, setVariantMovementWarehouseFilter] =
		useState<string>("ALL");
	const [variantMovementTypeFilter, setVariantMovementTypeFilter] =
		useState<string>("ALL");

	// Stock Adjustment Studio Modal State
	const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
	const [initialAdjustItems, setInitialAdjustItems] = useState<any[] | null>(
		null,
	);

	// Stock Import Studio Modal State
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	// ------------------------------------------------------------
	// Master Data Queries (Lazy loaded only when modals/studio are active)
	// ------------------------------------------------------------
	const isFilterOrModalActive =
		isFilterStudioOpen ||
		isAdjustModalOpen ||
		isImportDialogOpen ||
		!!selectedVariantForMovements;

	const { data: categoriesData } = useQuery({
		queryKey: ["categories-all"],
		queryFn: () => categoriesApi.list({ limit: 100 }),
		enabled: isFilterOrModalActive,
	});

	const { data: brandsData } = useQuery({
		queryKey: ["brands-all"],
		queryFn: () => brandsApi.list({ limit: 100 }),
		enabled: isFilterOrModalActive,
	});

	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses-all"],
		queryFn: () => warehousesApi.list({ limit: 100 }),
		enabled: isFilterOrModalActive,
	});

	const { data: productsData } = useQuery({
		queryKey: ["products-all-stock"],
		queryFn: () => productsApi.list({ limit: 500 }),
		staleTime: 5 * 60 * 1000,
	});

	// Product & Variant Image Lookup Map for instant fallback resolution
	const productImagesMap = useMemo(() => {
		const map = new Map<
			string | number,
			{
				imageUrl?: string;
				variantsMap: Map<string | number, string>;
			}
		>();
		const items = productsData?.items || [];
		items.forEach((p: any) => {
			const vMap = new Map<string | number, string>();
			const pImg =
				p.imageUrl ||
				p.image ||
				p.thumbnail ||
				p.photoUrl ||
				p.logoUrl ||
				p.productImageUrl ||
				p.variants?.[0]?.imageUrl ||
				p.variants?.[0]?.thumbnail ||
				"";

			if (Array.isArray(p.variants)) {
				p.variants.forEach((v: any) => {
					const vImg =
						v.imageUrl || v.thumbnail || v.image || v.photoUrl || pImg || "";
					if (v.id) {
						vMap.set(v.id, vImg);
						vMap.set(String(v.id), vImg);
					}
					if (v.variantId) {
						vMap.set(v.variantId, vImg);
						vMap.set(String(v.variantId), vImg);
					}
					if (v.sku) {
						vMap.set(v.sku, vImg);
						vMap.set(v.sku.toLowerCase().trim(), vImg);
					}
				});
			}

			const entry = { imageUrl: pImg, variantsMap: vMap };
			if (p.id) {
				map.set(p.id, entry);
				map.set(String(p.id), entry);
				map.set(Number(p.id), entry);
			}
			if (p.uuid) {
				map.set(p.uuid, entry);
				map.set(String(p.uuid), entry);
			}
			if (p.name) {
				map.set(p.name.toLowerCase().trim(), entry);
			}
			if (p.baseSku) {
				map.set(p.baseSku.toLowerCase().trim(), entry);
			}
		});
		return map;
	}, [productsData]);

	// Extract all variants from products list for dropdowns
	const allVariants = useMemo(() => {
		const items = productsData?.items || [];
		const variantsList: Array<{
			variantId: number;
			label: string;
			sku: string;
			productId: number | string;
			productName: string;
		}> = [];
		items.forEach((p) => {
			if (p.variants && p.variants.length > 0) {
				p.variants.forEach((v: any) => {
					variantsList.push({
						variantId: Number(v.id || v.variantId),
						label: `${p.name} - ${v.name || v.variantName || "Variant"} (${v.sku || "No SKU"})`,
						sku: v.sku || "",
						productId: p.id,
						productName: p.name,
					});
				});
			} else {
				variantsList.push({
					variantId: Number(p.id),
					label: `${p.name} (${p.baseSku || "Standard"})`,
					sku: p.baseSku || "",
					productId: p.id,
					productName: p.name,
				});
			}
		});
		return variantsList;
	}, [productsData]);

	// ------------------------------------------------------------
	// Stock Search API Query (POST /api/v1/stocks/search)
	// ------------------------------------------------------------
	const searchPayload = useMemo(() => {
		return buildSearchFilterPayload({
			searchValue: search,
			activeFilters,
			sortState: [{ field: "createdAt", direction: "DESC" }],
			page: searchPage,
			size: searchSize,
		});
	}, [search, activeFilters, searchPage, searchSize]);

	const {
		data: searchStockResponse,
		isLoading: isLoadingSearchStock,
		refetch: refetchSearchStock,
	} = useQuery({
		queryKey: ["stocks-search-v1", searchPayload],
		queryFn: () => stocksApi.search(searchPayload),
	});

	// Extract products content from response
	const searchStockData: StockProductItem[] =
		searchStockResponse?.content ||
		searchStockResponse?.data?.content ||
		(Array.isArray(searchStockResponse) ? searchStockResponse : []);
	const searchTotalElements =
		searchStockResponse?.totalElements ??
		searchStockResponse?.data?.totalElements ??
		searchStockData.length;
	const searchTotalPages =
		searchStockResponse?.totalPages ??
		searchStockResponse?.data?.totalPages ??
		1;

	// ------------------------------------------------------------
	// Low Stock Query (GET /api/v1/stocks/low-stock)
	// ------------------------------------------------------------
	const { data: lowStockResponse, isLoading: isLoadingLowStock } = useQuery({
		queryKey: ["stocks-low-stock-v1", lowStockPage],
		queryFn: () => stocksApi.getLowStock({ page: lowStockPage, size: 10 }),
	});
	const lowStockProducts: StockProductItem[] =
		lowStockResponse?.content ||
		lowStockResponse?.data?.content ||
		(Array.isArray(lowStockResponse) ? lowStockResponse : []);
	const lowStockTotal =
		lowStockResponse?.totalElements ?? lowStockProducts.length;

	// ------------------------------------------------------------
	// Out of Stock Query (GET /api/v1/stocks/out-of-stock)
	// ------------------------------------------------------------
	const { data: outStockResponse, isLoading: isLoadingOutStock } = useQuery({
		queryKey: ["stocks-out-of-stock-v1", outStockPage],
		queryFn: () => stocksApi.getOutOfStock({ page: outStockPage, size: 10 }),
	});
	const outStockProducts: StockProductItem[] =
		outStockResponse?.content ||
		outStockResponse?.data?.content ||
		(Array.isArray(outStockResponse) ? outStockResponse : []);
	const outStockTotal =
		outStockResponse?.totalElements ?? outStockProducts.length;

	// ------------------------------------------------------------
	// Variant Stock Movements Modal Query (GET /api/v1/stock-movements/variant/{variantId}/warehouse/{warehouseId})
	// ------------------------------------------------------------
	const {
		data: variantMovementsResponse,
		isLoading: isLoadingVariantMovements,
	} = useQuery({
		queryKey: [
			"variant-movements",
			selectedVariantForMovements?.variantId,
			variantMovementWarehouseFilter,
			variantMovementTypeFilter,
		],
		queryFn: () =>
			selectedVariantForMovements
				? stockMovementsApi.getByVariant(
						selectedVariantForMovements.variantId,
						{
							warehouseId:
								variantMovementWarehouseFilter === "ALL"
									? undefined
									: variantMovementWarehouseFilter,
							type:
								variantMovementTypeFilter === "ALL"
									? undefined
									: variantMovementTypeFilter,
							page: 0,
							size: 50,
						},
					)
				: Promise.resolve(null),
		enabled: !!selectedVariantForMovements,
	});
	const variantMovements: StockMovementVariantItem[] =
		variantMovementsResponse?.content ||
		variantMovementsResponse?.data?.content ||
		(Array.isArray(variantMovementsResponse) ? variantMovementsResponse : []);

	const openAdjustModalForVariant = (
		variantId: number,
		variantName: string,
		sku: string,
		options?: {
			productName?: string;
			unitId?: number | string;
			unitName?: string;
			availableStock?: number;
			imageUrl?: string;
			adjustmentType?: "INCREASE" | "DECREASE";
			reason?: string;
			notes?: string;
		},
	) => {
		const adjType = options?.adjustmentType || "INCREASE";
		setInitialAdjustItems([
			{
				variantId,
				variantName,
				sku,
				productName: options?.productName || variantName,
				unitId: options?.unitId ? Number(options.unitId) : 1,
				unitName: options?.unitName || "Pcs",
				quantity: 1,
				adjustmentQuantity: 1,
				availableStock: options?.availableStock,
				imageUrl: options?.imageUrl,
				AdjustmentType: adjType,
				adjustmentType: adjType,
				reason:
					options?.reason ||
					(adjType === "INCREASE" ? "Inventory audit" : "Damaged goods"),
				notes:
					options?.notes ||
					(adjType === "INCREASE"
						? "Monthly physical count"
						: "Found broken in shelf B3"),
			},
		]);
		setIsAdjustModalOpen(true);
	};

	const openVariantMovementsModal = (
		variantId: number,
		variantName: string,
		sku: string,
		warehouseId?: number | string,
		warehouseName?: string,
	) => {
		setSelectedVariantForMovements({
			variantId,
			variantName,
			sku,
			warehouseId,
			warehouseName,
		});
		setVariantMovementWarehouseFilter(
			warehouseId ? String(warehouseId) : "ALL",
		);
		setVariantMovementTypeFilter("ALL");
	};

	const toggleProductExpand = (id: string | number) => {
		setExpandedProducts((prev) => ({
			...prev,
			[id]: !prev[id],
		}));
	};

	return (
		<div className="space-y-6">
			{/* Main Modern Navigation Tabs (3 Tabs) */}
			<ModernTabs
				value={activeTab}
				onValueChange={(val) => setActiveTab(val as any)}
			>
				<ModernTabsList variant="glass" size="md">
					<ModernTabsTrigger
						value="search"
						icon={<Boxes className="h-4 w-4" />}
						badge={searchTotalElements}
						badgeColor="purple"
					>
						{t("stocks.searchStockTab")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="low_stock"
						icon={<AlertTriangle className="h-4 w-4" />}
						badge={lowStockTotal}
						badgeColor="amber"
					>
						{t("stocks.lowStockTab")} ({lowStockTotal})
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="out_of_stock"
						icon={<X className="h-4 w-4" />}
						badge={outStockTotal}
						badgeColor="slate"
					>
						{t("stocks.outOfStockTab")} ({outStockTotal})
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="adjustments"
						icon={<History className="h-4 w-4" />}
					>
						Stock Adjustments Audit
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* ============================================================ */}
				{/* TAB 1: ALL STOCK CATALOG TABLE VIEW */}
				{/* ============================================================ */}
				<ModernTabsContent value="search" className="pt-3 space-y-4">
					{/* Search & Action Buttons Controls Header */}
					<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
						{/* Search Input (Flexible Width) */}
						<div className="relative flex-1">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder={t("common.search")}
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setSearchPage(0);
								}}
								className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800"
							/>
							{search && (
								<button
									onClick={() => {
										setSearch("");
										setSearchPage(0);
									}}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						{/* Action Buttons Group */}
						<div className="flex items-center gap-2 flex-wrap">
							<Button
								variant={activeFilters.length > 0 ? "default" : "outline"}
								size="sm"
								onClick={() => setIsFilterStudioOpen(true)}
								className={cn(
									"h-10 text-xs font-semibold gap-1.5 px-3.5 rounded-xl border-slate-200 dark:border-slate-800",
									activeFilters.length > 0 && "bg-purple-600 text-white",
								)}
							>
								<SlidersHorizontal className="h-4 w-4" />
								<span>{t("common.filter")}</span>
								{activeFilters.length > 0 && (
									<Badge
										variant="secondary"
										className="ml-1 text-[10px] px-1.5 py-0 bg-white/20 text-white"
									>
										{activeFilters.length}
									</Badge>
								)}
							</Button>

							<Button
								onClick={() => {
									setInitialAdjustItems(null);
									setIsAdjustModalOpen(true);
								}}
								className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs gap-1.5"
							>
								<Scale className="h-4 w-4" />
								<span>{t("stocks.adjustStock")}</span>
							</Button>

							<Button
								onClick={() => setIsImportDialogOpen(true)}
								className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs gap-1.5"
							>
								<Truck className="h-4 w-4" />
								<span>{t("stocks.importStock")}</span>
							</Button>

							{/* Global Sub-row View Mode Toggle */}
							<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 h-10">
								<button
									type="button"
									onClick={() => setGlobalVariantViewMode("list")}
									className={cn(
										"h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
										globalVariantViewMode === "list"
											? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs border border-slate-200/60 dark:border-slate-700"
											: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
									)}
									title="Default variants view to Table"
								>
									<LayoutList className="size-3.5" />
									<span className="hidden sm:inline">Table</span>
								</button>
								<button
									type="button"
									onClick={() => setGlobalVariantViewMode("card")}
									className={cn(
										"h-8 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
										globalVariantViewMode === "card"
											? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs border border-slate-200/60 dark:border-slate-700"
											: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
									)}
									title="Default variants view to Cards"
								>
									<LayoutGrid className="size-3.5" />
									<span className="hidden sm:inline">Cards</span>
								</button>
							</div>

							<Button
								variant="outline"
								size="icon"
								onClick={() => refetchSearchStock()}
								className="h-10 w-10 rounded-xl text-muted-foreground border-slate-200 dark:border-slate-800"
								title={t("common.refresh")}
							>
								<RefreshCw
									className={cn(
										"h-4 w-4",
										isLoadingSearchStock && "animate-spin",
									)}
								/>
							</Button>
						</div>
					</div>

					{/* Active Filter Pills Bar */}
					{activeFilters.length > 0 && (
						<div className="flex items-center gap-2 flex-wrap text-xs bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
							<span className="font-semibold text-purple-700 dark:text-purple-300">
								Active Criteria:
							</span>
							{activeFilters.map((f, i) => (
								<Badge
									key={i}
									variant="secondary"
									className="gap-1.5 text-[11px] bg-white dark:bg-slate-900 border text-slate-700 dark:text-slate-300"
								>
									<span className="font-medium text-purple-600 dark:text-purple-400">
										{f.field}
									</span>
									<span className="text-[10px] text-muted-foreground">
										{f.operator}
									</span>
									<span className="font-mono text-foreground">
										{String(f.value ?? f.values ?? f.valueTo ?? "")}
									</span>
									<X
										className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-600"
										onClick={() =>
											setActiveFilters(
												activeFilters.filter((_, idx) => idx !== i),
											)
										}
									/>
								</Badge>
							))}
							<Button
								variant="ghost"
								size="sm"
								className="h-6 text-[10px] text-purple-600 dark:text-purple-400 hover:underline px-2"
								onClick={() => setActiveFilters([])}
							>
								{t("common.clearAll")}
							</Button>
						</div>
					)}

					{/* Stock Products & Variants Table */}
					{isLoadingSearchStock ? (
						<div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
							<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
						</div>
					) : searchStockData.length === 0 ? (
						<div className="text-center py-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-card">
							<Boxes className="mx-auto h-10 w-10 text-slate-400" />
							<p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-2">
								{t("common.noResults")}
							</p>
						</div>
					) : (
						<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
							<Table>
								<TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-10 text-center"></TableHead>
										<TableHead className="font-bold text-xs text-foreground">
											{t("stocks.productName")}
										</TableHead>
										<TableHead className="font-bold text-xs text-center">
											{t("products.unitHierarchy")}
										</TableHead>
										<TableHead className="font-bold text-xs text-right">
											{t("stocks.quantityOnHand")}
										</TableHead>
										<TableHead className="font-bold text-xs text-right">
											{t("stocks.availableQuantity")}
										</TableHead>
										<TableHead className="font-bold text-xs text-right">
											{t("stocks.reservedQuantity")}
										</TableHead>
										<TableHead className="font-bold text-xs text-right">
											{t("stocks.soldQuantity")}
										</TableHead>
										<TableHead className="font-bold text-xs text-center">
											{t("stocks.stockStatus")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{searchStockData.map(
										(product: StockProductItem, idx: number) => {
											const prodId =
												product.productId || product.productUuid || idx;
											const isExpanded = expandedProducts[prodId] ?? false;
											const variants = product.variants || [];

											const totalPhysical = variants.reduce(
												(acc, v) =>
													acc +
													(v.inventorySummary?.totalPhysicalQty ??
														v.stockQty ??
														0),
												0,
											);
											const totalAvailable = variants.reduce(
												(acc, v) =>
													acc +
													(v.inventorySummary?.availableQty ?? v.stockQty ?? 0),
												0,
											);
											const totalReserved = variants.reduce(
												(acc, v) =>
													acc + (v.inventorySummary?.reservedQty ?? 0),
												0,
											);
											const totalSold = variants.reduce(
												(acc, v) => acc + (v.inventorySummary?.soldQty ?? 0),
												0,
											);
											const hasLowStock = variants.some(
												(v) =>
													v.inventorySummary?.isLowStock ||
													(v.stockQty !== undefined && v.stockQty <= 5),
											);

											return (
												<React.Fragment key={prodId}>
													{/* Main Product Table Row */}
													<TableRow
														onClick={() => toggleProductExpand(prodId)}
														className={cn(
															"cursor-pointer transition-colors hover:bg-purple-50/40 dark:hover:bg-purple-950/20",
															isExpanded &&
																"bg-purple-50/20 dark:bg-purple-950/10 font-medium",
														)}
													>
														<TableCell className="text-center p-2">
															<Button
																variant="ghost"
																size="icon"
																className="size-7 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50"
																onClick={(e) => {
																	e.stopPropagation();
																	toggleProductExpand(prodId);
																}}
															>
																{isExpanded ? (
																	<ChevronDown className="size-4" />
																) : (
																	<ChevronRight className="size-4" />
																)}
															</Button>
														</TableCell>

														<TableCell>
															<div className="flex items-center gap-3">
																<StockProductImage
																	src={extractStockImageUrl(
																		product,
																		productImagesMap,
																	)}
																	alt={product.productName || "Product"}
																	className="size-9 rounded-lg border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
																/>

																<div>
																	<p className="font-bold text-xs text-foreground flex items-center gap-2">
																		{product.productName}
																	</p>
																</div>
															</div>
														</TableCell>

														<TableCell className="text-center">
															<Badge
																variant="secondary"
																className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
															>
																{variants.length}{" "}
																{variants.length === 1 ? "Variant" : "Variants"}
															</Badge>
														</TableCell>

														<TableCell className="text-right font-bold text-xs text-foreground">
															{totalPhysical}
														</TableCell>

														<TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
															{totalAvailable}
														</TableCell>

														<TableCell className="text-right text-xs text-amber-600 font-semibold">
															{totalReserved}
														</TableCell>

														<TableCell className="text-right text-xs text-muted-foreground">
															{totalSold}
														</TableCell>

														<TableCell className="text-center">
															{totalAvailable === 0 ? (
																<Badge
																	variant="destructive"
																	className="text-[9px] px-1.5 py-0"
																>
																	{t("stocks.outOfStock")}
																</Badge>
															) : hasLowStock ? (
																<Badge
																	variant="outline"
																	className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-700 bg-amber-50"
																>
																	{t("stocks.lowStockAlert")}
																</Badge>
															) : (
																<Badge
																	variant="outline"
																	className="text-[9px] px-1.5 py-0 border-emerald-400 text-emerald-700 bg-emerald-50"
																>
																	{t("stocks.inStock")}
																</Badge>
															)}
														</TableCell>
													</TableRow>

													{/* Collapsible Variants Sub-Table */}
													{isExpanded && (
														<TableRow className="bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-50/60 border-b">
															<TableCell colSpan={9} className="p-4">
																<div className="rounded-2xl border border-purple-200/70 dark:border-purple-900/40 bg-card p-5 space-y-4 shadow-sm">
																	{/* Header with View Mode Tabs (Table vs Cards) */}
																	<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-slate-100 dark:border-slate-800">
																		<div className="flex items-center gap-2.5">
																			<div className="flex size-8 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
																				<Layers className="size-4.5" />
																			</div>
																			<div>
																				<h5 className="font-extrabold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
																					{t("products.productVariants")} (
																					{variants.length})
																				</h5>
																				<p className="text-[11px] text-muted-foreground">
																					{t("products.unitHierarchy")} &{" "}
																					{t("stocks.subtitle")}
																				</p>
																			</div>
																		</div>

																		{/* View Mode Switcher Tabs */}
																		<div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0 self-start sm:self-auto">
																			<button
																				type="button"
																				onClick={() =>
																					setProductViewModes((prev) => ({
																						...prev,
																						[prodId]: "list" as const,
																					}))
																				}
																				className={cn(
																					"h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
																					(productViewModes[prodId] ??
																						globalVariantViewMode) === "list"
																						? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs border border-slate-200/60 dark:border-slate-700"
																						: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
																				)}
																			>
																				<LayoutList className="size-3.5" />
																				<span>
																					{t("common.table", "Table")}
																				</span>
																			</button>
																			<button
																				type="button"
																				onClick={() =>
																					setProductViewModes((prev) => ({
																						...prev,
																						[prodId]: "card" as const,
																					}))
																				}
																				className={cn(
																					"h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
																					(productViewModes[prodId] ??
																						globalVariantViewMode) === "card"
																						? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs border border-slate-200/60 dark:border-slate-700"
																						: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
																				)}
																			>
																				<LayoutGrid className="size-3.5" />
																				<span>
																					{t("common.cards", "Cards")}
																				</span>
																			</button>
																		</div>
																	</div>

																	{/* Content Switcher based on viewMode */}
																	{(productViewModes[prodId] ??
																		globalVariantViewMode) === "list" ? (
																		/* TABULAR VIEW OF VARIANTS */
																		<div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs">
																			<table className="w-full text-left text-xs border-collapse min-w-[900px]">
																				<thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
																					<tr>
																						<th className="p-3 text-left">
																							{t(
																								"stocks.productName",
																								"Variant / Item",
																							)}
																						</th>
																						<th className="p-3 text-left">
																							{t(
																								"products.unitHierarchy",
																								"Unit & Conversions",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t(
																								"stocks.unitCost",
																								"Unit Cost",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t(
																								"stocks.retailPrice",
																								"Retail Price",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t(
																								"stocks.quantityOnHand",
																								"On Hand",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t(
																								"stocks.availableQuantity",
																								"Available (Remain)",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t(
																								"stocks.reservedQuantity",
																								"Reserved",
																							)}
																						</th>
																						<th className="p-3 text-right">
																							{t("stocks.soldQuantity", "Sold")}
																						</th>
																						<th className="p-3 text-center">
																							{t(
																								"stocks.stockStatus",
																								"Stock Status",
																							)}
																						</th>
																						<th className="p-3 text-center">
																							{t("common.actions", "Actions")}
																						</th>
																					</tr>
																				</thead>
																				<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
																					{variants.map(
																						(v: StockVariantItem) => {
																							const summary =
																								v.inventorySummary;
																							const rawUnits: any[] =
																								v.unitBreakdown ||
																								(v as any).units ||
																								[];
																							const units = rawUnits.map(
																								(u: any) => {
																									const baseQty = Number(
																										u.baseQuantity ??
																											u.conversionFactor ??
																											1,
																									);
																									const pQty =
																										u.parentQuantity !==
																											undefined &&
																										u.parentQuantity !== null
																											? Number(u.parentQuantity)
																											: null;
																									return {
																										...u,
																										unitId: u.unitId ?? u.id,
																										unitName:
																											u.unitName ||
																											u.name ||
																											"Unit",
																										baseQuantity: baseQty,
																										parentQuantity: pQty,
																										parentUnitId:
																											u.parentUnitId ?? null,
																										parentUnitName:
																											u.parentUnitName ?? null,
																										discountNote:
																											u.discountNote ?? null,
																										sellingPrice: Number(
																											u.sellingPrice ??
																												u.price ??
																												u.finalPrice ??
																												u.unitPrice ??
																												0,
																										),
																										isBase: Boolean(
																											u.isBase ||
																												(baseQty === 1 &&
																													!u.parentUnitId),
																										),
																									};
																								},
																							);
																							const sortedUnits = [
																								...units,
																							].sort((a, b) => {
																								if (a.isBase && !b.isBase)
																									return -1;
																								if (!a.isBase && b.isBase)
																									return 1;
																								return (
																									(a.baseQuantity || 1) -
																									(b.baseQuantity || 1)
																								);
																							});

																							const baseUnit =
																								sortedUnits.find(
																									(u) => u.isBase,
																								) || sortedUnits[0];
																							const basePrice =
																								baseUnit?.sellingPrice ?? 0;
																							const packageUnits =
																								sortedUnits.filter(
																									(u) => !u.isBase,
																								);

																							const availableStock =
																								summary?.availableQty ??
																								v.stockQty ??
																								0;
																							const physicalStock =
																								summary?.totalPhysicalQty ??
																								v.stockQty ??
																								0;
																							const reservedStock =
																								summary?.reservedQty ?? 0;
																							const soldStock =
																								summary?.soldQty ?? 0;
																							const isOutOfStock =
																								availableStock <= 0;
																							const isLowStock =
																								summary?.isLowStock ||
																								(availableStock > 0 &&
																									availableStock <=
																										(summary?.lowStockThreshold ??
																											5));

																							return (
																								<tr
																									key={v.variantId}
																									className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
																								>
																									{/* 1. Variant Item */}
																									<td className="p-3">
																										<div className="flex items-center gap-3">
																											<StockProductImage
																												src={extractVariantImageUrl(
																													v,
																													product,
																													productImagesMap,
																												)}
																												alt={v.variantName}
																												className="size-9 rounded-lg border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
																											/>

																											<div className="space-y-0.5 min-w-0">
																												<span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
																													{v.variantName}
																												</span>
																												<div className="flex items-center gap-1.5 flex-wrap">
																													<span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-semibold">
																														SKU: {v.sku}
																													</span>
																													{v.barcode && (
																														<span className="font-mono text-[10px] text-slate-500">
																															BAR: {v.barcode}
																														</span>
																													)}
																												</div>
																											</div>
																										</div>
																									</td>

																									{/* 2. Packaging Units & Hierarchy */}
																									<td className="p-3">
																										<div className="space-y-1">
																											<div className="flex items-center gap-1.5">
																												<Badge
																													variant="outline"
																													className="text-[10px] font-bold px-1.5 py-0 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800"
																												>
																													{baseUnit?.unitName ||
																														summary?.baseUnit ||
																														"Base Unit"}{" "}
																													(Base)
																												</Badge>
																												{packageUnits.length >
																													0 && (
																													<span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 font-mono">
																														+
																														{
																															packageUnits.length
																														}{" "}
																														package units
																													</span>
																												)}
																											</div>
																											{packageUnits.length >
																												0 && (
																												<div className="flex items-center gap-1 flex-wrap text-[10px] font-mono text-slate-600 dark:text-slate-400">
																													{packageUnits.map(
																														(pu) => (
																															<span
																																key={pu.unitId}
																																className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700"
																															>
																																1 {pu.unitName}{" "}
																																={" "}
																																{pu.parentQuantity ??
																																	pu.baseQuantity}{" "}
																																{pu.parentUnitName ||
																																	baseUnit?.unitName ||
																																	"Base"}{" "}
																																($
																																{pu.sellingPrice.toFixed(
																																	2,
																																)}
																																)
																															</span>
																														),
																													)}
																												</div>
																											)}
																										</div>
																									</td>

																									{/* 3. Unit Cost */}
																									<td className="p-3 text-right">
																										<span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
																											$
																											{summary?.cost?.toFixed(
																												2,
																											) ?? "0.00"}
																										</span>
																									</td>

																									{/* 4. Retail Price */}
																									<td className="p-3 text-right">
																										<span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/50">
																											${basePrice.toFixed(2)}
																											{baseUnit && (
																												<span className="text-[10px] text-muted-foreground font-normal ml-0.5">
																													/{baseUnit.unitName}
																												</span>
																											)}
																										</span>
																									</td>

																									{/* 5. Physical Stock (On Hand) */}
																									<td className="p-3 text-right">
																										<div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
																											{physicalStock}{" "}
																											<span className="text-[10px] font-normal text-muted-foreground">
																												{summary?.baseUnit ||
																													baseUnit?.unitName ||
																													""}
																											</span>
																										</div>
																									</td>

																									{/* 6. Available Stock (Remain) */}
																									<td className="p-3 text-right">
																										<div
																											className={cn(
																												"font-mono font-extrabold text-sm",
																												isOutOfStock
																													? "text-rose-600 dark:text-rose-400"
																													: "text-emerald-600 dark:text-emerald-400",
																											)}
																										>
																											{availableStock}{" "}
																											<span className="text-[10px] font-semibold">
																												{summary?.baseUnit ||
																													baseUnit?.unitName ||
																													""}
																											</span>
																										</div>
																										{/* Converted Equivalent summary if available */}
																										{packageUnits.length > 0 &&
																											availableStock > 0 && (
																												<div className="text-[10px] text-slate-500 font-mono">
																													≈{" "}
																													{Math.floor(
																														availableStock /
																															(packageUnits[0]
																																?.baseQuantity ||
																																1),
																													)}{" "}
																													{
																														packageUnits[0]
																															?.unitName
																													}
																												</div>
																											)}
																									</td>

																									{/* 7. Reserved */}
																									<td className="p-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
																										{reservedStock}
																									</td>

																									{/* 8. Sold */}
																									<td className="p-3 text-right font-mono text-muted-foreground">
																										{soldStock}
																									</td>

																									{/* 9. Stock Status */}
																									<td className="p-3 text-center">
																										{isOutOfStock ? (
																											<Badge
																												variant="destructive"
																												className="text-[9px] px-2 py-0.5 font-bold"
																											>
																												{t("stocks.outOfStock")}
																											</Badge>
																										) : isLowStock ? (
																											<Badge
																												variant="outline"
																												className="text-[9px] px-2 py-0.5 border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold"
																											>
																												{t(
																													"stocks.lowStockAlert",
																												)}
																											</Badge>
																										) : (
																											<Badge
																												variant="outline"
																												className="text-[9px] px-2 py-0.5 border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
																											>
																												{t("stocks.inStock")}
																											</Badge>
																										)}
																									</td>

																									{/* 10. Actions */}
																									<td className="p-3 text-center">
																										<div className="flex items-center justify-center gap-1.5">
																											<Button
																												size="sm"
																												variant="outline"
																												onClick={() =>
																													openVariantMovementsModal(
																														v.variantId,
																														v.variantName,
																														v.sku,
																													)
																												}
																												className="h-7 text-[11px] font-semibold gap-1 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/40 rounded-lg px-2"
																												title={t(
																													"stocks.allMovements",
																												)}
																											>
																												<History className="h-3 w-3" />
																												<span className="hidden lg:inline">
																													{t(
																														"stocks.allMovements",
																													)}
																												</span>
																											</Button>
																											<Button
																												size="sm"
																												onClick={() =>
																													openAdjustModalForVariant(
																														v.variantId,
																														v.variantName,
																														v.sku,
																														{
																															productName:
																																product.productName ||
																																product.name ||
																																v.variantName,
																															unitId:
																																baseUnit?.unitId ||
																																v.unitBreakdown?.[0]?.unitId,
																															unitName:
																																baseUnit?.unitName ||
																																v.unitBreakdown?.[0]?.unitName,
																															availableStock:
																																availableStock,
																															imageUrl:
																																(v.imageUrl ||
																																	product.imageUrl) ??
																																undefined,
																														},
																													)
																												}
																												className="h-7 text-[11px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 shadow-2xs"
																												title={t(
																													"stocks.adjustStock",
																												)}
																											>
																												<Scale className="h-3 w-3" />
																												<span className="hidden lg:inline">
																													{t(
																														"stocks.adjustStock",
																													)}
																												</span>
																											</Button>
																										</div>
																									</td>
																								</tr>
																							);
																						},
																					)}
																				</tbody>
																			</table>
																		</div>
																	) : (
																		/* Variant Cards List */
																		<div className="space-y-3.5">
																			{variants.map((v: StockVariantItem) => {
																				const summary = v.inventorySummary;
																				const units = v.unitBreakdown || [];

																				return (
																					<div
																						key={v.variantId}
																						className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-xs space-y-3 hover:border-purple-300 dark:hover:border-purple-800/60 transition-all"
																					>
																						{/* Row 1: Header (Variant Image, Variant Name, SKUs, Stock Metrics & Main Actions) */}
																						<div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
																							<div className="flex items-start sm:items-center gap-3">
																								<StockProductImage
																									src={extractVariantImageUrl(
																										v,
																										product,
																										productImagesMap,
																									)}
																									alt={v.variantName}
																									className="size-11 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
																								/>
																								<div className="space-y-1.5">
																									<div className="flex items-center gap-2 flex-wrap">
																										<span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
																											{v.variantName}
																										</span>
																										<Badge
																											variant="outline"
																											className="font-mono text-[10px] px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
																										>
																											SKU: {v.sku}
																										</Badge>
																										{v.barcode && (
																											<Badge
																												variant="outline"
																												className="font-mono text-[10px] px-2 py-0.5 text-muted-foreground border-slate-200 dark:border-slate-800"
																											>
																												BAR: {v.barcode}
																											</Badge>
																										)}
																										{summary?.isLowStock && (
																											<Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																												{t(
																													"stocks.lowStockAlert",
																												)}
																											</Badge>
																										)}
																									</div>

																									{/* Key Stock Metrics Ribbon */}
																									{summary && (
																										<div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
																											{/* Unit Cost */}
																											<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs">
																												<Coins className="size-3.5 text-amber-600 dark:text-amber-400" />
																												<span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
																													{t("stocks.unitCost")}
																													:
																												</span>
																												<span className="font-mono font-black text-xs text-amber-900 dark:text-amber-100">
																													$
																													{summary.cost?.toFixed(
																														2,
																													) ?? "0.00"}
																												</span>
																											</div>

																											{/* Physical Stock */}
																											<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
																												<Boxes className="size-3.5 text-blue-600 dark:text-blue-400" />
																												<span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
																													{t("stocks.physical")}
																													:
																												</span>
																												<span className="font-mono font-black text-xs text-blue-900 dark:text-blue-100">
																													{
																														summary.totalPhysicalQty
																													}
																												</span>
																												<span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
																													{summary.baseUnit}
																												</span>
																											</div>

																											{/* Available Stock */}
																											<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs">
																												<CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
																												<span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
																													{t(
																														"stocks.availableQuantity",
																													)}
																													:
																												</span>
																												<span className="font-mono font-black text-xs text-emerald-800 dark:text-emerald-200">
																													{summary.availableQty}
																												</span>
																											</div>

																											{/* Reserved */}
																											<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300">
																												<Receipt className="size-3.5 text-orange-600 dark:text-orange-400" />
																												<span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 dark:text-orange-400">
																													{t(
																														"stocks.reservedQuantity",
																													)}
																													:
																												</span>
																												<span className="font-mono font-black text-xs text-orange-900 dark:text-orange-200">
																													{summary.reservedQty}
																												</span>
																											</div>

																											{/* Sold */}
																											<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-700 dark:text-slate-300">
																												<TrendingUp className="size-3.5 text-slate-600 dark:text-slate-400" />
																												<span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
																													{t(
																														"stocks.soldQuantity",
																													)}
																													:
																												</span>
																												<span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
																													{summary.soldQty}
																												</span>
																											</div>
																										</div>
																									)}
																								</div>
																							</div>

																							{/* Action Buttons */}
																							<div className="flex items-center gap-2 shrink-0">
																								<Button
																									size="sm"
																									variant="outline"
																									onClick={() =>
																										openVariantMovementsModal(
																											v.variantId,
																											v.variantName,
																											v.sku,
																										)
																									}
																									className="h-9 text-xs font-semibold gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/40 rounded-xl px-3.5"
																								>
																									<History className="h-3.5 w-3.5" />{" "}
																									{t("stocks.allMovements")}
																								</Button>

																								<Button
																									size="sm"
																									onClick={() =>
																										openAdjustModalForVariant(
																											v.variantId,
																											v.variantName,
																											v.sku,
																											{
																												productName:
																													product.productName ||
																													product.name ||
																													v.variantName,
																												unitId:
																													v.unitBreakdown?.[0]
																														?.unitId,
																												unitName:
																													v.unitBreakdown?.[0]
																														?.unitName,
																												availableStock:
																													summary?.availableQty ??
																													v.stockQty ??
																													0,
																												imageUrl:
																													(v.imageUrl ||
																														product.imageUrl) ??
																													undefined,
																											},
																										)
																									}
																									className="h-9 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl px-3.5"
																								>
																									<Scale className="h-3.5 w-3.5" />{" "}
																									{t("stocks.adjustStock")}
																								</Button>
																							</div>
																						</div>

																						{/* Row 2: Full Width Packaging Units & Retail Prices (Hierarchical Tree View) */}
																						{(() => {
																							const rawUnits: any[] =
																								v.unitBreakdown ||
																								(v as any).units ||
																								[];
																							if (rawUnits.length === 0)
																								return null;

																							const units = rawUnits.map(
																								(u: any) => {
																									const baseQty = Number(
																										u.baseQuantity ??
																											u.conversionFactor ??
																											1,
																									);
																									const pQty =
																										u.parentQuantity !==
																											undefined &&
																										u.parentQuantity !== null
																											? Number(u.parentQuantity)
																											: null;
																									return {
																										...u,
																										unitId: u.unitId ?? u.id,
																										unitName:
																											u.unitName ||
																											u.name ||
																											"Unit",
																										baseQuantity: baseQty,
																										parentQuantity: pQty,
																										parentUnitId:
																											u.parentUnitId ?? null,
																										parentUnitName:
																											u.parentUnitName ?? null,
																										discountNote:
																											u.discountNote ?? null,
																										sellingPrice: Number(
																											u.sellingPrice ??
																												u.price ??
																												u.finalPrice ??
																												u.unitPrice ??
																												0,
																										),
																										isBase: Boolean(
																											u.isBase ||
																												(baseQty === 1 &&
																													!u.parentUnitId),
																										),
																									};
																								},
																							);

																							// Sort in tree hierarchy order: Base unit first, then children by ascending baseQuantity
																							const sortedUnits = [
																								...units,
																							].sort((a, b) => {
																								if (a.isBase && !b.isBase)
																									return -1;
																								if (!a.isBase && b.isBase)
																									return 1;
																								return (
																									(a.baseQuantity || 1) -
																									(b.baseQuantity || 1)
																								);
																							});

																							return (
																								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
																									{/* Top Bar: Title & Visual Tree Chain */}
																									<div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
																										<div className="flex items-center gap-2">
																											<span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
																												<Tag className="size-3.5 text-purple-600 dark:text-purple-400" />
																												Packaging Units &
																												Conversion Tree
																											</span>
																											<Badge
																												variant="outline"
																												className="text-[10px] font-mono px-1.5 py-0 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
																											>
																												{sortedUnits.length}{" "}
																												units
																											</Badge>
																										</div>

																										{/* Visual Tree Hierarchy Path */}
																										<div className="flex items-center gap-1.5 flex-wrap text-xs">
																											<span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
																												<GitFork className="size-3 text-purple-500" />{" "}
																												Hierarchy:
																											</span>
																											{sortedUnits.map(
																												(u, idx) => {
																													const hasParent =
																														Boolean(
																															u.parentUnitName &&
																																u.parentQuantity,
																														);
																													return (
																														<React.Fragment
																															key={u.unitId}
																														>
																															{idx > 0 && (
																																<ArrowRight className="size-3 text-purple-400 dark:text-purple-600 shrink-0" />
																															)}
																															<div
																																className={cn(
																																	"inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono",
																																	u.isBase
																																		? "bg-purple-100/80 dark:bg-purple-950/70 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold"
																																		: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
																																)}
																															>
																																{u.isBase ? (
																																	<span>
																																		{u.unitName}{" "}
																																		(Base)
																																	</span>
																																) : hasParent ? (
																																	<span>
																																		<strong>
																																			1{" "}
																																			{
																																				u.unitName
																																			}
																																		</strong>{" "}
																																		={" "}
																																		{
																																			u.parentQuantity
																																		}{" "}
																																		{
																																			u.parentUnitName
																																		}
																																	</span>
																																) : (
																																	<span>
																																		<strong>
																																			1{" "}
																																			{
																																				u.unitName
																																			}
																																		</strong>{" "}
																																		={" "}
																																		{
																																			u.baseQuantity
																																		}{" "}
																																		{u.baseUnitName ||
																																			"Base"}
																																	</span>
																																)}
																															</div>
																														</React.Fragment>
																													);
																												},
																											)}
																										</div>
																									</div>

																									{/* Unit Cards Grid */}
																									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
																										{sortedUnits.map((u) => {
																											const hasParent = Boolean(
																												u.parentUnitName &&
																													u.parentQuantity,
																											);
																											const availableQty =
																												summary?.availableQty ??
																												0;
																											const divisor =
																												u.baseQuantity > 0
																													? u.baseQuantity
																													: 1;
																											const availableVal =
																												u.availableEquivalent !==
																													undefined &&
																												u.availableEquivalent !==
																													null
																													? u.availableEquivalent
																													: Math.floor(
																															availableQty /
																																divisor,
																														);

																											const parentQty =
																												u.parentQuantity ??
																												u.baseQuantity;
																											const parentName =
																												u.parentUnitName ||
																												u.baseUnitName ||
																												"Base";
																											const formulaText =
																												u.isBase
																													? `1 ${u.unitName} = 1 ${u.baseUnitName || u.unitName} (Base)`
																													: `1 ${u.unitName} = ${parentQty} ${parentName}`;

																											return (
																												<div
																													key={u.unitId}
																													className={cn(
																														"p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all shadow-2xs",
																														u.isBase
																															? "bg-purple-50/80 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800"
																															: "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700",
																													)}
																												>
																													{/* Unit Header */}
																													<div className="space-y-1.5">
																														<div className="flex items-center justify-between gap-1.5">
																															<div className="flex items-center gap-1.5 min-w-0">
																																<span className="font-extrabold text-xs text-foreground truncate">
																																	{u.unitName}
																																</span>
																																{u.isBase && (
																																	<Badge
																																		variant="secondary"
																																		className="text-[9px] px-1.5 py-0 bg-purple-200/70 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-bold shrink-0"
																																	>
																																		Base
																																	</Badge>
																																)}
																															</div>

																															{/* Base Unit Multiplier Tag */}
																															<span
																																className={cn(
																																	"text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded-md",
																																	u.isBase
																																		? "text-muted-foreground font-medium"
																																		: "font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 dark:border-purple-800/70",
																																)}
																															>
																																×
																																{u.baseQuantity}{" "}
																																{u.baseUnitName ||
																																	sortedUnits.find(
																																		(un) =>
																																			un.isBase,
																																	)?.unitName ||
																																	"Base"}
																															</span>
																														</div>

																														{/* Hierarchical Conversion Formula Ribbon */}
																														<div className="flex items-center justify-between gap-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800/70">
																															<span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
																																{formulaText}
																															</span>
																															{u.discountNote &&
																																u.discountNote !==
																																	"0%" && (
																																	<span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
																																		{
																																			u.discountNote
																																		}
																																	</span>
																																)}
																														</div>
																													</div>

																													{/* Selling Price & Available Equivalent */}
																													<div className="flex items-end justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
																														<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-2xs">
																															<CircleDollarSign className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
																															<span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300 tracking-tight">
																																$
																																{u.sellingPrice?.toFixed(
																																	2,
																																) ?? "0.00"}
																															</span>
																														</div>

																														<span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
																															= {availableVal}{" "}
																															{u.unitName}s
																														</span>
																													</div>
																												</div>
																											);
																										})}
																									</div>
																								</div>
																							);
																						})()}
																					</div>
																				);
																			})}
																		</div>
																	)}
																</div>
															</TableCell>
														</TableRow>
													)}
												</React.Fragment>
											);
										},
									)}
								</TableBody>
							</Table>

							{/* Table Pagination Controls */}
							<div className="flex items-center justify-between p-4 border-t bg-slate-50/50 dark:bg-slate-900/30">
								<p className="text-xs text-muted-foreground">
									Showing page {searchPage + 1} of {searchTotalPages} (
									{searchTotalElements} total products)
								</p>
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={searchPage === 0}
										onClick={() =>
											setSearchPage((prev) => Math.max(0, prev - 1))
										}
										className="h-8 text-xs"
									>
										Previous
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={searchPage >= searchTotalPages - 1}
										onClick={() => setSearchPage((prev) => prev + 1)}
										className="h-8 text-xs"
									>
										Next
									</Button>
								</div>
							</div>
						</div>
					)}
				</ModernTabsContent>

				{/* ============================================================ */}
				{/* TAB 2: LOW STOCK ALERTS (GET /api/v1/stocks/low-stock) */}
				{/* ============================================================ */}
				<ModernTabsContent value="low_stock" className="pt-4 space-y-4">
					<Card className="border-amber-200/80 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
								<AlertTriangle className="h-5 w-5 text-amber-600" />{" "}
								{t("stocks.lowStockAlert")} ({lowStockTotal})
							</CardTitle>
							<CardDescription className="text-xs text-amber-700/80 dark:text-amber-400">
								{t("stocks.subtitle")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{isLoadingLowStock ? (
								<div className="py-12 text-center">
									<Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
								</div>
							) : lowStockProducts.length === 0 ? (
								<div className="py-12 text-center text-xs text-amber-600 dark:text-amber-400">
									{t("common.noResults")}
								</div>
							) : (
								<div className="divide-y divide-amber-200/60 dark:divide-amber-900/40 border rounded-xl overflow-hidden bg-card">
									{lowStockProducts.map((p, idx) => (
										<div key={idx} className="p-4 space-y-2.5">
											<div className="flex items-center gap-3">
												<StockProductImage
													src={extractStockImageUrl(p, productImagesMap)}
													alt={p.productName}
													className="size-9 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
												/>
												<h4 className="font-bold text-sm text-foreground">
													{p.productName}
												</h4>
											</div>
											<div className="space-y-1.5">
												{p.variants?.map((v) => (
													<div
														key={v.variantId}
														className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 text-xs"
													>
														<div className="flex items-center gap-2.5">
															<StockProductImage
																src={extractVariantImageUrl(
																	v,
																	p,
																	productImagesMap,
																)}
																alt={v.variantName}
																className="size-7 rounded-lg border border-border/80 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
															/>
															<div>
																<span className="font-semibold text-foreground">
																	{v.variantName}
																</span>
																<span className="font-mono text-muted-foreground ml-2">
																	SKU: {v.sku}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<Badge
																variant="outline"
																className="border-amber-400 text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 font-bold"
															>
																{t("stocks.quantityOnHand")}:{" "}
																{v.stockQty ??
																	v.inventorySummary?.availableQty ??
																	0}
															</Badge>
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	openVariantMovementsModal(
																		v.variantId,
																		v.variantName,
																		v.sku,
																	)
																}
																className="h-7 text-[11px] text-purple-600 border-purple-200"
															>
																<History className="h-3 w-3 mr-1" />{" "}
																{t("stocks.allMovements")}
															</Button>
															<Button
																size="sm"
																onClick={() =>
																	openAdjustModalForVariant(
																		v.variantId,
																		v.variantName,
																		v.sku,
																		{
																			productName:
																				p.productName ||
																				p.name ||
																				v.variantName,
																			availableStock:
																				v.stockQty ??
																				v.inventorySummary?.availableQty ??
																				0,
																			adjustmentType: "INCREASE",
																			reason: "Physical count discrepancy",
																			notes: "Low stock replenish audit",
																		},
																	)
																}
																className="h-7 text-[11px] bg-amber-600 hover:bg-amber-700 text-white"
															>
																{t("stocks.adjustStock")}
															</Button>
														</div>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</ModernTabsContent>

				{/* ============================================================ */}
				{/* TAB 3: OUT OF STOCK ITEMS (GET /api/v1/stocks/out-of-stock) */}
				{/* ============================================================ */}
				<ModernTabsContent value="out_of_stock" className="pt-4 space-y-4">
					<Card className="border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
								<X className="h-5 w-5 text-rose-600" /> {t("stocks.outOfStock")}{" "}
								({outStockTotal})
							</CardTitle>
							<CardDescription className="text-xs text-rose-700/80 dark:text-rose-400">
								{t("stocks.subtitle")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{isLoadingOutStock ? (
								<div className="py-12 text-center">
									<Loader2 className="h-8 w-8 animate-spin text-rose-600 mx-auto" />
								</div>
							) : outStockProducts.length === 0 ? (
								<div className="py-12 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
									{t("common.noResults")}
								</div>
							) : (
								<div className="divide-y divide-rose-200/60 dark:divide-rose-900/40 border rounded-xl overflow-hidden bg-card">
									{outStockProducts.map((p, idx) => (
										<div key={idx} className="p-4 space-y-2.5">
											<div className="flex items-center gap-3">
												<StockProductImage
													src={extractStockImageUrl(p, productImagesMap)}
													alt={p.productName}
													className="size-9 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
												/>
												<h4 className="font-bold text-sm text-foreground">
													{p.productName}
												</h4>
											</div>
											<div className="space-y-1.5">
												{p.variants?.map((v) => (
													<div
														key={v.variantId}
														className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 text-xs"
													>
														<div className="flex items-center gap-2.5">
															<StockProductImage
																src={extractVariantImageUrl(
																	v,
																	p,
																	productImagesMap,
																)}
																alt={v.variantName}
																className="size-7 rounded-lg border border-border/80 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
															/>

															<div>
																<span className="font-semibold text-foreground">
																	{v.variantName}
																</span>
																<span className="font-mono text-muted-foreground ml-2">
																	SKU: {v.sku}
																</span>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<Badge
																variant="destructive"
																className="font-bold text-[10px]"
															>
																{t("stocks.quantityOnHand")}: 0
															</Badge>
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	openVariantMovementsModal(
																		v.variantId,
																		v.variantName,
																		v.sku,
																	)
																}
																className="h-7 text-[11px] text-purple-600 border-purple-200"
															>
																<History className="h-3 w-3 mr-1" />{" "}
																{t("stocks.allMovements")}
															</Button>
															<Button
																size="sm"
																onClick={() =>
																	openAdjustModalForVariant(
																		v.variantId,
																		v.variantName,
																		v.sku,
																		{
																			productName:
																				p.productName ||
																				p.name ||
																				v.variantName,
																			availableStock: 0,
																			adjustmentType: "INCREASE",
																			reason: "Found stock",
																			notes: "Restock out-of-stock item",
																		},
																	)
																}
																className="h-7 text-[11px] bg-rose-600 hover:bg-rose-700 text-white"
															>
																{t("stocks.adjustStock")}
															</Button>
														</div>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</ModernTabsContent>

				{/* ============================================================ */}
				{/* TAB 4: STOCK ADJUSTMENTS AUDIT VIEW (POST /api/v1/stock-adjustments/search) */}
				{/* ============================================================ */}
				<ModernTabsContent value="adjustments" className="pt-4 space-y-4">
					<StockAdjustmentsAuditView />
				</ModernTabsContent>
			</ModernTabs>

			{/* ============================================================ */}
			{/* DYNAMIC FILTER STUDIO MODAL */}
			{/* ============================================================ */}
			<DynamicFilterModal
				open={isFilterStudioOpen}
				onOpenChange={setIsFilterStudioOpen}
				fields={STOCK_DOMAIN_FILTERS}
				activeFilters={activeFilters}
				onApplyFilters={(filters) => {
					setActiveFilters(filters);
					setSearchPage(0);
				}}
				onResetFilters={() => {
					setActiveFilters([]);
					setSearchPage(0);
				}}
				domainTitle="Stock Search Filter Studio"
				searchValue={search}
			/>

			{/* ============================================================ */}
			{/* VARIANT MOVEMENTS AUDIT PREVIEW MODAL (WITH WAREHOUSE FILTER) */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={!!selectedVariantForMovements}
				onClose={() => setSelectedVariantForMovements(null)}
				title={`${t("stocks.movementHistory")}: ${selectedVariantForMovements?.variantName}`}
				subtitle={`${t("stocks.movementHistorySubtitle")} (${selectedVariantForMovements?.sku})`}
				icon={<History className="h-5 w-5 text-purple-600" />}
				size="2xl"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setSelectedVariantForMovements(null)}
						/>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4">
					{/* Header Controls: Warehouse Filter Dropdown + Movement Type Filter Pills */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<div>
							<ModernSelect
								label={t("stocks.warehouse")}
								value={variantMovementWarehouseFilter}
								onChange={(val) => setVariantMovementWarehouseFilter(val)}
								options={[
									{ value: "ALL", label: t("stocks.allWarehouses") },
									...(warehousesData?.items?.map((w) => ({
										value: String(w.id),
										label: w.name,
									})) || []),
								]}
							/>
						</div>

						<div>
							<Label className="text-xs font-semibold block mb-1.5">
								Filter by Movement Type
							</Label>
							<div className="flex items-center gap-1 flex-wrap">
								{["ALL", "ADJUSTMENT", "PURCHASE", "SALE", "TRANSFER"].map(
									(type) => (
										<Button
											key={type}
											size="sm"
											type="button"
											variant={
												variantMovementTypeFilter === type
													? "default"
													: "outline"
											}
											onClick={() => setVariantMovementTypeFilter(type)}
											className={cn(
												"h-8 text-[11px] font-semibold px-2",
												variantMovementTypeFilter === type &&
													"bg-purple-600 text-white",
											)}
										>
											{type}
										</Button>
									),
								)}
							</div>
						</div>
					</div>

					{/* Active Endpoint Info Badge */}
					<div className="flex items-center justify-between text-[11px] text-muted-foreground bg-purple-50/50 dark:bg-purple-950/20 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
						<span>
							API Endpoint:{" "}
							<code className="font-mono text-purple-600 dark:text-purple-400">
								GET /api/v1/stock-movements/variant/
								{selectedVariantForMovements?.variantId}
								{variantMovementWarehouseFilter !== "ALL"
									? `/warehouse/${variantMovementWarehouseFilter}`
									: ""}
							</code>
						</span>
						<span>{variantMovements.length} Record(s)</span>
					</div>

					{/* Movements Timeline Table */}
					{isLoadingVariantMovements ? (
						<div className="py-12 text-center">
							<Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
						</div>
					) : variantMovements.length === 0 ? (
						<div className="py-12 text-center text-xs text-muted-foreground">
							No movement logs recorded for this variant under the selected
							warehouse or movement type filter.
						</div>
					) : (
						<div className="border rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
							{variantMovements.map((m) => (
								<div
									key={m.id}
									className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
								>
									<div className="flex items-center justify-between gap-2 flex-wrap">
										<div className="flex items-center gap-2">
											<Badge
												variant="outline"
												className="font-mono text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
											>
												{m.movementType}
											</Badge>
											<span className="font-semibold text-foreground flex items-center gap-1">
												<WarehouseIcon className="size-3 text-slate-400" />
												{m.warehouseName ||
													(m.warehouseId
														? `Warehouse #${m.warehouseId}`
														: "Central Warehouse")}
											</span>
										</div>

										<span className="text-[10px] text-muted-foreground font-mono">
											{m.createdAt
												? new Date(m.createdAt).toLocaleString()
												: "N/A"}
										</span>
									</div>

									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg text-[11px]">
										<div>
											<span className="text-muted-foreground block text-[10px]">
												Qty Change:
											</span>
											<strong
												className={cn(
													m.quantityChange >= 0
														? "text-emerald-600 font-bold"
														: "text-rose-600 font-bold",
												)}
											>
												{m.quantityChange >= 0
													? `+${m.quantityChange}`
													: m.quantityChange}
											</strong>
										</div>

										<div>
											<span className="text-muted-foreground block text-[10px]">
												Qty Before / After:
											</span>
											<span>
												{m.quantityBefore} → <strong>{m.quantityAfter}</strong>
											</span>
										</div>

										<div>
											<span className="text-muted-foreground block text-[10px]">
												Cost Before / After:
											</span>
											<span>
												${m.avgCostBefore?.toFixed(2) || "0.00"} →{" "}
												<strong>${m.avgCostAfter?.toFixed(2) || "0.00"}</strong>
											</span>
										</div>

										<div>
											<span className="text-muted-foreground block text-[10px]">
												Ref ID:
											</span>
											<span className="font-mono truncate block">
												{m.referenceId || "—"}
											</span>
										</div>
									</div>

									{m.note && (
										<p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded border border-slate-200/50 dark:border-slate-800">
											{m.note}
										</p>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</ModernModal>

			{/* ============================================================ */}
			{/* DYNAMIC STOCK ADJUSTMENT STUDIO MODAL (POST /api/v1/stocks/adjust) */}
			{/* ============================================================ */}
			<DynamicInventoryStudioModal
				open={isAdjustModalOpen}
				onOpenChange={(open) => {
					setIsAdjustModalOpen(open);
					if (!open) setInitialAdjustItems(null);
				}}
				mode="ADJUSTMENT"
				referencePrefix="ADJ"
				defaultAdjustmentType="DECREASE"
				defaultReason="Inventory audit"
				defaultNotes="Monthly physical count"
				initialItems={initialAdjustItems || undefined}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["stocks"] });
					queryClient.invalidateQueries({ queryKey: ["stocks-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["stocks-low-stock-v1"] });
					queryClient.invalidateQueries({
						queryKey: ["stocks-out-of-stock-v1"],
					});
					queryClient.invalidateQueries({
						queryKey: ["stock-movements-general"],
					});
					queryClient.invalidateQueries({ queryKey: ["variant-movements"] });
					setInitialAdjustItems(null);
				}}
			/>

			{/* ============================================================ */}
			{/* DYNAMIC IMPORT SHIPMENT STUDIO MODAL */}
			{/* ============================================================ */}
			<DynamicInventoryStudioModal
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
				mode="IMPORT"
				referencePrefix="IMP"
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
					queryClient.invalidateQueries({ queryKey: ["stocks"] });
					queryClient.invalidateQueries({ queryKey: ["stocks-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
				}}
			/>
		</div>
	);
}

export default function StockPage() {
	return (
		<Suspense
			fallback={
				<div className="p-8 text-center text-xs text-muted-foreground">
					Loading stock inventory...
				</div>
			}
		>
			<StockPageContent />
		</Suspense>
	);
}

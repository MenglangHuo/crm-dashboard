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
import {
	DynamicInventoryStudioModal,
	StockProductDetailModal,
} from "@/components/inventory";
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
	Package,
	Percent,
	Sparkles,
	Eye,
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

export interface NormalizedStockUnit {
	unitId: number | string;
	unitName: string;
	symbol?: string;
	isBase: boolean;
	baseQuantity: number;
	parentUnitId: number | string | null;
	parentUnitName: string | null;
	parentQuantity: number | null;
	sellingPrice: number;
	pricePerBaseUnit: number;
	savingsPercent: number | null;
	formulaText: string;
	discountNote?: string | null;
	availableWhole: number;
	availableRemainder: number;
	availableEquivalentStr: string;
}

export interface NormalizedVariantStockData {
	baseUnit: NormalizedStockUnit;
	packageUnits: NormalizedStockUnit[];
	allUnits: NormalizedStockUnit[];
	basePrice: number;
	cost: number;
	physicalStock: number;
	availableStock: number;
	reservedStock: number;
	soldStock: number;
	isOutOfStock: boolean;
	isLowStock: boolean;
	smartStockDecomposition: string;
}

function getNormalizedVariantStockData(
	v: StockVariantItem,
	parentProduct?: StockProductItem,
	variantDetailsMap?: Map<string | number, any>,
): NormalizedVariantStockData {
	const summary = v.inventorySummary;
	const vKey = v.variantId || v.sku;
	const matchedVariant =
		variantDetailsMap?.get(vKey) ||
		(v.variantId ? variantDetailsMap?.get(String(v.variantId)) : null) ||
		(v.sku ? variantDetailsMap?.get(v.sku.toLowerCase().trim()) : null);

	// Collect raw units from all potential sources
	const rawUnitsList: any[] = [
		...(Array.isArray(v.unitBreakdown) ? v.unitBreakdown : []),
		...(Array.isArray((v as any).units) ? (v as any).units : []),
		...(Array.isArray(matchedVariant?.units) ? matchedVariant.units : []),
		...(Array.isArray(matchedVariant?.productUnits) ? matchedVariant.productUnits : []),
	];

	// Deduplicate raw units by unitId
	const deduplicatedUnitsMap = new Map<string | number, any>();
	rawUnitsList.forEach((u: any) => {
		const uId = u.unitId ?? u.id;
		if (uId && !deduplicatedUnitsMap.has(String(uId))) {
			deduplicatedUnitsMap.set(String(uId), u);
		}
	});

	let rawUnits: any[] = Array.from(deduplicatedUnitsMap.values());

	// If no units were found, create a sensible default base unit from inventorySummary or variant
	if (rawUnits.length === 0) {
		const fallbackBaseName = summary?.baseUnit || "Pcs";
		rawUnits = [
			{
				unitId: 1,
				unitName: fallbackBaseName,
				isBase: true,
				baseQuantity: 1,
				sellingPrice: Number(
					(v as any).sellingPrice ??
						(v as any).price ??
						(v as any).sellPrice ??
						matchedVariant?.sellingPrice ??
						matchedVariant?.price ??
						0,
				),
			},
		];
	}

	// 1. Initial mapping of units
	const mappedUnits = rawUnits.map((u: any) => {
		const baseQty = Math.max(1, Number(u.baseQuantity ?? u.conversionFactor ?? 1));
		const pQty =
			u.parentQuantity !== undefined && u.parentQuantity !== null
				? Number(u.parentQuantity)
				: null;

		// Try to resolve price from unit, matchedVariant, or product
		let price = Number(
			u.sellingPrice ??
				u.price ??
				u.finalPrice ??
				u.sellPrice ??
				u.unitPrice ??
				u.basePrice ??
				0,
		);

		// If unit has no price, check if matchedVariant has unitPrices
		if ((price === 0 || isNaN(price)) && matchedVariant?.unitPrices) {
			const uPriceObj = matchedVariant.unitPrices.find(
				(up: any) => String(up.unitId) === String(u.unitId ?? u.id),
			);
			if (uPriceObj) {
				price = Number(
					uPriceObj.finalPrice ??
						uPriceObj.unitPrice ??
						uPriceObj.price ??
						uPriceObj.sellPrice ??
						0,
				);
			}
		}

		// Check if marked as base
		const isBase = Boolean(
			u.isBase ||
				u.is_base ||
				(u.unitId && u.baseUnitId && String(u.unitId) === String(u.baseUnitId)) ||
				(baseQty === 1 && !u.parentUnitId),
		);

		return {
			unitId: u.unitId ?? u.id,
			unitName:
				u.unitName ||
				u.name ||
				(isBase && summary?.baseUnit ? summary.baseUnit : "Unit"),
			symbol: u.symbol || "",
			baseQuantity: baseQty,
			parentQuantity: pQty,
			parentUnitId: u.parentUnitId ?? null,
			parentUnitName: u.parentUnitName ?? null,
			discountNote: u.discountNote ?? null,
			sellingPrice: isNaN(price) ? 0 : price,
			isBase,
		};
	});

	// Ensure there is at least one base unit
	let baseUnitCandidate = mappedUnits.find((u) => u.isBase);
	if (!baseUnitCandidate) {
		baseUnitCandidate = mappedUnits
			.slice()
			.sort((a, b) => a.baseQuantity - b.baseQuantity)[0];
		if (baseUnitCandidate) baseUnitCandidate.isBase = true;
	}

	// If base unit price is 0, check variant-level fallback price
	if (baseUnitCandidate && baseUnitCandidate.sellingPrice === 0) {
		const fallbackVarPrice = Number(
			(v as any).sellingPrice ??
				(v as any).price ??
				(v as any).sellPrice ??
				matchedVariant?.sellingPrice ??
				matchedVariant?.price ??
				0,
		);
		if (fallbackVarPrice > 0) {
			baseUnitCandidate.sellingPrice = fallbackVarPrice;
		}
	}

	const baseUnitPrice = baseUnitCandidate?.sellingPrice ?? 0;
	const baseUnitName =
		baseUnitCandidate?.unitName || summary?.baseUnit || "Pcs";

	// Map of unit names by unitId for parentUnitName resolution
	const unitNameMap = new Map<string | number, string>();
	mappedUnits.forEach((u) => {
		unitNameMap.set(String(u.unitId), u.unitName);
	});

	// Stock quantities
	const availableStock = summary?.availableQty ?? v.stockQty ?? 0;
	const physicalStock = summary?.totalPhysicalQty ?? v.stockQty ?? 0;
	const reservedStock = summary?.reservedQty ?? 0;
	const soldStock = summary?.soldQty ?? 0;
	const isOutOfStock = availableStock <= 0;
	const isLowStock =
		Boolean(summary?.isLowStock) ||
		(availableStock > 0 &&
			availableStock <= (summary?.lowStockThreshold ?? 5));

	// 2. Final normalization with parent names, price per base unit, formulas, and conversions
	const normalizedUnits: NormalizedStockUnit[] = mappedUnits.map((u) => {
		// Resolve parent unit name
		let parentName = u.parentUnitName;
		if (
			!parentName &&
			u.parentUnitId &&
			unitNameMap.has(String(u.parentUnitId))
		) {
			parentName = unitNameMap.get(String(u.parentUnitId))!;
		}
		if (!parentName && !u.isBase) {
			parentName = baseUnitName;
		}

		// Resolve price: if a package unit has price 0, but base price is > 0, estimate it
		let unitPrice = u.sellingPrice;
		if (
			unitPrice === 0 &&
			!u.isBase &&
			baseUnitPrice > 0 &&
			u.baseQuantity > 1
		) {
			unitPrice = baseUnitPrice * u.baseQuantity;
		}

		const pricePerBaseUnit =
			u.isBase || u.baseQuantity <= 1
				? unitPrice
				: unitPrice / u.baseQuantity;

		// Calculate savings percent vs single base unit
		let savingsPercent: number | null = null;
		if (!u.isBase && baseUnitPrice > 0 && pricePerBaseUnit < baseUnitPrice) {
			savingsPercent = Math.round(
				((baseUnitPrice - pricePerBaseUnit) / baseUnitPrice) * 100,
			);
		}

		// Construct accurate, readable formula text
		let formulaText = "";
		if (u.isBase) {
			formulaText = `1 ${u.unitName} (Base)`;
		} else {
			const pQty = u.parentQuantity ?? u.baseQuantity;
			const isParentDifferentFromBase =
				parentName &&
				parentName !== baseUnitName &&
				u.baseQuantity !== pQty;

			if (isParentDifferentFromBase) {
				formulaText = `1 ${u.unitName} = ${pQty} ${parentName} (${u.baseQuantity} ${baseUnitName})`;
			} else {
				formulaText = `1 ${u.unitName} = ${pQty} ${parentName || baseUnitName}`;
			}
		}

		// Available count in this unit
		const divisor = u.baseQuantity > 0 ? u.baseQuantity : 1;
		const availableWhole = Math.floor(availableStock / divisor);
		const availableRemainder = availableStock % divisor;
		const availableEquivalentStr = u.isBase
			? `${availableStock} ${u.unitName}`
			: availableWhole > 0
				? `${availableWhole} ${u.unitName}${availableRemainder > 0 ? ` + ${availableRemainder} ${baseUnitName}` : ""}`
				: `${availableRemainder} ${baseUnitName}`;

		return {
			...u,
			parentUnitName: parentName,
			sellingPrice: unitPrice,
			pricePerBaseUnit,
			savingsPercent,
			formulaText,
			availableWhole,
			availableRemainder,
			availableEquivalentStr,
		};
	});

	// Sort units: base first, then by ascending baseQuantity
	normalizedUnits.sort((a, b) => {
		if (a.isBase && !b.isBase) return -1;
		if (!a.isBase && b.isBase) return 1;
		return a.baseQuantity - b.baseQuantity;
	});

	const finalBaseUnit =
		normalizedUnits.find((u) => u.isBase) || normalizedUnits[0];
	const packageUnits = normalizedUnits.filter((u) => !u.isBase);

	// Smart stock decomposition (e.g. 245 Pcs = 2 Boxes, 4 Packs, 5 Pcs)
	let smartStockDecomposition = "";
	if (availableStock <= 0) {
		smartStockDecomposition = `0 ${baseUnitName}`;
	} else if (packageUnits.length === 0) {
		smartStockDecomposition = `${availableStock} ${baseUnitName}`;
	} else {
		// Sort package units descending by baseQuantity
		const descPkgUnits = packageUnits
			.slice()
			.sort((a, b) => b.baseQuantity - a.baseQuantity);
		let rem = availableStock;
		const parts: string[] = [];
		for (const pu of descPkgUnits) {
			if (pu.baseQuantity <= 1) continue;
			const count = Math.floor(rem / pu.baseQuantity);
			if (count > 0) {
				parts.push(`${count} ${pu.unitName}`);
				rem = rem % pu.baseQuantity;
			}
		}
		if (rem > 0 || parts.length === 0) {
			parts.push(`${rem} ${baseUnitName}`);
		}
		smartStockDecomposition = parts.join(", ");
	}

	return {
		baseUnit: finalBaseUnit,
		packageUnits,
		allUnits: normalizedUnits,
		basePrice: finalBaseUnit.sellingPrice,
		cost: summary?.cost ?? 0,
		physicalStock,
		availableStock,
		reservedStock,
		soldStock,
		isOutOfStock,
		isLowStock,
		smartStockDecomposition,
	};
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

	// Product Detail Pop-up Modal State
	const [selectedProductForModal, setSelectedProductForModal] =
		useState<StockProductItem | null>(null);

	// ------------------------------------------------------------
	// Master Data Queries (Lazy loaded only when modals/studio are active)
	// ------------------------------------------------------------
	const isFilterOrModalActive =
		isFilterStudioOpen ||
		isAdjustModalOpen ||
		isImportDialogOpen ||
		!!selectedVariantForMovements ||
		!!selectedProductForModal;

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

	// Variant details lookup map (by id, variantId, sku) to enrich units and pricing if stock search summary omits them
	const variantDetailsMap = useMemo(() => {
		const map = new Map<string | number, any>();
		const items = productsData?.items || [];
		items.forEach((p: any) => {
			if (Array.isArray(p.variants)) {
				p.variants.forEach((v: any) => {
					if (v.id) {
						map.set(v.id, v);
						map.set(String(v.id), v);
					}
					if (v.variantId) {
						map.set(v.variantId, v);
						map.set(String(v.variantId), v);
					}
					if (v.sku) {
						map.set(v.sku, v);
						map.set(String(v.sku).toLowerCase().trim(), v);
					}
				});
			}
		});
		return map;
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
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
						<Boxes className="size-7 text-primary" />
						<span>{t("stocks.title", "Stock & Inventory")}</span>
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
						{t("stocks.subtitle", "Real-time warehouse stock balance, low-stock warnings, inventory adjustments, and transfers.")}
					</p>
				</div>
			</div>

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
														onClick={() => setSelectedProductForModal(product)}
														className={cn(
															"cursor-pointer transition-colors hover:bg-purple-50/40 dark:hover:bg-purple-950/20 group",
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
																title={
																	isExpanded
																		? "Collapse variants"
																		: "Expand variants"
																}
															>
																{isExpanded ? (
																	<ChevronDown className="size-4" />
																) : (
																	<ChevronRight className="size-4" />
																)}
															</Button>
														</TableCell>

														<TableCell>
															<div className="flex items-center justify-between gap-3">
																<div className="flex items-center gap-3 min-w-0">
																	<StockProductImage
																		src={extractStockImageUrl(
																			product,
																			productImagesMap,
																		)}
																		alt={product.productName || "Product"}
																		className="size-9 rounded-lg border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
																	/>

																	<div className="min-w-0">
																		<p className="font-bold text-xs text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-2 truncate">
																			<span>{product.productName}</span>
																		</p>
																		<span className="text-[10px] text-muted-foreground block font-mono">
																			Click to view product details
																		</span>
																	</div>
																</div>

																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={(e) => {
																		e.stopPropagation();
																		setSelectedProductForModal(product);
																	}}
																	className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg gap-1 shrink-0"
																>
																	<Eye className="size-3.5" />
																	<span>Details</span>
																</Button>
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

																		<div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={() => setSelectedProductForModal(product)}
																				className="h-8 text-xs font-semibold gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/40 rounded-xl px-3"
																			>
																				<Eye className="size-3.5" />
																				<span>Product Details</span>
																			</Button>

																			{/* View Mode Switcher Tabs */}
																			<div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
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
																							const stockData =
																								getNormalizedVariantStockData(
																									v,
																									product,
																									variantDetailsMap,
																								);
																							const {
																								baseUnit,
																								packageUnits,
																								basePrice,
																								cost,
																								physicalStock,
																								availableStock,
																								reservedStock,
																								soldStock,
																								isOutOfStock,
																								isLowStock,
																								smartStockDecomposition,
																							} = stockData;

																							return (
																								<tr
																									key={v.variantId}
																									className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
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
																												className="size-9 rounded-lg border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
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
																										<div className="space-y-1.5 max-w-[280px]">
																											<div className="flex items-center gap-1.5 flex-wrap">
																												<Badge
																													variant="outline"
																													className="text-[10px] font-bold px-1.5 py-0 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 flex items-center gap-1"
																												>
																													<Package className="size-3 text-purple-500" />
																													{baseUnit.unitName} (Base)
																												</Badge>
																												{packageUnits.length > 0 && (
																													<span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 font-mono">
																														+{packageUnits.length}{" "}
																														{packageUnits.length === 1
																															? "unit"
																															: "units"}
																													</span>
																												)}
																											</div>
																											{packageUnits.length > 0 && (
																												<div className="flex flex-col gap-1">
																													{packageUnits.map((pu) => (
																														<div
																															key={pu.unitId}
																															className="inline-flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
																														>
																															<span className="font-medium truncate">
																																{pu.formulaText}
																															</span>
																															{pu.savingsPercent &&
																															pu.savingsPercent > 0 ? (
																																<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/80 shrink-0">
																																	Save {pu.savingsPercent}%
																																</span>
																															) : null}
																														</div>
																													))}
																												</div>
																											)}
																										</div>
																									</td>

																									{/* 3. Unit Cost */}
																									<td className="p-3 text-right">
																										<div className="inline-flex flex-col items-end">
																											<span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
																												${cost.toFixed(2)}
																											</span>
																											<span className="text-[9px] font-medium text-muted-foreground mt-0.5">
																												/{baseUnit.unitName}
																											</span>
																										</div>
																									</td>

																									{/* 4. Retail Price */}
																									<td className="p-3 text-right">
																										<div className="flex flex-col items-end gap-1">
																											<div className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
																												<span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300">
																													${basePrice.toFixed(2)}
																												</span>
																												<span className="text-[10px] text-muted-foreground font-medium">
																													/{baseUnit.unitName}
																												</span>
																											</div>
																											{packageUnits.length > 0 && (
																												<div className="flex flex-col items-end gap-0.5 font-mono text-[10px]">
																													{packageUnits.map((pu) => (
																														<div
																															key={pu.unitId}
																															className="flex items-center gap-1 text-slate-600 dark:text-slate-400"
																														>
																															<span className="font-semibold text-slate-700 dark:text-slate-300">
																																{pu.unitName}:
																															</span>
																															<span className="font-bold text-emerald-600 dark:text-emerald-400">
																																${pu.sellingPrice.toFixed(2)}
																															</span>
																															<span className="text-[9px] text-muted-foreground">
																																($
																																{pu.pricePerBaseUnit.toFixed(
																																	2,
																																)}
																																/{baseUnit.unitName})
																															</span>
																														</div>
																													))}
																												</div>
																											)}
																										</div>
																									</td>

																									{/* 5. Physical Stock (On Hand) */}
																									<td className="p-3 text-right">
																										<div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
																											{physicalStock}{" "}
																											<span className="text-[10px] font-normal text-muted-foreground">
																												{baseUnit.unitName}
																											</span>
																										</div>
																									</td>

																									{/* 6. Available Stock (Remain) */}
																									<td className="p-3 text-right">
																										<div
																											className={cn(
																												"font-mono font-black text-sm",
																												isOutOfStock
																													? "text-rose-600 dark:text-rose-400"
																													: "text-emerald-600 dark:text-emerald-400",
																											)}
																										>
																											{availableStock}{" "}
																											<span className="text-[10px] font-semibold">
																												{baseUnit.unitName}
																											</span>
																										</div>
																										{/* Smart decomposition across packaging units */}
																										{packageUnits.length > 0 &&
																											availableStock > 0 && (
																												<div
																													className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-mono mt-0.5 bg-purple-50/70 dark:bg-purple-950/40 px-1.5 py-0.2 rounded border border-purple-200/60 dark:border-purple-800/60"
																													title={smartStockDecomposition}
																												>
																													<span className="text-purple-500 font-sans font-bold">
																														≈
																													</span>
																													<span className="truncate max-w-[140px]">
																														{smartStockDecomposition}
																													</span>
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
																												className="text-[9px] px-2 py-0.5 font-bold shadow-2xs"
																											>
																												{t("stocks.outOfStock")}
																											</Badge>
																										) : isLowStock ? (
																											<Badge
																												variant="outline"
																												className="text-[9px] px-2 py-0.5 border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 font-bold shadow-2xs"
																											>
																												{t("stocks.lowStockAlert")}
																											</Badge>
																										) : (
																											<Badge
																												variant="outline"
																												className="text-[9px] px-2 py-0.5 border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold shadow-2xs"
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
																																baseUnit.unitId,
																															unitName:
																																baseUnit.unitName,
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
																				const stockData =
																					getNormalizedVariantStockData(
																						v,
																						product,
																						variantDetailsMap,
																					);
																				const {
																					baseUnit,
																					packageUnits,
																					allUnits,
																					basePrice,
																					cost,
																					physicalStock,
																					availableStock,
																					reservedStock,
																					soldStock,
																					isOutOfStock,
																					isLowStock,
																					smartStockDecomposition,
																				} = stockData;

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
																										{isOutOfStock ? (
																											<Badge
																												variant="destructive"
																												className="text-[10px] font-bold px-2 py-0.5 shadow-2xs"
																											>
																												{t("stocks.outOfStock")}
																											</Badge>
																										) : isLowStock ? (
																											<Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
																												{t(
																													"stocks.lowStockAlert",
																												)}
																											</Badge>
																										) : (
																											<Badge
																												variant="outline"
																												className="text-[10px] font-bold px-2 py-0.5 border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs"
																											>
																												{t("stocks.inStock")}
																											</Badge>
																										)}
																									</div>

																									{/* Key Stock Metrics Ribbon */}
																									<div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
																										{/* Unit Cost */}
																										<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs">
																											<Coins className="size-3.5 text-amber-600 dark:text-amber-400" />
																											<span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
																												{t("stocks.unitCost")}:
																											</span>
																											<span className="font-mono font-black text-xs text-amber-900 dark:text-amber-100">
																												${cost.toFixed(2)}
																											</span>
																											<span className="text-[9px] text-muted-foreground">
																												/{baseUnit.unitName}
																											</span>
																										</div>

																										{/* Physical Stock */}
																										<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
																											<Boxes className="size-3.5 text-blue-600 dark:text-blue-400" />
																											<span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
																												{t("stocks.physical")}:
																											</span>
																											<span className="font-mono font-black text-xs text-blue-900 dark:text-blue-100">
																												{physicalStock}
																											</span>
																											<span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">
																												{baseUnit.unitName}
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
																												{availableStock}{" "}
																												{baseUnit.unitName}
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
																												{reservedStock}
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
																												{soldStock}
																											</span>
																										</div>
																									</div>
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
																													baseUnit.unitId,
																												unitName:
																													baseUnit.unitName,
																												availableStock:
																													availableStock,
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
																						<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
																							{/* Top Bar: Title & Visual Tree Chain */}
																							<div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
																								<div className="flex items-center gap-2">
																									<span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
																										<Tag className="size-3.5 text-purple-600 dark:text-purple-400" />
																										Packaging Units & Conversion
																										Tree
																									</span>
																									<Badge
																										variant="outline"
																										className="text-[10px] font-mono px-1.5 py-0 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
																									>
																										{allUnits.length} units
																									</Badge>
																								</div>

																								{/* Visual Tree Hierarchy Path */}
																								<div className="flex items-center gap-1.5 flex-wrap text-xs">
																									<span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
																										<GitFork className="size-3 text-purple-500" />{" "}
																										Hierarchy:
																									</span>
																									{allUnits.map((u, idx) => (
																										<React.Fragment key={u.unitId}>
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
																												{u.formulaText}
																											</div>
																										</React.Fragment>
																									))}
																								</div>
																							</div>

																							{/* Unit Cards Grid */}
																							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
																								{allUnits.map((u) => {
																									return (
																										<div
																											key={u.unitId}
																											className={cn(
																												"p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all shadow-2xs hover:shadow-xs",
																												u.isBase
																													? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/90 dark:border-purple-800/80"
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
																														× {u.baseQuantity}{" "}
																														{baseUnit.unitName}
																													</span>
																												</div>

																												{/* Hierarchical Conversion Formula Ribbon */}
																												<div className="flex items-center justify-between gap-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800/70">
																													<span className="text-slate-700 dark:text-slate-300 font-semibold truncate">
																														{u.formulaText}
																													</span>
																													{u.savingsPercent &&
																														u.savingsPercent >
																															0 && (
																															<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/80 shrink-0 flex items-center gap-0.5">
																																<Sparkles className="size-2.5" />
																																Save{" "}
																																{
																																	u.savingsPercent
																																}
																																%
																															</span>
																														)}
																												</div>
																											</div>

																											{/* Selling Price & Available Equivalent */}
																											<div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
																												<div className="flex items-center justify-between gap-1">
																													<div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
																														<CircleDollarSign className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
																														<span className="font-mono font-black text-xs text-emerald-700 dark:text-emerald-300">
																															$
																															{u.sellingPrice.toFixed(
																																2,
																															)}
																														</span>
																													</div>
																													{!u.isBase && (
																														<span className="text-[10px] font-mono text-muted-foreground">
																															($
																															{u.pricePerBaseUnit.toFixed(
																																2,
																															)}
																															/
																															{
																																baseUnit.unitName
																															}
																															)
																														</span>
																													)}
																												</div>

																												<div className="flex items-center justify-between gap-1 text-[11px] font-mono">
																													<span className="text-[10px] text-muted-foreground">
																														Stock:
																													</span>
																													<span className="font-bold text-emerald-600 dark:text-emerald-400 truncate text-right">
																														={" "}
																														{
																															u.availableEquivalentStr
																														}
																													</span>
																												</div>
																											</div>
																										</div>
																									);
																								})}
																							</div>
																						</div>
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
											<div
												onClick={() => setSelectedProductForModal(p)}
												className="flex items-center justify-between gap-3 cursor-pointer group"
											>
												<div className="flex items-center gap-3 min-w-0">
													<StockProductImage
														src={extractStockImageUrl(p, productImagesMap)}
														alt={p.productName}
														className="size-9 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
													/>
													<div>
														<h4 className="font-bold text-sm text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
															<span>{p.productName}</span>
														</h4>
														<span className="text-[10px] text-muted-foreground block font-mono">
															Click to view product details
														</span>
													</div>
												</div>

												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedProductForModal(p);
													}}
													className="h-7 text-xs font-semibold gap-1 text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900/60 dark:hover:bg-amber-950/40 rounded-lg px-2.5 shrink-0"
												>
													<Eye className="size-3.5" />
													<span>View Details</span>
												</Button>
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
											<div
												onClick={() => setSelectedProductForModal(p)}
												className="flex items-center justify-between gap-3 cursor-pointer group"
											>
												<div className="flex items-center gap-3 min-w-0">
													<StockProductImage
														src={extractStockImageUrl(p, productImagesMap)}
														alt={p.productName}
														className="size-9 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
													/>
													<div>
														<h4 className="font-bold text-sm text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors flex items-center gap-2">
															<span>{p.productName}</span>
														</h4>
														<span className="text-[10px] text-muted-foreground block font-mono">
															Click to view product details
														</span>
													</div>
												</div>

												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedProductForModal(p);
													}}
													className="h-7 text-xs font-semibold gap-1 text-rose-700 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-950/40 rounded-lg px-2.5 shrink-0"
												>
													<Eye className="size-3.5" />
													<span>View Details</span>
												</Button>
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

			{/* ============================================================ */}
			{/* ENHANCED PRODUCT DETAILS MODAL */}
			{/* ============================================================ */}
			<StockProductDetailModal
				isOpen={!!selectedProductForModal}
				onClose={() => setSelectedProductForModal(null)}
				product={selectedProductForModal}
				productImagesMap={productImagesMap}
				variantDetailsMap={variantDetailsMap}
				onAdjustStock={(variantId, variantName, sku, options) => {
					openAdjustModalForVariant(variantId, variantName, sku, options);
				}}
				onViewMovements={(
					variantId,
					variantName,
					sku,
					warehouseId,
					warehouseName,
				) => {
					openVariantMovementsModal(
						variantId,
						variantName,
						sku,
						warehouseId,
						warehouseName,
					);
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

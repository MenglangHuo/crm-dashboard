"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	productsApi,
	safeImageUrl,
	DEFAULT_IMAGE_URL,
} from "@/lib/api/endpoints";
import {
	StockProductItem,
	StockVariantItem,
	StockWarehouseBreakdown,
	Product,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	Boxes,
	Warehouse as WarehouseIcon,
	AlertTriangle,
	History,
	TrendingUp,
	SlidersHorizontal,
	CheckCircle2,
	Scale,
	Tag,
	Coins,
	CircleDollarSign,
	Receipt,
	ArrowRight,
	GitFork,
	Layers,
	Package,
	Sparkles,
	Info,
	Check,
	AlertCircle,
	Calendar,
	Barcode,
	ExternalLink,
	ShieldCheck,
	Building2,
	Eye,
	ChevronDown,
	ChevronRight,
	CornerDownRight,
	Percent,
	LayoutList,
	Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

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

export function getNormalizedVariantStockData(
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

	const mappedUnits = rawUnits.map((u: any) => {
		const baseQty = Math.max(1, Number(u.baseQuantity ?? u.conversionFactor ?? 1));
		const pQty =
			u.parentQuantity !== undefined && u.parentQuantity !== null
				? Number(u.parentQuantity)
				: null;

		let price = Number(
			u.sellingPrice ??
				u.price ??
				u.finalPrice ??
				u.sellPrice ??
				u.unitPrice ??
				u.basePrice ??
				0,
		);

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

	let baseUnitCandidate = mappedUnits.find((u) => u.isBase);
	if (!baseUnitCandidate) {
		baseUnitCandidate = mappedUnits
			.slice()
			.sort((a, b) => a.baseQuantity - b.baseQuantity)[0];
		if (baseUnitCandidate) baseUnitCandidate.isBase = true;
	}

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

	const unitNameMap = new Map<string | number, string>();
	mappedUnits.forEach((u) => {
		unitNameMap.set(String(u.unitId), u.unitName);
	});

	const availableStock = summary?.availableQty ?? v.stockQty ?? 0;
	const physicalStock = summary?.totalPhysicalQty ?? v.stockQty ?? 0;
	const reservedStock = summary?.reservedQty ?? 0;
	const soldStock = summary?.soldQty ?? 0;
	const isOutOfStock = availableStock <= 0;
	const isLowStock =
		Boolean(summary?.isLowStock) ||
		(availableStock > 0 &&
			availableStock <= (summary?.lowStockThreshold ?? 5));

	const normalizedUnits: NormalizedStockUnit[] = mappedUnits.map((u) => {
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

		let savingsPercent: number | null = null;
		if (!u.isBase && baseUnitPrice > 0 && pricePerBaseUnit < baseUnitPrice) {
			savingsPercent = Math.round(
				((baseUnitPrice - pricePerBaseUnit) / baseUnitPrice) * 100,
			);
		}

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

	normalizedUnits.sort((a, b) => {
		if (a.isBase && !b.isBase) return -1;
		if (!a.isBase && b.isBase) return 1;
		return a.baseQuantity - b.baseQuantity;
	});

	const finalBaseUnit =
		normalizedUnits.find((u) => u.isBase) || normalizedUnits[0];
	const packageUnits = normalizedUnits.filter((u) => !u.isBase);

	let smartStockDecomposition = "";
	if (availableStock <= 0) {
		smartStockDecomposition = `0 ${baseUnitName}`;
	} else if (packageUnits.length === 0) {
		smartStockDecomposition = `${availableStock} ${baseUnitName}`;
	} else {
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

export interface StockProductDetailModalProps {
	isOpen: boolean;
	onClose: () => void;
	product: StockProductItem | null;
	productImagesMap?: Map<string | number, any>;
	variantDetailsMap?: Map<string | number, any>;
	onAdjustStock?: (
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
	) => void;
	onViewMovements?: (
		variantId: number,
		variantName: string,
		sku: string,
		warehouseId?: number | string,
		warehouseName?: string,
	) => void;
}

export function StockProductDetailModal({
	isOpen,
	onClose,
	product,
	productImagesMap,
	variantDetailsMap,
	onAdjustStock,
	onViewMovements,
}: StockProductDetailModalProps) {
	const { t } = useTranslation();

	// State for toggling individual variant units tree / dropdowns
	const [expandedVariants, setExpandedVariants] = useState<
		Record<string | number, boolean>
	>({});

	// State for Unit Hierarchy tab view mode (tree vs table)
	const [unitHierarchyViewMode, setUnitHierarchyViewMode] = useState<
		"tree" | "table"
	>("table");

	const toggleVariantExpanded = (variantId: number | string) => {
		setExpandedVariants((prev) => ({
			...prev,
			[variantId]: prev[variantId] !== undefined ? !prev[variantId] : false,
		}));
	};

	const isVariantTreeExpanded = (variantId: number | string) => {
		if (expandedVariants[variantId] !== undefined) {
			return expandedVariants[variantId];
		}
		return variants.length === 1;
	};

	// Resolve product identifier (numeric id or UUID)
	const rawProdId = product?.productId ?? (product as any)?.id;
	const prodId = rawProdId ? String(rawProdId) : undefined;

	// Query full product master data if product ID exists
	const { data: fullProduct } = useQuery<Product | null>({
		queryKey: ["product-detail-modal", prodId],
		queryFn: () => (prodId ? productsApi.get(prodId) : Promise.resolve(null)),
		enabled: !!prodId && isOpen,
		staleTime: 60 * 1000,
	});

	// Merged product representation
	const variants = product?.variants || [];
	const resolvedTitle =
		fullProduct?.name ||
		product?.productName ||
		product?.name ||
		t("products.productDetails", "Product Details");
	const resolvedCategory =
		fullProduct?.categoryName ||
		(fullProduct as any)?.category?.name ||
		(product as any)?.categoryName ||
		null;
	const resolvedSubCategory =
		fullProduct?.subCategoryName ||
		(fullProduct as any)?.subCategory?.name ||
		null;
	const resolvedBrand =
		fullProduct?.brandName ||
		(fullProduct as any)?.brand?.name ||
		(product as any)?.brandName ||
		null;
	const resolvedDescription =
		fullProduct?.description || (product as any)?.description || null;
	const resolvedSku =
		fullProduct?.baseSku ||
		(product as any)?.baseSku ||
		variants[0]?.sku ||
		"—";
	const resolvedBarcode =
		fullProduct?.baseBarcode ||
		(product as any)?.baseBarcode ||
		variants[0]?.barcode ||
		null;
	const resolvedUuid = fullProduct?.uuid || product?.productUuid || null;

	// Aggregated stock metrics across all variants
	const {
		totalPhysical,
		totalAvailable,
		totalReserved,
		totalSold,
		isOutOfStock,
		isLowStock,
		totalCostValue,
		totalRetailValue,
		avgMarginPct,
		primaryUnitName,
	} = useMemo(() => {
		let physical = 0;
		let available = 0;
		let reserved = 0;
		let sold = 0;
		let costVal = 0;
		let retailVal = 0;
		let anyLowStock = false;
		let pUnit = "Pcs";

		variants.forEach((v) => {
			const s = v.inventorySummary;
			const vPhys = s?.totalPhysicalQty ?? v.stockQty ?? 0;
			const vAvail = s?.availableQty ?? v.stockQty ?? 0;
			const vRes = s?.reservedQty ?? 0;
			const vSold = s?.soldQty ?? 0;
			const vCost = s?.cost ?? 0;

			physical += vPhys;
			available += vAvail;
			reserved += vRes;
			sold += vSold;

			if (s?.baseUnit) pUnit = s.baseUnit;

			const data = getNormalizedVariantStockData(
				v,
				product || undefined,
				variantDetailsMap,
			);
			const vPrice = data.basePrice;

			costVal += vCost * vPhys;
			retailVal += vPrice * vAvail;

			if (data.isLowStock) anyLowStock = true;
		});

		const out = available <= 0;
		const low = !out && (anyLowStock || available <= 5);
		const marginAmt = retailVal - costVal;
		const marginPct = retailVal > 0 ? (marginAmt / retailVal) * 100 : 0;

		return {
			totalPhysical: physical,
			totalAvailable: available,
			totalReserved: reserved,
			totalSold: sold,
			isOutOfStock: out,
			isLowStock: low,
			totalCostValue: costVal,
			totalRetailValue: retailVal,
			avgMarginPct: marginPct,
			primaryUnitName: pUnit,
		};
	}, [variants, product, variantDetailsMap]);

	// Multi-warehouse distribution aggregation
	const warehouseStats = useMemo(() => {
		const map = new Map<
			string | number,
			{
				warehouseId: string | number;
				warehouseName: string;
				availableQty: number;
				reservedQty: number;
				physicalQty: number;
			}
		>();

		variants.forEach((v) => {
			if (Array.isArray(v.warehouseBreakdown) && v.warehouseBreakdown.length > 0) {
				v.warehouseBreakdown.forEach((wb: StockWarehouseBreakdown) => {
					const key = wb.warehouseId || wb.warehouseName;
					const existing = map.get(key) || {
						warehouseId: wb.warehouseId,
						warehouseName: wb.warehouseName || `Warehouse #${wb.warehouseId}`,
						availableQty: 0,
						reservedQty: 0,
						physicalQty: 0,
					};
					existing.availableQty += wb.availableQty || 0;
					existing.reservedQty += wb.reservedQty || 0;
					existing.physicalQty +=
						(wb.availableQty || 0) + (wb.reservedQty || 0);
					map.set(key, existing);
				});
			}
		});

		return Array.from(map.values());
	}, [variants]);

	// Resolved product main image
	const mainImageUrl = useMemo(() => {
		const raw =
			fullProduct?.imageUrl ||
			product?.imageUrl ||
			(product as any)?.thumbnail ||
			(product as any)?.image ||
			variants[0]?.imageUrl ||
			"";

		if (raw && safeImageUrl(raw) !== DEFAULT_IMAGE_URL) {
			return safeImageUrl(raw);
		}

		if (productImagesMap && prodId) {
			const entry =
				productImagesMap.get(prodId) ||
				productImagesMap.get(Number(prodId)) ||
				productImagesMap.get(String(prodId));
			if (entry?.imageUrl && safeImageUrl(entry.imageUrl) !== DEFAULT_IMAGE_URL) {
				return safeImageUrl(entry.imageUrl);
			}
		}

		return DEFAULT_IMAGE_URL;
	}, [fullProduct, product, variants, productImagesMap, prodId]);

	// All units for the first variant (for unit conversion preview)
	const firstVariantStockData = useMemo(() => {
		if (variants.length === 0) return null;
		return getNormalizedVariantStockData(
			variants[0],
			product || undefined,
			variantDetailsMap,
		);
	}, [variants, product, variantDetailsMap]);

	if (!product && !isOpen) return null;

	const firstVar = variants[0];

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				<div className="flex items-center gap-2.5 flex-wrap">
					<span className="truncate">{resolvedTitle}</span>
					{isOutOfStock ? (
						<Badge
							variant="destructive"
							className="text-[10px] font-bold px-2 py-0.5 shadow-2xs"
						>
							{t("stocks.outOfStock", "Out of Stock")}
						</Badge>
					) : isLowStock ? (
						<Badge className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
							{t("stocks.lowStockAlert", "Low Stock")}
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-[10px] font-bold px-2 py-0.5 border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-2xs"
						>
							{t("stocks.inStock", "In Stock")}
						</Badge>
					)}
				</div>
			}
			subtitle={
				<span className="inline-flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
					{resolvedCategory && (
						<span className="font-semibold text-purple-600 dark:text-purple-400">
							{resolvedCategory}
							{resolvedSubCategory ? ` › ${resolvedSubCategory}` : ""}
						</span>
					)}
					{resolvedBrand && (
						<>
							<span>•</span>
							<span className="font-medium text-slate-700 dark:text-slate-300">
								{resolvedBrand}
							</span>
						</>
					)}
					<span>•</span>
					<span className="font-mono text-slate-500">SKU: {resolvedSku}</span>
				</span>
			}
			icon={
				<div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 shadow-2xs">
					<Package className="size-5" />
				</div>
			}
			size="2xl"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={onClose}
						label={t("common.close", "Close")}
					/>

					{firstVar && onViewMovements && (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								onClose();
								onViewMovements(
									firstVar.variantId,
									firstVar.variantName,
									firstVar.sku,
								);
							}}
							className="h-9 text-xs font-semibold gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/40 rounded-xl px-4 cursor-pointer"
						>
							<History className="size-3.5" />
							<span>{t("stocks.allMovements", "All Movements")}</span>
						</Button>
					)}

					{firstVar && onAdjustStock && (
						<Button
							type="button"
							onClick={() => {
								onClose();
								onAdjustStock(
									firstVar.variantId,
									firstVar.variantName,
									firstVar.sku,
									{
										productName: resolvedTitle,
										unitName: primaryUnitName,
										availableStock: totalAvailable,
										imageUrl:
											mainImageUrl !== DEFAULT_IMAGE_URL
												? mainImageUrl
												: undefined,
									},
								);
							}}
							className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 shadow-xs cursor-pointer"
						>
							<Scale className="size-3.5" />
							<span>{t("stocks.adjustStock", "Adjust Stock")}</span>
						</Button>
					)}
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* ============================================================ */}
				{/* 1. COMPACT PRODUCT OVERVIEW & ATTRIBUTES */}
				{/* ============================================================ */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
					{/* Product Image Preview */}
					<div className="size-16 sm:size-20 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1.5">
						{mainImageUrl !== DEFAULT_IMAGE_URL ? (
							<img
								src={mainImageUrl}
								alt={resolvedTitle}
								className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
								loading="lazy"
								onError={(e) => {
									e.currentTarget.onerror = null;
									e.currentTarget.src = DEFAULT_IMAGE_URL;
								}}
							/>
						) : (
							<div className="flex flex-col items-center justify-center text-purple-500">
								<Boxes className="size-8" />
							</div>
						)}
					</div>

					{/* Product Meta Details & Tag Badges */}
					<div className="flex-1 min-w-0 space-y-1.5">
						<div className="flex items-center gap-2 flex-wrap">
							<h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
								{resolvedTitle}
							</h4>
							{fullProduct?.isActive !== undefined && (
								<Badge
									variant="outline"
									className={cn(
										"text-[10px] font-semibold py-0 px-1.5",
										fullProduct.isActive
											? "border-emerald-200 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50"
											: "border-slate-200 text-slate-500 bg-slate-100",
									)}
								>
									{fullProduct.isActive
										? t("common.active", "Active")
										: t("common.inactive", "Inactive")}
								</Badge>
							)}
							<Badge
								variant="secondary"
								className="text-[10px] font-semibold py-0 px-2 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800"
							>
								{variants.length}{" "}
								{variants.length === 1 ? "Variant" : "Variants"}
							</Badge>
						</div>

						{resolvedDescription && (
							<p className="text-xs text-muted-foreground line-clamp-1 leading-normal">
								{resolvedDescription}
							</p>
						)}

						<div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap pt-0.5">
							<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
								SKU: <strong>{resolvedSku}</strong>
							</span>
							{resolvedBarcode && (
								<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 flex items-center gap-1">
									<Barcode className="size-3 text-slate-400" />
									<strong>{resolvedBarcode}</strong>
								</span>
							)}
							{fullProduct?.model && (
								<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
									Model: {fullProduct.model}
								</span>
							)}
							{fullProduct?.condition && (
								<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
									Condition: {fullProduct.condition}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* ============================================================ */}
				{/* 2. EXECUTIVE STOCK KPI & VALUATION STRIP */}
				{/* ============================================================ */}
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
					{/* Available */}
					<div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
							<CheckCircle2 className="size-3" />
							{t("stocks.availableQuantity", "Available")}
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
								{totalAvailable}
							</span>
							<span className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-300/80">
								{primaryUnitName}
							</span>
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Salable inventory
						</p>
					</div>

					{/* Physical / On Hand */}
					<div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
							<Boxes className="size-3 text-slate-400" />
							{t("stocks.quantityOnHand", "On Hand")}
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-lg font-black font-mono text-slate-800 dark:text-slate-200">
								{totalPhysical}
							</span>
							<span className="text-[11px] font-semibold text-muted-foreground">
								{primaryUnitName}
							</span>
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Warehouse count
						</p>
					</div>

					{/* Reserved */}
					<div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
							<Receipt className="size-3" />
							{t("stocks.reservedQuantity", "Reserved")}
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-lg font-black font-mono text-amber-700 dark:text-amber-300">
								{totalReserved}
							</span>
							<span className="text-[11px] font-semibold text-muted-foreground">
								{primaryUnitName}
							</span>
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Order allocations
						</p>
					</div>

					{/* Retail Valuation */}
					<div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
							<CircleDollarSign className="size-3" />
							Retail Value
						</span>
						<div className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
							${totalRetailValue.toFixed(2)}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Gross retail price
						</p>
					</div>

					{/* Cost & Margin */}
					<div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xs space-y-0.5">
						<div className="flex items-center justify-between">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Cost Value
							</span>
							{avgMarginPct > 0 && (
								<Badge
									variant="outline"
									className="text-[9px] font-bold font-mono px-1 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
								>
									{avgMarginPct.toFixed(0)}%
								</Badge>
							)}
						</div>
						<div className="text-lg font-black font-mono text-amber-700 dark:text-amber-300">
							${totalCostValue.toFixed(2)}
						</div>
						<p className="text-[10px] text-muted-foreground truncate">
							Inventory valuation
						</p>
					</div>
				</div>

				{/* ============================================================ */}
				{/* 3. STRUCTURED TABS (PRODUCT VARIANTS, UNIT HIERARCHY, SPECS) */}
				{/* ============================================================ */}
				<ModernTabs defaultValue="variants">
					<ModernTabsList
						variant="pills"
						size="md"
						className="w-full justify-start border-b border-slate-200/80 dark:border-slate-800 pb-1 mb-3"
					>
						<ModernTabsTrigger
							value="variants"
							icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
							badge={variants.length}
							badgeColor="purple"
						>
							{t("products.productVariants", "Product Variants")}
						</ModernTabsTrigger>

						{firstVariantStockData && (
							<ModernTabsTrigger
								value="units"
								icon={<Layers className="h-3.5 w-3.5" />}
								badge={firstVariantStockData.allUnits.length}
								badgeColor="emerald"
							>
								{t("products.unitHierarchy", "Unit Hierarchy")}
							</ModernTabsTrigger>
						)}

						<ModernTabsTrigger
							value="details"
							icon={<Info className="h-3.5 w-3.5" />}
						>
							{t("products.overviewSpecs", "Overview Specs")}
						</ModernTabsTrigger>
					</ModernTabsList>

					{/* ------------------------------------------------------------ */}
					{/* TAB 1: PRODUCT VARIANTS (CLEAN VARIANT ROWS & RATES TABLE) */}
					{/* ------------------------------------------------------------ */}
					<ModernTabsContent value="variants" className="space-y-3 mt-0">
						{variants.map((v) => {
							const stockData = getNormalizedVariantStockData(
								v,
								product || undefined,
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
								isOutOfStock: vOut,
								isLowStock: vLow,
								smartStockDecomposition,
							} = stockData;

							const isTreeExpanded = isVariantTreeExpanded(v.variantId);

							return (
								<div
									key={v.variantId}
									className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
								>
									{/* Top Header Row */}
									<div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
										<div className="flex items-center gap-3 min-w-0">
											<div className="size-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
												{v.imageUrl ? (
													<img
														src={safeImageUrl(v.imageUrl)}
														alt={v.variantName}
														className="h-full w-full object-cover"
														onError={(e) => {
															e.currentTarget.onerror = null;
															e.currentTarget.src = DEFAULT_IMAGE_URL;
														}}
													/>
												) : (
													<Package className="size-5 text-purple-500" />
												)}
											</div>

											<div className="space-y-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<h5 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
														{v.variantName}
													</h5>
													<Badge
														variant="outline"
														className="text-[10px] font-mono px-1.5 py-0 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
													>
														SKU: {v.sku}
													</Badge>
													{vOut ? (
														<Badge
															variant="destructive"
															className="text-[9px] px-2 py-0.5 font-bold"
														>
															Out of Stock
														</Badge>
													) : vLow ? (
														<Badge
															variant="outline"
															className="text-[9px] px-2 py-0.5 border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 font-bold"
														>
															Low Stock
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="text-[9px] px-2 py-0.5 border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 font-bold"
														>
															In Stock
														</Badge>
													)}
												</div>

												{/* Quick Metrics Bar */}
												<div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-wrap">
													<span>
														On Hand:{" "}
														<strong className="text-slate-900 dark:text-slate-100">
															{physicalStock} {baseUnit.unitName}
														</strong>
													</span>
													<span>•</span>
													<span>
														Available:{" "}
														<strong className="text-emerald-600 dark:text-emerald-400">
															{availableStock} {baseUnit.unitName}
														</strong>
													</span>
													{reservedStock > 0 && (
														<>
															<span>•</span>
															<span>
																Reserved:{" "}
																<strong className="text-amber-600">
																	{reservedStock}
																</strong>
															</span>
														</>
													)}
													<span>•</span>
													<span>
														Price:{" "}
														<strong className="text-emerald-600 font-bold">
															${basePrice.toFixed(2)}
														</strong>
													</span>
													{cost > 0 && (
														<>
															<span>•</span>
															<span>
																Cost:{" "}
																<strong className="text-amber-700 dark:text-amber-300">
																	${cost.toFixed(2)}
																</strong>
															</span>
														</>
													)}
												</div>
											</div>
										</div>

										{/* Action buttons */}
										<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
											{onViewMovements && (
												<Button
													size="sm"
													variant="outline"
													onClick={() => {
														onClose();
														onViewMovements(v.variantId, v.variantName, v.sku);
													}}
													className="h-8 text-[11px] font-semibold gap-1.5 rounded-xl px-3 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
													title={t("stocks.allMovements", "Movement Logs")}
												>
													<History className="size-3.5 text-purple-500" />
													<span>Logs</span>
												</Button>
											)}

											{onAdjustStock && (
												<Button
													size="sm"
													onClick={() => {
														onClose();
														onAdjustStock(v.variantId, v.variantName, v.sku, {
															productName: resolvedTitle,
															unitId: baseUnit.unitId,
															unitName: baseUnit.unitName,
															availableStock: availableStock,
															imageUrl: v.imageUrl || undefined,
														});
													}}
													className="h-8 text-[11px] font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3.5 shadow-2xs cursor-pointer"
													title={t("stocks.adjustStock", "Adjust Stock")}
												>
													<Scale className="size-3.5" />
													<span>Adjust</span>
												</Button>
											)}
										</div>
									</div>

									{/* Packaging Rates Strip / Toggle Button */}
									{allUnits.length > 1 && (
										<div className="border-t border-slate-100 dark:border-slate-800">
											<button
												type="button"
												onClick={() => toggleVariantExpanded(v.variantId)}
												className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-850/50 dark:hover:bg-slate-800/60 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
											>
												<div className="flex items-center gap-2">
													<GitFork className="size-3.5 text-purple-500" />
													<span>
														Packaging Units & Conversion ({allUnits.length})
													</span>
													{smartStockDecomposition && availableStock > 0 && (
														<span className="text-[11px] font-mono text-purple-700 dark:text-purple-300 hidden sm:inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800">
															<Sparkles className="size-2.5 text-purple-500" />
															<span>≈ {smartStockDecomposition}</span>
														</span>
													)}
												</div>

												<div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-bold">
													<span>
														{isTreeExpanded
															? "Hide Details"
															: "View Packaging Rates"}
													</span>
													<ChevronDown
														className={cn(
															"size-3.5 transition-transform duration-200",
															isTreeExpanded && "rotate-180",
														)}
													/>
												</div>
											</button>

											{isTreeExpanded && (
												<div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
													<table className="w-full text-xs text-left min-w-[540px]">
														<thead className="bg-slate-50/80 dark:bg-slate-850/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-slate-100 dark:border-slate-800">
															<tr>
																<th className="py-2 px-3.5">Unit</th>
																<th className="py-2 px-3">Conversion Ratio</th>
																<th className="py-2 px-3 text-right">Selling Price</th>
																<th className="py-2 px-3 text-center">Incentive</th>
																<th className="py-2 px-3.5 text-right">In-Stock Breakdown</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
															{allUnits.map((u) => (
																<tr
																	key={u.unitId}
																	className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
																>
																	<td className="py-2 px-3.5 font-bold text-slate-800 dark:text-slate-200">
																		<div className="flex items-center gap-2">
																			<div
																				className={cn(
																					"size-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0",
																					u.isBase
																						? "bg-purple-600 text-white"
																						: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
																				)}
																			>
																				{u.symbol ||
																					u.unitName.slice(0, 2).toUpperCase()}
																			</div>
																			<span>{u.unitName}</span>
																			{u.isBase ? (
																				<Badge
																					variant="secondary"
																					className="text-[9px] px-1 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold"
																				>
																					Base
																				</Badge>
																			) : (
																				<span className="text-[10px] font-mono text-muted-foreground">
																					×{u.baseQuantity}
																				</span>
																			)}
																		</div>
																	</td>

																	<td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">
																		{u.formulaText}
																	</td>

																	<td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
																		${u.sellingPrice.toFixed(2)}
																		{!u.isBase && (
																			<span className="text-[10px] text-muted-foreground block font-normal">
																				(${u.pricePerBaseUnit.toFixed(2)}/{baseUnit.unitName})
																			</span>
																		)}
																	</td>

																	<td className="py-2 px-3 text-center">
																		{u.savingsPercent && u.savingsPercent > 0 ? (
																			<Badge
																				variant="outline"
																				className="text-[9px] font-bold font-mono px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
																			>
																				Save {u.savingsPercent}%
																			</Badge>
																		) : (
																			<span className="text-slate-400">—</span>
																		)}
																	</td>

																	<td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
																		{u.availableEquivalentStr}
																	</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</ModernTabsContent>

					{/* ------------------------------------------------------------ */}
					{/* TAB 2: UNIT HIERARCHY (COMPREHENSIVE SPECS & CONVERSIONS) */}
					{/* ------------------------------------------------------------ */}
					{firstVariantStockData && (
						<ModernTabsContent value="units" className="space-y-4 mt-0">
							{/* Top Metric & Decomposition Banner */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
									<div className="flex items-center gap-2">
										<Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
										<h4 className="font-bold text-xs uppercase tracking-wider text-purple-900 dark:text-purple-200">
											Smart Stock Decomposition
										</h4>
									</div>
									<p className="text-base font-black font-mono text-purple-900 dark:text-purple-100">
										{firstVariantStockData.availableStock}{" "}
										{firstVariantStockData.baseUnit.unitName} ≈{" "}
										{firstVariantStockData.smartStockDecomposition}
									</p>
									<p className="text-[11px] text-muted-foreground">
										Multi-tier packaging representation of total salable units.
									</p>
								</div>

								<div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1 shadow-2xs">
									<div className="flex items-center gap-2">
										<Package className="size-4 text-emerald-600 dark:text-emerald-400" />
										<h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
											Base Reference Unit
										</h4>
									</div>
									<p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
										1 {firstVariantStockData.baseUnit.unitName} (Smallest Inventory Unit)
									</p>
									<p className="text-[11px] text-muted-foreground">
										All packaging units scale from this base unit with fixed conversion factors.
									</p>
								</div>
							</div>

							{/* Horizontal Conversion Flow Chain */}
							<div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
								<div className="flex items-center justify-between">
									<h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
										<GitFork className="size-3.5 text-purple-500" />
										Conversion Hierarchy Flow
									</h4>
									<div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
										<button
											type="button"
											onClick={() => setUnitHierarchyViewMode("table")}
											className={cn(
												"h-6 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
												unitHierarchyViewMode === "table"
													? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900",
											)}
										>
											<TableIcon className="size-3" />
											<span>Table</span>
										</button>
										<button
											type="button"
											onClick={() => setUnitHierarchyViewMode("tree")}
											className={cn(
												"h-6 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
												unitHierarchyViewMode === "tree"
													? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900",
											)}
										>
											<LayoutList className="size-3" />
											<span>Cards</span>
										</button>
									</div>
								</div>

								{/* Step Chain Stepper */}
								<div className="flex items-center gap-2 flex-wrap text-xs pt-1">
									{firstVariantStockData.allUnits.map((u, idx) => (
										<React.Fragment key={u.unitId}>
											{idx > 0 && (
												<ArrowRight className="size-3.5 text-purple-400 dark:text-purple-600 shrink-0" />
											)}
											<div
												className={cn(
													"inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono shadow-2xs",
													u.isBase
														? "bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold"
														: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300",
												)}
											>
												<span className="font-bold">{u.unitName}</span>
												<span className="text-[11px] text-muted-foreground">
													{u.isBase ? "(Base Unit)" : `(×${u.baseQuantity})`}
												</span>
												{u.savingsPercent && u.savingsPercent > 0 && (
													<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-200">
														Save {u.savingsPercent}%
													</span>
												)}
											</div>
										</React.Fragment>
									))}
								</div>
							</div>

							{/* Presentation Mode: Table vs Cards */}
							{unitHierarchyViewMode === "table" ? (
								<div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
									<div className="overflow-x-auto">
										<table className="w-full text-xs text-left min-w-[700px]">
											<thead className="bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">
												<tr>
													<th className="p-3">Unit Name</th>
													<th className="p-3">Hierarchy / Role</th>
													<th className="p-3">Conversion Formula</th>
													<th className="p-3 text-right">Selling Price</th>
													<th className="p-3 text-right">Price / Base Unit</th>
													<th className="p-3 text-center">Savings %</th>
													<th className="p-3 text-right">Available Stock</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
												{firstVariantStockData.allUnits.map((u) => (
													<tr
														key={u.unitId}
														className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
													>
														<td className="p-3 font-bold text-slate-900 dark:text-slate-100">
															<div className="flex items-center gap-2">
																<div
																	className={cn(
																		"size-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0",
																		u.isBase
																			? "bg-purple-600 text-white"
																			: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
																	)}
																>
																	{u.symbol ||
																		u.unitName.slice(0, 2).toUpperCase()}
																</div>
																<span>{u.unitName}</span>
															</div>
														</td>

														<td className="p-3">
															{u.isBase ? (
																<Badge
																	variant="secondary"
																	className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold"
																>
																	Base Standard
																</Badge>
															) : (
																<Badge
																	variant="outline"
																	className="text-[10px] px-2 py-0.5 font-mono text-slate-700 dark:text-slate-300"
																>
																	Tier (×{u.baseQuantity})
																</Badge>
															)}
														</td>

														<td className="p-3 font-mono text-slate-600 dark:text-slate-400">
															{u.formulaText}
														</td>

														<td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
															${u.sellingPrice.toFixed(2)}
														</td>

														<td className="p-3 text-right font-mono text-muted-foreground">
															${u.pricePerBaseUnit.toFixed(2)} /{" "}
															{firstVariantStockData.baseUnit.unitName}
														</td>

														<td className="p-3 text-center">
															{u.savingsPercent && u.savingsPercent > 0 ? (
																<Badge
																	variant="outline"
																	className="text-[10px] font-bold font-mono px-2 py-0.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
																>
																	Save {u.savingsPercent}%
																</Badge>
															) : (
																<span className="text-muted-foreground">—</span>
															)}
														</td>

														<td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
															{u.availableEquivalentStr}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{firstVariantStockData.allUnits.map((u) => (
										<div
											key={u.unitId}
											className={cn(
												"p-4 rounded-2xl border transition-all shadow-2xs space-y-3",
												u.isBase
													? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
													: "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800",
											)}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2.5">
													<div
														className={cn(
															"size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
															u.isBase
																? "bg-purple-600 text-white"
																: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
														)}
													>
														{u.symbol || u.unitName.slice(0, 2).toUpperCase()}
													</div>
													<div>
														<h5 className="font-bold text-sm text-foreground">
															{u.unitName}
														</h5>
														<p className="text-[11px] font-mono text-muted-foreground">
															{u.formulaText}
														</p>
													</div>
												</div>
												{u.isBase ? (
													<Badge
														variant="secondary"
														className="text-[9px] px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold"
													>
														Base Unit
													</Badge>
												) : u.savingsPercent && u.savingsPercent > 0 ? (
													<Badge
														variant="outline"
														className="text-[9px] font-bold font-mono px-1.5 py-0 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
													>
														Save {u.savingsPercent}%
													</Badge>
												) : null}
											</div>

											<div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
												<div>
													<span className="text-[10px] text-muted-foreground block font-sans">
														Selling Price
													</span>
													<strong className="text-emerald-600 dark:text-emerald-400 font-bold">
														${u.sellingPrice.toFixed(2)}
													</strong>
													{!u.isBase && (
														<span className="text-[10px] text-muted-foreground block font-normal">
															(${u.pricePerBaseUnit.toFixed(2)}/
															{firstVariantStockData.baseUnit.unitName})
														</span>
													)}
												</div>
												<div className="text-right">
													<span className="text-[10px] text-muted-foreground block font-sans">
														Available Stock
													</span>
													<strong className="text-slate-900 dark:text-slate-100 font-bold">
														{u.availableEquivalentStr}
													</strong>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</ModernTabsContent>
					)}

					{/* ------------------------------------------------------------ */}
					{/* TAB 3: OVERVIEW SPECIFICATIONS & ATTRIBUTES */}
					{/* ------------------------------------------------------------ */}
					<ModernTabsContent value="details" className="space-y-4 mt-0">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* System Metadata Card */}
							<div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
								<h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b pb-2 dark:border-slate-800">
									<Package className="h-4 w-4 text-purple-500" />
									System Classification
								</h4>
								<div className="space-y-2">
									{prodId && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Product ID:</span>
											<strong className="font-mono">#{prodId}</strong>
										</div>
									)}
									{resolvedUuid && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">UUID:</span>
											<span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
												{resolvedUuid}
											</span>
										</div>
									)}
									{resolvedCategory && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Category:</span>
											<span className="font-semibold text-purple-600 dark:text-purple-400">
												{resolvedCategory}
											</span>
										</div>
									)}
									{resolvedSubCategory && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Subcategory:</span>
											<span className="font-semibold">{resolvedSubCategory}</span>
										</div>
									)}
									{resolvedBrand && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Brand:</span>
											<span className="font-semibold text-sky-600 dark:text-sky-400">
												{resolvedBrand}
											</span>
										</div>
									)}
									<div className="flex justify-between py-1">
										<span className="text-muted-foreground">Stock Status:</span>
										<Badge
											variant="outline"
											className={cn(
												"text-[10px] font-bold",
												isOutOfStock
													? "border-rose-400 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
													: isLowStock
														? "border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
														: "border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40",
											)}
										>
											{isOutOfStock
												? "OUT_OF_STOCK"
												: isLowStock
													? "LOW_STOCK"
													: "IN_STOCK"}
										</Badge>
									</div>
								</div>
							</div>

							{/* Physical Attributes & Options */}
							<div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
								<h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b pb-2 dark:border-slate-800">
									<Tag className="h-4 w-4 text-emerald-500" />
									Product Attributes & Tags
								</h4>
								<div className="space-y-2">
									{fullProduct?.model && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Model:</span>
											<span className="font-semibold">{fullProduct.model}</span>
										</div>
									)}
									{fullProduct?.serialNumber && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Serial No:</span>
											<span className="font-mono">{fullProduct.serialNumber}</span>
										</div>
									)}
									{fullProduct?.condition && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Condition:</span>
											<span className="font-semibold">
												{fullProduct.condition}
											</span>
										</div>
									)}
									{fullProduct?.year && (
										<div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
											<span className="text-muted-foreground">Year:</span>
											<span>{fullProduct.year}</span>
										</div>
									)}

									{/* Dynamic Attribute Axes */}
									{fullProduct?.attributeAxes &&
									fullProduct.attributeAxes.length > 0 ? (
										<div className="space-y-1.5 pt-1">
											<span className="text-muted-foreground block text-[11px]">
												Attribute Axes:
											</span>
											{fullProduct.attributeAxes.map(
												(axis: any, idx: number) => (
													<div
														key={idx}
														className="flex items-center gap-1.5"
													>
														<span className="font-bold text-slate-700 dark:text-slate-300">
															{axis.name}:
														</span>
														<div className="flex flex-wrap gap-1">
															{axis.options?.map(
																(opt: any, oIdx: number) => (
																	<Badge
																		key={oIdx}
																		variant="secondary"
																		className="text-[10px] bg-slate-100 dark:bg-slate-800"
																	>
																		{opt.value}
																	</Badge>
																),
															)}
														</div>
													</div>
												),
											)}
										</div>
									) : null}

									{/* Tags */}
									{Array.isArray(fullProduct?.tags) &&
									fullProduct.tags.length > 0 ? (
										<div className="space-y-1.5 pt-1">
											<span className="text-muted-foreground block text-[11px]">
												Tags:
											</span>
											<div className="flex flex-wrap gap-1.5">
												{fullProduct.tags.map((tg: string, i: number) => (
													<Badge
														key={i}
														variant="outline"
														className="text-[10px] bg-slate-50 dark:bg-slate-800"
													>
														#{tg}
													</Badge>
												))}
											</div>
										</div>
									) : null}
								</div>
							</div>
						</div>

						{/* Warehouse Inventory Location Summary Card */}
						<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
							<div className="flex items-center justify-between">
								<h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
									<Building2 className="size-4 text-purple-500" />
									Warehouse Location Details
								</h5>
								<span className="text-[11px] font-mono text-muted-foreground">
									Total Available:{" "}
									<strong className="text-emerald-600 dark:text-emerald-400">
										{totalAvailable} {primaryUnitName}
									</strong>
								</span>
							</div>

							{warehouseStats.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
									{warehouseStats.map((wh) => (
										<div
											key={wh.warehouseId}
											className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between text-xs"
										>
											<div className="flex items-center gap-2">
												<WarehouseIcon className="size-3.5 text-purple-500" />
												<span className="font-semibold text-foreground">
													{wh.warehouseName}
												</span>
											</div>
											<span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
												{wh.availableQty} {primaryUnitName}
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850/40 text-xs text-muted-foreground border border-slate-100 dark:border-slate-800">
									<div className="flex items-center gap-2">
										<WarehouseIcon className="size-3.5 text-purple-500" />
										<span>Consolidated in Central Warehouse</span>
									</div>
									<Badge
										variant="outline"
										className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
									>
										In Stock
									</Badge>
								</div>
							)}
						</div>
					</ModernTabsContent>
				</ModernTabs>
			</div>
		</ModernModal>
	);
}

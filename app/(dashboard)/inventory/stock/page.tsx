"use client";

import {
	DynamicInventoryStudioModal,
	StockProductDetailModal,
} from "@/components/inventory";
import { StockAdjustmentsAuditView } from "@/components/inventory/stock-adjustments-audit-view";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DEFAULT_IMAGE_URL,
	brandsApi,
	categoriesApi,
	productsApi,
	safeImageUrl,
	stockMovementsApi,
	stocksApi,
	warehousesApi,
} from "@/lib/api/endpoints";
import {
	StockMovementVariantItem,
	StockProductItem,
	StockVariantItem,
} from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	ArrowDown,
	ArrowLeftRight,
	ArrowRight,
	ArrowUp,
	ArrowUpDown,
	Boxes,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Clock,
	DollarSign,
	Eye,
	Flame,
	History,
	Info,
	Layers,
	Loader2,
	MoreHorizontal,
	Package,
	PackagePlus,
	Receipt,
	RefreshCw,
	Scale,
	Search,
	ShoppingBag,
	SlidersHorizontal,
	Sparkles,
	Tag,
	Truck,
	Warehouse as WarehouseIcon,
	X
} from "lucide-react";
import React, { Suspense, useMemo, useState } from "react";
import { formatQuantityToUnitBreakdown } from "@/lib/product-unit-pricing";

import { PermissionGate } from "@/components/auth/permission-gate";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { STOCK_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import { DynamicFilterModal } from "@/components/ui-custom/data-table/dynamic-filter-modal";
import {
	FilterCriterion,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table/search-filter-types";
import { DataTableSortOption } from "@/components/ui-custom/data-table/types";
import { ModernSelect } from "@/components/ui-custom/form-controls";
import {
	ModernModal,
	ModernModalCancelButton,
	ModernModalFooter,
} from "@/components/ui-custom/modal";
import {
	ModernTabs,
	ModernTabsContent,
	ModernTabsList,
	ModernTabsTrigger,
} from "@/components/ui-custom/modern-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

// Pagination configuration & helpers for table footer
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type PaginationItemType = number | "ellipsis-prev" | "ellipsis-next";

function generatePaginationItems(
  currentPage: number, // 0-indexed
  totalPages: number,
): PaginationItemType[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const current = currentPage + 1; // 1-indexed

  // Case 1: Near beginning (pages 1 to 4)
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-next", totalPages];
  }

  // Case 2: Near end (last 4 pages)
  if (current >= totalPages - 3) {
    return [
      1,
      "ellipsis-prev",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  // Case 3: In the middle
  return [
    1,
    "ellipsis-prev",
    current - 1,
    current,
    current + 1,
    "ellipsis-next",
    totalPages,
  ];
}

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
  basePrice?: number;
  finalPrice?: number;
  discountPercentage?: number;
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
    ...(Array.isArray(matchedVariant?.productUnits)
      ? matchedVariant.productUnits
      : []),
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
    const baseQty = Math.max(
      1,
      Number(u.baseQuantity ?? u.conversionFactor ?? 1),
    );
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
      rawBasePrice: u.basePrice ?? null,
      rawFinalPrice: u.finalPrice ?? null,
      rawDiscountPercentage: u.discountPercentage ?? u.discount ?? null,
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
    (availableStock > 0 && availableStock <= (summary?.lowStockThreshold ?? 5));

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
      u.isBase || u.baseQuantity <= 1 ? unitPrice : unitPrice / u.baseQuantity;

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
        parentName && parentName !== baseUnitName && u.baseQuantity !== pQty;

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

    const basePrice = Number(
      u.rawBasePrice !== undefined && u.rawBasePrice !== null && Number(u.rawBasePrice) > 0
        ? u.rawBasePrice
        : baseUnitPrice > 0
        ? baseUnitPrice * u.baseQuantity
        : unitPrice,
    );

    const finalPrice = Number(
      u.rawFinalPrice !== undefined && u.rawFinalPrice !== null && Number(u.rawFinalPrice) > 0
        ? u.rawFinalPrice
        : unitPrice,
    );

    let discountPercentage = Number(u.rawDiscountPercentage ?? 0);
    if (discountPercentage === 0 && basePrice > 0 && finalPrice < basePrice) {
      discountPercentage =
        Math.round(((basePrice - finalPrice) / basePrice) * 10000) / 100;
    } else if (discountPercentage === 0 && savingsPercent !== null && savingsPercent > 0) {
      discountPercentage = savingsPercent;
    }

    const discountNote =
      u.discountNote ||
      (discountPercentage > 0
        ? `${discountPercentage}%`
        : u.isBase
        ? ""
        : "0%");

    return {
      ...u,
      parentUnitName: parentName,
      basePrice,
      finalPrice,
      discountPercentage,
      discountNote,
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

/**
 * Cascading / Hierarchical multi-unit stock decomposition.
 * Breaks down total quantity into discrete whole units from largest packaging tier down to smallest base tier.
 * e.g., 2,369 Pcs with (Pcs: 1, Box: 24, Set: 240) => Set: 9, Box: 8, Pcs: 17
 * e.g., 31 Pcs with (Pcs: 1, Box: 24, Set: 240) => Set: 0, Box: 1, Pcs: 7
 */
function decomposeQuantityByUnits(
  totalQty: number,
  allUnits: NormalizedStockUnit[],
): Map<string | number, number> {
  const result = new Map<string | number, number>();
  if (!allUnits || allUnits.length === 0) return result;

  // Sort descending by baseQuantity so largest packaging tier takes first quotient
  const sortedDesc = [...allUnits].sort(
    (a, b) => (b.baseQuantity || 1) - (a.baseQuantity || 1),
  );

  let remaining = Math.max(0, totalQty);
  for (let i = 0; i < sortedDesc.length; i++) {
    const unit = sortedDesc[i];
    const bQty = unit.baseQuantity || 1;
    if (i === sortedDesc.length - 1 || bQty <= 1) {
      // Smallest / base unit absorbs remaining quotient
      result.set(unit.unitId, remaining);
      remaining = 0;
    } else {
      const count = Math.floor(remaining / bQty);
      result.set(unit.unitId, count);
      remaining = remaining % bQty;
    }
  }

  return result;
}

function UnitPricingPopover({
  stockData,
  children,
}: {
  stockData: NormalizedVariantStockData;
  children?: React.ReactNode;
}) {
  const { baseUnit, packageUnits, allUnits, basePrice, cost } = stockData;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          (children as React.ReactElement) || (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 transition-colors cursor-pointer"
            >
              <Package className="size-3 text-purple-500 shrink-0" />
              <span className="truncate max-w-[130px]">
                1 {baseUnit.unitName}
                {packageUnits.length > 0
                  ? ` · +${packageUnits.length} pkg`
                  : ""}
              </span>
              <ChevronDown className="size-2.5 opacity-60 shrink-0" />
            </button>
          )
        }
      />
      <DropdownMenuContent
        align="start"
        className="w-84 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl space-y-2.5 z-50"
      >
        <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <Tag className="size-3.5 text-purple-600 dark:text-purple-400" />
            <span className="font-bold text-xs text-foreground uppercase tracking-wider">
              Packaging & Price Schedule
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold">
            {allUnits.length} {allUnits.length === 1 ? "Unit" : "Tiers"}
          </span>
        </div>

        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
          {allUnits.map((u) => (
            <div
              key={u.unitId}
              className={cn(
                "p-2 rounded-lg border text-xs flex items-center justify-between gap-2",
                u.isBase
                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/80 dark:border-purple-800/80"
                  : "bg-slate-50/60 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/70",
              )}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-foreground truncate">
                    {u.unitName}
                  </span>
                  {u.isBase ? (
                    <span className="text-[9px] font-bold px-1 py-0 rounded bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      Base
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {u.formulaText}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground block truncate">
                  Stock: {u.availableEquivalentStr}
                </span>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1 font-mono">
                  <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                    ${u.sellingPrice.toFixed(2)}
                  </span>
                </div>
                {!u.isBase && (
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-[9px] font-mono text-muted-foreground">
                      (${u.pricePerBaseUnit.toFixed(2)}/{baseUnit.unitName})
                    </span>
                    {u.savingsPercent && u.savingsPercent > 0 ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                        -{u.savingsPercent}%
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {cost > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>
              Base Cost: ${cost.toFixed(2)}/{baseUnit.unitName}
            </span>
            {basePrice > 0 && (
              <span className="text-emerald-600 font-semibold">
                Margin: {(((basePrice - cost) / basePrice) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function _InteractiveVariantCard({
  v,
  product,
  stockData,
  productImagesMap,
  openAdjustModalForVariant: _openAdjustModalForVariant,
  openVariantMovementsModal: _openVariantMovementsModal,
  t,
}: {
  v: StockVariantItem;
  product: StockProductItem;
  stockData: NormalizedVariantStockData;
  productImagesMap?: Map<string | number, any>;
  openAdjustModalForVariant: any;
  openVariantMovementsModal: any;
  t: any;
}) {
  const {
    baseUnit,
    packageUnits: _packageUnits,
    allUnits,
    basePrice: _basePrice,
    cost,
    physicalStock,
    availableStock: _availableStock,
    reservedStock,
    soldStock,
    isOutOfStock,
    isLowStock,
    smartStockDecomposition: _smartStockDecomposition,
  } = stockData;

  const [activeUnitId, setActiveUnitId] = useState<string | number>(
    baseUnit.unitId,
  );
  const activeUnit =
    allUnits.find((u) => String(u.unitId) === String(activeUnitId)) || baseUnit;

  const activePrice = activeUnit.sellingPrice;
  const _activeSavings = activeUnit.savingsPercent;
  const _isBase = activeUnit.isBase;
  // Cascading decomposition for card metrics across all packaging units
  const onHandDecomp = decomposeQuantityByUnits(physicalStock, allUnits);
  const reservedDecomp = decomposeQuantityByUnits(reservedStock, allUnits);
  const soldDecomp = decomposeQuantityByUnits(soldStock, allUnits);

  const activeOnHand = onHandDecomp.get(activeUnit.unitId) ?? 0;
  const activeReserved = reservedDecomp.get(activeUnit.unitId) ?? 0;
  const activeSold = soldDecomp.get(activeUnit.unitId) ?? 0;

  // Cost of variant for active unit (cost per base unit * activeUnit.baseQuantity)
  const activeCost = cost > 0 ? cost * (activeUnit.baseQuantity || 1) : 0;

  const marginPercent =
    activeCost > 0 && activePrice > 0
      ? Math.round(((activePrice - activeCost) / activePrice) * 100)
      : null;

  return (
    <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-sm hover:border-purple-300 dark:hover:border-purple-800/60 transition-all flex flex-col justify-between overflow-hidden group">
      {/* Body Section */}
      <div className="p-3 sm:p-3.5 space-y-2.5">
        {/* 1. Header: Image + Variant Name + SKU + Status */}
        <div className="flex items-start gap-2.5">
          <StockProductImage
            src={extractVariantImageUrl(v, product, productImagesMap)}
            alt={v.variantName}
            className="size-10 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <h4
                className="font-bold text-xs sm:text-sm text-foreground leading-tight truncate"
                title={v.variantName}
              >
                {v.variantName}
              </h4>
              {/* Stock Status Pill */}
              <div className="shrink-0">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 whitespace-nowrap">
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {t("stocks.outOfStock")}
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 whitespace-nowrap">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    {t("stocks.lowStockAlert")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 whitespace-nowrap">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {t("stocks.inStock")}
                  </span>
                )}
              </div>
            </div>

            {/* SKU & Barcode */}
            <div className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground flex-wrap">
              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/80 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                SKU: {v.sku}
              </span>
              {v.barcode && (
                <span className="text-slate-400 truncate max-w-[90px]">
                  · {v.barcode}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Unit of Measure (UoM) - Compact row */}
        {allUnits.length > 1 ? (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 overflow-x-auto [scrollbar-width:none]">
            {allUnits.map((u) => {
              const isSelected = String(u.unitId) === String(activeUnitId);
              return (
                <button
                  key={u.unitId}
                  type="button"
                  onClick={() => setActiveUnitId(u.unitId)}
                  className={cn(
                    "h-6 px-2 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap",
                    isSelected
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs border border-slate-200/60 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  <span>{u.unitName}</span>
                  {u.isBase ? (
                    <span className="text-[8px] px-1 py-0 rounded font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      Base
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono text-muted-foreground font-normal">
                      ×{u.baseQuantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider flex items-center gap-1 text-slate-500">
              <Tag className="size-2.5 text-purple-500" /> UoM
            </span>
            <span className="font-mono text-[11px] font-semibold text-foreground flex items-center gap-1">
              <span>{baseUnit.unitName}</span>
              <span className="text-[8px] px-1 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                Base
              </span>
            </span>
          </div>
        )}

        {/* 3. Side-by-Side Compact Operational Metrics (On Hand Stock & Selling Price/Cost) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Left: On Hand Stock, Reserved & Sold */}
          <div className="rounded-lg p-2.5 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>On Hand</span>
            </div>

            {/* Primary On Hand Stock Number */}
            <div className="flex items-baseline gap-0.5">
              <span
                className={cn(
                  "font-mono text-lg sm:text-xl font-bold tracking-tight leading-tight",
                  physicalStock <= 0
                    ? "text-rose-600 dark:text-rose-400"
                    : isLowStock
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400",
                )}
              >
                {activeOnHand.toLocaleString()}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground font-mono ml-1">
                {activeUnit.unitName}
              </span>
            </div>

            {/* Secondary Micro-Metrics: Reserved (Amber) & Sold (Purple) */}
            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-1 text-xs font-mono h-[34px]">
              <div
                className="flex flex-col justify-center"
                title={`Reserved: ${activeReserved} ${activeUnit.unitName}`}
              >
                <span className="text-[8px] uppercase font-bold text-slate-500 leading-none">
                  Reserved
                </span>
                <span
                  className={cn(
                    "text-xs font-bold mt-0.5",
                    activeReserved > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-400 dark:text-slate-500",
                  )}
                >
                  {activeReserved.toLocaleString()}
                </span>
              </div>
              <div
                className="flex flex-col items-end justify-center"
                title={`Sold: ${activeSold} ${activeUnit.unitName}`}
              >
                <span className="text-[8px] uppercase font-bold text-slate-500 leading-none">
                  Sold
                </span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                  {activeSold.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Selling Price & Unit Cost */}
          <div className="rounded-lg p-2.5 bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70 flex flex-col justify-between space-y-1">
            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Price</span>
            </div>

            {/* Primary Price Number (Clean & Proportional font size) */}
            <div className="flex items-baseline gap-0.5">
              <span className="font-mono text-lg sm:text-xl font-bold tracking-tight leading-tight text-emerald-700 dark:text-emerald-400">
                ${activePrice.toFixed(2)}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground font-mono ml-0.5">
                /{activeUnit.unitName}
              </span>
            </div>

            {/* Secondary Micro-Metrics: Cost of Variant & Margin */}
            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-1 text-xs font-mono h-[34px]">
              <div
                className="flex flex-col justify-center"
                title={`Unit Cost: $${activeCost.toFixed(2)}/${activeUnit.unitName}`}
              >
                <span className="text-[8px] uppercase font-bold text-slate-500 leading-none">
                  Cost
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {activeCost > 0 ? `$${activeCost.toFixed(2)}` : "—"}
                </span>
              </div>
              {marginPercent !== null && (
                <div className="flex flex-col items-end justify-center">
                  <span className="text-[8px] uppercase font-bold text-slate-500 leading-none">
                    Margin
                  </span>
                  <span
                    className={cn(
                      "font-bold text-xs mt-0.5",
                      marginPercent >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400",
                    )}
                    title={`Profit Margin: ${marginPercent}%`}
                  >
                    {marginPercent}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMovementTypeMeta(type: string, _qtyChange: number) {
  const norm = String(type || "").toUpperCase();
  if (norm === "SOLD" || norm === "SALE") {
    return {
      label: "SOLD",
      badgeCls:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60",
      icon: ShoppingBag,
    };
  }
  if (norm === "PURCHASE" || norm === "IMPORT" || norm === "RECEIVE") {
    return {
      label: "PURCHASE",
      badgeCls:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
      icon: PackagePlus,
    };
  }
  if (norm === "ADJUSTMENT") {
    return {
      label: "ADJUSTMENT",
      badgeCls:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
      icon: SlidersHorizontal,
    };
  }
  if (norm === "TRANSFER") {
    return {
      label: "TRANSFER",
      badgeCls:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60",
      icon: ArrowLeftRight,
    };
  }
  return {
    label: norm || "MOVEMENT",
    badgeCls:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60",
    icon: History,
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
  const [stockSortField, setStockSortField] = useState("createdAt");
  const [stockSortDirection, setStockSortDirection] = useState<"ASC" | "DESC">("DESC");

  const stockSortOptions: DataTableSortOption[] = useMemo(
    () => [
      {
        id: "createdAt",
        label: "Created Date (Newest)",
        icon: <Clock className="h-3.5 w-3.5 text-slate-500" />,
      },
      {
        id: "totalSales",
        label: "Best Selling (Sales Volume)",
        icon: <Flame className="h-3.5 w-3.5 text-amber-500" />,
      },
      {
        id: "popularityScore",
        label: "Most Popular (Score)",
        icon: <Sparkles className="h-3.5 w-3.5 text-purple-500" />,
      },
      {
        id: "maxDiscountPct",
        label: "Biggest Discount %",
        icon: <Tag className="h-3.5 w-3.5 text-emerald-500" />,
      },
      {
        id: "viewCount",
        label: "Most Viewed",
        icon: <Eye className="h-3.5 w-3.5 text-sky-500" />,
      },
      {
        id: "name",
        label: "Product Name (A-Z)",
        icon: <Package className="h-3.5 w-3.5 text-slate-500" />,
      },
      {
        id: "price",
        label: "Selling Price",
        icon: <DollarSign className="h-3.5 w-3.5 text-emerald-600" />,
      },
      {
        id: "stock",
        label: "Stock Quantity",
        icon: <Boxes className="h-3.5 w-3.5 text-blue-500" />,
      },
      {
        id: "category",
        label: "Category",
        icon: <Layers className="h-3.5 w-3.5 text-purple-500" />,
      },
      {
        id: "brand",
        label: "Brand",
        icon: <Tag className="h-3.5 w-3.5 text-sky-500" />,
      },
    ],
    [],
  );

  const handleToggleColumnSort = (field: string) => {
    if (stockSortField === field) {
      setStockSortDirection((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      const prefersDesc = [
        "createdat",
        "totalsales",
        "popularityscore",
        "maxdiscountpct",
        "viewcount",
        "stock",
      ].includes(field.toLowerCase());
      setStockSortField(field);
      setStockSortDirection(prefersDesc ? "DESC" : "ASC");
    }
    setSearchPage(0);
  };

  // Low Stock & Out of Stock Pagination
  const [lowStockPage, _setLowStockPage] = useState(0);
  const [outStockPage, _setOutStockPage] = useState(0);

  // Expanded Product Table Rows state
  const [expandedProducts, setExpandedProducts] = useState<
    Record<string | number, boolean>
  >({});

  // Smooth horizontal scroll helper for variant tables
  const handleScrollVariantTable = (
    prodId: string | number,
    direction: "left" | "right",
  ) => {
    const delta = direction === "left" ? -300 : 300;
    const scroller = document.getElementById(`variant-scroller-${prodId}`);
    if (scroller) {
      if (scroller.scrollWidth > scroller.clientWidth) {
        scroller.scrollBy({ left: delta, behavior: "smooth" });
      }
      const outerScroller = scroller.closest(
        ".overflow-x-auto",
      ) as HTMLElement | null;
      if (
        outerScroller &&
        outerScroller !== scroller &&
        outerScroller.scrollWidth > outerScroller.clientWidth
      ) {
        outerScroller.scrollBy({ left: delta, behavior: "smooth" });
      }
    }
  };

  // Scrollable height expansion state (toggle between compact scrollable max-h-[380px] vs full max-h-none)
  const [productScrollExpanded, _setProductScrollExpanded] = useState<
    Record<string | number, boolean>
  >({});

  // In-product variant filter/search query per product
  const [variantSearches, setVariantSearches] = useState<
    Record<string | number, string>
  >({});

  // Variant Movement History Modal State (Supports Warehouse Filtering)
  const [selectedVariantForMovements, setSelectedVariantForMovements] =
    useState<{
      variantId: number;
      variantName: string;
      sku: string;
      warehouseId?: number | string;
      warehouseName?: string;
      initialUnits?: any[];
    } | null>(null);
  const [variantMovementWarehouseFilter, setVariantMovementWarehouseFilter] =
    useState<string>("ALL");
  const [variantMovementSearch, setVariantMovementSearch] = useState<string>("");

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

  const { data: _categoriesData } = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => categoriesApi.list({ limit: 100 }),
    enabled: isFilterOrModalActive,
  });

  const { data: _brandsData } = useQuery({
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
  const _allVariants = useMemo(() => {
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
      sortState: [{ field: stockSortField, direction: stockSortDirection }],
      page: searchPage,
      size: searchSize,
    });
  }, [search, activeFilters, stockSortField, stockSortDirection, searchPage, searchSize]);

  const {
    data: searchStockResponse,
    isLoading: isLoadingSearchStock,
    refetch: refetchSearchStock,
  } = useQuery({
    queryKey: ["stocks-search-v1", searchPayload],
    queryFn: () => stocksApi.search(searchPayload),
    staleTime: 0,
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
    Math.max(1, Math.ceil(searchTotalElements / searchSize));

  const paginationItems = useMemo(
    () => generatePaginationItems(searchPage, searchTotalPages),
    [searchPage, searchTotalPages],
  );

  // Guard against out-of-bounds page if total pages decreases (e.g. after changing page size)
  React.useEffect(() => {
    if (searchTotalPages > 0 && searchPage >= searchTotalPages) {
      setSearchPage(Math.max(0, searchTotalPages - 1));
    }
  }, [searchTotalPages, searchPage]);

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

  // Variant Units Query (cached, used for multi-unit packaging breakdown)
  const { data: variantUnitsData } = useQuery({
    queryKey: ["variant-units", selectedVariantForMovements?.variantId],
    queryFn: () =>
      selectedVariantForMovements
        ? productsApi.getVariantUnits(selectedVariantForMovements.variantId)
        : Promise.resolve([]),
    enabled: !!selectedVariantForMovements,
    staleTime: 5 * 60 * 1000,
  });

  const activeMovementUnits = useMemo(() => {
    if (variantUnitsData && variantUnitsData.length > 0) return variantUnitsData;
    if (
      selectedVariantForMovements?.initialUnits &&
      selectedVariantForMovements.initialUnits.length > 0
    ) {
      return selectedVariantForMovements.initialUnits;
    }
    return [];
  }, [variantUnitsData, selectedVariantForMovements]);

  const filteredVariantMovements = useMemo(() => {
    if (!variantMovements) return [];
    if (!variantMovementSearch.trim()) return variantMovements;
    const q = variantMovementSearch.toLowerCase().trim();
    return variantMovements.filter(
      (m) =>
        m.referenceId?.toLowerCase().includes(q) ||
        m.note?.toLowerCase().includes(q) ||
        m.movementType?.toLowerCase().includes(q) ||
        m.warehouseName?.toLowerCase().includes(q),
    );
  }, [variantMovements, variantMovementSearch]);

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
    units?: any[],
  ) => {
    setSelectedVariantForMovements({
      variantId,
      variantName,
      sku,
      warehouseId,
      warehouseName,
      initialUnits: units,
    });
    setVariantMovementWarehouseFilter(
      warehouseId ? String(warehouseId) : "ALL",
    );
    setVariantMovementSearch("");
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
            {t(
              "stocks.subtitle",
              "Real-time warehouse stock balance, low-stock warnings, inventory adjustments, and transfers.",
            )}
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

              {/* Product Sort Dropdown & Quick Direction Button */}
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant={stockSortField ? "secondary" : "outline"}
                        size="sm"
                        className="h-10 px-3 gap-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{t("common.sort", "Sort")}</span>
                        {stockSortField && (
                          <span className="font-semibold text-primary ml-0.5 truncate max-w-[100px]">
                            {stockSortOptions.find((o) => o.id === stockSortField)?.label.split("(")[0].trim() || stockSortField}
                          </span>
                        )}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-64 shadow-lg p-1.5 max-h-96 overflow-y-auto">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold flex items-center justify-between px-2 py-1">
                      <span>Sort Options</span>
                      {stockSortField && (
                        <button
                          onClick={() => {
                            setStockSortField("createdAt");
                            setStockSortDirection("DESC");
                            setSearchPage(0);
                          }}
                          className="text-primary hover:underline text-[10px] cursor-pointer"
                        >
                          Clear Sort
                        </button>
                      )}
                    </DropdownMenuLabel>
                    {stockSortField && (
                      <div className="flex items-center justify-between px-2 py-1.5 mb-1 bg-muted/60 rounded-md">
                        <span className="text-[11px] font-medium text-muted-foreground">Direction</span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={stockSortDirection === "ASC" ? "default" : "outline"}
                            onClick={() => {
                              setStockSortDirection("ASC");
                              setSearchPage(0);
                            }}
                            className={cn(
                              "h-6 px-2 text-[10px] font-bold rounded cursor-pointer",
                              stockSortDirection === "ASC" ? "bg-primary text-primary-foreground" : "bg-background"
                            )}
                          >
                            ↑ ASC
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={stockSortDirection === "DESC" ? "default" : "outline"}
                            onClick={() => {
                              setStockSortDirection("DESC");
                              setSearchPage(0);
                            }}
                            className={cn(
                              "h-6 px-2 text-[10px] font-bold rounded cursor-pointer",
                              stockSortDirection === "DESC" ? "bg-primary text-primary-foreground" : "bg-background"
                            )}
                          >
                            ↓ DESC
                          </Button>
                        </div>
                      </div>
                    )}
                    <DropdownMenuSeparator />
                    {stockSortOptions.map((opt) => {
                      const isSorted = stockSortField === opt.id;
                      return (
                        <DropdownMenuItem
                          key={opt.id}
                          onClick={() => {
                            if (stockSortField === opt.id) {
                              setStockSortDirection(stockSortDirection === "DESC" ? "ASC" : "DESC");
                            } else {
                              const prefersDesc = [
                                "createdat",
                                "totalsales",
                                "popularityscore",
                                "maxdiscountpct",
                                "viewcount",
                                "stock",
                              ].includes(opt.id.toLowerCase());
                              setStockSortField(opt.id);
                              setStockSortDirection(prefersDesc ? "DESC" : "ASC");
                            }
                            setSearchPage(0);
                          }}
                          className={cn(
                            "flex items-center justify-between cursor-pointer text-xs px-2.5 py-1.5 rounded-md",
                            isSorted && "bg-primary/10 text-primary font-semibold",
                          )}
                        >
                          <span className="flex items-center gap-2 min-w-0 truncate">
                            {opt.icon}
                            <span className="truncate">{opt.label}</span>
                          </span>
                          {isSorted && (
                            <span className="text-primary font-bold text-[11px] shrink-0 ml-2">
                              {stockSortDirection === "ASC" ? "↑ ASC" : "↓ DESC"}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Quick Direction Toggle Pill */}
                {stockSortField && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStockSortDirection((prev) => (prev === "ASC" ? "DESC" : "ASC"));
                      setSearchPage(0);
                    }}
                    className="h-10 px-2 gap-1 text-xs font-bold rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors shadow-2xs"
                    title={`Currently sorted ${stockSortDirection}. Click to switch to ${stockSortDirection === "ASC" ? "DESC" : "ASC"}`}
                  >
                    {stockSortDirection === "ASC" ? (
                      <>
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        <span>ASC</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        <span>DESC</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <PermissionGate resource="STOCK" action="UPDATE">
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
              </PermissionGate>

              <PermissionGate resource="IMPORT" action="CREATE">
                <Button
                  onClick={() => setIsImportDialogOpen(true)}
                  className="h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs gap-1.5"
                >
                  <Truck className="h-4 w-4" />
                  <span>{t("stocks.importStock")}</span>
                </Button>
              </PermissionGate>

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
            <>
              {/* Compact product-first layout for phones; variant details scroll vertically. */}
              <div className="md:hidden space-y-2.5">
                {searchStockData.map((product, idx) => {
                  const prodId =
                    product.productId || product.productUuid || idx;
                  const variants = product.variants || [];
                  const isExpanded = expandedProducts[prodId] ?? false;
                  const totalOnHand = variants.reduce(
                    (sum, variant) =>
                      sum +
                      (variant.inventorySummary?.totalPhysicalQty ??
                        variant.stockQty ??
                        0),
                    0,
                  );
                  const totalAvailable = variants.reduce(
                    (sum, variant) =>
                      sum +
                      (variant.inventorySummary?.availableQty ??
                        variant.stockQty ??
                        0),
                    0,
                  );
                  const hasOutOfStock = totalAvailable <= 0;
                  const hasLowStock = variants.some(
                    (variant) =>
                      variant.inventorySummary?.isLowStock ||
                      ((variant.inventorySummary?.availableQty ??
                        variant.stockQty ??
                        0) > 0 &&
                        (variant.inventorySummary?.availableQty ??
                          variant.stockQty ??
                          0) <=
                          (variant.inventorySummary?.lowStockThreshold ?? 5)),
                  );
                  const query = (variantSearches[prodId] || "")
                    .toLowerCase()
                    .trim();
                  const visibleVariants = query
                    ? variants.filter((variant) =>
                        [
                          variant.variantName,
                          variant.sku,
                          variant.barcode,
                        ].some((value) =>
                          (value || "").toLowerCase().includes(query),
                        ),
                      )
                    : variants;

                  return (
                    <section
                      key={prodId}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleProductExpand(prodId)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <StockProductImage
                            src={extractStockImageUrl(
                              product,
                              productImagesMap,
                            )}
                            alt={product.productName || "Product"}
                            className="size-11 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {product.productName ||
                                product.name ||
                                t("stocks.productName", "Product")}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {variants.length}{" "}
                              {variants.length === 1 ? "variant" : "variants"} ·
                              On hand {totalOnHand.toLocaleString()}
                            </span>
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform",
                              !isExpanded && "-rotate-90",
                            )}
                          />
                        </button>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                            {totalAvailable.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            available
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 px-3.5 py-2 dark:border-slate-800">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            hasOutOfStock
                              ? "text-rose-600 dark:text-rose-400"
                              : hasLowStock
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-700 dark:text-emerald-400",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              hasOutOfStock
                                ? "bg-rose-500"
                                : hasLowStock
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                          />
                          {hasOutOfStock
                            ? t("stocks.outOfStock")
                            : hasLowStock
                              ? t("stocks.lowStockAlert")
                              : t("stocks.inStock")}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProductForModal(product)}
                          className="h-7 px-2 text-xs text-purple-700 dark:text-purple-300"
                        >
                          <Eye className="mr-1 size-3.5" />
                          Details
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40">
                          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-slate-50/95 p-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                            <div className="relative min-w-0 flex-1">
                              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={variantSearches[prodId] || ""}
                                onChange={(event) =>
                                  setVariantSearches((prev) => ({
                                    ...prev,
                                    [prodId]: event.target.value,
                                  }))
                                }
                                placeholder="Find variant or SKU"
                                className="h-9 rounded-lg bg-white pl-8 text-xs dark:bg-slate-950"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSelectedProductForModal(product)
                              }
                              className="h-9 shrink-0 px-2.5 text-xs"
                            >
                              Details
                            </Button>
                          </div>
                          <div className="max-h-[55vh] divide-y divide-slate-200 overflow-y-auto overscroll-contain dark:divide-slate-800">
                            {visibleVariants.length === 0 ? (
                              <div className="p-6 text-center text-xs text-muted-foreground">
                                No variants match this search.
                              </div>
                            ) : (
                              visibleVariants.map((variant) => {
                                const stockData = getNormalizedVariantStockData(
                                  variant,
                                  product,
                                  variantDetailsMap,
                                );
                                const {
                                  baseUnit,
                                  availableStock,
                                  physicalStock,
                                  reservedStock,
                                  soldStock,
                                  isOutOfStock,
                                  isLowStock,
                                } = stockData;
                                return (
                                  <article
                                    key={variant.variantId}
                                    className="bg-white p-3 dark:bg-slate-900"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <StockProductImage
                                        src={extractVariantImageUrl(
                                          variant,
                                          product,
                                          productImagesMap,
                                        )}
                                        alt={variant.variantName}
                                        className="size-9 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                                          {variant.variantName}
                                        </div>
                                        <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                                          {variant.sku || "No SKU"}
                                          {variant.barcode
                                            ? ` · ${variant.barcode}`
                                            : ""}
                                        </div>
                                      </div>
                                      <span
                                        className={cn(
                                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                          isOutOfStock
                                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                                            : isLowStock
                                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                                        )}
                                      >
                                        {isOutOfStock
                                          ? t("stocks.outOfStock")
                                          : isLowStock
                                            ? t("stocks.lowStockAlert")
                                            : t("stocks.inStock")}
                                      </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950/60">
                                      <div>
                                        <div className="text-[10px] text-muted-foreground">
                                          On hand
                                        </div>
                                        <div className="mt-0.5 text-xs font-semibold tabular-nums">
                                          {physicalStock.toLocaleString()}{" "}
                                          <span className="font-normal text-muted-foreground">
                                            {baseUnit.unitName}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-muted-foreground">
                                          Reserved
                                        </div>
                                        <div className="mt-0.5 text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                          {reservedStock.toLocaleString()}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[10px] text-muted-foreground">
                                          Sold
                                        </div>
                                        <div className="mt-0.5 text-xs font-semibold tabular-nums text-purple-700 dark:text-purple-400">
                                          {soldStock.toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <UnitPricingPopover
                                        stockData={stockData}
                                      />
                                      <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            openVariantMovementsModal(
                                              variant.variantId,
                                              variant.variantName,
                                              variant.sku,
                                              undefined,
                                              undefined,
                                              stockData.allUnits,
                                            )
                                          }
                                          className="size-8 text-slate-500"
                                          title={t("stocks.allMovements")}
                                        >
                                          <History className="size-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            openAdjustModalForVariant(
                                              variant.variantId,
                                              variant.variantName,
                                              variant.sku,
                                              {
                                                productName:
                                                  product.productName ||
                                                  product.name ||
                                                  variant.variantName,
                                                unitId: baseUnit.unitId,
                                                unitName: baseUnit.unitName,
                                                availableStock,
                                                imageUrl:
                                                  (variant.imageUrl ||
                                                    product.imageUrl) ??
                                                  undefined,
                                              },
                                            )
                                          }
                                          className="h-8 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
                                        >
                                          <Scale className="mr-1 size-3.5" />
                                          Adjust
                                        </Button>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
                <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {t("common.rowsPerPage", "Rows:")}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 bg-background text-foreground gap-1"
                            >
                              <span>{searchSize}</span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent
                          align="start"
                          side="top"
                          className="min-w-[80px] p-1 rounded-xl shadow-lg border-slate-200 dark:border-slate-800 bg-popover"
                        >
                          {PAGE_SIZE_OPTIONS.map((opt) => (
                            <DropdownMenuItem
                              key={opt}
                              onClick={() => {
                                setSearchSize(opt);
                                setSearchPage(0);
                              }}
                              className={cn(
                                "flex items-center justify-between px-2.5 py-1 text-xs rounded-lg cursor-pointer",
                                searchSize === opt &&
                                  "font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
                              )}
                            >
                              <span>{opt}</span>
                              {searchSize === opt && (
                                <Check className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {searchTotalElements === 0
                        ? "0 products"
                        : `${searchPage * searchSize + 1}–${Math.min(
                            (searchPage + 1) * searchSize,
                            searchTotalElements,
                          )} of ${searchTotalElements}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={searchPage === 0 || isLoadingSearchStock}
                      onClick={() => setSearchPage(0)}
                      className="h-8 w-8 p-0"
                      title={t("common.first", "First Page")}
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={searchPage === 0 || isLoadingSearchStock}
                      onClick={() =>
                        setSearchPage((prev) => Math.max(0, prev - 1))
                      }
                      className="h-8 px-2 text-xs gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>{t("common.previous", "Prev")}</span>
                    </Button>

                    <span className="text-xs font-semibold px-2 text-foreground">
                      {searchPage + 1} / {searchTotalPages}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        searchPage >= searchTotalPages - 1 ||
                        isLoadingSearchStock
                      }
                      onClick={() => setSearchPage((prev) => prev + 1)}
                      className="h-8 px-2 text-xs gap-1"
                    >
                      <span>{t("common.next", "Next")}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        searchPage >= searchTotalPages - 1 ||
                        isLoadingSearchStock
                      }
                      onClick={() => setSearchPage(searchTotalPages - 1)}
                      className="h-8 w-8 p-0"
                      title={t("common.last", "Last Page")}
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
                <Table className="w-full min-w-[1020px]">
                  <TableHeader className="bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-9 min-w-9 p-1 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-900"></TableHead>
                      <TableHead
                        onClick={() => handleToggleColumnSort("name")}
                        className="font-bold text-xs text-foreground min-w-[170px] max-w-[220px] sticky left-9 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t("stocks.productName", "Product / Variant")}</span>
                          {stockSortField === "name" ? (
                            stockSortDirection === "ASC" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-left min-w-[110px]">
                        {t("products.barcode", "Barcode")}
                      </TableHead>
                      <TableHead className="font-bold text-xs text-left min-w-[100px]">
                        {t("products.sku", "SKU")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleToggleColumnSort("stock")}
                        className="font-bold text-xs text-right min-w-[75px] cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{t("stocks.quantityOnHand", "On Hand")}</span>
                          {stockSortField === "stock" ? (
                            stockSortDirection === "ASC" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-right min-w-[65px]">
                        {t("stocks.reservedQuantity", "Reserved")}
                      </TableHead>
                      <TableHead
                        onClick={() => handleToggleColumnSort("stock")}
                        className="font-bold text-xs text-right min-w-[85px] cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>{t("stocks.availableQuantity", "Available")}</span>
                          {stockSortField === "stock" ? (
                            stockSortDirection === "ASC" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => handleToggleColumnSort("totalSales")}
                        className="font-bold text-xs text-left min-w-[60px] cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t("stocks.soldQuantity", "Sold")}</span>
                          {stockSortField === "totalSales" ? (
                            stockSortDirection === "ASC" ? (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-xs text-left min-w-[95px]">
                        {t("stocks.stockStatus", "Status")}
                      </TableHead>
                      <TableHead className="sticky z-20 text-scenter bg-slate-50 dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 font-bold text-xs text-center min-w-[105px] shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)]">
                        {t("common.actions", "Actions")}
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
                            (v.inventorySummary?.availableQty ??
                              v.stockQty ??
                              0),
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

                        const _productUnitsList = Array.from(
                          new Set(
                            variants.flatMap((v) => {
                              const summary = v.inventorySummary;
                              const names: string[] = [];
                              if (summary?.baseUnit)
                                names.push(summary.baseUnit);
                              if (Array.isArray(v.unitBreakdown)) {
                                v.unitBreakdown.forEach((ub: any) => {
                                  if (ub.unitName) names.push(ub.unitName);
                                });
                              }
                              return names;
                            }),
                          ),
                        );

                        const productBarcode =
                          product.barcode ||
                          (product as any).baseBarcode ||
                          (variants.length === 1 ? variants[0]?.barcode : null);
                        const productSku =
                          product.sku ||
                          (product as any).baseSku ||
                          (variants.length === 1 ? variants[0]?.sku : null);

                        // Calculate aggregated cost and price ranges for parent row
                        const variantStockDataList = variants.map((v) =>
                          getNormalizedVariantStockData(
                            v,
                            product,
                            variantDetailsMap,
                          ),
                        );
                        const allCosts = variantStockDataList
                          .map((s) => s.cost)
                          .filter((c) => c > 0);
                        const minCost =
                          allCosts.length > 0 ? Math.min(...allCosts) : 0;
                        const maxCost =
                          allCosts.length > 0 ? Math.max(...allCosts) : 0;
                        const _costDisplay =
                          allCosts.length === 0
                            ? "—"
                            : minCost === maxCost
                              ? `$${minCost.toFixed(2)}`
                              : `$${minCost.toFixed(2)}–$${maxCost.toFixed(2)}`;

                        const allBasePrices = variantStockDataList
                          .map((s) => s.basePrice)
                          .filter((p) => p > 0);
                        const allMaxPrices = variantStockDataList.map((s) => {
                          const pkgMax = s.packageUnits.reduce(
                            (m, pu) => Math.max(m, pu.sellingPrice),
                            0,
                          );
                          return Math.max(s.basePrice, pkgMax);
                        });
                        const minPrice =
                          allBasePrices.length > 0
                            ? Math.min(...allBasePrices)
                            : 0;
                        const maxPrice =
                          allMaxPrices.length > 0
                            ? Math.max(...allMaxPrices)
                            : 0;
                        const _priceDisplay =
                          minPrice === 0 && maxPrice === 0
                            ? "—"
                            : minPrice === maxPrice
                              ? `$${minPrice.toFixed(2)}`
                              : `$${minPrice.toFixed(2)}–$${maxPrice.toFixed(2)}`;

                        return (
                          <React.Fragment key={prodId}>
                            {/* Main Product Table Row (Odoo 17 / Shopify Polaris Tree Row) */}
                            <TableRow
                              onClick={() =>
                                setSelectedProductForModal(product)
                              }
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 group",
                                isExpanded &&
                                  "bg-purple-50/20 dark:bg-purple-950/15 font-medium border-b-0",
                              )}
                            >
                              <TableCell className="w-9 min-w-9 text-center p-1 sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors"
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
                                    <ChevronDown className="size-4 text-purple-600 dark:text-purple-400" />
                                  ) : (
                                    <ChevronRight className="size-4" />
                                  )}
                                </Button>
                              </TableCell>

                              <TableCell className="min-w-[170px] max-w-[220px] p-2 sticky left-9 z-10 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <StockProductImage
                                      src={extractStockImageUrl(
                                        product,
                                        productImagesMap,
                                      )}
                                      alt={product.productName || "Product"}
                                      className="size-8 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
                                    />

                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center gap-2 truncate">
                                        <span>{product.productName}</span>
                                      </p>
                                      <span className="text-[10px] text-muted-foreground block font-mono truncate">
                                        Click to view details
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
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-1.5 text-[10px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-md gap-0.5 shrink-0"
                                  >
                                    <Eye className="size-3" />
                                    <span>Details</span>
                                  </Button>
                                </div>
                              </TableCell>

                              {/* Barcode */}
                              <TableCell className="min-w-[110px] p-2">
                                {productBarcode ? (
                                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    {productBarcode}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    —
                                  </span>
                                )}
                              </TableCell>

                              {/* SKU */}
                              <TableCell className="min-w-[100px] p-2">
                                {productSku ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                    {productSku}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    —
                                  </span>
                                )}
                              </TableCell>

                              {/* On Hand */}
                              <TableCell className="min-w-[75px] p-2 text-right font-bold text-xs text-foreground font-mono">
                                {totalPhysical.toLocaleString()}
                              </TableCell>

                              {/* Reserved */}
                              <TableCell className="min-w-[65px] p-2 text-right text-xs font-mono">
                                <span
                                  className={
                                    totalReserved > 0
                                      ? "text-amber-600 font-bold"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {totalReserved.toLocaleString()}
                                </span>
                              </TableCell>

                              {/* Available */}
                              <TableCell className="min-w-[85px] p-2 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                {totalAvailable.toLocaleString()}
                              </TableCell>

                              {/* Sold */}
                              <TableCell className="min-w-[60px] p-2 text-right text-xs text-muted-foreground font-mono">
                                {totalSold.toLocaleString()}
                              </TableCell>

                              <TableCell className="min-w-[95px] p-2 text-center">
                                {totalAvailable === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    {t("stocks.outOfStock")}
                                  </span>
                                ) : hasLowStock ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                    {t("stocks.lowStockAlert")}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    {t("stocks.inStock")}
                                  </span>
                                )}
                              </TableCell>

                              <TableCell className="sticky right-0 z-10 bg-white dark:bg-slate-950 border-l border-slate-200/80 dark:border-slate-800 p-2 text-center min-w-[105px] shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForModal(product);
                                  }}
                                  className="h-7 px-2 text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg gap-1"
                                >
                                  <Eye className="size-3.5" />
                                  <span>Details</span>
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* Collapsible Variants Section - Dedicated Scrollable Sub-Table with Sticky Headers */}
                            {isExpanded &&
                              (() => {
                                const variantQuery = (
                                  variantSearches[prodId] || ""
                                )
                                  .toLowerCase()
                                  .trim();
                                const displayedVariants = variantQuery
                                  ? variants.filter((v: StockVariantItem) => {
                                      const nameMatch = (v.variantName || "")
                                        .toLowerCase()
                                        .includes(variantQuery);
                                      const skuMatch = (v.sku || "")
                                        .toLowerCase()
                                        .includes(variantQuery);
                                      const barcodeMatch = (v.barcode || "")
                                        .toLowerCase()
                                        .includes(variantQuery);
                                      return (
                                        nameMatch || skuMatch || barcodeMatch
                                      );
                                    })
                                  : variants;
                                const _isScrollExpanded =
                                  productScrollExpanded[prodId] ?? false;

                                return (
                                  <TableRow className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-border/80">
                                    <TableCell
                                      colSpan={10}
                                      className="p-3 max-w-0"
                                    >
                                      <div className="w-full max-w-full min-w-0 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-inner text-xs overflow-hidden">
                                        {/* Sub-row Header Toolbar */}
                                        <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800 flex-wrap gap-2">
                                          <div className="flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                              {product.productName || product.name} —{" "}
                                              {variants.length > 0
                                                ? `${variants.length} Variant${variants.length === 1 ? "" : "s"} List`
                                                : "Product Units & Inventory"}
                                            </span>
                                          </div>

                                          {/* Scroll Controls (Left & Right) */}
                                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleScrollVariantTable(prodId, "left")}
                                              className="h-7 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 rounded-md gap-1 cursor-pointer transition-colors"
                                              title="Scroll Variants Table Left"
                                            >
                                              <ChevronLeft className="h-3.5 w-3.5" />
                                              <span className="text-[11px] hidden sm:inline">Left</span>
                                            </Button>
                                            <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-700" />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleScrollVariantTable(prodId, "right")}
                                              className="h-7 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:text-purple-600 rounded-md gap-1 cursor-pointer transition-colors"
                                              title="Scroll Variants Table Right"
                                            >
                                              <span className="text-[11px] hidden sm:inline">Right</span>
                                              <ChevronRight className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Table Scroller */}
                                        <div
                                          id={`variant-scroller-${prodId}`}
                                          className={cn(
                                            "w-full max-w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 overscroll-x-contain",
                                            "[scrollbar-width:thin] [scrollbar-color:theme(colors.purple.500)_theme(colors.slate.100)] dark:[scrollbar-color:theme(colors.purple.500)_theme(colors.slate.900)]",
                                            "[&::-webkit-scrollbar]:h-2.5",
                                            "[&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-track]:rounded-b-lg",
                                            "[&::-webkit-scrollbar-thumb]:bg-purple-400 hover:[&::-webkit-scrollbar-thumb]:bg-purple-500 dark:[&::-webkit-scrollbar-thumb]:bg-purple-600 dark:hover:[&::-webkit-scrollbar-thumb]:bg-purple-500 [&::-webkit-scrollbar-thumb]:rounded-full",
                                          )}
                                        >
                                          <table className="w-full min-w-[1280px] text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                              <tr className="hover:bg-transparent bg-slate-100 dark:bg-slate-900">
                                                <th className="font-bold text-[11px] text-foreground min-w-[140px] max-w-[180px] py-2 px-2.5 text-left whitespace-nowrap sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                                  {t(
                                                    "stocks.variantName",
                                                    "Variant / Identity",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left py-2 px-2 whitespace-nowrap min-w-[65px]">
                                                  {t(
                                                    "products.units",
                                                    "Units",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left py-2 px-2 whitespace-nowrap min-w-[90px]">
                                                  {t(
                                                    "products.conversion",
                                                    "Conversion",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-right py-2 px-2 whitespace-nowrap min-w-[70px]">
                                                  {t(
                                                    "products.basePrice",
                                                    "Base Price",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-center py-2 px-2 whitespace-nowrap min-w-[65px]">
                                                  {t(
                                                    "products.discount",
                                                    "Discount",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-right py-2 px-2 whitespace-nowrap min-w-[85px]">
                                                  {t(
                                                    "stocks.unitCost",
                                                    "Unit Cost",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-right py-2 px-2 whitespace-nowrap min-w-[90px]">
                                                  {t(
                                                    "stocks.retailPrice",
                                                    "Retail Price ($)",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left min-w-[70px] py-2 px-2 whitespace-nowrap">
                                                  {t(
                                                    "stocks.quantityOnHand",
                                                    "On Hand",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left min-w-[65px] py-2 px-2 whitespace-nowrap">
                                                  {t(
                                                    "stocks.reservedQuantity",
                                                    "Reserved",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left min-w-[70px] py-2 px-2 whitespace-nowrap">
                                                  {t(
                                                    "stocks.availableQuantity",
                                                    "Available",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left min-w-[65px] py-2 px-2 whitespace-nowrap">
                                                  {t(
                                                    "stocks.soldQuantity",
                                                    "Sold",
                                                  )}
                                                </th>
                                                <th className="font-bold text-[11px] text-left min-w-[80px] py-2 px-2 whitespace-nowrap">
                                                  {t(
                                                    "stocks.stockStatus",
                                                    "Status",
                                                  )}
                                                </th>
                                                <th className="sticky z-20 bg-slate-100 dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 font-bold text-[11px] text-left min-w-[175px] py-2 px-2 whitespace-nowrap shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                                                  {t(
                                                    "common.actions",
                                                    "Actions",
                                                  )}
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                              {displayedVariants.length ===
                                              0 ? (
                                                <tr>
                                                  <td
                                                    colSpan={13}
                                                    className="py-8 text-center text-xs text-muted-foreground"
                                                  >
                                                        No variants matching "
                                                        {
                                                          variantSearches[
                                                            prodId
                                                          ]
                                                        }
                                                        "
                                                      </td>
                                                    </tr>
                                                  ) : (
                                                    displayedVariants.map(
                                                      (v: StockVariantItem) => {
                                                        const stockData =
                                                          getNormalizedVariantStockData(
                                                            v,
                                                            product,
                                                            variantDetailsMap,
                                                          );
                                                        const {
                                                          baseUnit: _baseUnit,
                                                          packageUnits:
                                                            _packageUnits,
                                                          allUnits,
                                                          basePrice: _basePrice,
                                                          cost,
                                                          physicalStock,
                                                          availableStock,
                                                          reservedStock,
                                                          soldStock,
                                                          isOutOfStock,
                                                          isLowStock,
                                                          smartStockDecomposition:
                                                            _smartStockDecomposition,
                                                        } = stockData;

                                                        // Cascading multi-unit decomposition for inventory metrics
                                                        const onHandDecomp =
                                                          decomposeQuantityByUnits(
                                                            physicalStock,
                                                            allUnits,
                                                          );
                                                        const reservedDecomp =
                                                          decomposeQuantityByUnits(
                                                            reservedStock,
                                                            allUnits,
                                                          );
                                                        const availableDecomp =
                                                          decomposeQuantityByUnits(
                                                            availableStock,
                                                            allUnits,
                                                          );
                                                        const soldDecomp =
                                                          decomposeQuantityByUnits(
                                                            soldStock,
                                                            allUnits,
                                                          );

                                                        return (
                                                          <tr
                                                            key={v.variantId}
                                                            className="bg-white dark:bg-slate-950 hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors border-b border-slate-100 dark:border-slate-800/60 group"
                                                          >
                                                            {/* Col 1: Variant / Identity */}
                                                            <td className="min-w-[140px] max-w-[180px] p-2 align-middle sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-purple-50/70 dark:group-hover:bg-purple-950/40 border-r border-slate-200/80 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                                              <div className="flex items-center gap-2 min-w-0">
                                                                <StockProductImage
                                                                  src={extractVariantImageUrl(
                                                                    v,
                                                                    product,
                                                                    productImagesMap,
                                                                  )}
                                                                  alt={
                                                                    v.variantName
                                                                  }
                                                                  className="size-7 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-105"
                                                                />
                                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                                    <p
                                                                      className="font-bold text-xs text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors truncate"
                                                                      title={
                                                                        v.variantName
                                                                      }
                                                                    >
                                                                      {
                                                                        v.variantName
                                                                      }
                                                                    </p>
                                                                    {v.isDefault && (
                                                                      <span className="shrink-0 inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-300/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60">
                                                                        Default
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                  <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground flex-wrap">
                                                                    <span>
                                                                      {v.sku || "—"}
                                                                    </span>
                                                                    {v.barcode && (
                                                                      <span className="text-slate-400 truncate max-w-[90px]">
                                                                        · {v.barcode}
                                                                      </span>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            </td>

                                                            {/* Col 2: Units (All units in vertical rows) */}
                                                            <td className="min-w-[65px] p-2 align-top whitespace-nowrap">
                                                              <div className="flex flex-col gap-1 py-0.5">
                                                                {allUnits.map(
                                                                  (u) => (
                                                                    <div
                                                                      key={
                                                                        u.unitId
                                                                      }
                                                                      className="h-6 flex items-center font-medium text-xs text-foreground whitespace-nowrap"
                                                                    >
                                                                      <span>
                                                                        {
                                                                          u.unitName
                                                                        }
                                                                      </span>
                                                                      {u.isBase && (
                                                                        <span className="ml-1 text-[8px] px-1 py-0 rounded font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                                                                          Base
                                                                        </span>
                                                                      )}
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 3: Conversion Multiplier */}
                                                            <td className="min-w-[90px] p-2 align-top whitespace-nowrap">
                                                              <div className="flex flex-col gap-1 py-0.5">
                                                                {allUnits.map(
                                                                  (u) => (
                                                                    <div
                                                                      key={
                                                                        u.unitId
                                                                      }
                                                                      className="h-6 flex items-center font-mono text-xs whitespace-nowrap gap-1"
                                                                    >
                                                                      <span className="font-bold text-foreground">
                                                                        {
                                                                          u.parentQuantity?u.parentQuantity.toLocaleString():"1"
                                                                        }
                                                                        
                                                                      </span>
                                                                      <span className="font-normal text-muted-foreground">
                                                                        {
                                                                          u.parentUnitName
                                                                        }
                                                                      </span>
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 4: Base Price */}
                                                            <td className="min-w-[70px] p-2 text-right align-top whitespace-nowrap">
                                                              <div className="flex flex-col gap-1 py-0.5 text-right">
                                                                {allUnits.map(
                                                                  (u) => (
                                                                    <div
                                                                      key={
                                                                        u.unitId
                                                                      }
                                                                      className="h-6 flex items-center justify-end font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap"
                                                                    >
                                                                      $
                                                                      {(
                                                                        u.basePrice ??
                                                                        u.sellingPrice ??
                                                                        0
                                                                      ).toFixed(
                                                                        2,
                                                                      )}
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 5: Discount Rate */}
                                                            <td className="min-w-[65px] p-2 text-center align-top whitespace-nowrap">
                                                              <div className="flex flex-col gap-1 py-0.5 items-center justify-center">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const hasDiscount =
                                                                      Boolean(
                                                                        (u.discountNote &&
                                                                          u.discountNote !==
                                                                            "0%") ||
                                                                          (u.discountPercentage &&
                                                                            u.discountPercentage >
                                                                              0),
                                                                      );
                                                                    const discountLabel =
                                                                      u.discountNote &&
                                                                      u.discountNote !==
                                                                        "0%"
                                                                        ? u.discountNote
                                                                        : `${u.discountPercentage}%`;

                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-center whitespace-nowrap"
                                                                      >
                                                                        {hasDiscount ? (
                                                                          <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50 dark:bg-amber-950/40 font-bold px-2 py-0.5 rounded-full"
                                                                          >
                                                                            {
                                                                              discountLabel
                                                                            }
                                                                          </Badge>
                                                                        ) : (
                                                                          <span className="text-slate-400 text-xs font-mono">
                                                                            —
                                                                          </span>
                                                                        )}
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 6: Unit Cost (per unit) */}
                                                            <td className="min-w-[95px] p-2 text-right align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-left">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const unitCost =
                                                                      cost > 0
                                                                        ? cost *
                                                                          (u.baseQuantity ||
                                                                            1)
                                                                        : 0;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-center font-mono text-xs font-semibold text-slate-700 dark:text-slate-300"
                                                                      >
                                                                        {unitCost >
                                                                        0
                                                                          ? `$${unitCost.toFixed(
                                                                              2,
                                                                            )}/${u.unitName}`
                                                                          : "—"}
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 5: Retail Price ($) (per unit, margin % removed) */}
                                                            <td className="min-w-[100px] p-2 text-right align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-right">
                                                                {allUnits.map(
                                                                  (u) => (
                                                                    <div
                                                                      key={
                                                                        u.unitId
                                                                      }
                                                                      className="h-6 flex items-center justify-center font-mono text-xs font-bold text-foreground"
                                                                    >
                                                                      $
                                                                      {u.sellingPrice.toFixed(
                                                                        2,
                                                                      )}
                                                                      /
                                                                      {
                                                                        u.unitName
                                                                      }
                                                                    </div>
                                                                  ),
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 6: On Hand (Cascading decomposition base on unit) */}
                                                            <td className="min-w-[85px] p-2 text-right align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-right">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const qty =
                                                                      onHandDecomp.get(
                                                                        u.unitId,
                                                                      ) ?? 0;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-start gap-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400"
                                                                      >
                                                                        <span>
                                                                          {qty.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[10px] font-normal text-muted-foreground w-7 text-left">
                                                                          {
                                                                            u.unitName
                                                                          }
                                                                        </span>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 7: Reserved (Cascading decomposition base on unit) */}
                                                            <td className="min-w-[75px] p-2 text-right align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-right">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const qty =
                                                                      reservedDecomp.get(
                                                                        u.unitId,
                                                                      ) ?? 0;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-start gap-1 font-mono text-xs"
                                                                      >
                                                                        <span
                                                                          className={cn(
                                                                            "font-bold",
                                                                            qty >
                                                                              0
                                                                              ? "text-amber-600 dark:text-amber-400"
                                                                              : "text-muted-foreground",
                                                                          )}
                                                                        >
                                                                          {qty.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[10px] font-normal text-muted-foreground w-7 text-left">
                                                                          {
                                                                            u.unitName
                                                                          }
                                                                        </span>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 8: Available (Cascading decomposition base on unit) */}
                                                            <td className="min-w-[85px] p-2 text-right align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-right">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const qty =
                                                                      availableDecomp.get(
                                                                        u.unitId,
                                                                      ) ?? 0;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-start gap-1 font-mono text-xs"
                                                                      >
                                                                        <span
                                                                          className={cn(
                                                                            "font-bold",
                                                                            availableStock <=
                                                                              0
                                                                              ? "text-rose-600 dark:text-rose-400"
                                                                              : isLowStock
                                                                                ? "text-amber-600 dark:text-amber-400"
                                                                                : "text-emerald-600 dark:text-emerald-400",
                                                                          )}
                                                                        >
                                                                          {qty.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[10px] font-normal text-muted-foreground w-7 text-left">
                                                                          {
                                                                            u.unitName
                                                                          }
                                                                        </span>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 9: Sold (Cascading decomposition base on unit) */}
                                                            <td className="min-w-[75px] p-2 text-left align-top">
                                                              <div className="flex flex-col gap-1 py-0.5 text-left">
                                                                {allUnits.map(
                                                                  (u) => {
                                                                    const qty =
                                                                      soldDecomp.get(
                                                                        u.unitId,
                                                                      ) ?? 0;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          u.unitId
                                                                        }
                                                                        className="h-6 flex items-center justify-start gap-1 font-mono text-xs text-muted-foreground"
                                                                      >
                                                                        <span className="font-semibold text-foreground">
                                                                          {qty.toLocaleString()}
                                                                        </span>
                                                                        <span className="text-[10px] font-normal text-muted-foreground w-7 text-left">
                                                                          {
                                                                            u.unitName
                                                                          }
                                                                        </span>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}
                                                              </div>
                                                            </td>

                                                            {/* Col 10: Stock Status */}
                                                            <td className="min-w-[95px] p-2 text-center align-middle">
                                                              {isOutOfStock ? (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                                                                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                                  {t(
                                                                    "stocks.outOfStock",
                                                                  )}
                                                                </span>
                                                              ) : isLowStock ? (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                                                                  <span className="size-1.5 rounded-full bg-amber-500" />
                                                                  {t(
                                                                    "stocks.lowStockAlert",
                                                                  )}
                                                                </span>
                                                              ) : (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                                                                  <span className="size-1.5 rounded-full bg-emerald-500" />
                                                                  {t(
                                                                    "stocks.inStock",
                                                                  )}
                                                                </span>
                                                              )}
                                                            </td>

                                                            {/* Col 11: Actions (Unit Hierarchy Popover placed before Adjust) */}
                                                            <td className="w-10 p-2 text-left align-middle">
                                                             
                                                                {/* Movements Button */}
                                                                <Button
                                                                  size="sm"
                                                                  variant="ghost"
                                                                  onClick={() =>
                                                                    openVariantMovementsModal(
                                                                      v.variantId,
                                                                      v.variantName,
                                                                      v.sku,
                                                                      undefined,
                                                                      undefined,
                                                                      stockData.allUnits,
                                                                    )
                                                                  }
                                                                  className="h-7 w-7 p-0 text-slate-500"
                                                                  title={t(
                                                                    "stocks.allMovements",
                                                                  )}
                                                                >
                                                                  <History className="size-3.5" />
                                                                </Button>
                                                             
                                                            </td>
                                                          </tr>
                                                        );
                                                      },
                                                    )
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                      </TableCell>
                                    </TableRow>
                                );
                              })()}
                          </React.Fragment>
                        );
                      },
                    )}
                  </TableBody>
                </Table>

                {/* Table Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  {/* Left: Per-page dropdown & showing count */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {t("common.rowsPerPage", "Rows per page:")}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 min-w-[64px] px-2.5 text-xs font-semibold rounded-lg border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground gap-1.5 shadow-2xs transition-all cursor-pointer focus-visible:ring-1 focus-visible:ring-purple-600"
                            >
                              <span>{searchSize}</span>
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent
                          align="start"
                          side="top"
                          className="min-w-[84px] p-1 shadow-lg rounded-xl border-slate-200 dark:border-slate-800 bg-popover"
                        >
                          {PAGE_SIZE_OPTIONS.map((opt) => {
                            const isSelected = searchSize === opt;
                            return (
                              <DropdownMenuItem
                                key={opt}
                                onClick={() => {
                                  setSearchSize(opt);
                                  setSearchPage(0);
                                }}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors",
                                  isSelected
                                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold"
                                    : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                                )}
                              >
                                <span>{opt}</span>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                )}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {searchTotalElements === 0 ? (
                        "No products found"
                      ) : (
                        <>
                          Showing{" "}
                          <span className="font-semibold text-foreground">
                            {searchPage * searchSize + 1}
                          </span>
                          –
                          <span className="font-semibold text-foreground">
                            {Math.min(
                              (searchPage + 1) * searchSize,
                              searchTotalElements,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold text-foreground">
                            {searchTotalElements}
                          </span>{" "}
                          products
                          {searchTotalPages > 1 && (
                            <span className="text-muted-foreground/80 ml-1.5 font-normal">
                              (Page {searchPage + 1} of {searchTotalPages})
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Right: Clean pagination controls with First, Prev, Numbers + Ellipses, Next, Last */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                    {/* First Page */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={searchPage === 0 || isLoadingSearchStock}
                      onClick={() => setSearchPage(0)}
                      className="h-8 px-2.5 text-xs font-medium rounded-lg gap-1 border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      title={t("common.first", "First Page")}
                      aria-label="First Page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">
                        {t("common.first", "First")}
                      </span>
                    </Button>

                    {/* Previous Page */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={searchPage === 0 || isLoadingSearchStock}
                      onClick={() =>
                        setSearchPage((prev) => Math.max(0, prev - 1))
                      }
                      className="h-8 px-2.5 text-xs font-medium rounded-lg gap-1 border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      title={t("common.previous", "Previous Page")}
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {t("common.previous", "Previous")}
                      </span>
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {paginationItems.map((item, idx) => {
                        if (typeof item === "number") {
                          const isCurrent = searchPage === item - 1;
                          return (
                            <Button
                              key={`page-${item}`}
                              size="sm"
                              variant={isCurrent ? "default" : "outline"}
                              disabled={isLoadingSearchStock}
                              onClick={() => setSearchPage(item - 1)}
                              className={cn(
                                "h-8 min-w-[32px] px-2 text-xs rounded-lg transition-colors font-medium",
                                isCurrent
                                  ? "bg-purple-600 hover:bg-purple-700 text-white font-bold border-purple-600 shadow-2xs dark:bg-purple-600 dark:hover:bg-purple-700"
                                  : "border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                              )}
                              aria-current={isCurrent ? "page" : undefined}
                            >
                              {item}
                            </Button>
                          );
                        }

                        if (item === "ellipsis-prev") {
                          return (
                            <Button
                              key={`ellipsis-prev-${idx}`}
                              size="sm"
                              variant="ghost"
                              disabled={isLoadingSearchStock}
                              onClick={() =>
                                setSearchPage((prev) => Math.max(0, prev - 5))
                              }
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group"
                              title="Jump back 5 pages"
                              aria-label="Jump back 5 pages"
                            >
                              <MoreHorizontal className="h-4 w-4 group-hover:hidden" />
                              <ChevronsLeft className="h-4 w-4 hidden group-hover:block text-purple-600" />
                            </Button>
                          );
                        }

                        if (item === "ellipsis-next") {
                          return (
                            <Button
                              key={`ellipsis-next-${idx}`}
                              size="sm"
                              variant="ghost"
                              disabled={isLoadingSearchStock}
                              onClick={() =>
                                setSearchPage((prev) =>
                                  Math.min(searchTotalPages - 1, prev + 5),
                                )
                              }
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group"
                              title="Jump forward 5 pages"
                              aria-label="Jump forward 5 pages"
                            >
                              <MoreHorizontal className="h-4 w-4 group-hover:hidden" />
                              <ChevronsRight className="h-4 w-4 hidden group-hover:block text-purple-600" />
                            </Button>
                          );
                        }

                        return null;
                      })}
                    </div>

                    {/* Next Page */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        searchPage >= searchTotalPages - 1 ||
                        isLoadingSearchStock
                      }
                      onClick={() =>
                        setSearchPage((prev) =>
                          Math.min(searchTotalPages - 1, prev + 1),
                        )
                      }
                      className="h-8 px-2.5 text-xs font-medium rounded-lg gap-1 border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      title={t("common.next", "Next Page")}
                      aria-label="Next Page"
                    >
                      <span className="hidden sm:inline">
                        {t("common.next", "Next")}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>

                    {/* Last Page */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        searchPage >= searchTotalPages - 1 ||
                        isLoadingSearchStock
                      }
                      onClick={() => setSearchPage(searchTotalPages - 1)}
                      className="h-8 px-2.5 text-xs font-medium rounded-lg gap-1 border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                      title={t("common.last", "Last Page")}
                      aria-label="Last Page"
                    >
                      <span className="hidden xl:inline">
                        {t("common.last", "Last")}
                      </span>
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
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
                                    undefined,
                                    undefined,
                                    (v as any).units,
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
                                    undefined,
                                    undefined,
                                    (v as any).units,
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
          {/* Packaging Unit Breakdown Formula Pill (when packaging units exist) */}
          {activeMovementUnits.some((u: any) => Number(u.baseQuantity) > 1) && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Layers className="size-3.5" />
                  {t("stocks.packagingBreakdown")}:
                </span>
                {activeMovementUnits
                  .filter((u: any) => Number(u.baseQuantity) > 1)
                  .map((u: any) => {
                    const baseName =
                      activeMovementUnits.find(
                        (bu: any) => bu.isBase || Number(bu.baseQuantity) === 1,
                      )?.unitName ||
                      u.baseUnitName ||
                      t("stocks.units");
                    return (
                      <Badge
                        key={u.unitId || u.unitName}
                        variant="outline"
                        className="bg-white/80 dark:bg-slate-900/80 border-purple-200 dark:border-purple-800 text-[11px] font-medium"
                      >
                        1 {u.unitName} = {u.baseQuantity} {baseName}
                      </Badge>
                    );
                  })}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 font-medium hidden sm:inline">
                {filteredVariantMovements.length} {t("stocks.movementRecords")}
              </span>
            </div>
          )}

          {/* Clean Controls: Warehouse Filter Dropdown + Quick Search + Record Count */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="w-full sm:w-64">
              <ModernSelect
                label=""
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

            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  value={variantMovementSearch}
                  onChange={(e) => setVariantMovementSearch(e.target.value)}
                  placeholder={t("stocks.searchMovementsPlaceholder")}
                  className="h-9 pl-8 pr-7 text-xs rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
                {variantMovementSearch && (
                  <button
                    type="button"
                    onClick={() => setVariantMovementSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <Badge
                variant="outline"
                className="h-9 px-2.5 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shrink-0 font-mono text-slate-700 dark:text-slate-300"
              >
                {filteredVariantMovements.length} {t("stocks.movementRecords")}
              </Badge>
            </div>
          </div>

          {/* Movements Timeline Table */}
          {isLoadingVariantMovements ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {t("stocks.processing")}
              </p>
            </div>
          ) : filteredVariantMovements.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <History className="size-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("stocks.noMovementsFound")}
              </p>
              {variantMovementSearch && (
                <p className="text-xs text-muted-foreground">
                  Try clearing your search query &quot;{variantMovementSearch}&quot;
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredVariantMovements.map((m) => {
                const meta = getMovementTypeMeta(
                  m.movementType,
                  m.quantityChange,
                );
                const changeBreakdown = formatQuantityToUnitBreakdown(
                  m.quantityChange,
                  activeMovementUnits,
                  { includePlusSign: true },
                );
                const beforeBreakdown = formatQuantityToUnitBreakdown(
                  m.quantityBefore,
                  activeMovementUnits,
                  { includePlusSign: false },
                );
                const afterBreakdown = formatQuantityToUnitBreakdown(
                  m.quantityAfter,
                  activeMovementUnits,
                  { includePlusSign: false },
                );

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs hover:border-purple-300 dark:hover:border-purple-800/60 transition-all space-y-2.5"
                  >
                    {/* Header: Movement Type + Warehouse + Ref ID + Timestamp */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-2 py-0.5 text-[11px] font-bold flex items-center gap-1.5 shadow-2xs",
                            meta.badgeCls,
                          )}
                        >
                          <meta.icon className="size-3" />
                          <span>{meta.label}</span>
                        </Badge>

                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <WarehouseIcon className="size-3.5 text-slate-400" />
                          {m.warehouseName ||
                            (m.warehouseId
                              ? `Warehouse #${m.warehouseId}`
                              : "Central Warehouse")}
                        </span>

                        {m.referenceId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Receipt className="size-3 text-slate-400" />
                            {m.referenceId}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="size-3" />
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 text-xs">
                      {/* Qty Change */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          {t("stocks.qtyChange")}
                        </span>
                        <div
                          className={cn(
                            "text-sm sm:text-base font-black tracking-tight",
                            m.quantityChange > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : m.quantityChange < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-600",
                          )}
                        >
                          {changeBreakdown.formatted}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {m.quantityChange > 0
                            ? `+${m.quantityChange}`
                            : m.quantityChange}{" "}
                          {t("stocks.baseUnits")}
                        </div>
                      </div>

                      {/* Stock Balance Before -> After */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          {t("stocks.qtyBeforeAfter")}
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                          <span>{beforeBreakdown.formatted}</span>
                          <ArrowRight className="size-3 text-slate-400 shrink-0" />
                          <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                            {afterBreakdown.formatted}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {m.quantityBefore.toLocaleString()} →{" "}
                          {m.quantityAfter.toLocaleString()} {t("stocks.baseUnits")}
                        </div>
                      </div>

                      {/* Cost Snapshot */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          {t("stocks.costBeforeAfter")}
                        </span>
                        <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                          ${m.avgCostBefore?.toFixed(2) ?? "0.00"} →{" "}
                          <strong className="font-bold text-slate-900 dark:text-slate-100">
                            ${m.avgCostAfter?.toFixed(2) ?? "0.00"}
                          </strong>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {m.referenceType
                            ? `Ref: ${m.referenceType}`
                            : "Audit Snapshot"}
                        </div>
                      </div>
                    </div>

                    {/* Movement Note */}
                    {m.note && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
                        <Info className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed break-words">
                          {m.note}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
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
    <PermissionGuard resource="STOCK" action="READ">
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading stock inventory...
          </div>
        }
      >
        <StockPageContent />
      </Suspense>
    </PermissionGuard>
  );
}

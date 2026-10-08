"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	productsApi,
	suppliersApi,
	warehousesApi,
	unitsApi,
	categoriesApi,
	inventoryImportsApi,
	stocksApi,
	safeImageUrl,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Product,
	Supplier,
	Warehouse,
	Category,
	Unit,
	VariantUnit,
	DynamicInventorySubmitPayload,
	DynamicInventoryItemPayload,
	StockAdjustmentPayload,
} from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";
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
import { ModernDatePicker } from "@/components/ui-custom/form-controls/modern-date-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Package,
	Search,
	Plus,
	Minus,
	Trash2,
	Building2,
	Truck,
	Sparkles,
	DollarSign,
	Tag,
	Boxes,
	Calendar,
	Clock,
	FileText,
	RefreshCw,
	Copy,
	CheckCheck,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	ChevronUp,
	TrendingUp,
	Layers,
	ArrowRightLeft,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	X,
	Store,
	Phone,
	BarChart3,
	SlidersHorizontal,
	Scale,
	ArrowDownRight,
	ArrowUpRight,
	HelpCircle,
} from "lucide-react";

// Types
export type InventoryStudioMode =
	| "IMPORT"
	| "ADJUSTMENT"
	| "TRANSFER"
	| "STOCK_IN";

export interface ManifestLineItem {
	id: string;
	productId: string | number;
	variantId: string | number;
	productName: string;
	variantName: string;
	sku: string;
	imageUrl?: string;
	unitId: string | number;
	unitName: string;
	quantity: number;
	adjustmentQuantity?: number;
	unitCost: number;
	untiPrice: number; // Matches backend schema
	unitPrice: number;
	availableStock?: number;
	reason?: string;
	notes?: string;
	AdjustmentType?: "INCREASE" | "DECREASE";
	adjustmentType?: "INCREASE" | "DECREASE";
}

export interface DynamicInventoryStudioModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode?: InventoryStudioMode;
	title?: string;
	subtitle?: string;
	referencePrefix?: string;
	defaultAdjustmentType?: "INCREASE" | "DECREASE";
	defaultReason?: string;
	defaultNotes?: string;
	defaultSupplierId?: string | number;
	defaultWarehouseId?: string | number;
	initialItems?: Partial<ManifestLineItem>[];
	onSuccess?: (result?: any) => void;
	customSubmitHandler?: (payload: any) => Promise<any>;
}

// Fallback image helper
function SafeProductThumb({
	src,
	alt,
	className,
}: {
	src?: string;
	alt?: string;
	className?: string;
}) {
	const [hasError, setHasError] = useState(false);
	const resolvedUrl = safeImageUrl(src);

	if (hasError || !src) {
		return (
			<div
				className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl ${className}`}
			>
				<Package className="h-5 w-5 opacity-60" />
			</div>
		);
	}

	return (
		<img
			src={resolvedUrl}
			alt={alt || "Product"}
			onError={() => setHasError(true)}
			className={`object-cover rounded-xl ${className}`}
		/>
	);
}

// Generate Reference Sequence
function generateReferenceNumber(prefix = "IMP"): string {
	const year = new Date().getFullYear();
	const randomSeq = Math.floor(100 + Math.random() * 900);
	return `${prefix}-${year}-${randomSeq}`;
}

export function DynamicInventoryStudioModal({
	open,
	onOpenChange,
	mode = "IMPORT",
	title,
	subtitle,
	referencePrefix = mode === "ADJUSTMENT" ? "ADJ" : "IMP",
	defaultAdjustmentType = "INCREASE",
	defaultReason = mode === "ADJUSTMENT" ? "Inventory audit" : "",
	defaultNotes = mode === "ADJUSTMENT" ? "Monthly physical count" : "",
	defaultSupplierId,
	defaultWarehouseId,
	initialItems,
	onSuccess,
	customSubmitHandler,
}: DynamicInventoryStudioModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const categoryScrollRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Header & Transaction Meta State
	const [referenceNo, setReferenceNo] = useState<string>(() =>
		generateReferenceNumber(referencePrefix),
	);
	const [supplierId, setSupplierId] = useState<string>(
		defaultSupplierId ? String(defaultSupplierId) : "",
	);
	const [warehouseId, setWarehouseId] = useState<string>(
		defaultWarehouseId ? String(defaultWarehouseId) : "",
	);
	const [importDate, setImportDate] = useState<string>(() => {
		const d = new Date();
		return d.toISOString().split("T")[0];
	});
	const [importTime, setImportTime] = useState<string>(() => {
		const d = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
	});

	// Collapsible Header Details State
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	// Stock Adjustment Specific Master State
	const [defaultItemAdjustmentType, setDefaultItemAdjustmentType] =
		useState<"INCREASE" | "DECREASE">(defaultAdjustmentType);
	const [adjustReason, setAdjustReason] = useState<string>(defaultReason);
	const [adjustNotes, setAdjustNotes] = useState<string>(defaultNotes);
	const [generalNote, setGeneralNote] = useState<string>("");

	// Manifest Cart Items State
	const [manifestItems, setManifestItems] = useState<ManifestLineItem[]>([]);
	const [copiedRef, setCopiedRef] = useState(false);

	// Catalog Explorer Search & Filter State
	const [productSearch, setProductSearch] = useState("");
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
	const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

	// Variant & Unit Configurator Popover State
	const [configuringProduct, setConfiguringProduct] = useState<Product | null>(
		null,
	);
	const [configVariantId, setConfigVariantId] = useState<string>("");
	const [configUnitId, setConfigUnitId] = useState<string>("");
	const [configQuantity, setConfigQuantity] = useState<number>(1);
	const [configUnitCost, setConfigUnitCost] = useState<number>(0);
	const [configUntiPrice, setConfigUntiPrice] = useState<number>(0);
	const [configAdjustmentType, setConfigAdjustmentType] =
		useState<"INCREASE" | "DECREASE">(defaultAdjustmentType);
	const [configItemReason, setConfigItemReason] = useState<string>("");
	const [configItemNotes, setConfigItemNotes] = useState<string>("");

	// Inline Add Supplier Modal State
	const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
	const [newSupplierName, setNewSupplierName] = useState("");
	const [newSupplierPhone, setNewSupplierPhone] = useState("");

	// Fetch Data Queries
	const { data: productsData, isLoading: isLoadingProducts } = useQuery({
		queryKey: ["inventory-studio-products", productSearch],
		queryFn: () =>
			productsApi.list({
				limit: 300,
				search: productSearch,
			} as any),
		enabled: open,
	});

	const { data: categoriesData } = useQuery({
		queryKey: ["categories-all"],
		queryFn: () => categoriesApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: suppliersData } = useQuery({
		queryKey: ["suppliers-all"],
		queryFn: () => suppliersApi.list({ limit: 100 }),
		enabled: open && mode === "IMPORT",
	});

	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses-all"],
		queryFn: () => warehousesApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: unitsData } = useQuery({
		queryKey: ["units-all"],
		queryFn: () => unitsApi.list({ limit: 100 }),
		enabled: open,
	});

	// Fetch specific units for configuring product
	const { data: configProductUnits } = useQuery({
		queryKey: ["inventory-studio-product-units", configuringProduct?.id],
		queryFn: () =>
			configuringProduct?.id
				? productsApi.getProductUnits(configuringProduct.id)
				: Promise.resolve([]),
		enabled: Boolean(configuringProduct?.id),
	});

	// Fetch full detailed product with complete variants and units
	const { data: fullConfiguringProduct } = useQuery({
		queryKey: ["inventory-studio-product-detail", configuringProduct?.id],
		queryFn: () =>
			configuringProduct?.id
				? productsApi.get(configuringProduct.id)
				: Promise.resolve(null),
		enabled: Boolean(configuringProduct?.id),
	});

	// Fetch variant-specific units via GET /api/v1/products/variant/{variantId}/units
	const { data: configVariantUnits } = useQuery<VariantUnit[]>({
		queryKey: ["inventory-studio-variant-units", configVariantId],
		queryFn: () =>
			configVariantId
				? productsApi.getVariantUnits(configVariantId)
				: Promise.resolve([]),
		enabled: Boolean(configVariantId),
	});

	// Merged detailed product for configurator
	const effectiveConfiguringProduct = useMemo(() => {
		if (!configuringProduct) return null;
		if (
			fullConfiguringProduct &&
			String(fullConfiguringProduct.id) === String(configuringProduct.id)
		) {
			return {
				...configuringProduct,
				...fullConfiguringProduct,
				variants:
					fullConfiguringProduct.variants &&
					fullConfiguringProduct.variants.length > 0
						? fullConfiguringProduct.variants
						: configuringProduct.variants,
				units:
					fullConfiguringProduct.units &&
					fullConfiguringProduct.units.length > 0
						? fullConfiguringProduct.units
						: configuringProduct.units,
			};
		}
		return configuringProduct;
	}, [configuringProduct, fullConfiguringProduct]);

	// Effective units list for configuring product
	const effectiveConfigUnits = useMemo(() => {
		const targetProduct = effectiveConfiguringProduct || configuringProduct;
		if (!targetProduct) return [];

		const map = new Map<string, any>();

		(unitsData?.items || []).forEach((u: any) => {
			const id = String(u.unitId || u.id);
			map.set(id, { ...u, unitId: id });
		});

		const prodUnits =
			configProductUnits && configProductUnits.length > 0
				? configProductUnits
				: targetProduct.units && targetProduct.units.length > 0
					? targetProduct.units
					: [];

		prodUnits.forEach((u: any) => {
			const id = String(u.unitId || u.id);
			const existing = map.get(id) || {};
			map.set(id, {
				...existing,
				...u,
				unitId: id,
				unitName: u.name || u.unitName || existing.name || existing.unitName,
				baseQuantity:
					u.baseQuantity ??
					u.conversionFactor ??
					existing.baseQuantity ??
					existing.conversionFactor ??
					1,
			});
		});

		const variants =
			targetProduct.variants || (targetProduct as any).productVariants || [];
		const selectedVariant = variants.find(
			(v: any) =>
				String(v.id || v.variantId || v._id) === String(configVariantId),
		);
		if (selectedVariant?.units && Array.isArray(selectedVariant.units)) {
			selectedVariant.units.forEach((u: any) => {
				const id = String(u.unitId || u.id);
				const existing = map.get(id) || {};
				map.set(id, {
					...existing,
					...u,
					unitId: id,
					unitName:
						u.unitName || u.name || existing.unitName || existing.name,
					baseQuantity:
						u.conversionFactor ??
						u.baseQuantity ??
						existing.baseQuantity ??
						existing.conversionFactor ??
						1,
					finalPrice: u.finalPrice,
					basePrice: u.basePrice,
				});
			});
		}

		if (
			configVariantUnits &&
			Array.isArray(configVariantUnits) &&
			configVariantUnits.length > 0
		) {
			configVariantUnits.forEach((u: any) => {
				const id = String(u.unitId || u.id);
				const existing = map.get(id) || {};
				map.set(id, {
					...existing,
					...u,
					unitId: id,
					unitName:
						u.unitName || u.name || existing.unitName || existing.name,
					baseQuantity:
						u.baseQuantity ??
						u.conversionFactor ??
						existing.baseQuantity ??
						existing.conversionFactor ??
						1,
					finalPrice: u.finalPrice,
					basePrice: u.basePrice,
				});
			});
		}

		const validUnitIds = new Set<string>();
		prodUnits.forEach((u: any) => validUnitIds.add(String(u.unitId || u.id)));
		if (selectedVariant?.units) {
			selectedVariant.units.forEach((u: any) =>
				validUnitIds.add(String(u.unitId || u.id)),
			);
		}
		if (configVariantUnits && configVariantUnits.length > 0) {
			configVariantUnits.forEach((u: any) =>
				validUnitIds.add(String(u.unitId || u.id)),
			);
		}

		const resultList =
			validUnitIds.size > 0
				? Array.from(map.values()).filter((u: any) =>
						validUnitIds.has(String(u.unitId || u.id)),
					)
				: Array.from(map.values());

		return resultList.sort((a: any, b: any) => {
			const qtyA = Number(a.baseQuantity || a.conversionFactor || 1);
			const qtyB = Number(b.baseQuantity || b.conversionFactor || 1);
			return qtyA - qtyB;
		});
	}, [
		configProductUnits,
		effectiveConfiguringProduct,
		configuringProduct,
		unitsData,
		configVariantId,
		configVariantUnits,
	]);

	// Resolved Price & Cost Calculator based on Product, Variant & Unit (Unit cost defaults to 0 as requested)
	const calculateResolvedPriceAndCost = (
		prod: Product | any | null,
		variantIdStr: string | number,
		unitIdStr: string | number,
		unitsList: any[] = [],
		varUnits: any[] = configVariantUnits || [],
	): { unitCost: number; unitPrice: number } => {
		if (!prod) return { unitCost: 0, unitPrice: 0 };

		const variants = prod.variants || prod.productVariants || [];
		const selectedVariant =
			variants.find(
				(v: any) =>
					String(v.id) === String(variantIdStr) ||
					String(v.variantId) === String(variantIdStr) ||
					String(v._id) === String(variantIdStr),
			) || variants[0];

		// 1. Get Variant Base Price (for 1 base unit of this specific variant)
		let variantBasePrice = 0;
		if (selectedVariant) {
			const rawVPrice =
				selectedVariant.finalPrice ??
				selectedVariant.sellPrice ??
				selectedVariant.price ??
				selectedVariant.unitPrice ??
				selectedVariant.basePrice ??
				selectedVariant.retailPrice;
			if (
				rawVPrice !== undefined &&
				rawVPrice !== null &&
				!isNaN(Number(rawVPrice)) &&
				Number(rawVPrice) > 0
			) {
				variantBasePrice = Number(rawVPrice);
			}
		}

		// Fallback to product base price if variant price not set
		if (variantBasePrice <= 0) {
			const rawPPrice =
				prod.sellPrice ?? prod.price ?? prod.finalPrice ?? prod.basePrice ?? 0;
			variantBasePrice = Number(rawPPrice) || 0;
		}

		// Find matching unit object (from product specific units or global units list)
		const selectedUnitObj = unitsList.find(
			(u: any) =>
				String(u.unitId) === String(unitIdStr) ||
				String(u.id) === String(unitIdStr) ||
				String(u.unit_id) === String(unitIdStr),
		);

		// Check Multiplier / Conversion factor (e.g. Box of 10 -> factor = 10, Carton of 24 -> factor = 24)
		const factor = Number(
			selectedUnitObj?.baseQuantity ??
				selectedUnitObj?.multiplier ??
				selectedUnitObj?.conversionFactor ??
				selectedUnitObj?.conversionRate ??
				selectedUnitObj?.factor ??
				1,
		);
		const validFactor = !isNaN(factor) && factor > 0 ? factor : 1;

		const isExplicitBaseUnit = Boolean(
			selectedUnitObj?.isBase ||
				selectedUnitObj?.is_base ||
				(selectedUnitObj?.baseUnitId &&
					String(selectedUnitObj?.baseUnitId) ===
						String(selectedUnitObj?.unitId || selectedUnitObj?.id)) ||
				validFactor === 1,
		);

		let resolvedPrice = 0;

		// Priority 1: Check if varUnits (from GET /products/variant/{variantId}/units API) has price
		if (Array.isArray(varUnits) && varUnits.length > 0) {
			const matched = varUnits.find((vu: any) => {
				const uId = String(vu.unitId ?? vu.id ?? "");
				return (
					uId === String(unitIdStr) ||
					(selectedUnitObj &&
						(uId === String(selectedUnitObj.unitId) ||
							uId === String(selectedUnitObj.id)))
				);
			});
			if (matched) {
				const p = Number(
					matched.finalPrice ??
						matched.basePrice ??
						matched.sellPrice ??
						matched.unitPrice ??
						matched.price,
				);
				if (!isNaN(p) && p > 0) {
					resolvedPrice = p;
				}
			}
		}

		// Priority 2: Check if the variant itself has explicit unitPrices/units for this unit
		if (resolvedPrice <= 0 && selectedVariant) {
			const vUnitPrices =
				selectedVariant.units ||
				selectedVariant.unitPrices ||
				selectedVariant.unit_prices ||
				[];
			if (Array.isArray(vUnitPrices) && vUnitPrices.length > 0) {
				const vUp = vUnitPrices.find((up: any) => {
					const uId = String(up.unitId ?? up.unit_id ?? up.id ?? "");
					return (
						uId === String(unitIdStr) ||
						(selectedUnitObj &&
							(uId === String(selectedUnitObj.unitId) ||
								uId === String(selectedUnitObj.id)))
					);
				});
				if (vUp) {
					const p = Number(
						vUp.finalPrice ??
							vUp.sellPrice ??
							vUp.unitPrice ??
							vUp.price ??
							vUp.retailPrice,
					);
					if (!isNaN(p) && p > 0) {
						resolvedPrice = p;
					}
				}
			}
		}

		// Priority 3: Check if selectedUnitObj has variantPrices for this specific variant
		if (
			resolvedPrice <= 0 &&
			selectedUnitObj?.variantPrices &&
			Array.isArray(selectedUnitObj.variantPrices)
		) {
			const vp = selectedUnitObj.variantPrices.find((vPriceObj: any) => {
				const vId = String(
					vPriceObj.variantId ?? vPriceObj.variant_id ?? vPriceObj.id ?? "",
				);
				return (
					vId === String(variantIdStr) ||
					(selectedVariant &&
						(vId === String(selectedVariant.id) ||
							vId === String(selectedVariant.variantId)))
				);
			});
			if (vp) {
				const p = Number(
					vp.finalPrice ??
						vp.unitPrice ??
						vp.sellPrice ??
						vp.price ??
						vp.retailPrice,
				);
				if (!isNaN(p) && p > 0) {
					resolvedPrice = p;
				}
			}
		}

		// Priority 4: If Base Unit (or 1x multiplier), use variant's base price
		if (resolvedPrice <= 0) {
			if (isExplicitBaseUnit) {
				resolvedPrice = variantBasePrice;
			} else {
				// Priority 5: Non-base packaging unit (e.g. Box of 10, Carton of 24)
				if (variantBasePrice > 0 && validFactor > 1) {
					resolvedPrice = variantBasePrice * validFactor;
				} else {
					const directUnitPrice = Number(
						selectedUnitObj?.finalPrice ??
							selectedUnitObj?.sellPrice ??
							selectedUnitObj?.unitPrice ??
							selectedUnitObj?.price ??
							0,
					);
					if (!isNaN(directUnitPrice) && directUnitPrice > 0) {
						resolvedPrice = directUnitPrice;
					} else {
						resolvedPrice = variantBasePrice * validFactor;
					}
				}
			}
		}

		// Final sanity check
		if (resolvedPrice <= 0) {
			resolvedPrice = variantBasePrice > 0 ? variantBasePrice : 0;
		}

		return { unitCost: 0, unitPrice: resolvedPrice };
	};

	// Real-time synchronization of cost (set to 0) & retail price when variant or unit changes in configurator modal
	useEffect(() => {
		const targetProduct = effectiveConfiguringProduct || configuringProduct;
		if (targetProduct) {
			let currentUnitId = configUnitId;
			if (effectiveConfigUnits.length > 0) {
				const found = effectiveConfigUnits.find(
					(u: any) =>
						String(u.unitId) === String(configUnitId) ||
						String(u.id) === String(configUnitId),
				);
				if (!found) {
					const baseUnit =
						effectiveConfigUnits.find((u: any) => u.isBase || u.is_base) ||
						effectiveConfigUnits[0];
					currentUnitId = String(baseUnit.unitId || baseUnit.id);
					setConfigUnitId(currentUnitId);
				}
			}

			const { unitPrice } = calculateResolvedPriceAndCost(
				targetProduct,
				configVariantId,
				currentUnitId,
				effectiveConfigUnits,
				configVariantUnits || [],
			);
			setConfigUnitCost(0);
			setConfigUntiPrice(unitPrice);
		}
	}, [
		effectiveConfiguringProduct,
		configuringProduct,
		configVariantId,
		configUnitId,
		effectiveConfigUnits,
		configVariantUnits,
	]);

	// Set default warehouse & supplier if available
	useEffect(() => {
		if (warehousesData?.items?.length && !warehouseId) {
			setWarehouseId(String(warehousesData.items[0].id));
		}
	}, [warehousesData, warehouseId]);

	useEffect(() => {
		if (suppliersData?.items?.length && !supplierId && mode === "IMPORT") {
			setSupplierId(String(suppliersData.items[0].id));
		}
	}, [suppliersData, supplierId, mode]);

	// Initialize initial items if provided
	useEffect(() => {
		if (
			open &&
			initialItems &&
			initialItems.length > 0 &&
			manifestItems.length === 0
		) {
			const formatted = initialItems.map((it, idx) => {
				const itemType =
					it.AdjustmentType ||
					it.adjustmentType ||
					defaultAdjustmentType ||
					"INCREASE";
				return {
					id: String(Date.now() + idx),
					productId: it.productId || 1,
					variantId: it.variantId || 1,
					productName: it.productName || "Stock Item",
					variantName: it.variantName || "Standard",
					sku: it.sku || "",
					imageUrl: it.imageUrl,
					unitId: it.unitId || 1,
					unitName: it.unitName || "Pcs",
					quantity: Number(it.quantity || it.adjustmentQuantity) || 1,
					adjustmentQuantity:
						Number(it.adjustmentQuantity || it.quantity) || 1,
					unitCost: Number(it.unitCost) || 0,
					untiPrice: Number(it.untiPrice ?? it.unitPrice) || 0,
					unitPrice: Number(it.unitPrice ?? it.untiPrice) || 0,
					availableStock: it.availableStock,
					AdjustmentType: itemType,
					adjustmentType: itemType,
					reason:
						it.reason ||
						(mode === "ADJUSTMENT"
							? itemType === "INCREASE"
								? "Inventory audit"
								: "Damaged goods"
							: ""),
					notes:
						it.notes ||
						(mode === "ADJUSTMENT" ? "Found broken in shelf B3" : ""),
				};
			});
			setManifestItems(formatted);
		}
	}, [open, initialItems, mode, defaultAdjustmentType]);

	// Keyboard shortcut listener (/ to focus search)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!open) return;
			if (
				e.key === "/" &&
				document.activeElement?.tagName !== "INPUT" &&
				document.activeElement?.tagName !== "TEXTAREA"
			) {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	// Regenerate Reference Number
	const handleRegenerateReference = () => {
		const nextRef = generateReferenceNumber(referencePrefix);
		setReferenceNo(nextRef);
		toast.info(`Generated reference: ${nextRef}`);
	};

	// Copy Reference Number
	const handleCopyReference = () => {
		navigator.clipboard.writeText(referenceNo);
		setCopiedRef(true);
		toast.success("Reference number copied");
		setTimeout(() => setCopiedRef(false), 2000);
	};

	// Categories list with ALL
	const categoriesList = useMemo(() => {
		const items = categoriesData?.items || [];
		return [{ id: "ALL", name: t("stocks.allCategories") }, ...items];
	}, [categoriesData, t]);

	// Horizontal category scroll helpers
	const scrollCategories = (direction: "left" | "right") => {
		if (categoryScrollRef.current) {
			const scrollAmount = direction === "left" ? -200 : 200;
			categoryScrollRef.current.scrollBy({
				left: scrollAmount,
				behavior: "smooth",
			});
		}
	};

	// Robust Products filtering supporting all category representation patterns
	const filteredProducts = useMemo(() => {
		let prods = productsData?.items || [];
		if (selectedCategoryId !== "ALL") {
			const selectedCatObj = categoriesData?.items?.find(
				(c) => String(c.id) === String(selectedCategoryId),
			);
			const selectedCatName = selectedCatObj?.name?.toLowerCase()?.trim();

			prods = prods.filter((p: any) => {
				const pCatId =
					p.categoryId ??
					p.category?.id ??
					p.category_id ??
					(typeof p.category === "string" || typeof p.category === "number"
						? p.category
						: null);

				if (
					pCatId !== null &&
					pCatId !== undefined &&
					String(pCatId) === String(selectedCategoryId)
				) {
					return true;
				}

				const pCatName = (
					p.categoryName ||
					p.category?.name ||
					p.categoryTitle ||
					(typeof p.category === "string" ? p.category : "")
				)
					?.toLowerCase()
					?.trim();

				if (selectedCatName && pCatName && pCatName === selectedCatName) {
					return true;
				}

				return false;
			});
		}
		if (productSearch.trim()) {
			const q = productSearch.toLowerCase();
			prods = prods.filter(
				(p: any) =>
					p.name?.toLowerCase().includes(q) ||
					p.baseSku?.toLowerCase().includes(q) ||
					p.code?.toLowerCase().includes(q) ||
					p.sku?.toLowerCase().includes(q) ||
					p.barcode?.toLowerCase().includes(q) ||
					p.variants?.some(
						(v: any) =>
							v.name?.toLowerCase().includes(q) ||
							v.sku?.toLowerCase().includes(q) ||
							v.barcode?.toLowerCase().includes(q),
					),
			);
		}
		return prods;
	}, [productsData, selectedCategoryId, categoriesData, productSearch]);

	// Open Product Configurator Popover
	const handleProductCardClick = (product: Product) => {
		const variants =
			product.variants && product.variants.length > 0 ? product.variants : [];
		const firstVariant = variants[0];
		const defaultVariantId = firstVariant
			? String(firstVariant.id)
			: String(product.id);
		const prodUnits =
			product.units && product.units.length > 0
				? product.units
				: unitsData?.items || [];
		const baseUnit =
			prodUnits.find(
				(u: any) =>
					u.isBase || (u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
			) || prodUnits[0];
		const defaultUnitId = product.unitId
			? String(product.unitId)
			: baseUnit
				? String(baseUnit.unitId || baseUnit.id)
				: "1";

		const { unitCost: initialCost, unitPrice: initialPrice } =
			calculateResolvedPriceAndCost(
				product,
				defaultVariantId,
				defaultUnitId,
				prodUnits,
			);
		const stock = Number(firstVariant?.stockQty ?? product.stockQty ?? 0);
		const itemAdjType = defaultItemAdjustmentType || "INCREASE";

		if (variants.length <= 1) {
			// Direct add for single variant products
			addOrIncrementItem({
				productId: product.id,
				variantId: defaultVariantId,
				productName: product.name,
				variantName: firstVariant?.name || "Standard",
				sku: firstVariant?.sku || product.baseSku || "",
				imageUrl: product.imageUrl,
				unitId: defaultUnitId,
				unitName:
					baseUnit?.name || baseUnit?.unitName || product.unit?.name || "Pcs",
				quantity: 1,
				adjustmentQuantity: 1,
				unitCost: initialCost,
				untiPrice: initialPrice,
				unitPrice: initialPrice,
				availableStock: stock,
				AdjustmentType: itemAdjType,
				adjustmentType: itemAdjType,
				reason:
					mode === "ADJUSTMENT"
						? itemAdjType === "INCREASE"
							? "Inventory audit"
							: "Damaged goods"
						: "",
				notes: mode === "ADJUSTMENT" ? "Found broken in shelf B3" : "",
			});
			toast.success(
				mode === "ADJUSTMENT"
					? `Added "${product.name}" (${itemAdjType === "INCREASE" ? "+1 Increase" : "-1 Decrease"})`
					: `Added "${product.name}" to manifest`,
			);
		} else {
			// Multi-variant product: Open configurator
			setConfiguringProduct(product);
			setConfigVariantId(defaultVariantId);
			setConfigUnitId(defaultUnitId);
			setConfigQuantity(1);
			setConfigUnitCost(0);
			setConfigUntiPrice(initialPrice);
			setConfigAdjustmentType(itemAdjType);
			setConfigItemReason(
				mode === "ADJUSTMENT"
					? itemAdjType === "INCREASE"
						? "Inventory audit"
						: "Damaged goods"
					: "",
			);
			setConfigItemNotes(
				mode === "ADJUSTMENT" ? "Found broken in shelf B3" : "",
			);
		}
	};

	// Add configured item from popover
	const handleAddConfiguredItem = () => {
		const targetProduct = effectiveConfiguringProduct || configuringProduct;
		if (!targetProduct) return;
		const variants = targetProduct.variants || [];
		const selectedVariant =
			variants.find((v: any) => String(v.id) === String(configVariantId)) ||
			variants[0];
		const selectedUnit = effectiveConfigUnits.find(
			(u: any) =>
				String(u.unitId) === String(configUnitId) ||
				String(u.id) === String(configUnitId),
		);

		const itemAdjType =
			configAdjustmentType || defaultItemAdjustmentType || "INCREASE";

		addOrIncrementItem({
			productId: targetProduct.id,
			variantId: configVariantId || targetProduct.id,
			productName: targetProduct.name,
			variantName: selectedVariant?.name || "Standard Variant",
			sku: selectedVariant?.sku || targetProduct.baseSku || "",
			imageUrl: selectedVariant?.imageUrl || targetProduct.imageUrl,
			unitId: configUnitId || 1,
			unitName: selectedUnit?.name || selectedUnit?.unitName || "Pcs",
			quantity: configQuantity > 0 ? configQuantity : 1,
			adjustmentQuantity: configQuantity > 0 ? configQuantity : 1,
			unitCost: configUnitCost,
			untiPrice: configUntiPrice,
			unitPrice: configUntiPrice,
			availableStock: Number(
				selectedVariant?.stockQty ?? targetProduct.stockQty ?? 0,
			),
			AdjustmentType: itemAdjType,
			adjustmentType: itemAdjType,
			reason:
				configItemReason ||
				(mode === "ADJUSTMENT"
					? itemAdjType === "INCREASE"
						? "Inventory audit"
						: "Damaged goods"
					: ""),
			notes:
				configItemNotes ||
				(mode === "ADJUSTMENT" ? "Found broken in shelf B3" : ""),
		});

		toast.success(
			`Added "${targetProduct.name}" (${selectedVariant?.name || "Item"}) to manifest`,
		);
		setConfiguringProduct(null);
	};

	// Core Add or Increment Manifest Item
	const addOrIncrementItem = (itemToAdd: Omit<ManifestLineItem, "id">) => {
		setManifestItems((prev) => {
			const existingIdx = prev.findIndex(
				(it) =>
					String(it.variantId) === String(itemToAdd.variantId) &&
					String(it.unitId) === String(itemToAdd.unitId) &&
					(mode !== "ADJUSTMENT" ||
						(it.AdjustmentType || it.adjustmentType) ===
							(itemToAdd.AdjustmentType || itemToAdd.adjustmentType)),
			);

			if (existingIdx >= 0) {
				const updated = [...prev];
				updated[existingIdx] = {
					...updated[existingIdx],
					quantity: updated[existingIdx].quantity + itemToAdd.quantity,
					adjustmentQuantity:
						(updated[existingIdx].adjustmentQuantity ||
							updated[existingIdx].quantity) + itemToAdd.quantity,
					unitCost: itemToAdd.unitCost || updated[existingIdx].unitCost,
					untiPrice: itemToAdd.untiPrice || updated[existingIdx].untiPrice,
					unitPrice: itemToAdd.unitPrice || updated[existingIdx].unitPrice,
				};
				return updated;
			}

			const newLineItem: ManifestLineItem = {
				...itemToAdd,
				id: String(Date.now() + Math.random()),
			};
			return [newLineItem, ...prev];
		});
	};

	// Modify Line Item Properties with Real-Time Pricing Recalculation on Unit Change
	const updateManifestItem = (
		id: string,
		field: keyof ManifestLineItem | "AdjustmentType",
		value: any,
	) => {
		setManifestItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;

				if (field === "AdjustmentType" || field === "adjustmentType") {
					const newType = value as "INCREASE" | "DECREASE";
					let updatedReason = item.reason;
					if (
						!item.reason ||
						item.reason === "Damaged goods" ||
						item.reason === "Found surplus stock" ||
						item.reason === "Found stock" ||
						item.reason === "Inventory audit"
					) {
						updatedReason =
							newType === "INCREASE" ? "Inventory audit" : "Damaged goods";
					}
					return {
						...item,
						AdjustmentType: newType,
						adjustmentType: newType,
						reason: updatedReason,
					};
				}

				if (field === "unitId") {
					const prod = productsData?.items?.find(
						(p) => String(p.id) === String(item.productId),
					);
					const prodUnits =
						prod?.units && prod.units.length > 0
							? prod.units
							: unitsData?.items || [];
					const selectedUnitObj =
						prodUnits.find(
							(u: any) =>
								String(u.unitId) === String(value) ||
								String(u.id) === String(value),
						) || unitsData?.items?.find((u) => String(u.id) === String(value));

					const { unitCost, unitPrice } = calculateResolvedPriceAndCost(
						prod || null,
						String(item.variantId),
						String(value),
						prodUnits,
					);

					return {
						...item,
						unitId: String(value),
						unitName:
							selectedUnitObj?.name ||
							selectedUnitObj?.unitName ||
							item.unitName,
						unitCost: unitCost,
						untiPrice: unitPrice,
						unitPrice: unitPrice,
					};
				}

				if (field === "quantity" || field === "adjustmentQuantity") {
					const num = Math.max(1, Number(value) || 1);
					return { ...item, quantity: num, adjustmentQuantity: num };
				}

				if (field === "unitCost") {
					const cost = Math.max(0, Number(value) || 0);
					return { ...item, unitCost: cost };
				}

				if (field === "untiPrice" || field === "unitPrice") {
					const price = Math.max(0, Number(value) || 0);
					return { ...item, untiPrice: price, unitPrice: price };
				}

				return { ...item, [field]: value };
			}),
		);
	};

	// Remove Item
	const removeManifestItem = (id: string) => {
		setManifestItems((prev) => prev.filter((it) => it.id !== id));
	};

	// Clear All Items
	const handleClearManifest = () => {
		if (manifestItems.length === 0) return;
		if (confirm("Are you sure you want to clear all items in this manifest?")) {
			setManifestItems([]);
			toast.info("Manifest cleared");
		}
	};

	// Batch operation: Set all items in manifest to INCREASE or DECREASE
	const handleSetAllAdjustmentType = (type: "INCREASE" | "DECREASE") => {
		setManifestItems((prev) =>
			prev.map((it) => ({
				...it,
				AdjustmentType: type,
				adjustmentType: type,
				reason:
					!it.reason ||
					it.reason === "Damaged goods" ||
					it.reason === "Inventory audit" ||
					it.reason === "Found surplus stock"
						? type === "INCREASE"
							? "Inventory audit"
							: "Damaged goods"
						: it.reason,
			})),
		);
		setDefaultItemAdjustmentType(type);
		toast.info(`Set all manifest items to ${type}`);
	};

	// Detailed Breakdown for stock adjustments
	const adjustmentStats = useMemo(() => {
		let increaseUnits = 0;
		let increaseCount = 0;
		let decreaseUnits = 0;
		let decreaseCount = 0;

		manifestItems.forEach((it) => {
			const qty = Number(it.adjustmentQuantity || it.quantity) || 0;
			const type =
				it.AdjustmentType ||
				it.adjustmentType ||
				defaultItemAdjustmentType ||
				"INCREASE";
			if (type === "INCREASE") {
				increaseUnits += qty;
				increaseCount += 1;
			} else {
				decreaseUnits += qty;
				decreaseCount += 1;
			}
		});

		const netUnits = increaseUnits - decreaseUnits;

		return {
			increaseUnits,
			increaseCount,
			decreaseUnits,
			decreaseCount,
			netUnits,
		};
	}, [manifestItems, defaultItemAdjustmentType]);

	// Financial & Operational Calculations
	const totalUnits = useMemo(() => {
		return manifestItems.reduce(
			(sum, it) => sum + (Number(it.quantity || it.adjustmentQuantity) || 0),
			0,
		);
	}, [manifestItems]);

	const totalInboundCost = useMemo(() => {
		return manifestItems.reduce(
			(sum, it) =>
				sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0),
			0,
		);
	}, [manifestItems]);

	const totalEstimatedRevenue = useMemo(() => {
		return manifestItems.reduce(
			(sum, it) =>
				sum +
				(Number(it.quantity) || 0) *
					(Number(it.untiPrice ?? it.unitPrice) || 0),
			0,
		);
	}, [manifestItems]);

	const totalProjectedProfit = Math.max(
		0,
		totalEstimatedRevenue - totalInboundCost,
	);
	const projectedMarginPct =
		totalEstimatedRevenue > 0
			? ((totalProjectedProfit / totalEstimatedRevenue) * 100).toFixed(1)
			: "0.0";

	// Create Quick Supplier Mutation
	const createSupplierMutation = useMutation({
		mutationFn: (payload: { name: string; primaryPhone: string }) =>
			suppliersApi.create(payload),
		onSuccess: (res) => {
			toast.success(`Supplier "${res.name}" created successfully`);
			queryClient.invalidateQueries({ queryKey: ["suppliers-all"] });
			setSupplierId(String(res.id));
			setIsQuickSupplierOpen(false);
			setNewSupplierName("");
			setNewSupplierPhone("");
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Submit Mutation (Supports IMPORT and ADJUSTMENT)
	const submitMutation = useMutation({
		mutationFn: async () => {
			if (manifestItems.length === 0) {
				throw new Error("Please add at least one line item to the manifest");
			}

			if (mode === "IMPORT" && !supplierId) {
				throw new Error(
					"Please select a primary supplier for this import batch",
				);
			}

			// ============================================================
			// 1. STOCK ADJUSTMENT SUBMISSION (POST /api/v1/stocks/adjust)
			// ============================================================
			if (mode === "ADJUSTMENT") {
				const adjustPayload: StockAdjustmentPayload = {
					reason: (adjustReason || "Inventory audit").trim(),
					notes: (adjustNotes || "Monthly physical count").trim(),
					items: manifestItems.map((it) => {
						const itemType =
							it.AdjustmentType ||
							it.adjustmentType ||
							defaultItemAdjustmentType ||
							"INCREASE";
						return {
							variantId: Number(it.variantId || it.productId),
							unitId: it.unitId ? Number(it.unitId) : undefined,
							adjustmentQuantity: Number(
								it.adjustmentQuantity || it.quantity || 1,
							),
							reason: (
								it.reason ||
								adjustReason ||
								(itemType === "INCREASE" ? "Inventory audit" : "Damaged goods")
							).trim(),
							AdjustmentType: itemType,
							notes: (
								it.notes ||
								adjustNotes ||
								"Found broken in shelf B3"
							).trim(),
						};
					}),
				};

				if (customSubmitHandler) {
					return await customSubmitHandler(adjustPayload);
				}

				return await stocksApi.adjust(adjustPayload);
			}

			// ============================================================
			// 2. STOCK IMPORT SUBMISSION (POST /api/v1/imports)
			// ============================================================
			const formattedImportDate = `${importDate}T${importTime}`;
			const importPayload = {
				supplierId: Number(supplierId) || 1,
				referenceNo:
					referenceNo.trim() || `IMP-${Date.now().toString().slice(-6)}`,
				note: (generalNote || "Bulk shipment from primary supplier").trim(),
				importDate: formattedImportDate,
				warehouseId: warehouseId ? Number(warehouseId) : undefined,
				items: manifestItems.map((it) => ({
					variantId: Number(it.variantId || it.productId),
					unitId: Number(it.unitId) || 1,
					quantity: Number(it.quantity || 1),
					unitCost: Number(it.unitCost || 0),
					untiPrice: Number(it.untiPrice ?? it.unitPrice ?? 0),
					unitPrice: Number(it.unitPrice ?? it.untiPrice ?? 0),
				})),
			};

			if (customSubmitHandler) {
				return await customSubmitHandler(importPayload);
			}

			return await inventoryImportsApi.create(importPayload);
		},
		onSuccess: (res) => {
			if (mode === "ADJUSTMENT") {
				const sign = adjustmentStats.netUnits >= 0 ? "+" : "";
				toast.success(
					`Stock audit adjustment (${sign}${adjustmentStats.netUnits} net units across ${manifestItems.length} items) submitted successfully!`,
				);
			} else {
				toast.success(`Stock Import #${referenceNo} registered successfully!`);
			}
			queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
			queryClient.invalidateQueries({ queryKey: ["stocks"] });
			queryClient.invalidateQueries({ queryKey: ["stocks-search"] });
			queryClient.invalidateQueries({ queryKey: ["stocks-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
			onOpenChange(false);
			if (onSuccess) onSuccess(res);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Selected Supplier & Warehouse Details
	const selectedSupplier = useMemo(() => {
		return suppliersData?.items?.find(
			(s) => String(s.id) === String(supplierId),
		);
	}, [suppliersData, supplierId]);

	const selectedWarehouse = useMemo(() => {
		return warehousesData?.items?.find(
			(w) => String(w.id) === String(warehouseId),
		);
	}, [warehousesData, warehouseId]);

	// Dynamic Titles
	const modalTitle =
		title ||
		(mode === "IMPORT"
			? t("stocks.importStockTitle")
			: mode === "ADJUSTMENT"
				? t("stocks.adjustStockTitle")
				: t("stocks.title"));

	const modalSubtitle =
		subtitle ||
		(mode === "IMPORT"
			? t("stocks.importStockSubtitle")
			: t("stocks.adjustStockSubtitle"));

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={modalTitle}
			subtitle={modalSubtitle}
			icon={
				<div
					className={`p-2 rounded-xl border shadow-2xs ${
						mode === "ADJUSTMENT"
							? adjustmentStats.netUnits >= 0
								? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60"
								: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60"
							: "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/60"
					}`}
				>
					{mode === "ADJUSTMENT" ? (
						<Scale className="h-5 w-5" />
					) : (
						<Truck className="h-5 w-5" />
					)}
				</div>
			}
			size="full"
			className="max-w-[96vw] xl:max-w-[1520px] h-[93vh] flex flex-col p-0 overflow-hidden"
			isLoading={submitMutation.isPending}
			footer={
				<div className="w-full flex items-center justify-between px-6 py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800">
					<div className="flex items-center gap-4 text-xs">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground font-medium">
								{t("stocks.manifest")}:
							</span>
							<Badge
								variant="outline"
								className="font-bold text-slate-800 dark:text-slate-200 border-slate-200"
							>
								{manifestItems.length} {t("stocks.items")} ({totalUnits}{" "}
								{t("stocks.units")})
							</Badge>
						</div>

						{mode === "ADJUSTMENT" ? (
							<div className="flex items-center gap-2 flex-wrap">
								{adjustmentStats.increaseCount > 0 && (
									<Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
										+{adjustmentStats.increaseUnits} {t("stocks.increase")} ({adjustmentStats.increaseCount})
									</Badge>
								)}
								{adjustmentStats.decreaseCount > 0 && (
									<Badge className="text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300">
										-{adjustmentStats.decreaseUnits} {t("stocks.decrease")} ({adjustmentStats.decreaseCount})
									</Badge>
								)}
								<Badge
									variant="outline"
									className={`text-[10px] font-mono font-bold ${
										adjustmentStats.netUnits > 0
											? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
											: adjustmentStats.netUnits < 0
												? "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200"
												: "text-slate-700 dark:text-slate-300"
									}`}
								>
									Net: {adjustmentStats.netUnits > 0 ? `+${adjustmentStats.netUnits}` : adjustmentStats.netUnits} {t("stocks.units")}
								</Badge>
							</div>
						) : (
							<>
								<div className="hidden sm:flex items-center gap-2">
									<span className="text-muted-foreground font-medium">
										{t("stocks.totalLandedCost")}:
									</span>
									<span className="font-bold text-sm text-purple-600 dark:text-purple-400 font-mono">
										$
										{totalInboundCost.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
								{totalEstimatedRevenue > 0 && (
									<div className="hidden md:flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
										<TrendingUp className="h-3.5 w-3.5" />
										<span>
											{t("stocks.margin")}: ${totalProjectedProfit.toFixed(2)} (
											{projectedMarginPct}%)
										</span>
									</div>
								)}
							</>
						)}
					</div>

					<div className="flex items-center gap-3">
						<ModernModalCancelButton
							onClick={handleClearManifest}
							disabled={manifestItems.length === 0 || submitMutation.isPending}
							label={t("stocks.clearItems")}
							icon={<Trash2 className="h-4 w-4 shrink-0 text-rose-500" />}
							className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
						/>

						<ModernModalCancelButton
							onClick={() => onOpenChange(false)}
							label={t("stocks.discard")}
						/>

						<ModernModalSubmitButton
							onClick={() => submitMutation.mutate()}
							disabled={submitMutation.isPending || manifestItems.length === 0}
							isLoading={submitMutation.isPending}
							loadingText={t("stocks.processing")}
							icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
							className={
								mode === "ADJUSTMENT"
									? adjustmentStats.netUnits >= 0
										? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
										: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
									: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20"
							}
						>
							{mode === "ADJUSTMENT"
								? `${t("stocks.applyAdjustment")} (${manifestItems.length} items • ${adjustmentStats.increaseUnits > 0 ? `+${adjustmentStats.increaseUnits}` : ""}${adjustmentStats.increaseUnits > 0 && adjustmentStats.decreaseUnits > 0 ? " / " : ""}${adjustmentStats.decreaseUnits > 0 ? `-${adjustmentStats.decreaseUnits}` : ""}${adjustmentStats.increaseUnits === 0 && adjustmentStats.decreaseUnits === 0 ? "0" : ""} ${t("stocks.units")})`
								: t("stocks.completeImport")}
						</ModernModalSubmitButton>
					</div>
				</div>
			}
		>
			<div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-slate-100/60 dark:bg-slate-950">
				{/* ============================================================ */}
				{/* LEFT PANEL: PRODUCT CATALOG & INVENTORY EXPLORER             */}
				{/* ============================================================ */}
				<div className="w-full lg:w-7/12 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
					{/* Top Search & Filter Bar */}
					<div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3 shrink-0">
						<div className="flex items-center gap-2.5">
							<div className="relative flex-1">
								<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									ref={searchInputRef}
									value={productSearch}
									onChange={(e) => setProductSearch(e.target.value)}
									placeholder={t("stocks.searchPlaceholder")}
									className="pl-9 pr-9 h-10 rounded-xl bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 text-xs"
								/>
								{productSearch && (
									<button
										onClick={() => setProductSearch("")}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
								<Button
									variant={viewMode === "grid" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("grid")}
									className={`h-8 px-2.5 rounded-lg text-xs font-semibold ${
										viewMode === "grid"
											? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
											: ""
									}`}
								>
									<Boxes className="h-3.5 w-3.5 mr-1" /> {t("common.grid")}
								</Button>
								<Button
									variant={viewMode === "compact" ? "default" : "ghost"}
									size="sm"
									onClick={() => setViewMode("compact")}
									className={`h-8 px-2.5 rounded-lg text-xs font-semibold ${
										viewMode === "compact"
											? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
											: ""
									}`}
								>
									<Layers className="h-3.5 w-3.5 mr-1" /> {t("common.table")}
								</Button>
							</div>
						</div>

						{/* Category Filter Pills with Scroll */}
						<div className="relative flex items-center">
							<button
								onClick={() => scrollCategories("left")}
								className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 shadow-2xs mr-1.5"
							>
								<ChevronLeft className="h-3.5 w-3.5" />
							</button>

							<div
								ref={categoryScrollRef}
								className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
								style={{ scrollbarWidth: "none" }}
							>
								{categoriesList.map((cat) => {
									const isSelected =
										String(selectedCategoryId) === String(cat.id);
									return (
										<button
											key={cat.id}
											onClick={() => setSelectedCategoryId(String(cat.id))}
											className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
												isSelected
													? mode === "ADJUSTMENT"
														? defaultItemAdjustmentType === "INCREASE"
															? "bg-emerald-600 text-white shadow-2xs shadow-emerald-500/20"
															: "bg-rose-600 text-white shadow-2xs shadow-rose-500/20"
														: "bg-purple-600 text-white shadow-2xs shadow-purple-500/20"
													: "bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
											}`}
										>
											<span>{cat.name}</span>
										</button>
									);
								})}
							</div>

							<button
								onClick={() => scrollCategories("right")}
								className="h-7 w-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 shrink-0 shadow-2xs ml-1.5"
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</button>
						</div>
					</div>

					{/* Product Items Explorer List/Grid */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{isLoadingProducts ? (
							<div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
								<RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
								<p className="text-xs font-medium">
									{t("stocks.loadingInventory")}
								</p>
							</div>
						) : filteredProducts.length === 0 ? (
							<div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
								<Package className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2" />
								<h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
									{t("stocks.noProductsFound")}
								</h4>
								<p className="text-xs text-muted-foreground mt-1 max-w-xs">
									{t("stocks.noProductsMatchDesc")}
								</p>
							</div>
						) : viewMode === "grid" ? (
							/* Grid Layout */
							<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
								{filteredProducts.map((prod) => {
									const variants = prod.variants || [];
									const hasMultiVariants = variants.length > 1;
									const stock = prod.stockQty ?? 0;

									return (
										<div
											key={prod.id}
											onClick={() => handleProductCardClick(prod)}
											className={`group cursor-pointer p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all flex flex-col justify-between ${
												mode === "ADJUSTMENT"
													? defaultItemAdjustmentType === "INCREASE"
														? "hover:border-emerald-300 dark:hover:border-emerald-800"
														: "hover:border-rose-300 dark:hover:border-rose-800"
													: "hover:border-purple-300 dark:hover:border-purple-800"
											}`}
										>
											<div className="flex gap-3">
												<SafeProductThumb
													src={prod.imageUrl}
													alt={prod.name}
													className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 dark:border-slate-800"
												/>
												<div className="min-w-0 flex-1">
													<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1">
														{prod.name}
													</h4>
													<p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
														{prod.baseSku || `ID: #${prod.id}`}
													</p>
													<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
														<Badge
															variant="outline"
															className={`text-[10px] font-semibold px-1.5 py-0 h-4.5 ${
																stock > 0
																	? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
																	: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200"
															}`}
														>
															{stock > 0
																? `${stock} ${t("stocks.inStock")}`
																: `0 ${t("stocks.outOfStock")}`}
														</Badge>
														{hasMultiVariants && (
															<Badge className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 px-1.5 py-0 h-4.5">
																{variants.length} {t("products.variants")}
															</Badge>
														)}
													</div>
												</div>
											</div>

											<div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
												<div className="text-[11px] text-muted-foreground font-mono">
													{mode === "ADJUSTMENT" ? (
														<span>
															{t("stocks.currentStock")}:{" "}
															<strong className="text-slate-900 dark:text-white">
																{stock}
															</strong>
														</span>
													) : (
														<span>
															{t("stocks.unitCost")}:{" "}
															<strong className="text-slate-900 dark:text-white">
																${prod.basePrice || prod.cost || 0}
															</strong>
														</span>
													)}
												</div>
												<Button
													size="sm"
													variant="ghost"
													className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg gap-1"
												>
													<Plus className="h-3 w-3" />
													<span>
														{hasMultiVariants
															? t("stocks.selectVariant")
															: mode === "ADJUSTMENT"
																? t("stocks.adjust")
																: t("stocks.add")}
													</span>
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							/* Compact List Layout */
							<div className="space-y-2">
								{filteredProducts.map((prod) => {
									const variants = prod.variants || [];
									const hasMultiVariants = variants.length > 1;
									const stock = prod.stockQty ?? 0;

									return (
										<div
											key={prod.id}
											onClick={() => handleProductCardClick(prod)}
											className="group cursor-pointer p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:shadow-xs transition-all flex items-center justify-between gap-3"
										>
											<div className="flex items-center gap-3 min-w-0">
												<SafeProductThumb
													src={prod.imageUrl}
													alt={prod.name}
													className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800"
												/>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
															{prod.name}
														</h4>
														{hasMultiVariants && (
															<Badge className="text-[9px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 px-1 py-0 h-4">
																{variants.length} Var
															</Badge>
														)}
													</div>
													<p className="text-[10px] text-muted-foreground font-mono truncate">
														{prod.baseSku || `#${prod.id}`}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-3 shrink-0">
												<Badge
													variant="outline"
													className={`text-[10px] font-mono font-bold ${
														stock > 0
															? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200"
															: "text-rose-600 bg-rose-50 border-rose-200"
													}`}
												>
													{stock} {t("stocks.inStock")}
												</Badge>
												<Button
													size="sm"
													variant="ghost"
													className="h-7 px-2 text-xs font-bold text-primary rounded-lg"
												>
													<Plus className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* ============================================================ */}
				{/* RIGHT SIDE: MANIFEST, INBOUND LINE ITEMS & SUMMARY           */}
				{/* ============================================================ */}
				<div className="w-full lg:w-5/12 flex flex-col bg-slate-50/50 dark:bg-slate-950 overflow-hidden">
					{/* Header: Compact Info & Collapsible Details Bar */}
					<div className="p-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shrink-0">
						{mode === "ADJUSTMENT" ? (
							/* STOCK ADJUSTMENT MASTER CONTROLS */
							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									{/* Default Add Mode Toggle (Controls what type new items get added as) */}
									<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0">
										<button
											type="button"
											onClick={() => {
												setDefaultItemAdjustmentType("DECREASE");
											}}
											className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
												defaultItemAdjustmentType === "DECREASE"
													? "bg-rose-600 text-white shadow-2xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
											}`}
											title="Default new items to DECREASE (-)"
										>
											<Minus className="h-3 w-3" />
											<span>{t("stocks.decrease", "Decrease")}</span>
										</button>
										<button
											type="button"
											onClick={() => {
												setDefaultItemAdjustmentType("INCREASE");
											}}
											className={`h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
												defaultItemAdjustmentType === "INCREASE"
													? "bg-emerald-600 text-white shadow-2xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
											}`}
											title="Default new items to INCREASE (+)"
										>
											<Plus className="h-3 w-3" />
											<span>{t("stocks.increase", "Increase")}</span>
										</button>
									</div>

									{/* Batch Audit Reason */}
									<div className="flex-1 min-w-0">
										<ModernSelect
											value={adjustReason}
											onChange={(val) => setAdjustReason(val)}
											options={[
												{ value: "Inventory audit", label: "Inventory audit" },
												{
													value: "Monthly physical count",
													label: "Monthly physical count",
												},
												{
													value: "Damaged goods",
													label: "Damaged goods / Broken",
												},
												{
													value: "Physical count discrepancy",
													label: "Physical count discrepancy",
												},
												{ value: "Found stock", label: "Found surplus stock" },
												{
													value: "Expired stock",
													label: "Expired stock removal",
												},
												{ value: "Vendor return", label: "Returned to vendor" },
												{ value: "Shelf write-off", label: "Shelf write-off" },
											]}
											className="rounded-xl text-xs h-8"
										/>
									</div>

									{/* Batch Notes Toggle Button */}
									<button
										type="button"
										onClick={() => setIsDetailsOpen((prev) => !prev)}
										className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all border shrink-0 cursor-pointer ${
											isDetailsOpen || adjustNotes
												? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40"
												: "border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
										}`}
										title="Batch Audit Notes"
									>
										<FileText className="h-3.5 w-3.5" />
										<span className="hidden sm:inline text-[11px]">
											{t("stocks.notes", "Notes")}
										</span>
										{isDetailsOpen ? (
											<ChevronUp className="h-3 w-3" />
										) : (
											<ChevronDown className="h-3 w-3" />
										)}
									</button>
								</div>

								{/* Expandable Master Notes */}
								{isDetailsOpen && (
									<div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-150">
										<ModernInput
											label={t("stocks.overallNotes", "Batch Audit Notes")}
											placeholder={t("stocks.auditReasonPlaceholder", "e.g. Monthly physical count")}
											value={adjustNotes}
											onChange={(e) => setAdjustNotes(e.target.value)}
											className="text-xs"
										/>
									</div>
								)}

								{/* Compact Note pill if note filled & details collapsed */}
								{!isDetailsOpen && adjustNotes && (
									<div
										onClick={() => setIsDetailsOpen(true)}
										className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100/60 transition-colors"
									>
										<FileText className="h-3 w-3 shrink-0 text-emerald-600" />
										<span className="font-semibold">{t("stocks.notes", "Notes")}:</span>
										<span className="truncate opacity-90">{adjustNotes}</span>
									</div>
								)}
							</div>
						) : (
							/* STOCK IMPORT MASTER CONTROLS */
							<div className="space-y-2">
								{/* Compact Primary Bar */}
								<div className="flex items-center gap-2">
									<div className="flex-1 min-w-0">
										<ModernSelect
											value={supplierId}
											onChange={(val) => setSupplierId(val)}
											placeholder={t("stocks.selectSupplier")}
											options={(suppliersData?.items || []).map((s) => ({
												value: String(s.id),
												label: s.name,
												description: s.primaryPhone
													? `Phone: ${s.primaryPhone}`
													: undefined,
											}))}
											className="rounded-xl text-xs h-9"
										/>
									</div>

									{/* Collapsible Details Button */}
									<button
										type="button"
										onClick={() => setIsDetailsOpen((prev) => !prev)}
										className={`h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer ${
											isDetailsOpen
												? "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/40"
												: "border-slate-200 bg-slate-100/80 text-slate-700 hover:bg-slate-200/70 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
										}`}
										title="Shipment, Warehouse & Notes Details"
									>
										<Truck className="h-3.5 w-3.5 text-purple-600" />
										<span className="hidden sm:inline font-mono text-[11px]">
											{referenceNo}
										</span>
										{isDetailsOpen ? (
											<ChevronUp className="h-3 w-3" />
										) : (
											<ChevronDown className="h-3 w-3" />
										)}
									</button>

									{/* Quick Add Supplier Button */}
									<button
										type="button"
										onClick={() => setIsQuickSupplierOpen(true)}
										className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400 hover:bg-purple-50 hover:border-purple-200 transition-colors flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
										title={t("stocks.newSupplier")}
									>
										<Plus className="h-3.5 w-3.5" />
										<span className="hidden sm:inline">
											{t("stocks.newSupplier")}
										</span>
									</button>
								</div>

								{/* Single Line Summary when collapsed */}
								{!isDetailsOpen && (
									<div className="flex items-center justify-between gap-2 text-[11px] px-1 text-muted-foreground">
										<div className="flex items-center gap-2 min-w-0">
											{selectedWarehouse && (
												<span className="truncate flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
													<Building2 className="h-3 w-3 text-slate-400 shrink-0" />
													{selectedWarehouse.name}
												</span>
											)}
											<span className="text-[10px] font-mono text-slate-400">
												• {importDate}
											</span>
										</div>
										{selectedSupplier?.primaryPhone && (
											<span className="text-[10px] text-muted-foreground font-mono truncate">
												{selectedSupplier.primaryPhone}
											</span>
										)}
									</div>
								)}

								{/* Collapsible Details Panel */}
								{isDetailsOpen && (
									<div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-in fade-in-50 duration-150">
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
											{/* Reference No with Copy & Regenerate */}
											<div className="space-y-1">
												<label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
													<Tag className="h-3 w-3 text-purple-600" />{" "}
													{t("stocks.referenceNo")}
												</label>
												<div className="flex items-center justify-between h-8 bg-slate-50 dark:bg-slate-800 px-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700 font-mono font-bold text-xs">
													<span className="truncate">{referenceNo}</span>
													<div className="flex items-center gap-0.5 shrink-0">
														<button
															onClick={handleCopyReference}
															className="hover:text-purple-600 transition-colors p-1"
															title="Copy Reference"
														>
															{copiedRef ? (
																<CheckCheck className="h-3 w-3 text-emerald-600" />
															) : (
																<Copy className="h-3 w-3 text-slate-400" />
															)}
														</button>
														<button
															onClick={handleRegenerateReference}
															className="hover:text-purple-600 transition-colors p-1"
															title="Generate New Sequence"
														>
															<RefreshCw className="h-3 w-3 text-slate-400" />
														</button>
													</div>
												</div>
											</div>

											{/* Destination Warehouse */}
											<div className="space-y-1">
												<label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
													<Building2 className="h-3 w-3 text-slate-400" />{" "}
													{t("stocks.destinationWarehouse")}
												</label>
												<ModernSelect
													value={warehouseId}
													onChange={(val) => setWarehouseId(val)}
													placeholder={t("stocks.destinationWarehouse")}
													options={(warehousesData?.items || []).map((w) => ({
														value: String(w.id),
														label: w.name,
													}))}
													className="rounded-lg text-xs h-8"
												/>
											</div>
										</div>

										{/* Date & Time */}
										<div className="grid grid-cols-2 gap-2">
											<ModernDatePicker
												label={t("stocks.importDate")}
												value={importDate}
												onChange={(val) =>
													setImportDate(
														val || new Date().toISOString().split("T")[0],
													)
												}
												className="text-xs"
											/>

											<div className="space-y-1">
												<label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
													<Clock className="h-3 w-3 text-muted-foreground" />{" "}
													{t("stocks.timestamp")}
												</label>
												<Input
													type="time"
													step="1"
													value={importTime}
													onChange={(e) => setImportTime(e.target.value)}
													className="h-8 rounded-lg bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-xs font-mono"
												/>
											</div>
										</div>

										{/* Receiving Notes in Collapsible */}
										<div>
											<ModernTextarea
												label={t("stocks.receivingNotes")}
												placeholder={t("stocks.receivingNotesPlaceholder")}
												rows={2}
												value={generalNote}
												onChange={(e) => setGeneralNote(e.target.value)}
												className="text-xs"
											/>
										</div>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Manifest Line Items Table List */}
					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						<div className="flex items-center justify-between">
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Boxes className="h-3.5 w-3.5 text-primary" />
								<span>
									{mode === "ADJUSTMENT"
										? t("stocks.adjustmentItems")
										: t("stocks.inboundLineItems")}{" "}
									({manifestItems.length})
								</span>
							</h4>

							{mode === "ADJUSTMENT" ? (
								<div className="flex items-center gap-2">
									{manifestItems.length > 0 && (
										<div className="hidden sm:flex items-center gap-1 mr-1">
											<button
												type="button"
												onClick={() => handleSetAllAdjustmentType("INCREASE")}
												className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
												title="Set all manifest items to Increase"
											>
												+ All Inc
											</button>
											<button
												type="button"
												onClick={() => handleSetAllAdjustmentType("DECREASE")}
												className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
												title="Set all manifest items to Decrease"
											>
												- All Dec
											</button>
										</div>
									)}
									<div className="flex items-center gap-1.5 font-mono text-xs">
										{adjustmentStats.increaseUnits > 0 && (
											<span className="text-emerald-600 font-bold">
												+{adjustmentStats.increaseUnits}
											</span>
										)}
										{adjustmentStats.decreaseUnits > 0 && (
											<span className="text-rose-600 font-bold">
												-{adjustmentStats.decreaseUnits}
											</span>
										)}
										<span className="text-slate-500 font-semibold text-[11px]">
											(Net: {adjustmentStats.netUnits > 0 ? `+${adjustmentStats.netUnits}` : adjustmentStats.netUnits})
										</span>
									</div>
								</div>
							) : (
								<span className="text-[11px] text-muted-foreground font-medium">
									{totalUnits} {t("stocks.units")}
								</span>
							)}
						</div>

						{manifestItems.length === 0 ? (
							<div className="h-60 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
								<div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
									<Boxes className="h-6 w-6" />
								</div>
								<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
									{t("stocks.noItemsInManifest")}
								</h4>
								<p className="text-xs text-muted-foreground mt-1 max-w-xs">
									{mode === "ADJUSTMENT"
										? t("stocks.noItemsManifestDescAdjustment")
										: t("stocks.noItemsManifestDescImport")}
								</p>
							</div>
						) : (
							<div className="space-y-2.5">
								{manifestItems.map((item, idx) => {
									const qty =
										Number(item.adjustmentQuantity || item.quantity) || 1;
									const itemType = (item.AdjustmentType ||
										item.adjustmentType ||
										defaultItemAdjustmentType ||
										"INCREASE") as "INCREASE" | "DECREASE";
									const stockBefore = item.availableStock ?? 0;
									const stockAfter =
										itemType === "INCREASE"
											? stockBefore + qty
											: Math.max(0, stockBefore - qty);
									const isExcessiveDecrease =
										itemType === "DECREASE" &&
										item.availableStock !== undefined &&
										qty > item.availableStock;

									return (
										<div
											key={item.id}
											className={`p-3.5 rounded-2xl bg-white dark:bg-slate-900 border shadow-2xs space-y-3 transition-all ${
												mode === "ADJUSTMENT"
													? itemType === "INCREASE"
														? "border-slate-200/80 dark:border-slate-800 border-l-4 border-l-emerald-500"
														: "border-slate-200/80 dark:border-slate-800 border-l-4 border-l-rose-500"
													: "border-slate-200/80 dark:border-slate-800"
											}`}
										>
											{/* Item Header */}
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-2.5 min-w-0">
													<span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
														#{idx + 1}
													</span>
													<SafeProductThumb
														src={item.imageUrl}
														alt={item.productName}
														className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800"
													/>
													<div className="min-w-0">
														<h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
															{item.productName}
														</h5>
														<div className="flex items-center gap-1.5 mt-0.5">
															<Badge className="text-[9px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 px-1 py-0 h-4">
																{item.variantName}
															</Badge>
															{item.sku && (
																<span className="text-[10px] text-muted-foreground font-mono">
																	{item.sku}
																</span>
															)}
														</div>
													</div>
												</div>

												<div className="flex items-center gap-2 shrink-0">
													{mode === "ADJUSTMENT" && (
														/* Per-Item Segmented Adjustment Type Toggle */
														<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
															<button
																type="button"
																onClick={() =>
																	updateManifestItem(
																		item.id,
																		"AdjustmentType",
																		"DECREASE",
																	)
																}
																className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
																	itemType === "DECREASE"
																		? "bg-rose-600 text-white shadow-2xs"
																		: "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
																}`}
																title="Decrease stock (-)"
															>
																<Minus className="h-2.5 w-2.5" />
																<span>- Dec</span>
															</button>
															<button
																type="button"
																onClick={() =>
																	updateManifestItem(
																		item.id,
																		"AdjustmentType",
																		"INCREASE",
																	)
																}
																className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer ${
																	itemType === "INCREASE"
																		? "bg-emerald-600 text-white shadow-2xs"
																		: "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
																}`}
																title="Increase stock (+)"
															>
																<Plus className="h-2.5 w-2.5" />
																<span>+ Inc</span>
															</button>
														</div>
													)}

													<button
														onClick={() => removeManifestItem(item.id)}
														className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
														title="Remove item"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
											</div>

											{/* Mode-Specific Controls */}
											{mode === "ADJUSTMENT" ? (
												/* STOCK ADJUSTMENT CONTROLS */
												<div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
													<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
														{/* Packaging Unit */}
														<div className="space-y-1">
															<label className="text-[10px] font-semibold text-slate-500">
																{t("stocks.unit")}
															</label>
															<select
																value={item.unitId}
																onChange={(e) =>
																	updateManifestItem(
																		item.id,
																		"unitId",
																		e.target.value,
																	)
																}
																className="w-full h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs px-2 font-medium"
															>
																{(() => {
																	const prod = productsData?.items?.find(
																		(p) =>
																			String(p.id) === String(item.productId),
																	);
																	const availableUnits =
																		prod?.units && prod.units.length > 0
																			? prod.units
																			: unitsData?.items || [];
																	return availableUnits.map((u: any) => {
																		const uId = String(u.unitId || u.id);
																		const uName =
																			u.name || u.unitName || `Unit #${uId}`;
																		const factor =
																			u.baseQuantity ||
																			u.multiplier ||
																			u.conversionFactor;
																		const factorLabel =
																			factor && factor > 1
																				? ` (${factor}x)`
																				: "";
																		return (
																			<option key={uId} value={uId}>
																				{uName}
																				{factorLabel}
																			</option>
																		);
																	});
																})()}
															</select>
														</div>

														{/* Adjustment Quantity */}
														<div className="space-y-1">
															<label className="text-[10px] font-semibold text-slate-500">
																{t("stocks.adjustmentQty")} *
															</label>
															<div className="flex items-center h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
																<button
																	type="button"
																	onClick={() =>
																		updateManifestItem(
																			item.id,
																			"quantity",
																			Math.max(1, qty - 1),
																		)
																	}
																	className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
																>
																	<Minus className="h-3 w-3" />
																</button>
																<input
																	type="number"
																	min="1"
																	value={qty}
																	onChange={(e) =>
																		updateManifestItem(
																			item.id,
																			"quantity",
																			e.target.value,
																		)
																	}
																	className="w-full text-center bg-transparent text-xs font-bold font-mono focus:outline-none"
																/>
																<button
																	type="button"
																	onClick={() =>
																		updateManifestItem(
																			item.id,
																			"quantity",
																			qty + 1,
																		)
																	}
																	className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
																>
																	<Plus className="h-3 w-3" />
																</button>
															</div>
														</div>

														{/* Live Stock Projection */}
														<div className="space-y-1 col-span-2 sm:col-span-1">
															<label className="text-[10px] font-semibold text-slate-500">
																{t("stocks.projectedBalance")}
															</label>
															<div
																className={`h-8 rounded-lg px-2 flex items-center justify-between font-mono font-bold text-[11px] border ${
																	itemType === "INCREASE"
																		? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
																		: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
																}`}
															>
																<span>{stockBefore}</span>
																<span>→</span>
																<span>
																	{stockAfter} (
																	{itemType === "INCREASE"
																		? `+${qty}`
																		: `-${qty}`}
																	)
																</span>
															</div>
														</div>
													</div>

													{/* Excessive Decrease Warning */}
													{isExcessiveDecrease && (
														<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
															<AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
															<span>
																Reduction ({qty}) exceeds available stock ({stockBefore}).
															</span>
														</div>
													)}

													{/* Item Specific Reason & Notes */}
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
														<div>
															<input
																type="text"
																list={`reasons-${item.id}`}
																placeholder={t(
																	"stocks.itemSpecificReasonPlaceholder",
																)}
																value={item.reason || ""}
																onChange={(e) =>
																	updateManifestItem(
																		item.id,
																		"reason",
																		e.target.value,
																	)
																}
																className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary"
															/>
															<datalist id={`reasons-${item.id}`}>
																<option value="Inventory audit" />
																<option value="Damaged goods" />
																<option value="Physical count discrepancy" />
																<option value="Found surplus stock" />
																<option value="Expired stock" />
																<option value="Returned to vendor" />
																<option value="Shelf write-off" />
																<option value="Theft / Loss" />
															</datalist>
														</div>

														<input
															type="text"
															placeholder={t(
																"stocks.itemSpecificNotesPlaceholder",
															)}
															value={item.notes || ""}
															onChange={(e) =>
																updateManifestItem(
																	item.id,
																	"notes",
																	e.target.value,
																)
															}
															className="w-full h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary"
														/>
													</div>
												</div>
											) : (
												/* STOCK IMPORT CONTROLS */
												<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
													{/* Packaging Unit */}
													<div className="space-y-1">
														<label className="text-[10px] font-semibold text-slate-500">
															{t("stocks.unit")}
														</label>
														<select
															value={item.unitId}
															onChange={(e) =>
																updateManifestItem(
																	item.id,
																	"unitId",
																	e.target.value,
																)
															}
															className="w-full h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs px-2 font-medium"
														>
															{(() => {
																const prod = productsData?.items?.find(
																	(p) =>
																		String(p.id) === String(item.productId),
																);
																const availableUnits =
																	prod?.units && prod.units.length > 0
																		? prod.units
																		: unitsData?.items || [];
																return availableUnits.map((u: any) => {
																	const uId = String(u.unitId || u.id);
																	const uName =
																		u.name || u.unitName || `Unit #${uId}`;
																	const factor =
																		u.baseQuantity ||
																		u.multiplier ||
																		u.conversionFactor;
																	const factorLabel =
																		factor && factor > 1 ? ` (${factor}x)` : "";
																	return (
																		<option key={uId} value={uId}>
																			{uName}
																			{factorLabel}
																		</option>
																	);
																});
															})()}
														</select>
													</div>

													{/* Quantity Stepper */}
													<div className="space-y-1">
														<label className="text-[10px] font-semibold text-slate-500">
															{t("stocks.quantity")}
														</label>
														<div className="flex items-center h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
															<button
																type="button"
																onClick={() =>
																	updateManifestItem(
																		item.id,
																		"quantity",
																		Math.max(1, item.quantity - 1),
																	)
																}
																className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
															>
																<Minus className="h-3 w-3" />
															</button>
															<input
																type="number"
																min="1"
																value={item.quantity}
																onChange={(e) =>
																	updateManifestItem(
																		item.id,
																		"quantity",
																		e.target.value,
																	)
																}
																className="w-full text-center bg-transparent text-xs font-bold font-mono focus:outline-none"
															/>
															<button
																type="button"
																onClick={() =>
																	updateManifestItem(
																		item.id,
																		"quantity",
																		item.quantity + 1,
																	)
																}
																className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
															>
																<Plus className="h-3 w-3" />
															</button>
														</div>
													</div>

													{/* Inbound Unit Cost */}
													<div className="space-y-1">
														<label className="text-[10px] font-semibold text-purple-700 dark:text-purple-400">
															{t("stocks.unitCost")} ($)
														</label>
														<div className="relative">
															<span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
																$
															</span>
															<input
																type="number"
																step="any"
																min="0"
																value={item.unitCost}
																onChange={(e) =>
																	updateManifestItem(
																		item.id,
																		"unitCost",
																		e.target.value,
																	)
																}
																className="w-full h-8 pl-5 pr-2 rounded-lg bg-purple-50/40 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
															/>
														</div>
													</div>

													{/* Target Retail Price */}
													<div className="space-y-1">
														<label className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
															{t("stocks.retailPrice")}
														</label>
														<div className="relative">
															<span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
																$
															</span>
															<input
																type="number"
																step="any"
																min="0"
																value={item.untiPrice}
																onChange={(e) =>
																	updateManifestItem(
																		item.id,
																		"untiPrice",
																		e.target.value,
																	)
																}
																className="w-full h-8 pl-5 pr-2 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
															/>
														</div>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}

						{/* Receiving note indicator if filled and details collapsed */}
						{mode === "IMPORT" && generalNote && !isDetailsOpen && (
							<div
								onClick={() => setIsDetailsOpen(true)}
								className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60 text-xs text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-100/60 transition-colors shrink-0"
							>
								<FileText className="h-3.5 w-3.5 shrink-0" />
								<span className="font-semibold">
									{t("stocks.receivingNotes")}:
								</span>
								<span className="truncate flex-1 font-mono text-[11px] opacity-80">
									{generalNote}
								</span>
							</div>
						)}
					</div>

					{/* Real-Time Financial / Operational Summary Cards */}
					<div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2.5">
						{mode === "ADJUSTMENT" ? (
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
								{/* Total Items */}
								<div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
									<span className="text-[10px] font-semibold text-slate-500 block">
										{t("stocks.totalItems")}
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
										{manifestItems.length} {t("stocks.items", "Items")}
									</span>
								</div>

								{/* Total Increase */}
								<div className="p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300">
									<span className="text-[10px] font-semibold block">
										{t("stocks.increase")} (+)
									</span>
									<span className="text-sm font-bold font-mono mt-0.5 block">
										+{adjustmentStats.increaseUnits} {t("stocks.units")}
									</span>
									<span className="text-[9px] opacity-75 font-mono">
										{adjustmentStats.increaseCount} line(s)
									</span>
								</div>

								{/* Total Decrease */}
								<div className="p-2 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
									<span className="text-[10px] font-semibold block">
										{t("stocks.decrease")} (-)
									</span>
									<span className="text-sm font-bold font-mono mt-0.5 block">
										-{adjustmentStats.decreaseUnits} {t("stocks.units")}
									</span>
									<span className="text-[9px] opacity-75 font-mono">
										{adjustmentStats.decreaseCount} line(s)
									</span>
								</div>

								{/* Net Impact */}
								<div
									className={`p-2 rounded-xl border ${
										adjustmentStats.netUnits > 0
											? "bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-200/70 text-emerald-700 dark:text-emerald-300"
											: adjustmentStats.netUnits < 0
												? "bg-rose-50/40 dark:bg-rose-950/30 border-rose-200/70 text-rose-700 dark:text-rose-300"
												: "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300"
									}`}
								>
									<span className="text-[10px] font-semibold block">
										{t("stocks.netBalanceImpact", "Net Impact")}
									</span>
									<span className="text-sm font-bold font-mono mt-0.5 block">
										{adjustmentStats.netUnits > 0
											? `+${adjustmentStats.netUnits}`
											: adjustmentStats.netUnits}{" "}
										{t("stocks.units")}
									</span>
									<span className="text-[9px] opacity-75 font-semibold">
										{adjustmentStats.netUnits > 0
											? "Net Inflow"
											: adjustmentStats.netUnits < 0
												? "Net Outflow"
												: "Balanced"}
									</span>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-3 gap-2.5 text-center">
								<div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
									<span className="text-[10px] font-semibold text-slate-500 block">
										{t("stocks.totalQuantity")}
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
										{totalUnits} {t("stocks.units")}
									</span>
								</div>
								<div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60">
									<span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 block">
										{t("stocks.landedCost")}
									</span>
									<span className="text-sm font-bold text-purple-700 dark:text-purple-400 font-mono mt-0.5 block">
										${totalInboundCost.toFixed(2)}
									</span>
								</div>
								<div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
									<span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block">
										{t("stocks.grossProfit")}
									</span>
									<span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
										+${totalProjectedProfit.toFixed(2)}
									</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ============================================================ */}
			{/* 3. MULTI-VARIANT PRODUCT CONFIGURATOR MODAL                  */}
			{/* ============================================================ */}
			{configuringProduct && (
				<ModernModal
					isOpen={!!configuringProduct}
					onClose={() => setConfiguringProduct(null)}
					title={`${t("stocks.configure")}: ${(effectiveConfiguringProduct || configuringProduct).name}`}
					subtitle={t("products.subtitle")}
					icon={<SlidersHorizontal className="h-5 w-5 text-primary" />}
					size="md"
					footer={
						<ModernModalFooter>
							<ModernModalCancelButton
								onClick={() => setConfiguringProduct(null)}
							/>
							<ModernModalSubmitButton
								onClick={handleAddConfiguredItem}
								icon={<Plus className="h-4 w-4 shrink-0" />}
							>
								{t("stocks.addToManifest")}
							</ModernModalSubmitButton>
						</ModernModalFooter>
					}
				>
					<div className="space-y-4">
						{/* Variant Picker */}
						<div className="space-y-2">
							<label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
								<Tag className="h-3.5 w-3.5 text-primary" />{" "}
								{t("stocks.selectVariantOption")}
							</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{(
									(effectiveConfiguringProduct || configuringProduct)
										.variants || []
								).map((v: any) => {
									const isSelected = String(v.id) === String(configVariantId);
									const vPrice = Number(
										v.sellPrice ??
											v.price ??
											v.finalPrice ??
											v.unitPrice ??
											v.retailPrice ??
											0,
									);
									return (
										<button
											type="button"
											key={v.id}
											onClick={() => setConfigVariantId(String(v.id))}
											className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
												isSelected
													? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
													: "border-slate-200 dark:border-slate-800 hover:border-slate-300"
											}`}
										>
											<div className="flex items-center justify-between">
												<span className="text-xs font-bold truncate">
													{v.name || "Default Variant"}
												</span>
												{isSelected && (
													<CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
												)}
											</div>
											<div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground font-mono">
												<span className="truncate">{v.sku || "No SKU"}</span>
												<div className="flex items-center gap-1.5 shrink-0">
													{vPrice > 0 && (
														<span className="font-bold text-emerald-600 dark:text-emerald-400">
															${vPrice.toFixed(2)}
														</span>
													)}
													<span>• Stock: {v.stockQty ?? 0}</span>
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* Adjustment Type Toggle for Stock Adjustment Mode */}
						{mode === "ADJUSTMENT" && (
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-900 dark:text-slate-100">
									{t("stocks.operation", "Adjustment Type")}
								</label>
								<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
									<button
										type="button"
										onClick={() => {
											setConfigAdjustmentType("DECREASE");
											if (!configItemReason || configItemReason === "Inventory audit") {
												setConfigItemReason("Damaged goods");
											}
										}}
										className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
											configAdjustmentType === "DECREASE"
												? "bg-rose-600 text-white shadow-2xs"
												: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
										}`}
									>
										<Minus className="h-3.5 w-3.5" />
										<span>{t("stocks.decreaseStock", "Decrease (-)")}</span>
									</button>
									<button
										type="button"
										onClick={() => {
											setConfigAdjustmentType("INCREASE");
											if (!configItemReason || configItemReason === "Damaged goods") {
												setConfigItemReason("Inventory audit");
											}
										}}
										className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
											configAdjustmentType === "INCREASE"
												? "bg-emerald-600 text-white shadow-2xs"
												: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
										}`}
									>
										<Plus className="h-3.5 w-3.5" />
										<span>{t("stocks.increaseStock", "Increase (+)")}</span>
									</button>
								</div>
							</div>
						)}

						{/* Packaging Unit & Quantity */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-900 dark:text-slate-100">
									{t("stocks.packagingUnit")}
								</label>
								<ModernSelect
									value={configUnitId}
									onChange={(val) => setConfigUnitId(val)}
									options={effectiveConfigUnits.map((u: any) => {
										const uId = String(u.unitId || u.id);
										const uName = u.name || u.unitName || `Unit #${uId}`;
										const factor =
											u.baseQuantity || u.multiplier || u.conversionFactor;
										const factorLabel =
											factor && factor > 1 ? ` (${factor}x)` : "";
										return {
											value: uId,
											label: `${uName}${factorLabel}`,
										};
									})}
									className="rounded-xl text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-bold text-slate-900 dark:text-slate-100">
									{mode === "ADJUSTMENT"
										? t("stocks.adjustmentQty")
										: t("stocks.quantity")}
								</label>
								<div className="flex items-center h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
									<button
										type="button"
										onClick={() => setConfigQuantity((q) => Math.max(1, q - 1))}
										className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
									>
										<Minus className="h-4 w-4" />
									</button>
									<input
										type="number"
										min="1"
										value={configQuantity}
										onChange={(e) =>
											setConfigQuantity(
												Math.max(1, Number(e.target.value) || 1),
											)
										}
										className="w-full text-center bg-transparent text-xs font-bold font-mono focus:outline-none"
									/>
									<button
										type="button"
										onClick={() => setConfigQuantity((q) => q + 1)}
										className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
									>
										<Plus className="h-4 w-4" />
									</button>
								</div>
							</div>
						</div>

						{/* Live Stock Projection for Adjustment */}
						{mode === "ADJUSTMENT" && (() => {
							const targetProd = effectiveConfiguringProduct || configuringProduct;
							const selVar = targetProd?.variants?.find((v: any) => String(v.id) === String(configVariantId)) || targetProd?.variants?.[0];
							const currentStock = Number(selVar?.stockQty ?? targetProd?.stockQty ?? 0);
							const projected = configAdjustmentType === "INCREASE"
								? currentStock + configQuantity
								: Math.max(0, currentStock - configQuantity);
							const isExceeds = configAdjustmentType === "DECREASE" && configQuantity > currentStock;

							return (
								<div className="space-y-2">
									<div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs">
										<span className="text-slate-500 font-medium">
											{t("stocks.projectedBalance", "Projected Stock")}:
										</span>
										<span className="font-mono font-bold">
											{currentStock} →{" "}
											<span
												className={
													configAdjustmentType === "INCREASE"
														? "text-emerald-600 font-bold"
														: "text-rose-600 font-bold"
												}
											>
												{projected} (
												{configAdjustmentType === "INCREASE"
													? `+${configQuantity}`
													: `-${configQuantity}`}
												)
											</span>
										</span>
									</div>
									{isExceeds && (
										<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
											<AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
											<span>
												Reduction ({configQuantity}) exceeds available stock ({currentStock}).
											</span>
										</div>
									)}
								</div>
							);
						})()}

						{mode === "ADJUSTMENT" ? (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
								<ModernInput
									label={t("stocks.itemSpecificReason")}
									placeholder={t("stocks.itemSpecificReasonPlaceholder")}
									value={configItemReason}
									onChange={(e) => setConfigItemReason(e.target.value)}
									className="text-xs"
								/>
								<ModernInput
									label={t("stocks.itemSpecificNotes")}
									placeholder={t("stocks.itemSpecificNotesPlaceholder")}
									value={configItemNotes}
									onChange={(e) => setConfigItemNotes(e.target.value)}
									className="text-xs"
								/>
							</div>
						) : (
							<div className="grid grid-cols-2 gap-3 pt-1">
								<ModernInput
									label={`${t("stocks.unitCost")} ($)`}
									type="number"
									step="any"
									value={configUnitCost}
									onChange={(e) =>
										setConfigUnitCost(Number(e.target.value) || 0)
									}
									placeholder="0"
									className="text-xs font-mono font-bold"
								/>
								<ModernInput
									label={t("stocks.retailPrice")}
									type="number"
									step="any"
									value={configUntiPrice}
									onChange={(e) =>
										setConfigUntiPrice(Number(e.target.value) || 0)
									}
									placeholder="2200"
									className="text-xs font-mono font-bold"
								/>
							</div>
						)}
					</div>
				</ModernModal>
			)}

			{/* ============================================================ */}
			{/* 4. QUICK ADD SUPPLIER MODAL                                  */}
			{/* ============================================================ */}
			{isQuickSupplierOpen && (
				<ModernModal
					isOpen={isQuickSupplierOpen}
					onClose={() => setIsQuickSupplierOpen(false)}
					title={t("stocks.quickRegisterSupplier")}
					subtitle={t("stocks.quickRegisterSupplierSubtitle")}
					icon={<Truck className="h-5 w-5 text-purple-600" />}
					size="sm"
					isLoading={createSupplierMutation.isPending}
					footer={
						<ModernModalFooter>
							<ModernModalCancelButton
								onClick={() => setIsQuickSupplierOpen(false)}
							/>
							<ModernModalSubmitButton
								onClick={() => {
									if (!newSupplierName.trim()) {
										toast.error("Supplier name is required");
										return;
									}
									createSupplierMutation.mutate({
										name: newSupplierName.trim(),
										primaryPhone: newSupplierPhone.trim(),
									});
								}}
								isLoading={createSupplierMutation.isPending}
								icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
							>
								{t("stocks.saveSupplier")}
							</ModernModalSubmitButton>
						</ModernModalFooter>
					}
				>
					<div className="space-y-3">
						<ModernInput
							label={`${t("stocks.supplierName")} *`}
							placeholder="e.g. TechPro Wholesale Ltd"
							value={newSupplierName}
							onChange={(e) => setNewSupplierName(e.target.value)}
							required
						/>
						<ModernInput
							label={t("stocks.supplierPhone")}
							placeholder="e.g. +855 12 345 678"
							value={newSupplierPhone}
							onChange={(e) => setNewSupplierPhone(e.target.value)}
						/>
					</div>
				</ModernModal>
			)}
		</ModernModal>
	);
}

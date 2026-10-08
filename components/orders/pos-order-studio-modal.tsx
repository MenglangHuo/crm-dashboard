"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	customersApi,
	warehousesApi,
	productsApi,
	categoriesApi,
	unitsApi,
	ordersApi,
	deliveriesApi,
	paymentTermsApi,
	safeImageUrl,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Product, Customer, Order, VariantUnit, PaymentTerm } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { usePermissions } from "@/hooks/use-permissions";
import {
	ShoppingCart,
	Search,
	Plus,
	Minus,
	Trash2,
	User,
	Building2,
	Send,
	Save,
	Package,
	X,
	ChevronLeft,
	ChevronRight,
	Sparkles,
	DollarSign,
	Lock,
	Gift,
	Truck,
	MapPin,
	Home,
	FileText,
	ChevronDown,
	ChevronUp,
	Receipt,
	Layers,
	Edit3,
	Check,
	Percent,
	Copy,
	Clock,
} from "lucide-react";

interface PosOrderStudioModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	editingOrder?: Order | null;
	clonedOrder?: Order | null;
}

export interface CartLineItem {
	cartId: string;
	productId: string | number;
	variantId: string | number;
	unitId: string | number;
	productName: string;
	sku: string;
	imageUrl?: string;
	unitName: string;
	unitPrice: number;
	quantity: number;
	discount: number;
	discountType: "FLAT" | "PERCENTAGE";
	availableStock?: number;
}

export interface AddonLineItem {
	addonId: string;
	productId: string | number;
	variantId: string | number;
	unitId: string | number;
	productName: string;
	sku: string;
	imageUrl?: string;
	unitName: string;
	unitPrice: number;
	quantity: number;
	availableStock?: number;
}

// Helper Component: Safe Image with Fallback
function SafeProductImage({
	src,
	alt,
	className,
}: {
	src?: string;
	alt?: string;
	className?: string;
}) {
	const [error, setError] = useState(false);
	const imageUrl = safeImageUrl(src);

	if (error || !src) {
		return (
			<div
				className={`flex items-center justify-center bg-indigo-50/60 dark:bg-slate-800 text-indigo-400 dark:text-indigo-300 ${className}`}
			>
				<Package className="h-7 w-7 opacity-60" />
			</div>
		);
	}

	return (
		<img
			src={imageUrl}
			alt={alt || "Product"}
			onError={() => setError(true)}
			className={className}
		/>
	);
}

export function PosOrderStudioModal({
	open,
	onOpenChange,
	onSuccess,
	editingOrder,
	clonedOrder,
}: PosOrderStudioModalProps) {
	const { t } = useTranslation();
	const { canCreateOrder, canPostOrder } = usePermissions();
	const queryClient = useQueryClient();
	const categoryScrollRef = useRef<HTMLDivElement>(null);

	// Search & Filter State (Left Side Catalog)
	const [productSearch, setProductSearch] = useState("");
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

	// Cart Search filter for quick finding in large orders
	const [cartSearch, setCartSearch] = useState("");

	// Cart & Customer State (Right Side)
	const [customerId, setCustomerId] = useState<string>("");
	const [paymentTermId, setPaymentTermId] = useState<string>("");
	const prevCustomerIdRef = useRef<string>("");
	const [warehouseId, setWarehouseId] = useState<string>("");
	const [deliveryId, setDeliveryId] = useState<string>("");
	const [shippingCustomerAddress, setShippingCustomerAddress] =
		useState<string>("");
	const [shippingHomeInfo, setShippingHomeInfo] = useState<string>("");

	// Financial Charges State
	const [discount, setDiscount] = useState<number>(0);
	const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
		"FLAT",
	);
	const [shippingAmount, setShippingAmount] = useState<number>(0);
	const [taxAmount, setTaxAmount] = useState<number>(0);
	const [customerNote, setCustomerNote] = useState<string>("");
	const [internalNote, setInternalNote] = useState<string>("");

	// Items and Add-Ons State
	const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
	const [addonItems, setAddonItems] = useState<AddonLineItem[]>([]);
	const [cartTab, setCartTab] = useState<"ITEMS" | "ADDONS" | "ALL">("ITEMS");

	// Compact Collapsible Drawers
	const [isDeliveryAddressOpen, setIsDeliveryAddressOpen] = useState(false);
	const [isExtraChargesOpen, setIsExtraChargesOpen] = useState(false);

	// Configurator Popover / Modal State
	const [configProduct, setConfigProduct] = useState<Product | null>(null);
	const [configVariantId, setConfigVariantId] = useState<string>("");
	const [configUnitId, setConfigUnitId] = useState<string>("");
	const [configPrice, setConfigPrice] = useState<number>(0);
	const [configQuantity, setConfigQuantity] = useState<number>(1);
	const [configMode, setConfigMode] = useState<"STANDARD" | "ADDON">(
		"STANDARD",
	);
	const [configAddonPrice, setConfigAddonPrice] = useState<number>(0);
	const [editingCartId, setEditingCartId] = useState<string | null>(null);

	// 1. Fetch Products via Backend API POST /v1/products/search
	const { data: productsData, isLoading: isLoadingProducts } = useQuery({
		queryKey: ["pos-products-search-api", productSearch, selectedCategoryId],
		queryFn: async () => {
			const filters: any[] = [];
			if (productSearch.trim()) {
				filters.push({
					field: "search",
					operator: "FULL_TEXT",
					value: productSearch.trim(),
				});
			}
			if (selectedCategoryId && selectedCategoryId !== "ALL") {
				filters.push({
					field: "category",
					operator: "EQUAL",
					value: Number(selectedCategoryId),
				});
			}

			const payload = {
				page: 0,
				size: 60,
				sort: [
					{
						field: "createdAt",
						direction: "DESC",
					},
				],
				filterGroup: {
					operator: "AND",
					filters,
				},
			};

			try {
				return await productsApi.search(payload);
			} catch {
				return await productsApi.list({
					page: 1,
					limit: 60,
					search: productSearch,
				});
			}
		},
		enabled: open,
	});

	// 2. Fetch Categories
	const { data: categoriesData } = useQuery({
		queryKey: ["pos-categories-list"],
		queryFn: () => categoriesApi.list({ limit: 100 }),
		enabled: open,
	});

	// 3. Fetch Customers
	const { data: customersData } = useQuery({
		queryKey: ["pos-customers-list"],
		queryFn: () => customersApi.list({ limit: 100 }),
		enabled: open,
	});

	// 4. Fetch Warehouses
	const { data: warehousesData } = useQuery({
		queryKey: ["pos-warehouses-list"],
		queryFn: () => warehousesApi.list({ limit: 100 }),
		enabled: open,
	});

	// 5. Fetch Global Units
	const { data: globalUnitsData } = useQuery({
		queryKey: ["pos-global-units"],
		queryFn: () => unitsApi.list({ limit: 100 }),
		enabled: open,
	});

	// 6. Fetch Deliveries Carriers
	const { data: deliveriesData } = useQuery({
		queryKey: ["pos-deliveries-list"],
		queryFn: () => deliveriesApi.list({ limit: 100 }),
		enabled: open,
	});

	// 6b. Fetch Payment Terms
	const { data: paymentTerms = [] } = useQuery<PaymentTerm[]>({
		queryKey: ["pos-payment-terms"],
		queryFn: () => paymentTermsApi.list(),
		enabled: open,
	});

	// 7. Fetch Specific Units for configured product via GET /api/v1/products/{productId}/units
	const { data: productSpecificUnits } = useQuery({
		queryKey: ["pos-product-units", configProduct?.id],
		queryFn: () =>
			configProduct?.id
				? productsApi.getProductUnits(configProduct.id)
				: Promise.resolve([]),
		enabled: Boolean(configProduct?.id),
	});

	// 7b. Fetch detailed product with complete variants and units
	const { data: fullConfigProduct } = useQuery({
		queryKey: ["pos-product-detail", configProduct?.id],
		queryFn: () =>
			configProduct?.id
				? productsApi.get(configProduct.id)
				: Promise.resolve(null),
		enabled: Boolean(configProduct?.id),
	});

	// 7c. Fetch Variant-Specific Units with tier prices via GET /api/v1/products/variant/{variantId}/units
	const { data: variantSpecificUnits } = useQuery<VariantUnit[]>({
		queryKey: ["pos-variant-units", configVariantId],
		queryFn: () =>
			configVariantId
				? productsApi.getVariantUnits(configVariantId)
				: Promise.resolve([]),
		enabled: Boolean(configVariantId),
	});

	// Merged detailed product for configurator
	const effectiveConfigProduct = useMemo(() => {
		if (!configProduct) return null;
		if (
			fullConfigProduct &&
			String(fullConfigProduct.id) === String(configProduct.id)
		) {
			return {
				...configProduct,
				...fullConfigProduct,
				variants:
					fullConfigProduct.variants && fullConfigProduct.variants.length > 0
						? fullConfigProduct.variants
						: configProduct.variants,
				units:
					fullConfigProduct.units && fullConfigProduct.units.length > 0
						? fullConfigProduct.units
						: configProduct.units,
			};
		}
		return configProduct;
	}, [configProduct, fullConfigProduct]);

	// Active selected variant object in configurator
	const activeSelectedVariant = useMemo(() => {
		const targetProduct = effectiveConfigProduct || configProduct;
		if (!targetProduct) return null;
		const variants = targetProduct.variants || [];
		return (
			variants.find(
				(v: any) => String(v.id || v.variantId) === String(configVariantId),
			) ||
			variants[0] ||
			null
		);
	}, [effectiveConfigProduct, configProduct, configVariantId]);

	// Effective configurator units list merged across global, product, and variant-specific units
	const configuratorUnitsList = useMemo(() => {
		const targetProduct = effectiveConfigProduct || configProduct;
		if (!targetProduct) return [];

		const map = new Map<string, any>();

		// 1. Global units as baseline (names, symbols)
		(globalUnitsData?.items || []).forEach((u: any) => {
			const id = String(u.unitId || u.id);
			map.set(id, { ...u, unitId: id });
		});

		// 2. Product-level units
		const prodUnits =
			productSpecificUnits && productSpecificUnits.length > 0
				? productSpecificUnits
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

		// 3. Variant-level units from activeSelectedVariant.units (from API response)
		if (
			activeSelectedVariant?.units &&
			Array.isArray(activeSelectedVariant.units)
		) {
			activeSelectedVariant.units.forEach((u: any) => {
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
					discountPercentage: u.discountPercentage,
					discountNote: u.discountNote,
				});
			});
		}

		// 4. Variant-specific units from GET /products/variant/{variantId}/units
		if (
			variantSpecificUnits &&
			Array.isArray(variantSpecificUnits) &&
			variantSpecificUnits.length > 0
		) {
			variantSpecificUnits.forEach((u: any) => {
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
					discountPercentage: u.discountPercentage,
					discountNote: u.discountNote,
				});
			});
		}

		// Filter down to valid units associated with this product or variant
		const validUnitIds = new Set<string>();
		prodUnits.forEach((u: any) => validUnitIds.add(String(u.unitId || u.id)));
		if (activeSelectedVariant?.units) {
			activeSelectedVariant.units.forEach((u: any) =>
				validUnitIds.add(String(u.unitId || u.id)),
			);
		}
		if (variantSpecificUnits && variantSpecificUnits.length > 0) {
			variantSpecificUnits.forEach((u: any) =>
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
		globalUnitsData,
		productSpecificUnits,
		effectiveConfigProduct,
		configProduct,
		activeSelectedVariant,
		variantSpecificUnits,
	]);

	// Real-time Unit Price Resolver based on Variant & Unit API responses
	const calculateResolvedUnitPrice = (
		prod: Product | null,
		variantIdStr: string,
		unitIdStr: string,
		unitsList: any[] = configuratorUnitsList,
		varUnits: any[] = variantSpecificUnits || [],
	): number => {
		if (!prod) return 0;

		const variants = prod.variants || [];
		const selectedVariantObj =
			variants.find(
				(v: any) => String(v.id || v.variantId) === String(variantIdStr),
			) || variants[0];

		// Find matching unit object in unitsList (by unitId or id)
		const selectedUnitObj = unitsList.find(
			(u: any) =>
				String(u.unitId) === String(unitIdStr) ||
				String(u.id) === String(unitIdStr),
		);

		// Multiplier / conversion factor calculation (e.g. Box of 10 -> 10)
		const factor = Number(
			selectedUnitObj?.baseQuantity ??
				selectedUnitObj?.conversionFactor ??
				selectedUnitObj?.conversionRate ??
				selectedUnitObj?.multiplier ??
				selectedUnitObj?.factor ??
				1,
		);
		const validFactor = !isNaN(factor) && factor > 0 ? factor : 1;

		const isBaseUnit = Boolean(
			selectedUnitObj?.isBase ||
				selectedUnitObj?.is_base ||
				(selectedUnitObj?.baseUnitId &&
					String(selectedUnitObj.baseUnitId) ===
						String(selectedUnitObj.unitId || selectedUnitObj.id)) ||
				validFactor === 1,
		);

		// Priority 1: Check if variantSpecificUnits (from GET /products/variant/{variantId}/units API) has price
		if (Array.isArray(varUnits) && varUnits.length > 0) {
			const matchedVarUnit = varUnits.find((vu: any) => {
				const uId = String(vu.unitId ?? vu.id ?? "");
				return (
					uId === String(unitIdStr) ||
					(selectedUnitObj &&
						(uId === String(selectedUnitObj.unitId) ||
							uId === String(selectedUnitObj.id)))
				);
			});
			if (matchedVarUnit) {
				const p = Number(
					matchedVarUnit.finalPrice ??
						matchedVarUnit.basePrice ??
						matchedVarUnit.sellPrice ??
						matchedVarUnit.unitPrice ??
						matchedVarUnit.price,
				);
				if (!isNaN(p) && p > 0) return p;
			}
		}

		// Priority 2: Check if selectedVariantObj.units (from API response) has explicit price
		if (selectedVariantObj) {
			const vUnits =
				selectedVariantObj.units ||
				selectedVariantObj.unitPrices ||
				selectedVariantObj.unit_prices ||
				[];
			if (Array.isArray(vUnits) && vUnits.length > 0) {
				const matchedVUnit = vUnits.find((vu: any) => {
					const uId = String(vu.unitId ?? vu.unit_id ?? vu.id ?? "");
					return (
						uId === String(unitIdStr) ||
						(selectedUnitObj &&
							(uId === String(selectedUnitObj.unitId) ||
								uId === String(selectedUnitObj.id)))
					);
				});
				if (matchedVUnit) {
					const p = Number(
						matchedVUnit.finalPrice ??
							matchedVUnit.basePrice ??
							matchedVUnit.sellPrice ??
							matchedVUnit.unitPrice ??
							matchedVUnit.price ??
							matchedVUnit.retailPrice,
					);
					if (!isNaN(p) && p > 0) return p;
				}
			}
		}

		// Priority 3: Check if selectedUnitObj has variantPrices for this variant
		if (
			selectedUnitObj?.variantPrices &&
			Array.isArray(selectedUnitObj.variantPrices)
		) {
			const vpObj = selectedUnitObj.variantPrices.find((vp: any) => {
				const vId = String(vp.variantId ?? vp.variant_id ?? vp.id ?? "");
				return (
					vId === String(variantIdStr) ||
					(selectedVariantObj &&
						(vId === String(selectedVariantObj.id) ||
							vId === String(selectedVariantObj.variantId)))
				);
			});
			if (vpObj) {
				const p = Number(
					vpObj.finalPrice ??
						vpObj.unitPrice ??
						vpObj.sellPrice ??
						vpObj.price ??
						vpObj.retailPrice,
				);
				if (!isNaN(p) && p > 0) return p;
			}
		}

		// Base price of the selected variant (for 1 base unit of this specific variant)
		const variantBasePrice = Number(
			selectedVariantObj?.sellPrice !== undefined &&
				selectedVariantObj?.sellPrice !== null
				? selectedVariantObj.sellPrice
				: selectedVariantObj?.price !== undefined &&
						selectedVariantObj?.price !== null
					? selectedVariantObj.price
					: selectedVariantObj?.finalPrice !== undefined &&
							selectedVariantObj?.finalPrice !== null
						? selectedVariantObj.finalPrice
						: selectedVariantObj?.unitPrice !== undefined &&
								selectedVariantObj?.unitPrice !== null
							? selectedVariantObj.unitPrice
							: selectedVariantObj?.basePrice !== undefined &&
									selectedVariantObj?.basePrice !== null
								? selectedVariantObj.basePrice
								: prod.sellPrice !== undefined && prod.sellPrice !== null
									? prod.sellPrice
									: prod.price !== undefined && prod.price !== null
										? prod.price
										: prod.basePrice !== undefined && prod.basePrice !== null
											? prod.basePrice
											: 0,
		);

		// Priority 4: Base Unit -> returns variant's base price
		if (isBaseUnit && variantBasePrice > 0) {
			return variantBasePrice;
		}

		// Priority 5: Packaging Unit with Multiplier -> compute variantBasePrice * validFactor
		if (variantBasePrice > 0 && validFactor > 1) {
			return variantBasePrice * validFactor;
		}

		// Priority 6: Fallback to direct unit price on selectedUnitObj
		if (selectedUnitObj) {
			const directUnitPrice = Number(
				selectedUnitObj.finalPrice ??
					selectedUnitObj.unitPrice ??
					selectedUnitObj.sellPrice ??
					selectedUnitObj.price ??
					selectedUnitObj.basePrice ??
					0,
			);
			if (!isNaN(directUnitPrice) && directUnitPrice > 0) {
				return directUnitPrice;
			}
		}

		// Priority 7: Return variant base price or product base price
		if (variantBasePrice > 0) {
			return variantBasePrice;
		}

		return Number(prod.sellPrice ?? prod.price ?? prod.basePrice ?? 0);
	};

	// Automatic real-time price synchronization on variant, unit, or unit list changes
	useEffect(() => {
		const targetProduct = effectiveConfigProduct || configProduct;
		if (targetProduct && configMode === "STANDARD") {
			let currentUnitId = configUnitId;
			if (configuratorUnitsList.length > 0) {
				const found = configuratorUnitsList.find(
					(u: any) =>
						String(u.unitId) === String(configUnitId) ||
						String(u.id) === String(configUnitId),
				);
				if (!found) {
					const baseUnit =
						configuratorUnitsList.find((u: any) => u.isBase) ||
						configuratorUnitsList[0];
					currentUnitId = String(baseUnit.unitId || baseUnit.id);
					setConfigUnitId(currentUnitId);
				}
			}

			const price = calculateResolvedUnitPrice(
				targetProduct,
				configVariantId,
				currentUnitId,
				configuratorUnitsList,
				variantSpecificUnits || [],
			);
			setConfigPrice(price);
		}
	}, [
		configProduct,
		effectiveConfigProduct,
		configVariantId,
		configUnitId,
		configuratorUnitsList,
		variantSpecificUnits,
		configMode,
	]);

	// Pre-populate if editing an existing DRAFT order or CLONING an existing order
	useEffect(() => {
		const sourceOrder = editingOrder || clonedOrder;
		if (sourceOrder && open) {
			setCustomerId(
				sourceOrder.customerId ? String(sourceOrder.customerId) : "",
			);
			setWarehouseId(
				sourceOrder.warehouseId ? String(sourceOrder.warehouseId) : "",
			);
			setPaymentTermId(
				sourceOrder.paymentTermId
					? String(sourceOrder.paymentTermId)
					: (sourceOrder as any).paymentTerm?.id
						? String((sourceOrder as any).paymentTerm.id)
						: "",
			);
			setDeliveryId(
				sourceOrder.deliveryId ? String(sourceOrder.deliveryId) : "",
			);
			setShippingCustomerAddress(
				sourceOrder.shippingAddress?.customerAddress || "",
			);
			setShippingHomeInfo(sourceOrder.shippingAddress?.homeInfo || "");
			setDiscount(
				Number(sourceOrder.discountAmount || sourceOrder.discount) || 0,
			);
			setDiscountType(
				sourceOrder.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FLAT",
			);
			setShippingAmount(Number(sourceOrder.shippingAmount) || 0);
			setTaxAmount(Number(sourceOrder.taxAmount) || 0);
			setCustomerNote(sourceOrder.customerNote || "");
			setInternalNote(
				clonedOrder
					? `[Cloned from #${clonedOrder.orderNumber || clonedOrder.orderNo || clonedOrder.id}] ${sourceOrder.internalNote || ""}`.trim()
					: sourceOrder.internalNote || "",
			);

			if (sourceOrder.items && Array.isArray(sourceOrder.items)) {
				const idPrefix = clonedOrder ? "clone-item" : "edit-item";
				setCartItems(
					sourceOrder.items.map((it: any, idx: number) => ({
						cartId: `${idPrefix}-${it.id || idx}-${Date.now()}-${idx}`,
						productId: it.productId || it.product?.id || it.variantId || it.id,
						variantId: it.variantId || it.id,
						unitId: it.unitId || 1,
						productName:
							it.productName ||
							it.product?.name ||
							`Product #${it.productId || it.id}`,
						sku: it.sku || it.product?.baseSku || `SKU-${it.id}`,
						imageUrl: it.imageUrl || it.productImageUrl || it.product?.imageUrl,
						unitName: it.unitName || "PCS",
						unitPrice: Number(it.unitPrice) || 0,
						quantity: Number(it.quantity) || 1,
						discount: Number(it.discount) || 0,
						discountType: it.discountType || "FLAT",
						availableStock: it.availableStock,
					})),
				);
			} else {
				setCartItems([]);
			}

			const initialAddons =
				sourceOrder.addonsItems && sourceOrder.addonsItems.length > 0
					? sourceOrder.addonsItems
					: sourceOrder.addons;
			if (initialAddons && Array.isArray(initialAddons)) {
				const idPrefix = clonedOrder ? "clone-addon" : "edit-addon";
				setAddonItems(
					initialAddons.map((ad: any, idx: number) => ({
						addonId: `${idPrefix}-${ad.id || idx}-${Date.now()}-${idx}`,
						productId: ad.productId || ad.product?.id || ad.variantId || ad.id,
						variantId: ad.variantId || ad.id,
						unitId: ad.unitId || 1,
						productName:
							ad.productName ||
							ad.product?.name ||
							`Add-on #${ad.id || idx + 1}`,
						sku: ad.sku || ad.product?.baseSku || `SKU-${ad.id}`,
						imageUrl: ad.imageUrl || ad.productImageUrl || ad.product?.imageUrl,
						unitName: ad.unitName || "PCS",
						unitPrice: Number(ad.unitPrice) || 0,
						quantity: Number(ad.quantity) || 1,
						availableStock: ad.availableStock,
					})),
				);
			} else {
				setAddonItems([]);
			}
		} else if (!editingOrder && !clonedOrder && open) {
			// fresh mode initialized
		}
	}, [editingOrder, clonedOrder, open]);

	// Customer Auto-Population Effect (Address, Primary Delivery & Payment Terms)
	useEffect(() => {
		if (!customerId || !customersData?.items) {
			prevCustomerIdRef.current = customerId;
			return;
		}

		const isCustomerChanged = prevCustomerIdRef.current !== customerId;
		prevCustomerIdRef.current = customerId;

		const selectedCust = customersData.items.find(
			(c) => String(c.id) === String(customerId),
		);
		if (selectedCust) {
			if (selectedCust.addressInfo) {
				const parts = [
					selectedCust.addressInfo.village,
					selectedCust.addressInfo.commune,
					selectedCust.addressInfo.district,
					selectedCust.addressInfo.province,
				].filter(Boolean);
				setShippingCustomerAddress(
					parts.length > 0 ? parts.join(", ") : selectedCust.addressCode || "",
				);
			} else {
				setShippingCustomerAddress(selectedCust.addressCode || "");
			}

			setShippingHomeInfo(selectedCust.address || "");

			const primaryDel =
				selectedCust.primaryDeliveryId ||
				selectedCust.primaryDelivery?.id ||
				(selectedCust.deliveries && selectedCust.deliveries[0]?.id) ||
				(selectedCust.deliveryIds && selectedCust.deliveryIds[0]);
			if (primaryDel && (isCustomerChanged || !deliveryId)) {
				setDeliveryId(String(primaryDel));
			}

			const defaultTerm =
				(selectedCust as any).defaultPaymentTermId ||
				(selectedCust as any).defaultPaymentTerm?.id ||
				(selectedCust as any).paymentTermId ||
				(selectedCust as any).paymentTerm?.id;
			if (defaultTerm && (isCustomerChanged || !paymentTermId)) {
				setPaymentTermId(String(defaultTerm));
			}
		}
	}, [customerId, customersData]);

	// Order Creation / Updating Mutation
	const saveOrderMutation = useMutation({
		mutationFn: async ({
			payload,
			shouldPost,
		}: {
			payload: any;
			shouldPost?: boolean;
		}) => {
			let order: Order;
			if (editingOrder && editingOrder.id) {
				order = await ordersApi.update(editingOrder.id, payload);
			} else {
				order = await ordersApi.create(payload, `POS-ORD-${Date.now()}`);
			}

			if (shouldPost && order?.id) {
				return await ordersApi.postOrder(
					order.id,
					"POS Order Submitted & Posted to Warehouse",
				);
			}
			return order;
		},
		onSuccess: (result, variables) => {
			toast.success(
				variables.shouldPost
					? clonedOrder
						? "Cloned order saved and POSTED to warehouse! Reserved stock allocated."
						: "Sales order saved and POSTED to warehouse! Reserved stock allocated."
					: editingOrder
						? "Draft order updated successfully!"
						: clonedOrder
							? "Order cloned successfully! New sales order created."
							: "Sales order draft saved successfully!",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			onOpenChange(false);
			resetStudio();
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const resetStudio = () => {
		setCustomerId("");
		setPaymentTermId("");
		prevCustomerIdRef.current = "";
		setWarehouseId("");
		setDeliveryId("");
		setShippingCustomerAddress("");
		setShippingHomeInfo("");
		setDiscount(0);
		setDiscountType("FLAT");
		setShippingAmount(0);
		setTaxAmount(0);
		setCustomerNote("");
		setInternalNote("");
		setCartItems([]);
		setAddonItems([]);
		setProductSearch("");
		setSelectedCategoryId("ALL");
		setConfigProduct(null);
		setCartTab("ITEMS");
		setCartSearch("");
		setEditingCartId(null);
	};

	// Category Scroll
	const handleScrollCategories = (direction: "left" | "right") => {
		if (categoryScrollRef.current) {
			const scrollAmount = direction === "left" ? -220 : 220;
			categoryScrollRef.current.scrollBy({
				left: scrollAmount,
				behavior: "smooth",
			});
		}
	};

	// Open Configure Modal on product click or + button click
	const handleOpenConfigureModal = (
		prod: Product,
		mode: "STANDARD" | "ADDON" = "STANDARD",
		existingItem?: CartLineItem,
	) => {
		const variants = prod.variants || [];
		const firstVariant = variants[0];
		const defaultVariantId = existingItem
			? String(existingItem.variantId)
			: firstVariant
				? String(firstVariant.id ?? firstVariant.variantId)
				: String(prod.id);

		const defaultVariantObj =
			variants.find(
				(v: any) => String(v.id || v.variantId) === String(defaultVariantId),
			) || firstVariant;

		const prodUnits =
			defaultVariantObj?.units && defaultVariantObj.units.length > 0
				? defaultVariantObj.units
				: prod.units && prod.units.length > 0
					? prod.units
					: globalUnitsData?.items || [];
		const baseUnitObj = prodUnits.find((u: any) => u.isBase) || prodUnits[0];
		const defaultUnitId = existingItem
			? String(existingItem.unitId)
			: defaultVariantObj?.unitId
				? String(defaultVariantObj.unitId)
				: prod.unitId
					? String(prod.unitId)
					: baseUnitObj
						? String(baseUnitObj.unitId || baseUnitObj.id)
						: "1";

		setConfigProduct(prod);
		setConfigVariantId(defaultVariantId);
		setConfigUnitId(defaultUnitId);
		setConfigQuantity(existingItem ? existingItem.quantity : 1);
		setConfigMode(mode);
		setConfigAddonPrice(0);
		setEditingCartId(existingItem ? existingItem.cartId : null);

		const resolvedPrice =
			existingItem && existingItem.unitPrice > 0
				? existingItem.unitPrice
				: calculateResolvedUnitPrice(
						prod,
						defaultVariantId,
						defaultUnitId,
						prodUnits,
						[],
					);
		setConfigPrice(resolvedPrice);
	};

	// Unit Measure Change
	const handleUnitChange = (newUnitId: string) => {
		setConfigUnitId(newUnitId);
		const targetProduct = effectiveConfigProduct || configProduct;
		const price = calculateResolvedUnitPrice(
			targetProduct,
			configVariantId,
			newUnitId,
			configuratorUnitsList,
			variantSpecificUnits || [],
		);
		setConfigPrice(price);
	};

	// Variant Change
	const handleVariantChange = (newVariantId: string) => {
		setConfigVariantId(newVariantId);
		const targetProduct = effectiveConfigProduct || configProduct;
		const price = calculateResolvedUnitPrice(
			targetProduct,
			newVariantId,
			configUnitId,
			configuratorUnitsList,
			variantSpecificUnits || [],
		);
		setConfigPrice(price);
	};

	// Confirm adding or updating configured item
	const handleConfirmConfigAdd = (forceMode?: "STANDARD" | "ADDON") => {
		const currentProduct = effectiveConfigProduct || configProduct;
		if (!currentProduct) return;

		const activeMode = forceMode || configMode;
		const selectedUnitObj = configuratorUnitsList.find(
			(u: any) =>
				String(u.unitId) === String(configUnitId) ||
				String(u.id) === String(configUnitId),
		);
		const unitName =
			selectedUnitObj?.name || selectedUnitObj?.unitName || "PCS";
		const effectiveUnitId =
			selectedUnitObj?.unitId || selectedUnitObj?.id || configUnitId || "1";
		const finalPrice =
			activeMode === "ADDON"
				? Number(configAddonPrice) || 0
				: Number(configPrice) || 0;

		if (activeMode === "ADDON") {
			addToAddonLineItem({
				prod: currentProduct,
				variantId: configVariantId || currentProduct.id,
				unitId: effectiveUnitId,
				unitName: unitName,
				price: finalPrice,
				quantity: Number(configQuantity) || 1,
			});
		} else {
			addToCartLineItem({
				prod: currentProduct,
				variantId: configVariantId || currentProduct.id,
				unitId: effectiveUnitId,
				unitName: unitName,
				price: finalPrice,
				quantity: Number(configQuantity) || 1,
				replaceCartId: editingCartId || undefined,
			});
		}

		setConfigProduct(null);
		setEditingCartId(null);
	};

	// Add to Regular Cart
	const addToCartLineItem = ({
		prod,
		variantId,
		unitId,
		unitName,
		price,
		quantity,
		replaceCartId,
	}: {
		prod: Product;
		variantId: string | number;
		unitId: string | number;
		unitName: string;
		price: number;
		quantity: number;
		replaceCartId?: string;
	}) => {
		const variants = prod.variants || [];
		const selectedVariant = variants.find(
			(v: any) => String(v.id || v.variantId) === String(variantId),
		);
		const sku =
			selectedVariant?.sku ||
			prod.baseSku ||
			prod.model ||
			`SKU-${prod.id}`;
		const productName = selectedVariant?.name
			? `${prod.name} (${selectedVariant.name})`
			: prod.name;
		const availableStock =
			selectedVariant?.stockQty ??
			selectedVariant?.inventory?.availableQty ??
			prod.stockQty;

		if (replaceCartId) {
			setCartItems((prev) =>
				prev.map((item) =>
					item.cartId === replaceCartId
						? {
								...item,
								productId: prod.id,
								variantId,
								unitId,
								unitName,
								productName,
								sku,
								unitPrice: price,
								quantity,
								availableStock,
							}
						: item,
				),
			);
			toast.success(`Updated ${productName} in cart`);
			return;
		}

		const existingIndex = cartItems.findIndex(
			(c) =>
				String(c.productId) === String(prod.id) &&
				String(c.variantId) === String(variantId) &&
				String(c.unitId) === String(unitId),
		);

		if (existingIndex >= 0) {
			setCartItems((prev) =>
				prev.map((item, idx) =>
					idx === existingIndex
						? { ...item, quantity: item.quantity + quantity }
						: item,
				),
			);
			toast.info(
				`Updated ${productName} quantity to ${cartItems[existingIndex].quantity + quantity}`,
			);
		} else {
			const newItem: CartLineItem = {
				cartId: `cart-${Date.now()}-${Math.random()}`,
				productId: prod.id,
				variantId: variantId,
				unitId: unitId,
				productName: productName,
				sku: sku,
				imageUrl: selectedVariant?.thumbnail || prod.imageUrl,
				unitName: unitName,
				unitPrice: price,
				quantity: quantity,
				discount: 0,
				discountType: "FLAT",
				availableStock: availableStock,
			};
			setCartItems((prev) => [...prev, newItem]);
			toast.success(`Added ${productName} to order items`);
		}
	};

	// Add to Addons
	const addToAddonLineItem = ({
		prod,
		variantId,
		unitId,
		unitName,
		price,
		quantity,
	}: {
		prod: Product;
		variantId: string | number;
		unitId: string | number;
		unitName: string;
		price: number;
		quantity: number;
	}) => {
		const variants = prod.variants || [];
		const selectedVariant = variants.find(
			(v: any) => String(v.id || v.variantId) === String(variantId),
		);
		const sku =
			selectedVariant?.sku ||
			prod.baseSku ||
			prod.model ||
			`SKU-${prod.id}`;
		const productName = selectedVariant?.name
			? `${prod.name} (${selectedVariant.name})`
			: prod.name;
		const availableStock =
			selectedVariant?.stockQty ??
			selectedVariant?.inventory?.availableQty ??
			prod.stockQty;

		const existingIndex = addonItems.findIndex(
			(a) =>
				String(a.productId) === String(prod.id) &&
				String(a.variantId) === String(variantId) &&
				String(a.unitId) === String(unitId),
		);

		if (existingIndex >= 0) {
			setAddonItems((prev) =>
				prev.map((item, idx) =>
					idx === existingIndex
						? { ...item, quantity: item.quantity + quantity }
						: item,
				),
			);
			toast.info(
				`Updated add-on ${productName} quantity to ${addonItems[existingIndex].quantity + quantity}`,
			);
		} else {
			const newAddon: AddonLineItem = {
				addonId: `addon-${Date.now()}-${Math.random()}`,
				productId: prod.id,
				variantId: variantId,
				unitId: unitId,
				productName: productName,
				sku: sku,
				imageUrl: selectedVariant?.thumbnail || prod.imageUrl,
				unitName: unitName,
				unitPrice: price,
				quantity: quantity,
				availableStock: availableStock,
			};
			setAddonItems((prev) => [...prev, newAddon]);
			toast.success(`Added ${productName} as add-on item`);
		}
	};

	// Stepper handlers
	const handleUpdateCartQuantity = (cartId: string, delta: number) => {
		setCartItems(
			(prev) =>
				prev
					.map((item) => {
						if (item.cartId === cartId) {
							const nextQty = item.quantity + delta;
							return nextQty > 0 ? { ...item, quantity: nextQty } : null;
						}
						return item;
					})
					.filter(Boolean) as CartLineItem[],
		);
	};

	const handleSetCartQuantity = (cartId: string, qty: number) => {
		const safeQty = Math.max(1, isNaN(qty) ? 1 : qty);
		setCartItems((prev) =>
			prev.map((item) =>
				item.cartId === cartId ? { ...item, quantity: safeQty } : item,
			),
		);
	};

	const handleUpdateCartLineDiscount = (
		cartId: string,
		disc: number,
		type: "FLAT" | "PERCENTAGE",
	) => {
		setCartItems((prev) =>
			prev.map((item) =>
				item.cartId === cartId
					? {
							...item,
							discount: Math.max(0, isNaN(disc) ? 0 : disc),
							discountType: type,
						}
					: item,
			),
		);
	};

	const handleRemoveCartItem = (cartId: string) => {
		setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
	};

	const handleUpdateAddonQuantity = (addonId: string, delta: number) => {
		setAddonItems(
			(prev) =>
				prev
					.map((item) => {
						if (item.addonId === addonId) {
							const nextQty = item.quantity + delta;
							return nextQty > 0 ? { ...item, quantity: nextQty } : null;
						}
						return item;
					})
					.filter(Boolean) as AddonLineItem[],
		);
	};

	const handleSetAddonQuantity = (addonId: string, qty: number) => {
		const safeQty = Math.max(1, isNaN(qty) ? 1 : qty);
		setAddonItems((prev) =>
			prev.map((item) =>
				item.addonId === addonId ? { ...item, quantity: safeQty } : item,
			),
		);
	};

	const handleUpdateAddonPrice = (addonId: string, price: number) => {
		setAddonItems((prev) =>
			prev.map((item) =>
				item.addonId === addonId
					? { ...item, unitPrice: Math.max(0, isNaN(price) ? 0 : price) }
					: item,
			),
		);
	};

	const handleRemoveAddonItem = (addonId: string) => {
		setAddonItems((prev) => prev.filter((i) => i.addonId !== addonId));
	};

	// Convert Regular Item <-> Add-On Item
	const handleConvertItemToAddon = (cartId: string) => {
		const item = cartItems.find((i) => i.cartId === cartId);
		if (!item) return;
		setCartItems((prev) => prev.filter((i) => i.cartId !== cartId));
		setAddonItems((prev) => [
			...prev,
			{
				addonId: `addon-${Date.now()}-${Math.random()}`,
				productId: item.productId,
				variantId: item.variantId,
				unitId: item.unitId,
				productName: item.productName,
				sku: item.sku,
				imageUrl: item.imageUrl,
				unitName: item.unitName,
				unitPrice: 0,
				quantity: item.quantity,
				availableStock: item.availableStock,
			},
		]);
		toast.info(`Moved ${item.productName} to Add-Ons list ($0.00)`);
	};

	const handleConvertAddonToItem = (addonId: string) => {
		const addon = addonItems.find((a) => a.addonId === addonId);
		if (!addon) return;
		setAddonItems((prev) => prev.filter((a) => a.addonId !== addonId));
		setCartItems((prev) => [
			...prev,
			{
				cartId: `cart-${Date.now()}-${Math.random()}`,
				productId: addon.productId,
				variantId: addon.variantId,
				unitId: addon.unitId,
				productName: addon.productName,
				sku: addon.sku,
				imageUrl: addon.imageUrl,
				unitName: addon.unitName,
				unitPrice: addon.unitPrice > 0 ? addon.unitPrice : 0,
				quantity: addon.quantity,
				discount: 0,
				discountType: "FLAT",
				availableStock: addon.availableStock,
			},
		]);
		toast.info(`Moved ${addon.productName} to Regular Order Items`);
	};

	// Cart Calculations with Line Discounts & Add-Ons
	const itemsSubtotal = cartItems.reduce((sum, item) => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.unitPrice) || 0;
		const disc = Number(item.discount) || 0;
		const lineUnitPrice =
			item.discountType === "PERCENTAGE"
				? price * (1 - disc / 100)
				: price - disc;
		return sum + Math.max(0, lineUnitPrice) * qty;
	}, 0);

	const addonsSubtotal = addonItems.reduce((sum, item) => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.unitPrice) || 0;
		return sum + price * qty;
	}, 0);

	const subtotal = itemsSubtotal + addonsSubtotal;
	const orderDiscountAmount =
		discountType === "PERCENTAGE"
			? subtotal * (Number(discount) / 100)
			: Number(discount);
	const discountedSubtotal = Math.max(0, subtotal - orderDiscountAmount);
	const grandTotal =
		discountedSubtotal +
		(Number(shippingAmount) || 0) +
		(Number(taxAmount) || 0);

	// Submit Order Execution with Complete Schema
	const handleCheckout = (shouldPost: boolean = false) => {
		if (!customerId) {
			toast.error("Please select a customer before checking out");
			return;
		}
		if (cartItems.length === 0 && addonItems.length === 0) {
			toast.error(
				"Order cart is empty! Please add products from the left catalog.",
			);
			return;
		}

		const payload = {
			customerId: Number(customerId),
			...(warehouseId ? { warehouseId: Number(warehouseId) } : {}),
			...(paymentTermId ? { paymentTermId: Number(paymentTermId) } : {}),
			discount: Number(discount) || 0,
			discountType: discountType,
			shippingAmount: Number(shippingAmount) || 0,
			taxAmount: Number(taxAmount) || 0,
			customerNote: customerNote || "",
			internalNote: internalNote || "",
			...(deliveryId ? { deliveryId: Number(deliveryId) } : {}),
			shippingAddress: {
				customerAddress: shippingCustomerAddress || "",
				homeInfo: shippingHomeInfo || "",
			},
			items: cartItems.map((item) => ({
				variantId: Number(item.variantId) || Number(item.productId),
				unitId: Number(item.unitId) || 1,
				quantity: Number(item.quantity) || 1,
				unitPrice: Math.max(0, Number(item.unitPrice) || 0),
				discount: Number(item.discount) || 0,
				discountType: item.discountType,
			})),
			addons: addonItems.map((addon) => ({
				variantId: Number(addon.variantId) || Number(addon.productId),
				unitId: Number(addon.unitId) || 1,
				quantity: Number(addon.quantity) || 1,
				unitPrice: Math.max(0, Number(addon.unitPrice) || 0),
			})),
		};

		saveOrderMutation.mutate({ payload, shouldPost });
	};

	const customerOptions = (customersData?.items || []).map((c) => ({
		value: String(c.id),
		label: c.name,
		description: c.phone
			? `Phone: ${c.phone} ${c.address ? `• ${c.address}` : ""}`
			: c.address || undefined,
		icon: <User className="h-4 w-4 text-indigo-500" />,
	}));

	const warehouseOptions = (warehousesData?.items || []).map((w) => ({
		value: String(w.id),
		label: w.name,
		description: w.description || undefined,
		icon: <Building2 className="h-4 w-4 text-slate-500" />,
	}));

	const deliveryOptions = (deliveriesData?.items || []).map((d) => ({
		value: String(d.id),
		label: `${d.name} (${d.code || d.deliveryType || "Carrier"})`,
		description: d.driverName
			? `Driver: ${d.driverName} • Phone: ${d.primaryPhone || "—"}`
			: undefined,
		icon: <Truck className="h-4 w-4 text-purple-500" />,
	}));

	const paymentTermOptions = useMemo(() => {
		return (paymentTerms || []).map((t: PaymentTerm) => ({
			value: String(t.id),
			label: `${t.name} (${t.dueDays === 0 ? "Immediate / COD" : `Due ${t.dueDays}d`}${t.discountPercentage ? `, -${t.discountPercentage}%` : ""})`,
			description: t.description || undefined,
			icon: <Clock className="h-4 w-4 text-indigo-500" />,
		}));
	}, [paymentTerms]);

	const selectedPaymentTerm = useMemo(() => {
		return (paymentTerms || []).find(
			(t: PaymentTerm) => String(t.id) === String(paymentTermId),
		) || null;
	}, [paymentTerms, paymentTermId]);

	const unitSelectOptions = configuratorUnitsList.map((u: any) => {
		const unitVal = String(u.unitId || u.id);
		const unitName = u.name || u.unitName || `Unit #${u.unitId || u.id}`;
		const symbolStr =
			u.symbol || u.unitSymbol ? ` (${u.symbol || u.unitSymbol})` : "";
		const multiplierStr =
			u.baseQuantity && Number(u.baseQuantity) > 1
				? ` — 1×${u.baseQuantity}`
				: u.conversionFactor && Number(u.conversionFactor) > 1
					? ` — ×${u.conversionFactor}`
					: "";
		return {
			value: unitVal,
			label: `${unitName}${symbolStr}${multiplierStr}`,
			description:
				u.baseQuantity && Number(u.baseQuantity) > 1
					? `1 ${unitName} = ${u.baseQuantity} ${u.baseUnitName || "Base Units"}`
					: undefined,
		};
	});

	const productsList = productsData?.items || [];
	const totalLineCount = cartItems.length + addonItems.length;

	// Filter cart items by search query if any
	const filteredCartItems = cartItems.filter((i) =>
		cartSearch.trim() === ""
			? true
			: i.productName.toLowerCase().includes(cartSearch.toLowerCase()) ||
				i.sku.toLowerCase().includes(cartSearch.toLowerCase()),
	);

	const filteredAddonItems = addonItems.filter((a) =>
		cartSearch.trim() === ""
			? true
			: a.productName.toLowerCase().includes(cartSearch.toLowerCase()) ||
				a.sku.toLowerCase().includes(cartSearch.toLowerCase()),
	);

	return (
		<ModernModal
			isOpen={open}
			onClose={() => {
				onOpenChange(false);
				resetStudio();
			}}
			title={
				editingOrder
					? `${t("orders.editOrder") || "Edit Order"}: ${editingOrder.orderNumber || editingOrder.orderNo || `#${editingOrder.id}`}`
					: clonedOrder
						? `${t("orders.cloneOrder") || "Clone Order"}: ${clonedOrder.orderNumber || clonedOrder.orderNo || `#${clonedOrder.id}`}`
						: t("orders.posStudioTitle")
			}
			subtitle={
				editingOrder
					? t("orders.posStudioSubtitle")
					: clonedOrder
						? `Creating a new sales order cloned from #${clonedOrder.orderNumber || clonedOrder.orderNo || clonedOrder.id}. Review and customize items before saving.`
						: t("orders.posStudioSubtitle")
			}
			icon={
				clonedOrder ? (
					<Copy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				) : (
					<ShoppingCart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				)
			}
			size="full"
			glassmorphism={true}
			draggable={false}
			resizable={false}
			isLoading={saveOrderMutation.isPending}
			loadingText={editingOrder ? t("orders.saving") : t("orders.saving")}
			footer={
				<ModernModalFooter className="flex items-center justify-between w-full">
					<ModernModalCancelButton
						onClick={() => {
							onOpenChange(false);
							resetStudio();
						}}
					/>

					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleCheckout(false)}
							disabled={
								saveOrderMutation.isPending ||
								totalLineCount === 0 ||
								!canCreateOrder
							}
							className="rounded-xl text-xs h-10 px-4 border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:border-slate-700 gap-1.5"
						>
							<Save className="h-4 w-4 text-slate-600 dark:text-slate-400" />
							<span>
								{editingOrder
									? t("orders.saveDraft")
									: clonedOrder
										? "Save Cloned Order"
										: t("orders.saveDraft")}
							</span>
						</Button>

						<Button
							type="button"
							onClick={() => handleCheckout(true)}
							disabled={
								saveOrderMutation.isPending ||
								totalLineCount === 0 ||
								!canPostOrder
							}
							className="rounded-xl text-xs h-10 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold shadow-md shadow-indigo-600/25 gap-2"
						>
							<Send className="h-4 w-4" />
							<span>
								{editingOrder
									? t("orders.postAndLock")
									: clonedOrder
										? "Post Cloned Order"
										: t("orders.postAndLock")}
							</span>
						</Button>
					</div>
				</ModernModalFooter>
			}
		>
			<div className="flex flex-col h-[76vh] min-h-[580px]">
				{clonedOrder && (
					<div className="mb-2.5 px-3.5 py-2 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
						<div className="flex items-center gap-2.5">
							<div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
								<Copy className="h-3 w-3" />
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
									Cloning from Order #{clonedOrder.orderNumber || clonedOrder.orderNo || clonedOrder.id}
								</span>
								<span className="text-[11px] text-indigo-700 dark:text-indigo-300">
									— Customer, items, addons, discounts, and dispatch details copied. Saving creates a new order.
								</span>
							</div>
						</div>
						<Badge className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 font-bold shrink-0">
							New Order Template
						</Badge>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
				{/* ========================================================================= */}
				{/* LEFT SIDE: PRODUCT CATALOG & API SEARCH (6 COLUMNS)                       */}
				{/* ========================================================================= */}
				<div className="lg:col-span-6 flex flex-col space-y-2.5 border-r border-slate-200/80 dark:border-slate-800 pr-0 lg:pr-5 h-full overflow-hidden">
					{/* Top Catalog Search */}
					<div className="space-y-2 shrink-0">
						<div className="relative">
							<Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
							<Input
								placeholder={t("orders.searchCatalogPlaceholder")}
								value={productSearch}
								onChange={(e) => setProductSearch(e.target.value)}
								className="pl-9 pr-9 h-9.5 rounded-xl bg-slate-100/80 dark:bg-slate-900 text-xs border-slate-200 dark:border-slate-800"
							/>
							{productSearch && (
								<button
									onClick={() => setProductSearch("")}
									className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>

						{/* Scrollable Category Filter */}
						<div className="relative flex items-center">
							<button
								type="button"
								onClick={() => handleScrollCategories("left")}
								className="absolute -left-1 z-10 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0"
							>
								<ChevronLeft className="h-3 w-3" />
							</button>

							<div
								ref={categoryScrollRef}
								className="flex items-center gap-1.5 overflow-x-auto py-1 px-4 scrollbar-none whitespace-nowrap"
							>
								<button
									onClick={() => setSelectedCategoryId("ALL")}
									className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
										selectedCategoryId === "ALL"
											? "bg-indigo-600 text-white shadow-xs"
											: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
									}`}
								>
									{t("orders.allCategories")} ({productsList.length})
								</button>

								{categoriesData?.items?.map((cat) => {
									const isCatActive = selectedCategoryId === String(cat.id);
									return (
										<button
											key={cat.id}
											onClick={() => setSelectedCategoryId(String(cat.id))}
											className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
												isCatActive
													? "bg-indigo-600 text-white shadow-xs"
													: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
											}`}
										>
											{cat.name}
										</button>
									);
								})}
							</div>

							<button
								type="button"
								onClick={() => handleScrollCategories("right")}
								className="absolute -right-1 z-10 p-1 rounded-full bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0"
							>
								<ChevronRight className="h-3 w-3" />
							</button>
						</div>
					</div>

					{/* Product Grid */}
					<div className="flex-1 overflow-y-auto pr-1">
						{isLoadingProducts ? (
							<div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs gap-2">
								<Sparkles className="h-6 w-6 animate-pulse text-indigo-500" />
								<span>Searching catalog...</span>
							</div>
						) : productsList.length === 0 ? (
							<div className="text-center py-16 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
								No matching products found. Try adjusting your search query.
							</div>
						) : (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
								{productsList.map((prod) => {
									const hasVariants = prod.variants && prod.variants.length > 1;
									const price = prod.sellPrice || prod.basePrice || 0;

									return (
										<div
											key={prod.id}
											onClick={() => handleOpenConfigureModal(prod, "STANDARD")}
											className="group relative flex flex-col justify-between p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500/80 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
										>
											{/* Product Image */}
											<div className="relative w-full h-24 rounded-xl overflow-hidden mb-2">
												<SafeProductImage
													src={prod.imageUrl}
													alt={prod.name}
													className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
												/>

												{/* Stock Badge */}
												<div className="absolute top-1 left-1">
													<Badge
														className={`text-[8px] py-0 px-1 font-bold ${
															(prod.stockQty || 0) > 0
																? "bg-emerald-600/90 text-white"
																: "bg-rose-600/90 text-white"
														}`}
													>
														{(prod.stockQty || 0) > 0
															? `${prod.stockQty} in stock`
															: "Out of Stock"}
													</Badge>
												</div>

												{/* Variant Badge */}
												{hasVariants && prod.variants && (
													<div className="absolute top-1 right-1">
														<Badge className="bg-indigo-600/90 text-white text-[8px] py-0 px-1">
															{prod.variants.length} Variants
														</Badge>
													</div>
												)}
											</div>

											{/* Info & Price */}
											<div className="space-y-1">
												<div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 transition-colors">
													{prod.name}
												</div>
												<div className="text-[10px] font-mono text-slate-400 line-clamp-1">
													{prod.baseSku || prod.model || `SKU-${prod.id}`}
												</div>

												<div className="pt-1 flex items-center justify-between gap-1">
													<span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
														$
														{price.toLocaleString(undefined, {
															minimumFractionDigits: 2,
														})}
													</span>

													<div className="flex items-center gap-1">
														{/* Quick Add as Add-on button */}
														<Button
															type="button"
															size="icon"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenConfigureModal(prod, "ADDON");
															}}
															className="h-6 w-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 shadow-2xs"
															title="Add as complimentary gift ($0.00)"
														>
															<Gift className="h-3 w-3" />
														</Button>

														{/* Standard Add to Cart button */}
														<Button
															type="button"
															size="icon"
															onClick={(e) => {
																e.stopPropagation();
																handleOpenConfigureModal(prod, "STANDARD");
															}}
															className="h-6 w-6 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs"
															title="Configure & add item"
														>
															<Plus className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				{/* ========================================================================= */}
				{/* RIGHT SIDE: SELECTED PRODUCTS LIST & CHECKOUT (6 COLUMNS - PRIORITY)     */}
				{/* ========================================================================= */}
				<div className="lg:col-span-6 flex flex-col h-full overflow-hidden bg-slate-50/70 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
					{/* Top Compact Customer & Delivery Bar (High Density) */}
					<div className="shrink-0 space-y-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<ModernSelect
								label={`${t("orders.customer")} *`}
								options={customerOptions}
								value={customerId}
								onChange={setCustomerId}
								placeholder={t("orders.selectCustomer")}
								searchable={true}
								clearable={true}
								selectSize="sm"
								leftIcon={<User className="h-3.5 w-3.5 text-indigo-500" />}
							/>

							<div className="flex items-end gap-1.5">
								<div className="flex-1">
									<ModernSelect
										label={t("orders.paymentTerm") || "Payment Term"}
										options={paymentTermOptions}
										value={paymentTermId}
										onChange={setPaymentTermId}
										placeholder="Select payment term..."
										searchable={true}
										clearable={true}
										selectSize="sm"
										leftIcon={<Clock className="h-3.5 w-3.5 text-indigo-500" />}
									/>
								</div>

								{/* Delivery Accordion Button */}
								<button
									type="button"
									onClick={() => setIsDeliveryAddressOpen((prev) => !prev)}
									className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 mb-0.5 ${
										deliveryId || shippingCustomerAddress
											? "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/40"
											: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
									}`}
									title="Delivery & Destination Address"
								>
									<Truck className="h-3.5 w-3.5 text-purple-500" />
									<span className="hidden xl:inline">
										{t("orders.shippingAddress")}
									</span>
									{isDeliveryAddressOpen ? (
										<ChevronUp className="h-3 w-3" />
									) : (
										<ChevronDown className="h-3 w-3" />
									)}
								</button>
							</div>
						</div>

						{/* Payment Term Active Notice / Early Cash Discount */}
						{selectedPaymentTerm && (
							<div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 animate-in fade-in-50 duration-150">
								<div className="flex items-center gap-1.5 truncate">
									<Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
									<span className="font-semibold truncate">{selectedPaymentTerm.name}:</span>
									<span>
										{selectedPaymentTerm.dueDays === 0
											? "Immediate / Cash on Delivery (COD)"
											: `Payment due in ${selectedPaymentTerm.dueDays} days`}
									</span>
								</div>
								{selectedPaymentTerm.discountDays && selectedPaymentTerm.discountDays > 0 && selectedPaymentTerm.discountPercentage && (
									<Badge className="bg-emerald-600 text-white text-[9px] py-0 px-1.5 font-semibold shrink-0">
										⚡ {selectedPaymentTerm.discountPercentage}% off in {selectedPaymentTerm.discountDays}d
									</Badge>
								)}
							</div>
						)}

						{/* Expandable Delivery & Address Panel */}
						{isDeliveryAddressOpen && (
							<div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in-50 duration-150">
								<ModernSelect
									label={t("orders.selectDelivery")}
									options={deliveryOptions}
									value={deliveryId}
									onChange={setDeliveryId}
									placeholder={t("orders.selectDelivery")}
									searchable={true}
									clearable={true}
									selectSize="sm"
									leftIcon={<Truck className="h-3.5 w-3.5 text-purple-500" />}
								/>

								<ModernSelect
									label={t("orders.selectWarehouse")}
									options={warehouseOptions}
									value={warehouseId}
									onChange={setWarehouseId}
									placeholder={t("orders.selectWarehouse")}
									searchable={true}
									clearable={true}
									selectSize="sm"
									leftIcon={
										<Building2 className="h-3.5 w-3.5 text-slate-500" />
									}
								/>

								<ModernInput
									label={t("orders.shippingAddress")}
									value={shippingCustomerAddress}
									onChange={(e) => setShippingCustomerAddress(e.target.value)}
									placeholder="e.g. Phnom Penh, Kandal"
									inputSize="sm"
									leftIcon={<MapPin className="h-3.5 w-3.5 text-rose-500" />}
								/>

								<ModernInput
									label={t("orders.houseStreetInfo")}
									value={shippingHomeInfo}
									onChange={(e) => setShippingHomeInfo(e.target.value)}
									placeholder="e.g. St 351, Borey Peng Huoth"
									inputSize="sm"
									leftIcon={<Home className="h-3.5 w-3.5 text-amber-500" />}
								/>
							</div>
						)}
					</div>

					{/* Cart Header & Priority Segmented Tabs */}
					<div className="shrink-0 flex items-center justify-between gap-2 pt-0.5">
						<div className="flex items-center gap-1 p-0.5 bg-slate-200/80 dark:bg-slate-900 rounded-xl">
							<button
								type="button"
								onClick={() => setCartTab("ITEMS")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									cartTab === "ITEMS"
										? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								<ShoppingCart className="h-3.5 w-3.5" />
								<span>
									{t("orders.standardOrderItems")} ({cartItems.length})
								</span>
							</button>

							<button
								type="button"
								onClick={() => setCartTab("ADDONS")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									cartTab === "ADDONS"
										? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								<Gift className="h-3.5 w-3.5 text-purple-500" />
								<span>
									{t("orders.complimentaryAddons")} ({addonItems.length})
								</span>
							</button>

							<button
								type="button"
								onClick={() => setCartTab("ALL")}
								className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
									cartTab === "ALL"
										? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								<Layers className="h-3.5 w-3.5" />
								<span>
									{t("orders.allOrders")} ({totalLineCount})
								</span>
							</button>
						</div>

						<div className="flex items-center gap-1">
							{totalLineCount > 3 && (
								<div className="relative w-32 hidden sm:block">
									<Input
										placeholder="Filter..."
										value={cartSearch}
										onChange={(e) => setCartSearch(e.target.value)}
										className="h-7 text-[11px] rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 pl-2 pr-6"
									/>
									{cartSearch && (
										<button
											onClick={() => setCartSearch("")}
											className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
							)}

							{totalLineCount > 0 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										setCartItems([]);
										setAddonItems([]);
									}}
									className="h-7 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 rounded-lg"
								>
									{t("orders.clearAll")}
								</Button>
							)}
						</div>
					</div>

					{/* ========================================================================= */}
					{/* PRIMARY FOCUS: SELECTED PRODUCTS & ADDONS LIST (MAX HEIGHT & EXPANDED)    */}
					{/* ========================================================================= */}
					<div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
						{totalLineCount === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl gap-2 h-full">
								<ShoppingCart className="h-10 w-10 text-slate-300 dark:text-slate-700" />
								<div className="font-semibold text-slate-600 dark:text-slate-300">
									{t("orders.orderListEmpty")}
								</div>
								<div className="text-[11px] max-w-xs text-slate-400">
									{t("orders.orderListEmptyDesc")}
								</div>
							</div>
						) : (
							<>
								{/* 1. Standard Order Items Section */}
								{(cartTab === "ITEMS" || cartTab === "ALL") && (
									<div className="space-y-2">
										{cartTab === "ALL" && (
											<div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1 pt-1">
												<ShoppingCart className="h-3 w-3" />{" "}
												{t("orders.standardOrderItems")} ({cartItems.length})
											</div>
										)}

										{filteredCartItems.length === 0 && cartTab === "ITEMS" && (
											<div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-xl">
												No standard items match your filter.
											</div>
										)}

										{filteredCartItems.map((item) => {
											const qty = Number(item.quantity) || 0;
											const price = Number(item.unitPrice) || 0;
											const disc = Number(item.discount) || 0;
											const lineUnitPrice =
												item.discountType === "PERCENTAGE"
													? price * (1 - disc / 100)
													: price - disc;
											const lineTotal = Math.max(0, lineUnitPrice) * qty;

											return (
												<div
													key={item.cartId}
													className="p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-700 transition-all space-y-2"
												>
													{/* Item Top Row */}
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-2.5 min-w-0">
															<div className="h-9 w-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
																<SafeProductImage
																	src={item.imageUrl}
																	alt={item.productName}
																	className="w-full h-full object-cover"
																/>
															</div>
															<div className="min-w-0">
																<div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
																	{item.productName}
																</div>
																<div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
																	<Badge
																		variant="outline"
																		className="text-[9px] py-0 px-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono font-bold text-indigo-600 dark:text-indigo-400"
																	>
																		{item.unitName}
																	</Badge>
																	<span>•</span>
																	<span>
																		Unit Price:{" "}
																		<strong className="text-slate-700 dark:text-slate-200 font-mono">
																			${price.toFixed(2)}
																		</strong>
																	</span>
																	{item.sku && (
																		<>
																			<span>•</span>
																			<span className="truncate">
																				{item.sku}
																			</span>
																		</>
																	)}
																</div>
															</div>
														</div>

														{/* Item Actions */}
														<div className="flex items-center gap-1 shrink-0">
															{/* Re-configure Item */}
															<button
																type="button"
																onClick={() => {
																	const prod = productsList.find(
																		(p) =>
																			String(p.id) === String(item.productId),
																	) || {
																		id: item.productId,
																		name: item.productName,
																		sellPrice: item.unitPrice,
																		basePrice: item.unitPrice,
																		imageUrl: item.imageUrl,
																		baseSku: item.sku,
																	};
																	handleOpenConfigureModal(
																		prod as Product,
																		"STANDARD",
																		item,
																	);
																}}
																className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950"
																title="Re-configure variant or unit of measure"
															>
																<Edit3 className="h-3.5 w-3.5" />
															</button>

															{/* Move to Add-On */}
															<button
																type="button"
																onClick={() =>
																	handleConvertItemToAddon(item.cartId)
																}
																className="text-slate-400 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950"
																title="Convert to complimentary Add-On item ($0.00)"
															>
																<Gift className="h-3.5 w-3.5" />
															</button>

															{/* Remove Item */}
															<button
																type="button"
																onClick={() =>
																	handleRemoveCartItem(item.cartId)
																}
																className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
																title="Remove item from order"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</button>
														</div>
													</div>

													{/* Controls Row: Stepper, Line Discount, Line Subtotal */}
													<div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
														{/* Quantity Stepper */}
														<div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
															<button
																type="button"
																onClick={() =>
																	handleUpdateCartQuantity(item.cartId, -1)
																}
																className="h-7 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 dark:text-slate-300"
															>
																<Minus className="h-3 w-3" />
															</button>
															<input
																type="number"
																min="1"
																value={item.quantity}
																onChange={(e) =>
																	handleSetCartQuantity(
																		item.cartId,
																		Number(e.target.value),
																	)
																}
																className="h-7 w-10 text-center font-mono font-bold text-xs bg-transparent outline-none border-x border-slate-200 dark:border-slate-700"
															/>
															<button
																type="button"
																onClick={() =>
																	handleUpdateCartQuantity(item.cartId, 1)
																}
																className="h-7 w-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 dark:text-slate-300"
															>
																<Plus className="h-3 w-3" />
															</button>
														</div>

														{/* Line Discount Controls */}
														<div className="flex items-center gap-1 text-xs">
															<span className="text-[10px] text-slate-400 font-medium">
																Disc:
															</span>
															<input
																type="number"
																step="0.01"
																min="0"
																value={item.discount}
																onChange={(e) =>
																	handleUpdateCartLineDiscount(
																		item.cartId,
																		Number(e.target.value),
																		item.discountType,
																	)
																}
																placeholder="0"
																className="h-7 w-12 px-1 text-center font-mono text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 outline-none"
															/>
															<button
																type="button"
																onClick={() =>
																	handleUpdateCartLineDiscount(
																		item.cartId,
																		item.discount,
																		item.discountType === "FLAT"
																			? "PERCENTAGE"
																			: "FLAT",
																	)
																}
																className="h-7 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-300"
																title="Toggle discount type ($ / %)"
															>
																{item.discountType === "PERCENTAGE" ? "%" : "$"}
															</button>
														</div>

														{/* Calculated Line Subtotal */}
														<div className="text-right">
															<span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
																$
																{lineTotal.toLocaleString(undefined, {
																	minimumFractionDigits: 2,
																})}
															</span>
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}

								{/* 2. Add-Ons Line Items Section */}
								{(cartTab === "ADDONS" || cartTab === "ALL") && (
									<div className="space-y-2">
										{cartTab === "ALL" && (
											<div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1 pt-2">
												<Gift className="h-3 w-3" /> Complimentary Add-Ons &
												Gifts ({addonItems.length})
											</div>
										)}

										{filteredAddonItems.length === 0 &&
											cartTab === "ADDONS" && (
												<div className="text-center py-10 text-slate-400 text-xs border border-dashed rounded-xl space-y-1">
													<Gift className="h-5 w-5 text-purple-400 mx-auto opacity-70" />
													<div>No complimentary add-ons match your filter.</div>
												</div>
											)}

										{filteredAddonItems.map((addon) => {
											const qty = Number(addon.quantity) || 0;
											const price = Number(addon.unitPrice) || 0;
											const lineTotal = price * qty;

											return (
												<div
													key={addon.addonId}
													className="p-2.5 rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2 shadow-2xs"
												>
													{/* Addon Top Row */}
													<div className="flex items-center justify-between gap-2">
														<div className="flex items-center gap-2.5 min-w-0">
															<div className="h-9 w-9 rounded-xl overflow-hidden shrink-0 border border-purple-200 dark:border-purple-800">
																<SafeProductImage
																	src={addon.imageUrl}
																	alt={addon.productName}
																	className="w-full h-full object-cover"
																/>
															</div>
															<div className="min-w-0">
																<div className="font-bold text-xs text-purple-950 dark:text-purple-200 truncate flex items-center gap-1.5">
																	<span>{addon.productName}</span>
																	<Badge className="bg-purple-600 text-white text-[8px] py-0 px-1 font-bold">
																		ADD-ON
																	</Badge>
																</div>
																<div className="text-[10px] text-purple-600/80 dark:text-purple-400 font-mono mt-0.5">
																	Unit: <strong>{addon.unitName}</strong> •{" "}
																	{price === 0
																		? "FREE GIFT ($0.00)"
																		: `$${price.toFixed(2)}`}
																</div>
															</div>
														</div>

														<div className="flex items-center gap-1 shrink-0">
															{/* Move to Regular Items */}
															<button
																type="button"
																onClick={() =>
																	handleConvertAddonToItem(addon.addonId)
																}
																className="text-purple-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950"
																title="Convert to standard paid order item"
															>
																<ShoppingCart className="h-3.5 w-3.5" />
															</button>

															{/* Remove Addon */}
															<button
																type="button"
																onClick={() =>
																	handleRemoveAddonItem(addon.addonId)
																}
																className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950"
																title="Remove add-on"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</button>
														</div>
													</div>

													{/* Stepper & Price */}
													<div className="pt-1.5 border-t border-purple-100 dark:border-purple-900/50 flex items-center justify-between gap-2">
														{/* Quantity Stepper */}
														<div className="flex items-center border border-purple-200 dark:border-purple-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
															<button
																type="button"
																onClick={() =>
																	handleUpdateAddonQuantity(addon.addonId, -1)
																}
																className="h-7 w-6 flex items-center justify-center text-purple-700 hover:bg-purple-100 dark:text-purple-300"
															>
																<Minus className="h-3 w-3" />
															</button>
															<input
																type="number"
																min="1"
																value={addon.quantity}
																onChange={(e) =>
																	handleSetAddonQuantity(
																		addon.addonId,
																		Number(e.target.value),
																	)
																}
																className="h-7 w-10 text-center font-mono font-bold text-xs bg-transparent outline-none border-x border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
															/>
															<button
																type="button"
																onClick={() =>
																	handleUpdateAddonQuantity(addon.addonId, 1)
																}
																className="h-7 w-6 flex items-center justify-center text-purple-700 hover:bg-purple-100 dark:text-purple-300"
															>
																<Plus className="h-3 w-3" />
															</button>
														</div>

														{/* Addon Price Field */}
														<div className="flex items-center gap-1 text-xs">
															<span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
																Price:
															</span>
															<div className="relative flex items-center">
																<span className="absolute left-2 text-[10px] text-slate-400 pointer-events-none font-bold">
																	$
																</span>
																<input
																	type="number"
																	step="0.01"
																	min="0"
																	value={addon.unitPrice}
																	onChange={(e) =>
																		handleUpdateAddonPrice(
																			addon.addonId,
																			Number(e.target.value),
																		)
																	}
																	placeholder="0.00"
																	className="h-7 w-20 pl-4.5 pr-1.5 text-right font-mono text-xs rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-purple-500"
																/>
															</div>
														</div>

														{/* Line Total */}
														<div className="text-right font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
															{lineTotal === 0
																? "FREE"
																: `$${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</>
						)}
					</div>

					{/* ========================================================================= */}
					{/* BOTTOM DOCK: FINANCIAL SUMMARY & EXPANDABLE CHARGES (COMPACT & SLEEK)     */}
					{/* ========================================================================= */}
					<div className="shrink-0 space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 rounded-xl border shadow-xs">
						{/* Subtotal & Discount Row */}
						<div className="flex items-center justify-between text-xs">
							<div className="flex items-center gap-2">
								<span className="text-slate-600 dark:text-slate-400">
									{t("orders.subtotal")} ({totalLineCount} {t("orders.items")}):
								</span>
								<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
									$
									{subtotal.toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</span>
							</div>

							{/* Order Discount Controls */}
							<div className="flex items-center gap-1">
								<span className="text-[11px] text-slate-500 font-medium">
									{t("orders.orderDiscount")}:
								</span>
								<input
									type="number"
									step="0.01"
									min="0"
									value={discount}
									onChange={(e) => setDiscount(Number(e.target.value))}
									placeholder="0"
									className="h-7 w-16 px-1 text-center font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
								/>
								<button
									type="button"
									onClick={() =>
										setDiscountType((prev) =>
											prev === "FLAT" ? "PERCENTAGE" : "FLAT",
										)
									}
									className="h-7 px-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 hover:bg-slate-300"
									title="Toggle discount type ($ / %)"
								>
									{discountType === "PERCENTAGE" ? "%" : "$"}
								</button>
							</div>
						</div>

						{/* Extra Charges Toggle Button */}
						<div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
							<button
								type="button"
								onClick={() => setIsExtraChargesOpen((prev) => !prev)}
								className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
							>
								<Receipt className="h-3 w-3" />
								<span>
									{t("orders.shippingFee")}, {t("orders.taxVat")} &{" "}
									{t("orders.customerNotes")}
								</span>
								{shippingAmount > 0 ||
								taxAmount > 0 ||
								customerNote ||
								internalNote ? (
									<Badge
										variant="outline"
										className="text-[9px] py-0 px-1 bg-indigo-50 text-indigo-700 border-indigo-200"
									>
										+Attached
									</Badge>
								) : null}
								{isExtraChargesOpen ? (
									<ChevronUp className="h-3 w-3" />
								) : (
									<ChevronDown className="h-3 w-3" />
								)}
							</button>

							<div className="flex items-center gap-2">
								<span className="text-slate-500">
									{t("orders.totalPayable")}:
								</span>
								<span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
									$
									{grandTotal.toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</span>
							</div>
						</div>

						{/* Expandable Extra Charges & Notes Panel */}
						{isExtraChargesOpen && (
							<div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in-50 duration-150 text-xs">
								<div className="space-y-1">
									<label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
										<Truck className="h-3 w-3 text-purple-500" />{" "}
										{t("orders.shippingFee")} ($)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={shippingAmount}
										onChange={(e) => setShippingAmount(Number(e.target.value))}
										className="w-full h-7 px-2 font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
									/>
								</div>

								<div className="space-y-1">
									<label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
										<Receipt className="h-3 w-3 text-emerald-500" />{" "}
										{t("orders.taxVat")} ($)
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										value={taxAmount}
										onChange={(e) => setTaxAmount(Number(e.target.value))}
										className="w-full h-7 px-2 font-mono text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
									/>
								</div>

								<div className="space-y-1 sm:col-span-2">
									<label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
										<FileText className="h-3 w-3 text-indigo-500" />{" "}
										{t("orders.customerNotes")}
									</label>
									<input
										type="text"
										value={customerNote}
										onChange={(e) => setCustomerNote(e.target.value)}
										placeholder="e.g. Call before delivery"
										className="w-full h-7 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>

			{/* Product Variant & Unit Configurator Modal */}
			{configProduct && (
				<ModernModal
					isOpen={Boolean(configProduct)}
					onClose={() => {
						setConfigProduct(null);
						setEditingCartId(null);
					}}
					title={
						editingCartId
							? `${t("products.editProductTitle")}: ${configProduct.name}`
							: `${t("orders.configureItem")}: ${configProduct.name}`
					}
					subtitle={t("products.mapUnitModalSubtitle")}
					icon={
						<Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					}
					size="md"
					glassmorphism={true}
					draggable={true}
					footer={
						<ModernModalFooter className="flex flex-wrap sm:flex-nowrap items-center justify-between w-full gap-2 px-1">
							<ModernModalCancelButton
								onClick={() => {
									setConfigProduct(null);
									setEditingCartId(null);
								}}
								className="mr-auto shrink-0 min-w-[90px] h-10 px-3.5"
							/>

							<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
								{configMode === "STANDARD" ? (
									<>
										<Button
											type="button"
											variant="outline"
											onClick={() => handleConfirmConfigAdd("ADDON")}
											className="rounded-xl text-xs h-10 px-3 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 font-semibold gap-1.5"
										>
											<Gift className="h-4 w-4" />{" "}
											{t("orders.complimentaryAddon")} ($0.00)
										</Button>

										<Button
											type="button"
											onClick={() => handleConfirmConfigAdd("STANDARD")}
											className="rounded-xl text-xs h-10 px-4 min-w-[130px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 gap-1.5 inline-flex items-center justify-center"
										>
											{editingCartId ? (
												<Check className="h-4 w-4" />
											) : (
												<Plus className="h-4 w-4" />
											)}
											<span>
												{editingCartId
													? t("common.save")
													: t("orders.createOrder")}{" "}
												($
												{(
													(Number(configPrice) || 0) *
													(Number(configQuantity) || 1)
												).toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
												)
											</span>
										</Button>
									</>
								) : (
									<>
										<Button
											type="button"
											variant="outline"
											onClick={() => handleConfirmConfigAdd("STANDARD")}
											className="rounded-xl text-xs h-10 px-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold gap-1.5"
										>
											<ShoppingCart className="h-4 w-4" />{" "}
											{t("orders.standardItem")}
										</Button>

										<Button
											type="button"
											onClick={() => handleConfirmConfigAdd("ADDON")}
											className="rounded-xl text-xs h-10 px-4 min-w-[130px] bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20 gap-1.5 inline-flex items-center justify-center"
										>
											<Gift className="h-4 w-4" />
											<span>{t("orders.complimentaryAddon")} ($0.00)</span>
										</Button>
									</>
								)}
							</div>
						</ModernModalFooter>
					}
				>
					<div className="space-y-3.5">
						{/* Product Summary Showcase Card */}
						<div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-slate-50/80 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-800">
							<div className="h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
								<SafeProductImage
									src={
										activeSelectedVariant?.thumbnail ||
										configProduct.imageUrl
									}
									alt={activeSelectedVariant?.name || configProduct.name}
									className="w-full h-full object-cover"
								/>
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
										{activeSelectedVariant?.name
											? `${configProduct.name} (${activeSelectedVariant.name})`
											: configProduct.name}
									</h4>
									<Badge
										className={`text-[8px] py-0 px-1.5 font-bold shrink-0 ${
											((activeSelectedVariant?.stockQty ??
												activeSelectedVariant?.inventory?.availableQty ??
												configProduct.stockQty) || 0) > 0
												? "bg-emerald-600/90 text-white"
												: "bg-rose-600/90 text-white"
										}`}
									>
										{((activeSelectedVariant?.stockQty ??
											activeSelectedVariant?.inventory?.availableQty ??
											configProduct.stockQty) || 0) > 0
											? `${activeSelectedVariant?.stockQty ?? activeSelectedVariant?.inventory?.availableQty ?? configProduct.stockQty} in stock`
											: "Out of Stock"}
									</Badge>
								</div>

								<div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
									<span>
										SKU:{" "}
										<strong className="text-slate-600 dark:text-slate-300">
											{activeSelectedVariant?.sku ||
												configProduct.baseSku ||
												configProduct.model ||
												`SKU-${configProduct.id}`}
										</strong>
									</span>
									{configProduct.category?.name && (
										<>
											<span>•</span>
											<span className="text-indigo-600 dark:text-indigo-400 font-sans font-semibold">
												{configProduct.category.name}
											</span>
										</>
									)}
								</div>
							</div>

							<div className="text-right shrink-0">
								<span className="text-[9px] text-slate-400 font-medium block">
									{t("products.sellingPrice")}
								</span>
								<span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
									$
									{(Number(configPrice) || 0).toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</span>
							</div>
						</div>

						{/* Mode Switcher Tabs */}
						<div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
							<button
								type="button"
								onClick={() => setConfigMode("STANDARD")}
								className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
									configMode === "STANDARD"
										? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-900"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								<ShoppingCart className="h-3.5 w-3.5" />
								<span>{t("orders.standardItem")}</span>
								<Badge
									variant="secondary"
									className="text-[9px] py-0 px-1 font-mono"
								>
									${(Number(configPrice) || 0).toFixed(2)}
								</Badge>
							</button>

							<button
								type="button"
								onClick={() => setConfigMode("ADDON")}
								className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
									configMode === "ADDON"
										? "bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs ring-1 ring-purple-200 dark:ring-purple-900"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
								}`}
							>
								<Gift className="h-3.5 w-3.5 text-purple-500" />
								<span>{t("orders.complimentaryAddon")}</span>
								<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[9px] py-0 px-1 font-bold">
									FREE ($0)
								</Badge>
							</button>
						</div>

						{/* Variant Selector */}
						{((effectiveConfigProduct || configProduct).variants || []).length >
							0 && (
							<ModernSelect
								label={`${t("orders.selectVariant")} *`}
								options={(
									(effectiveConfigProduct || configProduct).variants || []
								).map((v: any) => {
									const varName =
										v.name || v.variantName || v.sku || "Default Variant";
									const varPrice =
										v.sellPrice !== undefined && v.sellPrice !== null
											? v.sellPrice
											: v.price !== undefined && v.price !== null
												? v.price
												: v.finalPrice !== undefined &&
														v.finalPrice !== null
													? v.finalPrice
													: v.unitPrice !== undefined &&
															v.unitPrice !== null
														? v.unitPrice
														: v.basePrice !== undefined &&
																v.basePrice !== null
															? v.basePrice
															: 0;
									return {
										value: String(v.id || v.variantId),
										label: `${varName} — $${Number(varPrice).toFixed(2)}`,
										description: `SKU: ${v.sku || "—"} | Price: $${Number(varPrice).toFixed(2)} | Stock: ${v.stockQty ?? v.inventory?.availableQty ?? "—"}`,
									};
								})}
								value={configVariantId}
								onChange={handleVariantChange}
								selectSize="sm"
							/>
						)}

						{/* Unit Selector */}
						<ModernSelect
							label={`${t("orders.selectUnit")} *`}
							options={unitSelectOptions}
							value={configUnitId}
							onChange={handleUnitChange}
							selectSize="sm"
						/>

						{/* Price & Quantity Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{configMode === "STANDARD" ? (
								<div className="space-y-1">
									<ModernInput
										type="number"
										label={`${t("products.sellingPrice")} ($)`}
										value={configPrice}
										disabled={true}
										leftIcon={
											<DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
										}
										inputSize="sm"
										className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-not-allowed"
									/>
									<span className="text-[10px] text-slate-400 font-medium">
										Real-time sync from variant & unit
									</span>
								</div>
							) : (
								<div className="space-y-1">
									<ModernInput
										type="number"
										step="0.01"
										min="0"
										label={`${t("products.sellingPrice")} ($)`}
										value={configAddonPrice}
										onChange={(e) =>
											setConfigAddonPrice(Number(e.target.value))
										}
										leftIcon={<Gift className="h-3.5 w-3.5 text-purple-500" />}
										inputSize="sm"
										className="font-mono font-bold"
									/>
									<span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
										Default: $0.00 (Free Gift)
									</span>
								</div>
							)}

							<div className="space-y-1">
								<label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
									{t("products.stockQuantity")}
								</label>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() =>
											setConfigQuantity((prev) => Math.max(1, prev - 1))
										}
										className="h-9 w-9 rounded-xl shrink-0"
									>
										<Minus className="h-3.5 w-3.5" />
									</Button>

									<input
										type="number"
										min="1"
										value={configQuantity}
										onChange={(e) =>
											setConfigQuantity(Math.max(1, Number(e.target.value)))
										}
										className="h-9 flex-1 rounded-xl text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
									/>

									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => setConfigQuantity((prev) => prev + 1)}
										className="h-9 w-9 rounded-xl shrink-0"
									>
										<Plus className="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						</div>

						{/* Live Line Total Calculation Banner */}
						<div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-100/90 to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/30 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
							<div className="text-xs text-slate-600 dark:text-slate-400">
								<span>{t("orders.subtotal")}: </span>
								<strong className="font-mono text-slate-900 dark:text-slate-100">
									{configQuantity} ×{" "}
									{configMode === "STANDARD"
										? `$${(Number(configPrice) || 0).toFixed(2)}`
										: Number(configAddonPrice) === 0
											? "FREE"
											: `$${(Number(configAddonPrice) || 0).toFixed(2)}`}
								</strong>
							</div>

							<div className="text-right">
								<span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
									{configMode === "STANDARD"
										? `$${((Number(configPrice) || 0) * (Number(configQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
										: Number(configAddonPrice) === 0
											? "FREE ($0.00)"
											: `$${((Number(configAddonPrice) || 0) * (Number(configQuantity) || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
								</span>
							</div>
						</div>
					</div>
				</ModernModal>
			)}
		</ModernModal>
	);
}

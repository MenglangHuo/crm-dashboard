"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalSubmitButton,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Unit,
	ProductAddUnitsInput,
	ProductUnitItemInput,
	VariantUnitPriceInput,
	DiscountType,
} from "@/lib/types";
import {
	calculateUnitListPrice,
	calculateUnitDiscount,
	calculateUnitFinalPrice,
	normalizeDiscountType,
	normalizeUnitPricingForApi,
} from "@/lib/product-unit-pricing";
import { useTranslation } from "@/lib/i18n/context";
import {
	Layers,
	ArrowRight,
	Calculator,
	Percent,
	Copy,
	Tag,
	Sparkles,
	Boxes,
	RotateCcw,
	SlidersHorizontal,
	Trash2,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface MapProductUnitModalProps {
	isOpen: boolean;
	onClose: () => void;
	product: any;
	availableUnits: Unit[];
	existingMappedUnits?: any[];
	initialUnit?: any | null;
	onSave: (payload: ProductAddUnitsInput) => Promise<void> | void;
	onDelete?: (unitId: string | number) => Promise<void> | void;
	isLoading?: boolean;
	isDeleting?: boolean;
}

const QUICK_DISCOUNT_PERCENT_PRESETS = [5, 10, 15, 20];

export function MapProductUnitModal({
	isOpen,
	onClose,
	product,
	availableUnits = [],
	existingMappedUnits = [],
	initialUnit = null,
	onSave,
	onDelete,
	isLoading = false,
	isDeleting = false,
}: MapProductUnitModalProps) {
	const { t } = useTranslation();
	// 1. Target Unit to map (unitId)
	const [unitId, setUnitId] = useState<string>("");

	// 2. Reference / Base Unit (baseUnitId)
	const [baseUnitId, setBaseUnitId] = useState<string>("");

	// 3. Multiplier Quantity (baseQuantity)
	const [baseQuantity, setBaseQuantity] = useState<string>("1");

	// 4. Mapped Unit Price ($)
	const [unitPrice, setUnitPrice] = useState<string>("0");

	// 5. Discount ($ or %)
	const [discount, setDiscount] = useState<string>("0");
	const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");

	// 6. Sellable & isBase (Disabled in UI per requirements)
	const [sellable, setSellable] = useState<boolean>(true);
	const [isBase, setIsBase] = useState<boolean>(false);

	// 7. Same Price across variants or custom per variant
	const [isSamePrice, setIsSamePrice] = useState<boolean>(true);

	// 8. Variant specific pricing state
	const [variantPrices, setVariantPrices] = useState<
		Record<
			string | number,
			{ unitPrice: string; discount: string; discountType: DiscountType }
		>
	>({});

	// Quick discount % helper input state
	const [quickDiscountPercent, setQuickDiscountPercent] = useState<string>("");

	// Product variants list
	const productVariants = useMemo(() => {
		return (
			product?.variants || product?.productVariants || product?.items || []
		);
	}, [product?.variants, product?.productVariants, product?.items]);

	// Primary base unit finder
	const primaryBaseUnit = useMemo(() => {
		const fromMapped = existingMappedUnits.find((u: any) => u.isBase);
		if (fromMapped) return fromMapped;
		const fromProductUnits = product?.units?.find((u: any) => u.isBase);
		if (fromProductUnits) return fromProductUnits;
		if (existingMappedUnits.length > 0) return existingMappedUnits[0];
		if (product?.units?.length > 0) return product.units[0];
		return null;
	}, [existingMappedUnits, product?.units]);

	// Initialize or reset form state when modal opens or initialUnit changes
	useEffect(() => {
		if (!isOpen) return;

		if (initialUnit) {
			// Edit Mode
			const uId = String(initialUnit.unitId || initialUnit.id || "");
			const bId =
				initialUnit.baseUnitId !== undefined && initialUnit.baseUnitId !== null
					? String(initialUnit.baseUnitId)
					: primaryBaseUnit
						? String(primaryBaseUnit.unitId || primaryBaseUnit.id || "")
						: "";

			setUnitId(uId);
			setBaseUnitId(bId);
			setBaseQuantity(
				String(initialUnit.baseQuantity || initialUnit.conversionFactor || 1),
			);
			const initSellingPrice = parseFloat(
				String(
					initialUnit.finalPrice ??
						initialUnit.unitPrice ??
						initialUnit.price ??
						initialUnit.sellPrice ??
						0,
				),
			) || 0;
			const initDiscount = parseFloat(
				String(
					initialUnit.discount !== undefined && initialUnit.discount !== null
						? initialUnit.discount
						: "0",
				),
			) || 0;
			const initDiscountType = normalizeDiscountType(initialUnit.discountType);

			setUnitPrice(String(initSellingPrice));
			setDiscount(String(initDiscount));
			setDiscountType(initDiscountType);
			setSellable(
				initialUnit.sellable !== undefined ? !!initialUnit.sellable : true,
			);
			setIsBase(!!initialUnit.isBase);

			const hasVariantPrices =
				initialUnit.isSamePrice === false ||
				(initialUnit.variantPrices && initialUnit.variantPrices.length > 0);
			setIsSamePrice(!hasVariantPrices);

			const initialVMap: Record<
				string | number,
				{ unitPrice: string; discount: string; discountType: DiscountType }
			> = {};
			if (productVariants.length > 0) {
				productVariants.forEach((v: any) => {
					const matchedVp = initialUnit.variantPrices?.find(
						(vp: any) => Number(vp.variantId) === Number(v.id),
					);
					if (matchedVp) {
						const vpSelling = parseFloat(
							String(
								matchedVp.finalPrice ??
									matchedVp.unitPrice ??
									matchedVp.price ??
									0,
							),
						) || 0;
						const vpDisc = parseFloat(String(matchedVp.discount ?? 0)) || 0;
						const vpType = normalizeDiscountType(
							matchedVp.discountType || initialUnit.discountType,
						);

						initialVMap[v.id] = {
							unitPrice: String(vpSelling),
							discount: String(vpDisc),
							discountType: vpType,
						};
					} else {
						initialVMap[v.id] = {
							unitPrice: String(initSellingPrice),
							discount: String(initDiscount),
							discountType: initDiscountType,
						};
					}
				});
			}
			setVariantPrices(initialVMap);
		} else {
			// Create Mode
			const mappedIds = new Set(
				existingMappedUnits.map((u: any) => String(u.unitId || u.id)),
			);
			const availableUnmapped = availableUnits.filter(
				(u) => !mappedIds.has(String(u.id)),
			);
			const defaultUnitId =
				availableUnmapped.length > 0
					? String(availableUnmapped[0].id)
					: availableUnits[0]?.id
						? String(availableUnits[0].id)
						: "";

			const defaultBaseId = primaryBaseUnit
				? String(primaryBaseUnit.unitId || primaryBaseUnit.id || "")
				: availableUnits[0]?.id
					? String(availableUnits[0].id)
					: "";

			const basePriceVal = primaryBaseUnit
				? (primaryBaseUnit.unitPrice ??
					primaryBaseUnit.sellPrice ??
					primaryBaseUnit.finalPrice ??
					primaryBaseUnit.price ??
					product?.sellPrice ??
					product?.price ??
					"0")
				: (product?.sellPrice ?? product?.price ?? "0");

			setUnitId(defaultUnitId);
			setBaseUnitId(defaultBaseId);
			setBaseQuantity("1");
			setUnitPrice(String(basePriceVal));
			setDiscount("0");
			setDiscountType("PERCENTAGE");
			setSellable(true);
			setIsBase(false);
			setIsSamePrice(true);

			const initialVMap: Record<
				string | number,
				{ unitPrice: string; discount: string; discountType: DiscountType }
			> = {};
			if (productVariants.length > 0) {
				productVariants.forEach((v: any) => {
					initialVMap[v.id] = {
						unitPrice: String(v.price ?? basePriceVal),
						discount: "0",
						discountType: "PERCENTAGE",
					};
				});
			}
			setVariantPrices(initialVMap);
		}
	}, [
		isOpen,
		initialUnit,
		product,
		availableUnits,
		existingMappedUnits,
		primaryBaseUnit,
		productVariants,
	]);

	// Resolve target and base unit objects
	const targetUnitObj = useMemo(() => {
		return availableUnits.find((u) => String(u.id) === String(unitId));
	}, [availableUnits, unitId]);

	const baseUnitObj = useMemo(() => {
		return (
			availableUnits.find((u) => String(u.id) === String(baseUnitId)) ||
			existingMappedUnits.find(
				(u: any) => String(u.unitId || u.id) === String(baseUnitId),
			)
		);
	}, [availableUnits, existingMappedUnits, baseUnitId]);

	// Calculations
	const numericQty = parseFloat(baseQuantity) || 1;
	const numericPrice = parseFloat(unitPrice) || 0;
	const effectivePricePerBase = numericQty > 0 ? numericPrice / numericQty : 0;
	const baseUnitPrice =
		parseFloat(
			String(
				primaryBaseUnit?.finalPrice ??
					primaryBaseUnit?.unitPrice ??
					primaryBaseUnit?.sellPrice ??
					primaryBaseUnit?.price ??
					product?.sellPrice ??
					product?.price ??
					0,
			),
		) || 0;
	const unitListPrice = calculateUnitListPrice(baseUnitPrice, numericQty);

	// Helper to resolve a variant's base price
	const getVariantBasePrice = (v: any): number => {
		const val =
			v.finalPrice ??
			v.sellPrice ??
			v.price ??
			v.unitPrice ??
			v.basePrice ??
			v.retailPrice ??
			baseUnitPrice;
		return Math.max(0, parseFloat(String(val)) || 0);
	};

	// Helper to resolve a variant's list price (base price * conversion multiplier)
	const getVariantListPrice = (v: any): number => {
		const vBase = getVariantBasePrice(v);
		return calculateUnitListPrice(vBase, numericQty);
	};

	// Main Form: two-way calculation for selling price change
	const handleSellingPriceChange = (newPriceStr: string) => {
		setUnitPrice(newPriceStr);
		const newPrice = parseFloat(newPriceStr);
		if (!isNaN(newPrice) && unitListPrice > 0) {
			const calculatedDiscount = calculateUnitDiscount(
				unitListPrice,
				newPrice,
				discountType,
			);
			setDiscount(calculatedDiscount > 0 ? String(calculatedDiscount) : "0");
		}
	};

	// Main Form: two-way calculation for discount change
	const handleDiscountChange = (newDiscountStr: string) => {
		setDiscount(newDiscountStr);
		const numericD = parseFloat(newDiscountStr);
		if (unitListPrice > 0) {
			if (isNaN(numericD) || numericD <= 0) {
				setUnitPrice(unitListPrice.toFixed(2));
			} else {
				const finalP = calculateUnitFinalPrice(
					unitListPrice,
					numericD,
					discountType,
				);
				setUnitPrice(finalP.toFixed(2));
			}
		}
	};

	// Main Form: discount type toggle (% vs $)
	const handleDiscountTypeChange = (newType: DiscountType) => {
		setDiscountType(newType);
		const currentPrice = parseFloat(unitPrice);
		if (unitListPrice > 0 && !isNaN(currentPrice)) {
			const newDiscount = calculateUnitDiscount(
				unitListPrice,
				currentPrice,
				newType,
			);
			setDiscount(newDiscount > 0 ? String(newDiscount) : "0");
		}
	};

	// Main Form: conversion multiplier change
	const handleBaseQuantityChange = (newQtyStr: string) => {
		setBaseQuantity(newQtyStr);
		const newQty = parseFloat(newQtyStr);
		if (!isNaN(newQty) && newQty > 0 && baseUnitPrice > 0) {
			const newListPrice = calculateUnitListPrice(baseUnitPrice, newQty);
			const numericD = parseFloat(discount) || 0;
			if (numericD > 0) {
				const finalP = calculateUnitFinalPrice(
					newListPrice,
					numericD,
					discountType,
				);
				setUnitPrice(finalP.toFixed(2));
			} else {
				setUnitPrice(newListPrice.toFixed(2));
			}
		}
	};

	// Auto-multiply Base Price button action
	const handleAutoMultiplyBasePrice = () => {
		if (baseUnitPrice <= 0 || numericQty <= 0) {
			toast.error("Base price or conversion quantity is missing.");
			return;
		}
		const numericD = parseFloat(discount) || 0;
		if (numericD > 0) {
			const finalP = calculateUnitFinalPrice(
				unitListPrice,
				numericD,
				discountType,
			);
			setUnitPrice(finalP.toFixed(2));
			toast.success(
				`Calculated price: $${finalP.toFixed(2)} (${numericD}${discountType === "PERCENTAGE" ? "%" : "$"} discount applied)`,
			);
		} else {
			setUnitPrice(unitListPrice.toFixed(2));
			setDiscount("0");
			toast.success(`Calculated price: $${unitListPrice.toFixed(2)}`);
		}
	};

	// Variant level: two-way calculation for selling price change
	const handleVariantPriceChange = (
		variantId: string | number,
		newPriceStr: string,
		vObj?: any,
	) => {
		const v =
			vObj ||
			productVariants.find((pv: any) => String(pv.id) === String(variantId));
		const vList = v ? getVariantListPrice(v) : unitListPrice;
		const currentState = variantPrices[variantId] || {
			unitPrice: String(unitPrice || 0),
			discount: discount || "0",
			discountType: discountType,
		};
		const newPrice = parseFloat(newPriceStr);
		let calculatedDiscount = currentState.discount;

		if (!isNaN(newPrice) && vList > 0) {
			const d = calculateUnitDiscount(
				vList,
				newPrice,
				currentState.discountType,
			);
			calculatedDiscount = d > 0 ? String(d) : "0";
		}

		setVariantPrices((prev) => ({
			...prev,
			[variantId]: {
				...currentState,
				unitPrice: newPriceStr,
				discount: calculatedDiscount,
			},
		}));
	};

	// Variant level: two-way calculation for discount change
	const handleVariantDiscountChange = (
		variantId: string | number,
		newDiscountStr: string,
		vObj?: any,
	) => {
		const v =
			vObj ||
			productVariants.find((pv: any) => String(pv.id) === String(variantId));
		const vList = v ? getVariantListPrice(v) : unitListPrice;
		const currentState = variantPrices[variantId] || {
			unitPrice: String(unitPrice || 0),
			discount: discount || "0",
			discountType: discountType,
		};
		const numericD = parseFloat(newDiscountStr);
		let newPrice = currentState.unitPrice;

		if (vList > 0) {
			if (isNaN(numericD) || numericD <= 0) {
				newPrice = vList.toFixed(2);
			} else {
				const finalP = calculateUnitFinalPrice(
					vList,
					numericD,
					currentState.discountType,
				);
				newPrice = finalP.toFixed(2);
			}
		}

		setVariantPrices((prev) => ({
			...prev,
			[variantId]: {
				...currentState,
				unitPrice: newPrice,
				discount: newDiscountStr,
			},
		}));
	};

	// Variant level: discount type toggle (% vs $)
	const handleVariantDiscountTypeChange = (
		variantId: string | number,
		newType: DiscountType,
		vObj?: any,
	) => {
		const v =
			vObj ||
			productVariants.find((pv: any) => String(pv.id) === String(variantId));
		const vList = v ? getVariantListPrice(v) : unitListPrice;
		const currentState = variantPrices[variantId] || {
			unitPrice: String(unitPrice || 0),
			discount: discount || "0",
			discountType: discountType,
		};
		const currentPrice = parseFloat(currentState.unitPrice);
		let newDiscount = currentState.discount;

		if (vList > 0 && !isNaN(currentPrice)) {
			const d = calculateUnitDiscount(vList, currentPrice, newType);
			newDiscount = d > 0 ? String(d) : "0";
		}

		setVariantPrices((prev) => ({
			...prev,
			[variantId]: {
				...currentState,
				discountType: newType,
				discount: newDiscount,
			},
		}));
	};

	// Variant level: auto-calculate individual variant
	const handleResetVariant = (v: any) => {
		const vList = getVariantListPrice(v);
		const numericD = parseFloat(discount) || 0;
		const finalP =
			numericD > 0
				? calculateUnitFinalPrice(vList, numericD, discountType)
				: vList;

		setVariantPrices((prev) => ({
			...prev,
			[v.id]: {
				unitPrice: finalP > 0 ? finalP.toFixed(2) : String(unitPrice || 0),
				discount: discount || "0",
				discountType: discountType,
			},
		}));
		toast.success(
			`Auto-calculated ${v.name}: $${(finalP > 0 ? finalP : parseFloat(unitPrice || "0")).toFixed(2)}`,
		);
	};

	// Auto-calculate all variants based on individual base prices and multiplier
	const handleAutoCalculateAllVariants = (forceRecalculate = false) => {
		const numericD = parseFloat(discount) || 0;
		const updated: Record<
			string | number,
			{ unitPrice: string; discount: string; discountType: DiscountType }
		> = {};

		productVariants.forEach((v: any) => {
			const vList = getVariantListPrice(v);
			const currentVState = variantPrices[v.id];

			if (
				!forceRecalculate &&
				currentVState &&
				parseFloat(currentVState.unitPrice) > 0 &&
				currentVState.unitPrice !== unitPrice
			) {
				updated[v.id] = currentVState;
				return;
			}

			const vFinal =
				numericD > 0
					? calculateUnitFinalPrice(vList, numericD, discountType)
					: vList;
			const finalPrice =
				vFinal > 0 ? vFinal : parseFloat(unitPrice) || 0;

			updated[v.id] = {
				unitPrice: finalPrice.toFixed(2),
				discount: discount || "0",
				discountType: discountType,
			};
		});

		setVariantPrices(updated);
		toast.success(
			`Auto-calculated pricing for ${productVariants.length} variants based on conversion (${numericQty}x)`,
		);
	};

	const handleCopyPriceToAllVariants = () => {
		const updated: Record<
			string | number,
			{ unitPrice: string; discount: string; discountType: DiscountType }
		> = {};
		productVariants.forEach((v: any) => {
			updated[v.id] = {
				unitPrice: String(unitPrice || "0"),
				discount: variantPrices[v.id]?.discount || discount || "0",
				discountType: variantPrices[v.id]?.discountType || discountType,
			};
		});
		setVariantPrices(updated);
		toast.success(
			`Applied $${parseFloat(unitPrice || "0").toFixed(2)} to all variants`,
		);
	};

	const handleCopyDiscountToAllVariants = () => {
		const updated: Record<
			string | number,
			{ unitPrice: string; discount: string; discountType: DiscountType }
		> = {};
		productVariants.forEach((v: any) => {
			updated[v.id] = {
				unitPrice: variantPrices[v.id]?.unitPrice || String(unitPrice || "0"),
				discount: discount || "0",
				discountType: discountType,
			};
		});
		setVariantPrices(updated);
		toast.success(
			`Applied ${discount || "0"}${discountType === "PERCENTAGE" ? "%" : "$"} discount to all variants`,
		);
	};

	const handleApplyQuickDiscountPercent = (pct: number) => {
		const updated: Record<
			string | number,
			{ unitPrice: string; discount: string; discountType: DiscountType }
		> = {};
		productVariants.forEach((v: any) => {
			const vList = getVariantListPrice(v) || parseFloat(unitPrice) || 0;
			const discounted = calculateUnitFinalPrice(vList, pct, "PERCENTAGE");
			updated[v.id] = {
				unitPrice: discounted.toFixed(2),
				discount: String(pct),
				discountType: "PERCENTAGE",
			};
		});
		setVariantPrices(updated);
		toast.success(`Applied ${pct}% discount across all variants`);
	};

	const handleApplyCustomDiscountPercent = () => {
		const pct = parseFloat(quickDiscountPercent);
		if (isNaN(pct) || pct < 0 || pct > 100) {
			toast.error("Please enter a valid percentage between 0 and 100");
			return;
		}
		handleApplyQuickDiscountPercent(pct);
	};

	const handleSubmit = async () => {
		if (!unitId) {
			toast.error("Please select a unit to map.");
			return;
		}
		if (numericQty <= 0) {
			toast.error("Multiplier base quantity must be greater than 0.");
			return;
		}

		// Normalize main unit selling price and discount so it strictly matches backend validation
		const mainNormalized = normalizeUnitPricingForApi(
			unitListPrice,
			numericPrice,
			parseFloat(discount) || 0,
			discountType,
		);

		let formattedVariantPrices: VariantUnitPriceInput[] | undefined = undefined;

		if (!isSamePrice && productVariants.length > 0) {
			formattedVariantPrices = productVariants.map((v: any) => {
				const vState = variantPrices[v.id];
				const vList = getVariantListPrice(v);
				const rawPrice = parseFloat(vState?.unitPrice ?? unitPrice) || 0;
				const rawDiscount = parseFloat(vState?.discount ?? discount) || 0;
				const vDiscType = vState?.discountType ?? discountType;

				const vNormalized = normalizeUnitPricingForApi(
					vList,
					rawPrice,
					rawDiscount,
					vDiscType,
				);

				return {
					variantId: Number(v.id),
					unitPrice: vNormalized.unitPrice,
					discount: vNormalized.discount,
					discountType: vNormalized.discountType,
				};
			});
		}

		const unitItem: ProductUnitItemInput = {
			unitId: Number(unitId),
			baseUnitId: baseUnitId ? Number(baseUnitId) : null,
			baseQuantity: numericQty,
			unitPrice: mainNormalized.unitPrice,
			discount: mainNormalized.discount,
			discountType: mainNormalized.discountType,
			sellable: sellable,
			isBase: isBase,
			variantPrices: formattedVariantPrices,
		};

		const payload: ProductAddUnitsInput = {
			isSamePrice: isSamePrice,
			units: [unitItem],
		};

		await onSave(payload);
	};

	const targetUnitOptions = useMemo(() => {
		return availableUnits.map((u) => ({
			value: String(u.id),
			label: `${u.name} (${u.symbol || "Unit"})`,
			description: u.symbol ? `Symbol: ${u.symbol}` : undefined,
			icon: <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
		}));
	}, [availableUnits]);

	const baseUnitOptions = useMemo(() => {
		const map = new Map<
			string,
			{
				value: string;
				label: string;
				description?: string;
				badge?: string;
				icon?: React.ReactNode;
			}
		>();
		availableUnits.forEach((u) => {
			const isPrimary =
				primaryBaseUnit &&
				String(primaryBaseUnit.unitId || primaryBaseUnit.id) === String(u.id);
			map.set(String(u.id), {
				value: String(u.id),
				label: `${u.name} (${u.symbol || "Unit"})`,
				description: isPrimary
					? "Primary inventory base unit"
					: u.symbol
						? `Symbol: ${u.symbol}`
						: undefined,
				badge: isPrimary ? "Base" : undefined,
				icon: <Boxes className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
			});
		});
		existingMappedUnits.forEach((u: any) => {
			const id = String(u.unitId || u.id);
			if (id && !map.has(id)) {
				const isPrimary =
					u.isBase ||
					(primaryBaseUnit &&
						String(primaryBaseUnit.unitId || primaryBaseUnit.id) === id);
				map.set(id, {
					value: id,
					label: `${u.unitName || u.name || "Unit"} (${u.symbol || "Base"})`,
					description: isPrimary ? "Primary inventory base unit" : undefined,
					badge: isPrimary ? "Base" : undefined,
					icon: <Boxes className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
				});
			}
		});
		return Array.from(map.values());
	}, [availableUnits, existingMappedUnits, primaryBaseUnit]);

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				initialUnit
					? `${t("products.editProductTitle")}: ${t("products.mapUnits")}`
					: t("products.mapUnitModalTitle")
			}
			subtitle={t("products.mapUnitModalSubtitle")}
			icon={<Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
			size="2xl"
			maxWidth="max-w-5xl xl:max-w-6xl w-full"
			footer={
				<ModernModalFooter>
					{initialUnit && !initialUnit.isBase && onDelete && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={isLoading || isDeleting}
							onClick={async () => {
								const targetId = initialUnit.unitId ?? initialUnit.id;
								if (
									confirm(
										`Are you sure you want to remove unit "${initialUnit.unitName || initialUnit.name || "Unit"}" from this product?`,
									)
								) {
									await onDelete(targetId);
								}
							}}
							className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 mr-auto rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
						>
							{isDeleting ? (
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
							) : (
								<Trash2 className="h-3.5 w-3.5" />
							)}
							{t("common.delete")}
						</Button>
					)}
					<ModernModalCancelButton
						onClick={onClose}
						label={t("common.cancel")}
						disabled={isLoading || isDeleting}
					/>
					<ModernModalSubmitButton
						onClick={handleSubmit}
						label={initialUnit ? t("common.save") : t("products.mapUnits")}
						isLoading={isLoading}
					/>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1 text-xs">
				{/* Live Conversion Equation Banner */}
				<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/10 via-indigo-900/10 to-purple-900/5 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-slate-900 border border-purple-200/80 dark:border-purple-800/60 p-3.5 sm:p-4 shadow-xs">
					<div className="flex items-center justify-between gap-2 mb-2.5">
						<div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider text-[10px]">
							<Sparkles className="h-3.5 w-3.5" />
							{t("products.conversionPreview") || "Conversion Preview"}
						</div>
						<Badge
							variant="outline"
							className="bg-white/80 dark:bg-slate-900/80 text-[10px] font-mono border-purple-200 dark:border-purple-800"
						>
							Ratio: 1 : {numericQty}
						</Badge>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 rounded-xl p-3 border border-purple-100 dark:border-purple-900/50 shadow-2xs">
						<div className="flex items-center justify-between sm:justify-start gap-2.5 flex-1 min-w-0">
							<div className="flex items-center gap-2 min-w-0">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white font-black text-xs shadow-xs shrink-0">
									1
								</div>
								<div className="min-w-0">
									<span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
										{t("products.targetUnit")}
									</span>
									<span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
										{targetUnitObj?.name || t("products.targetUnit")}
									</span>
								</div>
							</div>

							<div className="flex items-center gap-1 text-purple-500 dark:text-purple-400 px-1">
								<span className="font-mono font-black text-sm">=</span>
								<ArrowRight className="h-4 w-4" />
							</div>

							<div className="flex items-center gap-2 min-w-0">
								<div className="flex h-8 min-w-8 px-2 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs border border-indigo-200 dark:border-indigo-800 shrink-0">
									{numericQty}
								</div>
								<div className="min-w-0">
									<span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">
										{t("products.baseUnit")}
									</span>
									<span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
										{baseUnitObj?.name || t("products.baseUnit")}
									</span>
								</div>
							</div>
						</div>

						<div className="border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-3 dark:border-slate-800 flex sm:flex-col justify-between sm:text-right items-center sm:items-end">
							<span className="text-[10px] text-slate-400 uppercase font-semibold block">
								{t("products.effectiveBaseRate") || "Effective Base Rate"}
							</span>
							<span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
								$
								{effectivePricePerBase.toLocaleString("en-US", {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}{" "}
								<span className="text-[10px] text-slate-500 font-normal">
									/ {baseUnitObj?.symbol || baseUnitObj?.name || "unit"}
								</span>
							</span>
						</div>
					</div>
				</div>

				{/* Section 1: Unit & Conversion Configuration */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 space-y-4">
					<div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
						<div className="flex items-center gap-2">
							<Boxes className="h-4 w-4 text-purple-600 dark:text-purple-400" />
							<h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
								{t("products.unitConfiguration") || "Unit & Pricing Configuration"}
							</h4>
						</div>
						{baseUnitPrice > 0 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={handleAutoMultiplyBasePrice}
								className="h-6 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-bold gap-1 px-1.5 cursor-pointer"
								title={`Multiply base price ($${baseUnitPrice.toFixed(2)}) by conversion multiplier (${numericQty})`}
							>
								<Calculator className="h-3 w-3" />
								Auto × Base (${baseUnitPrice.toFixed(2)})
							</Button>
						)}
					</div>

					{/* Row 1: Target Unit & Base Unit */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<ModernSelect
							label={t("products.targetUnit")}
							value={unitId}
							onChange={(val) => setUnitId(val)}
							options={targetUnitOptions}
							searchable={targetUnitOptions.length > 4}
							placeholder="Select target unit..."
							required
						/>

						<ModernSelect
							label={t("products.baseUnit")}
							value={baseUnitId}
							onChange={(val) => setBaseUnitId(val)}
							options={baseUnitOptions}
							searchable={baseUnitOptions.length > 4}
							placeholder="Select base reference unit..."
							required
						/>
					</div>

					{/* Merged Row: Conversion Ratio, Original Price (read-only), Discount, Selling Price */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
						{/* 1. Multiplier / Conversion Ratio */}
						<ModernInput
							label={t("products.multiplierQty")}
							type="number"
							step="any"
							min="0.0001"
							value={baseQuantity}
							onChange={(e) => handleBaseQuantityChange(e.target.value)}
							placeholder="e.g. 1"
							suffixAddon={baseUnitObj?.symbol || baseUnitObj?.name || "units"}
							helperText={
								targetUnitObj && baseUnitObj
									? `1 ${targetUnitObj.symbol || targetUnitObj.name} = ${baseQuantity || 1} ${baseUnitObj.symbol || baseUnitObj.name}`
									: undefined
							}
							required
						/>

						{/* 2. Original Price (Cannot edit, see only - sent to API) */}
						<ModernInput
							label={
								<span className="flex items-center justify-between w-full">
									<span>{t("products.originalPrice") || "Original Price"}</span>
									<span className="text-[10px] text-slate-400 font-mono">
										{t("common.readOnly") || "See only"}
									</span>
								</span>
							}
							type="text"
							value={unitListPrice > 0 ? unitListPrice.toFixed(2) : "0.00"}
							readOnly
							prefixAddon="$"
							suffixAddon={targetUnitObj?.symbol ? `/${targetUnitObj.symbol}` : undefined}
							className="bg-slate-100 dark:bg-slate-800/80 font-mono font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
							helperText={`Base $${baseUnitPrice.toFixed(2)} × ${numericQty}`}
						/>

						{/* 3. Discount field with compact Discount Type (% / $) at the end */}
						<div className="space-y-1.5">
							<label className="font-medium text-xs text-foreground flex items-center justify-between">
								<span className="flex items-center gap-1">
									<Percent className="size-3.5 text-purple-600 dark:text-purple-400" />
									{t("products.discount") || "Discount"}
								</span>
								{parseFloat(discount) > 0 && (
									<span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
										{discountType === "PERCENTAGE"
											? `-${discount}%`
											: `-$${parseFloat(discount).toFixed(2)}`}
									</span>
								)}
							</label>
							<div className="relative flex items-center rounded-lg border border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 transition-all shadow-2xs overflow-hidden h-11">
								<input
									type="number"
									step="any"
									min="0"
									max={discountType === "PERCENTAGE" ? "100" : undefined}
									value={discount}
									onChange={(e) => handleDiscountChange(e.target.value)}
									placeholder="0"
									className="w-full bg-transparent border-0 outline-none text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 px-3 h-full"
								/>
								{/* Compact Discount Type Toggle at the end */}
								<div className="pr-1.5 shrink-0">
									<div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-md border border-slate-300/60 dark:border-slate-700/60">
										<button
											type="button"
											onClick={() => handleDiscountTypeChange("PERCENTAGE")}
											className={cn(
												"h-7 px-2 rounded text-xs font-black transition-all cursor-pointer",
												discountType === "PERCENTAGE"
													? "bg-purple-600 text-white shadow-xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
											)}
											title="Percentage (%)"
										>
											%
										</button>
										<button
											type="button"
											onClick={() => handleDiscountTypeChange("FLAT")}
											className={cn(
												"h-7 px-2 rounded text-xs font-black transition-all cursor-pointer",
												discountType === "FLAT"
													? "bg-purple-600 text-white shadow-xs"
													: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
											)}
											title="Flat Cash ($)"
										>
											$
										</button>
									</div>
								</div>
							</div>
							<p className="text-[10px] text-muted-foreground truncate">
								{parseFloat(discount) > 0
									? discountType === "PERCENTAGE"
										? `${discount}% off original price ($${unitListPrice.toFixed(2)})`
										: `$${parseFloat(discount).toFixed(2)} cash discount off original ($${unitListPrice.toFixed(2)})`
									: unitListPrice > 0
										? `Standard original price: $${unitListPrice.toFixed(2)}`
										: "Standard selling price (0% discount)"}
							</p>
						</div>

						{/* 4. Selling Price (Final price after discount) */}
						<ModernInput
							label={
								<span className="flex items-center justify-between w-full">
									<span>{t("products.sellingPrice")}</span>
									<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
										(Selling)
									</span>
								</span>
							}
							type="number"
							step="any"
							min="0"
							value={unitPrice}
							onChange={(e) => handleSellingPriceChange(e.target.value)}
							placeholder="0.00"
							prefixAddon="$"
							suffixAddon={targetUnitObj?.symbol ? `/${targetUnitObj.symbol}` : undefined}
							helperText={
								numericQty > 0
									? `≈ $${effectivePricePerBase.toFixed(2)} / ${baseUnitObj?.symbol || baseUnitObj?.name || "base"}`
									: undefined
							}
							required
						/>
					</div>
				</div>

				{/* Section 3: Variant Pricing Strategy */}
				{productVariants.length > 0 && (
					<div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 space-y-4">
						<div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
							<div className="flex items-center gap-2">
								<Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
								<h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
									{t("products.pricingTiers")}
								</h4>
							</div>
							<Badge variant="secondary" className="text-[10px] font-mono">
								{productVariants.length} Variant(s)
							</Badge>
						</div>

						<div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
							<button
								type="button"
								onClick={() => setIsSamePrice(true)}
								className={cn(
									"py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer",
									isSamePrice
										? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
								)}
							>
								<span>{t("products.samePriceAllVariants")}</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsSamePrice(false);
									handleAutoCalculateAllVariants();
								}}
								className={cn(
									"py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer",
									!isSamePrice
										? "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
								)}
							>
								<span>{t("products.customPricePerVariant")}</span>
							</button>
						</div>

						{!isSamePrice && (
							<div className="space-y-3 pt-1 animate-in fade-in duration-200">
								<div className="bg-purple-50/60 dark:bg-purple-950/20 p-3 rounded-xl border border-purple-100 dark:border-purple-900/40 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-[11px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
											<SlidersHorizontal className="h-3 w-3" /> Bulk Variant
											Actions:
										</span>
										<span className="text-[10px] text-purple-600 dark:text-purple-400">
											Applies across all variants
										</span>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => handleAutoCalculateAllVariants(true)}
											className="h-7 text-[10px] gap-1 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-bold hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
											title={`Auto-calculate all variant prices from base price × ${numericQty}`}
										>
											<Calculator className="h-3 w-3 text-purple-600 dark:text-purple-400" />
											Auto-calculate All ({numericQty}x)
										</Button>

										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={handleCopyPriceToAllVariants}
											className="h-7 text-[10px] gap-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-purple-800 font-semibold cursor-pointer"
										>
											<Copy className="h-3 w-3" />
											Set All to ${parseFloat(unitPrice || "0").toFixed(2)}
										</Button>

										{parseFloat(discount) > 0 && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleCopyDiscountToAllVariants}
												className="h-7 text-[10px] gap-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-purple-800 font-semibold cursor-pointer"
											>
												<Percent className="h-3 w-3 text-purple-600" />
												Set All Discount to {discount}
												{discountType === "PERCENTAGE" ? "%" : "$"}
											</Button>
										)}

										<div className="flex items-center gap-1">
											{QUICK_DISCOUNT_PERCENT_PRESETS.map((pct) => (
												<button
													key={pct}
													type="button"
													onClick={() => handleApplyQuickDiscountPercent(pct)}
													className="h-7 px-1.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-[10px] font-bold hover:bg-purple-200 transition-colors"
												>
													-{pct}%
												</button>
											))}

											<div className="flex items-center gap-1 ml-0.5">
												<input
													type="number"
													placeholder="%"
													value={quickDiscountPercent}
													onChange={(e) =>
														setQuickDiscountPercent(e.target.value)
													}
													className="h-7 w-11 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 px-1 text-center text-xs font-mono"
												/>
												<Button
													type="button"
													variant="secondary"
													size="sm"
													onClick={handleApplyCustomDiscountPercent}
													className="h-7 text-[10px] gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 font-bold px-2"
												>
													<Percent className="h-3 w-3" />
													{t("common.apply") || "Apply"}
												</Button>
											</div>
										</div>
									</div>
								</div>

								<div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
									{productVariants.map((v: any) => {
										const vState = variantPrices[v.id] || {
											unitPrice: String(unitPrice || 0),
											discount: discount || "0",
											discountType: discountType,
										};
										const vBasePrice = getVariantBasePrice(v);
										const vListPrice = calculateUnitListPrice(vBasePrice, numericQty);
										const vPriceNum = parseFloat(vState.unitPrice) || 0;
										const vEffectiveBase =
											numericQty > 0 ? vPriceNum / numericQty : 0;

										return (
											<div
												key={v.id}
												className="bg-slate-50/90 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 transition-all hover:border-purple-300 dark:hover:border-purple-700"
											>
												<div className="flex items-start justify-between gap-2">
													<div className="min-w-0">
														<span className="font-bold text-slate-900 dark:text-slate-100 block text-xs truncate">
															{v.name}
														</span>
														<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
															<span className="text-[10px] text-slate-400 font-mono">
																SKU: {v.sku || "—"}
															</span>
															{vBasePrice > 0 && (
																<Badge
																	variant="outline"
																	className="text-[9px] py-0 px-1 text-slate-500 font-mono"
																>
																	Base: ${vBasePrice.toFixed(2)}
																</Badge>
															)}
															{vListPrice > 0 && numericQty > 1 && (
																<Badge
																	variant="secondary"
																	className="text-[9px] py-0 px-1 font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50"
																>
																	List: ${vListPrice.toFixed(2)}
																</Badge>
															)}
														</div>
													</div>

													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => handleResetVariant(v)}
														className="h-6 text-[10px] text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 px-1.5 gap-1 shrink-0 cursor-pointer font-semibold"
														title={`Auto-calculate ${v.name} (Base $${vBasePrice.toFixed(2)} × ${numericQty})`}
													>
														<Calculator className="h-2.5 w-2.5" />
														Auto-calc
													</Button>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
													{/* 1. Original Price (Cannot edit, see only - passed to API) */}
													<div>
														<label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center justify-between">
															<span>{t("products.originalPrice") || "Original Price"} ($)</span>
															<span className="text-[9px] text-slate-400 font-mono">
																{t("common.readOnly") || "See only"}
															</span>
														</label>
														<div className="relative flex items-center rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 h-9 px-2">
															<span className="text-slate-400 text-xs mr-1 font-mono font-semibold">$</span>
															<input
																type="text"
																value={vListPrice.toFixed(2)}
																readOnly
																className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed select-none"
															/>
														</div>
														<span className="text-[10px] text-slate-400 font-medium block mt-0.5 font-mono">
															Base ${vBasePrice.toFixed(2)} × {numericQty}
														</span>
													</div>

													{/* 2. Discount */}
													<div>
														<label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center justify-between">
															<span>{t("products.discount") || "Discount"}</span>
															{parseFloat(vState.discount || "0") > 0 && (
																<span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
																	{vState.discountType === "PERCENTAGE"
																		? `-${vState.discount}%`
																		: `-$${parseFloat(vState.discount).toFixed(2)}`}
																</span>
															)}
														</label>
														<div className="relative flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 h-9 px-2">
															<input
																type="number"
																step="any"
																min="0"
																max={vState.discountType === "PERCENTAGE" ? "100" : undefined}
																value={vState.discount}
																onChange={(e) =>
																	handleVariantDiscountChange(v.id, e.target.value, v)
																}
																placeholder="0"
																className="w-full bg-transparent border-0 outline-none text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground/50 pr-1"
															/>
															{/* Compact Discount Type Toggle at end */}
															<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
																<button
																	type="button"
																	onClick={() =>
																		handleVariantDiscountTypeChange(v.id, "PERCENTAGE", v)
																	}
																	className={cn(
																		"h-5 px-1.5 rounded text-[10px] font-black transition-all cursor-pointer",
																		vState.discountType === "PERCENTAGE"
																			? "bg-purple-600 text-white shadow-2xs"
																			: "text-slate-500 hover:text-slate-900 dark:hover:text-white",
																	)}
																	title="Percentage (%)"
																>
																	%
																</button>
																<button
																	type="button"
																	onClick={() =>
																		handleVariantDiscountTypeChange(v.id, "FLAT", v)
																	}
																	className={cn(
																		"h-5 px-1.5 rounded text-[10px] font-black transition-all cursor-pointer",
																		vState.discountType === "FLAT"
																			? "bg-purple-600 text-white shadow-2xs"
																			: "text-slate-500 hover:text-slate-900 dark:hover:text-white",
																	)}
																	title="Flat Cash ($)"
																>
																	$
																</button>
															</div>
														</div>
														<span className="text-[10px] text-slate-400 font-medium block mt-0.5 font-mono truncate">
															{parseFloat(vState.discount || "0") > 0
																? vState.discountType === "PERCENTAGE"
																	? `${vState.discount}% off original`
																	: `-$${parseFloat(vState.discount || "0").toFixed(2)} off original`
																: "0% discount"}
														</span>
													</div>

													{/* 3. Selling Price */}
													<div>
														<label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center justify-between">
															<span>{t("products.sellingPrice")} ($)</span>
															<span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
																(Selling)
															</span>
														</label>
														<Input
															type="number"
															inputMode="decimal"
															step="any"
															min="0"
															value={vState.unitPrice}
															onChange={(e) =>
																handleVariantPriceChange(v.id, e.target.value, v)
															}
															placeholder="0.00"
															className="h-9 text-xs font-bold font-mono bg-white dark:bg-slate-900"
														/>
														<div className="flex items-center justify-between text-[10px] font-medium mt-0.5 font-mono">
															<span className="text-emerald-600 dark:text-emerald-400">
																≈ ${vEffectiveBase.toFixed(2)} /{" "}
																{baseUnitObj?.symbol || "base"}
															</span>
															{vListPrice > 0 && vPriceNum < vListPrice && (
																<span className="text-slate-400 line-through">
																	${vListPrice.toFixed(2)}
																</span>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</ModernModal>
	);
}

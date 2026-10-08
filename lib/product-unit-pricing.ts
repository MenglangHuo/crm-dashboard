import type { DiscountType, ProductAddUnitsInput } from "@/lib/types";

export const DEFAULT_PRODUCT_UNIT_DISCOUNT_TYPE: DiscountType = "PERCENTAGE";

const MONEY_SCALE = 2;
const EPSILON = 0.000001;

export function roundMoney(value: number): number {
	return Math.round((value + Number.EPSILON) * 10 ** MONEY_SCALE) / 10 ** MONEY_SCALE;
}

export function normalizeDiscountType(value?: unknown): DiscountType {
	return String(value || DEFAULT_PRODUCT_UNIT_DISCOUNT_TYPE).toUpperCase() === "FLAT"
		? "FLAT"
		: DEFAULT_PRODUCT_UNIT_DISCOUNT_TYPE;
}

/** Price before a unit-level discount, expressed for the selected selling unit. */
export function calculateUnitListPrice(baseUnitPrice: number, baseQuantity: number): number {
	return roundMoney(Math.max(0, Number(baseUnitPrice) || 0) * Math.max(0, Number(baseQuantity) || 0));
}

/** Derives the discount from the list price and the final selling price. */
export function calculateUnitDiscount(
	listPrice: number,
	finalPrice: number,
	discountType?: DiscountType,
): number {
	const list = Math.max(0, Number(listPrice) || 0);
	const final = Math.max(0, Number(finalPrice) || 0);
	if (list <= 0 || final >= list) return 0;

	const amount = list - final;
	return normalizeDiscountType(discountType) === "FLAT"
		? roundMoney(amount)
		: roundMoney((amount / list) * 100);
}

export function calculateUnitFinalPrice(
	listPrice: number,
	discount: number,
	discountType?: DiscountType,
): number {
	const list = Math.max(0, Number(listPrice) || 0);
	const value = Math.max(0, Number(discount) || 0);
	const amount = normalizeDiscountType(discountType) === "FLAT" ? value : list * (value / 100);
	return roundMoney(Math.max(0, list - amount));
}

export function formatUnitDiscountNote(discount: number, discountType?: DiscountType): string {
	return normalizeDiscountType(discountType) === "FLAT"
		? `$${roundMoney(discount).toFixed(2)}`
		: `${roundMoney(discount)}%`;
}

/**
 * Client-side guard for the add-unit contract. The backend remains authoritative,
 * but rejecting malformed conversions here prevents accidental stock mappings.
 */
export function validateProductAddUnitsInput(input: ProductAddUnitsInput): void {
	if (!input || !Array.isArray(input.units) || input.units.length === 0) {
		throw new Error("At least one product unit is required");
	}

	const unitIds = new Set<string>();
	for (const unit of input.units) {
		const unitId = String(unit.unitId ?? "").trim();
		if (!unitId) throw new Error("Product unit ID is required");
		if (unitIds.has(unitId)) throw new Error(`Duplicate product unit: ${unitId}`);
		unitIds.add(unitId);

		const quantity = Number(unit.baseQuantity ?? 1);
		const price = Number(unit.unitPrice);
		if (!Number.isFinite(quantity) || quantity <= 0) {
			throw new Error("Base quantity must be greater than zero");
		}
		if (!Number.isFinite(price) || price < 0) {
			throw new Error("Unit price must be zero or greater");
		}

		const discountType = normalizeDiscountType(unit.discountType);
		const discount = Number(unit.discount ?? 0);
		if (!Number.isFinite(discount) || discount < 0) {
			throw new Error("Unit discount must be zero or greater");
		}
		if (discountType === "PERCENTAGE" && discount > 100) {
			throw new Error("Percentage discount cannot exceed 100%");
		}

		for (const variantPrice of unit.variantPrices ?? []) {
			const variantPriceValue = Number(variantPrice.unitPrice);
			if (!Number.isFinite(variantPriceValue) || variantPriceValue < 0) {
				throw new Error("Variant unit price must be zero or greater");
			}
			const variantDiscount = Number(variantPrice.discount ?? 0);
			const variantType = normalizeDiscountType(variantPrice.discountType ?? discountType);
			if (!Number.isFinite(variantDiscount) || variantDiscount < 0) {
				throw new Error("Variant unit discount must be zero or greater");
			}
			if (variantType === "PERCENTAGE" && variantDiscount > 100) {
				throw new Error("Variant percentage discount cannot exceed 100%");
			}
		}
	}
}

export function isNearlyEqual(a: number, b: number): boolean {
	return Math.abs(a - b) <= EPSILON;
}

/**
 * Normalizes and synchronizes unitPrice (selling price) and discount
 * strictly following backend catalog validation rules (VAL-CAT-008):
 * - unitPrice is the final selling price (capped at listPrice)
 * - if discount > 0, requested discount must match ((listPrice - unitPrice) / listPrice) * 100 within ±0.01
 * - if discount <= 0 or unitPrice >= listPrice, discount is 0 and unitPrice is listPrice
 */
export function normalizeUnitPricingForApi(
	listPrice: number,
	userEnteredSellingPrice: number,
	userEnteredDiscount: number,
	discountType?: DiscountType,
): { unitPrice: number; discount: number; discountType: DiscountType } {
	const normType = normalizeDiscountType(discountType);
	const list = roundMoney(Math.max(0, Number(listPrice) || 0));
	let selling = roundMoney(Math.max(0, Number(userEnteredSellingPrice) || 0));
	const disc = roundMoney(Math.max(0, Number(userEnteredDiscount) || 0));

	if (list <= 0) {
		return {
			unitPrice: selling,
			discount: 0,
			discountType: normType,
		};
	}

	if (selling > list) {
		selling = list;
	}

	if (disc <= 0 || selling >= list) {
		return {
			unitPrice: list,
			discount: 0,
			discountType: normType,
		};
	}

	const difference = roundMoney(list - selling);

	if (normType === "FLAT") {
		return {
			unitPrice: selling,
			discount: difference,
			discountType: normType,
		};
	}

	// PERCENTAGE: divide(list, 2, RoundingMode.HALF_UP)
	const calculatedPercentage = roundMoney((difference * 100) / list);
	return {
		unitPrice: selling,
		discount: calculatedPercentage,
		discountType: normType,
	};
}

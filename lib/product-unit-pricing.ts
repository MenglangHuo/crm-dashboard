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

		const hasVariantPrices = Array.isArray(unit.variantPrices) && unit.variantPrices.length > 0;
		if (!hasVariantPrices || (unit.unitPrice !== null && unit.unitPrice !== undefined)) {
			const price = Number(unit.unitPrice);
			if (!Number.isFinite(price) || price < 0) {
				throw new Error("Unit price must be zero or greater");
			}
		}

		const unitDiscountType = normalizeDiscountType(unit.discountType);
		if (unit.discount !== null && unit.discount !== undefined) {
			const discount = Number(unit.discount ?? 0);
			if (!Number.isFinite(discount) || discount < 0) {
				throw new Error("Unit discount must be zero or greater");
			}
			if (unitDiscountType === "PERCENTAGE" && discount > 100) {
				throw new Error("Percentage discount cannot exceed 100%");
			}
		}

		for (const variantPrice of unit.variantPrices ?? []) {
			const variantPriceValue = Number(variantPrice.unitPrice);
			if (!Number.isFinite(variantPriceValue) || variantPriceValue < 0) {
				throw new Error("Variant unit price must be zero or greater");
			}
			const variantDiscount = Number(variantPrice.discount ?? 0);
			const variantType = normalizeDiscountType(variantPrice.discountType ?? unitDiscountType);
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

	if (selling >= list || (selling <= 0 && disc <= 0)) {
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

export interface DecomposedUnitPart {
	count: number;
	unitName: string;
	baseQuantity: number;
}

export interface UnitBreakdownResult {
	formatted: string;
	parts: DecomposedUnitPart[];
	sign: "+" | "-" | "";
	baseQty: number;
	baseUnitName: string;
}

/**
 * Formats any base-unit quantity into a tiered packaging unit string.
 * Example:
 *   qty = 290, units = [{ unitName: "កេស", baseQuantity: 24 }, { unitName: "កំប៉ុង", baseQuantity: 1 }]
 *   => formatted: "+12 កេស 2 កំប៉ុង"
 * Example (negative):
 *   qty = -13, units = [{ unitName: "កេស", baseQuantity: 24 }, { unitName: "កំប៉ុង", baseQuantity: 1 }]
 *   => formatted: "-13 កំប៉ុង"
 * Example (with 12-pack):
 *   qty = -26, units = [{ unitName: "កេស", baseQuantity: 24 }, { unitName: "កំប៉ុង", baseQuantity: 1 }]
 *   => formatted: "-1 កេស 2 កំប៉ុង"
 */
export function formatQuantityToUnitBreakdown(
	qty: number,
	units?: Array<{ unitName?: string; baseQuantity?: number; isBase?: boolean }>,
	options?: {
		fallbackBaseUnitName?: string;
		includePlusSign?: boolean;
	},
): UnitBreakdownResult {
	const num = Number(qty) || 0;
	const includePlus = options?.includePlusSign ?? true;
	const sign: "+" | "-" | "" = num > 0 ? (includePlus ? "+" : "") : num < 0 ? "-" : "";
	const absQty = Math.abs(num);

	// Identify base unit name
	const baseUnit = units?.find((u) => u.isBase || Number(u.baseQuantity) === 1);
	const baseUnitName = baseUnit?.unitName || options?.fallbackBaseUnitName || "";

	if (!units || units.length === 0) {
		const formatted = baseUnitName
			? `${sign}${absQty.toLocaleString()} ${baseUnitName}`
			: `${sign}${absQty.toLocaleString()}`;
		return {
			formatted: num === 0 ? "0" : formatted,
			parts: [{ count: absQty, unitName: baseUnitName || "unit", baseQuantity: 1 }],
			sign,
			baseQty: num,
			baseUnitName,
		};
	}

	// Filter and sort units with baseQuantity > 0 descending
	const validUnits = units
		.filter((u) => u.unitName && Number(u.baseQuantity) > 0)
		.sort((a, b) => Number(b.baseQuantity) - Number(a.baseQuantity));

	if (validUnits.length === 0) {
		const formatted = baseUnitName
			? `${sign}${absQty.toLocaleString()} ${baseUnitName}`
			: `${sign}${absQty.toLocaleString()}`;
		return {
			formatted: num === 0 ? "0" : formatted,
			parts: [{ count: absQty, unitName: baseUnitName || "unit", baseQuantity: 1 }],
			sign,
			baseQty: num,
			baseUnitName,
		};
	}

	const largestBaseQty = Number(validUnits[0].baseQuantity);
	if (largestBaseQty <= 1) {
		const uName = validUnits[0].unitName || baseUnitName;
		const formatted = `${sign}${absQty.toLocaleString()} ${uName}`.trim();
		return {
			formatted: num === 0 ? `0 ${uName}`.trim() : formatted,
			parts: [{ count: absQty, unitName: uName, baseQuantity: 1 }],
			sign,
			baseQty: num,
			baseUnitName: uName,
		};
	}

	// Cascading breakdown from largest unit down to base unit
	let remaining = absQty;
	const parts: DecomposedUnitPart[] = [];

	for (let i = 0; i < validUnits.length; i++) {
		const unit = validUnits[i];
		const bQty = Number(unit.baseQuantity);
		const isLast = i === validUnits.length - 1;

		if (bQty > 1 && !isLast) {
			const count = Math.floor(remaining / bQty);
			if (count > 0) {
				parts.push({
					count,
					unitName: unit.unitName!,
					baseQuantity: bQty,
				});
				remaining = remaining % bQty;
			}
		} else {
			// Base / smallest unit captures the remainder
			if (remaining > 0 || parts.length === 0) {
				parts.push({
					count: remaining,
					unitName: unit.unitName || baseUnitName || "unit",
					baseQuantity: bQty > 0 ? bQty : 1,
				});
				remaining = 0;
			}
			break;
		}
	}

	if (parts.length === 0) {
		parts.push({
			count: 0,
			unitName: baseUnitName || "unit",
			baseQuantity: 1,
		});
	}

	const partsText = parts.map((p) => `${p.count.toLocaleString()} ${p.unitName}`).join(" ");
	const formatted = num === 0 ? partsText : `${sign}${partsText}`;

	return {
		formatted,
		parts,
		sign,
		baseQty: num,
		baseUnitName,
	};
}


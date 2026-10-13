import React from "react";

export type FilterOperator =
	| "EQUAL"
	| "NOT_EQUAL"
	| "LIKE"
	| "STARTS_WITH"
	| "ENDS_WITH"
	| "IN"
	| "NOT_IN"
	| "GREATER_THAN"
	| "GREATER_THAN_OR_EQUAL"
	| "LESS_THAN"
	| "LESS_THAN_OR_EQUAL"
	| "BETWEEN"
	| "IS_NULL"
	| "IS_NOT_NULL"
	| "FULL_TEXT"
	| "SW"
	| "EW"
	| "EQ"
	| "NE"
	| "GT"
	| "GTE"
	| "LT"
	| "LTE";

export interface FilterCriterion {
	field: string;
	operator: FilterOperator;
	value?: any;
	valueTo?: any;
	values?: any[];
}

export interface FilterGroup {
	operator: "AND" | "OR";
	filters: FilterCriterion[];
	groups?: any[];
}

export interface SortCriterion {
	field: string;
	direction: "ASC" | "DESC";
}

export interface SearchFilterPayload {
	filterGroup?: FilterGroup;
	sort?: SortCriterion[];
	page?: number;
	size?: number;
}

export type DomainFieldType =
	| "text"
	| "number"
	| "select"
	| "multi-select"
	| "search-select"
	| "date"
	| "date-range"
	| "number-range"
	| "number-threshold"
	| "boolean";

export type AsyncFilterEntityType =
	| "customer"
	| "category"
	| "brand"
	| "branch"
	| "warehouse"
	| "supplier"
	| "user"
	| "staff"
	| "division"
	| "department"
	| "unit"
	| "product";

export interface DomainFilterField {
	field: string;
	label: string;
	type: DomainFieldType;
	defaultOperator?: FilterOperator;
	options?: {
		label: string;
		value: any;
		badgeColor?: string;
		subtitle?: string;
		icon?: React.ReactNode;
	}[];
	loadOptions?: (
		query: string,
	) => Promise<
		{
			label: string;
			value: any;
			subtitle?: string;
			badge?: string;
			icon?: React.ReactNode;
		}[]
	>;
	asyncEntity?: AsyncFilterEntityType;
	isStatus?: boolean;
	searchable?: boolean;
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
	unitSymbol?: string;
	icon?: React.ReactNode;
	description?: string;
	allowOperators?: FilterOperator[]; // Allowed operator overrides for this field
	lockOperator?: boolean; // When true, locks to defaultOperator and hides operator select dropdown
}

export interface DomainFilterConfig {
	domainKey: string;
	domainTitle: string;
	fields: DomainFilterField[];
}

function formatDateValue(val: any, isEnd: boolean = false): any {
	if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
		return `${val.trim()}T${isEnd ? "23:59:59" : "00:00:00"}`;
	}
	return val;
}

function normalizeFilterValue(
	field: string,
	val: any,
	isEnd: boolean = false,
): any {
	if (val === undefined || val === null || val === "") return undefined;
	const lowerField = field.toLowerCase();
	const isDateField =
		lowerField.includes("date") ||
		lowerField.endsWith("at") ||
		(typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val.trim()));

	if (isDateField) {
		return formatDateValue(val, isEnd);
	}

	if (
		(lowerField === "customer" ||
			lowerField === "customerid" ||
			lowerField === "totalamount" ||
			lowerField === "totaldiscountamount" ||
			lowerField === "price" ||
			lowerField === "stock" ||
			lowerField === "amount" ||
			lowerField === "cost" ||
			lowerField === "quantity") &&
		typeof val === "string" &&
		val.trim() !== "" &&
		!isNaN(Number(val))
	) {
		return Number(val);
	}

	return val;
}

/**
 * Builds standard backend search payload conforming to SearchFilterPayload schema
 */
export function buildSearchFilterPayload(options: {
	searchValue?: string;
	searchField?: string;
	activeFilters?: FilterCriterion[];
	sortState?: SortCriterion[];
	page?: number;
	size?: number;
}): SearchFilterPayload {
	const filters: FilterCriterion[] = [];

	// Top search input generates search criterion
	if (options.searchValue && options.searchValue.trim()) {
		const targetField = options.searchField || "search";
		const op: FilterOperator =
			targetField === "invoiceNumber"
				? "SW"
				: targetField === "orderNumber"
					? "LIKE"
					: targetField === "text"
						? "SW"
						: targetField === "search"
							? "FULL_TEXT"
							: options.searchField
								? "LIKE"
								: "FULL_TEXT";

		filters.push({
			field: targetField,
			operator: op,
			value: options.searchValue.trim(),
		});
	}

	// Include domain filters
	if (options.activeFilters && options.activeFilters.length > 0) {
		options.activeFilters.forEach((f) => {
			// Don't duplicate top search field if already provided
			if (
				(f.field === "search" || f.field === options.searchField) &&
				options.searchValue?.trim()
			) {
				return;
			}

			// Sanitize filter before pushing
			if (
				(f.operator === "IN" || f.operator === "NOT_IN") &&
				Array.isArray(f.values) &&
				f.values.length > 0
			) {
				filters.push({
					field: f.field,
					operator: f.operator,
					values: f.values,
				});
			} else if (f.operator === "BETWEEN") {
				const hasMin =
					f.value !== "" && f.value !== undefined && f.value !== null;
				const hasMax =
					f.valueTo !== "" && f.valueTo !== undefined && f.valueTo !== null;

				if (hasMin || hasMax) {
					const criterion: FilterCriterion = {
						field: f.field,
						operator: "BETWEEN",
					};
					if (hasMin) {
						criterion.value = normalizeFilterValue(f.field, f.value, false);
					}
					if (hasMax) {
						criterion.valueTo = normalizeFilterValue(f.field, f.valueTo, true);
					}
					filters.push(criterion);
				}
			} else if (f.operator === "IS_NULL" || f.operator === "IS_NOT_NULL") {
				filters.push({ field: f.field, operator: f.operator });
			} else if (f.value !== "" && f.value !== undefined && f.value !== null) {
				const isUpperBound =
					f.operator === "LESS_THAN" || f.operator === "LESS_THAN_OR_EQUAL";
				filters.push({
					field: f.field,
					operator: f.operator,
					value: normalizeFilterValue(f.field, f.value, isUpperBound),
				});
			}
		});
	}

	return {
		page: options.page ?? 0,
		size: options.size ?? 10,
		sort:
			options.sortState && options.sortState.length > 0
				? options.sortState
				: [{ field: "createdAt", direction: "DESC" }],
		filterGroup: {
			operator: "AND",
			filters,
		},
	};
}

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
}

export interface DomainFilterConfig {
	domainKey: string;
	domainTitle: string;
	fields: DomainFilterField[];
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
			targetField === "text"
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
			if (f.field === "search" && options.searchValue?.trim()) return;

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
			} else if (
				f.operator === "BETWEEN" &&
				(f.value !== "" || f.valueTo !== "")
			) {
				filters.push({
					field: f.field,
					operator: f.operator,
					value: f.value !== "" && f.value !== undefined ? f.value : undefined,
					valueTo:
						f.valueTo !== "" && f.valueTo !== undefined ? f.valueTo : undefined,
				});
			} else if (f.operator === "IS_NULL" || f.operator === "IS_NOT_NULL") {
				filters.push({ field: f.field, operator: f.operator });
			} else if (f.value !== "" && f.value !== undefined && f.value !== null) {
				filters.push({
					field: f.field,
					operator: f.operator,
					value: f.value,
				});
			}
		});
	}

	return {
		filterGroup: {
			operator: "AND",
			filters,
			groups: [],
		},
		sort:
			options.sortState && options.sortState.length > 0
				? options.sortState
				: [{ field: "createdAt", direction: "DESC" }],
		page: options.page ?? 0,
		size: options.size ?? 10,
	};
}

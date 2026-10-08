import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";
import type { InventoryImport } from "@/lib/types";

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const body = await request.json().catch(() => ({}));
	const filterGroup = body.filterGroup || {};
	const criteria: any[] = Array.isArray(filterGroup.criteria)
		? filterGroup.criteria
		: Array.isArray(filterGroup.filters)
			? filterGroup.filters
			: [];

	const pageZeroBased =
		typeof body.page === "number" ? Math.max(0, body.page) : 0;
	const size =
		typeof body.size === "number" && body.size > 0
			? body.size
			: typeof body.limit === "number" && body.limit > 0
				? body.limit
				: 10;

	let items: InventoryImport[] = [...db.imports];

	criteria.forEach((crit) => {
		const field = crit.field;
		const operator = (crit.operator || "EQUAL").toUpperCase();
		const value =
			crit.value !== undefined && crit.value !== null ? crit.value : undefined;
		const valueTo =
			crit.valueTo !== undefined && crit.valueTo !== null
				? crit.valueTo
				: undefined;
		const values = Array.isArray(crit.values) ? crit.values : [];

		if (field === "referenceNo" || field === "importNo") {
			if (value) {
				const valStr = String(value).toLowerCase();
				if (operator === "STARTS_WITH" || operator === "SW") {
					items = items.filter((i) =>
						(i.referenceNo || i.importNo || `IMP-${i.id}`)
							.toLowerCase()
							.startsWith(valStr),
					);
				} else if (operator === "ENDS_WITH" || operator === "EW") {
					items = items.filter((i) =>
						(i.referenceNo || i.importNo || `IMP-${i.id}`)
							.toLowerCase()
							.endsWith(valStr),
					);
				} else if (operator === "EQUAL" || operator === "EQ") {
					items = items.filter(
						(i) =>
							(i.referenceNo || i.importNo || `IMP-${i.id}`).toLowerCase() ===
							valStr,
					);
				} else {
					items = items.filter((i) =>
						(i.referenceNo || i.importNo || `IMP-${i.id}`)
							.toLowerCase()
							.includes(valStr),
					);
				}
			}
		} else if (field === "supplier" || field === "supplierId") {
			if (operator === "IN" && values.length > 0) {
				const stringValues = values.map((v: any) => String(v));
				items = items.filter((i) =>
					stringValues.includes(String(i.supplierId)),
				);
			} else if (value !== undefined) {
				items = items.filter((i) => String(i.supplierId) === String(value));
			}
		} else if (field === "status") {
			if (operator === "IN" && values.length > 0) {
				const stringValues = values.map((v: any) => String(v).toUpperCase());
				items = items.filter((i) =>
					stringValues.includes(String(i.status || "").toUpperCase()),
				);
			} else if (value && value !== "ALL") {
				items = items.filter(
					(i) =>
						String(i.status || "").toUpperCase() ===
						String(value).toUpperCase(),
				);
			}
		} else if (field === "importDate" || field === "createdAt") {
			if (operator === "BETWEEN" && (value || valueTo)) {
				items = items.filter((i) => {
					const itemDate = new Date(i.importDate || i.createdAt || 0).getTime();
					const from = value ? new Date(value).getTime() : -Infinity;
					const to = valueTo ? new Date(valueTo).getTime() : Infinity;
					return itemDate >= from && itemDate <= to;
				});
			}
		} else if (field === "totalCost" || field === "totalAmount") {
			if (
				operator === "BETWEEN" &&
				(value !== undefined || valueTo !== undefined)
			) {
				const min = value !== undefined ? Number(value) : -Infinity;
				const max = valueTo !== undefined ? Number(valueTo) : Infinity;
				items = items.filter((i) => {
					const cost = Number(i.totalCost ?? i.totalAmount ?? 0);
					return cost >= min && cost <= max;
				});
			} else if (operator === "GREATER_THAN_OR_EQUAL" || operator === "GTE") {
				items = items.filter(
					(i) => Number(i.totalCost ?? i.totalAmount ?? 0) >= Number(value),
				);
			} else if (operator === "LESS_THAN_OR_EQUAL" || operator === "LTE") {
				items = items.filter(
					(i) => Number(i.totalCost ?? i.totalAmount ?? 0) <= Number(value),
				);
			}
		} else if (field === "search" || field === "text") {
			if (value) {
				const lower = String(value).toLowerCase();
				items = items.filter(
					(i) =>
						(i.referenceNo && i.referenceNo.toLowerCase().includes(lower)) ||
						(i.supplierName && i.supplierName.toLowerCase().includes(lower)) ||
						(i.note && i.note.toLowerCase().includes(lower)) ||
						(i.notes && i.notes.toLowerCase().includes(lower)),
				);
			}
		}
	});

	// Sort
	if (Array.isArray(body.sort) && body.sort.length > 0) {
		const sortObj = body.sort[0];
		const sortField = sortObj.field || "createdAt";
		const isDesc = (sortObj.direction || "DESC").toUpperCase() === "DESC";

		items.sort((a: any, b: any) => {
			const valA = a[sortField] ?? "";
			const valB = b[sortField] ?? "";
			if (valA < valB) return isDesc ? 1 : -1;
			if (valA > valB) return isDesc ? -1 : 1;
			return 0;
		});
	}

	const totalElements = items.length;
	const totalPages = Math.ceil(totalElements / size) || 1;
	const start = pageZeroBased * size;
	const paginatedContent = items.slice(start, start + size);

	const responsePayload = {
		content: paginatedContent,
		pageNumber: pageZeroBased,
		pageSize: size,
		totalElements: totalElements,
		totalPages: totalPages,
		last: pageZeroBased + 1 >= totalPages,
		first: pageZeroBased === 0,
		empty: paginatedContent.length === 0,
		// Add compatibility properties
		items: paginatedContent,
		page: pageZeroBased + 1,
		limit: size,
		total: totalElements,
	};

	return ok(responsePayload);
}

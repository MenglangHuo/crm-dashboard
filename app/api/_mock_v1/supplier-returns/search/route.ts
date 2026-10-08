import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";
import type { SupplierReturn } from "@/lib/types";

const initialSupplierReturns: SupplierReturn[] = [
	{
		id: 1,
		companyId: 9,
		returnNumber: "RET-202609-00001",
		importId: 4,
		importNumber: "IMP-2026-317",
		referenceNo: "IMP-2026-317",
		supplierId: 1,
		supplierName: "Menglang Sup",
		warehouseId: 9,
		warehouseName: "Menglang",
		returnDate: "2026-09-02T16:53:34.033779",
		returnAll: false,
		reason: "បែកបាក់ 1 កេស",
		notes: null,
		totalCost: 150.0,
		returnedBy: 10,
		status: "COMPLETED",
		approvedBy: 10,
		approvedAt: "2026-09-02T16:56:24.731926",
		rejectionReason: null,
		items: [
			{
				id: 1,
				importItemId: 8,
				variantId: 3,
				variantName: "ទឹកអប់",
				variantSku: "SKU-PRD-2489---A055",
				quantity: 50,
				unitCost: 3.0,
				inputQuantity: 1,
				inputUnitId: 4,
				inputUnitName: "ប្រអប់",
				totalCost: 150.0,
				reason: "Broken",
			},
		],
		createdAt: "2026-09-02T16:53:34.033779",
		updatedAt: "2026-09-02T16:56:24.731926",
	},
];

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (
		!Array.isArray((db as any).supplierReturns) ||
		(db as any).supplierReturns.length === 0
	) {
		(db as any).supplierReturns = [...initialSupplierReturns];
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

	let items: SupplierReturn[] = [...(db as any).supplierReturns];

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

		if (field === "returnNumber") {
			if (value) {
				const valStr = String(value).toLowerCase();
				if (operator === "STARTS_WITH" || operator === "SW") {
					items = items.filter((i) =>
						i.returnNumber.toLowerCase().startsWith(valStr),
					);
				} else if (operator === "ENDS_WITH" || operator === "EW") {
					items = items.filter((i) =>
						i.returnNumber.toLowerCase().endsWith(valStr),
					);
				} else if (operator === "EQUAL" || operator === "EQ") {
					items = items.filter((i) => i.returnNumber.toLowerCase() === valStr);
				} else {
					// LIKE / CONTAINS
					items = items.filter((i) =>
						i.returnNumber.toLowerCase().includes(valStr),
					);
				}
			}
		} else if (field === "importNumber" || field === "referenceNo") {
			if (value) {
				const valStr = String(value).toLowerCase();
				items = items.filter((i) =>
					(i.importNumber || i.referenceNo || "")
						.toLowerCase()
						.includes(valStr),
				);
			}
		} else if (field === "importId") {
			if (value !== undefined) {
				items = items.filter((i) => String(i.importId) === String(value));
			}
		} else if (field === "supplierId" || field === "supplier") {
			if (operator === "IN" && values.length > 0) {
				const stringValues = values.map((v: any) => String(v));
				items = items.filter((i) =>
					stringValues.includes(String(i.supplierId)),
				);
			} else if (value !== undefined) {
				items = items.filter((i) => String(i.supplierId) === String(value));
			}
		} else if (field === "returnAll") {
			if (value !== undefined) {
				const boolVal = String(value) === "true" || value === true;
				items = items.filter((i) => Boolean(i.returnAll) === boolVal);
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
		} else if (field === "returnDate" || field === "createdAt") {
			if (operator === "BETWEEN" && (value || valueTo)) {
				items = items.filter((i) => {
					const itemDate = new Date(i.returnDate || i.createdAt || 0).getTime();
					const from = value ? new Date(value).getTime() : -Infinity;
					const to = valueTo ? new Date(valueTo).getTime() : Infinity;
					return itemDate >= from && itemDate <= to;
				});
			}
		} else if (field === "totalCost") {
			if (
				operator === "BETWEEN" &&
				(value !== undefined || valueTo !== undefined)
			) {
				const min = value !== undefined ? Number(value) : -Infinity;
				const max = valueTo !== undefined ? Number(valueTo) : Infinity;
				items = items.filter((i) => {
					const cost = Number(i.totalCost || 0);
					return cost >= min && cost <= max;
				});
			} else if (operator === "GREATER_THAN_OR_EQUAL" || operator === "GTE") {
				items = items.filter((i) => Number(i.totalCost || 0) >= Number(value));
			} else if (operator === "LESS_THAN_OR_EQUAL" || operator === "LTE") {
				items = items.filter((i) => Number(i.totalCost || 0) <= Number(value));
			}
		} else if (field === "search" || field === "text") {
			if (value) {
				const lower = String(value).toLowerCase();
				items = items.filter(
					(i) =>
						i.returnNumber.toLowerCase().includes(lower) ||
						(i.importNumber && i.importNumber.toLowerCase().includes(lower)) ||
						(i.supplierName && i.supplierName.toLowerCase().includes(lower)) ||
						(i.reason && i.reason.toLowerCase().includes(lower)),
				);
			}
		}
	});

	// Sorting
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

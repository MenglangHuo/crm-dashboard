import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";
import type { Supplier } from "@/lib/types";

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.suppliers)) {
		db.suppliers = [];
	}

	const body = await request.json().catch(() => ({}));
	const filterGroup = body.filterGroup || {};
	const filters: any[] = Array.isArray(filterGroup.filters)
		? filterGroup.filters
		: [];
	const pageZeroBased =
		typeof body.page === "number" ? Math.max(0, body.page) : 0;
	const size =
		typeof body.size === "number" && body.size > 0
			? body.size
			: typeof body.pageSize === "number" && body.pageSize > 0
				? body.pageSize
				: 20;

	let items: Supplier[] = [...db.suppliers];

	filters.forEach((filter) => {
		const field = filter.field;
		const operator = (filter.operator || "EQ").toUpperCase();
		const value =
			filter.value !== undefined && filter.value !== null
				? String(filter.value).trim()
				: "";

		if (!value && operator === "LIKE") return;

		if (field === "text" || field === "search" || field === "name") {
			if (value) {
				const lower = value.toLowerCase();
				items = items.filter(
					(s) =>
						(s.name && s.name.toLowerCase().includes(lower)) ||
						(s.description && s.description.toLowerCase().includes(lower)) ||
						(s.primaryPhone && s.primaryPhone.includes(lower)) ||
						(s.secondaryPhone && s.secondaryPhone.includes(lower)) ||
						(s.phone && s.phone.includes(lower)),
				);
			}
		} else if (field === "status") {
			if (value && value !== "ALL") {
				items = items.filter(
					(s) =>
						(s.status || (s.isActive ? "Active" : "Inactive")).toLowerCase() ===
						value.toLowerCase(),
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

import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";
import type { Delivery } from "@/lib/types";

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.deliveries)) {
		db.deliveries = [];
	}

	const body = await request.json().catch(() => ({}));
	const pageZeroBased =
		typeof body.page === "number" ? Math.max(0, body.page) : 0;
	const pageSize =
		typeof body.size === "number" && body.size > 0 ? body.size : 20;

	let items = [...db.deliveries];

	// Filter Group Evaluation
	const filters: any[] = body.filterGroup?.filters || [];
	for (const filter of filters) {
		if (!filter || !filter.field) continue;

		const val = filter.value;
		if (val === undefined || val === null || val === "") continue;

		if (filter.field === "text" || filter.field === "search") {
			const searchStr = String(val).toLowerCase().trim();
			if (searchStr) {
				items = items.filter(
					(d) =>
						d.name.toLowerCase().includes(searchStr) ||
						d.code.toLowerCase().includes(searchStr) ||
						(d.driverName && d.driverName.toLowerCase().includes(searchStr)) ||
						(d.primaryPhone &&
							d.primaryPhone.toLowerCase().includes(searchStr)) ||
						(d.vehicleNumber &&
							d.vehicleNumber.toLowerCase().includes(searchStr)) ||
						(d.description && d.description.toLowerCase().includes(searchStr)),
				);
			}
		} else if (filter.field === "status") {
			const statusVal = String(val).trim();
			if (statusVal && statusVal !== "ALL") {
				items = items.filter(
					(d) => d.status?.toLowerCase() === statusVal.toLowerCase(),
				);
			}
		} else if (filter.field === "deliveryType") {
			const typeVal = String(val).trim();
			if (typeVal && typeVal !== "ALL") {
				items = items.filter(
					(d) => d.deliveryType?.toLowerCase() === typeVal.toLowerCase(),
				);
			}
		} else if (filter.field === "primaryProvinceCode") {
			items = items.filter((d) => d.primaryProvinceCode === String(val));
		}
	}

	// Sorting
	const sortRules = Array.isArray(body.sort) ? body.sort : [];
	if (sortRules.length > 0) {
		const primarySort = sortRules[0];
		const field = primarySort.field || "createdAt";
		const isDesc = (primarySort.direction || "DESC").toUpperCase() === "DESC";

		items.sort((a: any, b: any) => {
			const valA = a[field] ?? "";
			const valB = b[field] ?? "";
			if (valA < valB) return isDesc ? 1 : -1;
			if (valA > valB) return isDesc ? -1 : 1;
			return 0;
		});
	}

	const total = items.length;
	const totalPages = Math.ceil(total / pageSize) || 1;
	const start = pageZeroBased * pageSize;
	const paginatedItems = items.slice(start, start + pageSize);

	return ok({
		items: paginatedItems,
		page: pageZeroBased,
		limit: pageSize,
		total,
		totalPages,
	});
}

import { db, paginate } from "@/lib/server/db";
import { ok } from "@/lib/server/api";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const page = (body.page ?? 0) + 1;
	const limit = body.size ?? 10;

	let list = db.planPrices;

	if (body.filterGroup?.criteria?.length) {
		for (const c of body.filterGroup.criteria) {
			if (c.value) {
				const val = String(c.value).toLowerCase();
				list = list.filter((item: any) =>
					String(item[c.field] ?? "")
						.toLowerCase()
						.includes(val),
				);
			}
		}
	}

	const paged = paginate(list, { page, limit });
	return ok(
		{
			content: paged.items,
			pageNumber: paged.page - 1,
			pageSize: paged.limit,
			totalElements: paged.total,
			totalPages: paged.totalPages,
			first: paged.page === 1,
			last: paged.page === paged.totalPages,
			empty: paged.items.length === 0,
		},
		undefined,
		"Plan prices retrieved successfully",
	);
}

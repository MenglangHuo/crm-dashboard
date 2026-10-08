import { db, paginate } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";

export async function POST(request: Request) {
	const { profile, error } = await requireAuth("users.read");
	if (error) return error;

	let body: any = {};
	try {
		body = await request.json();
	} catch {
		body = {};
	}

	const page = (typeof body.page === "number" ? body.page : 0) + 1;
	const size = typeof body.size === "number" ? body.size : 20;

	let items = db.users.filter(
		(u) => !u.companyId || u.companyId === profile.companyId,
	);

	// Extract search term from filterGroup if provided
	let searchTerm = "";
	if (body.filterGroup && Array.isArray(body.filterGroup.filters)) {
		const textFilter = body.filterGroup.filters.find(
			(f: any) => f.field === "text",
		);
		if (textFilter && textFilter.value) {
			searchTerm = String(textFilter.value).trim();
		}
	}

	const result = paginate(items, {
		page,
		limit: size,
		search: searchTerm || undefined,
		searchFields: [
			"username",
			"email",
			"firstName",
			"lastName",
			"firstname",
			"lastname",
			"phone",
			"nickName",
			"initial",
		],
	});

	return ok({
		content: result.items,
		totalElements: result.total,
		totalPages: result.totalPages,
		number: result.page - 1,
		size: result.limit,
		items: result.items,
		total: result.total,
		page: result.page,
		limit: result.limit,
	});
}

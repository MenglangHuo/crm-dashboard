import { db, paginate } from "@/lib/server/db";
import { ok } from "@/lib/server/api";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const rawPage = Number(url.searchParams.get("page") || 0);
	const page = rawPage + 1;
	const size = Number(
		url.searchParams.get("size") || url.searchParams.get("limit") || 10,
	);
	const search = url.searchParams.get("search") || undefined;
	const companyId = url.searchParams.get("companyId");

	let list =
		Array.isArray(db.subscriptionAuditLogs) &&
		db.subscriptionAuditLogs.length > 0
			? db.subscriptionAuditLogs
			: ((db.subscriptions || []) as any[]);

	if (companyId) {
		list = list.filter((s) => String(s.companyId) === String(companyId));
	}

	const paged = paginate(list, {
		page,
		limit: size,
		search,
		searchFields: ["action", "remark", "oldStatus", "newStatus"],
	});
	return ok(paged, undefined, "Subscription history retrieved successfully");
}

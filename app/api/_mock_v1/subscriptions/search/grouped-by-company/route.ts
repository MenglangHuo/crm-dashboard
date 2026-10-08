import { db, paginate } from "@/lib/server/db";
import { ok } from "@/lib/server/api";
import { CompanySubscriptionGroup } from "@/types/subscription";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const page = (body.page ?? 0) + 1;
	const limit = body.size ?? 10;

	const groups: CompanySubscriptionGroup[] = db.companies.map((company) => {
		const companySubs = db.subscriptions.filter(
			(s) => s.companyId === company.id,
		);
		const activeSub =
			companySubs.find((s) => s.status === "ACTIVE" || s.status === "TRIAL") ||
			null;

		return {
			companyId: company.id,
			companyName: company.name,
			businessId: `BUS-${String(company.id).slice(-5).toUpperCase()}`,
			activeSubscription: activeSub,
			subscriptions: companySubs,
			totalSubscriptions: companySubs.length,
		};
	});

	let list = groups;
	if (body.filterGroup?.criteria?.length) {
		for (const c of body.filterGroup.criteria) {
			if (c.value) {
				const val = String(c.value).toLowerCase();
				list = list.filter(
					(item: any) =>
						String(item[c.field] ?? "")
							.toLowerCase()
							.includes(val) ||
						String(item.activeSubscription?.status ?? "")
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
		"Subscriptions grouped by company retrieved successfully",
	);
}

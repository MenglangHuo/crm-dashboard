import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";
import { INITIAL_DOMAINS_DATA } from "@/components/configurations/default-data";
import { ConfigurationItem } from "@/types/configuration";

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => ({}));
	const page = Number(body.page) || 0;
	const size = Number(body.size) || 20;

	const allItems: ConfigurationItem[] = [];
	INITIAL_DOMAINS_DATA.forEach((d) => {
		d.sections.forEach((s) => {
			s.configurations.forEach((c) => {
				allItems.push(c);
			});
		});
	});

	const total = allItems.length;
	const paginated = allItems.slice(page * size, (page + 1) * size);

	return ok({
		items: paginated,
		page: page + 1,
		limit: size,
		total,
		totalPages: Math.ceil(total / size),
	});
}

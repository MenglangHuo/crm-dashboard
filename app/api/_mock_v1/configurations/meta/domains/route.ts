import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";
import { INITIAL_DOMAINS_DATA } from "@/components/configurations/default-data";

export async function GET(_request: NextRequest) {
	const meta = INITIAL_DOMAINS_DATA.map((d) => ({
		category: d.category,
		categoryLabel: d.categoryLabel,
		description: d.description,
		icon: d.icon,
		displayOrder: d.displayOrder,
		sections: d.sections.map((s) => s.sectionName),
	}));
	return ok(meta);
}

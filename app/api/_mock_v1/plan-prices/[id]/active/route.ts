import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const url = new URL(req.url);
	const active = url.searchParams.get("active") === "true";

	const price = db.planPrices.find((p) => String(p.id) === String(id));
	if (!price) {
		return fail("Plan price not found", "NOT_FOUND", 404);
	}

	price.active = active;
	price.status = active ? "Active" : "Inactive";
	price.updatedAt = new Date().toISOString();
	return ok(
		price,
		undefined,
		`Plan price ${active ? "activated" : "deactivated"} successfully`,
	);
}

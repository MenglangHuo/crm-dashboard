import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const url = new URL(req.url);
	const active = url.searchParams.get("active") === "true";

	const plan = db.plans.find((p) => String(p.id) === String(id));
	if (!plan) {
		return fail("Plan not found", "NOT_FOUND", 404);
	}

	plan.active = active;
	plan.status = active ? "Active" : "Inactive";
	plan.updatedAt = new Date().toISOString();
	return ok(
		plan,
		undefined,
		`Plan ${active ? "activated" : "deactivated"} successfully`,
	);
}

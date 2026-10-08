import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const plan = db.plans.find((p) => String(p.id) === String(id));
	if (!plan) {
		return fail("Plan not found", "NOT_FOUND", 404);
	}

	const prices = db.planPrices.filter(
		(price) => String(price.planId) === String(id),
	);
	return ok({ ...plan, prices }, undefined, "Plan retrieved successfully");
}

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await req.json().catch(() => ({}));
	const plan = db.plans.find((p) => String(p.id) === String(id));
	if (!plan) {
		return fail("Plan not found", "NOT_FOUND", 404);
	}

	if (body.code) plan.code = body.code.toUpperCase().trim();
	if (body.name) plan.name = body.name.trim();
	if (body.displayName) plan.displayName = body.displayName.trim();
	if (body.description !== undefined) plan.description = body.description;
	if (body.maxUsers !== undefined) plan.maxUsers = Number(body.maxUsers);
	if (body.trial !== undefined) plan.trial = Boolean(body.trial);
	if (body.publiclyVisible !== undefined)
		plan.publiclyVisible = Boolean(body.publiclyVisible);
	if (body.tier !== undefined) plan.tier = body.tier;
	if (body.sortOrder !== undefined) plan.sortOrder = Number(body.sortOrder);
	if (body.featureIds && Array.isArray(body.featureIds)) {
		plan.features = body.featureIds
			.map((fId: any) => db.features.find((f) => String(f.id) === String(fId)))
			.filter(Boolean);
	}
	plan.updatedAt = new Date().toISOString();

	return ok(plan, undefined, "Plan updated successfully");
}

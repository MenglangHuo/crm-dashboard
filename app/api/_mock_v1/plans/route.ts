import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";
import { PlanDetail } from "@/types/subscription";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	if (!body.code || !body.name) {
		return fail("Plan code and name are required", "VALIDATION_FAILED", 400);
	}

	const existing = db.plans.find(
		(p) => p.code.toUpperCase() === body.code.toUpperCase(),
	);
	if (existing) {
		return fail("Plan code already exists", "DUPLICATE_CODE", 400);
	}

	const selectedFeatures = (body.featureIds || [])
		.map((fId: any) => db.features.find((f) => String(f.id) === String(fId)))
		.filter(Boolean);

	const newPlan: PlanDetail = {
		id: db.plans.length
			? Math.max(...db.plans.map((p) => Number(p.id) || 0)) + 1
			: 1,
		code: body.code.toUpperCase().trim(),
		name: body.name.trim(),
		displayName: body.displayName || body.name,
		description: body.description || "",
		maxUsers: Number(body.maxUsers) || 1,
		trial: Boolean(body.trial),
		active: true,
		publiclyVisible: body.publiclyVisible !== false,
		sortOrder: body.sortOrder ?? db.plans.length,
		tier: body.tier || "STARTER",
		features: selectedFeatures,
		prices: [],
		status: "Active",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	db.plans.push(newPlan);
	return ok(newPlan, { status: 201 }, "Plan created successfully");
}

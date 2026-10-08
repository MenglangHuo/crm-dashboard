import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/api";
import { PlanPriceGroupResponse } from "@/types/subscription";

export async function GET() {
	const grouped: PlanPriceGroupResponse[] = db.plans.map((plan) => ({
		plan,
		prices: db.planPrices.filter(
			(p) => String(p.planId) === String(plan.id) && p.active !== false,
		),
	}));

	return ok(
		grouped,
		undefined,
		"Plan prices grouped by plan fetched successfully",
	);
}

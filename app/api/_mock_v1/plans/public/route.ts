import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/api";

export async function GET() {
	const visiblePlans = db.plans.filter((p) => p.active && p.publiclyVisible);
	return ok(visiblePlans, undefined, "Public plans fetched successfully");
}

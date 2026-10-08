import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/api";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ planId: string }> },
) {
	const { planId } = await params;
	const prices = db.planPrices.filter(
		(p) => String(p.planId) === String(planId),
	);
	return ok(prices, undefined, "Plan prices fetched successfully");
}

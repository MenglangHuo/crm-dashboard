import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";
import { PlanPriceDetail } from "@/types/subscription";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	if (!body.planId || body.amount === undefined) {
		return fail("PlanId and amount are required", "VALIDATION_FAILED", 400);
	}

	const newPrice: PlanPriceDetail = {
		id: db.planPrices.length
			? Math.max(...db.planPrices.map((p) => Number(p.id) || 0)) + 1
			: 1,
		planId: body.planId,
		billingCycle: body.billingCycle || "MONTHLY",
		amount: Number(body.amount),
		currency: body.currency || "USD",
		intervalCount: Number(body.intervalCount) || 1,
		intervalUnit: body.intervalUnit || "MONTH",
		durationDays:
			Number(body.durationDays) || (body.billingCycle === "YEARLY" ? 365 : 30),
		status: "Active",
		active: true,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	db.planPrices.push(newPrice);
	return ok(newPrice, { status: 201 }, "Plan price created successfully");
}

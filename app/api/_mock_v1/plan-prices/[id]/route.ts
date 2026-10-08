import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const price = db.planPrices.find((p) => String(p.id) === String(id));
	if (!price) {
		return fail("Plan price not found", "NOT_FOUND", 404);
	}
	return ok(price, undefined, "Plan price retrieved successfully");
}

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await req.json().catch(() => ({}));
	const price = db.planPrices.find((p) => String(p.id) === String(id));
	if (!price) {
		return fail("Plan price not found", "NOT_FOUND", 404);
	}

	if (body.billingCycle) price.billingCycle = body.billingCycle;
	if (body.amount !== undefined) price.amount = Number(body.amount);
	if (body.currency) price.currency = body.currency;
	if (body.intervalCount !== undefined)
		price.intervalCount = Number(body.intervalCount);
	if (body.intervalUnit) price.intervalUnit = body.intervalUnit;
	if (body.durationDays !== undefined)
		price.durationDays = Number(body.durationDays);
	price.updatedAt = new Date().toISOString();

	return ok(price, undefined, "Plan price updated successfully");
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const price = db.planPrices.find((p) => String(p.id) === String(id));
	if (!price) {
		return fail("Plan price not found", "NOT_FOUND", 404);
	}

	price.status = "Inactive";
	price.active = false;
	return ok(price, undefined, "Plan price deleted successfully");
}

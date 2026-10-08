import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";
import { ActiveSubscription } from "@/types/subscription";

export async function POST() {
	const existingTrial = db.subscriptions.find((s) => s.status === "TRIAL");
	if (existingTrial) {
		return fail(
			"Company has already used free trial",
			"TRIAL_ALREADY_USED",
			402,
		);
	}

	const freePlan =
		db.plans.find((p) => p.trial || p.tier === "FREE_TRIAL") || db.plans[0];
	const freePrice =
		db.planPrices.find((p) => String(p.planId) === String(freePlan.id)) ||
		db.planPrices[0];

	const now = new Date();
	const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
	const graceEnd = new Date(end.getTime() + 3 * 24 * 60 * 60 * 1000);

	const trialSub: ActiveSubscription = {
		id: db.subscriptions.length
			? Math.max(...db.subscriptions.map((s) => Number(s.id) || 0)) + 1
			: 101,
		companyId: "comp_acme",
		companyName: "Acme Financial",
		plan: freePlan,
		planPrice: freePrice,
		status: "TRIAL",
		startDate: now.toISOString(),
		endDate: end.toISOString(),
		gracePeriodEnd: graceEnd.toISOString(),
		nextBillingDate: null,
		autoRenew: false,
		subscribedAmount: 0.0,
		subscribedCurrency: freePrice?.currency || "USD",
		createdAt: now.toISOString(),
	};

	db.subscriptions.unshift(trialSub);
	return ok(
		trialSub,
		{ status: 201 },
		"Trial subscription created successfully",
	);
}

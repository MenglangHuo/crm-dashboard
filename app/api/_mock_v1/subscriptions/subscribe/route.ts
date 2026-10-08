import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";
import { ActiveSubscription } from "@/types/subscription";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	if (!body.planPriceId) {
		return fail("planPriceId is required", "VALIDATION_FAILED", 400);
	}

	const planPrice = db.planPrices.find(
		(p) => String(p.id) === String(body.planPriceId),
	);
	if (!planPrice) {
		return fail("Plan price not found", "NOT_FOUND", 404);
	}

	const plan = db.plans.find((p) => String(p.id) === String(planPrice.planId));
	if (!plan) {
		return fail("Plan not found", "NOT_FOUND", 404);
	}

	const targetCompanyId = body.companyId || "comp_acme";
	const company = db.companies.find(
		(c) => String(c.id) === String(targetCompanyId),
	);

	const now = new Date();
	const days =
		planPrice.durationDays || (planPrice.billingCycle === "YEARLY" ? 365 : 30);
	const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
	const graceEnd = new Date(end.getTime() + 3 * 24 * 60 * 60 * 1000);

	// Deactivate existing active subscription
	db.subscriptions.forEach((s) => {
		if (
			String(s.companyId) === String(targetCompanyId) &&
			s.status === "ACTIVE"
		) {
			s.status = "EXPIRED";
		}
	});

	const newSub: ActiveSubscription = {
		id: db.subscriptions.length
			? Math.max(...db.subscriptions.map((s) => Number(s.id) || 0)) + 1
			: 102,
		companyId: targetCompanyId,
		companyName: company?.name || `Company #${targetCompanyId}`,
		plan,
		planPrice,
		status: "ACTIVE",
		startDate: now.toISOString(),
		endDate: end.toISOString(),
		gracePeriodEnd: graceEnd.toISOString(),
		nextBillingDate: end.toISOString(),
		autoRenew: true,
		subscribedAmount: planPrice.amount,
		subscribedCurrency: planPrice.currency,
		createdAt: now.toISOString(),
	};

	db.subscriptions.unshift(newSub);

	// Also update company.subscription if company exists in db
	if (company) {
		(company as any).subscription = {
			planName: plan.name,
			planPrice: planPrice.amount,
			billingCycle: planPrice.billingCycle,
			startDate: now.toISOString(),
			endDate: end.toISOString(),
			status: "ACTIVE",
		};
	}

	// Add audit log
	db.subscriptionAuditLogs.unshift({
		id: db.subscriptionAuditLogs.length
			? Math.max(...db.subscriptionAuditLogs.map((l) => Number(l.id) || 0)) + 1
			: 1,
		companyId: targetCompanyId,
		companyName: company?.name || `Company #${targetCompanyId}`,
		oldPlan: null,
		newPlan: plan,
		newPlanPrice: planPrice,
		oldStatus: null,
		newStatus: "ACTIVE",
		action: "SUBSCRIBE",
		remark: `Subscription activated to ${plan.displayName || plan.name} (${planPrice.billingCycle})`,
		createdAt: now.toISOString(),
	});

	return ok(newSub, undefined, "Subscription processed successfully");
}

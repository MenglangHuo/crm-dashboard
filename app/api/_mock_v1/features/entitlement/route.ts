import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/api";
import { CompanyEntitlement } from "@/types/subscription";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const companyId = url.searchParams.get("companyId");

	const activeSub = companyId
		? db.subscriptions.find(
				(s) =>
					String(s.companyId) === String(companyId) &&
					(s.status === "ACTIVE" || s.status === "TRIAL"),
			)
		: db.subscriptions.find(
				(s) => s.status === "ACTIVE" || s.status === "TRIAL",
			);

	const pastSub =
		!activeSub && companyId
			? db.subscriptions.find((s) => String(s.companyId) === String(companyId))
			: undefined;

	const plan =
		activeSub?.plan ||
		pastSub?.plan ||
		db.plans.find((p) => p.code === "FREE_PLAN") ||
		db.plans[0];
	const planPrice =
		activeSub?.planPrice ||
		pastSub?.planPrice ||
		db.planPrices.find((p) => String(p.planId) === String(plan?.id)) ||
		db.planPrices[0];

	const hasActiveSub = Boolean(
		activeSub &&
			(activeSub.status === "ACTIVE" || activeSub.status === "TRIAL"),
	);

	const entitlement: CompanyEntitlement = {
		companyId: companyId
			? isNaN(Number(companyId))
				? companyId
				: Number(companyId)
			: 10,
		subscriptionStatus: activeSub?.status || pastSub?.status || "EXPIRED",
		active: hasActiveSub,
		planId: hasActiveSub ? plan?.id : undefined,
		planCode: hasActiveSub ? plan?.code : undefined,
		planName: hasActiveSub ? plan?.name : "No Active Plan",
		planDisplayName: hasActiveSub
			? plan?.displayName || plan?.name
			: "No Active Plan",
		tier: hasActiveSub ? plan?.tier : undefined,
		sortOrder: plan?.sortOrder ?? 0,
		planPriceId: hasActiveSub ? planPrice?.id : undefined,
		billingCycle: hasActiveSub
			? planPrice?.billingCycle || "MONTHLY"
			: undefined,
		amount: hasActiveSub ? planPrice?.amount || 0 : 0,
		currency: planPrice?.currency || "USD",
		startDate: activeSub?.startDate || pastSub?.startDate || undefined,
		endDate: activeSub?.endDate || pastSub?.endDate || undefined,
		nextBillingDate: activeSub?.nextBillingDate || null,
		autoRenew: activeSub?.autoRenew ?? false,
		maxUsers: hasActiveSub ? plan?.maxUsers || 5 : 0,
		featureCodes: hasActiveSub ? (plan?.features || []).map((f) => f.code) : [],
	};

	return ok(entitlement, undefined, "Entitlements fetched successfully");
}

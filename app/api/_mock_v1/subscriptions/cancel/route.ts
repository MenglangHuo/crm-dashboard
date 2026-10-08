import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const activeSub = db.subscriptions.find(
		(s) => s.status === "ACTIVE" || s.status === "TRIAL",
	);
	if (!activeSub) {
		return fail("No active subscription found to cancel", "NOT_FOUND", 404);
	}

	activeSub.autoRenew = false;
	activeSub.cancellationReason =
		body.cancellationReason || "Customer cancelled subscription";
	if (body.immediate) {
		activeSub.status = "CANCELLED";
		activeSub.endDate = new Date().toISOString();
	}
	activeSub.updatedAt = new Date().toISOString();

	return ok(activeSub, undefined, "Subscription cancelled successfully");
}

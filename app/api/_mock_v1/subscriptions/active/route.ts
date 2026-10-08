import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

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

	if (!activeSub) {
		return fail(
			"No active subscription found for this company",
			"NOT_FOUND",
			404,
		);
	}
	return ok(activeSub, undefined, "Active subscription retrieved successfully");
}

import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(_request: NextRequest) {
	const { profile, error } = await requireAuth();
	if (error || !profile) return error;

	const companyId = profile.companyId || "comp_acme";
	const company = db.companies.find((c) => c.id === companyId);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);

	const branchCount = db.branches.filter(
		(b) => b.companyId === companyId && !b.deletedAt,
	).length;
	const staffCount = db.staff.filter(
		(s) => s.companyId === companyId && !s.deletedAt,
	).length;
	const userCount = db.users.filter((u) => u.companyId === companyId).length;

	return ok({
		...company,
		branchCount,
		staffCount,
		userCount,
	});
}

export async function PUT(request: NextRequest) {
	const { profile, error } = await requireAuth();
	if (error || !profile) return error;

	const companyId = profile.companyId || "comp_acme";
	const company = db.companies.find((c) => c.id === companyId);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);

	const body = await request.json().catch(() => ({}));
	if (typeof body.name === "string" && body.name.trim())
		company.name = body.name.trim();
	if (typeof body.email === "string" && body.email.trim())
		company.email = body.email.trim();
	if (typeof body.phone === "string") company.phone = body.phone.trim();
	if (typeof body.address === "string") company.address = body.address.trim();
	if (typeof body.description === "string")
		company.description = body.description.trim();
	if (typeof body.enableBranch === "boolean")
		company.enableBranch = body.enableBranch;

	return ok(company);
}

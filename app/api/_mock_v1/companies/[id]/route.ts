import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.read");
	if (error) return error;

	const { id } = await params;
	const company = db.companies.find((c) => c.id === id);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);

	const branchCount = db.branches.filter(
		(b) => b.companyId === id && !b.deletedAt,
	).length;
	const staffCount = db.staff.filter(
		(s) => s.companyId === id && !s.deletedAt,
	).length;
	const userCount = db.users.filter((u) => u.companyId === id).length;

	return ok({
		...company,
		branchCount,
		staffCount,
		userCount,
	});
}

export async function PUT(request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.update");
	if (error) return error;

	const { id } = await params;
	const company = db.companies.find((c) => c.id === id);
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
	if (typeof body.active === "boolean") company.active = body.active;

	return ok(company);
}

export async function PATCH(request: NextRequest, { params }: Params) {
	return PUT(request, { params });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.delete");
	if (error) return error;

	const { id } = await params;
	const company = db.companies.find((c) => c.id === id);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);
	if (company.deletedAt)
		return fail("Company is already deleted", "ALREADY_DELETED", 409);

	company.deletedAt = now();
	company.active = false;
	return ok(company);
}

import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth("companies.delete");
	if (error) return error;

	const { id } = await params;
	const company = db.companies.find((c) => c.id === id);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);
	if (!company.deletedAt)
		return fail("Company is not deleted", "NOT_DELETED", 409);

	company.deletedAt = null;
	return ok(company);
}

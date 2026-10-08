import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.update");
	if (error) return error;

	const { id } = await params;
	const company = db.companies.find((c) => c.id === id);
	if (!company) return fail("Company not found", "NOT_FOUND", 404);
	if (company.deletedAt)
		return fail(
			"Cannot toggle active status on a deleted company",
			"COMPANY_DELETED",
			400,
		);

	company.active = !company.active;
	return ok(company);
}

export async function POST(request: NextRequest, { params }: Params) {
	return PATCH(request, { params });
}

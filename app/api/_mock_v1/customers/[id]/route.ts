import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	const { id } = await params;
	const customer = db.customers.find(
		(c) => c.id === id && c.companyId === profile.companyId,
	);
	if (!customer) return fail("Customer not found", "NOT_FOUND", 404);
	return ok(customer);
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	const { id } = await params;
	const index = db.customers.findIndex(
		(c) => c.id === id && c.companyId === profile.companyId,
	);
	if (index === -1) return fail("Customer not found", "NOT_FOUND", 404);

	const body = await request.json();
	const existing = db.customers[index];
	const updated = {
		...existing,
		...body,
		isActive: body.isActive ?? body.active ?? existing.isActive,
		active: body.isActive ?? body.active ?? existing.isActive,
		documents: Array.isArray(body.documents)
			? body.documents
			: existing.documents || [],
		updatedAt: now(),
	};

	db.customers[index] = updated;
	return ok(updated);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	const { id } = await params;
	const index = db.customers.findIndex(
		(c) => c.id === id && c.companyId === profile.companyId,
	);
	if (index === -1) return fail("Customer not found", "NOT_FOUND", 404);

	db.customers.splice(index, 1);
	return ok({ id, deleted: true });
}

import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("branches.update");
	if (error) return error;
	const { id } = await params;
	const branch = db.branches.find(
		(b) => b.id === id && b.companyId === profile.companyId,
	);
	if (!branch) return fail("Branch not found", "NOT_FOUND", 404);
	const body = await request.json();
	if (body.name !== undefined) branch.name = String(body.name).trim();
	if (body.phone !== undefined) branch.phone = String(body.phone).trim();
	if (body.address !== undefined) branch.address = String(body.address).trim();
	if (body.active !== undefined) branch.active = Boolean(body.active);
	return ok(branch);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("branches.delete");
	if (error) return error;
	const { id } = await params;
	const branch = db.branches.find(
		(b) => b.id === id && b.companyId === profile.companyId,
	);
	if (!branch) return fail("Branch not found", "NOT_FOUND", 404);
	branch.deletedAt = now();
	branch.active = false;
	return ok({ id: branch.id, deletedAt: branch.deletedAt });
}

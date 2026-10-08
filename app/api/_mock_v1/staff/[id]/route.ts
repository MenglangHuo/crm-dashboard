import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("staff.update");
	if (error) return error;
	const { id } = await params;
	const staff = db.staff.find(
		(s) => s.id === id && s.companyId === profile.companyId,
	);
	if (!staff) return fail("Staff member not found", "NOT_FOUND", 404);
	const body = await request.json();
	if (body.firstName !== undefined)
		staff.firstName = String(body.firstName).trim();
	if (body.lastName !== undefined)
		staff.lastName = String(body.lastName).trim();
	if (body.position !== undefined)
		staff.position = String(body.position).trim();
	if (body.salary !== undefined) staff.salary = Number(body.salary) || 0;
	if (body.email !== undefined) staff.email = String(body.email).trim();
	if (body.phone !== undefined) staff.phone = String(body.phone).trim();
	if (body.branchId !== undefined) staff.branchId = body.branchId || null;
	if (body.userId !== undefined) staff.userId = body.userId || null;
	if (body.urgentContactName !== undefined)
		staff.urgentContactName = String(body.urgentContactName).trim();
	if (body.urgentContactPhone !== undefined)
		staff.urgentContactPhone = String(body.urgentContactPhone).trim();
	if (Array.isArray(body.documents)) {
		staff.documents = body.documents
			.filter(
				(d: { fileKey?: unknown; fileName?: unknown }) =>
					typeof d?.fileKey === "string" && typeof d?.fileName === "string",
			)
			.map((d: { fileKey: string; fileName: string }) => ({
				fileKey: d.fileKey,
				fileName: d.fileName,
			}));
	}
	return ok(staff);
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("staff.delete");
	if (error) return error;
	const { id } = await params;
	const staff = db.staff.find(
		(s) => s.id === id && s.companyId === profile.companyId,
	);
	if (!staff) return fail("Staff member not found", "NOT_FOUND", 404);
	staff.deletedAt = now();
	return ok({ id: staff.id, deletedAt: staff.deletedAt });
}

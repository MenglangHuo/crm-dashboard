import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
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
	staff.deletedAt = null;
	return ok(staff);
}

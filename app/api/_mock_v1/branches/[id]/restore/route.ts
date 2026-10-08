import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
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
	branch.deletedAt = null;
	branch.active = true;
	return ok(branch);
}

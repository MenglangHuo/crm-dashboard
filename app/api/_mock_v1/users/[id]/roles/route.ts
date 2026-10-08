import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("users.update");
	if (error) return error;
	const { id } = await params;
	const user = db.users.find((u) => String(u.id) === String(id));
	if (!user) return fail("User not found", "NOT_FOUND", 404);

	const body = await request.json();
	if (Array.isArray(body.roleIds)) {
		user.roleIds = body.roleIds.map(String);
	}
	return ok(user);
}

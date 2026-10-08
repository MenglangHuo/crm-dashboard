import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("users.update");
	if (error) return error;
	const { id } = await params;
	const user = db.users.find(
		(u) => u.id === id && u.companyId === profile.companyId,
	);
	if (!user) return fail("User not found", "NOT_FOUND", 404);
	const body = await request.json();
	if (Array.isArray(body.roleIds)) {
		const companyRoleIds = db.roles
			.filter((r) => r.companyId === profile.companyId)
			.map((r) => r.id);
		user.roleIds = body.roleIds.filter((rid: string) =>
			companyRoleIds.includes(rid),
		);
	}
	if (body.active !== undefined) user.active = Boolean(body.active);
	return ok(user);
}

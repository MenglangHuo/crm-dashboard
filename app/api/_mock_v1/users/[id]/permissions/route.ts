import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

function validPermissionIds(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	const all = new Set(db.permissions.map((p) => p.id));
	return input.filter(
		(id): id is string => typeof id === "string" && all.has(id),
	);
}

/** Add custom permissions on top of the user's roles. */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("users.manage_permissions");
	if (error) return error;
	const { id } = await params;
	const user = db.users.find(
		(u) => u.id === id && u.companyId === profile.companyId,
	);
	if (!user) return fail("User not found", "NOT_FOUND", 404);
	const body = await request.json();
	const ids = validPermissionIds(body.permissionIds);
	if (!ids.length)
		return fail("No valid permission ids provided", "VALIDATION_ERROR", 422);
	for (const pid of ids) {
		if (!user.addedPermissionIds.includes(pid))
			user.addedPermissionIds.push(pid);
		user.excludedPermissionIds = user.excludedPermissionIds.filter(
			(x) => x !== pid,
		);
	}
	return ok(user);
}

/** Exclude permissions the user would otherwise get from roles. */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("users.manage_permissions");
	if (error) return error;
	const { id } = await params;
	const user = db.users.find(
		(u) => u.id === id && u.companyId === profile.companyId,
	);
	if (!user) return fail("User not found", "NOT_FOUND", 404);
	const body = await request.json();
	const ids = validPermissionIds(body.permissionIds);
	if (!ids.length)
		return fail("No valid permission ids provided", "VALIDATION_ERROR", 422);
	for (const pid of ids) {
		if (!user.excludedPermissionIds.includes(pid))
			user.excludedPermissionIds.push(pid);
		user.addedPermissionIds = user.addedPermissionIds.filter((x) => x !== pid);
	}
	return ok(user);
}

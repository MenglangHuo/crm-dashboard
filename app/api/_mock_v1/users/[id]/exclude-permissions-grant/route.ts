import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth("users.manage_permissions");
	if (error) return error;
	const { id } = await params;
	const user = db.users.find((u) => String(u.id) === String(id));
	if (!user) return fail("User not found", "NOT_FOUND", 404);

	let body: any = {};
	try {
		body = await request.json();
	} catch {
		body = {};
	}

	// Handle permissions map or array
	const perms = body.permissions || body;
	if (perms && typeof perms === "object") {
		user.attributes = { ...(user.attributes || {}), excludedGrants: perms };
	}
	return ok(user);
}

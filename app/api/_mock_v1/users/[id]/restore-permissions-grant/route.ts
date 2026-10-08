import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
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

	// Restore grant permissions
	if (user.attributes?.excludedGrants) {
		const updated = { ...user.attributes.excludedGrants };
		const restored = body.permissions || body;
		if (typeof restored === "object") {
			Object.keys(restored).forEach((k) => delete updated[k]);
		}
		user.attributes.excludedGrants = updated;
	}
	return ok(user);
}

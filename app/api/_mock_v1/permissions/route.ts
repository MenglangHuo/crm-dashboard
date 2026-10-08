import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";

export async function GET() {
	const { profile, error } = await requireAuth();
	if (error) return error;
	// Super admins see everything; tenants see tenant-scoped permissions.
	const items = profile.isSuperAdmin
		? db.permissions
		: db.permissions.filter(
				(p) =>
					!p.name.startsWith("companies.") && !p.name.startsWith("admins."),
			);
	return ok(items);
}

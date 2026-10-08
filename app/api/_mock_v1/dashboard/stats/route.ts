import { db } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";

export async function GET() {
	const { profile, error } = await requireAuth();
	if (error) return error;

	if (profile.isSuperAdmin) {
		return ok({
			companies: db.companies.filter((c) => !c.deletedAt).length,
			admins: db.users.filter((u) => u.isSuperAdmin).length,
			users: db.users.filter((u) => !u.isSuperAdmin).length,
			branches: db.branches.filter((b) => !b.deletedAt).length,
		});
	}

	const companyId = profile.companyId;
	return ok({
		branches: db.branches.filter(
			(b) => b.companyId === companyId && !b.deletedAt,
		).length,
		staff: db.staff.filter((s) => s.companyId === companyId && !s.deletedAt)
			.length,
		users: db.users.filter((u) => u.companyId === companyId).length,
		roles: db.roles.filter((r) => r.companyId === companyId).length,
	});
}

import { db, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(request: Request) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	if (!profile.companyId)
		return fail("Only company accounts can create roles", "NO_COMPANY", 400);

	const body = await request.json();
	if (!body.name?.trim())
		return fail("Role name is required", "VALIDATION_ERROR", 422);

	const name = String(body.name).trim();
	const roleNameCode = name.toLowerCase().replace(/\s+/g, "_");

	// Extract enabled permission keys/IDs from permissions map or permissionIds array
	const permissionIds: string[] = [];
	if (body.permissions && typeof body.permissions === "object") {
		Object.entries(body.permissions).forEach(
			([moduleName, actions]: [string, any]) => {
				if (Array.isArray(actions)) {
					actions.forEach((act: any) => {
						if (act && act.enabled) {
							permissionIds.push(`${moduleName.toLowerCase()}.${act.name}`);
							permissionIds.push(`${moduleName.toUpperCase()}.${act.name}`);
							if (String(act.name).includes(".")) {
								permissionIds.push(act.name);
							}
						}
					});
				}
			},
		);
	} else if (Array.isArray(body.permissionIds)) {
		permissionIds.push(...body.permissionIds);
	}

	const role = {
		id: uid("role"),
		companyId: profile.companyId,
		name: roleNameCode,
		displayName: body.displayName || name,
		description: String(body.description ?? "").trim(),
		permissions: body.permissions || {},
		permissionIds,
		isSystem: false,
		createdAt: now(),
	};

	db.roles.unshift(role);
	return ok(role, { status: 201 });
}

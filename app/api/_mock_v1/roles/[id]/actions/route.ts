import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function updateRoleActionsHandler(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { profile, error } = await requireAuth();
	if (error) return error;

	const { id } = await params;
	const role = db.roles.find((r) => r.id === id || String(r.id) === String(id));
	if (!role) return fail("Role not found", "NOT_FOUND", 404);
	if (role.isSystem)
		return fail("System roles cannot be modified", "SYSTEM_ROLE", 400);

	const body = await request.json();
	if (body.name !== undefined) role.name = String(body.name).trim();
	if (body.displayName !== undefined)
		role.displayName = String(body.displayName).trim();
	if (body.description !== undefined)
		role.description = String(body.description).trim();

	if (body.permissions && typeof body.permissions === "object") {
		role.permissions = body.permissions;
		const permissionIds: string[] = [];
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
		role.permissionIds = Array.from(new Set(permissionIds));
	} else if (Array.isArray(body.permissionIds)) {
		role.permissionIds = Array.from(new Set(body.permissionIds));
	}

	return ok(role);
}

export const PUT = updateRoleActionsHandler;
export const POST = updateRoleActionsHandler;
export const PATCH = updateRoleActionsHandler;

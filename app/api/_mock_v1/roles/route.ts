import { db, paginate, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: Request) {
	const { profile, error } = await requireAuth("roles.read");
	if (error) return error;
	const url = new URL(request.url);
	const items = db.roles.filter((r) => r.companyId === profile.companyId);
	return ok(
		paginate(items, {
			page: Number(url.searchParams.get("page")) || 1,
			limit: Number(url.searchParams.get("limit")) || 10,
			search: url.searchParams.get("search") ?? undefined,
			searchFields: ["name", "description"],
		}),
	);
}

export async function POST(request: Request) {
	const { profile, error } = await requireAuth("roles.create");
	if (error) return error;
	if (!profile.companyId)
		return fail("Only company accounts can create roles", "NO_COMPANY", 400);
	const body = await request.json();
	if (!body.name?.trim())
		return fail("Role name is required", "VALIDATION_ERROR", 422);
	const name = String(body.name).trim().toLowerCase().replace(/\s+/g, "_");
	if (
		db.roles.some((r) => r.companyId === profile.companyId && r.name === name)
	)
		return fail("A role with this name already exists", "DUPLICATE_ROLE", 409);
	const all = new Set(db.permissions.map((p) => p.id));
	const role = {
		id: uid("role"),
		companyId: profile.companyId,
		name,
		description: String(body.description ?? "").trim(),
		permissionIds: Array.isArray(body.permissionIds)
			? body.permissionIds.filter((id: string) => all.has(id))
			: [],
		isSystem: false,
		createdAt: now(),
	};
	db.roles.unshift(role);
	return ok(role, { status: 201 });
}

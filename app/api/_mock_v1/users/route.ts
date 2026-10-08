import { db, paginate, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: Request) {
	const { profile, error } = await requireAuth("users.read");
	if (error) return error;
	const url = new URL(request.url);
	const items = db.users.filter(
		(u) => u.companyId === profile.companyId && !u.isSuperAdmin,
	);
	return ok(
		paginate(items, {
			page: Number(url.searchParams.get("page")) || 1,
			limit: Number(url.searchParams.get("limit")) || 10,
			search: url.searchParams.get("search") ?? undefined,
			searchFields: ["username", "email", "firstName", "lastName"],
		}),
	);
}

export async function POST(request: Request) {
	const { profile, error } = await requireAuth("users.create");
	if (error) return error;
	if (!profile.companyId)
		return fail("Only company accounts can register users", "NO_COMPANY", 400);
	const body = await request.json();
	if (!body.username?.trim() || !body.email?.trim() || !body.password)
		return fail(
			"Username, email and password are required",
			"VALIDATION_ERROR",
			422,
		);
	if (String(body.password).length < 8)
		return fail("Password must be at least 8 characters", "WEAK_PASSWORD", 422);
	if (
		db.users.some((u) => u.username === body.username || u.email === body.email)
	)
		return fail(
			"A user with this username or email already exists",
			"DUPLICATE_USER",
			409,
		);
	const companyRoleIds = db.roles
		.filter((r) => r.companyId === profile.companyId)
		.map((r) => r.id);
	const roleIds = Array.isArray(body.roleIds)
		? body.roleIds.filter((id: string) => companyRoleIds.includes(id))
		: [];
	const user = {
		id: uid("user"),
		username: String(body.username).trim(),
		email: String(body.email).trim(),
		firstName: String(body.firstName ?? "").trim(),
		lastName: String(body.lastName ?? "").trim(),
		avatarKey: null,
		companyId: profile.companyId,
		isSuperAdmin: false,
		roleIds,
		addedPermissionIds: [],
		excludedPermissionIds: [],
		active: true,
		createdAt: now(),
	};
	db.users.unshift(user);
	db.passwords.set(user.id, String(body.password));
	return ok(user, { status: 201 });
}

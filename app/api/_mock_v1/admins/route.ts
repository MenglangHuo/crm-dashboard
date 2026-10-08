import { NextRequest } from "next/server";
import { db, now, paginate, uid } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: NextRequest) {
	const { error } = await requireAuth("admins.read");
	if (error) return error;

	const sp = request.nextUrl.searchParams;
	const items = db.users.filter((u) => u.isSuperAdmin);

	return ok(
		paginate(items, {
			page: Number(sp.get("page")) || 1,
			limit: Number(sp.get("limit")) || 10,
			search: sp.get("search") ?? undefined,
			searchFields: ["username", "email", "firstName", "lastName"],
		}),
	);
}

export async function POST(request: NextRequest) {
	const { error } = await requireAuth("admins.create");
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	const { username, email, firstName, lastName, password } = body;

	if (!username?.trim() || !email?.trim() || !password) {
		return fail(
			"Username, email and password are required",
			"VALIDATION_ERROR",
			422,
		);
	}
	if (String(password).length < 8) {
		return fail(
			"Password must be at least 8 characters",
			"VALIDATION_ERROR",
			422,
		);
	}
	if (
		db.users.some(
			(u) => u.username.toLowerCase() === username.trim().toLowerCase(),
		)
	) {
		return fail("Username is already taken", "DUPLICATE_USERNAME", 409);
	}
	if (
		db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
	) {
		return fail("Email is already registered", "DUPLICATE_EMAIL", 409);
	}

	const admin = {
		id: uid("user"),
		username: username.trim(),
		email: email.trim(),
		firstName: firstName?.trim() ?? "",
		lastName: lastName?.trim() ?? "",
		avatarKey: null,
		companyId: null,
		isSuperAdmin: true,
		roleIds: ["role_super"],
		addedPermissionIds: [],
		excludedPermissionIds: [],
		active: true,
		createdAt: now(),
	};
	db.users.push(admin);
	db.passwords.set(admin.id, password);

	return ok(admin, { status: 201 });
}

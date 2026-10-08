import { NextRequest } from "next/server";
import { db, now, paginate, uid } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: NextRequest) {
	const { error } = await requireAuth("companies.read");
	if (error) return error;

	const sp = request.nextUrl.searchParams;
	const includeDeleted = sp.get("includeDeleted") === "true";
	const subscriptionStatus = sp.get("subscriptionStatus");

	let items = db.companies.filter((c) => includeDeleted || !c.deletedAt);

	if (subscriptionStatus && subscriptionStatus !== "ALL") {
		items = items.filter(
			(c) =>
				(c.subscription?.status || "").toUpperCase() ===
				subscriptionStatus.toUpperCase(),
		);
	}

	return ok(
		paginate(items, {
			page: Number(sp.get("page")) || 1,
			limit: Number(sp.get("limit")) || 10,
			search: sp.get("search") ?? undefined,
			searchFields: [
				"name",
				"email",
				"phone",
				"phoneNumber",
				"username",
				"address",
				"note",
				"description",
			],
		}),
	);
}

export async function POST(request: NextRequest) {
	const { error } = await requireAuth("companies.create");
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	const {
		name,
		email,
		phone,
		address,
		description,
		enableBranch,
		ownerUsername,
		ownerPassword,
	} = body;

	if (!name?.trim() || !email?.trim()) {
		return fail("Company name and email are required", "VALIDATION_ERROR", 422);
	}
	if (
		db.companies.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())
	) {
		return fail(
			"A company with this name already exists",
			"DUPLICATE_COMPANY",
			409,
		);
	}
	if (
		ownerUsername &&
		db.users.some(
			(u) => u.username.toLowerCase() === ownerUsername.toLowerCase(),
		)
	) {
		return fail("Owner username is already taken", "DUPLICATE_USERNAME", 409);
	}

	const company = {
		id: uid("comp"),
		name: name.trim(),
		email: email.trim(),
		phone: phone?.trim() ?? "",
		address: address?.trim() ?? "",
		description: description?.trim() ?? "",
		enableBranch: Boolean(enableBranch),
		active: true,
		deletedAt: null,
		createdAt: now(),
	};
	db.companies.push(company);

	// Seed the tenant admin role + owner account.
	const tenantPerms = db.permissions
		.filter(
			(p) => !p.name.startsWith("companies.") && !p.name.startsWith("admins."),
		)
		.map((p) => p.id);
	const adminRole = {
		id: uid("role"),
		companyId: company.id,
		name: "company_admin",
		description: "Full administrative access within the company.",
		permissionIds: tenantPerms,
		isSystem: true,
		createdAt: now(),
	};
	db.roles.push(adminRole);

	if (ownerUsername && ownerPassword) {
		const owner = {
			id: uid("user"),
			username: ownerUsername.trim(),
			email: email.trim(),
			firstName: "Owner",
			lastName: name.trim(),
			avatarKey: null,
			companyId: company.id,
			isSuperAdmin: false,
			roleIds: [adminRole.id],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: now(),
		};
		db.users.push(owner);
		db.passwords.set(owner.id, ownerPassword);
	}

	return ok(company, { status: 201 });
}

import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { SystemAdmin } from "@/lib/types";

export async function GET(request: NextRequest) {
	const { error } = await requireAuth();
	if (error) return error;

	const sp = request.nextUrl.searchParams;
	const page = Math.max(0, Number(sp.get("page")) || 0);
	const size = Math.max(1, Number(sp.get("size")) || 10);
	const level = sp.get("level");
	const search = (sp.get("search") || "").toLowerCase().trim();
	const sortBy = sp.get("sortBy") || "createdAt";
	const orderBy = (sp.get("orderBy") || "DESC").toUpperCase();

	let list = [...(db.systemAdmins || [])];

	if (level && level !== "ALL") {
		list = list.filter(
			(a) => (a.adminLevel || "").toUpperCase() === level.toUpperCase(),
		);
	}

	if (search) {
		list = list.filter((a) =>
			[a.username, a.displayName, a.email, a.notes].some((val) =>
				String(val || "")
					.toLowerCase()
					.includes(search),
			),
		);
	}

	list.sort((a: any, b: any) => {
		const valA = a[sortBy] ?? "";
		const valB = b[sortBy] ?? "";
		if (valA < valB) return orderBy === "ASC" ? -1 : 1;
		if (valA > valB) return orderBy === "ASC" ? 1 : -1;
		return 0;
	});

	const totalElements = list.length;
	const totalPages = Math.max(1, Math.ceil(totalElements / size));
	const start = page * size;
	const content = list.slice(start, start + size);

	return ok(
		{
			content,
			pageNumber: page,
			pageSize: size,
			totalElements,
			totalPages,
			last: page >= totalPages - 1,
			first: page === 0,
			empty: content.length === 0,
		},
		undefined,
		"Users searched successfully",
	);
}

export async function POST(request: NextRequest) {
	const { error } = await requireAuth();
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	const {
		username,
		displayName,
		email,
		password,
		isActive = true,
		adminLevel = "SUPPORT",
		notes = "",
	} = body;

	if (!username?.trim() || !displayName?.trim() || !email?.trim()) {
		return fail(
			"Username, display name and email are required",
			"VALIDATION_ERROR",
			422,
		);
	}

	const existing = (db.systemAdmins || []).find(
		(a) =>
			a.username.toLowerCase() === username.trim().toLowerCase() ||
			a.email.toLowerCase() === email.trim().toLowerCase(),
	);
	if (existing) {
		return fail("Username or email already in use", "DUPLICATE_ADMIN", 409);
	}

	const newId =
		(db.systemAdmins || []).reduce(
			(max, a) => Math.max(max, Number(a.id) || 0),
			0,
		) + 1;
	const timestamp = now();

	const newAdmin: SystemAdmin = {
		id: newId,
		username: username.trim(),
		displayName: displayName.trim(),
		email: email.trim(),
		isActive: isActive !== false,
		isLocked: false,
		loginAttempts: 0,
		adminLevel: adminLevel || "SUPPORT",
		notes: notes?.trim() || null,
		createdAt: timestamp,
		updatedAt: timestamp,
	};

	if (!db.systemAdmins) db.systemAdmins = [];
	db.systemAdmins.unshift(newAdmin);
	if (password) {
		db.passwords.set(String(newId), password);
	}

	return ok(newAdmin, { status: 201 }, "User created successfully");
}

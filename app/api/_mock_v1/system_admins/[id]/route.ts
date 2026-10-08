import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { SystemAdmin } from "@/lib/types";

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const admin = (db.systemAdmins || []).find(
		(a) => String(a.id) === String(id),
	);
	if (!admin) {
		return fail("System admin not found", "NOT_FOUND", 404);
	}

	return ok(admin, undefined, "User retrieved successfully");
}

export async function PUT(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const index = (db.systemAdmins || []).findIndex(
		(a) => String(a.id) === String(id),
	);
	if (index === -1) {
		return fail("System admin not found", "NOT_FOUND", 404);
	}

	const body = await request.json().catch(() => ({}));
	const current = db.systemAdmins[index];

	const updated: SystemAdmin = {
		...current,
		username:
			body.username !== undefined ? body.username.trim() : current.username,
		displayName:
			body.displayName !== undefined
				? body.displayName.trim()
				: current.displayName,
		email: body.email !== undefined ? body.email.trim() : current.email,
		isActive:
			body.isActive !== undefined ? Boolean(body.isActive) : current.isActive,
		adminLevel:
			body.adminLevel !== undefined ? body.adminLevel : current.adminLevel,
		notes: body.notes !== undefined ? body.notes : current.notes,
		updatedAt: now(),
	};

	if (body.password) {
		db.passwords.set(String(id), body.password);
	}

	db.systemAdmins[index] = updated;
	return ok(updated, undefined, "User updated successfully");
}

export async function DELETE(
	_request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const index = (db.systemAdmins || []).findIndex(
		(a) => String(a.id) === String(id),
	);
	if (index === -1) {
		return fail("System admin not found", "NOT_FOUND", 404);
	}

	const updated: SystemAdmin = {
		...db.systemAdmins[index],
		isActive: false,
		updatedAt: now(),
	};

	db.systemAdmins[index] = updated;
	return ok(updated, undefined, "User deactivated successfully");
}

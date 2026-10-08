import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { SystemAdmin } from "@/lib/types";

export async function PATCH(
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
		isActive: true,
		updatedAt: now(),
	};

	db.systemAdmins[index] = updated;
	return ok(updated, undefined, "User restored and activated successfully");
}

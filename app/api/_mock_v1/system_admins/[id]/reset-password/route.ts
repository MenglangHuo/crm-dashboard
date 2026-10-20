import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function POST(
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

	const tempPassword = "TempAdmin@" + Math.random().toString(36).substring(2, 8).toUpperCase() + "1!";
	db.passwords.set(String(id), tempPassword);

	return ok(
		{
			id: Number(admin.id),
			username: admin.username,
			email: admin.email,
			phoneNumber: admin.phoneNumber,
			tempPassword,
			message: "Temporary password generated successfully. Provide this temporary password to the system administrator.",
		},
		undefined,
		"Password reset successfully. A temporary password has been generated.",
	);
}

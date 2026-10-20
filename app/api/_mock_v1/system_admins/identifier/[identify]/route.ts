import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ identify: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { identify } = await context.params;
	const decoded = decodeURIComponent(identify).toLowerCase().trim();

	const admin = (db.systemAdmins || []).find(
		(a) =>
			a.username.toLowerCase() === decoded ||
			a.email.toLowerCase() === decoded ||
			(a.phoneNumber && a.phoneNumber.toLowerCase() === decoded),
	);
	if (!admin) {
		return fail("System admin not found with identifier: " + identify, "NOT_FOUND", 404);
	}

	return ok(admin, undefined, "System admin retrieved successfully");
}

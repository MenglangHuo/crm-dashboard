import { NextRequest } from "next/server";
import { db, uid } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	const email = String(body?.email ?? "")
		.trim()
		.toLowerCase();

	if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
		return fail("A valid email address is required", "VALIDATION_ERROR", 422);
	}

	const user = db.users.find((u) => u.email.toLowerCase() === email);
	// Mock backend: return the reset token directly so the flow is
	// testable without email delivery. Real backend emails a link.
	if (user) {
		const token = uid("reset");
		db.resetTokens.set(token, String(user.id));
		return ok({ resetToken: token });
	}
	// Do not leak whether the email exists.
	return ok({ resetToken: null });
}

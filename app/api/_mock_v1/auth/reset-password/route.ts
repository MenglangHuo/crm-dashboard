import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	const token = String(body?.token ?? "");
	const password = String(body?.password ?? "");

	if (password.length < 8) {
		return fail(
			"Password must be at least 8 characters",
			"VALIDATION_ERROR",
			422,
		);
	}

	const userId = db.resetTokens.get(token);
	if (!userId) {
		return fail(
			"This reset link is invalid or has expired",
			"INVALID_RESET_TOKEN",
			400,
		);
	}

	db.passwords.set(userId, password);
	db.resetTokens.delete(token);
	return ok({ reset: true });
}

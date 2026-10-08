import { NextRequest } from "next/server";
import { db, resolveProfile } from "@/lib/server/db";
import { ok, requireAuth } from "@/lib/server/api";

export async function GET() {
	const { profile, error } = await requireAuth();
	if (error) return error;
	return ok(profile);
}

export async function PATCH(request: NextRequest) {
	const { profile, error } = await requireAuth();
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	const user = db.users.find((u) => u.id === profile.id)!;
	if (typeof body.firstName === "string" && body.firstName.trim())
		user.firstName = body.firstName.trim();
	if (typeof body.lastName === "string" && body.lastName.trim())
		user.lastName = body.lastName.trim();
	if (typeof body.avatarKey === "string" || body.avatarKey === null)
		user.avatarKey = body.avatarKey;

	return ok(resolveProfile(user.id));
}

import { NextRequest } from "next/server";
import { db, resolveProfile } from "@/lib/server/db";
import {
	ok,
	fail,
	encodeToken,
	ACCESS_COOKIE,
	REFRESH_COOKIE,
} from "@/lib/server/api";

const ACCESS_TTL = 1000 * 60 * 60; // 1 hour
const REFRESH_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => null);
	const username = String(body?.identifier ?? body?.username ?? "")
		.trim()
		.toLowerCase();
	const password = String(body?.password ?? "");

	if (!username || !password) {
		return fail(
			"Username/email and password are required",
			"VALIDATION_ERROR",
			422,
		);
	}

	const user = db.users.find(
		(u) =>
			u.username.toLowerCase() === username ||
			u.email.toLowerCase() === username,
	);

	if (!user || db.passwords.get(String(user.id)) !== password) {
		return fail(
			"Invalid credentials, please check your username and password",
			"INVALID_CREDENTIALS",
			401,
		);
	}
	if (!user.active) {
		return fail("This account has been deactivated", "ACCOUNT_DISABLED", 403);
	}

	const accessToken = encodeToken({
		sub: String(user.id),
		username: user.username,
		type: "access",
		exp: Date.now() + ACCESS_TTL,
	});
	const refreshToken = encodeToken({
		sub: String(user.id),
		username: user.username,
		type: "refresh",
		exp: Date.now() + REFRESH_TTL,
	});

	const profile = resolveProfile(user.id);
	const response = ok({
		accessToken,
		refreshToken,
		tokenType: "Bearer",
		user: profile,
	});
	response.cookies.set(ACCESS_COOKIE, accessToken, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: ACCESS_TTL / 1000,
	});
	response.cookies.set(REFRESH_COOKIE, refreshToken, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: REFRESH_TTL / 1000,
	});
	return response;
}

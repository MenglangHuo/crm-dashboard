import { NextRequest } from "next/server";
import { resolveProfile } from "@/lib/server/db";
import {
	ACCESS_COOKIE,
	REFRESH_COOKIE,
	decodeToken,
	encodeToken,
	fail,
	ok,
} from "@/lib/server/api";

const ACCESS_TTL = 1000 * 60 * 60;

export async function POST(request: NextRequest) {
	const authHeader = request.headers.get("authorization");
	const bearerToken = authHeader?.startsWith("Bearer ")
		? authHeader.slice("Bearer ".length)
		: null;
	const body = await request.json().catch(() => null);
	const refreshToken =
		request.cookies.get(REFRESH_COOKIE)?.value ||
		bearerToken ||
		(typeof body?.refreshToken === "string" ? body.refreshToken : null);

	if (!refreshToken) {
		return fail("Refresh token is required", "UNAUTHORIZED", 401);
	}

	const payload = decodeToken(refreshToken);
	if (!payload || payload.type !== "refresh") {
		return fail("Refresh token is invalid or expired", "UNAUTHORIZED", 401);
	}

	const profile = resolveProfile(payload.sub);
	if (!profile || !profile.active) {
		return fail("Refresh token is invalid or expired", "UNAUTHORIZED", 401);
	}

	const accessToken = encodeToken({
		sub: payload.sub,
		username: payload.username,
		type: "access",
		exp: Date.now() + ACCESS_TTL,
	});

	const response = ok({ accessToken, token: accessToken });
	response.cookies.set(ACCESS_COOKIE, accessToken, {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		maxAge: ACCESS_TTL / 1000,
	});
	return response;
}

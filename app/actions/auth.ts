"use server";

import { cookies } from "next/headers";
import { decodeToken, encodeToken } from "@/lib/server/api";
import { resolveProfile } from "@/lib/server/db";
import { env } from "@/lib/config/env";

const ACCESS_COOKIE = "crm_access_token";
const REFRESH_COOKIE = "crm_refresh_token";
const SESSION_COOKIE = "crm_session_id";
const COMPANY_COOKIE = "crm_company_id";
const ACCESS_TTL = 1000 * 60 * 60;

type RefreshResponse = {
	accessToken?: string;
	refreshToken?: string;
	sessionId?: string;
	token?: string;
	data?: RefreshResponse;
	success?: boolean;
	company?: { id?: string | number };
};

function getApiBaseUrl() {
	return `${env.apiBackendUrl}${env.apiBaseUrl}`;
}

function unwrapRefreshResponse(
	body: RefreshResponse | null,
): RefreshResponse | null {
	if (!body) return null;
	if (body.data && typeof body.data === "object") return body.data;
	return body;
}

export async function setAuthCookies(
	accessToken: string,
	refreshToken?: string,
	companyId?: string | number,
	sessionId?: string,
) {
	const cookieStore = await cookies();

	cookieStore.set(ACCESS_COOKIE, accessToken, {
		httpOnly: false,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 7,
	});

	if (refreshToken) {
		cookieStore.set(REFRESH_COOKIE, refreshToken, {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});
	}

	if (sessionId) {
		cookieStore.set(SESSION_COOKIE, sessionId, {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});
	}

	if (companyId != null) {
		cookieStore.set(COMPANY_COOKIE, String(companyId), {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30,
		});
	}
}

export async function clearAuthCookies() {
	const cookieStore = await cookies();
	cookieStore.delete(ACCESS_COOKIE);
	cookieStore.delete(REFRESH_COOKIE);
	cookieStore.delete(SESSION_COOKIE);
	cookieStore.delete(COMPANY_COOKIE);
	cookieStore.delete("crm_is_system_admin");
}

export async function refreshAuthCookies() {
	const cookieStore = await cookies();
	const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
	if (!refreshToken) {
		await clearAuthCookies();
		return false;
	}

	const apiBaseUrl = getApiBaseUrl();

	if (apiBaseUrl) {
		try {
			const response = await fetch(`${apiBaseUrl}/auth/refresh-token`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Cookie: `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`,
				},
				body: JSON.stringify({ refreshToken }),
				cache: "no-store",
			});

			if (!response.ok) {
				await clearAuthCookies();
				return false;
			}

			const rawJson = (await response
				.json()
				.catch(() => null)) as RefreshResponse | null;
			const body = unwrapRefreshResponse(rawJson);
			const accessToken = body?.accessToken || body?.token;
			if (!accessToken) {
				await clearAuthCookies();
				return false;
			}

			const companyId =
				body?.company?.id || cookieStore.get(COMPANY_COOKIE)?.value;
			const sessionId =
				body?.sessionId || cookieStore.get(SESSION_COOKIE)?.value;
			await setAuthCookies(
				accessToken,
				body.refreshToken || refreshToken,
				companyId,
				sessionId,
			);
			return true;
		} catch {
			// Backend request error
		}
	}

	// Fallback to local token check if running in mock/offline mode
	const payload = decodeToken(refreshToken);
	if (!payload || payload.type !== "refresh") {
		await clearAuthCookies();
		return false;
	}

	const profile = resolveProfile(payload.sub);
	if (!profile || !profile.active) {
		await clearAuthCookies();
		return false;
	}

	const accessToken = encodeToken({
		sub: payload.sub,
		username: payload.username,
		type: "access",
		exp: Date.now() + ACCESS_TTL,
	});

	await setAuthCookies(accessToken, refreshToken);
	return true;
}

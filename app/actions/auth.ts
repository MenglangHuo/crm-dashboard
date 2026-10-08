"use server";

import { cookies } from "next/headers";
import { decodeToken, encodeToken } from "@/lib/server/api";
import { resolveProfile } from "@/lib/server/db";

const ACCESS_COOKIE = "rumluos_access_token";
const REFRESH_COOKIE = "rumluos_refresh_token";
const COMPANY_COOKIE = "rumluos_company_id";
const ACCESS_TTL = 1000 * 60 * 60;

type RefreshResponse = {
	accessToken?: string;
	refreshToken?: string;
	token?: string;
	data?: RefreshResponse;
	success?: boolean;
	company?: { id?: string | number };
};

function getApiBaseUrl() {
	const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
	if (rawBaseUrl.startsWith("http://") || rawBaseUrl.startsWith("https://")) {
		return rawBaseUrl.replace(/\/+$/, "");
	}
	const raw =
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.NEXT_PUBLIC_API_ENDPOINT ||
		process.env.NEXT_PUBLIC_API_ENPOINT ||
		process.env.CRM_URL ||
		"https://crmapi.bronxtechnology.site";

	let origin = (raw || "https://crmapi.bronxtechnology.site").trim();
	if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
		origin = origin.includes("localhost") ? `http://${origin}` : `https://${origin}`;
	}
	if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && origin.includes("localhost")) {
		origin = "https://crmapi.bronxtechnology.site";
	}
	origin = origin.replace(/\/+(api(\/v1)?)?\/?$/, "");
	const cleanBaseUrl = rawBaseUrl.startsWith("/") ? rawBaseUrl : `/${rawBaseUrl}`;
	return `${origin}${cleanBaseUrl}`;
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
	cookieStore.delete(COMPANY_COOKIE);
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
			await setAuthCookies(
				accessToken,
				body.refreshToken || refreshToken,
				companyId,
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

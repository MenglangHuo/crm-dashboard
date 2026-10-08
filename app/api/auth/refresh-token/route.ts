import { NextRequest, NextResponse } from "next/server";
import { decodeToken, encodeToken } from "@/lib/server/api";
import { resolveProfile } from "@/lib/server/db";

const ACCESS_COOKIE = "rumluos_access_token";
const REFRESH_COOKIE = "rumluos_refresh_token";
const COMPANY_COOKIE = "rumluos_company_id";
const ACCESS_TTL = 1000 * 60 * 60; // 1 hour

function getBackendRefreshUrls(): string[] {
	const backendUrl =
		process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:8091";
	const cleanBackend = backendUrl.endsWith("/")
		? backendUrl.slice(0, -1)
		: backendUrl;
	const apiEndpoint = process.env.NEXT_PUBLIC_API_ENPOINT;
	const cleanEndpoint = apiEndpoint
		? apiEndpoint.startsWith("http")
			? apiEndpoint
			: `http://${apiEndpoint}`
		: null;

	const roots = [cleanBackend, ...(cleanEndpoint ? [cleanEndpoint] : [])];
	const paths = [
		"/api/v1/auth/refresh-token",
		"/api/auth/refresh-token",
		"/v1/auth/refresh-token",
		"/auth/refresh-token",
	];

	const urls: string[] = [];
	for (const root of roots) {
		for (const p of paths) {
			urls.push(`${root}${p}`);
		}
	}
	return urls;
}

export async function POST(request: NextRequest) {
	try {
		const authHeader = request.headers.get("authorization");
		const bearerToken = authHeader?.startsWith("Bearer ")
			? authHeader.slice("Bearer ".length).trim()
			: null;
		const body = await request.json().catch(() => null);

		const refreshToken =
			body?.refreshToken ||
			request.cookies.get(REFRESH_COOKIE)?.value ||
			bearerToken;

		if (
			!refreshToken ||
			typeof refreshToken !== "string" ||
			!refreshToken.trim()
		) {
			const res = NextResponse.json(
				{
					success: false,
					message: "Refresh token is required",
					error: "REFRESH_TOKEN_REQUIRED",
				},
				{ status: 401 },
			);
			res.cookies.delete(ACCESS_COOKIE);
			res.cookies.delete(REFRESH_COOKIE);
			return res;
		}

		// 1. Attempt to refresh with backend Spring Boot server candidates
		const candidateUrls = getBackendRefreshUrls();
		let backendSuccess = false;
		let newAccessToken = "";
		let newRefreshToken = refreshToken;
		let companyData: any = null;

		for (const backendRefreshUrl of candidateUrls) {
			try {
				const backendResponse = await fetch(backendRefreshUrl, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Cookie: `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}`,
					},
					body: JSON.stringify({ refreshToken }),
					cache: "no-store",
				});

				if (backendResponse.ok) {
					const data = await backendResponse.json().catch(() => null);
					const payload = data?.data || data;
					newAccessToken = payload?.accessToken || payload?.token || "";
					newRefreshToken = payload?.refreshToken || refreshToken;
					companyData = payload?.company || null;
					if (newAccessToken) {
						backendSuccess = true;
						break;
					}
				}
			} catch {
				// Try next candidate URL
			}
		}

		// 2. Fallback to mock decode token verification if mock mode was used
		if (!backendSuccess) {
			const payload = decodeToken(refreshToken);
			if (payload && payload.type === "refresh") {
				const profile = resolveProfile(payload.sub);
				if (profile && profile.active) {
					newAccessToken = encodeToken({
						sub: payload.sub,
						username: payload.username,
						type: "access",
						exp: Date.now() + ACCESS_TTL,
					});
					backendSuccess = true;
				}
			}
		}

		// 3. If refresh token is expired or invalid in both backend & local:
		if (!backendSuccess || !newAccessToken) {
			const response = NextResponse.json(
				{
					success: false,
					message:
						"Refresh token has expired or is invalid. Please sign in again.",
					error: "REFRESH_TOKEN_EXPIRED",
				},
				{ status: 401 },
			);
			response.cookies.delete(ACCESS_COOKIE);
			response.cookies.delete(REFRESH_COOKIE);
			response.cookies.delete(COMPANY_COOKIE);
			return response;
		}

		// 4. Successfully refreshed tokens
		const response = NextResponse.json({
			success: true,
			message: "Token refreshed successfully",
			data: {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
				token: newAccessToken,
				company: companyData,
			},
		});

		// Set Access Token Cookie (accessible by browser client and SSR)
		response.cookies.set(ACCESS_COOKIE, newAccessToken, {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});

		// Set Refresh Token Cookie
		if (newRefreshToken) {
			response.cookies.set(REFRESH_COOKIE, newRefreshToken, {
				httpOnly: false,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60 * 24 * 30,
			});
		}

		if (companyData?.id) {
			response.cookies.set(COMPANY_COOKIE, String(companyData.id), {
				httpOnly: false,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				maxAge: 60 * 60 * 24 * 30,
			});
		}

		return response;
	} catch (error: any) {
		const res = NextResponse.json(
			{
				success: false,
				message: error?.message || "Failed to refresh token",
				error: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 },
		);
		return res;
	}
}

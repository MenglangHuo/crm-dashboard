// ============================================================
// Axios API client with unified response unwrapping & token refresh.
// Success responses resolve to `.data` directly; error
// responses throw ApiError carrying `.message` and `.error`.
// When accessToken expires, calls /api/auth/refresh-token to
// get a new accessToken. If refreshToken is also expired,
// clears session and redirects to the login/sign-in page.
// ============================================================

import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { refreshAuthCookies } from "@/app/actions/auth";
import type { ApiResponse } from "@/lib/types";

export class ApiError extends Error {
	code: string;
	status: number;

	constructor(message: string, code: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.code = code;
		this.status = status;
	}
}

function getBaseUrl(): string {
	const customEndpoint =
		(process.env.NEXT_PUBLIC_API_ENDPOINT &&
			process.env.NEXT_PUBLIC_API_ENDPOINT.trim()) ||
		(process.env.NEXT_PUBLIC_API_ENPOINT &&
			process.env.NEXT_PUBLIC_API_ENPOINT.trim()) ||
		"";
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";

	if (typeof window !== "undefined") {
		// In the browser, use relative path (/api/v1) by default so requests are same-origin
		// and Next.js rewrites proxy them to the backend server without browser CORS / strict-origin errors.
		if (customEndpoint) {
			return customEndpoint.startsWith("http")
				? `${customEndpoint}${apiBaseUrl}`
				: `http://${customEndpoint}${apiBaseUrl}`;
		}
		return apiBaseUrl;
	}

	// On the server side (SSR / Node.js runtime), absolute URL is required
	if (customEndpoint) {
		return customEndpoint.startsWith("http")
			? `${customEndpoint}${apiBaseUrl}`
			: `http://${customEndpoint}${apiBaseUrl}`;
	}
	const backendUrl =
		process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:8091";
	return backendUrl.startsWith("http")
		? `${backendUrl}${apiBaseUrl}`
		: `http://${backendUrl}${apiBaseUrl}`;
}

const constructedBaseUrl = getBaseUrl();

type RetryableRequestConfig = InternalAxiosRequestConfig & {
	_retry?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

function readCookie(name: string): string | null {
	if (typeof window === "undefined") return null;
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = document.cookie.match(
		new RegExp(`(?:^|; )${escapedName}=([^;]*)`),
	);
	return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds = 604800) {
	if (typeof window === "undefined") return;
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function deleteCookie(name: string) {
	if (typeof window === "undefined") return;
	document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function clearClientSession() {
	if (typeof window === "undefined") return;
	deleteCookie("rumluos_access_token");
	deleteCookie("rumluos_refresh_token");
	deleteCookie("rumluos_company_id");
	deleteCookie("rumluos_is_system_admin");
	try {
		localStorage.removeItem("rumluos_access_token");
		localStorage.removeItem("rumluos_refresh_token");
		localStorage.removeItem("rumluos_company_id");
		localStorage.removeItem("rumluos_is_system_admin");
	} catch {}
}

/**
 * Executes token refresh via POST /api/auth/refresh-token and candidate endpoints.
 * Returns true if new accessToken was obtained; false if refreshToken is expired or invalid.
 */
async function performRefreshToken(): Promise<boolean> {
	if (typeof window === "undefined") return false;

	let refreshToken = readCookie("rumluos_refresh_token");
	if (!refreshToken) {
		try {
			refreshToken = localStorage.getItem("rumluos_refresh_token");
		} catch {}
	}

	// If no refresh token exists at all, immediately clear session
	if (!refreshToken || !refreshToken.trim()) {
		clearClientSession();
		return false;
	}

	// 1. Call candidate API endpoints
	const endpoints = ["/api/auth/refresh-token", "/api/v1/auth/refresh-token"];

	for (const ep of endpoints) {
		try {
			const res = await fetch(ep, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ refreshToken }),
				credentials: "include",
			});

			if (res.ok) {
				const json = await res.json().catch(() => null);
				const payload = json?.data || json;
				const newAccessToken = payload?.accessToken || payload?.token;
				const newRefreshToken = payload?.refreshToken || refreshToken;
				const companyId = payload?.company?.id;

				if (newAccessToken) {
					writeCookie("rumluos_access_token", newAccessToken, 604800); // 7 days
					if (newRefreshToken) {
						writeCookie("rumluos_refresh_token", newRefreshToken, 2592000); // 30 days
					}
					if (companyId != null) {
						writeCookie("rumluos_company_id", String(companyId), 2592000);
					}

					try {
						localStorage.setItem("rumluos_access_token", newAccessToken);
						if (newRefreshToken) {
							localStorage.setItem("rumluos_refresh_token", newRefreshToken);
						}
						if (companyId != null) {
							localStorage.setItem("rumluos_company_id", String(companyId));
						}
					} catch {}

					return true;
				}
			}
		} catch {
			// Network or fetch error, try next candidate
		}
	}

	// 2. Fallback to Server Action refreshAuthCookies()
	try {
		const success = await refreshAuthCookies();
		if (success) {
			return true;
		}
	} catch {
		// Server action error
	}

	// 3. Refresh token has also expired or is invalid
	clearClientSession();
	return false;
}

function getRefreshRequest(): Promise<boolean> {
	if (!refreshPromise) {
		refreshPromise = performRefreshToken().finally(() => {
			refreshPromise = null;
		});
	}
	return refreshPromise;
}

export const api = axios.create({
	baseURL: constructedBaseUrl,
	timeout: process.env.NEXT_PUBLIC_API_TIMEOUT
		? parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT, 10)
		: 15000,
	withCredentials: true,
	headers: { "Content-Type": "application/json" },
});

// Attach Authorization header if access token cookie is set, X-Company-Id header, and companyId to request params
api.interceptors.request.use((config) => {
	if (typeof window !== "undefined") {
		const token = readCookie("rumluos_access_token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		const companyId =
			readCookie("rumluos_company_id") ||
			localStorage.getItem("rumluos_company_id");
		const isSystemAdmin =
			readCookie("rumluos_is_system_admin") === "true" ||
			localStorage.getItem("rumluos_is_system_admin") === "true";

		if (companyId) {
			config.headers["X-Company-Id"] = companyId;

			// Enhance tenant API requests with companyId query parameter
			const isAuth = Boolean(
				config.url &&
					(config.url.includes("/auth/") || config.url.startsWith("auth/")),
			);
			if (!isAuth) {
				config.params = config.params || {};
				if (!config.params.companyId && !config.url?.includes("companyId=")) {
					config.params.companyId = companyId;
				}
			}
		}
	}
	return config;
});

// Unwrap `{ success, data }` for successes; handle 401 token refresh and redirect on errors.
api.interceptors.response.use(
	(response) => {
		const body = response.data as ApiResponse<unknown>;
		if (body && typeof body === "object" && "success" in body) {
			if (body.success) {
				response.data = body.data;
				return response;
			}
			throw new ApiError(body.message, body.error, response.status);
		}
		return response;
	},
	async (error: AxiosError) => {
		const originalRequest = error.config as RetryableRequestConfig | undefined;
		const isUnauthorized = error.response?.status === 401;
		const requestUrl = originalRequest?.url ?? "";
		const currentPath =
			typeof window !== "undefined" ? window.location.pathname : "";
		const isAuthPage =
			currentPath.startsWith("/sign-in") ||
			currentPath.startsWith("/forgot-password") ||
			currentPath.startsWith("/reset-password") ||
			currentPath.startsWith("/register-company");

		const isAuthRequest =
			requestUrl.includes("/auth/login") ||
			requestUrl.includes("/auth/sign-in") ||
			requestUrl.includes("/auth/refresh-token") ||
			requestUrl.includes("/auth/logout");

		if (
			typeof window !== "undefined" &&
			isUnauthorized &&
			originalRequest &&
			!originalRequest._retry &&
			!isAuthRequest &&
			!isAuthPage
		) {
			originalRequest._retry = true;

			// Try refreshing the accessToken using candidate endpoints
			const refreshed = await getRefreshRequest();

			if (refreshed) {
				const token =
					readCookie("rumluos_access_token") ||
					localStorage.getItem("rumluos_access_token");
				if (token) {
					originalRequest.headers.Authorization = `Bearer ${token}`;
				}
				return api(originalRequest);
			}

			// If refreshToken is also expired or invalid: Clear session & Redirect to login page
			clearClientSession();
			if (!isAuthPage) {
				const from =
					currentPath && currentPath !== "/"
						? `${window.location.pathname}${window.location.search}`
						: "";
				const cleanFrom = from.startsWith("/sign-in") ? "" : from;
				window.location.assign(
					`/sign-in${cleanFrom ? `?from=${encodeURIComponent(cleanFrom)}` : ""}`,
				);
			}

			throw new ApiError(
				"Session expired. Please sign in again.",
				"UNAUTHORIZED",
				401,
			);
		}

		const body = error.response?.data as any;
		if (body && typeof body === "object") {
			const msg =
				body.message ||
				body.error ||
				(typeof body.data === "string" ? body.data : undefined);
			if (msg) {
				throw new ApiError(
					msg,
					body.error || body.code || "REQUEST_FAILED",
					error.response?.status ?? 500,
				);
			}
		}
		throw new ApiError(
			error.message || "Network error, please try again",
			"NETWORK_ERROR",
			error.response?.status ?? 0,
		);
	},
);

export function getErrorMessage(error: unknown) {
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error) {
		const axErr = error as AxiosError<any>;
		if (axErr.response?.data) {
			const data = axErr.response.data;
			if (typeof data === "string") return data;
			if (data.message) return data.message;
			if (data.error) return data.error;
		}
		return error.message;
	}
	if (typeof error === "string") return error;
	return "Something went wrong, please try again";
}

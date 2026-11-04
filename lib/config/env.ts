/**
 * Centralized, validated environment configuration.
 * Single source of truth for runtime variables across Client and Server.
 */

import packageJson from "@/package.json";

export type AppEnvironment = "development" | "production" | "test";

export const DEFAULT_PRODUCTION_BACKEND_URL = "https://crmapi.bronxtechnology.site";
export const DEFAULT_DEVELOPMENT_BACKEND_URL = "http://localhost:8091";

function normalizeBackendUrl(rawUrl?: string): string {
	const raw = (
		rawUrl ||
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.API_BACKEND_URL ||
		process.env.BACKEND_URL ||
		""
	).trim();

	if (!raw) {
		return process.env.NODE_ENV === "production"
			? DEFAULT_PRODUCTION_BACKEND_URL
			: DEFAULT_DEVELOPMENT_BACKEND_URL;
	}

	let url = raw;
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url =
			url.includes("localhost") || url.includes("127.0.0.1")
				? `http://${url}`
				: `https://${url}`;
	}

	return url.replace(/\/+(api(\/v1)?)?\/?$/, "");
}

export const env = {
	// Mode flags
	isDev: process.env.NODE_ENV === "development",
	isProd: process.env.NODE_ENV === "production",
	isTest: process.env.NODE_ENV === "test",
	nodeEnv: (process.env.NODE_ENV || "development") as AppEnvironment,
	appEnv: (process.env.NEXT_PUBLIC_APP_ENV ||
		process.env.NODE_ENV ||
		"development") as AppEnvironment,

	// App Version (dynamically tracked from package.json with hot reload support)
	appVersion: packageJson.version || "1.0.0",

	// Real resolved backend URL (Single Source of Truth from NEXT_PUBLIC_API_BACKEND_URL)
	apiBackendUrl: normalizeBackendUrl(process.env.NEXT_PUBLIC_API_BACKEND_URL),
	apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1",
	apiTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 15000,
	isDirectApi: process.env.NEXT_PUBLIC_USE_DIRECT_API === "true",

	// TLS & Certificate Bypass (strictly active only in development)
	allowInsecureTls: process.env.NODE_ENV === "development",

	// Debugging & Logging
	enableDebugLogs:
		process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === "true" ||
		process.env.NODE_ENV === "development",
} as const;

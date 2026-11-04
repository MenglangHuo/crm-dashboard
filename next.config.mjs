// In local development, bypass certificate verification so devs can test against any backend without SSL blocks
if (process.env.NODE_ENV === "development") {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const DEFAULT_PRODUCTION_BACKEND_URL = "https://crmapi.bronxtechnology.site";
const DEFAULT_DEVELOPMENT_BACKEND_URL = "http://localhost:8091";

function resolveBackendUrl() {
	let raw = (
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.API_BACKEND_URL ||
		process.env.BACKEND_URL ||
		""
	).trim();

	if (!raw) {
		raw =
			process.env.NODE_ENV === "production"
				? DEFAULT_PRODUCTION_BACKEND_URL
				: DEFAULT_DEVELOPMENT_BACKEND_URL;
	}
	if (!raw) return "";

	let url = raw;
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url =
			url.includes("localhost") || url.includes("127.0.0.1")
				? `http://${url}`
				: `https://${url}`;
	}
	// Strip trailing slashes and any trailing /api/v1 or /api
	return url.replace(/\/+(api(\/v1)?)?\/?$/, "");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ["lucide-react", "@tanstack/react-query"],
	},
	images: {
		unoptimized: true,
	},
	async rewrites() {
		const apiBackend = resolveBackendUrl();
		if (!apiBackend) return [];

		const rules = [
			{
				// Proxy all /api/v1/* calls to the Spring Boot backend
				source: "/api/v1/:path*",
				destination: `${apiBackend}/api/v1/:path*`,
			},
			{
				// Proxy /api/auth/* calls to the Spring Boot backend
				source: "/api/auth/:path*",
				destination: `${apiBackend}/api/auth/:path*`,
			},
			{
				// Proxy /api/public/* calls to the Spring Boot backend
				source: "/api/public/:path*",
				destination: `${apiBackend}/api/public/:path*`,
			},
		];
		return {
			fallback: rules,
		};
	},
};

export default nextConfig;

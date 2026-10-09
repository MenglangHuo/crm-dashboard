function resolveBackendUrl() {
	const raw =
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.NEXT_PUBLIC_API_ENDPOINT ||
		process.env.NEXT_PUBLIC_API_ENPOINT ||
		process.env.CRM_URL ||
		"https://crmapi.bronxtechnology.site";

	let url = (raw || "https://crmapi.bronxtechnology.site").trim();
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url = url.includes("localhost") ? `http://${url}` : `https://${url}`;
	}
	// On Vercel / production, localhost is unreachable and rejected by Vercel edge proxy
	if ((process.env.NODE_ENV === "production" || process.env.VERCEL) && url.includes("localhost")) {
		url = "https://crmapi.bronxtechnology.site";
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
			beforeFiles: rules,
			afterFiles: rules,
			fallback: rules,
		};
	},
};

export default nextConfig;

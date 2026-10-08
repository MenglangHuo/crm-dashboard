function resolveBackendUrl() {
	const raw =
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.NEXT_PUBLIC_API_ENDPOINT ||
		process.env.NEXT_PUBLIC_API_ENPOINT ||
		process.env.CRM_URL ||
		"http://localhost:8091";

	let url = raw.trim();
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		url = url.includes("localhost") ? `http://${url}` : `https://${url}`;
	}
	// Strip trailing slashes and any trailing /api/v1 or /api
	return url.replace(/\/+(api(\/v1)?)?\/?$/, "");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	async rewrites() {
		const apiBackend = resolveBackendUrl();
		return [
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
	},
};

export default nextConfig;

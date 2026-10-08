/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	async rewrites() {
		const apiBackend =
			process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:8091";
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

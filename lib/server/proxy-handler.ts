import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies Next.js API requests to the real backend server.
 * Ensures headers, authentication tokens, query parameters, and request body
 * are faithfully forwarded without local mock database interference or stale caching.
 */
export async function proxyToBackend(req: NextRequest) {
	let backendBase =
		process.env.NEXT_PUBLIC_API_BACKEND_URL ||
		process.env.CRM_URL ||
		(process.env.NEXT_PUBLIC_API_ENDPOINT
			? process.env.NEXT_PUBLIC_API_ENDPOINT.startsWith("http")
				? process.env.NEXT_PUBLIC_API_ENDPOINT
				: `http://${process.env.NEXT_PUBLIC_API_ENDPOINT}`
			: process.env.NEXT_PUBLIC_API_ENPOINT
				? process.env.NEXT_PUBLIC_API_ENPOINT.startsWith("http")
					? process.env.NEXT_PUBLIC_API_ENPOINT
					: `http://${process.env.NEXT_PUBLIC_API_ENPOINT}`
				: "http://localhost:8091");

	const url = new URL(req.url);

	// Guard against self-proxying: if backendBase is configured to the same host & port as this Next.js server
	if (backendBase.includes(`:${url.port}`) || backendBase === url.origin) {
		backendBase = process.env.NEXT_PUBLIC_API_BACKEND_URL || "http://localhost:8091";
	}

	let cleanBackendBase = backendBase.trim().replace(/\/+$/, "");
	cleanBackendBase = cleanBackendBase.replace(/\/+(api(\/v1)?)?\/?$/, "");
	if (!cleanBackendBase.startsWith("http://") && !cleanBackendBase.startsWith("https://")) {
		cleanBackendBase = cleanBackendBase.includes("localhost")
			? `http://${cleanBackendBase}`
			: `https://${cleanBackendBase}`;
	}
	const targetUrl = `${cleanBackendBase}${url.pathname}${url.search}`;

	const headers = new Headers(req.headers);
	headers.delete("host");
	headers.delete("connection");
	headers.delete("content-length");

	const method = req.method;
	let body: BodyInit | undefined = undefined;

	if (method !== "GET" && method !== "HEAD") {
		try {
			body = await req.arrayBuffer();
		} catch {
			body = undefined;
		}
	}

	try {
		const res = await fetch(targetUrl, {
			method,
			headers,
			body,
			cache: "no-store",
		});

		const resHeaders = new Headers(res.headers);
		// Remove encoding headers that fetch handles automatically
		resHeaders.delete("content-encoding");
		resHeaders.delete("content-length");

		const responseBody = await res.arrayBuffer();

		return new NextResponse(responseBody, {
			status: res.status,
			statusText: res.statusText,
			headers: resHeaders,
		});
	} catch (err: any) {
		return NextResponse.json(
			{
				success: false,
				message: `Failed to connect to backend server at ${targetUrl}: ${err.message}`,
				error: "BACKEND_CONNECTION_ERROR",
			},
			{ status: 502 },
		);
	}
}

export const handleAll = proxyToBackend;

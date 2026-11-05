import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { getFetchOptions } from "@/lib/server/fetch-agent";

// Enable TLS bypass if configured
if (env.allowInsecureTls) {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

/**
 * Proxies Next.js API requests to the real backend server.
 * Ensures headers, authentication tokens, query parameters, and request body
 * are faithfully forwarded without local mock database interference or stale caching.
 */
export async function proxyToBackend(req: NextRequest) {
	let backendBase =
		env.apiBackendUrl ||
		(process.env.NODE_ENV === "production"
			? "https://crmapi.bronxtechnology.site"
			: "http://localhost:8091");

	const url = new URL(req.url);

	// Guard against missing backend configuration
	if (!backendBase) {
		return NextResponse.json(
			{
				success: false,
				message:
					"NEXT_PUBLIC_API_BACKEND_URL is not configured in environment.",
				error: "BACKEND_NOT_CONFIGURED",
			},
			{ status: 500 },
		);
	}

	let isSelfProxy = false;
	try {
		const targetParsed = new URL(backendBase);
		isSelfProxy =
			targetParsed.host === url.host ||
			(Boolean(url.port) && backendBase.includes(`:${url.port}`)) ||
			backendBase === url.origin;
	} catch {
		isSelfProxy =
			(Boolean(url.port) && backendBase.includes(`:${url.port}`)) ||
			backendBase === url.origin;
	}

	if (isSelfProxy) {
		return NextResponse.json(
			{
				success: false,
				message: `Misconfigured NEXT_PUBLIC_API_BACKEND_URL: points to Next.js server itself (${url.origin}). Set it to your backend API server.`,
				error: "SELF_PROXY_LOOP_PREVENTED",
			},
			{ status: 500 },
		);
	}

	const targetUrl = `${backendBase}${url.pathname}${url.search}`;

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
		const res = await fetch(
			targetUrl,
			getFetchOptions({
				method,
				headers,
				body,
				cache: "no-store",
			}),
		);

		const resHeaders = new Headers(res.headers);
		// Remove encoding headers that fetch handles automatically
		resHeaders.delete("content-encoding");
		resHeaders.delete("content-length");
		// Ensure API responses are never cached by the browser or intermediate proxies
		resHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
		resHeaders.set("Pragma", "no-cache");
		resHeaders.set("Expires", "0");

		const responseBody = await res.arrayBuffer();

		return new NextResponse(responseBody, {
			status: res.status,
			statusText: res.statusText,
			headers: resHeaders,
		});
	} catch (err: any) {
		console.error(`[proxyToBackend] Failed to connect to ${targetUrl}:`, err);
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

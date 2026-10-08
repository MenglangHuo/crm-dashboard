import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE = "rumluos_access_token";
const REFRESH_COOKIE = "rumluos_refresh_token";
const AUTH_PAGES = [
	"/sign-in",
	"/forgot-password",
	"/reset-password",
	"/register-company",
];

function isValidToken(token?: string): boolean {
	if (!token || typeof token !== "string" || !token.trim()) return false;
	try {
		const parts = token.split(".");
		if (parts.length === 3) {
			const rawBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
			const base64 = rawBase64.padEnd(
				rawBase64.length + ((4 - (rawBase64.length % 4)) % 4),
				"=",
			);
			const json = atob(base64);
			const payload = JSON.parse(json);
			if (payload.exp && typeof payload.exp === "number") {
				const expiresAt =
					payload.exp < 10_000_000_000 ? payload.exp * 1000 : payload.exp;
				if (expiresAt < Date.now()) return false;
			}
		}
		return true;
	} catch {
		return token.length > 5;
	}
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Never redirect Next.js Server Actions or POST requests in middleware
	if (request.headers.has("next-action") || request.method === "POST") {
		return NextResponse.next();
	}

	const token = request.cookies.get(ACCESS_COOKIE)?.value;
	const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
	const hasSession = isValidToken(token) || isValidToken(refreshToken);
	const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

	if (!hasSession && !isAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/sign-in";
		url.searchParams.set("from", pathname);
		return NextResponse.redirect(url);
	}
	if (hasSession && isAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		url.search = "";
		return NextResponse.redirect(url);
	}
	return NextResponse.next();
}

export const config = {
	// Protect all pages; skip API routes, static assets, and files.
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

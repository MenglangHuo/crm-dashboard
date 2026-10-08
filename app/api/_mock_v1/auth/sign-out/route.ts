import { ok, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/api";

export async function POST() {
	const response = ok({ signedOut: true });
	response.cookies.set(ACCESS_COOKIE, "", {
		httpOnly: true,
		path: "/",
		maxAge: 0,
	});
	response.cookies.set(REFRESH_COOKIE, "", {
		httpOnly: true,
		path: "/",
		maxAge: 0,
	});
	return response;
}

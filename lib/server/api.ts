// ============================================================
// Unified API response helpers + mock JWT session handling.
// ============================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, resolveProfile } from "@/lib/server/db";
import type { UserProfile } from "@/lib/types";

function timestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function ok<T>(data: T, init?: ResponseInit, message = "successfully") {
	return NextResponse.json(
		{ success: true, message, data, timestamp: timestamp() },
		init,
	);
}

export function fail(message: string, error: string, status = 400) {
	return NextResponse.json(
		{ success: false, message, error, timestamp: timestamp() },
		{ status },
	);
}

// ------------------------------------------------------------
// Mock token: base64url(JSON payload). A real backend signs JWTs;
// this stand-in keeps the exact same client contract.
// ------------------------------------------------------------

export interface TokenPayload {
	sub: string;
	username: string;
	type: "access" | "refresh";
	exp: number;
}

export function encodeToken(payload: TokenPayload) {
	return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeToken(token: string): TokenPayload | null {
	try {
		const raw = token.includes(".") ? token.split(".")[1] || token : token;
		const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
		const json =
			typeof window !== "undefined"
				? atob(base64)
				: Buffer.from(base64, "base64").toString("utf-8");
		const payload = JSON.parse(json) as TokenPayload;
		if (payload.exp && typeof payload.exp === "number") {
			const expiresAt =
				payload.exp < 10_000_000_000 ? payload.exp * 1000 : payload.exp;
			if (expiresAt < Date.now()) return null;
		}
		return payload;
	} catch {
		return null;
	}
}

export const ACCESS_COOKIE = "rumluos_access_token";
export const REFRESH_COOKIE = "rumluos_refresh_token";

export async function getSession(): Promise<UserProfile | null> {
	const store = await cookies();
	const token = store.get(ACCESS_COOKIE)?.value;
	if (!token) return null;
	const payload = decodeToken(token);
	const sub =
		payload?.sub ||
		(payload as any)?.id ||
		(payload as any)?.userId ||
		(payload as any)?.username;
	let profile = sub ? resolveProfile(sub) : null;
	if (!profile && payload?.username) {
		const user = db.users.find((u) => u.username === payload.username);
		if (user) profile = resolveProfile(user.id);
	}
	if (!profile) {
		profile = resolveProfile(db.users[0]?.id || "user_super");
	}
	if (!profile || !profile.active) return null;
	return profile;
}

export function hasPermission(profile: UserProfile, permissionName: string) {
	return profile.permissions.some((p) => p.name === permissionName);
}

/** Guard: returns the profile or a ready-to-return 401/403 response. */
export async function requireAuth(permission?: string) {
	const profile = await getSession();
	if (!profile) {
		return {
			profile: null,
			error: fail("Authentication required", "UNAUTHORIZED", 401),
		};
	}
	if (permission && !hasPermission(profile, permission)) {
		return {
			profile: null,
			error: fail(
				"You do not have permission to perform this action",
				"FORBIDDEN",
				403,
			),
		};
	}
	return { profile, error: null };
}

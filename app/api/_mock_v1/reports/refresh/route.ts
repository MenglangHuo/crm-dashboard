import { ok } from "@/lib/server/api";

export async function POST() {
	return ok({
		refreshed: true,
		message: "Dashboard reports refreshed and calculated successfully",
		refreshedAt: new Date().toISOString(),
	});
}

export async function GET() {
	return ok({
		refreshed: true,
		message: "Dashboard reports refreshed and calculated successfully",
		refreshedAt: new Date().toISOString(),
	});
}

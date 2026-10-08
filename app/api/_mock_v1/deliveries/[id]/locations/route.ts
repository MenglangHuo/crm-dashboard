import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

function formatIsoTimestamp() {
	return new Date().toISOString();
}

export async function PATCH(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const body = await request.json().catch(() => ({}));

	if (!Array.isArray(db.deliveries)) {
		db.deliveries = [];
	}

	const index = db.deliveries.findIndex((d: any) => String(d.id) === String(id));
	if (index === -1) {
		return fail("Delivery partner not found", "NOT_FOUND", 404);
	}

	if (body.lat === undefined || body.lat === null || body.lng === undefined || body.lng === null) {
		return fail("Both latitude and longitude must be provided", "BAD_REQUEST", 400);
	}

	const existing = db.deliveries[index];
	const updated = {
		...existing,
		lat: Number(body.lat),
		lng: Number(body.lng),
		updatedAt: formatIsoTimestamp(),
	};

	db.deliveries[index] = updated;
	return ok(updated);
}

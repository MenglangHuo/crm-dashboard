import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { Delivery } from "@/lib/types";

function formatIsoTimestamp() {
	return new Date().toISOString();
}

export async function PATCH(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const index = db.deliveries.findIndex((d) => String(d.id) === String(id));

	if (index === -1) {
		return fail("Delivery not found", "NOT_FOUND", 404);
	}

	const updated: Delivery = {
		...db.deliveries[index],
		status: "Active",
		isActive: true,
		updatedAt: formatIsoTimestamp(),
	};

	db.deliveries[index] = updated;
	return ok(updated, {}, "Delivery restored successfully");
}

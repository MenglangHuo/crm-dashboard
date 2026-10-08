import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import { resolveDeliveryProvinces } from "@/lib/data/provinces";
import type { Delivery } from "@/lib/types";

function formatIsoTimestamp() {
	return new Date().toISOString();
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const delivery = db.deliveries.find((d) => String(d.id) === String(id));

	if (!delivery) {
		return fail("Delivery not found", "NOT_FOUND", 404);
	}

	return ok(delivery);
}

export async function PUT(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const { id } = await context.params;
	const index = db.deliveries.findIndex((d) => String(d.id) === String(id));

	if (index === -1) {
		return fail("Delivery not found", "NOT_FOUND", 404);
	}

	const body = await request.json().catch(() => ({}));
	const existing = db.deliveries[index];

	const provinceCodes: string[] = Array.isArray(body.provinceCodes)
		? body.provinceCodes
		: existing.provinceCodes || [];
	const primaryProvinceCode: string =
		body.primaryProvinceCode ||
		existing.primaryProvinceCode ||
		(provinceCodes.length > 0 ? provinceCodes[0] : "12");

	const { primaryProvince, provinces } = resolveDeliveryProvinces(
		primaryProvinceCode,
		provinceCodes,
	);

	const updatedDelivery: Delivery = {
		...existing,
		name: body.name !== undefined ? String(body.name).trim() : existing.name,
		code: body.code !== undefined ? String(body.code).trim() : existing.code,
		deliveryType:
			body.deliveryType !== undefined
				? String(body.deliveryType).trim().toUpperCase()
				: existing.deliveryType,
		driverName:
			body.driverName !== undefined
				? String(body.driverName).trim()
				: existing.driverName,
		primaryPhone:
			body.primaryPhone !== undefined
				? String(body.primaryPhone).trim()
				: existing.primaryPhone,
		secondaryPhone:
			body.secondaryPhone !== undefined
				? String(body.secondaryPhone).trim()
				: existing.secondaryPhone,
		vehicleNumber:
			body.vehicleNumber !== undefined
				? String(body.vehicleNumber).trim()
				: existing.vehicleNumber,
		description:
			body.description !== undefined
				? String(body.description).trim()
				: existing.description,
		primaryProvinceCode,
		primaryProvince,
		provinceCodes,
		provinces,
		status: body.status !== undefined ? body.status : existing.status,
		isActive:
			body.status !== undefined ? body.status === "Active" : existing.isActive,
		updatedAt: formatIsoTimestamp(),
		lat:
			body.lat !== undefined
				? (body.lat !== null ? Number(body.lat) : null)
				: (existing.lat ?? null),
		lng:
			body.lng !== undefined
				? (body.lng !== null ? Number(body.lng) : null)
				: (existing.lng ?? null),
	};

	db.deliveries[index] = updatedDelivery;
	return ok(updatedDelivery);
}

export async function DELETE(
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
		status: "Inactive",
		isActive: false,
		updatedAt: formatIsoTimestamp(),
	};

	db.deliveries[index] = updated;
	return ok(updated, {}, "Delivery inactivated successfully");
}

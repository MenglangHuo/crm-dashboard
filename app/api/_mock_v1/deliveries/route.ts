import { db, paginate } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import { resolveDeliveryProvinces } from "@/lib/data/provinces";
import type { Delivery } from "@/lib/types";

function formatIsoTimestamp() {
	return new Date().toISOString();
}

export async function GET(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.deliveries)) {
		db.deliveries = [];
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const search = url.searchParams.get("search") ?? undefined;

	return ok(
		paginate(db.deliveries, {
			page,
			limit,
			search,
			searchFields: [
				"name",
				"code",
				"driverName",
				"primaryPhone",
				"secondaryPhone",
				"vehicleNumber",
				"description",
			],
		}),
	);
}

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.deliveries)) {
		db.deliveries = [];
	}

	const body = await request.json().catch(() => ({}));

	if (!body.name || !String(body.name).trim()) {
		return fail("Delivery name is required", "VALIDATION_ERROR", 422);
	}
	if (!body.code || !String(body.code).trim()) {
		return fail("Delivery code is required", "VALIDATION_ERROR", 422);
	}
	if (!body.driverName || !String(body.driverName).trim()) {
		return fail("Driver name is required", "VALIDATION_ERROR", 422);
	}
	if (!body.primaryPhone || !String(body.primaryPhone).trim()) {
		return fail("Primary phone is required", "VALIDATION_ERROR", 422);
	}

	const nextId =
		db.deliveries.length > 0
			? Math.max(...db.deliveries.map((d) => Number(d.id) || 0)) + 1
			: 1;
	const nowIso = formatIsoTimestamp();

	const provinceCodes: string[] = Array.isArray(body.provinceCodes)
		? body.provinceCodes
		: [];
	const primaryProvinceCode: string =
		body.primaryProvinceCode ||
		(provinceCodes.length > 0 ? provinceCodes[0] : "12");
	const { primaryProvince, provinces } = resolveDeliveryProvinces(
		primaryProvinceCode,
		provinceCodes,
	);

	const newDelivery: Delivery = {
		id: nextId,
		companyId: 5,
		company: {
			id: 5,
			name: "Klocknow",
		},
		name: String(body.name).trim(),
		code: String(body.code).trim(),
		deliveryType: body.deliveryType
			? String(body.deliveryType).trim().toUpperCase()
			: "TRUCK",
		driverName: String(body.driverName).trim(),
		primaryPhone: String(body.primaryPhone).trim(),
		secondaryPhone: body.secondaryPhone
			? String(body.secondaryPhone).trim()
			: "",
		vehicleNumber: body.vehicleNumber ? String(body.vehicleNumber).trim() : "",
		description: body.description ? String(body.description).trim() : "",
		primaryProvinceCode,
		primaryProvince,
		provinceCodes,
		provinces,
		status: body.status || "Active",
		isActive: (body.status || "Active") === "Active",
		createdAt: nowIso,
		updatedAt: nowIso,
		lat: body.lat !== undefined && body.lat !== null ? Number(body.lat) : null,
		lng: body.lng !== undefined && body.lng !== null ? Number(body.lng) : null,
	};

	db.deliveries.unshift(newDelivery);
	return ok(newDelivery, { status: 201 });
}

import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

function formatTimestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function ensureSuppliers() {
	if (!Array.isArray(db.suppliers)) {
		db.suppliers = [];
	}
}

export async function GET(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	ensureSuppliers();
	const { id } = await context.params;
	const supplier = db.suppliers.find((s) => String(s.id) === String(id));
	if (!supplier) {
		return fail("Supplier not found", "NOT_FOUND", 404);
	}
	return ok(supplier);
}

export async function PUT(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	ensureSuppliers();
	const { id } = await context.params;
	const index = db.suppliers.findIndex((s) => String(s.id) === String(id));
	if (index === -1) {
		return fail("Supplier not found", "NOT_FOUND", 404);
	}

	const body = await request.json().catch(() => ({}));
	if (!body.name || !String(body.name).trim()) {
		return fail("Supplier name is required", "VALIDATION_ERROR", 422);
	}

	const current = db.suppliers[index];
	const timestampStr = formatTimestamp();

	const updatedSupplier = {
		...current,
		name: String(body.name).trim(),
		description:
			body.description !== undefined
				? String(body.description).trim()
				: current.description,
		primaryPhone:
			body.primaryPhone !== undefined
				? String(body.primaryPhone).trim()
				: body.phone !== undefined
					? String(body.phone).trim()
					: current.primaryPhone,
		secondaryPhone:
			body.secondaryPhone !== undefined
				? String(body.secondaryPhone).trim()
				: current.secondaryPhone,
		phone:
			body.primaryPhone !== undefined
				? String(body.primaryPhone).trim()
				: body.phone !== undefined
					? String(body.phone).trim()
					: current.phone,
		status: body.status || current.status || "Active",
		isActive: (body.status || current.status || "Active") === "Active",
		updatedAt: timestampStr,
	};

	db.suppliers[index] = updatedSupplier;
	return ok(updatedSupplier);
}

export async function PATCH(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return PUT(request, context);
}

export async function DELETE(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	ensureSuppliers();
	const { id } = await context.params;
	const index = db.suppliers.findIndex((s) => String(s.id) === String(id));
	if (index === -1) {
		return fail("Supplier not found", "NOT_FOUND", 404);
	}

	const timestampStr = formatTimestamp();
	const supplier = db.suppliers[index];

	const inactivatedSupplier = {
		...supplier,
		status: "Inactive",
		isActive: false,
		updatedAt: timestampStr,
	};

	db.suppliers[index] = inactivatedSupplier;
	return ok(inactivatedSupplier);
}

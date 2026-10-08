import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

function formatTimestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function PATCH(
	_request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.suppliers)) {
		db.suppliers = [];
	}

	const { id } = await context.params;
	const index = db.suppliers.findIndex((s) => String(s.id) === String(id));
	if (index === -1) {
		return fail("Supplier not found", "NOT_FOUND", 404);
	}

	const timestampStr = formatTimestamp();
	const supplier = db.suppliers[index];

	const restoredSupplier = {
		...supplier,
		status: "Active",
		isActive: true,
		updatedAt: timestampStr,
	};

	db.suppliers[index] = restoredSupplier;
	return ok(restoredSupplier);
}

export async function POST(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return PATCH(request, context);
}

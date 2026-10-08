import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const resolvedParams = await params;
	const id = resolvedParams.id;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const found = db.imports.find(
		(i) =>
			String(i.id) === String(id) || i.referenceNo === id || i.importNo === id,
	);
	if (!found) {
		return fail("Import record not found", "NOT_FOUND", 404);
	}

	return ok(found);
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const resolvedParams = await params;
	const id = resolvedParams.id;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const index = db.imports.findIndex(
		(i) => String(i.id) === String(id) || i.referenceNo === id,
	);
	if (index === -1) {
		return fail("Import record not found", "NOT_FOUND", 404);
	}

	const body = await request.json().catch(() => ({}));
	const existing = db.imports[index];

	const updated = {
		...existing,
		...body,
		updatedAt: new Date().toISOString(),
	};

	db.imports[index] = updated;
	return ok(updated);
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { error } = await requireAuth();
	if (error) return error;

	const resolvedParams = await params;
	const id = resolvedParams.id;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const index = db.imports.findIndex(
		(i) => String(i.id) === String(id) || i.referenceNo === id,
	);
	if (index === -1) {
		return fail("Import record not found", "NOT_FOUND", 404);
	}

	const removed = db.imports.splice(index, 1)[0];
	return ok(removed);
}

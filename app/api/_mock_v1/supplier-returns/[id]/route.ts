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

	if (!Array.isArray((db as any).supplierReturns)) {
		(db as any).supplierReturns = [];
	}

	const found = (db as any).supplierReturns.find(
		(r: any) => String(r.id) === String(id) || r.returnNumber === id,
	);

	if (!found) {
		return fail("Supplier return record not found", "NOT_FOUND", 404);
	}

	return ok(found);
}

import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const body = await req.json().catch(() => ({}));
	const feature = db.features.find((f) => String(f.id) === String(id));
	if (!feature) {
		return fail("Feature not found", "NOT_FOUND", 404);
	}

	if (body.code) feature.code = body.code.toUpperCase().trim();
	if (body.name) feature.name = body.name.trim();
	if (body.description !== undefined) feature.description = body.description;
	if (body.status !== undefined) feature.status = body.status;
	feature.updatedAt = new Date().toISOString();

	return ok(feature, undefined, "Feature updated successfully");
}

export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const feature = db.features.find((f) => String(f.id) === String(id));
	if (!feature) {
		return fail("Feature not found", "NOT_FOUND", 404);
	}

	feature.deletedAt = new Date().toISOString();
	feature.status = "Inactive";
	return ok(feature, undefined, "Feature deleted successfully");
}

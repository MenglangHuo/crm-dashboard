import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function POST(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const feature = db.features.find((f) => String(f.id) === String(id));
	if (!feature) {
		return fail("Feature not found", "NOT_FOUND", 404);
	}

	feature.deletedAt = null;
	feature.status = "Active";
	feature.updatedAt = new Date().toISOString();
	return ok(feature, undefined, "Feature restored successfully");
}

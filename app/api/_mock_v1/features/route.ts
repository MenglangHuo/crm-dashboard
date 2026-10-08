import { db } from "@/lib/server/db";
import { ok, fail } from "@/lib/server/api";

export async function GET() {
	const activeFeatures = db.features.filter((f) => !f.deletedAt);
	return ok(activeFeatures, undefined, "Features retrieved successfully");
}

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	if (!body.code || !body.name) {
		return fail("Code and Name are required", "VALIDATION_FAILED", 400);
	}

	const existing = db.features.find(
		(f) => f.code.toUpperCase() === body.code.toUpperCase() && !f.deletedAt,
	);
	if (existing) {
		return fail("Feature code already exists", "DUPLICATE_CODE", 400);
	}

	const newFeature = {
		id: db.features.length
			? Math.max(...db.features.map((f) => Number(f.id) || 0)) + 1
			: 1,
		code: body.code.toUpperCase().trim(),
		name: body.name.trim(),
		description: body.description || "",
		status: "Active",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	db.features.unshift(newFeature);
	return ok(newFeature, { status: 201 }, "Feature created successfully");
}

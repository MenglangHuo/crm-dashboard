import { NextRequest } from "next/server";
import { db, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.read");
	if (error) return error;

	const { id } = await params;
	const config = db.configurations.find((c) => c.id === id);
	if (!config) return fail("Configuration entry not found", "NOT_FOUND", 404);

	return ok(config);
}

export async function PUT(request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.update");
	if (error) return error;

	const { id } = await params;
	const config = db.configurations.find((c) => c.id === id);
	if (!config) return fail("Configuration entry not found", "NOT_FOUND", 404);

	const body = await request.json().catch(() => ({}));
	if (typeof body.configKey === "string" && body.configKey.trim()) {
		config.configKey = body.configKey.trim();
	}
	if (typeof body.configValue === "object" && body.configValue !== null) {
		config.configValue = body.configValue;
	}
	if (typeof body.description === "string") {
		config.description = body.description.trim();
	}

	config.updatedAt = now();
	return ok(config);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
	const { error } = await requireAuth("companies.update");
	if (error) return error;

	const { id } = await params;
	const index = db.configurations.findIndex((c) => c.id === id);
	if (index === -1)
		return fail("Configuration entry not found", "NOT_FOUND", 404);

	const deleted = db.configurations.splice(index, 1)[0];
	return ok(deleted);
}

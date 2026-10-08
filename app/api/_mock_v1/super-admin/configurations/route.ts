import { NextRequest } from "next/server";
import { db, now, paginate, uid } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: NextRequest) {
	const { error } = await requireAuth("companies.read");
	if (error) return error;

	const sp = request.nextUrl.searchParams;
	const companyId = sp.get("companyId");

	let items = db.configurations;
	if (companyId) {
		items = items.filter((c) => c.companyId === companyId);
	}

	return ok(
		paginate(items, {
			page: Number(sp.get("page")) || 1,
			limit: Number(sp.get("limit")) || 10,
			search: sp.get("search") ?? undefined,
			searchFields: ["configKey", "description", "companyId"],
		}),
	);
}

export async function POST(request: NextRequest) {
	const { error } = await requireAuth("companies.update");
	if (error) return error;

	const body = await request.json().catch(() => ({}));
	const { companyId, configKey, configValue, description } = body;

	if (!companyId || !configKey?.trim()) {
		return fail(
			"companyId and configKey are required",
			"VALIDATION_ERROR",
			422,
		);
	}

	const existingCompany = db.companies.find((c) => c.id === companyId);
	if (!existingCompany) {
		return fail("Company not found", "NOT_FOUND", 404);
	}

	const duplicateKey = db.configurations.find(
		(cfg) =>
			cfg.companyId === companyId &&
			cfg.configKey.toLowerCase() === configKey.trim().toLowerCase(),
	);
	if (duplicateKey) {
		return fail(
			`Configuration key '${configKey}' already exists for this company`,
			"DUPLICATE_KEY",
			409,
		);
	}

	const newConfig = {
		id: uid("cfg"),
		companyId,
		configKey: configKey.trim(),
		configValue:
			typeof configValue === "object" && configValue !== null
				? configValue
				: {},
		description: description?.trim() || "",
		createdAt: now(),
		updatedAt: now(),
	};

	db.configurations.push(newConfig);
	return ok(newConfig, { status: 201 });
}

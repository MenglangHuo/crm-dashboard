import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/server/api";
import { INITIAL_DOMAINS_DATA } from "@/components/configurations/default-data";

type Params = { params: Promise<{ configKey: string }> };

function findConfig(key: string) {
	const decoded = decodeURIComponent(key);
	for (const domain of INITIAL_DOMAINS_DATA) {
		for (const section of domain.sections) {
			const found = section.configurations.find((c) => c.configKey === decoded);
			if (found) return found;
		}
	}
	return null;
}

export async function GET(_request: NextRequest, { params }: Params) {
	const { configKey } = await params;
	const config = findConfig(configKey);
	if (!config) return fail("Configuration entry not found", "NOT_FOUND", 404);
	return ok(config);
}

export async function PUT(request: NextRequest, { params }: Params) {
	const { configKey } = await params;
	const config = findConfig(configKey);
	if (!config) return fail("Configuration entry not found", "NOT_FOUND", 404);

	const body = await request.json().catch(() => ({}));
	if ("configValue" in body) {
		config.configValue = body.configValue;
		config.overridden = true;
	}

	return ok(config);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
	const { configKey } = await params;
	const config = findConfig(configKey);
	if (!config) return fail("Configuration entry not found", "NOT_FOUND", 404);

	config.overridden = false;
	if (config.defaultValue !== undefined) {
		try {
			config.configValue = JSON.parse(config.defaultValue);
		} catch {
			config.configValue = config.defaultValue;
		}
	}

	return ok({
		success: true,
		message: `Configuration '${config.configKey}' reset to system default`,
	});
}

import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/server/api";
import { INITIAL_DOMAINS_DATA } from "@/components/configurations/default-data";

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

export async function POST(request: NextRequest) {
	const body = await request.json().catch(() => ({}));
	const items = body.items || [];

	if (!Array.isArray(items)) {
		return fail("items array is required", "VALIDATION_ERROR", 422);
	}

	const updatedItems: any[] = [];

	for (const item of items) {
		if (!item.configKey) continue;
		const config = findConfig(item.configKey);
		if (config) {
			if ("configValue" in item) {
				config.configValue = item.configValue;
				config.overridden = true;
			}
			if ("description" in item && item.description !== undefined) {
				config.description = item.description;
			}
			if ("valueType" in item && item.valueType) {
				config.valueType = item.valueType;
			}
			if ("scope" in item && item.scope) {
				config.scope = item.scope;
			}
			if ("category" in item && item.category) {
				config.category = item.category;
			}
			if ("defaultValue" in item && item.defaultValue !== undefined) {
				config.defaultValue = item.defaultValue;
			}
			if ("validationRule" in item && item.validationRule !== undefined) {
				config.validationRule = item.validationRule;
			}
			if ("isEncrypted" in item && typeof item.isEncrypted === "boolean") {
				config.isEncrypted = item.isEncrypted;
			}
			if ("isReadOnly" in item && typeof item.isReadOnly === "boolean") {
				config.isReadOnly = item.isReadOnly;
			}
			if ("displayOrder" in item && typeof item.displayOrder === "number") {
				config.displayOrder = item.displayOrder;
			}
			updatedItems.push(config);
		}
	}

	return ok({
		success: true,
		message: `Successfully updated ${updatedItems.length} configuration(s)`,
		updated: updatedItems.length,
		items: updatedItems,
		timestamp: new Date().toISOString(),
	});
}

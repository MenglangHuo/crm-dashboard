import { db, paginate } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { Supplier } from "@/lib/types";

function formatTimestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.suppliers)) {
		db.suppliers = [];
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const search = url.searchParams.get("search") ?? undefined;

	return ok(
		paginate(db.suppliers, {
			page,
			limit,
			search,
			searchFields: [
				"name",
				"primaryPhone",
				"secondaryPhone",
				"phone",
				"description",
			],
		}),
	);
}

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.suppliers)) {
		db.suppliers = [];
	}

	const body = await request.json().catch(() => ({}));

	if (!body.name || !String(body.name).trim()) {
		return fail("Supplier name is required", "VALIDATION_ERROR", 422);
	}

	const nextId =
		db.suppliers.length > 0
			? Math.max(...db.suppliers.map((s) => Number(s.id) || 0)) + 1
			: 1;
	const timestampStr = formatTimestamp();

	const newSupplier: Supplier = {
		id: nextId,
		name: String(body.name).trim(),
		description: body.description ? String(body.description).trim() : "",
		primaryPhone: body.primaryPhone
			? String(body.primaryPhone).trim()
			: body.phone
				? String(body.phone).trim()
				: "",
		secondaryPhone: body.secondaryPhone
			? String(body.secondaryPhone).trim()
			: "",
		phone: body.primaryPhone
			? String(body.primaryPhone).trim()
			: body.phone
				? String(body.phone).trim()
				: "",
		status: body.status || "Active",
		isActive: (body.status || "Active") === "Active",
		company: {
			id: 5,
			name: "Klocknow",
		},
		createdAt: timestampStr,
		updatedAt: timestampStr,
	};

	db.suppliers.unshift(newSupplier);
	return ok(newSupplier, { status: 201 });
}

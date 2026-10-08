import { db, paginate } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { InventoryImport } from "@/lib/types";

function formatTimestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const search = url.searchParams.get("search") ?? undefined;
	const status = url.searchParams.get("status") ?? undefined;
	const supplierId = url.searchParams.get("supplierId") ?? undefined;

	let filtered = [...db.imports];

	if (status && status !== "ALL") {
		filtered = filtered.filter(
			(imp) => String(imp.status).toUpperCase() === status.toUpperCase(),
		);
	}

	if (supplierId && supplierId !== "ALL") {
		filtered = filtered.filter(
			(imp) => String(imp.supplierId) === String(supplierId),
		);
	}

	return ok(
		paginate(filtered, {
			page,
			limit,
			search,
			searchFields: [
				"referenceNo",
				"importNo",
				"supplierName",
				"note",
				"notes",
			],
		}),
	);
}

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray(db.imports)) {
		db.imports = [];
	}

	const body = await request.json().catch(() => ({}));

	if (!body.supplierId) {
		return fail("Supplier ID is required", "VALIDATION_ERROR", 422);
	}

	if (!Array.isArray(body.items) || body.items.length === 0) {
		return fail(
			"At least one item line is required for import",
			"VALIDATION_ERROR",
			422,
		);
	}

	const nextId =
		db.imports.length > 0
			? Math.max(...db.imports.map((i) => Number(i.id) || 0)) + 1
			: 1;
	const timestampStr = formatTimestamp();

	// Resolve supplier
	const supplier = db.suppliers?.find(
		(s) => String(s.id) === String(body.supplierId),
	);

	// Map and calculate line items
	const mappedItems = body.items.map((it: any, index: number) => {
		const qty = Number(it.quantity) || 1;
		const cost = Number(it.unitCost ?? it.cost ?? 0);
		const price = Number(it.untiPrice ?? it.unitPrice ?? it.price ?? cost);
		return {
			id: index + 1,
			variantId: it.variantId || it.productId || 1,
			productId: it.productId || it.variantId || 1,
			productName: it.productName || `Product #${it.variantId || it.productId}`,
			variantName: it.variantName || `Variant #${it.variantId}`,
			sku: it.sku || `SKU-${it.variantId}`,
			imageUrl: it.imageUrl || "",
			unitId: it.unitId || 1,
			unitName: it.unitName || "Pcs",
			quantity: qty,
			unitCost: cost,
			untiPrice: price,
			unitPrice: price,
			totalCost: qty * cost,
		};
	});

	const totalCalculatedCost = mappedItems.reduce(
		(sum: number, it: any) => sum + it.totalCost,
		0,
	);
	const totalUnits = mappedItems.reduce(
		(sum: number, it: any) => sum + it.quantity,
		0,
	);

	const referenceNo = String(
		body.referenceNo || `IMP-${Date.now().toString().slice(-6)}`,
	).trim();

	const newImport: InventoryImport = {
		id: nextId,
		referenceNo,
		importNo: referenceNo,
		supplierId: Number(body.supplierId),
		supplierName: supplier?.name || body.supplierName || "Primary Supplier",
		supplierPhone:
			supplier?.primaryPhone || supplier?.phone || body.supplierPhone || "",
		supplier: supplier || null,
		warehouseId: body.warehouseId ? Number(body.warehouseId) : 1,
		warehouseName:
			body.warehouseName ||
			(body.warehouseId
				? `Warehouse #${body.warehouseId}`
				: "Central Distribution Hub"),
		importDate: body.importDate || new Date().toISOString(),
		note: body.note || body.notes || "",
		notes: body.notes || body.note || "",
		totalAmount: totalCalculatedCost,
		totalCost: totalCalculatedCost,
		totalUnits,
		status: body.status || "COMPLETED",
		items: mappedItems,
		createdAt: timestampStr,
		updatedAt: timestampStr,
	};

	db.imports.unshift(newImport);
	return ok(newImport, { status: 201 });
}

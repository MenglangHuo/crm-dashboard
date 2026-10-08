import { db } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { SupplierReturn, SupplierReturnItem } from "@/lib/types";

function formatTimestamp() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;

	const body = await request.json().catch(() => ({}));

	if (!body.importId && !body.referenceNo) {
		return fail("Import reference or ID is required", "VALIDATION_ERROR", 422);
	}

	if (!body.reason || !String(body.reason).trim()) {
		return fail("Return reason is required", "VALIDATION_ERROR", 422);
	}

	if (!Array.isArray((db as any).supplierReturns)) {
		(db as any).supplierReturns = [];
	}

	// Find corresponding import
	const imp = Array.isArray(db.imports)
		? db.imports.find(
				(i) =>
					(body.importId && String(i.id) === String(body.importId)) ||
					(body.referenceNo &&
						(i.referenceNo === body.referenceNo ||
							i.importNo === body.referenceNo)),
			)
		: undefined;

	const returnAll = Boolean(body.returnAll);
	const nextId =
		(db as any).supplierReturns.length > 0
			? Math.max(
					...(db as any).supplierReturns.map((r: any) => Number(r.id) || 0),
				) + 1
			: 1;

	const returnDate = new Date().toISOString();
	const dateCompact = returnDate.slice(0, 10).replace(/-/g, "");
	const returnNumber = `RET-${dateCompact}-${String(nextId).padStart(6, "0")}`;

	let returnedItems: SupplierReturnItem[] = [];
	let calculatedTotalCost = 0;

	if (returnAll) {
		// Return all items from the import
		const manifestItems = imp?.items || [];
		returnedItems = manifestItems.map((it: any, idx: number) => {
			const lineCost =
				Number(it.totalCost ?? Number(it.quantity) * Number(it.unitCost)) || 0;
			calculatedTotalCost += lineCost;
			return {
				id: idx + 1,
				importItemId: it.id,
				variantId: it.variantId || it.productId || 1,
				variantName: it.variantName || it.productName || "Product",
				variantSku: it.sku || "",
				quantity: Number(it.quantity) || 1,
				unitCost: Number(it.unitCost) || 0,
				inputQuantity: Number(it.quantity) || 1,
				inputUnitId: it.unitId || 1,
				inputUnitName: it.unitName || "Pcs",
				totalCost: lineCost,
				reason: body.reason,
			};
		});
	} else {
		// Partial return: map items from request payload
		if (!Array.isArray(body.items) || body.items.length === 0) {
			return fail(
				"At least one item is required for partial return",
				"VALIDATION_ERROR",
				422,
			);
		}

		returnedItems = body.items.map((it: any, idx: number) => {
			const matchImportItem = imp?.items?.find(
				(m: any) => String(m.variantId) === String(it.variantId),
			);
			const unitCost = Number(matchImportItem?.unitCost ?? 0);
			const qty = Number(it.quantity) || 1;
			const lineCost = qty * unitCost;
			calculatedTotalCost += lineCost;

			return {
				id: idx + 1,
				importItemId: matchImportItem?.id || idx + 1,
				variantId: it.variantId,
				variantName:
					matchImportItem?.variantName ||
					matchImportItem?.productName ||
					`Variant #${it.variantId}`,
				variantSku: matchImportItem?.sku || "",
				quantity: qty,
				unitCost,
				inputQuantity: qty,
				inputUnitId: it.unitId || matchImportItem?.unitId || 1,
				inputUnitName: matchImportItem?.unitName || "Pcs",
				totalCost: lineCost,
				reason: it.reason || body.reason,
			};
		});
	}

	const supplierReturn: SupplierReturn = {
		id: nextId,
		companyId: 5,
		returnNumber,
		importId: imp?.id
			? Number(imp.id)
			: body.importId
				? Number(body.importId)
				: 1,
		importNumber:
			imp?.referenceNo ||
			imp?.importNo ||
			body.referenceNo ||
			`IMP-${body.importId}`,
		referenceNo:
			imp?.referenceNo ||
			imp?.importNo ||
			body.referenceNo ||
			`IMP-${body.importId}`,
		supplierId: imp?.supplierId ? Number(imp.supplierId) : 1,
		supplierName: imp?.supplierName || "Supplier",
		warehouseId: imp?.warehouseId ? Number(imp.warehouseId) : 1,
		warehouseName: imp?.warehouseName || "Main Hub",
		returnDate,
		returnAll,
		reason: body.reason,
		notes: body.notes || "",
		totalCost:
			calculatedTotalCost || (imp?.totalCost ? Number(imp.totalCost) : 0),
		returnedBy: 1,
		items: returnedItems,
		createdAt: returnDate,
		updatedAt: returnDate,
	};

	(db as any).supplierReturns.unshift(supplierReturn);

	return ok(supplierReturn, { status: 201 });
}

export async function GET() {
	const { error } = await requireAuth();
	if (error) return error;

	if (!Array.isArray((db as any).supplierReturns)) {
		(db as any).supplierReturns = [];
	}

	return ok((db as any).supplierReturns);
}

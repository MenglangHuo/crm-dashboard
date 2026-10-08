import { NextRequest, NextResponse } from "next/server";
import { mockDb } from "@/lib/server/db";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { reason, notes, adjustmentType: fallbackType = "DECREASE", items = [] } = body;

		if (!Array.isArray(items) || items.length === 0) {
			return NextResponse.json(
				{
					success: false,
					message: "At least one item is required for stock adjustment",
				},
				{ status: 400 },
			);
		}

		// Process movements in mock DB if available
		let totalIncrease = 0;
		let totalDecrease = 0;

		const movements = items.map((item: any) => {
			const qty = Number(item.adjustmentQuantity || item.quantity || 1);
			const itemType: "INCREASE" | "DECREASE" =
				item.AdjustmentType === "INCREASE" || item.adjustmentType === "INCREASE"
					? "INCREASE"
					: item.AdjustmentType === "DECREASE" || item.adjustmentType === "DECREASE"
						? "DECREASE"
						: fallbackType === "INCREASE"
							? "INCREASE"
							: "DECREASE";

			if (itemType === "INCREASE") {
				totalIncrease += qty;
			} else {
				totalDecrease += qty;
			}

			return {
				id: Date.now() + Math.floor(Math.random() * 1000),
				variantId: Number(item.variantId),
				unitId: item.unitId ? Number(item.unitId) : undefined,
				movementType: itemType,
				quantityBefore: 50,
				quantityChange: itemType === "INCREASE" ? qty : -qty,
				quantityAfter:
					itemType === "INCREASE" ? 50 + qty : Math.max(0, 50 - qty),
				reason:
					item.reason ||
					reason ||
					(itemType === "INCREASE" ? "Inventory audit" : "Damaged goods"),
				note: item.notes || notes || reason || "Stock audit adjustment",
				createdAt: new Date().toISOString(),
			};
		});

		const netUnits = totalIncrease - totalDecrease;
		const summaryText = `+${totalIncrease} / -${totalDecrease} units (net ${netUnits >= 0 ? `+${netUnits}` : netUnits})`;

		return NextResponse.json({
			success: true,
			message: `Stock adjustment processed successfully for ${items.length} items (${summaryText})`,
			data: {
				reason,
				notes,
				processedItemsCount: items.length,
				totalIncreaseUnits: totalIncrease,
				totalDecreaseUnits: totalDecrease,
				netUnitsChange: netUnits,
				movements,
			},
		});
	} catch (error: any) {
		return NextResponse.json(
			{
				success: false,
				message: error.message || "Failed to process stock adjustment",
			},
			{ status: 500 },
		);
	}
}

import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";

function getMockDashboardData(
	startDate?: string,
	endDate?: string,
	companyId?: string | number,
	userId?: string | number,
) {
	return {
		totalProducts: 10,
		totalOrders: 4,
		totalInvoices: 2,
		lowStockCount: 0,
		outOfStockCount: 12,
		netRevenue: 507.5,
		grossSales: 514.99,
		grossProfit: -302.5,
		totalDiscount: 7.49,
		totalTaxAmount: 0.0,
		totalShippingAmount: 0.0,
		totalUnpaid: 0.0,
		totalPaymentDiscount: 0.0,
		topProductsByRevenue: [
			{
				rank: 1,
				productName: "Bluetooth Headset",
				sku: "Macbook-Pro-M5-Black/16GB/512GB",
				totalRevenue: 1300.0,
				totalQuantity: 1,
			},
			{
				rank: 2,
				productName: "Pant",
				sku: "POLO-BLK-M",
				totalRevenue: 440.0,
				totalQuantity: 20,
			},
			{
				rank: 3,
				productName: "T-Shirt",
				sku: "POLO-BLK-M",
				totalRevenue: 55.0,
				totalQuantity: 2,
			},
			{
				rank: 4,
				productName: "Single Wire Mouse",
				sku: "MOU-OFFICE-01",
				totalRevenue: 19.99,
				totalQuantity: 1,
			},
		],
		topProductsByQuantity: [
			{
				rank: 1,
				productName: "Pant",
				sku: "POLO-BLK-M",
				totalRevenue: 440.0,
				totalQuantity: 20,
			},
			{
				rank: 2,
				productName: "T-Shirt",
				sku: "POLO-BLK-M",
				totalRevenue: 55.0,
				totalQuantity: 2,
			},
			{
				rank: 3,
				productName: "Bluetooth Headset",
				sku: "Macbook-Pro-M5-Black/16GB/512GB",
				totalRevenue: 1300.0,
				totalQuantity: 1,
			},
			{
				rank: 4,
				productName: "Single Wire Mouse",
				sku: "MOU-OFFICE-01",
				totalRevenue: 19.99,
				totalQuantity: 1,
			},
		],
	};
}

export async function POST(req: NextRequest) {
	let body: any = {};
	try {
		body = await req.json();
	} catch {}

	const { startDate, endDate, companyId, userId } = body || {};
	return ok(getMockDashboardData(startDate, endDate, companyId, userId));
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const startDate = searchParams.get("startDate") || "2026-08-01";
	const endDate = searchParams.get("endDate") || "2026-08-31";
	const companyId = searchParams.get("companyId") || undefined;
	const userId = searchParams.get("userId") || undefined;

	return ok(getMockDashboardData(startDate, endDate, companyId, userId));
}

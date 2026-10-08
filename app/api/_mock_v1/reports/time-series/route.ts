import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";

function getMockTimeSeriesData(
	startDate?: string,
	endDate?: string,
	companyId?: string | number,
	userId?: string | number,
) {
	const dateKey =
		(startDate ? String(startDate).slice(0, 7) : "2026-08") || "2026-08";

	return [
		{
			metric: "revenue",
			series: [
				{
					date: dateKey,
					value: 507.5,
					profit: -302.5,
				},
			],
		},
		{
			metric: "orders",
			series: [
				{
					date: dateKey,
					count: 4,
				},
			],
		},
		{
			metric: "invoices",
			series: [
				{
					date: dateKey,
					count: 2,
				},
			],
		},
		{
			metric: "payments",
			series: [
				{
					date: "2026-07",
					value: 55610.0,
				},
				{
					date: dateKey,
					value: 507.5,
				},
			],
		},
	];
}

export async function POST(req: NextRequest) {
	let body: any = {};
	try {
		body = await req.json();
	} catch {}

	const { startDate, endDate, companyId, userId } = body || {};
	return ok(getMockTimeSeriesData(startDate, endDate, companyId, userId));
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const startDate = searchParams.get("startDate") || "2026-08-01";
	const endDate = searchParams.get("endDate") || "2026-08-31";
	const companyId = searchParams.get("companyId") || undefined;
	const userId = searchParams.get("userId") || undefined;

	return ok(getMockTimeSeriesData(startDate, endDate, companyId, userId));
}

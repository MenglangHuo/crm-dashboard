import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";

function getMockIncomeData() {
	return {
		comparisons: [
			{
				period: "YESTERDAY",
				currentIncome: 0.0,
				previousIncome: -342.5,
				changePercent: 100.0,
				trend: "UP",
			},
			{
				period: "LAST_WEEK",
				currentIncome: -302.5,
				previousIncome: 0.0,
				changePercent: 0,
				trend: "NEUTRAL",
			},
			{
				period: "LAST_MONTH",
				currentIncome: -302.5,
				previousIncome: 0.0,
				changePercent: 0,
				trend: "NEUTRAL",
			},
			{
				period: "LAST_SEMESTER",
				currentIncome: -302.5,
				previousIncome: 0.0,
				changePercent: 0,
				trend: "NEUTRAL",
			},
			{
				period: "LAST_MID_YEAR",
				currentIncome: -302.5,
				previousIncome: 0.0,
				changePercent: 0,
				trend: "NEUTRAL",
			},
			{
				period: "LAST_YEAR",
				currentIncome: -302.5,
				previousIncome: 0.0,
				changePercent: 0,
				trend: "NEUTRAL",
			},
		],
	};
}

export async function POST(req: NextRequest) {
	return ok(getMockIncomeData());
}

export async function GET(req: NextRequest) {
	return ok(getMockIncomeData());
}

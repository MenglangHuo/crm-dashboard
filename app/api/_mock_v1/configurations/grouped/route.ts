import { NextRequest } from "next/server";
import { ok } from "@/lib/server/api";
import { INITIAL_DOMAINS_DATA } from "@/components/configurations/default-data";

export async function GET(_request: NextRequest) {
	return ok(INITIAL_DOMAINS_DATA);
}

import { proxyToBackend } from "@/lib/server/proxy-handler";
import type { NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
	return proxyToBackend(req);
}

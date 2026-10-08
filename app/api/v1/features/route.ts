import { proxyToBackend } from "@/lib/server/proxy-handler";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
	return proxyToBackend(req);
}
export async function POST(req: NextRequest) {
	return proxyToBackend(req);
}

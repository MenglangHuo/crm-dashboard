import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/server/proxy-handler";

export async function PUT(req: NextRequest) {
	return proxyToBackend(req);
}

export async function POST(req: NextRequest) {
	return proxyToBackend(req);
}

export async function PATCH(req: NextRequest) {
	return proxyToBackend(req);
}

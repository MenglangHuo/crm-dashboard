import { proxyToBackend } from "@/lib/server/proxy-handler";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
	return proxyToBackend(req);
}

export async function POST(req: NextRequest) {
	return proxyToBackend(req);
}

export async function PUT(req: NextRequest) {
	return proxyToBackend(req);
}

export async function PATCH(req: NextRequest) {
	return proxyToBackend(req);
}

export async function DELETE(req: NextRequest) {
	return proxyToBackend(req);
}

export async function HEAD(req: NextRequest) {
	return proxyToBackend(req);
}

export async function OPTIONS(req: NextRequest) {
	return proxyToBackend(req);
}

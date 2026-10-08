import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/api";

/**
 * Mock S3 bucket. PUT stores the binary (step 3 of the presigned
 * workflow); GET serves it back for previews/avatars.
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const { key } = await params;
	const fileKey = key.map(decodeURIComponent).join("/");
	const contentType =
		request.headers.get("content-type") ?? "application/octet-stream";
	const buffer = new Uint8Array(await request.arrayBuffer());
	if (buffer.byteLength > 10 * 1024 * 1024)
		return fail("File exceeds 10MB limit", "FILE_TOO_LARGE", 413);
	db.files.set(fileKey, { contentType, data: buffer });
	// Real S3 returns an empty 200 — mirror that.
	return new Response(null, { status: 200 });
}

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ key: string[] }> },
) {
	const { key } = await params;
	const fileKey = key.map(decodeURIComponent).join("/");
	const file = db.files.get(fileKey);
	if (!file) return fail("File not found", "NOT_FOUND", 404);
	return new Response(new Uint8Array(file.data), {
		headers: {
			"Content-Type": file.contentType,
			"Cache-Control": "private, max-age=3600",
		},
	});
}

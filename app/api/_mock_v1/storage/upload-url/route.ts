import { uid } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

/**
 * Step 1 of the presigned S3 upload workflow.
 * Returns an uploadUrl (mock: local PUT endpoint) + fileKey.
 * A real backend would return a signed AWS S3 URL here; the
 * client contract (PUT binary with matching Content-Type) is identical.
 */
export async function POST(request: Request) {
	const { error } = await requireAuth();
	if (error) return error;
	const body = await request.json();
	const fileName = String(body.fileName ?? "").trim();
	const contentType = String(body.contentType ?? "").trim();
	if (!fileName || !contentType)
		return fail(
			"fileName and contentType are required",
			"VALIDATION_ERROR",
			422,
		);
	const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
	const fileKey = `uploads/${uid("file")}/${safeName}`;
	const uploadUrl = `/api/v1/storage/object/${fileKey
		.split("/")
		.map(encodeURIComponent)
		.join("/")}?contentType=${encodeURIComponent(contentType)}`;
	return ok({ uploadUrl, fileKey });
}

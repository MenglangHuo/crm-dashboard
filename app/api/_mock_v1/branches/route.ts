import { db, paginate, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: Request) {
	const { profile, error } = await requireAuth("branches.read");
	if (error) return error;
	const url = new URL(request.url);
	const includeDeleted = url.searchParams.get("includeDeleted") === "true";
	const items = db.branches.filter(
		(b) =>
			b.companyId === profile.companyId && (includeDeleted || !b.deletedAt),
	);
	return ok(
		paginate(items, {
			page: Number(url.searchParams.get("page")) || 1,
			limit: Number(url.searchParams.get("limit")) || 10,
			search: url.searchParams.get("search") ?? undefined,
			searchFields: ["name", "phone", "address"],
		}),
	);
}

export async function POST(request: Request) {
	const { profile, error } = await requireAuth("branches.create");
	if (error) return error;
	if (!profile.companyId)
		return fail("Only company accounts can create branches", "NO_COMPANY", 400);
	const body = await request.json();
	if (!body.name?.trim())
		return fail("Branch name is required", "VALIDATION_ERROR", 422);
	const branch = {
		id: uid("br"),
		companyId: profile.companyId,
		name: String(body.name).trim(),
		phone: String(body.phone ?? "").trim(),
		address: String(body.address ?? "").trim(),
		active: body.active !== false,
		deletedAt: null,
		createdAt: now(),
	};
	db.branches.unshift(branch);
	return ok(branch, { status: 201 });
}

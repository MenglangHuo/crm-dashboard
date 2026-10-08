import { db, paginate, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";
import type { StaffDocument } from "@/lib/types";

export async function GET(request: Request) {
	const { profile, error } = await requireAuth("staff.read");
	if (error) return error;
	const url = new URL(request.url);
	const includeDeleted = url.searchParams.get("includeDeleted") === "true";
	const items = db.staff.filter(
		(s) =>
			s.companyId === profile.companyId && (includeDeleted || !s.deletedAt),
	);
	return ok(
		paginate(items, {
			page: Number(url.searchParams.get("page")) || 1,
			limit: Number(url.searchParams.get("limit")) || 10,
			search: url.searchParams.get("search") ?? undefined,
			searchFields: ["firstName", "lastName", "position", "email", "phone"],
		}),
	);
}

function sanitizeDocuments(input: unknown): StaffDocument[] {
	if (!Array.isArray(input)) return [];
	return input
		.filter(
			(d) =>
				d && typeof d.fileKey === "string" && typeof d.fileName === "string",
		)
		.map((d) => ({ fileKey: d.fileKey, fileName: d.fileName }));
}

export async function POST(request: Request) {
	const { profile, error } = await requireAuth("staff.create");
	if (error) return error;
	if (!profile.companyId)
		return fail("Only company accounts can create staff", "NO_COMPANY", 400);
	const body = await request.json();
	if (!body.firstName?.trim() || !body.lastName?.trim())
		return fail("First and last name are required", "VALIDATION_ERROR", 422);
	const staff = {
		id: uid("stf"),
		companyId: profile.companyId,
		branchId: body.branchId || null,
		firstName: String(body.firstName).trim(),
		lastName: String(body.lastName).trim(),
		position: String(body.position ?? "").trim(),
		salary: Number(body.salary) || 0,
		email: String(body.email ?? "").trim(),
		phone: String(body.phone ?? "").trim(),
		urgentContactName: String(body.urgentContactName ?? "").trim(),
		urgentContactPhone: String(body.urgentContactPhone ?? "").trim(),
		documents: sanitizeDocuments(body.documents),
		userId: body.userId || null,
		deletedAt: null,
		createdAt: now(),
	};
	db.staff.unshift(staff);
	return ok(staff, { status: 201 });
}

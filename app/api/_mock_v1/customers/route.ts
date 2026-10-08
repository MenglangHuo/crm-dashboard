import { db, paginate, uid, now } from "@/lib/server/db";
import { ok, fail, requireAuth } from "@/lib/server/api";

export async function GET(request: Request) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	const url = new URL(request.url);
	const items = db.customers.filter((c) => c.companyId === profile.companyId);
	return ok(
		paginate(items, {
			page: Number(url.searchParams.get("page")) || 1,
			limit: Number(url.searchParams.get("limit")) || 10,
			search: url.searchParams.get("search") ?? undefined,
			searchFields: [
				"name",
				"phone",
				"email",
				"nationalId",
				"occupation",
				"address",
			],
		}),
	);
}

export async function POST(request: Request) {
	const { profile, error } = await requireAuth();
	if (error) return error;
	if (!profile.companyId)
		return fail(
			"Only company accounts can create customers",
			"NO_COMPANY",
			400,
		);
	const body = await request.json();
	if (!body.name?.trim() || !body.phone?.trim())
		return fail(
			"Customer name and phone number are required",
			"VALIDATION_ERROR",
			422,
		);

	const newCustomer = {
		id: uid("cust"),
		companyId: profile.companyId,
		branchId: body.branchId || null,
		name: String(body.name).trim(),
		industry: body.industry ?? "",
		customerGroup: body.customerGroup ?? "Standard",
		phone: String(body.phone).trim(),
		address: body.address ?? "",
		occupation: body.occupation ?? "",
		imageUrl: body.imageUrl ?? "",
		preferredCurrency: body.preferredCurrency ?? "USD",
		isActive: body.isActive ?? body.active ?? true,
		active: body.isActive ?? body.active ?? true,
		email: body.email ?? "",
		dateOfBirth: body.dateOfBirth ?? null,
		gender: body.gender ?? "male",
		nationalId: body.nationalId ?? "",
		documents: Array.isArray(body.documents) ? body.documents : [],
		createdAt: now(),
		updatedAt: null,
	};

	db.customers.unshift(newCustomer);
	return ok(newCustomer, { status: 201 });
}

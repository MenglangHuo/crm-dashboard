// ============================================================
// Typed endpoint functions used by TanStack Query hooks.
// ============================================================

import { api } from "@/lib/api/client";
import {
	FileUploaderFactory,
	uploadService,
	type UploadOptions,
	type UploadResult,
	type UploaderStrategyType,
} from "@/lib/services/file-uploader";
import type {
	AddVariantInput,
	AddressInfo,
	AdminResetPasswordResponse,
	AppNotification,
	AssignCustomPermissionsRequest,
	Attachment,
	AttachmentDownloadResponse,
	AuditLog,
	BatchImportRequest,
	BatchImportResponse,
	Branch,
	Brand,
	BulkReconcilePaymentsRequest,
	BulkReconcilePaymentsResponse,
	Category,
	Commune,
	Company,
	CompanyConfiguration,
	CreateAdministrativeDivisionInput,
	CreateAttachmentInput,
	CreateFeedbackQuestionInput,
	CreateFeedbackSubmissionRequest,
	CreateFeedbackTemplateInput,
	CreateInventoryImportRequest,
	CreateInvoiceFromOrderRequest,
	CreatePaymentRequest,
	CreatePaymentTermRequest,
	CreateSupplierReturnRequest,
	CreateSystemAdminInput,
	Customer,
	CustomerNearbyResult,
	CustomerReportRequest,
	CustomerReportSummary,
	CustomerVisitRecord,
	CustomerVisitRequest,
	DashboardReportData,
	DashboardStats,
	Delivery,
	DeliveryInput,
	Department,
	District,
	Division,
	FeedbackQuestion,
	FeedbackSubmission,
	FeedbackTemplate,
	ImportProductGroup,
	IncomeComparisonData,
	InventoryImport,
	InventoryImportItem,
	Invoice,
	InvoiceDiscountRequest,
	Loan,
	LoanDetails,
	MultiInvoicePaymentItem,
	MultiInvoicePaymentsPayload,
	MultiInvoicePaymentRequest,
	MultiVariantProductInput,
	NearbySearchRequest,
	Order,
	OrderChangeLogResponse,
	Paged,
	Payment,
	Permission,
	PreviewVariantInput,
	Product,
	ProductAddUnitsInput,
	ProductSearchRequest,
	Province,
	RefundInvoiceRequest,
	RegisterCompanyPayload,
	RegistrationTokenResponse,
	ReportRefreshResponse,
	Role,
	ServerFileResponse,
	ShopContact,
	SignInResponse,
	SingleVariantProductInput,
	SendRegistrationOtpPayload,
	Staff,
	Stock,
	StockAdjustmentAudit,
	StockAdjustmentPayload,
	StockMovement,
	StockCheckRequest,
	StockCheckResponse,
	SubmissionFilterParams,
	SubmitEvaluationRequest,
	Supplier,
	SupplierReturn,
	SystemAdmin,
	SystemAdminListParams,
	TimeSeriesMetric,
	TimeSeriesMetricItem,
	Unit,
	UpdateAdministrativeDivisionInput,
	UpdateAttachmentInput,
	UpdateInvoicePaymentTermRequest,
	UpdateProductInput,
	UpdateSystemAdminInput,
	UpdateVariantInput,
	UploadUrlResponse,
	User,
	UserProfile,
	VariantUnit,
	VerifyOrderItemsRequest,
	VerifyRegistrationOtpPayload,
	VerifyResetOtpResponse,
	Village,
	Warehouse
} from "@/lib/types";
import {
	formatUnitDiscountNote,
	normalizeDiscountType,
	validateProductAddUnitsInput,
} from "@/lib/product-unit-pricing";
import type {
	ActiveSubscription,
	CancelSubscriptionRequest,
	CompanyEntitlement,
	CompanySubscriptionGroup,
	FeatureItem,
	FeatureRequest,
	PlanDetail,
	PlanPriceDetail,
	PlanPriceGroupResponse,
	PlanPriceRequest,
	PlanRequest,
	SubscribeRequest,
	SubscriptionAuditLog,
} from "@/types/subscription";
export {
	FileUploaderFactory, uploadService, type UploadOptions,
	type UploadResult,
	type UploaderStrategyType
};

export interface ListParams {
	page?: number;
	limit?: number;
	search?: string;
	status?: string;
	includeDeleted?: boolean;
	signal?: AbortSignal;
	[key: string]: any;
}

function listQuery(params: ListParams = {}) {
	const page = params.page ?? 1;
	return {
		page: Math.max(0, page - 1),
		limit: params.limit ?? 10,
		search: params.search || undefined,
		status: params.status || undefined,
		includeDeleted: params.includeDeleted ? "true" : undefined,
	};
}

/**
 * Safely converts raw backend lists, Spring Data PageResponse ({ content, totalElements }),
 * or custom Paged objects into a normalized Paged<T> structure with guaranteed .items array.
 */
export function normalizePaged<T>(data: any): Paged<T> {
	if (!data) {
		return { items: [], page: 1, limit: 10, total: 0, totalPages: 1 };
	}
	if (
		typeof data === "object" &&
		data.data &&
		typeof data.data === "object" &&
		!Array.isArray(data.data) &&
		(Array.isArray(data.data.content) ||
			Array.isArray(data.data.items) ||
			typeof data.data.totalElements === "number")
	) {
		data = data.data;
	}
	if (Array.isArray(data)) {
		return {
			items: data,
			page: 1,
			limit: data.length || 10,
			total: data.length,
			totalPages: 1,
		};
	}
	if (typeof data === "object") {
		const items = Array.isArray(data.items)
			? data.items
			: Array.isArray(data.content)
				? data.content
				: Array.isArray(data.data)
					? data.data
					: [];
		const total =
			typeof data.total === "number"
				? data.total
				: typeof data.totalElements === "number"
					? data.totalElements
					: items.length;
		const page =
			typeof data.page === "number"
				? data.page
				: typeof data.pageNumber === "number"
					? data.pageNumber + 1
					: 1;
		const limit =
			typeof data.limit === "number"
				? data.limit
				: typeof data.pageSize === "number"
					? data.pageSize
					: 10;
		const totalPages =
			typeof data.totalPages === "number"
				? data.totalPages
				: Math.ceil(total / (limit || 1)) || 1;
		return { items, page, limit, total, totalPages };
	}
	return { items: [], page: 1, limit: 10, total: 0, totalPages: 1 };
}

export function searchBody(
	params: ListParams = {},
	searchFields: string[] = ["name"],
) {
	const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
	const size = params.limit ?? 10;
	const body: any = {
		page: pageZeroBased,
		size: size,
		sort: [{ field: "createdAt", direction: "DESC" }],
	};

	if (params.search && params.search.trim()) {
		const term = params.search.trim();
		body.filterGroup = {
			logic: "OR",
			criteria: searchFields.map((field) => ({
				field,
				operator: "LIKE",
				value: term,
			})),
		};
	}

	return body;
}

export async function fetchSearchList<T>(
	endpoint: string,
	params: ListParams = {},
	searchFields: string[] = ["name"],
): Promise<Paged<T>> {
	const body = searchBody(params, searchFields);
	const signal = params.signal;
	try {
		const res = await api.post<Paged<T>>(`${endpoint}/search`, body, {
			signal,
		});
		return normalizePaged<T>(res.data);
	} catch (err: any) {
		if (
			err?.status === 405 ||
			err?.status === 404 ||
			err?.response?.status === 405 ||
			err?.response?.status === 404
		) {
			const res = await api.get<Paged<T>>(endpoint, {
				params: listQuery(params),
				signal,
			});
			return normalizePaged<T>(res.data);
		}
		throw err;
	}
}

export const authApi = {
	signIn: async (body: { username: string; password: string }) => {
		try {
			const res = await api.post<SignInResponse>("/auth/login", body);
			return res.data;
		} catch (err: any) {
			if (err?.status === 404) {
				const res = await api.post<SignInResponse>("/auth/sign-in", body);
				return res.data;
			}
			throw err;
		}
	},
	refreshToken: (refreshToken?: string) =>
		api
			.post<SignInResponse>("/auth/refresh-token", { refreshToken })
			.then((r) => r.data),
	signOut: () =>
		api
			.post("/auth/logout")
			.catch(() => api.post("/auth/sign-out"))
			.then((r) => r.data),
	forgotPassword: (body: { identifier: string }) =>
		api.post<string>("/auth/forgot-password", body).then((r) => r.data),
	verifyResetOtp: (body: { identifier: string; otpCode: string }) =>
		api
			.post<VerifyResetOtpResponse>("/auth/verify-reset-otp", body)
			.then((r) => r.data),
	resetPassword: (body: {
		identifier: string;
		resetToken: string;
		newPassword: string;
	}) => api.post<string>("/auth/reset-password", body).then((r) => r.data),
	setNewPassword: (body: {
		resetToken: string;
		newPassword: string;
		confirmPassword: string;
	}) => api.post<string>("/auth/set-new-password", body).then((r) => r.data),
	changePassword: (body: { currentPassword: string; newPassword: string }) =>
		api.post<string>("/auth/change-password", body).then((r) => r.data),
	registerByAdmin: (body: any) =>
		api.post("/auth/register-by-admin", body).then((r) => r.data),
	registerCompany: (body: RegisterCompanyPayload) =>
		api.post<any>("/auth/register-company", body).then((r) => r.data),
	sendRegistrationOtp: (body: SendRegistrationOtpPayload) =>
		api.post<string>("/auth/send-registration-otp", body).then((r) => r.data),
	verifyRegistrationOtp: (body: VerifyRegistrationOtpPayload) =>
		api
			.post<RegistrationTokenResponse>("/auth/verify-registration-otp", body)
			.then((r) => r.data),
};

// ---- Profile -------------------------------------------------
export const profileApi = {
	me: async (): Promise<any> => {
		const res = await api.get<any>("/me");
		const d = res.data?.data || res.data;
		const up = d?.userProfile || d?.systemAdminProfile || d;
		const company = d?.company || up?.company;

		const firstName = up?.firstname || up?.firstName || "";
		const lastName = up?.lastname || up?.lastName || "";
		const phone = up?.phone || up?.primaryPhone || up?.contact || "";
		const status = up?.status || d?.status || "ACTIVE";
		const isActive =
			status === "ACTIVE" || Boolean(up?.active) || Boolean(d?.isActive);

		const profileResult = {
			...up,
			id: up?.id || d?.id,
			username: d?.username || up?.username || "",
			email: d?.email || up?.email || "",
			displayName:
				d?.displayName ||
				`${firstName} ${lastName}`.trim() ||
				d?.username ||
				"",
			firstName,
			lastName,
			firstname: firstName,
			lastname: lastName,
			phone,
			contact: phone,
			gender: up?.gender || "",
			imageUrl: up?.imageUrl || d?.imageUrl || "",
			avatarUrl: up?.imageUrl || d?.imageUrl || "",
			avatarKey: up?.imageUrl || d?.imageUrl || "",
			bio: up?.bio || "",
			position: up?.position || "",
			address: up?.address || "",
			emergencyPhone: up?.emergencyPhone || "",
			dob: up?.dob || "",
			employmentDate: up?.employmentDate || "",
			employeeCode: up?.employeeCode || "",
			status,
			active: isActive,
			isActive,
			isSystemAdmin: Boolean(
				d?.systemAdmin ||
					d?.accountType === "SYSTEM_ADMIN" ||
					up?.isSystemAdmin ||
					up?.accountType === "SYSTEM_ADMIN",
			),
			isSuperAdmin: Boolean(
				up?.isSuperAdmin ||
					(Array.isArray(up?.roles) &&
						up.roles.some((r: any) => (r?.name || r) === "SUPER_ADMIN")),
			),
			company: company || null,
			companyName: company?.name || company?.companyName || "",
			division: up?.division || null,
			divisionName: up?.division?.name || up?.divisionName || "",
			department: up?.department || null,
			departmentName: up?.department?.name || up?.departmentName || "",
			roles: Array.isArray(up?.roles)
				? up.roles
				: Array.isArray(d?.roles)
					? d.roles
					: [],
			permissions: Array.isArray(up?.permissions)
				? up.permissions
				: Array.isArray(d?.permissions)
					? d.permissions
					: [],
			groups: Array.isArray(up?.groups) ? up.groups : [],
			isCompletedSetup: up?.isCompletedSetup ?? true,
			lastLoginAt: up?.lastLogin || up?.lastLoginAt || d?.lastLoginAt || null,
			accountType: d?.accountType || (d?.systemAdmin ? "SYSTEM_ADMIN" : "USER"),
		};

		if (typeof window !== "undefined") {
			try {
				localStorage.setItem(
					"rumluos_user_profile",
					JSON.stringify(profileResult),
				);
			} catch {}
		}

		return profileResult;
	},
	getCachedProfile: (): any => {
		if (typeof window === "undefined") return undefined;
		try {
			const cached = localStorage.getItem("rumluos_user_profile");
			return cached ? JSON.parse(cached) : undefined;
		} catch {
			return undefined;
		}
	},
	update: async (body: any) => {
		const payload = {
			firstname: body.firstName || body.firstname,
			lastname: body.lastName || body.lastname,
			phone: body.contact || body.phone,
			primaryPhone: body.contact || body.phone,
			imageUrl: body.avatarKey || body.imageUrl,
			position: body.position,
			address: body.address,
			bio: body.bio,
			gender: body.gender,
			dob: body.dob,
			emergencyPhone: body.emergencyPhone,
		};

		if (body.id) {
			try {
				return await api.put(`/users/${body.id}`, payload).then((r) => r.data);
			} catch {}
		}

		return api
			.put("/users/complete-setup", payload)
			.catch(() => api.put("/users/me/profile", payload))
			.then((r) => r.data);
	},
	updateAvatarUrl: async (userId: string | number, imageUrl: string) => {
		return api
			.patch<any>(`/users/${userId}/image-url`, { imageUrl })
			.catch((err: any) => {
				if (err?.status === 405 || err?.response?.status === 405) {
					return api.put<any>(`/users/${userId}/image-url`, { imageUrl });
				}
				throw err;
			})
			.then((r) => r.data);
	},
	completeSetup: (body: Partial<UserProfile> | any) => {
		const payload = { ...body };
		if (payload.dob) {
			const str = String(payload.dob).trim();
			const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
			if (dmy) {
				payload.dob = `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
			} else {
				const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
				if (ymd) {
					payload.dob = `${ymd[3].padStart(2, "0")}-${ymd[2].padStart(2, "0")}-${ymd[1]}`;
				}
			}
		}
		return api
			.post<UserProfile>("/users/complete-setup", payload)
			.then((r) => r.data);
	},
	changePassword: (body: {
		currentPassword: string;
		newPassword: string;
		confirmPassword?: string;
	}) =>
		api
			.post<string>("/auth/change-password", {
				currentPassword: body.currentPassword,
				newPassword: body.newPassword,
				confirmPassword: body.confirmPassword || body.newPassword,
			})
			.then((r) => r.data),
};

// ---- Reports & Dashboard Analytics --------------------------
export interface ReportFilterParams {
	startDate?: string;
	endDate?: string;
	preset?: string;
	companyId?: string | number | null;
	userId?: string | number | null;
}

function formatReportDateTime(
	dateStr?: string,
	isEnd = false,
): string | undefined {
	if (!dateStr) return undefined;
	if (dateStr.includes("T")) return dateStr;
	return isEnd ? `${dateStr}T23:59:59` : `${dateStr}T00:00:00`;
}

function buildReportQueryParams(
	params?: ReportFilterParams,
): Record<string, any> {
	// Only companyId goes into the URL query string
	let companyId = params?.companyId;
	if (companyId === undefined || companyId === null || companyId === "") {
		if (typeof window !== "undefined") {
			const stored =
				localStorage.getItem("rumluos_company_id") ||
				document.cookie.match(/(?:^|; )rumluos_company_id=([^;]*)/)?.[1];
			if (stored) companyId = stored;
		}
	}
	const query: Record<string, any> = {};
	if (companyId !== undefined && companyId !== null && companyId !== "") {
		query.companyId = !isNaN(Number(companyId)) ? Number(companyId) : companyId;
	}
	return query;
}

function buildReportBody(params?: ReportFilterParams): Record<string, any> {
	// startDate, endDate, userId, preset go in the POST body
	const body: Record<string, any> = {};
	if (params?.startDate)
		body.startDate = formatReportDateTime(params.startDate, false);
	if (params?.endDate)
		body.endDate = formatReportDateTime(params.endDate, true);
	if (params?.preset) body.preset = params.preset;
	if (
		params?.userId !== undefined &&
		params?.userId !== null &&
		params?.userId !== "" &&
		params?.userId !== "ALL"
	) {
		body.userId = !isNaN(Number(params.userId))
			? Number(params.userId)
			: params.userId;
	}
	return body;
}

export const reportsApi = {
	/**
	 * POST /reports/dashboard?companyId=5
	 * Body: { startDate, endDate, userId, preset }
	 */
	getDashboard: (params?: ReportFilterParams) => {
		const queryParams = buildReportQueryParams(params);
		const body = buildReportBody(params);
		return api
			.post<DashboardReportData>("/reports/dashboard", body, {
				params: queryParams,
			})
			.then((r: any) => (r.data !== undefined ? r.data : r));
	},

	/**
	 * POST /reports/time-series?companyId=5
	 * Body: { startDate, endDate, userId, preset }
	 */
	getTimeSeries: (params?: ReportFilterParams) => {
		const queryParams = buildReportQueryParams(params);
		const body = buildReportBody(params);
		return api
			.post<TimeSeriesMetricItem[]>("/reports/time-series", body, {
				params: queryParams,
			})
			.then((r: any) => (r.data !== undefined ? r.data : r));
	},

	getIncomeComparison: () => {
		return api
			.get<IncomeComparisonData>("/reports/income-comparison")
			.then((r: any) => (r.data !== undefined ? r.data : r));
	},

	refreshReports: () =>
		api
			.post<ReportRefreshResponse>("/reports/refresh")
			.catch(() => api.get<ReportRefreshResponse>("/reports/refresh"))
			.then((r: any) => (r.data !== undefined ? r.data : r)),
};

// ---- Dashboard Legacy / Alias --------------------------------
export const dashboardApi = {
	stats: () => api.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
	reports: reportsApi.getDashboard,
	timeSeries: reportsApi.getTimeSeries,
	incomeComparison: reportsApi.getIncomeComparison,
	refresh: reportsApi.refreshReports,
};

// ---- Companies (super admin) ---------------------------------
export interface CompanyListParams extends ListParams {
	includeDeleted?: boolean;
	subscriptionStatus?: string;
	sortBy?: string;
	orderBy?: "ASC" | "DESC" | string;
}

export interface CompanyInput {
	name: string;
	email: string;
	phone?: string;
	phoneNumber?: string;
	address?: string;
	description?: string;
	note?: string;
	lat?: number | null;
	lng?: number | null;
	enableBranch?: boolean;
	ownerUsername?: string;
	ownerPassword?: string;
	username?: string;
	active?: boolean;
	isActive?: boolean;
}

// ---- Mapping Helpers ------------------------------------------
function mapCompanyFromBackend(c: any): Company {
	if (!c) return c;
	const phone = c.phoneNumber || c.phone || "";
	const note = c.note || c.description || "";
	const active =
		c.active !== undefined
			? c.active
			: c.isActive !== undefined
				? c.isActive
				: true;
	return {
		...c,
		id: c.id,
		name: c.name || "",
		username: c.username || c.ownerUsername || "",
		email: c.email || "",
		phone,
		phoneNumber: phone,
		address: c.address || "",
		note,
		description: note,
		lat:
			typeof c.lat === "number" ? c.lat : c.lat ? parseFloat(c.lat) : undefined,
		lng:
			typeof c.lng === "number" ? c.lng : c.lng ? parseFloat(c.lng) : undefined,
		enableBranch: Boolean(c.enableBranch),
		active,
		isActive: active,
		deletedAt: c.deletedAt || null,
		createdAt: c.createdAt || "",
		updatedAt: c.updatedAt || null,
		subscription: c.subscription
			? {
					planName:
						c.subscription.planName || c.subscription.name || "Free Tier",
					planPrice:
						typeof c.subscription.planPrice === "number"
							? c.subscription.planPrice
							: parseFloat(c.subscription.planPrice || 0) || 0,
					billingCycle: c.subscription.billingCycle || "FREE_TIER",
					startDate: c.subscription.startDate,
					endDate: c.subscription.endDate,
					status: (c.subscription.status || "TRIAL").toUpperCase(),
				}
			: null,
	};
}

function mapCompanyToBackend(c: any): any {
	if (!c) return c;
	const {
		active,
		isActive,
		phone,
		phoneNumber,
		description,
		note,
		ownerUsername,
		username,
		...rest
	} = c;
	const effectiveActive =
		active !== undefined ? active : isActive !== undefined ? isActive : true;
	return {
		...rest,
		active: effectiveActive,
		isActive: effectiveActive,
		phone: phone || phoneNumber,
		phoneNumber: phoneNumber || phone,
		description: description || note,
		note: note || description,
		username: username || ownerUsername,
		ownerUsername: ownerUsername || username,
	};
}

function mapBranchFromBackend(b: any): any {
	if (!b) return b;
	return {
		...b,
		active: b.active !== undefined ? b.active : b.isActive,
	};
}

function mapBranchToBackend(b: any): any {
	if (!b) return b;
	const { active, ...rest } = b;
	return {
		...rest,
		isActive: active,
	};
}

function mapStaffFromBackend(s: any): Staff {
	if (!s) return s;
	const nameParts = (s.name || "").trim().split(/\s+/);
	const firstName = nameParts[0] || "";
	const lastName = nameParts.slice(1).join(" ") || "";
	const documents = Array.isArray(s.documents)
		? s.documents.map((doc: any) => ({
				fileKey: doc.url || "",
				fileName: doc.fileName || "",
			}))
		: [];
	return {
		...s,
		firstName,
		lastName,
		documents,
		active: s.active !== undefined ? s.active : s.isActive,
	};
}

function mapStaffToBackend(s: Partial<StaffInput>): any {
	if (!s) return s;
	const { firstName, lastName, documents, ...rest } = s;
	const name = [firstName, lastName].filter(Boolean).join(" ");
	const mappedDocuments = Array.isArray(documents)
		? documents.map((doc: any) => ({
				url: doc.fileKey || "",
				fileName: doc.fileName || "",
				docType: "DOCUMENT",
			}))
		: undefined;
	return {
		...rest,
		name,
		documents: mappedDocuments,
	};
}

export const companiesApi = {
	list: (params: CompanyListParams = {}) => {
		const page = params.page !== undefined ? Math.max(0, params.page - 1) : 0;
		const size = params.limit ?? (params as any).size ?? 10;
		const queryParams: Record<string, any> = {
			...listQuery(params),
			page,
			size,
			sortBy: params.sortBy || "createdAt",
			orderBy: params.orderBy || "DESC",
		};
		if (params.search) queryParams.search = params.search;
		if (params.includeDeleted !== undefined)
			queryParams.includeDeleted = params.includeDeleted;
		if (params.subscriptionStatus && params.subscriptionStatus !== "ALL") {
			queryParams.subscriptionStatus = params.subscriptionStatus;
		}

		return api
			.get<Paged<Company>>("/companies", { params: queryParams })
			.then((r) => {
				const paged = normalizePaged<Company>(r.data);
				paged.items = paged.items.map(mapCompanyFromBackend);
				return paged;
			});
	},
	get: async (id: string | number) => {
		try {
			const res = await api.get<
				Company & {
					branchCount?: number;
					staffCount?: number;
					userCount?: number;
				}
			>(`/companies/${id}`);
			return mapCompanyFromBackend(res.data);
		} catch (err: any) {
			if (err?.status === 403 || err?.response?.status === 403) {
				return companiesApi.getProfile();
			}
			throw err;
		}
	},
	getProfile: () =>
		api
			.get<
				Company & {
					branchCount?: number;
					staffCount?: number;
					userCount?: number;
				}
			>("/companies/me")
			.then((r) => mapCompanyFromBackend(r.data)),
	updateProfile: (body: Partial<CompanyInput>) =>
		api
			.put<Company>("/companies/me", mapCompanyToBackend(body))
			.then((r) => mapCompanyFromBackend(r.data)),
	create: (body: CompanyInput) =>
		api
			.post<Company>("/companies", mapCompanyToBackend(body))
			.then((r) => mapCompanyFromBackend(r.data)),
	update: async (id: string | number, body: Partial<CompanyInput>) => {
		try {
			const res = await api.put<Company>(
				`/companies/${id}`,
				mapCompanyToBackend(body),
			);
			return mapCompanyFromBackend(res.data);
		} catch (err: any) {
			if (err?.status === 403 || err?.response?.status === 403) {
				return companiesApi.updateProfile(body);
			}
			throw err;
		}
	},
	remove: (id: string | number) =>
		api.delete(`/companies/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api
			.patch<Company>(`/companies/${id}/restore`)
			.then((r) => mapCompanyFromBackend(r.data)),
	toggleActive: (id: string | number) =>
		api
			.patch<Company>(`/companies/${id}/toggle-active`)
			.then((r) => mapCompanyFromBackend(r.data)),
};

// ---- System admins (super admin) -----------------------------
export const adminsApi = {
	list: (params: SystemAdminListParams = {}) => {
		const page = params.page !== undefined ? Math.max(0, params.page - 1) : 0;
		const size = params.size ?? params.limit ?? 10;
		const queryParams: Record<string, any> = {
			page,
			size,
			sortBy: params.sortBy || "createdAt",
			orderBy: params.orderBy || "DESC",
		};
		if (params.level && params.level !== "ALL") {
			queryParams.level = params.level;
		}
		if (params.search) {
			queryParams.search = params.search;
		}
		return api
			.get<Paged<SystemAdmin>>("/system_admins", { params: queryParams })
			.then((r) => normalizePaged<SystemAdmin>(r.data));
	},
	get: (id: string | number) =>
		api.get<SystemAdmin>(`/system_admins/${id}`).then((r) => r.data),
	create: (body: CreateSystemAdminInput) =>
		api.post<SystemAdmin>("/system_admins", body).then((r) => r.data),
	update: (id: string | number, body: UpdateSystemAdminInput) =>
		api.put<SystemAdmin>(`/system_admins/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/system_admins/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch<SystemAdmin>(`/system_admins/${id}/restore`).then((r) => r.data),
};

export interface ConfigurationListParams extends ListParams {
	companyId?: string | number;
	scope?: string;
	configKey?: string;
	category?: string;
}

export interface ConfigurationInput {
	companyId?: string | number | null;
	configKey: string;
	configValue: any;
	valueType?: string;
	scope?: "SYSTEM" | "COMPANY" | string;
	category?: string;
	defaultValue?: string | null;
	description?: string | null;
	validationRule?: string | null;
	isEncrypted?: boolean;
	isReadOnly?: boolean;
	displayOrder?: number;
	overridden?: boolean;
}

function normalizeConfigurationGroups(
	data: any,
): import("@/types/configuration").ConfigurationDomainGroup[] {
	if (!data) return [];

	let rawGroups: import("@/types/configuration").ConfigurationDomainGroup[] =
		[];

	// If already array of domain groups containing sections array
	if (
		Array.isArray(data) &&
		data.length > 0 &&
		Array.isArray(data[0].sections)
	) {
		rawGroups = data;
	} else {
		// Extract items if wrapped
		let items: any[] = [];
		if (Array.isArray(data)) {
			items = data;
		} else if (Array.isArray(data?.items)) {
			items = data.items;
		} else if (Array.isArray(data?.content)) {
			items = data.content;
		} else if (Array.isArray(data?.data)) {
			items = data.data;
		}

		if (items.length === 0) return [];

		// Group items by category and section/groupName
		const domainMap = new Map<
			string,
			{ category: any; categoryLabel: string; sectionsMap: Map<string, any[]> }
		>();

		for (const item of items) {
			const category = (item.category || "GENERAL").toUpperCase();
			const categoryLabel =
				category.charAt(0) + category.slice(1).toLowerCase() + " Settings";
			const sectionName =
				item.groupName ||
				item.configKey?.split(".")[0]?.toUpperCase() ||
				"General Settings";

			if (!domainMap.has(category)) {
				domainMap.set(category, {
					category,
					categoryLabel,
					sectionsMap: new Map(),
				});
			}

			const domain = domainMap.get(category)!;
			if (!domain.sectionsMap.has(sectionName)) {
				domain.sectionsMap.set(sectionName, []);
			}
			domain.sectionsMap.get(sectionName)!.push(item);
		}

		let displayOrder = 1;
		for (const [category, domain] of domainMap.entries()) {
			const sections: import("@/types/configuration").ConfigurationSectionGroup[] =
				[];
			let totalCount = 0;

			for (const [sectionName, configs] of domain.sectionsMap.entries()) {
				sections.push({
					sectionName,
					configurations: configs,
				});
				totalCount += configs.length;
			}

			rawGroups.push({
				category: category as any,
				categoryLabel: domain.categoryLabel,
				description: `Manage ${category.toLowerCase()} configuration parameters`,
				icon: category.toLowerCase(),
				displayOrder: displayOrder++,
				totalConfigurations: totalCount,
				sections,
			});
		}
	}

	// POST-PROCESS GROUPS:
	// 1. Remove any "Early Settlement Discounts" / "Early Payment Discount" configurations and sections
	// 2. Move "Visit Tracking" (visit_status_thresholds / visit_status) from CUSTOMER (or anywhere) to DOCUMENT domain
	const isEarlyDiscount = (key: string, name?: string) => {
		const k = (key || "").toLowerCase();
		const n = (name || "").toLowerCase();
		return (
			k.includes("early_discount") ||
			k.includes("early_payment") ||
			k.includes("discount_tier") ||
			k.includes("earlypayment") ||
			k.includes("payment_discount") ||
			n.includes("early settlement discount") ||
			n.includes("early payment discount")
		);
	};

	const isVisitTracking = (key: string, name?: string) => {
		const k = (key || "").toLowerCase();
		const n = (name || "").toLowerCase();
		return (
			k.includes("visit_status_thresholds") ||
			k.includes("visit_status") ||
			k.includes("visit_tracking") ||
			n.includes("visit tracking") ||
			n.includes("visit status")
		);
	};

	let visitTrackingConfigs: import("@/types/configuration").ConfigurationItem[] =
		[];

	// Clean existing groups
	const cleanedGroups = rawGroups
		.map((domain) => {
			const updatedSections: import("@/types/configuration").ConfigurationSectionGroup[] =
				[];

			for (const section of domain.sections) {
				if (isEarlyDiscount("", section.sectionName)) {
					continue; // Strip early discount section
				}

				const nonDiscountConfigs: import("@/types/configuration").ConfigurationItem[] =
					[];
				for (const cfg of section.configurations) {
					if (isEarlyDiscount(cfg.configKey, cfg.label)) {
						continue; // Strip early discount config
					}
					if (
						domain.category !== "DOCUMENT" &&
						isVisitTracking(cfg.configKey, section.sectionName)
					) {
						visitTrackingConfigs.push({
							...cfg,
							category: "DOCUMENT",
						});
						continue; // Will move to DOCUMENT domain
					}
					nonDiscountConfigs.push(cfg);
				}

				if (nonDiscountConfigs.length > 0) {
					updatedSections.push({
						...section,
						configurations: nonDiscountConfigs,
					});
				}
			}

			return {
				...domain,
				sections: updatedSections,
				totalConfigurations: updatedSections.reduce(
					(sum, s) => sum + s.configurations.length,
					0,
				),
			};
		})
		.filter(
			(d) =>
				d.category !== "CUSTOMER" &&
				(d.sections.length > 0 || d.category === "DOCUMENT"),
		);

	// Ensure DOCUMENT domain exists and has Visit Tracking section
	let docDomain = cleanedGroups.find(
		(d:any) => d.category === "DOCUMENT" || d.category === "INVOICE",
	);
	if (!docDomain) {
		docDomain = {
			category: "DOCUMENT",
			categoryLabel: "Invoices & Documents",
			description:
				"Prefixes, auto-numbering, layout headers, and template styling.",
			icon: "FileText",
			displayOrder: 4,
			totalConfigurations: 0,
			sections: [],
		};
		cleanedGroups.push(docDomain);
	}

	// Check if DOCUMENT domain already has a Visit Tracking section
	const existingVisitSec = docDomain.sections.find(
		(s) =>
			isVisitTracking("", s.sectionName) ||
			s.configurations.some((c) => isVisitTracking(c.configKey)),
	);

	if (!existingVisitSec) {
		if (visitTrackingConfigs.length === 0) {
			// Default visit tracking config if not supplied by backend
			visitTrackingConfigs = [
				{
					id: 407,
					configKey: "customer.visit_status_thresholds",
					label: "Visit Status & Map Pin Colors",
					configValue: [
						{
							id: 1,
							label: "Just Visited",
							color: "#22C55E",
							icon: "🟢",
							maxDays: 7,
							priority: 1,
						},
						{
							id: 2,
							label: "Follow Up Needed",
							color: "#F59E0B",
							icon: "🟡",
							maxDays: 14,
							priority: 2,
						},
						{
							id: 3,
							label: "Overdue Contact",
							color: "#FF8C00",
							icon: "🟠",
							maxDays: 30,
							priority: 3,
						},
						{
							id: 4,
							label: "Critical Inactive",
							color: "#EF4444",
							icon: "🔴",
							maxDays: 60,
							priority: 4,
						},
					],
					valueType: "JSON",
					scope: "COMPANY",
					category: "DOCUMENT",
					uiComponent: "JSON_EDITOR",
					defaultValue: JSON.stringify([
						{
							id: 1,
							label: "Just Visited",
							color: "#22C55E",
							icon: "🟢",
							maxDays: 7,
							priority: 1,
						},
						{
							id: 2,
							label: "Follow Up Needed",
							color: "#F59E0B",
							icon: "🟡",
							maxDays: 14,
							priority: 2,
						},
						{
							id: 3,
							label: "Overdue Contact",
							color: "#FF8C00",
							icon: "🟠",
							maxDays: 30,
							priority: 3,
						},
						{
							id: 4,
							label: "Critical Inactive",
							color: "#EF4444",
							icon: "🔴",
							maxDays: 60,
							priority: 4,
						},
					]),
					description:
						"Define threshold intervals and visual pin colors used across the customer activity map",
					isEncrypted: false,
					isReadOnly: false,
					isSystemAdminOnly: false,
					displayOrder: 3,
					overridden: true,
				},
			];
		}

		docDomain.sections.push({
			sectionName: "Visit Tracking",
			configurations: visitTrackingConfigs,
		});
		docDomain.totalConfigurations = docDomain.sections.reduce(
			(sum, s) => sum + s.configurations.length,
			0,
		);
	}

	return cleanedGroups;
}

export const configurationsApi = {
	/**
	 * GET /v1/configurations/grouped
	 * Returns all configurations grouped by domain/category for the settings UI.
	 * Pass companyId to get company-scoped overrides merged with system defaults.
	 */
	getGrouped: async (companyId?: string | number) => {
		try {
			const res = await api.get<any>("/configurations/grouped", {
				params: companyId && companyId !== "all" ? { companyId } : undefined,
			});
			const grouped = normalizeConfigurationGroups(res.data);
			if (grouped.length > 0) return grouped;
		} catch (err: any) {
			if (
				err?.status !== 404 &&
				err?.status !== 405 &&
				err?.response?.status !== 404 &&
				err?.response?.status !== 405
			) {
				throw err;
			}
		}

		// Fallback if backend presents flat /configurations endpoint
		const fallbackRes = await api
			.get<any>("/configurations", {
				params: {
					limit: 500,
					companyId: companyId && companyId !== "all" ? companyId : undefined,
				},
			})
			.catch(() =>
				api.post<any>("/configurations/search", {
					page: 0,
					size: 500,
					companyId: companyId && companyId !== "all" ? companyId : undefined,
				}),
			);

		return normalizeConfigurationGroups(fallbackRes.data);
	},

	/**
	 * GET /v1/configurations/{configKey}
	 * Returns the resolved value for a single config key.
	 */
	getByKey: (configKey: string, companyId?: string | number) =>
		api
			.get<import("@/types/configuration").ConfigurationItem>(
				`/configurations/${encodeURIComponent(configKey)}`,
				{
					params: companyId && companyId !== "all" ? { companyId } : undefined,
				},
			)
			.then((r) => r.data),

	/**
	 * PUT /v1/configurations/{configKey}
	 * Create or update a COMPANY-scoped override for a config key.
	 * Body: { configValue: <new_value> }
	 */
	upsertByKey: (configKey: string, configValue: any) =>
		api
			.put<import("@/types/configuration").ConfigurationItem>(
				`/configurations/${encodeURIComponent(configKey)}`,
				{ configValue },
			)
			.then((r) => r.data),

	/**
	 * POST /v1/configurations/batch
	 * Batch update configuration items in a single request.
	 */
	batchUpdate: async (
		body: import("@/types/configuration").BatchUpdateRequest,
	) => {
		try {
			const res = await api.post<{
				success?: boolean;
				updated: number;
				items?: import("@/types/configuration").ConfigurationItem[];
				timestamp?: string;
			}>("/configurations/batch", body);
			return res.data;
		} catch (err: any) {
			if (
				err?.status === 404 ||
				err?.status === 405 ||
				err?.response?.status === 404 ||
				err?.response?.status === 405
			) {
				const results: any[] = [];
				for (const item of body.items) {
					const r = await api
						.put<any>(
							`/configurations/${encodeURIComponent(item.configKey)}`,
							item,
						)
						.catch(() =>
							api.put<any>(
								`/configurations/${encodeURIComponent(item.configKey)}`,
								{ configValue: item.configValue },
							),
						)
						.then((res) => res.data);
					results.push(r);
				}
				return { success: true, updated: results.length, items: results };
			}
			throw err;
		}
	},

	/**
	 * DELETE /v1/configurations/{configKey}
	 * Removes a COMPANY-scoped override, reverting to the SYSTEM default.
	 */
	resetByKey: (configKey: string) =>
		api
			.delete<{ success: boolean; message: string }>(
				`/configurations/${encodeURIComponent(configKey)}`,
			)
			.then((r) => r.data),

	list: async (params: ConfigurationListParams = {}) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const filters: any[] = [];

		if (params.companyId && params.companyId !== "all") {
			filters.push({
				field: "company",
				operator: "EQUAL",
				value: String(params.companyId),
			});
		}

		if (params.scope) {
			filters.push({
				field: "scope",
				operator: "EQUAL",
				value: String(params.scope),
			});
		}

		if (params.configKey) {
			filters.push({
				field: "configKey",
				operator: "EQUAL",
				value: String(params.configKey),
			});
		}

		if (params.category) {
			filters.push({
				field: "category",
				operator: "EQUAL",
				value: String(params.category),
			});
		}

		if (params.search && params.search.trim()) {
			filters.push({
				field: "configKey",
				operator: "LIKE",
				value: params.search.trim(),
			});
		}

		const searchPayload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: pageZeroBased,
			size: params.limit ?? 20,
		};

		try {
			const res = await api.post<Paged<CompanyConfiguration>>(
				"/configurations/search",
				searchPayload,
			);
			return normalizePaged<CompanyConfiguration>(res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				return api
					.get<Paged<CompanyConfiguration>>("/configurations", {
						params: {
							...listQuery(params),
							companyId: params.companyId || undefined,
						},
					})
					.catch(() =>
						api.get<Paged<CompanyConfiguration>>(
							"/super-admin/configurations",
							{
								params: {
									...listQuery(params),
									companyId: params.companyId || undefined,
								},
							},
						),
					)
					.then((r) => normalizePaged<CompanyConfiguration>(r.data));
			}
			throw err;
		}
	},
	get: (id: string | number) =>
		api
			.get<CompanyConfiguration>(`/configurations/${id}`)
			.catch(() =>
				api.get<CompanyConfiguration>(`/super-admin/configurations/${id}`),
			)
			.then((r) => r.data),
	create: (body: ConfigurationInput) =>
		api
			.post<CompanyConfiguration>("/configurations", body)
			.catch(() =>
				api.post<CompanyConfiguration>("/super-admin/configurations", body),
			)
			.then((r) => r.data),
	update: (id: string | number, body: Partial<ConfigurationInput>) =>
		api
			.put<CompanyConfiguration>(`/configurations/${id}`, body)
			.catch(() =>
				api.put<CompanyConfiguration>(
					`/super-admin/configurations/${id}`,
					body,
				),
			)
			.then((r) => r.data),
	updateByKey: (configKey: string, body: Partial<ConfigurationInput>) =>
		api
			.put<CompanyConfiguration>(
				`/configurations/${encodeURIComponent(configKey)}`,
				body,
			)
			.catch(() =>
				api.put<CompanyConfiguration>(
					`/super-admin/configurations/${encodeURIComponent(configKey)}`,
					body,
				),
			)
			.catch(() => api.post<CompanyConfiguration>("/configurations", body))
			.then((r) => r.data),
	remove: (id: string | number) =>
		api
			.delete(`/configurations/${id}`)
			.catch(() => api.delete(`/super-admin/configurations/${id}`))
			.then((r) => r.data),
};

// ---- Branches (tenant) ---------------------------------------
export interface BranchInput {
	name: string;
	phone: string;
	address: string;
	active?: boolean;
}

export const branchesApi = {
	list: (params: ListParams) =>
		fetchSearchList<Branch>("/branches", params, [
			"name",
			"address",
			"phone",
		]).then((paged) => {
			paged.items = paged.items.map(mapBranchFromBackend);
			return paged;
		}),
	create: (body: BranchInput) =>
		api
			.post<Branch>("/branches", mapBranchToBackend(body))
			.then((r) => mapBranchFromBackend(r.data)),
	update: (id: string, body: Partial<BranchInput>) =>
		api
			.put<Branch>(`/branches/${id}`, mapBranchToBackend(body))
			.then((r) => mapBranchFromBackend(r.data)),
	remove: (id: string) => api.delete(`/branches/${id}`).then((r) => r.data),
	restore: (id: string) =>
		api
			.patch<Branch>(`/branches/${id}/restore`)
			.then((r) => mapBranchFromBackend(r.data)),
};

// ---- Staff (tenant) ------------------------------------------
export interface StaffInput {
	firstName: string;
	lastName: string;
	position: string;
	salary: number;
	email: string;
	phone: string;
	branchId?: string | null;
	urgentContactName: string;
	urgentContactPhone: string;
	documents?: { fileKey: string; fileName: string }[];
	userId?: string | null;
}

export const staffApi = {
	list: (params: ListParams) =>
		fetchSearchList<Staff>("/staffs", params, [
			"name",
			"email",
			"position",
		]).then((paged) => {
			paged.items = paged.items.map(mapStaffFromBackend);
			return paged;
		}),
	get: (id: string) =>
		api.get<Staff>(`/staffs/${id}`).then((r) => mapStaffFromBackend(r.data)),
	create: (body: StaffInput) =>
		api
			.post<Staff>("/staffs", mapStaffToBackend(body))
			.then((r) => mapStaffFromBackend(r.data)),
	update: (id: string, body: Partial<StaffInput>) =>
		api
			.put<Staff>(`/staffs/${id}`, mapStaffToBackend(body))
			.then((r) => mapStaffFromBackend(r.data)),
	remove: (id: string) => api.delete(`/staffs/${id}`).then((r) => r.data),
	restore: (id: string) =>
		api
			.patch<Staff>(`/staffs/${id}/restore`)
			.then((r) => mapStaffFromBackend(r.data)),
};

// ---- Users (tenant) ------------------------------------------
export const usersApi = {
	list: (params: ListParams & { status?: string }) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const filters: any[] = [
			{
				field: "text",
				operator: "LIKE",
				value: params.search?.trim() || "",
			},
		];

		if (params.status && params.status !== "ALL") {
			filters.push({
				field: "status",
				operator: "EQUAL",
				value: params.status.toLowerCase(),
			});
		}

		const searchPayload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: pageZeroBased,
			size: params.limit ?? 10,
		};

		return api
			.post<Paged<User>>("/users/search", searchPayload)
			.catch((err: any) => {
				if (
					err?.status === 405 ||
					err?.status === 404 ||
					err?.response?.status === 405 ||
					err?.response?.status === 404
				) {
					return fetchSearchList<User>("/users", params, [
						"username",
						"email",
						"firstName",
						"lastName",
						"firstname",
						"lastname",
						"phone",
					]);
				}
				throw err;
			})
			.then((r: any) =>
				normalizePaged<User>(r.data !== undefined ? r.data : r),
			);
	},
	get: (id: string | number) =>
		api.get<User>(`/users/${id}`).then((r) => r.data),
	create: (body: {
		username: string;
		email: string;
		firstName: string;
		lastName: string;
		password: string;
		roleIds: (string | number)[];
	}) => api.post<User>("/users/register", body).then((r) => r.data),
	registerNewUser: (body: any) =>
		api.post<User>("/users/register-new-user", body).then((r) => r.data),
	update: (
		id: string | number,
		body: { roleIds?: (string | number)[]; active?: boolean; status?: string },
	) => api.put<User>(`/users/${id}`, body).then((r) => r.data),
	assignRoles: (id: string | number, roleIds: (string | number)[]) =>
		api
			.post<User>(`/users/${id}/roles`, {
				roleIds: roleIds.map((r) =>
					typeof r === "number" ? r : isNaN(Number(r)) ? r : Number(r),
				),
			})
			.catch(() => api.put<User>(`/users/${id}`, { roleIds }))
			.then((r) => r.data),
	assignCustomPermissions: (
		userId: string | number,
		payload:
			| { permissions: Record<string, string[]> }
			| AssignCustomPermissionsRequest,
		companyId?: string | number,
	) =>
		api
			.post<User>(`/users/${userId}/permissions`, payload, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data),
	assignPermissions: (
		id: string | number,
		permissionsPayload: any,
		companyId?: string | number,
	) =>
		api
			.post<User>(`/users/${id}/permissions`, permissionsPayload, {
				params: companyId ? { companyId } : undefined,
			})
			.catch(() =>
				api.post<User>(
					`/users/${id}/permissions`,
					{
						permissionIds: Array.isArray(permissionsPayload)
							? permissionsPayload
							: Object.keys(
									permissionsPayload.permissions || permissionsPayload,
								),
					},
					{
						params: companyId ? { companyId } : undefined,
					},
				),
			)
			.then((r) => r.data),
	excludePermissionsGrant: (id: string | number, permissionsPayload: any) =>
		api
			.delete<User>(`/users/${id}/exclude-permissions-grant`, {
				data: permissionsPayload,
			})
			.catch(() =>
				api.post<User>(`/users/${id}/exclude-permissions`, {
					permissionIds: Array.isArray(permissionsPayload)
						? permissionsPayload
						: Object.keys(permissionsPayload.permissions || permissionsPayload),
				}),
			)
			.then((r) => r.data),
	restorePermissionsGrant: (id: string | number, permissionsPayload: any) =>
		api
			.post<User>(`/users/${id}/restore-permissions-grant`, permissionsPayload)
			.catch(() =>
				api.post<User>(`/users/${id}/restore`, {
					permissionIds: Array.isArray(permissionsPayload)
						? permissionsPayload
						: Object.keys(permissionsPayload.permissions || permissionsPayload),
				}),
			)
			.then((r) => r.data),
	addPermissions: (id: string | number, permissionIds: string[]) =>
		api
			.post<User>(`/users/${id}/permissions`, { permissionIds })
			.then((r) => r.data),
	excludePermissions: (id: string | number, permissionIds: string[]) =>
		api
			.post<User>(`/users/${id}/exclude-permissions`, { permissionIds })
			.then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/users/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.post<User>(`/users/${id}/restore`).then((r) => r.data),
	updateUserImageUrl: (id: string | number, imageUrl: string) =>
		api
			.patch<any>(`/users/${id}/image-url`, { imageUrl })
			.catch((err: any) => {
				if (err?.status === 405 || err?.response?.status === 405) {
					return api.put<any>(`/users/${id}/image-url`, { imageUrl });
				}
				throw err;
			})
			.then((r) => r.data),
	adminResetPassword: (id: string | number, companyId?: string | number) =>
		api
			.post<AdminResetPasswordResponse>(`/users/${id}/admin-reset-password`, null, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data),
};

// ---- Roles & permissions (tenant) ----------------------------
import { normalizeRole } from "@/lib/role-utils";

export const rolesApi = {
	list: (params: ListParams) =>
		fetchSearchList<Role>("/roles", params, ["name", "description"]).then(
			(paged) => {
				paged.items = paged.items.map(normalizeRole);
				return paged;
			},
		),
	get: (id: string | number) =>
		api.get<any>(`/roles/${id}`).then((r) => {
			const rawData = r.data?.data || r.data;
			return normalizeRole(rawData);
		}),
	create: (body: any) =>
		api
			.post<Role>("/roles/actions", body)
			.catch((err) => {
				if (err?.status === 404 || err?.status === 405) {
					return api.post<Role>("/roles", body);
				}
				throw err;
			})
			.then((r) => normalizeRole(r.data)),
	update: (id: string | number, body: any) =>
		api
			.put<Role>(`/roles/${id}/actions`, body)
			.catch((err) => {
				if (err?.status === 404 || err?.status === 405) {
					return api.post<Role>(`/roles/${id}/actions`, body);
				}
				return api.put<Role>(`/roles/${id}`, body);
			})
			.catch(() => api.patch<Role>(`/roles/${id}`, body))
			.then((r) => normalizeRole(r.data)),
	remove: (id: string | number) =>
		api.delete(`/roles/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.post<Role>(`/roles/${id}/restore`).then((r) => normalizeRole(r.data)),
	excludePermissions: (id: string | number, permissionIds: string[]) =>
		api
			.post<Role>(`/roles/${id}/exclude-permissions`, { permissionIds })
			.then((r) => normalizeRole(r.data)),
};

export const permissionsApi = {
	list: (params: ListParams = {}) =>
		fetchSearchList<any>("/permissions", params, ["name", "description"]).then(
			(paged) => {
				const result: Permission[] = [];
				paged.items.forEach((perm: any) => {
					const rawDomain = perm.name || "General";
					const rawModule =
						perm.module ||
						(rawDomain.includes(".") ? rawDomain.split(".")[0] : rawDomain);
					const moduleName = String(rawModule).toUpperCase();
					const actions = Array.isArray(perm.actions)
						? perm.actions
						: Array.isArray(perm.grants)
							? perm.grants
							: [];

					if (actions.length === 0) {
						result.push({
							id: String(perm.id),
							name: rawDomain,
							module: moduleName,
							description: perm.description || `${rawDomain} permission`,
						});
					} else {
						actions.forEach((act: any) => {
							const action = act.name || act.actionName || "ACCESS";
							const code = rawDomain.includes(".")
								? `${rawDomain}.${action}`
								: `${rawDomain.toUpperCase()}.${action}`;
							const grantId = act.id ? String(act.id) : `${perm.id}-${action}`;
							result.push({
								id: grantId,
								name: code,
								module: moduleName,
								description:
									act.description ||
									perm.description ||
									`${action} operation for ${moduleName}`,
							});
						});
					}
				});
				paged.items = result as any;
				return paged;
			},
		),
	get: (id: string | number) =>
		api.get<any>(`/permissions/${id}`).then((r) => r.data),
	create: (body: { name: string; description?: string }) =>
		api.post<any>("/permissions", body).then((r) => r.data),
	update: (id: string | number, body: any) =>
		api.put<any>(`/permissions/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/permissions/${id}`).then((r) => r.data),
};

// ---- Storage: presigned S3-style upload ----------------------
export const storageApi = {
	getUploadUrl: (body: {
		fileName: string;
		contentType: string;
		isPublic?: boolean;
		folder?: string;
	}) =>
		api
			.post<UploadUrlResponse>("/storage/upload-url", body)
			.then((r) => r.data),
	getDownloadUrl: (key: string) =>
		api
			.get<{ downloadUrl: string }>(
				`/storage/download-url?key=${encodeURIComponent(key)}`,
			)
			.then((r) => r.data),
};

export async function uploadFile(
	file: File,
	options?: UploadOptions,
	strategy?: UploaderStrategyType,
): Promise<string> {
	const result = await uploadService.uploadSingle(file, options, strategy);
	return result.url || result.fileKey || result.storageKey || "";
}

export function fileUrl(fileKey: string | null | undefined) {
	if (!fileKey) return undefined;
	const trimmed = String(fileKey).trim();
	if (!trimmed || trimmed === "null" || trimmed === "undefined")
		return undefined;
	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:")
	) {
		return trimmed;
	}
	if (trimmed.startsWith("/")) {
		return trimmed;
	}
	if (trimmed.startsWith("public/")) {
		return `https://public-crm-amz-s3.s3.us-east-1.amazonaws.com/${trimmed}`;
	}
	return `/api/v1/storage/object/${trimmed.split("/").map(encodeURIComponent).join("/")}`;
}

export const DEFAULT_IMAGE_URL = "/images/bitcoin.png";

export function safeImageUrl(imageUrl: string | null | undefined): string {
	if (!imageUrl) return DEFAULT_IMAGE_URL;
	const trimmed = String(imageUrl).trim();
	if (
		!trimmed ||
		trimmed === "null" ||
		trimmed === "undefined" ||
		trimmed === "[object Object]" ||
		trimmed === "/api/v1/storage/object/" ||
		trimmed === "/placeholder.svg" ||
		trimmed === "/placeholder.jpg"
	) {
		return DEFAULT_IMAGE_URL;
	}
	if (trimmed.endsWith("/undefined") || trimmed.endsWith("/null")) {
		return DEFAULT_IMAGE_URL;
	}
	if (trimmed === "/bitcoin.png" || trimmed === "bitcoin.png") {
		return "/images/bitcoin.png";
	}
	if (
		trimmed.startsWith("http://") ||
		trimmed.startsWith("https://") ||
		trimmed.startsWith("/") ||
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:")
	) {
		return trimmed;
	}
	const resolved = fileUrl(trimmed);
	return resolved || DEFAULT_IMAGE_URL;
}

// ---- Attachments Management -----------------------------------
export interface AttachmentListParams extends ListParams {
	category?: string;
	branchId?: string | number;
}

export const attachmentsApi = {
	list: (params: AttachmentListParams = {}) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		return api
			.get<Paged<Attachment>>("/attachments", {
				params: {
					category: params.category || undefined,
					branchId: params.branchId || undefined,
					search: params.search || undefined,
					page: pageZeroBased,
					size: params.limit ?? 20,
				},
			})
			.then((r) => normalizePaged<Attachment>(r.data));
	},
	get: (id: string | number) =>
		api.get<Attachment>(`/attachments/${id}`).then((r) => r.data),
	create: (body: CreateAttachmentInput) =>
		api.post<Attachment>("/attachments", body).then((r) => r.data),
	update: (id: string | number, body: UpdateAttachmentInput) =>
		api.put<Attachment>(`/attachments/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/attachments/${id}`).then((r) => r.data),
	getDownloadUrl: (id: string | number) =>
		api
			.get<AttachmentDownloadResponse>(`/attachments/${id}/download-url`)
			.then((r) => r.data),
};

export async function uploadFileWithAttachment(
	file: File,
	options?: {
		category?: string;
		description?: string;
		branchId?: number | string;
		isPublic?: boolean;
		onProgress?: (percent: number) => void;
	},
	strategy?: UploaderStrategyType,
): Promise<Attachment> {
	const uploadResult = await uploadService.uploadSingle(
		file,
		{
			category: options?.category,
			description: options?.description,
			branchId: options?.branchId,
			isPublic: options?.isPublic,
			onProgress: options?.onProgress,
		},
		strategy,
	);

	const finalUrl =
		uploadResult.url ||
		(uploadResult.fileKey ? fileUrl(uploadResult.fileKey) : "") ||
		"";
	const finalKey = uploadResult.fileKey || uploadResult.storageKey || finalUrl;

	// Only call attachmentsApi.create if explicitly using S3 strategy
	if (strategy === "s3") {
		try {
			const created = await attachmentsApi.create({
				fileName:
					uploadResult.originalFileName || uploadResult.fileName || file.name,
				fileKey: finalKey,
				mimeType:
					uploadResult.mimeType || file.type || "application/octet-stream",
				fileSize: uploadResult.size || file.size,
				category: options?.category || "DOCUMENTS",
				description: options?.description,
				branchId: options?.branchId ? Number(options.branchId) : null,
				isPublic: options?.isPublic ?? true,
			});
			return {
				...created,
				fileUrl: created.fileUrl || finalUrl,
			};
		} catch {
			// Fallback
		}
	}

	return {
		id: uploadResult.id ? Number(uploadResult.id) : Date.now(),
		fileName:
			uploadResult.originalFileName || uploadResult.fileName || file.name,
		fileKey: finalKey,
		fileUrl: finalUrl,
		fileSize: uploadResult.size || file.size,
		mimeType: uploadResult.mimeType || file.type || "application/octet-stream",
		category: options?.category || "DOCUMENTS",
		description: options?.description,
		isPublic: options?.isPublic ?? true,
		branchId: options?.branchId ? Number(options.branchId) : null,
		createdAt: uploadResult.createdAt || new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	} as unknown as Attachment;
}

// ---- Customers (tenant) --------------------------------------
export const customersApi = {
	list: (
		params: ListParams & { filterGroup?: any; sort?: any[]; search?: string },
	) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const size = params.limit ?? 10;
		const filters: any[] = [];

		// 1. Text search criterion: field="text", operator="SW"
		if (params.search && params.search.trim()) {
			filters.push({
				field: "text",
				operator: "SW",
				value: params.search.trim(),
			});
		}

		// 2. Incoming filterGroup filters (Domain Filters, addressCode, etc.)
		if (params.filterGroup) {
			const incomingFilters =
				params.filterGroup.filters ||
				params.filterGroup.criteria ||
				(Array.isArray(params.filterGroup) ? params.filterGroup : []);

			incomingFilters.forEach((f: any) => {
				if (f.field === "text" && params.search?.trim()) return;
				const normalizedOp =
					f.operator === "EQUAL"
						? "EQ"
						: f.operator === "STARTS_WITH"
							? "SW"
							: f.operator === "LIKE"
								? f.field === "addressCode"
									? "EQ"
									: "SW"
								: f.operator || "EQ";

				filters.push({
					field: f.field,
					operator: normalizedOp,
					value: f.value,
					...(f.valueTo !== undefined ? { valueTo: f.valueTo } : {}),
					...(f.values !== undefined ? { values: f.values } : {}),
				});
			});
		}

		const body: any = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			page: pageZeroBased,
			size: size,
			sort: params.sort || [{ field: "createdAt", direction: "DESC" }],
		};

		return api
			.post<Paged<Customer>>("/customers/search", body)
			.then((res) => {
				const paged = normalizePaged<Customer>(res.data);
				paged.items = paged.items.map((c: any) => {
					const statusStr =
						typeof c.status === "string" ? c.status.toLowerCase() : "";
					const isActive = statusStr
						? statusStr === "active"
						: c.isActive !== undefined
							? Boolean(c.isActive)
							: c.active !== undefined
								? Boolean(c.active)
								: true;
					return {
						...c,
						status: c.status || (isActive ? "active" : "inactive"),
						phone: c.phoneNumber || c.phone,
						isActive,
						active: isActive,
					};
				});
				return paged;
			})
			.catch(async (err: any) => {
				if (
					err?.status === 405 ||
					err?.status === 404 ||
					err?.response?.status === 405 ||
					err?.response?.status === 404
				) {
					const res = await api.get<Paged<Customer>>("/customers", {
						params: listQuery(params),
					});
					const paged = normalizePaged<Customer>(res.data);
					paged.items = paged.items.map((c: any) => {
						const statusStr =
							typeof c.status === "string" ? c.status.toLowerCase() : "";
						const isActive = statusStr
							? statusStr === "active"
							: c.isActive !== undefined
								? Boolean(c.isActive)
								: c.active !== undefined
									? Boolean(c.active)
									: true;
						return {
							...c,
							status: c.status || (isActive ? "active" : "inactive"),
							phone: c.phoneNumber || c.phone,
							isActive,
							active: isActive,
						};
					});
					return paged;
				}
				throw err;
			});
	},
	search: (payload: any) => {
		const rawFilters =
			payload.filterGroup?.filters || payload.filterGroup?.criteria || [];
		const normalizedFilters = rawFilters.map((f: any) => ({
			field: f.field,
			operator:
				f.operator === "EQUAL"
					? "EQ"
					: f.operator === "STARTS_WITH"
						? "SW"
						: f.operator === "LIKE"
							? f.field === "addressCode"
								? "EQ"
								: "SW"
							: f.operator || "EQ",
			value: f.value,
			...(f.valueTo !== undefined ? { valueTo: f.valueTo } : {}),
			...(f.values !== undefined ? { values: f.values } : {}),
		}));

		const body: any = {
			filterGroup: {
				operator: payload.filterGroup?.operator || "AND",
				filters: normalizedFilters,
			},
			page: payload.page ?? 0,
			size: payload.size ?? 10,
			sort: payload.sort || [{ field: "createdAt", direction: "DESC" }],
		};

		return api.post<Paged<Customer>>("/customers/search", body).then((res) => {
			const paged = normalizePaged<Customer>(res.data);
			paged.items = paged.items.map((c: any) => {
				const statusStr =
					typeof c.status === "string" ? c.status.toLowerCase() : "";
				const isActive = statusStr
					? statusStr === "active"
					: c.isActive !== undefined
						? Boolean(c.isActive)
						: c.active !== undefined
							? Boolean(c.active)
							: true;
				return {
					...c,
					status: c.status || (isActive ? "active" : "inactive"),
					phone: c.phoneNumber || c.phone,
					isActive,
					active: isActive,
				};
			});
			return paged;
		});
	},
	get: (id: string | number) =>
		api.get<Customer>(`/customers/${id}`).then((r) => {
			const c: any = r.data;
			const statusStr =
				typeof c.status === "string" ? c.status.toLowerCase() : "";
			const isActive = statusStr
				? statusStr === "active"
				: c.isActive !== undefined
					? Boolean(c.isActive)
					: c.active !== undefined
						? Boolean(c.active)
						: true;
			return {
				...c,
				status: c.status || (isActive ? "active" : "inactive"),
				phone: c.phoneNumber || c.phone,
				isActive,
				active: isActive,
			};
		}),
	create: (body: Partial<Customer>) => {
		const payload = {
			...body,
			phoneNumber: body.phoneNumber || body.phone,
			active: body.isActive !== undefined ? body.isActive : body.active,
		};
		return api.post<Customer>("/customers", payload).then((r) => r.data);
	},
	update: (id: string | number, body: Partial<Customer>) => {
		const payload = {
			...body,
			phoneNumber: body.phoneNumber || body.phone,
			active: body.isActive !== undefined ? body.isActive : body.active,
		};
		return api.put<Customer>(`/customers/${id}`, payload).then((r) => r.data);
	},
	remove: (id: string | number) =>
		api.delete(`/customers/${id}`).then((r) => r.data),
	softDelete: (id: string | number) =>
		api.delete(`/customers/${id}/soft-delete`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/customers/${id}/restore`).then((r) => r.data),
	restoreDeleted: (id: string | number) =>
		api.patch(`/customers/${id}/restore-deleted`).then((r) => r.data),

	// Province Filters
	getActiveProvinces: () =>
		api.get<Province[]>("/customers/active-provinces").then((r) => r.data),

	// Nearby Map & Search
	findNearby: (req: NearbySearchRequest, companyId?: string | number) => {
		let compId = companyId;
		if (!compId && typeof window !== "undefined") {
			compId = localStorage.getItem("rumluos_company_id") || undefined;
		}
		return api
			.post<CustomerNearbyResult[]>("/customers/nearby", req, {
				params: compId ? { companyId: compId } : undefined,
			})
			.then((r: any) => (r?.data !== undefined ? r.data : r));
	},

	// Visits
	recordVisit: (
		id: string | number,
		req?: CustomerVisitRequest,
		companyId?: string | number,
	) => {
		let compId = companyId;
		if (!compId && typeof window !== "undefined") {
			compId = localStorage.getItem("rumluos_company_id") || undefined;
		}
		return api
			.post<CustomerVisitRecord>(`/customers/${id}/visit`, req || {}, {
				params: compId ? { companyId: compId } : undefined,
			})
			.then((r: any) => (r?.data !== undefined ? r.data : r));
	},

	getVisitHistory: (
		id: string | number,
		page = 0,
		size = 10,
		companyId?: string | number,
	) => {
		let compId = companyId;
		if (!compId && typeof window !== "undefined") {
			compId = localStorage.getItem("rumluos_company_id") || undefined;
		}
		return api
			.get<Paged<CustomerVisitRecord>>(`/customers/${id}/visits`, {
				params: { page, size, ...(compId ? { companyId: compId } : {}) },
			})
			.then((r: any) =>
				normalizePaged<CustomerVisitRecord>(r?.data !== undefined ? r.data : r),
			);
	},
};

// ---- Shop Contacts -------------------------------------------
export const shopContactsApi = {
	create: (body: Partial<ShopContact>) =>
		api.post<ShopContact>("/shop-contacts", body).then((r) => r.data),
	get: (id: string | number) =>
		api.get<ShopContact>(`/shop-contacts/${id}`).then((r) => r.data),
	update: (id: string | number, body: Partial<ShopContact>) =>
		api.put<ShopContact>(`/shop-contacts/${id}`, body).then((r) => r.data),
	getByCustomer: (customerId: string | number) =>
		api
			.get<ShopContact[]>(`/shop-contacts/customer/${customerId}`)
			.then((r) => r.data),
	search: (customerId?: string | number, searchRequest: any = {}) =>
		api
			.post<Paged<ShopContact>>("/shop-contacts/search", searchRequest, {
				params: customerId ? { customerId } : undefined,
			})
			.then((r) => normalizePaged<ShopContact>(r.data)),
	remove: (id: string | number) =>
		api.delete(`/shop-contacts/${id}`).then((r) => r.data),
	softDelete: (id: string | number) =>
		api.delete(`/shop-contacts/${id}/soft-delete`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/shop-contacts/${id}/restore`).then((r) => r.data),
	restoreDeleted: (id: string | number) =>
		api.patch(`/shop-contacts/${id}/restore-deleted`).then((r) => r.data),
};

// ---- Customer Reports ----------------------------------------
export const customerReportsApi = {
	getReport: (req: CustomerReportRequest) =>
		api
			.post<CustomerReportSummary>("/reports/customers", req)
			.then((r) => r.data),
	getTimeSeries: (req: CustomerReportRequest) =>
		api
			.post<TimeSeriesMetric[]>("/reports/customers/time-series", req)
			.then((r) => r.data),
};

// ---- Locations -----------------------------------------------
export const locationsApi = {
	getProvinces: (params?: any) =>
		api
			.get<Paged<Province>>("/locations/provinces", { params })
			.then((r) => normalizePaged<Province>(r.data)),
	getDistricts: (provinceCode: string, params?: any) =>
		api
			.get<Paged<District>>(`/locations/provinces/${provinceCode}/districts`, {
				params,
			})
			.then((r) => normalizePaged<District>(r.data)),
	getCommunes: (districtCode: string, params?: any) =>
		api
			.get<Paged<Commune>>(`/locations/districts/${districtCode}/communes`, {
				params,
			})
			.then((r) => normalizePaged<Commune>(r.data)),
	getVillages: (communeCode: string, params?: any) =>
		api
			.get<Paged<Village>>(`/locations/communes/${communeCode}/villages`, {
				params,
			})
			.then((r) => normalizePaged<Village>(r.data)),
	getAddressInfo: (code: string, lang?: "en" | "km") =>
		api
			.get<AddressInfo>(`/locations/address_info/${code}`, {
				params: lang ? { lang } : undefined,
			})
			.then((r) => (r.data as any)?.data || r.data),
	createAdministrativeDivision: (body: CreateAdministrativeDivisionInput) =>
		api
			.post<any>("/locations/administrative-divisions", body)
			.then((r) => r.data),
	updateAdministrativeDivision: (
		code: string,
		body: UpdateAdministrativeDivisionInput,
	) =>
		api
			.put<any>(`/locations/administrative-divisions/${code}`, body)
			.then((r) => r.data),
};

// ---- Brands (tenant) -----------------------------------------
export const brandsApi = {
	list: (params: ListParams) =>
		fetchSearchList<Brand>("/brands", params, ["name", "description"]),
	get: (id: string | number) =>
		api.get<Brand>(`/brands/${id}`).then((r) => r.data),
	create: (body: Partial<Brand>) =>
		api.post<Brand>("/brands", body).then((r) => r.data),
	update: (id: string | number, body: Partial<Brand>) =>
		api.put<Brand>(`/brands/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/brands/${id}`).then((r) => r.data),
};

// ---- Categories (tenant) -------------------------------------
function mapCategoryToBackend(c: Partial<Category>): any {
	if (!c) return c;
	const logo = c.logoUrl !== undefined ? c.logoUrl : c.imageUrl;
	return {
		...c,
		...(logo !== undefined ? { logoUrl: logo, imageUrl: logo } : {}),
		parentId:
			c.parentId !== undefined
				? c.parentId
					? Number(c.parentId)
					: null
				: undefined,
	};
}

export const categoriesApi = {
	list: (params: ListParams) =>
		fetchSearchList<Category>("/categories", params, ["name", "description"]),
	get: (id: string | number) =>
		api.get<Category>(`/categories/${id}`).then((r) => r.data),
	create: (body: Partial<Category>) =>
		api
			.post<Category>("/categories", mapCategoryToBackend(body))
			.then((r) => r.data),
	update: (id: string | number, body: Partial<Category>) =>
		api
			.put<Category>(`/categories/${id}`, mapCategoryToBackend(body))
			.then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/categories/${id}`).then((r) => r.data),
};

// ---- Products (tenant) ---------------------------------------
export function mapVariantFromBackend(v: any): any {
	if (!v) return v;

	const baseUnit = Array.isArray(v.units)
		? v.units.find(
				(u: any) =>
					u.isBase ||
					u.is_base ||
					(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
			) || v.units[0]
		: null;

	const unitPricesBase = Array.isArray(v.unitPrices)
		? v.unitPrices.find((up: any) => up.isBase || up.is_base) || v.unitPrices[0]
		: null;

	const basePrice =
		baseUnit?.finalPrice ??
		baseUnit?.unitPrice ??
		baseUnit?.sellPrice ??
		baseUnit?.price ??
		unitPricesBase?.finalPrice ??
		unitPricesBase?.unitPrice ??
		unitPricesBase?.price ??
		baseUnit?.basePrice;

	const price =
		basePrice !== undefined &&
		basePrice !== null &&
		!isNaN(Number(basePrice)) &&
		Number(basePrice) > 0
			? Number(basePrice)
			: (v.price ??
				v.sellPrice ??
				v.unitPrice ??
				v.basePrice ??
				v.retailPrice ??
				0);

	const baseCost =
		baseUnit?.basePrice ??
		baseUnit?.cost ??
		baseUnit?.baseCost ??
		baseUnit?.unitCost;

	const cost =
		baseCost !== undefined &&
		baseCost !== null &&
		!isNaN(Number(baseCost)) &&
		Number(baseCost) > 0
			? Number(baseCost)
			: (v.cost ??
				v.costPrice ??
				v.baseCost ??
				v.importCost ??
				v.unitCost ??
				0);

	const stockQty =
		v.stockQty ??
		v.stockQuantity ??
		v.quantity ??
		v.stock ??
		v.qty ??
		v.availableQuantity ??
		v.availableStock ??
		v.totalStock ??
		v.inStock ??
		v.inventory?.availableQty ??
		v.inventory?.availableQuantity ??
		v.inventory?.quantity ??
		v.inventory?.stockQty ??
		v.inventory?.stockQuantity ??
		v.inventory?.totalQty ??
		v.stocks?.[0]?.quantity ??
		v.stocks?.[0]?.availableQuantity ??
		0;

	return {
		...v,
		price: Number(price) || 0,
		sellPrice: Number(price) || 0,
		cost: Number(cost) || 0,
		costPrice: Number(cost) || 0,
		stockQty: Number(stockQty) || 0,
		stockQuantity:
			v.stockQuantity !== undefined
				? Number(v.stockQuantity)
				: Number(stockQty) || 0,
	};
}

export function mapProductFromBackend(raw: any): Product {
	if (!raw) return raw;
	const p =
		raw.product && typeof raw.product === "object"
			? { ...raw.product, ...raw }
			: raw;
	const mappedVariants = Array.isArray(p.variants)
		? p.variants.map(mapVariantFromBackend)
		: [];
	const firstVariant = mappedVariants[0];

	const baseUnit = Array.isArray(p.units)
		? p.units.find(
				(u: any) =>
					u.isBase ||
					u.is_base ||
					(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
			) || p.units[0]
		: null;

	const firstVarBaseUnit =
		firstVariant && Array.isArray(firstVariant.units)
			? firstVariant.units.find(
					(u: any) =>
						u.isBase ||
						u.is_base ||
						(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
				) || firstVariant.units[0]
			: null;

	const baseUnitPrice =
		baseUnit?.finalPrice ??
		baseUnit?.unitPrice ??
		baseUnit?.sellPrice ??
		baseUnit?.price ??
		baseUnit?.basePrice ??
		firstVarBaseUnit?.finalPrice ??
		firstVarBaseUnit?.unitPrice ??
		firstVarBaseUnit?.sellPrice ??
		firstVarBaseUnit?.price ??
		firstVarBaseUnit?.basePrice;

	const sellPrice =
		baseUnitPrice !== undefined &&
		baseUnitPrice !== null &&
		!isNaN(Number(baseUnitPrice)) &&
		Number(baseUnitPrice) > 0
			? Number(baseUnitPrice)
			: (p.sellPrice ??
				p.price ??
				firstVariant?.sellPrice ??
				firstVariant?.price ??
				p.basePrice ??
				0);

	const baseUnitCost =
		baseUnit?.basePrice ??
		baseUnit?.cost ??
		baseUnit?.baseCost ??
		baseUnit?.unitCost ??
		firstVarBaseUnit?.basePrice ??
		firstVarBaseUnit?.cost ??
		firstVarBaseUnit?.baseCost ??
		firstVarBaseUnit?.unitCost;

	const basePrice =
		baseUnitCost !== undefined &&
		baseUnitCost !== null &&
		!isNaN(Number(baseUnitCost)) &&
		Number(baseUnitCost) > 0
			? Number(baseUnitCost)
			: (p.basePrice ?? p.cost ?? firstVariant?.cost ?? 0);

	const stockQty =
		p.stockQty ??
		p.stock ??
		p.inventory?.availableQty ??
		(mappedVariants.length > 0
			? mappedVariants.reduce(
					(sum: number, v: any) => sum + (v.stockQty || 0),
					0,
				)
			: 0);

	const baseSku =
		p.baseSku ||
		p.sku ||
		p.skuCode ||
		p.code ||
		firstVariant?.sku ||
		firstVariant?.skuCode ||
		firstVariant?.baseSku ||
		"";

	const baseBarcode =
		p.baseBarcode ||
		p.barcode ||
		p.barCode ||
		firstVariant?.barcode ||
		firstVariant?.barCode ||
		firstVariant?.baseBarcode ||
		"";

	return {
		...p,
		variants: mappedVariants,
		baseSku: baseSku || p.baseSku || "",
		baseBarcode: baseBarcode || p.baseBarcode || "",
		sellPrice: Number(sellPrice) || 0,
		basePrice: Number(basePrice) || 0,
		stockQty: Number(stockQty) || 0,
	};
}

export const productsApi = {
	list: (params: ListParams) =>
		fetchSearchList<Product>("/products", params, ["name", "code", "sku"]).then(
			(paged) => {
				paged.items = paged.items.map(mapProductFromBackend);
				return paged;
			},
		),
	get: (id: string | number) =>
		api
			.get<Product>(`/products/${id}`)
			.then((r) => mapProductFromBackend(r.data)),
	create: (body: Partial<Product>) =>
		api
			.post<Product>("/products", body)
			.then((r) => mapProductFromBackend(r.data)),
	importBatch: (body: BatchImportRequest) =>
		api
			.post<BatchImportResponse>("/products/import-batch", body)
			.then((r) => r.data),
	update: (
		id: string | number,
		body: Partial<Product> | UpdateProductInput | any,
	) =>
		api
			.put<Product>(`/products/${id}`, body)
			.then((r) => mapProductFromBackend(r.data)),
	updateProductInfo: (id: string | number, body: UpdateProductInput) =>
		api
			.put<Product>(`/products/${id}`, body)
			.then((r) => mapProductFromBackend(r.data)),
	remove: (id: string | number) =>
		api.delete(`/products/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/products/${id}/restore`).then((r) => r.data),
	updateProductImageUrl: (id: string | number, imageUrl: string) =>
		api
			.patch<any>(`/products/${id}/image-url`, { imageUrl })
			.catch((err: any) => {
				if (err?.status === 405 || err?.response?.status === 405) {
					return api.put<any>(`/products/${id}/image-url`, { imageUrl });
				}
				throw err;
			})
			.then((r) => r.data),
	createSimpleProduct: (body: SingleVariantProductInput | any) =>
		api.post<any>("/products/individual", body).then((r) => r.data),
	createVariantProduct: (body: MultiVariantProductInput | any) =>
		api
			.post<any>("/products/with-variants", body)
			.then((r) => mapProductFromBackend(r.data)),
	previewVariantProduct: (body: PreviewVariantInput | any) =>
		api.post<any>("/products/with-variants/preview", body).then((r) => r.data),
	updateVariant: (variantId: string | number, body: UpdateVariantInput | any) =>
		api.patch<any>(`/products/variants/${variantId}`, body).then((r) => r.data),
	updateVariantImageUrl: (variantId: string | number, imageUrl: string) =>
		api
			.patch<any>(`/products/variants/${variantId}/image-url`, { imageUrl })
			.catch((err: any) => {
				if (err?.status === 405 || err?.response?.status === 405) {
					return api.put<any>(`/products/variants/${variantId}/image-url`, {
						imageUrl,
					});
				}
				throw err;
			})
			.then((r) => r.data),

	addVariant: (productId: string | number, body: AddVariantInput | any) =>
		api
			.post<any>(`/products/${productId}/add-variant`, body)
			.then((r) => r.data),
	addProductUnits: (productId: string | number, body: ProductAddUnitsInput) => {
		validateProductAddUnitsInput(body);
		const payload: ProductAddUnitsInput = {
			...body,
			units: body.units.map((unit) => {
				const hasPricingFields =
					unit.discount !== undefined || unit.discountType !== undefined;
				const discountType = normalizeDiscountType(unit.discountType);
				const discount = Number(unit.discount ?? 0);
				return {
					...unit,
					discount,
					discountType,
					discountNote: hasPricingFields
						? formatUnitDiscountNote(discount, discountType)
						: unit.discountNote,
					variantPrices: unit.variantPrices?.map((variantPrice) => {
						const variantHasPricingFields =
							variantPrice.discount !== undefined ||
							variantPrice.discountType !== undefined;
						const variantDiscountType = normalizeDiscountType(
							variantPrice.discountType ?? discountType,
						);
						const variantDiscount = Number(variantPrice.discount ?? discount);
						return {
							...variantPrice,
							discount: variantDiscount,
							discountType: variantDiscountType,
							discountNote: variantHasPricingFields
								? formatUnitDiscountNote(variantDiscount, variantDiscountType)
								: variantPrice.discountNote,
						};
					}),
				};
			}),
		};
		return api
			.post<void>(`/products/${productId}/units`, payload)
			.then((r) => r.data);
	},
	getProductUnits: (productId: string | number) =>
		api.get<any[]>(`/products/${productId}/units`).then((r) => r.data || []),
	deleteProductUnit: (productId: string | number, unitId: string | number) =>
		api
			.delete<void>(`/products/${productId}/units/${unitId}`)
			.then((r) => r.data),
	getVariantUnits: (variantId: string | number) =>
		api
			.get<VariantUnit[] | { data: VariantUnit[] }>(
				`/products/variant/${variantId}/units`,
			)
			.then((r) => {
				const data = (r.data as any)?.data ?? r.data;
				return Array.isArray(data) ? data : [];
			}),
	search: (
		searchRequest: ProductSearchRequest | any,
		options?: { signal?: AbortSignal },
	) =>
		api
			.post<any>("/products/search", searchRequest, {
				signal: options?.signal,
			})
			.then((r) => {
				const paged = normalizePaged<Product>(r.data);
				paged.items = paged.items.map(mapProductFromBackend);
				return paged;
			}),
};

// ---- Loans (tenant) ------------------------------------------
export const loansApi = {
	list: (params: ListParams) =>
		fetchSearchList<Loan>("/loans", params, ["loanNo", "customerName"]),
	get: (id: string | number) =>
		api.get<Loan>(`/loans/${id}`).then((r) => r.data),
	getDetails: (id: string | number) =>
		api.get<LoanDetails>(`/loans/${id}`).then((r) => r.data),
	create: (body: Partial<Loan>) =>
		api.post<Loan>("/loans", body).then((r) => r.data),
	activate: (id: string | number, body?: any) =>
		api.put<Loan>(`/loans/${id}/activate`, body).then((r) => r.data),
	restructure: (id: string | number, body?: any) =>
		api.put<Loan>(`/loans/${id}/restructure`, body).then((r) => r.data),
	defaultLoan: (id: string | number, body?: any) =>
		api.put<Loan>(`/loans/${id}/default`, body).then((r) => r.data),
	closeLoan: (id: string | number, body?: any) =>
		api.put<Loan>(`/loans/${id}/close`, body).then((r) => r.data),
};

// ---- Finance (tenant) ----------------------------------------
export const financeApi = {
	listInvoices: (params: ListParams) => invoicesApi.list(params),
	getInvoiceDetails: (id: string | number) => invoicesApi.get(id),
	listPayments: (params: ListParams) => paymentsApi.list(params),
	generateInvoice: (body: Partial<Invoice>) =>
		api
			.post<Invoice>("/invoices", body)
			.catch(() => api.post<Invoice>("/finance/invoices", body))
			.then((r) => r.data),
	processPayment: (
		body: CreatePaymentRequest | Partial<Payment>,
		idempotencyKey?: string,
	) => paymentsApi.create(body as CreatePaymentRequest, idempotencyKey),
	getPaymentsByInvoice: (invoiceIdentifier: string | number) =>
		paymentsApi.getByInvoice(invoiceIdentifier),
};

// ---- Divisions ------------------------------------------------
export const divisionsApi = {
	list: (params: ListParams) =>
		fetchSearchList<Division>("/divisions", params, ["name", "description"]),
	get: (id: string | number) =>
		api.get<Division>(`/divisions/${id}`).then((r) => r.data),
	create: (body: Partial<Division>) =>
		api.post<Division>("/divisions", body).then((r) => r.data),
	update: (id: string | number, body: Partial<Division>) =>
		api.put<Division>(`/divisions/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/divisions/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/divisions/${id}/restore`).then((r) => r.data),
};

// ---- Departments ----------------------------------------------
export const departmentsApi = {
	list: (params: ListParams) =>
		fetchSearchList<Department>("/departments", params, [
			"name",
			"description",
		]),
	get: (id: string | number) =>
		api.get<Department>(`/departments/${id}`).then((r) => r.data),
	create: (body: Partial<Department>) =>
		api.post<Department>("/departments", body).then((r) => r.data),
	update: (id: string | number, body: Partial<Department>) =>
		api.put<Department>(`/departments/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/departments/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/departments/${id}/restore`).then((r) => r.data),
};

// ---- Warehouses -----------------------------------------------
export const warehousesApi = {
	list: (params: ListParams) =>
		fetchSearchList<Warehouse>("/warehouses", params, ["name", "description"]),
	get: (id: string | number) =>
		api.get<Warehouse>(`/warehouses/${id}`).then((r) => r.data),
	create: (body: Partial<Warehouse>) =>
		api.post<Warehouse>("/warehouses", body).then((r) => r.data),
	update: (id: string | number, body: Partial<Warehouse>) =>
		api.put<Warehouse>(`/warehouses/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/warehouses/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/warehouses/${id}/restore`).then((r) => r.data),
};

// ---- Units ----------------------------------------------------
export const unitsApi = {
	list: (params: ListParams) =>
		fetchSearchList<Unit>("/units", params, ["name", "symbol"]),
	get: (id: string | number) =>
		api.get<Unit>(`/units/${id}`).then((r) => r.data),
	create: (body: Partial<Unit>) =>
		api.post<Unit>("/units", body).then((r) => r.data),
	update: (id: string | number, body: Partial<Unit>) =>
		api.put<Unit>(`/units/${id}`, body).then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/units/${id}`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch(`/units/${id}/restore`).then((r) => r.data),
};

// ---- Product Price History ------------------------------------
export const priceHistoryApi = {
	list: (
		params: {
			productId?: string | number;
			variantId?: string | number;
			variant?: string | number;
			unitId?: string | number;
			search?: string;
			direction?: string;
			page?: number;
			size?: number;
		} = {},
	) =>
		api
			.get<any>(`/price-history`, { params })
			.then((r) => r.data?.data || r.data),
	getByVariant: (
		variantId: string | number,
		page: number = 0,
		size: number = 20,
	) =>
		api
			.get<any>(`/price-history`, {
				params: { variant: variantId, page, size },
			})
			.catch(() =>
				api.get<any>(`/price-history/variant/${variantId}`, {
					params: { page, size },
				}),
			)
			.then((r) => {
				const payload = r.data?.data || r.data;
				return Array.isArray(payload) ? payload : payload?.content || [];
			}),
	getByVariantAndUnit: (
		variantId: string | number,
		unitId: string | number,
		page: number = 0,
		size: number = 20,
	) =>
		api
			.get<any>(`/price-history/variant/${variantId}/unit/${unitId}`, {
				params: { page, size },
			})
			.catch(() =>
				api.get<any>(`/price-history`, {
					params: { variant: variantId, unit: unitId, page, size },
				}),
			)
			.then((r) => {
				const payload = r.data?.data || r.data;
				return Array.isArray(payload) ? payload : payload?.content || [];
			}),
	getByCompany: (page: number = 0, size: number = 50) =>
		api.get<any>(`/price-history`, { params: { page, size } }).then((r) => {
			const payload = r.data?.data || r.data;
			return Array.isArray(payload) ? payload : payload?.content || [];
		}),
	getByProduct: (
		productId: string | number,
		page: number = 0,
		size: number = 50,
	) =>
		api
			.get<any>(`/price-history/product/${productId}`, {
				params: { page, size },
			})
			.then((r) => {
				const payload = r.data?.data || r.data;
				return Array.isArray(payload) ? payload : payload?.content || [];
			}),
	getProductSummary: (productId: string | number) =>
		api
			.get<any>(`/price-history/product/${productId}/summary`)
			.then((r) => r.data?.data || r.data),
	search: (filter: any) =>
		api.post<any>(`/price-history/search`, filter).then((r) => {
			const payload = r.data?.data || r.data;
			return payload;
		}),
	adjustPrice: (body: {
		variantId: number | string;
		unitId: number | string;
		newPrice: number;
		discountPercentage?: number;
		reason?: string;
	}) =>
		api
			.post<any>(`/price-history/adjust`, body)
			.then((r) => r.data?.data || r.data),
	batchAdjustPrices: (body: {
		reason?: string;
		adjustments: {
			variantId: number | string;
			unitId: number | string;
			newPrice: number;
			discountPercentage?: number;
			reason?: string;
		}[];
	}) =>
		api
			.post<any>(`/price-history/batch-adjust`, body)
			.then((r) => r.data?.data || r.data),
};

// ---- Stocks & Inventory ---------------------------------------
export const stocksApi = {
	list: (params: ListParams & { warehouseId?: string | number }) =>
		fetchSearchList<Stock>("/stocks", params, ["productName", "warehouseName"]),
	search: (body: any) =>
		api.post<any>("/stocks/search", body).then((r) => r.data),
	getLowStock: (params?: { page?: number; size?: number }) =>
		api
			.get<any>("/stocks/low-stock", {
				params: { page: params?.page ?? 0, size: params?.size ?? 20 },
			})
			.then((r) => r.data),
	getOutOfStock: (params?: { page?: number; size?: number }) =>
		api
			.get<any>("/stocks/out-of-stock", {
				params: { page: params?.page ?? 0, size: params?.size ?? 20 },
			})
			.then((r) => r.data),
	adjust: (body: StockAdjustmentPayload) =>
		api.post<any>("/stocks/adjust", body).then((r) => r.data),
};

export const stockMovementsApi = {
	list: (params: ListParams & { warehouseId?: string | number }) =>
		fetchSearchList<StockMovement>("/stock-movements", params, [
			"referenceNo",
			"productName",
		]),
	create: (body: Partial<StockMovement>) =>
		api.post<StockMovement>("/stock-movements", body).then((r) => r.data),
	getByVariant: (
		variantId: string | number,
		params?: {
			warehouseId?: string | number;
			page?: number;
			size?: number;
			type?: string;
		},
	) => {
		const page = params?.page ?? 0;
		const size = params?.size ?? 20;
		const queryParams: any = { page, size };
		if (params?.type && params.type !== "ALL") queryParams.type = params.type;

		const url =
			params?.warehouseId && params.warehouseId !== "ALL"
				? `/stock-movements/variant/${variantId}/warehouse/${params.warehouseId}`
				: `/stock-movements/variant/${variantId}`;

		return api.get<any>(url, { params: queryParams }).then((r) => r.data);
	},
};

export function mapInventoryImportFromBackend(item: any): InventoryImport {
	if (!item) return item;

	let mappedItems: InventoryImportItem[] = [];
	let mappedProducts: ImportProductGroup[] | undefined = undefined;

	if (Array.isArray(item.products) && item.products.length > 0) {
		mappedProducts = item.products.map((prod: any) => ({
			id: prod.id,
			name: prod.name || "",
			brand: prod.brand ? { id: prod.brand.id, name: prod.brand.name } : null,
			category: prod.category
				? { id: prod.category.id, name: prod.category.name }
				: null,
			items: Array.isArray(prod.items)
				? prod.items.map((it: any) => ({
						id: it.id,
						importId: it.importId ?? item.id,
						variant: it.variant
							? {
									id: it.variant.id,
									sku: it.variant.sku,
									name: it.variant.name,
								}
							: undefined,
						variantId: it.variant?.id ?? it.variantId,
						variantName: it.variant?.name ?? it.variantName ?? "",
						sku: it.variant?.sku ?? it.sku ?? "",
						unitId: it.unitId || 1,
						unitName: it.unitName || "Pcs",
						quantity: Number(it.quantity) || 0,
						unitCost: Number(it.unitCost ?? 0),
						unitPrice: Number(it.unitPrice ?? it.untiPrice ?? 0),
						untiPrice: Number(it.untiPrice ?? it.unitPrice ?? 0),
						totalCost:
							Number(
								it.totalCost ??
									Number(it.quantity || 0) * Number(it.unitCost || 0),
							) || 0,
					}))
				: [],
		}));

		// Flatten products into mappedItems
		for (const prod of item.products) {
			if (Array.isArray(prod.items)) {
				for (const it of prod.items) {
					const qty = Number(it.quantity) || 0;
					const cost = Number(it.unitCost ?? 0);
					const price = Number(it.unitPrice ?? it.untiPrice ?? cost);
					mappedItems.push({
						id: it.id,
						importId: it.importId ?? item.id,
						variantId: it.variant?.id ?? it.variantId ?? prod.id,
						variantName: it.variant?.name ?? it.variantName ?? "",
						productId: prod.id,
						productName: prod.name || "",
						sku: it.variant?.sku ?? it.sku ?? "",
						imageUrl: it.imageUrl || "",
						unitId: it.unitId || 1,
						unitName: it.unitName || "Pcs",
						quantity: qty,
						unitCost: cost,
						untiPrice: price,
						unitPrice: price,
						totalCost: Number(it.totalCost ?? qty * cost) || 0,
						brandName: prod.brand?.name,
						categoryName: prod.category?.name,
					});
				}
			}
		}
	} else if (Array.isArray(item.items)) {
		mappedItems = item.items.map((it: any) => {
			const qty = Number(it.quantity) || 1;
			const cost = Number(it.unitCost ?? it.cost ?? it.costPrice ?? 0);
			const price = Number(
				it.untiPrice ?? it.unitPrice ?? it.price ?? it.sellPrice ?? cost,
			);
			return {
				id: it.id,
				importId: it.importId ?? item.id,
				variantId: it.variantId ?? it.productId,
				variantName: it.variantName || it.name || it.productName || "",
				productId: it.productId ?? it.variantId,
				productName: it.productName || it.name || it.variantName || "",
				sku: it.sku || "",
				imageUrl: it.imageUrl || it.image || "",
				unitId: it.unitId || 1,
				unitName: it.unitName || (it.unit ? it.unit.name : "") || "Pcs",
				quantity: qty,
				unitCost: cost,
				untiPrice: price,
				unitPrice: price,
				totalCost: Number(it.totalCost ?? qty * cost) || 0,
				brandName: it.brandName,
				categoryName: it.categoryName,
			};
		});
	}

	const totalCalculatedCost = mappedItems.reduce(
		(sum, it) => sum + (it.totalCost || it.quantity * it.unitCost),
		0,
	);
	const totalUnits = mappedItems.reduce(
		(sum, it) => sum + (it.quantity || 0),
		0,
	);

	return {
		...item,
		id: item.id,
		referenceNo: item.referenceNo || item.importNo || `IMP-${item.id}`,
		importNo: item.importNo || item.referenceNo || `IMP-${item.id}`,
		supplierId: item.supplierId || item.supplier?.id,
		supplierName:
			item.supplierName || item.supplier?.name || "Primary Supplier",
		supplierPhone:
			item.supplierPhone ||
			item.supplier?.phone ||
			item.supplier?.primaryPhone ||
			"",
		supplier: item.supplier || null,
		warehouseId: item.warehouseId || 1,
		warehouseName:
			item.warehouseName ||
			(item.warehouseId
				? `Warehouse #${item.warehouseId}`
				: "Main Hub Warehouse"),
		importDate: item.importDate || item.createdAt || new Date().toISOString(),
		note: item.note || item.notes || "",
		notes: item.notes || item.note || "",
		totalAmount:
			Number(item.totalAmount ?? item.totalCost ?? totalCalculatedCost) || 0,
		totalCost:
			Number(item.totalCost ?? item.totalAmount ?? totalCalculatedCost) || 0,
		totalUnits:
			item.totalUnits !== undefined ? Number(item.totalUnits) : totalUnits,
		status: (item.status || "COMPLETED").toUpperCase(),
		products: mappedProducts,
		items: mappedItems,
		createdAt: item.createdAt || item.importDate || new Date().toISOString(),
		updatedAt: item.updatedAt,
	};
}

export interface InventoryImportListParams extends ListParams {
	supplierId?: string | number;
	warehouseId?: string | number;
	status?: string;
	startDate?: string;
	endDate?: string;
}

export const inventoryImportsApi = {
	search: async (payload: any): Promise<Paged<InventoryImport>> => {
		// Normalization ensuring page is zero-based and sort/filterGroup are structured
		const pageZeroBased =
			typeof payload.page === "number" ? Math.max(0, payload.page) : 0;
		const size = payload.size ?? payload.limit ?? 10;
		const searchBody: any = {
			page: pageZeroBased,
			size,
			sort:
				Array.isArray(payload.sort) && payload.sort.length > 0
					? payload.sort
					: [{ field: "createdAt", direction: "DESC" }],
			filterGroup: payload.filterGroup || {
				logicalOperator: "AND",
				criteria: [],
			},
		};

		// Ensure filterGroup has both criteria and filters for backwards/forwards compatibility
		if (searchBody.filterGroup) {
			if (!searchBody.filterGroup.criteria && searchBody.filterGroup.filters) {
				searchBody.filterGroup.criteria = searchBody.filterGroup.filters;
			}
			if (
				!searchBody.filterGroup.logicalOperator &&
				searchBody.filterGroup.operator
			) {
				searchBody.filterGroup.logicalOperator =
					searchBody.filterGroup.operator;
			}
		}

		try {
			const res = await api.post<any>("/imports/search", searchBody);
			const paged = normalizePaged<InventoryImport>(res.data);
			paged.items = paged.items.map(mapInventoryImportFromBackend);
			return paged;
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				const res = await api.get<Paged<InventoryImport>>("/imports", {
					params: { page: pageZeroBased + 1, limit: size },
				});
				const paged = normalizePaged<InventoryImport>(res.data);
				paged.items = paged.items.map(mapInventoryImportFromBackend);
				return paged;
			}
			throw err;
		}
	},

	list: (params: InventoryImportListParams = {}) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const size = params.limit ?? 10;
		const criteria: any[] = [];

		if (params.search && params.search.trim()) {
			criteria.push({
				field: "referenceNo",
				operator: "LIKE",
				value: params.search.trim(),
			});
		}

		if (params.status && params.status !== "ALL") {
			criteria.push({
				field: "status",
				operator: "EQUAL",
				value: params.status,
			});
		}

		if (params.supplierId && params.supplierId !== "ALL") {
			criteria.push({
				field: "supplier",
				operator: "EQUAL",
				value: Number(params.supplierId) || params.supplierId,
			});
		}

		if (params.startDate || params.endDate) {
			criteria.push({
				field: "importDate",
				operator: "BETWEEN",
				value: params.startDate,
				valueTo: params.endDate,
			});
		}

		const payload = {
			page: pageZeroBased,
			size,
			sort: [{ field: "createdAt", direction: "DESC" }],
			filterGroup: {
				logicalOperator: "AND",
				criteria,
			},
		};

		return inventoryImportsApi.search(payload);
	},

	get: async (id: string | number): Promise<InventoryImport> => {
		const res = await api.get<any>(`/imports/${id}`);
		const data = res.data?.data || res.data;
		return mapInventoryImportFromBackend(data);
	},

	create: (
		body: CreateInventoryImportRequest | Partial<InventoryImport> | any,
	) => {
		const payload = {
			supplierId:
				Number(body.supplierId) ||
				(body.supplier?.id ? Number(body.supplier.id) : 1),
			referenceNo: String(
				body.referenceNo ||
					body.importNo ||
					`IMP-${Date.now().toString().slice(-6)}`,
			).trim(),
			note: body.note || body.notes || "",
			importDate: body.importDate || new Date().toISOString(),
			warehouseId: body.warehouseId ? Number(body.warehouseId) : undefined,
			items: Array.isArray(body.items)
				? body.items.map((it: any) => ({
						variantId: Number(it.variantId || it.productId) || 1,
						unitId: Number(it.unitId) || 1,
						quantity: Number(it.quantity) || 1,
						unitCost: Number(it.unitCost ?? it.cost ?? 0),
						untiPrice: Number(
							it.untiPrice ?? it.unitPrice ?? it.price ?? it.unitCost ?? 0,
						),
						unitPrice: Number(
							it.unitPrice ?? it.untiPrice ?? it.price ?? it.unitCost ?? 0,
						),
					}))
				: [],
		};
		return api
			.post<InventoryImport>("/imports", payload)
			.then((r) => mapInventoryImportFromBackend(r.data));
	},
	update: (id: string | number, body: any) =>
		api
			.put<InventoryImport>(`/imports/${id}`, body)
			.then((r) => mapInventoryImportFromBackend(r.data)),
	remove: (id: string | number) =>
		api.delete(`/imports/${id}`).then((r) => r.data),
};

// ---- Supplier Returns ----------------------------------------
export const supplierReturnsApi = {
	create: async (
		body: CreateSupplierReturnRequest,
	): Promise<SupplierReturn> => {
		const res = await api.post<any>("/supplier-returns", body);
		const data = res.data?.data !== undefined ? res.data.data : res.data;
		return data as SupplierReturn;
	},
	get: async (id: string | number): Promise<SupplierReturn> => {
		const res = await api.get<any>(`/supplier-returns/${id}`);
		const data = res.data?.data !== undefined ? res.data.data : res.data;
		return data as SupplierReturn;
	},
	search: async (payload: any = {}): Promise<Paged<SupplierReturn>> => {
		const res = await api.post<any>("/supplier-returns/search", payload);
		return normalizePaged<SupplierReturn>(res.data);
	},
};

// ---- Orders ---------------------------------------------------
export const ordersApi = {
	list: (params: ListParams) =>
		fetchSearchList<Order>("/orders", params, [
			"orderNumber",
			"orderNo",
			"customerName",
		]),
	get: (id: string | number) =>
		api.get<Order>(`/orders/${id}`).then((r) => r.data),
	create: (body: any, idempotencyKey?: string) =>
		api
			.post<Order>("/orders", body, {
				headers: idempotencyKey
					? { "Idempotency-Key": idempotencyKey }
					: undefined,
			})
			.then((r) => r.data),
	update: (id: string | number, body: any) =>
		api.put<Order>(`/orders/${id}`, body).then((r) => r.data),
	updateStatus: (id: string | number, status: string, reason?: string) =>
		api
			.patch<Order>(`/orders/${id}/status`, { status, reason })
			.then((r) => r.data),
	postOrder: (id: string | number, reason?: string) =>
		api
			.patch<Order>(`/orders/${id}/status`, {
				status: "POSTED",
				reason: reason || "Submitted for verification",
			})
			.then((r) => r.data),
	voidOrder: (id: string | number, reason?: string) =>
		api
			.patch<Order>(`/orders/${id}/status`, {
				status: "VOID",
				reason: reason || "Order voided",
			})
			.then((r) => r.data),
	moveToDraft: (id: string | number, reason?: string) =>
		api
			.patch<Order>(`/orders/${id}/status`, {
				status: "DRAFT",
				reason: reason || "Order returned to draft",
			})
			.then((r) => r.data),
	unpostOrder: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/unpost`, null, { params: { reason } })
			.then((r) => r.data),
	unpost: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/unpost`, null, { params: { reason } })
			.then((r) => r.data),
	approveOrder: (
		id: string | number,
		approvalType: string = "AUTO",
		reason?: string,
	) =>
		api
			.post<Order>(`/orders/${id}/approve`, null, {
				params: { approvalType, reason },
			})
			.then((r) => r.data),
	rejectOrder: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/reject`, null, { params: { reason } })
			.then((r) => r.data),
	reject: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/reject`, null, { params: { reason } })
			.then((r) => r.data),
	unApproveOrder: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/unapprove`, null, { params: { reason } })
			.then((r) => r.data),
	unapprove: (id: string | number, reason?: string) =>
		api
			.post<Order>(`/orders/${id}/unapprove`, null, { params: { reason } })
			.then((r) => r.data),
	verifyOrderItems: (id: string | number, body: VerifyOrderItemsRequest) =>
		api.post<Order>(`/orders/${id}/items/verify`, body).then((r) => r.data),
	checkStock: (body: StockCheckRequest) =>
		api
			.post<StockCheckResponse>("/orders/stock-check", body)
			.then((r) => r.data),
	getOrderHistories: (id: string | number) =>
		api.get<any>(`/orders/${id}/histories`).then((r) => {
			const data = (r.data as any)?.data || r.data;
			return Array.isArray(data) ? data : [];
		}),
	getOrderHistoryDetail: (
		orderId: string | number,
		historyId: string | number,
	) =>
		api
			.get<any>(`/orders/${orderId}/histories/${historyId}`)
			.then((r) => (r.data as any)?.data || r.data),
	getOrderChanges: (id: string | number) =>
		api.get<OrderChangeLogResponse[]>(`/orders/${id}/changes`).then((r) => {
			const data = (r.data as any)?.data || r.data;
			return Array.isArray(data) ? data : [];
		}),
	search: (payload: any, options?: { signal?: AbortSignal }) =>
		api
			.post<Paged<Order>>("/orders/search", payload, {
				signal: options?.signal,
			})
			.then((r) => normalizePaged<Order>(r.data)),
	getByNumber: async (orderNumber: string): Promise<Order | null> => {
		try {
			const res = await ordersApi.search({
				page: 0,
				size: 1,
				filterGroup: {
					logicalOperator: "AND",
					criteria: [
						{
							field: "orderNumber",
							operator: "EQUAL",
							value: orderNumber.trim(),
						},
					],
				},
			});
			const item = res.items?.[0];
			if (item?.id) {
				return ordersApi.get(item.id);
			}
			return null;
		} catch {
			return null;
		}
	},
};

// ---- Invoices ------------------------------------------------
export const invoicesApi = {
	list: (params: ListParams) =>
		fetchSearchList<Invoice>("/invoices", params, [
			"invoiceNumber",
			// "customerName",
		]),
	get: (id: string | number) => {
		const strId = String(id).trim();
		if (!/^\d+$/.test(strId)) {
			return invoicesApi.getByNumber(strId);
		}
		return api
			.get<any>(`/invoices/${strId}`)
			.catch(() => api.get<any>(`/finance/invoices/${strId}`))
			.then((r) => {
				const d = r.data;
				if (d && typeof d === "object") {
					if (d.data && typeof d.data === "object" && !Array.isArray(d.data))
						return d.data;
					if (d.invoice && typeof d.invoice === "object") return d.invoice;
				}
				return d;
			});
	},
	getByNumber: async (invoiceNumber: string): Promise<Invoice | null> => {
		const trimmed = invoiceNumber.trim();
		try {
			const res = await api
				.get<any>(`/invoices/number/${encodeURIComponent(trimmed)}`)
				.then((r) => {
					const d = r.data;
					if (d && typeof d === "object") {
						if (d.data && typeof d.data === "object" && !Array.isArray(d.data))
							return d.data;
						if (d.invoice && typeof d.invoice === "object") return d.invoice;
					}
					return d;
				});
			if (res && (res.id || res.invoiceNumber)) {
				return res;
			}
		} catch (err) {
			console.warn("Direct getByNumber failed, falling back to search:", err);
		}

		// Fallback: search via POST /v1/invoices/search
		try {
			const searchRes = await invoicesApi.search({
				page: 0,
				size: 1,
				filterGroup: {
					logicalOperator: "AND",
					criteria: [
						{
							field: "invoiceNumber",
							operator: "EQUAL",
							value: trimmed,
						},
					],
				},
			});
			const item = searchRes?.items?.[0];
			if (item?.id) {
				return invoicesApi.get(item.id);
			}
		} catch (err) {
			console.warn("Search fallback for invoice failed:", err);
		}

		// Secondary fallback: list invoices by search term
		try {
			const listRes = await financeApi.listInvoices({
				page: 1,
				limit: 5,
				search: trimmed,
			});
			const matched = listRes?.items?.find(
				(inv: any) =>
					inv.invoiceNumber?.toLowerCase() === trimmed.toLowerCase() ||
					String(inv.id) === trimmed,
			);
			if (matched?.id) {
				return invoicesApi.get(matched.id);
			}
		} catch {}

		return null;
	},
	createFromOrder: (body: CreateInvoiceFromOrderRequest) =>
		api.post<Invoice>("/invoices/from-order", body).then((r) => r.data),
	search: (payload: any, options?: { signal?: AbortSignal }) =>
		api
			.post<Paged<Invoice>>("/invoices/search", payload, {
				signal: options?.signal,
			})
			.then((r) => normalizePaged<Invoice>(r.data)),
	updateStatus: (id: string | number, status: string) =>
		api
			.patch<Invoice>(`/invoices/${id}/status`, { status })
			.then((r) => r.data),
	applyDiscount: (body: InvoiceDiscountRequest) =>
		api.patch<Invoice>("/invoices/discount", body).then((r) => r.data),
	voidInvoice: (id: string | number, reason?: string) =>
		api.post<Invoice>(`/invoices/${id}/void`, { reason }).then((r) => r.data),
	refundInvoice: (id: string | number, body: RefundInvoiceRequest) =>
		api.post<Invoice>(`/invoices/${id}/refund`, body).then((r) => r.data),
	changePaymentTerm: (
		id: string | number,
		body:
			| UpdateInvoicePaymentTermRequest
			| { paymentTermId: number; dueDate?: string | null },
	) =>
		api
			.patch<Invoice>(`/invoices/${id}/payment-term`, body)
			.then((r) => r.data),
};

// ---- Payments ------------------------------------------------
export const paymentsApi = {
	list: (params?: ListParams) =>
		fetchSearchList<Payment>("/payments", params, [
			"paymentRef",
			"paymentNumber",
			"referenceNumber",
		]),
	get: (id: string | number) =>
		api.get<any>(`/payments/${id}`).then((r) => {
			const d = r.data;
			if (d && typeof d === "object") {
				if (d.data && typeof d.data === "object" && !Array.isArray(d.data))
					return d.data;
				if (d.payment && typeof d.payment === "object") return d.payment;
			}
			return d;
		}),
	getByNumber: (paymentNumber: string) =>
		api
			.get<any>(`/payments/number/${encodeURIComponent(paymentNumber.trim())}`)
			.then((r) => {
				const d = r.data;
				if (d && typeof d === "object") {
					if (d.data && typeof d.data === "object" && !Array.isArray(d.data))
						return d.data;
					if (d.payment && typeof d.payment === "object") return d.payment;
				}
				return d;
			}),
	getByInvoice: (invoiceIdentifier: string | number) =>
		api.get<any>(`/payments/${invoiceIdentifier}/invoice`).then((r) => {
			const payload = r.data?.data || r.data || {};
			return {
				invoice: payload.invoice || null,
				company: payload.company || null,
				payments: payload.payments || (Array.isArray(payload) ? payload : []),
			};
		}),
	create: (body: CreatePaymentRequest | any, idempotencyKey?: string) => {
		const amountVal = Number(
			body.amount !== undefined ? body.amount : body.amountPaid || 0,
		);
		const invoiceIdVal =
			body.invoiceId != null && body.invoiceId !== ""
				? !isNaN(Number(body.invoiceId))
					? Number(body.invoiceId)
					: body.invoiceId
				: undefined;
		const customerIdVal =
			body.customerId != null && body.customerId !== ""
				? !isNaN(Number(body.customerId))
					? Number(body.customerId)
					: body.customerId
				: undefined;
		const refVal =
			(body.referenceNumber || body.reference || "").trim() || undefined;
		const notesVal = (body.notes || body.description || "").trim() || undefined;
		const dateVal = body.paymentDate
			? body.paymentDate.includes("T")
				? body.paymentDate
				: new Date(body.paymentDate).toISOString()
			: new Date().toISOString();
		const methodVal = (body.paymentMethod || "CASH").toString().toUpperCase();
		const normalizedMethod =
			methodVal === "ABA_PAY" || methodVal === "WING"
				? "MOBILE_PAYMENT"
				: methodVal;
		const discountAmountVal =
			body.discountAmount !== undefined && body.discountAmount !== null
				? Number(body.discountAmount)
				: 0;
		const discountTypeVal = body.discountType || "FLAT";
		const discountReasonVal = (body.discountReason || "").trim() || undefined;

		const payload: any = {
			...body,
			amount: amountVal,
			amountPaid: amountVal,
			discountAmount: discountAmountVal,
			discountType: discountTypeVal,
			discountReason: discountReasonVal,
			invoiceId: invoiceIdVal,
			customerId: customerIdVal,
			referenceNumber: refVal,
			reference: refVal,
			paymentDate: dateVal,
			paymentMethod: normalizedMethod,
			notes: notesVal,
			description: notesVal,
		};

		// Explicitly remove invoiceNumber and status from body sent to /payments endpoint
		delete payload.invoiceNumber;
		delete payload.status;

		// Clean undefined fields so backend doesn't receive "undefined"
		Object.keys(payload).forEach(
			(k) => payload[k] === undefined && delete payload[k],
		);

		return api
			.post<Payment>("/payments", payload, {
				headers: idempotencyKey
					? { "Idempotency-Key": idempotencyKey }
					: undefined,
			})
			.then((r) => r.data);
	},
	processMultiInvoicePayment: (
		body: MultiInvoicePaymentRequest | MultiInvoicePaymentsPayload,
		idempotencyKey?: string,
	) => {
		let payload: any;
		if ("payments" in body && Array.isArray((body as any).payments) && (body as any).payments.length > 0) {
			payload = {
				payments: (body as any).payments.map((p: any) => ({
					invoiceId: !isNaN(Number(p.invoiceId)) ? Number(p.invoiceId) : p.invoiceId,
					paymentAmount: Number(p.paymentAmount || 0),
					earlyPaymentDiscount: p.earlyPaymentDiscount !== undefined ? Number(p.earlyPaymentDiscount) : 0,
					paymentMethod: (p.paymentMethod || "BANK_TRANSFER").toString().toUpperCase(),
					paymentReference: (p.paymentReference || "").trim() || undefined,
					notes: (p.notes || "").trim() || undefined,
				})),
			};
		} else {
			const req = body as MultiInvoicePaymentRequest;
			payload = {
				totalAmount: Number(req.totalAmount || 0),
				paymentDate: req.paymentDate
					? req.paymentDate.includes("T")
						? req.paymentDate
						: new Date(req.paymentDate).toISOString()
					: new Date().toISOString(),
				paymentMethod: (req.paymentMethod || "BANK_TRANSFER")
					.toString()
					.toUpperCase(),
				referenceNumber: (req.referenceNumber || "").trim() || undefined,
				receiptUrl: (req.receiptUrl || "").trim() || undefined,
				notes: (req.notes || "").trim() || undefined,
				allocations: (req.allocations || []).map((alloc) => ({
					invoiceId: !isNaN(Number(alloc.invoiceId))
						? Number(alloc.invoiceId)
						: alloc.invoiceId,
					amount: Number(alloc.amount || 0),
					discountAmount:
						alloc.discountAmount !== undefined ? Number(alloc.discountAmount) : 0,
					discountType: alloc.discountType || "FLAT",
					discountReason: (alloc.discountReason || "").trim() || null,
				})),
			};
		}

		return api
			.post<any>("/payments/multi-invoice", payload, {
				headers: idempotencyKey
					? { "Idempotency-Key": idempotencyKey }
					: undefined,
			})
			.then((r) => r.data);
	},
	bulkReconcile: (
		body: BulkReconcilePaymentsRequest,
		companyId?: string | number,
	) =>
		api
			.patch<any>("/payments/reconciliation/bulk", body, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data?.data ?? r.data),
	reconcile: (
		id: string | number,
		body: {
			reconciliationStatus?: string;
			reconciliationReference?: string;
			reconciliationNote?: string;
		},
	) =>
		api
			.patch<any>(`/payments/${id}/reconciliation`, body)
			.then((r) => r.data?.data ?? r.data),
	search: (payload: any, options?: { signal?: AbortSignal }) =>
		api
			.post<Paged<Payment>>("/payments/search", payload, {
				signal: options?.signal,
			})
			.then((r) => normalizePaged<Payment>(r.data)),
	updateStatus: (id: string | number, status: string) =>
		api
			.patch<Payment>(`/payments/${id}/status`, null, { params: { status } })
			.then((r) => r.data),
	remove: (id: string | number) =>
		api.delete(`/payments/${id}`).then((r) => r.data),
	softDelete: (id: string | number) =>
		api.delete(`/payments/${id}/soft-delete`).then((r) => r.data),
	restore: (id: string | number) =>
		api.patch<Payment>(`/payments/${id}/restore`).then((r) => r.data),
	restoreDeleted: (id: string | number) =>
		api.patch<Payment>(`/payments/${id}/restore-deleted`).then((r) => r.data),
};

// ---- Stock Adjustments ---------------------------------------
export const stockAdjustmentsApi = {
	search: (payload: any, companyId?: string | number) =>
		api
			.post<any>("/stock-adjustments/search", payload, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => {
				const data = r.data?.data ?? r.data;
				return normalizePaged<StockAdjustmentAudit>(data);
			}),
};

// ---- Payment Terms -------------------------------------------
export const paymentTermsApi = {
	list: (companyId?: string | number) =>
		api
			.get<any>("/payment-terms", {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => {
				const payload = r.data?.data ?? r.data;
				return Array.isArray(payload) ? payload : [];
			}),
	get: (id: string | number, companyId?: string | number) =>
		api
			.get<any>(`/payment-terms/${id}`, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data?.data ?? r.data),
	create: (body: CreatePaymentTermRequest, companyId?: string | number) =>
		api
			.post<any>("/payment-terms", body, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data?.data ?? r.data),
	update: (
		id: string | number,
		body: CreatePaymentTermRequest,
		companyId?: string | number,
	) =>
		api
			.put<any>(`/payment-terms/${id}`, body, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data?.data ?? r.data),
	delete: (id: string | number, companyId?: string | number) =>
		api
			.delete<any>(`/payment-terms/${id}`, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => r.data?.data ?? r.data),
};

// ---- Notifications -------------------------------------------
export const notificationsApi = {
	search: (payload: any, companyId?: string | number) =>
		api
			.post<any>("/notifications/search", payload, {
				params: companyId ? { companyId } : undefined,
			})
			.then((r) => {
				const normalized = normalizePaged<any>(r.data);
				const mappedItems: AppNotification[] = (normalized.items || []).map(
					(it: any) => ({
						id: it.id,
						title: it.title,
						message: it.message,
						type: it.type,
						referenceId: it.referenceId,
						isRead: it.status === "READ" || it.isRead === true,
						status: it.status || (it.isRead ? "READ" : "UNREAD"),
						createdAt: it.createdAt,
						updatedAt: it.updatedAt,
					}),
				);
				return {
					...normalized,
					items: mappedItems,
				};
			}),
	list: async (params?: ListParams): Promise<AppNotification[]> => {
		try {
			const filters: any[] = [];
			if (params?.search && params.search.trim()) {
				filters.push({
					field: "title",
					operator: "LIKE",
					value: params.search.trim(),
				});
			}
			const payload = {
				page: params?.page ? Math.max(0, params.page - 1) : 0,
				size: params?.limit || 20,
				sort: [{ field: "createdAt", direction: "DESC" }],
				filterGroup:
					filters.length > 0
						? { logicalOperator: "AND", criteria: filters }
						: undefined,
			};
			const paged = await notificationsApi.search(payload);
			return paged.items || [];
		} catch {
			return [] as AppNotification[];
		}
	},
	totalUnread: (
		params?:
			| {
					companyId?: string | number;
					company?: string | number;
					toUserId?: string | number;
					type?: string;
			  }
			| string
			| number,
		typeParam?: string,
	) => {
		let queryParams: Record<string, any> = {};
		if (params && typeof params === "object") {
			queryParams = { ...params };
		} else {
			if (params) queryParams.companyId = params;
			if (typeParam) queryParams.type = typeParam;
		}

		return api
			.get<any>("/notifications/total-unread", {
				params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
			})
			.then((r) => {
				const d = r.data;
				if (typeof d === "number") return d;
				if (typeof d?.data === "number") return d.data;
				return 0;
			})
			.catch(() => 0);
	},
	markAsRead: (id: string | number) =>
		api.patch(`/notifications/${id}/read`).then((r) => r.data),
	markAllAsRead: (companyId?: string | number) =>
		api
			.post(
				"/notifications/read-all",
				{},
				{
					params: companyId ? { companyId } : undefined,
				},
			)
			.catch(() =>
				api.patch(
					"/notifications/read-all",
					{},
					{
						params: companyId ? { companyId } : undefined,
					},
				),
			)
			.then((r) => r.data),
	delete: (id: string | number) =>
		api.delete(`/notifications/${id}`).then((r) => r.data),
};

// ---- Direct Server File Uploads --------------------------------
export const serverFilesApi = {
	uploadSingle: async (
		file: File,
		options?: UploadOptions,
	): Promise<ServerFileResponse> => {
		const result = await uploadService.uploadSingle(file, options, "api");
		return {
			id: result.id || 0,
			fileName: result.fileName,
			originalFileName: result.originalFileName || result.fileName,
			fileKey: result.fileKey,
			storageKey: result.storageKey || result.fileKey,
			url: result.url,
			imageUrl: result.imageUrl || result.url,
			mimeType: result.mimeType || file.type || "application/octet-stream",
			fileType: result.fileType || "DOCUMENT",
			size: result.size || file.size,
			storageStrategy: result.storageStrategy || "LOCAL",
			createdAt: result.createdAt,
		};
	},
	uploadBatch: async (
		files: File[],
		options?: UploadOptions,
	): Promise<ServerFileResponse[]> => {
		const results = await uploadService.uploadBatch(files, options, "api");
		return results.map((result, idx) => ({
			id: result.id || idx,
			fileName: result.fileName,
			originalFileName: result.originalFileName || result.fileName,
			fileKey: result.fileKey,
			storageKey: result.storageKey || result.fileKey,
			url: result.url,
			imageUrl: result.imageUrl || result.url,
			mimeType:
				result.mimeType || files[idx]?.type || "application/octet-stream",
			fileType: result.fileType || "DOCUMENT",
			size: result.size || files[idx]?.size || 0,
			storageStrategy: result.storageStrategy || "LOCAL",
			createdAt: result.createdAt,
		}));
	},
};

// ---- Public File Uploads (Unauthenticated) ---------------------
// Calls the unauthenticated public endpoint: /api/v1/public/files/upload
export const publicFilesApi = {
	uploadImage: async (
		file: File,
		options?: UploadOptions,
	): Promise<{ url: string; imageUrl: string; raw?: any }> => {
		const formData = new FormData();
		formData.append("file", file);
		if (options?.folder) formData.append("folder", options.folder);
		if (options?.category) formData.append("category", options.category);
		if (options?.description)
			formData.append("description", options.description);

		const res = await api.post<any>("/public/files/upload", formData, {
			headers: { "Content-Type": "multipart/form-data" },
			onUploadProgress: (progressEvent) => {
				if (progressEvent.total && options?.onProgress) {
					const percent = Math.round(
						(progressEvent.loaded * 100) / progressEvent.total,
					);
					options.onProgress(percent);
				}
			},
		});

		const data = res.data?.data || res.data || {};
		const imageUrl = data.imageUrl || data.url || data.fileUrl || "";
		return {
			url: data.url || imageUrl,
			imageUrl,
			raw: res.data,
		};
	},
	uploadSingle: async (
		file: File,
		options?: UploadOptions,
	): Promise<ServerFileResponse> => {
		const result = await uploadService.uploadPublicSingle(file, options);
		return {
			id: result.id || 0,
			fileName: result.fileName,
			originalFileName: result.originalFileName || result.fileName,
			fileKey: result.fileKey,
			storageKey: result.storageKey || result.fileKey,
			url: result.url,
			imageUrl: result.imageUrl || result.url,
			mimeType: result.mimeType || file.type || "application/octet-stream",
			fileType: result.fileType || "DOCUMENT",
			size: result.size || file.size,
			storageStrategy: result.storageStrategy || "LOCAL",
			createdAt: result.createdAt,
		};
	},
};

// ---- Feedback & Evaluation System -----------------------------
export const feedbackApi = {
	// Questions Bank APIs
	searchQuestions: async (
		params: {
			page?: number;
			size?: number;
			search?: string;
			questionType?: string;
			sort?: Array<{ field: string; direction: string }>;
		} = {},
	): Promise<Paged<FeedbackQuestion>> => {
		const pageZero = Math.max(0, (params.page ?? 1) - 1);
		const size = params.size ?? 20;
		const filters: any[] = [];
		if (params.search?.trim()) {
			filters.push({
				field: "text",
				operator: "LIKE",
				value: params.search.trim(),
			});
		}
		if (params.questionType && params.questionType !== "ALL") {
			filters.push({
				field: "questionType",
				operator: "EQUAL",
				value: params.questionType,
			});
		}
		const payload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: params.sort || [{ field: "createdAt", direction: "DESC" }],
			page: pageZero,
			size,
		};
		try {
			const res = await api.post<any>("/questions/search", payload);
			return normalizePaged<FeedbackQuestion>(res.data?.data || res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				const res = await api.get<any>("/questions", {
					params: { page: pageZero, size },
				});
				return normalizePaged<FeedbackQuestion>(res.data?.data || res.data);
			}
			throw err;
		}
	},
	getQuestion: (id: string | number) =>
		api.get<any>(`/questions/${id}`).then((r) => r.data?.data || r.data),
	createQuestion: (body: CreateFeedbackQuestionInput) =>
		api.post<any>("/questions", body).then((r) => r.data?.data || r.data),
	updateQuestion: (id: string | number, body: CreateFeedbackQuestionInput) =>
		api.put<any>(`/questions/${id}`, body).then((r) => r.data?.data || r.data),
	deleteQuestion: (id: string | number) =>
		api.delete(`/questions/${id}`).then((r) => r.data),

	// Templates APIs
	searchTemplates: async (
		params: {
			page?: number;
			size?: number;
			search?: string;
			status?: string;
			sort?: Array<{ field: string; direction: string }>;
		} = {},
	): Promise<Paged<FeedbackTemplate>> => {
		const pageZero = Math.max(0, (params.page ?? 1) - 1);
		const size = params.size ?? 20;
		const filters: any[] = [];
		if (params.search?.trim()) {
			filters.push({
				field: "name",
				operator: "LIKE",
				value: params.search.trim(),
			});
		}
		if (params.status && params.status !== "ALL") {
			filters.push({
				field: "status",
				operator: "EQUAL",
				value: params.status,
			});
		}
		const payload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: params.sort || [{ field: "createdAt", direction: "DESC" }],
			page: pageZero,
			size,
		};
		try {
			const res = await api.post<any>("/templates/search", payload);
			return normalizePaged<FeedbackTemplate>(res.data?.data || res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				const res = await api.get<any>("/templates", {
					params: { page: pageZero, size },
				});
				return normalizePaged<FeedbackTemplate>(res.data?.data || res.data);
			}
			throw err;
		}
	},
	getTemplate: (id: string | number) =>
		api.get<any>(`/templates/${id}`).then((r) => r.data?.data || r.data),
	createTemplate: (body: CreateFeedbackTemplateInput) =>
		api.post<any>("/templates", body).then((r) => r.data?.data || r.data),
	updateTemplate: (id: string | number, body: CreateFeedbackTemplateInput) =>
		api.put<any>(`/templates/${id}`, body).then((r) => r.data?.data || r.data),
	deleteTemplate: (id: string | number) =>
		api.delete(`/templates/${id}`).then((r) => r.data),

	// Submissions APIs
	createSubmission: async (
		templateId: string | number,
		body: CreateFeedbackSubmissionRequest,
	) => {
		try {
			const res = await api.post<any>(
				`/templates/${templateId}/submissions`,
				body,
			);
			return res.data?.data || res.data;
		} catch (err: any) {
			if (err?.status === 404 || err?.response?.status === 404) {
				const res = await api.post<any>(
					`/v1/templates/${templateId}/submissions`,
					body,
				);
				return res.data?.data || res.data;
			}
			throw err;
		}
	},
	listSubmissions: async (
		templateIdOrParams?:
			| string
			| number
			| (SubmissionFilterParams & { templateId?: string | number }),
		maybeParams: { page?: number; size?: number } = {},
	): Promise<Paged<FeedbackSubmission>> => {
		if (typeof templateIdOrParams === "object" && templateIdOrParams !== null) {
			const tId = templateIdOrParams.templateId || 1;
			return feedbackApi.searchSubmissions(tId, {
				page: templateIdOrParams.page,
				size: templateIdOrParams.limit || (templateIdOrParams as any).size,
				customerId: templateIdOrParams.customerId,
			});
		}
		const templateId = templateIdOrParams || 1;
		const params = maybeParams || {};
		try {
			const res = await api.get<any>(`/templates/${templateId}/submissions`, {
				params: {
					page: Math.max(0, (params.page ?? 1) - 1),
					size: params.size ?? 50,
				},
			});
			return normalizePaged<FeedbackSubmission>(res.data?.data || res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				return feedbackApi.searchSubmissions(templateId, params);
			}
			throw err;
		}
	},
	searchSubmissions: async (
		templateId: string | number,
		params: {
			page?: number;
			size?: number;
			customerId?: string | number;
			sort?: Array<{ field: string; direction: string }>;
		} = {},
	): Promise<Paged<FeedbackSubmission>> => {
		const pageZero = Math.max(0, (params.page ?? 1) - 1);
		const size = params.size ?? 50;
		const filters: any[] = [
			{
				field: "templateId",
				operator: "EQUAL",
				value: String(templateId),
			},
		];
		if (params.customerId) {
			filters.push({
				field: "customerId",
				operator: "EQUAL",
				value: String(params.customerId),
			});
		}
		const payload = {
			page: pageZero,
			size,
			sort: params.sort || [{ field: "createdAt", direction: "DESC" }],
			filterGroup: {
				operator: "AND",
				filters,
			},
		};
		try {
			const res = await api.post<any>(
				`/templates/${templateId}/submissions/search`,
				payload,
			);
			return normalizePaged<FeedbackSubmission>(res.data?.data || res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				const res = await api.get<any>(`/templates/${templateId}/submissions`, {
					params: { page: pageZero, size },
				});
				return normalizePaged<FeedbackSubmission>(res.data?.data || res.data);
			}
			throw err;
		}
	},
	getSubmission: (id: string | number) =>
		api
			.get<any>(`/submissions/${id}`)
			.then((r) => r.data?.data || r.data)
			.catch(() =>
				api
					.get<any>(`/v1/submissions/${id}`)
					.then((r) => r.data?.data || r.data),
			),

	// Compatibility aliases
	listTemplates: (params: ListParams & { status?: string } = {}) =>
		feedbackApi.searchTemplates({
			page: params.page,
			size: params.limit,
			search: params.search,
			status: params.status,
		}),
	listQuestions: (params: ListParams & { questionType?: string } = {}) =>
		feedbackApi.searchQuestions({
			page: params.page,
			size: params.limit,
			search: params.search,
			questionType: params.questionType,
		}),
	submitEvaluation: (
		templateId: string | number,
		body: SubmitEvaluationRequest,
	) =>
		feedbackApi.createSubmission(templateId, {
			customerId: body.customerId,
			answers: body.answers.map((a) => ({
				questionId: a.questionId,
				answerOptionId: a.selectedOptionId,
				freeTextValue: a.freeTextValue,
			})),
		}),
};

export interface SupplierListParams extends ListParams {
	status?: string;
}

export const suppliersApi = {
	list: async (params: SupplierListParams = {}) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const filters: any[] = [
			{
				field: "text",
				operator: "LIKE",
				value: params.search?.trim() || "",
			},
		];

		if (params.status && params.status !== "ALL") {
			filters.push({
				field: "status",
				operator: "EQ",
				value: params.status,
			});
		}

		const payload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: pageZeroBased,
			size: params.limit ?? 20,
		};

		try {
			const res = await api.post<Paged<Supplier>>("/suppliers/search", payload);
			return normalizePaged<Supplier>(res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				try {
					const res = await api.post<Paged<Supplier>>(
						"/supplier/search",
						payload,
					);
					return normalizePaged<Supplier>(res.data);
				} catch {
					return fetchSearchList<Supplier>("/suppliers", params, [
						"name",
						"primaryPhone",
						"secondaryPhone",
						"phone",
						"email",
						"description",
					]);
				}
			}
			throw err;
		}
	},
	get: (id: string | number) =>
		api
			.get<Supplier>(`/suppliers/${id}`)
			.catch(() => api.get<Supplier>(`/supplier/${id}`))
			.then((r) => r.data),
	create: (body: Partial<Supplier> | any) => {
		const payload = {
			name: body.name,
			description: body.description ?? "",
			primaryPhone: body.primaryPhone ?? body.phone ?? "",
			secondaryPhone: body.secondaryPhone ?? "",
		};
		return api
			.post<Supplier>("/suppliers", payload)
			.catch(() => api.post<Supplier>("/supplier", payload))
			.then((r) => r.data);
	},
	update: (id: string | number, body: Partial<Supplier> | any) => {
		const payload = {
			name: body.name,
			description: body.description ?? "",
			primaryPhone: body.primaryPhone ?? body.phone ?? "",
			secondaryPhone: body.secondaryPhone ?? "",
		};
		return api
			.put<Supplier>(`/suppliers/${id}`, payload)
			.catch(() => api.put<Supplier>(`/supplier/${id}`, payload))
			.then((r) => r.data);
	},
	remove: (id: string | number) =>
		api
			.delete(`/suppliers/${id}`)
			.catch(() => api.delete(`/supplier/${id}`))
			.then((r) => r.data),
	restore: (id: string | number) =>
		api
			.patch<Supplier>(`/suppliers/${id}/restore`)
			.catch(() => api.patch<Supplier>(`/supplier/${id}/restore`))
			.then((r) => r.data),
};

export interface DeliveryListParams extends ListParams {
	status?: string;
	deliveryType?: string;
}

export const deliveriesApi = {
	list: async (params: DeliveryListParams = {}) => {
		const pageZeroBased = Math.max(0, (params.page ?? 1) - 1);
		const filters: any[] = [
			{
				field: "text",
				operator: "LIKE",
				value: params.search?.trim() || "",
			},
		];

		if (params.status && params.status !== "ALL") {
			filters.push({
				field: "status",
				operator: "EQ",
				value: params.status,
			});
		}

		if (params.deliveryType && params.deliveryType !== "ALL") {
			filters.push({
				field: "deliveryType",
				operator: "EQ",
				value: params.deliveryType,
			});
		}

		const payload = {
			filterGroup: {
				operator: "AND",
				filters,
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: pageZeroBased,
			size: params.limit ?? 20,
		};

		try {
			const res = await api.post<Paged<Delivery>>(
				"/deliveries/search",
				payload,
			);
			return normalizePaged<Delivery>(res.data);
		} catch (err: any) {
			if (
				err?.status === 405 ||
				err?.status === 404 ||
				err?.response?.status === 405 ||
				err?.response?.status === 404
			) {
				try {
					const res = await api.post<Paged<Delivery>>(
						"/delivery/search",
						payload,
					);
					return normalizePaged<Delivery>(res.data);
				} catch {
					return fetchSearchList<Delivery>("/deliveries", params, [
						"name",
						"code",
						"driverName",
						"primaryPhone",
						"vehicleNumber",
						"description",
					]);
				}
			}
			throw err;
		}
	},
	get: (id: string | number) =>
		api
			.get<Delivery>(`/deliveries/${id}`)
			.catch(() => api.get<Delivery>(`/delivery/${id}`))
			.then((r) => r.data),
	create: (body: Partial<DeliveryInput> | any) => {
		const payload = {
			name: body.name,
			code: body.code,
			deliveryType: body.deliveryType ?? "TRUCK",
			driverName: body.driverName,
			primaryPhone: body.primaryPhone,
			secondaryPhone: body.secondaryPhone ?? "",
			vehicleNumber: body.vehicleNumber ?? "",
			description: body.description ?? "",
			provinceCodes: body.provinceCodes ?? [],
			primaryProvinceCode:
				body.primaryProvinceCode ?? (body.provinceCodes?.[0] || "12"),
			lat:
				body.lat !== undefined && body.lat !== null && body.lat !== ""
					? Number(body.lat)
					: null,
			lng:
				body.lng !== undefined && body.lng !== null && body.lng !== ""
					? Number(body.lng)
					: null,
		};
		return api
			.post<Delivery>("/deliveries", payload)
			.catch(() => api.post<Delivery>("/delivery", payload))
			.then((r) => r.data);
	},
	update: (id: string | number, body: Partial<DeliveryInput> | any) => {
		const payload = {
			name: body.name,
			code: body.code,
			deliveryType: body.deliveryType,
			driverName: body.driverName,
			primaryPhone: body.primaryPhone,
			secondaryPhone: body.secondaryPhone ?? "",
			vehicleNumber: body.vehicleNumber ?? "",
			description: body.description ?? "",
			provinceCodes: body.provinceCodes ?? [],
			primaryProvinceCode:
				body.primaryProvinceCode ?? (body.provinceCodes?.[0] || "12"),
			lat:
				body.lat !== undefined && body.lat !== null && body.lat !== ""
					? Number(body.lat)
					: null,
			lng:
				body.lng !== undefined && body.lng !== null && body.lng !== ""
					? Number(body.lng)
					: null,
		};
		return api
			.put<Delivery>(`/deliveries/${id}`, payload)
			.catch(() => api.put<Delivery>(`/delivery/${id}`, payload))
			.then((r) => r.data);
	},
	updateLocations: (
		id: string | number,
		body: { lat: number; lng: number },
	) =>
		api
			.patch<Delivery>(`/deliveries/${id}/locations`, body)
			.catch(() => api.patch<Delivery>(`/deliveries/${id}/location`, body))
			.catch(() => api.patch<Delivery>(`/delivery/${id}/locations`, body))
			.then((r) => r.data),
	remove: (id: string | number) =>
		api
			.delete(`/deliveries/${id}`)
			.catch(() => api.delete(`/delivery/${id}`))
			.then((r) => r.data),
	restore: (id: string | number) =>
		api
			.patch<Delivery>(`/deliveries/${id}/restore`)
			.catch(() => api.patch<Delivery>(`/delivery/${id}/restore`))
			.then((r) => r.data),
};

export const auditLogsApi = {
	search: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: {
						...searchBody(params, ["username", "entityType"]),
						action: params.action,
						entityName: params.entityName,
					};
		return api
			.post<Paged<AuditLog>>("/audit-logs/search", body)
			.then((r) => normalizePaged<AuditLog>(r.data));
	},
};

// ---- Subscription & Features Catalog APIs --------------------
export const featuresApi = {
	getEntitlement: (companyId?: number | string | null) =>
		api
			.get<CompanyEntitlement>("/features/entitlement", {
				params:
					companyId != null && companyId !== "" ? { companyId } : undefined,
			})
			.then((r) => r.data)
			.catch(() => null),
	list: () => api.get<FeatureItem[]>("/features").then((r) => r.data),
	search: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: searchBody(params, ["code", "name", "description"]);
		return api
			.post<Paged<FeatureItem>>("/features/search", body)
			.then((r) => normalizePaged<FeatureItem>(r.data))
			.catch(() =>
				featuresApi
					.list()
					.then((items) => ({
						items,
						page: 1,
						limit: items.length,
						total: items.length,
						totalPages: 1,
					})),
			);
	},
	create: (body: FeatureRequest) =>
		api.post<FeatureItem>("/features", body).then((r) => r.data),
	update: (id: number | string, body: Partial<FeatureRequest>) =>
		api.put<FeatureItem>(`/features/${id}`, body).then((r) => r.data),
	remove: (id: number | string) =>
		api.delete(`/features/${id}`).then((r) => r.data),
	restore: (id: number | string) =>
		api.post<FeatureItem>(`/features/${id}/restore`).then((r) => r.data),
};

export const plansApi = {
	getPublic: () => api.get<PlanDetail[]>("/plans/public").then((r) => r.data),
	getById: (id: number | string) =>
		api.get<PlanDetail>(`/plans/${id}`).then((r) => r.data),
	search: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: searchBody(params, ["name", "code", "displayName"]);
		return api
			.post<Paged<PlanDetail>>("/plans/search", body)
			.then((r) => normalizePaged<PlanDetail>(r.data))
			.catch(() =>
				plansApi
					.getPublic()
					.then((items) => ({
						items,
						page: 1,
						limit: items.length,
						total: items.length,
						totalPages: 1,
					})),
			);
	},
	create: (body: PlanRequest) =>
		api.post<PlanDetail>("/plans", body).then((r) => r.data),
	update: (id: number | string, body: Partial<PlanRequest>) =>
		api.put<PlanDetail>(`/plans/${id}`, body).then((r) => r.data),
	toggleActive: (id: number | string, active: boolean) =>
		api
			.put(`/plans/${id}/active`, null, { params: { active } })
			.then((r) => r.data),
};

export const planPricesApi = {
	getGrouped: async (): Promise<PlanPriceGroupResponse[]> => {
		try {
			const res = await api.get<any[]>("/plan-prices/grouped");
			const raw = Array.isArray(res.data) ? res.data : [];
			if (raw.length > 0) {
				return raw.map((item: any) => {
					const prices: PlanPriceDetail[] = Array.isArray(item.prices)
						? item.prices
						: Array.isArray(item.planPrice)
							? item.planPrice
							: [];
					const plan: PlanDetail = item.plan || {
						id: item.id,
						code: item.code,
						name: item.name,
						displayName: item.displayName || item.name,
						description: item.description,
						tier: item.tier || "PROFESSIONAL",
						maxUsers: item.maxUsers || 25,
						trial: Boolean(item.trial),
						active: item.active !== false,
						publiclyVisible: item.publiclyVisible !== false,
						features: item.features || [],
						prices: prices,
					};
					return {
						id: item.id ?? plan.id,
						code: item.code ?? plan.code,
						name: item.name ?? plan.name,
						plan,
						prices,
						planPrice: prices,
					} as PlanPriceGroupResponse;
				});
			}
		} catch {
			// Fallback below
		}

		// Fallback to real server public plans endpoint
		try {
			const publicPlans = await plansApi.getPublic();
			if (Array.isArray(publicPlans) && publicPlans.length > 0) {
				return publicPlans.map((plan) => {
					const prices: PlanPriceDetail[] = Array.isArray((plan as any).prices)
						? (plan as any).prices
						: [];
					return {
						id: plan.id,
						code: plan.code,
						name: plan.name,
						plan,
						prices,
						planPrice: prices,
					} as PlanPriceGroupResponse;
				});
			}
		} catch {
			// Ignore
		}

		return [];
	},
	getByPlan: (planId: number | string) =>
		api
			.get<PlanPriceDetail[]>(`/plan-prices/plan/${planId}`)
			.then((r) => r.data),
	getById: (id: number | string) =>
		api.get<PlanPriceDetail>(`/plan-prices/${id}`).then((r) => r.data),
	search: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: searchBody(params, ["billingCycle", "currency"]);
		return api
			.post<Paged<PlanPriceDetail>>("/plan-prices/search", body)
			.then((r) => normalizePaged<PlanPriceDetail>(r.data));
	},
	create: (body: PlanPriceRequest) =>
		api.post<PlanPriceDetail>("/plan-prices", body).then((r) => r.data),
	update: (id: number | string, body: Partial<PlanPriceRequest>) =>
		api.put<PlanPriceDetail>(`/plan-prices/${id}`, body).then((r) => r.data),
	toggleActive: (id: number | string, active: boolean) =>
		api
			.put(`/plan-prices/${id}/active`, null, { params: { active } })
			.then((r) => r.data),
	remove: (id: number | string) =>
		api.delete(`/plan-prices/${id}`).then((r) => r.data),
};

export const subscriptionsApi = {
	startTrial: (companyId?: number | string | null) =>
		api
			.post<ActiveSubscription>(
				"/subscriptions/trial",
				companyId != null && companyId !== "" ? { companyId } : undefined,
			)
			.then((r) => r.data),
	subscribe: (body: SubscribeRequest) =>
		api
			.post<ActiveSubscription>("/subscriptions/subscribe", body)
			.then((r) => r.data),
	cancel: (body: CancelSubscriptionRequest) =>
		api
			.post<ActiveSubscription>("/subscriptions/cancel", body)
			.then((r) => r.data),
	getActive: (companyId?: number | string | null) =>
		api
			.get<ActiveSubscription>("/subscriptions/active", {
				params:
					companyId != null && companyId !== "" ? { companyId } : undefined,
			})
			.then((r) => r.data)
			.catch(() => null),
	getHistory: (
		params?: ListParams & { size?: number; companyId?: number | string | null },
	) => {
		const page =
			params?.page !== undefined
				? params.page >= 1
					? params.page - 1
					: params.page
				: 0;
		const size = params?.size ?? params?.limit ?? 10;
		const query: Record<string, any> = {
			page,
			size,
		};
		if (params?.companyId != null && params.companyId !== "") {
			query.companyId = params.companyId;
		}
		if (params?.search) {
			query.search = params.search;
		}
		return api
			.get<Paged<SubscriptionAuditLog>>("/subscriptions/history", {
				params: query,
			})
			.then((r) => normalizePaged<SubscriptionAuditLog>(r.data))
			.catch(() => {
				const body = {
					...searchBody(params, [
						"status",
						"action",
						"remark",
						"cancellationReason",
					]),
					...(params?.companyId != null && params.companyId !== ""
						? { companyId: params.companyId }
						: {}),
				};
				return api
					.post<Paged<SubscriptionAuditLog>>("/subscriptions/search", body)
					.then((r) => normalizePaged<SubscriptionAuditLog>(r.data));
			});
	},
	search: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: searchBody(params, ["status", "cancellationReason"]);
		return api
			.post<Paged<ActiveSubscription>>("/subscriptions/search", body)
			.then((r) => normalizePaged<ActiveSubscription>(r.data));
	},
	searchGroupedByCompany: (params: any = {}) => {
		const body =
			params.filterGroup || params.page !== undefined
				? params
				: searchBody(params, ["companyName", "businessId"]);
		return api
			.post<Paged<CompanySubscriptionGroup>>(
				"/subscriptions/search/grouped-by-company",
				body,
			)
			.then((r) => normalizePaged<CompanySubscriptionGroup>(r.data));
	},
};

// ---- Tags Domain ---------------------------------------------
export interface TagItem {
	id?: string | number;
	name: string;
	[key: string]: any;
}

export const tagsApi = {
	search: async (params?: { name?: string; page?: number; size?: number }) => {
		const query = params?.name?.trim() || "";
		const body = {
			filterGroup: {
				operator: "AND",
				filters: query
					? [
							{
								field: "name",
								operator: "SW",
								value: query,
							},
						]
					: [],
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: params?.page ?? 0,
			size: params?.size ?? 20,
		};

		try {
			const res = await api.post<any>("/tags/search", body);
			const data = res.data?.data ?? res.data;
			const items =
				data?.content ?? data?.items ?? (Array.isArray(data) ? data : []);
			return items.map((item: any) => {
				if (typeof item === "string") return { id: item, name: item };
				return {
					id: item.id || item.tagId || item.name,
					name: item.name || item.tagName || String(item),
					...item,
				};
			}) as TagItem[];
		} catch (err) {
			console.warn("tagsApi.search error:", err);
			return [];
		}
	},
	create: async (name: string) => {
		try {
			const res = await api.post<any>("/tags", { name });
			return res.data?.data ?? res.data;
		} catch (e) {
			console.warn("tagsApi.create error:", e);
			return { name };
		}
	},
};

// ============================================================
// Crm — In-memory mock backend database.
// Swap the API route handlers for the real backend without
// touching any client code: response shapes are identical.
// ============================================================

import type {
	Branch,
	Company,
	CompanyConfiguration,
	Customer,
	Delivery,
	Permission,
	Role,
	Staff,
	Supplier,
	User,
	SystemAdmin,
	InventoryImport,
} from "@/lib/types";
import type {
	FeatureItem,
	PlanDetail,
	PlanPriceDetail,
	ActiveSubscription,
	SubscriptionAuditLog,
} from "@/types/subscription";

interface StoredFile {
	contentType: string;
	data: Uint8Array;
}

interface MockDb {
	companies: Company[];
	configurations: CompanyConfiguration[];
	branches: Branch[];
	staff: Staff[];
	customers: Customer[];
	suppliers: Supplier[];
	deliveries: Delivery[];
	imports: InventoryImport[];
	users: User[];
	systemAdmins: SystemAdmin[];
	roles: Role[];
	permissions: Permission[];
	features: FeatureItem[];
	plans: PlanDetail[];
	planPrices: PlanPriceDetail[];
	subscriptions: ActiveSubscription[];
	subscriptionAuditLogs: SubscriptionAuditLog[];
	passwords: Map<string, string>; // userId -> password (mock only)
	resetTokens: Map<string, string>; // token -> userId
	files: Map<string, StoredFile>;
}

const now = () => new Date().toISOString();

let counter = 100;
export const uid = (prefix: string) =>
	`${prefix}_${(counter++).toString(36)}${Date.now().toString(36).slice(-4)}`;

function seed(): MockDb {
	const permissions: Permission[] = [
		// Super admin scope
		{
			id: "perm_companies_read",
			name: "companies.read",
			module: "Companies",
			description: "View companies",
		},
		{
			id: "perm_companies_create",
			name: "companies.create",
			module: "Companies",
			description: "Create companies",
		},
		{
			id: "perm_companies_update",
			name: "companies.update",
			module: "Companies",
			description: "Update companies",
		},
		{
			id: "perm_companies_delete",
			name: "companies.delete",
			module: "Companies",
			description: "Delete / restore companies",
		},
		{
			id: "perm_admins_read",
			name: "admins.read",
			module: "System Admins",
			description: "View system admins",
		},
		{
			id: "perm_admins_create",
			name: "admins.create",
			module: "System Admins",
			description: "Register system admins",
		},
		// Tenant scope
		{
			id: "perm_branches_read",
			name: "branches.read",
			module: "Branches",
			description: "View branches",
		},
		{
			id: "perm_branches_create",
			name: "branches.create",
			module: "Branches",
			description: "Create branches",
		},
		{
			id: "perm_branches_update",
			name: "branches.update",
			module: "Branches",
			description: "Update branches",
		},
		{
			id: "perm_branches_delete",
			name: "branches.delete",
			module: "Branches",
			description: "Delete / restore branches",
		},
		{
			id: "perm_staff_read",
			name: "staff.read",
			module: "Staff",
			description: "View staff profiles",
		},
		{
			id: "perm_staff_create",
			name: "staff.create",
			module: "Staff",
			description: "Create staff profiles",
		},
		{
			id: "perm_staff_update",
			name: "staff.update",
			module: "Staff",
			description: "Update staff profiles",
		},
		{
			id: "perm_staff_delete",
			name: "staff.delete",
			module: "Staff",
			description: "Delete / restore staff",
		},
		{
			id: "perm_users_read",
			name: "users.read",
			module: "Users",
			description: "View user accounts",
		},
		{
			id: "perm_users_create",
			name: "users.create",
			module: "Users",
			description: "Register users",
		},
		{
			id: "perm_users_update",
			name: "users.update",
			module: "Users",
			description: "Update users and assign roles",
		},
		{
			id: "perm_users_permissions",
			name: "users.manage_permissions",
			module: "Users",
			description: "Manage custom user permissions",
		},
		{
			id: "perm_roles_read",
			name: "roles.read",
			module: "Roles",
			description: "View roles",
		},
		{
			id: "perm_roles_create",
			name: "roles.create",
			module: "Roles",
			description: "Create roles",
		},
		{
			id: "perm_roles_update",
			name: "roles.update",
			module: "Roles",
			description: "Update roles",
		},
		{
			id: "perm_roles_delete",
			name: "roles.delete",
			module: "Roles",
			description: "Delete roles",
		},
	];

	const tenantPermissionIds = permissions
		.filter(
			(p) => !p.name.startsWith("companies.") && !p.name.startsWith("admins."),
		)
		.map((p) => p.id);

	const companies: Company[] = [
		{
			id: 115,
			name: "Menglang",
			username: "huomenglang",
			phoneNumber: "+855968137739",
			phone: "+855968137739",
			email: "menglanghuo@gmail.com",
			note: "B2B at Kandal Province",
			description: "B2B at Kandal Province",
			address: "Preah Brasab,Khsack Kandal,Kandal",
			lat: 11.767284,
			lng: 105.024648,
			enableBranch: true,
			active: true,
			isActive: true,
			deletedAt: null,
			createdAt: "2026-08-16 22:11:13",
			updatedAt: "2026-08-17 14:50:37",
			subscription: {
				planName: "Free Tier",
				planPrice: 0.0,
				billingCycle: "FREE_TIER",
				startDate: "2026-08-16T22:11:14.401094",
				endDate: "2026-08-30T22:11:14.401094",
				status: "TRIAL",
			},
		},
		{
			id: "comp_acme",
			name: "Acme Financial",
			username: "acmeadmin",
			phone: "+1 (415) 555-0134",
			phoneNumber: "+1 (415) 555-0134",
			email: "hello@acmefinancial.com",
			address: "580 Market St, San Francisco, CA",
			note: "Retail banking and micro-lending enterprise partner.",
			description: "Retail banking and micro-lending enterprise partner.",
			lat: 37.789172,
			lng: -122.401449,
			enableBranch: true,
			active: true,
			isActive: true,
			deletedAt: null,
			createdAt: "2026-01-12T09:30:00.000Z",
			updatedAt: "2026-08-10T11:20:00.000Z",
			subscription: {
				planName: "Pro Enterprise",
				planPrice: 49.0,
				billingCycle: "MONTHLY",
				startDate: "2026-08-01T00:00:00Z",
				endDate: "2026-09-01T00:00:00Z",
				status: "ACTIVE",
			},
		},
		{
			id: "comp_northwind",
			name: "Northwind Retail",
			username: "northwind_ops",
			phone: "+1 (206) 555-0177",
			phoneNumber: "+1 (206) 555-0177",
			email: "ops@northwindretail.io",
			address: "22 Pike Pl, Seattle, WA",
			note: "Multi-store retail chain operations across Pacific Northwest.",
			description:
				"Multi-store retail chain operations across Pacific Northwest.",
			lat: 47.608913,
			lng: -122.340983,
			enableBranch: true,
			active: true,
			isActive: true,
			deletedAt: null,
			createdAt: "2026-02-03T14:00:00.000Z",
			updatedAt: "2026-08-12T08:15:00.000Z",
			subscription: {
				planName: "CRM Starter",
				planPrice: 19.0,
				billingCycle: "MONTHLY",
				startDate: "2026-08-10T00:00:00Z",
				endDate: "2026-09-10T00:00:00Z",
				status: "ACTIVE",
			},
		},
		{
			id: "comp_helios",
			name: "Helios Energy",
			username: "helios_clean",
			phone: "+44 20 7946 0810",
			phoneNumber: "+44 20 7946 0810",
			email: "contact@heliosenergy.co",
			address: "1 Canary Wharf, London, UK",
			note: "Solar installation and commercial clean energy maintenance.",
			description:
				"Solar installation and commercial clean energy maintenance.",
			lat: 51.505431,
			lng: -0.023533,
			enableBranch: false,
			active: false,
			isActive: false,
			deletedAt: null,
			createdAt: "2026-03-21T10:15:00.000Z",
			updatedAt: "2026-07-20T16:45:00.000Z",
			subscription: {
				planName: "Free Tier",
				planPrice: 0.0,
				billingCycle: "FREE_TIER",
				startDate: "2026-07-01T00:00:00Z",
				endDate: "2026-07-15T00:00:00Z",
				status: "EXPIRED",
			},
		},
	];

	const roles: Role[] = [
		{
			id: "role_super",
			companyId: null,
			name: "super_admin",
			description: "Global system administrator with full access.",
			permissionIds: permissions.map((p) => p.id),
			isSystem: true,
			createdAt: "2026-01-01T00:00:00.000Z",
		},
		{
			id: "role_company_admin",
			companyId: "comp_acme",
			name: "company_admin",
			description: "Full administrative access within the company.",
			permissionIds: tenantPermissionIds,
			isSystem: true,
			createdAt: "2026-01-12T09:31:00.000Z",
		},
		{
			id: "role_branch_manager",
			companyId: "comp_acme",
			name: "branch_manager",
			description: "Manages a branch: staff and day-to-day users.",
			permissionIds: [
				"perm_branches_read",
				"perm_staff_read",
				"perm_staff_create",
				"perm_staff_update",
				"perm_users_read",
			],
			isSystem: false,
			createdAt: "2026-01-15T11:00:00.000Z",
		},
		{
			id: "role_teller",
			companyId: "comp_acme",
			name: "teller",
			description: "Front-desk operations, read-only access.",
			permissionIds: ["perm_branches_read", "perm_staff_read"],
			isSystem: false,
			createdAt: "2026-01-16T08:45:00.000Z",
		},
	];

	const users: User[] = [
		{
			id: 18,
			uniqueKey: "38e6dd45-b9cd-4207-b977-0d54060d52d7",
			firstname: "Bronx",
			lastname: "Technology",
			firstName: "Bronx",
			lastName: "Technology",
			gender: "Male",
			phone: "099889987",
			email: "bronx001@gmail.com",
			imageUrl: "https://i.pravatar.cc/150?u=1",
			bio: "Solutions will appear Tomorrow ",
			nickName: "Dego Rosta",
			address: "Phnom Penh City",
			dob: "2001-03-01",
			primaryPhone: "098739376",
			secondaryPhone: "098739374",
			initial: "DCD_Test",
			status: "Active",
			remark:
				"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.",
			company: {
				id: 5,
				name: "Klocknow",
			},
			companyId: "comp_acme",
			username: "mrlang",
			roles: [
				{
					id: 21,
					name: "ADMIN",
					groups: [],
					permissions: [
						{
							id: 131,
							name: "CUSTOMER",
							actions: [
								{ name: "CREATE", enabled: true },
								{ name: "DELETE", enabled: true },
								{ name: "READ", enabled: true },
								{ name: "UPDATE", enabled: true },
							],
						},
						{
							id: 130,
							name: "PAYMENT",
							actions: [
								{ name: "APPROVE", enabled: true },
								{ name: "CREATE", enabled: true },
								{ name: "DELETE", enabled: true },
								{ name: "READ", enabled: true },
								{ name: "UPDATE", enabled: true },
							],
						},
						{
							id: 122,
							name: "PRICE_HISTORY",
							actions: [
								{ name: "EXPORT", enabled: true },
								{ name: "READ", enabled: true },
							],
						},
					],
				},
			],
			groups: [],
			permissions: [],
			isOrdering: false,
			createdAt: "2026-08-10T13:08:00.883797",
			updatedAt: "2026-08-10T13:08:56.053357",
			completedSetup: true,
			pinSet: false,
			roleIds: ["21"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
		},
		{
			id: "user_menglang",
			username: "menglang",
			email: "menglang@crm.com",
			firstName: "Menglang",
			lastName: "Huo",
			firstname: "Menglang",
			lastname: "Huo",
			initial: "MH",
			status: "Active",
			company: { id: "comp_acme", name: "Acme Financial" },
			avatarKey: null,
			companyId: null,
			isSuperAdmin: true,
			roleIds: ["role_super"],
			roles: [{ id: "role_super", name: "SUPER_ADMIN" }],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-01T00:00:00.000Z",
		},
		{
			id: "user_tech_admin",
			username: "tech_admin",
			email: "tech_admin@crm.com",
			firstName: "Tech",
			lastName: "Admin",
			firstname: "Tech",
			lastname: "Admin",
			initial: "TA",
			status: "Active",
			company: { id: 5, name: "Klocknow" },
			avatarKey: null,
			companyId: "comp_acme",
			isSuperAdmin: false,
			roleIds: ["role_company_admin"],
			roles: [{ id: 21, name: "ADMIN" }],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-12T09:32:00.000Z",
		},
		{
			id: "user_villa_admin",
			username: "villa_admin",
			email: "villa_admin@crm.com",
			firstName: "Villa",
			lastName: "Admin",
			firstname: "Villa",
			lastname: "Admin",
			initial: "VA",
			status: "Active",
			company: { id: 5, name: "Klocknow" },
			avatarKey: null,
			companyId: "comp_acme",
			isSuperAdmin: false,
			roleIds: ["role_company_admin"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-12T09:32:00.000Z",
		},
		{
			id: "user_super",
			username: "superadmin",
			email: "root@crm.com",
			firstName: "Sam",
			lastName: "Rivera",
			avatarKey: null,
			companyId: null,
			isSuperAdmin: true,
			roleIds: ["role_super"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-01T00:00:00.000Z",
		},
		{
			id: "user_acme_admin",
			username: "acmeadmin",
			email: "admin@acmefinancial.com",
			firstName: "Alexis",
			lastName: "Chen",
			avatarKey: null,
			companyId: "comp_acme",
			isSuperAdmin: false,
			roleIds: ["role_company_admin"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-12T09:32:00.000Z",
		},
		{
			id: "user_manager",
			username: "jmorgan",
			email: "j.morgan@acmefinancial.com",
			firstName: "Jordan",
			lastName: "Morgan",
			avatarKey: null,
			companyId: "comp_acme",
			isSuperAdmin: false,
			roleIds: ["role_branch_manager"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-01-20T13:10:00.000Z",
		},
		{
			id: "user_teller",
			username: "pnguyen",
			email: "p.nguyen@acmefinancial.com",
			firstName: "Phuong",
			lastName: "Nguyen",
			avatarKey: null,
			companyId: "comp_acme",
			isSuperAdmin: false,
			roleIds: ["role_teller"],
			addedPermissionIds: [],
			excludedPermissionIds: [],
			active: true,
			createdAt: "2026-02-02T09:00:00.000Z",
		},
	];

	const branches: Branch[] = [
		{
			id: "br_downtown",
			companyId: "comp_acme",
			name: "Downtown HQ",
			phone: "+1 (415) 555-0101",
			address: "580 Market St, San Francisco, CA",
			active: true,
			deletedAt: null,
			createdAt: "2026-01-13T09:00:00.000Z",
		},
		{
			id: "br_mission",
			companyId: "comp_acme",
			name: "Mission District",
			phone: "+1 (415) 555-0155",
			address: "2200 Mission St, San Francisco, CA",
			active: true,
			deletedAt: null,
			createdAt: "2026-01-25T09:00:00.000Z",
		},
		{
			id: "br_oakland",
			companyId: "comp_acme",
			name: "Oakland Center",
			phone: "+1 (510) 555-0190",
			address: "1955 Broadway, Oakland, CA",
			active: false,
			deletedAt: null,
			createdAt: "2026-02-10T09:00:00.000Z",
		},
	];

	const staff: Staff[] = [
		{
			id: "stf_1",
			companyId: "comp_acme",
			branchId: "br_downtown",
			firstName: "Jordan",
			lastName: "Morgan",
			position: "Branch Manager",
			salary: 86000,
			email: "j.morgan@acmefinancial.com",
			phone: "+1 (415) 555-0122",
			urgentContactName: "Casey Morgan",
			urgentContactPhone: "+1 (415) 555-0123",
			documents: [],
			userId: "user_manager",
			deletedAt: null,
			createdAt: "2026-01-20T13:00:00.000Z",
		},
		{
			id: "stf_2",
			companyId: "comp_acme",
			branchId: "br_downtown",
			firstName: "Phuong",
			lastName: "Nguyen",
			position: "Senior Teller",
			salary: 52000,
			email: "p.nguyen@acmefinancial.com",
			phone: "+1 (415) 555-0144",
			urgentContactName: "Linh Nguyen",
			urgentContactPhone: "+1 (415) 555-0145",
			documents: [],
			userId: "user_teller",
			deletedAt: null,
			createdAt: "2026-02-02T09:00:00.000Z",
		},
		{
			id: "stf_3",
			companyId: "comp_acme",
			branchId: "br_mission",
			firstName: "Diego",
			lastName: "Alvarez",
			position: "Loan Officer",
			salary: 68000,
			email: "d.alvarez@acmefinancial.com",
			phone: "+1 (415) 555-0166",
			urgentContactName: "Maria Alvarez",
			urgentContactPhone: "+1 (415) 555-0167",
			documents: [],
			userId: null,
			deletedAt: null,
			createdAt: "2026-02-14T09:00:00.000Z",
		},
	];

	const configurations: CompanyConfiguration[] = [
		{
			id: "cfg_loan_rules",
			companyId: "comp_acme",
			configKey: "loan_policy",
			configValue: {
				maxLoanAmount: 50000,
				defaultCurrency: "USD",
				interestCalculation: "DECLINING_BALANCE",
				maxTermMonths: 48,
				penaltyFeePercentage: 2.5,
				gracePeriodDays: 5,
			},
			description:
				"Default loan interest policy and term constraints for Acme Financial.",
			createdAt: "2026-01-15T10:00:00.000Z",
			updatedAt: "2026-02-01T12:00:00.000Z",
		},
		{
			id: "cfg_payment_gateway",
			companyId: "comp_acme",
			configKey: "payment_gateway",
			configValue: {
				provider: "Stripe",
				autoReconciliation: true,
				supportedMethods: ["CARD", "BANK_TRANSFER", "ABA_PAY"],
				environment: "production",
			},
			description: "Payment gateway integration credentials and configuration.",
			createdAt: "2026-01-18T14:30:00.000Z",
			updatedAt: "2026-02-10T16:20:00.000Z",
		},
		{
			id: "cfg_northwind_retail",
			companyId: "comp_northwind",
			configKey: "pos_settings",
			configValue: {
				taxPercentage: 10,
				allowNegativeStock: false,
				barcodePrefix: "NW-2026",
				receiptFooterMessage: "Thank you for shopping with Northwind Retail!",
			},
			description: "POS terminal and inventory control settings.",
			createdAt: "2026-02-04T09:15:00.000Z",
			updatedAt: "2026-02-04T09:15:00.000Z",
		},
	];

	const customers: Customer[] = [
		{
			id: "cust_1",
			companyId: "comp_acme",
			branchId: "br_downtown",
			name: "Sokha Chan",
			industry: "Retail & Trade",
			customerGroup: "VIP",
			phone: "+855 12 345 678",
			address: "#123 St 271, Khan Sen Sok, Phnom Penh",
			occupation: "Business Owner",
			imageUrl: "",
			preferredCurrency: "USD",
			isActive: true,
			email: "sokha.chan@example.com",
			dateOfBirth: "1988-05-15",
			gender: "male",
			nationalId: "ID-019827364",
			documents: [
				{
					id: "doc_1",
					fileKey: "customers/cust_1/id_card.pdf",
					fileName: "national_id_card.pdf",
					docType: "ID_CARD",
					fileSize: 1245000,
					mimeType: "application/pdf",
					createdAt: "2026-02-01T10:00:00.000Z",
				},
				{
					id: "doc_2",
					fileKey: "customers/cust_1/home_book.pdf",
					fileName: "family_home_book.pdf",
					docType: "HOME_BOOK",
					fileSize: 2310000,
					mimeType: "application/pdf",
					createdAt: "2026-02-01T10:05:00.000Z",
				},
				{
					id: "doc_3",
					fileKey: "customers/cust_1/payroll.pdf",
					fileName: "monthly_salary_slip.pdf",
					docType: "PAYROLL",
					fileSize: 850000,
					mimeType: "application/pdf",
					createdAt: "2026-02-01T10:10:00.000Z",
				},
			],
			createdAt: "2026-02-01T10:00:00.000Z",
			updatedAt: null,
		},
	];

	const passwords = new Map<string, string>([
		["user_menglang", "Menglang@dmin!"],
		["user_tech_admin", "Password@123"],
		["user_villa_admin", "Password@123"],
		["user_super", "admin123"],
		["user_acme_admin", "admin123"],
		["user_manager", "admin123"],
		["user_teller", "admin123"],
	]);

	const suppliers: Supplier[] = [
		{
			id: 1,
			name: "Global Hardware & Components Inc",
			description: "Primary supplier for hardware, chips, and raw materials",
			primaryPhone: "019283433",
			secondaryPhone: "099889933",
			status: "Active",
			isActive: true,
			company: {
				id: 5,
				name: "Klocknow",
			},
			createdAt: "2026-08-14 21:19:16",
			updatedAt: "2026-08-14 21:19:16",
		},
		{
			id: 2,
			name: "MR.Lang Supplier Corp",
			description: "Primary supplier for hardware and raw materials",
			primaryPhone: "019283433",
			secondaryPhone: "099889933",
			status: "Active",
			isActive: true,
			company: {
				id: 5,
				name: "Klocknow",
			},
			createdAt: "2026-08-14 21:19:16",
			updatedAt: "2026-08-14 21:19:16",
		},
	];

	const deliveries: Delivery[] = [
		{
			id: 2,
			companyId: 5,
			company: { id: 5, name: "Klocknow" },
			name: "Phnom Penh Express Truck 08",
			code: "DEL-TRK-08",
			deliveryType: "TRUCK",
			driverName: "Sok Somnang",
			primaryPhone: "+85512345678",
			secondaryPhone: "+85515667788",
			vehicleNumber: "PP-2A-8888",
			description:
				"Primary carrier for high-capacity shipments inside Phnom Penh.",
			primaryProvinceCode: "12",
			primaryProvince: {
				provinceCode: "12",
				provinceEn: "Phnom Penh",
				provinceKh: "រាជធានីភ្នំពេញ",
			},
			provinceCodes: ["12", "08"],
			provinces: [
				{
					provinceCode: "12",
					provinceEn: "Phnom Penh",
					provinceKh: "រាជធានីភ្នំពេញ",
				},
				{
					provinceCode: "08",
					provinceEn: "Kandal",
					provinceKh: "កណ្ដាល",
				},
			],
			status: "Active",
			isActive: true,
			createdAt: "2026-08-11T11:46:36.395261",
			updatedAt: "2026-08-11T11:46:36.396147",
		},
		{
			id: 1,
			companyId: 5,
			company: { id: 5, name: "Klocknow" },
			name: "Siem Reap Regional Express Van",
			code: "DEL-VAN-01",
			deliveryType: "VAN",
			driverName: "Chan Heng",
			primaryPhone: "+85598765432",
			secondaryPhone: "+85588776655",
			vehicleNumber: "SR-3B-9999",
			description:
				"Fast van delivery service covering Siem Reap and Battambang routes.",
			primaryProvinceCode: "17",
			primaryProvince: {
				provinceCode: "17",
				provinceEn: "Siem Reap",
				provinceKh: "សៀមរាប",
			},
			provinceCodes: ["17", "02", "22"],
			provinces: [
				{ provinceCode: "17", provinceEn: "Siem Reap", provinceKh: "សៀមរាប" },
				{ provinceCode: "02", provinceEn: "Battambang", provinceKh: "បាត់ដំបង" },
				{
					provinceCode: "22",
					provinceEn: "Oddar Meanchey",
					provinceKh: "ឧត្តរមានជ័យ",
				},
			],
			status: "Active",
			isActive: true,
			createdAt: "2026-08-10T09:15:20.123456",
			updatedAt: "2026-08-10T09:15:20.123456",
		},
	];

	const features: FeatureItem[] = [
		{
			id: 1,
			code: "CONTACT_MGMT",
			name: "Contact & Lead Management",
			status: "Active",
			description:
				"Manage customer contacts, leads, and 360-degree timeline view.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 2,
			code: "DEAL_PIPELINE",
			name: "Sales Deals & Pipeline",
			status: "Active",
			description:
				"Visual kanban board for opportunity tracking and sales forecasting.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 3,
			code: "ADVANCED_ANALYTICS",
			name: "Advanced Analytics & Funnels",
			status: "Active",
			description:
				"Generate custom sales pipeline reporting and cohort analytics.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 4,
			code: "WORKFLOW_AUTOMATION",
			name: "Workflow Automation & Triggers",
			status: "Active",
			description:
				"Automate sales triggers, email notifications, and task assignments.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 5,
			code: "INVOICE_BILLING",
			name: "Invoicing & Payment Gateway",
			status: "Active",
			description:
				"Generate POS invoices, KHQR codes, and record partial settlements.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 6,
			code: "INVENTORY_TRACKING",
			name: "Multi-Warehouse Inventory",
			status: "Active",
			description:
				"Real-time stock tracking, serial numbers, and warehouse transfers.",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
	];

	const plans: PlanDetail[] = [
		{
			id: 1,
			code: "FREE_PLAN",
			name: "Free Tier",
			displayName: "Free Tier CRM Plan",
			description: "Essential tools for small businesses exploring CRM.",
			maxUsers: 5,
			trial: true,
			active: true,
			publiclyVisible: true,
			sortOrder: 0,
			tier: "FREE_TRIAL",
			features: [features[0], features[1]],
			status: "Active",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 2,
			code: "CRM_STARTER",
			name: "CRM Starter",
			displayName: "Starter CRM Plan",
			description: "Ideal for growing sales teams with standard pipelines.",
			maxUsers: 10,
			trial: false,
			active: true,
			publiclyVisible: true,
			sortOrder: 1,
			tier: "STARTER",
			features: [features[0], features[1], features[4]],
			status: "Active",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 3,
			code: "CRM_PRO",
			name: "CRM Professional",
			displayName: "Professional CRM Plan",
			description:
				"Full sales automation, advanced analytics, and multi-warehouse stock.",
			maxUsers: 25,
			trial: false,
			active: true,
			publiclyVisible: true,
			sortOrder: 2,
			tier: "PROFESSIONAL",
			features: [
				features[0],
				features[1],
				features[2],
				features[3],
				features[4],
			],
			status: "Active",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 4,
			code: "CRM_ENTERPRISE",
			name: "CRM Enterprise",
			displayName: "Enterprise CRM Suite",
			description:
				"Unlimited power, dedicated support, custom integrations & SLA.",
			maxUsers: 100,
			trial: false,
			active: true,
			publiclyVisible: true,
			sortOrder: 3,
			tier: "ENTERPRISE",
			features: features,
			status: "Active",
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
	];

	const planPrices: PlanPriceDetail[] = [
		{
			id: 1,
			planId: 1,
			billingCycle: "MONTHLY",
			amount: 0.0,
			currency: "USD",
			intervalCount: 14,
			intervalUnit: "DAY",
			durationDays: 14,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 2,
			planId: 2,
			billingCycle: "MONTHLY",
			amount: 19.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "MONTH",
			durationDays: 30,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 3,
			planId: 2,
			billingCycle: "YEARLY",
			amount: 199.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "YEAR",
			durationDays: 365,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 4,
			planId: 3,
			billingCycle: "MONTHLY",
			amount: 49.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "MONTH",
			durationDays: 30,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 5,
			planId: 3,
			billingCycle: "YEARLY",
			amount: 499.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "YEAR",
			durationDays: 365,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 6,
			planId: 4,
			billingCycle: "MONTHLY",
			amount: 79.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "MONTH",
			durationDays: 30,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 7,
			planId: 4,
			billingCycle: "YEARLY",
			amount: 799.99,
			currency: "USD",
			intervalCount: 1,
			intervalUnit: "YEAR",
			durationDays: 365,
			status: "Active",
			active: true,
			createdAt: "2026-08-01T00:00:00Z",
			updatedAt: "2026-08-01T00:00:00Z",
		},
	];

	const subscriptions: ActiveSubscription[] = [
		{
			id: 102,
			companyId: "comp_acme",
			companyName: "Acme Financial",
			plan: plans[2],
			planPrice: planPrices[3],
			status: "ACTIVE",
			startDate: "2026-08-01T00:00:00Z",
			endDate: "2026-09-01T00:00:00Z",
			gracePeriodEnd: "2026-09-04T00:00:00Z",
			nextBillingDate: "2026-09-01T00:00:00Z",
			autoRenew: true,
			subscribedAmount: 49.0,
			subscribedCurrency: "USD",
			createdAt: "2026-08-01T00:00:00Z",
		},
		{
			id: 101,
			companyId: "comp_acme",
			companyName: "Acme Financial",
			plan: plans[0],
			planPrice: planPrices[0],
			status: "TRIAL",
			startDate: "2026-07-15T00:00:00Z",
			endDate: "2026-07-29T00:00:00Z",
			gracePeriodEnd: "2026-08-01T00:00:00Z",
			nextBillingDate: null,
			autoRenew: false,
			subscribedAmount: 0.0,
			subscribedCurrency: "USD",
			createdAt: "2026-07-15T00:00:00Z",
		},
		{
			id: 103,
			companyId: "comp_northwind",
			companyName: "Northwind Retail",
			plan: plans[1],
			planPrice: planPrices[1],
			status: "ACTIVE",
			startDate: "2026-08-10T00:00:00Z",
			endDate: "2026-09-10T00:00:00Z",
			gracePeriodEnd: "2026-09-13T00:00:00Z",
			nextBillingDate: "2026-09-10T00:00:00Z",
			autoRenew: true,
			subscribedAmount: 19.0,
			subscribedCurrency: "USD",
			createdAt: "2026-08-10T00:00:00Z",
		},
	];

	const systemAdmins: SystemAdmin[] = [
		{
			id: 2,
			username: "bronx@super_admin",
			displayName: "Sovichea",
			email: "bronxsupport@technology.com",
			isActive: true,
			isLocked: false,
			loginAttempts: 0,
			adminLevel: "SUPPORT",
			notes: "Bronx Support Team",
			createdAt: "2026-08-17T15:29:01.468299",
			updatedAt: "2026-08-17T15:29:01.46833",
		},
		{
			id: 1,
			username: "bronx@dmin",
			displayName: "Bronx Administrator",
			email: "admin@bronxtechnology.com",
			isActive: true,
			isLocked: false,
			loginAttempts: 0,
			lastLoginAt: "2026-08-17T15:20:22.685577",
			adminLevel: "FULL",
			createdAt: "2026-07-24T11:14:47.355288",
			updatedAt: "2026-08-17T15:20:22.834189",
		},
	];

	const imports: InventoryImport[] = [
		{
			id: 1,
			referenceNo: "IMP-2026-024",
			importNo: "IMP-2026-024",
			supplierId: 1,
			supplierName: "TechPro Wholesale Ltd",
			supplierPhone: "+855 12 345 678",
			warehouseId: 1,
			warehouseName: "Central Distribution Hub",
			importDate: "2026-08-11T10:00:00",
			note: "Bulk shipment from primary supplier",
			notes: "Bulk shipment from primary supplier",
			totalAmount: 12500,
			totalCost: 12500,
			totalUnits: 65,
			status: "COMPLETED",
			items: [
				{
					id: 101,
					variantId: 52,
					productId: 1,
					productName: "iPhone 15 Pro Max 256GB Titanium",
					variantName: "Natural Titanium 256GB",
					sku: "IP15PM-NT-256",
					unitId: 13,
					unitName: "Box (10 pcs)",
					quantity: 5,
					unitCost: 2000,
					untiPrice: 2200,
					unitPrice: 2200,
					totalCost: 10000,
				},
				{
					id: 102,
					variantId: 53,
					productId: 2,
					productName: "Samsung Galaxy S24 Ultra",
					variantName: "Titanium Gray 512GB",
					sku: "S24U-TG-512",
					unitId: 1,
					unitName: "Pcs",
					quantity: 15,
					unitCost: 166.66,
					untiPrice: 210,
					unitPrice: 210,
					totalCost: 2500,
				},
			],
			createdAt: "2026-08-11 10:00:00",
			updatedAt: "2026-08-11 10:30:00",
		},
		{
			id: 2,
			referenceNo: "IMP-2026-025",
			importNo: "IMP-2026-025",
			supplierId: 2,
			supplierName: "Global Electronics Hub",
			supplierPhone: "+855 98 765 432",
			warehouseId: 1,
			warehouseName: "Central Distribution Hub",
			importDate: "2026-08-14T14:30:00",
			note: "Fast-track accessories restock",
			notes: "Fast-track accessories restock",
			totalAmount: 4800,
			totalCost: 4800,
			totalUnits: 120,
			status: "COMPLETED",
			items: [
				{
					id: 103,
					variantId: 60,
					productId: 3,
					productName: "Anker 65W GaN Fast Charger",
					variantName: "Black 65W",
					sku: "ANK-65W-BLK",
					unitId: 1,
					unitName: "Pcs",
					quantity: 120,
					unitCost: 40,
					untiPrice: 55,
					unitPrice: 55,
					totalCost: 4800,
				},
			],
			createdAt: "2026-08-14 14:30:00",
			updatedAt: "2026-08-14 15:00:00",
		},
	];

	const subscriptionAuditLogs: SubscriptionAuditLog[] = [
		{
			id: 26,
			companyId: 115,
			companyName: "Menglang",
			oldPlan: {
				id: 1,
				code: "FREE_PLAN",
				name: "Free Tier",
				displayName: "Free Tier CRM Plan",
				description:
					"Essential CRM tools for small sales teams to capture leads and close deals faster.",
				maxUsers: 5,
				trial: true,
				active: true,
				publiclyVisible: true,
				sortOrder: 0,
				tier: "FREE_TRIAL",
				features: [
					{
						id: 2,
						code: "ULTIMATE_ACCESS",
						name: "Advanced Full Access Module",
						status: "Active",
						description: "Access to advanced customized reports",
						createdAt: "2026-08-12T11:47:57.975880Z",
						updatedAt: "2026-08-12T11:47:57.975909Z",
					},
					{
						id: 3,
						code: "REPORT_MANAGEMENT",
						name: "Report & Account Management",
						status: "Active",
						description:
							"Store and manage unlimited leads, contacts, deals, and company profiles with interaction history.",
						createdAt: "2026-08-12T11:48:04.001987Z",
						updatedAt: "2026-08-12T11:48:04.002018Z",
					},
				],
			},
			newPlan: {
				id: 3,
				code: "CRM_PRO",
				name: "CRM Professional",
				displayName: "Professional CRM Plan",
				description:
					"Complete sales automation and email campaign tools for scaling sales teams.",
				maxUsers: 50,
				trial: false,
				active: true,
				publiclyVisible: true,
				sortOrder: 2,
				tier: "PROFESSIONAL",
				features: [
					{
						id: 2,
						code: "ULTIMATE_ACCESS",
						name: "Advanced Full Access Module",
						status: "Active",
						description: "Access to advanced customized reports",
						createdAt: "2026-08-12T11:47:57.975880Z",
						updatedAt: "2026-08-12T11:47:57.975909Z",
					},
					{
						id: 1,
						code: "PRIORITY_SUPPORT",
						name: "24/7 Dedicated Support",
						status: "Active",
						description:
							"Dedicated customer success manager with 1-hour SLA priority support.",
						createdAt: "2026-08-12T11:47:46.145913Z",
						updatedAt: "2026-08-12T11:47:46.146781Z",
					},
					{
						id: 4,
						code: "SALES_PIPELINE",
						name: "Sales Pipeline",
						status: "Active",
						description:
							"Drag-and-drop deal tracking across customized stages with probability weighting.",
						createdAt: "2026-08-12T11:48:10.648671Z",
						updatedAt: "2026-08-12T11:48:10.648702Z",
					},
					{
						id: 3,
						code: "REPORT_MANAGEMENT",
						name: "Report & Account Management",
						status: "Active",
						description:
							"Store and manage unlimited leads, contacts, deals, and company profiles with interaction history.",
						createdAt: "2026-08-12T11:48:04.001987Z",
						updatedAt: "2026-08-12T11:48:04.002018Z",
					},
				],
			},
			oldStatus: "TRIAL",
			newStatus: "ACTIVE",
			action: "UPGRADE",
			createdBy: 1,
			remark: "Subscription upgraded from Free Tier to CRM Professional",
			newPlanPrice: {
				billingCycle: "YEARLY",
				amount: 499.99,
				intervalUnit: "YEAR",
				durationDays: 365,
			},
			subscribeDate: "2026-08-18T10:02:33.946462Z",
			expireDate: "2027-08-18T10:02:33.946462Z",
			createdAt: "2026-08-18T10:02:33.963689Z",
		},
		{
			id: 25,
			companyId: 115,
			companyName: "Menglang",
			oldPlan: null,
			newPlan: {
				id: 1,
				code: "FREE_PLAN",
				name: "Free Tier",
				displayName: "Free Tier CRM Plan",
				description:
					"Essential CRM tools for small sales teams to capture leads and close deals faster.",
				maxUsers: 5,
				trial: true,
				active: true,
				publiclyVisible: true,
				sortOrder: 0,
				tier: "FREE_TRIAL",
				features: [
					{
						id: 2,
						code: "ULTIMATE_ACCESS",
						name: "Advanced Full Access Module",
						status: "Active",
						description: "Access to advanced customized reports",
						createdAt: "2026-08-12T11:47:57.975880Z",
						updatedAt: "2026-08-12T11:47:57.975909Z",
					},
					{
						id: 3,
						code: "REPORT_MANAGEMENT",
						name: "Report & Account Management",
						status: "Active",
						description:
							"Store and manage unlimited leads, contacts, deals, and company profiles with interaction history.",
						createdAt: "2026-08-12T11:48:04.001987Z",
						updatedAt: "2026-08-12T11:48:04.002018Z",
					},
				],
			},
			oldStatus: null,
			newStatus: "TRIAL",
			action: "TRIAL_START",
			createdBy: 1,
			remark: "14-Day Free Trial initiated for company account",
			createdAt: "2026-08-12T11:47:50.000000Z",
		},
		{
			id: 24,
			companyId: "comp_acme",
			companyName: "Acme Financial",
			oldPlan: plans[1],
			newPlan: plans[2],
			oldStatus: "ACTIVE",
			newStatus: "ACTIVE",
			action: "UPGRADE",
			createdBy: 1,
			remark:
				"Subscription upgraded from CRM Starter to CRM Professional for expanded team seats",
			createdAt: "2026-08-01T00:00:00.000000Z",
		},
		{
			id: 23,
			companyId: "comp_acme",
			companyName: "Acme Financial",
			oldPlan: plans[0],
			newPlan: plans[1],
			oldStatus: "TRIAL",
			newStatus: "ACTIVE",
			action: "SUBSCRIBE",
			createdBy: 2,
			remark: "Converted from 14-Day Free Trial to Paid CRM Starter Plan",
			createdAt: "2026-07-29T00:00:00.000000Z",
		},
		{
			id: 22,
			companyId: "comp_northwind",
			companyName: "Northwind Retail",
			oldPlan: null,
			newPlan: plans[1],
			oldStatus: null,
			newStatus: "ACTIVE",
			action: "SUBSCRIBE",
			createdBy: 1,
			remark: "Direct dispatch of CRM Starter Plan with annual settlement",
			createdAt: "2026-08-10T00:00:00.000000Z",
		},
	];

	return {
		companies,
		configurations,
		branches,
		staff,
		customers,
		suppliers,
		deliveries,
		imports,
		users,
		systemAdmins,
		roles,
		permissions,
		features,
		plans,
		planPrices,
		subscriptions,
		subscriptionAuditLogs,
		passwords,
		resetTokens: new Map(),
		files: new Map(),
	};
}

// Persist across HMR reloads in dev.
const globalStore = globalThis as unknown as { __rumluosDb?: MockDb };
export const db: MockDb =
	globalStore.__rumluosDb ?? (globalStore.__rumluosDb = seed());
export const mockDb = db;

// Ensure arrays exist if store was created before edit
if (!Array.isArray(db.systemAdmins)) {
	db.systemAdmins = seed().systemAdmins;
}
if (!Array.isArray(db.suppliers)) {
	db.suppliers = seed().suppliers;
}
if (!Array.isArray(db.deliveries)) {
	db.deliveries = seed().deliveries;
}
if (!Array.isArray(db.features)) {
	db.features = seed().features;
}
if (!Array.isArray(db.plans)) {
	db.plans = seed().plans;
}
if (!Array.isArray(db.planPrices)) {
	db.planPrices = seed().planPrices;
}
if (!Array.isArray(db.subscriptions)) {
	db.subscriptions = seed().subscriptions;
}
if (!Array.isArray(db.subscriptionAuditLogs)) {
	db.subscriptionAuditLogs = seed().subscriptionAuditLogs;
}
if (!Array.isArray(db.imports)) {
	db.imports = seed().imports;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

export function paginate<T extends object>(
	items: T[],
	opts: {
		page?: number;
		limit?: number;
		search?: string;
		searchFields?: (keyof T)[];
	},
) {
	const page = Math.max(1, opts.page ?? 1);
	const limit = Math.min(100, Math.max(1, opts.limit ?? 10));
	let filtered = items;
	if (opts.search && opts.searchFields?.length) {
		const q = opts.search.toLowerCase();
		filtered = items.filter((item) =>
			opts.searchFields!.some((f) =>
				String(item[f] ?? "")
					.toLowerCase()
					.includes(q),
			),
		);
	}
	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / limit));
	return {
		items: filtered.slice((page - 1) * limit, page * limit),
		page,
		limit,
		total,
		totalPages,
	};
}

/** Resolve a user's effective roles + permissions (roles + added - excluded). */
export function resolveProfile(userId: string | number) {
	const user = db.users.find((u) => String(u.id) === String(userId));
	if (!user) return null;
	const roles = db.roles.filter((r) => user.roleIds.includes(String(r.id)));
	const permIds = new Set<string>();
	for (const role of roles) {
		if (role.permissionIds) {
			for (const pid of role.permissionIds) permIds.add(pid);
		}
	}
	for (const pid of user.addedPermissionIds) permIds.add(pid);
	for (const pid of user.excludedPermissionIds) permIds.delete(pid);
	const permissions = db.permissions.filter((p) => permIds.has(p.id));
	const company = user.companyId
		? (db.companies.find((c) => c.id === user.companyId) ?? null)
		: null;
	return { ...user, roles, permissions, company };
}

export { now };

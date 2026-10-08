// ============================================================
// Crm — Shared domain types
// ============================================================

export interface ApiSuccess<T> {
	success: true;
	message: string;
	data: T;
	timestamp: string;
}

export interface ApiFailure {
	success: false;
	message: string;
	error: string;
	timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paged<T> {
	items: T[];
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

// ------------------------------------------------------------
// Core Auth / Identity
// ------------------------------------------------------------

export interface Permission {
	id: string;
	name: string;
	module: string;
	description: string;
}

export interface RolePermissionItem {
	id?: string;
	name: string;
	enabled: boolean;
}

export type RolePermissionsMap = Record<string, RolePermissionItem[]>;

export interface Role {
	id: string | number;
	companyId?: string | null;
	name: string;
	displayName?: string;
	description?: string;
	priority?: number;
	permissions?: RolePermissionsMap | Record<string, any>;
	permissionIds?: string[];
	excludedPermissionIds?: string[];
	isSystem?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface CompanySubscriptionInfo {
	planName?: string;
	planPrice?: number;
	billingCycle?: string;
	startDate?: string;
	endDate?: string;
	status?: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE" | string;
}

export interface Company {
	id: string | number;
	name: string;
	username?: string;
	email: string;
	phone?: string;
	phoneNumber?: string;
	address?: string;
	description?: string;
	note?: string;
	lat?: number | null;
	lng?: number | null;
	enableBranch?: boolean;
	active?: boolean;
	isActive?: boolean;
	deletedAt?: string | null;
	createdAt: string;
	updatedAt?: string | null;
	subscription?: CompanySubscriptionInfo | null;
	branchCount?: number;
	staffCount?: number;
	userCount?: number;
}

export interface RegisterCompanyPayload {
	companyName: string;
	businessId: string;
	lat?: number;
	lng?: number;
	uploadUrl?: string;
	imageUrl?: string;
	adminUsername: string;
	adminPassword: string;
	adminPhone: string;
	adminEmail?: string;
	firstName: string;
	lastName: string;
	address?: string;
	note?: string;
	registrationToken: string;
}

export interface SendRegistrationOtpPayload {
	identifier: string;
	channel: "SMS" | "EMAIL";
}

export interface VerifyRegistrationOtpPayload {
	identifier: string;
	otpCode: string;
}

export interface RegistrationTokenResponse {
	registrationToken: string;
	expiresIn: number;
	message: string;
}

export interface CompanyConfiguration {
	id: string | number;
	companyId?: string | number | null;
	company?: Company | null;
	configKey: string;
	configValue: any;
	valueType?: "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON" | string;
	scope?: "SYSTEM" | "COMPANY" | string;
	category?:
		| "GENERAL"
		| "FINANCE"
		| "INVENTORY"
		| "DOCUMENT"
		| "NOTIFICATION"
		| "AUTH"
		| "FEATURE"
		| "PAYMENT"
		| "PRODUCT"
		| "WORKFLOW"
		| "CUSTOMER"
		| string;
	defaultValue?: string | null;
	description?: string | null;
	validationRule?: string | null;
	isEncrypted?: boolean;
	isReadOnly?: boolean;
	displayOrder?: number;
	overridden?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Branch {
	id: string;
	companyId: string;
	name: string;
	phone: string;
	address: string;
	active: boolean;
	deletedAt: string | null;
	createdAt: string;
}

export interface StaffDocument {
	fileKey: string;
	fileName: string;
}

export interface Staff {
	id: string;
	companyId: string;
	branchId: string | null;
	firstName: string;
	lastName: string;
	position: string;
	salary: number;
	email: string;
	phone: string;
	urgentContactName: string;
	urgentContactPhone: string;
	documents: StaffDocument[];
	userId: string | null;
	deletedAt: string | null;
	createdAt: string;
}

export interface StaffSummary {
	id: string;
	name: string;
	position: string;
	phone: string;
	email: string;
	branchId: string | null;
	branchName?: string | null;
	urgentContactName: string;
	urgentContactPhone: string;
	salary?: number | null;
	isActive: boolean;
}

export interface UserRoleAction {
	name: string;
	enabled: boolean;
}

export interface UserRolePermission {
	id: string | number;
	name: string;
	actions: UserRoleAction[];
}

export interface UserBackendRole {
	id: string | number;
	name: string;
	groups?: any[];
	permissions?: UserRolePermission[];
}

export interface User {
	id: string | number;
	uniqueKey?: string;
	username: string;
	email: string;
	firstName?: string;
	lastName?: string;
	firstname?: string | null;
	lastname?: string | null;
	gender?: "MALE" | "FEMALE" | "OTHER" | "Male" | "Female" | string | null;
	phone?: string | null;
	imageUrl?: string | null;
	avatarUrl?: string | null;
	avatarKey?: string | null;
	contact?: string | null;
	companyId?: string | null;
	companyName?: string | null;
	company?: { id: string | number; name: string } | null;
	branchId?: string | null;
	branchName?: string | null;
	lastLoginAt?: string | null;
	isSuperAdmin?: boolean;
	isSystemAdmin?: boolean;
	grants?: string[];
	roles?: (UserBackendRole | Role)[];
	roleIds: string[];
	groups?: any[];
	permissions?: any;
	addedPermissionIds: string[];
	excludedPermissionIds: string[];
	active?: boolean;
	status?: "Active" | "Inactive" | "active" | "inactive" | string | null;
	createdAt: string;
	updatedAt?: string | null;
	staffInfo?: StaffSummary | null;
	// Extended profile fields
	employeeCode?: string | null;
	nickName?: string | null;
	position?: string | null;
	bio?: string | null;
	description?: string | null;
	address?: string | null;
	dob?: string | null;
	isCompletedSetup?: boolean;
	completedSetup?: boolean;
	pinSet?: boolean;
	isOrdering?: boolean;
	emergencyPhone?: string | null;
	initial?: string | null;
	primaryPhone?: string | null;
	secondaryPhone?: string | null;
	employmentDate?: string | null;
	remark?: string | null;
	passwordResetRequired?: boolean;
	departmentId?: string | number | null;
	divisionId?: string | number | null;
	departmentName?: string | null;
	divisionName?: string | null;
	attributes?: Record<string, any> | null;
}

export interface AdminResetPasswordResponse {
	userId: number;
	username: string;
	email?: string;
	tempPassword: string;
	message?: string;
}

export type SystemAdminLevel = "FULL" | "SUPPORT" | "READ_ONLY" | string;

export interface SystemAdmin {
	id: string | number;
	username: string;
	displayName?: string | null;
	email: string;
	isActive: boolean;
	isLocked?: boolean;
	loginAttempts?: number;
	lastLoginAt?: string | null;
	adminLevel: SystemAdminLevel;
	notes?: string | null;
	createdAt: string;
	updatedAt?: string | null;
}

export interface CreateSystemAdminInput {
	username: string;
	displayName: string;
	email: string;
	password?: string;
	isActive?: boolean;
	adminLevel: string;
	notes?: string;
}

export interface UpdateSystemAdminInput {
	username?: string;
	displayName?: string;
	email?: string;
	password?: string;
	isActive?: boolean;
	adminLevel?: string;
	notes?: string;
}

export interface SystemAdminListParams {
	page?: number;
	size?: number;
	limit?: number;
	sortBy?: string;
	orderBy?: "ASC" | "DESC" | string;
	level?: string;
	search?: string;
}

/** User enriched with resolved roles + effective permissions */
export interface UserProfile extends User {
	roles: Role[];
	permissions: Permission[];
	company: Company | null;
}

export interface VerifyResetOtpResponse {
	identifier: string;
	resetToken: string;
	verified: boolean;
}

export interface SignInResponse {
	accessToken?: string;
	refreshToken?: string;
	tokenType?: string;
	expiresIn?: number;
	user?: UserProfile;
	passwordResetRequired?: boolean;
	passwordResetToken?: string;
}

export interface UploadUrlResponse {
	uploadUrl: string;
	fileKey: string;
}

export interface DashboardStats {
	companies?: number;
	admins?: number;
	branches?: number;
	staff?: number;
	users?: number;
	roles?: number;
}

// ------------------------------------------------------------
// Reports & Dashboard Analytics
// ------------------------------------------------------------

export interface DashboardTopProductItem {
	rank: number;
	productName: string;
	sku: string;
	totalRevenue: number;
	totalQuantity: number;
}

export interface DashboardReportData {
	totalProducts: number;
	totalOrders: number;
	totalInvoices: number;
	lowStockCount: number;
	outOfStockCount: number;
	netRevenue: number;
	grossSales: number;
	grossProfit: number;
	totalDiscount: number;
	totalTaxAmount: number;
	totalShippingAmount: number;
	totalUnpaid: number;
	totalPaymentDiscount?: number;
	topProductsByRevenue: DashboardTopProductItem[];
	topProductsByQuantity: DashboardTopProductItem[];
}

export interface TimeSeriesRevenuePoint {
	date: string;
	value: number;
	profit: number;
}

export interface TimeSeriesCountPoint {
	date: string;
	count: number;
}

export interface TimeSeriesPaymentPoint {
	date: string;
	value: number;
}

export interface TimeSeriesMetricItem {
	metric: "revenue" | "orders" | "invoices" | "payments" | string;
	series: Array<{
		date: string;
		value?: number;
		profit?: number;
		count?: number;
		[key: string]: any;
	}>;
}

export type IncomePeriod =
	| "YESTERDAY"
	| "LAST_WEEK"
	| "LAST_MONTH"
	| "LAST_SEMESTER"
	| "LAST_MID_YEAR"
	| "LAST_YEAR"
	| string;

export interface IncomeComparisonItem {
	period: IncomePeriod;
	currentIncome: number;
	previousIncome: number;
	changePercent: number;
	trend: "UP" | "DOWN" | "NEUTRAL" | string;
}

export interface IncomeComparisonData {
	comparisons: IncomeComparisonItem[];
}

export interface ReportRefreshResponse {
	refreshed?: boolean;
	message?: string;
	timestamp?: string;
}

// ------------------------------------------------------------
// Customers
// ------------------------------------------------------------

// Customers, Locations & Reports
// ------------------------------------------------------------

export type AdministrativeDivisionLevel = "PROVINCE" | "DISTRICT" | "COMMUNE" | "VILLAGE";

export interface Province {
	provinceCode: string;
	provinceEn?: string;
	provinceKh?: string;
	provinceNameKh?: string;
	provinceNameEn?: string;
	nameKh?: string;
	nameEn?: string;
	name?: string;
	code?: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface District {
	districtCode: string;
	provinceCode?: string;
	districtEn?: string;
	districtKh?: string;
	districtNameKh?: string;
	districtNameEn?: string;
	nameKh?: string;
	nameEn?: string;
	name?: string;
	code?: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface Commune {
	communeCode: string;
	districtCode?: string;
	provinceCode?: string;
	communeEn?: string;
	communeKh?: string;
	communeNameKh?: string;
	communeNameEn?: string;
	nameKh?: string;
	nameEn?: string;
	name?: string;
	code?: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface Village {
	villageCode: string;
	communeCode?: string;
	districtCode?: string;
	provinceCode?: string;
	villageEn?: string;
	villageKh?: string;
	villageNameKh?: string;
	villageNameEn?: string;
	nameKh?: string;
	nameEn?: string;
	name?: string;
	code?: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface AddressInfo {
	province?: string;
	district?: string;
	commune?: string;
	village?: string;
}

export interface CreateAdministrativeDivisionInput {
	parentCode?: string | null;
	level: AdministrativeDivisionLevel;
	nameKh: string;
	nameEn: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface UpdateAdministrativeDivisionInput {
	code?: string;
	parentCode?: string | null;
	level?: AdministrativeDivisionLevel;
	nameKh: string;
	nameEn: string;
	postalCode?: string;
	displayOrder?: number;
}

export interface StaffInfo {
	id: number | string;
	name: string;
}

export interface DeliverySummary {
	id: number | string;
	name: string;
	code?: string;
	deliveryCode?: string;
	deliveryType?: string;
	driverName?: string;
	primaryPhone?: string;
	secondaryPhone?: string;
	vehicleNumber?: string;
	primaryProvinceCode?: string;
	primaryProvince?: {
		provinceCode?: string;
		provinceEn?: string;
		provinceKh?: string;
	} | null;
	phoneNumber?: string;
	phone?: string;
	isPrimary?: boolean;
	lat?: number | null;
	lng?: number | null;
}

export interface VisitStatusInfo {
	label: string;
	color: string;
	icon: string;
	lastVisitedAt?: string | null;
	daysSinceVisit?: number | null;
}

export interface ShopContact {
	id: number | string;
	customerId: number | string;
	customerName?: string;
	name: string;
	position?: string;
	primaryPhone: string;
	secondaryPhone?: string;
	description?: string;
	isPrimary?: boolean;
	active?: boolean;
	deleted?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface CustomerDocument {
	id?: string;
	fileKey: string;
	fileName: string;
	docType: string; // 'ID_CARD' | 'HOME_BOOK' | 'PAYROLL' | 'BANK_STATEMENT' | 'INCOME_PROOF' | 'PASSPORT' | 'LAND_TITLE' | 'VEHICLE_TITLE' | 'EMPLOYMENT_LETTER' | 'OTHER'
	fileSize?: number;
	mimeType?: string;
	url?: string;
	createdAt?: string;
}

export interface Customer {
	id: string | number;
	companyId?: string | number;
	branchId?: string | number | null;
	name: string;
	gender?: string;
	phoneNumber?: string;
	phone?: string;
	contact?: string;
	merchantName?: string;
	lat?: string | number | null;
	lng?: string | number | null;
	description?: string;
	profileUrl?: string;
	profileUrls?: string[];
	imageUrl?: string;
	address?: string;
	addressCode?: string;
	status?: string;
	isActive?: boolean;
	active?: boolean;
	addressInfo?: AddressInfo | null;
	staffInfos?: StaffInfo[];
	users?: (number | string)[];
	deliveries?: DeliverySummary[];
	primaryDelivery?: DeliverySummary | null;
	primaryDeliveryId?: number | string | null;
	deliveryIds?: (number | string)[];
	shopContacts?: ShopContact[];
	visitStatus?: VisitStatusInfo | null;
	attributes?: Record<string, any>;
	documents?: CustomerDocument[];
	industry?: string;
	customerGroup?: string;
	occupation?: string;
	preferredCurrency?: string;
	email?: string;
	dateOfBirth?: string | null;
	nationalId?: string;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface CustomerNearbyResult {
	customer: Customer;
	distance: string;
}

export interface NearbySearchRequest {
	lat: number;
	lng: number;
	radiusKm?: number | null;
	limit?: number;
}

export interface CustomerVisitRecord {
	id: number | string;
	customerId: number | string;
	customerName?: string;
	visitedById?: number | string;
	visitedByName?: string;
	visitedAt: string;
	visitLat?: number | null;
	visitLng?: number | null;
	notes?: string;
	createdAt?: string;
}

export interface CustomerVisitRequest {
	visitLat?: number | null;
	visitLng?: number | null;
	notes?: string;
}

export interface CustomerReportSummary {
	totalOrders: number;
	totalInvoices: number;
	netRevenue: number;
	grossSales: number;
	grossProfit: number;
	totalDiscount: number;
	totalTaxAmount: number;
	totalShippingAmount: number;
	totalUnpaid: number;
}

export interface CustomerReportRequest {
	customerId: number | string;
	startDate?: string;
	endDate?: string;
}

export interface TimeSeriesPoint {
	date: string;
	value?: number;
	profit?: number;
	count?: number;
}

export interface TimeSeriesMetric {
	metric: "revenue" | "orders" | "invoices" | "payments" | string;
	series: TimeSeriesPoint[];
}

// ------------------------------------------------------------
// Organization Domain
// ------------------------------------------------------------

export interface Division {
	id: string | number;
	name: string;
	description?: string;
	status?: string;
	companyId?: string | number;
	company?: Company | null;
	attributes?: Record<string, any>;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Department {
	id: string | number;
	name: string;
	description?: string;
	status?: string;
	companyId?: string | number;
	divisionId?: string | number;
	company?: Company | null;
	division?: Division | null;
	department?: Department | null;
	attributes?: Record<string, any>;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Warehouse {
	id: string | number;
	name: string;
	description?: string;
	status?: string;
	isDefault?: boolean;
	logoUrl?: string;
	companyId?: string | number;
	company?: Company | null;
	createdAt?: string;
	updatedAt?: string | null;
}

// ------------------------------------------------------------
// Products / Catalog Domain
// ------------------------------------------------------------

export interface Brand {
	id: string | number;
	companyId?: string | number;
	name: string;
	description?: string;
	logoUrl?: string;
	status?: string;
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Category {
	id: string | number;
	companyId?: string | number;
	name: string;
	description?: string;
	color?: string;
	parentId?: string | number | null;
	parentName?: string;
	imageUrl?: string;
	logoUrl?: string;
	children?: Category[];
	sortOrder?: number;
	status?: string;
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Unit {
	id: string | number;
	companyId?: string | number;
	name: string;
	symbol?: string;
	description?: string;
	status?: string;
	isActive?: boolean;
	displayOrder?: number;
	attributes?: Record<string, any>;
	createdAt?: string;
	updatedAt?: string | null;
}

export type DiscountType = "FLAT" | "PERCENTAGE";

export interface ProductPriceHistory {
	id: string | number;
	productId: string | number;
	oldBasePrice?: number;
	newBasePrice?: number;
	oldSellPrice?: number;
	newSellPrice?: number;
	currency?: string;
	changedBy?: string;
	reason?: string;
	createdAt: string;
}

export interface Product {
	id: string | number;
	companyId?: string | number;
	brandId?: string | number | null;
	categoryId?: string | number | null;
	unitId?: string | number | null;
	brand?: Brand | null;
	category?: Category | null;
	unit?: Unit | null;
	name: string;
	model?: string;
	serialNumber?: string;
	baseSku?: string;
	baseBarcode?: string;
	year?: number | null;
	condition?: string;
	basePrice: number;
	sellPrice: number;
	price?: number;
	cost?: number;
	currency?: string;
	description?: string;
	imageUrl?: string;
	attributes?: Record<string, any>;
	uuid?: string;
	brandName?: string;
	categoryName?: string;
	subCategoryName?: string;
	stockQty?: number;
	stockQuantity?: number;
	stockStatus?: string;
	featured?: boolean | string;
	tags?: string[];
	attributeAxes?: any[];
	variants?: any[];
	units?: any[];
	status?: string;
	isActive?: boolean;
	notes?: string;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface UpdateProductInput {
	name?: string;
	description?: string;
	brandId?: number | string | null;
	categoryId?: number | string | null;
	baseSku?: string;
	skuCode?: string;
	baseBarcode?: string;
	barcode?: string;
	imageUrl?: string;
	color?: string;
	tags?: string[];
	featured?: "NORMAL" | "FEATURED" | string;
	lowStockThreshold?: number;
	attributes?: Record<string, any>;
	price?: number;
	cost?: number;
	basePrice?: number;
	sellPrice?: number;
	discountNote?: string;
}

// ------------------------------------------------------------
// Inventory Domain
// ------------------------------------------------------------

export interface Stock {
	id: string | number;
	warehouseId: string | number;
	productId: string | number;
	warehouseName?: string;
	productName?: string;
	productCode?: string;
	quantity: number;
	reservedQuantity?: number;
	availableQuantity?: number;
	minStockAlert?: number;
	status?: string;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface StockMovement {
	id: string | number;
	warehouseId: string | number;
	productId: string | number;
	warehouseName?: string;
	productName?: string;
	movementType: "IMPORT" | "EXPORT" | "TRANSFER" | "ADJUSTMENT" | string;
	quantity: number;
	referenceNo?: string;
	notes?: string;
	performedBy?: string;
	createdAt: string;
}

export interface ImportProductItem {
	id: number | string;
	importId?: number | string;
	variant?: {
		id: number | string;
		sku?: string;
		name?: string;
	};
	variantId?: number | string;
	variantName?: string;
	sku?: string;
	imageUrl?: string;
	unitId: number | string;
	unitName: string;
	quantity: number;
	unitCost: number;
	unitPrice?: number;
	untiPrice?: number;
	totalCost: number;
}

export interface ImportProductGroup {
	id: number | string;
	name: string;
	brand?: {
		id: number | string;
		name: string;
	} | null;
	category?: {
		id: number | string;
		name: string;
	} | null;
	items: ImportProductItem[];
}

export interface InventoryImportItem {
	id?: string | number;
	importId?: string | number;
	variantId?: string | number;
	variantName?: string;
	productId?: string | number;
	productName?: string;
	sku?: string;
	imageUrl?: string;
	unitId?: string | number;
	unitName?: string;
	quantity: number;
	unitCost: number;
	untiPrice?: number;
	unitPrice?: number;
	totalCost?: number;
	brandName?: string;
	categoryName?: string;
}

export interface InventoryImport {
	id: string | number;
	referenceNo?: string;
	importNo?: string;
	supplierId?: string | number;
	supplierName?: string;
	supplierPhone?: string;
	supplier?: Supplier | null;
	warehouseId?: string | number;
	warehouseName?: string;
	importDate: string;
	note?: string;
	notes?: string;
	totalAmount: number;
	totalCost?: number;
	totalUnits?: number;
	status:
		| "COMPLETED"
		| "VERIFIED"
		| "PENDING"
		| "DRAFT"
		| "CANCELLED"
		| "IN_TRANSIT"
		| string;
	products?: ImportProductGroup[];
	items?: InventoryImportItem[];
	createdAt?: string;
	updatedAt?: string;
}

export interface CreateInventoryImportItemRequest {
	variantId: number | string;
	unitId: number | string;
	quantity: number;
	unitCost: number;
	untiPrice?: number;
	unitPrice?: number;
}

export interface CreateInventoryImportRequest {
	supplierId: number | string;
	referenceNo: string;
	note?: string;
	importDate: string;
	items: CreateInventoryImportItemRequest[];
	warehouseId?: number | string;
}

export interface SupplierReturnItemInput {
	variantId: number | string;
	unitId: number | string;
	quantity: number;
	reason?: string;
}

export interface CreateSupplierReturnRequest {
	importId?: number | string;
	referenceNo?: string;
	returnAll: boolean;
	reason: string;
	notes?: string;
	items?: SupplierReturnItemInput[];
}

export interface SupplierReturnItem {
	id: number | string;
	importItemId?: number | string;
	variantId: number | string;
	variantName?: string;
	variantSku?: string;
	quantity: number;
	unitCost: number;
	inputQuantity?: number;
	inputUnitId?: number | string;
	inputUnitName?: string;
	totalCost: number;
	reason?: string;
}

export interface SupplierReturn {
	id: number | string;
	companyId?: number | string;
	returnNumber: string;
	importId?: number | string;
	importNumber?: string;
	referenceNo?: string;
	supplierId?: number | string;
	supplierName?: string;
	warehouseId?: number | string;
	warehouseName?: string;
	returnDate: string;
	returnAll: boolean;
	reason: string;
	notes?: string | null;
	totalCost: number;
	returnedBy?: number | string;
	status?: string;
	approvedBy?: number | string | null;
	approvedAt?: string | null;
	rejectionReason?: string | null;
	items: SupplierReturnItem[];
	createdAt?: string;
	updatedAt?: string;
}

export interface DynamicInventoryItemPayload {
	variantId: number | string;
	unitId: number | string;
	quantity: number;
	unitCost?: number;
	untiPrice?: number;
	unitPrice?: number;
	productId?: number | string;
	productName?: string;
	variantName?: string;
	unitName?: string;
	sku?: string;
	imageUrl?: string;
	reason?: string;
	note?: string;
}

export interface DynamicInventorySubmitPayload {
	mode: "IMPORT" | "ADJUSTMENT" | "TRANSFER" | "STOCK_IN" | string;
	referenceNo: string;
	date: string;
	note?: string;
	supplierId?: number | string;
	warehouseId?: number | string;
	targetWarehouseId?: number | string;
	reason?: string;
	items: DynamicInventoryItemPayload[];
}

// ------------------------------------------------------------
// Sales & Orders Domain
// ------------------------------------------------------------

export type OrderStatus =
	| "DRAFT"
	| "POSTED"
	| "APPROVED"
	| "COMPLETED"
	| "REFUNDED"
	| "VOID"
	| "CANCELLED"
	| string;
export type OrderPaymentStatus =
	| "PENDING"
	| "PARTIALLY_PAID"
	| "PAID"
	| "REFUNDED"
	| "FAILED"
	| string;
export type StockVerificationStatus =
	| "NOT_YET"
	| "PARTIAL_CHECK"
	| "CHECKED_ALL"
	| string;

export interface StaffInfo {
	id: number | string;
	firstname?: string;
	lastname?: string;
	primaryPhone?: string;
	secondaryPhone?: string;
}

export interface HistoryTimeline {
	historyId: number;
	actionType: string;
	title: string;
	description: string;
	badgeText: string;
	badgeColor: string;
	actorRole: string;
	fromStatus: OrderStatus;
	toStatus: OrderStatus;
	actionByUser: string;
	timestamp: string;
}

export interface OrderHistory {
	id: number | string;
	orderId: number | string;
	actionType: string;
	title?: string;
	description?: string;
	fromStatus?: OrderStatus;
	toStatus?: OrderStatus;
	reason?: string;
	actionByUser?: string;
	snapshot?: Record<string, any>;
	changes?: Record<string, any>;
	createdAt: string;
}

export interface OrderItem {
	id?: string | number;
	orderItemId?: string | number;
	variantId?: string | number;
	unitId?: string | number;
	unitName?: string;
	productId?: string | number;
	productName?: string;
	sku?: string;
	unitPrice: number;
	originalPrice?: number;
	quantity: number;
	discount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	taxAmount?: number;
	totalAmount?: number;
	totalPrice?: number;
	isVerified?: boolean;
	verifiedQuantity?: number;
	verifiedBy?: string | number;
	verifiedAt?: string;
	availableStock?: number;
	warehouseStock?: number;
}

export interface OrderAddon {
	id?: string | number;
	variantId?: string | number;
	unitId?: string | number;
	unitName?: string;
	productName?: string;
	productId?: string | number;
	name?: string;
	description?: string;
	sku?: string;
	imageUrl?: string;
	productImageUrl?: string;
	quantity: number;
	unitPrice: number;
	discount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	taxAmount?: number;
	totalAmount?: number;
	totalPrice?: number;
	isVerified?: boolean;
	verifiedQuantity?: number;
	verifiedBy?: string | number;
	verifiedAt?: string;
	availableStock?: number;
	warehouseStock?: number;
}

export interface OrderShippingAddress {
	customerAddress?: string;
	homeInfo?: string;
}

export interface Order {
	id: string | number;
	orderNumber?: string;
	orderNo?: string;
	staffInfo?: StaffInfo | null;
	company?: Company | null;
	companyId?: string | number;
	customer?: Customer | null;
	customerId?: string | number;
	customerName?: string;
	orderDate?: string;
	subtotal?: number;
	discount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	discountAmount?: number;
	totalDiscountAmount?: number;
	taxAmount?: number;
	shippingAmount?: number;
	totalAmount: number;
	status: OrderStatus;
	paymentStatus?: OrderPaymentStatus;
	warehouseId?: string | number;
	warehouseName?: string;
	deliveryId?: string | number;
	delivery?: DeliverySummary | null;
	paymentTermId?: number | string | null;
	paymentTerm?: PaymentTerm | null;
	shippingAddress?: OrderShippingAddress | null;
	customerNote?: string;
	internalNote?: string;
	notes?: string;
	cancelledAt?: string | null;
	cancellationReason?: string | null;
	reason?: string | null;
	stockkeeperApproved?: boolean;
	stockkeeperApprovedBy?: string | number;
	stockkeeperApprovedAt?: string | null;
	saleManagerApproved?: boolean;
	saleManagerApprovedBy?: string | number;
	saleManagerApprovedAt?: string | null;
	isFullyApproved?: boolean;
	stockVerificationStatus?: StockVerificationStatus;
	verifiedItemCount?: number;
	totalItemCount?: number;
	items?: OrderItem[];
	addons?: OrderAddon[];
	addonsItems?: OrderAddon[];
	historyTimelines?: HistoryTimeline[];
	version?: number;
	createdAt: string;
	updatedAt?: string | null;
}

export interface ItemVerificationDetail {
	orderItemId: number | string;
	isVerified: boolean;
	verifiedQuantity?: number;
	adjustedQuantity?: number;
}

export interface AddonVerificationDetail {
	orderItemId?: number | string;
	orderAddonId?: number | string;
	addonId?: number | string;
	isVerified: boolean;
	verifiedQuantity?: number;
	adjustedQuantity?: number;
}

export interface VerifyOrderItemsRequest {
	isTemporarySave?: boolean;
	reason?: string;
	items?: ItemVerificationDetail[];
	addons?: AddonVerificationDetail[];
}

export interface StockCheckItem {
	variantId: number | string;
	unitId?: number | string | null;
	quantity: number;
}

export interface StockCheckRequest {
	warehouseId: number | string;
	items: StockCheckItem[];
}

export interface StockCheckItemResult {
	variantId: number | string;
	requestedQuantity: number;
	availableQuantity: number;
	isSufficient: boolean;
}

export interface StockCheckResponse {
	allAvailable: boolean;
	items: StockCheckItemResult[];
}

export interface CreateInvoiceFromOrderRequest {
	orderId: number | string;
	orderNumber?: string;
	paymentTermId?: number | string | null;
	paymentAmount?: number;
	discount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	dueDate?: string;
	billingAddress?:
		| {
				street?: string;
				city?: string;
				state?: string;
				zipCode?: string;
				country?: string;
				[key: string]: any;
		  }
		| any;
	notes?: string;
}

export type PaymentMethod =
	| "CASH"
	| "BANK_TRANSFER"
	| "CREDIT_CARD"
	| "DEBIT_CARD"
	| "CHECK"
	| "CHEQUE"
	| "MOBILE_PAYMENT"
	| "ABA_PAY"
	| "E_WALLET"
	| "OTHER"
	| string;

export type PaymentStatus =
	| "PENDING"
	| "COMPLETED"
	| "SUCCESS"
	| "FAILED"
	| "CANCELLED"
	| "REFUNDED"
	| string;

export interface PaymentTermCondition {
	id?: number | string;
	discountDays: number;
	discount: number;
	discountType?: "PERCENTAGE" | "FLAT" | string;
	discounttype?: "percentage" | "flat" | string;
	sequence?: number;
}

export interface PaymentTerm {
	id: number | string;
	name: string;
	description?: string | null;
	dueDays: number;
	discountDays?: number | null;
	discountPercentage?: number | null;
	discountPolicy?: "FINAL_SETTLEMENT" | "PROPORTIONAL" | string;
	conditions?: PaymentTermCondition[];
	isActive?: boolean;
	version?: number;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface CreatePaymentTermRequest {
	name: string;
	description?: string;
	dueDays: number;
	discountDays?: number | null;
	discountPercentage?: number | null;
	discountPolicy?: "FINAL_SETTLEMENT" | "PROPORTIONAL" | string;
	conditions?: PaymentTermCondition[];
}

export interface PaymentTermResponse extends PaymentTerm {}

export interface CreatePaymentRequest {
	customerId?: number | string;
	invoiceId?: number | string;
	amount: number;
	discountAmount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	discountReason?: string;
	paymentDate: string;
	paymentMethod: PaymentMethod;
	status?: PaymentStatus;
	referenceNumber?: string;
	reference?: string;
	bankAccount?: string;
	notes?: string;
	receivedBy?: number | string | any;
	receiptUrl?: string;
}

export interface UpdateInvoiceStatusRequest {
	status: InvoiceStatus;
	reason?: string;
}

export type InvoiceRefundMethod =
	| "CASH"
	| "BANK_TRANSFER"
	| "CUSTOMER_CREDIT"
	| "ORIGINAL_PAYMENT"
	| string;

export interface VoidInvoiceRequest {
	reason?: string;
}

export interface RefundInvoiceRequest {
	reason: string;
	refundMethod?: InvoiceRefundMethod;
	restock?: boolean;
}

export interface OrderChangeContext {
	sku?: string;
	quantity?: number | string;
	productName?: string;
	unitPrice?: number | string;
	unitName?: string;
	totalAmount?: number | string;
	[key: string]: any;
}

export interface OrderChangeLogResponse {
	id?: number | string;
	orderId?: number | string;
	orderItemId?: number | string;
	changeType?: string;
	action?: string;
	fieldName?: string;
	oldValue?: string | number | null;
	newValue?: string | number | null;
	context?: OrderChangeContext | null;
	changedBy?: number | string | null;
	changedByUsername?: string | null;
	changedByRole?: string | null;
	changedAt?: string | null;
	notes?: string | null;
	description?: string | null;
}

export interface InvoiceDiscountRequest {
	invoiceId: number | string;
	discount: number;
	discountType: "FLAT" | "PERCENTAGE" | string;
}

export interface UpdateInvoicePaymentTermRequest {
	paymentTermId: number;
	dueDate?: string | null;
}

// ------------------------------------------------------------
// Notifications Domain
// ------------------------------------------------------------

export interface AppNotification {
	id: string | number;
	title: string;
	message: string;
	type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
	referenceId?: string | number | null;
	status?: "UNREAD" | "READ" | string;
	isRead: boolean;
	body?: string;
	url?: string;
	createdAt: string;
	updatedAt?: string;
}

// ------------------------------------------------------------
// File Storage (Server + S3)
// ------------------------------------------------------------

export interface ServerFileResponse {
	id: number | string;
	fileName: string;
	originalFileName: string;
	fileKey: string;
	storageKey: string;
	url: string;
	imageUrl?: string;
	mimeType: string;
	fileType: string;
	size: number;
	storageStrategy: "LOCAL" | "S3" | string;
	createdAt?: string;
}

export interface BatchImportProductInput {
	brandId?: string | number | null;
	categoryId?: string | number | null;
	name: string;
	model?: string;
	serialNumber?: string;
	year?: number | null;
	condition?: string;
	basePrice?: number;
	sellPrice?: number;
	currency?: string;
	description?: string;
	imageUrl?: string;
	attributes?: Record<string, any>;
	status?: string;
	isActive?: boolean;
	notes?: string;
}

export interface BatchImportRequest {
	products: BatchImportProductInput[];
}

export interface BatchImportError {
	index: number;
	serialNumber?: string | null;
	reason: string;
}

export interface BatchImportResponse {
	totalRequested: number;
	successCount: number;
	failedCount: number;
	imported: Product[];
	errors: BatchImportError[];
}

// ------------------------------------------------------------
// Loans
// ------------------------------------------------------------

export interface Loan {
	id: string;
	loanKey: string;
	branchId: string | null;
	loanOfficerId: string | null;
	customerId: string;
	currency: string;
	term: string;
	interestMethod: string;
	interestRateBps: number;
	assetPrice: number;
	principal: number;
	totalInterest: number;
	deposit: number;
	status: string;
	daysInArrears: number;
	startDate: string | null;
	endDate: string | null;
	numberOfPeriods: number;
	description: string;
	approvedBy: string | null;
	approvedAt: string | null;
	disbursedAt: string | null;
	closedAt: string | null;
	notes: string;
	parentLoanId: string | null;
	items?: LoanItem[];
	createdAt: string;
	updatedAt: string | null;
}

export interface LoanSchedule {
	id: string;
	loanId: string;
	periodNumber: number;
	dueDate: string;
	principalDue: number;
	interestDue: number;
	totalDue: number;
	principalBalance: number;
	outstandingBalance: number;
	paidAmount?: number;
	paidAt?: string | null;
	status: string;
	isPenalty?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface LoanItem {
	id?: string;
	loanId?: string;
	productId?: string | null;
	productName?: string;
	productModel?: string;
	serialNumber?: string;
	condition?: string;
	unitPriceSnapshot?: number;
	totalCostSnapshot?: number;
	currency?: string;
	quantity?: number;
	attributesSnapshot?: Record<string, any>;
	createdAt?: string;
}

export interface LoanDetails {
	loan: Loan;
	customer: Customer | null;
	items: LoanItem[];
	schedules: LoanSchedule[];
	invoices?: Invoice[];
	restructuredToLoan?: Loan | null;
	parentLoan?: Loan | null;
}

export type InvoiceStatus =
	| "DRAFT"
	| "UNPAID"
	| "PARTIAL_PAYMENT"
	| "PAID"
	| "OVERDUE"
	| "CANCELLED"
	| "REFUNDED"
	| "VOID"
	| string;

export interface InvoiceItem {
	id?: number | string;
	orderItemId?: number | string;
	productName?: string;
	sku?: string;
	unitName?: string;
	quantity?: number;
	unitPrice?: number;
	discount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	taxAmount?: number;
	totalAmount?: number;
	lineDiscountAmount?: number;
	[key: string]: any;
}

export interface Invoice {
	id: string | number;
	invoiceNumber?: string;
	invoiceNo?: string;
	companyId?: string | number;
	company?: { id: number | string; name: string } | Company | null;
	order?:
		| {
				id: number | string;
				orderNumber?: string;
				orderNo?: string;
				status?: string;
		  }
		| Order
		| null;
	customer?:
		| {
				id: number | string;
				name?: string;
				phone?: string;
				phoneNumber?: string;
				contact?: string;
				email?: string;
		  }
		| Customer
		| null;
	customerId?: string | number;
	delivery?: { id: number | string; name?: string } | null;
	branchId?: string | number | null;
	categoryId?: string | number | null;
	loanId?: string | number | null;
	loanScheduleId?: string | number | null;
	paymentTerm?: PaymentTerm | null;
	paymentTermId?: string | number | null;
	subtotal?: number;
	taxAmount?: number;
	shippingAmount?: number;
	discountAmount?: number;
	totalDiscountAmount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	totalAmount: number;
	paidAmount?: number;
	paymentDiscountAmount?: number;
	remainingAmount?: number;
	grossSales?: number;
	totalCogs?: number;
	grossProfit?: number;
	grossMargin?: number;
	currency?: string;
	status: InvoiceStatus;
	issuedAt?: string | null;
	dueDate?: string | null;
	discountDeadline?: string | null;
	earlyDiscountPct?: number | null;
	paidAt?: string | null;
	creditNoteNumber?: string | null;
	refundReason?: string | null;
	refundMethod?: string | null;
	refundDate?: string | null;
	restocked?: boolean;
	attributes?: Record<string, any> | null;
	billingAddress?:
		| {
				street?: string;
				city?: string;
				state?: string;
				zipCode?: string;
				country?: string;
				[key: string]: any;
		  }
		| any;
	notes?: string;
	description?: string;
	items?: InvoiceItem[];
	version?: number;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface Payment {
	id: string | number;
	paymentNumber?: string;
	paymentRef?: string;
	companyId?: string | number;
	company?: { id: number | string; name?: string } | Company | null;
	invoice?:
		| {
				id: number | string;
				invoiceNumber?: string;
				invoiceNo?: string;
				status?: InvoiceStatus;
				totalAmount?: number;
				remainingAmount?: number;
				paymentDiscountAmount?: number;
				discountDeadline?: string | null;
				earlyDiscountPct?: number | null;
		  }
		| Invoice
		| null;
	invoiceId?: string | number | null;
	customerId?: string | number | null;
	branchId?: string | number | null;
	collectedByStaffId?: string | number | null;
	amount?: number;
	amountPaid?: number;
	discountAmount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	discountReason?: string;
	outstandingBalance?: number;
	penaltyAmount?: number;
	amountInBaseCurrency?: number;
	exchangeRateSnapshot?: number;
	paymentDate?: string;
	paymentMethod?: PaymentMethod;
	paymentCurrency?: string;
	status?: PaymentStatus;
	referenceNumber?: string;
	reference?: string;
	bankAccount?: string;
	notes?: string;
	receivedBy?: { id: number | string; name?: string } | string | null;
	receiptUrl?: string;
	reconciliationStatus?: "PENDING" | "RECONCILED" | "EXCEPTION" | string;
	reconciliationReference?: string | null;
	reconciliationNote?: string | null;
	reconciledAt?: string | null;
	reconciledBy?: {
		id: number | string;
		username?: string;
		fullName?: string;
		name?: string;
	} | null;
	version?: number;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface BulkReconcilePaymentsRequest {
	reconciliationStatus?: "PENDING" | "RECONCILED" | "EXCEPTION" | string;
	reconciliationReference?: string;
	reconciliationNote?: string;
	paymentIds?: (number | string)[];
	items?: {
		paymentId: number | string;
		reconciliationStatus?: "PENDING" | "RECONCILED" | "EXCEPTION" | string;
		reconciliationReference?: string;
		reconciliationNote?: string;
	}[];
}

export interface BulkReconcilePaymentsResponse {
	totalRequested: number;
	reconciledCount: number;
	payments: Payment[];
}

export interface PaymentByInvoiceResponse {
	invoice: Invoice;
	company?: { id: number | string; name: string };
	payments: Payment[];
}

export interface InvoicePaymentAllocation {
	invoiceId: number | string;
	amount: number;
	discountAmount?: number;
	discountType?: "FLAT" | "PERCENTAGE" | string;
	discountReason?: string | null;
}

export interface MultiInvoicePaymentItem {
	invoiceId: number | string;
	paymentAmount: number;
	earlyPaymentDiscount?: number;
	paymentMethod?: string;
	paymentReference?: string;
	notes?: string;
}

export interface MultiInvoicePaymentsPayload {
	payments: MultiInvoicePaymentItem[];
}

export interface MultiInvoicePaymentRequest {
	totalAmount?: number;
	paymentDate?: string;
	paymentMethod?:
		| "BANK_TRANSFER"
		| "CASH"
		| "ABA_PAY"
		| "CREDIT_CARD"
		| "CHECK"
		| "OTHER"
		| string;
	referenceNumber?: string;
	receiptUrl?: string;
	notes?: string;
	allocations?: InvoicePaymentAllocation[];
	payments?: MultiInvoicePaymentItem[];
}

export interface StockAdjustedBy {
	userId?: string;
	username?: string;
}

export interface StockAdjustmentItem {
	variantId?: number;
	productName?: string;
	variantName?: string;
	sku?: string;
	barcode?: string;
	thumbnail?: string;
	unitId?: number;
	unitName?: string;
	unitSymbol?: string;
	adjustmentQuantity?: number;
	adjustmentType?: "INCREASE" | "DECREASE" | string;
	reason?: string;
	notes?: string;
}

export interface StockAdjustmentAudit {
	id?: string;
	companyId?: number;
	warehouseId?: number;
	warehouseName?: string;
	adjustmentType?: "INCREASE" | "DECREASE" | "MIXED" | string;
	reason?: string;
	notes?: string;
	status?: string;
	adjustedAt?: string;
	adjustedBy?: StockAdjustedBy;
	totalItems?: number;
	totalQuantityAdjusted?: number;
	items?: StockAdjustmentItem[];

	// Legacy audit trail fields
	userId?: string;
	username?: string;
	action?: string;
	entityType?: string;
	metadata?: any;
	createdAt?: string;
}

export interface AssignCustomPermissionsRequest {
	permissions: Record<string, string[]>;
}

export interface InvoiceDetails {
	invoice: Invoice;
	loan?: Loan | null;
	customer?: Customer | null;
	payments: Payment[];
}

export interface LoanPaymentRequest {
	loanId: string;
	loanScheduleId: string;
	collectedByStaffId: string;
	categoryId: string;
	amountPaid: number;
	paymentMethod: string;
	paymentCurrency: string;
	paymentDate: string;
	notes: string;
	receiptUrl: string;
}

// ------------------------------------------------------------
// Storage & Attachments Management
// ------------------------------------------------------------

export interface Attachment {
	id: string;
	companyId: string | null;
	branchId: string | null;
	fileName: string;
	fileKey: string;
	fileUrl: string | null;
	mimeType: string | null;
	fileSize: number;
	category: string | null;
	description: string | null;
	uploadedByUserId: string | null;
	isPublic: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string | null;
}

export interface CreateAttachmentInput {
	fileName: string;
	fileKey: string;
	fileUrl?: string;
	mimeType?: string;
	fileSize: number;
	category?: string;
	description?: string;
	branchId?: number | string | null;
	isPublic?: boolean;
}

export interface UpdateAttachmentInput {
	fileName?: string;
	category?: string;
	description?: string;
	branchId?: number | string | null;
	isPublic?: boolean;
}

export interface AttachmentDownloadResponse {
	attachmentId: string | number;
	fileName: string;
	downloadUrl: string;
	expirationTimeMillis: number;
}

export interface AttachmentQueryParams {
	category?: string;
	branchId?: string | number;
	search?: string;
	page?: number;
	limit?: number;
}

// ------------------------------------------------------------
// Feedback & Evaluation Domain
// ------------------------------------------------------------

export interface AnswerOptionItem {
	answerOptionId?: number | string;
	label: string;
	scoreValue?: number;
	orderIndex?: number;
}

export type FeedbackQuestionType =
	| "SINGLE_CHOICE"
	| "MULTI_CHOICE"
	| "FREE_TEXT"
	| "RATING"
	| "MULTIPLE_CHOICE"
	| "TEXT"
	| string;

export interface FeedbackQuestion {
	questionId: number | string;
	text: string;
	questionType: FeedbackQuestionType;
	required?: boolean;
	orderIndex?: number;
	options?: AnswerOptionItem[];
	createdAt?: string;
	updatedAt?: string;
}

export interface TemplateQuestionAssignment {
	questionId: number | string;
	orderIndex: number;
	required: boolean;
	text?: string;
	questionType?: FeedbackQuestionType;
	options?: AnswerOptionItem[];
}

export interface FeedbackTemplate {
	templateId: number | string;
	name: string;
	description?: string;
	version?: number;
	status?: "PUBLISHED" | "ACTIVE" | "DRAFT" | "ARCHIVED" | string;
	createdAt?: string;
	updatedAt?: string | null;
	questions?: (TemplateQuestionAssignment | FeedbackQuestion)[];
}

export interface SelectedOptionItem {
	answerOptionId?: number | string;
	label: string;
	scoreValue?: number;
}

export interface AnswerDetailItem {
	answerId?: number | string;
	questionId: number | string;
	questionText?: string;
	questionType?: string;
	selectedOption?: SelectedOptionItem | null;
	selectedOptions?: SelectedOptionItem[] | null;
	freeTextValue?: string | null;
}

export interface FeedbackSubmission {
	submissionId: number | string;
	template?: {
		templateId: number | string;
		name: string;
	} | null;
	customerId?: number | string | null;
	userName?: string | null;
	customerName?: string | null;
	companyId?: number | string | null;
	productId?: number | string | null;
	channel?: "WEB" | "MOBILE" | "EMAIL" | "IN_PERSON" | string;
	status?: "COMPLETED" | "IN_PROGRESS" | "PENDING" | string;
	submittedAt: string;
	totalScore?: number | null;
	answers?: AnswerDetailItem[];
}

export interface SubmissionFilterParams {
	templateId?: number | string;
	customerId?: number | string;
	channel?: string;
	status?: string;
	page?: number;
	limit?: number;
	search?: string;
}

export interface FeedbackSubmissionAnswerInput {
	questionId: number | string;
	answerOptionId?: number | string | (number | string)[] | null;
	freeTextValue?: string | null;
}

export interface CreateFeedbackSubmissionRequest {
	customerId?: number | string | null;
	companyId?: number | string | null;
	answers: FeedbackSubmissionAnswerInput[];
}

export interface CreateFeedbackQuestionInput {
	text: string;
	questionType: "SINGLE_CHOICE" | "MULTI_CHOICE" | "FREE_TEXT" | string;
	options?: Array<{ label: string; scoreValue?: number; orderIndex?: number }>;
}

export interface CreateFeedbackTemplateInput {
	name: string;
	description?: string;
	questions: Array<{
		questionId: number | string;
		orderIndex: number;
		required: boolean;
	}>;
}

export interface SubmitEvaluationAnswerInput {
	questionId: number | string;
	selectedOptionId?: number | string;
	freeTextValue?: string;
}

export interface SubmitEvaluationRequest {
	customerId?: number | string;
	productId?: number | string;
	channel?: string;
	answers: SubmitEvaluationAnswerInput[];
}

// ------------------------------------------------------------
// Suppliers & Audit Logs
// ------------------------------------------------------------

export interface SupplierCompany {
	id: string | number;
	name: string;
}

export interface Supplier {
	id: string | number;
	companyId?: string | number;
	company?: SupplierCompany | null;
	name: string;
	description?: string;
	primaryPhone?: string;
	secondaryPhone?: string;
	phone?: string;
	email?: string;
	address?: string;
	status?: "Active" | "Inactive" | string;
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
}

export interface SupplierInput {
	name: string;
	description?: string;
	primaryPhone?: string;
	secondaryPhone?: string;
	phone?: string;
	status?: string;
}

// ------------------------------------------------------------
// Delivery Domain
// ------------------------------------------------------------

export interface CambodiaProvince {
	provinceCode: string;
	provinceEn: string;
	provinceKh: string;
}

export interface DeliveryCompany {
	id: string | number;
	name: string;
}

export interface Delivery {
	id: number | string;
	companyId?: number | string;
	company?: DeliveryCompany | null;
	name: string;
	code: string;
	deliveryType?:
		| "TRUCK"
		| "VAN"
		| "MOTORCYCLE"
		| "EXPRESS"
		| "CONTAINER"
		| string;
	driverName: string;
	primaryPhone: string;
	secondaryPhone?: string;
	vehicleNumber?: string;
	description?: string;
	primaryProvinceCode?: string;
	primaryProvince?: CambodiaProvince | null;
	provinceCodes?: string[];
	provinces?: CambodiaProvince[];
	status?: "Active" | "Inactive" | string;
	isActive?: boolean;
	createdAt?: string;
	updatedAt?: string | null;
	lat?: number | null;
	lng?: number | null;
}

export interface DeliveryLocationInput {
	lat: number;
	lng: number;
}

export interface DeliveryInput {
	name: string;
	code: string;
	deliveryType?: string;
	driverName: string;
	primaryPhone: string;
	secondaryPhone?: string;
	vehicleNumber?: string;
	description?: string;
	provinceCodes?: string[];
	primaryProvinceCode?: string;
	status?: string;
	lat?: number | null;
	lng?: number | null;
}

export interface AuditLog {
	id?: string | number;
	userId?: string | number;
	username?: string;
	action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | string;
	entityType?: string;
	entityName?: string;
	entityId?: string | number;
	companyId?: number;
	details?: string;
	metadata?: string | Record<string, any> | any;
	status?: "SUCCESS" | "FAILED" | string;
	executionTime?: number;
	ipAddress?: string;
	createdAt: string;
}

export interface AutocompleteEntry {
	productId: number;
	name: string;
	sku: string;
	imageUrl?: string;
	categoryName?: string;
	score: number;
}

// ------------------------------------------------------------
// Product Variant & Unit Types
// ------------------------------------------------------------

export interface AttributeValueRef {
	attributeName: string;
	valueId: number | string;
	value: string;
}

export interface VariantInventory {
	quantity: number;
	reservedQuantity: number;
	availableQuantity: number;
	availableQty?: number;
	reservedQty?: number;
	minStockAlert?: number;
	stockStatus?: string;
}

export interface UnitOperations {
	unitId: string | number;
	unitName: string;
	symbol: string;
	sellPrice: number;
	finalPrice?: number;
	basePrice?: number;
	currency: string;
	isBase: boolean;
	conversionFactor: number;
}

export interface VariantOperations {
	id: string | number;
	name: string;
	sku: string;
	barcode?: string;
	thumbnail?: string;
	isDefault: boolean;
	status: string;
	needsCompletion?: boolean;
	displayOrder?: number;
	variantAttributes?: Record<string, any>;
	attributeValues?: AttributeValueRef[];
	inventory?: VariantInventory;
	reservedQty?: number;
	stockQty?: number;
	units?: UnitOperations[];
}

export interface AttributeOption {
	valueId: string | number;
	value: string;
}

export interface AttributeAxis {
	name: string;
	options: AttributeOption[];
}

export interface UnitSummary {
	unitId: string | number;
	unitName: string;
	symbol: string;
	isBase: boolean;
}

export interface ProductDetails {
	id: string | number;
	uuid: string;
	name: string;
	imageUrl?: string;
	description?: string;
	categoryName?: string;
	subCategoryName?: string;
	tags?: string[];
	status: string;
	brandName?: string;
	stockStatus?: string;
	featured?: string;
	attributeAxes?: AttributeAxis[];
	units?: UnitSummary[];
	variants?: VariantOperations[];
	variantLookup?: Record<string, number>;
}

export interface ProductUnit {
	id: string | number;
	productId: string | number;
	unitId: string | number;
	unitName?: string;
	unitSymbol?: string;
	conversionFactor?: number;
	priceMultiplier?: number;
	isDefault?: boolean;
}

export interface VariantUnit {
	unitId: number | string;
	unitName: string;
	symbol?: string;
	isBase: boolean;
	baseUnitId?: number | string;
	baseUnitName?: string;
	baseQuantity?: number;
	basePrice?: number;
	unitPrice?: number;
	discount?: number;
	discountType?: DiscountType | string;
	discountPercentage?: number;
	finalPrice?: number;
	discountNote?: string;
	parentUnitId?: number | string;
	parentUnitName?: string;
	parentQuantity?: number;
}

export interface VariantUnitPriceInput {
	variantId: number | string;
	unitPrice: number;
	discount?: number;
	discountType?: DiscountType;
	discountNote?: string;
}

export interface ProductUnitItemInput {
	unitId: number | string;
	baseUnitId?: number | string | null;
	baseQuantity?: number;
	unitPrice: number;
	discount?: number;
	discountType?: DiscountType;
	sellable?: boolean;
	isBase?: boolean;
	discountNote?: string;
	variantPrices?: VariantUnitPriceInput[];
}

export interface ProductAddUnitsInput {
	isSamePrice: boolean;
	units: ProductUnitItemInput[];
}

// ------------------------------------------------------------
// Product Process API Specifications
// ------------------------------------------------------------

export interface ProductVariantAttributes {
	netWeight?: number;
	grossWeight?: number;
	height?: number;
	width?: number;
	depth?: number;
	volume?: string;
	[key: string]: any;
}

export interface SingleVariantProductInput {
	name: string;
	description?: string;
	brandId: number | string;
	categoryId: number | string;
	tags?: string[];
	baseSku?: string;
	baseBarcode?: string;
	imageUrl?: string;
	color?: string;
	lowStockThreshold?: number;
	unitId?: number | string;
	price: number;
	cost?: number;
	stockQty?: number;
	discountNote?: string;
	attributes?: Record<string, any>;
	variantAttributes?: ProductVariantAttributes;
}

export interface ProductAttributeValueInput {
	value: string;
	displayOrder?: number;
	hexColor?: string;
}

export interface ProductAttributeInput {
	name: string;
	displayOrder?: number;
	description?: string;
	values: ProductAttributeValueInput[];
}

export interface MultiVariantItemInput {
	attributes: Record<string, string>;
	price: number;
	cost?: number;
	stockQty?: number;
	sku: string;
	barcode?: string;
	name: string;
}

export interface MultiVariantProductInput {
	brandId: number | string;
	categoryId: number | string;
	unitId: number | string;
	name: string;
	description?: string;
	imageUrl?: string;
	baseSku: string;
	baseBarcode?: string;
	price: number;
	cost?: number;
	featured?: string;
	lowStockThreshold?: number;
	isSamePrice: boolean;
	tags?: string[];
	productAttributes?: ProductAttributeInput[];
	excludedVariants?: Record<string, string>[];
	variants?: MultiVariantItemInput[];
	discountNote?: string;
	attributes?: Record<string, any>;
}

export interface PreviewVariantInput {
	productAttributes: ProductAttributeInput[];
	baseSku: string;
	price: number;
}

export interface UpdateVariantInput {
	sku: string;
	barcode?: string;
	name: string;
	thumbnail?: string;
	variantAttributes?: ProductVariantAttributes;
	price: number;
	unitId?: number | string;
}

export interface AddVariantInput extends UpdateVariantInput {}

export interface ProductSearchFilterItem {
	field: string;
	operator:
		| "FULL_TEXT"
		| "EQUAL"
		| "IN"
		| "BETWEEN"
		| "GREATER_THAN"
		| "LESS_THAN"
		| "LIKE"
		| string;
	value?: any;
	valueTo?: any;
	values?: any[];
}

export interface ProductSearchFilterGroup {
	operator: "AND" | "OR" | string;
	filters: ProductSearchFilterItem[];
}

export interface ProductSearchSort {
	field: string;
	direction: "ASC" | "DESC";
}

export interface ProductSearchRequest {
	filterGroup?: ProductSearchFilterGroup;
	sort?: ProductSearchSort[];
	page?: number;
	size?: number;
}

// ------------------------------------------------------------
// Stock Search, Low Stock, Adjustments & Variant Movement Types
// ------------------------------------------------------------

export interface StockInventorySummary {
	baseUnit?: string;
	cost?: number;
	totalPhysicalQty?: number;
	availableQty?: number;
	reservedQty?: number;
	soldQty?: number;
	lowStockThreshold?: number;
	isLowStock?: boolean;
}

export interface StockUnitBreakdown {
	unitId: number;
	unitName: string;
	name?: string;
	symbol?: string | null;
	isBase: boolean;
	baseUnitId?: number;
	baseUnitName?: string;
	baseQuantity?: number;
	parentUnitId?: number | null;
	parentUnitName?: string | null;
	parentQuantity?: number | null;
	discountNote?: string | null;
	conversionFactor?: number;
	sellingPrice?: number;
	availableEquivalent?: number;
}

export interface StockWarehouseBreakdown {
	warehouseId: number;
	warehouseName: string;
	availableQty: number;
	reservedQty: number;
}

export interface StockVariantItem {
	variantId: number;
	variantName: string;
	sku: string;
	barcode?: string;
	stockQty?: number;
	imageUrl?: string | null;
	thumbnail?: string | null;
	image?: string | null;
	inventorySummary?: StockInventorySummary;
	unitBreakdown?: StockUnitBreakdown[];
	warehouseBreakdown?: StockWarehouseBreakdown[];
}

export interface StockProductItem {
	productId?: number;
	productUuid?: string;
	productName: string;
	name?: string;
	imageUrl?: string | null;
	thumbnail?: string | null;
	image?: string | null;
	variants: StockVariantItem[];
}

export interface StockAdjustmentItemInput {
	variantId: number;
	unitId?: number | null;
	adjustmentQuantity: number;
	reason?: string;
	AdjustmentType: "INCREASE" | "DECREASE";
	adjustmentType?: "INCREASE" | "DECREASE";
	notes?: string;
}

export interface StockAdjustmentPayload {
	reason?: string;
	notes?: string;
	items: StockAdjustmentItemInput[];
	adjustmentType?: "INCREASE" | "DECREASE";
}

export interface StockMovementVariantItem {
	id: number;
	companyId?: number;
	warehouseId?: number;
	warehouseName?: string;
	variantId: number;
	variantName?: string;
	variantSku?: string;
	movementType: string;
	referenceId?: string;
	referenceType?: string;
	quantityBefore: number;
	quantityChange: number;
	quantityAfter: number;
	avgCostBefore?: number;
	avgCostAfter?: number;
	note?: string;
	performedBy?: number;
	createdAt: string;
}

export * from "@/types/subscription";

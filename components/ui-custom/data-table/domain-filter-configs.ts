import { DomainFilterField } from "./search-filter-types";

export const PRODUCT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "category",
		label: "Category",
		type: "search-select",
		asyncEntity: "category",
		defaultOperator: "EQUAL",
		placeholder: "Select product category...",
	},
	{
		field: "brand",
		label: "Brand",
		type: "search-select",
		asyncEntity: "brand",
		defaultOperator: "EQUAL",
		placeholder: "Select brand...",
	},
	{
		field: "price",
		label: "Retail Price ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 100",
	},
	{
		field: "stock",
		label: "Stock Quantity",
		type: "number-threshold",
		defaultOperator: "GREATER_THAN_OR_EQUAL",
		placeholder: "e.g. 10",
	},
	{
		field: "stockStatus",
		label: "Stock Availability Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{
				label: "In Stock",
				value: "IN_STOCK",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Low Stock Alert",
				value: "LOW_STOCK",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "Out of Stock",
				value: "OUT_OF_STOCK",
				badgeColor: "bg-rose-500/10 text-rose-600",
			},
		],
	},
];

export const STOCK_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "category",
		label: "Category",
		type: "search-select",
		asyncEntity: "category",
		defaultOperator: "EQUAL",
		placeholder: "Select category...",
	},
	{
		field: "brand",
		label: "Brand",
		type: "search-select",
		asyncEntity: "brand",
		defaultOperator: "EQUAL",
		placeholder: "Select brand...",
	},
	{
		field: "stockStatus",
		label: "Stock Availability Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{
				label: "In Stock",
				value: "IN_STOCK",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Low Stock Alert",
				value: "LOW_STOCK",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "Out of Stock",
				value: "OUT_OF_STOCK",
				badgeColor: "bg-rose-500/10 text-rose-600",
			},
		],
	},
	{
		field: "price",
		label: "Price Range ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 100",
	},
];

export const CUSTOMER_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "gender",
		label: "Gender",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{ label: "Male", value: "MALE" },
			{ label: "Female", value: "FEMALE" },
			{ label: "Other", value: "OTHER" },
		],
	},
	{
		field: "addressCode",
		label: "Province / Region",
		type: "select",
		defaultOperator: "EQUAL",
		placeholder: "Filter by province...",
		options: [
			{ label: "Phnom Penh (12)", value: "12" },
			{ label: "Kandal (08)", value: "08" },
			{ label: "Preah Sihanouk (18)", value: "18" },
			{ label: "Siem Reap (17)", value: "17" },
			{ label: "Battambang (02)", value: "02" },
			{ label: "Kampong Cham (03)", value: "03" },
			{ label: "Kampong Speu (05)", value: "05" },
			{ label: "Kampot (07)", value: "07" },
			{ label: "Takeo (21)", value: "21" },
			{ label: "Banteay Meanchey (01)", value: "01" },
		],
	},
	{
		field: "status",
		label: "Account Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{ label: "Active", value: "ACTIVE" },
			{ label: "Inactive", value: "INACTIVE" },
		],
	},
	{
		field: "createdAt",
		label: "Registration Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const LOAN_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "status",
		label: "Loan Status",
		type: "multi-select",
		defaultOperator: "IN",
		options: [
			{ label: "Active & Current", value: "ACTIVE" },
			{ label: "Pending Approval", value: "PENDING" },
			{ label: "In Arrears / Default", value: "DEFAULTED" },
			{ label: "Closed & Paid", value: "CLOSED" },
		],
	},
	{
		field: "currency",
		label: "Loan Currency",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{ label: "USD ($)", value: "USD" },
			{ label: "KHR (៛)", value: "KHR" },
		],
	},
	{
		field: "principal",
		label: "Financed Principal ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
	},
	{
		field: "createdAt",
		label: "Origination Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const USER_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "role",
		label: "User Role",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{ label: "System Administrator", value: "ADMIN" },
			{ label: "Branch Manager", value: "MANAGER" },
			{ label: "Loan Officer", value: "LOAN_OFFICER" },
			{ label: "Cashier", value: "CASHIER" },
		],
	},
	{
		field: "active",
		label: "Account Active Status",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "createdAt",
		label: "Joined Date",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const ORDER_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "paymentStatus",
		label: "Payment Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Unpaid / Pending",
				value: "PENDING",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "Partially Paid",
				value: "PARTIALLY_PAID",
				badgeColor: "bg-blue-500/10 text-blue-600",
			},
			{
				label: "Paid in Full",
				value: "PAID",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Refunded",
				value: "REFUNDED",
				badgeColor: "bg-purple-500/10 text-purple-600",
			},
		],
	},
	{
		field: "stockVerificationStatus",
		label: "Warehouse Physical Verification",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{ label: "Not Verified Yet (0%)", value: "NOT_YET" },
			{ label: "Partial Check (>0%)", value: "PARTIAL_CHECK" },
			{ label: "Checked All (100%)", value: "CHECKED_ALL" },
		],
	},
	{
		field: "customerId",
		label: "Customer",
		type: "search-select",
		asyncEntity: "customer",
		defaultOperator: "EQUAL",
		placeholder: "Search & select customer...",
	},
	{
		field: "totalAmount",
		label: "Total Amount ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 100",
	},
	{
		field: "totalDiscountAmount",
		label: "Total Discount ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 10",
	},
	{
		field: "orderDate",
		label: "Order Date",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const WAREHOUSE_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "isDefault",
		label: "Default Depot Location",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Depot",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Inactive / Maintenance",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const DIVISION_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Division",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Archived / Inactive",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const DEPARTMENT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "divisionId",
		label: "Division Belonging",
		type: "search-select",
		asyncEntity: "division",
		defaultOperator: "EQUAL",
		placeholder: "Search and select division...",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Department",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Inactive",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const SUPPLIER_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "hasPhone",
		label: "Has Contact Phone",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Partner",
				value: "Active",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Inactive Partner",
				value: "Inactive",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Registered Date",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const BRAND_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "hasLogo",
		label: "Has Logo Asset",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Brand",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Disabled",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const CATEGORY_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "hasColor",
		label: "Has Color Highlight",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Category",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Archived",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const UNIT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "hasSymbol",
		label: "Has Unit Symbol",
		type: "boolean",
		defaultOperator: "EQUAL",
	},
	{
		field: "status",
		label: "Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Unit",
				value: "ACTIVE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Inactive",
				value: "INACTIVE",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Created Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const DELIVERY_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "deliveryType",
		label: "Delivery Type",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Truck Carrier",
				value: "TRUCK",
				badgeColor: "bg-blue-500/10 text-blue-600",
			},
			{
				label: "Express Van",
				value: "VAN",
				badgeColor: "bg-purple-500/10 text-purple-600",
			},
			{
				label: "Motorcycle Dispatch",
				value: "MOTORCYCLE",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "Container / Freight",
				value: "CONTAINER",
				badgeColor: "bg-indigo-500/10 text-indigo-600",
			},
		],
	},
	{
		field: "status",
		label: "Carrier Status",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Active Carrier",
				value: "Active",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Inactive Carrier",
				value: "Inactive",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "createdAt",
		label: "Registered Date",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const INVOICE_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "customerId",
		label: "Customer / Borrower",
		type: "search-select",
		asyncEntity: "customer",
		defaultOperator: "EQUAL",
		placeholder: "Search & select customer...",
	},
	{
		field: "totalAmount",
		label: "Invoice Amount Range ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 100",
	},
	{
		field: "createdAt",
		label: "Creation Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
];

export const IMPORT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "referenceNo",
		label: "Reference Number",
		type: "text",
		defaultOperator: "STARTS_WITH",
		placeholder: "e.g. IMP",
	},
	{
		field: "supplier",
		label: "Supplier",
		type: "search-select",
		asyncEntity: "supplier",
		defaultOperator: "IN",
		placeholder: "Select supplier...",
	},
	{
		field: "status",
		label: "Import Status",
		type: "select",
		isStatus: true,
		defaultOperator: "IN",
		options: [
			{
				label: "Completed",
				value: "COMPLETED",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Verified",
				value: "VERIFIED",
				badgeColor: "bg-blue-500/10 text-blue-600",
			},
			{
				label: "Pending",
				value: "PENDING",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "In Transit",
				value: "IN_TRANSIT",
				badgeColor: "bg-purple-500/10 text-purple-600",
			},
			{
				label: "Draft",
				value: "DRAFT",
				badgeColor: "bg-slate-500/10 text-slate-600",
			},
		],
	},
	{
		field: "importDate",
		label: "Import Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
	{
		field: "totalCost",
		label: "Total Landed Cost ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 1000",
	},
];

export const SUPPLIER_RETURN_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "returnNumber",
		label: "Return Number",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. RET-2026",
	},
	{
		field: "importNumber",
		label: "Origin Import #",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. IMP-2026",
	},
	{
		field: "supplierId",
		label: "Supplier",
		type: "search-select",
		asyncEntity: "supplier",
		defaultOperator: "EQUAL",
		placeholder: "Select supplier...",
	},
	{
		field: "returnAll",
		label: "Return Mode",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{ label: "Full Return (All items)", value: "true" },
			{ label: "Partial Return (Selected items)", value: "false" },
		],
	},
	{
		field: "status",
		label: "Return Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Completed",
				value: "COMPLETED",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Approved",
				value: "APPROVED",
				badgeColor: "bg-blue-500/10 text-blue-600",
			},
			{
				label: "Pending",
				value: "PENDING",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
			{
				label: "Rejected",
				value: "REJECTED",
				badgeColor: "bg-rose-500/10 text-rose-600",
			},
		],
	},
	{
		field: "returnDate",
		label: "Return Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
	{
		field: "totalCost",
		label: "Total Return Value ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 150",
	},
];

export const PAYMENT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "receivedBy.id",
		label: "Issued / Collected By (Sales / Staff)",
		type: "search-select",
		asyncEntity: "user",
		defaultOperator: "EQUAL",
		placeholder: "Search salesperson or staff...",
	},
	{
		field: "paymentMethod",
		label: "Payment Method",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{ label: "Bank Transfer", value: "BANK_TRANSFER" },
			{ label: "Cash", value: "CASH" },
			{ label: "Mobile Payment (ABA/Wing)", value: "MOBILE_PAYMENT" },
			{ label: "Credit Card", value: "CREDIT_CARD" },
			{ label: "Debit Card", value: "DEBIT_CARD" },
			{ label: "E-Wallet", value: "E_WALLET" },
			{ label: "Check", value: "CHECK" },
			{ label: "Other", value: "OTHER" },
		],
	},
	{
		field: "paymentDate",
		label: "Payment Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
	{
		field: "amount",
		label: "Payment Amount ($)",
		type: "number-range",
		defaultOperator: "BETWEEN",
		unitSymbol: "$",
		placeholder: "e.g. 100",
	},
	{
		field: "paymentNumber",
		label: "Payment Number",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. PAY-2026",
	},
	{
		field: "referenceNumber",
		label: "Reference / Transaction ID",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. TRX-",
	},
];

export const STOCK_ADJUSTMENT_DOMAIN_FILTERS: DomainFilterField[] = [
	{
		field: "adjustedAt",
		label: "Adjustment Date Range",
		type: "date-range",
		defaultOperator: "BETWEEN",
	},
	{
		field: "adjustedBy",
		label: "Auditor / Username",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. admin or username",
	},
	{
		field: "status",
		label: "Adjustment Status",
		type: "select",
		isStatus: true,
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Success",
				value: "SUCCESS",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Failed",
				value: "FAILED",
				badgeColor: "bg-rose-500/10 text-rose-600",
			},
		],
	},
	{
		field: "adjustmentType",
		label: "Adjustment Type",
		type: "select",
		defaultOperator: "EQUAL",
		options: [
			{
				label: "Decrease (Reduction)",
				value: "DECREASE",
				badgeColor: "bg-rose-500/10 text-rose-600",
			},
			{
				label: "Increase (Addition)",
				value: "INCREASE",
				badgeColor: "bg-emerald-500/10 text-emerald-600",
			},
			{
				label: "Mixed (Batch)",
				value: "MIXED",
				badgeColor: "bg-amber-500/10 text-amber-600",
			},
		],
	},
	{
		field: "warehouseId",
		label: "Warehouse",
		type: "search-select",
		asyncEntity: "warehouse",
		defaultOperator: "EQUAL",
		placeholder: "Select warehouse...",
	},
	{
		field: "reason",
		label: "Reason / Notes",
		type: "text",
		defaultOperator: "LIKE",
		placeholder: "e.g. Physical count variance",
	},
];


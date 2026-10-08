import { ok } from "@/lib/server/api";
import { db, paginate } from "@/lib/server/db";
import type { AuditLog } from "@/lib/types";

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
	{
		id: "log-101",
		userId: "1",
		username: "bronx",
		action: "CREATE",
		entityType: "ORDER",
		entityName: "POS Order #ORD-8821",
		entityId: "ORD-8821",
		companyId: 115,
		details: "Created new POS order #ORD-8821 with 4 items totaling $150.00",
		status: "SUCCESS",
		executionTime: 24,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
	},
	{
		id: "log-102",
		userId: "1",
		username: "bronx",
		action: "UPDATE",
		entityType: "ORDER",
		entityName: "Order #ORD-8820",
		entityId: "ORD-8820",
		companyId: 115,
		details: "Updated delivery status to SHIPPED for order #ORD-8820",
		status: "SUCCESS",
		executionTime: 18,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
	},
	{
		id: "log-103",
		userId: "1",
		username: "bronx",
		action: "CREATE",
		entityType: "INVOICE",
		entityName: "Invoice #INV-2026-009",
		entityId: "INV-2026-009",
		companyId: 115,
		details: "Generated invoice for Customer Phnom Penh Mart ($420.00)",
		status: "SUCCESS",
		executionTime: 32,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
	},
	{
		id: "log-104",
		userId: "1",
		username: "bronx",
		action: "PAYMENT",
		entityType: "PAYMENT",
		entityName: "ABA KHQR Payment #PAY-5510",
		entityId: "PAY-5510",
		companyId: 115,
		details: "Processed KHQR instant payment verification of $150.00",
		status: "SUCCESS",
		executionTime: 45,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
	},
	{
		id: "log-105",
		userId: "1",
		username: "bronx",
		action: "UPDATE",
		entityType: "CUSTOMER",
		entityName: "Customer Siem Reap Superstore",
		entityId: "CUST-402",
		companyId: 115,
		details: "Updated primary phone and assigned delivery route",
		status: "SUCCESS",
		executionTime: 12,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
	},
	{
		id: "log-106",
		userId: "1",
		username: "bronx",
		action: "CREATE",
		entityType: "PRODUCT",
		entityName: "Product Organic Espresso Beans 1kg",
		entityId: "PROD-901",
		companyId: 115,
		details: "Registered new product item with barcode 885002100412",
		status: "SUCCESS",
		executionTime: 29,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
	},
	{
		id: "log-107",
		userId: "1",
		username: "bronx",
		action: "DELIVERY",
		entityType: "DELIVERY",
		entityName: "Shipment #DEL-302",
		entityId: "DEL-302",
		companyId: 115,
		details: "Dispatched driver Sok Dara for express route delivery",
		status: "SUCCESS",
		executionTime: 15,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 700).toISOString(),
	},
	{
		id: "log-108",
		userId: "1",
		username: "bronx",
		action: "UPDATE",
		entityType: "WAREHOUSE",
		entityName: "Central Warehouse PH",
		entityId: "WH-01",
		companyId: 115,
		details: "Adjusted stock location shelf B-14 storage capacity",
		status: "SUCCESS",
		executionTime: 10,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
	},
	{
		id: "log-109",
		userId: "1",
		username: "bronx",
		action: "CREATE",
		entityType: "BRAND",
		entityName: "Brand Amazonia Coffee",
		entityId: "BRD-12",
		companyId: 115,
		details: "Added brand partner entry under Beverage division",
		status: "SUCCESS",
		executionTime: 14,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 1800).toISOString(),
	},
	{
		id: "log-110",
		userId: "1",
		username: "bronx",
		action: "UPDATE",
		entityType: "CATEGORY",
		entityName: "Category Dairy & Creamers",
		entityId: "CAT-05",
		companyId: 115,
		details: "Updated catalog display order and tax rate overrides",
		status: "SUCCESS",
		executionTime: 16,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 2400).toISOString(),
	},
	{
		id: "log-111",
		userId: "1",
		username: "bronx",
		action: "CUSTOMER_VISIT",
		entityType: "CUSTOMER_VISIT",
		entityName: "Visit Check-in #VIS-891",
		entityId: "VIS-891",
		companyId: 115,
		details: "Logged GPS visit verification at Angkor Mart",
		status: "SUCCESS",
		executionTime: 22,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 3000).toISOString(),
	},
	{
		id: "log-112",
		userId: "1",
		username: "bronx",
		action: "IMPORT",
		entityType: "IMPORT",
		entityName: "Bulk Import #IMP-104",
		entityId: "IMP-104",
		companyId: 115,
		details: "Imported 120 inventory stock items via CSV file upload",
		status: "SUCCESS",
		executionTime: 180,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 3600).toISOString(),
	},
	{
		id: "log-113",
		userId: "1",
		username: "bronx",
		action: "UPDATE",
		entityType: "USER",
		entityName: "User Profile @bronx",
		entityId: "USR-01",
		companyId: 115,
		details: "Updated profile preferences and notifications setting",
		status: "SUCCESS",
		executionTime: 11,
		ipAddress: "192.168.1.45",
		createdAt: new Date(Date.now() - 1000 * 60 * 4200).toISOString(),
	},
];

export async function POST(req: Request) {
	let body: any = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	const page = typeof body.page === "number" ? body.page : 0;
	const size = typeof body.size === "number" ? body.size : 20;

	let logs: AuditLog[] =
		Array.isArray((db as any).auditLogs) && (db as any).auditLogs.length > 0
			? (db as any).auditLogs
			: DEFAULT_AUDIT_LOGS;

	// Parse filterGroup.filters
	if (body.filterGroup && Array.isArray(body.filterGroup.filters)) {
		const filters = body.filterGroup.filters;

		// username filter
		const userFilter = filters.find((f: any) => f.field === "username");
		if (userFilter && userFilter.value) {
			const targetUser = String(userFilter.value).toLowerCase();
			logs = logs.filter(
				(l) =>
					String(l.username || "").toLowerCase() === targetUser ||
					String(l.userId || "").toLowerCase() === targetUser,
			);
		}

		// entityType filter
		const entityTypeFilter = filters.find((f: any) => f.field === "entityType");
		if (entityTypeFilter && entityTypeFilter.value) {
			const targetType = String(entityTypeFilter.value).toUpperCase();
			logs = logs.filter(
				(l) => String(l.entityType || "").toUpperCase() === targetType,
			);
		}
	}

	// Sort by createdAt DESC
	logs = [...logs].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);

	const pageOneBased = page + 1;
	const result = paginate(logs, { page: pageOneBased, limit: size });

	return ok({
		content: result.items,
		totalElements: result.total,
		totalPages: result.totalPages,
		pageNumber: page,
		pageSize: result.limit,
		items: result.items,
		total: result.total,
		page: pageOneBased,
		limit: result.limit,
	});
}

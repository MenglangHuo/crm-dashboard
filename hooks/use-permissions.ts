"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/endpoints";
import {
	extractAllAuthorities,
	isUserAdmin,
	isUserSale,
	checkHasPermission,
	checkCan,
	checkCanAny,
	checkCanAll,
	normalizePermissionKey,
	PermissionResource,
	PermissionAction,
	type PermissionCheckItem,
} from "@/lib/auth-permissions";

export {
	PermissionResource,
	PermissionAction,
	type PermissionCheckItem,
};

const emptySubscribe = () => () => {};

export function usePermissions() {
	const isMounted = useSyncExternalStore(
		emptySubscribe,
		() => true,
		() => false,
	);

	const {
		data: userProfile,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 5 * 60 * 1000,
	});

	const authorities = useMemo(() => {
		if (!isMounted) return new Set<string>();
		return extractAllAuthorities(userProfile);
	}, [isMounted, userProfile]);

	const isAdmin = useMemo(() => {
		if (!isMounted) return false;
		return isUserAdmin(authorities);
	}, [isMounted, authorities]);

	const isSale = useMemo(() => {
		if (!isMounted) return false;
		return isUserSale(userProfile, authorities);
	}, [isMounted, userProfile, authorities]);

	// ------------------------------------------------------------
	// Declarative Permission Checkers
	// ------------------------------------------------------------
	const can = (resource: string, action?: string): boolean => {
		if (!isMounted) return false;
		return checkCan(authorities, resource, action);
	};

	const canAny = (
		permissions: Array<PermissionCheckItem>,
	): boolean => {
		if (!isMounted) return false;
		return checkCanAny(authorities, permissions);
	};

	const canAll = (
		permissions: Array<PermissionCheckItem>,
	): boolean => {
		if (!isMounted) return false;
		return checkCanAll(authorities, permissions);
	};

	// Backwards-compatible aliases
	const hasPermission = can;
	const hasAnyPermission = (perms: string[]): boolean => canAny(perms);
	const hasAllPermissions = (perms: string[]): boolean => canAll(perms);

	const hasRole = (roleName: string): boolean => {
		if (!isMounted) return false;
		if (isAdmin) return true;
		const norm = normalizePermissionKey(roleName);
		const normRole = normalizePermissionKey(`ROLE_${roleName}`);
		return (
			authorities.has(norm) ||
			authorities.has(normRole) ||
			authorities.has(roleName.toUpperCase()) ||
			authorities.has(`ROLE_${roleName.toUpperCase()}`)
		);
	};

	// ------------------------------------------------------------
	// Dashboard & Reports Capabilities
	// ------------------------------------------------------------
	const canViewDashboard =
		isAdmin || can("DASHBOARD", "READ") || can("DASHBOARD");
	const canExportDashboard =
		isAdmin || can("DASHBOARD", "EXPORT") || can("REPORT", "EXPORT");
	const canViewReports =
		isAdmin ||
		can("REPORT", "READ") ||
		can("REPORT") ||
		can("DASHBOARD", "READ");
	const canExportReports =
		isAdmin || can("REPORT", "EXPORT") || can("DASHBOARD", "EXPORT");

	// ------------------------------------------------------------
	// Users, Roles & Permissions Capabilities
	// ------------------------------------------------------------
	const canViewUsers =
		isAdmin || can("USER", "READ") || can("USER");
	const canManageUsers =
		isAdmin ||
		can("USER", "WRITE") ||
		can("USER", "CREATE") ||
		can("USER", "UPDATE") ||
		can("USER", "DELETE") ||
		can("USER", "MANAGE");
	const canViewRoles =
		isAdmin || can("ROLE", "READ") || can("ROLE");
	const canManageRoles =
		isAdmin ||
		can("ROLE", "WRITE") ||
		can("ROLE", "CREATE") ||
		can("ROLE", "UPDATE") ||
		can("ROLE", "DELETE") ||
		can("ROLE", "MANAGE");
	const canViewPermissions =
		isAdmin || can("PERMISSION", "READ") || can("PERMISSION");

	// ------------------------------------------------------------
	// Catalog & Inventory Capabilities
	// ------------------------------------------------------------
	const canViewProducts =
		isAdmin || can("PRODUCT", "READ") || can("PRODUCT");
	const canManageProducts =
		isAdmin ||
		can("PRODUCT", "WRITE") ||
		can("PRODUCT", "CREATE") ||
		can("PRODUCT", "UPDATE") ||
		can("PRODUCT", "DELETE") ||
		can("PRODUCT", "MANAGE");
	const canViewStock =
		isAdmin || can("STOCK", "READ") || can("STOCK");
	const canManageStock =
		isAdmin ||
		can("STOCK", "APPROVE") ||
		can("STOCK", "WRITE") ||
		can("STOCK", "UPDATE") ||
		can("STOCK", "CREATE") ||
		can("STOCK", "MANAGE");
	const canManageImports =
		isAdmin ||
		can("IMPORT", "CREATE") ||
		can("IMPORT", "APPROVE") ||
		can("IMPORT", "WRITE") ||
		can("IMPORT", "MANAGE");
	const canViewImports =
		isAdmin || can("IMPORT", "READ") || can("IMPORT");

	// ------------------------------------------------------------
	// Customers & CRM Capabilities
	// ------------------------------------------------------------
	const canViewCustomers =
		isAdmin || can("CUSTOMER", "READ") || can("CUSTOMER");
	const canManageCustomers =
		isAdmin ||
		can("CUSTOMER", "WRITE") ||
		can("CUSTOMER", "CREATE") ||
		can("CUSTOMER", "UPDATE") ||
		can("CUSTOMER", "DELETE") ||
		can("CUSTOMER", "MANAGE");
	const canViewFeedback =
		isAdmin ||
		can("FEEDBACK", "READ") ||
		can("FEEDBACK") ||
		can("CUSTOMER", "READ") ||
		can("DASHBOARD", "READ");

	// ------------------------------------------------------------
	// Granular Order Capabilities
	// ------------------------------------------------------------
	const canCreateOrder =
		isAdmin ||
		can("ORDER", "CREATE") ||
		can("ORDER", "WRITE");
	const canUpdateOrder =
		isAdmin ||
		can("ORDER", "UPDATE") ||
		can("ORDER", "WRITE") ||
		can("ORDER", "CREATE");
	const canPostOrder =
		isAdmin ||
		can("ORDER", "POSTED") ||
		can("ORDER", "CREATE");
	const canUnpostOrder =
		!isSale &&
		(isAdmin ||
			can("ORDER", "UNPOST") ||
			can("ORDER", "APPROVE_SALE"));
	const canVerifyStock =
		!isSale && (isAdmin || can("ORDER", "APPROVE_STOCK"));
	const canApproveSale =
		!isSale && (isAdmin || can("ORDER", "APPROVE_SALE"));
	const canApproveSpecial =
		!isSale && (isAdmin || can("ORDER", "APPROVE_SPECIAL"));
	const canUnapproveOrder =
		!isSale &&
		(isAdmin ||
			can("ORDER", "UNAPPROVE") ||
			can("ORDER", "APPROVE_SALE"));
	const canRejectOrder =
		!isSale && (isAdmin || can("ORDER", "REJECT"));
	const canVoidOrder =
		isAdmin ||
		can("ORDER", "VOID") ||
		can("ORDER", "CREATE");
	const canRefundOrder =
		!isSale && (isAdmin || can("ORDER", "REFUND"));

	// ------------------------------------------------------------
	// Finance & Payments Capabilities
	// ------------------------------------------------------------
	const canIssueInvoice =
		isAdmin ||
		can("INVOICE", "CREATE") ||
		can("INVOICE", "WRITE");
	const canApproveInvoice = isAdmin || can("INVOICE", "APPROVE");
	const canRejectInvoice = isAdmin || can("INVOICE", "REJECT");
	const canRefundInvoice =
		isAdmin ||
		can("INVOICE", "REFUNDED") ||
		can("INVOICE", "REFUND");
	const canViewInvoices =
		isAdmin ||
		can("INVOICE", "READ") ||
		can("INVOICE") ||
		canIssueInvoice;

	const canCreatePayment =
		isAdmin ||
		can("PAYMENT", "CREATE") ||
		can("PAYMENT", "WRITE");
	const canApprovePayment = isAdmin || can("PAYMENT", "APPROVE");
	const canViewPayments =
		isAdmin ||
		can("PAYMENT", "READ") ||
		can("PAYMENT") ||
		canCreatePayment;

	// ------------------------------------------------------------
	// Other Domain Capabilities
	// ------------------------------------------------------------
	const canViewOrders =
		isAdmin ||
		can("ORDER", "READ") ||
		can("ORDER") ||
		canCreateOrder ||
		canVerifyStock ||
		canApproveSale ||
		canIssueInvoice;
	const canViewSuppliers =
		isAdmin || can("SUPPLIER", "READ") || can("SUPPLIER");
	const canViewDepartments =
		isAdmin ||
		can("DEPARTMENT", "READ") ||
		can("DEPARTMENT");
	const canViewDeliveries =
		isAdmin ||
		can("DELIVERY", "READ") ||
		can("LOCATION", "READ") ||
		can("CUSTOMER", "READ");
	const canViewConfigurations =
		isAdmin || can("COMPANY", "READ") || can("COMPANY");
	const canViewSubscriptions =
		isAdmin || can("SUBSCRIPTION", "READ") || can("COMPANY", "READ");

	return {
		isMounted,
		userProfile,
		authorities,
		isLoading,
		error,
		isAdmin,
		isSale,
		// Declarative checkers
		can,
		canAny,
		canAll,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		hasRole,
		// Dashboard & Reports
		canViewDashboard,
		canExportDashboard,
		canViewReports,
		canExportReports,
		// Users & Roles
		canViewUsers,
		canManageUsers,
		canViewRoles,
		canManageRoles,
		canViewPermissions,
		// Catalog & Inventory
		canViewProducts,
		canManageProducts,
		canViewStock,
		canManageStock,
		canManageImports,
		canViewImports,
		// Customers & CRM
		canViewCustomers,
		canManageCustomers,
		canViewFeedback,
		// Orders
		canCreateOrder,
		canUpdateOrder,
		canPostOrder,
		canUnpostOrder,
		canVerifyStock,
		canApproveSale,
		canApproveSpecial,
		canUnapproveOrder,
		canRejectOrder,
		canVoidOrder,
		canRefundOrder,
		// Finance & Invoices
		canViewInvoices,
		canIssueInvoice,
		canApproveInvoice,
		canRejectInvoice,
		canRefundInvoice,
		canViewPayments,
		canCreatePayment,
		canApprovePayment,
		// Domain Viewing
		canViewOrders,
		canViewSuppliers,
		canViewDepartments,
		canViewDeliveries,
		canViewConfigurations,
		canViewSubscriptions,
	};
}

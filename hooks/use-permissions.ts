"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/endpoints";
import {
	extractAllAuthorities,
	isUserAdmin,
	isUserSale,
	checkHasPermission,
	normalizePermissionKey,
} from "@/lib/auth-permissions";

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

	const hasPermission = (resource: string, action?: string): boolean => {
		if (!isMounted) return false;
		return checkHasPermission(authorities, resource, action);
	};

	const hasAnyPermission = (perms: string[]): boolean => {
		if (!isMounted) return false;
		if (isAdmin) return true;
		return perms.some((p) => {
			if (p.includes(":") || p.includes(".")) {
				const sep = p.includes(":") ? ":" : ".";
				const [res, act] = p.split(sep);
				return checkHasPermission(authorities, res, act);
			}
			return checkHasPermission(authorities, p);
		});
	};

	const hasAllPermissions = (perms: string[]): boolean => {
		if (!isMounted) return false;
		if (isAdmin) return true;
		return perms.every((p) => {
			if (p.includes(":") || p.includes(".")) {
				const sep = p.includes(":") ? ":" : ".";
				const [res, act] = p.split(sep);
				return checkHasPermission(authorities, res, act);
			}
			return checkHasPermission(authorities, p);
		});
	};

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
	// Granular Order Capabilities
	// ------------------------------------------------------------
	const canCreateOrder =
		isAdmin ||
		hasPermission("ORDER", "CREATE") ||
		hasPermission("ORDER", "WRITE");
	const canUpdateOrder =
		isAdmin ||
		hasPermission("ORDER", "UPDATE") ||
		hasPermission("ORDER", "WRITE") ||
		hasPermission("ORDER", "CREATE");
	const canPostOrder =
		isAdmin ||
		hasPermission("ORDER", "POSTED") ||
		hasPermission("ORDER", "CREATE");
	const canUnpostOrder =
		!isSale &&
		(isAdmin ||
			hasPermission("ORDER", "UNPOST") ||
			hasPermission("ORDER", "APPROVE_SALE"));
	const canVerifyStock =
		!isSale && (isAdmin || hasPermission("ORDER", "APPROVE_STOCK"));
	const canApproveSale =
		!isSale && (isAdmin || hasPermission("ORDER", "APPROVE_SALE"));
	const canApproveSpecial =
		!isSale && (isAdmin || hasPermission("ORDER", "APPROVE_SPECIAL"));
	const canUnapproveOrder =
		!isSale &&
		(isAdmin ||
			hasPermission("ORDER", "UNAPPROVE") ||
			hasPermission("ORDER", "APPROVE_SALE"));
	const canRejectOrder =
		!isSale && (isAdmin || hasPermission("ORDER", "REJECT"));
	const canVoidOrder =
		isAdmin ||
		hasPermission("ORDER", "VOID") ||
		hasPermission("ORDER", "CREATE");
	const canRefundOrder =
		!isSale && (isAdmin || hasPermission("ORDER", "REFUND"));

	// ------------------------------------------------------------
	// Granular Invoicing & Payment Capabilities
	// ------------------------------------------------------------
	const canIssueInvoice =
		isAdmin ||
		hasPermission("INVOICE", "CREATE") ||
		hasPermission("INVOICE", "WRITE");
	const canApproveInvoice = isAdmin || hasPermission("INVOICE", "APPROVE");
	const canRejectInvoice = isAdmin || hasPermission("INVOICE", "REJECT");
	const canRefundInvoice =
		isAdmin ||
		hasPermission("INVOICE", "REFUNDED") ||
		hasPermission("INVOICE", "REFUND");
	const canCreatePayment =
		isAdmin ||
		hasPermission("PAYMENT", "CREATE") ||
		hasPermission("PAYMENT", "WRITE");
	const canApprovePayment = isAdmin || hasPermission("PAYMENT", "APPROVE");

	// ------------------------------------------------------------
	// Inventory & Stock Capabilities
	// ------------------------------------------------------------
	const canManageStock =
		isAdmin ||
		hasPermission("STOCK", "APPROVE") ||
		hasPermission("STOCK", "WRITE") ||
		hasPermission("STOCK", "UPDATE");
	const canViewStock =
		isAdmin || hasPermission("STOCK", "READ") || hasPermission("STOCK");
	const canManageImports =
		isAdmin ||
		hasPermission("IMPORT", "CREATE") ||
		hasPermission("IMPORT", "APPROVE") ||
		hasPermission("IMPORT", "WRITE");
	const canViewImports =
		isAdmin || hasPermission("IMPORT", "READ") || hasPermission("IMPORT");

	// ------------------------------------------------------------
	// Domain Viewing Capabilities
	// ------------------------------------------------------------
	const canViewOrders =
		isAdmin ||
		hasPermission("ORDER", "READ") ||
		hasPermission("ORDER") ||
		canCreateOrder ||
		canVerifyStock ||
		canApproveSale ||
		canIssueInvoice;
	const canViewInvoices =
		isAdmin ||
		hasPermission("INVOICE", "READ") ||
		hasPermission("INVOICE") ||
		canIssueInvoice;
	const canViewProducts =
		isAdmin || hasPermission("PRODUCT", "READ") || hasPermission("PRODUCT");
	const canViewCustomers =
		isAdmin || hasPermission("CUSTOMER", "READ") || hasPermission("CUSTOMER");
	const canViewSuppliers =
		isAdmin || hasPermission("SUPPLIER", "READ") || hasPermission("SUPPLIER");
	const canViewDepartments =
		isAdmin ||
		hasPermission("DEPARTMENT", "READ") ||
		hasPermission("DEPARTMENT");
	const canViewDeliveries =
		isAdmin ||
		hasPermission("LOCATION", "READ") ||
		hasPermission("CUSTOMER", "READ");
	const canViewFeedback =
		isAdmin ||
		hasPermission("CUSTOMER", "READ") ||
		hasPermission("DASHBOARD", "READ");
	const canViewUsers =
		isAdmin || hasPermission("USER", "READ") || hasPermission("USER");
	const canViewRoles =
		isAdmin || hasPermission("ROLE", "READ") || hasPermission("ROLE");
	const canViewPermissions =
		isAdmin ||
		hasPermission("PERMISSION", "READ") ||
		hasPermission("PERMISSION");
	const canViewConfigurations =
		isAdmin || hasPermission("COMPANY", "READ") || hasPermission("COMPANY");
	const canViewSubscriptions = isAdmin || hasPermission("COMPANY", "READ");

	return {
		isMounted,
		userProfile,
		authorities,
		isLoading,
		error,
		isAdmin,
		isSale,
		hasPermission,
		hasAnyPermission,
		hasAllPermissions,
		hasRole,
		// Order capabilities
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
		// Invoice capabilities
		canIssueInvoice,
		canApproveInvoice,
		canRejectInvoice,
		canRefundInvoice,
		canCreatePayment,
		canApprovePayment,
		// Stock capabilities
		canManageStock,
		canViewStock,
		canManageImports,
		canViewImports,
		// Navigation / View capabilities
		canViewOrders,
		canViewInvoices,
		canViewProducts,
		canViewCustomers,
		canViewSuppliers,
		canViewDepartments,
		canViewDeliveries,
		canViewFeedback,
		canViewUsers,
		canViewRoles,
		canViewPermissions,
		canViewConfigurations,
		canViewSubscriptions,
	};
}

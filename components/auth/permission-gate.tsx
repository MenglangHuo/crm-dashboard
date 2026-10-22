"use client";

import React, { ReactNode } from "react";
import {
	usePermissions,
	type PermissionCheckItem,
} from "@/hooks/use-permissions";

export interface PermissionGateProps {
	/**
	 * Resource to check (e.g. "ORDER", "USER", "ROLE", "PRODUCT")
	 */
	resource?: string;
	/**
	 * Action to check on the resource (e.g. "CREATE", "READ", "UPDATE", "DELETE", "EXPORT")
	 */
	action?: string;
	/**
	 * Direct single permission string (e.g. "ORDER:CREATE" or "users.read")
	 */
	permission?: string;
	/**
	 * Array of permissions where ANY match grants access
	 */
	anyPermissions?: Array<PermissionCheckItem>;
	/**
	 * Array of permissions where ALL must match to grant access
	 */
	allPermissions?: Array<PermissionCheckItem>;
	/**
	 * Optional fallback node rendered when access is denied or before client hydration
	 */
	fallback?: ReactNode;
	/**
	 * Permitted content
	 */
	children: ReactNode;
}

/**
 * Reusable UI Permission Gate component.
 * Conditionally renders children only when the authenticated user possesses the required permissions.
 * Safe against hydration mismatches by returning fallback/null before mount.
 */
export function PermissionGate({
	resource,
	action,
	permission,
	anyPermissions,
	allPermissions,
	fallback = null,
	children,
}: PermissionGateProps) {
	const { isMounted, can, canAny, canAll, isAdmin } = usePermissions();

	// Guard against hydration mismatch: render fallback or null until client-side hydration completes
	if (!isMounted) {
		return <>{fallback}</>;
	}

	// Platform administrators bypass business permission checks
	if (isAdmin) {
		return <>{children}</>;
	}

	let allowed = true;

	if (permission) {
		allowed = allowed && can(permission);
	}

	if (resource) {
		allowed = allowed && can(resource, action);
	}

	if (anyPermissions && anyPermissions.length > 0) {
		allowed = allowed && canAny(anyPermissions);
	}

	if (allPermissions && allPermissions.length > 0) {
		allowed = allowed && canAll(allPermissions);
	}

	if (!allowed) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}

export default PermissionGate;

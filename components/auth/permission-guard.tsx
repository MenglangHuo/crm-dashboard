"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import {
	usePermissions,
	type PermissionCheckItem,
} from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export interface PermissionGuardProps {
	/**
	 * Resource to check (e.g. "USER", "ROLE", "PRODUCT", "STOCK")
	 */
	resource?: string;
	/**
	 * Action to check on resource (defaults to "READ")
	 */
	action?: string;
	/**
	 * Direct single permission string (e.g. "ORDER:READ" or "users.read")
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
	 * Optional custom fallback component when access is denied
	 */
	fallback?: ReactNode;
	/**
	 * Optional custom title for the 403 Access Denied view
	 */
	title?: string;
	/**
	 * Optional custom description for the 403 Access Denied view
	 */
	description?: string;
	/**
	 * Whether to show the "Back to Dashboard" button (default true)
	 */
	showBackButton?: boolean;
	/**
	 * Child components rendered when permission is verified
	 */
	children: ReactNode;
}

/**
 * Page-level permission guard.
 * Protects pages from unauthorized access, rendering an elegant 403 Access Denied
 * screen when the current user lacks required permissions.
 * Guarantees zero hydration mismatches and clean loading states.
 */
export function PermissionGuard({
	resource,
	action = "READ",
	permission,
	anyPermissions,
	allPermissions,
	fallback,
	title,
	description,
	showBackButton = true,
	children,
}: PermissionGuardProps) {
	const { t } = useTranslation();
	const {
		isMounted,
		isLoading,
		userProfile,
		isAdmin,
		can,
		canAny,
		canAll,
	} = usePermissions();

	// Guard against hydration mismatch or initial unpopulated state:
	// Render graceful loading state before mounting or while fetching the user's profile
	if (!isMounted || (isLoading && !userProfile)) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[420px] w-full p-8 space-y-4">
				<div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse">
					<Lock className="size-6 text-slate-400 dark:text-slate-500" />
				</div>
				<div className="space-y-2 text-center max-w-sm w-full">
					<Skeleton className="h-4 w-3/4 mx-auto" />
					<Skeleton className="h-3 w-1/2 mx-auto" />
				</div>
			</div>
		);
	}

	// Platform administrators bypass all business permission checks
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

	if (allowed) {
		return <>{children}</>;
	}

	// Custom fallback if provided
	if (fallback) {
		return <>{fallback}</>;
	}

	// Format required permission code for clarity
	const requiredCode =
		permission ||
		(resource ? `${resource.toUpperCase()}:${(action || "READ").toUpperCase()}` : null) ||
		(anyPermissions && anyPermissions.length > 0
			? anyPermissions
					.map((p) =>
						typeof p === "string"
							? p
							: `${p.resource.toUpperCase()}:${(p.action || "READ").toUpperCase()}`,
					)
					.join(" | ")
			: null);

	// Elegant 403 "Access Denied" state
	return (
		<div className="flex min-h-[460px] w-full flex-col items-center justify-center p-6 text-center animate-in fade-in-50 duration-200">
			<div className="relative mx-auto flex max-w-md flex-col items-center rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-10">
				{/* 403 Icon Badge with Glow Accent */}
				<div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-8 ring-rose-500/5 dark:bg-rose-500/20 dark:text-rose-400 dark:ring-rose-500/10">
					<ShieldAlert className="size-8 stroke-[2.2]" />
				</div>

				<Badge
					variant="outline"
					className="mb-3 rounded-full border-rose-200/80 bg-rose-50 px-3 py-0.5 text-[10px] font-bold tracking-wider text-rose-700 uppercase dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
				>
					403 — {t("auth.restrictedAccess", "Restricted Access")}
				</Badge>

				<h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
					{title || t("auth.accessDenied", "Access Denied")}
				</h2>

				<p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
					{description ||
						t(
							"auth.accessDeniedDescription",
							"You do not possess the necessary permissions to access this page. If you require access, please reach out to your system administrator.",
						)}
				</p>

				{requiredCode && (
					<div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950/50">
						<span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
							{t("auth.requiredPermission", "Required")}:{" "}
							<span className="font-bold text-slate-700 dark:text-slate-300">
								{requiredCode}
							</span>
						</span>
					</div>
				)}

				{showBackButton && (
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
						<Button
							render={<Link href="/" />}
							variant="default"
							size="sm"
							className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
						>
							<LayoutDashboard className="size-3.5" />
							<span>{t("common.backToDashboard", "Back to Dashboard")}</span>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export default PermissionGuard;

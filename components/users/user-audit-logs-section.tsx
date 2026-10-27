"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	Activity,
	AlertCircle,
	Building2,
	Calendar,
	Check,
	CheckCircle2,
	ChevronRight,
	Clock,
	Copy,
	CreditCard,
	Download,
	Edit3,
	Eye,
	FileCode,
	FileText,
	Filter,
	FolderTree,
	GitCommit,
	Globe,
	Info,
	Layers,
	List,
	MapPin,
	Package,
	Phone,
	PlusCircle,
	RefreshCw,
	RotateCcw,
	Scale,
	Search,
	ShieldCheck,
	ShoppingCart,
	Tag,
	Trash2,
	Truck,
	User as UserIcon,
	UserCog,
	Users,
	Warehouse,
	X,
	Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui-custom/data-table";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";
import { auditLogsApi, profileApi } from "@/lib/api/endpoints";
import type { AuditLog } from "@/lib/types";

export interface UserAuditLogsSectionProps {
	username?: string;
	userDisplayName?: string;
	hideActionTab?: boolean;
	isDrawerMode?: boolean;
}

export const AUDIT_ENTITY_TYPES = [
	{ value: "ALL", label: "All Logs", icon: Activity },
	{ value: "ORDER", label: "Orders", icon: ShoppingCart },
	{ value: "INVOICE", label: "Invoices", icon: FileText },
	{ value: "PAYMENT", label: "Payments", icon: CreditCard },
	{ value: "CUSTOMER", label: "Customers", icon: Users },
	{ value: "PRODUCT", label: "Products", icon: Package },
	{ value: "DELIVERY", label: "Deliveries", icon: Truck },
	{ value: "WAREHOUSE", label: "Warehouses", icon: Warehouse },
	{ value: "COMPANY", label: "Companies", icon: Building2 },
	{ value: "BRAND", label: "Brands", icon: Tag },
	{ value: "CATEGORY", label: "Categories", icon: FolderTree },
	{ value: "CUSTOMER_VISIT", label: "Visits", icon: MapPin },
	{ value: "DEPARTMENT", label: "Departments", icon: Layers },
	{ value: "IMPORT", label: "Imports", icon: Download },
	{ value: "SHOP_CONTACT", label: "Contacts", icon: Phone },
	{ value: "UNIT", label: "Units", icon: Scale },
	{ value: "USER", label: "Users", icon: UserCog },
] as const;

export const AUDIT_ACTIONS = [
	{ value: "ALL", label: "All Actions" },
	{ value: "CREATE", label: "Creates" },
	{ value: "UPDATE", label: "Updates" },
	{ value: "DELETE", label: "Deletes" },
	{ value: "PAYMENT", label: "Payments" },
	{ value: "RESTORE", label: "Restores" },
] as const;

/**
 * Format relative time string
 */
function getRelativeTimeString(dateInput?: string | Date): string {
	if (!dateInput) return "—";
	const date = new Date(dateInput);
	if (isNaN(date.getTime())) return "—";
	const now = new Date();
	const diffInSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
	if (diffInSeconds < 45) return "Just now";
	const diffInMinutes = Math.round(diffInSeconds / 60);
	if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
	const diffInHours = Math.round(diffInMinutes / 60);
	if (diffInHours < 24) return `${diffInHours}h ago`;
	const diffInDays = Math.round(diffInHours / 24);
	if (diffInDays < 7) return `${diffInDays}d ago`;
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Color-coded action badge component
 */
function ActionBadge({ action }: { action?: string }) {
	const act = String(action || "UPDATE").toUpperCase();
	if (
		act.includes("CREATE") ||
		act.includes("ADD") ||
		act.includes("REGISTER") ||
		act.includes("NEW")
	) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80 shadow-2xs">
				<PlusCircle className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
				{act}
			</span>
		);
	}
	if (
		act.includes("DELETE") ||
		act.includes("REMOVE") ||
		act.includes("CANCEL") ||
		act.includes("VOID")
	) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/80 shadow-2xs">
				<Trash2 className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
				{act}
			</span>
		);
	}
	if (
		act.includes("RESTORE") ||
		act.includes("RECOVER") ||
		act.includes("REFUND")
	) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200/90 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 shadow-2xs">
				<RotateCcw className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
				{act}
			</span>
		);
	}
	if (act.includes("PAYMENT") || act.includes("INVOICE")) {
		return (
			<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-200/90 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/80 shadow-2xs">
				<CreditCard className="size-3 shrink-0 text-purple-600 dark:text-purple-400" />
				{act}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80 shadow-2xs">
			<Edit3 className="size-3 shrink-0 text-blue-600 dark:text-blue-400" />
			{act}
		</span>
	);
}

/**
 * Entity Type badge with dedicated icon
 */
function EntityTypeBadge({
	entityType,
	entityId,
}: {
	entityType?: string;
	entityId?: string | number;
}) {
	const rawType = String(entityType || "SYSTEM").toUpperCase();
	const matched = AUDIT_ENTITY_TYPES.find(
		(t) => t.value.toUpperCase() === rawType,
	);
	const IconComp = matched?.icon || Activity;

	return (
		<div className="inline-flex items-center gap-1.5 flex-wrap">
			<span className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
				<IconComp className="size-3.5" />
			</span>
			<span className="font-bold text-xs text-foreground tracking-tight">
				{rawType}
			</span>
			{entityId != null && String(entityId).trim() !== "" && (
				<span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700/80">
					#{String(entityId)}
				</span>
			)}
		</div>
	);
}

/**
 * Clean username avatar & chip
 */
function UsernameBadge({
	username,
	fallbackUser,
}: {
	username?: string;
	fallbackUser?: string;
}) {
	const user = username || fallbackUser || "system";
	return (
		<div className="inline-flex items-center gap-1.5 min-w-0">
			<div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-extrabold uppercase shrink-0 ring-1 ring-primary/20">
				{user.slice(0, 2)}
			</div>
			<span className="font-mono text-xs font-semibold text-foreground truncate">
				@{user}
			</span>
		</div>
	);
}

/**
 * Formatted Date & Time Badge
 */
function DateBadge({ createdAt }: { createdAt?: string }) {
	if (!createdAt) {
		return <span className="text-xs text-muted-foreground font-mono">—</span>;
	}
	const d = new Date(createdAt);
	if (isNaN(d.getTime())) {
		return <span className="text-xs text-muted-foreground font-mono">—</span>;
	}

	const dateStr = d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const timeStr = d.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
	});

	return (
		<div className="flex flex-col text-xs font-mono leading-tight">
			<span className="font-semibold text-foreground flex items-center gap-1">
				<Calendar className="size-3 text-slate-400 shrink-0" />
				{dateStr}
			</span>
			<span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
				<Clock className="size-2.5 text-slate-400 shrink-0" />
				{timeStr}
			</span>
		</div>
	);
}

/**
 * Export loaded audit logs to a downloadable CSV
 */
function exportAuditLogsToCsv(logs: AuditLog[], username?: string) {
	if (!logs || logs.length === 0) {
		toast.error("No activity records available to export");
		return;
	}
	const headers = [
		"ID",
		"Timestamp",
		"Action",
		"Entity Type",
		"Entity ID",
		"Username",
		"Status",
		"IP Address",
		"Execution Time (ms)",
		"Details",
	];
	const rows = logs.map((log) => [
		log.id || "",
		log.createdAt || "",
		log.action || "",
		log.entityType || "",
		log.entityId || "",
		log.username || username || "",
		log.status || "SUCCESS",
		log.ipAddress || "",
		log.executionTime != null ? String(log.executionTime) : "",
		`"${String(log.details || "").replace(/"/g, '""')}"`,
	]);
	const csvContent =
		"data:text/csv;charset=utf-8," +
		[headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
	const encodedUri = encodeURI(csvContent);
	const link = document.createElement("a");
	link.setAttribute("href", encodedUri);
	link.setAttribute(
		"download",
		`audit-trail-${username || "user"}-${new Date().toISOString().slice(0, 10)}.csv`,
	);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	toast.success("Audit trail exported successfully!");
}

export function UserAuditLogsSection({
	username,
	userDisplayName,
	hideActionTab = false,
	isDrawerMode = true,
}: UserAuditLogsSectionProps) {
	const [activeTab, setActiveTab] = useState<string>("ALL");
	const [actionFilter, setActionFilter] = useState<string>("ALL");
	const [viewMode, setViewMode] = useState<"table" | "timeline">(
		isDrawerMode ? "timeline" : "table",
	);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const [page, setPage] = useState<number>(1);
	const [pageSize, setPageSize] = useState<number>(10);

	// Fetch current user /me if username not explicitly provided
	const { data: meProfile } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 5 * 60 * 1000,
	});

	const targetUsername = username || meProfile?.username || "";
	const displayUserName =
		userDisplayName ||
		(meProfile?.firstName
			? `${meProfile.firstName} ${meProfile.lastName || ""}`.trim()
			: "") ||
		(targetUsername ? `@${targetUsername}` : "");

	// Construct request payload according to backend spec
	const requestPayload = useMemo(() => {
		const filters: Array<{ field: string; operator: string; value: string }> =
			[];

		if (activeTab && activeTab !== "ALL") {
			filters.push({
				field: "entityType",
				operator: "EQUAL",
				value: activeTab,
			});
		}

		if (targetUsername) {
			filters.push({
				field: "username",
				operator: "EQUAL",
				value: targetUsername,
			});
		}

		return {
			page: Math.max(0, page - 1),
			size: pageSize,
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			filterGroup: {
				operator: "AND",
				filters: filters,
			},
		};
	}, [activeTab, targetUsername, page, pageSize]);

	// Fetch Audit Logs using TanStack Query
	const {
		data: pagedResult,
		isLoading,
		isRefetching,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["user-audit-logs", targetUsername, activeTab, page, pageSize],
		queryFn: () => auditLogsApi.search(requestPayload),
		enabled: Boolean(targetUsername),
	});

	const rawLogs: AuditLog[] = Array.isArray(pagedResult?.items)
		? pagedResult.items
		: Array.isArray(pagedResult)
			? (pagedResult as any)
			: [];
	const totalCount =
		typeof pagedResult?.total === "number"
			? pagedResult.total
			: rawLogs.length;

	// Client-side action filtering and search on the current page records
	const displayedLogs = useMemo(() => {
		let list = rawLogs;
		if (actionFilter !== "ALL") {
			list = list.filter((l) =>
				String(l.action || "")
					.toUpperCase()
					.includes(actionFilter),
			);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(l) =>
					String(l.action || "")
						.toLowerCase()
						.includes(q) ||
					String(l.entityType || "")
						.toLowerCase()
						.includes(q) ||
					String(l.entityId || "")
						.toLowerCase()
						.includes(q) ||
					String(l.details || "")
						.toLowerCase()
						.includes(q) ||
					String(l.ipAddress || "")
						.toLowerCase()
						.includes(q),
			);
		}
		return list;
	}, [rawLogs, actionFilter, searchQuery]);

	// Quick action counts on current page
	const actionCounts = useMemo(() => {
		const counts = { CREATE: 0, UPDATE: 0, DELETE: 0, OTHER: 0 };
		rawLogs.forEach((l) => {
			const act = String(l.action || "").toUpperCase();
			if (act.includes("CREATE") || act.includes("ADD")) counts.CREATE++;
			else if (act.includes("DELETE") || act.includes("REMOVE"))
				counts.DELETE++;
			else if (act.includes("UPDATE") || act.includes("EDIT"))
				counts.UPDATE++;
			else counts.OTHER++;
		});
		return counts;
	}, [rawLogs]);

	const copyToClipboard = useCallback((text: string, key: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		toast.success("Copied to clipboard");
		setTimeout(() => setCopiedKey(null), 2000);
	}, []);

	// Table columns with Details / Inspect button
	const columns: ColumnDef<AuditLog>[] = useMemo(
		() => [
			{
				id: "action",
				header: "Action",
				headerIcon: <Zap className="size-3.5 text-primary" />,
				accessorKey: "action",
				sortable: true,
				width: "140px",
				minWidth: 120,
				cell: ({ value }) => <ActionBadge action={value} />,
				searchFn: (row, q) =>
					String(row.action || "")
						.toLowerCase()
						.includes(q),
			},
			{
				id: "entityType",
				header: "Target Entity",
				headerIcon: <Layers className="size-3.5 text-primary" />,
				accessorKey: "entityType",
				sortable: true,
				width: "220px",
				minWidth: 160,
				cell: ({ value, row }) => (
					<EntityTypeBadge
						entityType={value}
						entityId={row.entityId}
					/>
				),
				searchFn: (row, q) =>
					String(row.entityType || "")
						.toLowerCase()
						.includes(q) ||
					String(row.entityId || "")
						.toLowerCase()
						.includes(q),
			},
			{
				id: "username",
				header: "Operator",
				headerIcon: <UserIcon className="size-3.5 text-primary" />,
				accessorKey: "username",
				sortable: true,
				width: "180px",
				minWidth: 130,
				cell: ({ value }) => (
					<UsernameBadge
						username={value}
						fallbackUser={targetUsername}
					/>
				),
				searchFn: (row, q) =>
					String(row.username || targetUsername || "")
						.toLowerCase()
						.includes(q),
			},
			{
				id: "createdAt",
				header: "Date & Time",
				headerIcon: <Calendar className="size-3.5 text-primary" />,
				accessorKey: "createdAt",
				sortable: true,
				width: "200px",
				minWidth: 160,
				sortFn: (a, b, direction) => {
					const timeA = new Date(a.createdAt || 0).getTime();
					const timeB = new Date(b.createdAt || 0).getTime();
					return direction === "asc" ? timeA - timeB : timeB - timeA;
				},
				cell: ({ value }) => <DateBadge createdAt={value} />,
				searchFn: (row, q) =>
					String(row.createdAt || "")
						.toLowerCase()
						.includes(q),
			},
			{
				id: "inspect",
				header: "Details",
				width: "90px",
				minWidth: 80,
				cell: ({ row }) => (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							setSelectedLog(row);
						}}
						className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg gap-1"
						title="Inspect event details"
					>
						<Eye className="size-3.5" />
						<span>View</span>
					</Button>
				),
			},
		],
		[targetUsername],
	);

	return (
		<div className="space-y-5">
			{/* 1. Header Bar: Identity, View Mode Switcher & Quick Actions */}
			{isDrawerMode ? (
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
					<div className="flex items-center gap-2 flex-wrap min-w-0">
						{targetUsername && (
							<Badge
								variant="outline"
								className="font-mono text-xs font-bold bg-blue-50/80 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 py-1 px-2.5 rounded-lg"
							>
								@{targetUsername}
							</Badge>
						)}
						<Badge
							variant="outline"
							className="text-xs font-semibold border-emerald-200/90 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 py-1 px-2.5 rounded-lg"
						>
							<ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
							Immutable Trail
						</Badge>
						<span className="text-xs text-slate-400 hidden sm:inline">•</span>
						<span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
							{totalCount} total events
						</span>
					</div>

					<div className="flex items-center gap-2 flex-wrap shrink-0">
						{/* View Mode Switcher */}
						<div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/50 shadow-2xs">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									viewMode === "table"
										? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
								title="Switch to structured table view"
							>
								<List className="size-3.5" />
								<span>Table</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("timeline")}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									viewMode === "timeline"
										? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
								title="Switch to visual chronological timeline"
							>
								<GitCommit className="size-3.5" />
								<span>Timeline</span>
							</button>
						</div>

						{/* Export CSV */}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => exportAuditLogsToCsv(displayedLogs, targetUsername)}
							disabled={displayedLogs.length === 0}
							className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
						>
							<Download className="size-3.5 text-slate-500" />
							<span>Export CSV</span>
						</Button>

						{/* Refresh */}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading || isRefetching}
							className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
						>
							<RefreshCw
								className={`size-3.5 text-blue-600 dark:text-blue-400 ${isLoading || isRefetching ? "animate-spin" : ""}`}
							/>
							<span>Refresh</span>
						</Button>
					</div>
				</div>
			) : (
				/* Non-drawer (standalone / full tab) Hero Banner */
				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 dark:from-slate-900/90 dark:via-indigo-950/20 dark:to-slate-900/80 border border-blue-200/60 dark:border-slate-800 shadow-xs">
					<div className="flex items-center gap-3.5 min-w-0">
						<div className="p-3 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
							<Activity className="size-5" />
						</div>
						<div className="min-w-0 space-y-1">
							<div className="flex items-center gap-2 flex-wrap">
								<h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
									Audit Logs & Activity Trail
								</h3>
								{targetUsername && (
									<Badge
										variant="outline"
										className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
									>
										@{targetUsername}
									</Badge>
								)}
								<Badge
									variant="outline"
									className="text-[10px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1"
								>
									<ShieldCheck className="size-3" /> Immutable Trail
								</Badge>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 truncate">
								Enterprise audit compliance record for{" "}
								<span className="font-semibold text-slate-700 dark:text-slate-200">
									{displayUserName || `@${targetUsername}`}
								</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
						<div className="inline-flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/50 shadow-2xs">
							<button
								type="button"
								onClick={() => setViewMode("table")}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									viewMode === "table"
										? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
								title="Switch to structured table view"
							>
								<List className="size-3.5" />
								<span>Table</span>
							</button>
							<button
								type="button"
								onClick={() => setViewMode("timeline")}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									viewMode === "timeline"
										? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
										: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
								}`}
								title="Switch to visual chronological timeline"
							>
								<GitCommit className="size-3.5" />
								<span>Timeline</span>
							</button>
						</div>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => exportAuditLogsToCsv(displayedLogs, targetUsername)}
							disabled={displayedLogs.length === 0}
							className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
						>
							<Download className="size-3.5 text-slate-500" />
							<span>Export CSV</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading || isRefetching}
							className="h-8.5 text-xs font-semibold rounded-xl gap-1.5 border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
						>
							<RefreshCw
								className={`size-3.5 text-blue-600 dark:text-blue-400 ${isLoading || isRefetching ? "animate-spin" : ""}`}
							/>
							<span>Refresh</span>
						</Button>
					</div>
				</div>
			)}

			{/* 2. Top Metric Cards (Overview Snapshot) */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="p-3.5 rounded-2xl border border-blue-200/60 dark:border-blue-900/30 bg-gradient-to-br from-blue-50/60 via-white to-white dark:from-blue-950/20 dark:via-slate-900/60 dark:to-slate-900/40 shadow-2xs hover:shadow-xs transition-shadow">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Total Recorded
						</span>
						<div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
							<Activity className="size-3.5" />
						</div>
					</div>
					<p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
						{totalCount.toLocaleString()}
					</p>
					<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Historical events</p>
				</div>

				<div className="p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:from-emerald-950/20 dark:via-slate-900/60 dark:to-slate-900/40 shadow-2xs hover:shadow-xs transition-shadow">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Page Creates
						</span>
						<div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
							<PlusCircle className="size-3.5" />
						</div>
					</div>
					<p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
						{actionCounts.CREATE}
					</p>
					<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">New resources added</p>
				</div>

				<div className="p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/60 via-white to-white dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-slate-900/40 shadow-2xs hover:shadow-xs transition-shadow">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Page Updates
						</span>
						<div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
							<Edit3 className="size-3.5" />
						</div>
					</div>
					<p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5 tracking-tight">
						{actionCounts.UPDATE}
					</p>
					<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Modifications saved</p>
				</div>

				<div className="p-3.5 rounded-2xl border border-purple-200/60 dark:border-purple-900/30 bg-gradient-to-br from-purple-50/60 via-white to-white dark:from-purple-950/20 dark:via-slate-900/60 dark:to-slate-900/40 shadow-2xs hover:shadow-xs transition-shadow">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Active Category
						</span>
						<div className="p-1.5 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
							<Layers className="size-3.5" />
						</div>
					</div>
					<p
						className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1.5 truncate"
						title={AUDIT_ENTITY_TYPES.find((t) => t.value === activeTab)?.label || "All Logs"}
					>
						{AUDIT_ENTITY_TYPES.find((t) => t.value === activeTab)?.label || "All Logs"}
					</p>
					<p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
						{displayedLogs.length} on current page
					</p>
				</div>
			</div>

			{/* 3. Entity Type Filter Pills (Scrollable) */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
						<Layers className="size-3.5 text-blue-600 dark:text-blue-400" /> Filter by Entity Type
					</span>
					{activeTab !== "ALL" && (
						<button
							type="button"
							onClick={() => {
								setActiveTab("ALL");
								setPage(1);
							}}
							className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
						>
							<RotateCcw className="size-3" /> Reset Filter
						</button>
					)}
				</div>

				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					{AUDIT_ENTITY_TYPES.map((type) => {
						const IconComp = type.icon;
						const isActive = activeTab === type.value;
						return (
							<button
								key={type.value}
								type="button"
								onClick={() => {
									setActiveTab(type.value);
									setPage(1);
								}}
								className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none border shrink-0 ${
									isActive
										? "bg-blue-600 text-white border-blue-600 shadow-xs scale-[1.02]"
										: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-slate-800/80"
								}`}
							>
								<IconComp
									className={`size-3.5 ${isActive ? "text-white" : "text-blue-600 dark:text-blue-400"}`}
								/>
								<span>{type.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 4. Action Filter & Local Search Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
				{/* Action Filter Pills (Omitted when hideActionTab is true) */}
				{!hideActionTab ? (
					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-wrap">
						<span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
							<Filter className="size-3 text-slate-400" /> Action:
						</span>
						{AUDIT_ACTIONS.map((act) => {
							const isSelected = actionFilter === act.value;
							return (
								<button
									key={act.value}
									type="button"
									onClick={() => setActionFilter(act.value)}
									className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
										isSelected
											? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-bold"
											: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
									}`}
								>
									{act.label}
								</button>
							);
						})}
					</div>
				) : (
					<div className="text-xs text-slate-500 font-medium">
						Showing latest compliance activities
					</div>
				)}

				{/* Instant Search Box */}
				<div className="relative w-full sm:w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search on page..."
						className="w-full h-8.5 pl-8 pr-7 text-xs rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
			</div>

			{/* 5. Error Banner if query failed */}
			{isError && (
				<div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between gap-3 text-xs">
					<div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
						<AlertCircle className="size-4 shrink-0" />
						<span>
							{(error as any)?.message ||
								"Failed to fetch audit history from backend server."}
						</span>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						className="h-7 text-xs rounded-lg gap-1 border-rose-300 dark:border-rose-800"
					>
						<RefreshCw className="size-3 text-rose-500" /> Retry
					</Button>
				</div>
			)}

			{/* 6. Main View: Table Mode or Timeline Stream Mode */}
			{viewMode === "table" ? (
				<DataTable<AuditLog>
					data={displayedLogs}
					columns={columns}
					getRowId={(row, index) =>
						String(
							row.id ||
								`audit-log-${row.username || targetUsername || "user"}-${row.createdAt || ""}-${row.action || ""}-${row.entityType || ""}-${index}`,
						)
					}
					title="Activity Records"
					titleIcon={<Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
					manualPagination={true}
					totalCount={totalCount}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={(newSize) => {
						setPageSize(newSize);
						setPage(1);
					}}
					pageSizeOptions={[10, 20, 50, 100]}
					isLoading={isLoading || isRefetching}
					onRefresh={() => refetch()}
					selectable={false}
					searchable={false}
					density="compact"
					emptyStateTitle="No Audit Records Found"
					emptyStateDescription={
						activeTab !== "ALL"
							? `No audit logs match entity type "${activeTab}" for user @${targetUsername}.`
							: `No audit logs found for user @${targetUsername}.`
					}
				/>
			) : (
				/* Visual Chronological Timeline Mode */
				<div className="p-5 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60 shadow-xs space-y-6">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
						<div className="flex items-center gap-2">
							<GitCommit className="size-4 text-blue-600 dark:text-blue-400" />
							<h4 className="text-sm font-bold text-slate-900 dark:text-white">
								Chronological Activity Stream
							</h4>
						</div>
						<span className="text-xs text-slate-400">
							Showing {displayedLogs.length} events
						</span>
					</div>

					{displayedLogs.length > 0 ? (
						<div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
							{displayedLogs.map((log, idx) => {
								const act = String(log.action || "UPDATE").toUpperCase();
								const isCreate =
									act.includes("CREATE") || act.includes("ADD");
								const isDelete =
									act.includes("DELETE") || act.includes("REMOVE");
								const isRestore = act.includes("RESTORE");
								const isPayment =
									act.includes("PAYMENT") || act.includes("INVOICE");

								const nodeColor = isCreate
									? "bg-emerald-500 ring-emerald-100 dark:ring-emerald-950 text-white"
									: isDelete
										? "bg-rose-500 ring-rose-100 dark:ring-rose-950 text-white"
										: isRestore
											? "bg-amber-500 ring-amber-100 dark:ring-amber-950 text-white"
											: isPayment
												? "bg-purple-500 ring-purple-100 dark:ring-purple-950 text-white"
												: "bg-blue-500 ring-blue-100 dark:ring-blue-950 text-white";

								return (
									<div
										key={
											log.id ||
											`timeline-${log.createdAt}-${log.action}-${idx}`
										}
										className="relative group"
									>
										{/* Timeline Node Dot */}
										<div
											className={`absolute -left-6 sm:-left-8 top-1.5 size-6 rounded-full flex items-center justify-center ring-4 transition-transform group-hover:scale-110 shadow-sm ${nodeColor}`}
										>
											{isCreate ? (
												<PlusCircle className="size-3.5" />
											) : isDelete ? (
												<Trash2 className="size-3.5" />
											) : isRestore ? (
												<RotateCcw className="size-3.5" />
											) : isPayment ? (
												<CreditCard className="size-3.5" />
											) : (
												<Edit3 className="size-3.5" />
											)}
										</div>

										{/* Event Card */}
										<div
											onClick={() => setSelectedLog(log)}
											className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 transition-all cursor-pointer shadow-2xs hover:shadow-xs space-y-2.5"
										>
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
												<div className="flex items-center gap-2 flex-wrap">
													<ActionBadge action={log.action} />
													<EntityTypeBadge
														entityType={log.entityType}
														entityId={log.entityId}
													/>
												</div>
												<div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
													<span className="font-semibold text-slate-700 dark:text-slate-300">
														{getRelativeTimeString(log.createdAt)}
													</span>
													<span>•</span>
													<span className="font-mono text-[11px]">
														{new Date(log.createdAt).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
															second: "2-digit",
														})}
													</span>
												</div>
											</div>

											{log.details && (
												<p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
													{log.details}
												</p>
											)}

											<div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-400">
												<div className="flex items-center gap-3">
													<span className="flex items-center gap-1 font-mono">
														<UserIcon className="size-3 text-slate-400" />
														@{log.username || targetUsername || "system"}
													</span>
													{log.ipAddress && (
														<span className="flex items-center gap-1 font-mono">
															<Globe className="size-3 text-slate-400" />
															{log.ipAddress}
														</span>
													)}
												</div>
												<span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:underline flex items-center gap-0.5">
													Inspect Details <ChevronRight className="size-3" />
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="py-12 text-center text-slate-400 space-y-2">
							<Activity className="size-8 mx-auto opacity-40 text-slate-400" />
							<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
								No activity events to display
							</p>
							<p className="text-[11px] text-slate-400">
								Adjust your filters or query terms to view historical events.
							</p>
						</div>
					)}
				</div>
			)}

			{/* 7. Slide-Over Event Details Drawer (Sheet) */}
			<Sheet
				open={Boolean(selectedLog)}
				onOpenChange={(open) => !open && setSelectedLog(null)}
			>
				<SheetContent
					side="right"
					className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[60]"
				>
					{selectedLog && (
						<>
							<SheetHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
								<div className="flex items-center justify-between pr-8">
									<div className="flex items-center gap-2">
										<ActionBadge action={selectedLog.action} />
										<Badge
											variant="outline"
											className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold"
										>
											{selectedLog.status || "SUCCESS"}
										</Badge>
									</div>
								</div>
								<SheetTitle className="text-base font-bold text-slate-900 dark:text-white mt-2">
									Audit Event Inspection
								</SheetTitle>
								<SheetDescription className="text-xs text-slate-500">
									Record ID: #{selectedLog.id || "N/A"} •{" "}
									{new Date(selectedLog.createdAt).toLocaleString()}
								</SheetDescription>
							</SheetHeader>

							<div className="flex-1 overflow-y-auto p-5 space-y-5">
								{/* Summary Card */}
								<div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
									<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
										Event Summary
									</p>
									<p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
										{selectedLog.details ||
											`${selectedLog.action} executed on ${selectedLog.entityType || "resource"} #${selectedLog.entityId || "N/A"}`}
									</p>
								</div>

								{/* Entity & Execution Grid */}
								<div className="grid grid-cols-2 gap-3 text-xs">
									<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Entity Type
										</span>
										<p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
											<Layers className="size-3.5 text-blue-500" />
											{selectedLog.entityType || "SYSTEM"}
										</p>
									</div>

									<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Entity ID
										</span>
										<p className="font-mono font-bold text-slate-900 dark:text-white">
											{selectedLog.entityId != null
												? `#${selectedLog.entityId}`
												: "—"}
										</p>
									</div>

									<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Operator
										</span>
										<p className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
											<UserIcon className="size-3.5 text-slate-400 shrink-0" />
											@{selectedLog.username || targetUsername || "system"}
										</p>
									</div>

									<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
										<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Client IP Address
										</span>
										<p className="font-mono text-slate-700 dark:text-slate-300 truncate">
											{selectedLog.ipAddress || "127.0.0.1 (Internal)"}
										</p>
									</div>
								</div>

								{/* Timestamps */}
								<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2 text-xs">
									<div className="flex items-center justify-between">
										<span className="text-slate-400 font-medium">Local Time:</span>
										<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
											{new Date(selectedLog.createdAt).toLocaleString()}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-400 font-medium">ISO UTC:</span>
										<span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
											{new Date(selectedLog.createdAt).toISOString()}
										</span>
									</div>
									{selectedLog.executionTime != null && (
										<div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
											<span className="text-slate-400 font-medium">Duration:</span>
											<span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
												{selectedLog.executionTime} ms
											</span>
										</div>
									)}
								</div>

								{/* Metadata / Changes Payload (JSON format if available) */}
								{selectedLog.metadata && (
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
												<FileCode className="size-3.5 text-blue-500" /> Payload / Metadata
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													copyToClipboard(
														typeof selectedLog.metadata === "object"
															? JSON.stringify(selectedLog.metadata, null, 2)
															: String(selectedLog.metadata),
														"metadata",
													)
												}
												className="h-6 text-[10px] font-semibold gap-1 px-2"
											>
												{copiedKey === "metadata" ? (
													<Check className="size-3 text-emerald-500" />
												) : (
													<Copy className="size-3" />
												)}
												<span>Copy JSON</span>
											</Button>
										</div>
										<pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed scrollbar-thin border border-slate-800">
											{typeof selectedLog.metadata === "object"
												? JSON.stringify(selectedLog.metadata, null, 2)
												: selectedLog.metadata}
										</pre>
									</div>
								)}

								{/* Enterprise Verification Note */}
								<div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
									<p className="font-bold flex items-center gap-1.5">
										<ShieldCheck className="size-3.5 text-blue-600 dark:text-blue-400" /> Verified Audit Record
									</p>
									<p className="text-[10.5px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
										This record was securely committed to the CRM immutable audit log with cryptographic integrity.
									</p>
								</div>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

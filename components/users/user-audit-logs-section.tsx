"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui-custom/data-table";
import { auditLogsApi, profileApi } from "@/lib/api/endpoints";
import type { AuditLog } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	AlertCircle,
	Building2,
	Calendar,
	Clock,
	CreditCard,
	Download,
	Edit3,
	FileText,
	FolderTree,
	Layers,
	MapPin,
	Package,
	Phone,
	PlusCircle,
	RefreshCw,
	RotateCcw,
	Scale,
	ShoppingCart,
	Tag,
	Trash2,
	Truck,
	User as UserIcon,
	UserCog,
	Users,
	Warehouse,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

export interface UserAuditLogsSectionProps {
	username?: string;
	userDisplayName?: string;
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
				<span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700/70">
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
 * Formatted Date & Time
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

export function UserAuditLogsSection({
	username,
	userDisplayName,
}: UserAuditLogsSectionProps) {
	const [activeTab, setActiveTab] = useState<string>("ALL");
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

	// Table columns: 4 key columns requested (Action, Type, Username, Date) - no Details column & no modal
	const columns: ColumnDef<AuditLog>[] = useMemo(
		() => [
			{
				id: "action",
				header: "Actions",
				headerIcon: <Zap className="size-3.5 text-primary" />,
				accessorKey: "action",
				sortable: true,
				width: "160px",
				minWidth: 130,
				cell: ({ value }) => <ActionBadge action={value} />,
				searchFn: (row, q) =>
					String(row.action || "")
						.toLowerCase()
						.includes(q),
			},
			{
				id: "entityType",
				header: "Type",
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
				header: "Username",
				headerIcon: <UserIcon className="size-3.5 text-primary" />,
				accessorKey: "username",
				sortable: true,
				width: "200px",
				minWidth: 140,
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
				width: "220px",
				minWidth: 180,
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
		],
		[targetUsername],
	);

	return (
		<div className="space-y-4">
			{/* 1. Header Bar: Profile context & refresh button */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-slate-50 to-primary/5 dark:from-primary/20 dark:via-slate-900 dark:to-primary/10 border border-primary/20 dark:border-primary/30 shadow-2xs">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm shrink-0">
						<Activity className="size-4.5" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h4 className="font-bold text-sm text-foreground">
								Audit Logs & Activity Trail
							</h4>
							{targetUsername && (
								<Badge
									variant="outline"
									className="font-mono text-[10px] font-bold bg-primary/10 text-primary border-primary/30"
								>
									@{targetUsername}
								</Badge>
							)}
						</div>
						<p className="text-xs text-muted-foreground truncate">
							Tracking system activity and operations for{" "}
							<span className="font-medium text-foreground">
								{displayUserName || `@${targetUsername}`}
							</span>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isLoading || isRefetching}
						className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs"
					>
						<RefreshCw
							className={`size-3.5 text-primary ${isLoading || isRefetching ? "animate-spin" : ""}`}
						/>
						Refresh
					</Button>
				</div>
			</div>

			{/* 2. Entity Type Filter Tabs (Scrollable pill bar) */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
						<Layers className="size-3 text-primary" /> Filter by Type
					</span>
					{activeTab !== "ALL" && (
						<button
							type="button"
							onClick={() => {
								setActiveTab("ALL");
								setPage(1);
							}}
							className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
						>
							Reset to All Types
						</button>
					)}
				</div>

				<div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-primary/20 dark:scrollbar-thumb-slate-800">
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
										? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
										: "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5"
								}`}
							>
								<IconComp
									className={`size-3.5 ${isActive ? "text-primary-foreground" : "text-primary"}`}
								/>
								<span>{type.label}</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 3. Error Banner if query failed */}
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

			{/* 4. Custom Table with Filtering, Sorting, Resizing, and Pagination */}
			<DataTable<AuditLog>
				data={rawLogs}
				columns={columns}
				getRowId={(row, index) =>
					String(
						row.id ||
							`audit-log-${row.username || targetUsername || "user"}-${row.createdAt || ""}-${row.action || ""}-${row.entityType || ""}-${index}`,
					)
				}
				title="Activity Records"
				titleIcon={<Activity className="h-4 w-4 text-primary" />}
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
				searchable={true}
				searchPlaceholder="Filter activity records..."
				density="compact"
				emptyStateTitle="No Audit Logs Found"
				emptyStateDescription={
					activeTab !== "ALL"
						? `No audit logs match entity type "${activeTab}" for user @${targetUsername}.`
						: `No audit logs found for user @${targetUsername}.`
				}
			/>
		</div>
	);
}

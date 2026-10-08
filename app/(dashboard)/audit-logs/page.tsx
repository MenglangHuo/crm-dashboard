"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/api/endpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import {
	Activity,
	Search,
	RefreshCw,
	X,
	ShieldAlert,
	Calendar,
	User as UserIcon,
} from "lucide-react";
import type { AuditLog } from "@/lib/types";

export default function AuditLogsPage() {
	const [search, setSearch] = useState("");
	const [actionFilter, setActionFilter] = useState("ALL");
	const [entityFilter, setEntityFilter] = useState("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Fetch Audit Logs Query (using post query endpoint)
	const {
		data: auditLogsData,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: [
			"audit-logs",
			page,
			pageSize,
			search,
			actionFilter,
			entityFilter,
		],
		queryFn: () =>
			auditLogsApi.search({
				page,
				limit: pageSize,
				search: search.trim() || undefined,
				action: actionFilter === "ALL" ? undefined : actionFilter,
				entityName: entityFilter === "ALL" ? undefined : entityFilter,
			}),
	});

	const columns: ColumnDef<AuditLog>[] = [
		{
			id: "username",
			header: "Operator / User",
			accessorKey: "username",
			cell: ({ value, row }) => (
				<span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
					<UserIcon className="h-3.5 w-3.5 text-slate-400" />
					{value || (row.userId ? `User #${row.userId}` : "System Task")}
				</span>
			),
		},
		{
			id: "action",
			header: "Action Type",
			accessorKey: "action",
			cell: ({ value }) => {
				const act = String(value || "UPDATE").toUpperCase();
				let badgeStyle =
					"bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400";
				if (act === "CREATE" || act === "REGISTER" || act === "ADD") {
					badgeStyle =
						"bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400";
				} else if (
					act === "DELETE" ||
					act === "REMOVE" ||
					act === "DEACTIVATE"
				) {
					badgeStyle =
						"bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400";
				} else if (act === "LOGIN" || act === "AUTHENTICATE") {
					badgeStyle =
						"bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400";
				}
				return (
					<Badge className={`font-bold text-[10px] rounded-lg ${badgeStyle}`}>
						{act}
					</Badge>
				);
			},
		},
		{
			id: "entityName",
			header: "Affected Entity",
			accessorKey: "entityName",
			cell: ({ value }) => (
				<span className="font-mono text-xs text-slate-600 dark:text-slate-400">
					{value || "—"}
				</span>
			),
		},
		{
			id: "entityId",
			header: "Entity ID",
			accessorKey: "entityId",
			cell: ({ value }) => (
				<span className="font-mono text-xs text-slate-500">
					#{value || "—"}
				</span>
			),
		},
		{
			id: "details",
			header: "Change details",
			accessorKey: "details",
			cell: ({ value }) => (
				<span
					className="text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate block"
					title={value}
				>
					{value || "No additional context."}
				</span>
			),
		},
		{
			id: "ipAddress",
			header: "IP / Network",
			accessorKey: "ipAddress",
			cell: ({ value }) => (
				<span className="text-slate-400 text-xs font-mono">
					{value || "127.0.0.1"}
				</span>
			),
		},
		{
			id: "createdAt",
			header: "Timestamp",
			accessorKey: "createdAt",
			cell: ({ value }) => (
				<span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
					<Calendar className="h-3 w-3 text-slate-400" />
					{value ? new Date(value).toLocaleString() : "—"}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-10">
			{/* Title Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
						<Activity className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
						Audit Logs
					</h1>
					<p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
						Browse and search cryptographic tracking trails of system updates
						and administrative actions.
					</p>
				</div>
			</div>

			{/* Filter and Actions Bar */}
			<div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
				<div className="flex flex-col sm:flex-row items-stretch gap-3 flex-1">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
							placeholder="Search audit trail logs..."
							className="h-9 text-xs pl-9 pr-8 rounded-xl"
						/>
						{search && (
							<button
								onClick={() => setSearch("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<Select
							value={actionFilter}
							onValueChange={(val) => {
								setActionFilter(val || "ALL");
								setPage(1);
							}}
						>
							<SelectTrigger className="w-36 rounded-xl bg-white border-slate-200 text-xs h-9 dark:bg-slate-950 dark:border-slate-800">
								<SelectValue placeholder="All Actions" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Actions</SelectItem>
								<SelectItem value="CREATE">CREATE</SelectItem>
								<SelectItem value="UPDATE">UPDATE</SelectItem>
								<SelectItem value="DELETE">DELETE</SelectItem>
								<SelectItem value="LOGIN">LOGIN</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={entityFilter}
							onValueChange={(val) => {
								setEntityFilter(val || "ALL");
								setPage(1);
							}}
						>
							<SelectTrigger className="w-40 rounded-xl bg-white border-slate-200 text-xs h-9 dark:bg-slate-950 dark:border-slate-800">
								<SelectValue placeholder="All Entities" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All Entities</SelectItem>
								<SelectItem value="User">User</SelectItem>
								<SelectItem value="Role">Role</SelectItem>
								<SelectItem value="Permission">Permission</SelectItem>
								<SelectItem value="Product">Product</SelectItem>
								<SelectItem value="Customer">Customer</SelectItem>
								<SelectItem value="Warehouse">Warehouse</SelectItem>
								<SelectItem value="Supplier">Supplier</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<Button
					variant="outline"
					onClick={() => refetch()}
					className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold gap-1.5 align-self-end sm:align-self-auto"
				>
					<RefreshCw className="h-3.5 w-3.5" /> Reload Trail
				</Button>
			</div>

			{/* Audit Logs Table */}
			<DataTable<AuditLog>
				data={auditLogsData?.items || []}
				columns={columns}
				getRowId={(log, index) =>
					String(
						log.id ||
							`audit-log-${log.username || "u"}-${log.createdAt || ""}-${index}`,
					)
				}
				title="Administrative Logs List"
				searchPlaceholder="Filter logs..."
				manualPagination={true}
				totalCount={auditLogsData?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				hideSearch={true}
			/>
		</div>
	);
}

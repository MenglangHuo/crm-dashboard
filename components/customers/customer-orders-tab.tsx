"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { Order } from "@/lib/types";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import { Badge } from "@/components/ui/badge";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { OrderTimelineDrawer } from "@/components/orders/order-timeline-drawer";
import { useTranslation } from "@/lib/i18n/context";
import {
	ShoppingCart,
	UserCheck,
	CheckCircle2,
	ShieldCheck,
	Send,
	Ban,
	XCircle,
	PackageCheck,
	Clock,
	Eye,
	History,
	Layers,
	Store,
} from "lucide-react";

interface CustomerOrdersTabProps {
	customerId: string | number;
	customerName?: string;
}

export function CustomerOrdersTab({ customerId }: CustomerOrdersTabProps) {
	const { t } = useTranslation();
	const [stageTab, setStageTab] = useState<string>("ALL");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Drawer state
	const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null);
	const [timelineOrderId, setTimelineOrderId] = useState<string | number | null>(null);
	const [timelineOrderNumber, setTimelineOrderNumber] = useState<string | undefined>(undefined);
	const [isTimelineOpen, setIsTimelineOpen] = useState(false);

	// Fetch orders for customer
	const { data, isLoading } = useQuery({
		queryKey: ["customer-orders-tab", customerId, stageTab, page, pageSize, search],
		queryFn: async () => {
			const filters: any[] = [
				{
					field: "customer",
					operator: "EQUAL",
					value: Number(customerId),
				},
			];

			if (stageTab !== "ALL") {
				filters.push({
					field: "status",
					operator: "EQUAL",
					value: stageTab,
				});
			}

			if (search.trim()) {
				filters.push({
					field: "orderNumber",
					operator: "CONTAINS",
					value: search.trim(),
				});
			}

			try {
				const res = await ordersApi.search({
					page: page - 1,
					size: pageSize,
					filterGroup: {
						operator: "AND",
						filters,
					},
					sortState: [{ field: "createdAt", direction: "DESC" }],
				});
				return res;
			} catch (err) {
				console.warn("ordersApi.search fallback to ordersApi.list", err);
				const fallback = await ordersApi.list({ page: 1, limit: 100 });
				const list = (fallback.items || (fallback as any).data || []).filter(
					(o: any) => String(o.customerId) === String(customerId)
				);
				let filtered = stageTab === "ALL" ? list : list.filter((o: any) => o.status === stageTab);
				if (search.trim()) {
					const q = search.toLowerCase();
					filtered = filtered.filter(
						(o: any) =>
							o.orderNumber?.toLowerCase().includes(q) ||
							String(o.id).includes(q)
					);
				}
				return {
					items: filtered.slice((page - 1) * pageSize, page * pageSize),
					total: filtered.length,
					page: page - 1,
					size: pageSize,
				};
			}
		},
		enabled: !!customerId,
	});

	const items = data?.items || [];
	const totalOrders = data?.total || items.length;

	const columns: ColumnDef<Order>[] = [
		{
			id: "orderNumber",
			header: t("orders.orderNumber"),
			accessorFn: (row) => row.orderNumber || row.orderNo || String(row.id),
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
						<ShoppingCart className="h-4 w-4" />
					</div>
					<div>
						<button
							type="button"
							onClick={() => setSelectedOrderId(row.id)}
							className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline text-left cursor-pointer"
						>
							{row.orderNumber || row.orderNo || `#${row.id}`}
						</button>
						<div className="text-[10px] text-slate-400">
							{row.createdAt
								? new Date(row.createdAt).toLocaleDateString()
								: "—"}
						</div>
					</div>
				</div>
			),
		},
		{
			id: "staffName",
			header: t("orders.staffName", "Staff Name"),
			accessorFn: (row) => {
				const s = row.staffInfo;
				if (!s) return "—";
				const fn = s.firstname || (s as any).firstName || "";
				const ln = s.lastname || (s as any).lastName || "";
				return `${fn} ${ln}`.trim() || (s as any).name || "—";
			},
			cell: ({ row }) => {
				const s = row.staffInfo;
				const fn = s?.firstname || (s as any)?.firstName || "";
				const ln = s?.lastname || (s as any)?.lastName || "";
				const name = `${fn} ${ln}`.trim() || (s as any)?.name;

				if (!name) {
					return <span className="text-slate-400 text-xs italic">—</span>;
				}

				return (
					<div className="flex items-center gap-2">
						<div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
							<UserCheck className="h-3.5 w-3.5" />
						</div>
						<div className="min-w-0">
							<div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
								{name}
							</div>
							{s?.primaryPhone && (
								<div className="text-[10px] text-slate-400 font-mono truncate">
									{s.primaryPhone}
								</div>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "totalAmount",
			header: t("orders.totalAmount"),
			accessorKey: "totalAmount",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
					$
					{(Number(value) || 0).toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})}
				</span>
			),
		},
		{
			id: "totalDiscountAmount",
			header: t("orders.totalDiscountAmount", "Total Discount"),
			accessorFn: (row) =>
				row.totalDiscountAmount ?? row.discountAmount ?? row.discount ?? 0,
			sortable: true,
			cell: ({ value }) => {
				const num = Number(value) || 0;
				return (
					<span
						className={`font-mono font-bold text-xs ${
							num > 0
								? "text-amber-600 dark:text-amber-400"
								: "text-slate-400 dark:text-slate-500"
						}`}
					>
						$
						{num.toLocaleString(undefined, {
							minimumFractionDigits: 2,
						})}
					</span>
				);
			},
		},
		{
			id: "status",
			header: t("orders.status"),
			accessorKey: "status",
			cell: ({ value }) => {
				const s = String(value || "DRAFT").toUpperCase();
				if (s === "COMPLETED") {
					return (
						<Badge className="bg-emerald-600 text-white text-[10px] py-0.5 px-2 gap-1 font-semibold">
							<CheckCircle2 className="h-3 w-3" /> {t("orders.completed")}
						</Badge>
					);
				}
				if (s === "APPROVED") {
					return (
						<Badge className="bg-sky-600 text-white text-[10px] py-0.5 px-2 gap-1 font-semibold">
							<ShieldCheck className="h-3 w-3" /> {t("orders.approved")}
						</Badge>
					);
				}
				if (s === "POSTED") {
					return (
						<Badge className="bg-amber-500 text-white text-[10px] py-0.5 px-2 gap-1 font-semibold">
							<Send className="h-3 w-3" /> {t("orders.posted")}
						</Badge>
					);
				}
				if (s === "VOID") {
					return (
						<Badge
							variant="destructive"
							className="text-[10px] py-0.5 px-2 gap-1"
						>
							<Ban className="h-3 w-3" /> {t("orders.void", "Void")}
						</Badge>
					);
				}
				if (s === "CANCELLED") {
					return (
						<Badge
							variant="destructive"
							className="text-[10px] py-0.5 px-2 gap-1"
						>
							<XCircle className="h-3 w-3" /> {t("orders.cancelled")}
						</Badge>
					);
				}
				return (
					<Badge
						variant="secondary"
						className="text-[10px] font-semibold py-0.5 px-2"
					>
						{s}
					</Badge>
				);
			},
		},
		{
			id: "stockVerificationStatus",
			header: t("orders.warehouseVerify"),
			accessorKey: "stockVerificationStatus",
			cell: ({ row }) => {
				const v = String(
					row.stockVerificationStatus || "NOT_YET",
				).toUpperCase();
				if (v === "CHECKED_ALL") {
					return (
						<Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] py-0.5 px-2 gap-1 font-semibold">
							<PackageCheck className="h-3 w-3" /> 100%
						</Badge>
					);
				}
				if (v === "PARTIAL_CHECK") {
					return (
						<Badge className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 text-[10px] py-0.5 px-2 gap-1 font-semibold">
							<Clock className="h-3 w-3" /> {row.verifiedItemCount || 0}/
							{row.totalItemCount || 0}
						</Badge>
					);
				}
				return (
					<Badge
						variant="outline"
						className="text-slate-400 border-slate-300 text-[10px] py-0.5 px-2"
					>
						—
					</Badge>
				);
			},
		},
	];

	// View-only custom row actions
	const customRowActions: RowAction<Order>[] = [
		{
			label: t("orders.viewDetails"),
			icon: <Eye className="h-3.5 w-3.5 text-blue-500" />,
			onClick: (row) => setSelectedOrderId(row.id),
		},
		{
			label: t("orders.viewTimeline"),
			icon: <History className="h-3.5 w-3.5 text-indigo-500" />,
			onClick: (row) => {
				setTimelineOrderId(row.id);
				setTimelineOrderNumber(row.orderNumber || row.orderNo || `#${row.id}`);
				setIsTimelineOpen(true);
			},
		},
	];

	return (
		<div className="space-y-4">
			{/* Stage Flow Segmented Tabs (All, Draft, Posted, Approved, Completed, Void) */}
			<div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
				{[
					{ id: "ALL", label: t("orders.allOrders"), icon: Layers },
					{ id: "DRAFT", label: `1. ${t("orders.draft")}`, icon: ShoppingCart },
					{ id: "POSTED", label: `2. ${t("orders.posted")}`, icon: Send },
					{
						id: "APPROVED",
						label: `3. ${t("orders.approved")}`,
						icon: ShieldCheck,
					},
					{
						id: "COMPLETED",
						label: `4. ${t("orders.completed")}`,
						icon: CheckCircle2,
					},
					{ id: "VOID", label: t("orders.void", "Void"), icon: Ban },
				].map((tab) => {
					const TabIcon = tab.icon;
					const isActive = stageTab === tab.id;

					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => {
								setStageTab(tab.id);
								setPage(1);
							}}
							className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
								isActive
									? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
							}`}
						>
							<TabIcon className="h-3.5 w-3.5" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Main Data Table */}
			<DataTable<Order>
				data={items}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("orders.title")}
				titleIcon={
					<div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
						<Store className="h-4 w-4" />
					</div>
				}
				searchPlaceholder={t("common.search")}
				searchValue={search}
				searchField="orderNumber"
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				manualPagination={true}
				totalCount={totalOrders}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				customRowActions={customRowActions}
			/>

			{/* Drawers: View Only Details & Timeline */}
			<OrderDetailsDrawer
				orderId={selectedOrderId}
				open={!!selectedOrderId}
				onOpenChange={(open) => {
					if (!open) setSelectedOrderId(null);
				}}
			/>

			<OrderTimelineDrawer
				orderId={timelineOrderId}
				orderNumber={timelineOrderNumber}
				open={isTimelineOpen}
				onOpenChange={(open) => {
					setIsTimelineOpen(open);
					if (!open) {
						setTimelineOrderId(null);
						setTimelineOrderNumber(undefined);
					}
				}}
			/>
		</div>
	);
}

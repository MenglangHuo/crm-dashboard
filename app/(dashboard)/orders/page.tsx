"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Order } from "@/lib/types";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import { ORDER_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import {
	SearchFilterPayload,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table/search-filter-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PosOrderStudioModal } from "@/components/orders/pos-order-studio-modal";
import { CreateOrderModal } from "@/components/orders/create-order-modal";
import { OrderDetailsDrawer } from "@/components/orders/order-details-drawer";
import { WarehouseVerifyModal } from "@/components/orders/warehouse-verify-modal";
import { OrderApprovalModal } from "@/components/orders/order-approval-modal";
import { IssueInvoiceModal } from "@/components/orders/issue-invoice-modal";
import { OrderActionReasonModal } from "@/components/orders/order-action-reason-modal";
import { OrderTimelineDrawer } from "@/components/orders/order-timeline-drawer";
import {
	ShoppingCart,
	Store,
	Boxes,
	ShieldCheck,
	Receipt,
	RotateCcw,
	Eye,
	History,
	Send,
	XCircle,
	PackageCheck,
	CheckCircle2,
	Clock,
	User,
	Layers,
	UserCheck,
	Edit3,
	Ban,
	Copy,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

function OrdersPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const orderParam =
		searchParams.get("orderNumber") ||
		searchParams.get("orderId") ||
		searchParams.get("orderCode");
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const {
		isAdmin,
		isSale,
		canCreateOrder,
		canPostOrder,
		canUnpostOrder,
		canVerifyStock,
		canApproveSale,
		canApproveSpecial,
		canUnapproveOrder,
		canRejectOrder,
		canIssueInvoice,
		canVoidOrder,
	} = usePermissions();

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [searchPayload, setSearchPayload] = useState<SearchFilterPayload>(() =>
		buildSearchFilterPayload({
			page: 0,
			size: 10,
			searchField: "orderNumber",
			sortState: [{ field: "createdAt", direction: "DESC" }],
		}),
	);

	// Stage Filter Tab State
	const [stageTab, setStageTab] = useState<string>("ALL");

	// Drawer / Modal States
	const [isPosOpen, setIsPosOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedOrderId, setSelectedOrderId] = useState<
		string | number | null
	>(null);
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [clonedOrder, setClonedOrder] = useState<Order | null>(null);

	const [isVerifyOpen, setIsVerifyOpen] = useState(false);
	const [isApproveOpen, setIsApproveOpen] = useState(false);
	const [approvalScope, setApprovalScope] = useState<string>("AUTO");
	const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
	const [isUnpostOpen, setIsUnpostOpen] = useState(false);
	const [isVoidOpen, setIsVoidOpen] = useState(false);
	const [isMoveToDraftOpen, setIsMoveToDraftOpen] = useState(false);
	const [isUnapproveOpen, setIsUnapproveOpen] = useState(false);
	const [isRejectOpen, setIsRejectOpen] = useState(false);
	const [isTimelineOpen, setIsTimelineOpen] = useState(false);

	// Fetch Orders using JPA Search Specification Payload
	const { data, isLoading } = useQuery({
		queryKey: [
			"orders-search",
			searchPayload,
			page,
			pageSize,
			search,
			stageTab,
		],
		queryFn: async () => {
			// Build filter payload
			const basePayload: any = {
				...searchPayload,
				page: Math.max(0, page - 1),
				size: pageSize,
			};

			// If stageTab selected (DRAFT, POSTED, APPROVED, COMPLETED) add stage filter
			if (stageTab !== "ALL") {
				const existingFilters = basePayload.filterGroup?.filters || [];
				basePayload.filterGroup = {
					operator: "AND",
					filters: [
						...existingFilters.filter((f: any) => f.field !== "status"),
						{ field: "status", operator: "EQUAL", value: stageTab },
					],
				};
			}

			try {
				const res = await ordersApi.search(basePayload);
				return res;
			} catch {
				return ordersApi.list({ page, limit: pageSize, search });
			}
		},
		staleTime: 15 * 1000,
	});

	// Unpost Mutation (Move from POSTED -> DRAFT to free hold reservations)
	const unpostMutation = useMutation({
		mutationFn: (id: string | number) => ordersApi.unpost(id),
		onSuccess: (res) => {
			toast.success((res as any)?.message || "Order returned to draft");
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			setIsUnpostOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Unapprove Mutation (Move from APPROVED -> POSTED)
	const unapproveMutation = useMutation({
		mutationFn: (id: string | number) => ordersApi.unapprove(id),
		onSuccess: (res) => {
			toast.success((res as any)?.message || "Order approval revoked");
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			setIsUnapproveOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Reject Order Mutation (Move to CANCELLED/REJECTED)
	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string | number; reason?: string }) =>
			ordersApi.reject(id, reason),
		onSuccess: (res) => {
			toast.success(
				(res as any)?.message ||
					"Order rejected and inventory reservations freed",
			);
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			setIsRejectOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Void Order Mutation (Move from DRAFT/POSTED -> VOID)
	const voidMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string | number; reason?: string }) =>
			ordersApi.voidOrder(id, reason),
		onSuccess: (res) => {
			toast.success((res as any)?.message || "Order voided and stock released");
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			setIsVoidOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Move to Draft Mutation (Move from VOID -> DRAFT)
	const moveToDraftMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string | number; reason?: string }) =>
			ordersApi.moveToDraft(id, reason),
		onSuccess: (res) => {
			toast.success((res as any)?.message || "Order returned to draft");
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			setIsMoveToDraftOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Clone order handler: Loads full order item details and launches POS Studio in clone mode
	const handleCloneOrder = async (orderRow: Order) => {
		try {
			if (
				!orderRow.items ||
				!Array.isArray(orderRow.items) ||
				orderRow.items.length === 0
			) {
				toast.loading("Loading order details for cloning...", {
					id: "clone-order-loading",
				});
				const full = await ordersApi.get(orderRow.id);
				toast.dismiss("clone-order-loading");
				if (full) {
					setSelectedOrder(null);
					setClonedOrder(full);
					setIsPosOpen(true);
					return;
				}
			}
			setSelectedOrder(null);
			setClonedOrder(orderRow);
			setIsPosOpen(true);
		} catch {
			toast.dismiss("clone-order-loading");
			setSelectedOrder(null);
			setClonedOrder(orderRow);
			setIsPosOpen(true);
		}
	};

	// Metrics computation
	const items = data?.items || [];
	const totalOrders = data?.total || items.length;

	// Auto-open order detail when redirected via notification or deep link
	useEffect(() => {
		if (!orderParam) return;

		let active = true;

		const resolveAndOpen = async () => {
			const trimmed = orderParam.trim();

			// 1. If numeric ID
			if (/^\d+$/.test(trimmed)) {
				const numId = Number(trimmed);
				setSelectedOrderId(numId);
				try {
					const found = await ordersApi.get(numId);
					if (active && found) setSelectedOrder(found);
				} catch {}
				return;
			}

			// 2. If present in currently loaded items
			const existing = items.find(
				(o) =>
					o.orderNumber === trimmed ||
					o.orderNo === trimmed ||
					String(o.id) === trimmed,
			);
			if (existing) {
				setSelectedOrderId(existing.id);
				setSelectedOrder(existing);
				return;
			}

			// 3. Query via getByNumber
			try {
				const fetched = await ordersApi.getByNumber(trimmed);
				if (active && fetched) {
					setSelectedOrderId(fetched.id);
					setSelectedOrder(fetched);
				}
			} catch (err) {
				console.error("Failed to load order from query param:", err);
			}
		};

		resolveAndOpen();

		return () => {
			active = false;
		};
	}, [orderParam, items]);

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
							onClick={() => setSelectedOrderId(row.id)}
							className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:underline text-left"
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
			id: "customer",
			header: t("orders.customer"),
			accessorFn: (row) =>
				row.customerName || row.customer?.name || String(row.customerId || "—"),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
						<User className="h-3.5 w-3.5" />
					</div>
					<div className="min-w-0">
						<div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
							{row.customerName ||
								row.customer?.name ||
								(row.customerId ? `Customer #${row.customerId}` : "—")}
						</div>
						{row.customer?.phone && (
							<div className="text-[10px] text-slate-400 font-mono truncate">
								{row.customer.phone}
							</div>
						)}
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
				setSelectedOrder(row);
				setSelectedOrderId(row.id);
				setIsTimelineOpen(true);
			},
		},
		{
			label: t("orders.editOrder", "Edit Order"),
			icon: <Edit3 className="h-3.5 w-3.5 text-indigo-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setClonedOrder(null);
				setSelectedOrderId(row.id);
				setIsPosOpen(true);
			},
			hidden: (row) => !canCreateOrder || row.status !== "DRAFT",
		},
		{
			label: t("orders.cloneOrder", "Clone Order"),
			icon: <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
			onClick: (row) => handleCloneOrder(row),
			hidden: () => !canCreateOrder,
		},
		{
			label: (row) =>
				row.saleManagerApproved
					? t("orders.saleManagerApproved", "Sale Manager Approved")
					: t("orders.saleManagerApprove", "Sale Manager Approve"),
			icon: <UserCheck className="h-3.5 w-3.5 text-indigo-600" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setApprovalScope("SALE_MANAGER");
				setIsApproveOpen(true);
			},
			hidden: (row) => isSale || !canApproveSale || row.status !== "POSTED",
			disabled: (row) => Boolean(row.saleManagerApproved),
		},
		{
			label: t("orders.warehouseVerify"),
			icon: <Boxes className="h-3.5 w-3.5 text-amber-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setIsVerifyOpen(true);
			},
			hidden: (row) => isSale || !canVerifyStock || row.status !== "POSTED",
			disabled: (row) => !row.saleManagerApproved,
		},
		{
			label: t("orders.smartApprove"),
			icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setApprovalScope("AUTO");
				setIsApproveOpen(true);
			},
			hidden: (row) => isSale || !canApproveSpecial || row.status !== "POSTED",
		},
		{
			label: t("orders.issueInvoice"),
			icon: <Receipt className="h-3.5 w-3.5 text-emerald-600 font-bold" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setIsInvoiceOpen(true);
			},
			hidden: (row) => isSale || !canIssueInvoice || row.status !== "APPROVED",
		},
		{
			label: t("orders.unpostOrder"),
			icon: <RotateCcw className="h-3.5 w-3.5 text-orange-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setIsUnpostOpen(true);
			},
			hidden: (row) => isSale || !canUnpostOrder || row.status !== "POSTED",
		},
		{
			label: t("orders.unapproveOrder"),
			icon: <RotateCcw className="h-3.5 w-3.5 text-orange-600" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setIsUnapproveOpen(true);
			},
			hidden: (row) =>
				isSale || !canUnapproveOrder || row.status !== "APPROVED",
		},
		{
			label: t("orders.rejectOrder"),
			icon: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setIsRejectOpen(true);
			},
			hidden: (row) => isSale || !canRejectOrder || row.status !== "APPROVED",
		},
		{
			label: t("orders.voidOrder", "Void Order"),
			icon: <Ban className="h-3.5 w-3.5 text-rose-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setSelectedOrderId(row.id);
				setIsVoidOpen(true);
			},
			hidden: (row) =>
				isSale ||
				!canVoidOrder ||
				(row.status !== "DRAFT" && row.status !== "POSTED"),
		},
		{
			label: t("orders.moveToDraft", "Move to Draft"),
			icon: <RotateCcw className="h-3.5 w-3.5 text-indigo-500" />,
			onClick: (row) => {
				setSelectedOrder(row);
				setSelectedOrderId(row.id);
				setIsMoveToDraftOpen(true);
			},
			hidden: (row) => !canVoidOrder || row.status !== "VOID",
		},
	];

	return (
		<div className="space-y-4 pb-12">
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

			{/* Main Data Table with Domain Filter Configs */}
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
				domainFilterFields={ORDER_DOMAIN_FILTERS}
				domainTitle="Order Filter Studio"
				onSearchFilterChange={(payload) => {
					setSearchPayload(payload);
					setPage(1);
				}}
				createButtonLabel={t("orders.createOrder")}
				createButtonIcon={<ShoppingCart className="h-4 w-4" />}
				onCreateNew={
					canCreateOrder
						? () => {
								setSelectedOrder(null);
								setClonedOrder(null);
								setIsPosOpen(true);
							}
						: undefined
				}
				manualPagination={true}
				totalCount={totalOrders}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				customRowActions={customRowActions}
			/>

			{/* Modals & Drawers */}
			<PosOrderStudioModal
				open={isPosOpen}
				onOpenChange={(open) => {
					setIsPosOpen(open);
					if (!open) {
						setSelectedOrder(null);
						setClonedOrder(null);
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
				editingOrder={selectedOrder?.status === "DRAFT" ? selectedOrder : null}
				clonedOrder={clonedOrder}
				onSuccess={() => {
					setClonedOrder(null);
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<CreateOrderModal
				open={isCreateOpen}
				onOpenChange={(open) => {
					setIsCreateOpen(open);
					if (!open) {
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<OrderDetailsDrawer
				orderId={selectedOrderId}
				open={
					Boolean(selectedOrderId) &&
					!isPosOpen &&
					!isVerifyOpen &&
					!isApproveOpen &&
					!isInvoiceOpen &&
					!isUnpostOpen &&
					!isVoidOpen &&
					!isMoveToDraftOpen &&
					!isRejectOpen &&
					!isTimelineOpen
				}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedOrderId(null);
						setSelectedOrder(null);
						if (
							searchParams.get("orderNumber") ||
							searchParams.get("orderId") ||
							searchParams.get("orderCode")
						) {
							router.replace("/orders", { scroll: false });
						}
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
			/>

			<WarehouseVerifyModal
				order={selectedOrder}
				open={isVerifyOpen}
				onOpenChange={(open) => {
					setIsVerifyOpen(open);
					if (!open) {
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<OrderApprovalModal
				order={selectedOrder}
				open={isApproveOpen}
				initialApprovalType={approvalScope}
				onOpenChange={(open) => {
					setIsApproveOpen(open);
					if (!open) {
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<IssueInvoiceModal
				order={selectedOrder}
				open={isInvoiceOpen}
				onOpenChange={(open) => {
					setIsInvoiceOpen(open);
					if (!open) {
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.refetchQueries({ queryKey: ["orders-search"] });
					}
				}}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<OrderActionReasonModal
				open={isUnpostOpen}
				onOpenChange={setIsUnpostOpen}
				title="Unpost Order to DRAFT?"
				description="Unposting will release reserved stock back to available inventory so items and prices can be modified."
				confirmLabel="Confirm Unpost"
				variant="amber"
				isLoading={unpostMutation.isPending}
				onConfirm={(_reason) => {
					const id = selectedOrder?.id || selectedOrderId;
					if (id) unpostMutation.mutate(id);
				}}
			/>

			<OrderActionReasonModal
				open={isVoidOpen}
				onOpenChange={setIsVoidOpen}
				title="Void Order?"
				description="Voiding this order will release all reserved inventory stock back to available warehouse balance and mark the order as void."
				confirmLabel="Confirm Void"
				variant="destructive"
				isLoading={voidMutation.isPending}
				onConfirm={(reason) => {
					const id = selectedOrder?.id || selectedOrderId;
					if (id) voidMutation.mutate({ id, reason });
				}}
			/>

			<OrderActionReasonModal
				open={isMoveToDraftOpen}
				onOpenChange={setIsMoveToDraftOpen}
				title="Move Voided Order to DRAFT?"
				description="Returning this voided order to DRAFT will allow modifying items and prices and re-posting the order."
				confirmLabel="Confirm Move to Draft"
				variant="amber"
				isLoading={moveToDraftMutation.isPending}
				onConfirm={(reason) => {
					const id = selectedOrder?.id || selectedOrderId;
					if (id) moveToDraftMutation.mutate({ id, reason });
				}}
			/>

			<OrderActionReasonModal
				open={isUnapproveOpen}
				onOpenChange={setIsUnapproveOpen}
				title="Reset Signoffs / Unapprove Order to DRAFT?"
				description="Unapproving will revoke all manager and stockkeeper approval sign-offs, release reserved stock, and return the order to DRAFT for item/pricing modifications."
				confirmLabel="Confirm Reset Signoffs"
				variant="amber"
				isLoading={unapproveMutation.isPending}
				onConfirm={(_reason) => {
					const id = selectedOrder?.id || selectedOrderId;
					if (id) unapproveMutation.mutate(id);
				}}
			/>

			<OrderActionReasonModal
				open={isRejectOpen}
				onOpenChange={setIsRejectOpen}
				title="Reject APPROVED Order?"
				description="Rejection returns approved order to POSTED status for re-inspection and resets dual approval flags."
				confirmLabel="Confirm Rejection"
				variant="destructive"
				isLoading={rejectMutation.isPending}
				onConfirm={(reason) => {
					const id = selectedOrder?.id || selectedOrderId;
					if (id) rejectMutation.mutate({ id, reason });
				}}
			/>

			<OrderTimelineDrawer
				orderId={selectedOrderId}
				open={isTimelineOpen}
				onOpenChange={setIsTimelineOpen}
			/>
		</div>
	);
}

export default function OrdersPage() {
	return (
		<Suspense
			fallback={
				<div className="p-8 text-center text-xs text-muted-foreground">
					Loading orders...
				</div>
			}
		>
			<OrdersPageContent />
		</Suspense>
	);
}

"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/endpoints";
import { Invoice } from "@/lib/types";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import { Badge } from "@/components/ui/badge";
import { InvoiceDetailsModal } from "@/components/invoice-details-modal";
import { InvoicePaymentsModal } from "@/components/invoice-payments-modal";
import { useTranslation } from "@/lib/i18n/context";
import {
	Receipt,
	CheckCircle2,
	AlertTriangle,
	Eye,
	History,
	RotateCcw,
	Ban,
	Layers,
	Clock,
	Truck,
	FileText,
} from "lucide-react";

interface CustomerInvoicesTabProps {
	customerId: string | number;
	customerName?: string;
}

const INVOICE_STATUS_TABS = [
	{ id: "ALL", label: "All Invoices", icon: Layers },
	{ id: "UNPAID", label: "Unpaid / Draft", icon: FileText },
	{ id: "PARTIAL_PAYMENT", label: "Partial", icon: Clock },
	{ id: "PAID", label: "Paid in Full", icon: CheckCircle2 },
	{ id: "OVERDUE", label: "Overdue", icon: AlertTriangle },
	{ id: "REFUNDED", label: "Refunded", icon: RotateCcw },
	{ id: "VOID", label: "Void", icon: Ban },
];

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
	const { t } = useTranslation();
	const [statusTab, setStatusTab] = useState<string>("ALL");
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Modals
	const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
	const [selectedPaymentsInvoiceId, setSelectedPaymentsInvoiceId] = useState<string | null>(null);

	// Fetch customer invoices using search specification
	const { data, isLoading } = useQuery({
		queryKey: ["customer-invoices-tab", customerId, statusTab, page, pageSize, search],
		queryFn: async () => {
			const filters: any[] = [
				{
					field: "customer",
					operator: "EQUAL",
					value: Number(customerId),
				},
			];

			if (statusTab !== "ALL") {
				if (statusTab === "UNPAID") {
					filters.push({
						field: "status",
						operator: "IN",
						values: ["UNPAID", "DRAFT"],
					});
				} else if (statusTab === "PARTIAL_PAYMENT") {
					filters.push({
						field: "status",
						operator: "IN",
						values: ["PARTIAL_PAYMENT", "PARTIALLY_PAID"],
					});
				} else {
					filters.push({
						field: "status",
						operator: "EQUAL",
						value: statusTab,
					});
				}
			}

			if (search.trim()) {
				filters.push({
					field: "invoiceNumber",
					operator: "CONTAINS",
					value: search.trim(),
				});
			}

			try {
				const res = await invoicesApi.search({
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
				console.warn("invoicesApi.search fallback to invoicesApi.list", err);
				const fallback = await invoicesApi.list({ page: 1, limit: 100 });
				const list = (fallback.items || (fallback as any).data || []).filter(
					(inv: any) =>
						String(inv.customerId || inv.customer?.id) === String(customerId)
				);
				let filtered =
					statusTab === "ALL"
						? list
						: list.filter((inv: any) => {
								const s = String(inv.status || "").toUpperCase();
								if (statusTab === "UNPAID") return s === "UNPAID" || s === "DRAFT";
								if (statusTab === "PARTIAL_PAYMENT") return s === "PARTIAL_PAYMENT" || s === "PARTIALLY_PAID";
								return s === statusTab;
						  });

				if (search.trim()) {
					const q = search.toLowerCase();
					filtered = filtered.filter(
						(inv: any) =>
							inv.invoiceNumber?.toLowerCase().includes(q) ||
							String(inv.id).includes(q)
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
	const totalInvoices = data?.total || items.length;

	const renderStatusBadge = (status?: string) => {
		const s = String(status || "UNPAID").toUpperCase();
		if (s === "PAID") {
			return (
				<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
					PAID
				</Badge>
			);
		}
		if (s === "PARTIAL_PAYMENT" || s === "PARTIALLY_PAID") {
			return (
				<Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold text-[11px]">
					PARTIAL PAYMENT
				</Badge>
			);
		}
		if (s === "REFUNDED") {
			return (
				<Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold text-[11px] gap-1">
					<RotateCcw className="h-3 w-3" />
					REFUNDED
				</Badge>
			);
		}
		if (s === "VOID") {
			return (
				<Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-[11px] gap-1">
					<Ban className="h-3 w-3" />
					VOID
				</Badge>
			);
		}
		if (s === "UNPAID" || s === "DRAFT") {
			return (
				<Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-bold text-[11px]">
					{s}
				</Badge>
			);
		}
		if (s === "OVERDUE") {
			return (
				<Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-[11px]">
					OVERDUE
				</Badge>
			);
		}
		return (
			<Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 font-bold text-[11px]">
				{s}
			</Badge>
		);
	};

	const columns: ColumnDef<Invoice>[] = [
		{
			id: "invoiceNumber",
			header: t("invoices.invoiceNumber", "Invoice #"),
			accessorKey: "invoiceNumber",
			sortable: true,
			cell: ({ row }) => {
				const invNo = row.invoiceNumber || row.invoiceNo || `#${row.id}`;
				const creditNote = row.creditNoteNumber;
				const orderNo =
					(row as any).orderNumber ||
					row.order?.orderNumber ||
					row.order?.orderNo ||
					((row as any).orderId
						? `#${(row as any).orderId}`
						: row.order?.id
							? `#${row.order.id}`
							: null);

				return (
					<div className="space-y-0.5 py-0.5">
						<button
							type="button"
							onClick={() => setSelectedInvoiceId(String(row.id))}
							className="font-mono text-xs font-bold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 hover:underline text-left cursor-pointer flex items-center gap-1.5"
						>
							<span>{invNo}</span>
						</button>
						{creditNote && (
							<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono py-0 px-1.5 border border-purple-300 dark:border-purple-800">
								CN: {creditNote}
							</Badge>
						)}
						{orderNo && (
							<div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
								{t("sidebar.order", "Order")}: {orderNo}
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "totalAmount",
			header: t("invoices.grandTotal", "Grand Total"),
			accessorKey: "totalAmount",
			sortable: true,
			cell: ({ row }) => {
				const total = row.totalAmount || 0;
				return (
					<span className="font-mono font-bold text-xs text-foreground block">
						{row.currency || "$"}{" "}
						{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
					</span>
				);
			},
		},
		{
			id: "paidAmount",
			header: `${t("invoices.amountPaid", "Paid")} / ${t("invoices.balanceDue", "Balance")}`,
			cell: ({ row }) => {
				const total = row.totalAmount || 0;
				const paid = row.paidAmount || 0;
				const disc = Number(row.paymentDiscountAmount || 0);
				const rem = row.remainingAmount ?? Math.max(0, total - paid - disc);
				return (
					<div className="text-xs font-mono space-y-0.5 py-0.5">
						<div className="text-emerald-600 dark:text-emerald-400 font-semibold">
							{t("invoices.amountPaid", "Paid")}: {row.currency || "$"}{" "}
							{paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</div>
						<div
							className={`text-[11px] font-bold ${
								rem > 0
									? "text-amber-600 dark:text-amber-400"
									: "text-slate-400"
							}`}
						>
							{t("invoices.balanceDue", "Due")}: {row.currency || "$"}{" "}
							{rem.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</div>
					</div>
				);
			},
		},
		{
			id: "totalDiscountAmount",
			header: t("invoices.totalDiscount", "Discount"),
			cell: ({ row }) => {
				const disc = Number(row.totalDiscountAmount ?? row.discountAmount ?? 0);
				return (
					<div className="py-0.5">
						<span
							className={`font-mono text-xs ${
								disc > 0
									? "font-bold text-amber-600 dark:text-amber-400"
									: "text-slate-400"
							}`}
						>
							{disc > 0 ? `-${row.currency || "$"}${disc.toFixed(2)}` : "$0.00"}
						</span>
					</div>
				);
			},
		},
		{
			id: "dueDate",
			header: t("invoices.dueDate", "Due Date"),
			cell: ({ row }) => {
				const isPaid = row.status === "PAID";
				const isTerminal =
					row.status === "VOID" ||
					row.status === "CANCELLED" ||
					row.status === "REFUNDED";
				const isOverdue =
					!isPaid &&
					!isTerminal &&
					(row.status === "OVERDUE" ||
						(row.dueDate &&
							new Date(row.dueDate).getTime() < new Date().getTime()));

				return (
					<div className="space-y-0.5 py-0.5">
						<div className="text-[10px] text-muted-foreground font-mono">
							{row.issuedAt
								? `Issued: ${new Date(row.issuedAt).toLocaleDateString()}`
								: "—"}
						</div>
						<div className="flex items-center gap-1.5">
							{row.dueDate ? (
								<span
									className={`font-mono text-xs font-bold ${
										isOverdue
											? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/60 flex items-center gap-1"
											: "text-foreground"
									}`}
								>
									{isOverdue && (
										<AlertTriangle className="size-3 text-rose-600 shrink-0" />
									)}
									{new Date(row.dueDate).toLocaleDateString()}
									{isOverdue && (
										<span className="text-[9px] uppercase font-bold">
											Overdue
										</span>
									)}
								</span>
							) : (
								<span className="text-slate-400 text-xs font-mono">—</span>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "paymentTerm",
			header: t("invoices.paymentTerm", "Payment Term"),
			cell: ({ row }) => {
				const termName = row.paymentTerm?.name;
				if (!termName) {
					return <span className="text-slate-400 text-xs font-mono">—</span>;
				}
				return (
					<div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 w-fit">
						<Clock className="size-3 text-indigo-500 shrink-0" />
						<span className="truncate max-w-[150px]">{termName}</span>
					</div>
				);
			},
		},
		{
			id: "delivery",
			header: t("invoices.delivery", "Delivery"),
			cell: ({ row }) => {
				const deliveryName =
					(row as any)?.delivery?.name || (row as any)?.deliveryName;
				if (!deliveryName) {
					return <span className="text-slate-400 text-xs font-mono">—</span>;
				}
				return (
					<div className="flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800/50 w-fit">
						<Truck className="size-3 text-sky-500 shrink-0" />
						<span className="truncate max-w-[130px]">{deliveryName}</span>
					</div>
				);
			},
		},
		{
			id: "status",
			header: t("invoices.paymentStatus", "Status"),
			accessorKey: "status",
			cell: ({ value }) => renderStatusBadge(value),
		},
	];

	// View-only custom row actions
	const customRowActions: RowAction<Invoice>[] = [
		{
			label: t("invoices.viewInvoice", "View Invoice"),
			icon: <Eye className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (inv) => setSelectedInvoiceId(String(inv.id)),
		},
		{
			label: t("invoices.paymentHistory", "Payment History"),
			icon: <History className="h-3.5 w-3.5 text-purple-500" />,
			onClick: (inv) => setSelectedPaymentsInvoiceId(String(inv.id)),
		},
	];

	return (
		<div className="space-y-4">
			{/* Status Filter Segmented Tabs */}
			<div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
				{INVOICE_STATUS_TABS.map((tab) => {
					const TabIcon = tab.icon;
					const isActive = statusTab === tab.id;

					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => {
								setStatusTab(tab.id);
								setPage(1);
							}}
							className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
								isActive
									? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-slate-200/80 dark:ring-slate-700"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
							}`}
						>
							<TabIcon className="h-3.5 w-3.5" />
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* Main Invoices Data Table */}
			<DataTable<Invoice>
				data={items}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("invoices.title", "Invoices")}
				titleIcon={
					<div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
						<Receipt className="h-4 w-4" />
					</div>
				}
				searchPlaceholder={t("common.search", "Search...")}
				searchValue={search}
				searchField="invoiceNumber"
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				manualPagination={true}
				totalCount={totalInvoices}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				customRowActions={customRowActions}
			/>

			{/* Invoice Details Inspector Drawer */}
			<InvoiceDetailsModal
				invoiceId={selectedInvoiceId}
				onClose={() => setSelectedInvoiceId(null)}
				onOpenPayments={(id) => setSelectedPaymentsInvoiceId(String(id))}
			/>

			{/* Invoice Payment History Modal */}
			<InvoicePaymentsModal
				open={Boolean(selectedPaymentsInvoiceId)}
				invoiceId={selectedPaymentsInvoiceId}
				onOpenChange={(open) => !open && setSelectedPaymentsInvoiceId(null)}
			/>
		</div>
	);
}

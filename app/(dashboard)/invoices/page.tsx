"use client";

import { InvoiceDetailsModal } from "@/components/invoice-details-modal";
import { InvoicePaymentsModal } from "@/components/invoice-payments-modal";
import { ChangePaymentTermModal } from "@/components/invoices/change-payment-term-modal";
import { MultiInvoicePaymentModal } from "@/components/invoices/multi-invoice-payment-modal";
import { RefundInvoiceModal } from "@/components/invoices/refund-invoice-modal";
import { VoidInvoiceModal } from "@/components/invoices/void-invoice-modal";
import { LoanDetailsModal } from "@/components/loan-details-modal";
import { useQuickActions } from "@/components/quick-action-modal-context";
import {
	ColumnDef,
	DataTable,
	RowAction,
} from "@/components/ui-custom/data-table";
import { INVOICE_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import {
	FilterCriterion,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table/search-filter-types";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger
} from "@/components/ui-custom/modern-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { customersApi, financeApi, invoicesApi, paymentsApi } from "@/lib/api/endpoints";
import { useTranslation } from "@/lib/i18n/context";
import { Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Ban,
	CheckCircle2,
	Clock,
	CreditCard,
	Eye,
	FileText,
	History,
	Layers,
	Printer,
	RefreshCw,
	RotateCcw,
	TrendingUp,
	Truck,
	User,
	Zap
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function InvoicesPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const invoiceParam =
		searchParams.get("invoiceNumber") ||
		searchParams.get("invoiceId");
	const paymentParam =
		searchParams.get("paymentNumber") ||
		searchParams.get("paymentCode") ||
		searchParams.get("paymentId");
	const viewParam = searchParams.get("view");
	const { t } = useTranslation();
	const { openQuickPay, openReceipt } = useQuickActions();
	const queryClient = useQueryClient();

	// State Management
	const [search, setSearch] = useState(() => invoiceParam || "");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
		null,
	);
	const [selectedPaymentsInvoiceId, setSelectedPaymentsInvoiceId] = useState<
		string | null
	>(null);
	const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

	// Sync search field with URL param if it changes
	useEffect(() => {
		if (invoiceParam && invoiceParam !== search) {
			setSearch(invoiceParam);
		}
	}, [invoiceParam]);

	const [voidModalInvoice, setVoidModalInvoice] = useState<Invoice | null>(
		null,
	);
	const [refundModalInvoice, setRefundModalInvoice] = useState<Invoice | null>(
		null,
	);
	const [changeTermModalInvoice, setChangeTermModalInvoice] =
		useState<Invoice | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [isMultiPaymentOpen, setIsMultiPaymentOpen] = useState(false);

	// Advanced Filter Studio State
	const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>([]);

	// Master Data Queries
	const { data: customersData } = useQuery({
		queryKey: ["customers-list-invoices-page"],
		queryFn: () => customersApi.list({ limit: 100 }),
	});

	// Advanced Search Payload for POST /v1/invoices/search
	const searchPayload = useMemo(() => {
		const payload = buildSearchFilterPayload({
			searchValue: search,
			searchField: "invoiceNumber",
			activeFilters: activeFilters,
			sortState: [{ field: "createdAt", direction: "DESC" }],
			page: Math.max(0, page - 1),
			size: pageSize,
		});

		// Merge status tab filter if active and not already added in activeFilters
		if (
			statusFilter !== "ALL" &&
			!activeFilters.some((f) => f.field === "status")
		) {
			let statusValues: string[] = [statusFilter];
			if (statusFilter === "UNPAID") statusValues = ["UNPAID", "DRAFT"];
			if (statusFilter === "PARTIAL_PAYMENT")
				statusValues = ["PARTIAL_PAYMENT", "PARTIALLY_PAID"];

			if (statusValues.length > 1) {
				payload.filterGroup?.filters.push({
					field: "status",
					operator: "IN",
					values: statusValues,
				});
			} else {
				payload.filterGroup?.filters.push({
					field: "status",
					operator: "EQUAL",
					value: statusFilter,
				});
			}
		}

		return payload;
	}, [search, activeFilters, statusFilter, page, pageSize]);

	// Invoices Query using POST /v1/invoices/search with fallback
	const {
		data: searchResponse,
		isLoading,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: [
			"invoices",
			"search-v1",
			searchPayload,
			statusFilter,
			page,
			pageSize,
			search,
		],
		queryFn: async () => {
			try {
				const res = await invoicesApi.search(searchPayload);
				if (res && res.items) {
					return res;
				}
			} catch (err) {
				console.warn("Invoices search endpoint fallback to standard list", err);
			}
			return financeApi.listInvoices({
				page,
				limit: pageSize,
				search,
				status: statusFilter !== "ALL" ? statusFilter : undefined,
			});
		},
	});

	// Global query to maintain accurate badge counters across all status tabs
	const { data: allInvoicesSummary } = useQuery({
		queryKey: ["invoices-tab-counters-all"],
		queryFn: () => financeApi.listInvoices({ limit: 500 }),
		staleTime: 1000 * 30,
	});

	const rawInvoicesList = searchResponse?.items || [];

	// Auto-open invoice or payment detail when redirected via notification or deep link
	useEffect(() => {
		if (!invoiceParam && !paymentParam) return;
		let active = true;

		const resolveAndOpen = async () => {
			try {
				let resolvedInvoiceId: string | number | null = null;

				// 1. If invoiceParam is provided (e.g. INV-202609-00001 or numeric ID)
				if (invoiceParam) {
					const trimmedInv = invoiceParam.trim();
					if (/^\d+$/.test(trimmedInv)) {
						resolvedInvoiceId = trimmedInv;
					} else {
						// 1a. Check already loaded table items first
						const existing = rawInvoicesList.find(
							(inv: any) =>
								inv.invoiceNumber?.toLowerCase() === trimmedInv.toLowerCase() ||
								String(inv.id) === trimmedInv,
						);
						if (existing?.id) {
							resolvedInvoiceId = existing.id;
						} else {
							try {
								const inv = await invoicesApi.getByNumber(trimmedInv);
								const foundId = inv?.id || (inv as any)?.data?.id;
								if (foundId) {
									resolvedInvoiceId = foundId;
								}
							} catch (err) {
								console.error("Failed to load invoice by number:", err);
							}
						}
					}
				}

				// 2. If no invoice resolved yet, but paymentParam is provided (e.g. PAY-202609-00001 or payment ID)
				if (!resolvedInvoiceId && paymentParam) {
					const trimmedPay = paymentParam.trim();
					let paymentObj: any = null;
					if (/^\d+$/.test(trimmedPay)) {
						try {
							paymentObj = await paymentsApi.get(trimmedPay);
						} catch {}
					}
					if (!paymentObj) {
						try {
							paymentObj = await paymentsApi.getByNumber(trimmedPay);
						} catch {}
					}
					if (paymentObj) {
						resolvedInvoiceId =
							paymentObj.invoiceId || paymentObj.invoice?.id || null;
					}
				}

				if (!active || !resolvedInvoiceId) return;

				const targetId = String(resolvedInvoiceId);
				if (viewParam === "payments" || paymentParam) {
					setSelectedPaymentsInvoiceId(targetId);
				} else {
					setSelectedInvoiceId(targetId);
				}
			} catch (err) {
				console.error("Failed to resolve invoice/payment from query params:", err);
			}
		};

		resolveAndOpen();

		return () => {
			active = false;
		};
	}, [invoiceParam, paymentParam, viewParam, rawInvoicesList]);

	// Ensure items strictly conform to the selected tab status
	const invoicesList = useMemo(() => {
		if (statusFilter === "ALL") return rawInvoicesList;
		return rawInvoicesList.filter((inv) => {
			const s = String(inv.status || "").toUpperCase();
			if (statusFilter === "UNPAID") return s === "UNPAID" || s === "DRAFT";
			if (statusFilter === "PARTIAL_PAYMENT")
				return s === "PARTIAL_PAYMENT" || s === "PARTIALLY_PAID";
			if (statusFilter === "PAID") return s === "PAID";
			if (statusFilter === "OVERDUE") return s === "OVERDUE";
			if (statusFilter === "REFUNDED") return s === "REFUNDED";
			if (statusFilter === "VOID") return s === "VOID";
			return s === statusFilter;
		});
	}, [rawInvoicesList, statusFilter]);

	const totalCount =
		statusFilter === "ALL"
			? searchResponse?.total || rawInvoicesList.length
			: invoicesList.length;

	const selectedInvoices = useMemo(() => {
		return invoicesList.filter((inv) => selectedIds.includes(String(inv.id)));
	}, [invoicesList, selectedIds]);

	// Calculate tab counters from full dataset
	const allList = allInvoicesSummary?.items || rawInvoicesList;
	const unpaidCount = useMemo(
		() =>
			allList.filter((i) => {
				const s = String(i.status || "").toUpperCase();
				return s === "UNPAID" || s === "DRAFT";
			}).length,
		[allList],
	);
	const partialCount = useMemo(
		() =>
			allList.filter((i) => {
				const s = String(i.status || "").toUpperCase();
				return s === "PARTIAL_PAYMENT" || s === "PARTIALLY_PAID";
			}).length,
		[allList],
	);
	const paidCount = useMemo(
		() =>
			allList.filter((i) => String(i.status || "").toUpperCase() === "PAID")
				.length,
		[allList],
	);
	const overdueCount = useMemo(
		() =>
			allList.filter((i) => String(i.status || "").toUpperCase() === "OVERDUE")
				.length,
		[allList],
	);
	const refundedCount = useMemo(
		() =>
			allList.filter((i) => String(i.status || "").toUpperCase() === "REFUNDED")
				.length,
		[allList],
	);
	const voidCount = useMemo(
		() =>
			allList.filter((i) => String(i.status || "").toUpperCase() === "VOID")
				.length,
		[allList],
	);
	const totalAllCount =
		allInvoicesSummary?.total || searchResponse?.total || allList.length;

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
			id: "quickPay",
			header: t("invoices.quickPay") || "Quick Pay",
			cell: ({ row }) => {
				const isPaid = row.status === "PAID";
				const isTerminal =
					row.status === "VOID" ||
					row.status === "CANCELLED" ||
					row.status === "REFUNDED";

				if (isPaid) {
					return (
						<div className="flex items-center">
							<span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/20">
								<CheckCircle2 className="size-3" />
								<span>Paid</span>
							</span>
						</div>
					);
				}

				if (isTerminal) {
					return (
						<span className="text-slate-400 text-xs font-mono pl-2">—</span>
					);
				}

				return (
					<Button
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							const invNo = row.invoiceNumber || row.invoiceNo;
							const rem =
								row.remainingAmount ?? row.totalAmount - (row.paidAmount || 0);
							openQuickPay({
								customerId: String(row.customerId || row.customer?.id || ""),
								invoiceId: String(row.id),
								amount: rem > 0 ? rem : row.totalAmount,
								currency: row.currency || "USD",
								invoiceNo: invNo,
							});
						}}
						className="h-7 px-2.5 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs rounded-lg gap-1 cursor-pointer transition-transform active:scale-95"
						title="Quick Pay this invoice"
					>
						<Zap className="size-3 fill-current" />
						<span>Pay</span>
					</Button>
				);
			},
		},
		{
			id: "invoiceNumber",
			header: t("invoices.invoiceNumber"),
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
						<div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
							<span>{invNo}</span>
						</div>
						{creditNote && (
							<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono py-0 px-1.5 border border-purple-300 dark:border-purple-800">
								CN: {creditNote}
							</Badge>
						)}
						{orderNo ? (
							<div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
								{t("sidebar.order")}: {orderNo}
							</div>
						) : row.loanId ? (
							<div className="text-[11px] text-muted-foreground font-mono">
								{t("sidebar.loans")} #{String(row.loanId)}
							</div>
						) : null}
					</div>
				);
			},
		},
		{
			id: "customer",
			header: t("invoices.customer"),
			accessorFn: (inv) => {
				if (inv.customer?.name) return inv.customer.name;
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(inv.customerId),
				);
				return c ? c.name : String(inv.customerId || "Walk-in");
			},
			cell: ({ row }) => {
				const custName =
					row.customer?.name ||
					customersData?.items.find(
						(c) => String(c.id) === String(row.customerId),
					)?.name ||
					`Customer #${row.customerId}`;

				return (
					<div className="font-semibold text-xs text-foreground flex items-center gap-1 py-0.5">
						<User className="size-3 text-indigo-500 shrink-0" />
						<span className="truncate">{custName}</span>
					</div>
				);
			},
		},
		{
			id: "totalAmount",
			header: t("invoices.grandTotal"),
			accessorKey: "totalAmount",
			sortable: true,
			cell: ({ row }) => {
				const total = row.totalAmount || 0;
				const profit =
					row.grossProfit !== undefined ? Number(row.grossProfit) : null;

				return (
					<div className="space-y-0.5 py-0.5">
						<span className="font-mono font-bold text-xs text-foreground block">
							{row.currency || "$"}{" "}
							{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</span>
						{profit !== null && profit > 0 && (
							<div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
								<TrendingUp className="size-2.5 shrink-0" />
								<span>Profit: ${profit.toFixed(2)}</span>
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "paidAmount",
			header: `${t("invoices.amountPaid")} / ${t("invoices.balanceDue")}`,
			cell: ({ row }) => {
				const total = row.totalAmount || 0;
				const paid = row.paidAmount || 0;
				const disc = Number(row.paymentDiscountAmount || 0);
				const rem = row.remainingAmount ?? Math.max(0, total - paid - disc);
				return (
					<div className="text-xs font-mono space-y-0.5 py-0.5">
						<div className="text-emerald-600 dark:text-emerald-400 font-semibold">
							{t("invoices.amountPaid")}: {row.currency || "$"}{" "}
							{paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</div>
						<div
							className={`text-[11px] font-bold ${rem > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}
						>
							{t("invoices.balanceDue")}: {row.currency || "$"}{" "}
							{rem.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</div>
					</div>
				);
			},
		},
		{
			id: "totalDiscountAmount",
			header: t("invoices.totalDiscount") || "Total Discount",
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
			id: "paymentDiscountAmount",
			header: t("invoices.paymentDiscount") || "Cash Discount",
			cell: ({ row }) => {
				const payDisc = Number(row.paymentDiscountAmount || 0);
				return (
					<div className="py-0.5">
						<span
							className={`font-mono text-xs ${
								payDisc > 0
									? "font-bold text-emerald-600 dark:text-emerald-400"
									: "text-slate-400"
							}`}
						>
							{payDisc > 0
								? `-${row.currency || "$"}${payDisc.toFixed(2)}`
								: "$0.00"}
						</span>
					</div>
				);
			},
		},
		{
			id: "dueDate",
			header: t("invoices.dueDate") || "Due Date",
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
				const isDueToday =
					!isPaid &&
					!isTerminal &&
					row.dueDate &&
					new Date(row.dueDate).toDateString() === new Date().toDateString();

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
											: isDueToday
												? "text-amber-600 dark:text-amber-400 font-bold"
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
			header: t("invoices.paymentTerm") || "Payment Term",
			cell: ({ row }) => {
				const termName = row.paymentTerm?.name;
				const hasEarlyDisc =
					row.discountDeadline &&
					row.earlyDiscountPct &&
					row.earlyDiscountPct > 0 &&
					row.status !== "PAID" &&
					row.status !== "REFUNDED" &&
					row.status !== "VOID" &&
					row.status !== "CANCELLED" &&
					new Date().getTime() <=
						new Date(row.discountDeadline).getTime() + 24 * 60 * 60 * 1000;

				if (!termName) {
					return <span className="text-slate-400 text-xs font-mono">—</span>;
				}

				return (
					<div className="space-y-1 py-0.5">
						<div className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 w-fit">
							<Clock className="size-3 text-indigo-500 shrink-0" />
							<span className="truncate max-w-[150px]">{termName}</span>
						</div>
						{hasEarlyDisc && (
							<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[9px] px-1.5 py-0 font-mono flex items-center gap-1 w-fit">
								<Zap className="size-2.5 fill-current" />
								<span>-{row.earlyDiscountPct}% early pay</span>
							</Badge>
						)}
					</div>
				);
			},
		},
		{
			id: "delivery",
			header: t("invoices.delivery") || "Delivery",
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
			header: t("invoices.paymentStatus"),
			accessorKey: "status",
			cell: ({ value }) => renderStatusBadge(value),
		},
	];

	const invoiceCustomActions: RowAction<Invoice>[] = [
		{
			label: t("invoices.viewInvoice"),
			icon: <Eye className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (inv) => setSelectedInvoiceId(String(inv.id)),
		},
		{
			label: t("invoices.paymentHistory"),
			icon: <History className="h-3.5 w-3.5 text-purple-500" />,
			onClick: (inv) => setSelectedPaymentsInvoiceId(String(inv.id)),
		},
		{
			label: t("invoices.changePaymentTerm"),
			icon: <Clock className="h-3.5 w-3.5 text-indigo-500" />,
			hidden: (inv) =>
				(inv.paidAmount || 0) > 0 ||
				inv.status === "PAID" ||
				inv.status === "VOID" ||
				inv.status === "CANCELLED" ||
				inv.status === "REFUNDED",
			onClick: (inv) => setChangeTermModalInvoice(inv),
		},
		{
			label: t("invoices.voidInvoice"),
			icon: <Ban className="h-3.5 w-3.5 text-rose-500" />,
			hidden: (inv) =>
				(inv.paidAmount || 0) > 0 ||
				inv.status === "VOID" ||
				inv.status === "CANCELLED" ||
				inv.status === "REFUNDED",
			onClick: (inv) => setVoidModalInvoice(inv),
		},
		{
			label: t("invoices.refundInvoice"),
			icon: <RotateCcw className="h-3.5 w-3.5 text-purple-500" />,
			hidden: (inv) =>
				((inv.paidAmount || 0) === 0 &&
					inv.status !== "PAID" &&
					inv.status !== "PARTIAL_PAYMENT") ||
				inv.status === "REFUNDED" ||
				inv.status === "VOID" ||
				inv.status === "CANCELLED",
			onClick: (inv) => setRefundModalInvoice(inv),
		},
		{
			label: t("invoices.printReceipt"),
			icon: <Printer className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (inv) => {
				const c =
					customersData?.items.find(
						(cust) => String(cust.id) === String(inv.customerId),
					) || inv.customer;
				const invNo = inv.invoiceNumber || inv.invoiceNo || `#${inv.id}`;
				openReceipt({
					invoiceNo: invNo,
					customerName: c?.name || (inv as any).customerName,
					customerPhone:
						(c as any)?.phoneNumber ||
						(c as any)?.phone ||
						inv.customer?.phoneNumber,
					customerContact: (c as any)?.contact || inv.customer?.contact,
					customerGender: (c as any)?.gender || (inv.customer as any)?.gender,
					amount: inv.totalAmount,
					currency: inv.currency || "USD",
					date: inv.issuedAt
						? new Date(inv.issuedAt).toISOString().split("T")[0]
						: new Date().toISOString().split("T")[0],
					status: inv.status || "UNPAID",
					description: inv.notes || inv.description,
					invoice: inv,
				});
			},
		},
	];

	return (
		<div className="space-y-4 pb-12">
			{/* Modern Tabs Navigation with Icons & Badges */}
			<ModernTabs
				value={statusFilter}
				onValueChange={(val) => {
					setStatusFilter(val);
					setPage(1);
				}}
			>
				<ModernTabsList variant="glass" size="md">
					<ModernTabsTrigger
						value="ALL"
						icon={<FileText className="h-4 w-4" />}
						badge={totalAllCount}
						badgeColor="purple"
					>
						{t("invoices.allInvoices", "All Invoices")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="UNPAID"
						icon={<Clock className="h-4 w-4" />}
						badge={unpaidCount}
						badgeColor="amber"
					>
						{t("invoices.unpaid", "Unpaid")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="PARTIAL_PAYMENT"
						icon={<CreditCard className="h-4 w-4" />}
						badge={partialCount}
						badgeColor="sky"
					>
						{t("invoices.partiallyPaid", "Partially Paid")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="PAID"
						icon={<CheckCircle2 className="h-4 w-4" />}
						badge={paidCount}
						badgeColor="emerald"
					>
						{t("invoices.paid", "Paid")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="OVERDUE"
						icon={<AlertTriangle className="h-4 w-4" />}
						badge={overdueCount}
						badgeColor="amber"
					>
						{t("invoices.overdue", "Overdue")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="REFUNDED"
						icon={<RotateCcw className="h-4 w-4" />}
						badge={refundedCount}
						badgeColor="purple"
					>
						{t("invoices.refunded", "Refunded")}
					</ModernTabsTrigger>

					<ModernTabsTrigger
						value="VOID"
						icon={<Ban className="h-4 w-4" />}
						badge={voidCount}
						badgeColor="rose"
					>
						{t("invoices.void", "Void")}
					</ModernTabsTrigger>
				</ModernTabsList>
			</ModernTabs>

			{/* Data Table with Integrated Advanced Filters next to Sort button */}
			<DataTable<Invoice>
				data={invoicesList}
				columns={columns}
				getRowId={(i) => String(i.id)}
				onRowClick={(row) => setSelectedInvoiceId(String(row.id))}
				title={t("invoices.title")}
				titleIcon={
					<div className="h-7 w-7 rounded-lg bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400 flex items-center justify-center shrink-0 shadow-2xs">
						<FileText className="h-4 w-4" />
					</div>
				}
				searchPlaceholder={t("common.search")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				selectable={true}
				selectedIds={selectedIds}
				onSelectionChange={setSelectedIds}
				createButtonLabel={t("invoices.quickPay")}
				onCreateNew={() => openQuickPay()}
				headerActions={
					<div className="flex items-center gap-2">
						{selectedIds.length > 0 && (
							<Button
								variant="default"
								size="sm"
								onClick={() => setIsMultiPaymentOpen(true)}
								className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs animate-in fade-in transition-all"
							>
								<Layers className="h-3.5 w-3.5" />
								<span>Pay Selected ({selectedIds.length})</span>
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								refetch();
								queryClient.invalidateQueries({ queryKey: ["invoices"] });
								queryClient.invalidateQueries({
									queryKey: ["invoices-search-v1"],
								});
								queryClient.invalidateQueries({
									queryKey: ["invoice-details"],
								});
								toast.success(
									t(
										"invoices.refetchedSuccess",
										"Invoices refetched successfully",
									),
								);
							}}
							disabled={isLoading || isFetching}
							className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg border-border hover:bg-muted text-foreground cursor-pointer shadow-xs transition-all"
							title="Refetch and refresh invoice list"
						>
							<RefreshCw
								className={cn(
									"h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400",
									(isLoading || isFetching) && "animate-spin text-primary",
								)}
							/>
							<span>{t("invoices.refetchInvoices", "Refetch Invoices")}</span>
						</Button>
					</div>
				}
				onRefresh={() => {
					refetch();
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
				}}
				domainFilterFields={INVOICE_DOMAIN_FILTERS}
				activeDomainFilters={activeFilters}
				domainTitle="Billing Invoices Filter Studio"
				onDomainFilterChange={(filters) => {
					setActiveFilters(filters);
					setPage(1);
				}}
				manualPagination={true}
				totalCount={totalCount}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				customRowActions={invoiceCustomActions}
				exportFilename="billing-invoices"
			/>

			{/* Invoice Inspector Drawer (Shows ONLY Invoice Info & Items) */}
			<InvoiceDetailsModal
				invoiceId={selectedInvoiceId}
				onClose={() => {
					setSelectedInvoiceId(null);
					if (
						searchParams.get("invoiceNumber") ||
						searchParams.get("invoiceId") ||
						searchParams.get("paymentNumber") ||
						searchParams.get("paymentCode") ||
						searchParams.get("paymentId") ||
						searchParams.get("view")
					) {
						router.replace("/invoices", { scroll: false });
					}
				}}
				onSelectLoanId={setSelectedLoanId}
				onOpenPayments={(id) => setSelectedPaymentsInvoiceId(String(id))}
			/>

			{/* Dedicated Invoice Payments Settlement History Modal */}
			<InvoicePaymentsModal
				open={Boolean(selectedPaymentsInvoiceId)}
				invoiceId={selectedPaymentsInvoiceId}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedPaymentsInvoiceId(null);
						if (
							searchParams.get("invoiceNumber") ||
							searchParams.get("invoiceId") ||
							searchParams.get("paymentNumber") ||
							searchParams.get("paymentCode") ||
							searchParams.get("paymentId") ||
							searchParams.get("view")
						) {
							router.replace("/invoices", { scroll: false });
						}
					}
				}}
				onOpenInvoiceDetails={(id) => setSelectedInvoiceId(String(id))}
			/>

			{/* Void Invoice Dialog */}
			<VoidInvoiceModal
				invoice={voidModalInvoice}
				open={Boolean(voidModalInvoice)}
				onOpenChange={(open) => !open && setVoidModalInvoice(null)}
				onSuccess={() => {
					refetch();
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
				}}
			/>

			{/* Credit Note / Refund Dialog */}
			<RefundInvoiceModal
				invoice={refundModalInvoice}
				open={Boolean(refundModalInvoice)}
				onOpenChange={(open) => !open && setRefundModalInvoice(null)}
				onSuccess={() => {
					refetch();
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
				}}
			/>

			{/* Change Payment Term Dialog */}
			<ChangePaymentTermModal
				invoice={changeTermModalInvoice}
				open={Boolean(changeTermModalInvoice)}
				onOpenChange={(open) => !open && setChangeTermModalInvoice(null)}
				onSuccess={() => {
					refetch();
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
				}}
			/>

			{/* Connected Loan Details Inspector Drawer */}
			<LoanDetailsModal
				loanId={selectedLoanId}
				onClose={() => setSelectedLoanId(null)}
			/>

			{/* Multi-Invoice Batch Payment Settlement Modal */}
			<MultiInvoicePaymentModal
				open={isMultiPaymentOpen}
				onOpenChange={setIsMultiPaymentOpen}
				selectedInvoices={selectedInvoices}
				onSuccess={() => {
					setSelectedIds([]);
					refetch();
				}}
			/>
		</div>
	);
}

export default function InvoicesPage() {
	return (
		<Suspense
			fallback={
				<div className="p-8 text-center text-xs text-muted-foreground">
					Loading invoices...
				</div>
			}
		>
			<InvoicesPageContent />
		</Suspense>
	);
}

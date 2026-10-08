"use client";

import { MultiInvoicePaymentModal } from "@/components/invoices/multi-invoice-payment-modal";
import { BulkReconciliationModal } from "@/components/payments/bulk-reconciliation-modal";
import { PaymentDetailsModal } from "@/components/payments/payment-details-modal";
import { useQuickActions } from "@/components/quick-action-modal-context";
import {
	ColumnDef,
	DataTable,
	RowAction,
	SortState,
} from "@/components/ui-custom/data-table";
import { PAYMENT_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import {
	FilterCriterion,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table/search-filter-types";
import {
	ModernTabs,
	ModernTabsContent,
	ModernTabsList,
	ModernTabsTrigger,
} from "@/components/ui-custom/modern-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { paymentsApi } from "@/lib/api/endpoints";
import { useTranslation } from "@/lib/i18n/context";
import { Payment } from "@/lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Clock,
	CreditCard,
	Eye,
	FileText,
	Layers,
	ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";

function PaymentsPageContent() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { openQuickPay, openReceipt } = useQuickActions();

	// State
	const [search, setSearch] = useState("");
	const [activeTab, setActiveTab] = useState<string>("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [activeFilters, setActiveFilters] = useState<FilterCriterion[]>([]);
	const [sortState, setSortState] = useState<SortState | null>(null);

	// Modals
	const [isBulkReconcileOpen, setIsBulkReconcileOpen] = useState(false);
	const [isMultiInvoiceOpen, setIsMultiInvoiceOpen] = useState(false);
	const [selectedPaymentDetail, setSelectedPaymentDetail] =
		useState<Payment | null>(null);

	// Construct dynamic search payload for POST /api/v1/payments/search
	const searchPayload = useMemo(() => {
		const payload = buildSearchFilterPayload({
			searchValue: search,
			searchField: "paymentNumber",
			activeFilters: activeFilters,
			sortState: sortState
				? [
						{
							field: sortState.columnId,
							direction: sortState.direction.toUpperCase() as "ASC" | "DESC",
						},
					]
				: [{ field: "createdAt", direction: "DESC" }],
			page: Math.max(0, page - 1),
			size: pageSize,
		});

		if (!payload.filterGroup) {
			payload.filterGroup = { operator: "AND", filters: [] };
		}

		// Tab filter mapping
		if (activeTab === "PENDING") {
			payload.filterGroup.filters.push({
				field: "reconciliationStatus",
				operator: "EQUAL",
				value: "PENDING",
			});
		} else if (activeTab === "RECONCILED") {
			payload.filterGroup.filters.push({
				field: "reconciliationStatus",
				operator: "EQUAL",
				value: "RECONCILED",
			});
		} else if (activeTab === "EXCEPTION") {
			payload.filterGroup.filters.push({
				field: "reconciliationStatus",
				operator: "EQUAL",
				value: "EXCEPTION",
			});
		} else if (activeTab === "COMPLETED") {
			payload.filterGroup.filters.push({
				field: "status",
				operator: "EQUAL",
				value: "COMPLETED",
			});
		}

		// Normalize staff / salesperson filters to receivedBy.id
		if (payload.filterGroup?.filters) {
			payload.filterGroup.filters.forEach((f) => {
				if (
					f.field === "receivedBy" ||
					f.field === "collectedByStaffId" ||
					f.field === "staffId" ||
					f.field === "userId"
				) {
					f.field = "receivedBy.id";
				}
			});
		}

		return payload;
	}, [search, activeFilters, activeTab, sortState, page, pageSize]);

	// Payments Query
	const {
		data: searchResponse,
		isLoading,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: [
			"payments-search",
			searchPayload,
			activeTab,
			sortState,
			page,
			pageSize,
			search,
		],
		queryFn: () => paymentsApi.search(searchPayload),
	});

	// Global query for tab badge counters
	const { data: allPaymentsSummary } = useQuery({
		queryKey: ["payments-all-kpis"],
		queryFn: () => paymentsApi.list({ limit: 500 }),
		staleTime: 1000 * 30,
	});

	const paymentsList: Payment[] = searchResponse?.items || [];
	const allPaymentsList: Payment[] = allPaymentsSummary?.items || paymentsList;

	// Tab badge counters
	const pendingReconcileCount = useMemo(
		() =>
			allPaymentsList.filter(
				(p) => !p.reconciliationStatus || p.reconciliationStatus === "PENDING",
			).length,
		[allPaymentsList],
	);

	const exceptionCount = useMemo(
		() =>
			allPaymentsList.filter((p) => p.reconciliationStatus === "EXCEPTION")
				.length,
		[allPaymentsList],
	);

	const reconciledCount = useMemo(
		() =>
			allPaymentsList.filter((p) => p.reconciliationStatus === "RECONCILED")
				.length,
		[allPaymentsList],
	);

	// Selected Payments for Bulk Operations
	const selectedPayments = useMemo(
		() => paymentsList.filter((p) => selectedIds.includes(String(p.id))),
		[paymentsList, selectedIds],
	);

	const totalSelectedAmount = useMemo(
		() =>
			selectedPayments.reduce(
				(sum, p) => sum + Number(p.amount || p.amountPaid || 0),
				0,
			),
		[selectedPayments],
	);

	// Table Columns Definition
	const columns = useMemo<ColumnDef<Payment>[]>(
		() => [
			{
				id: "paymentNumber",
				header: "Payment #",
				render: (row: Payment) => (
					<div className="flex flex-col">
						<span className="font-mono font-bold text-xs text-primary">
							{row.paymentNumber || `PAY-${row.id}`}
						</span>
						{row.referenceNumber && (
							<span className="text-[11px] text-muted-foreground font-mono truncate max-w-[130px]">
								Ref: {row.referenceNumber}
							</span>
						)}
					</div>
				),
			},
			{
				id: "invoice",
				header: "Invoice",
				sortable: false,
				render: (row: Payment) => {
					const invNo =
						row.invoice?.invoiceNumber ||
						(row.invoiceId ? `INV-${row.invoiceId}` : "Unallocated");
					return row.invoiceId ? (
						<Link
							href={`/invoices?invoiceId=${row.invoiceId}`}
							className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary hover:underline inline-flex items-center gap-1"
						>
							<FileText className="size-3 text-slate-400" />
							<span>{invNo}</span>
						</Link>
					) : (
						<span className="text-xs text-muted-foreground">{invNo}</span>
					);
				},
			},
			{
				id: "amount",
				header: "Amount",
				render: (row: Payment) => {
					const amt = Number(row.amount || row.amountPaid || 0);
					const disc = Number(row.discountAmount || 0);
					return (
						<div className="flex flex-col">
							<span className="font-bold text-xs text-slate-900 dark:text-slate-100">
								${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</span>
							{disc > 0 && (
								<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
									+${disc.toFixed(2)} disc
								</span>
							)}
						</div>
					);
				},
			},
			{
				id: "paymentMethod",
				header: "Method",
				render: (row: Payment) => {
					const method = row.paymentMethod || "CASH";
					return (
						<Badge
							variant="outline"
							className="text-[11px] font-medium bg-slate-50 dark:bg-slate-800/60"
						>
							<CreditCard className="size-3 mr-1 text-slate-500" />
							<span>{method}</span>
						</Badge>
					);
				},
			},
			{
				id: "reconciliationStatus",
				header: "Reconciliation",
				render: (row: Payment) => {
					const rec = row.reconciliationStatus || "PENDING";
					if (rec === "RECONCILED") {
						return (
							<Badge
								variant="outline"
								className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1 w-fit"
							>
								<CheckCircle2 className="size-3" />
								<span>RECONCILED</span>
							</Badge>
						);
					}
					if (rec === "EXCEPTION") {
						return (
							<Badge
								variant="outline"
								className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[11px] font-semibold flex items-center gap-1 w-fit"
							>
								<AlertTriangle className="size-3" />
								<span>EXCEPTION</span>
							</Badge>
						);
					}
					return (
						<Badge
							variant="outline"
							className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[11px] font-semibold flex items-center gap-1 w-fit"
						>
							<Clock className="size-3" />
							<span>PENDING</span>
						</Badge>
					);
				},
			},
			{
				id: "reconciliationRef",
				header: "Statement Ref",
				render: (row: Payment) => (
					<span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
						{row.reconciliationReference || "—"}
					</span>
				),
			},
			{
				id: "paymentDate",
				header: "Payment Date",
				render: (row: Payment) => (
					<span className="text-xs text-muted-foreground">
						{row.paymentDate
							? new Date(row.paymentDate).toLocaleDateString()
							: "—"}
					</span>
				),
			},
			{
				id: "status",
				header: "Status",
				render: (row: Payment) => {
					const st = row.status || "COMPLETED";
					return (
						<Badge
							variant="outline"
							className={
								st === "COMPLETED"
									? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
									: "border-slate-300 text-slate-600 dark:text-slate-400 text-[10px]"
							}
						>
							{st}
						</Badge>
					);
				},
			},
		],
		[],
	);

	// Row Actions
	const rowActions = useMemo<RowAction<Payment>[]>(
		() => [
			{
				label: "View Details",
				icon: <Eye className="size-3.5" />,
				onClick: (row) => setSelectedPaymentDetail(row),
			},
			{
				label: "Reconcile Payment",
				icon: <ShieldCheck className="size-3.5 text-primary" />,
				onClick: (row) => {
					setSelectedIds([String(row.id)]);
					setIsBulkReconcileOpen(true);
				},
			},
		],
		[],
	);

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
						<CreditCard className="size-7 text-primary" />
						<span>Payments & Reconciliation</span>
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
						Track customer collections, verify bank settlements, and perform bulk multi-reconciliation.
					</p>
				</div>

			</div>

			{/* Main Modern Tabs Navigation */}
			<ModernTabs
				value={activeTab}
				onValueChange={(val) => {
					setActiveTab(val);
					setPage(1);
				}}
			>
				<ModernTabsList variant="glass" size="md">
					<ModernTabsTrigger
						value="ALL"
						icon={<Layers className="size-4" />}
						badge={allPaymentsList.length}
						badgeColor="purple"
					>
						All Payments
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="PENDING"
						icon={<Clock className="size-4" />}
						badge={pendingReconcileCount}
						badgeColor="amber"
					>
						Pending Reconcile
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="RECONCILED"
						icon={<CheckCircle2 className="size-4" />}
						badge={reconciledCount}
						badgeColor="emerald"
					>
						Reconciled
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="EXCEPTION"
						icon={<AlertTriangle className="size-4" />}
						badge={exceptionCount}
						badgeColor="rose"
					>
						Exceptions
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="COMPLETED"
						icon={<Check className="size-4" />}
					>
						Completed
					</ModernTabsTrigger>
				</ModernTabsList>

				<ModernTabsContent value={activeTab} className="pt-3 space-y-4">
					{/* Selection Banner when items are selected */}
					{selectedPayments.length > 0 && (
						<div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-xs">
							<div className="flex items-center gap-3">
								<Badge className="bg-primary text-primary-foreground font-bold px-2 py-0.5">
									{selectedPayments.length} Selected
								</Badge>
								<span className="font-semibold text-slate-900 dark:text-slate-100">
									Total: ${totalSelectedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</span>
							</div>

							<div className="flex items-center gap-2">
								<Button
									size="sm"
									onClick={() => setIsBulkReconcileOpen(true)}
									className="h-8 gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
								>
									<ShieldCheck className="size-3.5" />
									<span>Reconcile Selected</span>
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setSelectedIds([])}
									className="h-8 text-xs text-muted-foreground hover:text-slate-900"
								>
									Clear Selection
								</Button>
							</div>
						</div>
					)}

					{/* Data Table with Checkbox Selection, Filters & Sort */}
					<DataTable<Payment>
						data={paymentsList}
						columns={columns}
						actions={rowActions}
						isLoading={isLoading}
						selectable={true}
						selectedIds={selectedIds}
						onSelectionChange={setSelectedIds}
						hideHeader={true}
						searchPlaceholder={t("common.search", "Search...")}
						searchValue={search}
						onSearchChange={(val) => {
							setSearch(val);
							setPage(1);
						}}
						sortState={sortState}
						onSortChange={setSortState}
						domainFilterFields={PAYMENT_DOMAIN_FILTERS}
						activeDomainFilters={activeFilters}
						domainTitle="Payment Filter Studio"
						filterButtonLabel={t("common.filters", "Filters")}
						onDomainFilterChange={(filters) => {
							setActiveFilters(filters);
							setPage(1);
						}}
						manualPagination={true}
						page={page}
						pageSize={pageSize}
						totalCount={searchResponse?.total || 0}
						onPageChange={setPage}
						onPageSizeChange={(newSize: number) => {
							setPageSize(newSize);
							setPage(1);
						}}
					/>
				</ModernTabsContent>
			</ModernTabs>

			{/* Bulk Reconciliation Modal */}
			<BulkReconciliationModal
				open={isBulkReconcileOpen}
				onOpenChange={setIsBulkReconcileOpen}
				selectedPayments={selectedPayments}
				onSuccess={() => {
					setSelectedIds([]);
					refetch();
					queryClient.invalidateQueries({ queryKey: ["payments-all-kpis"] });
				}}
			/>

			{/* Payment Details Drawer / Modal */}
			<PaymentDetailsModal
				open={Boolean(selectedPaymentDetail)}
				onOpenChange={(open) => !open && setSelectedPaymentDetail(null)}
				payment={selectedPaymentDetail}
				onReconcileSingle={(payment) => {
					setSelectedIds([String(payment.id)]);
					setIsBulkReconcileOpen(true);
				}}
			/>

			{/* Multi-Invoice Settlement Modal */}
			<MultiInvoicePaymentModal
				open={isMultiInvoiceOpen}
				onOpenChange={setIsMultiInvoiceOpen}
				selectedInvoices={[]}
				onSuccess={() => {
					refetch();
					queryClient.invalidateQueries({ queryKey: ["payments-all-kpis"] });
				}}
			/>
		</div>
	);
}

export default function PaymentsPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center text-xs">Loading payments...</div>}>
			<PaymentsPageContent />
		</Suspense>
	);
}

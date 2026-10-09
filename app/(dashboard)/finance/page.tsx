"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, customersApi } from "@/lib/api/endpoints";
import { Invoice, Payment, CreatePaymentRequest } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Plus,
	Loader2,
	Receipt,
	CreditCard,
	DollarSign,
	CheckCircle2,
	Clock,
	FileText,
	ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	DataTable,
	ColumnDef,
	StatusBadgeCell,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernDatePicker,
} from "@/components/ui-custom/form-controls";
import { ScrollArea } from "@/components/ui/scroll-area";

// Invoice validation schema
const invoiceFormSchema = z.object({
	customerId: z.string().min(1, "Customer is required"),
	loanId: z.string().optional(),
	invoiceNo: z.string().min(1, "Invoice number is required"),
	totalAmount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
	currency: z.string().min(1, "Currency is required"),
	issuedAt: z.string().min(1, "Issue date is required"),
	dueDate: z.string().min(1, "Due date is required"),
	description: z.string().optional(),
});

// Payment validation schema
const paymentFormSchema = z.object({
	customerId: z.string().min(1, "Customer is required"),
	invoiceId: z.string().min(1, "Invoice ID is required"),
	amountPaid: z.coerce.number().min(0.01, "Amount must be greater than 0"),
	paymentCurrency: z.string().min(1, "Currency is required"),
	paymentMethod: z.string().min(1, "Payment method is required"),
	reference: z.string().min(1, "Reference number is required"),
	paymentDate: z.string().min(1, "Payment date is required"),
	receiptUrl: z.string().optional(),
	notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;

import { useQuickActionDispatch } from "@/components/quick-action-modal-context";
import { QrCode, Printer, Zap } from "lucide-react";

export default function FinancePage() {
	const { openQuickPay, openKhqr, openReceipt } = useQuickActionDispatch();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<"invoices" | "payments">(
		"invoices",
	);

	// State for search and pagination
	const [invoiceSearch, setInvoiceSearch] = useState("");
	const [invoicePage, setInvoicePage] = useState(1);
	const [invoicePageSize, setInvoicePageSize] = useState(10);

	const [paymentSearch, setPaymentSearch] = useState("");
	const [paymentPage, setPaymentPage] = useState(1);
	const [paymentPageSize, setPaymentPageSize] = useState(10);

	// Dialog open states
	const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
	const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

	// Fetch Invoices
	const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
		queryKey: [
			"invoices",
			{ page: invoicePage, pageSize: invoicePageSize, search: invoiceSearch },
		],
		queryFn: () =>
			financeApi.listInvoices({
				page: invoicePage,
				limit: invoicePageSize,
				search: invoiceSearch,
			}),
	});

	// Fetch Payments
	const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
		queryKey: [
			"payments",
			{ page: paymentPage, pageSize: paymentPageSize, search: paymentSearch },
		],
		queryFn: () =>
			financeApi.listPayments({
				page: paymentPage,
				limit: paymentPageSize,
				search: paymentSearch,
			}),
	});

	// Fetch Customers for select dropdowns
	const { data: customersData } = useQuery({
		queryKey: ["customers-list"],
		queryFn: () => customersApi.list({ limit: 100 }),
	});

	// Invoice Form
	const invoiceForm = useForm<InvoiceFormValues>({
		resolver: zodResolver(invoiceFormSchema as any),
		defaultValues: {
			customerId: "",
			loanId: "",
			invoiceNo: "",
			totalAmount: 0,
			currency: "USD",
			issuedAt: new Date().toISOString().split("T")[0],
			dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			description: "",
		},
	});

	// Payment Form
	const paymentForm = useForm<PaymentFormValues>({
		resolver: zodResolver(paymentFormSchema as any),
		defaultValues: {
			customerId: "",
			invoiceId: "",
			amountPaid: 0,
			paymentCurrency: "USD",
			paymentMethod: "BANK_TRANSFER",
			reference: "",
			paymentDate: new Date().toISOString().split("T")[0],
			receiptUrl: "",
			notes: "",
		},
	});

	// Generate Invoice Mutation
	const generateInvoiceMutation = useMutation({
		mutationFn: (values: InvoiceFormValues) =>
			financeApi.generateInvoice(values as Partial<Invoice>),
		onSuccess: () => {
			toast.success("Invoice generated successfully");
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			setIsInvoiceDialogOpen(false);
			invoiceForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Process Payment Mutation
	const processPaymentMutation = useMutation({
		mutationFn: (values: PaymentFormValues) => {
			const selectedInv = invoicesData?.items?.find(
				(i) => String(i.id) === String(values.invoiceId),
			);
			const payload: CreatePaymentRequest = {
				customerId: values.customerId
					? !isNaN(Number(values.customerId))
						? Number(values.customerId)
						: values.customerId
					: undefined,
				invoiceId: values.invoiceId
					? !isNaN(Number(values.invoiceId))
						? Number(values.invoiceId)
						: values.invoiceId
					: undefined,
				amount: Number(values.amountPaid),
				paymentDate: values.paymentDate
					? new Date(values.paymentDate).toISOString()
					: new Date().toISOString(),
				paymentMethod: values.paymentMethod as any,
				referenceNumber: values.reference || undefined,
				notes: values.notes || undefined,
				// status: "COMPLETED",
			};
			return financeApi.processPayment(payload);
		},
		onSuccess: () => {
			toast.success("Payment processed successfully");
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			setIsPaymentDialogOpen(false);
			paymentForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openGenerateInvoice = () => {
		const randomNum = Math.floor(100000 + Math.random() * 900000);
		invoiceForm.reset({
			customerId: customersData?.items[0]?.id
				? String(customersData.items[0].id)
				: "",
			loanId: "",
			invoiceNo: `INV-${randomNum}`,
			totalAmount: 0,
			currency: "USD",
			issuedAt: new Date().toISOString().split("T")[0],
			dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
			description: "",
		});
		setIsInvoiceDialogOpen(true);
	};

	const openProcessPayment = (invoice?: Invoice) => {
		const randomRef = Math.floor(100000 + Math.random() * 900000);
		const remaining =
			invoice?.remainingAmount !== undefined
				? Number(invoice.remainingAmount)
				: invoice?.totalAmount || 0;
		paymentForm.reset({
			customerId: invoice?.customerId
				? String(invoice.customerId)
				: customersData?.items[0]?.id
					? String(customersData.items[0].id)
					: "",
			invoiceId: invoice?.id ? String(invoice.id) : "",
			amountPaid: remaining > 0 ? remaining : invoice?.totalAmount || 0,
			paymentCurrency: invoice?.currency || "USD",
			paymentMethod: "BANK_TRANSFER",
			reference: `PAY-${randomRef}`,
			paymentDate: new Date().toISOString().split("T")[0],
			receiptUrl: "",
			notes: invoice
				? `Settlement payment for ${invoice.invoiceNumber || invoice.invoiceNo || invoice.id}`
				: "",
		});
		setIsPaymentDialogOpen(true);
	};

	const handleInvoiceSubmit = (values: InvoiceFormValues) => {
		generateInvoiceMutation.mutate(values);
	};

	const handlePaymentSubmit = (values: PaymentFormValues) => {
		processPaymentMutation.mutate(values);
	};

	// Calculate summary metrics
	const totalInvoices = invoicesData?.total ?? 0;
	const totalPayments = paymentsData?.total ?? 0;
	const pendingInvoicesCount =
		invoicesData?.items?.filter(
			(inv) =>
				inv.status?.toUpperCase() === "PENDING" ||
				inv.status?.toUpperCase() === "UNPAID",
		)?.length ?? 0;
	const totalPaidAmount =
		paymentsData?.items?.reduce(
			(acc, curr) => acc + (curr.amountPaid || 0),
			0,
		) ?? 0;

	const invoiceColumns: ColumnDef<Invoice>[] = [
		{
			id: "invoiceNo",
			header: "Invoice No.",
			accessorKey: "invoiceNo",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<div className="font-mono text-xs font-semibold text-primary">
						{row.invoiceNo || String(row.id).slice(0, 8)}
					</div>
					{row.loanId && (
						<div className="text-[11px] text-muted-foreground">
							Loan: {String(row.loanId)}
						</div>
					)}
				</div>
			),
		},
		{
			id: "customer",
			header: "Customer",
			accessorFn: (inv) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(inv.customerId),
				);
				return c ? c.name : String(inv.customerId);
			},
			cell: ({ row }) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(row.customerId),
				);
				return (
					<div className="font-medium text-xs text-foreground">
						{c ? c.name : String(row.customerId)}
					</div>
				);
			},
		},
		{
			id: "description",
			header: "Description",
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground">{value || "—"}</span>
			),
		},
		{
			id: "dates",
			header: "Issue / Due Date",
			cell: ({ row }) => (
				<div className="text-xs">
					<div>
						Issued:{" "}
						{row.issuedAt ? new Date(row.issuedAt).toLocaleDateString() : "—"}
					</div>
					<div className="text-muted-foreground">
						Due:{" "}
						{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "—"}
					</div>
				</div>
			),
		},
		{
			id: "totalAmount",
			header: "Amount",
			accessorKey: "totalAmount",
			sortable: true,
			cell: ({ row }) => (
				<span className="font-semibold text-xs text-foreground">
					{row.currency || "$"}{" "}
					{row.totalAmount?.toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})}
				</span>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			filterType: "select",
			filterOptions: [
				{ label: "Paid", value: "PAID" },
				{ label: "Pending", value: "PENDING" },
				{ label: "Overdue", value: "OVERDUE" },
			],
			cell: ({ value }) => {
				const s = String(value || "PENDING").toUpperCase();
				if (s === "PAID" || s === "SUCCESS")
					return <StatusBadgeCell status="Paid" type="account" />;
				if (s === "OVERDUE")
					return <StatusBadgeCell status="Overdue" customVariant="danger" />;
				return (
					<StatusBadgeCell status={s} type="email" customVariant="pending" />
				);
			},
		},
	];

	const invoiceCustomActions: RowAction<Invoice>[] = [
		{
			label: "Quick Pay",
			icon: <Zap className="h-3.5 w-3.5 text-amber-500 fill-current" />,
			onClick: (inv) =>
				openQuickPay({
					customerId: inv.customerId ? String(inv.customerId) : undefined,
					invoiceId: inv.id ? String(inv.id) : undefined,
					amount: inv.totalAmount,
					currency: inv.currency || "USD",
					invoiceNo: inv.invoiceNo,
				}),
		},
		{
			label: "Generate ABA QR",
			icon: <QrCode className="h-3.5 w-3.5 text-rose-500" />,
			onClick: (inv) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(inv.customerId),
				);
				openKhqr({
					invoiceNo: inv.invoiceNo || String(inv.id).slice(0, 8),
					amount: inv.totalAmount,
					currency: inv.currency || "USD",
					customerName: c?.name,
				});
			},
		},
		{
			label: "Print Receipt",
			icon: <Printer className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (inv) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(inv.customerId),
				);
				openReceipt({
					invoiceNo: inv.invoiceNo || (inv as any).invoiceNumber,
					customerName: c?.name,
					customerPhone: c?.phone || (c as any)?.phoneNumber,
					customerContact: (c as any)?.contact,
					amount: inv.totalAmount,
					currency: inv.currency || "USD",
					date: inv.issuedAt
						? new Date(inv.issuedAt).toISOString().split("T")[0]
						: new Date().toISOString().split("T")[0],
					status: inv.status || "PENDING",
					description: inv.description,
					invoice: inv,
				});
			},
		},
	];

	const paymentColumns: ColumnDef<Payment>[] = [
		{
			id: "reference",
			header: "Reference No.",
			accessorKey: "reference",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<div className="font-mono text-xs font-semibold text-foreground">
						{row.reference || String(row.id).slice(0, 8)}
					</div>
					{row.invoiceId && (
						<div className="text-[11px] text-muted-foreground">
							Invoice: {String(row.invoiceId)}
						</div>
					)}
				</div>
			),
		},
		{
			id: "customer",
			header: "Customer",
			accessorFn: (p) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(p.customerId),
				);
				return c ? c.name : String(p.customerId);
			},
			cell: ({ row }) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(row.customerId),
				);
				return (
					<div className="font-medium text-xs text-foreground">
						{c ? c.name : String(row.customerId || "—")}
					</div>
				);
			},
		},
		{
			id: "paymentMethod",
			header: "Method",
			accessorKey: "paymentMethod",
			cell: ({ value }) => (
				<Badge variant="secondary" className="text-xs">
					{value || "CASH"}
				</Badge>
			),
		},
		{
			id: "paymentDate",
			header: "Date",
			accessorKey: "paymentDate",
			sortable: true,
			cell: ({ value }) => (
				<span className="text-xs text-foreground">
					{value ? new Date(value).toLocaleDateString() : "—"}
				</span>
			),
		},
		{
			id: "amountPaid",
			header: "Amount Paid",
			accessorKey: "amountPaid",
			sortable: true,
			cell: ({ row }) => (
				<span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
					{row.paymentCurrency || "$"}{" "}
					{row.amountPaid?.toLocaleString(undefined, {
						minimumFractionDigits: 2,
					})}
				</span>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ value }) => (
				<StatusBadgeCell status={value || "SUCCESS"} type="account" />
			),
		},
	];

	const paymentCustomActions: RowAction<Payment>[] = [
		{
			label: "Print Receipt",
			icon: <Printer className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (p) => {
				const c = customersData?.items.find(
					(cust) => String(cust.id) === String(p.customerId),
				);
				openReceipt({
					invoiceNo: p.invoiceId ? String(p.invoiceId) : "INV-PAYMENT",
					paymentRef: p.reference,
					customerName: c?.name,
					customerPhone: c?.phone,
					amount: p.amountPaid || p.amount || 0,
					currency: p.paymentCurrency || "USD",
					date: p.paymentDate
						? new Date(p.paymentDate).toISOString().split("T")[0]
						: new Date().toISOString().split("T")[0],
					paymentMethod: p.paymentMethod,
					status: "PAID",
					description: p.notes || "Completed Payment Settlement",
				});
			},
		},
	];

	return (
		<div className="space-y-6">
			{/* Top Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Finance Management
					</h2>
					<p className="text-muted-foreground text-sm">
						Generate invoices, process payments, and track transactions across
						your company.
					</p>
				</div>
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Button onClick={openGenerateInvoice} className="shrink-0">
						<Plus className="mr-2 h-4 w-4" /> Generate Invoice
					</Button>
					<Button
						onClick={() => openProcessPayment()}
						variant="outline"
						className="shrink-0"
					>
						<CreditCard className="mr-2 h-4 w-4" /> Process Payment
					</Button>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="bg-card">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Total Invoices
						</CardTitle>
						<Receipt className="h-4 w-4 text-primary" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalInvoices}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Recorded in system
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Pending Invoices
						</CardTitle>
						<Clock className="h-4 w-4 text-amber-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
							{pendingInvoicesCount}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							Awaiting settlement
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Processed Payments
						</CardTitle>
						<CheckCircle2 className="h-4 w-4 text-emerald-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalPayments}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Successful receipts
						</p>
					</CardContent>
				</Card>

				<Card className="bg-card">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">
							Collected Volume
						</CardTitle>
						<DollarSign className="h-4 w-4 text-emerald-500" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							$
							{totalPaidAmount.toLocaleString(undefined, {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</div>
						<p className="text-xs text-muted-foreground mt-1">
							From current page payments
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs for Invoices and Payments */}
			<ModernTabs
				defaultValue="invoices"
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as "invoices" | "payments")}
			>
				<ModernTabsList variant="glass" size="md">
					<ModernTabsTrigger
						value="invoices"
						icon={<FileText className="h-4 w-4" />}
						badge={totalInvoices}
						badgeColor="emerald"
					>
						Invoices
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="payments"
						icon={<CreditCard className="h-4 w-4" />}
						badge={totalPayments}
						badgeColor="purple"
					>
						Payments
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* INVOICES TAB */}
				<ModernTabsContent value="invoices" className="m-0">
					<DataTable<Invoice>
						data={invoicesData?.items || []}
						columns={invoiceColumns}
						getRowId={(i) => String(i.id)}
						title="Invoices"
						searchPlaceholder="Search invoice no, customer, description..."
						searchValue={invoiceSearch}
						onSearchChange={(val) => {
							setInvoiceSearch(val);
							setInvoicePage(1);
						}}
						createButtonLabel="Generate Invoice"
						onCreateNew={openGenerateInvoice}
						manualPagination={true}
						totalCount={invoicesData?.total || 0}
						page={invoicePage}
						pageSize={invoicePageSize}
						onPageChange={setInvoicePage}
						onPageSizeChange={setInvoicePageSize}
						isLoading={isLoadingInvoices}
						customRowActions={invoiceCustomActions}
						exportFilename="invoices-list"
					/>
				</ModernTabsContent>

				{/* PAYMENTS TAB */}
				<ModernTabsContent value="payments" className="m-0">
					<DataTable<Payment>
						data={paymentsData?.items || []}
						columns={paymentColumns}
						getRowId={(p) => String(p.id)}
						title="Payments"
						searchPlaceholder="Search reference no, customer..."
						searchValue={paymentSearch}
						onSearchChange={(val) => {
							setPaymentSearch(val);
							setPaymentPage(1);
						}}
						createButtonLabel="Process Payment"
						onCreateNew={() => openProcessPayment()}
						manualPagination={true}
						totalCount={paymentsData?.total || 0}
						page={paymentPage}
						pageSize={paymentPageSize}
						onPageChange={setPaymentPage}
						onPageSizeChange={setPaymentPageSize}
						isLoading={isLoadingPayments}
						customRowActions={paymentCustomActions}
						exportFilename="payments-list"
					/>
				</ModernTabsContent>
			</ModernTabs>

			{/* GENERATE INVOICE MODAL */}
			<ModernModal
				isOpen={isInvoiceDialogOpen}
				onClose={() => setIsInvoiceDialogOpen(false)}
				title="Generate Invoice"
				subtitle="Create a new invoice for a customer."
				icon={<Receipt className="h-5 w-5" />}
				size="lg"
				isLoading={generateInvoiceMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsInvoiceDialogOpen(false)}
						/>
						<ModernModalSubmitButton
							form="generate-invoice-form"
							isLoading={generateInvoiceMutation.isPending}
						>
							Generate Invoice
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="generate-invoice-form"
					onSubmit={invoiceForm.handleSubmit(handleInvoiceSubmit as any)}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<ModernSelect
							label="Customer"
							placeholder="Select customer"
							value={invoiceForm.watch("customerId")}
							onChange={(val) => invoiceForm.setValue("customerId", val)}
							options={
								customersData?.items?.map((c) => ({
									value: String(c.id),
									label: c.name,
									description: c.phone || c.email,
								})) || []
							}
							searchable
							error={invoiceForm.formState.errors.customerId?.message}
						/>

						<ModernInput
							label="Invoice Number"
							placeholder="e.g. INV-100201"
							leftIcon={<Receipt className="size-4" />}
							{...invoiceForm.register("invoiceNo")}
							error={invoiceForm.formState.errors.invoiceNo?.message}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<ModernInput
							label="Amount"
							type="number"
							step="0.01"
							placeholder="0.00"
							prefixAddon={<DollarSign className="size-4" />}
							{...invoiceForm.register("totalAmount")}
							error={invoiceForm.formState.errors.totalAmount?.message}
						/>

						<ModernSelect
							label="Currency"
							value={invoiceForm.watch("currency")}
							onChange={(val) => invoiceForm.setValue("currency", val as any)}
							options={[
								{ value: "USD", label: "USD ($)" },
								{ value: "KHR", label: "KHR (៛)" },
								{ value: "EUR", label: "EUR (€)" },
							]}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<ModernDatePicker
							label="Issue Date"
							value={invoiceForm.watch("issuedAt")}
							onChange={(date) => invoiceForm.setValue("issuedAt", date)}
							error={invoiceForm.formState.errors.issuedAt?.message}
						/>

						<ModernDatePicker
							label="Due Date"
							value={invoiceForm.watch("dueDate")}
							onChange={(date) => invoiceForm.setValue("dueDate", date)}
							error={invoiceForm.formState.errors.dueDate?.message}
						/>
					</div>

					<ModernInput
						label="Description"
						placeholder="Short description..."
						{...invoiceForm.register("description")}
					/>

					<ModernInput
						label="Associated Loan ID (Optional)"
						placeholder="e.g. loan-id-123"
						{...invoiceForm.register("loanId")}
					/>
				</form>
			</ModernModal>

			{/* PROCESS PAYMENT MODAL */}
			<ModernModal
				isOpen={isPaymentDialogOpen}
				onClose={() => setIsPaymentDialogOpen(false)}
				title="Process Payment"
				subtitle="Record a new payment transaction against an invoice."
				icon={<CreditCard className="h-5 w-5 text-emerald-500" />}
				size="lg"
				isLoading={processPaymentMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsPaymentDialogOpen(false)}
						/>
						<ModernModalSubmitButton
							form="process-payment-form"
							isLoading={processPaymentMutation.isPending}
						>
							Process Payment
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="process-payment-form"
					onSubmit={paymentForm.handleSubmit(handlePaymentSubmit as any)}
					className="space-y-4"
				>
					<div className="grid grid-cols-2 gap-4">
						<ModernSelect
							label="Customer"
							placeholder="Select customer"
							value={paymentForm.watch("customerId")}
							onChange={(val) => paymentForm.setValue("customerId", val)}
							options={
								customersData?.items?.map((c) => ({
									value: String(c.id),
									label: c.name,
									description: c.phone || c.email,
								})) || []
							}
							searchable
							error={paymentForm.formState.errors.customerId?.message}
						/>

						<ModernSelect
							label="Invoice ID"
							placeholder="Select invoice"
							value={paymentForm.watch("invoiceId")}
							onChange={(val) => {
								paymentForm.setValue("invoiceId", val);
								const selectedInv = invoicesData?.items?.find(
									(i) => String(i.id) === String(val),
								);
								if (selectedInv) {
									paymentForm.setValue("amountPaid", selectedInv.totalAmount);
									paymentForm.setValue(
										"paymentCurrency",
										selectedInv.currency || "USD",
									);
									if (selectedInv.customerId) {
										paymentForm.setValue(
											"customerId",
											String(selectedInv.customerId),
										);
									}
								}
							}}
							options={
								invoicesData?.items?.map((inv) => ({
									value: String(inv.id),
									label: `${inv.invoiceNo || String(inv.id).slice(0, 8)} - $${inv.totalAmount}`,
									badge: inv.status,
								})) || []
							}
							searchable
							error={paymentForm.formState.errors.invoiceId?.message}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<ModernInput
							label="Payment Amount"
							type="number"
							step="0.01"
							placeholder="0.00"
							prefixAddon={<DollarSign className="size-4" />}
							{...paymentForm.register("amountPaid")}
							error={paymentForm.formState.errors.amountPaid?.message}
						/>

						<ModernSelect
							label="Currency"
							value={paymentForm.watch("paymentCurrency")}
							onChange={(val) =>
								paymentForm.setValue("paymentCurrency", val as any)
							}
							options={[
								{ value: "USD", label: "USD ($)" },
								{ value: "KHR", label: "KHR (៛)" },
								{ value: "EUR", label: "EUR (€)" },
							]}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<ModernSelect
							label="Payment Method"
							value={paymentForm.watch("paymentMethod")}
							onChange={(val) =>
								paymentForm.setValue("paymentMethod", val as any)
							}
							options={[
								{ value: "BANK_TRANSFER", label: "Bank Transfer" },
								{ value: "CASH", label: "Cash" },
								{ value: "CREDIT_CARD", label: "Credit Card" },
								{ value: "OTHER", label: "Other" },
							]}
						/>

						<ModernInput
							label="Reference No."
							placeholder="e.g. TXN-998877"
							{...paymentForm.register("reference")}
							error={paymentForm.formState.errors.reference?.message}
						/>
					</div>

					<ModernDatePicker
						label="Payment Date"
						value={paymentForm.watch("paymentDate")}
						onChange={(date) => paymentForm.setValue("paymentDate", date)}
						error={paymentForm.formState.errors.paymentDate?.message}
					/>

					<ModernInput
						label="Notes / Memo (Optional)"
						placeholder="Any additional notes..."
						{...paymentForm.register("notes")}
					/>
				</form>
			</ModernModal>
		</div>
	);
}

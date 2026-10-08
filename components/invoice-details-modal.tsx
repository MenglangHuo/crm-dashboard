"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, paymentsApi, fileUrl } from "@/lib/api/endpoints";
import { Payment, PaymentMethod, CreatePaymentRequest } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Receipt,
	User,
	Zap,
	Printer,
	QrCode,
	DollarSign,
	Copy,
	Check,
	ShieldCheck,
	Package,
	Building2,
	History,
	CheckCircle2,
	Ban,
	RotateCcw,
	FileText,
	Percent,
	TrendingUp,
	AlertTriangle,
	Clock,
	Truck,
	Phone,
	ChevronDown,
	SlidersHorizontal,
	MoreHorizontal,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { VoidInvoiceModal } from "@/components/invoices/void-invoice-modal";
import { RefundInvoiceModal } from "@/components/invoices/refund-invoice-modal";
import { ChangePaymentTermModal } from "@/components/invoices/change-payment-term-modal";
import { useTranslation } from "@/lib/i18n/context";

interface InvoiceDetailsModalProps {
	invoiceId: string | null;
	onClose: () => void;
	onSelectLoanId?: (id: string) => void;
	onOpenPayments?: (id: string | number) => void;
}

function SafeItemImage({ src, alt }: { src?: string; alt: string }) {
	const [error, setError] = useState(false);
	const fullUrl = src ? fileUrl(src) : undefined;

	if (!fullUrl || error) {
		return (
			<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
				<Package className="h-5 w-5" />
			</div>
		);
	}

	return (
		<img
			src={fullUrl}
			alt={alt}
			onError={() => setError(true)}
			className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
		/>
	);
}

export function InvoiceDetailsModal({
	invoiceId,
	onClose,
	onSelectLoanId,
	onOpenPayments,
}: InvoiceDetailsModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { openReceipt, openQuickPay } = useQuickActions();

	const [isPayOpen, setIsPayOpen] = useState(false);
	const [isVoidOpen, setIsVoidOpen] = useState(false);
	const [isRefundOpen, setIsRefundOpen] = useState(false);
	const [isChangeTermOpen, setIsChangeTermOpen] = useState(false);
	const [copiedKey, setCopiedKey] = useState(false);
	const [amountPaid, setAmountPaid] = useState<number>(0);
	const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
	const [paymentDiscountType, setPaymentDiscountType] = useState<
		"FLAT" | "PERCENTAGE"
	>("FLAT");
	const [paymentDiscountReason, setPaymentDiscountReason] = useState("");
	const [showInlineDiscount, setShowInlineDiscount] = useState(false);
	const [paymentMethod, setPaymentMethod] =
		useState<PaymentMethod>("MOBILE_PAYMENT");
	const [referenceNumber, setReferenceNumber] = useState("");
	const [bankAccount, setBankAccount] = useState("");
	const [paymentNotes, setPaymentNotes] = useState("");
	const [idempotencyKey, setIdempotencyKey] = useState<string>("");

	// Fetch Invoice Details
	const { data: details, isLoading: isDetailsLoading } = useQuery({
		queryKey: ["invoice-details", invoiceId],
		queryFn: () =>
			invoiceId
				? financeApi.getInvoiceDetails(invoiceId)
				: Promise.reject("No invoice ID"),
		enabled: !!invoiceId,
	});

	const rawInvoice =
		(details as any)?.data ||
		(details as any)?.invoice ||
		(details?.id ? details : null);

	const company = (rawInvoice as any)?.company || (details as any)?.company;
	const invoice = rawInvoice
		? { ...rawInvoice, company: company || (rawInvoice as any)?.company }
		: null;
	const customer = (details as any)?.customer || invoice?.customer;
	const order = invoice?.order;
	const payments: Payment[] =
		(details as any)?.payments || invoice?.payments || [];

	const items: any[] =
		rawInvoice?.items ||
		rawInvoice?.invoiceItems ||
		(details as any)?.items ||
		(details as any)?.data?.items ||
		[];

	// Calculates financial snapshot metrics
	const invoiceNo =
		invoice?.invoiceNumber ||
		invoice?.invoiceNo ||
		(invoice?.id ? String(invoice.id) : "");
	const subtotal =
		invoice?.subtotal !== undefined && Number(invoice.subtotal) > 0
			? Number(invoice.subtotal)
			: items.reduce(
					(acc, it) =>
						acc + Number(it.quantity || 1) * Number(it.unitPrice || 0),
					0,
				);
	const taxAmount = Number(invoice?.taxAmount || 0);
	const shippingAmount = Number(invoice?.shippingAmount || 0);
	const discountAmount = Number(
		invoice?.discountAmount || invoice?.totalDiscountAmount || 0,
	);
	const totalAmount = Number(invoice?.totalAmount || 0);
	const paymentDiscountAmount = Number(invoice?.paymentDiscountAmount || 0);
	const paidAmount = Number(
		invoice?.paidAmount ||
			payments.reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0),
	);
	const remainingAmount =
		invoice?.remainingAmount !== undefined
			? Number(invoice.remainingAmount)
			: Math.max(0, totalAmount - paidAmount - paymentDiscountAmount);
	const isTerminal =
		invoice?.status === "PAID" ||
		invoice?.status === "CANCELLED" ||
		invoice?.status === "VOID" ||
		invoice?.status === "REFUNDED";

	// Early Payment Discount info
	const earlyPct = Number(
		invoice?.earlyDiscountPct || invoice?.paymentTerm?.discountPercentage || 0,
	);
	const isEarlyEligible =
		invoice?.discountDeadline &&
		earlyPct > 0 &&
		new Date().getTime() <=
			new Date(invoice.discountDeadline).getTime() + 24 * 60 * 60 * 1000;
	const suggestedEarlySavings =
		isEarlyEligible && remainingAmount > 0
			? Math.round(((remainingAmount * earlyPct) / 100) * 100) / 100
			: 0;

	// Payment Mutation
	const paymentMutation = useMutation({
		mutationFn: (payload: CreatePaymentRequest) =>
			paymentsApi.create(payload, idempotencyKey || undefined),
		onSuccess: () => {
			toast.success("Payment recorded successfully!", {
				description: `Collected ${invoice?.currency || "$"}${amountPaid.toLocaleString()} for ${invoiceNo}`,
			});
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({
				queryKey: ["invoice-details", invoiceId],
			});
			queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
			queryClient.invalidateQueries({
				queryKey: ["invoice-payments", invoiceId],
			});
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			setIsPayOpen(false);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openPayDialog = () => {
		if (!invoice || isTerminal) return;
		openQuickPay({
			customerId: String(invoice.customerId || invoice.customer?.id || ""),
			invoiceId: String(invoice.id),
			amount: remainingAmount > 0 ? remainingAmount : totalAmount,
			currency: invoice.currency || "USD",
			invoiceNo: invoiceNo,
		});
	};

	const handleApplyEarlyInline = () => {
		if (!suggestedEarlySavings) return;
		setPaymentDiscount(suggestedEarlySavings);
		setPaymentDiscountType("FLAT");
		setPaymentDiscountReason(
			`${earlyPct}% early payment incentive (${invoice?.paymentTerm?.name || "Term"})`,
		);
		setAmountPaid(Math.max(0, remainingAmount - suggestedEarlySavings));
		setShowInlineDiscount(true);
		toast.success(
			`Applied $${suggestedEarlySavings.toFixed(2)} (${earlyPct}%) early discount!`,
		);
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(true);
		toast.success("Invoice number copied to clipboard");
		setTimeout(() => setCopiedKey(false), 2000);
	};

	const handlePaySubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!invoice) return;

		if (amountPaid <= 0) {
			toast.error("Payment amount must be greater than 0");
			return;
		}

		const effectiveDisc =
			paymentDiscount !== "" && Number(paymentDiscount) > 0
				? paymentDiscountType === "PERCENTAGE"
					? (remainingAmount * Number(paymentDiscount)) / 100
					: Number(paymentDiscount)
				: 0;

		const totalCredit = amountPaid + effectiveDisc;
		if (totalCredit > remainingAmount + 0.001) {
			toast.error(
				`Total payment + discount ($${totalCredit.toFixed(2)}) cannot exceed remaining balance ($${remainingAmount.toFixed(2)})`,
			);
			return;
		}

		const payload: CreatePaymentRequest = {
			invoiceId: invoice.id,
			amount: amountPaid,
			discountAmount: effectiveDisc > 0 ? effectiveDisc : 0,
			discountType: "FLAT",
			discountReason: paymentDiscountReason.trim() || undefined,
			paymentDate: new Date().toISOString(),
			paymentMethod: paymentMethod,
			// status: "COMPLETED",
			referenceNumber: referenceNumber.trim() || undefined,
			bankAccount: bankAccount.trim() || undefined,
			notes: paymentNotes.trim() || undefined,
		};

		paymentMutation.mutate(payload);
	};

	const renderStatusBadge = (status?: string) => {
		const s = String(status || "UNPAID").toUpperCase();
		if (s === "PAID") {
			return (
				<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-1 font-bold text-xs">
					PAID
				</Badge>
			);
		}
		if (s === "PARTIAL_PAYMENT" || s === "PARTIALLY_PAID") {
			return (
				<Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-3 py-1 font-bold text-xs">
					PARTIAL PAYMENT
				</Badge>
			);
		}
		if (s === "REFUNDED") {
			return (
				<Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-3 py-1 font-bold text-xs gap-1">
					<RotateCcw className="h-3 w-3" />
					REFUNDED (Credit Note)
				</Badge>
			);
		}
		if (s === "VOID") {
			return (
				<Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-3 py-1 font-bold text-xs gap-1">
					<Ban className="h-3 w-3" />
					VOID
				</Badge>
			);
		}
		if (s === "CANCELLED") {
			return (
				<Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 px-3 py-1 font-bold text-xs">
					CANCELLED
				</Badge>
			);
		}
		if (s === "UNPAID" || s === "DRAFT") {
			return (
				<Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-3 py-1 font-bold text-xs">
					{s}
				</Badge>
			);
		}
		if (s === "OVERDUE") {
			return (
				<Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-3 py-1 font-bold text-xs">
					OVERDUE
				</Badge>
			);
		}
		return (
			<Badge className="bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 px-3 py-1 font-bold text-xs">
				{s}
			</Badge>
		);
	};

	return (
		<>
			<ModernModal
				isOpen={!!invoiceId}
				onClose={onClose}
				title={
					invoice
						? `${t("sidebar.invoices")} ${invoiceNo}`
						: t("invoices.invoiceDetails")
				}
				subtitle={
					invoice
						? `${t("invoices.issueDate")}: ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "N/A"} • ${t("invoices.dueDate")}: ${
								invoice.dueDate
									? new Date(invoice.dueDate).toLocaleDateString()
									: "N/A"
							}`
						: t("invoices.invoiceDetailsSubtitle")
				}
				icon={
					<Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				}
				size="2xl"
				isLoading={isDetailsLoading}
				loadingText={t("common.loading")}
			>
				{invoice ? (
					<div className="space-y-4 py-1">
						{/* Unified Sleek Header & Actions Strip */}
						<div className="bg-slate-50/90 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
							{/* Left: Invoice Number, Status & Structured Metadata */}
							<div className="flex flex-col gap-1.5 min-w-0">
								<div className="flex items-center gap-2.5 flex-wrap">
									{renderStatusBadge(invoice.status)}
									<span className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
										#{invoiceNo}
										<Button
											size="icon"
											variant="ghost"
											onClick={() => copyToClipboard(invoiceNo)}
											className="h-5 w-5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
											title="Copy Invoice Number"
										>
											{copiedKey ? (
												<Check className="h-3 w-3 text-emerald-500" />
											) : (
												<Copy className="h-3 w-3" />
											)}
										</Button>
									</span>

									{/* Customer Chip */}
									<span className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
										<User className="size-3 text-indigo-500 shrink-0" />
										<span className="truncate max-w-[150px]">
											{customer?.name ||
												(invoice as any).customerName ||
												`Customer #${invoice.customerId}`}
										</span>
										{((customer as any)?.phoneNumber ||
											customer?.phone ||
											(customer as any)?.contact) && (
											<span className="font-mono text-[11px] text-slate-400 font-normal">
												(
												{(customer as any)?.phoneNumber ||
													customer?.phone ||
													(customer as any)?.contact}
												)
											</span>
										)}
									</span>

									{/* Delivery Partner */}
									{(invoice as any)?.delivery?.name && (
										<span className="flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/50">
											<Truck className="size-3 text-sky-500 shrink-0" />
											<span>{(invoice as any).delivery.name}</span>
										</span>
									)}
								</div>

								{/* Sub-line: Payment Term, Due Date, Issuer, Company */}
								<div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
									{/* Payment Term Chip */}
									{invoice.paymentTerm && (
										<span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
											<Clock className="size-3 text-indigo-500 shrink-0" />
											<span>{invoice.paymentTerm.name}</span>
											{invoice.paymentTerm.dueDays !== undefined && (
												<span className="text-[10px] text-slate-400 font-normal">
													(
													{invoice.paymentTerm.dueDays === 0
														? "COD"
														: `Net ${invoice.paymentTerm.dueDays}d`}
													)
												</span>
											)}
										</span>
									)}

									{/* Early Incentive Badge */}
									{invoice.discountDeadline &&
										earlyPct > 0 &&
										isEarlyEligible && (
											<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] py-0 px-1.5 font-mono gap-1">
												<Zap className="size-2.5 fill-current" />
												<span>
													-{earlyPct}% early pay (by{" "}
													{new Date(
														invoice.discountDeadline,
													).toLocaleDateString()}
													)
												</span>
											</Badge>
										)}

									{/* Due Date */}
									{invoice.dueDate && (
										<span className="text-[11px] font-mono flex items-center gap-1">
											<span className="text-slate-400">Due:</span>
											<strong
												className={
													!isTerminal &&
													invoice.status !== "PAID" &&
													new Date(invoice.dueDate).getTime() <
														new Date().getTime()
														? "text-rose-600 dark:text-rose-400 font-bold"
														: "text-slate-700 dark:text-slate-300"
												}
											>
												{new Date(invoice.dueDate).toLocaleDateString()}
											</strong>
										</span>
									)}

									{/* Issuer */}
									{(invoice as any)?.attributes?.issuedByUserName && (
										<span className="text-[11px] text-slate-400">
											• Issued by:{" "}
											<strong className="text-slate-600 dark:text-slate-300">
												{(invoice as any).attributes.issuedByUserName}
											</strong>
										</span>
									)}

									{/* Company */}
									{(company?.name || (invoice as any).companyName) && (
										<span className="text-[11px] text-slate-400">
											• {company?.name || (invoice as any).companyName}
										</span>
									)}
								</div>
							</div>

							{/* Right: Actions Dropdown & Primary Record Payment Button */}
							<div className="flex items-center gap-2 shrink-0">
								{/* Primary Button: Record Payment */}
								{!isTerminal && remainingAmount > 0 && (
									<Button
										size="sm"
										onClick={openPayDialog}
										className="h-8 px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-lg"
									>
										<Zap className="size-3.5 fill-current" />
										<span>{t("invoices.recordPayment")}</span>
									</Button>
								)}

								{/* Actions Dropdown Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												size="sm"
												variant="outline"
												className="h-8 px-2.5 text-xs font-bold gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
											/>
										}
									>
										<SlidersHorizontal className="size-3.5 text-slate-500" />
										<span>Actions</span>
										<ChevronDown className="size-3 text-slate-400" />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-52">
										{onOpenPayments && (
											<DropdownMenuItem
												onClick={() => onOpenPayments(invoice.id)}
												className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300"
											>
												<History className="size-3.5 text-purple-500" />
												<span>{t("invoices.paymentHistory")}</span>
											</DropdownMenuItem>
										)}

										{paidAmount === 0 && !isTerminal && (
											<DropdownMenuItem
												onClick={() => setIsChangeTermOpen(true)}
												className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300"
											>
												<Clock className="size-3.5 text-indigo-500" />
												<span>{t("invoices.changePaymentTerm")}</span>
											</DropdownMenuItem>
										)}

										{paidAmount === 0 &&
											invoice.status !== "VOID" &&
											invoice.status !== "CANCELLED" &&
											invoice.status !== "REFUNDED" && (
												<DropdownMenuItem
													onClick={() => setIsVoidOpen(true)}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
												>
													<Ban className="size-3.5 text-rose-500" />
													<span>{t("invoices.voidInvoice")}</span>
												</DropdownMenuItem>
											)}

										{(paidAmount > 0 ||
											invoice.status === "PAID" ||
											invoice.status === "PARTIAL_PAYMENT") &&
											invoice.status !== "REFUNDED" &&
											invoice.status !== "VOID" &&
											invoice.status !== "CANCELLED" && (
												<DropdownMenuItem
													onClick={() => setIsRefundOpen(true)}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300"
												>
													<RotateCcw className="size-3.5 text-purple-500" />
													<span>{t("invoices.issueCreditNote")}</span>
												</DropdownMenuItem>
											)}

										{/* Print Receipt */}
										<DropdownMenuItem
											onClick={() => {
												const invNo =
													invoice.invoiceNumber ||
													invoice.invoiceNo ||
													`#${invoice.id}`;
												openReceipt({
													invoiceNo: invNo,
													customerName:
														customer?.name || (invoice as any).customerName,
													customerPhone:
														(customer as any)?.phoneNumber ||
														customer?.phone ||
														(customer as any)?.contact,
													customerContact:
														(customer as any)?.contact || customer?.contact,
													customerGender:
														(customer as any)?.gender || customer?.gender,
													amount: invoice.totalAmount,
													currency: invoice.currency || "USD",
													date: invoice.issuedAt
														? new Date(invoice.issuedAt)
																.toISOString()
																.split("T")[0]
														: new Date().toISOString().split("T")[0],
													status: invoice.status || "UNPAID",
													description: invoice.notes || invoice.description,
													invoice: invoice,
												});
											}}
											className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300"
										>
											<Printer className="size-3.5 text-sky-500" />
											<span>{t("invoices.printReceipt")}</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* Compact Credit Note Banner (if Refunded) */}
						{(invoice.status === "REFUNDED" ||
							Boolean(
								invoice.creditNoteNumber ||
									(invoice as any)?.attributes?.creditNoteNumber,
							)) && (
							<div className="bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
								<div className="flex items-center gap-2">
									<Badge className="bg-purple-600 text-white text-[10px] py-0.5">
										{t("invoices.creditNoteIssued")}
									</Badge>
									<span className="font-mono font-bold text-purple-900 dark:text-purple-200">
										{invoice.creditNoteNumber ||
											(invoice as any)?.attributes?.creditNoteNumber ||
											"RET-CREDIT-NOTE"}
									</span>
									{invoice.refundReason && (
										<span className="text-[11px] text-purple-700 dark:text-purple-300">
											({invoice.refundReason})
										</span>
									)}
								</div>
								<div className="flex items-center gap-2 font-mono text-[11px] text-purple-800 dark:text-purple-300">
									<Badge
										variant="outline"
										className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 py-0"
									>
										{invoice.refundMethod || "CASH"}
									</Badge>
									{(invoice.restocked ||
										(invoice as any)?.attributes?.restocked !== false) && (
										<Badge
											variant="outline"
											className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 py-0"
										>
											✓ Restocked
										</Badge>
									)}
								</div>
							</div>
						)}

						{/* Redesigned Line Items Table (Matching User Screenshot Layout) */}
						<div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th className="p-3">{t("invoices.productItem")}</th>
										<th className="p-3 w-20 text-center">
											{t("invoices.unit")}
										</th>
										<th className="p-3 w-20 text-center">
											{t("invoices.qty")}
										</th>
										<th className="p-3 w-24 text-right">
											{t("invoices.unitPrice")}
										</th>
										<th className="p-3 w-24 text-right">
											{t("invoices.discount")}
										</th>
										<th className="p-3 w-28 text-right">
											{t("invoices.lineTotal")}
										</th>
										<th className="p-3 w-32 text-center">
											{t("invoices.stockVerification")}
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{items.length > 0 ? (
										items.map((item: any, idx: number) => {
											const qty = Number(item.quantity) || 1;
											const price = Number(item.unitPrice) || 0;
											const disc =
												Number(item.discount || item.lineDiscountAmount) || 0;
											const total =
												Number(item.totalAmount || item.totalPrice) ||
												qty * price;

											return (
												<tr
													key={item.id || idx}
													className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
												>
													{/* Product Thumbnail & Details */}
													<td className="p-3">
														<div className="flex items-center gap-3">
															<SafeItemImage
																src={
																	(item as any).imageUrl ||
																	(item as any).productImageUrl
																}
																alt={item.productName || "Product"}
															/>
															<div className="min-w-0">
																<div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
																	{item.productName ||
																		item.description ||
																		`Item #${item.id}`}
																</div>
																<div className="text-[11px] font-mono text-slate-400">
																	SKU:{" "}
																	<strong className="text-slate-600 dark:text-slate-300">
																		{item.sku || "—"}
																	</strong>
																</div>
															</div>
														</div>
													</td>

													{/* Unit */}
													<td className="p-3 text-center font-medium text-slate-600 dark:text-slate-400">
														<Badge
															variant="secondary"
															className="text-[10px] px-1.5 py-0 font-mono"
														>
															{item.unitName || "Box"}
														</Badge>
													</td>

													{/* Quantity */}
													<td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
														{qty}
													</td>

													{/* Unit Price */}
													<td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
														$
														{price.toLocaleString(undefined, {
															minimumFractionDigits: 2,
														})}
													</td>

													{/* Discount */}
													<td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
														{disc > 0 ? (
															<span>
																{item.discountType === "PERCENTAGE"
																	? `${disc}%`
																	: `-$${disc.toFixed(2)}`}
															</span>
														) : (
															<span className="text-slate-400">—</span>
														)}
													</td>

													{/* Line Total */}
													<td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
														$
														{total.toLocaleString(undefined, {
															minimumFractionDigits: 2,
														})}
													</td>

													{/* Stock Verification Status Badge */}
													<td className="p-3 text-center">
														<Badge className="bg-emerald-600 text-white text-[10px] gap-1 py-0.5">
															<CheckCircle2 className="h-3 w-3" />{" "}
															{t("invoices.verified")} ({qty})
														</Badge>
													</td>
												</tr>
											);
										})
									) : (
										<tr>
											<td
												colSpan={7}
												className="p-8 text-center text-slate-400 text-xs"
											>
												{t("invoices.noPaymentsRecorded")}
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Bottom Financial Breakdown & Notes Summary Card (Matching User Screenshot Layout) */}
						<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-start gap-4 text-xs">
							{/* Left Side: Notes & Order Reference */}
							<div className="space-y-1.5 max-w-md">
								<div className="text-slate-500">
									{t("invoices.customerNote")}:{" "}
									<span className="text-slate-800 dark:text-slate-200 font-medium">
										{invoice.customerNote || invoice.notes || "—"}
									</span>
								</div>
								<div className="text-slate-500">
									{t("invoices.internalNote")}:{" "}
									<span className="text-slate-800 dark:text-slate-200 font-medium">
										{invoice.internalNote || invoice.description || "—"}
									</span>
								</div>
								{order && (order.orderNumber || order.orderNo || order.id) && (
									<div className="text-slate-500 pt-1 text-[11px]">
										{t("invoices.salesOrderRef")}:{" "}
										<strong className="font-mono text-indigo-600 dark:text-indigo-400">
											{order.orderNumber || order.orderNo || `ORD-${order.id}`}
										</strong>
									</div>
								)}
							</div>

							{/* Right Side: Totals, Paid, Remaining Balance */}
							<div className="space-y-1.5 text-right min-w-[240px]">
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>
										{t("invoices.subtotal")} ({items.length} {t("orders.items")}
										):
									</span>
									<span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
										$
										{subtotal.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>

								{discountAmount > 0 && (
									<div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
										<span>{t("invoices.discount")} (Sales):</span>
										<span className="font-mono">
											-$
											{discountAmount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								{paymentDiscountAmount > 0 && (
									<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
										<span>Cash Discount (Settlement):</span>
										<span className="font-mono">
											-$
											{paymentDiscountAmount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								{(taxAmount > 0 || shippingAmount > 0) && (
									<div className="flex justify-between text-slate-600 dark:text-slate-400">
										<span>
											{t("invoices.tax")} & {t("orders.shippingFee")}:
										</span>
										<span className="font-mono">
											+$
											{(taxAmount + shippingAmount).toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								<div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
									<span>{t("invoices.grandTotal")}:</span>
									<span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
										$
										{totalAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>

								<div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
									<span>{t("invoices.amountPaid")}:</span>
									<span className="font-mono">
										$
										{paidAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>

								<div
									className={`flex justify-between text-xs font-black ${remainingAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}`}
								>
									<span>{t("invoices.remainingOutstanding")}:</span>
									<span className="font-mono">
										$
										{remainingAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}
									</span>
								</div>

								{((invoice as any).totalCogs !== undefined ||
									invoice.grossProfit !== undefined) && (
									<div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-col gap-1 text-[11px] text-slate-500">
										<div className="flex justify-between">
											<span>{t("invoices.totalCogs")}:</span>
											<span className="font-mono">
												$
												{Number((invoice as any).totalCogs || 0).toLocaleString(
													undefined,
													{ minimumFractionDigits: 2 },
												)}
											</span>
										</div>
										<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
											<span className="flex items-center gap-1">
												<TrendingUp className="h-3 w-3" />{" "}
												{t("invoices.grossProfit")}:
											</span>
											<span className="font-mono">
												$
												{Number(
													invoice.grossProfit ||
														totalAmount -
															Number((invoice as any).totalCogs || 0),
												).toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
												{totalAmount > 0 && (
													<span className="ml-1 text-[10px] text-emerald-500 font-normal">
														(
														{(
															(Number(
																invoice.grossProfit ||
																	totalAmount -
																		Number((invoice as any).totalCogs || 0),
															) /
																totalAmount) *
															100
														).toFixed(1)}
														%)
													</span>
												)}
											</span>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="p-12 text-center text-slate-500 font-medium">
						{t("invoices.noPaymentsRecorded")}
					</div>
				)}
			</ModernModal>

			{/* Record Payment Dialog */}
			<ModernModal
				isOpen={isPayOpen}
				onClose={() => setIsPayOpen(false)}
				title={`${t("invoices.recordPayment")}: ${invoiceNo}`}
				subtitle={`${t("invoices.balanceDue")}: $${remainingAmount.toFixed(2)}`}
				icon={<Zap className="h-5 w-5 text-emerald-500 fill-current" />}
				size="md"
				isLoading={paymentMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsPayOpen(false)} />
						<ModernModalSubmitButton
							onClick={() => handlePaySubmit()}
							isLoading={paymentMutation.isPending}
						>
							{t("invoices.confirmAndSubmitPayment")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form onSubmit={handlePaySubmit} className="space-y-4 py-1 text-xs">
					{/* Early Payment Discount Callout */}
					{isEarlyEligible && suggestedEarlySavings > 0 && (
						<div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-2">
							<div className="text-emerald-800 dark:text-emerald-300">
								<span className="font-bold block">
									💡 Early Cash Discount Available!
								</span>
								<span className="text-[11px]">
									Save {earlyPct}% (${suggestedEarlySavings.toFixed(2)}) if
									settled today.
								</span>
							</div>
							<Button
								type="button"
								size="sm"
								onClick={handleApplyEarlyInline}
								className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 font-bold shadow-xs shrink-0"
							>
								Apply (-${suggestedEarlySavings.toFixed(2)})
							</Button>
						</div>
					)}

					<div className="space-y-1">
						<label className="font-bold text-slate-700 dark:text-slate-300 block">
							{t("invoices.paymentAmount")} ($ Cash Collected)
						</label>
						<ModernInput
							type="number"
							step="0.01"
							max={remainingAmount}
							value={amountPaid}
							onChange={(e) => setAmountPaid(Number(e.target.value))}
							placeholder="Enter amount"
							required
						/>
					</div>

					{/* Optional Discount / Write-Off Section */}
					<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3 space-y-2">
						<div
							className="flex items-center justify-between cursor-pointer select-none text-slate-700 dark:text-slate-300 font-bold"
							onClick={() => setShowInlineDiscount(!showInlineDiscount)}
						>
							<div className="flex items-center gap-1.5">
								<Percent className="size-3.5 text-indigo-500" />
								<span>Cash Discount / Settlement Write-Off</span>
								{paymentDiscount !== "" && Number(paymentDiscount) > 0 && (
									<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] font-mono">
										-$
										{paymentDiscountType === "PERCENTAGE"
											? `${paymentDiscount}%`
											: `$${Number(paymentDiscount).toFixed(2)}`}
									</Badge>
								)}
							</div>
							<span className="text-slate-400 text-xs">
								{showInlineDiscount ? "▲" : "▼"}
							</span>
						</div>

						{showInlineDiscount && (
							<div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
								<div className="flex items-center gap-2">
									<ModernInput
										label="Discount Amount"
										type="number"
										step="0.01"
										min="0"
										placeholder="0.00"
										value={paymentDiscount}
										onChange={(e) =>
											setPaymentDiscount(
												e.target.value === "" ? "" : Number(e.target.value),
											)
										}
										containerClassName="flex-1"
										className="font-mono"
									/>
									<ModernSelect
										label="Type"
										options={[
											{ value: "FLAT", label: "$ FLAT" },
											{ value: "PERCENTAGE", label: "% PERCENT" },
										]}
										value={paymentDiscountType}
										onChange={(val: any) => setPaymentDiscountType(val)}
										containerClassName="w-28"
									/>
								</div>
								<ModernInput
									label="Discount Memo / Reason"
									placeholder="e.g. 2% early payment incentive, round-off"
									value={paymentDiscountReason}
									onChange={(e) => setPaymentDiscountReason(e.target.value)}
								/>
							</div>
						)}
					</div>

					<div className="space-y-1">
						<label className="font-bold text-slate-700 dark:text-slate-300 block">
							{t("invoices.paymentMethod")}
						</label>
						<ModernSelect
							value={paymentMethod}
							onChange={(val) =>
								setPaymentMethod(
									(typeof val === "string"
										? val
										: (val as any).target?.value) as PaymentMethod,
								)
							}
						>
							<option value="MOBILE_PAYMENT">ABA Mobile / KHQR</option>
							<option value="CASH">Cash</option>
							<option value="BANK_TRANSFER">Bank Wire Transfer</option>
							<option value="CHEQUE">Cheque</option>
						</ModernSelect>
					</div>

					<div className="space-y-1">
						<label className="font-bold text-slate-700 dark:text-slate-300 block">
							{t("invoices.referenceNumber")} (
							{t("common.optional") || "Optional"})
						</label>
						<ModernInput
							value={referenceNumber}
							onChange={(e) => setReferenceNumber(e.target.value)}
							placeholder="e.g. ABA Transaction Ref #123456"
						/>
					</div>

					<div className="space-y-1">
						<label className="font-bold text-slate-700 dark:text-slate-300 block">
							{t("invoices.notesDescription")}
						</label>
						<ModernTextarea
							value={paymentNotes}
							onChange={(e) => setPaymentNotes(e.target.value)}
							placeholder="Payment description or settlement notes..."
							rows={2}
						/>
					</div>
				</form>
			</ModernModal>

			{/* Void Invoice Dialog */}
			<VoidInvoiceModal
				invoice={invoice || null}
				open={isVoidOpen}
				onOpenChange={setIsVoidOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
					queryClient.invalidateQueries({
						queryKey: ["invoice-details", invoiceId],
					});
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({
						queryKey: ["invoice-payments-modal"],
					});
				}}
			/>

			{/* Credit Note / Refund Dialog */}
			<RefundInvoiceModal
				invoice={invoice || null}
				open={isRefundOpen}
				onOpenChange={setIsRefundOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
					queryClient.invalidateQueries({
						queryKey: ["invoice-details", invoiceId],
					});
					queryClient.invalidateQueries({
						queryKey: ["invoice-payments", invoiceId],
					});
					queryClient.invalidateQueries({
						queryKey: ["invoice-payments-modal"],
					});
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["payments"] });
				}}
			/>

			{/* Change Payment Term Dialog */}
			<ChangePaymentTermModal
				invoice={invoice || null}
				open={isChangeTermOpen}
				onOpenChange={setIsChangeTermOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
					queryClient.invalidateQueries({
						queryKey: ["invoice-details", invoiceId],
					});
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({
						queryKey: ["invoice-payments-modal"],
					});
				}}
			/>
		</>
	);
}

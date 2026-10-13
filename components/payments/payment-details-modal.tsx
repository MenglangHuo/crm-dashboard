"use client";

import React, { useState } from "react";
import { Payment } from "@/lib/types";
import {
	ModernDrawer,
	ModernDrawerFooter,
	ModernDrawerCancelButton,
} from "@/components/ui-custom/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CreditCard,
	FileText,
	User,
	Calendar,
	DollarSign,
	ShieldCheck,
	AlertTriangle,
	Clock,
	CheckCircle2,
	Building2,
	Receipt,
	ExternalLink,
	Copy,
	Check,
	FileCheck2,
	Wallet,
	Banknote,
	Eye,
	X,
	Maximize2,
	MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import { toast } from "sonner";
import { fileUrl } from "@/lib/api/endpoints";

export interface PaymentDetailsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	payment: Payment | null;
	onReconcileSingle?: (payment: Payment) => void;
	/** Optional drawer placement override (defaults to 'right') */
	placement?: "left" | "right" | "top" | "bottom";
	/** Optional dynamic width override (defaults to '50%') */
	width?: string | number;
}

export function PaymentDetailsDrawer({
	open,
	onOpenChange,
	payment,
	onReconcileSingle,
	placement = "right",
	width = "50%",
}: PaymentDetailsDrawerProps) {
	const { t } = useTranslation();
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
	const [imageError, setImageError] = useState(false);

	if (!payment) return null;

	const amount = Number(payment.amount || payment.amountPaid || 0);
	const discount = Number(payment.discountAmount || 0);
	const totalSettled = amount + discount;
	const currency = payment.paymentCurrency || "USD";
	const paymentNumber = payment.paymentNumber || `PAY-${payment.id}`;
	const refNumber = payment.referenceNumber || payment.reference;

	// Resolve receipt URL
	const rawReceiptUrl = payment.receiptUrl?.trim();
	const resolvedReceiptUrl = rawReceiptUrl
		? fileUrl(rawReceiptUrl) || rawReceiptUrl
		: undefined;
	const receiptFileName = rawReceiptUrl
		? rawReceiptUrl.split("/").pop() || "Receipt Attachment"
		: "";

	// Resolve Customer & Invoice metadata
	const customerName =
		(payment.invoice as any)?.customer?.name ||
		(payment as any)?.customer?.name ||
		(payment.invoice as any)?.customerName ||
		(payment as any)?.customerName ||
		null;

	const invoiceDisplayNumber =
		payment.invoice?.invoiceNumber ||
		(payment.invoice as any)?.invoiceNo ||
		(payment.invoiceId ? `Invoice #${payment.invoiceId}` : null);

	// Resolve Cashier / Collected By (prioritize receivedBy.username)
	const cashierName =
		typeof payment.receivedBy === "object" && payment.receivedBy !== null
			? (payment.receivedBy as any).username ||
			  (payment.receivedBy as any).fullName ||
			  (payment.receivedBy as any).name ||
			  ((payment.receivedBy as any).id
					? `User #${(payment.receivedBy as any).id}`
					: null)
			: payment.receivedBy
				? String(payment.receivedBy)
				: null;

	const copyToClipboard = (text: string, fieldId: string) => {
		navigator.clipboard.writeText(text);
		setCopiedField(fieldId);
		toast.success(t("common.copied", "Copied to clipboard"));
		setTimeout(() => setCopiedField(null), 2000);
	};

	// Payment Method Icon Helper
	const getMethodIcon = (method?: string) => {
		const m = (method || "").toUpperCase();
		if (m.includes("BANK") || m.includes("TRANSFER")) {
			return <Building2 className="size-4 text-sky-500" />;
		}
		if (m.includes("CARD")) {
			return <CreditCard className="size-4 text-purple-500" />;
		}
		if (m.includes("CASH")) {
			return <Banknote className="size-4 text-emerald-500" />;
		}
		if (m.includes("CHEQUE") || m.includes("CHECK")) {
			return <FileCheck2 className="size-4 text-amber-500" />;
		}
		return <Wallet className="size-4 text-primary" />;
	};

	// Status Badge Component
	const renderStatusBadge = () => {
		const status = (payment.status || "COMPLETED").toUpperCase();
		if (status === "COMPLETED" || status === "SUCCESS") {
			return (
				<Badge
					variant="outline"
					className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-xs px-2.5 py-0.5 gap-1.5 inline-flex items-center"
				>
					<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
					{payment.status || "COMPLETED"}
				</Badge>
			);
		}
		if (status === "PENDING") {
			return (
				<Badge
					variant="outline"
					className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold text-xs px-2.5 py-0.5 gap-1.5 inline-flex items-center"
				>
					<span className="size-1.5 rounded-full bg-amber-500" />
					{payment.status || "PENDING"}
				</Badge>
			);
		}
		return (
			<Badge
				variant="outline"
				className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-semibold text-xs px-2.5 py-0.5 gap-1.5 inline-flex items-center"
			>
				<span className="size-1.5 rounded-full bg-rose-500" />
				{payment.status || "FAILED"}
			</Badge>
		);
	};

	return (
		<>
			<ModernDrawer
				open={open}
				onOpenChange={onOpenChange}
				placement={placement}
				width={width}
				resizable={true}
				allowExpand={true}
				icon={<Receipt className="size-5 text-primary" />}
				title={
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight text-base sm:text-lg">
							{paymentNumber}
						</span>
						<button
							type="button"
							onClick={() => copyToClipboard(paymentNumber, "payNo")}
							className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
							title="Copy payment number"
						>
							{copiedField === "payNo" ? (
								<Check className="size-3.5 text-emerald-600" />
							) : (
								<Copy className="size-3.5" />
							)}
						</button>
						{renderStatusBadge()}
					</div>
				}
				subtitle={
					<span className="text-xs text-muted-foreground">
						{payment.paymentDate
							? `Recorded on ${new Date(payment.paymentDate).toLocaleDateString(undefined, {
									dateStyle: "long",
								})}`
							: "Payment details & bank reconciliation audit"}
					</span>
				}
				footer={
					<ModernDrawerFooter>
						<ModernDrawerCancelButton
							label={t("common.close", "Close")}
							onClick={() => onOpenChange(false)}
						/>
						{payment.reconciliationStatus !== "RECONCILED" && onReconcileSingle && (
							<Button
								type="button"
								onClick={() => {
									onOpenChange(false);
									onReconcileSingle(payment);
								}}
								className="rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-5 h-10 inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
							>
								<ShieldCheck className="size-4" />
								<span>Reconcile Payment</span>
							</Button>
						)}
					</ModernDrawerFooter>
				}
			>
				<div className="space-y-5 pb-4">
					{/* Net Payment Amount Hero Card */}
					<div className="relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/90 p-5 shadow-xs">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div>
								<div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									<Wallet className="size-3.5 text-primary" />
									<span>Net Payment Amount</span>
								</div>
								<div className="mt-1 flex items-baseline gap-2">
									<span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
										${amount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
									<span className="text-xs font-semibold text-muted-foreground uppercase">
										{currency}
									</span>
								</div>

								{/* Early Payment Discount Callout */}
								{discount > 0 && (
									<div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
										<CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
										<span>
											Includes ${discount.toFixed(2)} Early Payment Discount (Total settled: ${totalSettled.toFixed(2)})
										</span>
									</div>
								)}

								{/* Outstanding Balance Note if present */}
								{payment.outstandingBalance !== undefined && payment.outstandingBalance > 0 && (
									<div className="mt-1.5 text-[11px] text-muted-foreground font-medium">
										Invoice remaining balance: ${payment.outstandingBalance.toFixed(2)}
									</div>
								)}
							</div>

							{/* Reconciliation Status Pill */}
							<div className="flex flex-col sm:items-end gap-1.5 shrink-0">
								<span className="text-xs font-medium text-muted-foreground">
									Reconciliation Status
								</span>
								<Badge
									variant="outline"
									className={
										payment.reconciliationStatus === "RECONCILED"
											? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 font-semibold text-xs flex items-center gap-1.5"
											: payment.reconciliationStatus === "EXCEPTION"
												? "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-3 py-1 font-semibold text-xs flex items-center gap-1.5"
												: "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-3 py-1 font-semibold text-xs flex items-center gap-1.5"
									}
								>
									{payment.reconciliationStatus === "RECONCILED" ? (
										<CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
									) : payment.reconciliationStatus === "EXCEPTION" ? (
										<AlertTriangle className="size-3.5 text-rose-600 dark:text-rose-400" />
									) : (
										<Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
									)}
									<span>{payment.reconciliationStatus || "PENDING"}</span>
								</Badge>
							</div>
						</div>
					</div>

					{/* Primary Transaction Attributes */}
					<div>
						<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
							<DollarSign className="size-3.5 text-primary" />
							<span>Transaction Information</span>
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
							{/* Payment Method */}
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-1">
								<span className="text-muted-foreground font-medium flex items-center gap-1.5">
									{getMethodIcon(payment.paymentMethod)}
									<span>Payment Method</span>
								</span>
								<p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
									{payment.paymentMethod || "CASH"}
								</p>
								{payment.bankAccount && (
									<p className="text-[11px] text-muted-foreground font-mono truncate">
										Acc: {payment.bankAccount}
									</p>
								)}
							</div>

							{/* Payment Date */}
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-1">
								<span className="text-muted-foreground font-medium flex items-center gap-1.5">
									<Calendar className="size-3.5 text-primary" />
									<span>Payment Date</span>
								</span>
								<p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
									{payment.paymentDate
										? new Date(payment.paymentDate).toLocaleDateString(undefined, {
												year: "numeric",
												month: "short",
												day: "numeric",
											})
										: "—"}
								</p>
								{payment.paymentDate && (
									<p className="text-[11px] text-muted-foreground">
										{new Date(payment.paymentDate).toLocaleTimeString(undefined, {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								)}
							</div>

							{/* Reference ID */}
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-1">
								<span className="text-muted-foreground font-medium flex items-center gap-1.5">
									<FileCheck2 className="size-3.5 text-primary" />
									<span>Reference / Transaction ID</span>
								</span>
								<div className="flex items-center justify-between gap-2">
									<p className="font-mono font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
										{refNumber || "None specified"}
									</p>
									{refNumber && (
										<button
											type="button"
											onClick={() => copyToClipboard(refNumber, "refNo")}
											className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
											title="Copy reference number"
										>
											{copiedField === "refNo" ? (
												<Check className="size-3 text-emerald-600" />
											) : (
												<Copy className="size-3" />
											)}
										</button>
									)}
								</div>
							</div>

							{/* Associated Invoice */}
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-1">
								<span className="text-muted-foreground font-medium flex items-center gap-1.5">
									<FileText className="size-3.5 text-primary" />
									<span>Associated Invoice</span>
								</span>
								<div className="flex items-center justify-between gap-2">
									<span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
										{invoiceDisplayNumber || "Unallocated"}
									</span>
									{payment.invoiceId && (
										<Link
											href={`/invoices?invoiceId=${payment.invoiceId}`}
											className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
										>
											<span>View</span>
											<ExternalLink className="size-3" />
										</Link>
									)}
								</div>
							</div>

							{/* Customer (if available) */}
							{customerName && (
								<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs space-y-1 sm:col-span-2">
									<span className="text-muted-foreground font-medium flex items-center gap-1.5">
										<User className="size-3.5 text-primary" />
										<span>Customer</span>
									</span>
									<p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
										{customerName}
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Bank Reconciliation Section */}
					<div className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-3.5 text-xs">
						<div className="flex items-center justify-between">
							<h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<ShieldCheck className="size-4 text-primary" />
								<span>Bank Reconciliation Audit</span>
							</h4>
							<span className="text-[11px] text-muted-foreground font-mono">
								{payment.reconciliationStatus === "RECONCILED" ? "Verified" : "Unverified"}
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
							<div>
								<span className="text-muted-foreground font-medium">Statement Reference:</span>
								<div className="flex items-center gap-2 mt-0.5">
									<p className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
										{payment.reconciliationReference || "No statement reference recorded"}
									</p>
									{payment.reconciliationReference && (
										<button
											type="button"
											onClick={() => copyToClipboard(payment.reconciliationReference!, "stmtRef")}
											className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
											title="Copy reference"
										>
											{copiedField === "stmtRef" ? (
												<Check className="size-3 text-emerald-600" />
											) : (
												<Copy className="size-3" />
											)}
										</button>
									)}
								</div>
							</div>

							<div>
								<span className="text-muted-foreground font-medium">Reconciled At:</span>
								<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
									{payment.reconciledAt
										? new Date(payment.reconciledAt).toLocaleString(undefined, {
												dateStyle: "medium",
												timeStyle: "short",
											})
										: "Pending verification"}
								</p>
							</div>

							{payment.reconciledBy && (
								<div>
									<span className="text-muted-foreground font-medium">Reconciled By Auditor:</span>
									<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
										<User className="size-3.5 text-slate-400" />
										<span>
											{(payment.reconciledBy as any).fullName ||
												(payment.reconciledBy as any).username ||
												`User #${(payment.reconciledBy as any).id}`}
										</span>
									</p>
								</div>
							)}

							{cashierName && (
								<div>
									<span className="text-muted-foreground font-medium">Cashier / Collected By:</span>
									<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
										<User className="size-3.5 text-slate-400" />
										<span>{cashierName}</span>
									</p>
								</div>
							)}
						</div>

						{payment.reconciliationNote && (
							<div className="pt-2 border-t border-slate-100 dark:border-slate-800">
								<span className="text-muted-foreground font-medium">Auditor Note:</span>
								<p className="p-3 mt-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200/60 dark:border-slate-700/60">
									{payment.reconciliationNote}
								</p>
							</div>
						)}
					</div>

					{/* Payment Notes */}
					{payment.notes && (
						<div className="space-y-1.5 text-xs">
							<span className="text-muted-foreground font-medium flex items-center gap-1.5">
								<MessageSquare className="size-3.5 text-primary" />
								<span>Payment Notes & Remarks</span>
							</span>
							<p className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 leading-relaxed">
								{payment.notes}
							</p>
						</div>
					)}

					{/* Payment Attachment / Slip (Prominent Big Display at Bottom of Drawer) */}
					{resolvedReceiptUrl && (
						<div className="relative group overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 shadow-xs">
							<div
								onClick={() => setPreviewImageModal(resolvedReceiptUrl)}
								className="relative w-full h-64 sm:h-80 flex items-center justify-center overflow-hidden bg-slate-950/5 dark:bg-black/40 cursor-pointer"
								title="Click to view full preview"
							>
								{!imageError ? (
									<img
										src={resolvedReceiptUrl}
										alt="Payment Slip / Receipt"
										onError={() => setImageError(true)}
										className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.02]"
									/>
								) : (
									<div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
										<FileText className="size-10 text-slate-400" />
										<span className="text-xs font-medium">Attachment document</span>
									</div>
								)}

								{/* Floating Quick Action Buttons */}
								<div className="absolute top-3 right-3 flex items-center gap-2 z-10">
									<Button
										type="button"
										size="sm"
										onClick={(e) => {
											e.stopPropagation();
											setPreviewImageModal(resolvedReceiptUrl);
										}}
										className="h-8 px-3 text-xs gap-1.5 font-medium rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white dark:bg-slate-800/90 dark:hover:bg-slate-800 backdrop-blur-md shadow-md cursor-pointer transition-all hover:scale-105"
									>
										<Eye className="size-3.5" />
										<span>Preview</span>
									</Button>

									<a
										href={resolvedReceiptUrl}
										target="_blank"
										rel="noopener noreferrer"
										onClick={(e) => e.stopPropagation()}
										className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-xl bg-white/95 hover:bg-white text-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:text-slate-100 backdrop-blur-md shadow-md border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-105"
										title="Open in new tab"
									>
										<ExternalLink className="size-3.5" />
										<span>Open in New Tab</span>
									</a>
								</div>

								{/* Subtle Hover Enlarge Affordance */}
								<div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
									<div className="bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg">
										<Maximize2 className="size-3.5" />
										<span>Click to enlarge</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</ModernDrawer>

			{/* Full-Screen Receipt Preview Lightbox Modal */}
			{previewImageModal && (
				<div
					onClick={() => setPreviewImageModal(null)}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
				>
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 text-white rounded-2xl overflow-hidden p-3 shadow-2xl border border-slate-800 flex flex-col"
					>
						<div className="flex items-center justify-between px-2 pb-2.5 border-b border-slate-800">
							<div className="flex items-center gap-2 min-w-0">
								<Receipt className="size-4 text-primary shrink-0" />
								<span className="text-xs font-semibold truncate text-slate-200">
									{receiptFileName || "Payment Receipt"}
								</span>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<a
									href={previewImageModal}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
								>
									<ExternalLink className="size-3.5" />
									<span>Open Original</span>
								</a>
								<button
									type="button"
									onClick={() => setPreviewImageModal(null)}
									className="size-7 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
									title="Close preview"
								>
									<X className="size-4" />
								</button>
							</div>
						</div>
						<div className="pt-3 flex-1 flex items-center justify-center overflow-auto min-h-0">
							<img
								src={previewImageModal}
								alt="Payment Receipt Preview"
								className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain mx-auto shadow-md"
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

/**
 * Backwards compatibility alias
 */
export const PaymentDetailsModal = PaymentDetailsDrawer;
export type PaymentDetailsModalProps = PaymentDetailsDrawerProps;

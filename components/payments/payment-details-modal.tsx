"use client";

import React from "react";
import { Payment } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
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
	Link as LinkIcon,
	ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

interface PaymentDetailsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	payment: Payment | null;
	onReconcileSingle?: (payment: Payment) => void;
}

export function PaymentDetailsModal({
	open,
	onOpenChange,
	payment,
	onReconcileSingle,
}: PaymentDetailsModalProps) {
	const { t } = useTranslation();

	if (!payment) return null;

	const amount = Number(payment.amount || payment.amountPaid || 0);
	const discount = Number(payment.discountAmount || 0);
	const totalSettled = amount + discount;

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			title={
				<div className="flex items-center gap-2.5">
					<span>Payment {payment.paymentNumber || `#${payment.id}`}</span>
					<Badge
						variant="outline"
						className={
							payment.status === "COMPLETED"
								? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
								: "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
						}
					>
						{payment.status || "COMPLETED"}
					</Badge>
				</div>
			}
			subtitle="Full transaction breakdown and reconciliation evidence"
			icon={<Receipt className="h-5 w-5 text-primary" />}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						label="Close"
						onClick={() => onOpenChange(false)}
					/>
					{payment.reconciliationStatus !== "RECONCILED" && onReconcileSingle && (
						<button
							type="button"
							onClick={() => {
								onOpenChange(false);
								onReconcileSingle(payment);
							}}
							className="rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-5 h-11 inline-flex items-center justify-center gap-2 shadow-sm transition-all"
						>
							<ShieldCheck className="size-4" />
							<span>Reconcile Payment</span>
						</button>
					)}
				</ModernModalFooter>
			}
		>
			<div className="space-y-5 py-1">
				{/* Top Amount Banner */}
				<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Net Payment Amount
						</p>
						<p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
							${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</p>
						{discount > 0 && (
							<p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
								Includes ${discount.toFixed(2)} Early Payment Discount (Settled: ${totalSettled.toFixed(2)})
							</p>
						)}
					</div>

					<div className="flex flex-col items-start sm:items-end gap-1.5">
						<span className="text-xs text-muted-foreground">Reconciliation Status</span>
						<Badge
							variant="outline"
							className={
								payment.reconciliationStatus === "RECONCILED"
									? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1 font-semibold text-xs"
									: payment.reconciliationStatus === "EXCEPTION"
										? "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-3 py-1 font-semibold text-xs"
										: "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-3 py-1 font-semibold text-xs"
							}
						>
							{payment.reconciliationStatus === "RECONCILED" ? (
								<CheckCircle2 className="size-3.5 mr-1" />
							) : payment.reconciliationStatus === "EXCEPTION" ? (
								<AlertTriangle className="size-3.5 mr-1" />
							) : (
								<Clock className="size-3.5 mr-1" />
							)}
							{payment.reconciliationStatus || "PENDING"}
						</Badge>
					</div>
				</div>

				{/* Primary Attributes Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
					<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
						<span className="text-muted-foreground font-medium">Payment Method</span>
						<p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
							<CreditCard className="size-3.5 text-primary" />
							<span>{payment.paymentMethod || "CASH"}</span>
						</p>
					</div>

					<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
						<span className="text-muted-foreground font-medium">Payment Date</span>
						<p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
							<Calendar className="size-3.5 text-primary" />
							<span>
								{payment.paymentDate
									? new Date(payment.paymentDate).toLocaleDateString()
									: "N/A"}
							</span>
						</p>
					</div>

					<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
						<span className="text-muted-foreground font-medium">Reference / Transaction ID</span>
						<p className="font-semibold font-mono text-slate-900 dark:text-slate-100">
							{payment.referenceNumber || payment.reference || "None specified"}
						</p>
					</div>

					<div className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-1">
						<span className="text-muted-foreground font-medium">Associated Invoice</span>
						<p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
							<span>
								{payment.invoice?.invoiceNumber || (payment.invoiceId ? `Invoice #${payment.invoiceId}` : "Unallocated")}
							</span>
							{payment.invoiceId && (
								<Link
									href={`/invoices?invoiceId=${payment.invoiceId}`}
									className="text-primary hover:underline inline-flex items-center gap-1 font-normal"
								>
									<span>View</span>
									<ExternalLink className="size-3" />
								</Link>
							)}
						</p>
					</div>
				</div>

				{/* Reconciliation Details Section */}
				<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60 shadow-xs text-xs">
					<h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
						<ShieldCheck className="size-4 text-primary" />
						<span>Bank Reconciliation Evidence</span>
					</h4>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<span className="text-muted-foreground">Reconciliation Reference:</span>
							<p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
								{payment.reconciliationReference || "No statement reference recorded"}
							</p>
						</div>

						<div>
							<span className="text-muted-foreground">Reconciled At:</span>
							<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
								{payment.reconciledAt
									? new Date(payment.reconciledAt).toLocaleString()
									: "Pending reconciliation"}
							</p>
						</div>

						{payment.reconciledBy && (
							<div>
								<span className="text-muted-foreground">Reconciled By Auditor:</span>
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

						{payment.receivedBy && (
							<div>
								<span className="text-muted-foreground">Cashier / Recorded By:</span>
								<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
									<User className="size-3.5 text-slate-400" />
									<span>
										{typeof payment.receivedBy === "object"
											? payment.receivedBy.name || `User #${payment.receivedBy.id}`
											: String(payment.receivedBy)}
									</span>
								</p>
							</div>
						)}
					</div>

					{payment.reconciliationNote && (
						<div className="pt-2 border-t border-slate-100 dark:border-slate-800">
							<span className="text-muted-foreground">Reconciliation Note:</span>
							<p className="p-2.5 mt-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 leading-relaxed">
								{payment.reconciliationNote}
							</p>
						</div>
					)}
				</div>

				{/* General Notes */}
				{payment.notes && (
					<div className="space-y-1 text-xs">
						<span className="text-muted-foreground font-medium">Payment Notes:</span>
						<p className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300">
							{payment.notes}
						</p>
					</div>
				)}
			</div>
		</ModernModal>
	);
}

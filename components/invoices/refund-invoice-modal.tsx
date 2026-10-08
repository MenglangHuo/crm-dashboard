"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Invoice,
	InvoiceRefundMethod,
	RefundInvoiceRequest,
} from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernSelect,
	ModernTextarea,
	ModernCheckbox,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import {
	RotateCcw,
	FileText,
	DollarSign,
	PackageCheck,
	AlertOctagon,
	CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface RefundInvoiceModalProps {
	invoice: Invoice | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function RefundInvoiceModal({
	invoice,
	open,
	onOpenChange,
	onSuccess,
}: RefundInvoiceModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [reason, setReason] = useState<string>("");
	const [refundMethod, setRefundMethod] = useState<InvoiceRefundMethod>("CASH");
	const [restock, setRestock] = useState<boolean>(true);

	const refundMutation = useMutation({
		mutationFn: () => {
			if (!invoice) return Promise.reject(new Error("No invoice selected"));
			if (!reason.trim())
				return Promise.reject(
					new Error("Refund reason is mandatory for Credit Note issuance"),
				);
			const payload: RefundInvoiceRequest = {
				reason: reason.trim(),
				refundMethod,
				restock,
			};
			return invoicesApi.refundInvoice(invoice.id, payload);
		},
		onSuccess: (updated) => {
			const creditNoteNo =
				updated?.creditNoteNumber ||
				(updated as any)?.attributes?.creditNoteNumber ||
				"RET-CREDIT-NOTE";
			toast.success(
				`Credit Note ${creditNoteNo} issued successfully! Invoice & Order marked as REFUNDED, payments reversed, and stock restocked.`,
			);
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			onOpenChange(false);
			setReason("");
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!invoice) return null;

	const handleRefund = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		refundMutation.mutate();
	};

	const invoiceNo =
		invoice.invoiceNumber || invoice.invoiceNo || `#${invoice.id}`;
	const customerName =
		invoice.customer?.name ||
		(invoice as any).customerName ||
		`Customer #${invoice.customerId || "—"}`;
	const totalAmount = Number(invoice.totalAmount) || 0;
	const paidAmount = Number(invoice.paidAmount) || 0;

	const refundMethodOptions = [
		{ value: "CASH", label: "💵 Cash Payment Refund" },
		{ value: "BANK_TRANSFER", label: "🏦 Bank Transfer / Wire" },
		{
			value: "CUSTOMER_CREDIT",
			label: "🏷️ Customer Credit Balance (Account Credit)",
		},
		{
			value: "ORIGINAL_PAYMENT",
			label: "🔄 Reversal to Original Payment Method",
		},
	];

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={t("invoices.refundInvoiceTitle")}
			subtitle={`${t("invoices.refundInvoiceSubtitle")} (${invoiceNo})`}
			icon={
				<RotateCcw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
			}
			size="lg"
			glassmorphism={true}
			draggable={true}
			isLoading={refundMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleRefund()}
						disabled={!reason.trim() || refundMutation.isPending}
						isLoading={refundMutation.isPending}
						loadingText={t("common.loading")}
						icon={<FileText className="h-4 w-4" />}
						className="bg-purple-600 hover:bg-purple-700 text-white"
					>
						{t("invoices.confirmRefund")}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleRefund} className="space-y-4">
				{/* Invoice & Financial Balance Details */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
					<div className="space-y-1.5">
						<div className="text-slate-500">
							{t("invoices.invoiceNumber")}:{" "}
							<strong className="font-mono text-slate-900 dark:text-slate-100">
								{invoiceNo}
							</strong>
						</div>
						<div className="text-slate-500">
							{t("invoices.customer")}:{" "}
							<strong className="text-slate-800 dark:text-slate-200">
								{customerName}
							</strong>
						</div>
					</div>

					<div className="space-y-1 text-right">
						<div className="flex justify-between sm:justify-end gap-3 text-slate-500">
							<span>{t("invoices.grandTotal")}:</span>
							<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
								$
								{totalAmount.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
						<div className="flex justify-between sm:justify-end gap-3 text-emerald-600 dark:text-emerald-400 font-semibold">
							<span>{t("invoices.amountPaid")}:</span>
							<span className="font-mono">
								$
								{paidAmount.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
					</div>
				</div>

				{/* Credit Note Workflow Notification */}
				<div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl space-y-2 text-xs text-purple-900 dark:text-purple-200">
					<div className="flex items-center gap-2 font-bold text-purple-800 dark:text-purple-300">
						<FileText className="h-4 w-4 shrink-0" />
						<span>{t("invoices.issueCreditNote")}:</span>
					</div>
					<ul className="space-y-1 list-disc pl-5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
						<li>
							{t("invoices.creditNoteIssued")} (
							<span className="font-mono font-bold text-purple-600">
								RET-YYYY-XXXX
							</span>
							).
						</li>
						<li>
							{t("invoices.refundInvoice")} &{" "}
							<span className="font-mono text-rose-600 font-semibold">
								{t("invoices.refunded")}
							</span>
							.
						</li>
					</ul>
				</div>

				{/* Inputs */}
				<div className="space-y-3">
					<ModernSelect
						label={`${t("invoices.refundMethod")} *`}
						options={refundMethodOptions}
						value={refundMethod}
						onChange={(val: any) => setRefundMethod(val)}
					/>

					<ModernTextarea
						label={`${t("invoices.refundReason")} *`}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Provide reason for the return / credit note..."
						rows={3}
						required
					/>

					<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
						<ModernCheckbox
							label={t("invoices.restockInventory")}
							description={t("invoices.restockInventoryDesc")}
							checked={restock}
							onCheckedChange={(c) => setRestock(Boolean(c))}
						/>
					</div>
				</div>
			</form>
		</ModernModal>
	);
}

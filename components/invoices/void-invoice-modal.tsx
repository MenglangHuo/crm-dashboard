"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Invoice } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernTextarea } from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import {
	Ban,
	RotateCcw,
	AlertTriangle,
	Package,
	CheckCircle2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface VoidInvoiceModalProps {
	invoice: Invoice | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function VoidInvoiceModal({
	invoice,
	open,
	onOpenChange,
	onSuccess,
}: VoidInvoiceModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [reason, setReason] = useState<string>("");

	const voidMutation = useMutation({
		mutationFn: () => {
			if (!invoice) return Promise.reject(new Error("No invoice selected"));
			return invoicesApi.voidInvoice(invoice.id, reason.trim() || undefined);
		},
		onSuccess: (updated) => {
			toast.success(
				`Invoice ${invoice?.invoiceNumber || invoice?.invoiceNo || ""} voided successfully! Sold stock returned to reserved state and sales order rolled back to POSTED.`,
			);
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			onOpenChange(false);
			setReason("");
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!invoice) return null;

	const handleVoid = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		voidMutation.mutate();
	};

	const invoiceNo =
		invoice.invoiceNumber || invoice.invoiceNo || `#${invoice.id}`;
	const customerName =
		invoice.customer?.name ||
		(invoice as any).customerName ||
		`Customer #${invoice.customerId || "—"}`;
	const totalAmount = Number(invoice.totalAmount) || 0;
	const paidAmount = Number(invoice.paidAmount) || 0;

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={t("invoices.voidInvoiceTitle")}
			subtitle={`${t("invoices.voidInvoiceSubtitle")} (${invoiceNo})`}
			icon={<Ban className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
			size="md"
			glassmorphism={true}
			draggable={true}
			isLoading={voidMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleVoid()}
						isLoading={voidMutation.isPending}
						loadingText={t("common.loading")}
						icon={<RotateCcw className="h-4 w-4" />}
						className="bg-rose-600 hover:bg-rose-700 text-white"
					>
						{t("invoices.confirmVoidInvoice")}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleVoid} className="space-y-4">
				{/* Invoice Summary Card */}
				<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
					<div className="flex items-center justify-between">
						<span className="text-slate-500">
							{t("invoices.invoiceNumber")}:
						</span>
						<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
							{invoiceNo}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-slate-500">{t("invoices.customer")}:</span>
						<span className="font-semibold text-slate-800 dark:text-slate-200">
							{customerName}
						</span>
					</div>

					<div className="flex items-center justify-between">
						<span className="text-slate-500">{t("invoices.grandTotal")}:</span>
						<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
							$
							{totalAmount.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</span>
					</div>

					<div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
						<span className="text-slate-500">
							{t("invoices.paymentStatus")}:
						</span>
						<Badge
							variant="outline"
							className={
								paidAmount === 0
									? "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
									: "bg-amber-50 text-amber-700 border-amber-300"
							}
						>
							{paidAmount === 0
								? t("invoices.unpaid")
								: `${t("invoices.partiallyPaid")} ($${paidAmount.toFixed(2)})`}
						</Badge>
					</div>
				</div>

				{/* Reversal Logic Impact Callout */}
				<div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
					<div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
						<AlertTriangle className="h-4 w-4 shrink-0" />
						<span>{t("invoices.voidInvoiceTitle")}:</span>
					</div>
					<ul className="space-y-1.5 list-disc pl-5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
						<li>
							<strong>{t("sidebar.stocks")}:</strong>{" "}
							{t("invoices.voidInvoiceSubtitle")}.
						</li>
						<li>
							<strong>{t("invoices.paymentStatus")}:</strong>{" "}
							{t("invoices.void")}.
						</li>
					</ul>
				</div>

				{/* Void Reason Input */}
				<ModernTextarea
					label={`${t("products.reason")} (${t("common.optional") || "Optional"})`}
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="State reason for voiding..."
					rows={3}
				/>
			</form>
		</ModernModal>
	);
}

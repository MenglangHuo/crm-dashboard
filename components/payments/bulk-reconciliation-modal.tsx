"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Payment, BulkReconcilePaymentsRequest } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import {
	CheckCircle2,
	AlertTriangle,
	Building2,
	DollarSign,
	Layers,
	FileText,
	ShieldCheck,
	Info,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface BulkReconciliationModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedPayments: Payment[];
	onSuccess?: () => void;
}

export function BulkReconciliationModal({
	open,
	onOpenChange,
	selectedPayments,
	onSuccess,
}: BulkReconciliationModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const [status, setStatus] = useState<string>("RECONCILED");
	const [reference, setReference] = useState<string>("");
	const [note, setNote] = useState<string>("");
	const [showPaymentList, setShowPaymentList] = useState<boolean>(true);

	// Reset / prefill on open
	useEffect(() => {
		if (open && selectedPayments.length > 0) {
			const today = new Date();
			const dateCode = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
			setReference(`BANK-STMT-${dateCode}-001`);
			setNote(
				`Batch reconciliation of ${selectedPayments.length} payment records against bank statement`,
			);
			setStatus("RECONCILED");
		}
	}, [open, selectedPayments]);

	// Total selected amount
	const totalAmount = useMemo(
		() =>
			selectedPayments.reduce(
				(sum, p) => sum + Number(p.amount || p.amountPaid || 0),
				0,
			),
		[selectedPayments],
	);

	// Check if any selected payment is electronic
	const hasElectronicPayments = useMemo(() => {
		const electronic = [
			"BANK_TRANSFER",
			"MOBILE_PAYMENT",
			"E_WALLET",
			"CREDIT_CARD",
			"DEBIT_CARD",
		];
		return selectedPayments.some((p) =>
			electronic.includes(String(p.paymentMethod || "").toUpperCase()),
		);
	}, [selectedPayments]);

	const reconcileMutation = useMutation({
		mutationFn: async () => {
			if (selectedPayments.length === 0) {
				throw new Error("No payments selected for reconciliation.");
			}

			// Validate electronic payments require reference
			if (hasElectronicPayments && !reference.trim()) {
				throw new Error(
					"Reconciliation reference (bank statement / transaction ID) is required for electronic payment methods.",
				);
			}

			// Validate EXCEPTION status requires note
			if (status === "EXCEPTION" && !note.trim()) {
				throw new Error(
					"An explanatory note is strictly required when marking payments as EXCEPTION.",
				);
			}

			const paymentIds = selectedPayments.map((p) => Number(p.id));

			const payload: BulkReconcilePaymentsRequest = {
				reconciliationStatus: status,
				reconciliationReference: reference.trim() || undefined,
				reconciliationNote: note.trim() || undefined,
				paymentIds,
			};

			return await paymentsApi.bulkReconcile(payload);
		},
		onSuccess: (data) => {
			const count = data?.reconciledCount ?? selectedPayments.length;
			toast.success(
				`Successfully reconciled ${count} payment(s) as ${status}!`,
			);
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["payments-search"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			onSuccess?.();
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			title="Batch Payment Reconciliation"
			subtitle={`Verify and settle ${selectedPayments.length} selected transaction(s)`}
			icon={<ShieldCheck className="h-5 w-5 text-primary" />}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => reconcileMutation.mutate()}
						isLoading={reconcileMutation.isPending}
						icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
					>
						Reconcile {selectedPayments.length} Payment(s)
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-5 py-1">
				{/* Top Summary KPI Banner */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
							<Layers className="size-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Selected
							</p>
							<p className="text-lg font-bold text-slate-900 dark:text-slate-100">
								{selectedPayments.length} Payments
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<DollarSign className="size-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Total Sum
							</p>
							<p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
								${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
							<Building2 className="size-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Method Profile
							</p>
							<p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
								{hasElectronicPayments ? "Electronic / Bank Wire" : "Cash / Counter"}
							</p>
						</div>
					</div>
				</div>

				{/* Form Inputs */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Status Selection */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
							Reconciliation Action Status <span className="text-rose-500">*</span>
						</label>
						<ModernSelect
							value={status}
							onChange={(val: string) => setStatus(val)}
							options={[
								{
									value: "RECONCILED",
									label: "MATCHED / RECONCILED (Verified in Bank Statement)",
								},
								{
									value: "EXCEPTION",
									label: "EXCEPTION (Discrepancy / Mismatch / Disputed)",
								},
							]}
						/>
					</div>

					{/* Reconciliation Reference */}
					<div className="space-y-1.5">
						<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
							<span>
								Statement / Bank Batch Ref {hasElectronicPayments && <span className="text-rose-500">*</span>}
							</span>
							<span className="text-[11px] text-muted-foreground font-normal">
								e.g. Bank Batch or Slip #
							</span>
						</label>
						<ModernInput
							placeholder="e.g. BANK-STMT-2026-09-001"
							value={reference}
							onChange={(e) => setReference(e.target.value)}
						/>
					</div>
				</div>

				{/* Reconciliation Note */}
				<div className="space-y-1.5">
					<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
						<span>
							Audit / Reconciliation Note {status === "EXCEPTION" && <span className="text-rose-500">* (Required for Exception)</span>}
						</span>
						<span className="text-[11px] text-muted-foreground font-normal">
							Recorded in transaction audit log
						</span>
					</label>
					<ModernTextarea
						rows={2}
						placeholder={
							status === "EXCEPTION"
								? "Detail the reason for exception (e.g., Short deposit by $10, chargeback reported, statement mismatch)..."
								: "Matched with ABA Bank statement batch line items..."
						}
						value={note}
						onChange={(e) => setNote(e.target.value)}
					/>
				</div>

				{/* Collapsible Selected Payments List */}
				<div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs">
					<button
						type="button"
						onClick={() => setShowPaymentList((prev) => !prev)}
						className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/90 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300"
					>
						<div className="flex items-center gap-2">
							<FileText className="size-4 text-primary" />
							<span>Included Payment Items ({selectedPayments.length})</span>
						</div>
						<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
							<span>{showPaymentList ? "Hide List" : "Show List"}</span>
							{showPaymentList ? (
								<ChevronUp className="size-4" />
							) : (
								<ChevronDown className="size-4" />
							)}
						</div>
					</button>

					{showPaymentList && (
						<div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
							{selectedPayments.map((p) => (
								<div
									key={p.id}
									className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs transition-colors"
								>
									<div className="flex items-center gap-3">
										<Badge
											variant="outline"
											className="font-mono text-[11px] font-semibold bg-slate-100 dark:bg-slate-800"
										>
											{p.paymentNumber || `PAY-${p.id}`}
										</Badge>
										<div>
											<span className="font-semibold text-slate-900 dark:text-slate-100">
												{p.invoice?.invoiceNumber || (p.invoiceId ? `Invoice #${p.invoiceId}` : "Direct Payment")}
											</span>
											<span className="text-muted-foreground ml-2 text-[11px]">
												({p.paymentMethod || "CASH"})
											</span>
										</div>
									</div>

									<div className="flex items-center gap-3">
										<Badge
											variant="outline"
											className={
												p.reconciliationStatus === "RECONCILED"
													? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
													: p.reconciliationStatus === "EXCEPTION"
														? "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
														: "border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
											}
										>
											{p.reconciliationStatus || "PENDING"}
										</Badge>
										<span className="font-bold text-slate-900 dark:text-slate-100 min-w-16 text-right">
											${Number(p.amount || p.amountPaid || 0).toFixed(2)}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Accounting Segregation of Duties Notice */}
				<div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-blue-800 dark:text-blue-300 text-xs">
					<Info className="size-4 shrink-0 mt-0.5" />
					<p className="leading-relaxed">
						<strong>Segregation of Duties Enforced:</strong> Per standard financial controls, you cannot reconcile payments you personally recorded as received. Any such payment will be flagged by the system.
					</p>
				</div>
			</div>
		</ModernModal>
	);
}

"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi, paymentTermsApi, ordersApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Order, CreateInvoiceFromOrderRequest, PaymentTerm } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernTextarea,
	ModernDatePicker,
} from "@/components/ui-custom/form-controls";
import { Receipt, Sparkles } from "lucide-react";

interface IssueInvoiceModalProps {
	order: Order | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function IssueInvoiceModal({
	order,
	open,
	onOpenChange,
	onSuccess,
}: IssueInvoiceModalProps) {
	const queryClient = useQueryClient();
	const { canIssueInvoice } = usePermissions();

	const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const [selectedTermId, setSelectedTermId] = useState<string>("");
	const [dueDate, setDueDate] = useState<string>(defaultDueDate);
	const [notes, setNotes] = useState<string>("");

	// Fetch detailed order info if not already fully populated
	const { data: fullOrder } = useQuery({
		queryKey: ["order-detail-for-invoice", order?.id],
		queryFn: () => (order?.id ? ordersApi.get(order.id) : null),
		enabled: Boolean(open && order?.id),
	});

	const effectiveOrder = fullOrder || order;

	// Fetch Payment Terms
	const { data: paymentTerms = [] } = useQuery({
		queryKey: ["payment-terms-issue-modal"],
		queryFn: () => paymentTermsApi.list(),
		enabled: open,
	});

	const selectedTerm =
		paymentTerms.find(
			(t: PaymentTerm) => String(t.id) === String(selectedTermId),
		) ||
		(effectiveOrder?.paymentTerm &&
		String(effectiveOrder.paymentTerm.id) === String(selectedTermId)
			? effectiveOrder.paymentTerm
			: null);

	// Auto-select payment-term from sales order
	useEffect(() => {
		if (open && effectiveOrder) {
			const termId = effectiveOrder.paymentTermId
				? String(effectiveOrder.paymentTermId)
				: effectiveOrder.paymentTerm?.id
					? String(effectiveOrder.paymentTerm.id)
					: (effectiveOrder as any).customer?.defaultPaymentTerm?.id
						? String((effectiveOrder as any).customer.defaultPaymentTerm.id)
						: (effectiveOrder as any).customer?.paymentTermId
							? String((effectiveOrder as any).customer.paymentTermId)
							: "";
			setSelectedTermId(termId);

			const term =
				paymentTerms.find(
					(t: PaymentTerm) => String(t.id) === String(termId),
				) ||
				(effectiveOrder.paymentTerm &&
				String(effectiveOrder.paymentTerm.id) === String(termId)
					? effectiveOrder.paymentTerm
					: null);

			if (term && term.dueDays !== undefined && term.dueDays !== null) {
				const calculatedDue = new Date(
					Date.now() + term.dueDays * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.slice(0, 10);
				setDueDate(calculatedDue);
			}

			setNotes("");
		}
	}, [open, effectiveOrder, paymentTerms]);

	const invoiceMutation = useMutation({
		mutationFn: (payload: CreateInvoiceFromOrderRequest) =>
			invoicesApi.createFromOrder(payload),
		onSuccess: (invoice) => {
			toast.success(
				`Invoice ${invoice.invoiceNo || "issued"} successfully! Stock finalized as sold & Order transitioned to COMPLETED.`,
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.invalidateQueries({ queryKey: ["order-histories"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!effectiveOrder) return null;

	const orderTotal = Number(effectiveOrder.totalAmount) || 0;
	const orderNo =
		effectiveOrder.orderNumber ||
		effectiveOrder.orderNo ||
		order?.orderNumber ||
		order?.orderNo;
	const customerName =
		effectiveOrder.customerName ||
		effectiveOrder.customer?.name ||
		`Customer #${effectiveOrder.customerId}`;

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		const payload: CreateInvoiceFromOrderRequest = {
			orderId: effectiveOrder.id,
			orderNumber: orderNo,
			paymentTermId: selectedTermId ? Number(selectedTermId) : undefined,
			discount: 0,
			discountType: "PERCENTAGE",
			dueDate: dueDate ? `${dueDate}T23:59:59` : undefined,
			notes: notes.trim() || undefined,
		};

		invoiceMutation.mutate(payload);
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Issue Invoice"
			subtitle={
				orderNo
					? `Generate invoice for Order ${orderNo}`
					: "Generate billing invoice for order"
			}
			icon={
				<Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
			}
			size="md"
			glassmorphism={true}
			draggable={true}
			isLoading={invoiceMutation.isPending}
			footer={
				<ModernModalFooter className="gap-3">
					<ModernModalCancelButton
						onClick={() => onOpenChange(false)}
						height="h-11"
						width="min-w-[120px]"
						padding="px-5"
					/>
					<ModernModalSubmitButton
						onClick={() => handleSubmit()}
						disabled={!canIssueInvoice}
						isLoading={invoiceMutation.isPending}
						loadingText="Generating Invoice..."
						height="h-11"
						width="min-w-[210px]"
						padding="px-6"
						icon={<Receipt className="h-4 w-4" />}
						className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
					>
						Issue Invoice & Complete
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Order Summary Snapshot */}
				<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5 min-w-0">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
								Customer
							</span>
							<p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
								{customerName}
							</p>
							{orderNo && (
								<p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
									Order #{orderNo}
								</p>
							)}
						</div>

						<div className="text-right shrink-0 space-y-0.5">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
								Invoice Amount
							</span>
							<p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
								$
								{orderTotal.toLocaleString(undefined, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</p>
						</div>
					</div>

					{selectedTerm && (
						<div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
							<div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
								<span className="text-slate-400 dark:text-slate-500">
									Payment Term:
								</span>
								<span className="font-semibold text-slate-800 dark:text-slate-200">
									{selectedTerm.name}
									{selectedTerm.dueDays !== undefined &&
										selectedTerm.dueDays !== null && (
											<span className="text-slate-400 font-normal">
												{" "}
												(+{selectedTerm.dueDays}d)
											</span>
										)}
								</span>
							</div>

							{selectedTerm.discountPercentage &&
								selectedTerm.discountPercentage > 0 &&
								selectedTerm.discountDays && (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 dark:bg-emerald-950/50 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
										<Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
										{selectedTerm.discountPercentage}% off in{" "}
										{selectedTerm.discountDays}d
									</span>
								)}
						</div>
					)}
				</div>

				{/* Payment Due Date */}
				<ModernDatePicker
					label="Payment Due Date"
					value={dueDate}
					onChange={(date) => setDueDate(date)}
					required
					placeholder="Select payment due date..."
				/>

				{/* Invoice Notes */}
				<ModernTextarea
					label="Invoice Notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Bank details, payment instructions, or invoice comments..."
					rows={3}
				/>
			</form>
		</ModernModal>
	);
}

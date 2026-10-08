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
	ModernInput,
	ModernSelect,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle2, Clock, Sparkles, Zap, Lock } from "lucide-react";

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
	const [discount, setDiscount] = useState<number>(0);
	const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
		"PERCENTAGE",
	);
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

	const handleTermChange = (termId: string) => {
		setSelectedTermId(termId);
		const term = paymentTerms.find(
			(t: PaymentTerm) => String(t.id) === String(termId),
		);
		if (term) {
			const calculatedDue = new Date(
				Date.now() + term.dueDays * 24 * 60 * 60 * 1000,
			)
				.toISOString()
				.slice(0, 10);
			setDueDate(calculatedDue);
		}
	};

	// Auto-select payment-term from sales order, lock discount to 0 with PERCENTAGE
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

			// Strictly lock discount to 0 with PERCENTAGE
			setDiscount(0);
			setDiscountType("PERCENTAGE");
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
	const discountAmt =
		discountType === "PERCENTAGE" ? orderTotal * (discount / 100) : discount;
	const finalInvoiceAmount = Math.max(0, orderTotal - discountAmt);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		const payload: CreateInvoiceFromOrderRequest = {
			orderId: effectiveOrder.id,
			orderNumber: effectiveOrder.orderNumber || effectiveOrder.orderNo,
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
			title="Issue Invoice (Accountant Action)"
			subtitle={`Generate billing invoice for Order ${effectiveOrder.orderNumber || effectiveOrder.orderNo || order?.orderNumber || order?.orderNo}`}
			icon={
				<Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
			}
			size="md"
			glassmorphism={true}
			draggable={true}
			isLoading={invoiceMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleSubmit()}
						disabled={!canIssueInvoice}
						isLoading={invoiceMutation.isPending}
						loadingText="Generating Invoice..."
						icon={<Receipt className="h-4 w-4" />}
						className="bg-emerald-600 hover:bg-emerald-700 text-white"
					>
						Issue Invoice & Complete
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				{/* Order Summary Box */}
				<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
					<div className="flex justify-between text-slate-600 dark:text-slate-400">
						<span>Customer:</span>
						<span className="font-bold text-slate-900 dark:text-slate-100">
							{effectiveOrder.customerName ||
								effectiveOrder.customer?.name ||
								`Customer #${effectiveOrder.customerId}`}
						</span>
					</div>

					<div className="flex justify-between text-slate-600 dark:text-slate-400">
						<span>Order Amount:</span>
						<span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
							$
							{orderTotal.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</span>
					</div>

					<div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-slate-100 text-sm">
						<span>Net Invoiced Amount:</span>
						<span className="font-mono text-emerald-600 dark:text-emerald-400">
							$
							{finalInvoiceAmount.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</span>
					</div>
				</div>

				{/* Payment Term Selector (Disabled & Auto-selected from Sales Order) */}
				<div className="space-y-2">
					<ModernSelect
						label="Payment Term (Assigned by Sales)"
						placeholder="No payment term assigned to order..."
						value={selectedTermId}
						onChange={handleTermChange}
						disabled={true}
						options={[
							{ value: "", label: "No payment term (Manual Due Date)" },
							...paymentTerms.map((t: PaymentTerm) => ({
								value: String(t.id),
								label: `${t.name} (+${t.dueDays} days)${t.discountDays ? ` — ⚡ ${t.discountPercentage}% off in ${t.discountDays}d` : ""}`,
								description: t.description || undefined,
							})),
						]}
						helperText="Auto-selected from sales order (Locked)"
						leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
					/>

					{selectedTerm &&
						selectedTerm.discountDays &&
						selectedTerm.discountDays > 0 &&
						selectedTerm.discountPercentage &&
						selectedTerm.discountPercentage > 0 && (
							<div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
								<Sparkles className="size-4 text-emerald-600 shrink-0" />
								<div>
									<span className="font-bold">Early Cash Discount: </span>
									<span>
										Customer gets{" "}
										<strong>{selectedTerm.discountPercentage}% discount</strong>{" "}
										if settled within{" "}
										<strong>{selectedTerm.discountDays} days</strong> (by{" "}
										{new Date(
											Date.now() +
												selectedTerm.discountDays * 24 * 60 * 60 * 1000,
										).toLocaleDateString()}
										).
									</span>
								</div>
							</div>
						)}
				</div>

				{/* Inputs */}
				<ModernInput
					type="date"
					label="Payment Due Date *"
					value={dueDate}
					onChange={(e) => setDueDate(e.target.value)}
					required
				/>

				<div className="flex items-center gap-3">
					<ModernInput
						type="number"
						step="0.01"
						min="0"
						label="Invoice Adjustment Discount"
						value={discount}
						onChange={(e) => setDiscount(Number(e.target.value))}
						containerClassName="flex-1"
						className="font-mono bg-slate-100 dark:bg-slate-800/60 text-slate-500 cursor-not-allowed"
						disabled={true}
						helperText="Discount disabled (default 0 with percentage)"
					/>

					<ModernSelect
						label="Discount Type"
						options={[
							{ value: "PERCENTAGE", label: "% PERCENT" },
							{ value: "FLAT", label: "$ FLAT" },
						]}
						value={discountType}
						onChange={(val: any) => setDiscountType(val)}
						containerClassName="w-36"
						disabled={true}
					/>
				</div>

				<ModernTextarea
					label="Invoice Notes / Payment Instructions"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Bank details, payment terms, or invoice comments..."
					rows={2}
				/>

				{/* Stock Transition Callout */}
				<div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
					<CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
					<div>
						<span className="font-bold">Stock Transition: </span>
						<span>
							Reserved Stock → <strong>Sold Stock</strong> (Finalized). Order
							status will automatically become <strong>COMPLETED</strong>.
						</span>
					</div>
				</div>
			</form>
		</ModernModal>
	);
}

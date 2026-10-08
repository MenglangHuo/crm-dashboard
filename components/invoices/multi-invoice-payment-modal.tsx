"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Invoice, MultiInvoicePaymentRequest } from "@/lib/types";
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
import { Button } from "@/components/ui/button";
import {
	CreditCard,
	AlertTriangle,
	CheckCircle2,
	DollarSign,
	Calendar,
	Layers,
	FileText,
	UserCheck,
	Tag,
	Hash,
	Link as LinkIcon,
	Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface InvoiceAllocationRow {
	invoiceId: string | number;
	invoiceNumber: string;
	issuedAt?: string;
	totalAmount: number;
	remainingAmount: number;
	amountToPay: number;
	discountAmount: number;
	discountType: "FLAT" | "PERCENTAGE";
	discountReason: string;
}

interface MultiInvoicePaymentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedInvoices: Invoice[];
	onSuccess?: () => void;
}

export function MultiInvoicePaymentModal({
	open,
	onOpenChange,
	selectedInvoices,
	onSuccess,
}: MultiInvoicePaymentModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Detect and group customers from selected invoices
	const customerSummary = useMemo(() => {
		const customerMap = new Map<
			string,
			{ id: string | number; name: string; invoices: Invoice[] }
		>();

		selectedInvoices.forEach((inv) => {
			const custId = String(inv.customerId || inv.customer?.id || "unknown");
			const custName =
				inv.customer?.name ||
				(inv as any).customerName ||
				`Customer #${custId}`;

			if (!customerMap.has(custId)) {
				customerMap.set(custId, { id: custId, name: custName, invoices: [] });
			}
			customerMap.get(custId)!.invoices.push(inv);
		});

		const distinctCustomers = Array.from(customerMap.values());
		const isSingleCustomer = distinctCustomers.length === 1;
		const primaryCustomer = distinctCustomers[0] || null;

		return {
			distinctCustomers,
			isSingleCustomer,
			primaryCustomer,
			count: distinctCustomers.length,
		};
	}, [selectedInvoices]);

	// Form State
	const [allocations, setAllocations] = useState<InvoiceAllocationRow[]>([]);
	const [paymentDate, setPaymentDate] = useState<string>(
		new Date().toISOString().split("T")[0],
	);
	const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
	const [referenceNumber, setReferenceNumber] = useState<string>("");
	const [receiptUrl, setReceiptUrl] = useState<string>("");
	const [notes, setNotes] = useState<string>("");

	// Initialize or reset allocations when selected invoices change
	useEffect(() => {
		if (open && selectedInvoices.length > 0) {
			const now = new Date();
			const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

			setReferenceNumber(`BATCH-REF-${dateSuffix}`);
			setNotes(
				`Bulk settlement payment clearing ${selectedInvoices.length} invoices`,
			);

			const initialRows: InvoiceAllocationRow[] = selectedInvoices.map(
				(inv) => {
					const total = Number(inv.totalAmount || 0);
					const remaining =
						inv.remainingAmount !== undefined
							? Number(inv.remainingAmount)
							: total;
					const payable = remaining > 0 ? remaining : total;

					return {
						invoiceId: inv.id,
						invoiceNumber: inv.invoiceNumber || inv.invoiceNo || `#${inv.id}`,
						issuedAt: inv.issuedAt
							? new Date(inv.issuedAt).toISOString().split("T")[0]
							: undefined,
						totalAmount: total,
						remainingAmount: remaining,
						amountToPay: payable,
						discountAmount: 0,
						discountType: "FLAT",
						discountReason: "",
					};
				},
			);

			setAllocations(initialRows);
		}
	}, [open, selectedInvoices]);

	// Computed Totals
	const totalAllocatedAmount = useMemo(
		() =>
			allocations.reduce((sum, row) => sum + (Number(row.amountToPay) || 0), 0),
		[allocations],
	);

	const totalDiscountAmount = useMemo(
		() =>
			allocations.reduce(
				(sum, row) => sum + (Number(row.discountAmount) || 0),
				0,
			),
		[allocations],
	);

	const totalOutstandingBalance = useMemo(
		() =>
			selectedInvoices.reduce(
				(sum, inv) =>
					sum +
					(inv.remainingAmount !== undefined
						? Number(inv.remainingAmount)
						: Number(inv.totalAmount || 0)),
				0,
			),
		[selectedInvoices],
	);

	// Handlers for Row Updates
	const updateRow = (idx: number, patch: Partial<InvoiceAllocationRow>) => {
		setAllocations((prev) => {
			const copy = [...prev];
			if (copy[idx]) {
				copy[idx] = { ...copy[idx], ...patch };
			}
			return copy;
		});
	};

	const handlePayFullAll = () => {
		setAllocations((prev) =>
			prev.map((row) => ({
				...row,
				amountToPay:
					row.remainingAmount > 0 ? row.remainingAmount : row.totalAmount,
				discountAmount: 0,
			})),
		);
		toast.info("All invoice allocations set to full outstanding balance");
	};

	const handleClearAll = () => {
		setAllocations((prev) =>
			prev.map((row) => ({
				...row,
				amountToPay: 0,
				discountAmount: 0,
			})),
		);
	};

	// Mutation to process multi-invoice batch payment
	const multiPaymentMutation = useMutation({
		mutationFn: async () => {
			if (!customerSummary.isSingleCustomer) {
				throw new Error(
					"All selected invoices must belong to the same customer for batch settlement.",
				);
			}
			if (totalAllocatedAmount <= 0) {
				throw new Error("Total payment amount must be greater than $0.00.");
			}

			const validAllocations = allocations.filter(
				(a) => a.amountToPay > 0 || a.discountAmount > 0,
			);
			if (validAllocations.length === 0) {
				throw new Error(
					"Please allocate payment amounts to at least one invoice.",
				);
			}

			const payload: MultiInvoicePaymentRequest = {
				payments: validAllocations.map((a) => ({
					invoiceId: a.invoiceId,
					paymentAmount: Number(a.amountToPay.toFixed(2)),
					earlyPaymentDiscount:
						a.discountAmount > 0 ? Number(a.discountAmount.toFixed(2)) : 0,
					paymentMethod: paymentMethod,
					paymentReference: referenceNumber.trim() || undefined,
					notes: a.discountReason.trim() || notes.trim() || undefined,
				})),
				totalAmount: Number(totalAllocatedAmount.toFixed(2)),
				paymentDate: paymentDate
					? new Date(paymentDate).toISOString()
					: new Date().toISOString(),
				paymentMethod: paymentMethod,
				referenceNumber: referenceNumber.trim() || undefined,
				receiptUrl: receiptUrl.trim() || undefined,
				notes: notes.trim() || undefined,
				allocations: validAllocations.map((a) => ({
					invoiceId: a.invoiceId,
					amount: Number(a.amountToPay.toFixed(2)),
					discountAmount:
						a.discountAmount > 0 ? Number(a.discountAmount.toFixed(2)) : 0,
					discountType: a.discountType,
					discountReason: a.discountReason.trim() || null,
				})),
			};

			return await paymentsApi.processMultiInvoicePayment(payload);
		},
		onSuccess: () => {
			toast.success(
				`Batch payment of $${totalAllocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} recorded successfully across ${allocations.length} invoices!`,
			);
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			queryClient.invalidateQueries({ queryKey: ["customers"] });

			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Multi-Invoice Payment Settlement"
			subtitle="Settle multiple outstanding invoices in a single transaction for the customer."
			icon={<Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
			size="2xl"
			isLoading={multiPaymentMutation.isPending}
			loadingText="Processing batch payment..."
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => multiPaymentMutation.mutate()}
						disabled={
							!customerSummary.isSingleCustomer ||
							totalAllocatedAmount <= 0 ||
							multiPaymentMutation.isPending
						}
						isLoading={multiPaymentMutation.isPending}
						icon={<CreditCard className="h-4 w-4" />}
					>
						<span>
							Process Payment ($
							{totalAllocatedAmount.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
							)
						</span>
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-6 py-1">
				{/* Customer Validation Banner */}
				{!customerSummary.isSingleCustomer ? (
					<div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
						<AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div className="space-y-1 text-xs">
							<h4 className="font-bold text-amber-800 dark:text-amber-300">
								Multiple Customers Selected ({customerSummary.count})
							</h4>
							<p className="text-amber-700 dark:text-amber-400 leading-relaxed">
								Multi-invoice batch payment requires all selected invoices to
								belong to the same customer. Currently selected invoices are
								spread across:{" "}
								<span className="font-semibold">
									{customerSummary.distinctCustomers
										.map((c) => c.name)
										.join(", ")}
								</span>
								. Please filter or select invoices for a single customer.
							</p>
						</div>
					</div>
				) : (
					<div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 dark:bg-indigo-950/20 dark:border-indigo-800/30 flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
								<UserCheck className="size-5" />
							</div>
							<div>
								<div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
									Target Customer
								</div>
								<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
									{customerSummary.primaryCustomer?.name}
								</h4>
							</div>
						</div>

						<div className="text-right">
							<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
								Combined Outstanding
							</div>
							<div className="text-base font-mono font-bold text-slate-900 dark:text-slate-100">
								$
								{totalOutstandingBalance.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</div>
							<div className="text-[10px] text-slate-400">
								{selectedInvoices.length} Invoices Selected
							</div>
						</div>
					</div>
				)}

				{/* Allocations Table Section */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-indigo-500" />
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
								Invoice Settlement Allocations ({allocations.length})
							</h4>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handlePayFullAll}
								className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-border hover:bg-muted text-foreground gap-1"
							>
								<Sparkles className="size-3 text-amber-500" />
								<span>Pay Full All</span>
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearAll}
								className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
							>
								Clear
							</Button>
						</div>
					</div>

					{/* Allocation Items */}
					<div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
						<div className="overflow-x-auto max-h-[300px] overflow-y-auto">
							<table className="w-full text-left text-xs border-collapse">
								<thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th className="py-2.5 px-3">Invoice</th>
										<th className="py-2.5 px-3 text-right">Balance Due</th>
										<th className="py-2.5 px-3 text-right w-32">
											Pay Amount ($)
										</th>
										<th className="py-2.5 px-3 text-right w-28">
											Discount ($)
										</th>
										<th className="py-2.5 px-3 w-40">Discount Note</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
									{allocations.map((row, idx) => {
										const remainingAfter = Math.max(
											0,
											row.remainingAmount -
												row.amountToPay -
												row.discountAmount,
										);
										const isFullyCleared =
											row.amountToPay + row.discountAmount >=
												row.remainingAmount && row.remainingAmount > 0;

										return (
											<tr
												key={row.invoiceId}
												className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
											>
												<td className="py-3 px-3">
													<div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-xs">
														{row.invoiceNumber}
													</div>
													<div className="text-[10px] text-slate-400 font-normal">
														Total: ${row.totalAmount.toFixed(2)}{" "}
														{row.issuedAt && `• ${row.issuedAt}`}
													</div>
												</td>

												<td className="py-3 px-3 text-right">
													<div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
														$
														{row.remainingAmount.toLocaleString(undefined, {
															minimumFractionDigits: 2,
														})}
													</div>
													{isFullyCleared ? (
														<Badge
															variant="outline"
															className="text-[9px] px-1.5 py-0 text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
														>
															Full Clearance
														</Badge>
													) : (
														<span className="text-[10px] text-slate-400">
															Rem: ${remainingAfter.toFixed(2)}
														</span>
													)}
												</td>

												<td className="py-3 px-3 text-right">
													<input
														type="number"
														min="0"
														step="0.01"
														value={row.amountToPay}
														onChange={(e) =>
															updateRow(idx, {
																amountToPay: Math.max(
																	0,
																	parseFloat(e.target.value) || 0,
																),
															})
														}
														className="w-full text-right font-mono font-bold text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
													/>
												</td>

												<td className="py-3 px-3 text-right">
													<input
														type="number"
														min="0"
														step="0.01"
														value={row.discountAmount}
														onChange={(e) =>
															updateRow(idx, {
																discountAmount: Math.max(
																	0,
																	parseFloat(e.target.value) || 0,
																),
															})
														}
														placeholder="0.00"
														className="w-full text-right font-mono text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
													/>
												</td>

												<td className="py-3 px-3">
													<input
														type="text"
														value={row.discountReason}
														onChange={(e) =>
															updateRow(idx, { discountReason: e.target.value })
														}
														placeholder="Discount reason..."
														className="w-full text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						{/* Subtotal & Discount Footer */}
						<div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 px-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
							<span className="font-semibold text-slate-500 dark:text-slate-400">
								Settlement Allocations Summary:
							</span>
							<div className="flex items-center gap-6 font-mono">
								{totalDiscountAmount > 0 && (
									<div className="text-emerald-600 dark:text-emerald-400 font-semibold">
										Discount: -$
										{totalDiscountAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
										})}
									</div>
								)}
								<div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
									Total Collected: $
									{totalAllocatedAmount.toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Global Payment Details Form */}
				<div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
					<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
						<CreditCard className="h-4 w-4 text-indigo-500" />
						<span>Transaction & Payment Information</span>
					</h4>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernSelect
							label="Payment Method"
							value={paymentMethod}
							onChange={setPaymentMethod}
							options={[
								{ label: "Bank Transfer", value: "BANK_TRANSFER" },
								{ label: "Cash", value: "CASH" },
								{ label: "ABA PAY (KHQR)", value: "ABA_PAY" },
								{ label: "Credit / Debit Card", value: "CREDIT_CARD" },
								{ label: "Check", value: "CHECK" },
								{ label: "Other", value: "OTHER" },
							]}
							required
						/>

						<ModernInput
							label="Payment Date"
							type="date"
							value={paymentDate}
							onChange={(e) => setPaymentDate(e.target.value)}
							required
						/>

						<ModernInput
							label="Batch Reference / Txn #"
							value={referenceNumber}
							onChange={(e) => setReferenceNumber(e.target.value)}
							placeholder="e.g. BATCH-REF-20260902"
							leftIcon={<Hash className="h-4 w-4" />}
						/>

						<ModernInput
							label="Receipt / Proof Document URL"
							value={receiptUrl}
							onChange={(e) => setReceiptUrl(e.target.value)}
							placeholder="https://storage.example.com/receipt.pdf"
							leftIcon={<LinkIcon className="h-4 w-4" />}
						/>
					</div>

					<ModernTextarea
						label="Internal Notes / Settlement Memo"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Additional details about this multi-invoice payment settlement..."
						rows={2}
					/>
				</div>
			</div>
		</ModernModal>
	);
}

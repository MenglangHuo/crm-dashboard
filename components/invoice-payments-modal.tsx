"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentsApi, invoicesApi, fileUrl } from "@/lib/api/endpoints";
import { Payment, PaymentMethod, CreatePaymentRequest } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DollarSign,
	Loader2,
	Zap,
	Building2,
	CheckCircle2,
	Calendar,
	History,
	UserCheck,
	FileText,
	Eye,
	X,
} from "lucide-react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { useTranslation } from "@/lib/i18n/context";

interface InvoicePaymentsModalProps {
	invoiceId: string | number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOpenInvoiceDetails?: (id: string | number) => void;
}

export function InvoicePaymentsModal({
	invoiceId,
	open,
	onOpenChange,
	onOpenInvoiceDetails,
}: InvoicePaymentsModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { openQuickPay } = useQuickActions();

	const [previewReceiptModal, setPreviewReceiptModal] = useState<string | null>(
		null,
	);

	// Fetch payments for invoice using GET /v1/payments/{invoiceId}/invoice
	const { data, isLoading } = useQuery({
		queryKey: ["invoice-payments-modal", invoiceId],
		queryFn: () =>
			invoiceId ? paymentsApi.getByInvoice(invoiceId) : Promise.resolve(null),
		enabled: Boolean(invoiceId) && open,
	});

	// Fetch single invoice details to ensure customerId is resolved
	const { data: invoiceDetailsData } = useQuery({
		queryKey: ["invoice-payments-modal-details", invoiceId],
		queryFn: () =>
			invoiceId ? invoicesApi.get(invoiceId) : Promise.resolve(null),
		enabled: Boolean(invoiceId) && open,
	});

	const rawInvoice = data?.invoice;
	const fullInvoice =
		(invoiceDetailsData as any)?.data ||
		(invoiceDetailsData as any)?.invoice ||
		(invoiceDetailsData?.id ? invoiceDetailsData : rawInvoice);
	const invoice = fullInvoice || rawInvoice;
	const company = data?.company || (invoice as any)?.company;
	const payments: Payment[] = data?.payments || [];

	const resolvedCustomerId = String(
		invoice?.customerId ||
			invoice?.customer?.id ||
			(invoice as any)?.customer ||
			(data as any)?.customer?.id ||
			"",
	);

	const totalAmount = Number(invoice?.totalAmount || 0);
	const paymentDiscountAmount = Number(invoice?.paymentDiscountAmount || 0);
	const remainingAmount = Number(
		invoice?.remainingAmount !== undefined
			? invoice.remainingAmount
			: rawInvoice?.remainingAmount !== undefined
				? rawInvoice.remainingAmount
				: Math.max(
						0,
						totalAmount - (invoice?.paidAmount || 0) - paymentDiscountAmount,
					),
	);
	const paidAmount = Number(
		invoice?.paidAmount ||
			payments.reduce((acc, p) => acc + (p.amountPaid || p.amount || 0), 0),
	);

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={`${t("invoices.paymentHistoryTitle")}: ${invoice?.invoiceNumber || invoice?.invoiceNo || (invoiceId ? `#${invoiceId}` : "")}`}
			subtitle={t("invoices.paymentHistorySubtitle")}
			icon={
				<DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
			}
			size="xl"
			isLoading={isLoading}
			loadingText={t("common.loading")}
			footer={
				<ModernModalFooter className="flex items-center justify-between w-full">
					{remainingAmount > 0 && invoice && (
						<Button
							size="sm"
							onClick={() => {
								onOpenChange(false);
								openQuickPay({
									invoiceId: String(invoice.id),
									customerId: resolvedCustomerId,
									amount: remainingAmount,
									invoiceNo: invoice.invoiceNumber || invoice.invoiceNo,
								});
							}}
							className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
						>
							<Zap className="h-3.5 w-3.5 fill-current" />
							<span>
								{t("invoices.payOutstanding")} (${remainingAmount.toFixed(2)})
							</span>
						</Button>
					)}
					<div className="flex items-center gap-2 ml-auto">
						{onOpenInvoiceDetails && invoice?.id && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									onOpenChange(false);
									onOpenInvoiceDetails(invoice.id);
								}}
								className="h-9 text-xs font-semibold gap-1.5"
							>
								<FileText className="h-3.5 w-3.5 text-sky-500" />
								<span>{t("invoices.viewInvoice") || "View Full Invoice"}</span>
							</Button>
						)}
						<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					</div>
				</ModernModalFooter>
			}
		>
			{invoice && (
				<div className="space-y-4 py-1">
					{/* Invoice & Company Summary Header Card */}
					<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs">
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
								{t("invoices.invoiceNumber")}
							</span>
							<span className="font-mono font-extrabold text-slate-900 dark:text-slate-100 text-sm">
								{invoice.invoiceNumber || invoice.invoiceNo}
							</span>
							{company?.name && (
								<div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
									<Building2 className="h-3 w-3 text-indigo-500" />{" "}
									{company.name}
								</div>
							)}
						</div>

						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
								{t("invoices.paymentStatus")}
							</span>
							<div className="mt-0.5">
								<Badge
									variant="outline"
									className={`font-bold text-[10px] ${
										invoice.status === "PAID"
											? "bg-emerald-50 text-emerald-700 border-emerald-300"
											: invoice.status === "PARTIAL_PAYMENT" ||
													invoice.status === "PARTIALLY_PAID"
												? "bg-amber-50 text-amber-700 border-amber-300"
												: "bg-indigo-50 text-indigo-700 border-indigo-300"
									}`}
								>
									{invoice.status}
								</Badge>
							</div>
							{invoice.paymentTerm?.name && (
								<span className="text-[10px] text-slate-400 block mt-0.5">
									Term: {invoice.paymentTerm.name}
								</span>
							)}
						</div>

						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
								{t("invoices.grandTotal")}
							</span>
							<div className="font-mono font-extrabold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
								${totalAmount.toFixed(2)}
							</div>
							{paymentDiscountAmount > 0 && (
								<div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
									Disc: -${paymentDiscountAmount.toFixed(2)}
								</div>
							)}
						</div>

						<div className="text-right">
							<div className="text-[11px] text-emerald-600 dark:text-emerald-400">
								{t("invoices.amountPaid")}:{" "}
								<strong className="font-mono font-bold">
									${paidAmount.toFixed(2)}
								</strong>
							</div>
							<div
								className={`text-[12px] font-black ${remainingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}
							>
								{t("invoices.balanceDue")}:{" "}
								<strong className="font-mono">
									${remainingAmount.toFixed(2)}
								</strong>
							</div>
						</div>
					</div>

					{/* Payment Transactions Table */}
					<div className="space-y-2">
						<div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
							<span className="flex items-center gap-1.5">
								<History className="h-4 w-4 text-emerald-500" />{" "}
								{t("invoices.paymentHistory")} ({payments.length})
							</span>
							{totalAmount > 0 && (
								<span className="font-mono text-[11px] text-slate-400">
									{t("invoices.paid")}:{" "}
									{Math.min(
										100,
										Math.round(
											((paidAmount + paymentDiscountAmount) / totalAmount) *
												100,
										),
									)}
									%
								</span>
							)}
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
										<tr>
											<th className="py-2.5 px-3">
												{t("invoices.referenceNumber")}
											</th>
											<th className="py-2.5 px-3">{t("invoices.issueDate")}</th>
											<th className="py-2.5 px-3 text-center">
												{t("invoices.paymentMethod")}
											</th>
											<th className="py-2.5 px-3 text-right">
												{t("invoices.amountPaid")}
											</th>
											<th className="py-2.5 px-3 text-right">Cash Discount</th>
											<th className="py-2.5 px-3 text-right">
												{t("invoices.balanceDue")}
											</th>
											<th className="py-2.5 px-3">{t("products.changedBy")}</th>
											<th className="py-2.5 px-3 text-center">
												{t("invoices.paymentStatus")}
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
										{payments.length === 0 ? (
											<tr>
												<td
													colSpan={8}
													className="p-8 text-center text-slate-400 font-medium"
												>
													{t("invoices.noPaymentsRecorded")}
												</td>
											</tr>
										) : (
											payments.map((p: any) => {
												const receiver =
													typeof p.receivedBy === "object" &&
													p.receivedBy !== null
														? p.receivedBy.username ||
															p.receivedBy.name ||
															p.receivedBy.email
														: p.receivedBy ||
															p.collectedByStaffId ||
															"System Staff";

												const pStatus = String(
													p.status || "COMPLETED",
												).toUpperCase();
												const isReversed =
													pStatus === "REFUNDED" ||
													pStatus === "REVERSED" ||
													pStatus === "CANCELLED" ||
													invoice.status === "REFUNDED";
												const pDisc = Number(p.discountAmount || 0);

												return (
													<tr
														key={p.id}
														className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/50 ${isReversed ? "bg-purple-50/20 dark:bg-purple-950/10" : ""}`}
													>
														<td className="py-2.5 px-3">
															<div className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
																{p.paymentNumber ||
																	p.paymentRef ||
																	`PAY-${p.id}`}
															</div>
															{p.referenceNumber && (
																<div className="font-mono text-[10px] text-slate-400">
																	Ref: {p.referenceNumber}
																</div>
															)}
															{p.notes && (
																<div className="text-[10px] text-slate-500 italic">
																	{p.notes}
																</div>
															)}
															{p.receiptUrl && (
																<button
																	type="button"
																	onClick={() =>
																		setPreviewReceiptModal(
																			fileUrl(p.receiptUrl) || p.receiptUrl,
																		)
																	}
																	className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer"
																>
																	<FileText className="size-3" />
																	<span>View Slip / Receipt</span>
																</button>
															)}
														</td>
														<td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
															{p.paymentDate
																? new Date(p.paymentDate).toLocaleString()
																: "—"}
														</td>
														<td className="py-2.5 px-3 text-center font-semibold text-xs">
															<Badge
																variant="outline"
																className="font-mono text-[10px] uppercase"
															>
																{p.paymentMethod || "CASH"}
															</Badge>
														</td>
														<td
															className={`py-2.5 px-3 text-right font-mono font-black text-xs ${isReversed ? "text-slate-400 line-through" : "text-emerald-600 dark:text-emerald-400"}`}
														>
															$
															{(p.amount || p.amountPaid || 0).toLocaleString(
																undefined,
																{ minimumFractionDigits: 2 },
															)}
														</td>
														<td className="py-2.5 px-3 text-right font-mono text-xs">
															{pDisc > 0 ? (
																<div>
																	<span className="font-bold text-emerald-600 dark:text-emerald-400">
																		-${pDisc.toFixed(2)}
																	</span>
																	{p.discountReason && (
																		<div className="text-[9px] text-slate-400 line-clamp-1 max-w-[120px] ml-auto">
																			{p.discountReason}
																		</div>
																	)}
																</div>
															) : (
																<span className="text-slate-400">—</span>
															)}
														</td>
														<td className="py-2.5 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
															{p.outstandingBalance !== undefined
																? `$${Number(p.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
																: "—"}
														</td>
														<td className="py-2.5 px-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
															<div className="flex items-center gap-1">
																<UserCheck className="h-3 w-3 text-indigo-500" />
																<span>{receiver}</span>
															</div>
														</td>
														<td className="py-2.5 px-3 text-center">
															{isReversed ? (
																<Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 text-[10px] font-bold uppercase">
																	{pStatus === "CANCELLED"
																		? "CANCELLED"
																		: t("invoices.refunded")}
																</Badge>
															) : pStatus === "COMPLETED" ||
																pStatus === "SUCCESS" ? (
																<Badge className="bg-emerald-600 text-white text-[10px] font-bold uppercase">
																	{t("invoices.paid")}
																</Badge>
															) : (
																<Badge
																	variant="secondary"
																	className="text-[10px] font-bold uppercase"
																>
																	{pStatus}
																</Badge>
															)}
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Receipt Full Preview Modal */}
			{previewReceiptModal && (
				<div
					onClick={() => setPreviewReceiptModal(null)}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
				>
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-800"
					>
						<button
							type="button"
							onClick={() => setPreviewReceiptModal(null)}
							className="absolute top-3 right-3 z-10 size-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
						>
							<X className="size-4" />
						</button>
						<img
							src={previewReceiptModal}
							alt="Payment Slip Preview"
							className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain mx-auto"
						/>
					</div>
				</div>
			)}
		</ModernModal>
	);
}

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loansApi, financeApi } from "@/lib/api/endpoints";
import { LoanDetails, LoanSchedule, Invoice } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { Progress } from "@/components/ui/progress";
import {
	CreditCard,
	User,
	Clock,
	CheckCircle2,
	AlertCircle,
	RefreshCw,
	Zap,
	ArrowRight,
	FileText,
	DollarSign,
	Calendar,
	Percent,
	Receipt,
	Loader2,
	Copy,
	Check,
	Building2,
	ShieldCheck,
	Package,
} from "lucide-react";
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

interface LoanDetailsModalProps {
	loanId: string | null;
	onClose: () => void;
	onSelectLoanId?: (id: string) => void;
}

export function LoanDetailsModal({
	loanId,
	onClose,
	onSelectLoanId,
}: LoanDetailsModalProps) {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState("schedule");
	const [payingSchedule, setPayingSchedule] = useState<LoanSchedule | null>(
		null,
	);
	const [copiedKey, setCopiedKey] = useState(false);

	// Payment Form States
	const [amountPaid, setAmountPaid] = useState<number>(0);
	const [paymentMethod, setPaymentMethod] = useState("CASH");
	const [paymentNotes, setPaymentNotes] = useState("");

	// Fetch full details
	const { data: details, isLoading } = useQuery({
		queryKey: ["loan-details", loanId],
		queryFn: () =>
			loanId ? loansApi.getDetails(loanId) : Promise.reject("No loan ID"),
		enabled: !!loanId,
	});

	// Payment Mutation
	const paymentMutation = useMutation({
		mutationFn: (payload: any) => financeApi.processPayment(payload),
		onSuccess: () => {
			toast.success("Payment recorded successfully!", {
				description: "Schedule period and invoice updated automatically.",
			});
			queryClient.invalidateQueries({ queryKey: ["loan-details", loanId] });
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-page"] });
			setPayingSchedule(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openPayDialog = (schedule: LoanSchedule) => {
		const totalDue =
			schedule.totalDue || schedule.principalDue + schedule.interestDue;
		const paid = schedule.paidAmount || 0;
		const remaining = Math.max(0, totalDue - paid);

		setPayingSchedule(schedule);
		setAmountPaid(remaining);
		setPaymentMethod("CASH");
		setPaymentNotes(`Installment payment for Period #${schedule.periodNumber}`);
	};

	const handlePaySubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!payingSchedule || !details?.loan) return;

		paymentMutation.mutate({
			loanId: details.loan.id,
			loanScheduleId: payingSchedule.id,
			amount: amountPaid,
			amountPaid,
			paymentMethod,
			paymentCurrency: details.loan.currency || "USD",
			paymentDate: new Date().toISOString(),
			notes: paymentNotes,
			// status: "COMPLETED",
		});
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(true);
		toast.success("Loan Key copied to clipboard");
		setTimeout(() => setCopiedKey(false), 2000);
	};

	const renderScheduleStatus = (
		status: string,
		paidAmount: number = 0,
		totalDue: number = 0,
	) => {
		const s = String(status || "PENDING").toUpperCase();
		if (s === "PAID" || (paidAmount > 0 && paidAmount >= totalDue)) {
			return (
				<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-xs gap-1 px-2.5 py-0.5 whitespace-nowrap">
					<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
					Paid Done
				</Badge>
			);
		}
		if (s === "PARTIALLY_PAID" || (paidAmount > 0 && paidAmount < totalDue)) {
			return (
				<Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold text-xs gap-1 px-2.5 py-0.5 whitespace-nowrap">
					<Zap className="h-3.5 w-3.5 text-sky-500 shrink-0" />
					Partial (${paidAmount.toLocaleString()})
				</Badge>
			);
		}
		if (s === "OVERDUE") {
			return (
				<Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-xs gap-1 px-2.5 py-0.5 whitespace-nowrap">
					<AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
					Overdue
				</Badge>
			);
		}
		return (
			<Badge
				variant="outline"
				className="text-xs font-semibold text-slate-500 border-slate-300 dark:border-slate-700 whitespace-nowrap"
			>
				Pending
			</Badge>
		);
	};

	const loan = details?.loan;
	const customer = details?.customer;
	const schedules = details?.schedules || [];
	const invoices = details?.invoices || [];
	const items = details?.items || [];
	const restructuredTo = details?.restructuredToLoan;
	const parentLoan = details?.parentLoan;

	// Metrics
	const paidPeriods = schedules.filter(
		(s) => s.status === "PAID" || (s.paidAmount || 0) >= s.totalDue,
	).length;
	const totalPeriods = schedules.length || loan?.numberOfPeriods || 1;
	const progressPct = Math.round((paidPeriods / totalPeriods) * 100);

	return (
		<>
			<ModernModal
				isOpen={!!loanId}
				onClose={onClose}
				title={
					loan ? `Loan Agreement ${loan.loanKey}` : "Loan Origination Contract"
				}
				subtitle={
					loan
						? `Contract ID: #${loan.id} • Issued: ${loan.startDate ? new Date(loan.startDate).toLocaleDateString() : "N/A"}`
						: "Loan Contract Details"
				}
				icon={
					<CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
				}
				size="2xl"
				isLoading={isLoading}
				loadingText="Loading repayment schedule..."
			>
				{loan ? (
					<div className="space-y-6">
						{/* Top Bar with Status & Actions */}
						<div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
							<div className="flex items-center gap-3">
								<Badge className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider">
									{loan.status}
								</Badge>
								<div className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2">
									<span>Reference: {loan.loanKey}</span>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => copyToClipboard(loan.loanKey)}
										className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
										title="Copy Loan Key"
									>
										{copiedKey ? (
											<Check className="h-3.5 w-3.5 text-emerald-500" />
										) : (
											<Copy className="h-3.5 w-3.5" />
										)}
									</Button>
								</div>
							</div>

							<div className="text-xs text-slate-500 font-medium">
								{loan.description || "Asset Financing Agreement"}
							</div>
						</div>

						{/* RESTRUCTURED BANNER / LINK */}
						{(loan.status === "RESTRUCTURED" || restructuredTo) && (
							<div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-2 dark:border-purple-500/30">
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
									<div className="flex items-center gap-2.5 text-purple-700 dark:text-purple-300 font-bold text-xs sm:text-sm">
										<RefreshCw className="h-4 w-4 text-purple-500 animate-spin shrink-0" />
										<span>This Loan Agreement Has Been Restructured</span>
									</div>
									{restructuredTo && onSelectLoanId && (
										<Button
											size="sm"
											onClick={() => onSelectLoanId(String(restructuredTo.id))}
											className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4 gap-1.5 shrink-0 shadow-sm"
										>
											<span>
												Open Restructured Contract ({restructuredTo.loanKey})
											</span>
											<ArrowRight className="h-4 w-4" />
										</Button>
									)}
								</div>
								<p className="text-xs text-purple-600 dark:text-purple-400">
									The outstanding balance was transferred into a new
									restructured loan contract schedule.
								</p>
							</div>
						)}

						{/* PARENT RESTRUCTURED LINK */}
						{parentLoan && (
							<div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-xs text-sky-700 dark:text-sky-300 flex items-center justify-between">
								<span>
									Restructured from previous original loan contract:{" "}
									<strong>{parentLoan.loanKey}</strong>
								</span>
								{onSelectLoanId && (
									<Button
										size="sm"
										variant="ghost"
										onClick={() => onSelectLoanId(String(parentLoan.id))}
										className="text-sky-600 hover:text-sky-700 font-bold text-xs h-7"
									>
										View Original Contract →
									</Button>
								)}
							</div>
						)}

						{/* Financial KPI Summary Cards (4 Columns wide layout) */}
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
									Principal Amount
								</span>
								<div className="mt-1 font-mono font-black text-slate-900 dark:text-slate-100 text-lg sm:text-xl">
									{loan.currency || "USD"}{" "}
									{(loan.principal || 0).toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
									Total Interest
								</span>
								<div className="mt-1 font-mono font-black text-violet-600 dark:text-violet-400 text-lg sm:text-xl">
									{loan.currency || "USD"}{" "}
									{(loan.totalInterest || 0).toLocaleString(undefined, {
										minimumFractionDigits: 2,
									})}
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
								<span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
									Annual Interest Rate
								</span>
								<div className="mt-1 font-mono font-black text-slate-900 dark:text-slate-100 text-lg sm:text-xl">
									{((loan.interestRateBps || 0) / 100).toFixed(2)}% p.a.
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
										Repayment Progress
									</span>
									<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
										{progressPct}%
									</span>
								</div>
								<div className="mt-1 font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl">
									{paidPeriods} / {totalPeriods} Mos
								</div>
								<Progress
									value={progressPct}
									className="h-2 mt-2 bg-slate-100 dark:bg-slate-800"
								/>
							</div>
						</div>

						{/* Borrower Profile Card */}
						{customer && (
							<div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4 shadow-sm">
								<div className="flex items-center gap-3.5">
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-black text-sm">
										{(customer.name || "CU").slice(0, 2).toUpperCase()}
									</div>
									<div>
										<div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
											{customer.name}
										</div>
										<div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-0.5 font-medium">
											<span>Phone: {customer.phone || "N/A"}</span>
											{customer.nationalId && (
												<span>• National ID: {customer.nationalId}</span>
											)}
										</div>
									</div>
								</div>
								<Badge
									variant="outline"
									className="text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1"
								>
									{customer.customerGroup || "Retail Client"}
								</Badge>
							</div>
						)}

						{/* Tabs: Repayment Schedule, Financed Assets & Invoices */}
						<ModernTabs value={activeTab} onValueChange={setActiveTab}>
							<ModernTabsList variant="pills" size="md" fullWidth>
								<ModernTabsTrigger
									value="schedule"
									icon={
										<Calendar className="h-4 w-4 shrink-0 text-emerald-500" />
									}
									badge={schedules.length}
									badgeColor="emerald"
								>
									Repayment Schedule
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="items"
									icon={<Package className="h-4 w-4 shrink-0 text-sky-500" />}
									badge={items.length}
									badgeColor="sky"
								>
									Financed Assets
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="invoices"
									icon={
										<Receipt className="h-4 w-4 shrink-0 text-purple-500" />
									}
									badge={invoices.length}
									badgeColor="purple"
								>
									Billing Invoices
								</ModernTabsTrigger>
							</ModernTabsList>

							{/* TAB 1: REPAYMENT SCHEDULE */}
							<ModernTabsContent value="schedule" className="space-y-3">
								<div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs sm:text-sm">
											<thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
												<tr>
													<th className="py-3 px-4">Period</th>
													<th className="py-3 px-4">Due Date</th>
													<th className="py-3 px-4">Principal Portion</th>
													<th className="py-3 px-4">Interest Portion</th>
													<th className="py-3 px-4">Total Installment</th>
													<th className="py-3 px-4">Status</th>
													<th className="py-3 px-4 text-right">Quick Action</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
												{schedules.length === 0 ? (
													<tr>
														<td
															colSpan={7}
															className="p-8 text-center text-slate-500 font-medium"
														>
															No schedule periods generated yet. Activate loan
															to generate full schedule.
														</td>
													</tr>
												) : (
													schedules.map((s) => {
														const totalDue =
															s.totalDue || s.principalDue + s.interestDue;
														const paidAmount = s.paidAmount || 0;
														const isPaid =
															s.status === "PAID" || paidAmount >= totalDue;

														return (
															<tr
																key={s.id}
																className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors"
															>
																<td className="py-3 px-4 font-extrabold text-slate-900 dark:text-slate-100">
																	Month #{s.periodNumber}
																</td>
																<td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
																	{s.dueDate
																		? new Date(s.dueDate).toLocaleDateString()
																		: "—"}
																</td>
																<td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
																	{loan.currency || "USD"}{" "}
																	{(s.principalDue || 0).toLocaleString(
																		undefined,
																		{ minimumFractionDigits: 2 },
																	)}
																</td>
																<td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
																	{loan.currency || "USD"}{" "}
																	{(s.interestDue || 0).toLocaleString(
																		undefined,
																		{ minimumFractionDigits: 2 },
																	)}
																</td>
																<td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
																	{loan.currency || "USD"}{" "}
																	{totalDue.toLocaleString(undefined, {
																		minimumFractionDigits: 2,
																	})}
																</td>
																<td className="py-3 px-4">
																	{renderScheduleStatus(
																		s.status,
																		paidAmount,
																		totalDue,
																	)}
																</td>
																<td className="py-3 px-4 text-right">
																	{!isPaid ? (
																		<Button
																			size="sm"
																			onClick={() => openPayDialog(s)}
																			className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3.5 gap-1.5 shadow-sm"
																		>
																			<Zap className="h-3.5 w-3.5 fill-current" />
																			<span>Pay Now</span>
																		</Button>
																	) : (
																		<span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
																			✓ Paid Done
																		</span>
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
							</ModernTabsContent>

							{/* TAB 2: FINANCED ASSETS / COLLATERAL */}
							<ModernTabsContent value="items" className="space-y-3">
								<div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs sm:text-sm">
											<thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
												<tr>
													<th className="py-3 px-4">Asset / Product</th>
													<th className="py-3 px-4">Model & Condition</th>
													<th className="py-3 px-4">Serial / VIN / IMEI</th>
													<th className="py-3 px-4">Unit Price Snapshot</th>
													<th className="py-3 px-4">Specs Attributes</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
												{items.length === 0 ? (
													<tr>
														<td
															colSpan={5}
															className="p-8 text-center text-slate-500 font-medium"
														>
															No collateral or financed product items attached
															to this loan contract.
														</td>
													</tr>
												) : (
													items.map((item, idx) => (
														<tr
															key={item.id || idx}
															className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
														>
															<td className="py-3 px-4">
																<div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
																	<Package className="h-4 w-4 text-sky-500 shrink-0" />
																	<span>
																		{item.productName ||
																			"Financed Product Item"}
																	</span>
																</div>
															</td>
															<td className="py-3 px-4">
																<div className="flex items-center gap-1.5">
																	<span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
																		{item.productModel || "Standard"}
																	</span>
																	<Badge
																		variant={
																			item.condition === "NEW"
																				? "default"
																				: "secondary"
																		}
																		className="text-[10px]"
																	>
																		{item.condition || "NEW"}
																	</Badge>
																</div>
															</td>
															<td className="py-3 px-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
																{item.serialNumber ? (
																	<span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
																		{item.serialNumber}
																	</span>
																) : (
																	<span className="text-slate-400 font-normal">
																		N/A
																	</span>
																)}
															</td>
															<td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
																{item.currency || loan.currency || "USD"}{" "}
																{(item.unitPriceSnapshot || 0).toLocaleString(
																	undefined,
																	{ minimumFractionDigits: 2 },
																)}
															</td>
															<td className="py-3 px-4">
																{item.attributesSnapshot &&
																Object.keys(item.attributesSnapshot).length >
																	0 ? (
																	<div className="flex flex-wrap gap-1">
																		{Object.entries(
																			item.attributesSnapshot,
																		).map(([k, v]) => (
																			<Badge
																				key={k}
																				variant="outline"
																				className="text-[10px] py-0 px-1 font-normal bg-slate-50 dark:bg-slate-800"
																			>
																				<span className="font-semibold text-slate-500">
																					{k}:
																				</span>
																				&nbsp;{String(v)}
																			</Badge>
																		))}
																	</div>
																) : (
																	<span className="text-slate-400 text-xs">
																		—
																	</span>
																)}
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							</ModernTabsContent>

							{/* TAB 3: CONNECTED INVOICES */}
							<ModernTabsContent value="invoices" className="space-y-3">
								<div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-sm">
									<div className="overflow-x-auto">
										<table className="w-full text-left text-xs sm:text-sm">
											<thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-600 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
												<tr>
													<th className="py-3 px-4">Invoice No</th>
													<th className="py-3 px-4">Due Date</th>
													<th className="py-3 px-4">Amount</th>
													<th className="py-3 px-4">Status</th>
													<th className="py-3 px-4 text-right">Action</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
												{invoices.length === 0 ? (
													<tr>
														<td
															colSpan={5}
															className="p-8 text-center text-slate-500 font-medium"
														>
															No billing invoices issued yet for this loan.
														</td>
													</tr>
												) : (
													invoices.map((inv) => (
														<tr
															key={inv.id}
															className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
														>
															<td className="py-3 px-4 font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
																{inv.invoiceNo}
															</td>
															<td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono">
																{inv.dueDate
																	? new Date(inv.dueDate).toLocaleDateString()
																	: "—"}
															</td>
															<td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-slate-100">
																{inv.currency || "USD"}{" "}
																{(inv.totalAmount || 0).toLocaleString(
																	undefined,
																	{ minimumFractionDigits: 2 },
																)}
															</td>
															<td className="py-3 px-4">
																<Badge
																	variant={
																		inv.status === "PAID"
																			? "default"
																			: "secondary"
																	}
																	className="font-bold text-xs px-2.5 py-0.5"
																>
																	{inv.status}
																</Badge>
															</td>
															<td className="py-3 px-4 text-right">
																<span className="text-xs text-slate-500 font-medium">
																	Issued
																</span>
															</td>
														</tr>
													))
												)}
											</tbody>
										</table>
									</div>
								</div>
							</ModernTabsContent>
						</ModernTabs>
					</div>
				) : (
					<div className="p-8 text-center text-slate-500 font-medium">
						Loan record not found.
					</div>
				)}
			</ModernModal>

			{/* QUICK PAYMENT COLLECTION DIALOG */}
			<ModernModal
				isOpen={!!payingSchedule}
				onClose={() => setPayingSchedule(null)}
				title={`Collect Payment for Period #${payingSchedule?.periodNumber}`}
				subtitle={`Loan ${loan?.loanKey} — Borrower: ${customer?.name || "Customer"}`}
				icon={<Zap className="h-5 w-5 text-emerald-500 fill-current" />}
				size="md"
				isLoading={paymentMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setPayingSchedule(null)} />
						<ModernModalSubmitButton
							onClick={handlePaySubmit}
							isLoading={paymentMutation.isPending}
						>
							Confirm Payment Collection
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form onSubmit={handlePaySubmit} className="space-y-4 py-2 text-xs">
					<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 flex items-center justify-between">
						<div>
							<span className="text-slate-500 block font-medium">
								Installment Period:
							</span>
							<span className="font-bold text-sm text-slate-900 dark:text-slate-100">
								Month #{payingSchedule?.periodNumber} (Due:{" "}
								{payingSchedule?.dueDate
									? new Date(payingSchedule.dueDate).toLocaleDateString()
									: "N/A"}
								)
							</span>
						</div>
						<div className="text-right font-mono">
							<span className="text-slate-500 block text-[11px]">
								Total Installment Due:
							</span>
							<span className="font-black text-base text-emerald-600 dark:text-emerald-400">
								{loan?.currency || "USD"}{" "}
								{(
									(payingSchedule?.totalDue ||
										(payingSchedule?.principalDue || 0) +
											(payingSchedule?.interestDue || 0)) -
									(payingSchedule?.paidAmount || 0)
								).toLocaleString(undefined, { minimumFractionDigits: 2 })}
							</span>
						</div>
					</div>

					<ModernInput
						label="Payment Amount"
						type="number"
						step="any"
						value={amountPaid}
						onChange={(e) => setAmountPaid(Number(e.target.value))}
						required
					/>

					<ModernSelect
						label="Payment Method"
						value={paymentMethod}
						onChange={(val) => setPaymentMethod(val as string)}
						options={[
							{ value: "CASH", label: "Cash Payment" },
							{ value: "BANK_TRANSFER", label: "ABA Bank Transfer / KHQR" },
							{ value: "CHIP_MONG", label: "Chip Mong Bank" },
							{ value: "CHECK", label: "Check / Cheque" },
						]}
					/>

					<ModernTextarea
						label="Payment Notes / Transaction Ref"
						placeholder="e.g. Received cash at counter, KHQR Ref #99281..."
						value={paymentNotes}
						onChange={(e) => setPaymentNotes(e.target.value)}
						rows={2}
					/>
				</form>
			</ModernModal>
		</>
	);
}

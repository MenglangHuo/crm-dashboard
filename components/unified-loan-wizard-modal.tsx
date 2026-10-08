"use client";

import { getErrorMessage } from "@/lib/api/client";
import {
	customersApi,
	financeApi,
	loansApi,
	productsApi,
} from "@/lib/api/endpoints";
import { Loan } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Calculator,
	CheckCircle2,
	Package,
	Sparkles,
	Table as TableIcon,
	User
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useQuickActions } from "@/components/quick-action-modal-context";
import {
	ModernInput,
	ModernSelect,
	ModernSwitch
} from "@/components/ui-custom/form-controls";
import {
	ModernModal,
	ModernModalCancelButton,
	ModernModalFooter,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";

export function UnifiedLoanWizardModal() {
	const { isLoanWizardOpen, closeLoanWizard, loanWizardInitialData } =
		useQuickActions();
	const queryClient = useQueryClient();

	// Fetch Customers & Products for dropdown selection
	const { data: customersData } = useQuery({
		queryKey: ["customers-list-wizard"],
		queryFn: () => customersApi.list({ limit: 100 }),
		enabled: isLoanWizardOpen,
	});

	const { data: productsData } = useQuery({
		queryKey: ["products-list-wizard"],
		queryFn: () => productsApi.list({ limit: 100 }),
		enabled: isLoanWizardOpen,
	});

	// SECTION A: Customer State
	const [isQuickAddCustomer, setIsQuickAddCustomer] = useState(false);
	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [newCustomerName, setNewCustomerName] = useState("");
	const [newCustomerPhone, setNewCustomerPhone] = useState("");
	const [newCustomerNationalId, setNewCustomerNationalId] = useState("");
	const [newCustomerAddress, setNewCustomerAddress] = useState("");

	// SECTION B: Asset & Pricing State
	const [selectedProductId, setSelectedProductId] = useState("");
	const [assetPrice, setAssetPrice] = useState<number>(0);
	const [downPayment, setDownPayment] = useState<number>(0);
	const [currency, setCurrency] = useState("USD");

	// SECTION C: Loan Terms & Strategy State
	const [termFrequency, setTermFrequency] = useState<"MONTHLY" | "WEEKLY">(
		"MONTHLY",
	);
	const [numberOfPeriods, setNumberOfPeriods] = useState<number>(12);
	const [annualInterestRate, setAnnualInterestRate] = useState<number>(12); // % per year
	const [interestMethod, setInterestMethod] = useState<
		"EMI" | "FLAT" | "EQUAL_PRINCIPAL"
	>("EMI");
	const [loanDescription, setLoanDescription] = useState("");

	// Pre-fill initial data when opened from Product catalog or Customer profile
	useEffect(() => {
		if (loanWizardInitialData) {
			if (loanWizardInitialData.productId) {
				setSelectedProductId(loanWizardInitialData.productId);
			}
			if (loanWizardInitialData.sellPrice !== undefined) {
				setAssetPrice(loanWizardInitialData.sellPrice);
			}
			if (loanWizardInitialData.customerId) {
				setSelectedCustomerId(loanWizardInitialData.customerId);
			}
		}
	}, [loanWizardInitialData]);

	// Handle Product Selection auto-fill price
	const handleSelectProduct = (productId: string) => {
		setSelectedProductId(productId);
		const product = productsData?.items?.find((p) => p.id === productId);
		if (product) {
			setAssetPrice(product.sellPrice || product.basePrice || 0);
			if (product.currency) setCurrency(product.currency);
		}
	};

	// Financed Principal calculation
	const financedPrincipal = useMemo(() => {
		const p = Math.max(0, assetPrice - downPayment);
		return Math.round(p * 100) / 100;
	}, [assetPrice, downPayment]);

	// Amortization Schedule Calculation Preview
	const schedulePreview = useMemo(() => {
		const periods = Math.max(1, numberOfPeriods);
		const P = financedPrincipal;
		const ratePct = Math.max(0, annualInterestRate);
		const freqFactor = termFrequency === "WEEKLY" ? 52 : 12;
		const periodicRate = ratePct / 100 / freqFactor;

		const rows = [];
		let balance = P;
		let totalInterestAccrued = 0;
		let totalPayableAccrued = 0;

		const today = new Date();

		if (interestMethod === "EMI") {
			let pmt = 0;
			if (periodicRate > 0) {
				pmt =
					(P * periodicRate * Math.pow(1 + periodicRate, periods)) /
					(Math.pow(1 + periodicRate, periods) - 1);
			} else {
				pmt = P / periods;
			}

			for (let i = 1; i <= periods; i++) {
				const interestDue = balance * periodicRate;
				let principalDue = pmt - interestDue;
				if (i === periods) {
					principalDue = balance;
					pmt = principalDue + interestDue;
				}
				const nextBalance = Math.max(0, balance - principalDue);

				const dueDate = new Date(today);
				if (termFrequency === "WEEKLY") {
					dueDate.setDate(dueDate.getDate() + i * 7);
				} else {
					dueDate.setMonth(dueDate.getMonth() + i);
				}

				rows.push({
					period: i,
					dueDate: dueDate.toISOString().split("T")[0],
					payment: Math.round(pmt * 100) / 100,
					principal: Math.round(principalDue * 100) / 100,
					interest: Math.round(interestDue * 100) / 100,
					remainingBalance: Math.round(nextBalance * 100) / 100,
				});

				totalInterestAccrued += interestDue;
				totalPayableAccrued += pmt;
				balance = nextBalance;
			}
		} else if (interestMethod === "FLAT") {
			const totalInterest = P * (ratePct / 100) * (periods / freqFactor);
			const interestPerPeriod = totalInterest / periods;
			const principalPerPeriod = P / periods;
			const pmt = principalPerPeriod + interestPerPeriod;

			for (let i = 1; i <= periods; i++) {
				const nextBalance = Math.max(0, balance - principalPerPeriod);
				const dueDate = new Date(today);
				if (termFrequency === "WEEKLY") {
					dueDate.setDate(dueDate.getDate() + i * 7);
				} else {
					dueDate.setMonth(dueDate.getMonth() + i);
				}

				rows.push({
					period: i,
					dueDate: dueDate.toISOString().split("T")[0],
					payment: Math.round(pmt * 100) / 100,
					principal: Math.round(principalPerPeriod * 100) / 100,
					interest: Math.round(interestPerPeriod * 100) / 100,
					remainingBalance: Math.round(nextBalance * 100) / 100,
				});

				totalInterestAccrued += interestPerPeriod;
				totalPayableAccrued += pmt;
				balance = nextBalance;
			}
		} else {
			// EQUAL_PRINCIPAL
			const principalPerPeriod = P / periods;
			for (let i = 1; i <= periods; i++) {
				const interestDue = balance * periodicRate;
				const pmt = principalPerPeriod + interestDue;
				const nextBalance = Math.max(0, balance - principalPerPeriod);

				const dueDate = new Date(today);
				if (termFrequency === "WEEKLY") {
					dueDate.setDate(dueDate.getDate() + i * 7);
				} else {
					dueDate.setMonth(dueDate.getMonth() + i);
				}

				rows.push({
					period: i,
					dueDate: dueDate.toISOString().split("T")[0],
					payment: Math.round(pmt * 100) / 100,
					principal: Math.round(principalPerPeriod * 100) / 100,
					interest: Math.round(interestDue * 100) / 100,
					remainingBalance: Math.round(nextBalance * 100) / 100,
				});

				totalInterestAccrued += interestDue;
				totalPayableAccrued += pmt;
				balance = nextBalance;
			}
		}

		return {
			rows,
			monthlyInstallment: rows[0]?.payment || 0,
			totalInterest: Math.round(totalInterestAccrued * 100) / 100,
			totalPayable: Math.round(totalPayableAccrued * 100) / 100,
		};
	}, [
		financedPrincipal,
		numberOfPeriods,
		annualInterestRate,
		termFrequency,
		interestMethod,
	]);

	// Single 1-Click Submission Workflow
	const submitWizardMutation = useMutation({
		mutationFn: async () => {
			let customerIdToUse = selectedCustomerId;

			// Step 1: Inline Customer creation if enabled
			if (isQuickAddCustomer) {
				if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
					throw new Error(
						"Customer name and phone number are required for quick-add",
					);
				}
				const createdCustomer = await customersApi.create({
					name: newCustomerName,
					phone: newCustomerPhone,
					nationalId: newCustomerNationalId || undefined,
					address: newCustomerAddress || undefined,
					preferredCurrency: currency,
					isActive: true,
				});
				customerIdToUse = String(createdCustomer.id);
			}

			if (!customerIdToUse) {
				throw new Error("Please select or quick-add a customer");
			}
			if (financedPrincipal <= 0) {
				throw new Error("Financed Principal must be greater than 0");
			}

			// Step 2: Create Loan Record
			const loanKey = `LN-${Math.floor(100000 + Math.random() * 900000)}`;
			const bps = Math.round(annualInterestRate * 100);

			const loanPayload: Partial<Loan> = {
				loanKey,
				customerId: customerIdToUse,
				currency,
				assetPrice,
				deposit: downPayment,
				principal: financedPrincipal,
				totalInterest:
					typeof schedulePreview.totalInterest === "number" &&
					!isNaN(schedulePreview.totalInterest)
						? schedulePreview.totalInterest
						: 0,
				interestRateBps: bps,
				interestMethod,
				term: `${numberOfPeriods} ${termFrequency}`,
				numberOfPeriods,
				description:
					loanDescription ||
					(selectedProductId
						? `Asset Loan for product item`
						: `Personal Installment Loan`),
				notes: `Auto-originated via 1-Click Studio Wizard`,
			};

			const createdLoan = await loansApi.create(loanPayload);

			// Step 3: Auto-Activate Loan
			let activatedLoan = createdLoan;
			try {
				activatedLoan = await loansApi.activate(createdLoan.id, {
					notes: "Auto-activated via 1-Click Origination",
				});
			} catch (err) {
				console.warn("Auto-activation notice:", err);
			}

			// Step 4: Generate First Installment Invoice
			try {
				const firstRow = schedulePreview.rows[0];
				if (firstRow) {
					await financeApi.generateInvoice({
						customerId: customerIdToUse,
						loanId: createdLoan.id,
						invoiceNo: `INV-${loanKey}-01`,
						totalAmount: firstRow.payment,
						currency,
						subtotal: firstRow.principal,
						taxAmount: firstRow.interest,
						dueDate: firstRow.dueDate,
						description: `Installment Period #1 due for Loan ${loanKey}`,
					});
				}
			} catch (err) {
				console.warn("First invoice generation notice:", err);
			}

			return activatedLoan;
		},
		onSuccess: (loan) => {
			toast.success(
				`Loan ${loan?.loanKey || ""} originated & activated successfully!`,
				{
					description: "Billing invoice for Period #1 generated automatically.",
				},
			);
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			closeLoanWizard();
		},
		onError: (err) => {
			toast.error(getErrorMessage(err));
		},
	});

	return (
		<ModernModal
			isOpen={isLoanWizardOpen}
			onClose={closeLoanWizard}
			title="1-Click Loan Origination Wizard"
			subtitle="Unified 3-step asset financing, instant repayment calculation, and automated billing activation."
			icon={<Sparkles className="h-5 w-5 text-emerald-500" />}
			size="xl"
			isLoading={submitWizardMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={closeLoanWizard} />
					<ModernModalSubmitButton
						onClick={() => submitWizardMutation.mutate()}
						isLoading={submitWizardMutation.isPending}
						icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
					>
						Originate & Activate Loan
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-6 py-1">
				{/* Step Indicator Section Header */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs">
							A
						</div>
						<div>
							<h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Customer Selection
							</h5>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								Borrower profile
							</p>
						</div>
					</div>

					<div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 font-bold text-xs">
							B
						</div>
						<div>
							<h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Asset & Pricing
							</h5>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								Price & down payment
							</p>
						</div>
					</div>

					<div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60 flex items-center gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 font-bold text-xs">
							C
						</div>
						<div>
							<h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Terms & Strategy
							</h5>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								Periods & EMI calculation
							</p>
						</div>
					</div>
				</div>

				{/* SECTION A: Customer Selection */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<User className="h-4 w-4 text-emerald-500" />
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
								Section A: Borrower Info
							</h4>
						</div>
						<ModernSwitch
							label="Quick-Add New Customer Inline"
							checked={isQuickAddCustomer}
							onCheckedChange={setIsQuickAddCustomer}
						/>
					</div>

					{!isQuickAddCustomer ? (
						<ModernSelect
							label="Select Existing Customer"
							placeholder="Search by customer name, phone, national ID..."
							value={selectedCustomerId}
							onChange={setSelectedCustomerId}
							options={
								customersData?.items?.map((c) => ({
									value: String(c.id),
									label: `${c.name} (${c.phone || c.nationalId || "No Contact"})`,
									description: c.address || c.occupation || c.email,
								})) || []
							}
							searchable
						/>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
							<ModernInput
								label="Customer Full Name"
								placeholder="e.g. Chan Dara"
								value={newCustomerName}
								onChange={(e) => setNewCustomerName(e.target.value)}
								required
							/>
							<ModernInput
								label="Phone Number"
								placeholder="e.g. +855 12 345 678"
								value={newCustomerPhone}
								onChange={(e) => setNewCustomerPhone(e.target.value)}
								required
							/>
							<ModernInput
								label="National ID Card No."
								placeholder="e.g. ID-098765432"
								value={newCustomerNationalId}
								onChange={(e) => setNewCustomerNationalId(e.target.value)}
							/>
							<ModernInput
								label="Street Address / Location"
								placeholder="e.g. Phnom Penh, Cambodia"
								value={newCustomerAddress}
								onChange={(e) => setNewCustomerAddress(e.target.value)}
							/>
						</div>
					)}
				</div>

				{/* SECTION B: Asset & Pricing */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
					<div className="flex items-center gap-2">
						<Package className="h-4 w-4 text-sky-500" />
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
							Section B: Asset & Pricing Structure
						</h4>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ModernSelect
							label="Select Product / Asset (Optional)"
							placeholder="Search product catalog item..."
							value={selectedProductId}
							onChange={handleSelectProduct}
							options={
								productsData?.items?.map((p) => ({
									value: String(p.id),
									label: `${p.name} - ${p.currency || "$"} ${p.sellPrice?.toLocaleString()}`,
									description: p.model
										? `Model: ${p.model}`
										: p.serialNumber
											? `S/N: ${p.serialNumber}`
											: undefined,
								})) || []
							}
							searchable
						/>

						<ModernSelect
							label="Currency"
							value={currency}
							onChange={(val) => setCurrency(val as any)}
							options={[
								{ value: "USD", label: "USD ($)" },
								{ value: "KHR", label: "KHR (៛)" },
								{ value: "THB", label: "THB (฿)" },
							]}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<ModernInput
							label="Total Asset Price ($)"
							type="number"
							step="any"
							value={assetPrice}
							onChange={(e) => setAssetPrice(Number(e.target.value) || 0)}
							required
						/>

						<ModernInput
							label="Down Payment / Deposit ($)"
							type="number"
							step="any"
							value={downPayment}
							onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
						/>

						<div className="flex flex-col justify-end">
							<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-right">
								<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
									Financed Principal
								</span>
								<span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
									{currency} {financedPrincipal.toLocaleString()}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* SECTION C: Loan Terms & Strategy */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-4">
					<div className="flex items-center gap-2">
						<Calculator className="h-4 w-4 text-violet-500" />
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
							Section C: Terms & Repayment Strategy
						</h4>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<ModernSelect
							label="Frequency"
							value={termFrequency}
							onChange={(val) => setTermFrequency(val as any)}
							options={[
								{ value: "MONTHLY", label: "Monthly" },
								{ value: "WEEKLY", label: "Weekly" },
							]}
						/>

						<ModernInput
							label="Number of Periods (e.g. 50)"
							type="number"
							min={1}
							max={120}
							value={numberOfPeriods}
							onChange={(e) => setNumberOfPeriods(Number(e.target.value) || 1)}
							required
						/>

						<ModernInput
							label="Interest Rate (% / year)"
							type="number"
							step="0.1"
							value={annualInterestRate}
							onChange={(e) =>
								setAnnualInterestRate(Number(e.target.value) || 0)
							}
							required
						/>

						<ModernSelect
							label="Calculation Method"
							value={interestMethod}
							onChange={(val) => setInterestMethod(val as any)}
							options={[
								{ value: "EMI", label: "EMI (Equal Installment)" },
								{ value: "FLAT", label: "FLAT Rate" },
								{
									value: "EQUAL_PRINCIPAL",
									label: "Equal Principal + Declining",
								},
							]}
						/>
					</div>

					<ModernInput
						label="Loan Description / Purpose Notes (Optional)"
						placeholder="e.g. Vehicle Financing Plan for 50 months..."
						value={loanDescription}
						onChange={(e) => setLoanDescription(e.target.value)}
					/>
				</div>

				{/* LIVE SCHEDULE CALCULATION PREVIEW TABLE */}
				<div className="rounded-2xl border border-slate-200/80 bg-slate-900 text-white p-4 dark:border-slate-800 space-y-3">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
						<div className="flex items-center gap-2">
							<TableIcon className="h-4 w-4 text-emerald-400" />
							<h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
								Live Repayment Schedule Preview
							</h4>
						</div>

						<div className="flex items-center gap-3 text-xs">
							<div>
								<span className="text-slate-400">Monthly Installment: </span>
								<span className="font-extrabold text-emerald-400">
									{currency}{" "}
									{schedulePreview.monthlyInstallment.toLocaleString()}
								</span>
							</div>
							<div>
								<span className="text-slate-400">Total Interest: </span>
								<span className="font-bold text-slate-200">
									{currency} {schedulePreview.totalInterest.toLocaleString()}
								</span>
							</div>
							<div>
								<span className="text-slate-400">Total Payable: </span>
								<span className="font-bold text-slate-100">
									{currency} {schedulePreview.totalPayable.toLocaleString()}
								</span>
							</div>
						</div>
					</div>

					{/* Schedule Table */}
					<div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80">
						<table className="w-full text-left text-xs">
							<thead className="sticky top-0 bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
								<tr>
									<th className="px-3 py-2">Period #</th>
									<th className="px-3 py-2">Due Date</th>
									<th className="px-3 py-2 text-right">Payment Amount</th>
									<th className="px-3 py-2 text-right">Principal</th>
									<th className="px-3 py-2 text-right">Interest</th>
									<th className="px-3 py-2 text-right">Remaining Balance</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
								{schedulePreview.rows.map((row) => (
									<tr
										key={row.period}
										className="hover:bg-slate-900/60 transition-colors"
									>
										<td className="px-3 py-2 font-bold text-slate-300">
											#{row.period}
										</td>
										<td className="px-3 py-2 text-slate-400">{row.dueDate}</td>
										<td className="px-3 py-2 text-right font-bold text-emerald-400">
											{currency}{" "}
											{row.payment.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-3 py-2 text-right text-slate-200">
											{currency}{" "}
											{row.principal.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-3 py-2 text-right text-amber-400">
											{currency}{" "}
											{row.interest.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
										<td className="px-3 py-2 text-right text-slate-400">
											{currency}{" "}
											{row.remainingBalance.toLocaleString(undefined, {
												minimumFractionDigits: 2,
											})}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</ModernModal>
	);
}

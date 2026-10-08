"use client";

import { getErrorMessage } from "@/lib/api/client";
import {
	customersApi,
	fileUrl,
	financeApi,
	invoicesApi,
} from "@/lib/api/endpoints";
import { uploadService } from "@/lib/services/file-uploader";
import { CreatePaymentRequest, Invoice } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	CreditCard,
	DollarSign,
	Eye,
	FileText,
	Loader2,
	Sparkles,
	Tag,
	Trash2,
	UploadCloud,
	X,
	Zap
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useQuickActions } from "@/components/quick-action-modal-context";
import {
	ModernDatePicker,
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import {
	ModernModal,
	ModernModalCancelButton,
	ModernModalFooter,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export function QuickPaymentModal() {
	const { t } = useTranslation();
	const { isQuickPayOpen, closeQuickPay, quickPayInitialData } =
		useQuickActions();

	const queryClient = useQueryClient();

	// Fetch Customers & Invoices for selection
	const { data: customersData } = useQuery({
		queryKey: ["customers-list-pay"],
		queryFn: () => customersApi.list({ limit: 100 }),
		enabled: isQuickPayOpen,
	});

	const { data: invoicesData } = useQuery({
		queryKey: ["invoices-list-pay"],
		queryFn: () => financeApi.listInvoices({ limit: 100 }),
		enabled: isQuickPayOpen,
	});

	const [selectedCustomerId, setSelectedCustomerId] = useState("");
	const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
	const [paymentAmount, setPaymentAmount] = useState<number>(0);
	const currency = "USD";
	const paymentMethod = "BANK_TRANSFER";
	const [reference, setReference] = useState("");
	const [paymentDate, setPaymentDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [notes, setNotes] = useState("");

	// Receipt / Attachment State
	const [receiptUrl, setReceiptUrl] = useState<string>("");
	const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
	const [previewImageModal, setPreviewImageModal] = useState<string | null>(
		null,
	);
	const [isDraggingReceipt, setIsDraggingReceipt] = useState(false);
	const receiptFileInputRef = React.useRef<HTMLInputElement>(null);

	// Discount & Early Settlement State
	const [discountAmount, setDiscountAmount] = useState<number | "">("");
	const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
		"FLAT",
	);
	const [discountReason, setDiscountReason] = useState("");
	const [showDiscountSection, setShowDiscountSection] = useState(false);

	// Fetch single invoice details if selectedInvoiceId is set
	const { data: singleInvoiceData } = useQuery({
		queryKey: ["invoice-quickpay-single", selectedInvoiceId],
		queryFn: () =>
			selectedInvoiceId
				? invoicesApi.get(selectedInvoiceId)
				: Promise.resolve(null),
		enabled: Boolean(selectedInvoiceId) && isQuickPayOpen,
	});

	// Selected Invoice info
	const selectedInvoice: Invoice | null =
		invoicesData?.items?.find(
			(i) => String(i.id) === String(selectedInvoiceId),
		) ||
		(singleInvoiceData as any)?.data ||
		(singleInvoiceData as any)?.invoice ||
		(singleInvoiceData?.id ? singleInvoiceData : null);

	// Pre-fill initial data when opened from Customer Profile, Finance, or Invoices table
	useEffect(() => {
		if (quickPayInitialData) {
			if (quickPayInitialData.customerId)
				setSelectedCustomerId(String(quickPayInitialData.customerId));
			if (quickPayInitialData.invoiceId)
				setSelectedInvoiceId(String(quickPayInitialData.invoiceId));
			if (quickPayInitialData.amount !== undefined)
				setPaymentAmount(quickPayInitialData.amount);
			if (quickPayInitialData.receiptUrl)
				setReceiptUrl(quickPayInitialData.receiptUrl);
			else setReceiptUrl("");
		} else {
			setReference(`PAY-${Math.floor(100000 + Math.random() * 900000)}`);
			setReceiptUrl("");
		}
	}, [quickPayInitialData, isQuickPayOpen]);

	// Automatically sync Customer when invoice is selected or resolved
	useEffect(() => {
		if (!selectedInvoice) return;

		const custId = String(
			selectedInvoice.customerId ||
				selectedInvoice.customer?.id ||
				(typeof selectedInvoice.customer === "string"
					? selectedInvoice.customer
					: "") ||
				(typeof selectedInvoice.customer === "number"
					? String(selectedInvoice.customer)
					: ""),
		);

		if (
			custId &&
			custId !== "undefined" &&
			custId !== "null" &&
			(!selectedCustomerId || selectedCustomerId !== custId)
		) {
			setSelectedCustomerId(custId);
		}

		const rem =
			selectedInvoice.remainingAmount !== undefined
				? selectedInvoice.remainingAmount
				: Math.max(
						0,
						(selectedInvoice.totalAmount || 0) -
							(selectedInvoice.paidAmount || 0) -
							(selectedInvoice.paymentDiscountAmount || 0),
					);

		if (
			rem > 0 &&
			(paymentAmount === 0 || quickPayInitialData?.amount === undefined)
		) {
			setPaymentAmount(rem);
		}
	}, [selectedInvoice, selectedCustomerId, quickPayInitialData, paymentAmount]);

	// Handle invoice selection auto-fill
	const handleSelectInvoice = (invId: string) => {
		setSelectedInvoiceId(invId);
		setDiscountAmount("");
		setDiscountReason("");
		setShowDiscountSection(false);

		const inv = invoicesData?.items?.find(
			(i) => String(i.id) === String(invId),
		);
		if (inv) {
			const rem =
				inv.remainingAmount !== undefined
					? inv.remainingAmount
					: Math.max(
							0,
							(inv.totalAmount || 0) -
								(inv.paidAmount || 0) -
								(inv.paymentDiscountAmount || 0),
						);
			setPaymentAmount(rem > 0 ? rem : inv.totalAmount || 0);
			const custId = String(inv.customerId || inv.customer?.id || "");
			if (custId) setSelectedCustomerId(custId);
		}
	};

	const currentTotalAmount = selectedInvoice?.totalAmount || paymentAmount || 0;
	const maxAllowablePay =
		selectedInvoice?.remainingAmount !== undefined
			? Number(selectedInvoice.remainingAmount)
			: selectedInvoice
				? Math.max(
						0,
						(selectedInvoice.totalAmount || 0) -
							(selectedInvoice.paidAmount || 0) -
							(selectedInvoice.paymentDiscountAmount || 0),
					)
				: currentTotalAmount;

	// Early Payment Discount Availability Detection
	const earlyDiscountInfo = useMemo(() => {
		if (!selectedInvoice) return null;

		const discountDeadline = selectedInvoice.discountDeadline;
		const earlyPct = Number(
			selectedInvoice.earlyDiscountPct ||
				selectedInvoice.paymentTerm?.discountPercentage ||
				0,
		);

		if (!discountDeadline || earlyPct <= 0 || maxAllowablePay <= 0) return null;

		const deadlineDate = new Date(discountDeadline);
		const today = new Date();
		const isEligible =
			today.getTime() <= deadlineDate.getTime() + 24 * 60 * 60 * 1000; // inclusive of deadline day

		if (!isEligible) return null;

		const calculatedSavings =
			Math.round(((maxAllowablePay * earlyPct) / 100) * 100) / 100;
		const netDue = Math.max(0, maxAllowablePay - calculatedSavings);

		return {
			percentage: earlyPct,
			deadline: deadlineDate,
			savings: calculatedSavings,
			netDue: netDue,
			termName:
				selectedInvoice.paymentTerm?.name || `${earlyPct}% Early Discount`,
		};
	}, [selectedInvoice, maxAllowablePay]);

	// 1-Click Apply Early Discount Handler
	const handleApplyEarlyDiscount = () => {
		if (!earlyDiscountInfo) return;
		setDiscountAmount(earlyDiscountInfo.savings);
		setDiscountType("FLAT");
		setDiscountReason(
			`${earlyDiscountInfo.percentage}% early payment incentive (${earlyDiscountInfo.termName})`,
		);
		setPaymentAmount(earlyDiscountInfo.netDue);
		setShowDiscountSection(true);
		toast.success(
			`Applied $${earlyDiscountInfo.savings.toFixed(2)} (${earlyDiscountInfo.percentage}%) early cash discount!`,
		);
	};

	// Resolved Effective Discount & Remaining Balance
	const effectiveDiscount = useMemo(() => {
		if (discountAmount === "" || Number(discountAmount) <= 0) return 0;
		if (discountType === "PERCENTAGE") {
			return (maxAllowablePay * Number(discountAmount)) / 100;
		}
		return Number(discountAmount);
	}, [discountAmount, discountType, maxAllowablePay]);

	const totalCredit = paymentAmount + effectiveDiscount;
	const remainingBalance = Math.max(0, maxAllowablePay - totalCredit);

	// Receipt upload handlers
	const handleFileChange = async (file: File) => {
		if (file.size > 10 * 1024 * 1024) {
			toast.error("Receipt file size cannot exceed 10MB");
			return;
		}

		setIsUploadingReceipt(true);
		try {
			const res = await uploadService.uploadSingle(file, {
				category: "PAYMENTS",
				folder: "receipts",
			});
			const uploadedUrl = res.url || res.fileKey || res.storageKey || "";
			setReceiptUrl(uploadedUrl);
			toast.success("Payment receipt uploaded successfully");
		} catch {
			toast.warning("Server upload error, using local file preview");
			const reader = new FileReader();
			reader.onload = (e) => {
				if (e.target?.result) {
					setReceiptUrl(String(e.target.result));
				}
			};
			reader.readAsDataURL(file);
		} finally {
			setIsUploadingReceipt(false);
			if (receiptFileInputRef.current) receiptFileInputRef.current.value = "";
		}
	};

	const handleDropReceipt = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingReceipt(false);
		if (isUploadingReceipt) return;
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			handleFileChange(e.dataTransfer.files[0]);
		}
	};

	// Idempotency key state
	const [idempotencyKey, setIdempotencyKey] = useState<string>("");

	useEffect(() => {
		if (isQuickPayOpen) {
			setIdempotencyKey(
				`pay_req_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
			);
		}
	}, [isQuickPayOpen]);

	// Payment process mutation
	const processPaymentMutation = useMutation({
		mutationFn: async () => {
			if (!selectedCustomerId) throw new Error("Please select a customer");
			if (paymentAmount <= 0)
				throw new Error("Payment amount must be greater than 0");
			if (selectedInvoice && totalCredit > maxAllowablePay + 0.001) {
				throw new Error(
					`Total payment + discount ($${totalCredit.toFixed(2)}) cannot exceed remaining invoice balance ($${maxAllowablePay.toFixed(2)})`,
				);
			}

			const payload: CreatePaymentRequest = {
				invoiceId: selectedInvoiceId || undefined,
				amount: paymentAmount,
				discountAmount: effectiveDiscount > 0 ? effectiveDiscount : 0,
				discountType: "FLAT", // resolved to flat dollar amount for API consistency
				discountReason: discountReason.trim() || undefined,
				paymentDate: paymentDate
					? new Date(paymentDate).toISOString()
					: new Date().toISOString(),
				paymentMethod: "BANK_TRANSFER",
				referenceNumber: reference || undefined,
				notes: notes || undefined,
				receiptUrl: receiptUrl.trim() || undefined,
				// status: "COMPLETED",
			};

			return await financeApi.processPayment(payload, idempotencyKey);
		},
		onSuccess: (payment) => {
			const cust = customersData?.items?.find(
				(c) => String(c.id) === String(selectedCustomerId),
			);
			toast.success(
				t("quickPay.paymentRecordedSuccess", "Payment recorded successfully!"),
				{
					description: `Collected ${currency} ${paymentAmount.toLocaleString()} via Bank Transfer${
						effectiveDiscount > 0
							? ` with $${effectiveDiscount.toFixed(2)} cash discount`
							: ""
					}`,
				},
			);

			queryClient.invalidateQueries({ queryKey: ["payments"] });
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-list-pay"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-quickpay-single"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

			closeQuickPay();
		},
		onError: (err) => {
			toast.error(getErrorMessage(err));
		},
	});

	return (
		<ModernModal
			isOpen={isQuickPayOpen}
			onClose={closeQuickPay}
			title={t("quickPay.modalTitle", "Quick Payment Settlement")}
			subtitle={t(
				"quickPay.modalSubtitle",
				"Record payment settlements, apply cash discounts, and manage customer invoices.",
			)}
			icon={<CreditCard className="h-5 w-5 text-sky-500" />}
			size="lg"
			isLoading={processPaymentMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={closeQuickPay} />

					<ModernModalSubmitButton
						onClick={() => processPaymentMutation.mutate()}
						isLoading={processPaymentMutation.isPending}
						icon={<CheckCircle2 className="h-4 w-4 shrink-0" />}
					>
						{t("quickPay.recordPayment", "Record Payment & Issue Receipt")}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Customer & Invoice Selection */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ModernSelect
						label={t("quickPay.customer", "Customer")}
						placeholder={t("quickPay.selectCustomer", "Select customer...")}
						value={selectedCustomerId}
						onChange={setSelectedCustomerId}
						options={
							customersData?.items?.map((c) => ({
								value: String(c.id),
								label: c.name,
								description: c.phone || c.email,
							})) || []
						}
						searchable
						required
					/>

					<ModernSelect
						label={t(
							"quickPay.selectInvoice",
							"Select Invoice / Schedule Period",
						)}
						placeholder={t(
							"quickPay.searchInvoice",
							"Search invoice or schedule...",
						)}
						value={selectedInvoiceId}
						onChange={handleSelectInvoice}
						options={
							invoicesData?.items?.map((inv) => ({
								value: String(inv.id),
								label: `${inv.invoiceNo || inv.invoiceNumber || String(inv.id).slice(0, 8)} (${inv.currency || "$"} ${inv.totalAmount})`,
								description: `Due: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"} | Status: ${inv.status}${
									inv.earlyDiscountPct
										? ` | ⚡ ${inv.earlyDiscountPct}% early discount`
										: ""
								}`,
							})) || []
						}
						searchable
					/>
				</div>

				{/* Smart Early Payment Discount Alert Banner */}
				{earlyDiscountInfo && (
					<div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
						<div className="flex items-start gap-2.5">
							<Sparkles className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
							<div>
								<span className="font-bold text-emerald-900 dark:text-emerald-200">
									💡 Early Payment Discount Available!
								</span>
								<p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
									Pay by{" "}
									<strong>
										{earlyDiscountInfo.deadline.toLocaleDateString()}
									</strong>{" "}
									to get a{" "}
									<strong>
										{earlyDiscountInfo.percentage}% ($
										{earlyDiscountInfo.savings.toFixed(2)})
									</strong>{" "}
									cash discount on the open balance.
								</p>
							</div>
						</div>

						<Button
							type="button"
							size="sm"
							onClick={handleApplyEarlyDiscount}
							className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 gap-1.5 shrink-0 shadow-xs"
						>
							<Zap className="size-3.5 fill-current" />
							<span>
								Apply Discount (${earlyDiscountInfo.savings.toFixed(2)})
							</span>
						</Button>
					</div>
				)}

				{/* Payment Amount */}
				<div>
					<ModernInput
						label={t(
							"quickPay.paymentAmount",
							"Payment Amount (Cash Collected)",
						)}
						type="number"
						step="0.01"
						value={paymentAmount}
						onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
						prefixAddon={<DollarSign className="size-4" />}
						required
					/>
				</div>

				{/* Optional Cash Discount / Write-Off Section */}
				<div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3.5 space-y-3">
					<div
						className="flex items-center justify-between cursor-pointer select-none"
						onClick={() => setShowDiscountSection(!showDiscountSection)}
					>
						<div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
							<Tag className="size-3.5 text-indigo-500" />
							<span>Payment Discount / Settlement Write-Off</span>
							{effectiveDiscount > 0 && (
								<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-mono">
									-${effectiveDiscount.toFixed(2)}
								</Badge>
							)}
						</div>
						<button
							type="button"
							className="text-slate-400 hover:text-slate-600"
						>
							{showDiscountSection ? (
								<ChevronUp className="size-4" />
							) : (
								<ChevronDown className="size-4" />
							)}
						</button>
					</div>

					{showDiscountSection && (
						<div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="flex items-center gap-2">
									<ModernInput
										label="Discount Amount"
										type="number"
										step="0.01"
										min="0"
										placeholder="0.00"
										value={discountAmount}
										onChange={(e) =>
											setDiscountAmount(
												e.target.value === "" ? "" : Number(e.target.value),
											)
										}
										containerClassName="flex-1"
										className="font-mono"
									/>

									<ModernSelect
										label="Type"
										options={[
											{ value: "FLAT", label: "$ FLAT" },
											{ value: "PERCENTAGE", label: "% PERCENT" },
										]}
										value={discountType}
										onChange={(val: any) => setDiscountType(val)}
										containerClassName="w-32"
									/>
								</div>

								<ModernInput
									label="Discount Reason / Memo"
									placeholder="e.g. 2% early payment incentive, round-off"
									value={discountReason}
									onChange={(e) => setDiscountReason(e.target.value)}
								/>
							</div>
						</div>
					)}
				</div>

				{/* Real-time Partial Payment Feedback Banner */}
				<div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
					<div>
						<span className="text-slate-500 dark:text-slate-400">
							{t("quickPay.totalDue", "Open Invoice Balance:")}{" "}
						</span>
						<span className="font-bold text-slate-900 dark:text-white font-mono">
							{currency} {maxAllowablePay.toFixed(2)}
						</span>
					</div>

					{effectiveDiscount > 0 && (
						<div className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
							<span>Discount: -${effectiveDiscount.toFixed(2)}</span>
						</div>
					)}

					<ArrowRight className="h-4 w-4 text-slate-400 hidden sm:block" />

					<div>
						<span className="text-slate-500 dark:text-slate-400">
							{t("quickPay.remainingBalance", "New Remaining Balance:")}{" "}
						</span>
						<span
							className={`font-extrabold font-mono ${remainingBalance === 0 ? "text-emerald-500" : "text-amber-500"}`}
						>
							{currency} {remainingBalance.toFixed(2)}
						</span>
					</div>
				</div>

				{/* Reference & Date */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ModernInput
						label={t("quickPay.reference", "Reference / Transaction ID")}
						placeholder={t("quickPay.referencePlaceholder", "e.g. TXN-998877")}
						value={reference}
						onChange={(e) => setReference(e.target.value)}
					/>

					<ModernDatePicker
						label={t("quickPay.paymentDate", "Payment Date")}
						value={paymentDate}
						onChange={setPaymentDate}
					/>
				</div>

				<ModernInput
					label={t(
						"quickPay.notes",
						"Internal Payment Memo / Notes (Optional)",
					)}
					placeholder={t(
						"quickPay.notesPlaceholder",
						"e.g. Bank transfer settlement payment collected...",
					)}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
				/>

				{/* Payment Receipt / Transfer Slip Attachment (receiptUrl) */}
				<div className="space-y-2 pt-1">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<FileText className="size-3.5 text-indigo-500" />
							<span>
								{t(
									"quickPay.receiptAttachment",
									"Payment Receipt / Transfer Slip (Optional)",
								)}
							</span>
						</label>
						<span className="text-[10px] text-slate-400 font-medium">
							PNG, JPG, WebP (Max 10MB)
						</span>
					</div>

					<input
						ref={receiptFileInputRef}
						type="file"
						accept="image/*,application/pdf"
						onChange={(e) => {
							if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
						}}
						className="hidden"
					/>

					{receiptUrl ? (
						/* Uploaded Receipt Preview Card */
						<div className="flex items-center justify-between p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20">
							<div className="flex items-center gap-3 min-w-0">
								<div
									onClick={() =>
										setPreviewImageModal(fileUrl(receiptUrl) || receiptUrl)
									}
									className="relative size-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 cursor-pointer group shadow-2xs"
								>
									<img
										src={fileUrl(receiptUrl) || receiptUrl}
										alt="Receipt"
										className="size-full object-cover group-hover:scale-105 transition-transform"
										onError={(e) => {
											(e.currentTarget as HTMLElement).style.display = "none";
										}}
									/>
									<div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
										<Eye className="size-4 text-white" />
									</div>
								</div>

								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<Badge className="bg-emerald-600 text-white text-[9px] font-bold py-0 px-1.5 font-mono">
											Attached
										</Badge>
										<span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[280px]">
											{receiptUrl.split("/").pop() || "Receipt Attached"}
										</span>
									</div>
									<p className="text-[11px] text-slate-400 truncate max-w-[220px] sm:max-w-[320px] mt-0.5">
										{receiptUrl}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-1.5 shrink-0">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() =>
										setPreviewImageModal(fileUrl(receiptUrl) || receiptUrl)
									}
									className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/50"
									title="Preview"
								>
									<Eye className="size-3.5 mr-1" />
									Preview
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										setReceiptUrl("");
										if (receiptFileInputRef.current)
											receiptFileInputRef.current.value = "";
									}}
									className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
									title="Remove"
								>
									<Trash2 className="size-3.5 mr-1" />
									Remove
								</Button>
							</div>
						</div>
					) : (
						/* Upload Dropzone */
						<div
							onDragOver={(e) => {
								e.preventDefault();
								setIsDraggingReceipt(true);
							}}
							onDragLeave={(e) => {
								e.preventDefault();
								setIsDraggingReceipt(false);
							}}
							onDrop={handleDropReceipt}
							onClick={() => {
								if (!isUploadingReceipt) receiptFileInputRef.current?.click();
							}}
							className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
								isDraggingReceipt
									? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30"
									: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 hover:border-slate-300"
							}`}
						>
							{isUploadingReceipt ? (
								<div className="flex items-center gap-2 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
									<Loader2 className="size-5 animate-spin" />
									<span>Uploading payment receipt...</span>
								</div>
							) : (
								<div className="flex items-center gap-3 text-center sm:text-left">
									<div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
										<UploadCloud className="size-5" />
									</div>
									<div>
										<div className="text-xs font-bold text-slate-800 dark:text-slate-200">
											Click to upload or drag & drop transfer slip
										</div>
										<div className="text-[11px] text-slate-400 mt-0.5">
											Bank slip screenshot, ABA PayWay confirmation, or cheque
											photo
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Full-Screen Image Preview Modal */}
			{previewImageModal && (
				<div
					onClick={() => setPreviewImageModal(null)}
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
				>
					<div
						onClick={(e) => e.stopPropagation()}
						className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl border border-slate-800"
					>
						<button
							type="button"
							onClick={() => setPreviewImageModal(null)}
							className="absolute top-3 right-3 z-10 size-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
						>
							<X className="size-4" />
						</button>
						<img
							src={previewImageModal}
							alt="Receipt Preview"
							className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain mx-auto"
						/>
					</div>
				</div>
			)}
		</ModernModal>
	);
}

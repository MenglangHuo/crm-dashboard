"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi, paymentTermsApi } from "@/lib/api/endpoints";
import {
	Invoice,
	PaymentTerm,
	UpdateInvoicePaymentTermRequest,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernSelect,
	ModernInput,
	ModernSwitch,
	SelectOption,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import {
	Clock,
	Calendar,
	Zap,
	CheckCircle2,
	AlertTriangle,
	ArrowRight,
	TrendingDown,
	Building2,
	Receipt,
	Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

interface ChangePaymentTermModalProps {
	invoice: Invoice | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function ChangePaymentTermModal({
	invoice,
	open,
	onOpenChange,
	onSuccess,
}: ChangePaymentTermModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Fetch available Payment Terms
	const { data: terms = [], isLoading: isTermsLoading } = useQuery<
		PaymentTerm[]
	>({
		queryKey: ["payment-terms"],
		queryFn: () => paymentTermsApi.list(),
		enabled: open,
	});

	// State
	const [selectedTermId, setSelectedTermId] = useState<string>("");
	const [overrideDueDate, setOverrideDueDate] = useState<boolean>(false);
	const [customDueDate, setCustomDueDate] = useState<string>("");

	// Pre-fill when invoice or modal opens
	useEffect(() => {
		if (invoice && open) {
			const currentTermId = invoice.paymentTerm?.id || invoice.paymentTermId;
			if (currentTermId) {
				setSelectedTermId(String(currentTermId));
			} else if (terms.length > 0) {
				setSelectedTermId(String(terms[0].id));
			}
			setOverrideDueDate(false);
			setCustomDueDate(
				invoice.dueDate
					? new Date(invoice.dueDate).toISOString().split("T")[0]
					: "",
			);
		}
	}, [invoice, open, terms]);

	const selectedTerm = useMemo(() => {
		return (
			terms.find((term) => String(term.id) === String(selectedTermId)) || null
		);
	}, [terms, selectedTermId]);

	const invoiceNo =
		invoice?.invoiceNumber || invoice?.invoiceNo || `#${invoice?.id || ""}`;
	const customerName =
		invoice?.customer?.name ||
		(invoice as any)?.customerName ||
		`Customer #${invoice?.customerId || "—"}`;
	const totalAmount = Number(invoice?.totalAmount || 0);
	const paidAmount = Number(invoice?.paidAmount || 0);
	const isPaidOrTerminal =
		paidAmount > 0 ||
		invoice?.status === "PAID" ||
		invoice?.status === "VOID" ||
		invoice?.status === "CANCELLED" ||
		invoice?.status === "REFUNDED";

	// Dates & Live Computations
	const issuedDate = useMemo(() => {
		if (!invoice?.issuedAt) return new Date();
		const d = new Date(invoice.issuedAt);
		return isNaN(d.getTime()) ? new Date() : d;
	}, [invoice?.issuedAt]);

	const calculatedDueDate = useMemo(() => {
		if (!selectedTerm) return null;
		const d = new Date(
			issuedDate.getTime() + (selectedTerm.dueDays || 0) * 24 * 60 * 60 * 1000,
		);
		return isNaN(d.getTime()) ? null : d;
	}, [issuedDate, selectedTerm]);

	const calculatedDiscountDeadline = useMemo(() => {
		if (
			!selectedTerm ||
			!selectedTerm.discountDays ||
			selectedTerm.discountDays <= 0
		)
			return null;
		const d = new Date(
			issuedDate.getTime() + selectedTerm.discountDays * 24 * 60 * 60 * 1000,
		);
		return isNaN(d.getTime()) ? null : d;
	}, [issuedDate, selectedTerm]);

	const hasEarlyDiscount = Boolean(
		selectedTerm &&
			selectedTerm.discountDays &&
			selectedTerm.discountDays > 0 &&
			selectedTerm.discountPercentage &&
			selectedTerm.discountPercentage > 0,
	);

	const discountSavings = hasEarlyDiscount
		? (totalAmount * Number(selectedTerm?.discountPercentage || 0)) / 100
		: 0;
	const netPayableEarly = Math.max(0, totalAmount - discountSavings);

	// Options for ModernSelect
	const termOptions: SelectOption[] = useMemo(() => {
		return terms
			.filter((t) => t.isActive !== false)
			.map((term) => {
				const hasDisc =
					term.discountDays &&
					term.discountDays > 0 &&
					term.discountPercentage &&
					term.discountPercentage > 0;
				return {
					value: String(term.id),
					label: term.name,
					description:
						term.description ||
						(term.dueDays === 0
							? "ទូទាត់ភ្លាមៗ (Same Day / COD)"
							: `កាលកំណត់ ${term.dueDays} ថ្ងៃ`),
					badge: hasDisc
						? `⚡ -${term.discountPercentage}% (${term.discountDays}d)`
						: undefined,
				};
			});
	}, [terms]);

	// Update Mutation
	const updateMutation = useMutation({
		mutationFn: async () => {
			if (!invoice) throw new Error("No invoice selected");
			if (!selectedTermId)
				throw new Error("សូមជ្រើសរើសលក្ខខណ្ឌទូទាត់ (Please select a payment term)");

			const payload: UpdateInvoicePaymentTermRequest = {
				paymentTermId: Number(selectedTermId),
				dueDate:
					overrideDueDate && customDueDate
						? new Date(customDueDate).toISOString()
						: null,
			};

			return await invoicesApi.changePaymentTerm(invoice.id, payload);
		},
		onSuccess: (updatedInvoice) => {
			const termTitle = selectedTerm?.name || "Payment Term";
			toast.success(`បានផ្លាស់ប្តូរលក្ខខណ្ឌទូទាត់សម្រាប់វិក្កយបត្រ ${invoiceNo} ជោគជ័យ`, {
				description: `លក្ខខណ្ឌថ្មី: '${termTitle}' ត្រូវបានអនុវត្ត។`,
			});
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
			queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
			queryClient.invalidateQueries({
				queryKey: ["invoice-details", String(invoice?.id)],
			});
			queryClient.invalidateQueries({ queryKey: ["invoice", invoice?.id] });
			queryClient.invalidateQueries({ queryKey: ["invoice-payments-modal"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!invoice) return null;

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="ផ្លាស់ប្តូរលក្ខខណ្ឌទូទាត់ (Change Payment Term)"
			subtitle={`កែប្រែលក្ខខណ្ឌឥណទាន និងកាលបរិច្ឆេទផុតកំណត់សម្រាប់វិក្កយបត្រ ${invoiceNo}`}
			icon={<Clock className="size-5 text-indigo-500" />}
			size="md"
			isLoading={updateMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => updateMutation.mutate()}
						isLoading={updateMutation.isPending}
						disabled={isPaidOrTerminal || !selectedTermId || isTermsLoading}
						icon={<CheckCircle2 className="size-4" />}
					>
						រក្សាទុកការផ្លាស់ប្តូរ
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Guard Warning if Invoice Already Has Payments */}
				{isPaidOrTerminal && (
					<div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 p-3.5 flex items-start gap-3">
						<AlertTriangle className="size-4.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
						<div className="text-xs space-y-1">
							<span className="font-bold text-rose-800 dark:text-rose-300 block">
								មិនអាចកែប្រែលក្ខខណ្ឌទូទាត់បានទេ (Non-editable)
							</span>
							<p className="text-rose-700/90 dark:text-rose-400 leading-relaxed">
								វិក្កយបត្រនេះមានការទូទាត់រួចរាល់ (
								{paidAmount > 0
									? `បានបង់ $${paidAmount.toFixed(2)}`
									: invoice.status}
								)។ លក្ខខណ្ឌទូទាត់អាចផ្លាស់ប្តូរបានតែលើវិក្កយបត្រដែលមិនទាន់ទូទាត់ (UNPAID)
								ប៉ុណ្ណោះ។
							</p>
						</div>
					</div>
				)}

				{/* Invoice Context Overview Card */}
				<div className="rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Receipt className="size-4 text-slate-500" />
							<span className="font-mono font-bold text-xs text-foreground">
								{invoiceNo}
							</span>
						</div>
						<Badge
							variant="outline"
							className={cn(
								"text-[10px] font-bold uppercase font-mono",
								invoice.status === "PAID"
									? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
									: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
							)}
						>
							{invoice.status || "UNPAID"}
						</Badge>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
						<div>
							<span className="text-[10px] text-muted-foreground block">
								អតិថិជន (Customer)
							</span>
							<span className="font-semibold text-foreground truncate block">
								{customerName}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground block">
								ទឹកប្រាក់សរុប (Total)
							</span>
							<span className="font-mono font-bold text-foreground">
								{invoice.currency || "$"}
								{totalAmount.toFixed(2)}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground block">
								កាលបរិច្ឆេទចេញ (Issued)
							</span>
							<span className="font-mono text-foreground">
								{issuedDate.toLocaleDateString()}
							</span>
						</div>
					</div>
				</div>

				{/* Payment Term Selection */}
				<div className="space-y-1.5">
					<label className="block text-xs font-semibold text-foreground">
						ជ្រើសរើសលក្ខខណ្ឌទូទាត់ថ្មី (Select New Payment Term){" "}
						<span className="text-destructive">*</span>
					</label>
					<ModernSelect
						options={termOptions}
						value={selectedTermId}
						onChange={(val) => setSelectedTermId(val)}
						disabled={isPaidOrTerminal || isTermsLoading}
						placeholder={
							isTermsLoading ? "កំពុងទាញយកទិន្នន័យ..." : "ជ្រើសរើសលក្ខខណ្ឌទូទាត់..."
						}
						searchable
					/>
				</div>

				{/* Live Calculation & Impact Schedule Card */}
				{selectedTerm && (
					<div className="rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/20 dark:from-indigo-950/20 dark:via-slate-900 dark:to-sky-950/10 p-3.5 space-y-2.5">
						<div className="flex items-center justify-between text-xs">
							<span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
								<Calendar className="size-3.5 text-indigo-500" />
								កាលវិភាគផុតកំណត់ថ្មី (New Payment Schedule)
							</span>
							{hasEarlyDiscount && (
								<Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold py-0 px-1.5">
									⚡ បញ្ចុះ {selectedTerm.discountPercentage}%
								</Badge>
							)}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							{/* Due Date Card */}
							<div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5">
								<span className="text-[10px] text-muted-foreground block font-medium">
									ថ្ងៃផុតកំណត់សរុប (Due Date)
								</span>
								<div className="font-mono font-bold text-sm text-foreground">
									{overrideDueDate && customDueDate
										? new Date(customDueDate).toLocaleDateString()
										: calculatedDueDate
											? calculatedDueDate.toLocaleDateString()
											: "—"}
								</div>
								<span className="text-[10px] text-muted-foreground block">
									{selectedTerm.dueDays === 0
										? "ទូទាត់ភ្លាមៗ (Same Day)"
										: `+${selectedTerm.dueDays} ថ្ងៃគិតពីថ្ងៃចេញ`}
								</span>
							</div>

							{/* Early Settlement Discount Card */}
							<div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-0.5">
								<span className="text-[10px] text-muted-foreground block font-medium">
									ការបញ្ចុះតម្លៃទូទាត់រហ័ស (Early Discount)
								</span>
								{hasEarlyDiscount ? (
									<>
										<div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
											${netPayableEarly.toFixed(2)}{" "}
											<span className="text-[10px] font-normal text-emerald-600/80">
												(ចំណេញ ${discountSavings.toFixed(2)})
											</span>
										</div>
										<span className="text-[10px] text-muted-foreground block">
											ត្រឹម {calculatedDiscountDeadline?.toLocaleDateString()} (
											{selectedTerm.discountDays} ថ្ងៃដំបូង)
										</span>
									</>
								) : (
									<>
										<div className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
											${totalAmount.toFixed(2)}
										</div>
										<span className="text-[10px] text-muted-foreground block">
											គ្មានការបញ្ចុះតម្លៃលើកទឹកចិត្ត
										</span>
									</>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Optional Custom Due Date Override */}
				{!isPaidOrTerminal && (
					<div className="pt-1 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								កំណត់កាលបរិច្ឆេទផុតកំណត់ដោយផ្ទាល់ (Override Due Date)
							</span>
							<ModernSwitch
								checked={overrideDueDate}
								onCheckedChange={(checked) => setOverrideDueDate(checked)}
								switchSize="sm"
							/>
						</div>

						{overrideDueDate && (
							<div className="pt-1">
								<ModernInput
									label="កាលបរិច្ឆេទផុតកំណត់ផ្ទាល់ខ្លួន (Custom Due Date)"
									type="date"
									value={customDueDate}
									onChange={(e) => setCustomDueDate(e.target.value)}
									helperText="កាលបរិច្ឆេទនេះនឹងជំនួសការគណនាស្វ័យប្រវត្តិនៃលក្ខខណ្ឌទូទាត់"
									required
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</ModernModal>
	);
}

"use client";

import React, { useState, useMemo } from "react";
import { PaymentTerm } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import {
	Clock,
	Calendar,
	Zap,
	TrendingDown,
	CheckCircle2,
	AlertCircle,
	Edit2,
	Receipt,
	Info,
	Layers,
	ArrowRight,
	Calculator,
	ShieldCheck,
	Building2,
	Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentTermDetailsModalProps {
	term: PaymentTerm | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit?: (term: PaymentTerm) => void;
}

export function PaymentTermDetailsModal({
	term,
	open,
	onOpenChange,
	onEdit,
}: PaymentTermDetailsModalProps) {
	const [sampleAmount, setSampleAmount] = useState<number>(1000);

	const hasEarlyDiscount = Boolean(
		term?.discountDays &&
			term.discountDays > 0 &&
			term?.discountPercentage &&
			term.discountPercentage > 0,
	);

	const discountPercent = Number(term?.discountPercentage || 0);
	const discountDays = Number(term?.discountDays || 0);
	const dueDays = Number(term?.dueDays || 0);
	const isCod = dueDays === 0;
	const policy = term?.discountPolicy || "FINAL_SETTLEMENT";

	// Live simulation on sample amount
	const simulatedSavings = hasEarlyDiscount
		? (sampleAmount * discountPercent) / 100
		: 0;
	const simulatedNetPay = Math.max(0, sampleAmount - simulatedSavings);

	// Plain-English & Khmer summary generator
	const plainEnglishSummary = useMemo(() => {
		if (!term) return "";
		if (isCod) {
			return "តម្រូវឱ្យទូទាត់ភ្លាមៗនៅពេលចេញវិក្កយបត្រ ឬពេលប្រគល់ទំនិញដល់ដៃអតិថិជន (Same Day / Cash on Delivery)។";
		}
		if (hasEarlyDiscount) {
			return `អតិថិជនទទួលបានការបញ្ចុះតម្លៃ ${discountPercent}% ប្រសិនបើទូទាត់ក្នុងរយៈពេល ${discountDays} ថ្ងៃដំបូង (Get ${discountPercent}% discount if paid within ${discountDays} days)។ ផុតពី ${discountDays} ថ្ងៃ ទឹកប្រាក់សរុបត្រូវទូទាត់មិនឱ្យលើសពី ${dueDays} ថ្ងៃ (Full payment due within ${dueDays} days)។`;
		}
		return `វិក្កយបត្រត្រូវទូទាត់ពេញលេញក្នុងរយៈពេល ${dueDays} ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទចេញវិក្កយបត្រ (Full payment due within ${dueDays} days from invoice date)។ គ្មានការបញ្ចុះតម្លៃទូទាត់រហ័សទេ (No early discount)។`;
	}, [term, isCod, hasEarlyDiscount, discountPercent, discountDays, dueDays]);

	if (!term) return null;

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={term.name}
			subtitle="ព័ត៌មានលម្អិតនៃលក្ខខណ្ឌទូទាត់ និងការបញ្ចុះតម្លៃលើកទឹកចិត្ត (Payment Term Specification)"
			icon={<Clock className="size-5 text-primary" />}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)}>
						បិទ (Close)
					</ModernModalCancelButton>
					{onEdit && (
						<ModernModalSubmitButton
							onClick={() => {
								onOpenChange(false);
								onEdit(term);
							}}
							icon={<Edit2 className="h-4 w-4 shrink-0" />}
						>
							កែប្រែលក្ខខណ្ឌ (Edit Term)
						</ModernModalSubmitButton>
					)}
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Header Hero Card */}
				<div className="rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/20 border border-indigo-100 dark:border-indigo-900/60 p-4 space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="font-bold text-base text-foreground">
								{term.name}
							</span>
							<Badge
								variant="outline"
								className={cn(
									"text-[10px] font-bold uppercase",
									term.isActive !== false
										? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
										: "bg-slate-100 text-slate-500 border-slate-300",
								)}
							>
								{term.isActive !== false ? "សកម្ម (Active)" : "អសកម្ម (Inactive)"}
							</Badge>
							{hasEarlyDiscount && (
								<Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold py-0.5">
									⚡ Cash Discount ({discountPercent}%)
								</Badge>
							)}
						</div>

						{term.id && (
							<span className="text-[11px] font-mono text-slate-400">
								ID: #{term.id}
							</span>
						)}
					</div>

					{/* Plain Explanation */}
					<div className="rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 p-3 flex items-start gap-2.5">
						<Info className="size-4 text-primary shrink-0 mt-0.5" />
						<div className="text-xs space-y-0.5">
							<span className="font-bold text-slate-800 dark:text-slate-200 block">
								សេចក្តីសង្ខេបនៃការអនុវត្ត (Rule Summary):
							</span>
							<p className="text-slate-600 dark:text-slate-300 leading-relaxed">
								{plainEnglishSummary}
							</p>
						</div>
					</div>

					{term.description && (
						<p className="text-xs text-slate-500 dark:text-slate-400 italic">
							"{term.description}"
						</p>
					)}
				</div>

				{/* 4 Metrics Parameter Grid */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{/* Due Window */}
					<div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
						<span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
							<Calendar className="size-3 text-slate-500" />
							ថ្ងៃផុតកំណត់ (Due Window)
						</span>
						<div className="font-mono font-bold text-sm text-foreground">
							{isCod ? "Same Day" : `+${dueDays} ថ្ងៃ (${dueDays} Days)`}
						</div>
						<span className="text-[10px] text-slate-400 block truncate">
							{isCod ? "ទូទាត់ភ្លាមៗ (COD)" : `គិតពីថ្ងៃចេញវិក្កយបត្រ (From Invoice Date)`}
						</span>
					</div>

					{/* Early Window */}
					<div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
						<span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
							<Zap className="size-3 text-amber-500" />
							ទូទាត់រហ័ស (Early Window)
						</span>
						<div className="font-mono font-bold text-sm text-foreground">
							{hasEarlyDiscount ? `ក្នុង ${discountDays} ថ្ងៃ (${discountDays} Days)` : "គ្មាន (None)"}
						</div>
						<span className="text-[10px] text-slate-400 block truncate">
							{hasEarlyDiscount
								? `ថ្ងៃទី ១ ដល់ ថ្ងៃទី ${discountDays} (Day 1 - ${discountDays})`
								: "មិនផ្តល់ការបញ្ចុះតម្លៃ (No Discount)"}
						</span>
					</div>

					{/* Discount % */}
					<div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
						<span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
							<TrendingDown className="size-3 text-emerald-500" />
							បញ្ចុះតម្លៃ (Discount %)
						</span>
						<div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
							{hasEarlyDiscount ? `${discountPercent}%` : "0%"}
						</div>
						<span className="text-[10px] text-slate-400 block truncate">
							{hasEarlyDiscount ? `លើទឹកប្រាក់ទូទាត់ (On Paid Amount)` : "តម្លៃពេញ (Full Amount)"}
						</span>
					</div>

					{/* Policy */}
					<div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
						<span className="text-[10px] text-muted-foreground block font-medium flex items-center gap-1">
							<Layers className="size-3 text-purple-500" />
							គោលការណ៍ (Policy)
						</span>
						<div className="font-semibold text-xs text-foreground truncate">
							{policy === "PROPORTIONAL" ? "Proportional" : "Final Settlement"}
						</div>
						<span className="text-[10px] text-slate-400 block truncate">
							{policy === "PROPORTIONAL" ? "បញ្ចុះតាមចំនួនបង់ (Proportional)" : "ទាល់តែបង់ផ្តាច់ (Final Settlement Only)"}
						</span>
					</div>
				</div>

				{/* Tiered Discount Conditions Table if present */}
				{term.conditions && term.conditions.length > 0 && (
					<div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-white dark:bg-slate-900 p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="font-bold text-xs text-foreground flex items-center gap-1.5">
								<Zap className="size-4 text-emerald-500 fill-current" />
								ដំណាក់កាលបញ្ចុះតម្លៃទូទាត់រហ័ស (Tiered Early Payment Conditions)
							</span>
							<Badge className="bg-indigo-600 text-white font-mono text-[10px]">
								{term.conditions.length} Tiers
							</Badge>
						</div>

						<div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th className="p-2.5">លំដាប់ (Seq)</th>
										<th className="p-2.5">រយៈពេលទូទាត់ (Within Days)</th>
										<th className="p-2.5">អត្រាបញ្ចុះតម្លៃ (Discount)</th>
										<th className="p-2.5 text-right">ទឹកប្រាក់ត្រូវបង់លើ ${sampleAmount}</th>
										<th className="p-2.5 text-right">ទឹកប្រាក់ចំណេញ (Savings)</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-xs">
									{term.conditions.map((c, idx) => {
										const val = Number(c.discount) || 0;
										const discountAmt =
											c.discountType === "PERCENTAGE"
												? (sampleAmount * val) / 100
												: val;
										const net = Math.max(0, sampleAmount - discountAmt);
										return (
											<tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
												<td className="p-2.5 text-slate-400 font-bold">#{c.sequence || idx + 1}</td>
												<td className="p-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
													{c.discountDays === 0 ? "ថ្ងៃចេញវិក្កយបត្រ (Day 0 / COD)" : `ក្នុងរយៈពេល ${c.discountDays} ថ្ងៃ`}
												</td>
												<td className="p-2.5">
													<Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-mono text-[11px] font-bold">
														{c.discountType === "PERCENTAGE" ? `${val}%` : `$${val}`}
													</Badge>
												</td>
												<td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
													${net.toFixed(2)}
												</td>
												<td className="p-2.5 text-right text-slate-500">
													+${discountAmt.toFixed(2)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Visual Milestone Simulation */}
				<div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-foreground flex items-center gap-1.5">
							<Sparkles className="size-4 text-amber-500" />
							កាលវិភាគនៃការទូទាត់គំរូ (Timeline Milestone Simulation)
						</span>
						<div className="flex items-center gap-2 text-xs">
							<span className="text-[11px] text-muted-foreground">
								គំរូទឹកប្រាក់ (Sample Amount):
							</span>
							<div className="flex items-center gap-1 font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
								<span>$</span>
								<input
									type="number"
									value={sampleAmount}
									onChange={(e) =>
										setSampleAmount(Math.max(0, Number(e.target.value) || 0))
									}
									className="w-16 bg-transparent text-right outline-none font-bold"
								/>
							</div>
						</div>
					</div>

					{/* Milestones Process Flow */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
						{/* Step 1: Day 0 */}
						<div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
							<div className="flex items-center justify-between">
								<Badge variant="outline" className="text-[9px] font-mono py-0">
									ថ្ងៃទី ០ (Day 0)
								</Badge>
								<Receipt className="size-3.5 text-slate-400" />
							</div>
							<div className="font-bold text-xs text-slate-800 dark:text-slate-200">
								ចេញវិក្កយបត្រ (Issued)
							</div>
							<p className="text-[11px] text-slate-500 font-mono">
								ទឹកប្រាក់ដើម (Original): <strong>${sampleAmount.toFixed(2)}</strong>
							</p>
						</div>

						{/* Step 2: Early Discount Cutoff */}
						<div
							className={cn(
								"p-3 rounded-xl border space-y-1",
								hasEarlyDiscount
									? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
									: "bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800 opacity-60",
							)}
						>
							<div className="flex items-center justify-between">
								<Badge
									variant="outline"
									className={cn(
										"text-[9px] font-mono py-0",
										hasEarlyDiscount
											? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-300"
											: "",
									)}
								>
									{hasEarlyDiscount
										? `ថ្ងៃទី ១ ដល់ ${discountDays} (Day 1 - ${discountDays})`
										: "គ្មានបញ្ចុះតម្លៃ (No Discount)"}
								</Badge>
								<Zap
									className={cn(
										"size-3.5",
										hasEarlyDiscount
											? "text-emerald-600 fill-current"
											: "text-slate-400",
									)}
								/>
							</div>
							<div className="font-bold text-xs text-slate-800 dark:text-slate-200">
								{hasEarlyDiscount
									? `បង់រហ័ស (-${discountPercent}%) (Early Pay)`
									: "ទូទាត់ធម្មតា (Standard Pay)"}
							</div>
							<div className="text-[11px] font-mono">
								{hasEarlyDiscount ? (
									<span className="text-emerald-700 dark:text-emerald-300 font-bold">
										បង់ត្រឹម (Pay Only): ${simulatedNetPay.toFixed(2)}{" "}
										<span className="text-[10px] font-normal text-emerald-600">
											(ចំណេញ (Save) ${simulatedSavings.toFixed(2)})
										</span>
									</span>
								) : (
									<span className="text-slate-500">
										បង់ពេញ (Full Pay) ${sampleAmount.toFixed(2)}
									</span>
								)}
							</div>
						</div>

						{/* Step 3: Due Date */}
						<div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
							<div className="flex items-center justify-between">
								<Badge
									variant="outline"
									className="text-[9px] font-mono py-0 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-300"
								>
									{isCod ? "ទាន់ពេល (On Time)" : `ថ្ងៃទី ${dueDays} (Day ${dueDays})`}
								</Badge>
								<Calendar className="size-3.5 text-indigo-600" />
							</div>
							<div className="font-bold text-xs text-slate-800 dark:text-slate-200">
								ថ្ងៃផុតកំណត់ (Due Date)
							</div>
							<p className="text-[11px] text-slate-500 font-mono">
								បង់ពេញលេញ (Full Amount): <strong>${sampleAmount.toFixed(2)}</strong>
							</p>
						</div>
					</div>
				</div>

				{/* Policy & Rule Clarification Card */}
				<div className="rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2 text-xs">
					<span className="font-bold text-foreground block flex items-center gap-1.5">
						<ShieldCheck className="size-4 text-emerald-500" />
						របៀបអនុវត្តលើវិក្កយបត្រ (Invoice Application Guide):
					</span>
					<ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] pl-1">
						<li className="flex items-start gap-2">
							<span className="text-indigo-500 font-bold">•</span>
							<span>
								<strong>កាលបរិច្ឆេទផុតកំណត់ (Due Date):</strong> ត្រូវបានគណនាដោយស្វ័យប្រវត្តិ (
								<code>Issued Date + {dueDays} ថ្ងៃ</code>) នៅពេលចេញវិក្កយបត្រថ្មី
								ឬប្តូរលក្ខខណ្ឌ (Auto-calculated on invoice creation or term update)។
							</span>
						</li>
						{hasEarlyDiscount && (
							<li className="flex items-start gap-2">
								<span className="text-emerald-500 font-bold">•</span>
								<span>
									<strong>ការបញ្ចុះតម្លៃរហ័ស (Early Cash Discount):</strong>{" "}
									បង្ហាញជាស្វ័យប្រវត្តិក្នងប្រព័ន្ធទូទាត់រហ័ស (Quick Pay) ប្រសិនបើអតិថិជនទូទាត់មុន
									ឬត្រឹមថ្ងៃផុតកំណត់លើកទឹកចិត្ត (<code>+ {discountDays} ថ្ងៃ</code>) (Applies automatically in Quick Pay if paid within early window)។
								</span>
							</li>
						)}
						<li className="flex items-start gap-2">
							<span className="text-purple-500 font-bold">•</span>
							<span>
								<strong>ការកែប្រែ (Modifications):</strong>{" "}
								លក្ខខណ្ឌទូទាត់អាចផ្លាស់ប្តូរបានសម្រាប់តែវិក្កយបត្រដែលមិនទាន់ទូទាត់ (UNPAID)
								ប៉ុណ្ណោះ (Applicable only to UNPAID invoices)។
							</span>
						</li>
					</ul>
				</div>
			</div>
		</ModernModal>
	);
}

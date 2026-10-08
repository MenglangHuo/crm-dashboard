"use client";

import React, { useState } from "react";
import { ModernButton } from "@/components/ui-custom/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Percent,
	Plus,
	Trash2,
	ChevronUp,
	ChevronDown,
	Clock,
	Zap,
	Tag,
	RotateCcw,
	Sparkles,
	ArrowRight,
} from "lucide-react";

export interface DiscountTier {
	days: number;
	discount: number;
	type: "%" | "$";
	label: string;
	description?: string;
}

const DEFAULT_TIERS: DiscountTier[] = [
	{
		days: 0,
		discount: 7,
		type: "%",
		label: "Same Day (Instant)",
		description: "Paid on order date",
	},
	{
		days: 7,
		discount: 5,
		type: "%",
		label: "Within 7 Days",
		description: "Paid within 1 week of order",
	},
	{
		days: 30,
		discount: 2,
		type: "%",
		label: "Within 30 Days",
		description: "Paid within 1 month of order",
	},
];

interface Props {
	value: any;
	onChange: (newValue: DiscountTier[]) => void;
	disabled?: boolean;
}

export function EarlyPaymentDiscountEditor({
	value,
	onChange,
	disabled = false,
}: Props) {
	const [simAmount, setSimAmount] = useState<number>(1000);
	const [simDays, setSimDays] = useState<number>(5);

	// Parse input tiers safely
	const parseTiers = (): DiscountTier[] => {
		if (Array.isArray(value) && value.length > 0) {
			return value.map((t) => ({
				days: Number(t.days ?? 0),
				discount: Number(t.discount ?? 0),
				type: t.type === "$" ? "$" : "%",
				label: t.label || (t.days === 0 ? "Same Day" : `Within ${t.days} Days`),
				description: t.description || "",
			}));
		}
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				if (Array.isArray(parsed)) {
					return parsed.map((t) => ({
						days: Number(t.days ?? 0),
						discount: Number(t.discount ?? 0),
						type: t.type === "$" ? "$" : "%",
						label:
							t.label || (t.days === 0 ? "Same Day" : `Within ${t.days} Days`),
						description: t.description || "",
					}));
				}
			} catch {
				// Fallback to default
			}
		}
		return DEFAULT_TIERS;
	};

	const tiers = parseTiers();

	const handleUpdateTier = (index: number, partial: Partial<DiscountTier>) => {
		const updated = [...tiers];
		updated[index] = { ...updated[index], ...partial };
		onChange(updated);
	};

	const handleAddTier = () => {
		const lastDay = tiers.length > 0 ? tiers[tiers.length - 1].days : 0;
		const newTier: DiscountTier = {
			days: lastDay + 15,
			discount: Math.max(1, (tiers[tiers.length - 1]?.discount ?? 3) - 1),
			type: "%",
			label: `Within ${lastDay + 15} Days`,
			description: `Payment settled within ${lastDay + 15} days`,
		};
		onChange([...tiers, newTier]);
	};

	const handleDeleteTier = (index: number) => {
		const updated = tiers.filter((_, i) => i !== index);
		onChange(updated);
	};

	const handleMove = (index: number, direction: "up" | "down") => {
		const target = direction === "up" ? index - 1 : index + 1;
		if (target < 0 || target >= tiers.length) return;
		const updated = [...tiers];
		const temp = updated[index];
		updated[index] = updated[target];
		updated[target] = temp;
		onChange(updated);
	};

	const handleResetDefault = () => {
		onChange(DEFAULT_TIERS);
	};

	// Calculate simulated discount for preview
	const sortedTiers = [...tiers].sort((a, b) => a.days - b.days);
	const matchedTier = sortedTiers.find((t) => simDays <= t.days);

	const discountAmount = matchedTier
		? matchedTier.type === "%"
			? (simAmount * matchedTier.discount) / 100
			: matchedTier.discount
		: 0;

	const netPayable = Math.max(0, simAmount - discountAmount);

	return (
		<div className="space-y-3.5">
			{/* 1. At-a-Glance Tier Progression Ribbon */}
			<div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
				<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
					<Sparkles className="h-3 w-3 text-blue-500" />
					Rule Summary:
				</span>
				<div className="flex items-center gap-1.5 flex-nowrap">
					{sortedTiers.map((t, i) => (
						<React.Fragment key={i}>
							{i > 0 && (
								<ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-700 shrink-0" />
							)}
							<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 font-medium text-slate-700 dark:text-slate-200 shrink-0 shadow-2xs">
								<span className="font-semibold text-slate-900 dark:text-slate-100">
									{t.days === 0 ? "Same Day" : `≤ ${t.days}d`}
								</span>
								<span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
									{t.discount}
									{t.type} off
								</span>
							</span>
						</React.Fragment>
					))}
				</div>
			</div>

			{/* 2. Compact Rule Matrix Table */}
			<div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-2xs">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead>
							<tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 font-semibold select-none">
								<th className="py-2.5 px-3 w-7 text-center">#</th>
								<th className="py-2.5 px-3 min-w-[160px]">Tier Label</th>
								<th className="py-2.5 px-3 w-[150px]">Payment Cutoff</th>
								<th className="py-2.5 px-3 w-[170px]">Discount Rate</th>
								<th className="py-2.5 px-3 min-w-[200px]">
									Conditions / Description
								</th>
								<th className="py-2.5 px-3 w-[100px] text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
							{tiers.map((tier, idx) => (
								<tr
									key={idx}
									className="group hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
								>
									{/* Step # */}
									<td className="py-2 px-3 text-center">
										<span className="h-5 w-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] inline-flex items-center justify-center">
											{idx + 1}
										</span>
									</td>

									{/* Tier Label */}
									<td className="py-2 px-3">
										<Input
											value={tier.label}
											disabled={disabled}
											onChange={(e) =>
												handleUpdateTier(idx, { label: e.target.value })
											}
											placeholder="e.g. Same Day, Within 7 Days"
											className="h-8 text-xs font-semibold bg-slate-50/60 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
										/>
									</td>

									{/* Cutoff (Days) */}
									<td className="py-2 px-3">
										<div className="relative flex items-center">
											<Input
												type="number"
												min={0}
												max={365}
												value={tier.days}
												disabled={disabled}
												onChange={(e) =>
													handleUpdateTier(idx, {
														days: Math.max(0, parseInt(e.target.value) || 0),
													})
												}
												className="h-8 text-xs pr-14 font-semibold bg-slate-50/60 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
											/>
											<span className="absolute right-2.5 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">
												{tier.days === 0 ? "Day 0" : "Days"}
											</span>
										</div>
									</td>

									{/* Discount Rate & Toggle */}
									<td className="py-2 px-3">
										<div className="flex items-center gap-1">
											<Input
												type="number"
												min={0}
												max={100}
												step={0.5}
												value={tier.discount}
												disabled={disabled}
												onChange={(e) =>
													handleUpdateTier(idx, {
														discount: Math.max(
															0,
															parseFloat(e.target.value) || 0,
														),
													})
												}
												className="h-8 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-slate-50/60 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
											/>
											<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0 border border-slate-200/80 dark:border-slate-700">
												<button
													type="button"
													disabled={disabled}
													onClick={() => handleUpdateTier(idx, { type: "%" })}
													className={`px-1.5 py-0.5 text-[10px] font-black rounded-md transition-all ${
														tier.type === "%"
															? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
															: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
													}`}
												>
													%
												</button>
												<button
													type="button"
													disabled={disabled}
													onClick={() => handleUpdateTier(idx, { type: "$" })}
													className={`px-1.5 py-0.5 text-[10px] font-black rounded-md transition-all ${
														tier.type === "$"
															? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
															: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
													}`}
												>
													$
												</button>
											</div>
										</div>
									</td>

									{/* Conditions / Description */}
									<td className="py-2 px-3">
										<Input
											value={tier.description || ""}
											disabled={disabled}
											onChange={(e) =>
												handleUpdateTier(idx, { description: e.target.value })
											}
											placeholder="e.g. Paid within 1 week of order"
											className="h-8 text-xs bg-slate-50/60 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg"
										/>
									</td>

									{/* Actions */}
									<td className="py-2 px-3 text-right">
										<div className="flex items-center justify-end gap-1">
											<ModernButton
												variant="ghost"
												size="icon-xs"
												disabled={disabled || idx === 0}
												onClick={() => handleMove(idx, "up")}
												title="Move up"
												className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
											>
												<ChevronUp className="h-3.5 w-3.5" />
											</ModernButton>
											<ModernButton
												variant="ghost"
												size="icon-xs"
												disabled={disabled || idx === tiers.length - 1}
												onClick={() => handleMove(idx, "down")}
												title="Move down"
												className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
											>
												<ChevronDown className="h-3.5 w-3.5" />
											</ModernButton>
											<ModernButton
												variant="ghost"
												size="icon-xs"
												disabled={disabled || tiers.length <= 1}
												onClick={() => handleDeleteTier(idx)}
												title="Remove tier"
												className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</ModernButton>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Action Controls Bar */}
				<div className="flex items-center justify-between px-3 py-2 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
					<ModernButton
						variant="outline"
						size="xs"
						disabled={disabled}
						onClick={handleAddTier}
						leftIcon={<Plus className="h-3.5 w-3.5" />}
						className="rounded-lg text-xs"
					>
						Add Discount Tier
					</ModernButton>

					<ModernButton
						variant="ghost"
						size="xs"
						disabled={disabled}
						onClick={handleResetDefault}
						leftIcon={<RotateCcw className="h-3 w-3" />}
						className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs"
					>
						Reset to Defaults
					</ModernButton>
				</div>
			</div>

			{/* 3. Streamlined 1-Strip Live Calculator */}
			<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 px-3.5 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
				<div className="flex items-center gap-2 shrink-0">
					<div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
						<Zap className="h-3.5 w-3.5 fill-current" />
					</div>
					<div>
						<span className="font-bold text-emerald-900 dark:text-emerald-200 block text-xs leading-none">
							Live Discount Calculator
						</span>
						<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
							Test settlement discounts instantly
						</span>
					</div>
				</div>

				{/* Inputs & Calculation Strip */}
				<div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
					{/* Order Amount */}
					<div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
						<span className="text-[10px] font-semibold text-slate-400">
							Order:
						</span>
						<span className="text-xs font-bold text-slate-600 dark:text-slate-400">
							$
						</span>
						<Input
							type="number"
							value={simAmount}
							onChange={(e) =>
								setSimAmount(Math.max(0, parseFloat(e.target.value) || 0))
							}
							className="h-6 w-16 text-xs font-bold bg-transparent border-0 p-0 shadow-none focus-visible:ring-0"
						/>
					</div>

					{/* Days Paid */}
					<div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
						<span className="text-[10px] font-semibold text-slate-400">
							Days Paid:
						</span>
						<Input
							type="number"
							value={simDays}
							onChange={(e) =>
								setSimDays(Math.max(0, parseInt(e.target.value) || 0))
							}
							className="h-6 w-12 text-xs font-bold bg-transparent border-0 p-0 shadow-none focus-visible:ring-0"
						/>
					</div>

					{/* Result Badge */}
					<div className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-2xs font-medium">
						<span className="text-[11px] font-semibold text-emerald-100">
							{matchedTier
								? `${matchedTier.label} (${matchedTier.discount}${matchedTier.type})`
								: "No Discount"}
						</span>
						<span className="text-xs font-black border-l border-emerald-500/60 pl-2">
							Pay: ${netPayable.toFixed(2)}
							<span className="text-[10px] text-emerald-200 font-normal ml-1">
								(-${discountAmount.toFixed(2)})
							</span>
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

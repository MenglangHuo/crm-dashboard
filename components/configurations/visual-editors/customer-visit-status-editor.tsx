"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Plus,
	Trash2,
	Palette,
	Clock,
	Sparkles,
	MapPin,
	ChevronRight,
	GripVertical,
	Check,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export interface VisitStatusItem {
	id?: string | number;
	label: string;
	color: string;
	icon?: string;
	minDays: number;
	maxDays: number;
	priority?: number;
}

const PRESET_ICONS = ["🟠", "🟢", "🔵", "🟡", "🔴", "⬛", "🟣", "⚪"];
const PRESET_COLORS = [
	"#FF8C00", // Orange
	"#22C55E", // Green
	"#3B82F6", // Blue
	"#EAB308", // Yellow
	"#EF4444", // Red
	"#1F2937", // Dark Slate
	"#8B5CF6", // Purple
	"#14B8A6", // Teal
];

interface CustomerVisitStatusEditorProps {
	value: any;
	onChange: (newValue: VisitStatusItem[]) => void;
	disabled?: boolean;
}

export function CustomerVisitStatusEditor({
	value,
	onChange,
	disabled = false,
}: CustomerVisitStatusEditorProps) {
	const { locale } = useTranslation();
	const isKh = locale === "km";
	const upLabel = isKh ? "ឡើង" : "Up";
	const daysLabel = isKh ? "ថ្ងៃ" : "days";
	const parseItems = (): VisitStatusItem[] => {
		let rawItems: any[] = [];
		if (Array.isArray(value)) rawItems = value;
		else if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				if (Array.isArray(parsed)) rawItems = parsed;
			} catch {
				return [];
			}
		}

		return rawItems.map((item, idx) => ({
			id: item.id ?? idx + 1,
			label: item.label ?? `Stage ${idx + 1}`,
			color: item.color ?? PRESET_COLORS[idx % PRESET_COLORS.length],
			icon: item.icon ?? PRESET_ICONS[idx % PRESET_ICONS.length],
			minDays: typeof item.minDays === "number" ? item.minDays : 0,
			maxDays: typeof item.maxDays === "number" ? item.maxDays : 2147483647,
			priority: item.priority ?? idx + 1,
		}));
	};

	const items = parseItems();

	const handleUpdate = (index: number, partial: Partial<VisitStatusItem>) => {
		const updated = [...items];
		updated[index] = { ...updated[index], ...partial };
		onChange(updated);
	};

	const handleDelete = (index: number) => {
		const updated = items.filter((_, i) => i !== index);
		onChange(updated);
	};

	const handleAddItem = () => {
		const nextPriority = items.length + 1;
		const lastItem = items[items.length - 1];

		let newMinDays = 0;
		let newMaxDays = 30;

		if (lastItem) {
			if (lastItem.maxDays < 2147483647) {
				newMinDays = lastItem.maxDays + 1;
				newMaxDays = newMinDays + 30;
			} else {
				const prevMin = lastItem.minDays ?? 0;
				lastItem.maxDays = prevMin + 30;
				newMinDays = lastItem.maxDays + 1;
				newMaxDays = 2147483647;
			}
		}

		const newItem: VisitStatusItem = {
			label: `New Status ${nextPriority}`,
			color: PRESET_COLORS[items.length % PRESET_COLORS.length] || "#3B82F6",
			icon: PRESET_ICONS[items.length % PRESET_ICONS.length] || "🔵",
			minDays: newMinDays,
			maxDays: newMaxDays,
			priority: nextPriority,
		};
		onChange([...items, newItem]);
	};

	return (
		<div className="w-full space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950">
			{/* Top Banner with Pipeline Preview */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
							<MapPin className="h-4 w-4" />
						</div>
						<h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
							Visit Lifecycle & Map Pin Colors
						</h3>
						<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
							{items.length} stages
						</span>
					</div>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
						Define threshold intervals and visual pin colors used across the
						customer activity map.
					</p>
				</div>

				{!disabled && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleAddItem}
						className="h-8 gap-1.5 rounded-xl border-blue-200 bg-blue-50/60 px-3 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 self-start sm:self-auto"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Stage
					</Button>
				)}
			</div>

			{/* Live Map Legend Pipeline */}
			{items.length > 0 && (
				<div className="overflow-x-auto pb-1">
					<div className="flex items-center gap-1.5 min-w-max">
						{items.map((item, idx) => {
							const min = item.minDays ?? 0;
							const max = item.maxDays;
							const isUnlimited = max == null || max >= 2147483647;
							const intervalLabel = isUnlimited
								? `${min} ${upLabel}`
								: min === 0
								? `≤ ${max}d`
								: `${min}-${max}d`;

							return (
								<React.Fragment key={idx}>
									<div
										className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all"
										style={{
											backgroundColor: `${item.color}15`,
											borderColor: `${item.color}40`,
											color: item.color,
										}}
									>
										<span className="text-sm">{item.icon || "📍"}</span>
										<span className="text-[11px] font-medium text-slate-800 dark:text-slate-200">
											{item.label}
										</span>
										<span
											className="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
											style={{ backgroundColor: `${item.color}25` }}
										>
											{intervalLabel}
										</span>
									</div>
									{idx < items.length - 1 && (
										<ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
								</React.Fragment>
							);
						})}
					</div>
				</div>
			)}

			{/* Stages Table / Cards List */}
			<div className="space-y-2">
				{items.map((item, idx) => {
					const isUnlimited =
						item.maxDays == null || item.maxDays >= 2147483647;

					return (
						<div
							key={idx}
							className="group flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800/80 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
						>
							{/* Left: Priority Index + Color Swatch + Icon */}
							<div className="flex items-center gap-3">
								<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
									#{idx + 1}
								</span>

								{/* Color Picker Swatch */}
								<div className="relative flex items-center justify-center">
									<div
										className="h-8 w-8 rounded-full border-2 border-white shadow-md ring-1 ring-black/10 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 shrink-0"
										style={{ backgroundColor: item.color || "#3B82F6" }}
									>
										<input
											type="color"
											value={
												item.color && item.color.startsWith("#")
													? item.color
													: "#3B82F6"
											}
											disabled={disabled}
											onChange={(e) =>
												handleUpdate(idx, { color: e.target.value })
											}
											className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
											title="Change Status Color"
										/>
									</div>
								</div>

								{/* Emoji Icon Picker */}
								<div className="flex items-center gap-1">
									<input
										type="text"
										value={item.icon || "📍"}
										maxLength={2}
										disabled={disabled}
										onChange={(e) =>
											handleUpdate(idx, { icon: e.target.value })
										}
										className="h-8 w-9 rounded-lg border border-slate-200 bg-slate-50 text-center text-sm font-semibold shadow-2xs outline-none focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950"
										title="Emoji / Icon Indicator"
									/>
								</div>

								{/* Status Label Input */}
								<div className="flex-1 min-w-[160px] sm:min-w-[200px]">
									<Input
										type="text"
										value={item.label}
										disabled={disabled}
										placeholder="Stage Name (e.g., Just Visited)"
										onChange={(e) =>
											handleUpdate(idx, { label: e.target.value })
										}
										className="h-8 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus-visible:ring-1 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
									/>
								</div>
							</div>

							{/* Right: Days Interval (Min - Max or Min +) + Live Tag Preview + Delete Action */}
							<div className="flex items-center justify-between sm:justify-end gap-3 pl-9 sm:pl-0">
							
								{/* Days Interval Stepper */}
								<div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-950">
									<Clock className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-0.5" />
									<input
										type="number"
										min={0}
										value={item.minDays ?? 0}
										disabled={disabled}
										onChange={(e) =>
											handleUpdate(idx, {
												minDays: Math.max(
													0,
													parseInt(e.target.value, 10) || 0,
												),
											})
										}
										className="w-10 bg-transparent text-center text-xs font-bold text-slate-800 outline-none dark:text-slate-200"
										title="Minimum days"
										placeholder="0"
									/>
									{isUnlimited ? (
										<button
											type="button"
											disabled={disabled}
											onClick={() =>
												handleUpdate(idx, {
													maxDays: (item.minDays ?? 180) + 30,
												})
											}
											className="px-1 text-xs font-bold text-slate-700 hover:text-blue-600 dark:text-slate-300 transition-colors"
											title="No upper limit. Click to set maximum days"
										>
											{upLabel}
										</button>
									) : (
										<>
											<span className="text-[11px] font-medium text-slate-400">
												-
											</span>
											<input
												type="text"
												value={item.maxDays}
												disabled={disabled}
												onChange={(e) => {
													const val = e.target.value.trim();
													if (
														val === "" ||
														val === "+" ||
														val.toLowerCase() === "max" ||
														val.toLowerCase() === "up" ||
														val === "ឡើង"
													) {
														handleUpdate(idx, { maxDays: 2147483647 });
													} else {
														const num = parseInt(val, 10);
														handleUpdate(idx, {
															maxDays: isNaN(num)
																? 2147483647
																: Math.max(0, num),
														});
													}
												}}
												className="w-11 bg-transparent text-center text-xs font-bold text-slate-800 outline-none dark:text-slate-200"
												title="Maximum days (type 'Up' / 'ឡើង' for no upper limit)"
												placeholder="Max"
											/>
										</>
									)}
									<span className="text-[11px] font-medium text-slate-500 ml-0.5">
										{daysLabel}
									</span>
								</div>

								{/* Live Status Badge Preview */}
								<span
									className="hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
									style={{
										backgroundColor: `${item.color}18`,
										borderColor: `${item.color}35`,
										color: item.color,
									}}
								>
									<span
										className="h-1.5 w-1.5 rounded-full"
										style={{ backgroundColor: item.color }}
									/>
									{item.label || "Status"}
								</span>

								{/* Delete button */}
								{!disabled && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(idx)}
										className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
										title="Remove Status Stage"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								)}
							</div>
						</div>
					);
				})}

				{items.length === 0 && (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Palette className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
						<p className="text-xs font-medium text-slate-500">
							No status thresholds configured.
						</p>
						{!disabled && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAddItem}
								className="mt-3 text-xs"
							>
								Add First Stage
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

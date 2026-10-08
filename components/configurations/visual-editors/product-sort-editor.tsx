"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	ArrowDown,
	ArrowUp,
	ChevronUp,
	ChevronDown,
	Plus,
	Trash2,
	Sliders,
	Sparkles,
	GripVertical,
	CheckCircle2,
} from "lucide-react";

export interface SortRule {
	field: string;
	direction: "ASC" | "DESC";
}

const AVAILABLE_FIELDS = [
	{ value: "featured", label: "Featured Status (Promoted First)" },
	{ value: "totalSales", label: "Total Sales Volume (Best Sellers)" },
	{ value: "stockStatus", label: "Stock Availability (In-Stock First)" },
	{ value: "createdAt", label: "Creation Date (Newest / Oldest)" },
	{ value: "price", label: "Unit Price (High / Low)" },
	{ value: "name", label: "Product Name (Alphabetical)" },
	{ value: "sku", label: "SKU Code" },
];

interface ProductSortEditorProps {
	value: any;
	onChange: (newValue: SortRule[]) => void;
	disabled?: boolean;
}

export function ProductSortEditor({
	value,
	onChange,
	disabled = false,
}: ProductSortEditorProps) {
	const parseRules = (): SortRule[] => {
		if (Array.isArray(value)) return value;
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				return [];
			}
		}
		return [
			{ field: "featured", direction: "DESC" },
			{ field: "totalSales", direction: "DESC" },
			{ field: "stockStatus", direction: "ASC" },
			{ field: "createdAt", direction: "DESC" },
		];
	};

	const rules = parseRules();

	const handleFieldChange = (index: number, newField: string) => {
		const updated = [...rules];
		updated[index] = { ...updated[index], field: newField };
		onChange(updated);
	};

	const handleDirectionToggle = (index: number) => {
		const updated = [...rules];
		const current = updated[index]?.direction || "DESC";
		updated[index] = {
			...updated[index],
			direction: current === "DESC" ? "ASC" : "DESC",
		};
		onChange(updated);
	};

	const handleMove = (index: number, direction: "up" | "down") => {
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= rules.length) return;
		const updated = [...rules];
		const temp = updated[index];
		updated[index] = updated[targetIndex];
		updated[targetIndex] = temp;
		onChange(updated);
	};

	const handleDelete = (index: number) => {
		const updated = rules.filter((_, i) => i !== index);
		onChange(updated);
	};

	const handleAddRule = () => {
		const usedFields = new Set(rules.map((r) => r.field));
		const available = AVAILABLE_FIELDS.find((f) => !usedFields.has(f.value));
		const newField = available ? available.value : "price";
		const updated = [...rules, { field: newField, direction: "DESC" as const }];
		onChange(updated);
	};

	return (
		<div className="w-full space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
				<div>
					<div className="flex items-center gap-2">
						<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
							<Sliders className="h-4 w-4" />
						</div>
						<h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
							Multi-Field Sort Priority Hierarchy
						</h3>
						<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
							{rules.length} levels
						</span>
					</div>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
						Catalog queries evaluate sort criteria in sequential priority from
						top (#1) to bottom.
					</p>
				</div>

				{!disabled && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleAddRule}
						className="h-8 gap-1.5 rounded-xl border-indigo-200 bg-indigo-50/60 px-3 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 self-start sm:self-auto"
					>
						<Plus className="h-3.5 w-3.5" />
						Add Sort Level
					</Button>
				)}
			</div>

			<div className="space-y-2">
				{rules.map((rule, idx) => (
					<div
						key={idx}
						className="group flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800/80 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
					>
						{/* Left: Priority Number + Field Selector */}
						<div className="flex items-center gap-3 flex-1">
							<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
								#{idx + 1}
							</span>

							<div className="flex-1 max-w-md">
								<Select
									value={rule.field}
									onValueChange={(val) => val && handleFieldChange(idx, val)}
									disabled={disabled}
								>
									<SelectTrigger className="h-8.5 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
										<SelectValue placeholder="Select Sort Field" />
									</SelectTrigger>
									<SelectContent>
										{AVAILABLE_FIELDS.map((f) => (
											<SelectItem
												key={f.value}
												value={f.value}
												className="text-xs"
											>
												{f.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Right: Direction Toggle + Reorder & Delete Controls */}
						<div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
							{/* Direction Toggle Pill */}
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={disabled}
								onClick={() => handleDirectionToggle(idx)}
								className={`h-8 min-w-[120px] gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-2xs transition-colors ${
									rule.direction === "DESC"
										? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/80 dark:bg-blue-950/60 dark:text-blue-300"
										: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300"
								}`}
							>
								{rule.direction === "DESC" ? (
									<>
										<ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
										<span>Descending</span>
									</>
								) : (
									<>
										<ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
										<span>Ascending</span>
									</>
								)}
							</Button>

							{/* Reorder and Delete Actions */}
							{!disabled && (
								<div className="flex items-center gap-1 border-l border-slate-200/80 pl-2 dark:border-slate-800/80">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										disabled={idx === 0}
										onClick={() => handleMove(idx, "up")}
										className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-20 dark:hover:bg-slate-800"
										title="Move Priority Up"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										disabled={idx === rules.length - 1}
										onClick={() => handleMove(idx, "down")}
										className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-20 dark:hover:bg-slate-800"
										title="Move Priority Down"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(idx)}
										className="h-8 w-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
										title="Remove Rule"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</Button>
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

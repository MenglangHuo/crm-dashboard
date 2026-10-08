"use client";

import React, { useState } from "react";
import { ConfigurationItem } from "@/types/configuration";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, X } from "lucide-react";

import { ProductSortEditor } from "./visual-editors/product-sort-editor";
import { CustomerVisitStatusEditor } from "./visual-editors/customer-visit-status-editor";
import { IpSecurityEditor } from "./visual-editors/ip-security-editor";
import { EarlyPaymentDiscountEditor } from "./visual-editors/early-payment-discount-editor";
import { GenericJsonEditor } from "./visual-editors/generic-json-editor";
import { normalizeBoolean, normalizeNumber } from "./utils";

// ---------------------------------------------------------------------------
// Number Pattern Live Preview Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the example prefix from a configKey.
 * e.g. "invoice.number_pattern" → "INV", "order.number_pattern" → "ORD"
 */
function getPrefixFromKey(configKey: string): string {
	const k = configKey.toLowerCase();
	if (k.startsWith("invoice")) return "INV";
	if (k.startsWith("order")) return "ORD";
	if (k.startsWith("receipt")) return "RCP";
	if (k.startsWith("quote")) return "QT";
	if (k.startsWith("delivery")) return "DLV";
	if (k.startsWith("purchase")) return "PO";
	if (k.startsWith("credit")) return "CR";
	// Fallback: uppercase the first segment
	const segment = k.split(".")[0].slice(0, 4).toUpperCase();
	return segment || "DOC";
}

/**
 * Resolves a number format pattern like "{prefix}-{YYYY}{MM}-{seq}" into a
 * concrete example string using today's date and a sample sequence number.
 * Tokens supported: {prefix} {YYYY} {YY} {MM} {DD} {seq}
 * Pass configKey so the correct domain prefix (INV, ORD, …) is substituted.
 */
function resolvePatternPreview(
	pattern: string,
	zeroPadding: number = 5,
	configKey: string = "",
): string {
	const now = new Date();
	const YYYY = now.getFullYear().toString();
	const YY = YYYY.slice(2);
	const MM = String(now.getMonth() + 1).padStart(2, "0");
	const DD = String(now.getDate()).padStart(2, "0");
	const seqSample = "1".padStart(Math.max(1, zeroPadding), "0");
	const prefix = getPrefixFromKey(configKey);

	return pattern
		.replace(/\{prefix\}/gi, prefix)
		.replace(/\{YYYY\}/g, YYYY)
		.replace(/\{YY\}/g, YY)
		.replace(/\{MM\}/g, MM)
		.replace(/\{DD\}/g, DD)
		.replace(/\{seq\}/gi, seqSample);
}

/**
 * Inline control for number pattern configs — clean monospace input only.
 * The live preview is rendered on the LEFT side of the row in the view component.
 */
function NumberPatternControl({
	value,
	onChange,
	disabled,
	zeroPadding,
	configKey = "",
}: {
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	zeroPadding?: number;
	configKey?: string;
}) {
	const prefix = getPrefixFromKey(configKey);

	return (
		<div className="relative w-full max-w-[240px]">
			<Input
				type="text"
				value={value}
				disabled={disabled}
				placeholder={`e.g. ${prefix}-{YYYY}{MM}-{seq}`}
				onChange={(e) => onChange(e.target.value)}
				className="h-9 rounded-lg border-slate-200 bg-white pr-8 text-xs font-mono font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
			/>
			{!disabled && value && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
}

interface ConfigControlRendererProps {
	item: ConfigurationItem;
	currentValue: any;
	onChange: (value: any) => void;
	disabled?: boolean;
	/** Current zero-padding value from a sibling config; used by NumberPatternControl to render a live preview */
	zeroPadding?: number;
}

// Preset color options for color picker
const PRESET_COLORS = [
	"#22C55E", // Emerald / Green
	"#EF4444", // Red
	"#F59E0B", // Amber / Orange
	"#6366F1", // Indigo
	"#3B82F6", // Blue
	"#8B5CF6", // Purple
	"#EC4899", // Pink
	"#14B8A6", // Teal
	"#64748B", // Slate
	"#1E293B", // Dark Slate
	"#E2E8F0", // Light Slate
];

export function ConfigControlRenderer({
	item,
	currentValue,
	onChange,
	disabled = false,
	zeroPadding = 5,
}: ConfigControlRendererProps) {
	const [newTagText, setNewTagText] = useState("");

	const effectiveDisabled = disabled || item.isReadOnly;
	const key = (item.configKey || "").toLowerCase();

	// =========================================================================
	// 0. NUMBER PATTERN — live preview control
	// =========================================================================
	if (key.includes("number_pattern") || key.includes("number.pattern")) {
		const strVal =
			currentValue !== undefined && currentValue !== null
				? String(currentValue)
				: "";
		return (
			<NumberPatternControl
				value={strVal}
				onChange={onChange}
				disabled={effectiveDisabled}
				zeroPadding={zeroPadding}
				configKey={item.configKey}
			/>
		);
	}

	// Parse validation limits if present (e.g., "1..20" or "min:1,max:100")
	const parseNumberLimits = () => {
		if (!item.validationRule) return { min: 0, max: 999999, step: 1 };
		const rangeMatch = item.validationRule.match(/(\d+)\.\.(\d+)/);
		if (rangeMatch) {
			return {
				min: Number(rangeMatch[1]),
				max: Number(rangeMatch[2]),
				step: 1,
			};
		}
		return { min: 0, max: 999999, step: 1 };
	};

	// Parse options for SELECT component
	const parseOptions = (): Array<{ label: string; value: string }> => {
		if (!item.options) return [];
		try {
			const parsed = JSON.parse(item.options);
			if (Array.isArray(parsed)) {
				return parsed.map((opt) => {
					if (typeof opt === "object" && opt !== null) {
						return {
							label: opt.label || opt.name || String(opt.value),
							value: String(opt.value ?? opt.id ?? opt),
						};
					}
					return { label: String(opt), value: String(opt) };
				});
			}
		} catch {
			// Comma-separated fallback
			return item.options.split(",").map((s) => {
				const trimmed = s.trim();
				return { label: trimmed, value: trimmed };
			});
		}
		return [];
	};

	// =========================================================================
	// 1. DEDICATED VISUAL EDITORS FOR COMPLEX CONFIGURATIONS (NO RAW JSON)
	// =========================================================================

	// Early Payment Discount Tiers Editor
	if (
		key.includes("early_payment") ||
		key.includes("discount_tier") ||
		key.includes("earlypayment") ||
		key.includes("payment_discount") ||
		(Array.isArray(currentValue) &&
			currentValue.length > 0 &&
			typeof currentValue[0] === "object" &&
			"discount" in currentValue[0] &&
			"days" in currentValue[0])
	) {
		return (
			<EarlyPaymentDiscountEditor
				value={currentValue}
				onChange={onChange}
				disabled={effectiveDisabled}
			/>
		);
	}

	// Product Sort Priority Editor
	if (
		key.includes("product.default_sort") ||
		key.includes("sort_order") ||
		(Array.isArray(currentValue) &&
			currentValue.length > 0 &&
			typeof currentValue[0] === "object" &&
			"field" in currentValue[0] &&
			"direction" in currentValue[0])
	) {
		return (
			<ProductSortEditor
				value={currentValue}
				onChange={onChange}
				disabled={effectiveDisabled}
			/>
		);
	}

	// Customer Visit Status & Color Thresholds Editor
	if (
		key.includes("customer.visit_status_thresholds") ||
		key.includes("visit_status") ||
		(Array.isArray(currentValue) &&
			currentValue.length > 0 &&
			typeof currentValue[0] === "object" &&
			"maxDays" in currentValue[0])
	) {
		return (
			<CustomerVisitStatusEditor
				value={currentValue}
				onChange={onChange}
				disabled={effectiveDisabled}
			/>
		);
	}

	// IP Blacklist / Whitelist & CIDR Editor
	if (
		key.includes("blacklist_ip") ||
		key.includes("ip_whitelist") ||
		key.includes("ip_restriction") ||
		(typeof currentValue === "object" &&
			currentValue !== null &&
			("blackListIp" in currentValue || "cidrRange" in currentValue))
	) {
		return (
			<IpSecurityEditor
				value={currentValue}
				onChange={onChange}
				disabled={effectiveDisabled}
			/>
		);
	}

	// =========================================================================
	// 2. SCHEMA & TYPE-DRIVEN PRIMITIVE CONTROLS
	// =========================================================================

	// TOGGLE / BOOLEAN
	if (
		item.uiComponent === "TOGGLE" ||
		item.valueType === "BOOLEAN" ||
		(typeof currentValue === "string" &&
			(currentValue.toLowerCase() === "true" ||
				currentValue.toLowerCase() === "false")) ||
		typeof currentValue === "boolean"
	) {
		const isChecked = normalizeBoolean(currentValue);
		return (
			<div className="flex items-center gap-2.5">
				<Switch
					checked={isChecked}
					onCheckedChange={(checked) => {
						if (typeof currentValue === "string") {
							onChange(String(checked));
						} else {
							onChange(checked);
						}
					}}
					disabled={effectiveDisabled}
					aria-label={item.label || item.configKey}
					className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
				/>
				<span
					className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
						isChecked
							? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80"
							: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800"
					}`}
				>
					{isChecked ? "✓ ON" : "OFF"}
				</span>
			</div>
		);
	}

	// NUMBER / INTEGER Stepper
	if (
		item.uiComponent === "NUMBER" ||
		item.valueType === "INTEGER" ||
		(typeof currentValue === "string" &&
			/^\d+$/.test(currentValue.trim()) &&
			item.valueType !== "STRING")
	) {
		const { min, max, step } = parseNumberLimits();
		const numVal = normalizeNumber(currentValue, 0);

		const handleIncrement = () => {
			const next = Math.min(max, numVal + step);
			onChange(typeof currentValue === "string" ? String(next) : next);
		};

		const handleDecrement = () => {
			const next = Math.max(min, numVal - step);
			onChange(typeof currentValue === "string" ? String(next) : next);
		};

		return (
			<div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleDecrement}
					disabled={effectiveDisabled || numVal <= min}
					className="h-7 w-7 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>
				<input
					type="number"
					value={numVal}
					min={min}
					max={max}
					step={step}
					disabled={effectiveDisabled}
					onChange={(e) => {
						const val = e.target.value === "" ? 0 : Number(e.target.value);
						const resolved = isNaN(val) ? 0 : val;
						onChange(
							typeof currentValue === "string" ? String(resolved) : resolved,
						);
					}}
					className="w-16 bg-transparent text-center text-sm font-semibold text-slate-800 outline-none dark:text-slate-200"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleIncrement}
					disabled={effectiveDisabled || numVal >= max}
					className="h-7 w-7 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
		);
	}

	// DECIMAL Stepper / Input
	if (item.uiComponent === "DECIMAL" || item.valueType === "DECIMAL") {
		const decVal =
			currentValue !== undefined && currentValue !== null
				? String(currentValue)
				: "0.0";
		return (
			<div className="relative w-36">
				<Input
					type="number"
					step="0.01"
					value={decVal}
					disabled={effectiveDisabled}
					onChange={(e) => {
						const val = parseFloat(e.target.value);
						const resolved = isNaN(val) ? 0 : val;
						onChange(
							typeof currentValue === "string" ? String(resolved) : resolved,
						);
					}}
					className="h-9 rounded-lg border-slate-200 bg-white text-right font-mono text-sm font-medium dark:border-slate-800 dark:bg-slate-900"
				/>
			</div>
		);
	}

	// SELECT / DROPDOWN
	if (item.uiComponent === "SELECT" || item.options) {
		const options = parseOptions();
		const selectedVal = currentValue ? String(currentValue) : "";

		if (options.length > 0) {
			return (
				<Select
					value={selectedVal}
					onValueChange={(val) => onChange(val)}
					disabled={effectiveDisabled}
				>
					<SelectTrigger className="h-9 min-w-[160px] max-w-[220px] rounded-lg border-slate-200 bg-white text-xs font-medium dark:border-slate-800 dark:bg-slate-900">
						<SelectValue placeholder="Select an option" />
					</SelectTrigger>
					<SelectContent>
						{options.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} className="text-xs">
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		}
	}

	// COLOR PICKER (Explicit or inferred from key or hex color string)
	if (
		item.uiComponent === "COLOR_PICKER" ||
		key.includes("color") ||
		(typeof currentValue === "string" &&
			/^#([0-9A-F]{3}){1,2}$/i.test(currentValue.trim()))
	) {
		const color = String(currentValue || "#3B82F6");

		return (
			<div className="flex items-center gap-2">
				<div className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
					<div
						className="h-6 w-6 rounded-full border border-black/10 shadow-inner flex items-center justify-center shrink-0"
						style={{ backgroundColor: color }}
					>
						<input
							type="color"
							value={
								color.startsWith("#") && color.length === 7 ? color : "#3B82F6"
							}
							disabled={effectiveDisabled}
							onChange={(e) => onChange(e.target.value)}
							className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
							title="Pick custom color"
						/>
					</div>
					<span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 pr-1">
						{color.toUpperCase()}
					</span>
				</div>

				{/* Quick color preset dots */}
				<div className="hidden sm:flex items-center gap-1">
					{PRESET_COLORS.slice(0, 5).map((preset) => (
						<button
							key={preset}
							type="button"
							disabled={effectiveDisabled}
							onClick={() => onChange(preset)}
							className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 active:scale-95 ${
								color.toLowerCase() === preset.toLowerCase()
									? "ring-2 ring-blue-500 ring-offset-1 scale-110"
									: "border-black/10"
							}`}
							style={{ backgroundColor: preset }}
							title={`Set to ${preset}`}
						/>
					))}
				</div>
			</div>
		);
	}

	// TAGS / ARRAY CHIPS
	if (item.uiComponent === "TAGS") {
		let tags: string[] = [];
		if (Array.isArray(currentValue)) {
			tags = currentValue.map(String);
		} else if (typeof currentValue === "string" && currentValue.trim()) {
			try {
				const parsed = JSON.parse(currentValue);
				if (Array.isArray(parsed)) tags = parsed.map(String);
				else tags = currentValue.split(",").map((s) => s.trim());
			} catch {
				tags = currentValue.split(",").map((s) => s.trim());
			}
		}

		const handleAddTag = () => {
			const trimmed = newTagText.trim();
			if (!trimmed) return;
			if (!tags.includes(trimmed)) {
				const updated = [...tags, trimmed];
				onChange(updated);
			}
			setNewTagText("");
		};

		const handleRemoveTag = (index: number) => {
			const updated = tags.filter((_, i) => i !== index);
			onChange(updated);
		};

		return (
			<div className="flex flex-wrap items-center gap-1.5 max-w-sm">
				{tags.map((tag, idx) => (
					<span
						key={idx}
						className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						{tag}
						{!effectiveDisabled && (
							<button
								type="button"
								onClick={() => handleRemoveTag(idx)}
								className="text-slate-400 hover:text-red-500"
							>
								<X className="h-3 w-3" />
							</button>
						)}
					</span>
				))}
				{!effectiveDisabled && (
					<div className="inline-flex items-center gap-1">
						<input
							type="text"
							placeholder="+ Tag"
							value={newTagText}
							onChange={(e) => setNewTagText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === ",") {
									e.preventDefault();
									handleAddTag();
								}
							}}
							className="h-6 w-20 rounded border border-dashed border-slate-300 bg-transparent px-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-700 dark:text-slate-200"
						/>
					</div>
				)}
			</div>
		);
	}

	// GENERIC JSON / COMPLEX OBJECT / ARRAY (Visual editor fallback)
	if (
		item.uiComponent === "JSON_EDITOR" ||
		item.valueType === "JSON" ||
		typeof currentValue === "object"
	) {
		return (
			<GenericJsonEditor
				value={currentValue}
				onChange={onChange}
				disabled={effectiveDisabled}
			/>
		);
	}

	// TEXTAREA
	if (item.uiComponent === "TEXTAREA") {
		const textVal =
			currentValue !== undefined && currentValue !== null
				? String(currentValue)
				: "";
		return (
			<div className="w-full max-w-md">
				<textarea
					value={textVal}
					disabled={effectiveDisabled}
					rows={2}
					onChange={(e) => onChange(e.target.value)}
					placeholder={item.defaultValue || item.description || "Enter text..."}
					className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-60"
				/>
			</div>
		);
	}

	// DATE
	if (item.uiComponent === "DATE") {
		const dateVal =
			currentValue !== undefined && currentValue !== null
				? String(currentValue)
				: "";
		return (
			<div className="relative w-40">
				<Input
					type="date"
					value={dateVal}
					disabled={effectiveDisabled}
					onChange={(e) => onChange(e.target.value)}
					className="h-9 rounded-lg border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900"
				/>
			</div>
		);
	}

	// TEXT / STRING (Default)
	const textVal =
		currentValue !== undefined && currentValue !== null
			? String(currentValue)
			: "";

	return (
		<div className="relative w-full max-w-[260px]">
			<Input
				type="text"
				value={textVal}
				disabled={effectiveDisabled}
				placeholder={item.defaultValue || "e.g. INV-"}
				onChange={(e) => onChange(e.target.value)}
				className="h-9 rounded-lg border-slate-200 bg-white pr-8 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
			/>
			{!effectiveDisabled && textVal && (
				<button
					type="button"
					onClick={() => onChange("")}
					className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			)}
		</div>
	);
}

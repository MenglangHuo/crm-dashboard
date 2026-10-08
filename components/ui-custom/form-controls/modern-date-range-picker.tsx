"use client";

import * as React from "react";
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	RotateCcw,
	X,
	Check,
	CalendarDays,
	ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type DatePreset =
	| "today"
	| "this-week"
	| "last-week"
	| "this-month"
	| "last-month"
	| "this-year"
	| "last-year"
	| "custom";

export interface DateRangeValue {
	startDate: string; // YYYY-MM-DD
	endDate: string; // YYYY-MM-DD
	preset?: DatePreset;
}

export interface PresetOption {
	id: DatePreset;
	label: string;
	shortLabel: string;
	description: string;
}

export const DATE_PRESETS: PresetOption[] = [
	{
		id: "today",
		label: "Today",
		shortLabel: "Today",
		description: "Current day activity",
	},
	{
		id: "this-week",
		label: "This Week",
		shortLabel: "This Wk",
		description: "Monday to present",
	},
	{
		id: "last-week",
		label: "Last Week",
		shortLabel: "Last Wk",
		description: "Previous full week",
	},
	{
		id: "this-month",
		label: "This Month",
		shortLabel: "This Mo",
		description: "Current month to date",
	},
	{
		id: "last-month",
		label: "Last Month",
		shortLabel: "Last Mo",
		description: "Previous calendar month",
	},
	{
		id: "this-year",
		label: "This Year",
		shortLabel: "This Yr",
		description: "Current year to date",
	},
	{
		id: "last-year",
		label: "Last Year",
		shortLabel: "Last Yr",
		description: "Previous calendar year",
	},
	{
		id: "custom",
		label: "Custom Range",
		shortLabel: "Custom",
		description: "Pick custom dates",
	},
];

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

export function formatISO(date: Date): string {
	const y = date.getFullYear();
	const m = pad2(date.getMonth() + 1);
	const d = pad2(date.getDate());
	return `${y}-${m}-${d}`;
}

export function parseISODate(dateStr?: string): Date | null {
	if (!dateStr) return null;
	const [y, m, d] = dateStr.split("-").map(Number);
	if (!y || !m || !d) return null;
	const date = new Date(y, m - 1, d);
	return isNaN(date.getTime()) ? null : date;
}

export function formatHumanDate(dateStr?: string): string {
	if (!dateStr) return "";
	const date = parseISODate(dateStr);
	if (!date) return dateStr;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function calculateDaysBetween(
	startDateStr?: string,
	endDateStr?: string,
): number {
	if (!startDateStr || !endDateStr) return 0;
	const start = parseISODate(startDateStr);
	const end = parseISODate(endDateStr);
	if (!start || !end) return 0;
	const diffTime = Math.abs(end.getTime() - start.getTime());
	return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function getDateRangeForPreset(
	preset: DatePreset,
	refDate: Date = new Date(),
): { startDate: string; endDate: string } {
	const y = refDate.getFullYear();
	const m = refDate.getMonth();
	const d = refDate.getDate();
	const dayOfWeek = refDate.getDay(); // 0 = Sun, 1 = Mon ...

	switch (preset) {
		case "today": {
			const iso = formatISO(refDate);
			return { startDate: iso, endDate: iso };
		}
		case "this-week": {
			// Monday as start
			const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const mon = new Date(y, m, d + diffToMon);
			const sun = new Date(y, m, d + diffToMon + 6);
			return { startDate: formatISO(mon), endDate: formatISO(sun) };
		}
		case "last-week": {
			const diffToLastMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) - 7;
			const mon = new Date(y, m, d + diffToLastMon);
			const sun = new Date(y, m, d + diffToLastMon + 6);
			return { startDate: formatISO(mon), endDate: formatISO(sun) };
		}
		case "this-month": {
			const start = new Date(y, m, 1);
			const end = new Date(y, m + 1, 0);
			return { startDate: formatISO(start), endDate: formatISO(end) };
		}
		case "last-month": {
			const start = new Date(y, m - 1, 1);
			const end = new Date(y, m, 0);
			return { startDate: formatISO(start), endDate: formatISO(end) };
		}
		case "this-year": {
			const start = new Date(y, 0, 1);
			const end = new Date(y, 11, 31);
			return { startDate: formatISO(start), endDate: formatISO(end) };
		}
		case "last-year": {
			const start = new Date(y - 1, 0, 1);
			const end = new Date(y - 1, 11, 31);
			return { startDate: formatISO(start), endDate: formatISO(end) };
		}
		case "custom":
		default: {
			const iso = formatISO(refDate);
			return { startDate: iso, endDate: iso };
		}
	}
}

// ============================================================
// 1. Standalone Date Preset Select Component
// ============================================================

export interface DatePresetSelectProps {
	value?: DatePreset;
	onChange?: (
		preset: DatePreset,
		range: { startDate: string; endDate: string },
	) => void;
	className?: string;
	size?: "sm" | "md";
}

export function DatePresetSelect({
	value = "today",
	onChange,
	className,
	size = "md",
}: DatePresetSelectProps) {
	const [current, setCurrent] = React.useState<DatePreset>(value);

	React.useEffect(() => {
		setCurrent(value);
	}, [value]);

	const handleSelect = (preset: DatePreset) => {
		setCurrent(preset);
		const range = getDateRangeForPreset(preset);
		onChange?.(preset, range);
	};

	return (
		<div
			className={cn(
				"inline-flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100/80 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80",
				className,
			)}
		>
			{DATE_PRESETS.filter((p) => p.id !== "custom").map((p) => {
				const isActive = current === p.id;
				return (
					<button
						key={p.id}
						type="button"
						onClick={() => handleSelect(p.id)}
						title={p.description}
						className={cn(
							"shrink-0 rounded-lg px-2.5 font-semibold transition-all duration-150 outline-none focus:outline-none cursor-pointer",
							size === "sm" ? "h-7 text-[11px]" : "h-8 text-xs",
							isActive
								? "bg-primary text-primary-foreground shadow-xs font-bold"
								: "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
						)}
					>
						{p.label}
					</button>
				);
			})}
		</div>
	);
}

// ============================================================
// 2. Custom Modern Date Range Picker Component
// ============================================================

export interface ModernDateRangePickerProps {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	value?: DateRangeValue;
	onChange?: (val: DateRangeValue) => void;
	placeholder?: string;
	clearable?: boolean;
	disabled?: boolean;
	className?: string;
	containerClassName?: string;
	showPresets?: boolean;
	align?: "left" | "right";
}

export function ModernDateRangePicker({
	label,
	helperText,
	error,
	value,
	onChange,
	placeholder = "Select date range...",
	clearable = true,
	disabled = false,
	className,
	containerClassName,
	showPresets = true,
	align = "right",
}: ModernDateRangePickerProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);

	// Internal range state
	const defaultRange = React.useMemo(() => {
		if (value?.startDate && value?.endDate) {
			return {
				startDate: value.startDate,
				endDate: value.endDate,
				preset: value.preset || "custom",
			};
		}
		const today = getDateRangeForPreset("today");
		return {
			startDate: today.startDate,
			endDate: today.endDate,
			preset: "today" as DatePreset,
		};
	}, [value]);

	const [currentRange, setCurrentRange] =
		React.useState<DateRangeValue>(defaultRange);
	const [tempStart, setTempStart] = React.useState<string | null>(
		defaultRange.startDate,
	);
	const [tempEnd, setTempEnd] = React.useState<string | null>(
		defaultRange.endDate,
	);
	const [activePreset, setActivePreset] = React.useState<DatePreset>(
		defaultRange.preset || "today",
	);
	const [hoveredDate, setHoveredDate] = React.useState<string | null>(null);

	// View month / year navigation
	const [viewDate, setViewDate] = React.useState<Date>(() => {
		return parseISODate(defaultRange.startDate) || new Date();
	});

	React.useEffect(() => {
		if (value) {
			setCurrentRange(value);
			setTempStart(value.startDate);
			setTempEnd(value.endDate);
			if (value.preset) setActivePreset(value.preset);
		}
	}, [value]);

	// Sync viewDate when popover opens
	React.useEffect(() => {
		if (isOpen) {
			const activeStart = parseISODate(tempStart || currentRange.startDate);
			if (activeStart) {
				setViewDate(
					new Date(activeStart.getFullYear(), activeStart.getMonth(), 1),
				);
			}
		}
	}, [isOpen]);

	// Close on outside click
	React.useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, []);

	// Month navigation & days calculation
	const currentYear = viewDate.getFullYear();
	const currentMonth = viewDate.getMonth();
	const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
	const firstDay = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Mon = 0, Sun = 6

	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	// Dynamic Year range centered on current view
	const years = React.useMemo(() => {
		const todayY = new Date().getFullYear();
		const list: number[] = [];
		const startY = Math.min(todayY - 15, currentYear - 10);
		const endY = Math.max(todayY + 15, currentYear + 10);
		for (let y = startY; y <= endY; y++) {
			list.push(y);
		}
		return list;
	}, [currentYear]);

	const prevMonth = () => {
		setViewDate(new Date(currentYear, currentMonth - 1, 1));
	};

	const nextMonth = () => {
		setViewDate(new Date(currentYear, currentMonth + 1, 1));
	};

	// Handle clicking a calendar day
	const handleDayClick = (dayNum: number) => {
		const clickedISO = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(dayNum)}`;

		if (!tempStart || (tempStart && tempEnd)) {
			// Start a new selection
			setTempStart(clickedISO);
			setTempEnd(null);
			setActivePreset("custom");
		} else if (tempStart && !tempEnd) {
			// Finishing selection
			if (clickedISO < tempStart) {
				setTempStart(clickedISO);
				setTempEnd(tempStart);
			} else {
				setTempEnd(clickedISO);
			}
			setActivePreset("custom");
		}
	};

	// Select a preset shortcut
	const handlePresetSelect = (preset: DatePreset) => {
		setActivePreset(preset);
		if (preset === "custom") return;
		const range = getDateRangeForPreset(preset);
		setTempStart(range.startDate);
		setTempEnd(range.endDate);
		const startDateObj = parseISODate(range.startDate);
		if (startDateObj) {
			setViewDate(
				new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1),
			);
		}
	};

	// Apply chosen range
	const handleApply = () => {
		if (tempStart) {
			const finalEnd = tempEnd || tempStart;
			const result: DateRangeValue = {
				startDate: tempStart,
				endDate: finalEnd,
				preset: activePreset,
			};
			setCurrentRange(result);
			onChange?.(result);
			setIsOpen(false);
		}
	};

	// Reset to today
	const handleResetToday = () => {
		const today = getDateRangeForPreset("today");
		setActivePreset("today");
		setTempStart(today.startDate);
		setTempEnd(today.endDate);
		const result: DateRangeValue = {
			startDate: today.startDate,
			endDate: today.endDate,
			preset: "today",
		};
		setCurrentRange(result);
		onChange?.(result);
		setIsOpen(false);
	};

	// Clear date range
	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		const today = getDateRangeForPreset("today");
		setActivePreset("today");
		setTempStart(today.startDate);
		setTempEnd(today.endDate);
		const result: DateRangeValue = {
			startDate: today.startDate,
			endDate: today.endDate,
			preset: "today",
		};
		setCurrentRange(result);
		onChange?.(result);
	};

	// Calculated days count in current selection
	const daysCount = React.useMemo(() => {
		if (!tempStart) return 0;
		const finalEnd =
			tempEnd ||
			(hoveredDate && hoveredDate >= tempStart ? hoveredDate : tempStart);
		return calculateDaysBetween(tempStart, finalEnd);
	}, [tempStart, tempEnd, hoveredDate]);

	const todayISO = React.useMemo(() => formatISO(new Date()), []);

	// Display label logic
	const displayLabel = React.useMemo(() => {
		if (!currentRange.startDate) return placeholder;

		const presetObj = DATE_PRESETS.find((p) => p.id === currentRange.preset);
		const isSameDate = currentRange.startDate === currentRange.endDate;

		if (currentRange.preset === "today") {
			return `Today (${formatHumanDate(currentRange.startDate)})`;
		}

		if (presetObj && presetObj.id !== "custom") {
			return `${presetObj.label}: ${formatHumanDate(currentRange.startDate)} – ${formatHumanDate(currentRange.endDate)}`;
		}

		if (isSameDate) {
			return formatHumanDate(currentRange.startDate);
		}

		return `${formatHumanDate(currentRange.startDate)} – ${formatHumanDate(currentRange.endDate)}`;
	}, [currentRange, placeholder]);

	return (
		<div className={cn("relative z-50", containerClassName)} ref={containerRef}>
			{label && (
				<Label className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground">
					{label}
				</Label>
			)}

			{/* Trigger Button */}
			<button
				type="button"
				disabled={disabled}
				onClick={() => setIsOpen((prev) => !prev)}
				className={cn(
					"group flex h-10 w-full items-center justify-between gap-2.5 rounded-xl border px-3.5 text-left text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs",
					"border-slate-200/80 bg-white/90 hover:bg-slate-50/90 text-slate-800 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800/80",
					isOpen &&
						"border-primary ring-2 ring-primary/20 dark:border-primary dark:ring-primary/20",
					disabled && "pointer-events-none opacity-50 cursor-not-allowed",
					className,
				)}
			>
				<div className="flex min-w-0 items-center gap-2">
					<CalendarDays className="h-4 w-4 shrink-0 text-primary" />
					<span className="truncate font-medium">{displayLabel}</span>
				</div>

				<div className="flex items-center gap-1.5 shrink-0">
					{activePreset && activePreset !== "custom" && (
						<Badge
							variant="secondary"
							className="rounded-md border-0 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 dark:text-primary-foreground"
						>
							{DATE_PRESETS.find((p) => p.id === activePreset)?.shortLabel ||
								activePreset}
						</Badge>
					)}

					{clearable && currentRange.startDate && !disabled && (
						<span
							role="button"
							tabIndex={0}
							onClick={handleClear}
							className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
							title="Reset to today"
						>
							<RotateCcw className="h-3 w-3" />
						</span>
					)}
				</div>
			</button>

			{/* Range Picker Popover */}
			{isOpen && (
				<div
					className={cn(
						"absolute z-[100] mt-2 w-[340px] sm:w-[560px] rounded-2xl border border-slate-200/90 bg-white/98 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-50 zoom-in-95 dark:border-slate-800 dark:bg-slate-950/98",
						align === "right" ? "right-0" : "left-0",
					)}
				>
					{/* Header */}
					<div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
						<div className="flex items-center gap-2.5">
							<div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
								<CalendarIcon className="h-4 w-4" />
							</div>
							<div>
								<h4 className="text-xs font-bold text-slate-900 dark:text-white">
									Select Date Range
								</h4>
								<p className="text-[10px] text-slate-400 dark:text-slate-500">
									Filter reports by timeframe
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-12 gap-4 py-3">
						{/* Presets List (Left Sidebar on desktop) */}
						{showPresets && (
							<div className="sm:col-span-4 flex flex-wrap sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-slate-100 pb-3 sm:pb-0 sm:pr-3 dark:border-slate-800/80">
								<span className="mb-1 hidden sm:block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
									Quick Presets
								</span>
								{DATE_PRESETS.map((p) => {
									const isActive = activePreset === p.id;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => handlePresetSelect(p.id)}
											className={cn(
												"flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer",
												isActive
													? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-bold"
													: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white",
											)}
										>
											<span>{p.label}</span>
											{isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
										</button>
									);
								})}
							</div>
						)}

						{/* Calendar Controls (Right side) */}
						<div
							className={cn(
								"flex flex-col justify-between",
								showPresets ? "sm:col-span-8" : "sm:col-span-12",
							)}
						>
							{/* Month/Year Interactive Selector Bar */}
							<div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
								<button
									type="button"
									onClick={prevMonth}
									className="h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-50/80 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
									title="Previous month"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>

								{/* Direct Month and Year Selectors */}
								<div className="flex items-center gap-1.5">
									{/* Month Dropdown */}
									<div className="relative">
										<select
											value={currentMonth}
											onChange={(e) =>
												setViewDate(
													new Date(currentYear, Number(e.target.value), 1),
												)
											}
											className="appearance-none h-8 pl-3 pr-7 text-xs font-bold bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white cursor-pointer transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
										>
											{monthNames.map((m, idx) => (
												<option
													key={m}
													value={idx}
													className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
												>
													{m}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
									</div>

									{/* Year Dropdown */}
									<div className="relative">
										<select
											value={currentYear}
											onChange={(e) =>
												setViewDate(
													new Date(Number(e.target.value), currentMonth, 1),
												)
											}
											className="appearance-none h-8 pl-3 pr-7 text-xs font-bold bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white cursor-pointer transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary"
										>
											{years.map((y) => (
												<option
													key={y}
													value={y}
													className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
												>
													{y}
												</option>
											))}
										</select>
										<ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
									</div>
								</div>

								<button
									type="button"
									onClick={nextMonth}
									className="h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-50/80 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
									title="Next month"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>

							{/* Day names */}
							<div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 py-2">
								<span>Mo</span>
								<span>Tu</span>
								<span>We</span>
								<span>Th</span>
								<span>Fr</span>
								<span>Sa</span>
								<span>Su</span>
							</div>

							{/* Day cells grid with connected range bands */}
							<div className="grid grid-cols-7 gap-y-1 text-center text-xs">
								{Array.from({ length: firstDay }).map((_, i) => (
									<div key={`empty-${i}`} className="h-7" />
								))}

								{Array.from({ length: daysInMonth }).map((_, i) => {
									const dayNum = i + 1;
									const dayISO = `${currentYear}-${pad2(currentMonth + 1)}-${pad2(dayNum)}`;
									const dayOfWeekCol = (firstDay + i) % 7; // 0 = Mon, 6 = Sun

									// Determine selection bounds
									let effectiveStart = tempStart;
									let effectiveEnd = tempEnd;

									if (tempStart && !tempEnd && hoveredDate) {
										if (hoveredDate < tempStart) {
											effectiveStart = hoveredDate;
											effectiveEnd = tempStart;
										} else {
											effectiveStart = tempStart;
											effectiveEnd = hoveredDate;
										}
									}

									const isStart = effectiveStart === dayISO;
									const isEnd = effectiveEnd === dayISO;
									const isSingle =
										isStart &&
										(isEnd || !effectiveEnd || effectiveStart === effectiveEnd);
									const isInRange =
										effectiveStart &&
										effectiveEnd &&
										dayISO > effectiveStart &&
										dayISO < effectiveEnd;
									const isToday = dayISO === todayISO;

									return (
										<div
											key={dayNum}
											className={cn(
												"relative h-7 flex items-center justify-center transition-colors",
												// Continuous range background band
												isInRange && "bg-primary/15 dark:bg-primary/25",
												isStart &&
													effectiveEnd &&
													effectiveEnd !== effectiveStart &&
													"bg-gradient-to-r from-transparent 50% to-primary/15 dark:to-primary/25 50%",
												isEnd &&
													effectiveStart &&
													effectiveStart !== effectiveEnd &&
													"bg-gradient-to-l from-transparent 50% to-primary/15 dark:to-primary/25 50%",
												dayOfWeekCol === 0 && isInRange && "rounded-l-lg",
												dayOfWeekCol === 6 && isInRange && "rounded-r-lg",
											)}
										>
											<button
												type="button"
												onClick={() => handleDayClick(dayNum)}
												onMouseEnter={() => setHoveredDate(dayISO)}
												onMouseLeave={() => setHoveredDate(null)}
												className={cn(
													"relative z-10 h-7 w-7 rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer outline-none focus:outline-none",
													isSingle
														? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
														: isStart
															? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
															: isEnd
																? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
																: isInRange
																	? "text-primary dark:text-primary-foreground font-bold hover:bg-primary/25"
																	: isToday
																		? "border border-primary/40 text-primary font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
																		: "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
												)}
											>
												<span>{dayNum}</span>
												{isToday && !isStart && !isEnd && !isInRange && (
													<span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
												)}
											</button>
										</div>
									);
								})}
							</div>

							{/* Selected date readout info & Duration pill */}
							<div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2 text-center text-[11px] text-slate-600 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-300">
								{tempStart ? (
									<div className="flex items-center justify-between gap-1.5">
										<div className="flex items-center gap-1.5 font-medium truncate">
											<span className="font-bold text-slate-900 dark:text-white truncate">
												{formatHumanDate(tempStart)}
											</span>
											<ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
											<span className="font-bold text-slate-900 dark:text-white truncate">
												{tempEnd
													? formatHumanDate(tempEnd)
													: hoveredDate && hoveredDate >= tempStart
														? formatHumanDate(hoveredDate)
														: formatHumanDate(tempStart)}
											</span>
										</div>

										{daysCount > 0 && (
											<Badge
												variant="secondary"
												className="rounded-md border-0 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary dark:bg-primary/20 dark:text-primary-foreground shrink-0"
											>
												{daysCount} {daysCount === 1 ? "day" : "days"}
											</Badge>
										)}
									</div>
								) : (
									<span className="text-slate-400">
										Click to select start and end date
									</span>
								)}
							</div>
						</div>
					</div>

					{/* Footer Actions */}
					<div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
						<button
							type="button"
							onClick={handleResetToday}
							className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-foreground transition-colors cursor-pointer"
						>
							<RotateCcw className="h-3.5 w-3.5" /> Reset to Today
						</button>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="h-8 rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900 transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleApply}
								disabled={!tempStart}
								className="h-8 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
							>
								Apply Range
							</button>
						</div>
					</div>
				</div>
			)}

			{error ? (
				<p className="mt-1 text-xs font-medium text-destructive">{error}</p>
			) : helperText ? (
				<p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
			) : null}
		</div>
	);
}

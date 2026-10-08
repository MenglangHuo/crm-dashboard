"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ModernDatePickerProps {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	value?: string; // YYYY-MM-DD format
	onChange?: (date: string) => void;
	placeholder?: string;
	clearable?: boolean;
	disabled?: boolean;
	required?: boolean;
	containerClassName?: string;
	className?: string;
	id?: string;
	name?: string;
	datePickerSize?: "sm" | "md" | "lg";
}

function parseDateString(val?: string | null): Date | null {
	if (!val) return null;
	const str = String(val).trim();
	if (!str) return null;

	// Check for DD-MM-YYYY or DD/MM/YYYY format
	const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
	if (dmyMatch) {
		const day = parseInt(dmyMatch[1], 10);
		const month = parseInt(dmyMatch[2], 10) - 1;
		const year = parseInt(dmyMatch[3], 10);
		const d = new Date(year, month, day);
		if (!isNaN(d.getTime())) return d;
	}

	// Check for YYYY-MM-DD format
	const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
	if (ymdMatch) {
		const year = parseInt(ymdMatch[1], 10);
		const month = parseInt(ymdMatch[2], 10) - 1;
		const day = parseInt(ymdMatch[3], 10);
		const d = new Date(year, month, day);
		if (!isNaN(d.getTime())) return d;
	}

	const parsed = new Date(str);
	return isNaN(parsed.getTime()) ? null : parsed;
}

export function ModernDatePicker({
	label,
	helperText,
	error,
	value,
	onChange,
	placeholder = "Select date...",
	clearable = false,
	disabled = false,
	required = false,
	containerClassName,
	className,
	id,
	name,
	datePickerSize = "md",
}: ModernDatePickerProps) {
	const generatedId = React.useId();
	const datePickerId = id || generatedId;

	// Selected date state
	const [selectedDate, setSelectedDate] = React.useState<Date | null>(() =>
		parseDateString(value),
	);

	// Calendar navigation view month/year
	const [viewDate, setViewDate] = React.useState<Date>(
		() => selectedDate || new Date(),
	);
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const popoverRef = React.useRef<HTMLDivElement>(null);
	const [popoverCoords, setPopoverCoords] = React.useState<{
		top: number;
		left: number;
	}>({ top: 0, left: 0 });

	const updatePopoverCoords = React.useCallback(() => {
		if (!triggerRef.current) return;
		const rect = triggerRef.current.getBoundingClientRect();
		const popoverWidth = 320; // 20rem = 320px
		const popoverHeight = 370;

		const spaceBelow = window.innerHeight - rect.bottom;
		let top = rect.bottom + 6;

		// If overflowing below and enough space above, flip to top
		if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
			top = Math.max(10, rect.top - popoverHeight - 6);
		}

		let left = rect.left;
		// If overflowing right
		if (left + popoverWidth > window.innerWidth - 16) {
			left = Math.max(16, rect.right - popoverWidth);
		}

		setPopoverCoords({ top, left });
	}, []);

	React.useEffect(() => {
		if (isOpen) {
			updatePopoverCoords();
			const handleScrollOrResize = () => {
				updatePopoverCoords();
			};
			window.addEventListener("scroll", handleScrollOrResize, true);
			window.addEventListener("resize", handleScrollOrResize);
			return () => {
				window.removeEventListener("scroll", handleScrollOrResize, true);
				window.removeEventListener("resize", handleScrollOrResize);
			};
		}
	}, [isOpen, updatePopoverCoords]);

	React.useEffect(() => {
		if (value !== undefined) {
			if (!value) {
				setSelectedDate(null);
			} else {
				const parsed = parseDateString(value);
				if (parsed) {
					setSelectedDate(parsed);
					setViewDate(parsed);
				}
			}
		}
	}, [value]);

	// Close on click outside
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				triggerRef.current &&
				!triggerRef.current.contains(target) &&
				popoverRef.current &&
				!popoverRef.current.contains(target)
			) {
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	// Format date display (DD/MM/YYYY)
	const formatDateDisplay = (date: Date | null) => {
		if (!date) return "";
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	};

	// Format date ISO string (YYYY-MM-DD)
	const formatDateISO = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Calendar Grid Days Calculation
	const getDaysInMonth = (year: number, month: number) =>
		new Date(year, month + 1, 0).getDate();
	const getFirstDayOfMonth = (year: number, month: number) => {
		const day = new Date(year, month, 1).getDay();
		return day === 0 ? 6 : day - 1; // Mon = 0, Sun = 6
	};

	const currentYear = viewDate.getFullYear();
	const currentMonth = viewDate.getMonth();
	const daysInMonth = getDaysInMonth(currentYear, currentMonth);
	const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

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

	// Generate range of years (1930 to 2080)
	const years = React.useMemo(() => {
		const list = [];
		for (let y = 1930; y <= 2080; y++) {
			list.push(y);
		}
		return list;
	}, []);

	const prevMonth = () => {
		setViewDate(new Date(currentYear, currentMonth - 1, 1));
	};

	const nextMonth = () => {
		setViewDate(new Date(currentYear, currentMonth + 1, 1));
	};

	const handleSelectDay = (dayNum: number) => {
		const newDate = new Date(currentYear, currentMonth, dayNum);
		setSelectedDate(newDate);
	};

	const handleSetDate = () => {
		if (selectedDate) {
			const isoStr = formatDateISO(selectedDate);
			onChange?.(isoStr);
		}
		setIsOpen(false);
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		setSelectedDate(null);
		onChange?.("");
	};

	return (
		<div
			className={cn("w-full space-y-1.5", containerClassName)}
			ref={containerRef}
		>
			{label && (
				<Label
					htmlFor={datePickerId}
					className="font-semibold text-xs text-foreground flex items-center gap-1"
				>
					{label}
					{required && <span className="text-destructive font-bold">*</span>}
				</Label>
			)}

			{name && (
				<input
					type="hidden"
					name={name}
					value={selectedDate ? formatDateISO(selectedDate) : ""}
				/>
			)}

			<div className="relative">
				<button
					ref={triggerRef}
					id={datePickerId}
					type="button"
					disabled={disabled}
					onClick={() => setIsOpen((prev) => !prev)}
					className={cn(
						"w-full flex items-center justify-between rounded-xl border transition-all duration-200 shadow-2xs outline-none focus:outline-none focus-visible:outline-none text-left cursor-pointer",
						datePickerSize === "sm"
							? "h-9 text-xs px-3"
							: datePickerSize === "lg"
								? "h-12 text-sm px-4 rounded-2xl"
								: "h-10 text-xs px-3.5",
						"bg-slate-50/80 hover:bg-slate-100/60 border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-900",
						isOpen && "border-primary ring-2 ring-primary/20",
						disabled &&
							"pointer-events-none opacity-50 bg-muted/50 cursor-not-allowed",
						error && "border-destructive ring-2 ring-destructive/20",
						className,
					)}
				>
					<span
						className={cn(
							"text-xs truncate",
							selectedDate
								? "text-foreground font-medium"
								: "text-muted-foreground/70",
						)}
					>
						{selectedDate ? formatDateDisplay(selectedDate) : placeholder}
					</span>

					<div className="flex items-center gap-2 text-muted-foreground shrink-0">
						{clearable && selectedDate && !disabled && (
							<span
								role="button"
								tabIndex={0}
								onClick={handleClear}
								className="p-0.5 rounded-full hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
								title="Clear date"
							>
								<X className="size-3.5" />
							</span>
						)}
						<CalendarIcon
							className={cn(
								"text-slate-400 group-hover:text-slate-600 transition-colors shrink-0",
								datePickerSize === "sm" ? "size-3.5" : datePickerSize === "lg" ? "size-5" : "size-4",
							)}
						/>
					</div>
				</button>

				{/* Custom Calendar Popover rendered into document.body with fixed positioning so it is never clipped */}
				{isOpen &&
					typeof document !== "undefined" &&
					createPortal(
						<div
							ref={popoverRef}
							style={{
								position: "fixed",
								top: `${popoverCoords.top}px`,
								left: `${popoverCoords.left}px`,
								zIndex: 99999,
							}}
							className="w-80 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xl animate-in fade-in-50 zoom-in-95 dark:bg-slate-950 dark:border-slate-800"
						>
							{/* Header: Month & Year Selection Dropdowns + Navigation */}
							<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900">
								<button
									type="button"
									onClick={prevMonth}
									className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 outline-none focus:outline-none cursor-pointer"
									title="Previous Month"
								>
									<ChevronLeft className="size-4" />
								</button>

								{/* Month and Year dropdown selectors */}
								<div className="flex items-center gap-1.5">
									<select
										value={currentMonth}
										onChange={(e) =>
											setViewDate(
												new Date(currentYear, Number(e.target.value), 1),
											)
										}
										className="h-8 px-2 py-0 text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white cursor-pointer outline-none focus:outline-none focus:ring-1 focus:ring-primary"
									>
										{monthNames.map((m, idx) => (
											<option key={m} value={idx}>
												{m}
											</option>
										))}
									</select>

									<select
										value={currentYear}
										onChange={(e) =>
											setViewDate(
												new Date(Number(e.target.value), currentMonth, 1),
											)
										}
										className="h-8 px-2 py-0 text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white cursor-pointer outline-none focus:outline-none focus:ring-1 focus:ring-primary"
									>
										{years.map((y) => (
											<option key={y} value={y}>
												{y}
											</option>
										))}
									</select>
								</div>

								<button
									type="button"
									onClick={nextMonth}
									className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors dark:border-slate-800 dark:hover:bg-slate-900 dark:text-slate-300 outline-none focus:outline-none cursor-pointer"
									title="Next Month"
								>
									<ChevronRight className="size-4" />
								</button>
							</div>

							{/* Days of Week */}
							<div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 py-2.5">
								<span>Mon</span>
								<span>Tue</span>
								<span>Wed</span>
								<span>Thu</span>
								<span>Fri</span>
								<span>Sat</span>
								<span>Sun</span>
							</div>

							{/* Calendar Grid */}
							<div className="grid grid-cols-7 gap-1 text-center text-xs pb-4">
								{/* Empty leading slots */}
								{Array.from({ length: firstDay }).map((_, i) => (
									<div key={`empty-${i}`} className="h-8" />
								))}

								{/* Day cells */}
								{Array.from({ length: daysInMonth }).map((_, i) => {
									const dayNum = i + 1;
									const isSelected =
										selectedDate &&
										selectedDate.getDate() === dayNum &&
										selectedDate.getMonth() === currentMonth &&
										selectedDate.getFullYear() === currentYear;

									return (
										<button
											key={dayNum}
											type="button"
											onClick={() => handleSelectDay(dayNum)}
											className={cn(
												"h-8 w-8 mx-auto rounded-full flex items-center justify-center transition-all text-slate-700 font-medium dark:text-slate-200 outline-none focus:outline-none cursor-pointer",
												isSelected
													? "bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary/90"
													: "hover:bg-slate-100 dark:hover:bg-slate-900",
											)}
										>
											{dayNum}
										</button>
									);
								})}
							</div>

							{/* Footer matching reference image: Date Display Input + Set Date Primary Button */}
							<div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-900">
								<div className="flex-1 h-10 px-3 border border-slate-200 rounded-lg flex items-center text-xs font-medium text-slate-700 bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300">
									{selectedDate
										? formatDateDisplay(selectedDate)
										: "DD/MM/YYYY"}
								</div>
								<button
									type="button"
									onClick={handleSetDate}
									disabled={!selectedDate}
									className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition-all disabled:opacity-50 outline-none focus:outline-none cursor-pointer"
								>
									Set Date
								</button>
							</div>
						</div>,
						document.body,
					)}
			</div>

			{error ? (
				<p className="text-xs font-medium text-destructive flex items-center gap-1">
					{error}
				</p>
			) : helperText ? (
				<p className="text-xs text-muted-foreground">{helperText}</p>
			) : null}
		</div>
	);
}

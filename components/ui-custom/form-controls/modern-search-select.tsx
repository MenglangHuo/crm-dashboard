"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
	Check,
	ChevronDown,
	ChevronUp,
	Loader2,
	Search,
	Star,
	X
} from "lucide-react";
import React, {
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";

export interface SearchSelectOption {
	value: string | number;
	label: string;
	subtitle?: string;
	icon?: React.ReactNode;
	badge?: string;
	badgeVariant?: "default" | "secondary" | "outline" | "destructive";
	raw?: any;
}

export interface ModernSearchSelectProps {
	label?: string;
	description?: string;
	error?: string;
	placeholder?: string;
	searchPlaceholder?: string;
	isMulti?: boolean;
	value?: (string | number)[] | string | number | null;
	onChange?: (value: any, selectedOptions: SearchSelectOption[]) => void;
	options?: SearchSelectOption[];
	loadOptions?: (query: string) => Promise<SearchSelectOption[]>;
	debounceMs?: number;
	disabled?: boolean;
	className?: string;
	maxBadgesVisible?: number;
	selectSize?: "sm" | "md" | "lg";
	// Primary selection support (e.g. for primary delivery route)
	primaryValue?: string | number | null;
	onSetPrimary?: (value: string | number) => void;
	primaryLabel?: string;
}

export function ModernSearchSelect({
	label,
	description,
	error,
	placeholder = "Select an option...",
	searchPlaceholder = "Type to search...",
	isMulti = false,
	value,
	onChange,
	options: staticOptions = [],
	loadOptions,
	debounceMs = 500,
	disabled = false,
	className,
	selectSize = "md",
	primaryValue,
	onSetPrimary,
	primaryLabel = "Primary",
}: ModernSearchSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [asyncOptions, setAsyncOptions] = useState<SearchSelectOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	// Normalize current selected values into an array
	const selectedValues: (string | number)[] = useMemo(() => {
		if (value === undefined || value === null) return [];
		if (Array.isArray(value)) return value;
		return [value];
	}, [value]);

	// Combined available options list
	const allKnownOptions = useMemo(() => {
		const map = new Map<string | number, SearchSelectOption>();
		staticOptions.forEach((opt) => map.set(opt.value, opt));
		asyncOptions.forEach((opt) => map.set(opt.value, opt));
		return map;
	}, [staticOptions, asyncOptions]);

	// Get selected Option items
	const selectedOptionsList = useMemo(() => {
		return selectedValues.map(
			(v) =>
				allKnownOptions.get(v) || {
					value: v,
					label: String(v),
				},
		);
	}, [selectedValues, allKnownOptions]);

	// Debounced search trigger (500ms default delay before calling api or filtering)
	useEffect(() => {
		if (!loadOptions) return;

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		setIsLoading(true);
		debounceTimerRef.current = setTimeout(async () => {
			try {
				const results = await loadOptions(searchQuery.trim());
				setAsyncOptions(results || []);
			} catch (err) {
				console.error("ModernSearchSelect async load error:", err);
			} finally {
				setIsLoading(false);
			}
		}, debounceMs);

		return () => {
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		};
	}, [searchQuery, loadOptions, debounceMs]);

	// Filter static options if no loadOptions passed
	const displayedOptions = useMemo(() => {
		if (loadOptions) {
			return asyncOptions;
		}
		if (!searchQuery.trim()) return staticOptions;
		const q = searchQuery.toLowerCase();
		return staticOptions.filter(
			(opt) =>
				opt.label.toLowerCase().includes(q) ||
				(opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
				(opt.badge && opt.badge.toLowerCase().includes(q)),
		);
	}, [loadOptions, asyncOptions, staticOptions, searchQuery]);

	// Click outside to close
	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	// Handle select / toggle option
	const handleToggleOption = (opt: SearchSelectOption) => {
		if (isMulti) {
			const exists = selectedValues.some(
				(v) => String(v) === String(opt.value),
			);
			let newValues: (string | number)[];
			if (exists) {
				newValues = selectedValues.filter(
					(v) => String(v) !== String(opt.value),
				);
				// If unselecting the primary, reset or update primary
				if (
					onSetPrimary &&
					primaryValue &&
					String(primaryValue) === String(opt.value)
				) {
					onSetPrimary(newValues[0] ?? "");
				}
			} else {
				newValues = [...selectedValues, opt.value];
				if (onSetPrimary && (!primaryValue || newValues.length === 1)) {
					onSetPrimary(opt.value);
				}
			}
			const newSelectedOptions = newValues.map(
				(v) => allKnownOptions.get(v) || { value: v, label: String(v) },
			);
			onChange?.(newValues, newSelectedOptions);
		} else {
			onChange?.(opt.value, [opt]);
			setIsOpen(false);
		}
	};

	const handleRemoveValue = (val: string | number, e: React.MouseEvent) => {
		e.stopPropagation();
		const newValues = selectedValues.filter((v) => String(v) !== String(val));
		if (onSetPrimary && primaryValue && String(primaryValue) === String(val)) {
			onSetPrimary(newValues[0] ?? "");
		}
		const newSelectedOptions = newValues.map(
			(v) => allKnownOptions.get(v) || { value: v, label: String(v) },
		);
		onChange?.(newValues, newSelectedOptions);
	};

	const handleClearAll = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange?.(isMulti ? [] : null, []);
		if (onSetPrimary) onSetPrimary("");
	};

	return (
		<div ref={containerRef} className={cn("w-full space-y-1.5", className)}>
			{label && (
				<div className="flex items-center justify-between">
					<Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
						{label}
					</Label>
					{isMulti && selectedValues.length > 0 && (
						<span className="text-[11px] font-semibold text-slate-400">
							{selectedValues.length} selected
						</span>
					)}
				</div>
			)}

			{/* Control Box */}
			<div
				onClick={() => {
					if (!disabled) {
						setIsOpen(!isOpen);
						if (!isOpen) {
							setTimeout(() => inputRef.current?.focus(), 50);
						}
					}
				}}
				className={cn(
					"w-full border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs outline-none focus:outline-none",
					selectSize === "sm"
						? "h-9 min-h-9 text-xs px-3 py-1 rounded-xl bg-slate-50/80 hover:bg-slate-100/60 border-slate-200/80 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-900"
						: selectSize === "lg"
							? "min-h-12 text-sm px-4 py-2 rounded-2xl bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700"
							: "min-h-10 text-xs px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-950 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700",
					isOpen &&
						(selectSize === "sm"
							? "border-primary ring-2 ring-primary/20 dark:border-primary dark:ring-primary/20"
							: "border-slate-950 ring-2 ring-slate-950/10 dark:border-slate-100 dark:ring-slate-100/20"),
					disabled &&
						"opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900",
					error && "border-rose-500 ring-rose-500/20",
				)}
			>
				{/* Selected values or placeholder */}
				<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
					{selectedOptionsList.length === 0 ? (
						<span
							className={cn(
								"text-xs select-none truncate",
								selectSize === "sm"
									? "text-muted-foreground/70"
									: "text-slate-400 dark:text-slate-500 py-1",
							)}
						>
							{placeholder}
						</span>
					) : isMulti ? (
						selectedOptionsList.map((opt) => {
							const isPrimary =
								onSetPrimary &&
								primaryValue &&
								String(primaryValue) === String(opt.value);
							return (
								<span
									key={String(opt.value)}
									onClick={(e) => e.stopPropagation()}
									className={cn(
										"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-semibold transition-colors border",
										isPrimary
											? "bg-purple-600 text-white border-purple-500 shadow-2xs font-bold"
											: "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80",
									)}
								>
									{opt.icon && <span className="shrink-0">{opt.icon}</span>}
									<span className="truncate max-w-[140px]">{opt.label}</span>

									{onSetPrimary && (
										<button
											type="button"
											title={
												isPrimary ? "Current Primary" : `Set as ${primaryLabel}`
											}
											onClick={(e) => {
												e.stopPropagation();
												onSetPrimary(opt.value);
											}}
											className={cn(
												"text-[10px] px-1 py-0.2 rounded transition-colors font-bold",
												isPrimary
													? "bg-white/20 text-white"
													: "text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40",
											)}
										>
											{isPrimary ? (
												primaryLabel
											) : (
												<Star className="h-2.5 w-2.5" />
											)}
										</button>
									)}

									{!disabled && (
										<button
											type="button"
											onClick={(e) => handleRemoveValue(opt.value, e)}
											className={cn(
												"rounded-full p-0.5 transition-colors",
												isPrimary
													? "text-white/70 hover:text-white"
													: "text-slate-400 hover:text-rose-600",
											)}
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</span>
							);
						})
					) : (
						<div
							className={cn(
								"flex items-center gap-2 text-xs text-slate-900 dark:text-slate-100 truncate",
								selectSize === "sm" ? "py-0 font-medium" : "py-1 font-bold",
							)}
						>
							{selectedOptionsList[0].icon}
							<span className="truncate">{selectedOptionsList[0].label}</span>
							{selectedOptionsList[0].badge && (
								<Badge
									variant="outline"
									className="text-[10px] py-0 px-1 font-normal shrink-0"
								>
									{selectedOptionsList[0].badge}
								</Badge>
							)}
						</div>
					)}
				</div>

				{/* Right tools (Clear, Loading, Chevron) */}
				<div className="flex items-center gap-1.5 shrink-0">
					{selectedValues.length > 0 && !disabled && (
						<button
							type="button"
							onClick={handleClearAll}
							className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
							title="Clear all"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}

					{isLoading ? (
						<Loader2
							className={cn(
								"text-slate-400 animate-spin shrink-0",
								selectSize === "sm" ? "size-3.5" : "h-3.5 w-3.5",
							)}
						/>
					) : isOpen ? (
						<ChevronUp
							className={cn(
								"text-slate-400 shrink-0",
								selectSize === "sm" ? "size-3.5" : "h-4 w-4",
							)}
						/>
					) : (
						<ChevronDown
							className={cn(
								"text-slate-400 shrink-0",
								selectSize === "sm" ? "size-3.5" : "h-4 w-4",
							)}
						/>
					)}
				</div>
			</div>

			{/* Dropdown Popover */}
			{isOpen && (
				<div className="relative z-50">
					<div className="absolute top-1 left-0 right-0 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-950 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col space-y-1.5">
						{/* Search Input Bar */}
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
							<input
								ref={inputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={searchPlaceholder}
								className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-100"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</div>

						{/* Options List */}
						<div className="overflow-y-auto space-y-0.5 flex-1 max-h-56 pr-0.5">
							{isLoading ? (
								<div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
									<Loader2 className="h-4 w-4 animate-spin text-purple-600" />
									<span>Searching options...</span>
								</div>
							) : displayedOptions.length === 0 ? (
								<div className="py-6 text-center text-xs text-slate-400">
									No matching options found
								</div>
							) : (
								displayedOptions.map((opt) => {
									const isSelected = selectedValues.some(
										(v) => String(v) === String(opt.value),
									);
									const isPrimary =
										onSetPrimary &&
										primaryValue &&
										String(primaryValue) === String(opt.value);

									return (
										<div
											key={String(opt.value)}
											onClick={() => handleToggleOption(opt)}
											className={cn(
												"flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors select-none",
												isSelected
													? "bg-slate-100 dark:bg-slate-900 text-slate-950 dark:text-white font-bold"
													: "hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-medium",
											)}
										>
											<div className="flex items-center gap-2.5 min-w-0 pr-2">
												<div
													className={cn(
														"h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
														isSelected
															? "bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900"
															: "border-slate-300 dark:border-slate-700",
													)}
												>
													{isSelected && <Check className="h-3 w-3" />}
												</div>

												{opt.icon && (
													<span className="shrink-0">{opt.icon}</span>
												)}

												<div className="min-w-0">
													<p className="truncate text-xs font-semibold">
														{opt.label}
													</p>
													{opt.subtitle && (
														<p className="truncate text-[10px] text-slate-400 font-normal">
															{opt.subtitle}
														</p>
													)}
												</div>
											</div>

											<div className="flex items-center gap-1.5 shrink-0">
												{opt.badge && (
													<Badge
														variant="outline"
														className="text-[9px] py-0 px-1 font-semibold"
													>
														{opt.badge}
													</Badge>
												)}
												{isPrimary && (
													<Badge className="bg-purple-600 text-white text-[9px] py-0 px-1 font-bold">
														{primaryLabel}
													</Badge>
												)}
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				</div>
			)}

			{description && (
				<p className="text-[11px] text-slate-500 dark:text-slate-400">
					{description}
				</p>
			)}
			{error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
		</div>
	);
}

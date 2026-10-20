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
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

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
	portal?: boolean;
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
	portal = false,
}: ModernSearchSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [asyncOptions, setAsyncOptions] = useState<SearchSelectOption[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const [popoverCoords, setPopoverCoords] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);

	const calculatePopoverCoords = useCallback(() => {
		const el = triggerRef.current || containerRef.current;
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		const dropdownHeight = 300;
		const spaceBelow = window.innerHeight - rect.bottom;
		let top = rect.bottom + 4;
		if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
			top = Math.max(10, rect.top - dropdownHeight - 4);
		}
		return {
			top,
			left: rect.left,
			width: Math.max(rect.width, 240),
		};
	}, []);

	const updatePopoverCoords = useCallback(() => {
		const coords = calculatePopoverCoords();
		if (coords) setPopoverCoords(coords);
	}, [calculatePopoverCoords]);

	useIsomorphicLayoutEffect(() => {
		if (isOpen && portal) {
			updatePopoverCoords();
		}
	}, [isOpen, portal, updatePopoverCoords]);

	useEffect(() => {
		if (isOpen && portal) {
			const handleScrollOrResize = () => updatePopoverCoords();
			window.addEventListener("scroll", handleScrollOrResize, true);
			window.addEventListener("resize", handleScrollOrResize);
			return () => {
				window.removeEventListener("scroll", handleScrollOrResize, true);
				window.removeEventListener("resize", handleScrollOrResize);
			};
		}
	}, [isOpen, portal, updatePopoverCoords]);

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

	const loadOptionsRef = useRef(loadOptions);
	useEffect(() => {
		loadOptionsRef.current = loadOptions;
	}, [loadOptions]);

	const hasLoadedInitialRef = useRef(false);

	// Debounced search trigger (only runs when dropdown is open, avoiding API calls when closed)
	useEffect(() => {
		if (!isOpen) return;
		if (!loadOptionsRef.current) return;

		// If initial options already loaded and query is empty, don't refetch
		if (!searchQuery.trim() && hasLoadedInitialRef.current && asyncOptions.length > 0) {
			return;
		}

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		setIsLoading(true);
		const delay = searchQuery.trim() ? debounceMs : 0;
		debounceTimerRef.current = setTimeout(async () => {
			try {
				const results = await loadOptionsRef.current?.(searchQuery.trim());
				setAsyncOptions(results || []);
				if (!searchQuery.trim()) {
					hasLoadedInitialRef.current = true;
				}
			} catch (err) {
				console.error("ModernSearchSelect async load error:", err);
			} finally {
				setIsLoading(false);
			}
		}, delay);

		return () => {
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		};
	}, [isOpen, searchQuery, debounceMs]);

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
			const target = e.target as Node;
			if (
				(containerRef.current && containerRef.current.contains(target)) ||
				(portal && popoverRef.current && popoverRef.current.contains(target))
			) {
				return;
			}
			setIsOpen(false);
		};
		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, [portal]);

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

	// Size styling to match ModernInput and ModernSelect
	const sizeStyles = {
		sm: isMulti
			? "min-h-9 text-xs px-3 py-1 rounded-lg"
			: "h-9 min-h-9 text-xs px-3 rounded-lg",
		md: isMulti
			? "min-h-11 text-sm px-4 py-2 rounded-lg"
			: "h-11 min-h-11 text-sm px-4 rounded-lg",
		lg: isMulti
			? "min-h-12 text-base px-4 py-2.5 rounded-xl"
			: "h-12 min-h-12 text-base px-4 rounded-xl",
	};

	const iconSizeStyles = {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5",
	};

	return (
		<div ref={containerRef} className={cn("w-full space-y-1.5", className)}>
			{label && (
				<div className="space-y-0.5">
					<div className="flex items-center justify-between">
						<Label className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1">
							{label}
						</Label>
						{isMulti && selectedValues.length > 0 && (
							<span className="text-[11px] font-semibold text-slate-400">
								{selectedValues.length} selected
							</span>
						)}
					</div>
					{description && (
						<p className="text-[11px] text-muted-foreground leading-normal">
							{description}
						</p>
					)}
				</div>
			)}

			{/* Control Box */}
			<div
				ref={triggerRef}
				onClick={() => {
					if (!disabled) {
						if (!isOpen) {
							if (portal) {
								const coords = calculatePopoverCoords();
								if (coords) setPopoverCoords(coords);
							}
							setIsOpen(true);
							setTimeout(() => inputRef.current?.focus(), 50);
						} else {
							setIsOpen(false);
						}
					}
				}}
				className={cn(
					"w-full border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs outline-none focus:outline-none",
					sizeStyles[selectSize],
					"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700",
					isOpen &&
						"border-primary ring-2 ring-primary/20 dark:border-primary dark:ring-primary/20",
					disabled &&
						"pointer-events-none opacity-50 bg-muted/50 cursor-not-allowed",
					error &&
						"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
				)}
			>
				{/* Selected values or placeholder */}
				<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
					{selectedOptionsList.length === 0 ? (
						<span
							className={cn(
								"select-none truncate text-muted-foreground/70",
								selectSize === "sm"
									? "text-xs"
									: selectSize === "lg"
										? "text-base"
										: "text-sm",
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
										"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors border",
										isPrimary
											? "bg-purple-600 text-white border-purple-500 shadow-2xs font-semibold"
											: "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80",
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
								"flex items-center gap-2 text-slate-900 dark:text-slate-100 truncate",
								selectSize === "sm"
									? "text-xs font-normal"
									: selectSize === "lg"
										? "text-base font-normal"
										: "text-sm font-normal",
							)}
						>
							{selectedOptionsList[0].icon}
							<span className="truncate">{selectedOptionsList[0].label}</span>
							{selectedOptionsList[0].badge && (
								<Badge
									variant="outline"
									className="text-[10px] py-0 px-1.5 font-normal shrink-0"
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
			{isOpen && (!portal || popoverCoords) && (() => {
				const dropdownContent = (
					<div
						ref={popoverRef}
						style={
							portal && popoverCoords
								? {
										position: "fixed",
										top: `${popoverCoords.top}px`,
										left: `${popoverCoords.left}px`,
										width: `${popoverCoords.width}px`,
										zIndex: 99999,
									}
								: undefined
						}
						className={cn(
							"rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-950 p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-72 flex flex-col space-y-1.5",
							!portal && "absolute top-1 left-0 right-0 z-50",
						)}
					>
						{/* Search Input Bar */}
						<div className="relative">
							<Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
							<input
								ref={inputRef}
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder={searchPlaceholder}
								className="w-full rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-primary"
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
												"flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors select-none",
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
				);

				return portal && typeof document !== "undefined"
					? createPortal(dropdownContent, document.body)
					: <div className="relative z-50">{dropdownContent}</div>;
			})()}

			{description && (
				<p className="text-[11px] text-slate-500 dark:text-slate-400">
					{description}
				</p>
			)}
			{error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
		</div>
	);
}

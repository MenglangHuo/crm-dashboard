"use client";

import * as React from "react";
import { ChevronDown, Search, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface SelectOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
	description?: string;
	badge?: string;
	disabled?: boolean;
}

export interface ModernSelectProps {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	options?: SelectOption[];
	value?: string | null;
	defaultValue?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	leftIcon?: React.ReactNode;
	searchable?: boolean;
	clearable?: boolean;
	isLoading?: boolean;
	disabled?: boolean;
	required?: boolean;
	selectSize?: "sm" | "md" | "lg";
	variant?: "outline" | "filled" | "glass" | "subtle";
	containerClassName?: string;
	className?: string;
	name?: string;
	id?: string;
	children?: React.ReactNode;
}

export function ModernSelect({
	label,
	helperText,
	error,
	options = [],
	value,
	defaultValue = "",
	onChange,
	placeholder = "Select an option...",
	leftIcon,
	searchable = false,
	clearable = false,
	isLoading = false,
	disabled = false,
	required = false,
	selectSize = "md",
	variant = "outline",
	containerClassName,
	className,
	name,
	id,
	children,
}: ModernSelectProps) {
	const generatedId = React.useId();
	const selectId = id || generatedId;

	const [selectedValue, setSelectedValue] = React.useState<string>(
		value ?? defaultValue ?? "",
	);
	const [isOpen, setIsOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (value !== undefined) {
			setSelectedValue(value ?? "");
		}
	}, [value]);

	// Close dropdown on outside click
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const selectedOption = React.useMemo(() => {
		return options.find((opt) => opt.value === selectedValue);
	}, [options, selectedValue]);

	const filteredOptions = React.useMemo(() => {
		if (!searchQuery.trim()) return options;
		const query = searchQuery.toLowerCase();
		return options.filter(
			(opt) =>
				opt.label.toLowerCase().includes(query) ||
				(opt.description && opt.description.toLowerCase().includes(query)),
		);
	}, [options, searchQuery]);

	const handleSelect = (optionValue: string) => {
		if (value === undefined) {
			setSelectedValue(optionValue);
		}
		onChange?.(optionValue);
		setIsOpen(false);
		setSearchQuery("");
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (value === undefined) {
			setSelectedValue("");
		}
		onChange?.("");
	};

	// Size mapping
	const sizeStyles = {
		sm: "h-9 text-xs px-3",
		md: "h-11 text-sm px-4",
		lg: "h-12 text-base px-4",
	};

	const iconSizeStyles = {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5",
	};

	// Variant mapping
	const variantStyles = {
		outline:
			"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700",
		filled:
			"border-transparent bg-slate-100/70 hover:bg-slate-100 focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus:bg-slate-900",
		glass:
			"border-white/20 bg-white/40 backdrop-blur-md shadow-xs hover:border-white/40 focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700",
		subtle:
			"border-border/40 bg-muted/30 hover:border-border/80 focus:border-primary focus:bg-background dark:bg-slate-900/30",
	};

	// If standard children are passed without options array, render enhanced native wrapper
	if (children && options.length === 0) {
		return (
			<div className={cn("w-full space-y-1.5", containerClassName)}>
				{label && (
					<Label
						htmlFor={selectId}
						className="font-medium text-xs text-foreground flex items-center gap-1"
					>
						{label}
						{required && <span className="text-destructive font-bold">*</span>}
					</Label>
				)}
				<div className="relative flex items-center">
					{leftIcon && (
						<div
							className={cn(
								"absolute left-3 text-muted-foreground pointer-events-none z-10",
								iconSizeStyles[selectSize],
							)}
						>
							{leftIcon}
						</div>
					)}
					<select
						id={selectId}
						name={name}
						value={selectedValue}
						disabled={disabled}
						onChange={(e) => {
							setSelectedValue(e.target.value);
							onChange?.(e.target.value);
						}}
						className={cn(
							"w-full appearance-none rounded-lg border transition-all duration-200 shadow-2xs outline-none focus:outline-none focus-visible:outline-none text-foreground cursor-pointer pr-10",
							sizeStyles[selectSize],
							variantStyles[variant],
							leftIcon && "pl-9",
							disabled && "pointer-events-none opacity-50 bg-muted/50",
							error &&
								"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
							className,
						)}
					>
						{children}
					</select>
					<ChevronDown
						className={cn(
							"absolute right-3 text-muted-foreground pointer-events-none",
							iconSizeStyles[selectSize],
						)}
					/>
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

	return (
		<div
			className={cn("w-full space-y-1.5", isOpen && "relative z-50", containerClassName)}
			ref={dropdownRef}
		>
			{/* Label */}
			{label && (
				<Label
					htmlFor={selectId}
					className="font-medium text-xs text-foreground flex items-center gap-1"
				>
					{label}
					{required && <span className="text-destructive font-bold">*</span>}
				</Label>
			)}

			{/* Hidden input for form submission integration */}
			{name && <input type="hidden" name={name} value={selectedValue} />}

			{/* Select Trigger Box */}
			<div className={cn("relative", isOpen && "z-50")}>
				<button
					id={selectId}
					type="button"
					disabled={disabled}
					onClick={() => setIsOpen((prev) => !prev)}
					className={cn(
						"w-full flex items-center justify-between rounded-lg border transition-all duration-200 shadow-2xs outline-none focus:outline-none focus-visible:outline-none text-left cursor-pointer",
						sizeStyles[selectSize],
						variantStyles[variant],
						isOpen &&
							"border-primary ring-2 ring-primary/20 dark:ring-primary/30",
						disabled &&
							"pointer-events-none opacity-50 bg-muted/50 cursor-not-allowed",
						error &&
							"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
						className,
					)}
				>
					<div className="flex items-center gap-2 truncate min-w-0 pr-2">
						{/* Left Icon or Option Icon */}
						{selectedOption?.icon ? (
							<span
								className={cn(
									"text-primary shrink-0",
									iconSizeStyles[selectSize],
								)}
							>
								{selectedOption.icon}
							</span>
						) : leftIcon ? (
							<span
								className={cn(
									"text-muted-foreground shrink-0",
									iconSizeStyles[selectSize],
								)}
							>
								{leftIcon}
							</span>
						) : null}

						{/* Selected Value Text */}
						{selectedOption ? (
							<span className="font-medium text-foreground truncate">
								{selectedOption.label}
							</span>
						) : (
							<span className="text-muted-foreground/70 truncate">
								{placeholder}
							</span>
						)}
					</div>

					{/* Right Controls */}
					<div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
						{isLoading && (
							<Loader2
								className={cn(
									"animate-spin text-primary",
									iconSizeStyles[selectSize],
								)}
							/>
						)}

						{!isLoading && clearable && selectedValue && !disabled && (
							<span
								role="button"
								tabIndex={0}
								onClick={handleClear}
								className="p-0.5 rounded-full hover:bg-muted hover:text-foreground transition-colors"
								title="Clear selection"
							>
								<X className="size-3.5" />
							</span>
						)}

						{!isLoading && (
							<ChevronDown
								className={cn(
									"transition-transform duration-200",
									isOpen && "rotate-180 text-primary",
									iconSizeStyles[selectSize],
								)}
							/>
						)}
					</div>
				</button>

				{/* Dropdown Popup Menu */}
				{isOpen && (
					<div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
						{/* Search Input Filter */}
						{searchable && (
							<div className="p-2 border-b border-border/40">
								<div className="relative flex items-center">
									<Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search options..."
										className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 rounded-lg outline-none border border-transparent focus:border-primary/40 dark:bg-slate-800/50"
										autoFocus
									/>
								</div>
							</div>
						)}

						{/* Options Scroll List */}
						<div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
							{filteredOptions.length === 0 ? (
								<div className="py-4 text-center text-xs text-muted-foreground">
									No options found.
								</div>
							) : (
								filteredOptions.map((opt) => {
									const isSelected = opt.value === selectedValue;
									return (
										<button
											key={opt.value}
											type="button"
											disabled={opt.disabled}
											onClick={() => handleSelect(opt.value)}
											className={cn(
												"w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left",
												isSelected
													? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
													: "hover:bg-muted text-foreground dark:hover:bg-slate-800/80",
												opt.disabled && "opacity-50 cursor-not-allowed",
											)}
										>
											<div className="flex items-center gap-2.5 min-w-0 pr-2">
												{opt.icon && (
													<span className="shrink-0 text-muted-foreground">
														{opt.icon}
													</span>
												)}
												<div className="truncate">
													<div className="truncate font-medium">
														{opt.label}
													</div>
													{opt.description && (
														<div className="text-[10px] text-muted-foreground truncate">
															{opt.description}
														</div>
													)}
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0">
												{opt.badge && (
													<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
														{opt.badge}
													</span>
												)}
												{isSelected && (
													<Check className="size-4 text-primary" />
												)}
											</div>
										</button>
									);
								})
							)}
						</div>
					</div>
				)}
			</div>

			{/* Helper / Error */}
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

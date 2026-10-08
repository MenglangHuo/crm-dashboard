"use client";

import * as React from "react";
import { ChevronDown, X, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ComboboxOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
	badge?: string;
	description?: string;
	color?: string;
}

export interface ModernComboboxProps {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	options?: ComboboxOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	leftIcon?: React.ReactNode;
	allowCustom?: boolean;
	customActionLabel?: (query: string) => string;
	disabled?: boolean;
	required?: boolean;
	comboboxSize?: "sm" | "md" | "lg";
	variant?: "outline" | "filled" | "glass" | "subtle";
	clearable?: boolean;
	containerClassName?: string;
	className?: string;
	name?: string;
	id?: string;
}

export function ModernCombobox({
	label,
	helperText,
	error,
	options = [],
	value,
	defaultValue = "",
	onChange,
	placeholder = "Select or type custom...",
	leftIcon,
	allowCustom = true,
	customActionLabel,
	disabled = false,
	required = false,
	comboboxSize = "md",
	variant = "outline",
	clearable = true,
	containerClassName,
	className,
	name,
	id,
}: ModernComboboxProps) {
	const generatedId = React.useId();
	const inputId = id || generatedId;

	const [selectedValue, setSelectedValue] = React.useState<string>(
		value ?? defaultValue ?? "",
	);
	const [inputValue, setInputValue] = React.useState<string>("");
	const [isOpen, setIsOpen] = React.useState(false);
	const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	// Synchronize when controlled value changes from outside
	React.useEffect(() => {
		if (value !== undefined) {
			setSelectedValue(value);
			const matched = options.find(
				(opt) =>
					opt.value.toLowerCase() === value.toLowerCase() ||
					opt.label.toLowerCase() === value.toLowerCase(),
			);
			setInputValue(matched ? matched.label : value);
		}
	}, [value, options]);

	// Initialize input value on mount if not controlled
	React.useEffect(() => {
		if (value === undefined && defaultValue) {
			const matched = options.find(
				(opt) =>
					opt.value.toLowerCase() === defaultValue.toLowerCase() ||
					opt.label.toLowerCase() === defaultValue.toLowerCase(),
			);
			setInputValue(matched ? matched.label : defaultValue);
		}
	}, []);

	// Click outside to close and commit
	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				// If user typed something custom and blurred without selecting, commit it
				if (allowCustom && inputValue.trim()) {
					const matched = options.find(
						(opt) =>
							opt.label.toLowerCase() === inputValue.trim().toLowerCase() ||
							opt.value.toLowerCase() === inputValue.trim().toLowerCase(),
					);
					const finalVal = matched ? matched.value : inputValue.trim();
					if (finalVal !== selectedValue) {
						if (value === undefined) setSelectedValue(finalVal);
						onChange?.(finalVal);
					}
				}
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [allowCustom, inputValue, selectedValue, options, value, onChange]);

	// Filter options
	const filteredOptions = React.useMemo(() => {
		if (!inputValue.trim()) return options;
		const q = inputValue.trim().toLowerCase();
		return options.filter(
			(opt) =>
				opt.label.toLowerCase().includes(q) ||
				opt.value.toLowerCase().includes(q) ||
				(opt.description && opt.description.toLowerCase().includes(q)),
		);
	}, [options, inputValue]);

	// Check if user's input is a new custom value
	const isExactMatch = React.useMemo(() => {
		if (!inputValue.trim()) return true;
		const q = inputValue.trim().toLowerCase();
		return options.some(
			(opt) => opt.label.toLowerCase() === q || opt.value.toLowerCase() === q,
		);
	}, [options, inputValue]);

	const showCustomOption =
		allowCustom && inputValue.trim().length > 0 && !isExactMatch;

	const handleSelectOption = (opt: ComboboxOption) => {
		if (value === undefined) {
			setSelectedValue(opt.value);
		}
		setInputValue(opt.label);
		onChange?.(opt.value);
		setIsOpen(false);
		setHighlightedIndex(-1);
	};

	const handleSelectCustom = (customText: string) => {
		const trimmed = customText.trim();
		if (!trimmed) return;
		if (value === undefined) {
			setSelectedValue(trimmed);
		}
		setInputValue(trimmed);
		onChange?.(trimmed);
		setIsOpen(false);
		setHighlightedIndex(-1);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const next = e.target.value;
		setInputValue(next);
		setIsOpen(true);
		setHighlightedIndex(-1);

		// If user cleared text completely
		if (!next.trim()) {
			if (value === undefined) setSelectedValue("");
			onChange?.("");
		}
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		setInputValue("");
		if (value === undefined) setSelectedValue("");
		onChange?.("");
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (disabled) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
				return;
			}
			const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);
			if (totalItems > 0) {
				setHighlightedIndex((prev) => (prev + 1) % totalItems);
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
				return;
			}
			const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);
			if (totalItems > 0) {
				setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
			}
		} else if (e.key === "Enter") {
			if (isOpen) {
				e.preventDefault();
				if (showCustomOption && highlightedIndex === 0) {
					handleSelectCustom(inputValue);
				} else {
					const optIndex = showCustomOption
						? highlightedIndex - 1
						: highlightedIndex;
					if (optIndex >= 0 && optIndex < filteredOptions.length) {
						handleSelectOption(filteredOptions[optIndex]);
					} else if (showCustomOption) {
						handleSelectCustom(inputValue);
					} else if (filteredOptions.length > 0) {
						handleSelectOption(filteredOptions[0]);
					}
				}
			}
		} else if (e.key === "Escape") {
			setIsOpen(false);
		}
	};

	// Size styles
	const sizeStyles = {
		sm: "h-9 text-xs px-3 py-1.5",
		md: "h-11 text-sm px-4 py-2.5",
		lg: "h-12 text-base px-4 py-3",
	};

	const iconSizeStyles = {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5",
	};

	const variantStyles = {
		outline:
			"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700 dark:focus-within:border-primary",
		filled:
			"border-transparent bg-slate-100/70 hover:bg-slate-100 focus-within:bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus-within:bg-slate-900",
		glass:
			"border-white/20 bg-white/40 backdrop-blur-md shadow-xs hover:border-white/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700",
		subtle:
			"border-border/40 bg-muted/30 hover:border-border/80 focus-within:border-primary focus-within:bg-background dark:bg-slate-900/30",
	};

	return (
		<div
			ref={containerRef}
			className={cn(
				"w-full space-y-1.5",
				isOpen && "relative z-50",
				containerClassName,
			)}
		>
			{/* Label */}
			{label && (
				<Label
					htmlFor={inputId}
					className="font-medium text-xs text-foreground flex items-center gap-1"
				>
					{label}
					{required && <span className="text-destructive font-bold">*</span>}
				</Label>
			)}

			{name && <input type="hidden" name={name} value={selectedValue} />}

			{/* Input Trigger Box */}
			<div
				className={cn(
					"relative flex items-center rounded-xl border transition-all duration-200 shadow-2xs",
					sizeStyles[comboboxSize],
					variantStyles[variant],
					isOpen && "border-primary ring-2 ring-primary/20 dark:ring-primary/30",
					disabled && "opacity-50 pointer-events-none bg-muted/50 cursor-not-allowed",
					error && "border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
					className,
				)}
				onClick={() => {
					if (!disabled) {
						inputRef.current?.focus();
						setIsOpen(true);
					}
				}}
			>
				{/* Left Icon */}
				{leftIcon && (
					<div
						className={cn(
							"text-muted-foreground mr-2 shrink-0 select-none",
							iconSizeStyles[comboboxSize],
						)}
					>
						{leftIcon}
					</div>
				)}

				{/* Editable Text Input */}
				<input
					ref={inputRef}
					id={inputId}
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onFocus={() => setIsOpen(true)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					autoComplete="off"
					className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground font-medium text-inherit"
				/>

				{/* Right Tools (Clear & Chevron) */}
				<div className="flex items-center gap-1 shrink-0 ml-1.5 text-muted-foreground">
					{clearable && inputValue && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							className="p-1 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
							title="Clear"
						>
							<X className="size-3.5" />
						</button>
					)}

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (!disabled) {
								setIsOpen(!isOpen);
								if (!isOpen) inputRef.current?.focus();
							}
						}}
						className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
					>
						<ChevronDown
							className={cn(
								"transition-transform duration-200",
								isOpen && "rotate-180 text-primary",
								iconSizeStyles[comboboxSize],
							)}
						/>
					</button>
				</div>
			</div>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute z-50 mt-1.5 w-full rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white text-slate-900 shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden dark:bg-slate-950 dark:text-slate-100">
					<div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
						{/* Creatable Custom Option */}
						{showCustomOption && (
							<button
								type="button"
								onClick={() => handleSelectCustom(inputValue)}
								className={cn(
									"w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left font-semibold",
									highlightedIndex === 0
										? "bg-indigo-600 text-white"
										: "bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70",
								)}
							>
								<div className="flex items-center gap-2 min-w-0 pr-2">
									<Sparkles className="size-3.5 shrink-0 text-amber-500" />
									<span className="truncate">
										{customActionLabel
											? customActionLabel(inputValue.trim())
											: `Use custom: "${inputValue.trim()}"`}
									</span>
								</div>
								<span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/20 shrink-0">
									Custom
								</span>
							</button>
						)}

						{/* Filtered Predefined Options */}
						{filteredOptions.length === 0 && !showCustomOption ? (
							<div className="py-4 text-center text-xs text-muted-foreground">
								No matching delivery types found.
							</div>
						) : (
							filteredOptions.map((opt, idx) => {
								const actualIdx = showCustomOption ? idx + 1 : idx;
								const isSelected =
									selectedValue.toLowerCase() === opt.value.toLowerCase() ||
									selectedValue.toLowerCase() === opt.label.toLowerCase();
								const isHighlighted = highlightedIndex === actualIdx;

								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => handleSelectOption(opt)}
										className={cn(
											"w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left",
											isSelected
												? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
												: isHighlighted
													? "bg-muted text-foreground dark:bg-slate-800"
													: "hover:bg-muted text-foreground dark:hover:bg-slate-800/80",
										)}
									>
										<div className="flex items-center gap-2.5 min-w-0 pr-2">
											{opt.icon && (
												<span className="shrink-0 text-muted-foreground">
													{opt.icon}
												</span>
											)}
											<div className="truncate">
												<div className="truncate font-medium">{opt.label}</div>
												{opt.description && (
													<div className="text-[10px] text-muted-foreground truncate">
														{opt.description}
													</div>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2 shrink-0">
											{opt.badge && (
												<span
													className={cn(
														"text-[10px] px-1.5 py-0.5 rounded font-medium",
														opt.color || "bg-muted text-muted-foreground",
													)}
												>
													{opt.badge}
												</span>
											)}
											{isSelected && <Check className="size-4 text-primary" />}
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>
			)}

			{/* Error / Helper Text */}
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

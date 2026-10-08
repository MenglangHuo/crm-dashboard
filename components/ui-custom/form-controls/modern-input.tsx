"use client";

import * as React from "react";
import { Eye, EyeOff, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ModernInputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: React.ReactNode;
	labelVariant?: "standard" | "floating" | "inset";
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	clearable?: boolean;
	onClear?: () => void;
	isLoading?: boolean;
	inputSize?: "sm" | "md" | "lg";
	variant?: "outline" | "filled" | "glass" | "subtle";
	prefixAddon?: React.ReactNode;
	suffixAddon?: React.ReactNode;
	showCharCount?: boolean;
	containerClassName?: string;
}

export const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
	(
		{
			className,
			containerClassName,
			type = "text",
			label,
			labelVariant = "standard",
			helperText,
			error,
			leftIcon,
			rightIcon,
			clearable = false,
			onClear,
			isLoading = false,
			inputSize = "md",
			variant = "outline",
			prefixAddon,
			suffixAddon,
			showCharCount = false,
			maxLength,
			value,
			defaultValue,
			onChange,
			disabled,
			required,
			id,
			placeholder,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const inputId = id || generatedId;

		const innerRef = React.useRef<HTMLInputElement | null>(null);
		const [controlledValue, setControlledValue] = React.useState(
			value ?? defaultValue ?? "",
		);
		const [showPassword, setShowPassword] = React.useState(false);
		const [isFocused, setIsFocused] = React.useState(false);

		React.useEffect(() => {
			if (value !== undefined) {
				setControlledValue(value);
			}
		}, [value]);

		const isPassword = type === "password";
		const inputType = isPassword ? (showPassword ? "text" : "password") : type;
		const currentValueString = String(controlledValue ?? "");
		const hasValue = currentValueString.length > 0;

		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			if (value === undefined) {
				setControlledValue(e.target.value);
			}
			onChange?.(e);
		};

		const handleClear = () => {
			if (innerRef.current) {
				innerRef.current.value = "";
			}
			setControlledValue("");
			onClear?.();
			// Create synthetic event for react-hook-form
			const event = {
				target: { value: "", name: props.name },
			} as React.ChangeEvent<HTMLInputElement>;
			onChange?.(event);
		};

		// Size variants mapping
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

		// Visual background variants mapping
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

		const isFloating = labelVariant === "floating" && !!label;
		const isInset = labelVariant === "inset" && !!label;

		const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
			...props,
		};
		if (value !== undefined) {
			inputProps.value = controlledValue;
		} else if (defaultValue !== undefined) {
			inputProps.defaultValue = defaultValue;
		}

		return (
			<div className={cn("w-full space-y-1.5", containerClassName)}>
				{/* Standard Label */}
				{labelVariant === "standard" && label && (
					<div className="flex items-center justify-between text-xs">
						<Label
							htmlFor={inputId}
							className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1"
						>
							{label}
							{required && (
								<span className="text-destructive font-bold">*</span>
							)}
						</Label>
						{showCharCount && maxLength && (
							<span className="text-[11px] text-muted-foreground">
								{currentValueString.length}/{maxLength}
							</span>
						)}
					</div>
				)}

				{/* Input Wrapper Container */}
				<div
					className={cn(
						"group relative flex w-full items-center rounded-lg border transition-all duration-200 shadow-2xs overflow-hidden",
						variantStyles[variant],
						disabled && "pointer-events-none opacity-50 bg-muted/50",
						error &&
							"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60 dark:ring-destructive/30",
					)}
				>
					{/* Prefix Addon */}
					{prefixAddon && (
						<div className="flex items-center justify-center bg-muted/40 border-r border-border/40 px-3 py-1 text-xs font-medium text-muted-foreground select-none shrink-0 dark:bg-slate-800/40">
							{prefixAddon}
						</div>
					)}

					{/* Left Icon */}
					{leftIcon && (
						<div
							className={cn(
								"pl-3 pr-1 text-muted-foreground shrink-0 transition-colors group-focus-within:text-primary flex items-center justify-center [&>svg]:shrink-0",
								inputSize === "sm" && "[&>svg]:size-3.5",
								inputSize === "md" && "[&>svg]:size-4",
								inputSize === "lg" && "[&>svg]:size-5",
							)}
						>
							{leftIcon}
						</div>
					)}

					{/* Inset Label / Input Field Container */}
					<div className="relative flex-1 flex flex-col justify-center min-w-0">
						{/* Floating Label */}
						{isFloating && (
							<label
								htmlFor={inputId}
								className={cn(
									"absolute left-3 transition-all duration-200 pointer-events-none select-none text-muted-foreground origin-left",
									isFocused || hasValue
										? "-top-2.5 text-[10px] font-semibold bg-background px-1 text-primary rounded dark:bg-slate-900"
										: "top-1/2 -translate-y-1/2 text-sm",
									leftIcon && !(isFocused || hasValue) && "left-1",
								)}
							>
								{label}
								{required && <span className="text-destructive ml-0.5">*</span>}
							</label>
						)}

						{/* Inset Label */}
						{isInset && (
							<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-1.5 px-3">
								{label}{" "}
								{required && <span className="text-destructive">*</span>}
							</span>
						)}

						{/* Core HTML Input */}
						<input
							ref={(node) => {
								innerRef.current = node;
								if (typeof ref === "function") ref(node);
								else if (ref)
									(
										ref as React.MutableRefObject<HTMLInputElement | null>
									).current = node;
							}}
							id={inputId}
							type={inputType}
							onChange={handleChange}
							onFocus={(e) => {
								setIsFocused(true);
								if (value === undefined) {
									setControlledValue(e.target.value);
								}
								props.onFocus?.(e);
							}}
							onBlur={(e) => {
								setIsFocused(false);
								if (value === undefined) {
									setControlledValue(e.target.value);
								}
								props.onBlur?.(e);
							}}
							maxLength={maxLength}
							disabled={disabled}
							placeholder={isFloating && !isFocused ? "" : placeholder}
							className={cn(
								"w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-foreground placeholder:text-muted-foreground/60 transition-colors",
								sizeStyles[inputSize],
								isInset && "h-auto py-1 pt-0 text-sm",
								leftIcon && "pl-1.5",
								(clearable || isPassword || isLoading || rightIcon) && "pr-2",
								className,
							)}
							{...inputProps}
						/>
					</div>

					{/* Right Action Icons (Clear, Password Toggle, Loading, Custom RightIcon) */}
					<div className="pr-3 flex items-center gap-1.5 shrink-0 text-muted-foreground">
						{/* Loading Spinner */}
						{isLoading && (
							<Loader2
								className={cn(
									"animate-spin text-primary",
									iconSizeStyles[inputSize],
								)}
							/>
						)}

						{/* Clear Button */}
						{!isLoading && clearable && hasValue && !disabled && (
							<button
								type="button"
								onClick={handleClear}
								className="p-0.5 rounded-full hover:bg-muted hover:text-foreground transition-colors"
								title="Clear input"
							>
								<X className="size-3.5" />
							</button>
						)}

						{/* Password Toggle Button */}
						{!isLoading && isPassword && (
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								className="p-0.5 rounded-md hover:bg-muted hover:text-foreground transition-colors focus:outline-none"
								title={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<EyeOff className={iconSizeStyles[inputSize]} />
								) : (
									<Eye className={iconSizeStyles[inputSize]} />
								)}
							</button>
						)}

						{/* Custom Right Icon */}
						{!isLoading && !isPassword && rightIcon && (
							<div
								className={cn(
									"text-muted-foreground",
									iconSizeStyles[inputSize],
								)}
							>
								{rightIcon}
							</div>
						)}
					</div>

					{/* Suffix Addon */}
					{suffixAddon && (
						<div className="flex items-center justify-center bg-muted/40 border-l border-border/40 px-3 py-1 text-xs font-medium text-muted-foreground select-none shrink-0 dark:bg-slate-800/40">
							{suffixAddon}
						</div>
					)}
				</div>

				{/* Helper Text or Animated Error Message */}
				{error ? (
					<p className="text-xs font-medium text-destructive animate-in fade-in-50 slide-in-from-top-1 flex items-center gap-1">
						<span>{error}</span>
					</p>
				) : helperText ? (
					<p className="text-xs text-muted-foreground">{helperText}</p>
				) : null}
			</div>
		);
	},
);

ModernInput.displayName = "ModernInput";

"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ModernTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	clearable?: boolean;
	onClear?: () => void;
	isLoading?: boolean;
	autoResize?: boolean;
	textareaSize?: "sm" | "md" | "lg";
	variant?: "outline" | "filled" | "glass" | "subtle";
	showCharCount?: boolean;
	containerClassName?: string;
}

export const ModernTextarea = React.forwardRef<
	HTMLTextAreaElement,
	ModernTextareaProps
>(
	(
		{
			className,
			containerClassName,
			label,
			helperText,
			error,
			clearable = false,
			onClear,
			isLoading = false,
			autoResize = false,
			textareaSize = "md",
			variant = "outline",
			showCharCount = false,
			maxLength,
			value,
			defaultValue,
			onChange,
			disabled,
			required,
			id,
			rows = 3,
			...props
		},
		ref,
	) => {
		const generatedId = React.useId();
		const textareaId = id || generatedId;
		const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

		const [controlledValue, setControlledValue] = React.useState(
			value ?? defaultValue ?? "",
		);

		React.useEffect(() => {
			if (value !== undefined) {
				setControlledValue(value);
			}
		}, [value]);

		const currentValueString = String(controlledValue ?? "");
		const hasValue = currentValueString.length > 0;

		// Auto-resize logic
		const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
			if (autoResize && innerRef.current) {
				innerRef.current.style.height = "auto";
				innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
			}
			if (value === undefined) {
				setControlledValue(e.target.value);
			}
			onChange?.(e);
		};

		const handleClear = () => {
			if (value === undefined) {
				setControlledValue("");
			}
			onClear?.();
			if (autoResize && innerRef.current) {
				innerRef.current.style.height = "auto";
			}
			const event = {
				target: { value: "", name: props.name },
			} as React.ChangeEvent<HTMLTextAreaElement>;
			onChange?.(event);
		};

		// Size styles
		const sizeStyles = {
			sm: "text-xs px-2.5 py-1.5 min-h-16",
			md: "text-sm px-3.5 py-2.5 min-h-24",
			lg: "text-base px-4 py-3 min-h-32",
		};

		// Variant mapping
		const variantStyles = {
			outline:
				"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700",
			filled:
				"border-transparent bg-slate-100/70 hover:bg-slate-100 focus-within:bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:focus-within:bg-slate-900",
			glass:
				"border-white/20 bg-white/40 backdrop-blur-md shadow-xs hover:border-white/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700",
			subtle:
				"border-border/40 bg-muted/30 hover:border-border/80 focus-within:border-primary focus-within:bg-background dark:bg-slate-900/30",
		};

		return (
			<div className={cn("w-full space-y-1.5", containerClassName)}>
				{/* Label */}
				{label && (
					<div className="flex items-center justify-between text-xs">
						<Label
							htmlFor={textareaId}
							className="font-medium text-foreground flex items-center gap-1"
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

				{/* Textarea Wrapper Box */}
				<div
					className={cn(
						"group relative flex w-full rounded-lg border transition-all duration-200 shadow-2xs overflow-hidden",
						variantStyles[variant],
						disabled && "pointer-events-none opacity-50 bg-muted/50",
						error &&
							"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
					)}
				>
					<textarea
						ref={(node) => {
							innerRef.current = node;
							if (typeof ref === "function") ref(node);
							else if (ref)
								(
									ref as React.MutableRefObject<HTMLTextAreaElement | null>
								).current = node;
						}}
						id={textareaId}
						rows={rows}
						{...(value !== undefined
							? { value: controlledValue }
							: defaultValue !== undefined
								? { defaultValue }
								: {})}
						onChange={handleInput}
						onFocus={(e) => {
							if (value === undefined) setControlledValue(e.target.value);
							props.onFocus?.(e);
						}}
						onBlur={(e) => {
							if (value === undefined) setControlledValue(e.target.value);
							props.onBlur?.(e);
						}}
						maxLength={maxLength}
						disabled={disabled}
						className={cn(
							"w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-foreground placeholder:text-muted-foreground/60 transition-colors resize-y",
							sizeStyles[textareaSize],
							(clearable || isLoading) && "pr-8",
							autoResize && "resize-none overflow-hidden",
							className,
						)}
						{...props}
					/>

					{/* Action Overlay Icons */}
					<div className="absolute right-3 top-3 flex items-center gap-1.5 text-muted-foreground">
						{isLoading && (
							<Loader2 className="size-4 animate-spin text-primary" />
						)}
						{!isLoading && clearable && hasValue && !disabled && (
							<button
								type="button"
								onClick={handleClear}
								className="p-0.5 rounded-full hover:bg-muted hover:text-foreground transition-colors"
								title="Clear text"
							>
								<X className="size-3.5" />
							</button>
						)}
					</div>
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
	},
);

ModernTextarea.displayName = "ModernTextarea";

"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OtpPinInputProps {
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	disabled?: boolean;
	hasError?: boolean;
	autoFocus?: boolean;
	length?: number;
	className?: string;
}

export function OtpPinInput({
	value,
	onChange,
	onComplete,
	disabled = false,
	hasError = false,
	autoFocus = true,
	length = 6,
	className,
}: OtpPinInputProps) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	// Ensure value is a clean string of max `length` digits
	const digits = (value || "").replace(/\D/g, "").slice(0, length).split("");
	while (digits.length < length) {
		digits.push("");
	}

	useEffect(() => {
		if (autoFocus && !disabled) {
			// Find first empty cell or focus first
			const firstEmptyIndex = digits.findIndex((d) => !d);
			const targetIndex = firstEmptyIndex === -1 ? length - 1 : firstEmptyIndex;
			inputRefs.current[targetIndex]?.focus();
		}
	}, [autoFocus, disabled, length]);

	const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = e.target.value;
		const nextChar = raw.slice(-1);

		if (!/^\d*$/.test(nextChar)) return;

		const nextDigits = [...digits];
		nextDigits[index] = nextChar;
		const nextValue = nextDigits.join("").trim();

		onChange(nextValue);

		if (nextChar && index < length - 1) {
			inputRefs.current[index + 1]?.focus();
		}

		if (nextValue.length === length && onComplete) {
			onComplete(nextValue);
		}
	};

	const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Backspace") {
			if (!digits[index] && index > 0) {
				const nextDigits = [...digits];
				nextDigits[index - 1] = "";
				onChange(nextDigits.join("").trim());
				inputRefs.current[index - 1]?.focus();
			} else if (digits[index]) {
				const nextDigits = [...digits];
				nextDigits[index] = "";
				onChange(nextDigits.join("").trim());
			}
		} else if (e.key === "ArrowLeft" && index > 0) {
			e.preventDefault();
			inputRefs.current[index - 1]?.focus();
		} else if (e.key === "ArrowRight" && index < length - 1) {
			e.preventDefault();
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
		if (!pasted) return;

		onChange(pasted);

		// Focus appropriate input
		const focusIndex = Math.min(pasted.length, length - 1);
		inputRefs.current[focusIndex]?.focus();

		if (pasted.length === length && onComplete) {
			onComplete(pasted);
		}
	};

	return (
		<div className={cn("flex items-center justify-center gap-2 sm:gap-2.5", className)}>
			{digits.map((digit, idx) => {
				const isFilled = Boolean(digit);
				return (
					<input
						key={idx}
						ref={(el) => {
							inputRefs.current[idx] = el;
						}}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						autoComplete="one-time-code"
						aria-label={`Digit ${idx + 1} of ${length}`}
						maxLength={1}
						value={digit}
						disabled={disabled}
						onChange={(e) => handleChange(idx, e)}
						onKeyDown={(e) => handleKeyDown(idx, e)}
						onPaste={handlePaste}
						onFocus={(e) => e.target.select()}
						className={cn(
							"h-12 w-10 sm:h-14 sm:w-12 text-center text-lg sm:text-xl font-mono font-extrabold rounded-xl border transition-all select-none outline-none",
							"bg-white dark:bg-slate-900 shadow-2xs",
							// State styling
							hasError
								? "border-rose-400 dark:border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500/20"
								: isFilled
									? "border-indigo-500/80 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-100"
									: "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white",
							"focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/15 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20",
							disabled && "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
						)}
					/>
				);
			})}
		</div>
	);
}

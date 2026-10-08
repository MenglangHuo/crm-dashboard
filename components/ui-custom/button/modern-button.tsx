"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModernButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "ghost"
	| "destructive"
	| "danger"
	| "success"
	| "warning"
	| "amber"
	| "gradient"
	| "dark"
	| "link";

export type ModernButtonSize =
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "icon"
	| "icon-sm"
	| "icon-xs";

export interface ModernButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ModernButtonVariant;
	size?: ModernButtonSize;
	isLoading?: boolean;
	loadingText?: string;
	leftIcon?: React.ReactNode;
	rightIcon?: React.ReactNode;
	rounded?: "default" | "full" | "xl" | "2xl" | "3xl" | "lg" | "md";
	glow?: boolean;
	fullWidth?: boolean;
}

const variantStyles: Record<ModernButtonVariant, string> = {
	primary:
		"bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:shadow-none border border-transparent",
	secondary:
		"bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60",
	outline:
		"border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white shadow-2xs",
	ghost:
		"text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white",
	destructive:
		"bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 shadow-xs border border-transparent",
	danger:
		"bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60",
	success:
		"bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 shadow-xs border border-transparent",
	warning:
		"bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold shadow-xs border border-transparent",
	amber:
		"bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/60",
	gradient:
		"bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs border border-transparent",
	dark: "bg-slate-950 text-white hover:bg-slate-900 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-800",
	link: "text-primary hover:underline p-0 h-auto bg-transparent border-0 font-semibold",
};

const sizeStyles: Record<ModernButtonSize, string> = {
	xs: "h-7 px-2.5 text-[11px] gap-1.5 font-bold",
	sm: "h-8 px-3 text-xs gap-1.5 font-bold",
	md: "h-9 px-4 text-xs font-bold gap-2",
	lg: "h-10 px-5 text-sm font-bold gap-2.5",
	icon: "h-9 w-9 p-0 flex items-center justify-center shrink-0",
	"icon-sm": "h-8 w-8 p-0 flex items-center justify-center shrink-0",
	"icon-xs": "h-7 w-7 p-0 flex items-center justify-center shrink-0",
};

const roundedStyles: Record<string, string> = {
	default: "rounded-xl",
	md: "rounded-lg",
	lg: "rounded-xl",
	xl: "rounded-2xl",
	"2xl": "rounded-2xl",
	"3xl": "rounded-3xl",
	full: "rounded-full",
};

export const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
	(
		{
			variant = "primary",
			size = "md",
			isLoading = false,
			loadingText,
			leftIcon,
			rightIcon,
			rounded = "xl",
			glow = false,
			fullWidth = false,
			className,
			disabled,
			children,
			type = "button",
			...props
		},
		ref,
	) => {
		const isIconOnly = size.startsWith("icon");

		return (
			<button
				ref={ref}
				type={type}
				disabled={disabled || isLoading}
				className={cn(
					"cursor-pointer",
					"inline-flex items-center justify-center font-bold tracking-tight select-none cursor-pointer",
					"transition-all duration-150 ease-out",
					"active:scale-[0.98] active:translate-y-px",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
					"disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:active:translate-y-0",
					variantStyles[variant],
					sizeStyles[size],
					roundedStyles[rounded] || roundedStyles.default,
					fullWidth && "w-full",
					glow && "shadow-lg shadow-primary/25",
					className,
				)}
				{...props}
			>
				{isLoading ? (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
						{!isIconOnly && (loadingText || children)}
					</>
				) : (
					<>
						{leftIcon && (
							<span className="shrink-0 inline-flex items-center">
								{leftIcon}
							</span>
						)}
						{children}
						{rightIcon && (
							<span className="shrink-0 inline-flex items-center">
								{rightIcon}
							</span>
						)}
					</>
				)}
			</button>
		);
	},
);

ModernButton.displayName = "ModernButton";

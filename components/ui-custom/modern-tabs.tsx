"use client";

import { cn } from "@/lib/utils";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { ReactNode } from "react";

export type ModernTabVariant = "pills" | "glass" | "segment" | "line" | "cards";
export type ModernTabSize = "sm" | "md" | "lg";

export interface ModernTabsProps {
	defaultValue?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	children: ReactNode;
	className?: string;
}

export function ModernTabs({
	defaultValue,
	value,
	onValueChange,
	children,
	className,
}: ModernTabsProps) {
	return (
		<TabsPrimitive.Root
			value={value}
			defaultValue={defaultValue}
			onValueChange={(val) => onValueChange?.(String(val))}
			className={cn("w-full space-y-4", className)}
		>
			{children}
		</TabsPrimitive.Root>
	);
}

export interface ModernTabsListProps {
	children: ReactNode;
	variant?: ModernTabVariant;
	size?: ModernTabSize;
	fullWidth?: boolean;
	className?: string;
}

export function ModernTabsList({
	children,
	variant = "pills",
	size = "md",
	fullWidth = false,
	className,
}: ModernTabsListProps) {
	const variantClasses: Record<ModernTabVariant, string> = {
		pills:
			"bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs backdrop-blur-md",
		glass:
			"bg-white/70 dark:bg-slate-950/70 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-md backdrop-blur-xl",
		segment:
			"bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-300/50 dark:border-slate-700/50",
		line: "border-b border-slate-200 dark:border-slate-800 bg-transparent p-0 gap-6 rounded-none",
		cards: "gap-2.5 bg-transparent p-0",
	};

	const sizeClasses: Record<ModernTabSize, string> = {
		sm: "gap-1",
		md: "gap-1.5",
		lg: "gap-2",
	};

	return (
		<TabsPrimitive.List
			className={cn(
				"inline-flex items-center justify-start flex-wrap",
				fullWidth
					? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full gap-2"
					: "flex items-center",
				variantClasses[variant],
				sizeClasses[size],
				className,
			)}
		>
			{children}
		</TabsPrimitive.List>
	);
}

export interface ModernTabsTriggerProps {
	value: string;
	children: ReactNode;
	icon?: ReactNode;
	badge?: ReactNode;
	badgeColor?:
		| "purple"
		| "emerald"
		| "sky"
		| "amber"
		| "slate"
		| "rose"
		| "indigo"
		| "red"
		| "blue";
	variant?: ModernTabVariant;
	size?: ModernTabSize;
	disabled?: boolean;
	className?: string;
}

export function ModernTabsTrigger({
	value,
	children,
	icon,
	badge,
	badgeColor = "purple",
	variant = "pills",
	size = "md",
	disabled,
	className,
}: ModernTabsTriggerProps) {
	const badgeColorMap = {
		primary: "bg-primary/10 text-primary border-primary/20",
		purple:
			"bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800",
		emerald:
			"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
		sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200 dark:border-sky-800",
		amber:
			"bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
		slate:
			"bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
		rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
		indigo:
			"bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
		red: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800",
		blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
	};

	const sizeClasses: Record<ModernTabSize, string> = {
		sm: "px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5",
		md: "px-4 py-2 text-xs font-bold rounded-xl gap-2",
		lg: "px-5 py-2.5 text-sm font-extrabold rounded-2xl gap-2.5",
	};

	const triggerVariantClasses: Record<ModernTabVariant, string> = {
		pills: cn(
			"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 cursor-pointer select-none",
			"data-active:bg-white dark:data-active:bg-slate-950 data-active:text-primary data-active:shadow-md data-active:shadow-primary/10 data-active:border data-active:border-primary/20 active:scale-[0.98]",
		),
		glass: cn(
			"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-200 cursor-pointer select-none",
			"data-active:bg-primary data-active:text-primary-foreground data-active:shadow-lg data-active:shadow-primary/25 active:scale-[0.98]",
		),
		segment: cn(
			"text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-150 cursor-pointer select-none",
			"data-active:bg-white dark:data-active:bg-slate-900 data-active:text-slate-900 dark:data-active:text-white data-active:shadow-xs",
		),
		line: cn(
			"border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-none pb-2 transition-all cursor-pointer select-none",
			"data-active:border-primary data-active:text-primary",
		),
		cards: cn(
			"border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer select-none shadow-2xs",
			"data-active:border-primary/50 data-active:bg-primary/10 data-active:text-primary data-active:shadow-md",
		),
	};

	return (
		<TabsPrimitive.Tab
			value={value}
			disabled={disabled}
			className={cn(
				"inline-flex flex-row items-center justify-center whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-40",
				sizeClasses[size],
				triggerVariantClasses[variant],
				className,
			)}
		>
			{icon && (
				<span className="shrink-0 inline-flex items-center">{icon}</span>
			)}
			<span className="inline-flex flex-row items-center gap-1.5 shrink-0 whitespace-nowrap">
				{children}
			</span>
			{badge !== undefined && badge !== null && (
				<span
					className={cn(
						"ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full border shadow-2xs leading-none",
						badgeColorMap[badgeColor],
					)}
				>
					{badge}
				</span>
			)}
		</TabsPrimitive.Tab>
	);
}

export interface ModernTabsContentProps {
	value: string;
	children: ReactNode;
	className?: string;
}

export function ModernTabsContent({
	value,
	children,
	className,
}: ModernTabsContentProps) {
	return (
		<TabsPrimitive.Panel
			value={value}
			className={cn(
				"outline-none animate-in fade-in zoom-in-98 duration-150",
				className,
			)}
		>
			{children}
		</TabsPrimitive.Panel>
	);
}

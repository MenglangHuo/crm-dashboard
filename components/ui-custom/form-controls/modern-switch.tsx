"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ModernSwitchProps
	extends Omit<SwitchPrimitive.Root.Props, "className" | "onCheckedChange"> {
	label?: React.ReactNode;
	description?: React.ReactNode;
	activeText?: string;
	inactiveText?: string;
	showStatusBadge?: boolean;
	isLoading?: boolean;
	variant?: "default" | "card";
	switchSize?: "sm" | "md" | "lg";
	containerClassName?: string;
	className?: string;
	error?: React.ReactNode;
	onCheckedChange?: (checked: boolean) => void;
}

export function ModernSwitch({
	label,
	description,
	activeText = "Active",
	inactiveText = "Inactive",
	showStatusBadge = false,
	isLoading = false,
	variant = "default",
	switchSize = "md",
	containerClassName,
	className,
	error,
	id,
	disabled,
	checked,
	defaultChecked,
	onCheckedChange,
	...props
}: ModernSwitchProps) {
	const generatedId = React.useId();
	const switchId = id || generatedId;

	// Internal state for uncontrolled usage or status display
	const [isChecked, setIsChecked] = React.useState<boolean>(
		checked ?? defaultChecked ?? false,
	);

	React.useEffect(() => {
		if (checked !== undefined) {
			setIsChecked(checked);
		}
	}, [checked]);

	const handleToggle = (newChecked: boolean) => {
		if (checked === undefined) {
			setIsChecked(newChecked);
		}
		onCheckedChange?.(newChecked);
	};

	// Size mapping
	const trackSizeStyles = {
		sm: "h-[16px] w-[28px]",
		md: "h-[22px] w-[38px]",
		lg: "h-[28px] w-[50px]",
	};

	const thumbSizeStyles = {
		sm: "size-3 data-checked:translate-x-[12px]",
		md: "size-4.5 data-checked:translate-x-[16px]",
		lg: "size-6 data-checked:translate-x-[22px]",
	};

	if (variant === "card") {
		return (
			<div className={cn("w-full", containerClassName)}>
				<label
					htmlFor={switchId}
					className={cn(
						"group relative flex items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs select-none",
						"border-input bg-card/60 hover:border-primary/50 hover:bg-accent/40",
						isChecked &&
							"border-primary/80 bg-primary/5 shadow-xs dark:bg-primary/10",
						(disabled || isLoading) &&
							"pointer-events-none opacity-50 bg-muted/40",
						error && "border-destructive ring-2 ring-destructive/20",
						className,
					)}
				>
					<div className="flex-1 min-w-0 pr-2">
						<div className="flex items-center gap-2">
							<span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
								{label}
							</span>
							{showStatusBadge && (
								<span
									className={cn(
										"text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors",
										isChecked
											? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
											: "bg-muted text-muted-foreground",
									)}
								>
									{isChecked ? activeText : inactiveText}
								</span>
							)}
						</div>
						{description && (
							<p className="text-xs text-muted-foreground mt-0.5 leading-normal">
								{description}
							</p>
						)}
					</div>

					<SwitchPrimitive.Root
						id={switchId}
						data-slot="switch"
						checked={isChecked}
						onCheckedChange={handleToggle}
						disabled={disabled || isLoading}
						className={cn(
							"peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none cursor-pointer",
							"focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
							"data-checked:bg-primary data-unchecked:bg-muted dark:data-unchecked:bg-slate-800",
							trackSizeStyles[switchSize],
						)}
						{...props}
					>
						<SwitchPrimitive.Thumb
							data-slot="switch-thumb"
							className={cn(
								"pointer-events-none flex items-center justify-center rounded-full bg-background ring-0 shadow-sm transition-transform duration-200 ease-in-out data-unchecked:translate-x-0.5",
								thumbSizeStyles[switchSize],
							)}
						>
							{isLoading && (
								<Loader2 className="size-3 animate-spin text-primary shrink-0" />
							)}
						</SwitchPrimitive.Thumb>
					</SwitchPrimitive.Root>
				</label>
				{error && (
					<p className="text-xs font-medium text-destructive mt-1">{error}</p>
				)}
			</div>
		);
	}

	return (
		<div className={cn("w-full space-y-1", containerClassName)}>
			<div className="flex items-center justify-between gap-3">
				{(label || description) && (
					<div className="grid gap-0.5 leading-snug flex-1">
						{label && (
							<Label
								htmlFor={switchId}
								className={cn(
									"text-xs font-medium text-foreground cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2",
									(disabled || isLoading) && "opacity-50",
								)}
							>
								<span>{label}</span>
								{showStatusBadge && (
									<span
										className={cn(
											"text-[10px] px-1.5 py-0.2 rounded-full font-medium transition-colors",
											isChecked
												? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
												: "bg-muted text-muted-foreground",
										)}
									>
										{isChecked ? activeText : inactiveText}
									</span>
								)}
							</Label>
						)}
						{description && (
							<p className="text-[11px] text-muted-foreground">{description}</p>
						)}
					</div>
				)}

				<SwitchPrimitive.Root
					id={switchId}
					data-slot="switch"
					checked={isChecked}
					onCheckedChange={handleToggle}
					disabled={disabled || isLoading}
					className={cn(
						"peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none cursor-pointer",
						"focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"data-checked:bg-primary data-unchecked:bg-muted dark:data-unchecked:bg-slate-800",
						trackSizeStyles[switchSize],
						error && "border-destructive ring-2 ring-destructive/20",
						className,
					)}
					{...props}
				>
					<SwitchPrimitive.Thumb
						data-slot="switch-thumb"
						className={cn(
							"pointer-events-none flex items-center justify-center rounded-full bg-background ring-0 shadow-sm transition-transform duration-200 ease-in-out data-unchecked:translate-x-0.5",
							thumbSizeStyles[switchSize],
						)}
					>
						{isLoading && (
							<Loader2 className="size-3 animate-spin text-primary shrink-0" />
						)}
					</SwitchPrimitive.Thumb>
				</SwitchPrimitive.Root>
			</div>
			{error && <p className="text-xs font-medium text-destructive">{error}</p>}
		</div>
	);
}

"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ModernCheckboxProps
	extends Omit<CheckboxPrimitive.Root.Props, "className"> {
	label?: React.ReactNode;
	description?: React.ReactNode;
	badge?: React.ReactNode;
	icon?: React.ReactNode;
	variant?: "default" | "card";
	checkboxSize?: "sm" | "md" | "lg";
	containerClassName?: string;
	className?: string;
	error?: React.ReactNode;
}

export function ModernCheckbox({
	label,
	description,
	badge,
	icon,
	variant = "default",
	checkboxSize = "md",
	containerClassName,
	className,
	error,
	id,
	disabled,
	checked,
	defaultChecked,
	onCheckedChange,
	...props
}: ModernCheckboxProps) {
	const generatedId = React.useId();
	const checkboxId = id || generatedId;

	// Size mapping for the checkbox box
	const sizeStyles = {
		sm: "size-3.5 rounded-sm",
		md: "size-4.5 rounded-md",
		lg: "size-5.5 rounded-lg",
	};

	const checkIconStyles = {
		sm: "size-2.5",
		md: "size-3.5",
		lg: "size-4",
	};

	if (variant === "card") {
		return (
			<div className={cn("w-full", containerClassName)}>
				<label
					htmlFor={checkboxId}
					className={cn(
						"group relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs select-none",
						"border-input bg-card/60 hover:border-primary/50 hover:bg-accent/40",
						"has-[[data-slot=checkbox][data-checked]]:border-primary has-[[data-slot=checkbox][data-checked]]:bg-primary/5 has-[[data-slot=checkbox][data-checked]]:shadow-xs dark:has-[[data-slot=checkbox][data-checked]]:bg-primary/10",
						disabled && "pointer-events-none opacity-50 bg-muted/40",
						error && "border-destructive ring-2 ring-destructive/20",
						className,
					)}
				>
					{icon && <div className="mt-0.5 text-primary shrink-0">{icon}</div>}

					<div className="flex-1 min-w-0">
						<div className="flex items-center justify-between gap-2">
							<span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
								{label}
							</span>
							{badge && (
								<span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border/50">
									{badge}
								</span>
							)}
						</div>
						{description && (
							<p className="text-xs text-muted-foreground mt-0.5 leading-normal">
								{description}
							</p>
						)}
					</div>

					<CheckboxPrimitive.Root
						id={checkboxId}
						data-slot="checkbox"
						checked={checked}
						defaultChecked={defaultChecked}
						onCheckedChange={onCheckedChange}
						disabled={disabled}
						className={cn(
							"peer relative mt-0.5 flex shrink-0 items-center justify-center border border-input transition-all duration-200 outline-none",
							"focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
							"data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
							sizeStyles[checkboxSize],
						)}
						{...props}
					>
						<CheckboxPrimitive.Indicator
							data-slot="checkbox-indicator"
							className="grid place-content-center text-current transition-none"
						>
							<CheckIcon className={checkIconStyles[checkboxSize]} />
						</CheckboxPrimitive.Indicator>
					</CheckboxPrimitive.Root>
				</label>
				{error && (
					<p className="text-xs font-medium text-destructive mt-1">{error}</p>
				)}
			</div>
		);
	}

	return (
		<div className={cn("w-full space-y-1", containerClassName)}>
			<div className="flex items-start gap-2.5">
				<CheckboxPrimitive.Root
					id={checkboxId}
					data-slot="checkbox"
					checked={checked}
					defaultChecked={defaultChecked}
					onCheckedChange={onCheckedChange}
					disabled={disabled}
					className={cn(
						"peer relative mt-0.5 flex shrink-0 items-center justify-center border border-input transition-all duration-200 outline-none cursor-pointer",
						"hover:border-primary/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
						sizeStyles[checkboxSize],
						error && "border-destructive ring-2 ring-destructive/20",
						className,
					)}
					{...props}
				>
					<CheckboxPrimitive.Indicator
						data-slot="checkbox-indicator"
						className="grid place-content-center text-current transition-none"
					>
						<CheckIcon className={checkIconStyles[checkboxSize]} />
					</CheckboxPrimitive.Indicator>
				</CheckboxPrimitive.Root>

				{(label || description) && (
					<div className="grid gap-0.5 leading-snug">
						{label && (
							<Label
								htmlFor={checkboxId}
								className={cn(
									"text-xs font-medium text-foreground cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5",
									disabled && "opacity-50",
								)}
							>
								{icon && <span className="text-muted-foreground">{icon}</span>}
								<span>{label}</span>
								{badge && (
									<span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
										{badge}
									</span>
								)}
							</Label>
						)}
						{description && (
							<p className="text-[11px] text-muted-foreground">{description}</p>
						)}
					</div>
				)}
			</div>
			{error && <p className="text-xs font-medium text-destructive">{error}</p>}
		</div>
	);
}

"use client";

import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface StatusFilterOption {
	id: string;
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	badge?: number | string;
	badgeColor?:
		| "default"
		| "secondary"
		| "purple"
		| "emerald"
		| "amber"
		| "rose"
		| "sky"
		| "indigo";
	dotColor?: string;
}

export interface StatusFilterDropdownProps {
	value: string;
	onChange: (value: string) => void;
	options: StatusFilterOption[];
	label?: string;
	placeholder?: string;
	className?: string;
}

const BADGE_COLOR_MAP: Record<string, string> = {
	default: "bg-primary text-primary-foreground",
	secondary: "bg-muted text-muted-foreground",
	purple:
		"bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
	emerald:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
	amber:
		"bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
	rose: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
	sky: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
	indigo:
		"bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
};

export const StatusFilterDropdown = React.memo(
	function StatusFilterDropdown({
		value,
		onChange,
		options,
		label = "Status",
		placeholder = "Select status",
		className,
	}: StatusFilterDropdownProps) {
		const selected = options.find((opt) => opt.id === value) || options[0];
		const SelectedIcon = selected?.icon;

		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"h-9 px-3 gap-2 text-xs font-medium rounded-lg border-border bg-background hover:bg-muted text-foreground cursor-pointer transition-all shadow-2xs shrink-0",
								selected && selected.id !== "ALL" && "border-primary/40 bg-primary/5",
								className,
							)}
						>
							<div className="flex items-center gap-1.5 min-w-0">
								{SelectedIcon && (
									<SelectedIcon className="h-3.5 w-3.5 text-primary shrink-0" />
								)}
								{selected?.dotColor && (
									<span
										className={cn("h-2 w-2 rounded-full shrink-0", selected.dotColor)}
									/>
								)}
								<span className="text-muted-foreground font-normal">
									{label}:
								</span>
								<span className="font-semibold text-foreground truncate max-w-[130px]">
									{selected ? selected.label : placeholder}
								</span>
								{selected && selected.badge !== undefined && (
									<span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
										{selected.badge}
									</span>
								)}
							</div>
							<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
						</Button>
					}
				/>
				<DropdownMenuContent align="start" className="w-56 p-1.5 shadow-xl">
					<DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
						Filter by {label}
					</DropdownMenuLabel>
					<DropdownMenuSeparator className="my-1" />
					<div className="max-h-72 overflow-y-auto space-y-0.5">
						{options.map((opt) => {
							const isSelected = opt.id === value;
							const Icon = opt.icon;
							const badgeStyle = opt.badgeColor
								? BADGE_COLOR_MAP[opt.badgeColor] || BADGE_COLOR_MAP.secondary
								: BADGE_COLOR_MAP.secondary;

							return (
								<DropdownMenuItem
									key={opt.id}
									onClick={() => onChange(opt.id)}
									className={cn(
										"flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer transition-colors",
										isSelected
											? "bg-primary/10 text-primary font-semibold"
											: "text-foreground hover:bg-muted",
									)}
								>
									<div className="flex items-center gap-2 min-w-0">
										{Icon && (
											<Icon
												className={cn(
													"h-3.5 w-3.5 shrink-0",
													isSelected ? "text-primary" : "text-muted-foreground",
												)}
											/>
										)}
										{opt.dotColor && (
											<span
												className={cn("h-2 w-2 rounded-full shrink-0", opt.dotColor)}
											/>
										)}
										<span className="truncate">{opt.label}</span>
									</div>

									<div className="flex items-center gap-1.5 shrink-0 ml-2">
										{opt.badge !== undefined && (
											<Badge
												variant="outline"
												className={cn(
													"h-4 px-1.5 text-[10px] font-bold rounded-md border",
													badgeStyle,
												)}
											>
												{opt.badge}
											</Badge>
										)}
										{isSelected && (
											<Check className="h-3.5 w-3.5 text-primary shrink-0" />
										)}
									</div>
								</DropdownMenuItem>
							);
						})}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	},
);

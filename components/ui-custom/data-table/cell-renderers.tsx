"use client";

import React, { useState } from "react";
import {
	Check,
	X,
	Sparkles,
	Copy,
	CheckCheck,
	Eye,
	Pencil,
	Trash2,
	MoreVertical,
	Globe,
	Calendar,
	AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RowAction } from "./types";
import { safeImageUrl, DEFAULT_IMAGE_URL } from "@/lib/api/endpoints";

/**
 * User Profile & Details Cell (Avatar + Name + Subtitle/Email)
 */
export interface UserDetailCellProps {
	name: string;
	subtitle?: string;
	avatarUrl?: string;
	fallbackText?: string;
	useDefaultImage?: boolean;
	onClick?: () => void;
}

export function UserDetailCell({
	name,
	subtitle,
	avatarUrl,
	fallbackText,
	useDefaultImage = true,
	onClick,
}: UserDetailCellProps) {
	const fallback =
		fallbackText ||
		(name
			? name
					.split(" ")
					.map((n) => n[0])
					.join("")
					.slice(0, 2)
					.toUpperCase()
			: "?");
	const resolvedUrl = safeImageUrl(avatarUrl);

	return (
		<div
			onClick={onClick}
			className={cn(
				"flex items-center gap-3 group py-0.5",
				onClick && "cursor-pointer hover:opacity-80 transition-opacity",
			)}
		>
			{useDefaultImage ? (
				<div className="h-9 w-9 rounded-xl border border-border/80 shadow-2xs shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
					<img
						src={resolvedUrl}
						alt={name}
						className="h-full w-full object-cover"
						onError={(e) => {
							e.currentTarget.onerror = null;
							e.currentTarget.src = DEFAULT_IMAGE_URL;
						}}
					/>
				</div>
			) : (
				<Avatar className="h-9 w-9 border border-border shadow-xs shrink-0">
					<AvatarImage src={resolvedUrl} alt={name} className="object-cover" />
					<AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
						{fallback}
					</AvatarFallback>
				</Avatar>
			)}
			<div className="flex flex-col min-w-0">
				<span className="font-semibold text-foreground text-sm tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
					{name}
				</span>
				{subtitle && (
					<span className="text-xs text-muted-foreground truncate leading-tight mt-0.5 font-normal">
						{subtitle}
					</span>
				)}
			</div>
		</div>
	);
}

/**
 * Status Badge Cell with customized status styling matching screenshot
 */
export interface StatusBadgeCellProps {
	status: string | boolean;
	type?: "email" | "account" | "custom";
	customVariant?:
		| "verified"
		| "unverified"
		| "active"
		| "inactive"
		| "pending"
		| "danger";
	label?: string;
	icon?: React.ReactNode;
}

export function StatusBadgeCell({
	status,
	type = "custom",
	customVariant,
	label,
	icon,
}: StatusBadgeCellProps) {
	let displayLabel = label || String(status);
	let variantClass = "bg-muted text-muted-foreground border-border";
	let defaultIcon: React.ReactNode = null;

	const normalizedStatus = String(status).toLowerCase();

	if (
		type === "email" ||
		normalizedStatus === "verified" ||
		normalizedStatus === "unverified"
	) {
		if (normalizedStatus === "verified" || status === true) {
			displayLabel = label || "Verified";
			variantClass =
				"bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800/50";
			defaultIcon = <Check className="h-3 w-3 stroke-[2.5]" />;
		} else {
			displayLabel = label || "Unverified";
			variantClass =
				"bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/50";
			defaultIcon = <AlertCircle className="h-3 w-3 stroke-[2.5]" />;
		}
	} else if (
		type === "account" ||
		normalizedStatus === "active" ||
		normalizedStatus === "inactive"
	) {
		if (normalizedStatus === "active" || status === true) {
			displayLabel = label || "Active";
			variantClass =
				"bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50";
			defaultIcon = <Check className="h-3 w-3 stroke-[2.5]" />;
		} else {
			displayLabel = label || "Inactive";
			variantClass =
				"bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800/50";
			defaultIcon = <X className="h-3 w-3 stroke-[2.5]" />;
		}
	} else if (customVariant) {
		switch (customVariant) {
			case "verified":
			case "active":
				variantClass =
					"bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400";
				defaultIcon = <Check className="h-3 w-3 stroke-[2.5]" />;
				break;
			case "unverified":
			case "pending":
				variantClass =
					"bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400";
				defaultIcon = <AlertCircle className="h-3 w-3 stroke-[2.5]" />;
				break;
			case "inactive":
				variantClass =
					"bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400";
				defaultIcon = <X className="h-3 w-3 stroke-[2.5]" />;
				break;
			case "danger":
				variantClass =
					"bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400";
				defaultIcon = <X className="h-3 w-3 stroke-[2.5]" />;
				break;
		}
	}

	return (
		<Badge
			variant="outline"
			className={cn(
				"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-medium text-xs border shadow-2xs transition-colors",
				variantClass,
			)}
		>
			{icon ?? defaultIcon}
			<span>{displayLabel}</span>
		</Badge>
	);
}

/**
 * IP Address / Code Cell with copy feature
 */
export function IPAddressCell({ ip }: { ip: string }) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!ip) return;
		navigator.clipboard.writeText(ip);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (!ip) return <span className="text-muted-foreground text-xs">—</span>;

	return (
		<div className="inline-flex items-center gap-1.5 group font-mono text-xs text-foreground/90 bg-muted/40 hover:bg-muted/70 px-2 py-1 rounded border border-border/50 transition-colors">
			<Globe className="h-3 w-3 text-muted-foreground shrink-0" />
			<span>{ip}</span>
			<button
				onClick={copyToClipboard}
				title="Copy IP Address"
				className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-foreground transition-opacity ml-1 p-0.5 rounded"
			>
				{copied ? (
					<CheckCheck className="h-3 w-3 text-emerald-500" />
				) : (
					<Copy className="h-3 w-3" />
				)}
			</button>
		</div>
	);
}

/**
 * Formatted Date Cell
 */
export function DateCell({ dateString }: { dateString: string }) {
	if (!dateString)
		return <span className="text-muted-foreground text-xs">—</span>;

	let formatted = dateString;
	try {
		const d = new Date(dateString);
		if (!isNaN(d.getTime())) {
			formatted = d.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		}
	} catch (e) {
		// fallback to dateString
	}

	return (
		<div className="inline-flex items-center gap-1.5 text-sm text-foreground/80">
			<Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
			<span>{formatted}</span>
		</div>
	);
}

/**
 * Standard Row Action Dropdown Menu Cell
 */
export interface RowActionsCellProps<T> {
	row: T;
	onView?: (row: T) => void;
	onEdit?: (row: T) => void;
	onDelete?: (row: T) => void;
	customActions?: RowAction<T>[];
}

export function RowActionsCell<T>({
	row,
	onView,
	onEdit,
	onDelete,
	customActions,
}: RowActionsCellProps<T>) {
	const visibleCustomActions =
		customActions?.filter((act) => !act.hidden || !act.hidden(row)) || [];

	const hasAnyActions =
		onView || onEdit || onDelete || visibleCustomActions.length > 0;
	if (!hasAnyActions) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
					>
						<span className="sr-only">Open menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				}
			/>
			<DropdownMenuContent
				align="end"
				className="w-44 shadow-lg border border-border"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
						Row Actions
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{onView && (
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								onView(row);
							}}
							className="cursor-pointer text-xs flex items-center gap-2"
						>
							<Eye className="h-3.5 w-3.5 text-muted-foreground" /> View details
						</DropdownMenuItem>
					)}
					{onEdit && (
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								onEdit(row);
							}}
							className="cursor-pointer text-xs flex items-center gap-2"
						>
							<Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Edit
							record
						</DropdownMenuItem>
					)}
					{visibleCustomActions.map((action, idx) => (
						<DropdownMenuItem
							key={idx}
							disabled={action.disabled?.(row)}
							onClick={(e) => {
								e.stopPropagation();
								action.onClick(row);
							}}
							className={cn(
								"cursor-pointer text-xs flex items-center gap-2",
								action.variant === "destructive" &&
									"text-destructive focus:text-destructive",
							)}
						>
							{typeof action.icon === "function"
								? action.icon(row)
								: action.icon}{" "}
							{typeof action.label === "function"
								? action.label(row)
								: action.label}
						</DropdownMenuItem>
					))}
					{onDelete && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onDelete(row);
								}}
								className="cursor-pointer text-xs flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
							>
								<Trash2 className="h-3.5 w-3.5" /> Delete record
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

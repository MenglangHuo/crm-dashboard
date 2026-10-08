"use client";

import { useState, useMemo } from "react";
import { Role } from "@/lib/types";
import { getRoleTotalPermissionsCount } from "@/lib/role-utils";
import { Search, Shield, X, CheckSquare, Square } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface RoleSelectorProps {
	roles: Role[];
	selectedRoleIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
	title?: string;
	description?: string;
	maxHeight?: string;
}

export function RoleSelector({
	roles = [],
	selectedRoleIds = [],
	onChange,
	disabled = false,
	title = "Assign Roles",
	description = "Select one or more roles to grant permissions to this user.",
	maxHeight = "max-h-[300px]",
}: RoleSelectorProps) {
	const [search, setSearch] = useState("");

	const filteredRoles = useMemo(() => {
		const s = search.toLowerCase().trim();
		if (!s) return roles;
		return roles.filter(
			(r) =>
				r.name.toLowerCase().includes(s) ||
				(r.description && r.description.toLowerCase().includes(s)),
		);
	}, [roles, search]);

	const selectedSet = useMemo(
		() => new Set(selectedRoleIds.map((id) => String(id).trim())),
		[selectedRoleIds],
	);

	const isRoleSelected = (r: Role) => {
		if (!r) return false;
		const idStr = String(r.id).trim();
		if (selectedSet.has(idStr)) return true;
		if (selectedSet.has(idStr.toLowerCase())) return true;

		const rName = String(r.name || "").trim();
		if (rName) {
			if (selectedSet.has(rName)) return true;
			if (selectedSet.has(rName.toLowerCase())) return true;
			if (selectedSet.has(rName.toUpperCase())) return true;
		}

		const rDisplay = String(r.displayName || "").trim();
		if (rDisplay) {
			if (selectedSet.has(rDisplay)) return true;
			if (selectedSet.has(rDisplay.toLowerCase())) return true;
		}

		return false;
	};

	const activeSelectedCount = useMemo(() => {
		return roles.filter((r) => isRoleSelected(r)).length;
	}, [roles, selectedSet]);

	const toggleRole = (r: Role) => {
		if (disabled) return;
		const idStr = String(r.id);
		const isChecked = isRoleSelected(r);
		const next = new Set(selectedSet);
		if (isChecked) {
			next.delete(idStr);
			next.delete(idStr.toLowerCase());
			if (r.name) {
				next.delete(r.name);
				next.delete(r.name.toUpperCase());
				next.delete(r.name.toLowerCase());
			}
			if (r.displayName) {
				next.delete(r.displayName);
				next.delete(r.displayName.toLowerCase());
			}
		} else {
			next.add(idStr);
		}
		onChange(Array.from(next));
	};

	const selectAllFiltered = () => {
		if (disabled) return;
		const next = new Set(selectedSet);
		filteredRoles.forEach((r) => next.add(String(r.id)));
		onChange(Array.from(next));
	};

	const clearAllFiltered = () => {
		if (disabled) return;
		const next = new Set(selectedSet);
		filteredRoles.forEach((r) => {
			next.delete(String(r.id));
			next.delete(String(r.id).toLowerCase());
			if (r.name) {
				next.delete(r.name);
				next.delete(r.name.toUpperCase());
				next.delete(r.name.toLowerCase());
			}
			if (r.displayName) {
				next.delete(r.displayName);
				next.delete(r.displayName.toLowerCase());
			}
		});
		onChange(Array.from(next));
	};

	return (
		<div className="space-y-3 w-full">
			{/* Header */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-2.5">
				<div>
					<div className="flex items-center gap-2">
						<Shield className="size-4 text-primary" />
						<h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
							{title}
						</h4>
						<Badge
							variant="secondary"
							className="text-[11px] font-semibold px-2 py-0.5"
						>
							{activeSelectedCount} / {roles.length} Selected
						</Badge>
					</div>
					{description && (
						<p className="text-xs text-muted-foreground mt-0.5">
							{description}
						</p>
					)}
				</div>

				{/* Quick Toggles */}
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={selectAllFiltered}
						disabled={disabled || filteredRoles.length === 0}
						className="h-7 text-xs px-2 gap-1"
					>
						<CheckSquare className="size-3 text-emerald-600" />
						Select All
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={clearAllFiltered}
						disabled={disabled || selectedRoleIds.length === 0}
						className="h-7 text-xs px-2 gap-1 text-muted-foreground"
					>
						<Square className="size-3" />
						Clear
					</Button>
				</div>
			</div>

			{/* Search Input */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search role by name or description..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9 pr-8 h-9 text-xs bg-slate-50/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800"
				/>
				{search && (
					<button
						type="button"
						onClick={() => setSearch("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
					>
						<X className="size-3" />
					</button>
				)}
			</div>

			{/* Roles List */}
			<ScrollArea
				className={cn(
					"pr-2 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2.5 bg-slate-50/40 dark:bg-slate-950/40",
					maxHeight,
				)}
			>
				{filteredRoles.length === 0 ? (
					<div className="py-8 text-center text-xs text-muted-foreground">
						No roles found matching "{search}".
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						{filteredRoles.map((r) => {
							const isChecked = isRoleSelected(r);
							return (
								<div
									key={r.id}
									onClick={() => toggleRole(r)}
									className={cn(
										"flex items-start gap-2.5 p-3 rounded-lg border transition-all cursor-pointer select-none",
										isChecked
											? "border-primary/50 bg-primary/5 dark:border-primary/60 dark:bg-primary/10"
											: "border-slate-200/70 bg-card hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
										disabled && "opacity-60 pointer-events-none",
									)}
								>
									<Checkbox
										checked={isChecked}
										onCheckedChange={() => toggleRole(r)}
										disabled={disabled}
										className="mt-0.5 shrink-0"
									/>
									<div className="space-y-1 min-w-0 flex-1">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="font-semibold text-xs text-foreground">
												{r.displayName || r.name}
											</span>
											<span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
												{r.name}
											</span>
											{r.isSystem && (
												<Badge
													variant="secondary"
													className="text-[9px] px-1 py-0 bg-slate-200 dark:bg-slate-800"
												>
													System
												</Badge>
											)}
											<Badge
												variant="outline"
												className="text-[9px] px-1 py-0 border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300"
											>
												{getRoleTotalPermissionsCount(r)} Perms
											</Badge>
										</div>
										{r.description && (
											<p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
												{r.description}
											</p>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}

"use client";

import { useState, useMemo } from "react";
import { Permission } from "@/lib/types";
import {
	Search,
	CheckSquare,
	Square,
	Layers,
	ShieldCheck,
	X,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface PermissionSelectorProps {
	permissions: Permission[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	disabled?: boolean;
	title?: string;
	description?: string;
	badgeVariant?: "default" | "emerald" | "rose" | "purple";
	maxHeight?: string;
}

export function PermissionSelector({
	permissions = [],
	selectedIds = [],
	onChange,
	disabled = false,
	title = "Permissions Assignment",
	description = "Search and select specific permissions grouped by system module.",
	badgeVariant = "purple",
	maxHeight = "max-h-[420px]",
}: PermissionSelectorProps) {
	const [search, setSearch] = useState("");
	const [selectedModule, setSelectedModule] = useState<string>("ALL");

	// Group permissions by module
	const { modules, groupedPermissions, filteredPermissions } = useMemo(() => {
		const searchLower = search.toLowerCase().trim();

		const filtered = permissions.filter((p) => {
			const matchesSearch =
				!searchLower ||
				p.name.toLowerCase().includes(searchLower) ||
				(p.description && p.description.toLowerCase().includes(searchLower)) ||
				(p.module && p.module.toLowerCase().includes(searchLower));
			const matchesModule =
				selectedModule === "ALL" || (p.module || "General") === selectedModule;
			return matchesSearch && matchesModule;
		});

		const groups: Record<string, Permission[]> = {};
		filtered.forEach((p) => {
			const mod = p.module || "General";
			if (!groups[mod]) groups[mod] = [];
			groups[mod].push(p);
		});

		const allModules = Array.from(
			new Set(permissions.map((p) => p.module || "General")),
		).sort();

		return {
			modules: allModules,
			groupedPermissions: groups,
			filteredPermissions: filtered,
		};
	}, [permissions, search, selectedModule]);

	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const isPermSelected = (p: Permission) => {
		if (!p) return false;
		const idStr = String(p.id);
		if (selectedSet.has(idStr)) return true;
		if (selectedSet.has(idStr.toLowerCase())) return true;

		const pName = String(p.name || "").trim();
		const pMod = String(p.module || "").trim();
		const act = pName.includes(".")
			? pName.split(".").slice(1).join(".")
			: pName;

		// Check module-qualified action keys
		if (pMod && act) {
			if (selectedSet.has(`${pMod.toUpperCase()}.${act.toUpperCase()}`))
				return true;
			if (selectedSet.has(`${pMod.toLowerCase()}.${act.toLowerCase()}`))
				return true;
			if (selectedSet.has(`${pMod.toUpperCase()}.${act.toLowerCase()}`))
				return true;
			if (selectedSet.has(`${pMod.toLowerCase()}.${act.toUpperCase()}`))
				return true;
			if (selectedSet.has(`${pMod}.${act}`)) return true;
		}

		// Check full name if it already has a dot prefix
		if (pName.includes(".")) {
			if (selectedSet.has(pName)) return true;
			if (selectedSet.has(pName.toLowerCase())) return true;
			if (selectedSet.has(pName.toUpperCase())) return true;
		}

		return false;
	};

	const activeSelectedCount = useMemo(() => {
		return permissions.filter((p) => isPermSelected(p)).length;
	}, [permissions, selectedSet]);

	const toggleSingle = (p: Permission) => {
		if (disabled) return;
		const next = new Set(selectedSet);
		const isChecked = isPermSelected(p);
		const idStr = String(p.id);
		const pName = String(p.name || "").trim();
		const pMod = String(p.module || "").trim();
		const act = pName.includes(".")
			? pName.split(".").slice(1).join(".")
			: pName;

		if (isChecked) {
			next.delete(idStr);
			next.delete(idStr.toLowerCase());
			if (pName.includes(".")) {
				next.delete(pName);
				next.delete(pName.toLowerCase());
				next.delete(pName.toUpperCase());
			}
			if (pMod && act) {
				next.delete(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
				next.delete(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
				next.delete(`${pMod.toUpperCase()}.${act.toLowerCase()}`);
				next.delete(`${pMod.toLowerCase()}.${act.toUpperCase()}`);
				next.delete(`${pMod}.${act}`);
			}
		} else {
			next.add(idStr);
			if (pMod && act) {
				next.add(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
				next.add(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
			} else if (pName.includes(".")) {
				next.add(pName);
				next.add(pName.toLowerCase());
				next.add(pName.toUpperCase());
			}
		}
		onChange(Array.from(next));
	};

	const toggleModule = (modulePerms: Permission[]) => {
		if (disabled) return;
		const allSelected = modulePerms.every((p) => isPermSelected(p));
		const next = new Set(selectedSet);

		if (allSelected) {
			modulePerms.forEach((p) => {
				const idStr = String(p.id);
				const pName = String(p.name || "").trim();
				const pMod = String(p.module || "").trim();
				const act = pName.includes(".")
					? pName.split(".").slice(1).join(".")
					: pName;

				next.delete(idStr);
				next.delete(idStr.toLowerCase());
				if (pName.includes(".")) {
					next.delete(pName);
					next.delete(pName.toLowerCase());
					next.delete(pName.toUpperCase());
				}
				if (pMod && act) {
					next.delete(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
					next.delete(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
					next.delete(`${pMod.toUpperCase()}.${act.toLowerCase()}`);
					next.delete(`${pMod.toLowerCase()}.${act.toUpperCase()}`);
					next.delete(`${pMod}.${act}`);
				}
			});
		} else {
			modulePerms.forEach((p) => {
				const idStr = String(p.id);
				const pName = String(p.name || "").trim();
				const pMod = String(p.module || "").trim();
				const act = pName.includes(".")
					? pName.split(".").slice(1).join(".")
					: pName;

				next.add(idStr);
				if (pMod && act) {
					next.add(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
					next.add(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
				} else if (pName.includes(".")) {
					next.add(pName);
					next.add(pName.toLowerCase());
					next.add(pName.toUpperCase());
				}
			});
		}
		onChange(Array.from(next));
	};

	const selectAllFiltered = () => {
		if (disabled) return;
		const next = new Set(selectedSet);
		filteredPermissions.forEach((p) => {
			const idStr = String(p.id);
			const pName = String(p.name || "").trim();
			const pMod = String(p.module || "").trim();
			const act = pName.includes(".")
				? pName.split(".").slice(1).join(".")
				: pName;

			next.add(idStr);
			if (pMod && act) {
				next.add(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
				next.add(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
			} else if (pName.includes(".")) {
				next.add(pName);
				next.add(pName.toLowerCase());
				next.add(pName.toUpperCase());
			}
		});
		onChange(Array.from(next));
	};

	const clearAllFiltered = () => {
		if (disabled) return;
		const next = new Set(selectedSet);
		filteredPermissions.forEach((p) => {
			const idStr = String(p.id);
			const pName = String(p.name || "").trim();
			const pMod = String(p.module || "").trim();
			const act = pName.includes(".")
				? pName.split(".").slice(1).join(".")
				: pName;

			next.delete(idStr);
			next.delete(idStr.toLowerCase());
			if (pName.includes(".")) {
				next.delete(pName);
				next.delete(pName.toLowerCase());
				next.delete(pName.toUpperCase());
			}
			if (pMod && act) {
				next.delete(`${pMod.toUpperCase()}.${act.toUpperCase()}`);
				next.delete(`${pMod.toLowerCase()}.${act.toLowerCase()}`);
				next.delete(`${pMod.toUpperCase()}.${act.toLowerCase()}`);
				next.delete(`${pMod.toLowerCase()}.${act.toUpperCase()}`);
				next.delete(`${pMod}.${act}`);
			}
		});
		onChange(Array.from(next));
	};

	const badgeStyles = {
		default: "bg-primary/10 text-primary border-primary/20",
		emerald:
			"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
		rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
		purple: "bg-primary/10 text-primary border-primary/20",
	};

	return (
		<div className="space-y-3.5 w-full">
			{/* Header & Quick Action Toolbar */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div className="space-y-0.5">
					<div className="flex items-center gap-2 flex-wrap">
						<ShieldCheck className="size-4 text-primary" />
						<h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
							{title}
						</h4>
						<Badge
							variant="outline"
							className={cn(
								"text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs",
								badgeStyles[badgeVariant],
							)}
						>
							{activeSelectedCount} / {permissions.length} Selected
						</Badge>
					</div>
					{description && (
						<p className="text-xs text-muted-foreground">{description}</p>
					)}
				</div>

				{/* Global Select/Clear Actions */}
				<div className="flex items-center gap-2 shrink-0">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={selectAllFiltered}
						disabled={disabled || filteredPermissions.length === 0}
						className="h-8 text-xs gap-1.5 font-semibold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
					>
						<CheckSquare className="size-3.5 text-emerald-600 dark:text-emerald-400" />
						Select All ({filteredPermissions.length})
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={clearAllFiltered}
						disabled={disabled || selectedIds.length === 0}
						className="h-8 text-xs gap-1.5 font-semibold text-muted-foreground hover:text-foreground rounded-lg border-slate-200 dark:border-slate-800"
					>
						<Square className="size-3.5" />
						Clear
					</Button>
				</div>
			</div>

			{/* Search Input Row & Scrollable Module Pills */}
			<div className="space-y-2.5">
				{/* Full-width Search Input */}
				<div className="relative w-full">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Search permissions code, module name, or description..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 pr-8 h-9 text-xs bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs focus-visible:ring-primary/30"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
							title="Clear search"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>

				{/* Scrollable Module Selector Pills Bar */}
				<div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
					<button
						type="button"
						onClick={() => setSelectedModule("ALL")}
						className={cn(
							"px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer select-none flex items-center gap-1.5 border",
							selectedModule === "ALL"
								? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
								: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800",
						)}
					>
						<Layers className="size-3.5" />
						<span>All Modules</span>
						<Badge
							variant="secondary"
							className={cn(
								"ml-0.5 text-[10px] px-1.5 py-0 h-4 font-extrabold rounded-md",
								selectedModule === "ALL"
									? "bg-white/20 text-white"
									: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
							)}
						>
							{modules.length}
						</Badge>
					</button>

					{modules.map((mod) => {
						const isSelected = selectedModule === mod;
						const count = permissions.filter(
							(p) => (p.module || "General") === mod,
						).length;
						const formattedMod = mod
							.replace(/_/g, " ")
							.replace(/\b\w/g, (c) => c.toUpperCase());

						return (
							<button
								key={mod}
								type="button"
								onClick={() => setSelectedModule(mod)}
								className={cn(
									"px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer select-none flex items-center gap-1.5 border",
									isSelected
										? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
										: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800",
								)}
							>
								<span>{formattedMod}</span>
								<Badge
									variant="secondary"
									className={cn(
										"text-[10px] px-1.5 py-0 h-4 font-semibold rounded-md",
										isSelected
											? "bg-white/20 text-white"
											: "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
									)}
								>
									{count}
								</Badge>
							</button>
						);
					})}
				</div>
			</div>

			{/* Permissions Content Scrollable Area */}
			<ScrollArea
				className={cn(
					"pr-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-950/40 shadow-inner",
					maxHeight,
				)}
			>
				{Object.keys(groupedPermissions).length === 0 ? (
					<div className="py-12 text-center text-xs text-muted-foreground space-y-1">
						<p className="font-semibold text-foreground">
							No permissions found
						</p>
						<p className="text-[11px]">
							{search
								? `No permissions match "${search}"`
								: "No permissions available for this module."}
						</p>
					</div>
				) : (
					<div className="space-y-3.5">
						{Object.entries(groupedPermissions).map(([modName, perms]) => {
							const allSelected = perms.every((p) => isPermSelected(p));
							const someSelected = perms.some((p) => isPermSelected(p));
							const selectedCount = perms.filter((p) =>
								isPermSelected(p),
							).length;
							const formattedModTitle = modName
								.replace(/_/g, " ")
								.replace(/\b\w/g, (c) => c.toUpperCase());

							return (
								<div
									key={modName}
									className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card overflow-hidden shadow-2xs"
								>
									{/* Module Header Bar */}
									<div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<Layers className="size-3.5 text-primary" />
											<span className="font-bold text-xs text-foreground uppercase tracking-wider">
												{formattedModTitle}
											</span>
											<Badge
												variant="outline"
												className="text-[10px] px-1.5 py-0 font-mono font-semibold border-primary/30 text-primary bg-primary/10"
											>
												{selectedCount} / {perms.length} Enabled
											</Badge>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => toggleModule(perms)}
											disabled={disabled}
											className="h-7 px-2.5 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg"
										>
											{allSelected
												? "Deselect Module"
												: someSelected
													? "Select Remaining"
													: "Select All Module"}
										</Button>
									</div>

									{/* Permissions Cards Grid */}
									<div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
										{perms.map((p) => {
											const isChecked = isPermSelected(p);
											return (
												<div
													key={p.id}
													onClick={() => toggleSingle(p)}
													className={cn(
														"flex items-start gap-2.5 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer select-none",
														isChecked
															? "border-primary/50 bg-primary/5 shadow-2xs"
															: "border-slate-200/80 bg-background hover:border-primary/30 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-slate-700",
														disabled && "opacity-60 pointer-events-none",
													)}
												>
													<Checkbox
														checked={isChecked}
														onCheckedChange={() => toggleSingle(p)}
														disabled={disabled}
														className="mt-0.5 shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
													/>
													<div className="space-y-0.5 min-w-0 flex-1">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="font-mono text-xs font-bold text-foreground">
																{p.name.includes(".")
																	? p.name.split(".").slice(1).join(".")
																	: p.name}
															</span>
															{p.name.includes(".") && (
																<span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-slate-800">
																	{p.name}
																</span>
															)}
														</div>
														{p.description && (
															<p className="text-[11px] text-muted-foreground leading-tight line-clamp-2">
																{p.description}
															</p>
														)}
													</div>
												</div>
											);
										})}
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

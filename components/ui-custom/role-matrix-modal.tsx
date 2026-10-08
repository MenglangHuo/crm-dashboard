"use client";

import { useState } from "react";
import { Role } from "@/lib/types";
import {
	getRoleModuleBreakdown,
	getRolePriorityConfig,
	getRoleTotalPermissionsCount,
} from "@/lib/role-utils";
import {
	ShieldCheck,
	Crown,
	ShieldAlert,
	Shield,
	Layers,
	Search,
	CheckCircle2,
	XCircle,
	Calendar,
	Lock,
	Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ModernModal } from "@/components/ui-custom/modal";
import { cn } from "@/lib/utils";

interface RoleMatrixModalProps {
	role: Role | null;
	isOpen: boolean;
	onClose: () => void;
	isLoading?: boolean;
}

export function RoleMatrixModal({
	role,
	isOpen,
	onClose,
	isLoading = false,
}: RoleMatrixModalProps) {
	const [search, setSearch] = useState("");

	if (!isOpen) return null;
	if (!role && !isLoading) return null;

	const breakdown = role ? getRoleModuleBreakdown(role) : [];
	const totalPerms = role ? getRoleTotalPermissionsCount(role) : 0;
	const priorityConfig = getRolePriorityConfig(role?.priority);

	const renderPriorityIcon = () => {
		switch (priorityConfig.iconName) {
			case "crown":
				return <Crown className="size-3.5 text-rose-500" />;
			case "shield-check":
				return <ShieldCheck className="size-3.5 text-primary" />;
			case "shield-alert":
				return <ShieldAlert className="size-3.5 text-blue-500" />;
			default:
				return <Shield className="size-3.5 text-emerald-500" />;
		}
	};

	// Filter modules/permissions based on search
	const searchLower = search.toLowerCase().trim();
	const filteredBreakdown = breakdown.filter((item) => {
		if (!searchLower) return true;
		const matchModule = item.module.toLowerCase().includes(searchLower);
		const matchPerm = item.permissions.some((p) =>
			p.name.toLowerCase().includes(searchLower),
		);
		return matchModule || matchPerm;
	});

	const formattedDate = role?.createdAt
		? new Date(role.createdAt).toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={role ? role.displayName || role.name : "Loading Role Details..."}
			subtitle={
				role
					? `Detailed security profile, module permissions, and priority tier for ${role.name}`
					: "Fetching security role details from API..."
			}
			icon={<ShieldCheck className="h-5 w-5 text-primary" />}
			size="xl"
			isLoading={isLoading}
		>
			{!role || isLoading ? (
				<div className="py-16 text-center text-xs text-muted-foreground">
					Loading role permission details from server...
				</div>
			) : (
				<div className="space-y-5">
					{/* Top Summary Card */}
					<div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-slate-50/80 via-white to-primary/5 dark:from-slate-900/80 dark:via-slate-900 dark:to-primary/10 p-4 shadow-2xs">
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div className="space-y-1.5">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-base font-bold text-foreground">
										{role.displayName || role.name}
									</span>
									<span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
										{role.name}
									</span>
									<Badge
										variant="outline"
										className={cn(
											"text-xs gap-1 font-semibold px-2.5 py-0.5",
											priorityConfig.badgeClass,
										)}
									>
										{renderPriorityIcon()}
										{priorityConfig.shortLabel}
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									{role.description ||
										"No specific description provided for this role."}
								</p>
							</div>

							{/* Quick Metrics */}
							<div className="flex items-center gap-3 shrink-0">
								<div className="flex flex-col items-center justify-center px-3.5 py-2 rounded-xl bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xs">
									<span className="text-xs text-muted-foreground font-medium">
										Modules
									</span>
									<span className="text-base font-extrabold text-foreground">
										{breakdown.length}
									</span>
								</div>
								<div className="flex flex-col items-center justify-center px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 shadow-2xs">
									<span className="text-xs text-primary font-medium">
										Active Actions
									</span>
									<span className="text-base font-extrabold text-primary">
										{totalPerms}
									</span>
								</div>
							</div>
						</div>

						{/* Additional details bar */}
						<div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
							<div className="flex items-center gap-4 flex-wrap">
								{formattedDate && (
									<div className="flex items-center gap-1.5">
										<Calendar className="size-3.5 text-slate-400" />
										<span>Created: {formattedDate}</span>
									</div>
								)}
								<div className="flex items-center gap-1.5">
									<Lock className="size-3.5 text-slate-400" />
									<span>Role ID: #{role.id}</span>
								</div>
							</div>
							{role.isSystem && (
								<Badge
									variant="secondary"
									className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
								>
									System Managed
								</Badge>
							)}
						</div>
					</div>

					{/* Search Bar & Title */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<Layers className="size-4 text-primary" />
							<h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
								Module Access Matrix
							</h4>
						</div>

						<div className="relative w-full sm:w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search module or action..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 h-8 text-xs bg-card"
							/>
						</div>
					</div>

					{/* Permissions Breakdown Matrix Grid */}
					<div className="max-h-[380px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
						{filteredBreakdown.length === 0 ? (
							<div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-2">
								<Sparkles className="size-8 text-slate-300 dark:text-slate-700 mx-auto" />
								<p className="text-xs text-muted-foreground font-medium">
									{search
										? `No permission modules match "${search}"`
										: "No custom matrix permissions assigned to this role."}
								</p>
							</div>
						) : (
							filteredBreakdown.map((item) => (
								<div
									key={item.module}
									className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-card overflow-hidden shadow-2xs"
								>
									{/* Module Header */}
									<div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<span className="font-bold text-xs uppercase tracking-wider text-foreground">
												{item.module}
											</span>
											<Badge
												variant="outline"
												className="text-[10px] bg-primary/10 text-primary border-primary/20"
											>
												{item.enabledCount} / {item.totalCount} Enabled
											</Badge>
										</div>
									</div>

									{/* Actions Chips Grid */}
									<div className="p-3 flex flex-wrap gap-2">
										{item.permissions.map((perm) => (
											<div
												key={perm.name}
												className={cn(
													"flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
													perm.enabled
														? "bg-emerald-50/80 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
														: "bg-slate-100/60 text-slate-400 border-slate-200/60 dark:bg-slate-900/60 dark:text-slate-500 dark:border-slate-800 line-through",
												)}
											>
												{perm.enabled ? (
													<CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
												) : (
													<XCircle className="size-3.5 text-slate-400 shrink-0" />
												)}
												<span className="capitalize">{perm.name}</span>
											</div>
										))}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</ModernModal>
	);
}

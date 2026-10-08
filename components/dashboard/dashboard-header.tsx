"use client";

import * as React from "react";
import {
	Activity,
	ArrowUpRight,
	Clock,
	Download,
	RefreshCw,
	SlidersHorizontal,
	Sparkles,
	User,
	Users,
	Check,
	Search,
	ChevronDown,
	Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	ModernDateRangePicker,
	type DateRangeValue,
} from "@/components/ui-custom/form-controls/modern-date-range-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fileUrl } from "@/lib/api/endpoints";
import type { User as UserType } from "@/lib/types";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

export interface DashboardHeaderProps {
	title?: string;
	description?: string;
	lastUpdated?: string;
	isRefreshing?: boolean;
	onRefresh?: () => Promise<void> | void;
	dateRange: DateRangeValue;
	onDateRangeChange: (range: DateRangeValue) => void;
	selectedUserId?: string | number | null;
	onUserIdChange?: (userId: string | number | null) => void;
	users?: UserType[];
	isLoadingUsers?: boolean;
	selectedCompanyName?: string | null;
}

export function DashboardHeader({
	title = "Executive Intelligence",
	description = "Comprehensive financial reporting, dynamic time-series metrics, and period-over-period income variance.",
	lastUpdated,
	isRefreshing = false,
	onRefresh,
	dateRange,
	onDateRangeChange,
	selectedUserId,
	onUserIdChange,
	users = [],
	isLoadingUsers = false,
	selectedCompanyName,
}: DashboardHeaderProps) {
	const { t } = useTranslation();
	const [userSearchTerm, setUserSearchTerm] = React.useState("");

	const handleRefreshClick = async () => {
		if (isRefreshing) return;
		try {
			if (onRefresh) {
				await onRefresh();
			}
		} catch (err: any) {
			toast.error(err?.message || "Failed to refresh dashboard report data");
		}
	};

	// Selected user resolution
	const selectedUser = users.find(
		(u) => String(u.id) === String(selectedUserId),
	);

	// Filter users by search term
	const filteredUsers = users.filter((u) => {
		if (!userSearchTerm.trim()) return true;
		const term = userSearchTerm.toLowerCase();
		const fullName =
			`${u.firstName || u.firstname || ""} ${u.lastName || u.lastname || ""}`.toLowerCase();
		return (
			fullName.includes(term) ||
			u.username?.toLowerCase().includes(term) ||
			u.email?.toLowerCase().includes(term) ||
			String(u.id).includes(term)
		);
	});

	return (
		<section className="relative z-[45] rounded-3xl border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_50%,#f1f5f9_100%)] p-6 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.95)_0%,rgba(30,41,59,0.9)_50%,rgba(15,23,42,0.95)_100%)] sm:p-7">
			{/* Subtle background ambient blur */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
				<div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl dark:bg-blue-500/10" />
				<div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/8 blur-3xl dark:bg-indigo-500/10" />
			</div>

			<div className="relative z-20 flex flex-col">
				{/* Top Header Row: Info & Controls */}
				<div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
					{/* Left Column: Status Indicators */}
					<div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
						<span className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-200">
							{t("sidebar.dashboard")}
						</span>

						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-2xs dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300">
							<span className="relative flex h-2 w-2">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
							</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200">
								{t("common.active")}
							</span>
							{lastUpdated && (
								<span
									suppressHydrationWarning
									className="text-[10px] text-slate-400 dark:text-slate-500"
								>
									• {t("dashboard.lastUpdated")} {lastUpdated}
								</span>
							)}
						</div>

						{selectedCompanyName && (
							<div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
								<Building2 className="h-3.5 w-3.5" />
								<span>{selectedCompanyName}</span>
							</div>
						)}
					</div>

					{/* Right Column: Unified Single-Row Controls Toolbar */}
					<div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full 2xl:w-auto justify-start 2xl:justify-end">
						{/* Staff / User Filter Dropdown */}
						{onUserIdChange && (
							<div className="relative z-40 w-full sm:w-auto">
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<button
												type="button"
												className="group flex h-10 w-full sm:w-auto min-w-0 sm:min-w-[160px] items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800/80 cursor-pointer transition-all"
											/>
										}
									>
										<div className="flex items-center gap-2.5 truncate">
											{selectedUser ? (
												<Avatar className="h-5 w-5 rounded-md border border-slate-200 dark:border-slate-700 shrink-0">
													<AvatarImage
														src={
															fileUrl(
																selectedUser.avatarKey ||
																	selectedUser.avatarUrl,
															) || ""
														}
														alt={selectedUser.username}
													/>
													<AvatarFallback className="rounded-md bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
														{(selectedUser.firstName ||
															selectedUser.firstname ||
															selectedUser.username)?.[0] || "U"}
													</AvatarFallback>
												</Avatar>
											) : (
												<div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
													<Users className="h-3.5 w-3.5" />
												</div>
											)}
											<div className="flex flex-col text-left truncate leading-tight">
												<span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
													{t("dashboard.filterStaff")}
												</span>
												<span className="truncate font-semibold text-slate-900 dark:text-slate-100 text-xs">
													{isLoadingUsers
														? t("common.loading")
														: selectedUser
															? `${selectedUser.firstName || selectedUser.firstname || ""} ${selectedUser.lastName || selectedUser.lastname || ""}`.trim() ||
																selectedUser.username
															: t("dashboard.allStaff")}
												</span>
											</div>
										</div>
										<ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1 transition-transform group-data-open:rotate-180" />
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										sideOffset={6}
										className="z-[100] w-64 rounded-2xl border border-slate-200/90 bg-white/98 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/98 space-y-1.5"
									>
										<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
											{t("dashboard.filterStaff")}
										</div>

										{users.length > 5 && (
											<div className="relative px-1 pb-1">
												<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
												<input
													type="text"
													placeholder={t("common.search")}
													value={userSearchTerm}
													onChange={(e) => setUserSearchTerm(e.target.value)}
													className="w-full h-8 pl-8 pr-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
													onClick={(e) => e.stopPropagation()}
													onKeyDown={(e) => e.stopPropagation()}
												/>
											</div>
										)}

										<div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
											<DropdownMenuItem
												onClick={() => onUserIdChange(null)}
												className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
													!selectedUserId
														? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary-foreground"
														: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
												}`}
											>
												<div className="flex items-center gap-2.5 min-w-0">
													<div
														className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
															!selectedUserId
																? "bg-primary text-primary-foreground"
																: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
														}`}
													>
														<Users className="h-3.5 w-3.5" />
													</div>
													<div className="flex flex-col min-w-0">
														<span className="truncate">
															{t("dashboard.allStaff")}
														</span>
														<span className="text-[10px] text-slate-400">
															{t("common.all")}
														</span>
													</div>
												</div>
												{!selectedUserId && (
													<Check className="h-4 w-4 text-primary shrink-0 ml-1" />
												)}
											</DropdownMenuItem>

											{filteredUsers.map((u) => {
												const isSelected =
													String(u.id) === String(selectedUserId);
												const name =
													`${u.firstName || u.firstname || ""} ${u.lastName || u.lastname || ""}`.trim() ||
													u.username;
												return (
													<DropdownMenuItem
														key={u.id}
														onClick={() => onUserIdChange(u.id)}
														className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
															isSelected
																? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary-foreground"
																: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
														}`}
													>
														<div className="flex items-center gap-2.5 min-w-0">
															<Avatar className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
																<AvatarImage
																	src={
																		fileUrl(u.avatarKey || u.avatarUrl) || ""
																	}
																	alt={u.username}
																/>
																<AvatarFallback className="rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
																	{(u.firstName ||
																		u.firstname ||
																		u.username)?.[0] || "U"}
																</AvatarFallback>
															</Avatar>
															<div className="flex flex-col min-w-0">
																<span className="truncate">{name}</span>
																<span className="text-[10px] text-slate-400 font-mono truncate">
																	@{u.username}
																</span>
															</div>
														</div>
														{isSelected && (
															<Check className="h-4 w-4 text-primary shrink-0 ml-1" />
														)}
													</DropdownMenuItem>
												);
											})}
										</div>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)}

						{/* Date Range Picker & Refresh Button Group with flexible width */}
						<div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:flex-initial min-w-0">
							<div className="flex-1 sm:flex-initial min-w-0 sm:min-w-[240px] md:min-w-[270px]">
								<ModernDateRangePicker
									value={dateRange}
									onChange={onDateRangeChange}
									placeholder={t("common.filter")}
									align="right"
									clearable={true}
								/>
							</div>

							{/* Refresh Reports Button */}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleRefreshClick}
								disabled={isRefreshing}
								className="h-10 shrink-0 rounded-xl border-slate-200/90 bg-white/95 px-3 sm:px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-all whitespace-nowrap"
							>
								<RefreshCw
									className={`mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${
										isRefreshing ? "animate-spin" : ""
									}`}
								/>
								<span className="hidden sm:inline">
									{isRefreshing ? "Refreshing..." : "Refresh Report"}
								</span>
								<span className="sm:hidden">
									{isRefreshing ? "..." : "Refresh"}
								</span>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

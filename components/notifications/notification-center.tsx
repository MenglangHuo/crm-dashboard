"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	useInfiniteQuery,
	useQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api/endpoints";
import type { AppNotification } from "@/lib/types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
	Bell,
	CheckCheck,
	Info,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Search,
	Trash2,
	Check,
	Loader2,
	RefreshCw,
	ExternalLink,
	Receipt,
	FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useOneSignal } from "@/hooks/use-onesignal";
import { getNotificationTargetUrl } from "@/lib/notification-routing";

function formatRelativeTime(dateStr?: string): string {
	if (!dateStr) return "Just now";
	try {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		const diffMin = Math.floor(diffSec / 60);
		const diffHour = Math.floor(diffMin / 60);
		const diffDay = Math.floor(diffHour / 24);

		if (diffSec < 45) return "Just now";
		if (diffMin < 60) return `${diffMin}m ago`;
		if (diffHour < 24) return `${diffHour}h ago`;
		if (diffDay === 1) return "Yesterday";
		if (diffDay < 7) return `${diffDay}d ago`;
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	} catch {
		return "Recently";
	}
}

export function NotificationCenter() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { permission, requestPermission, isBlocked } = useOneSignal();
	const [open, setOpen] = useState(false);
	const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "ALERTS">(
		"ALL",
	);
	const [searchQuery, setSearchQuery] = useState("");

	// 1. Scenario 1: Fetch total unread count on first load after login (runs on mount, no background polling interval)
	const { data: totalUnreadCount = 0, refetch: refetchTotalUnread } =
		useQuery<number>({
			queryKey: ["notifications-total-unread"],
			queryFn: () => notificationsApi.totalUnread(),
			staleTime: 60 * 1000,
			refetchOnWindowFocus: false,
		});

	// 2. Scenario 2: Fetch notification list only when user clicks/opens notification center (enabled: open)
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		refetch,
		isFetching,
	} = useInfiniteQuery({
		queryKey: ["notifications-infinite", activeFilter, searchQuery],
		initialPageParam: 0,
		enabled: open,
		queryFn: async ({ pageParam = 0 }) => {
			const criteria: any[] = [];

			// Status filter for UNREAD tab
			if (activeFilter === "UNREAD") {
				criteria.push({
					field: "status",
					operator: "EQUAL",
					value: "UNREAD",
				});
			} else if (activeFilter === "ALERTS") {
				criteria.push({
					field: "type",
					operator: "IN",
					values: ["WARNING", "ERROR", "ORDER_PENDING_APPROVAL"],
				});
			}

			// Title/Message search filter
			if (searchQuery.trim()) {
				criteria.push({
					field: "title",
					operator: "LIKE",
					value: searchQuery.trim(),
				});
			}

			const payload = {
				page: pageParam,
				size: 15,
				sort: [{ field: "createdAt", direction: "DESC" }],
				filterGroup:
					criteria.length > 0
						? {
								logicalOperator: "AND",
								criteria,
							}
						: undefined,
			};

			return notificationsApi.search(payload);
		},
		getNextPageParam: (lastPage, allPages) => {
			const currentPage = allPages.length;
			const totalPages = lastPage?.totalPages ?? 1;
			return currentPage < totalPages ? currentPage : undefined;
		},
		staleTime: 30 * 1000,
		refetchOnWindowFocus: false,
	});

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (nextOpen) {
				refetchTotalUnread();
			}
		},
		[refetchTotalUnread],
	);

	const handleRefresh = useCallback(() => {
		refetch();
		refetchTotalUnread();
	}, [refetch, refetchTotalUnread]);

	// Flatten infinite query pages
	const notifications: AppNotification[] = useMemo(() => {
		if (!data?.pages) return [];
		return data.pages.flatMap((page) => page.items || []);
	}, [data]);

	const totalCount = data?.pages?.[0]?.total ?? notifications.length;

	// 3. Mark Single Notification As Read
	const markReadMutation = useMutation({
		mutationFn: (id: string | number) => notificationsApi.markAsRead(id),
		onMutate: async (id) => {
			// Optimistic update in infinite query cache
			await queryClient.cancelQueries({ queryKey: ["notifications-infinite"] });
			await queryClient.cancelQueries({
				queryKey: ["notifications-total-unread"],
			});

			queryClient.setQueriesData(
				{ queryKey: ["notifications-infinite"] },
				(oldData: any) => {
					if (!oldData?.pages) return oldData;
					return {
						...oldData,
						pages: oldData.pages.map((page: any) => ({
							...page,
							items: page.items.map((item: AppNotification) =>
								item.id === id
									? { ...item, isRead: true, status: "READ" }
									: item,
							),
						})),
					};
				},
			);

			// Decrement unread counter
			queryClient.setQueryData<number>(
				["notifications-total-unread"],
				(old = 0) => Math.max(0, old - 1),
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications-infinite"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-total-unread"],
			});
		},
	});

	// 4. Mark All Notifications As Read
	const markAllReadMutation = useMutation({
		mutationFn: () => notificationsApi.markAllAsRead(),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: ["notifications-infinite"] });
			await queryClient.cancelQueries({
				queryKey: ["notifications-total-unread"],
			});

			queryClient.setQueriesData(
				{ queryKey: ["notifications-infinite"] },
				(oldData: any) => {
					if (!oldData?.pages) return oldData;
					return {
						...oldData,
						pages: oldData.pages.map((page: any) => ({
							...page,
							items: page.items.map((item: AppNotification) => ({
								...item,
								isRead: true,
								status: "READ",
							})),
						})),
					};
				},
			);

			queryClient.setQueryData<number>(["notifications-total-unread"], 0);
		},
		onSuccess: () => {
			toast.success("All notifications marked as read");
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications-infinite"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-total-unread"],
			});
		},
	});

	// 5. Delete Notification
	const deleteNotificationMutation = useMutation({
		mutationFn: (id: string | number) => notificationsApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications-infinite"] });
			queryClient.invalidateQueries({
				queryKey: ["notifications-total-unread"],
			});
		},
	});

	// 6. Navigate to detail view when notification is clicked
	const handleNotificationClick = useCallback(
		(n: AppNotification) => {
			if (!n.isRead) {
				markReadMutation.mutate(n.id);
			}
			setOpen(false);

			const targetUrl = getNotificationTargetUrl(n);
			if (targetUrl) {
				router.push(targetUrl);
			}
		},
		[markReadMutation, router],
	);

	const getNotificationIcon = (type?: string) => {
		const upperType = (type || "").toUpperCase();
		if (upperType.startsWith("PAYMENT")) {
			return (
				<Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
			);
		}
		if (upperType.startsWith("INVOICE")) {
			return <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />;
		}
		switch (upperType) {
			case "SUCCESS":
			case "ORDER_APPROVED":
			case "ORDER_ACCEPTED":
				return (
					<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
				);
			case "WARNING":
			case "ORDER_PENDING_APPROVAL":
				return (
					<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
				);
			case "ERROR":
			case "ORDER_REJECTED":
				return <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
			default:
				return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
		}
	};

	const getNotificationIconBg = (type?: string) => {
		const upperType = (type || "").toUpperCase();
		if (upperType.startsWith("PAYMENT")) {
			return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80";
		}
		if (upperType.startsWith("INVOICE")) {
			return "bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-800/80";
		}
		switch (upperType) {
			case "SUCCESS":
			case "ORDER_APPROVED":
			case "ORDER_ACCEPTED":
				return "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80";
			case "WARNING":
			case "ORDER_PENDING_APPROVAL":
				return "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/80";
			case "ERROR":
			case "ORDER_REJECTED":
				return "bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/80";
			default:
				return "bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/80";
		}
	};

	return (
		<DropdownMenu open={open} onOpenChange={handleOpenChange}>
			<DropdownMenuTrigger
				className="relative flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
				aria-label="Open notifications"
			>
				<Bell className="h-4 w-4" />
				{totalUnreadCount > 0 && (
					<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-blue-600 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-slate-950 shadow-sm animate-pulse">
						{totalUnreadCount > 99 ? "99+" : totalUnreadCount}
					</span>
				)}
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-80 sm:w-[420px] rounded-3xl p-0 shadow-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
			>
				{/* Header Bar */}
				<div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40">
					<div className="flex items-center justify-between gap-2 mb-3">
						<div className="flex items-center gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
								<Bell className="h-3.5 w-3.5" />
							</div>
							<div>
								<h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-none">
									Notifications
								</h3>
								<span className="text-[10px] text-slate-400 font-medium">
									Activity & order alerts
								</span>
							</div>
							{totalUnreadCount > 0 && (
								<Badge className="ml-1.5 h-4.5 px-2 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80">
									{totalUnreadCount} unread
								</Badge>
							)}
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={handleRefresh}
								title="Refresh notifications"
								className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-blue-600" : ""}`}
								/>
							</button>
							{totalUnreadCount > 0 && (
								<button
									type="button"
									onClick={() => markAllReadMutation.mutate()}
									disabled={markAllReadMutation.isPending}
									className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pl-1 cursor-pointer disabled:opacity-50"
								>
									<CheckCheck className="h-3 w-3" /> Mark all read
								</button>
							)}
						</div>
					</div>

					{/* OneSignal Live Push Notification Status & Action */}
					<div className="mb-3 flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/80 px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-2xs">
						<div className="flex items-center gap-2">
							<span className="relative flex h-2 w-2">
								{permission === "granted" && !isBlocked ? (
									<>
										<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
										<span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
									</>
								) : (
									<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
								)}
							</span>
							<span className="text-slate-600 dark:text-slate-300 font-medium">
								{isBlocked
									? "Push blocked by adblocker"
									: permission === "granted"
										? "Live Order Push Active"
										: permission === "denied"
											? "Push Blocked in Browser"
											: "Live Push Notifications"}
							</span>
						</div>

						{isBlocked ? (
							<span className="text-[10px] text-slate-400 font-normal">
								Whitelist site
							</span>
						) : permission !== "granted" && permission !== "denied" ? (
							<button
								type="button"
								onClick={() => requestPermission()}
								className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
							>
								Enable Push
							</button>
						) : null}
					</div>

					{/* Filter Tabs & Search */}
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50">
							<button
								type="button"
								onClick={() => setActiveFilter("ALL")}
								className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
									activeFilter === "ALL"
										? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
										: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
								}`}
							>
								All{" "}
								{activeFilter === "ALL" && totalCount > 0
									? `(${totalCount})`
									: ""}
							</button>
							<button
								type="button"
								onClick={() => setActiveFilter("UNREAD")}
								className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
									activeFilter === "UNREAD"
										? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
										: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
								}`}
							>
								Unread {totalUnreadCount > 0 ? `(${totalUnreadCount})` : ""}
							</button>
							<button
								type="button"
								onClick={() => setActiveFilter("ALERTS")}
								className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
									activeFilter === "ALERTS"
										? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs"
										: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
								}`}
							>
								Alerts
							</button>
						</div>

						{/* Search Filter */}
						<div className="relative flex-1 max-w-[140px]">
							<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search..."
								className="h-7 pl-7 pr-2 text-[11px] rounded-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
							/>
						</div>
					</div>
				</div>

				{/* Notifications Scroll Area */}
				<ScrollArea className="h-[380px]">
					{isLoading ? (
						<div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
							<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
							<p className="text-xs font-medium text-slate-500">
								Loading notifications...
							</p>
						</div>
					) : isError ? (
						<div className="py-16 text-center text-slate-400 space-y-2">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-950/40">
								<AlertTriangle className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
								Failed to load notifications
							</p>
							<button
								type="button"
								onClick={() => refetch()}
								className="text-[11px] text-blue-600 font-semibold hover:underline"
							>
								Try again
							</button>
						</div>
					) : notifications.length > 0 ? (
						<div className="px-3.5 py-3 space-y-2.5">
							{notifications.map((n) => {
								const isUnread = !n.isRead;

								return (
									<div
										key={n.id}
										onClick={() => handleNotificationClick(n)}
										className={`group relative flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
											isUnread
												? "bg-slate-50/95 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 border-l-[3.5px] border-l-blue-600 dark:border-l-blue-500 shadow-2xs hover:bg-slate-100/90 dark:hover:bg-slate-800/90"
												: "bg-white/80 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800/50 border-l-[3.5px] border-l-gray-200 hover:bg-slate-50 dark:hover:bg-slate-900/40 opacity-80 hover:opacity-100"
										}`}
									>
										{/* Category Icon Indicator */}
										<div className="mt-0.5 shrink-0">
											<div
												className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-2xs ${getNotificationIconBg(n.type)}`}
											>
												{getNotificationIcon(n.type)}
											</div>
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0 pr-6 space-y-1">
											{/* Header Row: Title & Unread Notice Indicator */}
											<div className="flex items-center gap-1.5 flex-wrap">
												<p
													className={`text-xs truncate ${isUnread ? "font-bold text-slate-950 dark:text-white" : "font-semibold text-slate-700 dark:text-slate-300"}`}
												>
													{n.title}
												</p>
												{isUnread && (
													<span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-blue-600 text-white shadow-2xs shrink-0">
														<span className="h-1 w-1 rounded-full bg-white animate-pulse" />{" "}
														New
													</span>
												)}
											</div>

											{/* Message Body */}
											<p
												className={`text-[11px] leading-relaxed line-clamp-2 ${isUnread ? "text-slate-700 dark:text-slate-200 font-medium" : "text-slate-500 dark:text-slate-400"}`}
											>
												{n.message}
											</p>

											{/* Footer: Time & Type Badge + Click to view cue */}
											<div className="flex items-center justify-between gap-2 pt-0.5">
												<div className="flex items-center gap-2">
													<span className="text-[10px] font-medium text-slate-400 font-mono">
														{formatRelativeTime(n.createdAt)}
													</span>
													{n.type && (
														<Badge
															variant="outline"
															className="h-4 px-1.5 text-[9px] font-bold rounded-md border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300"
														>
															{n.type.replace(/_/g, " ")}
														</Badge>
													)}
												</div>
												<span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
													View details
													<ExternalLink className="h-2.5 w-2.5 ml-0.5" />
												</span>
											</div>
										</div>

										{/* Quick Action on Hover */}
										<div className="absolute right-2.5 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
											{isUnread ? (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														markReadMutation.mutate(n.id);
													}}
													title="Mark as read"
													className="p-1.5 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
												>
													<Check className="h-3.5 w-3.5" />
												</button>
											) : (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														deleteNotificationMutation.mutate(n.id);
													}}
													title="Dismiss"
													className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
												>
													<Trash2 className="h-3 w-3" />
												</button>
											)}
										</div>
									</div>
								);
							})}

							{/* Load More Button / Indicator */}
							{hasNextPage && (
								<div className="pt-2 pb-1 text-center">
									<button
										type="button"
										onClick={() => fetchNextPage()}
										disabled={isFetchingNextPage}
										className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
									>
										{isFetchingNextPage ? (
											<>
												<Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
												<span>Loading...</span>
											</>
										) : (
											<span>Load More</span>
										)}
									</button>
								</div>
							)}
						</div>
					) : (
						<div className="py-16 text-center text-slate-400 space-y-2">
							<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400">
								<Bell className="h-5 w-5 opacity-40" />
							</div>
							<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
								No notifications found
							</p>
							<p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
								{searchQuery
									? "No notifications matching your search"
									: activeFilter === "UNREAD"
										? "No unread notifications right now"
										: "You're all caught up with recent updates"}
							</p>
						</div>
					)}
				</ScrollArea>

				{/* Footer */}
				<div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-400 px-4">
					<span className="flex items-center gap-1.5">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
						Live sync active
					</span>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
					>
						Close
					</button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

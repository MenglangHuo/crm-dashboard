"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi, authApi } from "@/lib/api/endpoints";
import { clearClientSession, getErrorMessage } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n/context";
import { toast } from "sonner";
import type { ActiveSessionResponse, DeviceType } from "@/lib/types";

import {
	Laptop,
	Smartphone,
	Tablet,
	Monitor,
	Globe,
	ShieldCheck,
	ShieldAlert,
	CheckCircle2,
	Clock,
	Activity,
	LogOut,
	Trash2,
	Edit3,
	Check,
	X,
	RefreshCw,
	AlertTriangle,
	Info,
	Radio,
	Sparkles,
	Lock,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModernButton } from "@/components/ui-custom/modern-button";
import { ModernModal } from "@/components/ui-custom/modal/modern-modal";

interface ActiveSessionsTabProps {
	onSessionCountChange?: (count: number) => void;
}

export function ActiveSessionsTab({ onSessionCountChange }: ActiveSessionsTabProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Renaming state
	const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState<string>("");

	// Confirmation modal states
	const [sessionToRevoke, setSessionToRevoke] = useState<ActiveSessionResponse | null>(null);
	const [isRevokeOthersModalOpen, setIsRevokeOthersModalOpen] = useState(false);
	const [isRevokeAllModalOpen, setIsRevokeAllModalOpen] = useState(false);

	// 1. Fetch active sessions
	const {
		data: sessions = [],
		isLoading,
		isRefetching,
		refetch,
	} = useQuery({
		queryKey: ["active-sessions"],
		queryFn: async () => {
			const list = await sessionsApi.list();
			if (onSessionCountChange) {
				onSessionCountChange(list.length);
			}
			return list;
		},
		staleTime: 15 * 1000,
	});

	// 2. Mutations
	const revokeSessionMutation = useMutation({
		mutationFn: (sessionId: string) => sessionsApi.revoke(sessionId),
		onSuccess: () => {
			toast.success(t("profile.sessionsCard.revokeSuccess", "Device session revoked successfully"));
			setSessionToRevoke(null);
			queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (error: any) => {
			const msg = getErrorMessage(error);
			toast.error(msg);
		},
	});

	const revokeOthersMutation = useMutation({
		mutationFn: () => sessionsApi.revokeOthers(),
		onSuccess: () => {
			toast.success(t("profile.sessionsCard.revokeOthersSuccess", "All other device sessions have been revoked"));
			setIsRevokeOthersModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
		},
		onError: (error: any) => {
			toast.error(getErrorMessage(error));
		},
	});

	const revokeAllMutation = useMutation({
		mutationFn: async () => {
			await sessionsApi.revokeAll();
		},
		onSuccess: () => {
			toast.success(t("profile.sessionsCard.revokeAllSuccess", "All sessions revoked. Redirecting to sign in..."));
			setIsRevokeAllModalOpen(false);
			clearClientSession();
			window.location.href = "/sign-in";
		},
		onError: (error: any) => {
			toast.error(getErrorMessage(error));
		},
	});

	const updateDeviceNameMutation = useMutation({
		mutationFn: ({ sessionId, name }: { sessionId: string; name: string }) =>
			sessionsApi.updateDeviceName(sessionId, name),
		onSuccess: () => {
			toast.success(t("profile.sessionsCard.nameUpdated", "Device name updated successfully"));
			setEditingSessionId(null);
			setEditingName("");
			queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
		},
		onError: (error: any) => {
			toast.error(getErrorMessage(error));
		},
	});

	// Helper to get device icon
	const getDeviceIcon = (deviceType?: DeviceType, platform?: string) => {
		const lowerPlatform = (platform || "").toLowerCase();
		if (deviceType === "MOBILE" || lowerPlatform.includes("ios") || lowerPlatform.includes("android")) {
			return <Smartphone className="h-6 w-6 text-blue-500" />;
		}
		if (deviceType === "TABLET" || lowerPlatform.includes("ipad")) {
			return <Tablet className="h-6 w-6 text-purple-500" />;
		}
		if (deviceType === "DESKTOP" || lowerPlatform.includes("mac") || lowerPlatform.includes("win")) {
			return <Laptop className="h-6 w-6 text-indigo-500" />;
		}
		return <Globe className="h-6 w-6 text-slate-500" />;
	};

	// Format timestamp
	const formatDateTime = (isoDate?: string) => {
		if (!isoDate) return "N/A";
		try {
			const d = new Date(isoDate);
			return d.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return isoDate;
		}
	};

	// Relative time helper
	const formatRelativeTime = (isoDate?: string) => {
		if (!isoDate) return "N/A";
		try {
			const d = new Date(isoDate).getTime();
			const diffSeconds = Math.floor((Date.now() - d) / 1000);
			if (diffSeconds < 60) return "Just now";
			const diffMinutes = Math.floor(diffSeconds / 60);
			if (diffMinutes < 60) return `${diffMinutes}m ago`;
			const diffHours = Math.floor(diffMinutes / 60);
			if (diffHours < 24) return `${diffHours}h ago`;
			const diffDays = Math.floor(diffHours / 24);
			return `${diffDays}d ago`;
		} catch {
			return isoDate;
		}
	};

	const currentSession = sessions.find((s) => s.isCurrent);
	const isCurrentDeviceNew = Boolean(currentSession?.isNewDevice);
	const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

	return (
		<div className="space-y-6">
			{/* ============================================================ */}
			{/* Top Header & Actions Card */}
			{/* ============================================================ */}
			<Card className="rounded-2xl  shadow-xs bg-white dark:bg-slate-900/60">
				<CardHeader className="">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2.5 flex-wrap">
								<CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
									<Laptop className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									{t("profile.sessionsCard.title", "Active Devices & Sessions")}
								</CardTitle>
								<Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 font-semibold dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[10px]">
									{sessions.length} {t("profile.sessionsCard.activeDevices", "Active")}
								</Badge>
							</div>
							<CardDescription className="text-xs text-slate-500 dark:text-slate-400">
								{t(
									"profile.sessionsCard.subtitle",
									"Manage and monitor your active login sessions across computers, mobile devices, and browsers.",
								)}
							</CardDescription>
						</div>

						{/* Action Buttons & Status */}
						<div className="flex items-center gap-2.5 flex-wrap">
							<Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold gap-1 py-1">
								<CheckCircle2 className="size-3" />
								Real-Time Tracking
							</Badge>

							<ModernButton
								variant="outline"
								size="sm"
								onClick={() => refetch()}
								isLoading={isRefetching}
								leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />}
								className="text-xs"
							>
								{t("profile.sessionsCard.refreshButton", "Refresh List")}
							</ModernButton>

							{otherSessionsCount > 0 && (
								<ModernButton
									variant="outline"
									size="sm"
									disabled={isCurrentDeviceNew}
									title={
										isCurrentDeviceNew
											? t(
													"profile.sessionsCard.cantSignOutOthersNewDevice",
													"Available only on devices active for at least 7 days",
											  )
											: undefined
									}
									onClick={() => {
										if (isCurrentDeviceNew) {
											toast.error(
												t(
													"profile.sessionsCard.cantSignOutOthersNewDevice",
													"Available only on devices active for at least 7 days",
												),
											);
											return;
										}
										setIsRevokeOthersModalOpen(true);
									}}
									leftIcon={
										isCurrentDeviceNew ? (
											<Lock className="h-3.5 w-3.5 text-slate-400" />
										) : (
											<LogOut className="h-3.5 w-3.5 text-amber-500" />
										)
									}
									className={`text-xs ${
										isCurrentDeviceNew
											? "opacity-60 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800"
											: "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/30"
									}`}
								>
									{t("profile.sessionsCard.signOutOthersButton", "Sign Out Other Devices")}
								</ModernButton>
							)}

							
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-5 space-y-5">
					{/* 7-Day Protection Informational Callout */}
					

					{/* Active restriction banner on new device */}
					{isCurrentDeviceNew && (
						<div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200 shadow-xs">
							<ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
							<div className="space-y-1">
								<p className="font-bold tracking-tight">
									{t("profile.sessionsCard.newDeviceRestrictionTitle", "Restricted Actions on New Device")}
								</p>
								<p className="leading-relaxed opacity-90">
									{t(
										"profile.sessionsCard.newDeviceRestrictionDesc",
										"This device logged in less than 7 days ago. For security reasons, terminating other devices is locked until this device is established (7 days).",
									)}
								</p>
							</div>
						</div>
					)}

					{/* Loading State */}
					{isLoading && (
						<div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
							<RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
							<p className="text-xs font-medium">{t("profile.sessionsCard.loading", "Loading your active devices...")}</p>
						</div>
					)}

					{/* Empty State */}
					{!isLoading && sessions.length === 0 && (
						<div className="text-center py-12 text-slate-400 text-xs">
							{t("profile.sessionsCard.noActiveSessions", "No active sessions found.")}
						</div>
					)}

					{/* Sessions List */}
					{!isLoading && sessions.length > 0 && (
						<div className="space-y-3">
							{sessions.map((session) => {
								const isEditing = editingSessionId === session.sessionId;

								return (
									<div
										key={session.sessionId}
										className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border transition-all ${
											session.isCurrent
												? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/15 shadow-xs"
												: "border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40"
										}`}
									>
										{/* Left: Device Icon & Info */}
										<div className="flex items-start gap-4">
											<div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 shrink-0 mt-0.5">
												{getDeviceIcon(session.deviceType, session.platform)}
											</div>

											<div className="space-y-1.5">
												{/* Device Name Header */}
												<div className="flex items-center gap-2 flex-wrap">
													{isEditing ? (
														<div className="flex items-center gap-1.5">
															<input
																type="text"
																value={editingName}
																onChange={(e) => setEditingName(e.target.value)}
																className="h-7 text-xs font-semibold px-2 rounded-md border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
																placeholder={t("profile.sessionsCard.namePlaceholder", "Enter device name...")}
																autoFocus
																onKeyDown={(e) => {
																	if (e.key === "Enter" && editingName.trim()) {
																		updateDeviceNameMutation.mutate({
																			sessionId: session.sessionId,
																			name: editingName.trim(),
																		});
																	} else if (e.key === "Escape") {
																		setEditingSessionId(null);
																	}
																}}
															/>
															<button
																type="button"
																disabled={updateDeviceNameMutation.isPending || !editingName.trim()}
																onClick={() =>
																	updateDeviceNameMutation.mutate({
																		sessionId: session.sessionId,
																		name: editingName.trim(),
																	})
																}
																className="h-7 w-7 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
															>
																<Check className="h-3.5 w-3.5" />
															</button>
															<button
																type="button"
																onClick={() => setEditingSessionId(null)}
																className="h-7 w-7 flex items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 cursor-pointer"
															>
																<X className="h-3.5 w-3.5" />
															</button>
														</div>
													) : (
														<div className="flex items-center gap-1.5">
															<h4 className="font-bold text-sm text-slate-900 dark:text-white">
																{session.deviceName || `${session.deviceType} (${session.platform})`}
															</h4>
															<button
																type="button"
																onClick={() => {
																	setEditingSessionId(session.sessionId);
																	setEditingName(session.deviceName || "");
																}}
																title={t("profile.sessionsCard.renameDevice", "Rename Device")}
																className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
															>
																<Edit3 className="h-3 w-3" />
															</button>
														</div>
													)}

													{/* Badges */}
													{session.isCurrent && (
														<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
															<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
															{t("profile.sessionsCard.currentDeviceBadge", "Active Now • This Device")}
														</span>
													)}

													{session.isNewDevice ? (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
															<ShieldAlert className="h-2.5 w-2.5" />
															{t("profile.sessionsCard.newDeviceBadge", "New Device (< 7 days)")}
														</span>
													) : (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
															{t("profile.sessionsCard.establishedBadge", "Established Device")}
														</span>
													)}
												</div>

												{/* Metadata Row */}
												<div className="flex items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
													<span>
														<span className="font-medium text-slate-400">{t("profile.sessionsCard.platform", "Platform")}:</span>{" "}
														{session.platform} • {session.deviceType}
													</span>
													<span>
														<span className="font-medium text-slate-400">{t("profile.sessionsCard.ipAddress", "IP")}:</span>{" "}
														<code className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">
															{session.ipAddress || "Unknown"}
														</code>
													</span>
													<span>
														<span className="font-medium text-slate-400">{t("profile.sessionsCard.firstLogin", "Logged in")}:</span>{" "}
														{formatDateTime(session.loginAt)}
													</span>
													<span title={formatDateTime(session.lastActiveAt)}>
														<span className="font-medium text-slate-400">{t("profile.sessionsCard.lastActivity", "Last active")}:</span>{" "}
														<span className="font-semibold text-slate-700 dark:text-slate-200">
															{formatRelativeTime(session.lastActiveAt)}
														</span>
													</span>
												</div>
											</div>
										</div>

										{/* Right: Action */}
										<div className="mt-3 sm:mt-0 flex items-center justify-end w-full sm:w-auto shrink-0">
											{session.isCurrent ? (
												<ModernButton
													variant="outline"
													size="sm"
													onClick={async () => {
														try {
															await authApi.signOut();
														} finally {
															clearClientSession();
															window.location.href = "/sign-in";
														}
													}}
													leftIcon={<LogOut className="h-3.5 w-3.5 text-slate-500" />}
													className="text-xs text-slate-600 dark:text-slate-300"
												>
													{t("profile.sessionsCard.signOutCurrentButton", "Sign Out This Device")}
												</ModernButton>
											) : (
												<ModernButton
													variant="outline"
													size="sm"
													disabled={isCurrentDeviceNew}
													title={
														isCurrentDeviceNew
															? t(
																	"profile.sessionsCard.newDeviceCannotRevokeTooltip",
																	"New devices (< 7 days) cannot revoke other sessions",
															  )
															: undefined
													}
													onClick={() => {
														if (isCurrentDeviceNew) {
															toast.error(
																t(
																	"profile.sessionsCard.newDeviceCannotRevokeTooltip",
																	"New devices (< 7 days) cannot revoke other sessions",
																),
															);
															return;
														}
														setSessionToRevoke(session);
													}}
													leftIcon={
														isCurrentDeviceNew ? (
															<Lock className="h-3.5 w-3.5 text-slate-400" />
														) : (
															<Trash2 className="h-3.5 w-3.5 text-rose-500" />
														)
													}
													className={`text-xs ${
														isCurrentDeviceNew
															? "opacity-60 cursor-not-allowed text-slate-400 border-slate-200 dark:border-slate-800"
															: "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/30"
													}`}
												>
													{t("profile.sessionsCard.revokeButton", "Revoke Session")}
												</ModernButton>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ============================================================ */}
			{/* MODAL 1: Revoke Specific Session Confirmation */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={Boolean(sessionToRevoke)}
				onClose={() => setSessionToRevoke(null)}
				title={t("profile.sessionsCard.confirmRevokeTitle", "Revoke Device Session?")}
				size="md"
				icon={<Trash2 className="h-5 w-5 text-rose-600" />}
				footer={
					<div className="flex items-center justify-end gap-2 w-full">
						<ModernButton
							variant="outline"
							size="sm"
							onClick={() => setSessionToRevoke(null)}
						>
							{t("profile.sessionsCard.cancelAction", "Cancel")}
						</ModernButton>
						<ModernButton
							variant="destructive"
							size="sm"
							disabled={isCurrentDeviceNew}
							isLoading={revokeSessionMutation.isPending}
							onClick={() => {
								if (sessionToRevoke && !isCurrentDeviceNew) {
									revokeSessionMutation.mutate(sessionToRevoke.sessionId);
								}
							}}
						>
							{t("profile.sessionsCard.confirmAction", "Confirm & Revoke")}
						</ModernButton>
					</div>
				}
			>
				<div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300">
					{isCurrentDeviceNew ? (
						<div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
							<AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
							<span>
								{t(
									"profile.sessionsCard.newDeviceBlockedNotice",
									"Your current device is newly logged in (< 7 days) and cannot terminate other sessions due to security restrictions.",
								)}
							</span>
						</div>
					) : (
						<>
							<p>
								{t(
									"profile.sessionsCard.confirmRevokeDesc",
									"This will terminate the session on \"{{deviceName}}\". The user on that device will be signed out immediately.",
									{ deviceName: sessionToRevoke?.deviceName || "the selected device" },
								)}
							</p>

							{sessionToRevoke && !sessionToRevoke.isNewDevice && (
								<div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
									<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
									<span>
										{t(
											"profile.sessionsCard.establishedWarning",
											"Note: Established devices can only be terminated from another established device (>= 7 days old).",
										)}
									</span>
								</div>
							)}
						</>
					)}
				</div>
			</ModernModal>

			{/* ============================================================ */}
			{/* MODAL 2: Revoke All Other Devices Confirmation */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={isRevokeOthersModalOpen}
				onClose={() => setIsRevokeOthersModalOpen(false)}
				title={t("profile.sessionsCard.confirmRevokeOthersTitle", "Sign Out All Other Devices?")}
				size="md"
				icon={<LogOut className="h-5 w-5 text-amber-600" />}
				footer={
					<div className="flex items-center justify-end gap-2 w-full">
						<ModernButton
							variant="outline"
							size="sm"
							onClick={() => setIsRevokeOthersModalOpen(false)}
						>
							{t("profile.sessionsCard.cancelAction", "Cancel")}
						</ModernButton>
						<ModernButton
							variant="gradient"
							size="sm"
							disabled={isCurrentDeviceNew}
							isLoading={revokeOthersMutation.isPending}
							onClick={() => {
								if (!isCurrentDeviceNew) {
									revokeOthersMutation.mutate();
								}
							}}
						>
							{t("profile.sessionsCard.confirmAction", "Sign Out Others")}
						</ModernButton>
					</div>
				}
			>
				<div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300">
					{isCurrentDeviceNew ? (
						<div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
							<AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
							<span>
								{t(
									"profile.sessionsCard.newDeviceBlockedNotice",
									"Your current device is newly logged in (< 7 days) and cannot terminate other sessions due to security restrictions.",
								)}
							</span>
						</div>
					) : (
						<>
							<p>
								{t(
									"profile.sessionsCard.confirmRevokeOthersDesc",
									"Are you sure you want to sign out all other devices? Only your current device session will remain active.",
								)}
							</p>
							<p className="text-xs text-slate-500">
								{t("profile.sessionsCard.revokeOthersCountNotice", "Total devices to be revoked: {{count}}", {
									count: otherSessionsCount,
								})}
							</p>
						</>
					)}
				</div>
			</ModernModal>

			{/* ============================================================ */}
			{/* MODAL 3: Global Sign Out Confirmation */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={isRevokeAllModalOpen}
				onClose={() => setIsRevokeAllModalOpen(false)}
				title={t("profile.sessionsCard.confirmRevokeAllTitle", "Global Sign Out Across All Devices?")}
				size="md"
				icon={<Trash2 className="h-5 w-5 text-rose-600" />}
				footer={
					<div className="flex items-center justify-end gap-2 w-full">
						<ModernButton
							variant="outline"
							size="sm"
							onClick={() => setIsRevokeAllModalOpen(false)}
						>
							{t("profile.sessionsCard.cancelAction", "Cancel")}
						</ModernButton>
						<ModernButton
							variant="destructive"
							size="sm"
							isLoading={revokeAllMutation.isPending}
							onClick={() => revokeAllMutation.mutate()}
						>
							{t("profile.sessionsCard.globalSignOutButton", "Global Sign Out")}
						</ModernButton>
					</div>
				}
			>
				<div className="space-y-3 py-2 text-sm text-slate-600 dark:text-slate-300">
					<p>
						{t(
							"profile.sessionsCard.confirmRevokeAllDesc",
							"Are you sure you want to sign out from ALL devices including this current one? You will be redirected to the sign-in screen.",
						)}
					</p>
				</div>
			</ModernModal>
		</div>
	);
}

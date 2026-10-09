"use client";

import React, { useState } from "react";
import {
	Sun,
	Sunrise,
	Sunset,
	Moon,
	Globe,
	Palette,
	User,
	Settings,
	Building2,
	Activity,
	HelpCircle,
	LogOut,
	ChevronDown,
	ShieldCheck,
	ShieldAlert,
	Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useCustomTheme } from "@/components/custom-theme-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi, fileUrl } from "@/lib/api/endpoints";
import { clearClientSession } from "@/lib/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanySwitcher } from "@/components/header/company-switcher";
import { LanguageSwitcher } from "@/components/header/language-switcher";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { isUserSystemAdmin } from "@/components/providers/company-context";
import { useRouter } from "next/navigation";
import { clearAuthCookies } from "@/app/actions/auth";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

function getTimeGreetingType(): "morning" | "afternoon" | "evening" | "night" {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 12) {
		return "morning";
	}
	if (hour >= 12 && hour < 17) {
		return "afternoon";
	}
	if (hour >= 17 && hour < 21) {
		return "evening";
	}
	return "night";
}

function subscribeMinute(callback: () => void) {
	const id = setInterval(callback, 60000);
	return () => clearInterval(id);
}

function getGreetingTypeClient(): "morning" | "afternoon" | "evening" | "night" {
	return getTimeGreetingType();
}

function getGreetingTypeServer(): "morning" | "afternoon" | "evening" | "night" {
	return "morning";
}

function HeaderGreeting() {
	const { t } = useTranslation();
	const greetingType = React.useSyncExternalStore(
		subscribeMinute,
		getGreetingTypeClient,
		getGreetingTypeServer,
	);

	const greetingText = React.useMemo(() => {
		switch (greetingType) {
			case "morning":
				return t("header.goodMorning");
			case "afternoon":
				return t("header.goodAfternoon");
			case "evening":
				return t("header.goodEvening");
			case "night":
				return t("header.goodNight");
			default:
				return t("header.goodDay");
		}
	}, [greetingType, t]);

	const renderIcon = () => {
		switch (greetingType) {
			case "morning":
				return (
					<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400 shrink-0 shadow-2xs">
						<Sunrise className="h-4 w-4" />
					</div>
				);
			case "afternoon":
				return (
					<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400 shrink-0 shadow-2xs">
						<Sun className="h-4 w-4" />
					</div>
				);
			case "evening":
				return (
					<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 dark:bg-orange-400/15 dark:text-orange-400 shrink-0 shadow-2xs">
						<Sunset className="h-4 w-4" />
					</div>
				);
			case "night":
				return (
					<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:bg-indigo-400/15 dark:text-indigo-400 shrink-0 shadow-2xs">
						<Moon className="h-4 w-4" />
					</div>
				);
			default:
				return (
					<div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-400/15 dark:text-amber-400 shrink-0 shadow-2xs">
						<Sun className="h-4 w-4" />
					</div>
				);
		}
	};

	return (
		<>
			{renderIcon()}
			<span suppressHydrationWarning>{greetingText}</span>
		</>
	);
}

export function Header() {
	const router = useRouter();
	const { setTheme, theme } = useTheme();
	const { setIsCustomizerOpen } = useCustomTheme();
	const { t } = useTranslation();

	const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 5 * 60 * 1000,
	});

	const isSystemAdmin = isUserSystemAdmin(userProfile);
	const userName = userProfile?.firstName
		? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
		: userProfile?.displayName || userProfile?.username || "";
	const companyName =
		userProfile?.company?.name || userProfile?.companyName || "";
	const userRole = userProfile?.username
		? `@${userProfile.username}`
		: isSystemAdmin
			? "@system_admin"
			: userProfile?.roles?.[0]?.name
				? `@${userProfile.roles[0].name.toLowerCase()}`
				: "";

	const queryClient = useQueryClient();

	const handleLogout = async () => {
		try {
			clearClientSession();
			queryClient.clear();
			await clearAuthCookies();
			toast.success(t("header.signedOutSuccess"));
			router.push("/sign-in");
		} catch {
			clearClientSession();
			queryClient.clear();
			router.push("/sign-in");
		}
	};

	const avatarSrc =
		userProfile?.avatarUrl ||
		userProfile?.imageUrl ||
		fileUrl(userProfile?.avatarKey) ||
		"";

	return (
		<header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/82 px-4 shadow-sm shadow-slate-200/40 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/82 dark:shadow-black/20 md:px-8">
			<div className="flex items-center gap-4">
				<SidebarTrigger className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" />

				{/* Welcome Greeting */}
				<div className="hidden sm:block">
					<h2 className="text-base font-bold leading-snug tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
						<HeaderGreeting />
						<span className="inline-flex items-center gap-1">
							{userName ? (
								<span>, {userName}</span>
							) : userProfile?.username ? (
								<span>, {userProfile.username}</span>
							) : isLoadingProfile && !userProfile ? (
								<Skeleton className="h-4 w-28 ml-1 inline-block align-middle" />
							) : null}
						</span>
					</h2>
					<div className="text-xs font-medium text-slate-400 dark:text-slate-500 pl-8 min-h-[18px] flex items-center">
						{isLoadingProfile && !userProfile ? (
							<Skeleton className="h-3 w-40 my-0.5" />
						) : companyName ? (
							<span>{companyName} • {t("common.operationalPortal", "Operational Portal")}</span>
						) : isSystemAdmin ? (
							<span>{t("common.systemAdminPortal", "System Admin Portal")}</span>
						) : (
							<span>{t("common.operationalPortal", "Operational Portal")}</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3 md:gap-4">
				{/* Company Switcher for System Admin */}
				<CompanySwitcher />

				{/* Quick Icon Actions */}
				<div className="flex items-center gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/70">
					{/* Interactive Language Selector */}
					<LanguageSwitcher />

					{/* Interactive Live Notification Center */}
					<NotificationCenter />

					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
						onClick={() => setIsCustomizerOpen(true)}
						title={t("header.customizeTheme")}
					>
						<Palette className="h-4 w-4 text-primary" />
					</Button>

					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
						onClick={() => setTheme(theme === "light" ? "dark" : "light")}
						title={t("header.toggleTheme")}
					>
						<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
						<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					</Button>
				</div>

				{/* Interactive User Profile Dropdown */}
				<div className="border-l border-slate-200/70 pl-2 dark:border-slate-800">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									type="button"
									className="group flex items-center gap-2.5 rounded-2xl p-1.5 transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 cursor-pointer outline-none select-none"
								/>
							}
						>
							<div className="relative">
								<Avatar className="h-9 w-9 rounded-xl border border-primary/20 ring-2 ring-primary/10 shadow-2xs">
									<AvatarImage src={avatarSrc} alt={userName} />
									<AvatarFallback
										className="rounded-xl bg-primary/10 text-xs font-bold text-primary"
									>
										{userProfile?.firstName?.[0] ||
										userProfile?.username?.[0] ? (
											(
												userProfile.firstName?.[0] ||
												userProfile.username?.[0]
											).toUpperCase()
										) : (
											<User className="h-4 w-4" />
										)}
									</AvatarFallback>
								</Avatar>
								<span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
							</div>

							<div className="hidden sm:flex flex-col text-left">
								<span className="text-xs font-bold leading-tight text-slate-950 dark:text-white max-w-[130px] truncate">
									{isLoadingProfile && !userProfile ? (
										<Skeleton className="h-3 w-16 my-0.5" />
									) : (
										companyName ||
										userName ||
										userProfile?.username ||
										t("header.myAccount")
									)}
								</span>
								<span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
									{isLoadingProfile && !userProfile ? (
										<Skeleton className="h-2 w-12" />
									) : (
										userRole || ""
									)}
								</span>
							</div>

							<ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 group-data-open:rotate-180" />
						</DropdownMenuTrigger>

						<DropdownMenuContent
							align="end"
							sideOffset={8}
							className="w-72 rounded-2xl p-2 shadow-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95"
						>
							{/* Account Overview Header */}
							<div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 space-y-2">
								<div className="flex items-center gap-3">
									<Avatar className="h-10 w-10 rounded-xl ring-2 ring-primary/20 shadow-xs">
										<AvatarImage src={avatarSrc} alt={userName} />
										<AvatarFallback
											className="rounded-xl bg-primary/10 text-sm font-bold text-primary"
										>
											{userProfile?.firstName?.[0] ||
											userProfile?.username?.[0] ? (
												(
													userProfile.firstName?.[0] ||
													userProfile.username?.[0]
												).toUpperCase()
											) : (
												<User className="h-4 w-4" />
											)}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="font-bold text-xs text-slate-900 dark:text-white truncate">
											{userName ||
												userProfile?.username ||
												t("header.myAccount")}
										</p>
										<p className="text-[11px] text-slate-400 truncate">
											{userProfile?.email ||
												(userProfile?.username
													? `@${userProfile.username}`
													: "")}
										</p>
									</div>
								</div>

								<div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px]">
									<Badge
										variant="outline"
										className={
											isSystemAdmin
												? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[9px] px-1.5 py-0"
												: "border-primary/20 bg-primary/10 text-primary font-bold text-[9px] px-1.5 py-0"
										}
									>
										{isSystemAdmin
											? t("header.superAdmin")
											: t("header.companyUser")}
									</Badge>

									{userProfile?.roles?.length > 0 && (
										<span className="text-slate-400 font-medium truncate max-w-[120px]">
											{userProfile.roles[0].name}
										</span>
									)}
								</div>
							</div>

							<DropdownMenuSeparator className="my-1.5" />

							{/* Navigation Items */}
							<DropdownMenuGroup>
								<DropdownMenuItem
									onClick={() => router.push("/profile")}
									className="cursor-pointer rounded-xl py-2 px-2.5 font-semibold text-xs text-slate-700 dark:text-slate-200 gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-primary/10 focus:text-primary transition-colors"
								>
									<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									<span>{t("header.myProfileAndAccount")}</span>
									<span className="ml-auto text-[10px] text-slate-400 font-normal">
										{t("header.profileDetails")}
									</span>
								</DropdownMenuItem>

								<DropdownMenuItem
									onClick={() =>
										router.push(
											isSystemAdmin
												? "/super-admin/configurations"
												: "/configurations",
										)
									}
									className="cursor-pointer rounded-xl py-2 px-2.5 font-semibold text-xs text-slate-700 dark:text-slate-200 gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-primary/10 focus:text-primary transition-colors"
								>
									<Settings className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
									<span>{t("header.configurations")}</span>
									<span className="ml-auto text-[10px] text-slate-400 font-normal">
										{t("header.settings")}
									</span>
								</DropdownMenuItem>

								{/* <DropdownMenuItem
                  onClick={() => router.push("/audit-logs")}
                  className="cursor-pointer rounded-xl py-2 px-2.5 font-semibold text-xs text-slate-700 dark:text-slate-200 gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-primary/10 focus:text-primary transition-colors"
                >
                  <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span>{t("header.auditLogs")}</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">{t("header.logs")}</span>
                </DropdownMenuItem> */}
								{/* 
                <DropdownMenuItem
                  onClick={() => setIsCustomizerOpen(true)}
                  className="cursor-pointer rounded-xl py-2 px-2.5 font-semibold text-xs text-slate-700 dark:text-slate-200 gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-primary/10 focus:text-primary transition-colors"
                >
                  <Palette className="h-4 w-4 text-amber-500" />
                  <span>{t("header.themeAndAppearance")}</span>
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">{t("header.colors")}</span>
                </DropdownMenuItem> */}

								<DropdownMenuItem
									onClick={() => router.push("/feedback")}
									className="cursor-pointer rounded-xl py-2 px-2.5 font-semibold text-xs text-slate-700 dark:text-slate-200 gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-primary/10 focus:text-primary transition-colors"
								>
									<HelpCircle className="h-4 w-4 text-sky-500" />
									<span>{t("header.feedbackAndSupport")}</span>
									<span className="ml-auto text-[10px] text-slate-400 font-normal">
										{t("header.help")}
									</span>
								</DropdownMenuItem>
							</DropdownMenuGroup>

							<DropdownMenuSeparator className="my-1.5" />

							{/* Sign Out */}
							<DropdownMenuItem
								onClick={handleLogout}
								className="cursor-pointer rounded-xl py-2 px-2.5 font-bold text-xs text-rose-600 dark:text-rose-400 gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:bg-rose-50 dark:focus:bg-rose-950/40 focus:text-rose-600 transition-colors"
							>
								<LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
								<span>{t("header.signOutAccount")}</span>
								<span className="ml-auto text-[10px] text-rose-400 font-normal">
									{t("header.exit")}
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}

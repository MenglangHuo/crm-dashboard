"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTheme } from "next-themes";
import { authApi } from "@/lib/api/endpoints";
import { setAuthCookies } from "@/app/actions/auth";
import { clearClientSession, getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Eye,
	EyeOff,
	Loader2,
	Lock,
	Mail,
	Building2,
	Crown,
	Sparkles,
	ShieldCheck,
	ArrowRight,
	Sun,
	Moon,
	ArrowUpRight,
	Check,
	ShieldUser,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/header/language-switcher";
import { useTranslation } from "@/lib/i18n/context";

const formSchema = z.object({
	username: z.string().min(1, "Username or email is required"),
	password: z.string().min(1, "Password is required"),
});

const demoAccounts = [
	{
		role: "System Admin",
		username: "bronx@dmin",
		password: "Bronx@dmin123!",
		icon: Crown,
	},
	{
		role: "Company User",
		username: "bronx",
		password: "Bronx@123",
		icon: Building2,
	},
];

function getSafeReturnUrl(value: string | null) {
	if (!value) return "/";
	let cleanValue = value;
	try {
		cleanValue = decodeURIComponent(value);
		if (cleanValue.includes("%")) {
			cleanValue = decodeURIComponent(cleanValue);
		}
	} catch {}

	if (
		!cleanValue ||
		cleanValue.startsWith("/sign-in") ||
		cleanValue.startsWith("/forgot-password") ||
		cleanValue.startsWith("/reset-password") ||
		cleanValue.startsWith("/register-company")
	) {
		return "/";
	}
	return cleanValue.startsWith("/") && !cleanValue.startsWith("//")
		? cleanValue
		: "/";
}

/**
 * Modern Security Guard Protection Logo Emblem
 */
function SecurityGuardEmblem({ className = "h-14 w-14 sm:h-16 sm:w-16" }: { className?: string }) {
	return (
		<div className="group/security relative flex items-center justify-center">
			{/* Ambient glowing aura */}
			<div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 opacity-40 blur-xl transition-all duration-500 group-hover/security:opacity-60 group-hover/security:blur-2xl" />

			<div
				className={`${className} relative flex items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 p-3 shadow-xl shadow-blue-500/30 border border-white/25 overflow-hidden transition-all duration-300 group-hover/security:scale-105`}
			>
				{/* Glass Specular Curved Reflection */}
				<div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-[22px]" />

				<ShieldUser className="relative z-10 h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-md stroke-[2.2]" />
			</div>
		</div>
	);
}

/**
 * Minimalist Theme Toggle Button
 */
function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return <div className="h-8 w-8" />;

	const isDark = theme === "dark";

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? (
				<Sun className="h-4 w-4 text-amber-400" />
			) : (
				<Moon className="h-4 w-4 text-slate-700" />
			)}
		</button>
	);
}

function SignInForm() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const returnUrl = getSafeReturnUrl(
		searchParams.get("returnUrl") || searchParams.get("from"),
	);
	const queryUsername = searchParams.get("username");
	const isRegistered = searchParams.get("registered") === "true";
	const isPasswordReset = searchParams.get("passwordReset") === "true";

	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			username: queryUsername || "",
			password: "",
		},
	});

	// Clear lingering previous session & cached profile on arrival to sign-in page
	useEffect(() => {
		clearClientSession();
	}, []);

	// Auto-fill username and notify if redirected from company registration or password reset
	useEffect(() => {
		if (queryUsername) {
			form.setValue("username", queryUsername, { shouldValidate: true });
		}
		if (isRegistered) {
			toast.success(
				"Company registered successfully! Your administrator username has been filled. Please enter your password to sign in.",
			);
		} else if (isPasswordReset) {
			toast.success(
				"Password updated successfully! Please enter your new password to sign in.",
			);
		}
	}, [queryUsername, isRegistered, isPasswordReset, form]);

	const fillDemoAccount = (acc: (typeof demoAccounts)[0]) => {
		setSelectedDemo(acc.username);
		form.setValue("username", acc.username, { shouldValidate: true });
		form.setValue("password", acc.password, { shouldValidate: true });
		toast.info(`Loaded ${acc.role} credentials. Click Sign In to enter.`, {
			duration: 2200,
		});
	};

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);
		try {
			const response: any = await authApi.signIn({
				username: values.username,
				password: values.password,
			});

			const token =
				response?.accessToken ||
				response?.token ||
				response?.data?.accessToken ||
				response?.data?.token;

			const refreshToken =
				response?.refreshToken || response?.data?.refreshToken;

			const companyId = response?.company?.id || response?.data?.company?.id;

			// Check if password reset is required by admin
			const passwordResetRequired =
				response?.passwordResetRequired ??
				response?.data?.passwordResetRequired;
			const passwordResetToken =
				response?.passwordResetToken ??
				response?.data?.passwordResetToken;

			if (passwordResetRequired && passwordResetToken) {
				toast.info(
					"An administrator has reset your password. Please set a new password to continue.",
				);
				window.location.href = `/reset-password?token=${encodeURIComponent(passwordResetToken)}&forced=true&identifier=${encodeURIComponent(values.username)}`;
				return;
			}

			if (token) {
				clearClientSession();
				if (typeof window !== "undefined") {
					document.cookie = `crm_access_token=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
					localStorage.setItem("crm_access_token", token);
					if (refreshToken) {
						document.cookie = `crm_refresh_token=${encodeURIComponent(refreshToken)}; path=/; max-age=2592000; SameSite=Lax`;
						localStorage.setItem("crm_refresh_token", refreshToken);
					}
					if (companyId != null) {
						document.cookie = `crm_company_id=${encodeURIComponent(companyId)}; path=/; max-age=2592000; SameSite=Lax`;
						localStorage.setItem("crm_company_id", String(companyId));
					}
					const isCompleteVal =
						response?.isCompleteSetup ??
						response?.data?.isCompleteSetup ??
						response?.user?.isCompleteSetup ??
						response?.data?.user?.isCompleteSetup ??
						response?.isCompletedSetup ??
						response?.data?.isCompletedSetup ??
						response?.user?.isCompletedSetup ??
						response?.data?.user?.isCompletedSetup ??
						response?.completedSetup ??
						response?.data?.completedSetup ??
						response?.user?.completedSetup;
					if (isCompleteVal !== undefined) {
						document.cookie = `crm_is_complete_setup=${encodeURIComponent(String(isCompleteVal))}; path=/; max-age=604800; SameSite=Lax`;
						localStorage.setItem("crm_is_complete_setup", String(isCompleteVal));
					}
					const userData = response?.user || response?.data?.user;
					if (userData) {
						try {
							localStorage.setItem("crm_user_profile", JSON.stringify(userData));
						} catch {}
					}
				}
				await setAuthCookies(token, refreshToken, companyId);
				toast.success("Authentication successful! Welcome back.");

				window.location.href = returnUrl;
			} else {
				toast.error("Invalid credentials or server response");
			}
		} catch (error) {
			toast.error(getErrorMessage(error));
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main className="min-h-screen w-full flex flex-col justify-between items-center p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 selection:bg-blue-600 selection:text-white overflow-x-hidden">
			{/* Ambient background glow elements */}
			<div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl dark:from-blue-600/15 dark:via-indigo-600/10" />
			<div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/5" />

			{/* Subtle dotted matrix grid texture */}
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] dark:opacity-50" />

			{/* Top Bar with Brand, Language Switcher & Theme Toggle */}
			<header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-2 pt-1 sm:pt-2 shrink-0">
				<div className="flex items-center gap-2">
					<span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
					<span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
						Bronx <span className="text-blue-600 dark:text-blue-400">CRM</span>
					</span>
				</div>

				{/* Controls pill: Language Switcher + Theme Toggle */}
				<div className="flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/80 px-2 py-1 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
					<LanguageSwitcher />
					<div className="h-4 w-px bg-slate-200 dark:bg-slate-800 my-auto" />
					<ThemeToggle />
				</div>
			</header>

			{/* Centered Elevated Sign-In Card: 75% height of screen with spacious proportional width */}
			<section className="relative z-10 flex flex-1 items-center justify-center w-full my-auto py-2">
				<div className="h-[75vh] max-h-[750px] min-h-[530px] w-full max-w-[480px] sm:max-w-[500px] rounded-3xl border border-slate-200/80 bg-white/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl flex flex-col justify-between transition-all dark:border-slate-800/80 dark:bg-slate-900/95 dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
					{/* Top Header: Security Guard Emblem & Title */}
					<div className="flex flex-col items-center text-center shrink-0">
						<SecurityGuardEmblem className="h-14 w-14 sm:h-16 sm:w-16" />
						<h1 className="mt-2.5 font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-[25px] dark:text-white leading-tight">
							{t("auth.signInTitle", "Welcome back")}
						</h1>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
							{t("auth.signInSubtitle", "Sign in to your enterprise management dashboard")}
						</p>
					</div>

					{/* 1-Click Quick Demo Access: Clean & Spacious */}
					<div className="my-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800/80 dark:bg-slate-950/40 shrink-0">
						<div className="mb-1.5 flex items-center justify-between px-1">
							<span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								<Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
								{t("auth.quickDemoAccess", "Quick Demo Access")}
							</span>
							<span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
								{t("auth.oneClickAutoFill", "1-Click Auto Fill")}
							</span>
						</div>
						<div className="grid grid-cols-2 gap-2">
							{demoAccounts.map((acc) => {
								const Icon = acc.icon;
								const isSelected = selectedDemo === acc.username;
								const localizedRole =
									acc.role === "System Admin"
										? t("auth.systemAdmin", "System Admin")
										: t("auth.companyUser", "Company User");
								return (
									<button
										key={acc.username}
										type="button"
										onClick={() => fillDemoAccount(acc)}
										className={`group relative flex h-9.5 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-all duration-200 cursor-pointer ${
											isSelected
												? "border-blue-500 bg-blue-50/90 text-blue-900 shadow-xs ring-2 ring-blue-500/20 dark:border-blue-500/80 dark:bg-blue-950/40 dark:text-blue-100"
												: "border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
										}`}
									>
										<Icon
											className={`h-3.5 w-3.5 ${
												isSelected
													? "text-blue-600 dark:text-blue-400"
													: "text-slate-500 dark:text-slate-400"
											}`}
										/>
										<span className="truncate">{localizedRole}</span>
										{isSelected && (
											<Check className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
										)}
									</button>
								);
							})}
						</div>
					</div>

					{/* Sign In Form */}
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-3 sm:space-y-3.5 shrink-0"
						noValidate
					>
						{/* Username / Email Input */}
						<div className="space-y-1.5">
							<label
								htmlFor="username"
								className="text-xs font-semibold text-slate-700 dark:text-slate-300"
							>
								{t("auth.usernameOrEmail", "Email Address or Username")}
							</label>
							<div className="relative group/field">
								<div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-blue-600 dark:group-focus-within/field:text-blue-400">
									<Mail className="h-4.5 w-4.5" />
								</div>
								<Input
									id="username"
									type="text"
									autoComplete="username"
									spellCheck="false"
									autoCapitalize="none"
									required
									placeholder={t(
										"auth.usernameOrEmailPlaceholder",
										"bronx@dmin or your.email@company.com",
									)}
									{...form.register("username")}
									className="h-11 sm:h-12 rounded-xl border-slate-200/90 bg-slate-50/50 pl-11 pr-4 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-950"
								/>
							</div>
							{form.formState.errors.username && (
								<p className="text-[11px] font-medium text-rose-500">
									{form.formState.errors.username.message}
								</p>
							)}
						</div>

						{/* Password Input */}
						<div className="space-y-1.5">
							<div className="flex items-center justify-between">
								<label
									htmlFor="password"
									className="text-xs font-semibold text-slate-700 dark:text-slate-300"
								>
									{t("auth.password", "Password")}
								</label>
								<Link
									href="/forgot-password"
									className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
								>
									{t("auth.forgotPassword", "Forgot Password?")}
								</Link>
							</div>
							<div className="relative group/field">
								<div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/field:text-blue-600 dark:group-focus-within/field:text-blue-400">
									<Lock className="h-4.5 w-4.5" />
								</div>
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									required
									placeholder={t("auth.passwordPlaceholder", "••••••••••••")}
									{...form.register("password")}
									className="h-11 sm:h-12 rounded-xl border-slate-200/90 bg-slate-50/50 pl-11 pr-11 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:bg-slate-950"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
									aria-label={showPassword ? "Hide password" : "Show password"}
									aria-pressed={showPassword}
								>
									{showPassword ? (
										<EyeOff className="h-4.5 w-4.5" />
									) : (
										<Eye className="h-4.5 w-4.5" />
									)}
								</button>
							</div>
							{form.formState.errors.password && (
								<p className="text-[11px] font-medium text-rose-500">
									{form.formState.errors.password.message}
								</p>
							)}
						</div>

						{/* Primary Sign In Button */}
						<Button
							type="submit"
							className="group relative mt-1 flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:shadow-blue-600/35 hover:scale-[1.008] active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
							disabled={isLoading}
						>
							{isLoading ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-4.5 w-4.5 animate-spin" />
									{t("auth.signingIn", "Signing In...")}
								</span>
							) : (
								<span className="flex items-center justify-center gap-2">
									<span>{t("auth.signInButton", "Sign In to Dashboard")}</span>
									<ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
								</span>
							)}
						</Button>
					</form>

					{/* Card Footer: Register Organization Link & Security Badge */}
					<div className="border-t border-slate-100 pt-2.5 text-center dark:border-slate-800 shrink-0 space-y-1.5">
						<p className="text-xs text-slate-500 dark:text-slate-400">
							{t("auth.needOnboard", "Need to onboard a new organization?")}{" "}
							<Link
								href="/register-company"
								className="font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1 transition-colors"
							>
								<span>{t("auth.registerCompany", "Register Company")}</span>
								<ArrowUpRight className="h-3 w-3" />
							</Link>
						</p>
						<div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
							<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
							<span>{t("auth.sslEncrypted", "256-bit SSL encrypted • Enterprise access control")}</span>
						</div>
					</div>
				</div>
			</section>

			{/* Minimalist Bottom Footer */}
			<footer className="relative z-10 text-center text-xs text-slate-400 dark:text-slate-500 pb-1 shrink-0">
				<p>© {new Date().getFullYear()} Bronx CRM Platform. {t("auth.allRightsReserved", "All rights reserved.")}</p>
			</footer>
		</main>
	);
}

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
					<Loader2 className="h-7 w-7 animate-spin text-blue-600" />
				</div>
			}
		>
			<SignInForm />
		</Suspense>
	);
}

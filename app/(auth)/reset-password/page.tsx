"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authApi } from "@/lib/api/endpoints";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Loader2,
	AlertCircle,
	Lock,
	ArrowLeft,
	Eye,
	EyeOff,
	ShieldCheck,
	CheckCircle2,
	Shield,
	LogIn,
	KeyRound,
} from "lucide-react";
import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

const formSchema = z
	.object({
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

function PasswordSecurityIllustrationSvg() {
	return (
		<div className="group/security relative flex h-16 w-16 items-center justify-center rounded-full cursor-pointer">
			{/* Outer pulsating glow ring */}
			<div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-60 blur-md transition-all duration-300 group-hover/security:opacity-100 group-hover/security:blur-lg" />

			{/* Main Emblem Circle */}
			<div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-3.5 shadow-lg ring-2 ring-white dark:ring-slate-800 transform transition-transform duration-300 group-hover/security:scale-105 text-white">
				<KeyRound className="h-7 w-7 text-white drop-shadow-md" />
			</div>
		</div>
	);
}

function ResetPasswordForm() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const identifier = searchParams.get("identifier") || "";
	const isForced = searchParams.get("forced") === "true";
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	});

	const mutation = useMutation({
		mutationFn: (values: z.infer<typeof formSchema>) => {
			if (isForced) {
				return authApi.setNewPassword({
					resetToken: token!,
					newPassword: values.password,
					confirmPassword: values.confirmPassword,
				});
			}
			return authApi.resetPassword({
				identifier,
				resetToken: token!,
				newPassword: values.password,
			});
		},
		onSuccess: (_, variables) => {
			toast.success(
				"Password set successfully. You can now sign in with your new password.",
			);
			const params = new URLSearchParams();
			if (identifier) {
				params.set("username", identifier);
			}
			if (variables.password) {
				params.set("password", variables.password);
			}
			params.set("passwordReset", "true");
			router.push(`/sign-in?${params.toString()}`);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		if (!token) {
			toast.error("Missing verification token.");
			return;
		}
		if (!isForced && !identifier) {
			toast.error("Missing identifier.");
			return;
		}
		mutation.mutate(values);
	};

	if (!token) {
		return (
			<main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950">
				<div className="w-full max-w-[420px] rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 sm:p-7 text-center space-y-4">
					<div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900">
						<AlertCircle className="h-7 w-7" />
					</div>
					<div>
						<h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
							Invalid or Missing Token
						</h2>
						<p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
							{isForced
								? "Your password reset session has expired or is invalid. Please sign in again."
								: "Please request a new password reset OTP code."}
						</p>
					</div>
					<Button
						className="h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
						onClick={() => router.push(isForced ? "/sign-in" : "/forgot-password")}
					>
						{isForced ? "Back to Sign In" : "Request Reset Code"}
					</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950">
			{/* Floating Compact White Card matching Sign-In */}
			<div className="w-full max-w-[420px] rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 sm:p-7">
				{/* Top Navigation */}
				<div className="mb-3">
					<Link
						href={
							identifier
								? `/sign-in?username=${encodeURIComponent(identifier)}`
								: "/sign-in"
						}
						className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
					>
						<ArrowLeft className="h-3.5 w-3.5 mr-1" />
						{t("auth.backToSignIn", "Back to sign in")}
					</Link>
				</div>

				{/* Security Emblem & Title Header */}
				<div className="flex flex-col items-center text-center">
					<PasswordSecurityIllustrationSvg />
					<h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						{isForced
							? t("auth.setNewPasswordTitle", "Set New Password")
							: t("auth.resetPasswordTitle", "Reset Password")}
					</h2>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
						{t(
							"auth.resetPasswordSubtitle",
							"Enter your new password below",
						)}
						{identifier ? (
							<>
								{" "}
								(
								<span className="font-semibold text-slate-800 dark:text-slate-200">
									{identifier}
								</span>
								)
							</>
						) : null}
						.
					</p>
				</div>

				{/* Form */}
				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3.5">
					{/* New Password Field */}
					<div className="space-y-1">
						<label
							htmlFor="password"
							className="text-xs font-bold text-slate-700 dark:text-slate-300"
						>
							{t("auth.newPassword", "New Password")}
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
								<Lock className="h-4 w-4" />
							</div>
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder={t("auth.passwordPlaceholder", "••••••••••••")}
								autoComplete="new-password"
								{...form.register("password")}
								className="h-10 rounded-xl border-slate-200 bg-slate-50/50 pl-9 pr-10 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<EyeOff className="h-3.5 w-3.5" />
								) : (
									<Eye className="h-3.5 w-3.5" />
								)}
							</button>
						</div>
						{form.formState.errors.password && (
							<p className="text-[11px] font-medium text-rose-500">
								{form.formState.errors.password.message}
							</p>
						)}
					</div>

					{/* Confirm Password Field */}
					<div className="space-y-1">
						<label
							htmlFor="confirmPassword"
							className="text-xs font-bold text-slate-700 dark:text-slate-300"
						>
							{t("auth.confirmPassword", "Confirm Password")}
						</label>
						<div className="relative">
							<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
								<Lock className="h-4 w-4" />
							</div>
							<Input
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								placeholder={t("auth.confirmPasswordPlaceholder", "Re-enter new password")}
								autoComplete="new-password"
								{...form.register("confirmPassword")}
								className="h-10 rounded-xl border-slate-200 bg-slate-50/50 pl-9 pr-10 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
								aria-label={
									showConfirmPassword ? "Hide password" : "Show password"
								}
							>
								{showConfirmPassword ? (
									<EyeOff className="h-3.5 w-3.5" />
								) : (
									<Eye className="h-3.5 w-3.5" />
								)}
							</button>
						</div>
						{form.formState.errors.confirmPassword && (
							<p className="text-[11px] font-medium text-rose-500">
								{form.formState.errors.confirmPassword.message}
							</p>
						)}
					</div>

					{/* Save New Password Button */}
					<Button
						type="submit"
						className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
						disabled={mutation.isPending}
					>
						{mutation.isPending ? (
							<span className="flex items-center gap-2">
								<Loader2 className="h-3.5 w-3.5 animate-spin" />
								{t("auth.savingPassword", "Saving...")}
							</span>
						) : (
							<span className="flex items-center justify-center gap-2">
								<ShieldCheck className="h-3.5 w-3.5" />
								{t("auth.saveNewPassword", "Save New Password & Sign In")}
							</span>
						)}
					</Button>
				</form>

				{/* Sign In Link */}
				<div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
					<p className="text-xs text-slate-600 dark:text-slate-400">
						{t("auth.alreadyHaveAccount", "Already have an account? Sign In")}{" "}
						<Link
							href={
								identifier
									? `/sign-in?username=${encodeURIComponent(identifier)}`
									: "/sign-in"
							}
							className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 transition-colors"
						>
							<LogIn className="h-3.5 w-3.5" />
							{t("auth.signInButton", "Sign In")}
						</Link>
					</p>
				</div>

				{/* Security Footer Badges */}
				<div className="mt-3 flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
					<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
					<span className="text-[11px] font-medium">
						{t("auth.sslEncrypted", "256-bit SSL encrypted • Enterprise access control")}
					</span>
				</div>
			</div>
		</main>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
					<Loader2 className="h-7 w-7 animate-spin text-blue-600" />
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}

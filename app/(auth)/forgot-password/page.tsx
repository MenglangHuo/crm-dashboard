"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import { useTranslation } from "@/lib/i18n/context";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
	ArrowLeft,
	CheckCircle2,
	KeyRound,
	Loader2,
	LogIn,
	Mail,
	Send,
	ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const step1Schema = z.object({
	identifier: z.string().min(3, "Please enter your email or phone number"),
});

const step2Schema = z.object({
	otpCode: z.string().min(4, "Please enter the OTP code sent to your device"),
});

function ForgotPasswordIllustrationSvg({ isStep2 }: { isStep2: boolean }) {
	return (
		<div className="group/security relative flex h-16 w-16 items-center justify-center rounded-full cursor-pointer">
			{/* Outer pulsating glow ring */}
			<div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-60 blur-md transition-all duration-300 group-hover/security:opacity-100 group-hover/security:blur-lg" />

			{/* Main Emblem Circle */}
			<div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 p-3.5 shadow-lg ring-2 ring-white dark:ring-slate-800 transform transition-transform duration-300 group-hover/security:scale-105 text-white">
				{isStep2 ? (
					<KeyRound className="h-7 w-7 text-white drop-shadow-md" />
				) : (
					<Mail className="h-7 w-7 text-white drop-shadow-md" />
				)}
			</div>
		</div>
	);
}

export default function ForgotPasswordPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [step, setStep] = useState<1 | 2>(1);
	const [identifier, setIdentifier] = useState("");

	const formStep1 = useForm<z.infer<typeof step1Schema>>({
		resolver: zodResolver(step1Schema),
		defaultValues: { identifier: "" },
	});

	const formStep2 = useForm<z.infer<typeof step2Schema>>({
		resolver: zodResolver(step2Schema),
		defaultValues: { otpCode: "" },
	});

	const forgotMutation = useMutation({
		mutationFn: authApi.forgotPassword,
		onSuccess: (_, variables) => {
			toast.success("Password reset OTP has been sent!");
			setIdentifier(variables.identifier);
			setStep(2);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const verifyOtpMutation = useMutation({
		mutationFn: authApi.verifyResetOtp,
		onSuccess: (data) => {
			toast.success("OTP verified successfully!");
			const token = data?.resetToken || "VERIFIED";
			router.push(
				`/reset-password?identifier=${encodeURIComponent(identifier)}&token=${encodeURIComponent(token)}`,
			);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const onSubmitStep1 = (values: z.infer<typeof step1Schema>) => {
		forgotMutation.mutate({ identifier: values.identifier });
	};

	const onSubmitStep2 = (values: z.infer<typeof step2Schema>) => {
		verifyOtpMutation.mutate({ identifier, otpCode: values.otpCode });
	};

	return (
		<main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-100 dark:bg-slate-950">
			{/* Floating Compact White Card matching Sign-In */}
			<div className="w-full max-w-[420px] rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 sm:p-7">
				{/* Top Navigation */}
				<div className="mb-3">
					<Link
						href="/sign-in"
						className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
					>
						<ArrowLeft className="h-3.5 w-3.5 mr-1" />
						{t("auth.backToSignIn", "Back to sign in")}
					</Link>
				</div>

				{/* Emblem & Header */}
				<div className="flex flex-col items-center text-center">
					<ForgotPasswordIllustrationSvg isStep2={step === 2} />
					<h2 className="mt-2.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
						{step === 1
							? t("auth.forgotPasswordTitle", "Forgot Password")
							: t("auth.verifyResetOtpTitle", "Verify Reset OTP")}
					</h2>
					<p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
						{step === 1 ? (
							t(
								"auth.forgotPasswordSubtitle",
								"Enter your email address or phone number to receive a verification OTP code.",
							)
						) : (
							<>
								{t(
									"auth.verifyOtpSubtitle",
									"Enter the verification OTP code sent to {{identifier}}.",
									{ identifier },
								)}
							</>
						)}
					</p>
				</div>

				{step === 1 ? (
					<form
						onSubmit={formStep1.handleSubmit(onSubmitStep1)}
						className="mt-5 space-y-3.5"
					>
						<div className="space-y-1">
							<label
								htmlFor="identifier"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								{t("auth.emailOrPhone", "Email Address or Phone Number")}
							</label>
							<div className="relative">
								<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
									<Mail className="h-4 w-4" />
								</div>
								<Input
									id="identifier"
									placeholder={t(
										"auth.emailOrPhonePlaceholder",
										"name@company.com or 012345678",
									)}
									autoComplete="username"
									{...formStep1.register("identifier")}
									className="h-10 rounded-xl border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
								/>
							</div>
							{formStep1.formState.errors.identifier && (
								<p className="text-[11px] font-medium text-rose-500">
									{formStep1.formState.errors.identifier.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
							disabled={forgotMutation.isPending}
						>
							{forgotMutation.isPending ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									{t("auth.sendingOtp", "Sending OTP...")}
								</span>
							) : (
								<span className="flex items-center justify-center gap-2">
									<Send className="h-3.5 w-3.5" />
									{t("auth.sendVerificationCode", "Send Verification Code")}
								</span>
							)}
						</Button>
					</form>
				) : (
					<form
						onSubmit={formStep2.handleSubmit(onSubmitStep2)}
						className="mt-5 space-y-3.5"
					>
						<div className="space-y-1">
							<label
								htmlFor="otpCode"
								className="text-xs font-bold text-slate-700 dark:text-slate-300"
							>
								{t("auth.enterOtpCode", "Verification Code")}
							</label>
							<div className="relative">
								<div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
									<KeyRound className="h-4 w-4" />
								</div>
								<Input
									id="otpCode"
									placeholder={t("auth.otpPlaceholder", "••••••")}
									maxLength={6}
									{...formStep2.register("otpCode")}
									className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-9 pr-3 text-center font-mono text-base tracking-widest text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
								/>
							</div>
							{formStep2.formState.errors.otpCode && (
								<p className="text-[11px] font-medium text-rose-500">
									{formStep2.formState.errors.otpCode.message}
								</p>
							)}
						</div>

						<Button
							type="submit"
							className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 cursor-pointer"
							disabled={verifyOtpMutation.isPending}
						>
							{verifyOtpMutation.isPending ? (
								<span className="flex items-center gap-2">
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									{t("auth.verifying", "Verifying...")}
								</span>
							) : (
								<span className="flex items-center justify-center gap-2">
									<CheckCircle2 className="h-3.5 w-3.5" />
									{t("auth.verifyOtpAndContinue", "Verify OTP & Continue")}
								</span>
							)}
						</Button>

						<div className="text-center pt-1">
							<button
								type="button"
								onClick={() => setStep(1)}
								className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
							>
								Didn&apos;t receive code? Resend OTP
							</button>
						</div>
					</form>
				)}

				{/* Sign In Link */}
				<div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
					<p className="text-xs text-slate-600 dark:text-slate-400">
						Remember your credentials?{" "}
						<Link
							href="/sign-in"
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

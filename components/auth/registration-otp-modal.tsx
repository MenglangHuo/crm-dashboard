"use client";

import React, { useState, useEffect } from "react";
import {
	ShieldCheck,
	Loader2,
	RotateCcw,
	ArrowRight,
	CheckCircle2,
	Phone,
	Mail,
	MessageSquare,
	AlertCircle,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OtpPinInput } from "@/components/auth/otp-pin-input";
import { authApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RegistrationOtpModalProps {
	isOpen: boolean;
	onClose: () => void;
	phoneNumber: string;
	email?: string;
	onVerified: (registrationToken: string) => void;
}

export function RegistrationOtpModal({
	isOpen,
	onClose,
	phoneNumber,
	email,
	onVerified,
}: RegistrationOtpModalProps) {
	const [otpCode, setOtpCode] = useState("");
	const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
	const [isSending, setIsSending] = useState(false);
	const [isVerifying, setIsVerifying] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [countdown, setCountdown] = useState(60);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Reset state and trigger initial send when modal opens
	useEffect(() => {
		if (isOpen) {
			setOtpCode("");
			setErrorMessage(null);
			setIsSuccess(false);
			setCountdown(60);
			// Auto send OTP if not sent yet
			sendOtp(channel);
		}
	}, [isOpen]);

	// Countdown effect
	useEffect(() => {
		if (!isOpen || countdown <= 0) return;
		const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [isOpen, countdown]);

	const sendOtp = async (selectedChannel: "SMS" | "EMAIL" = channel) => {
		setIsSending(true);
		setErrorMessage(null);
		const identifier = selectedChannel === "SMS" ? phoneNumber.trim() : (email?.trim() || phoneNumber.trim());

		try {
			await authApi.sendRegistrationOtp({
				identifier,
				channel: selectedChannel,
			});
			setCountdown(60);
			toast.success(`Verification code sent via ${selectedChannel} to ${identifier}`);
		} catch (err: any) {
			const msg = getErrorMessage(err) || `Failed to dispatch ${selectedChannel} verification code`;
			setErrorMessage(msg);
			toast.error(msg);
		} finally {
			setIsSending(false);
		}
	};

	const handleVerify = async (codeToVerify: string = otpCode) => {
		if (!codeToVerify || codeToVerify.length !== 6) {
			setErrorMessage("Please enter all 6 digits of your verification code");
			return;
		}

		setIsVerifying(true);
		setErrorMessage(null);

		const identifier = channel === "SMS" ? phoneNumber.trim() : (email?.trim() || phoneNumber.trim());

		try {
			const res = await authApi.verifyRegistrationOtp({
				identifier,
				otpCode: codeToVerify,
			});

			const token = (res as any)?.registrationToken || (res as any)?.data?.registrationToken;
			if (!token) {
				throw new Error("No registration token returned from verification server");
			}

			setIsSuccess(true);
			toast.success("Phone verified successfully!");

			setTimeout(() => {
				onVerified(token);
				onClose();
			}, 700);
		} catch (err: any) {
			const msg = getErrorMessage(err) || "Invalid or expired verification code. Please check and try again.";
			setErrorMessage(msg);
			setOtpCode("");
		} finally {
			setIsVerifying(false);
		}
	};

	if (!isOpen) return null;

	const targetDisplay = channel === "SMS" ? phoneNumber : (email || phoneNumber);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
				onClick={() => {
					if (!isVerifying && !isSuccess) onClose();
				}}
			/>

			{/* Modal Card */}
			<div className="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/60 z-10 space-y-5 animate-in zoom-in-95 duration-200">
				{/* Close Button */}
				<button
					type="button"
					onClick={onClose}
					disabled={isVerifying || isSuccess}
					className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
					aria-label="Close dialog"
				>
					<X className="h-4 w-4" />
				</button>

				{/* Header Illustration & Badge */}
				<div className="flex flex-col items-center text-center space-y-2">
					<div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30">
						{isSuccess ? (
							<CheckCircle2 className="h-7 w-7 text-emerald-300 animate-in zoom-in-50 duration-300" />
						) : (
							<ShieldCheck className="h-7 w-7 text-white" />
						)}
					</div>

					<div>
						<h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
							{isSuccess ? "Verification Successful!" : "Verify Phone Number"}
						</h3>
						<p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
							{isSuccess ? (
								"Your administrator credentials have been cryptographically verified."
							) : (
								<>
									We sent a 6-digit verification code to{" "}
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										{targetDisplay}
									</span>
								</>
							)}
						</p>
					</div>

					{/* Delivery Channel Badges (if email is also provided) */}
					{email && !isSuccess && (
						<div className="flex items-center gap-1.5 pt-1">
							<button
								type="button"
								onClick={() => {
									if (channel !== "SMS") {
										setChannel("SMS");
										sendOtp("SMS");
									}
								}}
								disabled={isSending || isVerifying}
								className={cn(
									"flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
									channel === "SMS"
										? "bg-indigo-600 text-white shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								)}
							>
								<Phone className="h-3 w-3" />
								SMS
							</button>

							<button
								type="button"
								onClick={() => {
									if (channel !== "EMAIL") {
										setChannel("EMAIL");
										sendOtp("EMAIL");
									}
								}}
								disabled={isSending || isVerifying}
								className={cn(
									"flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
									channel === "EMAIL"
										? "bg-indigo-600 text-white shadow-xs"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
								)}
							>
								<Mail className="h-3 w-3" />
								Email
							</button>
						</div>
					)}
				</div>

				{/* 6-Digit Segmented PIN Input */}
				{!isSuccess && (
					<div className="space-y-3 py-1">
						<OtpPinInput
							value={otpCode}
							onChange={(val) => {
								setOtpCode(val);
								if (errorMessage) setErrorMessage(null);
							}}
							onComplete={(fullCode) => {
								handleVerify(fullCode);
							}}
							disabled={isVerifying || isSending}
							hasError={Boolean(errorMessage)}
							autoFocus
						/>

						{/* Inline Error Message */}
						{errorMessage && (
							<div className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-rose-500 dark:text-rose-400 animate-in fade-in-50 duration-150">
								<AlertCircle className="h-3.5 w-3.5 shrink-0" />
								<span>{errorMessage}</span>
							</div>
						)}

						{/* Resend & Cooldown */}
						<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1">
							<span>Didn't receive code?</span>
							<button
								type="button"
								onClick={() => sendOtp(channel)}
								disabled={isSending || countdown > 0 || isVerifying}
								className={cn(
									"font-bold text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer",
									(isSending || countdown > 0 || isVerifying) &&
										"opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500"
								)}
							>
								{isSending ? (
									<span className="flex items-center gap-1">
										<Loader2 className="h-3 w-3 animate-spin" />
										Sending...
									</span>
								) : countdown > 0 ? (
									<span>Resend in {countdown}s</span>
								) : (
									<span className="flex items-center gap-1 hover:underline">
										<RotateCcw className="h-3 w-3" />
										Resend Code
									</span>
								)}
							</button>
						</div>
					</div>
				)}

				{/* Actions */}
				{!isSuccess ? (
					<div className="space-y-2 pt-1">
						<Button
							type="button"
							onClick={() => handleVerify()}
							disabled={isVerifying || otpCode.length !== 6 || isSending}
							className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm gap-2 shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
						>
							{isVerifying ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									<span>Verifying Security Code...</span>
								</>
							) : (
								<>
									<span>Verify & Continue</span>
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</Button>

						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={isVerifying}
							className="w-full h-9 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
						>
							Change Phone Number
						</Button>
					</div>
				) : (
					<div className="py-2 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
						<CheckCircle2 className="h-4 w-4" />
						<span>Token generated. Advancing your registration...</span>
					</div>
				)}
			</div>
		</div>
	);
}

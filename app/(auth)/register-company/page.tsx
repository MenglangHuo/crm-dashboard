"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { authApi, publicFilesApi, safeImageUrl } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Building2,
	ShieldCheck,
	User,
	MapPin,
	Lock,
	Mail,
	Phone,
	ArrowRight,
	ArrowLeft,
	CheckCircle2,
	Sparkles,
	Loader2,
	UploadCloud,
	Globe,
	FileText,
	Eye,
	EyeOff,
	Navigation,
	Compass,
	Check,
	Briefcase,
	Layers,
	Image as ImageIcon,
	RotateCcw,
	Send,
	Smartphone,
	AlertCircle,
	BadgeCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	ModernInput,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { OtpPinInput } from "@/components/auth/otp-pin-input";
import { useTranslation } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/header/language-switcher";

// Dynamically load Leaflet Map to avoid SSR window issues
const LeafletMap = dynamic(
	() =>
		import("@/components/customers/leaflet-map").then((mod) => mod.LeafletMap),
	{
		ssr: false,
		loading: () => (
			<div className="h-[320px] w-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400 gap-2">
				<Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
				<span>Loading interactive map picker...</span>
			</div>
		),
	},
);

const registerCompanySchema = z
	.object({
		// Step 1: Administrator Root Credentials
		firstName: z.string().min(1, "First name is required"),
		lastName: z.string().min(1, "Last name is required"),
		adminUsername: z
			.string()
			.min(3, "Admin username must be at least 3 characters")
			.regex(
				/^[a-zA-Z0-9_.-]+$/,
				"Username can only contain letters, numbers, underscores, and dots",
			),
		adminPassword: z
			.string()
			.min(6, "Password must be at least 6 characters")
			.regex(/[A-Z]/, "Password should contain at least one uppercase letter")
			.regex(/[0-9]/, "Password should contain at least one number"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
		adminPhone: z.string().min(6, "Valid phone number is required"),
		adminEmail: z
			.string()
			.email("Invalid email address")
			.optional()
			.or(z.literal("")),

		// Step 2: Verification
		registrationToken: z
			.string()
			.min(1, "Phone verification via OTP is required"),

		// Step 3: Company Profile & Location
		companyName: z
			.string()
			.min(2, "Company name must be at least 2 characters"),
		businessId: z.string().min(2, "Business Tax / Registration ID is required"),
		uploadUrl: z.string().optional(),
		note: z.string().optional(),
		address: z.string().optional(),
		lat: z.number().optional(),
		lng: z.number().optional(),
	})
	.refine((data) => data.adminPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

type RegisterCompanyFormValues = z.infer<typeof registerCompanySchema>;

const CITY_PRESETS = [
	{ name: "Phnom Penh, KH", lat: 11.5564, lng: 104.9282 },
	{ name: "New York, USA", lat: 40.7128, lng: -74.006 },
	{ name: "Singapore, SG", lat: 1.3521, lng: 103.8198 },
	{ name: "Bangkok, TH", lat: 13.7563, lng: 100.5018 },
	{ name: "London, UK", lat: 51.5074, lng: -0.1278 },
];

const STEPS = [
	{
		step: 1,
		title: "1. Administrator",
		subtitle: "Root Credentials",
		icon: User,
	},
	{
		step: 2,
		title: "2. Verify Phone",
		subtitle: "SMS Security Code",
		icon: ShieldCheck,
	},
	{
		step: 3,
		title: "3. Company Profile",
		subtitle: "Workspace & Location",
		icon: Building2,
	},
];

export default function RegisterCompanyPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isUploadingLogo, setIsUploadingLogo] = useState(false);

	// OTP Verification State
	const [otpCode, setOtpCode] = useState("");
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
	const [countdown, setCountdown] = useState(0);
	const [verifiedPhone, setVerifiedPhone] = useState("");

	// Final Success Screen State
	const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);
	const [registeredDetails, setRegisteredDetails] = useState<{
		companyName: string;
		adminUsername: string;
	} | null>(null);

	// Map Position State
	const [selectedCoords, setSelectedCoords] = useState<{
		lat: number;
		lng: number;
	}>({
		lat: 11.5564,
		lng: 104.9282,
	});

	const form = useForm<RegisterCompanyFormValues>({
		resolver: zodResolver(registerCompanySchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			adminUsername: "",
			adminPassword: "",
			confirmPassword: "",
			adminPhone: "",
			adminEmail: "",
			registrationToken: "",
			companyName: "",
			businessId: "",
			uploadUrl: "",
			note: "",
			address: "",
			lat: 11.5564,
			lng: 104.9282,
		},
		mode: "onBlur",
	});

	const {
		register,
		watch,
		setValue,
		trigger,
		getValues,
		formState: { errors },
	} = form;

	const watchedValues = watch();
	const watchedCompanyName = watch("companyName");
	const watchedBusinessId = watch("businessId");
	const watchedLogoUrl = watch("uploadUrl");
	const watchedUsername = watch("adminUsername");
	const watchedFirstName = watch("firstName");
	const watchedLastName = watch("lastName");
	const watchedPhone = watch("adminPhone");
	const watchedToken = watch("registrationToken");
	const isPhoneVerified = Boolean(
		watchedToken && watchedPhone && watchedPhone === verifiedPhone,
	);

	// Live 60-second Countdown Timer
	useEffect(() => {
		if (countdown <= 0) return;
		const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [countdown]);

	// Invalidate token if phone is edited after verification
	useEffect(() => {
		if (verifiedPhone && watchedPhone !== verifiedPhone) {
			setValue("registrationToken", "", { shouldValidate: true });
			setOtpCode("");
		}
	}, [watchedPhone, verifiedPhone, setValue]);

	// Step 1 -> Step 2: Send OTP
	const handleSendOtp = async () => {
		const isBasicValid = await trigger([
			"firstName",
			"lastName",
			"adminUsername",
			"adminPassword",
			"confirmPassword",
			"adminPhone",
			"adminEmail",
		]);

		if (!isBasicValid) {
			toast.error("Please complete all required administrator credentials");
			return;
		}

		const phone = getValues("adminPhone").trim();
		setIsSendingOtp(true);
		setOtpErrorMessage(null);

		try {
			await authApi.sendRegistrationOtp({
				identifier: phone,
				channel: "SMS",
			});
			setCountdown(60);
			setOtpCode("");
			setCurrentStep(2);
			toast.success(`Verification code sent via SMS to ${phone}`);
		} catch (err: any) {
			const msg =
				getErrorMessage(err) ||
				"Failed to send verification code. Please check your phone number.";
			toast.error(msg);
		} finally {
			setIsSendingOtp(false);
		}
	};

	// Resend OTP from Step 2
	const handleResendOtp = async () => {
		if (countdown > 0 || isSendingOtp) return;
		const phone = getValues("adminPhone").trim();
		setIsSendingOtp(true);
		setOtpErrorMessage(null);

		try {
			await authApi.sendRegistrationOtp({
				identifier: phone,
				channel: "SMS",
			});
			setCountdown(60);
			setOtpCode("");
			toast.success(`New verification code sent to ${phone}`);
		} catch (err: any) {
			const msg =
				getErrorMessage(err) || "Failed to resend code. Please try again.";
			toast.error(msg);
			setOtpErrorMessage(msg);
		} finally {
			setIsSendingOtp(false);
		}
	};

	// Step 2 -> Step 3: Verify OTP Code
	const handleVerifyOtp = async (codeToVerify?: string) => {
		const targetCode = (codeToVerify || otpCode).trim();
		if (targetCode.length !== 6) {
			setOtpErrorMessage("Please enter all 6 digits of the OTP code");
			return;
		}

		const phone = getValues("adminPhone").trim();
		setIsVerifyingOtp(true);
		setOtpErrorMessage(null);

		try {
			const res = await authApi.verifyRegistrationOtp({
				identifier: phone,
				otpCode: targetCode,
			});

			const token =
				(res as any)?.registrationToken || (res as any)?.data?.registrationToken;
			if (!token) {
				throw new Error("No verification token received from server");
			}

			setValue("registrationToken", token, { shouldValidate: true });
			setVerifiedPhone(phone);
			toast.success("Phone verified! Proceed to company information.");
			setCurrentStep(3);
		} catch (err: any) {
			const msg =
				getErrorMessage(err) ||
				"Invalid or expired verification code. Please try again.";
			setOtpErrorMessage(msg);
			toast.error(msg);
		} finally {
			setIsVerifyingOtp(false);
		}
	};

	// Logo Upload Handler
	const uploadImage = async (file: File) => {
		if (!file.type.startsWith("image/")) {
			toast.error("Please upload a valid image file");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Logo file size cannot exceed 5MB");
			return;
		}

		setIsUploadingLogo(true);
		try {
			const res = await publicFilesApi.uploadImage(file, {
				category: "ORGANIZATION",
				description: `Company logo for ${watchedCompanyName || "new company"}`,
			});
			const imageUrl = res.imageUrl || res.url;
			if (!imageUrl) {
				throw new Error("No image URL returned from upload server");
			}
			setValue("uploadUrl", imageUrl, { shouldValidate: true });
			toast.success("Company logo uploaded successfully");
		} catch (err: any) {
			toast.error(
				getErrorMessage(err) || "Failed to upload logo. Please try again.",
			);
		} finally {
			setIsUploadingLogo(false);
		}
	};

	const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await uploadImage(file);
		if (e.target) e.target.value = "";
	};

	// Map Pin Position Handler
	const handleSelectMapPosition = (pos: { lat: number; lng: number }) => {
		setSelectedCoords(pos);
		setValue("lat", Number(pos.lat.toFixed(6)), { shouldValidate: true });
		setValue("lng", Number(pos.lng.toFixed(6)), { shouldValidate: true });
		toast.info(`Coordinates set: ${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
	};

	// GPS Current Location Handler
	const handleUseCurrentLocation = () => {
		if (!navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const coords = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				};
				handleSelectMapPosition(coords);
				toast.success("Detected your current GPS location!");
			},
			() => {
				toast.error(
					"Unable to retrieve your current location. Please pick on map.",
				);
			},
		);
	};

	// Step 3 Final Submission
	const onSubmit = async (values: RegisterCompanyFormValues) => {
		if (!values.registrationToken || values.registrationToken.trim() === "") {
			toast.error("Please verify your phone number before completing registration");
			setCurrentStep(2);
			return;
		}

		setIsSubmitting(true);
		try {
			const payload = {
				companyName: values.companyName.trim(),
				businessId: values.businessId.trim(),
				lat: values.lat ? Number(values.lat) : selectedCoords.lat,
				lng: values.lng ? Number(values.lng) : selectedCoords.lng,
				uploadUrl: values.uploadUrl || undefined,
				imageUrl: values.uploadUrl || undefined,
				adminUsername: values.adminUsername.trim(),
				adminPassword: values.adminPassword,
				adminPhone: values.adminPhone.trim(),
				adminEmail: values.adminEmail?.trim() || undefined,
				firstName: values.firstName.trim(),
				lastName: values.lastName.trim(),
				address: values.address?.trim() || undefined,
				note: values.note?.trim() || undefined,
				registrationToken: values.registrationToken,
			};

			await authApi.registerCompany(payload);

			setRegisteredDetails({
				companyName: values.companyName.trim(),
				adminUsername: values.adminUsername.trim(),
			});
			setIsRegisteredSuccess(true);
			toast.success("Company registered successfully! Welcome aboard.");

			// Auto redirect after 2.5 seconds
			setTimeout(() => {
				const query = new URLSearchParams({
					username: values.adminUsername.trim(),
					password: values.adminPassword,
					registered: "true",
				}).toString();

				router.push(`/sign-in?${query}`);
			}, 2500);
		} catch (err: any) {
			toast.error(
				getErrorMessage(err) || "Failed to register company. Please try again.",
			);
			setIsSubmitting(false);
		}
	};

	return (
		<main className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 overflow-y-auto py-5 px-4 sm:px-6 lg:px-8 pb-24">
			<div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
				{/* Top Navigation & Header */}
				<div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
							<Building2 className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
								{t("auth.registerCompanyTitle", "Register New Organization")}
							</h1>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{t(
									"auth.registerCompanySubtitle",
									"Setup root admin, verify credentials, and launch your enterprise workspace",
								)}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Link
							href="/sign-in"
							className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all"
						>
							<User className="h-3.5 w-3.5" />
							{t("auth.alreadyHaveAccount", "Already have an account? Sign In")}
						</Link>
					</div>
				</div>

				{/* Step Progress Bar */}
				{!isRegisteredSuccess && (
					<div className="grid grid-cols-3 gap-2 sm:gap-3">
						{STEPS.map((s) => {
							const isCompleted = currentStep > s.step;
							const isActive = currentStep === s.step;
							const Icon = s.icon;
							return (
								<div
									key={s.step}
									className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all text-left ${
										isActive
											? "bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-600/10 ring-2 ring-indigo-500/20"
											: isCompleted
												? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
												: "bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60"
									}`}
								>
									<div
										className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
											isActive
												? "bg-indigo-600 text-white shadow-xs"
												: isCompleted
													? "bg-emerald-600 text-white"
													: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
										}`}
									>
										{isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
									</div>
									<div className="min-w-0 flex-1">
										<div
											className={`text-xs font-bold truncate ${
												isActive
													? "text-indigo-600 dark:text-indigo-400"
													: isCompleted
														? "text-emerald-700 dark:text-emerald-300"
														: "text-slate-700 dark:text-slate-300"
											}`}
										>
											{s.title}
										</div>
										<div className="text-[10px] text-slate-400 truncate hidden sm:block">
											{s.subtitle}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Celebration Screen on Success */}
				{isRegisteredSuccess ? (
					<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center shadow-2xl space-y-6 max-w-xl mx-auto animate-in zoom-in-95 duration-300">
						<div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30">
							<CheckCircle2 className="h-10 w-10 text-white animate-in zoom-in-50 duration-300" />
						</div>

						<div className="space-y-2">
							<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-3 py-1">
								Workspace Provisioned Successfully
							</Badge>
							<h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
								Welcome to {registeredDetails?.companyName}!
							</h2>
							<p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
								Your company tenant resources, default roles, permissions, and administrator account (
								<span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
									@{registeredDetails?.adminUsername}
								</span>
								) have been fully initialized.
							</p>
						</div>

						<div className="pt-2">
							<Button
								onClick={() => {
									const query = new URLSearchParams({
										username: registeredDetails?.adminUsername || "",
										registered: "true",
									}).toString();
									router.push(`/sign-in?${query}`);
								}}
								className="h-12 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 gap-2 cursor-pointer"
							>
								<span>Launch CRM Workspace</span>
								<ArrowRight className="h-4 w-4" />
							</Button>
						</div>

						<p className="text-xs text-slate-400">
							Redirecting to sign-in portal in a moment...
						</p>
					</div>
				) : (
					/* Main 2-Column Registration Layout */
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
						{/* Left Form Area (7 Cols) */}
						<div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/40">
							<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
								{/* ============================================================ */}
								{/* STEP 1: Administrator Root Account Credentials */}
								{/* ============================================================ */}
								{currentStep === 1 && (
									<div className="space-y-4 animate-in fade-in-50 duration-200">
										<div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
											<User className="h-5 w-5 text-indigo-600" />
											<div>
												<h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
													Primary System Administrator
												</h3>
												<p className="text-xs text-slate-400">
													Create the root executive credentials and provide phone for OTP security
												</p>
											</div>
										</div>

										{/* First Name & Last Name */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													First Name <span className="text-rose-500">*</span>
												</label>
												<ModernInput
													placeholder="e.g. John"
													{...register("firstName")}
													leftIcon={<User className="h-4 w-4 text-indigo-500" />}
												/>
												{errors.firstName && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.firstName.message}
													</p>
												)}
											</div>

											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Last Name <span className="text-rose-500">*</span>
												</label>
												<ModernInput
													placeholder="e.g. Doe"
													{...register("lastName")}
													leftIcon={<User className="h-4 w-4 text-indigo-500" />}
												/>
												{errors.lastName && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.lastName.message}
													</p>
												)}
											</div>
										</div>

										{/* Admin Username */}
										<div className="space-y-1">
											<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												Admin Username <span className="text-rose-500">*</span>
											</label>
											<ModernInput
												placeholder="e.g. menglanghuo"
												autoComplete="username"
												{...register("adminUsername")}
												leftIcon={<User className="h-4 w-4 text-indigo-500" />}
												className="font-mono font-medium"
											/>
											{errors.adminUsername && (
												<p className="text-[11px] font-medium text-rose-500">
													{errors.adminUsername.message}
												</p>
											)}
										</div>

										{/* Password & Confirm Password */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{/* Password */}
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Password <span className="text-rose-500">*</span>
												</label>
												<div className="relative">
													<ModernInput
														type={showPassword ? "text" : "password"}
														placeholder="e.g. Bron@123"
														autoComplete="new-password"
														{...register("adminPassword")}
														leftIcon={<Lock className="h-4 w-4 text-indigo-500" />}
														className="font-mono font-medium pr-10"
													/>
													<button
														type="button"
														onClick={() => setShowPassword(!showPassword)}
														className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
														tabIndex={-1}
													>
														{showPassword ? (
															<EyeOff className="h-4 w-4" />
														) : (
															<Eye className="h-4 w-4" />
														)}
													</button>
												</div>
												{errors.adminPassword && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.adminPassword.message}
													</p>
												)}
											</div>

											{/* Confirm Password */}
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Confirm Password <span className="text-rose-500">*</span>
												</label>
												<div className="relative">
													<ModernInput
														type={showConfirmPassword ? "text" : "password"}
														placeholder="Repeat password"
														autoComplete="new-password"
														{...register("confirmPassword")}
														leftIcon={<Lock className="h-4 w-4 text-indigo-500" />}
														className="font-mono font-medium pr-10"
													/>
													<button
														type="button"
														onClick={() => setShowConfirmPassword(!showConfirmPassword)}
														className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
														tabIndex={-1}
													>
														{showConfirmPassword ? (
															<EyeOff className="h-4 w-4" />
														) : (
															<Eye className="h-4 w-4" />
														)}
													</button>
												</div>
												{errors.confirmPassword && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.confirmPassword.message}
													</p>
												)}
											</div>
										</div>

										{/* Phone Number & Work Email */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{/* Phone */}
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Primary Phone Number <span className="text-rose-500">*</span>
												</label>
												<ModernInput
													placeholder="e.g. 012345678"
													{...register("adminPhone")}
													leftIcon={<Phone className="h-4 w-4 text-emerald-500" />}
												/>
												{errors.adminPhone && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.adminPhone.message}
													</p>
												)}
												<p className="text-[10px] text-slate-400">
													We will dispatch a 6-digit SMS verification code to this number.
												</p>
											</div>

											{/* Optional Email */}
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Work Email (Optional)
												</label>
												<ModernInput
													type="email"
													placeholder="e.g. admin@acme.com"
													{...register("adminEmail")}
													leftIcon={<Mail className="h-4 w-4 text-blue-500" />}
												/>
												{errors.adminEmail && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.adminEmail.message}
													</p>
												)}
											</div>
										</div>

										{/* Action Button: Send OTP & Proceed to Step 2 */}
										<div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
											<span className="text-[11px] text-slate-400 font-medium">
												Step 1 of 3
											</span>

											<Button
												type="button"
												onClick={handleSendOtp}
												disabled={isSendingOtp}
												className="rounded-xl px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-md shadow-indigo-600/20 text-xs cursor-pointer"
											>
												{isSendingOtp ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														<span>Sending Verification Code...</span>
													</>
												) : (
													<>
														<span>Send OTP & Continue</span>
														<ArrowRight className="h-4 w-4" />
													</>
												)}
											</Button>
										</div>
									</div>
								)}

								{/* ============================================================ */}
								{/* STEP 2: Mobile-Style OTP Verification Screen */}
								{/* ============================================================ */}
								{currentStep === 2 && (
									<div className="space-y-5 animate-in fade-in-50 duration-200 py-2">
										{/* Mobile Verification Frame Container */}
										<div className="max-w-md mx-auto rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-7 shadow-lg space-y-5 text-center">
											{/* Animated Shield / Smartphone Icon */}
											<div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-indigo-600/30">
												<Smartphone className="h-8 w-8 text-white" />
												<div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
													<ShieldCheck className="h-3.5 w-3.5 text-white" />
												</div>
											</div>

											{/* Title & Sent Number with Edit Action */}
											<div className="space-y-1">
												<h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
													Enter Verification Code
												</h3>
												<p className="text-xs text-slate-500 dark:text-slate-400">
													We sent a 6-digit verification code via SMS to
												</p>
												<div className="flex items-center justify-center gap-2 pt-0.5">
													<span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900">
														{watchedPhone}
													</span>
													<button
														type="button"
														onClick={() => setCurrentStep(1)}
														className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
													>
														Change
													</button>
												</div>
											</div>

											{/* Segmented 6-Digit PIN Input */}
											<div className="space-y-3 py-1">
												<OtpPinInput
													value={otpCode}
													onChange={(val) => {
														setOtpCode(val);
														if (otpErrorMessage) setOtpErrorMessage(null);
													}}
													onComplete={(fullCode) => {
														handleVerifyOtp(fullCode);
													}}
													disabled={isVerifyingOtp}
													hasError={Boolean(otpErrorMessage)}
													autoFocus
												/>

												{/* Error Message Hint */}
												{otpErrorMessage && (
													<div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-500 dark:text-rose-400 animate-in fade-in-50 duration-150">
														<AlertCircle className="h-3.5 w-3.5 shrink-0" />
														<span>{otpErrorMessage}</span>
													</div>
												)}

												{/* Cooldown & Resend Link */}
												<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 px-1">
													<span>Didn't receive code?</span>
													<button
														type="button"
														onClick={handleResendOtp}
														disabled={countdown > 0 || isSendingOtp || isVerifyingOtp}
														className={`font-bold text-indigo-600 dark:text-indigo-400 transition-colors ${
															countdown > 0 || isSendingOtp || isVerifyingOtp
																? "opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-500"
																: "cursor-pointer hover:underline"
														}`}
													>
														{isSendingOtp ? (
															<span className="flex items-center gap-1">
																<Loader2 className="h-3 w-3 animate-spin" />
																Sending...
															</span>
														) : countdown > 0 ? (
															<span>Resend in {countdown}s</span>
														) : (
															<span className="flex items-center gap-1">
																<RotateCcw className="h-3 w-3" />
																Resend Code
															</span>
														)}
													</button>
												</div>
											</div>

											{/* Primary Verify Button */}
											<Button
												type="button"
												onClick={() => handleVerifyOtp()}
												disabled={isVerifyingOtp || otpCode.length !== 6}
												className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2 shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
											>
												{isVerifyingOtp ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														<span>Verifying Code...</span>
													</>
												) : (
													<>
														<span>Verify & Continue</span>
														<ArrowRight className="h-4 w-4" />
													</>
												)}
											</Button>
										</div>

										{/* Step Navigation Back */}
										<div className="pt-2 flex items-center justify-between">
											<Button
												type="button"
												variant="outline"
												onClick={() => setCurrentStep(1)}
												className="rounded-xl px-5 h-10 border-slate-200 dark:border-slate-800 text-xs"
											>
												<ArrowLeft className="h-4 w-4 mr-1" />
												<span>Back to Admin Info</span>
											</Button>
										</div>
									</div>
								)}

								{/* ============================================================ */}
								{/* STEP 3: Company Information, Logo & Location Pin */}
								{/* ============================================================ */}
								{currentStep === 3 && (
									<div className="space-y-4 animate-in fade-in-50 duration-200">
										<div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
											<Building2 className="h-5 w-5 text-indigo-600" />
											<div>
												<h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
													Company Profile & Headquarters
												</h3>
												<p className="text-xs text-slate-400">
													Configure your organization brand, registration tax ID, and physical location
												</p>
											</div>
										</div>

										{/* Company Name & Business ID */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Company Name <span className="text-rose-500">*</span>
												</label>
												<ModernInput
													placeholder="e.g. Acme Global Solutions"
													{...register("companyName")}
													leftIcon={<Building2 className="h-4 w-4 text-indigo-500" />}
												/>
												{errors.companyName && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.companyName.message}
													</p>
												)}
											</div>

											<div className="space-y-1">
												<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
													Business / Tax ID <span className="text-rose-500">*</span>
												</label>
												<ModernInput
													placeholder="e.g. TAX-998877"
													{...register("businessId")}
													leftIcon={<FileText className="h-4 w-4 text-indigo-500" />}
													className="font-mono"
												/>
												{errors.businessId && (
													<p className="text-[11px] font-medium text-rose-500">
														{errors.businessId.message}
													</p>
												)}
											</div>
										</div>

										{/* Logo Upload Section */}
										<div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
											<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												Company Logo
											</label>

											<div className="flex items-center gap-3">
												{/* Logo Thumbnail Preview */}
												<div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
													{watchedLogoUrl ? (
														<img
															src={safeImageUrl(watchedLogoUrl)}
															alt="Company Logo Preview"
															className="h-full w-full object-cover"
															onError={(e) => {
																(e.target as any).src =
																	"https://placehold.co/100x100?text=Logo";
															}}
														/>
													) : (
														<Building2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
													)}
												</div>

												{/* Upload Button + Direct URL */}
												<div className="flex-1 space-y-1">
													<div className="flex items-center gap-2">
														<label className="cursor-pointer">
															<input
																type="file"
																accept="image/*"
																onChange={handleLogoUpload}
																className="hidden"
																disabled={isUploadingLogo}
															/>
															<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer">
																{isUploadingLogo ? (
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																) : (
																	<UploadCloud className="h-3.5 w-3.5" />
																)}
																<span>Browse File</span>
															</div>
														</label>
														<span className="text-[11px] text-slate-400">
															or paste image URL:
														</span>
													</div>

													<ModernInput
														placeholder="https://cdn.example.com/logo.png"
														{...register("uploadUrl")}
														leftIcon={<Globe className="h-3.5 w-3.5 text-slate-400" />}
													/>
												</div>
											</div>
										</div>

										{/* Business Note */}
										<div className="space-y-1">
											<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												Business Note / Industry Description
											</label>
											<ModernTextarea
												rows={2}
												placeholder="e.g. Enterprise Supply Chain & Retail Distribution..."
												{...register("note")}
											/>
										</div>

										{/* Headquarters Street Address */}
										<div className="space-y-1">
											<label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												Street / Headquarters Address
											</label>
											<ModernInput
												placeholder="e.g. 123 Innovation Boulevard, Suite 500"
												{...register("address")}
												leftIcon={<MapPin className="h-4 w-4 text-rose-500" />}
											/>
										</div>

										{/* Interactive Map Picker & GPS Presets */}
										<div className="space-y-2">
											<div className="flex flex-wrap items-center justify-between gap-2">
												<div className="flex items-center gap-2">
													<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
														Location Coordinates:
													</span>
													<Badge
														variant="secondary"
														className="font-mono text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200"
													>
														Lat: {selectedCoords.lat.toFixed(4)}, Lng:{" "}
														{selectedCoords.lng.toFixed(4)}
													</Badge>
												</div>

												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={handleUseCurrentLocation}
													className="rounded-xl text-xs h-8 px-2.5 gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
												>
													<Navigation className="h-3 w-3" />
													<span>Detect My GPS</span>
												</Button>
											</div>

											{/* City Quick Presets */}
											<div className="flex items-center gap-1.5 flex-wrap">
												<span className="text-[11px] text-slate-400 mr-1">
													Quick Presets:
												</span>
												{CITY_PRESETS.map((city) => (
													<button
														key={city.name}
														type="button"
														onClick={() =>
															handleSelectMapPosition({
																lat: city.lat,
																lng: city.lng,
															})
														}
														className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
													>
														{city.name}
													</button>
												))}
											</div>

											{/* Leaflet Map */}
											<div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
												<LeafletMap
													height="280px"
													center={[selectedCoords.lat, selectedCoords.lng]}
													zoom={13}
													selectable={true}
													selectedPosition={selectedCoords}
													onSelectPosition={handleSelectMapPosition}
												/>
											</div>
											<span className="text-[10px] text-slate-400 block italic">
												💡 Tip: Click anywhere on the map to pin your headquarters.
											</span>
										</div>

										{/* Pre-Flight Checklist */}
										<div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-50/60 to-indigo-50/60 dark:from-emerald-950/20 dark:to-indigo-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
											<div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
												<span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
													<Sparkles className="h-3.5 w-3.5" /> Launch Checklist
												</span>
												<Badge className="bg-emerald-600 text-white text-[10px]">
													Security Verified ✓
												</Badge>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
												<div className="flex items-center gap-1.5">
													<Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
													<span>Root Admin: @{watchedUsername}</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
													<span>Phone Verified: {watchedPhone}</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
													<span>14-Day Free Enterprise Trial</span>
												</div>
												<div className="flex items-center gap-1.5">
													<Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
													<span>Automatic Permission Seeding</span>
												</div>
											</div>
										</div>

										{/* Final Form Navigation & Submit */}
										<div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
											<Button
												type="button"
												variant="outline"
												onClick={() => setCurrentStep(2)}
												disabled={isSubmitting}
												className="rounded-xl px-5 h-11 border-slate-200 dark:border-slate-800"
											>
												<ArrowLeft className="h-4 w-4 mr-1" />
												<span>Back</span>
											</Button>

											<Button
												type="submit"
												disabled={isSubmitting}
												className="rounded-xl px-7 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-600/25 transition-all gap-2 cursor-pointer disabled:opacity-50"
											>
												{isSubmitting ? (
													<>
														<Loader2 className="h-4 w-4 animate-spin" />
														<span>Provisioning Workspace...</span>
													</>
												) : (
													<>
														<Sparkles className="h-4 w-4" />
														<span>Register & Launch Workspace</span>
													</>
												)}
											</Button>
										</div>
									</div>
								)}
							</form>
						</div>

						{/* Right Live Preview Card (5 Cols) */}
						<div className="lg:col-span-5 space-y-4">
							<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/40 dark:shadow-black/40 space-y-4">
								<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
									<span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
										<Sparkles className="h-3.5 w-3.5" /> Workspace Preview
									</span>
									<Badge
										className={
											isPhoneVerified
												? "bg-emerald-600 text-white text-[10px] py-0.5"
												: "bg-indigo-600 text-white text-[10px] py-0.5"
										}
									>
										{isPhoneVerified ? "Phone Verified ✓" : "Step " + currentStep + " of 3"}
									</Badge>
								</div>

								{/* Company Branding Card */}
								<div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-gradient-to-tr from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-950">
									<div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
										{watchedLogoUrl ? (
											<img
												src={safeImageUrl(watchedLogoUrl)}
												alt="Company Logo"
												className="h-full w-full object-cover"
												onError={(e) => {
													(e.target as any).src =
														"https://placehold.co/100x100?text=Logo";
												}}
											/>
										) : (
											<Building2 className="h-7 w-7 text-indigo-400" />
										)}
									</div>

									<div className="flex-1 min-w-0">
										<h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">
											{watchedCompanyName || "Acme Global Solutions"}
										</h4>
										<div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 truncate">
											ID: {watchedBusinessId || "TAX-8923471"}
										</div>
										<div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
											{watchedValues.note || "Enterprise Operations & Logistics"}
										</div>
									</div>
								</div>

								{/* Summary Details Matrix */}
								<div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
									<div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
										<span>Administrator:</span>
										<span className="font-semibold text-slate-900 dark:text-slate-100">
											{watchedFirstName || watchedLastName
												? `${watchedFirstName} ${watchedLastName}`
												: "John Doe"}
										</span>
									</div>

									<div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
										<span>Username:</span>
										<span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
											{watchedUsername ? `@${watchedUsername}` : "@acme_admin"}
										</span>
									</div>

									<div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
										<span>Contact Phone:</span>
										<div className="flex items-center gap-1.5">
											<span className="font-semibold text-slate-900 dark:text-slate-100">
												{watchedPhone || "012345678"}
											</span>
											{isPhoneVerified ? (
												<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0">
													Verified ✓
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="text-amber-600 border-amber-300 dark:border-amber-700 text-[9px] px-1.5 py-0"
												>
													Unverified
												</Badge>
											)}
										</div>
									</div>

									{watchedValues.adminEmail && (
										<div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
											<span>Work Email:</span>
											<span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
												{watchedValues.adminEmail}
											</span>
										</div>
									)}

									<div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
										<span>Headquarters:</span>
										<span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
											{watchedValues.address || "123 Innovation Boulevard"}
										</span>
									</div>

									<div className="flex justify-between py-1.5">
										<span>Coordinates:</span>
										<span className="font-mono text-slate-900 dark:text-slate-100">
											{selectedCoords.lat.toFixed(4)},{" "}
											{selectedCoords.lng.toFixed(4)}
										</span>
									</div>
								</div>

								{/* Security Assurance Banner */}
								<div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
									<div className="font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
										<ShieldCheck className="h-3.5 w-3.5" /> High-Security Tenant
									</div>
									<p className="text-[11px] text-blue-600 dark:text-blue-400">
										Root administrators are authenticated via cryptographic OTP tokens before workspace tenant provisioning.
									</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</main>
	);
}

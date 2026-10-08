"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernDatePicker,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/api/client";
import { profileApi, usersApi, uploadService, fileUrl } from "@/lib/api/endpoints";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	UserCheck,
	User,
	Users,
	Smile,
	Briefcase,
	BadgeCheck,
	Phone,
	PhoneCall,
	ShieldAlert,
	MapPin,
	Calendar,
	FileText,
	Sparkles,
	Camera,
	Trash2,
	Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const schema = z.object({
	firstname: z.string().min(1, "First name is required"),
	lastname: z.string().min(1, "Last name is required"),
	nickName: z.string().optional(),
	gender: z.enum(["MALE", "FEMALE", "OTHER"]),
	position: z.string().optional(),
	employeeCode: z.string().optional(),
	primaryPhone: z.string().min(5, "Primary phone number is required"),
	secondaryPhone: z.string().optional(),
	emergencyPhone: z.string().optional(),
	dob: z.string().optional(),
	address: z.string().optional(),
	bio: z.string().optional(),
	remark: z.string().optional(),
	imageUrl: z.string().optional(),
	avatarKey: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CompleteProfileModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialData?: any;
}

function normalizeGender(g?: string | null): "MALE" | "FEMALE" | "OTHER" {
	if (!g) return "MALE";
	const upper = String(g).toUpperCase();
	if (upper === "FEMALE") return "FEMALE";
	if (upper === "OTHER") return "OTHER";
	return "MALE";
}

/** Format any date string to DD-MM-YYYY (e.g. 01-03-2001) required by API */
function formatDateToBackend(dateStr?: string | null): string | undefined {
	if (!dateStr || !dateStr.trim()) return undefined;
	const trimmed = dateStr.trim();

	// Check for DD-MM-YYYY or DD/MM/YYYY format
	const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
	if (dmyMatch) {
		const day = dmyMatch[1].padStart(2, "0");
		const month = dmyMatch[2].padStart(2, "0");
		const year = dmyMatch[3];
		return `${day}-${month}-${year}`;
	}

	// Check for YYYY-MM-DD format
	const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
	if (ymdMatch) {
		const year = ymdMatch[1];
		const month = ymdMatch[2].padStart(2, "0");
		const day = ymdMatch[3].padStart(2, "0");
		return `${day}-${month}-${year}`;
	}

	const parsed = new Date(trimmed);
	if (!isNaN(parsed.getTime())) {
		const day = String(parsed.getDate()).padStart(2, "0");
		const month = String(parsed.getMonth() + 1).padStart(2, "0");
		const year = parsed.getFullYear();
		return `${day}-${month}-${year}`;
	}

	return trimmed;
}

export function CompleteProfileModal({
	open,
	onOpenChange,
	initialData,
}: CompleteProfileModalProps) {
	const queryClient = useQueryClient();
	const [previewAvatar, setPreviewAvatar] = useState<string>("");
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			firstname: initialData?.firstname || initialData?.firstName || "",
			lastname: initialData?.lastname || initialData?.lastName || "",
			nickName: initialData?.nickName || "",
			gender: normalizeGender(initialData?.gender),
			position: initialData?.position || "",
			employeeCode: initialData?.employeeCode || "",
			primaryPhone:
				initialData?.primaryPhone ||
				initialData?.phone ||
				initialData?.contact ||
				"",
			secondaryPhone: initialData?.secondaryPhone || "",
			emergencyPhone: initialData?.emergencyPhone || "",
			dob: initialData?.dob || "",
			address: initialData?.address || "",
			bio: initialData?.bio || "",
			remark: initialData?.remark || "",
			imageUrl:
				initialData?.imageUrl ||
				initialData?.avatarUrl ||
				initialData?.avatarKey ||
				"",
			avatarKey: initialData?.avatarKey || "",
		},
	});

	// Resync values when modal opens or initialData changes
	useEffect(() => {
		if (open) {
			form.reset({
				firstname: initialData?.firstname || initialData?.firstName || "",
				lastname: initialData?.lastname || initialData?.lastName || "",
				nickName: initialData?.nickName || "",
				gender: normalizeGender(initialData?.gender),
				position: initialData?.position || "",
				employeeCode: initialData?.employeeCode || "",
				primaryPhone:
					initialData?.primaryPhone ||
					initialData?.phone ||
					initialData?.contact ||
					"",
				secondaryPhone: initialData?.secondaryPhone || "",
				emergencyPhone: initialData?.emergencyPhone || "",
				dob: initialData?.dob || "",
				address: initialData?.address || "",
				bio: initialData?.bio || "",
				remark: initialData?.remark || "",
				imageUrl:
					initialData?.imageUrl ||
					initialData?.avatarUrl ||
					initialData?.avatarKey ||
					"",
				avatarKey: initialData?.avatarKey || "",
			});
			setPreviewAvatar("");
		}
	}, [open, initialData, form]);

	const uploadAvatarFile = async (file: File) => {
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			toast.error("Please select a valid image file (JPG, PNG, WEBP, etc.)");
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image file size must not exceed 5MB");
			return;
		}

		const localPreview = URL.createObjectURL(file);
		setPreviewAvatar(localPreview);
		setIsUploadingAvatar(true);
		const toastId = toast.loading("Uploading profile image...");

		try {
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				folder: "avatars",
			});

			const finalUrl = res.url || res.fileKey || "";
			form.setValue("imageUrl", finalUrl, { shouldDirty: true });
			form.setValue("avatarKey", finalUrl, { shouldDirty: true });

			if (initialData?.id) {
				try {
					await usersApi.updateUserImageUrl(initialData.id, finalUrl);
				} catch (err) {
					console.warn(
						"Immediate updateUserImageUrl patch failed, will sync upon complete setup:",
						err,
					);
				}
			}

			toast.dismiss(toastId);
			toast.success("Profile image uploaded successfully!");
		} catch (error) {
			toast.dismiss(toastId);
			toast.error("Failed to upload profile image: " + getErrorMessage(error));
			setPreviewAvatar("");
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			uploadAvatarFile(file);
		}
		if (e.target) e.target.value = "";
	};

	const handleRemoveAvatar = () => {
		setPreviewAvatar("");
		form.setValue("imageUrl", "", { shouldDirty: true });
		form.setValue("avatarKey", "", { shouldDirty: true });
		toast.info("Profile photo removed");
	};

	const mutation = useMutation({
		mutationFn: profileApi.completeSetup,
		onSuccess: () => {
			toast.success("Profile setup completed successfully!");
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			queryClient.invalidateQueries({ queryKey: ["current-user"] });
			queryClient.invalidateQueries({ queryKey: ["auth-me"] });
			queryClient.invalidateQueries({ queryKey: ["users"] });
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const onSubmit = (data: FormValues) => {
		const formattedDob = formatDateToBackend(data.dob);
		const finalAvatar = data.imageUrl || data.avatarKey || undefined;

		mutation.mutate({
			...data,
			firstName: data.firstname,
			lastName: data.lastname,
			phone: data.primaryPhone,
			contact: data.primaryPhone,
			dob: formattedDob,
			imageUrl: finalAvatar,
			avatarKey: finalAvatar,
			avatarUrl: finalAvatar,
			isCompletedSetup: true,
		});
	};

	// Identity card values
	const userDisplayName = useMemo(() => {
		const first =
			form.watch("firstname") ||
			initialData?.firstName ||
			initialData?.firstname ||
			"";
		const last =
			form.watch("lastname") ||
			initialData?.lastName ||
			initialData?.lastname ||
			"";
		const full = `${first} ${last}`.trim();
		return (
			full ||
			initialData?.displayName ||
			initialData?.username ||
			"User Account"
		);
	}, [
		form.watch("firstname"),
		form.watch("lastname"),
		initialData?.firstName,
		initialData?.firstname,
		initialData?.lastName,
		initialData?.lastname,
		initialData?.displayName,
		initialData?.username,
	]);

	const userInitials = useMemo(() => {
		const first =
			form.watch("firstname") ||
			initialData?.firstName ||
			initialData?.firstname ||
			"";
		const last =
			form.watch("lastname") ||
			initialData?.lastName ||
			initialData?.lastname ||
			"";
		const fChar = first ? first[0].toUpperCase() : "";
		const lChar = last ? last[0].toUpperCase() : "";
		if (fChar || lChar) return `${fChar}${lChar}`;
		if (initialData?.username)
			return initialData.username.substring(0, 2).toUpperCase();
		return "U";
	}, [
		form.watch("firstname"),
		form.watch("lastname"),
		initialData?.firstName,
		initialData?.firstname,
		initialData?.lastName,
		initialData?.lastname,
		initialData?.username,
	]);

	const avatarSrc = useMemo(() => {
		if (previewAvatar) return previewAvatar;
		const formImg = form.watch("imageUrl") || form.watch("avatarKey");
		if (formImg) return fileUrl(formImg);
		if (initialData?.avatarKey) return fileUrl(initialData.avatarKey);
		if (initialData?.avatarUrl) return initialData.avatarUrl;
		if (initialData?.imageUrl) return initialData.imageUrl;
		return "";
	}, [
		previewAvatar,
		form.watch("imageUrl"),
		form.watch("avatarKey"),
		initialData,
	]);

	const genderOptions = useMemo(
		() => [
			{ value: "MALE", label: "Male" },
			{ value: "FEMALE", label: "Female" },
			{ value: "OTHER", label: "Other" },
		],
		[],
	);

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			onOpenChange={onOpenChange}
			title="Complete User Profile Information"
			subtitle="Please fill in your user profile details to activate full system access."
			icon={<UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
			size="lg"
			draggable
			resizable
			glassmorphism
			isLoading={mutation.isPending}
			loadingText="Saving profile information..."
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={() => onOpenChange(false)}
						disabled={mutation.isPending}
					/>
					<ModernModalSubmitButton
						form="complete-profile-form"
						type="submit"
						isLoading={mutation.isPending}
						loadingText="Saving Profile..."
						onClick={form.handleSubmit(onSubmit)}
					>
						Save Profile Info
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form
				id="complete-profile-form"
				onSubmit={form.handleSubmit(onSubmit)}
				className="space-y-5"
			>
				{/* Top Identity Banner */}
				<div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-indigo-50/70 via-slate-50/50 to-white p-4 dark:border-slate-800 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-slate-950 shadow-2xs">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3.5">
							<div className="relative group shrink-0">
								<div
									onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
									className="relative cursor-pointer rounded-full"
									title="Click to change profile picture"
								>
									<Avatar className="h-14 w-14 ring-2 ring-indigo-500/30 group-hover:ring-indigo-500/60 shadow-xs transition-all overflow-hidden">
										<AvatarImage
											src={avatarSrc}
											alt={userDisplayName}
											className="object-cover"
										/>
										<AvatarFallback className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
											{userInitials}
										</AvatarFallback>
									</Avatar>
									{/* Hover overlay & uploading spinner */}
									<div
										className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/40 text-white transition-opacity ${
											isUploadingAvatar
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100"
										}`}
									>
										{isUploadingAvatar ? (
											<Loader2 className="h-5 w-5 animate-spin text-white" />
										) : (
											<Camera className="h-5 w-5 text-white drop-shadow-sm" />
										)}
									</div>
								</div>

								{/* Camera badge button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										fileInputRef.current?.click();
									}}
									disabled={isUploadingAvatar}
									aria-label="Upload profile image"
									className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 transition-colors cursor-pointer"
									title="Change profile picture"
								>
									<Camera className="h-3 w-3" />
								</button>
							</div>

							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleAvatarFileChange}
							/>

							<div className="space-y-0.5">
								<div className="flex items-center gap-2 flex-wrap">
									<h4 className="font-bold text-sm text-slate-900 dark:text-white">
										{userDisplayName}
									</h4>
									<Badge
										variant="outline"
										className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md gap-1"
									>
										<Sparkles className="h-3 w-3" />
										Profile Incomplete
									</Badge>
								</div>
								<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
									{initialData?.username && (
										<span className="font-medium">@{initialData.username}</span>
									)}
									{initialData?.username && initialData?.email && (
										<span>•</span>
									)}
									{initialData?.email && <span>{initialData.email}</span>}
								</p>
								<div className="flex items-center gap-2.5 pt-0.5">
									<button
										type="button"
										onClick={() => fileInputRef.current?.click()}
										disabled={isUploadingAvatar}
										className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
									>
										<Camera className="h-3 w-3" />
										{avatarSrc ? "Change Photo" : "Upload Photo"}
									</button>
									{avatarSrc && (
										<button
											type="button"
											onClick={handleRemoveAvatar}
											disabled={isUploadingAvatar}
											className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
										>
											<Trash2 className="h-3 w-3" />
											Remove
										</button>
									)}
								</div>
							</div>
						</div>
						<div className="text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 shrink-0 self-stretch sm:self-auto flex items-center justify-center">
							<span>
								<strong className="text-indigo-600 dark:text-indigo-400">
									Activation
								</strong>{" "}
								• Complete required fields
							</span>
						</div>
					</div>
				</div>

				{/* Section 1: Personal Details */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4 shadow-2xs">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
								<User className="h-4 w-4" />
							</div>
							<div>
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
									Personal Information
								</h4>
								<p className="text-[11px] text-slate-400">
									Basic personal identification and profile details
								</p>
							</div>
						</div>
						<span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
							<span className="text-rose-500">*</span> Required
						</span>
					</div>

					{/* Names Row */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<User className="h-3.5 w-3.5 text-indigo-500" />
									First Name
								</span>
							}
							required
							placeholder="e.g. John"
							leftIcon={<User className="h-4 w-4 text-slate-400" />}
							error={form.formState.errors.firstname?.message}
							{...form.register("firstname")}
						/>
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<User className="h-3.5 w-3.5 text-indigo-500" />
									Last Name
								</span>
							}
							required
							placeholder="e.g. Doe"
							leftIcon={<User className="h-4 w-4 text-slate-400" />}
							error={form.formState.errors.lastname?.message}
							{...form.register("lastname")}
						/>
					</div>

					{/* Nickname, Gender, Date of Birth */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<Smile className="h-3.5 w-3.5 text-indigo-500" />
									Nickname
								</span>
							}
							placeholder="e.g. Johnny"
							leftIcon={<Smile className="h-4 w-4 text-slate-400" />}
							error={form.formState.errors.nickName?.message}
							{...form.register("nickName")}
						/>
						<ModernSelect
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<Users className="h-3.5 w-3.5 text-indigo-500" />
									Gender
								</span>
							}
							value={form.watch("gender")}
							onChange={(val) =>
								form.setValue("gender", val as "MALE" | "FEMALE" | "OTHER", {
									shouldValidate: true,
									shouldDirty: true,
								})
							}
							options={genderOptions}
							leftIcon={<Users className="h-4 w-4 text-slate-400" />}
							placeholder="Select gender"
							error={form.formState.errors.gender?.message}
						/>
						<ModernDatePicker
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<Calendar className="h-3.5 w-3.5 text-indigo-500" />
									Date of Birth
								</span>
							}
							value={form.watch("dob")}
							onChange={(date) =>
								form.setValue("dob", date, {
									shouldValidate: true,
									shouldDirty: true,
								})
							}
							placeholder="Select date of birth..."
							clearable
							error={form.formState.errors.dob?.message}
						/>
					</div>
				</div>

				{/* Section 2: Employment & Role */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4 shadow-2xs">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
								<Briefcase className="h-4 w-4" />
							</div>
							<div>
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
									Employment & Role
								</h4>
								<p className="text-[11px] text-slate-400">
									Organizational designation and official staff identifier
								</p>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
									Employee Code
								</span>
							}
							placeholder="e.g. EMP-001"
							leftIcon={<BadgeCheck className="h-4 w-4 text-slate-400" />}
							helperText="Company staff or employee identification code"
							error={form.formState.errors.employeeCode?.message}
							{...form.register("employeeCode")}
						/>
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<Briefcase className="h-3.5 w-3.5 text-blue-500" />
									Position / Job Title
								</span>
							}
							placeholder="e.g. Senior CRM Specialist"
							leftIcon={<Briefcase className="h-4 w-4 text-slate-400" />}
							helperText="Your job role or departmental designation"
							error={form.formState.errors.position?.message}
							{...form.register("position")}
						/>
					</div>
				</div>

				{/* Section 3: Contact & Communication */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4 shadow-2xs">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
								<Phone className="h-4 w-4" />
							</div>
							<div>
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
									Contact Details & Address
								</h4>
								<p className="text-[11px] text-slate-400">
									Active phone numbers and physical location address
								</p>
							</div>
						</div>
					</div>

					{/* 3 Phone Inputs */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<Phone className="h-3.5 w-3.5 text-emerald-500" />
									Primary Phone
								</span>
							}
							required
							placeholder="e.g. +855 12 345 678"
							leftIcon={<Phone className="h-4 w-4 text-emerald-500" />}
							error={form.formState.errors.primaryPhone?.message}
							{...form.register("primaryPhone")}
						/>
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<PhoneCall className="h-3.5 w-3.5 text-slate-500" />
									Secondary Phone
								</span>
							}
							placeholder="e.g. +855 98 765 432"
							leftIcon={<PhoneCall className="h-4 w-4 text-slate-400" />}
							error={form.formState.errors.secondaryPhone?.message}
							{...form.register("secondaryPhone")}
						/>
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
									<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
									Emergency Phone
								</span>
							}
							placeholder="e.g. +855 88 111 222"
							leftIcon={<ShieldAlert className="h-4 w-4 text-amber-500" />}
							error={form.formState.errors.emergencyPhone?.message}
							{...form.register("emergencyPhone")}
						/>
					</div>

					{/* Address */}
					<ModernInput
						label={
							<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
								<MapPin className="h-3.5 w-3.5 text-rose-500" />
								Residential / Office Address
							</span>
						}
						placeholder="e.g. 123 Monivong Blvd, Phnom Penh, Cambodia"
						leftIcon={<MapPin className="h-4 w-4 text-rose-500" />}
						error={form.formState.errors.address?.message}
						{...form.register("address")}
					/>
				</div>

				{/* Section 4: Biography / Summary */}
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/40 space-y-4 shadow-2xs">
					<div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
						<div className="flex items-center gap-2">
							<div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
								<FileText className="h-4 w-4" />
							</div>
							<div>
								<h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
									Biography & Summary
								</h4>
								<p className="text-[11px] text-slate-400">
									Brief introduction or summary about your professional background
								</p>
							</div>
						</div>
					</div>

					<ModernTextarea
						label={
							<span className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
								<FileText className="h-3.5 w-3.5 text-purple-500" />
								Biography / Summary
							</span>
						}
						placeholder="Write a brief introduction about your role, background, or solutions..."
						rows={3}
						maxLength={500}
						showCharCount
						autoResize
						error={form.formState.errors.bio?.message}
						{...form.register("bio")}
					/>
				</div>
			</form>
		</ModernModal>
	);
}

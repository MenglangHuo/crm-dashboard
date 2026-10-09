"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	profileApi,
	usersApi,
	uploadService,
	fileUrl,
	uploadFile,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";

import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Loader2,
	User as UserIcon,
	Building2,
	ShieldCheck,
	Mail,
	KeyRound,
	Briefcase,
	MapPin,
	Phone,
	Clock,
	Lock,
	Eye,
	EyeOff,
	Sparkles,
	BadgeCheck,
	ShieldAlert,
	CheckCircle2,
	Camera,
	UserCheck,
	Shield,
	Activity,
	FileText,
	RotateCcw,
	Save,
	Check,
	Layers,
	Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "@/components/ui-custom/file-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { ModernButton } from "@/components/ui-custom/modern-button";
import { ModernInput } from "@/components/ui-custom/form-controls/modern-input";
import { ModernTextarea } from "@/components/ui-custom/form-controls/modern-textarea";
import { CompleteProfileModal } from "@/components/users/complete-profile-modal";
import { UserAuditLogsSection } from "@/components/users/user-audit-logs-section";
import { useTranslation } from "@/lib/i18n/context";

// ---- Validation Schemas --------------------------------------
const profileFormSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	contact: z.string().optional(),
	position: z.string().optional(),
	address: z.string().optional(),
	emergencyPhone: z.string().optional(),
	bio: z.string().optional(),
	avatarKey: z.string().nullable().optional(),
});

const passwordFormSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters long")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[0-9]/, "Password must contain at least one number"),
		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

interface NormalizedPermission {
	id: string;
	name: string;
	module: string;
	description?: string;
}

function normalizePermissionsList(raw: any): NormalizedPermission[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw.map((p: any, idx) => ({
			id: String(p.id || idx),
			name: String(p.name || p.code || "permission"),
			module: String(
				p.module ||
					(p.name && p.name.includes(".")
						? p.name.split(".")[0].toUpperCase()
						: "General"),
			),
			description: p.description ? String(p.description) : undefined,
		}));
	}
	if (typeof raw === "object") {
		const list: NormalizedPermission[] = [];
		Object.entries(raw).forEach(([domain, actions]) => {
			const moduleName = domain.charAt(0).toUpperCase() + domain.slice(1);
			if (Array.isArray(actions)) {
				actions.forEach((act: any, idx) => {
					const actionName =
						typeof act === "string" ? act : act?.name || "access";
					const code = `${domain}.${actionName}`;
					list.push({
						id: `${domain}-${actionName}-${idx}`,
						name: code,
						module: moduleName,
						description: `${actionName.toUpperCase()} operation for ${domain}`,
					});
				});
			} else if (typeof actions === "boolean" && actions) {
				list.push({
					id: domain,
					name: domain,
					module: moduleName,
					description: `${moduleName} access`,
				});
			}
		});
		return list;
	}
	return [];
}

export default function ProfilePage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [permissionSearch, setPermissionSearch] = useState("");
	const [completeModalOpen, setCompleteModalOpen] = useState(false);

	// 1. Load real authenticated profile data from /me
	const { data: userProfile, isLoading } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 30 * 1000,
	});

	// ---- Form Hooks --------------------------------------------
	const profileForm = useForm<z.infer<typeof profileFormSchema>>({
		resolver: zodResolver(profileFormSchema),
		values: {
			firstName: userProfile?.firstName || userProfile?.firstname || "",
			lastName: userProfile?.lastName || userProfile?.lastname || "",
			contact:
				userProfile?.contact ||
				userProfile?.phone ||
				userProfile?.primaryPhone ||
				"",
			position: userProfile?.position || "",
			address: userProfile?.address || "",
			emergencyPhone: userProfile?.emergencyPhone || "",
			bio: userProfile?.bio || "",
			avatarKey: userProfile?.avatarKey || userProfile?.imageUrl || null,
		},
	});

	const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
		resolver: zodResolver(passwordFormSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	// ---- Mutations ---------------------------------------------
	const updateProfileMutation = useMutation({
		mutationFn: (values: z.infer<typeof profileFormSchema>) =>
			profileApi.update({
				id: userProfile?.id,
				firstName: values.firstName,
				lastName: values.lastName,
				contact: values.contact,
				position: values.position,
				address: values.address,
				emergencyPhone: values.emergencyPhone,
				bio: values.bio,
				avatarKey: values.avatarKey,
			}),
		onSuccess: () => {
			toast.success("Profile updated successfully");
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateAvatarImageMutation = useMutation({
		mutationFn: async (imageUrl: string) => {
			if (!userProfile?.id) throw new Error("User profile not loaded");
			return usersApi.updateUserImageUrl(userProfile.id, imageUrl);
		},
		onSuccess: (_, imageUrl) => {
			toast.success("Avatar image updated successfully!");
			profileForm.setValue("avatarKey", imageUrl);
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			queryClient.invalidateQueries({ queryKey: ["auth-me"] });
			queryClient.invalidateQueries({ queryKey: ["current-user"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const changePasswordMutation = useMutation({
		mutationFn: profileApi.changePassword,
		onSuccess: () => {
			toast.success("Password changed successfully");
			passwordForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// ---- Handlers ----------------------------------------------
	const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
		updateProfileMutation.mutate(values);
	};

	const onPasswordSubmit = (values: z.infer<typeof passwordFormSchema>) => {
		changePasswordMutation.mutate(values);
	};

	// ---- Password Strength Calculation ------------------------
	const newPasswordValue = passwordForm.watch("newPassword") || "";
	const passwordStrength = useMemo(() => {
		let score = 0;
		if (newPasswordValue.length >= 8) score += 1;
		if (/[A-Z]/.test(newPasswordValue)) score += 1;
		if (/[0-9]/.test(newPasswordValue)) score += 1;
		if (/[^A-Za-z0-9]/.test(newPasswordValue)) score += 1;
		return score;
	}, [newPasswordValue]);

	const getStrengthLabel = (score: number) => {
		switch (score) {
			case 0:
			case 1:
				return {
					label: t("profile.securityCard.weak", "Weak"),
					color: "bg-rose-500",
					text: "text-rose-500",
				};
			case 2:
			case 3:
				return {
					label: t("profile.securityCard.medium", "Medium"),
					color: "bg-amber-500",
					text: "text-amber-500",
				};
			case 4:
				return {
					label: t("profile.securityCard.strong", "Strong"),
					color: "bg-emerald-500",
					text: "text-emerald-500",
				};
			default:
				return {
					label: t("profile.securityCard.weak", "Weak"),
					color: "bg-slate-300",
					text: "text-slate-400",
				};
		}
	};

	// ---- Normalize Permissions ---------------------------------
	const allPermissions = useMemo(() => {
		return normalizePermissionsList(userProfile?.permissions);
	}, [userProfile?.permissions]);

	// ---- Filter Permissions ------------------------------------
	const filteredPermissions = useMemo(() => {
		if (!permissionSearch.trim()) return allPermissions;
		const query = permissionSearch.toLowerCase();
		return allPermissions.filter(
			(p) =>
				p.name.toLowerCase().includes(query) ||
				p.module.toLowerCase().includes(query) ||
				(p.description && p.description.toLowerCase().includes(query)),
		);
	}, [allPermissions, permissionSearch]);

	// Group permissions by module
	const permissionsByModule = useMemo(() => {
		const map: Record<string, NormalizedPermission[]> = {};
		filteredPermissions.forEach((p) => {
			const mod = p.module || "General";
			if (!map[mod]) map[mod] = [];
			map[mod].push(p);
		});
		return map;
	}, [filteredPermissions]);

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-[60vh] gap-3">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground animate-pulse font-medium">
					{t("profile.loading", "Loading profile information...")}
				</p>
			</div>
		);
	}

	if (!userProfile) return null;

	const avatarSrc = profileForm.watch("avatarKey")
		? fileUrl(profileForm.watch("avatarKey"))
		: userProfile.avatarUrl ||
			userProfile.imageUrl ||
			fileUrl(userProfile.avatarKey) ||
			"";

	const staff = userProfile.staffInfo || userProfile.staff || null;
	const isUserActive =
		userProfile.status == "Active" ||
		Boolean(userProfile.active) ||
		Boolean(userProfile.isActive);

	return (
		<div className="space-y-6 pb-12 w-full">
			{/* ============================================================ */}
			{/* Profile Header & Identity Banner */}
			{/* ============================================================ */}
			<div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
				<div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
						<div className="relative group shrink-0">
							<Avatar className="h-20 w-20 ring-2 ring-slate-100 shadow-sm dark:ring-slate-800">
								<AvatarImage
									src={avatarSrc}
									alt={userProfile.firstName || userProfile.username}
								/>
								<AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
									{userProfile.firstName?.[0] ||
										userProfile.username?.[0]?.toUpperCase() ||
										"U"}
									{userProfile.lastName?.[0] || ""}
								</AvatarFallback>
							</Avatar>
							<label
								htmlFor="avatar-quick-upload"
								className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
								title="Change Avatar"
							>
								<Camera className="h-5 w-5" />
							</label>
							<input
								id="avatar-quick-upload"
								type="file"
								accept="image/*"
								className="hidden"
								onChange={async (e) => {
									const file = e.target.files?.[0];
									if (!file) return;
									const toastId = toast.loading("Uploading avatar...");
									try {
										const res = await uploadService.uploadSingle(file, {
											isPublic: true,
											folder: "avatars",
										});
										const finalUrl = res.url || res.fileKey || "";
										toast.dismiss(toastId);
										if (userProfile?.id) {
											updateAvatarImageMutation.mutate(finalUrl);
										} else {
											profileForm.setValue("avatarKey", finalUrl);
											toast.success("Avatar image uploaded");
										}
									} catch (err) {
										toast.dismiss(toastId);
										toast.error("Failed to upload avatar image");
									} finally {
										if (e.target) e.target.value = "";
									}
								}}
							/>
						</div>

						<div className="space-y-1.5">
							<div className="flex items-center gap-2 flex-wrap">
								<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
									{userProfile.firstName || userProfile.lastName
										? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
										: userProfile.displayName || userProfile.username}
								</h1>
								<Badge
									variant="outline"
									className={
										isUserActive
											? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold gap-1 text-[11px]"
											: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 font-semibold text-[11px]"
									}
								>
									{isUserActive ? <CheckCircle2 className="h-3 w-3" /> : null}
									{isUserActive
										? t("profile.activeAccount", "Active Account")
										: t("profile.inactiveAccount", "Inactive")}
								</Badge>
								{userProfile.isSuperAdmin && (
									<Badge
										variant="outline"
										className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold gap-1 text-[11px]"
									>
										<ShieldCheck className="h-3 w-3" />{" "}
										{t("profile.superAdminBadge", "Super Admin")}
									</Badge>
								)}
							</div>

							<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2.5 flex-wrap">
								<span className="flex items-center gap-1 font-medium">
									<UserIcon className="h-3.5 w-3.5 text-slate-400" />@
									{userProfile.username}
								</span>
								<span>•</span>
								<span className="flex items-center gap-1 font-medium">
									<Mail className="h-3.5 w-3.5 text-slate-400" />
									{userProfile.email}
								</span>
							</p>

							<div className="flex items-center gap-2 pt-1 flex-wrap">
								{(userProfile.position || staff?.position) && (
									<Badge
										variant="secondary"
										className="gap-1 font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]"
									>
										<Briefcase className="h-3 w-3" />
										{userProfile.position || staff?.position}
									</Badge>
								)}

								{(userProfile.companyName || userProfile.company?.name) && (
									<Badge
										variant="outline"
										className="gap-1 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-[11px]"
									>
										<Building2 className="h-3 w-3 text-slate-400" />
										{userProfile.companyName || userProfile.company?.name}
									</Badge>
								)}

								{(userProfile.departmentName ||
									userProfile.department?.name) && (
									<Badge
										variant="outline"
										className="gap-1 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-[11px]"
									>
										<Layers className="h-3 w-3 text-slate-400" />
										{userProfile.departmentName || userProfile.department?.name}
									</Badge>
								)}

								{(userProfile.branchName || staff?.branchName) && (
									<Badge
										variant="outline"
										className="gap-1 text-slate-600 dark:text-slate-300 font-medium rounded-lg text-[11px]"
									>
										<MapPin className="h-3 w-3 text-slate-400" />
										{userProfile.branchName || staff?.branchName}
									</Badge>
								)}
							</div>
						</div>
					</div>

					{/* Quick Metrics */}
					<div className="flex items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-6 flex-wrap sm:flex-nowrap">
						<div className="space-y-0.5 text-center sm:text-left min-w-[85px]">
							<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
								{t("profile.assignedRolesCount", "Assigned Roles")}
							</p>
							<p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
								{userProfile.roles?.length || 0}
							</p>
						</div>
						<Separator orientation="vertical" className="h-8 hidden sm:block" />
						<div className="space-y-0.5 text-center sm:text-left min-w-[85px]">
							<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
								{t("profile.effectiveGrantsCount", "Effective Grants")}
							</p>
							<p className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
								{allPermissions.length}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* ============================================================ */}
			{/* Profile Main Tabs */}
			{/* ============================================================ */}
			<ModernTabs defaultValue="personal">
				<ModernTabsList variant="glass" size="md" fullWidth>
					<ModernTabsTrigger
						value="personal"
						icon={<UserIcon className="h-4 w-4" />}
					>
						{t("profile.tabs.personal", "Personal Info")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="staff"
						icon={<Briefcase className="h-4 w-4" />}
					>
						{t("profile.tabs.staff", "Staff & HR Profile")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="security"
						icon={<KeyRound className="h-4 w-4" />}
					>
						{t("profile.tabs.security", "Security & Password")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="permissions"
						icon={<ShieldCheck className="h-4 w-4" />}
						badge={
							userProfile.roles?.length
								? String(userProfile.roles.length)
								: undefined
						}
						badgeColor="indigo"
					>
						{t("profile.tabs.permissions", "Roles & Permissions")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="audit"
						icon={<Activity className="h-4 w-4" />}
					>
						{t("profile.tabs.audit", "Audit Logs & Trail")}
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* ------------------------------------------------------------ */}
				{/* TAB 1: Personal Info */}
				{/* ------------------------------------------------------------ */}
				<ModernTabsContent value="personal">
					<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5">
							<CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
								<UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								{t("profile.personalCard.title", "Personal Information")}
							</CardTitle>
							<CardDescription>
								{t(
									"profile.personalCard.subtitle",
									"Update your basic identity, profile avatar, position, and contact details.",
								)}
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<form
								onSubmit={profileForm.handleSubmit(onProfileSubmit)}
								className="space-y-6"
							>
								{/* Profile Picture Uploader (Currently not used - commented out as requested)
								<div className="space-y-3">
									<span className="text-xs font-bold uppercase tracking-wider text-slate-500">
										{t("profile.personalCard.picture", "Profile Picture")}
									</span>
									<div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40">
										<Avatar className="h-20 w-20 ring-2 ring-primary/20 shadow-xs">
											<AvatarImage src={avatarSrc} />
											<AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
												{userProfile.firstName?.[0] ||
													userProfile.username?.[0]?.toUpperCase() ||
													"U"}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 space-y-1.5 w-full">
											<FileUpload
												accept="image/*"
												isPublic={true}
												folder="avatars"
												onUploadSuccess={(fileKey) => {
													profileForm.setValue("avatarKey", fileKey);
												}}
											/>
											<p className="text-[11px] text-slate-400">
												{t(
													"profile.personalCard.pictureHelper",
													"Supported formats: JPG, PNG, WEBP. Maximum file size: 5MB.",
												)}
											</p>
										</div>
									</div>
								</div>
								*/}

								{/* Names Row */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<UserIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
												{t("profile.personalCard.firstName", "First Name")}
											</span>
										}
										placeholder={t(
											"profile.personalCard.firstNamePlaceholder",
											"Enter first name",
										)}
										leftIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
										error={profileForm.formState.errors.firstName?.message}
										{...profileForm.register("firstName")}
									/>

									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<UserIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
												{t("profile.personalCard.lastName", "Last Name")}
											</span>
										}
										placeholder={t(
											"profile.personalCard.lastNamePlaceholder",
											"Enter last name",
										)}
										leftIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
										error={profileForm.formState.errors.lastName?.message}
										{...profileForm.register("lastName")}
									/>
								</div>

								{/* Account Lock Fields */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<Mail className="h-3.5 w-3.5 text-indigo-500" />
												{t("profile.personalCard.email", "Email Address")}{" "}
												<Lock className="h-3 w-3 text-slate-400" />
											</span>
										}
										leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
										value={userProfile.email || ""}
										disabled
										helperText={t(
											"profile.personalCard.emailHelper",
											"Email address is managed by authentication provider.",
										)}
									/>

									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<Lock className="h-3.5 w-3.5 text-slate-500" />
												{t("profile.personalCard.username", "Username")}{" "}
												<Lock className="h-3 w-3 text-slate-400" />
											</span>
										}
										leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
										value={userProfile.username || ""}
										disabled
										helperText={t(
											"profile.personalCard.usernameHelper",
											"Username is fixed to your identity account.",
										)}
									/>
								</div>

								{/* Phone & Position */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<Phone className="h-3.5 w-3.5 text-emerald-500" />
												{t(
													"profile.personalCard.contact",
													"Contact Phone Number",
												)}
											</span>
										}
										placeholder={t(
											"profile.personalCard.contactPlaceholder",
											"e.g. +855 12 345 678",
										)}
										leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
										error={profileForm.formState.errors.contact?.message}
										{...profileForm.register("contact")}
									/>

									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<Briefcase className="h-3.5 w-3.5 text-sky-500" />
												{t(
													"profile.personalCard.position",
													"Job Title / Position",
												)}
											</span>
										}
										placeholder={t(
											"profile.personalCard.positionPlaceholder",
											"e.g. Sales Manager",
										)}
										leftIcon={<Briefcase className="h-4 w-4 text-slate-400" />}
										{...profileForm.register("position")}
									/>
								</div>

								{/* Address & Emergency Phone */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<MapPin className="h-3.5 w-3.5 text-rose-500" />
												{t(
													"profile.personalCard.address",
													"Residential / Office Address",
												)}
											</span>
										}
										placeholder={t(
											"profile.personalCard.addressPlaceholder",
											"e.g. Phnom Penh, Cambodia",
										)}
										leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
										{...profileForm.register("address")}
									/>

									<ModernInput
										label={
											<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
												<ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
												{t(
													"profile.personalCard.emergencyPhone",
													"Emergency Contact Phone",
												)}
											</span>
										}
										placeholder={t(
											"profile.personalCard.emergencyPhonePlaceholder",
											"e.g. +855 98 765 432",
										)}
										leftIcon={
											<ShieldAlert className="h-4 w-4 text-amber-500" />
										}
										{...profileForm.register("emergencyPhone")}
									/>
								</div>

								{/* Bio */}
								<ModernTextarea
									label={
										<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
											<FileText className="h-3.5 w-3.5 text-purple-500" />
											{t("profile.personalCard.bio", "Bio & Role Summary")}
										</span>
									}
									placeholder={t(
										"profile.personalCard.bioPlaceholder",
										"Tell a brief summary about your role or background...",
									)}
									rows={3}
									{...profileForm.register("bio")}
								/>

								{/* Bottom Actions */}
								<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
									<ModernButton
										type="button"
										variant="outline"
										onClick={() => profileForm.reset()}
										disabled={updateProfileMutation.isPending}
										leftIcon={<RotateCcw className="h-4 w-4" />}
									>
										{t("profile.personalCard.resetButton", "Reset Form")}
									</ModernButton>
									<ModernButton
										type="submit"
										variant="gradient"
										isLoading={updateProfileMutation.isPending}
										loadingText={t(
											"profile.personalCard.saving",
											"Saving Changes...",
										)}
										leftIcon={<Save className="h-4 w-4" />}
										className="shadow-sm"
									>
										{t(
											"profile.personalCard.saveButton",
											"Save Profile Changes",
										)}
									</ModernButton>
								</div>
							</form>
						</CardContent>
					</Card>
				</ModernTabsContent>

				{/* ------------------------------------------------------------ */}
				{/* TAB 2: Staff & HR Profile */}
				{/* ------------------------------------------------------------ */}
				<ModernTabsContent value="staff">
					<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5">
							<CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
								<Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
								{t(
									"profile.staffCard.title",
									"Staff & Human Resources Profile",
								)}
							</CardTitle>
							<CardDescription>
								{t(
									"profile.staffCard.subtitle",
									"Detailed employment records, branch assignment, and emergency contact details.",
								)}
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6 space-y-6">
							{staff || userProfile.employeeCode || userProfile.position ? (
								<div className="space-y-6">
									{/* Staff Status Callout */}
									<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
										<UserCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
										<div>
											<h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">
												{t(
													"profile.staffCard.calloutTitle",
													"Linked HR Staff Profile Active",
												)}
											</h4>
											<p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
												{t(
													"profile.staffCard.calloutDesc",
													"Your user login account is linked to your HR Staff record. Organization structures, department assignments, and branch permissions apply to this record.",
												)}
											</p>
										</div>
									</div>

									{/* Staff Info Grid */}
									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t("profile.staffCard.fullName", "Full Name")}
											</span>
											<p className="font-bold text-sm text-slate-900 dark:text-white">
												{staff?.name ||
													`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
													userProfile.username}
											</p>
										</div>

										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t(
													"profile.staffCard.jobTitle",
													"Position / Job Title",
												)}
											</span>
											<p className="font-bold text-sm flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
												<Briefcase className="h-4 w-4" />
												{staff?.position ||
													userProfile.position ||
													"Unspecified"}
											</p>
										</div>

										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t("profile.staffCard.employeeCode", "Employee Code")}
											</span>
											<p className="font-bold text-sm text-slate-800 dark:text-slate-200 font-mono">
												{userProfile.employeeCode ||
													staff?.employeeCode ||
													"EMP-001"}
											</p>
										</div>

										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t(
													"profile.staffCard.assignedBranch",
													"Assigned Branch",
												)}
											</span>
											<p className="font-semibold text-sm flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
												<MapPin className="h-4 w-4 text-blue-500" />
												{staff?.branchName ||
													userProfile.branchName ||
													"Main Branch"}
											</p>
										</div>

										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t("profile.staffCard.department", "Department")}
											</span>
											<p className="font-semibold text-sm flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
												<Layers className="h-4 w-4 text-indigo-500" />
												{userProfile.departmentName ||
													userProfile.department?.name ||
													"General Operations"}
											</p>
										</div>

										<div className="space-y-1 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
												{t(
													"profile.staffCard.employmentStatus",
													"Employment Status",
												)}
											</span>
											<div className="mt-1">
												<Badge
													variant="outline"
													className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold"
												>
													{isUserActive
														? t(
																"profile.staffCard.activeEmployee",
																"Active Employee",
															)
														: t(
																"profile.staffCard.inactiveEmployee",
																"Inactive",
															)}
												</Badge>
											</div>
										</div>
									</div>

									<Separator />

									{/* Urgent / Emergency Contact */}
									<div className="space-y-3">
										<h4 className="font-bold text-sm flex items-center gap-2 text-slate-900 dark:text-white">
											<ShieldAlert className="h-4 w-4 text-amber-500" />
											{t(
												"profile.staffCard.emergencyTitle",
												"Emergency Contact Information",
											)}
										</h4>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
											<div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 space-y-1">
												<span className="text-xs text-slate-400 font-medium">
													{t(
														"profile.staffCard.emergencyName",
														"Emergency Contact Name",
													)}
												</span>
												<p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
													{staff?.urgentContactName ||
														t("profile.staffCard.notProvided", "Not provided")}
												</p>
											</div>
											<div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 space-y-1">
												<span className="text-xs text-slate-400 font-medium">
													{t(
														"profile.staffCard.emergencyPhone",
														"Emergency Contact Phone",
													)}
												</span>
												<p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
													{userProfile.emergencyPhone ||
														staff?.urgentContactPhone ||
														t("profile.staffCard.notProvided", "Not provided")}
												</p>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
									<div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
										<Briefcase className="h-6 w-6" />
									</div>
									<h3 className="font-bold text-base text-slate-900 dark:text-white">
										{t(
											"profile.staffCard.noStaffTitle",
											"No HR Staff Record Linked",
										)}
									</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
										{t(
											"profile.staffCard.noStaffDesc",
											"This user account is currently operating as an administrative login without a linked HR Staff record. Administrative users can complete full profile setup to bind employee positions and branch details.",
										)}
									</p>
									<ModernButton
										variant="gradient"
										size="sm"
										onClick={() => setCompleteModalOpen(true)}
										className="rounded-xl shadow-xs text-xs mt-2"
									>
										{t(
											"profile.staffCard.completeSetup",
											"Complete Profile Setup",
										)}
									</ModernButton>
								</div>
							)}
						</CardContent>
					</Card>
				</ModernTabsContent>

				{/* ------------------------------------------------------------ */}
				{/* TAB 3: Security & Password */}
				{/* ------------------------------------------------------------ */}
				<ModernTabsContent value="security">
					<div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
						<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
							<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5">
								<CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-white">
									<KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									{t("profile.securityCard.title", "Change Account Password")}
								</CardTitle>
								<CardDescription>
									{t(
										"profile.securityCard.subtitle",
										"Ensure your account is protected by using a strong, unique password.",
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-6">
								<form
									onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
									className="space-y-6"
								>
									{/* Current Password */}
									<div className="space-y-1.5">
										<ModernInput
											label={
												<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
													<KeyRound className="h-3.5 w-3.5 text-amber-500" />
													{t(
														"profile.securityCard.currentPassword",
														"Current Password",
													)}
												</span>
											}
											type={showCurrentPassword ? "text" : "password"}
											placeholder={t(
												"profile.securityCard.currentPasswordPlaceholder",
												"Enter your current password",
											)}
											leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
											rightIcon={
												<button
													type="button"
													onClick={() =>
														setShowCurrentPassword(!showCurrentPassword)
													}
													className="text-slate-400 hover:text-slate-600 cursor-pointer"
												>
													{showCurrentPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</button>
											}
											error={
												passwordForm.formState.errors.currentPassword?.message
											}
											{...passwordForm.register("currentPassword")}
										/>
									</div>

									{/* New Password */}
									<div className="space-y-1.5">
										<ModernInput
											label={
												<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
													<Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
													{t(
														"profile.securityCard.newPassword",
														"New Password",
													)}
												</span>
											}
											type={showNewPassword ? "text" : "password"}
											placeholder={t(
												"profile.securityCard.newPasswordPlaceholder",
												"Enter new password (min. 8 chars, 1 uppercase, 1 number)",
											)}
											leftIcon={<KeyRound className="h-4 w-4 text-slate-400" />}
											rightIcon={
												<button
													type="button"
													onClick={() => setShowNewPassword(!showNewPassword)}
													className="text-slate-400 hover:text-slate-600 cursor-pointer"
												>
													{showNewPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</button>
											}
											error={passwordForm.formState.errors.newPassword?.message}
											{...passwordForm.register("newPassword")}
										/>

										{/* Password Strength Meter */}
										{newPasswordValue.length > 0 && (
											<div className="space-y-1.5 pt-2">
												<div className="flex items-center justify-between text-xs">
													<span className="text-slate-400">
														{t(
															"profile.securityCard.strengthLabel",
															"Password Strength:",
														)}
													</span>
													<span
														className={`font-bold ${getStrengthLabel(passwordStrength).text}`}
													>
														{getStrengthLabel(passwordStrength).label}
													</span>
												</div>
												<div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
													<div
														className={`h-full transition-all duration-300 ${getStrengthLabel(passwordStrength).color}`}
														style={{
															width: `${(passwordStrength / 4) * 100}%`,
														}}
													/>
												</div>
											</div>
										)}
									</div>

									{/* Confirm Password */}
									<div className="space-y-1.5">
										<ModernInput
											label={
												<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
													<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
													{t(
														"profile.securityCard.confirmPassword",
														"Confirm New Password",
													)}
												</span>
											}
											type={showConfirmPassword ? "text" : "password"}
											placeholder={t(
												"profile.securityCard.confirmPasswordPlaceholder",
												"Confirm your new password",
											)}
											leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
											rightIcon={
												<button
													type="button"
													onClick={() =>
														setShowConfirmPassword(!showConfirmPassword)
													}
													className="text-slate-400 hover:text-slate-600 cursor-pointer"
												>
													{showConfirmPassword ? (
														<EyeOff className="h-4 w-4" />
													) : (
														<Eye className="h-4 w-4" />
													)}
												</button>
											}
											error={
												passwordForm.formState.errors.confirmPassword?.message
											}
											{...passwordForm.register("confirmPassword")}
										/>
									</div>

									<div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
										<ModernButton
											type="submit"
											variant="gradient"
											isLoading={changePasswordMutation.isPending}
											loadingText={t(
												"profile.securityCard.updating",
												"Updating Password...",
											)}
											leftIcon={<KeyRound className="h-4 w-4" />}
											className="shadow-sm"
										>
											{t(
												"profile.securityCard.updateButton",
												"Update Password",
											)}
										</ModernButton>
									</div>
								</form>
							</CardContent>
						</Card>

						{/* Security Audit Sidebar */}
						<div className="space-y-6">
							<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
								<CardHeader className="pb-3">
									<CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
										<Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
										{t(
											"profile.securityCard.overviewTitle",
											"Security Overview",
										)}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4 text-xs">
									<div className="flex items-start gap-3">
										<Clock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
										<div>
											<p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
												{t(
													"profile.securityCard.lastActivity",
													"Last Account Activity",
												)}
											</p>
											<p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
												{userProfile.lastLoginAt
													? new Date(userProfile.lastLoginAt).toLocaleString()
													: t(
															"profile.securityCard.activeSession",
															"Current active session",
														)}
											</p>
										</div>
									</div>

									<Separator />

									<div className="flex items-start gap-3">
										<BadgeCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
										<div>
											<p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
												{t(
													"profile.securityCard.accountStatus",
													"Account Status",
												)}
											</p>
											<p className="font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">
												{t(
													"profile.securityCard.activeVerified",
													"Active & Verified",
												)}
											</p>
										</div>
									</div>

									<Separator />

									<div className="flex items-start gap-3">
										<Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
										<div>
											<p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
												{t(
													"profile.securityCard.tokenSecurity",
													"Token Security",
												)}
											</p>
											<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
												{t(
													"profile.securityCard.tokenDesc",
													"JWT Token Authentication with automated token refresh rotation enabled.",
												)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</ModernTabsContent>

				{/* ------------------------------------------------------------ */}
				{/* TAB 4: Roles & Permissions */}
				{/* ------------------------------------------------------------ */}
				<ModernTabsContent value="permissions">
					<div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
						{/* Roles Sidebar Card */}
						<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
							<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
								<CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
									<ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									{t(
										"profile.permissionsCard.assignedRolesTitle",
										"Assigned Roles ({{count}})",
										{ count: userProfile.roles?.length || 0 },
									)}
								</CardTitle>
								<CardDescription className="text-xs">
									{t(
										"profile.permissionsCard.assignedRolesSubtitle",
										"Roles assigned to your account.",
									)}
								</CardDescription>
							</CardHeader>
							<CardContent className="pt-4 space-y-3">
								{userProfile.roles && userProfile.roles.length > 0 ? (
									userProfile.roles.map((role: any, idx: number) => (
										<div
											key={role?.id ?? role?.name ?? `role-${idx}`}
											className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 space-y-1 transition-all hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
										>
											<div className="flex items-center justify-between">
												<span className="font-bold text-xs text-slate-900 dark:text-white">
													{role.name}
												</span>
												<Badge
													variant="outline"
													className="text-[9px] px-1.5 py-0 rounded-md border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold"
												>
													{t("profile.activeAccount", "Active")}
												</Badge>
											</div>
											{role.description && (
												<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
													{role.description}
												</p>
											)}
										</div>
									))
								) : (
									<div className="py-6 text-center text-slate-400 space-y-1">
										<Shield className="h-6 w-6 mx-auto opacity-40" />
										<p className="text-xs font-semibold">
											{t(
												"profile.permissionsCard.noRoles",
												"No direct roles assigned",
											)}
										</p>
										<p className="text-[10px]">
											{t(
												"profile.permissionsCard.inheritingDefault",
												"Inheriting default permissions",
											)}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Permissions Matrix / Browser */}
						<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
							<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
								<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
									<div>
										<CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
											<Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
											{t(
												"profile.permissionsCard.grantsTitle",
												"Effective Grants & Permissions ({{count}})",
												{ count: filteredPermissions.length },
											)}
										</CardTitle>
										<CardDescription className="text-xs">
											{t(
												"profile.permissionsCard.grantsSubtitle",
												"Granular API authorities and menu view capabilities active for your session.",
											)}
										</CardDescription>
									</div>

									<div className="w-full sm:w-60">
										<ModernInput
											placeholder={t(
												"profile.permissionsCard.searchPlaceholder",
												"Search permissions...",
											)}
											value={permissionSearch}
											onChange={(e) => setPermissionSearch(e.target.value)}
											leftIcon={
												<Search className="h-3.5 w-3.5 text-slate-400" />
											}
											inputSize="sm"
											clearable
											onClear={() => setPermissionSearch("")}
										/>
									</div>
								</div>
							</CardHeader>
							<CardContent className="pt-4">
								{Object.keys(permissionsByModule).length > 0 ? (
									<div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
										{Object.entries(permissionsByModule).map(
											([moduleName, perms]) => (
												<div key={moduleName} className="space-y-2">
													<div className="flex items-center gap-2">
														<Badge
															variant="secondary"
															className="font-bold text-[10px] uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
														>
															{moduleName}
														</Badge>
														<span className="text-[11px] text-slate-400 font-medium">
															{t(
																"profile.permissionsCard.grantsCount",
																"({{count}} grants)",
																{ count: perms.length },
															)}
														</span>
													</div>
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
														{perms.map((p, pIdx) => (
															<div
																key={`${p.id}-${pIdx}`}
																className="p-2.5 rounded-xl border border-slate-200/60 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/40 flex items-center justify-between gap-2 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
															>
																<div className="min-w-0">
																	<p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
																		{p.name}
																	</p>
																	{p.description && (
																		<p className="text-[10px] text-slate-400 truncate">
																			{p.description}
																		</p>
																	)}
																</div>
																<Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
															</div>
														))}
													</div>
												</div>
											),
										)}
									</div>
								) : (
									<div className="py-12 text-center text-slate-400 space-y-2">
										<Search className="h-6 w-6 mx-auto opacity-40" />
										<p className="text-xs font-semibold">
											{t(
												"profile.permissionsCard.noMatch",
												'No permissions match "{{query}}"',
												{ query: permissionSearch },
											)}
										</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</ModernTabsContent>

				{/* ------------------------------------------------------------ */}
				{/* TAB 5: Audit Logs & Trail */}
				{/* ------------------------------------------------------------ */}
				<ModernTabsContent value="audit" className="pt-2">
					<UserAuditLogsSection
						username={userProfile?.username}
						userDisplayName={
							`${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim() ||
							userProfile?.displayName ||
							userProfile?.username ||
							"My Account"
						}
					/>
				</ModernTabsContent>
			</ModernTabs>

			{/* Complete Profile Modal */}
			<CompleteProfileModal
				open={completeModalOpen}
				onOpenChange={setCompleteModalOpen}
				initialData={userProfile}
			/>
		</div>
	);
}

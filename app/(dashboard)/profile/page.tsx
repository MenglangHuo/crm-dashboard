"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	profileApi,
	usersApi,
	rolesApi,
	uploadService,
	fileUrl,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { formatRoleName } from "@/lib/role-utils";

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
	Layers,
	Search,
	Users,
	Filter,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

export interface NormalizedPermission {
	id: string;
	name: string;
	code: string;
	module: string;
	action: string;
	description?: string;
	grantedByRoles: string[];
	isDirect?: boolean;
}

export interface PermissionsAggregationResult {
	permissions: NormalizedPermission[];
	totalRawGrants: number;
	distinctCount: number;
	duplicateCount: number;
	rolesSummary: { name: string; count: number }[];
	modulesList: string[];
}

function aggregateAndDeduplicatePermissions(
	userProfile: any,
	rolesCatalog: any[] = [],
): PermissionsAggregationResult {
	const permMap = new Map<string, NormalizedPermission>();
	let totalRawGrants = 0;
	const roleCountMap = new Map<string, number>();

	const recordGrant = (
		rawModule: string,
		rawAction: string,
		roleName: string,
		desc?: string,
		isDirect = false,
		explicitId?: string,
	) => {
		const cleanMod = String(rawModule || "GENERAL").trim().toUpperCase();
		const cleanAct = String(rawAction || "ACCESS").trim().toUpperCase();
		if (!cleanMod && !cleanAct) return;

		const canonicalCode = cleanAct.includes(".")
			? cleanAct
			: `${cleanMod}.${cleanAct}`;

		const [modPart, actPart] = canonicalCode.includes(".")
			? canonicalCode.split(".")
			: [cleanMod, cleanAct];

		const displayModule =
			modPart.charAt(0).toUpperCase() + modPart.slice(1).toLowerCase();
		const displayAction =
			actPart.charAt(0).toUpperCase() + actPart.slice(1).toLowerCase();

		totalRawGrants++;
		roleCountMap.set(roleName, (roleCountMap.get(roleName) || 0) + 1);

		if (permMap.has(canonicalCode)) {
			const existing = permMap.get(canonicalCode)!;
			if (roleName && !existing.grantedByRoles.includes(roleName)) {
				existing.grantedByRoles.push(roleName);
			}
			if (isDirect) existing.isDirect = true;
			if (!existing.description && desc) existing.description = desc;
		} else {
			permMap.set(canonicalCode, {
				id: explicitId || canonicalCode.toLowerCase(),
				name: displayAction,
				code: canonicalCode,
				module: displayModule,
				action: actPart,
				description:
					desc || `${displayAction} authorization for ${displayModule}`,
				grantedByRoles: roleName ? [roleName] : [],
				isDirect: Boolean(isDirect),
			});
		}
	};

	// 1. Process User Assigned Roles
	const assignedRoles = Array.isArray(userProfile?.roles)
		? userProfile.roles
		: [];

	assignedRoles.forEach((roleObj: any) => {
		const roleId = String(roleObj?.id || "");
		const rawName = String(roleObj?.name || roleObj?.displayName || "Role");
		const roleName = formatRoleName(rawName);

		// Look up full role catalog if roleObj lacks detailed permissions
		const catalogMatch = rolesCatalog.find(
			(r) => String(r.id) === roleId || r.name === roleObj?.name,
		);
		const fullRole = catalogMatch || roleObj;

		// A. Array permissions
		const permsArray = Array.isArray(fullRole?.permissions)
			? fullRole.permissions
			: Array.isArray(roleObj?.permissions)
				? roleObj.permissions
				: null;

		if (permsArray) {
			permsArray.forEach((p: any) => {
				if (typeof p === "string" || typeof p === "number") {
					const str = String(p).trim();
					if (str.includes(".")) {
						const [m, ...rest] = str.split(".");
						recordGrant(m, rest.join("."), roleName);
					} else {
						recordGrant("GENERAL", str, roleName);
					}
					return;
				}
				if (!p) return;

				const modName = String(p.name || p.module || "GENERAL");
				const actions = Array.isArray(p.actions)
					? p.actions
					: Array.isArray(p.permissions)
						? p.permissions
						: [];

				if (actions.length > 0) {
					actions.forEach((act: any) => {
						if (typeof act === "string") {
							recordGrant(modName, act, roleName);
						} else if (act && act.enabled !== false) {
							const actName = String(act.name || act.action || "ACCESS");
							recordGrant(
								modName,
								actName,
								roleName,
								act.description,
								false,
								act.id ? String(act.id) : undefined,
							);
						}
					});
				} else if (p.name || p.code || p.action) {
					if (p.enabled !== false) {
						const name = String(p.name || p.code || p.action);
						if (name.includes(".")) {
							const [m, ...rest] = name.split(".");
							recordGrant(
								m,
								rest.join("."),
								roleName,
								p.description,
								false,
								p.id ? String(p.id) : undefined,
							);
						} else {
							recordGrant(
								p.module || "GENERAL",
								name,
								roleName,
								p.description,
								false,
								p.id ? String(p.id) : undefined,
							);
						}
					}
				}
			});
		}

		// B. Object/Map permissions
		const permsMap =
			typeof fullRole?.permissions === "object" &&
			!Array.isArray(fullRole?.permissions)
				? fullRole.permissions
				: typeof roleObj?.permissions === "object" &&
						!Array.isArray(roleObj?.permissions)
					? roleObj.permissions
					: null;

		if (permsMap) {
			Object.entries(permsMap).forEach(([domain, actions]: [string, any]) => {
				if (Array.isArray(actions)) {
					actions.forEach((act: any) => {
						if (typeof act === "string") {
							recordGrant(domain, act, roleName);
						} else if (act && act.enabled !== false) {
							const actName = String(act.name || act.action || "ACCESS");
							recordGrant(
								domain,
								actName,
								roleName,
								act.description,
								false,
								act.id ? String(act.id) : undefined,
							);
						}
					});
				} else if (actions && typeof actions === "object") {
					Object.entries(actions).forEach(([actName, isEnabled]) => {
						if (Boolean(isEnabled)) {
							recordGrant(domain, actName, roleName);
						}
					});
				} else if (typeof actions === "boolean" && actions) {
					recordGrant(domain, "ACCESS", roleName);
				}
			});
		}

		// C. permissionIds or grants array
		const idArrays = [
			fullRole?.permissionIds,
			roleObj?.permissionIds,
			fullRole?.grants,
			roleObj?.grants,
		];
		idArrays.forEach((arr) => {
			if (Array.isArray(arr)) {
				arr.forEach((idVal: any) => {
					const str = String(idVal).trim();
					if (str.includes(".")) {
						const [m, ...rest] = str.split(".");
						recordGrant(m, rest.join("."), roleName);
					} else {
						recordGrant("GENERAL", str, roleName);
					}
				});
			}
		});

		// D. actions or rolePermissions array
		if (Array.isArray(fullRole?.actions)) {
			fullRole.actions.forEach((act: any) => {
				if (typeof act === "string") {
					recordGrant("GENERAL", act, roleName);
				} else if (act && act.enabled !== false) {
					recordGrant(
						act.module || "GENERAL",
						act.name || act.action || "ACCESS",
						roleName,
						act.description,
					);
				}
			});
		}
		if (Array.isArray(fullRole?.rolePermissions)) {
			fullRole.rolePermissions.forEach((rp: any) => {
				const p = rp.permission || rp;
				if (p) {
					recordGrant(
						p.module || "GENERAL",
						p.name || p.action || "ACCESS",
						roleName,
						p.description,
					);
				}
			});
		}
	});

	// 2. Process Direct User Permissions / Grants
	if (userProfile?.permissions) {
		if (Array.isArray(userProfile.permissions)) {
			userProfile.permissions.forEach((p: any) => {
				if (typeof p === "string") {
					if (p.includes(".")) {
						const [m, ...rest] = p.split(".");
						recordGrant(m, rest.join("."), "Direct User Grant", undefined, true);
					} else {
						recordGrant("GENERAL", p, "Direct User Grant", undefined, true);
					}
				} else if (p && p.enabled !== false) {
					const code = String(p.name || p.code || "permission");
					if (code.includes(".")) {
						const [m, ...rest] = code.split(".");
						recordGrant(
							m,
							rest.join("."),
							"Direct User Grant",
							p.description,
							true,
							p.id ? String(p.id) : undefined,
						);
					} else {
						recordGrant(
							p.module || "GENERAL",
							code,
							"Direct User Grant",
							p.description,
							true,
							p.id ? String(p.id) : undefined,
						);
					}
				}
			});
		} else if (typeof userProfile.permissions === "object") {
			Object.entries(userProfile.permissions).forEach(
				([domain, actions]: [string, any]) => {
					if (Array.isArray(actions)) {
						actions.forEach((act: any) => {
							const actName =
								typeof act === "string" ? act : act?.name || "ACCESS";
							recordGrant(
								domain,
								actName,
								"Direct User Grant",
								act?.description,
								true,
							);
						});
					} else if (typeof actions === "boolean" && actions) {
						recordGrant(domain, "ACCESS", "Direct User Grant", undefined, true);
					}
				},
			);
		}
	}

	if (Array.isArray(userProfile?.grants)) {
		userProfile.grants.forEach((g: any) => {
			const str = String(g).trim();
			if (str.includes(".")) {
				const [m, ...rest] = str.split(".");
				recordGrant(m, rest.join("."), "Direct User Grant", undefined, true);
			} else {
				recordGrant("GENERAL", str, "Direct User Grant", undefined, true);
			}
		});
	}

	if (Array.isArray(userProfile?.addedPermissionIds)) {
		userProfile.addedPermissionIds.forEach((pid: any) => {
			const str = String(pid).trim();
			if (str.includes(".")) {
				const [m, ...rest] = str.split(".");
				recordGrant(m, rest.join("."), "Direct User Grant", undefined, true);
			} else {
				recordGrant("GENERAL", str, "Direct User Grant", undefined, true);
			}
		});
	}

	// 3. Exclude permissions in excludedPermissionIds
	if (Array.isArray(userProfile?.excludedPermissionIds)) {
		const excludedSet = new Set(
			userProfile.excludedPermissionIds.map((id: any) =>
				String(id).toLowerCase(),
			),
		);
		Array.from(permMap.entries()).forEach(([code, p]) => {
			if (
				excludedSet.has(code.toLowerCase()) ||
				excludedSet.has(p.id.toLowerCase()) ||
				excludedSet.has(p.action.toLowerCase())
			) {
				permMap.delete(code);
			}
		});
	}

	const distinctPermissions = Array.from(permMap.values()).sort((a, b) => {
		const modCmp = a.module.localeCompare(b.module);
		if (modCmp !== 0) return modCmp;
		return a.name.localeCompare(b.name);
	});

	const rolesSummary = Array.from(roleCountMap.entries()).map(
		([name, count]) => ({
			name,
			count,
		}),
	);

	const modulesList = Array.from(
		new Set(distinctPermissions.map((p) => p.module)),
	).sort();

	const distinctCount = distinctPermissions.length;
	const duplicateCount = Math.max(0, totalRawGrants - distinctCount);

	return {
		permissions: distinctPermissions,
		totalRawGrants,
		distinctCount,
		duplicateCount,
		rolesSummary,
		modulesList,
	};
}

export default function ProfilePage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [permissionSearch, setPermissionSearch] = useState("");
	const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
	const [completeModalOpen, setCompleteModalOpen] = useState(false);

	// 1. Load real authenticated profile data from /me
	const { data: userProfile, isLoading } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 30 * 1000,
	});

	// 2. Load all roles catalog to enrich permissions from assigned roles
	const { data: allRolesPaged } = useQuery({
		queryKey: ["roles-catalog-list"],
		queryFn: () => rolesApi.list({ limit: 100 }),
		staleTime: 60 * 1000,
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

	// ---- Setup Completion Check (Value after login or profile data) ----
	const isCompleteSetup = useMemo(() => {
		if (userProfile?.isCompleteSetup !== undefined)
			return Boolean(userProfile.isCompleteSetup);
		if (userProfile?.isCompletedSetup !== undefined)
			return Boolean(userProfile.isCompletedSetup);
		if (userProfile?.completedSetup !== undefined)
			return Boolean(userProfile.completedSetup);
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("crm_is_complete_setup");
			if (stored !== null) return stored === "true" || stored === "1";
		}
		const hasName = Boolean(userProfile?.firstName || userProfile?.firstname);
		const hasContact = Boolean(
			userProfile?.contact ||
				userProfile?.phone ||
				userProfile?.primaryPhone,
		);
		return Boolean(hasName && hasContact);
	}, [userProfile]);

	// ---- Aggregate & Deduplicate Permissions across all Roles & Grants ----
	const aggregatedPermissions = useMemo(() => {
		return aggregateAndDeduplicatePermissions(
			userProfile,
			allRolesPaged?.items || [],
		);
	}, [userProfile, allRolesPaged?.items]);

	const {
		permissions: allPermissions,
		totalRawGrants,
		distinctCount,
		duplicateCount,
		rolesSummary,
	} = aggregatedPermissions;

	// ---- Filter Permissions ------------------------------------
	const filteredPermissions = useMemo(() => {
		let list = allPermissions;
		if (selectedRoleFilter !== "ALL") {
			if (selectedRoleFilter === "DIRECT") {
				list = list.filter((p) => p.isDirect);
			} else {
				list = list.filter((p) =>
					p.grantedByRoles.includes(selectedRoleFilter),
				);
			}
		}
		if (permissionSearch.trim()) {
			const query = permissionSearch.toLowerCase().trim();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					p.code.toLowerCase().includes(query) ||
					p.module.toLowerCase().includes(query) ||
					p.action.toLowerCase().includes(query) ||
					(p.description && p.description.toLowerCase().includes(query)) ||
					p.grantedByRoles.some((r) => r.toLowerCase().includes(query)),
			);
		}
		return list;
	}, [allPermissions, selectedRoleFilter, permissionSearch]);

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
								{!isCompleteSetup && (
									<Badge
										variant="outline"
										onClick={() => setCompleteModalOpen(true)}
										className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold gap-1 text-[11px] cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shadow-2xs"
										title="Click to complete required profile information"
									>
										<Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
										Setup Incomplete • Complete Now
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
								{distinctCount}
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
					{/* Forced Incomplete Setup Alert Banner */}
					{!isCompleteSetup && (
						<div className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50/60 p-5 shadow-sm dark:border-amber-600/70 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/20">
							<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
								<div className="flex items-start gap-4">
									<div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 ring-1 ring-amber-500/30">
										<ShieldAlert className="h-6 w-6" />
									</div>
									<div className="space-y-1">
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="font-bold text-base text-amber-950 dark:text-amber-200">
												{t(
													"profile.setupIncompleteTitle",
													"Profile Setup Incomplete — Action Required",
												)}
											</h3>
											<Badge
												variant="outline"
												className="border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-900/60 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md"
											>
												Required
											</Badge>
										</div>
										<p className="text-xs text-amber-900/80 dark:text-amber-300/80 max-w-2xl leading-relaxed">
											{t(
												"profile.setupIncompleteDesc",
												"Your user profile information is incomplete. Please complement and submit your user profile details (names, contact phone number, job role, and address) to activate all system permissions, organization structures, and collaborative tools.",
											)}
										</p>
										<div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-amber-800 dark:text-amber-300 font-medium">
											<span className="flex items-center gap-1">
												<Phone className="h-3 w-3 text-amber-600" /> Primary Phone
											</span>
											<span>•</span>
											<span className="flex items-center gap-1">
												<Briefcase className="h-3 w-3 text-amber-600" /> Job Position
											</span>
											<span>•</span>
											<span className="flex items-center gap-1">
												<MapPin className="h-3 w-3 text-amber-600" /> Location Address
											</span>
										</div>
									</div>
								</div>

								<div className="shrink-0 w-full md:w-auto flex items-center justify-end">
									<ModernButton
										type="button"
										variant="gradient"
										size="sm"
										onClick={() => setCompleteModalOpen(true)}
										leftIcon={<UserCheck className="h-4 w-4" />}
										className="shadow-sm w-full md:w-auto font-bold"
									>
										{t(
											"profile.completeSetupButton",
											"Complete User Profile Information",
										)}
									</ModernButton>
								</div>
							</div>
						</div>
					)}

					<Card className="rounded-2xl border border-slate-200/80 shadow-xs dark:border-slate-800">
						<CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-5">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div>
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
								</div>
								{!isCompleteSetup && (
									<Badge
										variant="outline"
										className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold gap-1 text-xs shrink-0 cursor-pointer hover:bg-amber-100"
										onClick={() => setCompleteModalOpen(true)}
									>
										<ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Setup Incomplete
									</Badge>
								)}
							</div>
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
									userProfile.roles.map((role: any, idx: number) => {
										const formattedName = formatRoleName(
											role?.name || role?.displayName || `Role ${idx + 1}`,
										);
										const roleSummaryItem = rolesSummary.find(
											(s) => s.name === formattedName,
										);
										const isSelected = selectedRoleFilter === formattedName;
										return (
											<div
												key={role?.id ?? role?.name ?? `role-${idx}`}
												onClick={() =>
													setSelectedRoleFilter((prev) =>
														prev === formattedName ? "ALL" : formattedName,
													)
												}
												className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
													isSelected
														? "border-indigo-400 bg-indigo-50/70 dark:border-indigo-600 dark:bg-indigo-950/40 shadow-xs"
														: "border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
												}`}
											>
												<div className="flex items-center justify-between">
													<span className="font-bold text-xs text-slate-900 dark:text-white">
														{formattedName}
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
												<div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
													<span>
														{roleSummaryItem
															? `${roleSummaryItem.count} grants`
															: "Assigned"}
													</span>
													<span className="text-indigo-600 dark:text-indigo-400 font-medium">
														{isSelected ? "Filtered • Click to clear" : "Click to filter"}
													</span>
												</div>
											</div>
										);
									})
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
								<div className="flex flex-col gap-3">
									<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
										<div>
											<div className="flex items-center gap-2 flex-wrap">
												<CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
													<Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
													{t(
														"profile.permissionsCard.grantsTitle",
														"Effective Grants & Permissions ({{count}})",
														{ count: distinctCount },
													)}
												</CardTitle>
												<Badge
													variant="outline"
													className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-[10px] px-2 py-0.5 rounded-md"
												>
													{distinctCount} Distinct Grants
												</Badge>
												{duplicateCount > 0 && (
													<Badge
														variant="outline"
														className="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 font-medium text-[10px] px-2 py-0.5 rounded-md gap-1"
														title={`${duplicateCount} duplicate permissions consolidated into unique grants`}
													>
														<Layers className="h-3 w-3 text-indigo-500" />
														{duplicateCount} duplicates merged
													</Badge>
												)}
											</div>
											<CardDescription className="text-xs mt-1">
												{t(
													"profile.permissionsCard.grantsSubtitle",
													"Consolidated authorities active across your assigned roles and direct grants.",
												)}
											</CardDescription>
										</div>

										<div className="w-full sm:w-64">
											<ModernInput
												placeholder={t(
													"profile.permissionsCard.searchPlaceholder",
													"Search permissions or roles...",
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

									{/* Role Filter Pills */}
									{(rolesSummary.length > 1 || selectedRoleFilter !== "ALL") && (
										<div className="flex items-center gap-1.5 pt-1 overflow-x-auto scrollbar-none flex-wrap">
											<span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
												<Filter className="h-3 w-3 text-slate-400" /> Filter:
											</span>
											<button
												type="button"
												onClick={() => setSelectedRoleFilter("ALL")}
												className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
													selectedRoleFilter === "ALL"
														? "bg-indigo-600 text-white shadow-2xs"
														: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
												}`}
											>
												All Roles ({distinctCount})
											</button>
											{rolesSummary.map((rs) => (
												<button
													key={rs.name}
													type="button"
													onClick={() => setSelectedRoleFilter(rs.name)}
													className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
														selectedRoleFilter === rs.name
															? "bg-indigo-600 text-white shadow-2xs"
															: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
													}`}
												>
													{rs.name} ({rs.count})
												</button>
											))}
											{allPermissions.some((p) => p.isDirect) && (
												<button
													type="button"
													onClick={() => setSelectedRoleFilter("DIRECT")}
													className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
														selectedRoleFilter === "DIRECT"
															? "bg-amber-600 text-white shadow-2xs"
															: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
													}`}
												>
													Direct Grants
												</button>
											)}
										</div>
									)}
								</div>
							</CardHeader>
							<CardContent className="pt-4">
								{Object.keys(permissionsByModule).length > 0 ? (
									<div className="space-y-5 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin">
										{Object.entries(permissionsByModule).map(
											([moduleName, perms]) => (
												<div key={moduleName} className="space-y-2.5">
													<div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/80">
														<div className="flex items-center gap-2">
															<Badge
																variant="secondary"
																className="font-bold text-[10px] uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
															>
																{moduleName}
															</Badge>
															<span className="text-[11px] text-slate-400 font-medium">
																{perms.length} {perms.length === 1 ? "grant" : "grants"}
															</span>
														</div>
													</div>

													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
														{perms.map((p) => (
															<div
																key={p.code}
																className="p-3 rounded-xl border border-slate-200/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-900/50 flex flex-col justify-between gap-2 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all hover:shadow-xs group"
															>
																<div className="flex items-start justify-between gap-2">
																	<div className="min-w-0 flex-1">
																		<div className="flex items-center gap-1.5 flex-wrap">
																			<p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
																				{p.name}
																			</p>
																			<span className="text-[10px] text-slate-400 font-mono">
																				{p.code.toLowerCase()}
																			</span>
																		</div>
																		{p.description && (
																			<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
																				{p.description}
																			</p>
																		)}
																	</div>
																	<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
																</div>

																{/* Role attribution badges */}
																<div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex-wrap">
																	{p.grantedByRoles.length > 1 ? (
																		<Badge
																			variant="outline"
																			className="text-[9px] px-1.5 py-0 rounded font-semibold border-indigo-200 bg-indigo-50/70 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 gap-1"
																			title={`Granted by: ${p.grantedByRoles.join(", ")}`}
																		>
																			<Users className="h-2.5 w-2.5 text-indigo-500" />
																			<span>{p.grantedByRoles.length} Roles: {p.grantedByRoles.join(", ")}</span>
																		</Badge>
																	) : p.grantedByRoles.length === 1 ? (
																		<span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
																			<Shield className="h-2.5 w-2.5 text-slate-400 shrink-0" />
																			<span className="truncate">Via {p.grantedByRoles[0]}</span>
																		</span>
																	) : null}

																	{p.isDirect && (
																		<Badge
																			variant="outline"
																			className="text-[9px] px-1.5 py-0 rounded font-semibold border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
																		>
																			Direct Grant
																		</Badge>
																	)}
																</div>
															</div>
														))}
													</div>
												</div>
											),
										)}
									</div>
								) : (
									<div className="py-12 text-center text-slate-400 space-y-3">
										<Search className="h-8 w-8 mx-auto opacity-40 text-slate-400" />
										<div className="space-y-1">
											<p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
												{permissionSearch
													? t(
															"profile.permissionsCard.noMatch",
															'No permissions match "{{query}}"',
															{ query: permissionSearch },
														)
													: "No permissions match current role filter"}
											</p>
											<p className="text-[11px] text-slate-400">
												Try adjusting your search terms or selecting &quot;All Roles&quot;.
											</p>
										</div>
										{(permissionSearch || selectedRoleFilter !== "ALL") && (
											<ModernButton
												variant="outline"
												size="sm"
												onClick={() => {
													setPermissionSearch("");
													setSelectedRoleFilter("ALL");
												}}
												className="text-xs h-8"
											>
												Reset Filters
											</ModernButton>
										)}
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

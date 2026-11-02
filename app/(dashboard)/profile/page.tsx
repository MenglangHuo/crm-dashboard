"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	profileApi,
	usersApi,
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
	Laptop,
	Copy,
	Check,
	PhoneCall,
	ArrowRight,
	Circle,
	Trash2,
	AlertCircle,
	Globe,
	RefreshCw,
	Calendar,
	Smile,
	Edit3,
	ZoomIn,
	ScrollText,
	ExternalLink,
	ChevronDown,
	ChevronUp,
	ChevronRight,
	Sliders,
	X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";
import { ModernButton } from "@/components/ui-custom/modern-button";
import {
	ModernInput,
	ModernSelect,
	ModernDatePicker,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { CompleteProfileModal } from "@/components/users/complete-profile-modal";
import { UserAuditLogsSection } from "@/components/users/user-audit-logs-section";
import { ActiveSessionsTab } from "@/components/users/active-sessions-tab";
import { useTranslation } from "@/lib/i18n/context";

// ---- Validation Schemas --------------------------------------
const profileFormSchema = z.object({
	firstname: z.string().min(1, "First name is required"),
	lastname: z.string().min(1, "Last name is required"),
	nickName: z.string().optional(),
	gender: z.enum(["MALE", "FEMALE", "OTHER"]),
	primaryPhone: z.string().optional(),
	secondaryPhone: z.string().optional(),
	emergencyPhone: z.string().optional(),
	dob: z.string().optional(),
	address: z.string().optional(),
	position: z.string().optional(),
	bio: z.string().optional(),
	remark: z.string().optional(),
	imageUrl: z.string().nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

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

export type CapabilityType =
	| "VIEW"
	| "CREATE"
	| "EDIT"
	| "DELETE"
	| "EXPORT"
	| "MANAGE"
	| "OTHER";

export interface RoleCardInfo {
	name: string;
	rawName: string;
	description?: string;
	status?: string;
	count: number;
}

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
	rolesSummary: RoleCardInfo[];
	modulesList: string[];
	directGrantsCount: number;
}

export function classifyPermissionAction(
	action: string,
	code: string,
): CapabilityType {
	const str = `${action} ${code}`.toUpperCase();
	if (
		str.includes("DELETE") ||
		str.includes("DESTROY") ||
		str.includes("REMOVE") ||
		str.includes("ARCHIVE") ||
		str.includes("PURGE")
	) {
		return "DELETE";
	}
	if (
		str.includes("CREATE") ||
		str.includes("ADD") ||
		str.includes("POST") ||
		str.includes("NEW") ||
		str.includes("INVITE") ||
		str.includes("REGISTER")
	) {
		return "CREATE";
	}
	if (
		str.includes("EDIT") ||
		str.includes("UPDATE") ||
		str.includes("PUT") ||
		str.includes("PATCH") ||
		str.includes("MODIFY") ||
		str.includes("CHANGE")
	) {
		return "EDIT";
	}
	if (
		str.includes("EXPORT") ||
		str.includes("DOWNLOAD") ||
		str.includes("PRINT") ||
		str.includes("REPORT") ||
		str.includes("BACKUP")
	) {
		return "EXPORT";
	}
	if (
		str.includes("MANAGE") ||
		str.includes("ADMIN") ||
		str.includes("CONFIG") ||
		str.includes("ASSIGN") ||
		str.includes("GRANT") ||
		str.includes("REVOKE")
	) {
		return "MANAGE";
	}
	if (
		str.includes("VIEW") ||
		str.includes("READ") ||
		str.includes("GET") ||
		str.includes("LIST") ||
		str.includes("SEARCH") ||
		str.includes("AUDIT") ||
		str.includes("CHECK") ||
		str.includes("LOOKUP") ||
		str.includes("ACCESS")
	) {
		return "VIEW";
	}
	return "OTHER";
}

export const CAPABILITY_CONFIG: Record<
	CapabilityType,
	{
		label: string;
		shortLabel: string;
		badgeClass: string;
		dotClass: string;
	}
> = {
	VIEW: {
		label: "View & Read",
		shortLabel: "View",
		badgeClass:
			"bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
		dotClass: "bg-emerald-500",
	},
	CREATE: {
		label: "Create",
		shortLabel: "Create",
		badgeClass:
			"bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
		dotClass: "bg-sky-500",
	},
	EDIT: {
		label: "Edit",
		shortLabel: "Edit",
		badgeClass:
			"bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
		dotClass: "bg-amber-500",
	},
	DELETE: {
		label: "Delete",
		shortLabel: "Delete",
		badgeClass:
			"bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
		dotClass: "bg-rose-500",
	},
	MANAGE: {
		label: "Admin / Manage",
		shortLabel: "Admin",
		badgeClass:
			"bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
		dotClass: "bg-purple-500",
	},
	EXPORT: {
		label: "Export",
		shortLabel: "Export",
		badgeClass:
			"bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
		dotClass: "bg-teal-500",
	},
	OTHER: {
		label: "Special Action",
		shortLabel: "Action",
		badgeClass:
			"bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/60",
		dotClass: "bg-slate-400",
	},
};

export function getDomainIcon(moduleName: string) {
	const mod = moduleName.toLowerCase();
	if (
		mod.includes("user") ||
		mod.includes("member") ||
		mod.includes("team") ||
		mod.includes("staff")
	) {
		return Users;
	}
	if (
		mod.includes("customer") ||
		mod.includes("client") ||
		mod.includes("contact") ||
		mod.includes("lead")
	) {
		return UserCheck;
	}
	if (
		mod.includes("deal") ||
		mod.includes("pipeline") ||
		mod.includes("opportunity") ||
		mod.includes("sale")
	) {
		return Briefcase;
	}
	if (
		mod.includes("report") ||
		mod.includes("analytic") ||
		mod.includes("metric") ||
		mod.includes("chart")
	) {
		return Activity;
	}
	if (
		mod.includes("setting") ||
		mod.includes("config") ||
		mod.includes("system") ||
		mod.includes("preference")
	) {
		return Sliders;
	}
	if (
		mod.includes("security") ||
		mod.includes("audit") ||
		mod.includes("role") ||
		mod.includes("permission") ||
		mod.includes("auth")
	) {
		return ShieldCheck;
	}
	if (
		mod.includes("billing") ||
		mod.includes("invoice") ||
		mod.includes("payment") ||
		mod.includes("plan") ||
		mod.includes("subscription")
	) {
		return FileText;
	}
	if (
		mod.includes("company") ||
		mod.includes("organization") ||
		mod.includes("division") ||
		mod.includes("department")
	) {
		return Building2;
	}
	return Layers;
}

export function getRoleFallbackDescription(
	roleName: string,
	count: number,
): string {
	const upper = roleName.toUpperCase();
	if (upper.includes("SUPER") || upper.includes("SYSTEM_ADMIN")) {
		return "Unrestricted system-wide governance, global configurations, and administrative overrides.";
	}
	if (upper.includes("ADMIN")) {
		return "Comprehensive organizational administration, team governance, and workspace configuration.";
	}
	if (
		upper.includes("MANAGER") ||
		upper.includes("DIRECTOR") ||
		upper.includes("LEAD")
	) {
		return "Operational management authority across team records, business pipelines, and activity reports.";
	}
	if (
		upper.includes("SALES") ||
		upper.includes("REP") ||
		upper.includes("AGENT")
	) {
		return "Standard sales operations to manage customer pipelines, client communications, and deals.";
	}
	if (upper.includes("SUPPORT") || upper.includes("SERVICE")) {
		return "Customer care access to review inquiries, update contacts, and manage resolution tickets.";
	}
	return `Authorizes ${count} specialized capabilities and business workflows across your CRM workspace.`;
}

function aggregateAndDeduplicatePermissions(
	userProfile: any,
): PermissionsAggregationResult {
	const permMap = new Map<string, NormalizedPermission>();
	let totalRawGrants = 0;
	const roleCountMap = new Map<string, number>();
	const roleMetaMap = new Map<
		string,
		{ rawName: string; description?: string; status?: string }
	>();

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
		if (roleName) {
			roleCountMap.set(roleName, (roleCountMap.get(roleName) || 0) + 1);
		}

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
		const rawName = String(
			typeof roleObj === "string"
				? roleObj
				: roleObj?.name || roleObj?.displayName || "Role",
		);
		const roleName = formatRoleName(rawName);
		const desc =
			typeof roleObj === "object" ? roleObj?.description : undefined;
		const status =
			typeof roleObj === "object" ? roleObj?.status : undefined;
		if (!roleMetaMap.has(roleName)) {
			roleMetaMap.set(roleName, { rawName, description: desc, status });
		}
		if (!roleCountMap.has(roleName)) {
			roleCountMap.set(roleName, 0);
		}
		const fullRole = roleObj;

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

	const directGrantsCount = distinctPermissions.filter((p) => p.isDirect).length;

	let rolesSummary: RoleCardInfo[] = Array.from(roleCountMap.entries()).map(
		([name, count]) => {
			const meta = roleMetaMap.get(name);
			return {
				name,
				rawName: meta?.rawName || name,
				description: meta?.description,
				status: meta?.status || "ACTIVE",
				count,
			};
		},
	);

	if (rolesSummary.length === 0) {
		if (userProfile?.isSuperAdmin) {
			rolesSummary.push({
				name: "Super Administrator",
				rawName: "SUPER_ADMIN",
				description:
					"Unrestricted system-wide governance, global configurations, and administrative overrides.",
				status: "ACTIVE",
				count: distinctPermissions.length,
			});
		} else if (userProfile?.isSystemAdmin) {
			rolesSummary.push({
				name: "System Administrator",
				rawName: "SYSTEM_ADMIN",
				description:
					"System administration and operational workspace management authority.",
				status: "ACTIVE",
				count: distinctPermissions.length,
			});
		}
	}

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
		directGrantsCount,
	};
}

export default function ProfilePage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);
	const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
	const [profileImageModalOpen, setProfileImageModalOpen] = useState(false);
	const [completeModalOpen, setCompleteModalOpen] = useState(false);
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [permissionSearch, setPermissionSearch] = useState("");
	const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
	const [selectedActionFilter, setSelectedActionFilter] = useState<string>("ALL");
	const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
	const [isEditingImageUrl, setIsEditingImageUrl] = useState(false);
	const [imageUrlInput, setImageUrlInput] = useState("");
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const genderOptions = useMemo(
		() => [
			{ value: "MALE", label: "Male" },
			{ value: "FEMALE", label: "Female" },
			{ value: "OTHER", label: "Other" },
		],
		[],
	);

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
			firstname: userProfile?.firstname || userProfile?.firstName || "",
			lastname: userProfile?.lastname || userProfile?.lastName || "",
			nickName: userProfile?.nickName || userProfile?.nickname || "",
			gender: (userProfile?.gender === "FEMALE"
				? "FEMALE"
				: userProfile?.gender === "OTHER"
					? "OTHER"
					: "MALE") as "MALE" | "FEMALE" | "OTHER",
			primaryPhone:
				userProfile?.primaryPhone ||
				userProfile?.contact ||
				userProfile?.phone ||
				"",
			secondaryPhone: userProfile?.secondaryPhone || "",
			emergencyPhone: userProfile?.emergencyPhone || "",
			dob: userProfile?.dob || "",
			address: userProfile?.address || "",
			position: userProfile?.position || "",
			bio: userProfile?.bio || "",
			remark: userProfile?.remark || userProfile?.remarks || "",
			imageUrl:
				userProfile?.imageUrl ||
				userProfile?.avatarUrl ||
				userProfile?.avatarKey ||
				"",
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
				firstname: values.firstname,
				lastname: values.lastname,
				nickName: values.nickName,
				gender: values.gender,
				primaryPhone: values.primaryPhone,
				secondaryPhone: values.secondaryPhone,
				emergencyPhone: values.emergencyPhone,
				dob: values.dob,
				address: values.address,
				position: values.position,
				bio: values.bio,
				remark: values.remark,
				imageUrl: values.imageUrl,
			}),
		onSuccess: () => {
			toast.success("Profile updated successfully");
			setEditProfileModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			queryClient.invalidateQueries({ queryKey: ["auth-me"] });
			queryClient.invalidateQueries({ queryKey: ["current-user"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateAvatarImageMutation = useMutation({
		mutationFn: async (imageUrl: string) => {
			if (!userProfile?.id) throw new Error("User profile not loaded");
			return profileApi.update({
				id: userProfile.id,
				...profileForm.getValues(),
				imageUrl,
			});
		},
		onSuccess: (_, imageUrl) => {
			toast.success("Profile image updated successfully!");
			profileForm.setValue("imageUrl", imageUrl, { shouldDirty: true });
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
			setPasswordModalOpen(false);
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

	const handleAvatarUpload = async (file: File) => {
		const toastId = toast.loading("Uploading avatar image...");
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
				profileForm.setValue("imageUrl", finalUrl, { shouldDirty: true });
				toast.success("Avatar image uploaded");
			}
		} catch (err) {
			toast.dismiss(toastId);
			toast.error("Failed to upload avatar image");
		}
	};

	const handleRemoveAvatar = () => {
		if (userProfile?.id) {
			updateAvatarImageMutation.mutate("");
		} else {
			profileForm.setValue("imageUrl", "", { shouldDirty: true });
			toast.success("Avatar photo removed");
		}
	};

	const handleApplyImageUrl = (url: string) => {
		if (!url.trim()) return;
		if (userProfile?.id) {
			updateAvatarImageMutation.mutate(url.trim());
		} else {
			profileForm.setValue("imageUrl", url.trim(), { shouldDirty: true });
			toast.success("Profile image URL updated");
		}
		setIsEditingImageUrl(false);
		setImageUrlInput("");
	};

	const copyToClipboard = (text: string, fieldName: string) => {
		if (!text) return;
		navigator.clipboard.writeText(text);
		setCopiedField(fieldName);
		toast.success(`Copied ${fieldName} to clipboard`);
		setTimeout(() => setCopiedField(null), 2000);
	};

	// ---- Password Validation & Strength Calculation ------------------------
	const newPasswordValue = passwordForm.watch("newPassword") || "";
	const confirmPasswordValue = passwordForm.watch("confirmPassword") || "";

	const passwordValidation = useMemo(() => {
		const pwd = newPasswordValue;
		return {
			hasMinLength: pwd.length >= 8,
			hasUpper: /[A-Z]/.test(pwd),
			hasLower: /[a-z]/.test(pwd),
			hasNumber: /[0-9]/.test(pwd),
			hasSpecial: /[^A-Za-z0-9]/.test(pwd),
			isMatching: pwd.length > 0 && pwd === confirmPasswordValue,
		};
	}, [newPasswordValue, confirmPasswordValue]);

	const passwordStrength = useMemo(() => {
		if (!newPasswordValue) return 0;
		let score = 0;
		if (newPasswordValue.length >= 8) score += 1;
		if (/[A-Z]/.test(newPasswordValue) && /[a-z]/.test(newPasswordValue)) score += 1;
		if (/[0-9]/.test(newPasswordValue)) score += 1;
		if (/[^A-Za-z0-9]/.test(newPasswordValue)) score += 1;
		return score;
	}, [newPasswordValue]);

	const getStrengthDetails = (score: number) => {
		switch (score) {
			case 1:
				return {
					label: "Weak",
					color: "bg-rose-500",
					textColor: "text-rose-500",
					description: "Add uppercase, numbers, and symbols",
				};
			case 2:
				return {
					label: "Fair",
					color: "bg-amber-500",
					textColor: "text-amber-500",
					description: "Good start, include symbols and length",
				};
			case 3:
				return {
					label: "Good",
					color: "bg-sky-500",
					textColor: "text-sky-500",
					description: "Almost there, make it 10+ characters",
				};
			case 4:
				return {
					label: "Strong",
					color: "bg-emerald-500",
					textColor: "text-emerald-500",
					description: "Excellent enterprise password protection",
				};
			default:
				return {
					label: "Too short",
					color: "bg-slate-200 dark:bg-slate-700",
					textColor: "text-slate-400",
					description: "Must be at least 8 characters",
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
		return aggregateAndDeduplicatePermissions(userProfile);
	}, [userProfile]);

	const {
		permissions: allPermissions,
		totalRawGrants,
		distinctCount,
		duplicateCount,
		rolesSummary,
		modulesList,
		directGrantsCount,
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
		if (selectedActionFilter !== "ALL") {
			list = list.filter((p) => {
				const cap = classifyPermissionAction(p.action, p.code);
				return cap === selectedActionFilter;
			});
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
	}, [allPermissions, selectedRoleFilter, selectedActionFilter, permissionSearch]);

	// Capability counts based on active role and search
	const capabilityCounts = useMemo(() => {
		let baseList = allPermissions;
		if (selectedRoleFilter !== "ALL") {
			if (selectedRoleFilter === "DIRECT") {
				baseList = baseList.filter((p) => p.isDirect);
			} else {
				baseList = baseList.filter((p) =>
					p.grantedByRoles.includes(selectedRoleFilter),
				);
			}
		}
		if (permissionSearch.trim()) {
			const query = permissionSearch.toLowerCase().trim();
			baseList = baseList.filter(
				(p) =>
					p.name.toLowerCase().includes(query) ||
					p.code.toLowerCase().includes(query) ||
					p.module.toLowerCase().includes(query) ||
					p.action.toLowerCase().includes(query) ||
					(p.description && p.description.toLowerCase().includes(query)) ||
					p.grantedByRoles.some((r) => r.toLowerCase().includes(query)),
			);
		}
		const counts: Record<string, number> = {
			ALL: baseList.length,
			VIEW: 0,
			CREATE: 0,
			EDIT: 0,
			DELETE: 0,
			EXPORT: 0,
			MANAGE: 0,
			OTHER: 0,
		};
		baseList.forEach((p) => {
			const cap = classifyPermissionAction(p.action, p.code);
			counts[cap] = (counts[cap] || 0) + 1;
		});
		return counts;
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

	// Distinct capabilities per module
	const moduleCapabilities = useMemo(() => {
		const caps: Record<string, Set<CapabilityType>> = {};
		Object.entries(permissionsByModule).forEach(([modName, perms]) => {
			const set = new Set<CapabilityType>();
			perms.forEach((p) => {
				set.add(classifyPermissionAction(p.action, p.code));
			});
			caps[modName] = set;
		});
		return caps;
	}, [permissionsByModule]);

	const toggleModule = (modName: string) => {
		setExpandedModules((prev) => ({
			...prev,
			[modName]: prev[modName] !== undefined ? !prev[modName] : false,
		}));
	};

	const expandAllModules = (mods: string[]) => {
		const next: Record<string, boolean> = {};
		mods.forEach((m) => {
			next[m] = true;
		});
		setExpandedModules(next);
	};

	const collapseAllModules = (mods: string[]) => {
		const next: Record<string, boolean> = {};
		mods.forEach((m) => {
			next[m] = false;
		});
		setExpandedModules(next);
	};

	const isModuleExpanded = (modName: string) => {
		if (permissionSearch.trim().length > 0 || selectedActionFilter !== "ALL") {
			return true;
		}
		return expandedModules[modName] ?? true;
	};

	// Check whether current user has permission to view audit logs & trail
	const canViewAuditLogs = useMemo(() => {
		if (userProfile?.isSuperAdmin || userProfile?.isSystemAdmin) return true;
		const roles = userProfile?.roles || [];
		if (
			roles.some((r: any) => {
				const name = (typeof r === "string" ? r : r?.name || "").toUpperCase();
				return (
					name.includes("ADMIN") ||
					name.includes("AUDIT") ||
					name.includes("MANAGER") ||
					name.includes("SUPERVISOR") ||
					name.includes("DIRECTOR")
				);
			})
		) {
			return true;
		}
		const perms = allPermissions || [];
		if (
			perms.some((p: any) => {
				const str = `${p.module || ""} ${p.action || ""} ${p.code || ""} ${p.name || ""}`.toLowerCase();
				return (
					str.includes("audit") ||
					str.includes("log") ||
					str.includes("activity") ||
					str.includes("history")
				);
			})
		) {
			return true;
		}
		return false;
	}, [userProfile, allPermissions]);

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

	const currentImageUrl = profileForm.watch("imageUrl");
	const avatarSrc = currentImageUrl
		? fileUrl(currentImageUrl)
		: userProfile.imageUrl ||
			userProfile.avatarUrl ||
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
							<button
								type="button"
								onClick={() => setProfileImageModalOpen(true)}
								className="cursor-pointer group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform duration-200 hover:scale-[1.02]"
								title={t("profile.viewProfilePhoto", "Click to view profile photo")}
								aria-label={t("profile.viewProfilePhoto", "View profile photo")}
							>
								<Avatar className="h-20 w-20 ring-2 ring-slate-100 shadow-sm dark:ring-slate-800 transition-all duration-200 group-hover:ring-4 group-hover:ring-primary/30">
									<AvatarImage
										src={avatarSrc}
										alt={userProfile.firstname || userProfile.firstName || userProfile.username}
									/>
									<AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
										{userProfile.firstname?.[0] ||
											userProfile.firstName?.[0] ||
											userProfile.username?.[0]?.toUpperCase() ||
											"U"}
										{userProfile.lastname?.[0] || userProfile.lastName?.[0] || ""}
									</AvatarFallback>
								</Avatar>
								<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
									<ZoomIn className="h-5 w-5 mb-0.5" />
									<span className="text-[9px] font-bold tracking-wider uppercase">View</span>
								</div>
							</button>
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

							<div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2.5 flex-wrap">
								<span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
									<UserIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />@
									{userProfile.username}
								</span>
								<span className="text-slate-300 dark:text-slate-600 select-none">•</span>
								<span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
									<Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
									{userProfile.email}
								</span>
								{(userProfile.companyName || userProfile.company?.name) && (
									<>
										<span className="text-slate-300 dark:text-slate-600 select-none">•</span>
										<span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
											<Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
											{userProfile.companyName || userProfile.company?.name}
										</span>
									</>
								)}
							</div>

							{(userProfile.position ||
								staff?.position ||
								userProfile.departmentName ||
								userProfile.department?.name ||
								userProfile.branchName ||
								staff?.branchName) && (
								<div className="flex items-center gap-2 pt-0.5 flex-wrap">
									{(userProfile.position || staff?.position) && (
										<Badge
											variant="secondary"
											className="gap-1 font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px]"
										>
											<Briefcase className="h-3 w-3" />
											{userProfile.position || staff?.position}
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
							)}
						</div>
					</div>

					{/* Quick Metrics & Actions */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-200/80 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6 flex-wrap">
						{/* Quick Metrics */}
						<div className="flex items-center gap-4 justify-around sm:justify-start">
							<div className="space-y-0.5 text-center sm:text-left min-w-[80px]">
								<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
									{t("profile.assignedRolesCount", "Assigned Roles")}
								</p>
								<p className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">
									{userProfile.roles?.length || 0}
								</p>
							</div>
							<Separator orientation="vertical" className="h-8" />
							<div className="space-y-0.5 text-center sm:text-left min-w-[80px]">
								<p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
									{t("profile.effectiveGrantsCount", "Effective Grants")}
								</p>
								<p className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
									{distinctCount}
								</p>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-2 sm:pt-0">
							<ModernButton
								type="button"
								variant="primary"
								size="sm"
								rounded="lg"
								onClick={() => setEditProfileModalOpen(true)}
								leftIcon={<Edit3 className="size-3.5" />}
								className="h-9 px-3.5 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex-1 sm:flex-initial"
							>
								{t("profile.editProfile", "Edit Profile")}
							</ModernButton>

							<ModernButton
								type="button"
								variant="outline"
								size="sm"
								rounded="lg"
								onClick={() => setPasswordModalOpen(true)}
								leftIcon={<KeyRound className="size-3.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700" />}
								className="h-9 px-3.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all flex-1 sm:flex-initial"
							>
								{t("profile.changePassword", "Change Password")}
							</ModernButton>

							{canViewAuditLogs ? (
								<ModernButton
									type="button"
									variant="outline"
									size="sm"
									rounded="lg"
									onClick={() => setAuditDrawerOpen(true)}
									leftIcon={<ScrollText className="size-3.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-700" />}
									className="h-9 px-3.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all flex-1 sm:flex-initial"
								>
									{t("profile.auditTrail", "Audit Trail")}
								</ModernButton>
							) : (
								<div title="You do not have permission to view system audit logs">
									<ModernButton
										type="button"
										variant="outline"
										size="sm"
										rounded="lg"
										disabled
										leftIcon={<Lock className="size-3.5 text-slate-400" />}
										className="h-9 px-3.5 text-xs font-semibold opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 flex-1 sm:flex-initial"
									>
										{t("profile.auditTrailRestricted", "Audit Trail (Locked)")}
									</ModernButton>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ============================================================ */}
			{/* Forced Incomplete Setup Alert Banner */}
			{/* ============================================================ */}
			{!isCompleteSetup && (
				<div className="overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/70 p-4 sm:p-5 shadow-2xs dark:border-amber-700/60 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-amber-950/30">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="flex items-center gap-3.5">
							<div className="rounded-xl bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0 ring-1 ring-amber-500/30">
								<ShieldAlert className="h-5 w-5" />
							</div>
							<div className="space-y-0.5">
								<div className="flex items-center gap-2">
									<h4 className="font-bold text-sm text-amber-950 dark:text-amber-200">
										Profile Setup Incomplete
									</h4>
									<Badge
										variant="outline"
										className="border-amber-400 bg-amber-100/80 text-amber-800 dark:border-amber-600 dark:bg-amber-900/60 dark:text-amber-200 text-[10px] font-bold px-1.5 py-0 rounded"
									>
										Action Required
									</Badge>
								</div>
								<p className="text-xs text-amber-900/80 dark:text-amber-300/80">
									Please complement your contact numbers, job position, and address to activate all system permissions and directory tools.
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={() => setEditProfileModalOpen(true)}
							className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
						>
							<UserCheck className="size-3.5" />
							<span>Complete Setup Now</span>
							<ArrowRight className="size-3.5" />
						</button>
					</div>
				</div>
			)}

			{/* ============================================================ */}
			{/* SECTION 1: Profile Information Dossier (Executive Clean Grid) */}
			{/* ============================================================ */}
			<div className="space-y-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Block 1: Personal & Demographic Identity */}
					<div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs flex flex-col justify-between">
						<div>
							<div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
								<div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
									<UserIcon className="size-4" />
								</div>
								<div>
									<h3 className="text-sm font-bold text-slate-900 dark:text-white">Personal Identity</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400">Legal names, nickname, gender, and birth details</p>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										First Name
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
										{profileForm.watch("firstname") || userProfile.firstname || userProfile.firstName || "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Last Name
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
										{profileForm.watch("lastname") || userProfile.lastname || userProfile.lastName || "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Nickname
									</span>
									<div className="mt-1">
										{profileForm.watch("nickName") || userProfile.nickName ? (
											<Badge variant="secondary" className="text-xs font-semibold bg-blue-100/70 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
												&quot;{profileForm.watch("nickName") || userProfile.nickName}&quot;
											</Badge>
										) : (
											<span className="text-sm font-semibold text-slate-400 dark:text-slate-500">—</span>
										)}
									</div>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Gender
									</span>
									<div className="mt-1">
										<Badge variant="outline" className="text-xs font-semibold border-slate-200 dark:border-slate-700">
											{profileForm.watch("gender") || userProfile.gender || "MALE"}
										</Badge>
									</div>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 sm:col-span-2 flex items-center justify-between">
									<div>
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
											Date of Birth
										</span>
										<span className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1 block">
											{profileForm.watch("dob") || userProfile.dob || "—"}
										</span>
									</div>
									<Calendar className="size-4 text-slate-400" />
								</div>
							</div>
						</div>
					</div>

					{/* Block 2: Corporate Organization & Placement */}
					<div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs flex flex-col justify-between">
						<div>
							<div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
								<div className="p-2 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
									<Briefcase className="size-4" />
								</div>
								<div>
									<h3 className="text-sm font-bold text-slate-900 dark:text-white">Organization & Hierarchy</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400">Enterprise positioning, corporate branch, and staff credentials</p>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Job Title / Position
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
										{profileForm.watch("position") || userProfile.position || staff?.position || "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Staff / Employee ID
									</span>
									<span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mt-1 block truncate">
										{userProfile.employeeCode ? `#${userProfile.employeeCode}` : "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Company
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
										{userProfile.companyName || userProfile.company?.name || "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
										Department
									</span>
									<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
										{userProfile.departmentName || userProfile.department?.name || "—"}
									</span>
								</div>

								<div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 sm:col-span-2 flex items-center justify-between">
									<div>
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
											Branch
										</span>
										<span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block truncate">
											{userProfile.branchName || staff?.branchName || "—"}
										</span>
									</div>
									<MapPin className="size-4 text-slate-400" />
								</div>
							</div>
						</div>
					</div>

					{/* Block 3: Contact Channels & Credentials */}
					<div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs">
						<div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
							<div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
								<Phone className="size-4" />
							</div>
							<div>
								<h3 className="text-sm font-bold text-slate-900 dark:text-white">Communication Channels</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400">Direct phone numbers, corporate email, and location address</p>
							</div>
						</div>

						<div className="space-y-3">
							{/* Email */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 transition-colors">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
										<Mail className="size-4" />
									</div>
									<div className="min-w-0">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
											Corporate Email
										</span>
										<span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate block">
											{userProfile.email || "—"}
										</span>
									</div>
								</div>
								{userProfile.email && (
									<button
										type="button"
										onClick={() => copyToClipboard(userProfile.email || "", "Corporate Email")}
										className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
										title="Copy email"
									>
										{copiedField === "Corporate Email" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
									</button>
								)}
							</div>

							{/* Primary Phone */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 transition-colors">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
										<Phone className="size-4" />
									</div>
									<div className="min-w-0">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
											Primary Phone
										</span>
										<span className="text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white truncate block">
											{profileForm.watch("primaryPhone") || userProfile.primaryPhone || userProfile.phone || userProfile.contact || "—"}
										</span>
									</div>
								</div>
								{(profileForm.watch("primaryPhone") || userProfile.primaryPhone || userProfile.phone || userProfile.contact) && (
									<button
										type="button"
										onClick={() => copyToClipboard(profileForm.watch("primaryPhone") || userProfile.primaryPhone || userProfile.phone || userProfile.contact || "", "Primary Phone")}
										className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
										title="Copy phone"
									>
										{copiedField === "Primary Phone" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
									</button>
								)}
							</div>

							{/* Secondary Phone */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 transition-colors">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
										<Phone className="size-4" />
									</div>
									<div className="min-w-0">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
											Secondary Phone
										</span>
										<span className="text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white truncate block">
											{profileForm.watch("secondaryPhone") || userProfile.secondaryPhone || "—"}
										</span>
									</div>
								</div>
								{(profileForm.watch("secondaryPhone") || userProfile.secondaryPhone) && (
									<button
										type="button"
										onClick={() => copyToClipboard(profileForm.watch("secondaryPhone") || userProfile.secondaryPhone || "", "Secondary Phone")}
										className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
										title="Copy secondary phone"
									>
										{copiedField === "Secondary Phone" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
									</button>
								)}
							</div>

							{/* Emergency Phone */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 transition-colors">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
										<PhoneCall className="size-4" />
									</div>
									<div className="min-w-0">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
											Emergency Contact
										</span>
										<span className="text-xs sm:text-sm font-mono font-medium text-slate-900 dark:text-white truncate block">
											{profileForm.watch("emergencyPhone") || userProfile.emergencyPhone || "—"}
										</span>
									</div>
								</div>
								{(profileForm.watch("emergencyPhone") || userProfile.emergencyPhone) && (
									<button
										type="button"
										onClick={() => copyToClipboard(profileForm.watch("emergencyPhone") || userProfile.emergencyPhone || "", "Emergency Phone")}
										className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
										title="Copy emergency phone"
									>
										{copiedField === "Emergency Phone" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
									</button>
								)}
							</div>

							{/* Address */}
							<div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 transition-colors">
								<div className="flex items-center gap-3 min-w-0">
									<div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
										<MapPin className="size-4" />
									</div>
									<div className="min-w-0">
										<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
											Office / Residential Address
										</span>
										<span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate block" title={profileForm.watch("address") || userProfile.address}>
											{profileForm.watch("address") || userProfile.address || "—"}
										</span>
									</div>
								</div>
								{(profileForm.watch("address") || userProfile.address) && (
									<button
										type="button"
										onClick={() => copyToClipboard(profileForm.watch("address") || userProfile.address || "", "Address")}
										className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
										title="Copy address"
									>
										{copiedField === "Address" ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
									</button>
								)}
							</div>
						</div>
					</div>

					{/* Block 4: Executive Bio & Background Notes */}
					<div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-6 shadow-xs flex flex-col justify-between">
						<div>
							<div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
								<div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
									<FileText className="size-4" />
								</div>
								<div>
									<h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Background</h3>
									<p className="text-xs text-slate-500 dark:text-slate-400">Professional statement, biography, and administrative remarks</p>
								</div>
							</div>

							<div className="space-y-4">
								<div className="space-y-1.5">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
										About Bio
									</span>
									<div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
										&ldquo;{profileForm.watch("bio") || userProfile.bio || "No biography provided."}&rdquo;
									</div>
								</div>

								<div className="space-y-1.5">
									<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
										Administrative Remarks & Notes
									</span>
									<div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
										{profileForm.watch("remark") || userProfile.remark || userProfile.remarks || "No administrative remarks recorded."}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ============================================================ */}
			{/* SECTION 3: Authorized Devices & Sessions (Below Profile Info) */}
			{/* ============================================================ */}
			<Card className="border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900/60">
								<CardContent className="pt-1">
					<ActiveSessionsTab />
				</CardContent>
			</Card>

			{/* ============================================================ */}
			{/* MODAL 1: Update Profile Information Modal */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={editProfileModalOpen}
				onClose={() => setEditProfileModalOpen(false)}
				onOpenChange={setEditProfileModalOpen}
				title="Update Profile Information"
				subtitle="Manage your personal identity, contact numbers, job position, and bio."
				icon={<Edit3 className="size-5 text-blue-600 dark:text-blue-400" />}
				size="xl"
				draggable
			>
				<form
					onSubmit={profileForm.handleSubmit(onProfileSubmit)}
					className="space-y-6 max-h-[75vh] overflow-y-auto pr-1"
				>
					{/* Avatar Studio */}
					<div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center gap-5">
						<div
							onClick={() => setProfileImageModalOpen(true)}
							className="relative group shrink-0 cursor-pointer"
							title="Click to inspect photo in detail"
						>
							<Avatar className="h-20 w-20 ring-4 ring-white shadow-md dark:ring-slate-800 transition-all duration-200 group-hover:scale-105 group-hover:ring-blue-500/40">
								<AvatarImage src={avatarSrc} alt={userProfile.displayName || "Avatar"} />
								<AvatarFallback className="text-xl font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
									{userProfile.firstname?.[0] ||
										userProfile.firstName?.[0] ||
										userProfile.username?.[0]?.toUpperCase() ||
										"U"}
									{userProfile.lastname?.[0] || userProfile.lastName?.[0] || ""}
								</AvatarFallback>
							</Avatar>
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-2xs">
								<ZoomIn className="h-5 w-5 mb-0.5" />
								<span className="text-[9px] font-bold tracking-wider uppercase">View</span>
							</div>
						</div>

						<div className="flex-1 space-y-2 text-center sm:text-left">
							<div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
								<h5 className="font-bold text-sm text-slate-900 dark:text-white">
									Profile Photograph
								</h5>
								<Badge variant="outline" className="text-[10px] font-semibold border-slate-200 dark:border-slate-700">
									Public Avatar
								</Badge>
								{avatarSrc && (
									<Badge variant="outline" className="text-[10px] font-semibold border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
										Photo Active
									</Badge>
								)}
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Upload a photo from your computer or provide an image link.
							</p>
							<div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5 flex-wrap">
								<label
									htmlFor="modal-avatar-upload"
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs transition-colors"
								>
									<Camera className="size-3.5 text-blue-600 dark:text-blue-400" />
									Upload Photo
								</label>
								<input
									id="modal-avatar-upload"
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleAvatarUpload(file);
										if (e.target) e.target.value = "";
									}}
								/>

								<button
									type="button"
									onClick={() => setIsEditingImageUrl(!isEditingImageUrl)}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs transition-colors"
								>
									<Globe className="size-3.5 text-indigo-500" />
									Image URL
								</button>

								{avatarSrc && (
									<button
										type="button"
										onClick={handleRemoveAvatar}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
									>
										<Trash2 className="size-3.5" />
										Remove
									</button>
								)}
							</div>

							{/* Inline Direct Image URL input */}
							{isEditingImageUrl && (
								<div className="pt-2 flex items-center gap-2 max-w-lg">
									<ModernInput
										placeholder="Paste image URL (e.g. https://i.pravatar.cc/150?u=1)"
										value={imageUrlInput}
										onChange={(e) => setImageUrlInput(e.target.value)}
										containerClassName="flex-1"
										className="text-xs h-9"
									/>
									<ModernButton
										type="button"
										size="sm"
										onClick={() => handleApplyImageUrl(imageUrlInput)}
										disabled={!imageUrlInput.trim()}
										className="text-xs h-9"
									>
										Apply
									</ModernButton>
									<button
										type="button"
										onClick={() => {
											setIsEditingImageUrl(false);
											setImageUrlInput("");
										}}
										className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
									>
										Cancel
									</button>
								</div>
							)}
						</div>
					</div>

					{/* Names & Demographics */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<ModernInput
							id="modal-firstname"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<UserIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
									First Name <span className="text-rose-500">*</span>
								</span>
							}
							placeholder="Enter first name"
							autoComplete="given-name"
							leftIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
							error={profileForm.formState.errors.firstname?.message}
							{...profileForm.register("firstname")}
						/>

						<ModernInput
							id="modal-lastname"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<UserIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
									Last Name <span className="text-rose-500">*</span>
								</span>
							}
							placeholder="Enter last name"
							autoComplete="family-name"
							leftIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
							error={profileForm.formState.errors.lastname?.message}
							{...profileForm.register("lastname")}
						/>

						<ModernInput
							id="modal-nickName"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Smile className="h-3.5 w-3.5 text-indigo-500" />
									Nickname
								</span>
							}
							placeholder="e.g. Dego Rosta"
							leftIcon={<Smile className="h-4 w-4 text-slate-400" />}
							error={profileForm.formState.errors.nickName?.message}
							{...profileForm.register("nickName")}
						/>
					</div>

					{/* Gender & DOB */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernSelect
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Users className="h-3.5 w-3.5 text-indigo-500" />
									Gender
								</span>
							}
							value={profileForm.watch("gender")}
							onChange={(val) =>
								profileForm.setValue(
									"gender",
									val as "MALE" | "FEMALE" | "OTHER",
									{ shouldValidate: true, shouldDirty: true },
								)
							}
							options={genderOptions}
							leftIcon={<Users className="h-4 w-4 text-slate-400" />}
							placeholder="Select gender"
							error={profileForm.formState.errors.gender?.message}
						/>

						<ModernDatePicker
							id="modal-dob"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Calendar className="h-3.5 w-3.5 text-indigo-500" />
									Date of Birth
								</span>
							}
							value={profileForm.watch("dob")}
							onChange={(date) =>
								profileForm.setValue("dob", date, {
									shouldValidate: true,
									shouldDirty: true,
								})
							}
							placeholder="DD-MM-YYYY (e.g. 01-03-2001)"
							clearable
							error={profileForm.formState.errors.dob?.message}
						/>
					</div>

					{/* Position */}
					<ModernInput
						id="modal-position"
						label={
							<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
								<Briefcase className="h-3.5 w-3.5 text-sky-500" />
								Job Title / Position
							</span>
						}
						placeholder="e.g. Sales Director, Senior Consultant"
						autoComplete="organization-title"
						leftIcon={<Briefcase className="h-4 w-4 text-slate-400" />}
						{...profileForm.register("position")}
					/>

					{/* Phone Numbers */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<ModernInput
							id="modal-primaryPhone"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Phone className="h-3.5 w-3.5 text-emerald-500" />
									Primary Phone
								</span>
							}
							placeholder="e.g. 098739376"
							autoComplete="tel"
							leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
							error={profileForm.formState.errors.primaryPhone?.message}
							{...profileForm.register("primaryPhone")}
						/>

						<ModernInput
							id="modal-secondaryPhone"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Phone className="h-3.5 w-3.5 text-sky-500" />
									Secondary Phone
								</span>
							}
							placeholder="e.g. 098739374"
							autoComplete="tel"
							leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
							error={profileForm.formState.errors.secondaryPhone?.message}
							{...profileForm.register("secondaryPhone")}
						/>

						<ModernInput
							id="modal-emergencyPhone"
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<PhoneCall className="h-3.5 w-3.5 text-amber-500" />
									Emergency Phone
								</span>
							}
							placeholder="e.g. 098739374"
							autoComplete="tel"
							leftIcon={<PhoneCall className="h-4 w-4 text-amber-500" />}
							helperText="Urgent safety contact"
							error={profileForm.formState.errors.emergencyPhone?.message}
							{...profileForm.register("emergencyPhone")}
						/>
					</div>

					{/* Address */}
					<ModernInput
						id="modal-address"
						label={
							<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
								<MapPin className="h-3.5 w-3.5 text-rose-500" />
								Residential / Office Address
							</span>
						}
						placeholder="e.g. Phnom Penh City"
						autoComplete="street-address"
						leftIcon={<MapPin className="h-4 w-4 text-slate-400" />}
						error={profileForm.formState.errors.address?.message}
						{...profileForm.register("address")}
					/>

					{/* Bio & Remarks */}
					<div className="space-y-4">
						<ModernTextarea
							id="modal-bio"
							label={
								<span className="flex items-center justify-between w-full font-bold text-xs text-slate-800 dark:text-slate-200">
									<span className="flex items-center gap-1.5">
										<FileText className="h-3.5 w-3.5 text-purple-500" />
										Bio Summary
									</span>
									<span className="text-[11px] font-normal text-slate-400 font-mono">
										{(profileForm.watch("bio") || "").length} / 500
									</span>
								</span>
							}
							placeholder="e.g. Solutions will appear Tomorrow "
							maxLength={500}
							rows={3}
							{...profileForm.register("bio")}
						/>

						<ModernTextarea
							id="modal-remark"
							label={
								<span className="flex items-center justify-between w-full font-bold text-xs text-slate-800 dark:text-slate-200">
									<span className="flex items-center gap-1.5">
										<Edit3 className="h-3.5 w-3.5 text-blue-500" />
										Executive Remarks & Notes
									</span>
									<span className="text-[11px] font-normal text-slate-400 font-mono">
										{(profileForm.watch("remark") || "").length} chars
									</span>
								</span>
							}
							placeholder="Enter any additional remarks, administrative notes, or enterprise background information..."
							rows={3}
							{...profileForm.register("remark")}
						/>
					</div>

					<ModernModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
						<ModernModalCancelButton
							type="button"
							onClick={() => setEditProfileModalOpen(false)}
						>
							Cancel
						</ModernModalCancelButton>
						<ModernButton
							type="submit"
							variant="gradient"
							isLoading={updateProfileMutation.isPending}
							loadingText="Saving Changes..."
							leftIcon={<Save className="h-4 w-4" />}
							className="shadow-sm font-bold"
						>
							Save Profile Changes
						</ModernButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* MODAL 2: Change Password Modal */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={passwordModalOpen}
				onClose={() => setPasswordModalOpen(false)}
				onOpenChange={setPasswordModalOpen}
				title="Change Account Password"
				subtitle="Ensure your account is protected by using a strong, unique enterprise password."
				icon={<KeyRound className="size-5 text-blue-600 dark:text-blue-400" />}
				size="md"
				draggable
			>
				<form
					onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
					className="space-y-5"
				>
					{/* Current Password */}
					<ModernInput
						label={
							<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
								<KeyRound className="h-3.5 w-3.5 text-amber-500" />
								Current Password
							</span>
						}
						type={showCurrentPassword ? "text" : "password"}
						placeholder="Enter your current password"
						autoComplete="current-password"
						leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
						rightIcon={
							<button
								type="button"
								onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
								title={showCurrentPassword ? "Hide password" : "Show password"}
							>
								{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						}
						error={passwordForm.formState.errors.currentPassword?.message}
						{...passwordForm.register("currentPassword")}
					/>

					{/* New Password */}
					<div className="space-y-3">
						<ModernInput
							label={
								<span className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
									<Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
									New Password
								</span>
							}
							type={showNewPassword ? "text" : "password"}
							placeholder="Enter new strong password"
							autoComplete="new-password"
							leftIcon={<KeyRound className="h-4 w-4 text-slate-400" />}
							rightIcon={
								<button
									type="button"
									onClick={() => setShowNewPassword(!showNewPassword)}
									className="text-slate-400 hover:text-slate-600 cursor-pointer"
									title={showNewPassword ? "Hide password" : "Show password"}
								>
									{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</button>
							}
							error={passwordForm.formState.errors.newPassword?.message}
							{...passwordForm.register("newPassword")}
						/>

						{/* Dynamic 4-Segment Strength Bar */}
						{newPasswordValue.length > 0 && (
							<div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
								<div className="flex items-center justify-between text-xs">
									<span className="text-slate-500 font-medium flex items-center gap-1.5">
										<Shield className="size-3.5 text-slate-400" />
										Password Strength:
									</span>
									<span className={`font-bold ${getStrengthDetails(passwordStrength).textColor}`}>
										{getStrengthDetails(passwordStrength).label}
									</span>
								</div>
								<div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
									{[1, 2, 3, 4].map((seg) => (
										<div
											key={seg}
											className={`h-full rounded-full transition-all duration-300 ${
												passwordStrength >= seg
													? getStrengthDetails(passwordStrength).color
													: "bg-slate-200 dark:bg-slate-800"
											}`}
										/>
									))}
								</div>
								<p className="text-[11px] text-slate-400">
									{getStrengthDetails(passwordStrength).description}
								</p>
							</div>
						)}

						{/* Security Checklist */}
						<div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30 space-y-2 text-xs">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Security Requirements
							</span>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
								<div className={`flex items-center gap-2 ${passwordValidation.hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
									{passwordValidation.hasMinLength ? (
										<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="size-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
									<span>At least 8 characters</span>
								</div>

								<div className={`flex items-center gap-2 ${passwordValidation.hasUpper ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
									{passwordValidation.hasUpper ? (
										<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="size-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
									<span>Uppercase letter (A-Z)</span>
								</div>

								<div className={`flex items-center gap-2 ${passwordValidation.hasLower ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
									{passwordValidation.hasLower ? (
										<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="size-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
									<span>Lowercase letter (a-z)</span>
								</div>

								<div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
									{passwordValidation.hasNumber ? (
										<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="size-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
									<span>Numeric digit (0-9)</span>
								</div>

								<div className={`flex items-center gap-2 sm:col-span-2 ${passwordValidation.hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
									{passwordValidation.hasSpecial ? (
										<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="size-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
									)}
									<span>Special symbol (!@#$%^&*...)</span>
								</div>
							</div>
						</div>
					</div>

					{/* Confirm Password */}
					<ModernInput
						label={
							<span className="flex items-center justify-between w-full font-bold text-xs text-slate-800 dark:text-slate-200">
								<span className="flex items-center gap-1.5">
									<ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
									Confirm New Password
								</span>
								{confirmPasswordValue.length > 0 && (
									<span className={`text-[11px] font-semibold flex items-center gap-1 ${passwordValidation.isMatching ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
										{passwordValidation.isMatching ? (
											<>
												<CheckCircle2 className="size-3 text-emerald-500" />
												Passwords match
											</>
										) : (
											<>
												<AlertCircle className="size-3 text-rose-500" />
												Passwords do not match yet
											</>
										)}
									</span>
								)}
							</span>
						}
						type={showConfirmPassword ? "text" : "password"}
						placeholder="Re-enter new password to confirm"
						autoComplete="new-password"
						leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
						rightIcon={
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
								title={showConfirmPassword ? "Hide password" : "Show password"}
							>
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
							</button>
						}
						error={passwordForm.formState.errors.confirmPassword?.message}
						{...passwordForm.register("confirmPassword")}
					/>

					<ModernModalFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
						<ModernModalCancelButton
							type="button"
							onClick={() => setPasswordModalOpen(false)}
						>
							Cancel
						</ModernModalCancelButton>
						<ModernButton
							type="submit"
							variant="gradient"
							isLoading={changePasswordMutation.isPending}
							loadingText="Updating Password..."
							leftIcon={<KeyRound className="h-4 w-4" />}
							className="shadow-sm font-bold"
						>
							Update Password
						</ModernButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* DRAWER: Audit Logs & Trail Drawer (Permission Checked) */}
			{/* ============================================================ */}
			<Sheet open={auditDrawerOpen} onOpenChange={setAuditDrawerOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl"
				>
					<SheetHeader className="p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
						<div className="flex items-center gap-3">
							<div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
								<Activity className="size-5" />
							</div>
							<div>
								<SheetTitle className="text-base font-bold text-slate-900 dark:text-white">
									Audit Logs & Activity Trail
								</SheetTitle>
								<SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
									Chronological compliance trail and administrative event history for @{userProfile.username}
								</SheetDescription>
							</div>
						</div>
					</SheetHeader>
					<div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
						<UserAuditLogsSection
							username={userProfile?.username}
							userDisplayName={
								`${userProfile?.firstName || ""} ${userProfile?.lastName || ""}`.trim() ||
								userProfile?.displayName ||
								userProfile?.username ||
								"My Account"
							}
							isDrawerMode={false}
							hideActionTab={true}
						/>
					</div>
				</SheetContent>
			</Sheet>

			{/* Complete Profile Modal */}
			<CompleteProfileModal
				open={completeModalOpen}
				onOpenChange={setCompleteModalOpen}
				initialData={userProfile}
			/>

			{/* Profile Image Modal (Opened by clicking profile image) */}
			<ModernModal
				isOpen={profileImageModalOpen}
				onClose={() => setProfileImageModalOpen(false)}
				onOpenChange={setProfileImageModalOpen}
				title={t("profile.profilePhotoModalTitle", "Profile Photo")}
				subtitle={
					userProfile.firstName || userProfile.lastName
						? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
						: userProfile.displayName || userProfile.username
				}
				icon={<Camera className="h-5 w-5 text-primary" />}
				size="md"
				draggable
			>
				<div className="space-y-4 py-2">
					{avatarSrc ? (
						<div className="flex flex-col items-center justify-center p-6 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
							{/* Large Photo Showcase */}
							<div className="relative group">
								<div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-xl border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
									<img
										src={avatarSrc}
										alt={userProfile.displayName || userProfile.username || "Profile photo"}
										className="w-full h-full object-cover select-none"
									/>
								</div>
							</div>

							<div className="mt-4 text-center space-y-0.5">
								<h3 className="font-bold text-base text-slate-900 dark:text-white">
									{userProfile.firstName || userProfile.lastName
										? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
										: userProfile.displayName || userProfile.username}
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
									@{userProfile.username} • {userProfile.email}
								</p>
							</div>

							{/* Photo Actions */}
							<div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
								<label
									htmlFor="profile-modal-avatar-file-upload"
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer shadow-2xs transition-colors"
								>
									<Camera className="size-3.5 text-primary" />
									{t("profile.changePhoto", "Change Photo")}
								</label>
								<input
									id="profile-modal-avatar-file-upload"
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleAvatarUpload(file);
										if (e.target) e.target.value = "";
									}}
								/>

								<a
									href={avatarSrc}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors"
								>
									<ExternalLink className="size-3.5 text-slate-500" />
									{t("profile.viewOriginal", "View Original")}
								</a>

								<button
									type="button"
									onClick={handleRemoveAvatar}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 transition-colors cursor-pointer"
								>
									<Trash2 className="size-3.5" />
									{t("profile.removePhoto", "Remove")}
								</button>
							</div>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center p-8 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
							<Avatar className="h-32 w-32 ring-4 ring-white dark:ring-slate-800 shadow-lg text-3xl font-extrabold bg-primary/10 text-primary">
								<AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
									{userProfile.firstname?.[0] ||
										userProfile.firstName?.[0] ||
										userProfile.username?.[0]?.toUpperCase() ||
										"U"}
									{userProfile.lastname?.[0] || userProfile.lastName?.[0] || ""}
								</AvatarFallback>
							</Avatar>
							<h3 className="font-bold text-base text-slate-900 dark:text-white mt-4">
								{t("profile.noPhotoTitle", "No Profile Photo")}
							</h3>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
								{t(
									"profile.noPhotoDesc",
									"You have not uploaded a profile photo yet. Upload a photo to personalize your account."
								)}
							</p>
							<div className="mt-5">
								<label
									htmlFor="profile-modal-avatar-file-upload-empty"
									className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors"
								>
									<Camera className="size-4" />
									{t("profile.uploadPhoto", "Upload Photo")}
								</label>
								<input
									id="profile-modal-avatar-file-upload-empty"
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleAvatarUpload(file);
										if (e.target) e.target.value = "";
									}}
								/>
							</div>
						</div>
					)}
				</div>

				<ModernModalFooter>
					<ModernModalCancelButton
						type="button"
						onClick={() => setProfileImageModalOpen(false)}
					>
						{t("common.close", "Close")}
					</ModernModalCancelButton>
					<ModernButton
						type="button"
						variant="outline"
						size="sm"
						rounded="lg"
						leftIcon={<Edit3 className="size-3.5" />}
						onClick={() => {
							setProfileImageModalOpen(false);
							setEditProfileModalOpen(true);
						}}
						className="h-9 px-3.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs"
					>
						{t("profile.editProfile", "Edit Profile")}
					</ModernButton>
				</ModernModalFooter>
			</ModernModal>
		</div>
	);
}

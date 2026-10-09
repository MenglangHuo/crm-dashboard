"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	usersApi,
	rolesApi,
	permissionsApi,
	fileUrl,
	safeImageUrl,
	divisionsApi,
	departmentsApi,
	profileApi,
} from "@/lib/api/endpoints";
import {
	User,
	UserBackendRole,
	UserRolePermission,
	Role,
	Permission,
} from "@/lib/types";
import { extractUserRoleIds } from "@/lib/role-utils";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

function formatSelectedPermissionsToPayload(
	selectedIds: string[],
	catalog: Permission[] = [],
): { permissions: Record<string, string[]> } {
	const permissionsMap: Record<string, string[]> = {};

	const catalogById = new Map<string, Permission>();
	const catalogByName = new Map<string, Permission>();

	catalog.forEach((p) => {
		if (p.id) catalogById.set(String(p.id).toLowerCase(), p);
		if (p.name) catalogByName.set(String(p.name).toLowerCase(), p);
	});

	selectedIds.forEach((idOrName) => {
		const raw = String(idOrName || "").trim();
		if (!raw) return;

		const lower = raw.toLowerCase();
		const found = catalogById.get(lower) || catalogByName.get(lower);

		let moduleName = "";
		let actionName = "";

		if (found) {
			moduleName = (
				found.module ||
				(found.name?.includes(".") ? found.name.split(".")[0] : "GENERAL")
			)
				.trim()
				.toUpperCase();
			actionName = (
				(found as any).action ||
				(found.name?.includes(".")
					? found.name.split(".").slice(1).join(".")
					: found.name)
			)
				.trim()
				.toUpperCase();
		} else if (raw.includes(".")) {
			const parts = raw.split(".");
			moduleName = parts[0].trim().toUpperCase();
			actionName = parts.slice(1).join(".").trim().toUpperCase();
		} else if (raw.includes(":")) {
			const parts = raw.split(":");
			moduleName = parts[0].trim().toUpperCase();
			actionName = parts.slice(1).join(":").trim().toUpperCase();
		} else {
			moduleName = raw.toUpperCase();
			actionName = "READ";
		}

		if (moduleName && actionName) {
			if (!permissionsMap[moduleName]) {
				permissionsMap[moduleName] = [];
			}
			if (!permissionsMap[moduleName].includes(actionName)) {
				permissionsMap[moduleName].push(actionName);
			}
		}
	});

	return { permissions: permissionsMap };
}
import {
	UserCog,
	Key,
	ShieldCheck,
	ShieldAlert,
	UserCheck,
	Building2,
	Phone,
	Mail,
	Calendar,
	MapPin,
	Sparkles,
	Info,
	CheckCircle2,
	XCircle,
	FileText,
	Lock,
	RotateCcw,
	Check,
	Eye,
	EyeOff,
	Zap,
	Layers,
	CheckSquare,
	Square,
	Search,
	Trash2,
	Download,
	Edit3,
	PlusCircle,
	AlertCircle,
	Activity,
	Copy,
	Loader2,
	UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { UserAuditLogsSection } from "@/components/users/user-audit-logs-section";
import { UserAuditLogsModal } from "@/components/users/user-audit-logs-modal";
import { CustomPermissionsModal } from "@/components/users/custom-permissions-modal";
import {
	DataTable,
	ColumnDef,
	UserDetailCell,
	StatusBadgeCell,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
	ModernModalActionButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSwitch,
	ModernSelect,
	ModernDatePicker,
} from "@/components/ui-custom/form-controls";
import { RoleSelector } from "@/components/ui-custom/role-selector";
import { PermissionSelector } from "@/components/ui-custom/permission-selector";
import { useTranslation } from "@/lib/i18n/context";

const STANDARD_GRANT_ACTIONS = [
	{
		name: "delete",
		label: "Delete / Remove",
		description: "Prevent deleting items or records",
		badgeColor:
			"bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
		icon: Trash2,
	},
	{
		name: "export",
		label: "Export Reports",
		description: "Prevent downloading or exporting data (CSV/Excel)",
		badgeColor:
			"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
		icon: Download,
	},
	{
		name: "update",
		label: "Edit / Update",
		description: "Prevent modifying existing entries",
		badgeColor:
			"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
		icon: Edit3,
	},
	{
		name: "create",
		label: "Create / Register",
		description: "Prevent creating or adding new records",
		badgeColor:
			"bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
		icon: PlusCircle,
	},
	{
		name: "approve",
		label: "Approve / Authorize",
		description: "Prevent approving transactions, orders, or bills",
		badgeColor:
			"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
		icon: CheckCircle2,
	},
	{
		name: "import",
		label: "Import Shipments",
		description: "Prevent importing bulk items or catalogs",
		badgeColor:
			"bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900",
		icon: FileText,
	},
	{
		name: "read",
		label: "Read / View",
		description: "Prevent viewing sensitive records in this module",
		badgeColor:
			"bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
		icon: Eye,
	},
];

const registerFormSchema = z.object({
	username: z.string().min(3, "Username must be at least 3 characters"),
	password: z
		.string()
		.min(
			8,
			"Password must be at least 8 characters and contain digits, special characters",
		),
	phone: z.string().min(9, "Phone number is required (min 9 characters)"),
	email: z.string().email("Valid email is required"),
	firstname: z.string().min(1, "First name is required"),
	lastname: z.string().min(1, "Last name is required"),
	gender: z.enum(["MALE", "FEMALE", "OTHER", "Male", "Female"]),
	emergencyPhone: z.string().optional(),
	divisionId: z.string().optional(),
	departmentId: z.string().optional(),
	imageUrl: z.string().optional(),
	bio: z.string().optional(),
	initial: z.string().optional(),
	remark: z.string().optional(),
	employeeCode: z.string().optional(),
	position: z.string().optional(),
	nickName: z.string().optional(),
	primaryPhone: z.string().optional(),
	secondaryPhone: z.string().optional(),
	employmentDate: z.string().optional(),
	dob: z.string().optional(),
	address: z.string().optional(),
	roleIds: z.array(z.string()).min(1, "At least one role is required"),
});

export default function UsersPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// View User Profile Details Modal
	const [viewingUser, setViewingUser] = useState<User | null>(null);
	const [activeModalTab, setActiveModalTab] = useState<"profile" | "audit">(
		"profile",
	);

	// Standalone Audit Logs Modal
	const [auditLogsUser, setAuditLogsUser] = useState<User | null>(null);

	// Dialog state for Register User
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [clonedFromUser, setClonedFromUser] = useState<User | null>(null);

	// Dialog state for Admin Reset Password
	const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
	const [tempPasswordResult, setTempPasswordResult] = useState<{
		username: string;
		tempPassword: string;
		isOpen: boolean;
	} | null>(null);
	const [showTempPassword, setShowTempPassword] = useState(false);
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const handleCopyCredentials = (text: string, field: string) => {
		if (typeof window !== "undefined" && navigator?.clipboard) {
			navigator.clipboard.writeText(text);
			setCopiedField(field);
			toast.success(`${field} copied to clipboard`);
			setTimeout(() => setCopiedField(null), 2000);
		}
	};

	// Dialog state for Edit User Roles & Status
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
	const [editActiveStatus, setEditActiveStatus] = useState<boolean>(true);
	const [isLoadingEditUser, setIsLoadingEditUser] = useState(false);

	// Dialog state for Custom Direct Permissions & Excludes
	const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
	const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
	const [excludedPermissions, setExcludedPermissions] = useState<string[]>([]);
	const [isLoadingPermissionsUser, setIsLoadingPermissionsUser] =
		useState(false);

	// Dialog state for Exclude Grant
	const [excludeGrantUser, setExcludeGrantUser] = useState<User | null>(null);
	const [excludeGrantModule, setExcludeGrantModule] =
		useState<string>("Customer");
	const [excludeGrantActions, setExcludeGrantActions] = useState<string[]>([
		"delete",
	]);

	// Dialog state for Direct Custom Dynamic Permissions (?companyId=...)
	const [customPermissionsUser, setCustomPermissionsUser] =
		useState<User | null>(null);

	const { data: usersData, isLoading } = useQuery({
		queryKey: ["users", { page, pageSize, search, statusFilter }],
		queryFn: () =>
			usersApi.list({ page, limit: pageSize, search, status: statusFilter }),
	});

	const { data: rolesData } = useQuery({
		queryKey: ["roles-all"],
		queryFn: () => rolesApi.list({ limit: 100 }),
	});

	const { data: divisionsData } = useQuery({
		queryKey: ["divisions-all"],
		queryFn: () => divisionsApi.list({ limit: 100 }),
	});

	const { data: departmentsData } = useQuery({
		queryKey: ["departments-all"],
		queryFn: () => departmentsApi.list({ limit: 100 }),
	});

	const { data: permissionsData = [] } = useQuery({
		queryKey: ["permissions-all"],
		queryFn: () => permissionsApi.list({ limit: 500 }).then((r) => r.items),
	});

	const registerForm = useForm<z.infer<typeof registerFormSchema>>({
		resolver: zodResolver(registerFormSchema),
		defaultValues: {
			username: "",
			email: "",
			firstname: "",
			lastname: "",
			password: "",
			phone: "",
			gender: "MALE",
			emergencyPhone: "",
			divisionId: "",
			departmentId: "",
			imageUrl: "",
			bio: "",
			initial: "",
			remark: "",
			employeeCode: "",
			position: "",
			nickName: "",
			primaryPhone: "",
			secondaryPhone: "",
			employmentDate: "",
			dob: "",
			address: "",
			roleIds: [],
		},
	});

	const createMutation = useMutation({
		mutationFn: usersApi.registerNewUser,
		onSuccess: () => {
			toast.success(
				clonedFromUser
					? `User account cloned and registered successfully based on @${clonedFromUser.username} template!`
					: "User registered successfully via registration workflow",
			);
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setIsCreateOpen(false);
			setClonedFromUser(null);
			registerForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const assignRolesMutation = useMutation({
		mutationFn: ({
			id,
			roleIds,
		}: {
			id: string | number;
			roleIds: (string | number)[];
		}) => usersApi.assignRoles(id, roleIds),
		onSuccess: () => {
			toast.success("User roles assigned successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setEditingUser(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateStatusMutation = useMutation({
		mutationFn: ({ id, active }: { id: string | number; active: boolean }) =>
			usersApi.update(id, { active, status: active ? "Active" : "Inactive" }),
		onSuccess: () => {
			toast.success("User status updated");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const assignPermissionsMutation = useMutation({
		mutationFn: async ({
			id,
			added,
			userCompanyId,
		}: {
			id: string | number;
			added: string[];
			userCompanyId?: string | number;
		}) => {
			const payload = formatSelectedPermissionsToPayload(
				added,
				permissionsData,
			);
			const cachedProfile: any =
				queryClient.getQueryData(["profile"]) || profileApi.getCachedProfile();
			const companyId =
				userCompanyId ||
				cachedProfile?.companyId ||
				cachedProfile?.company?.id ||
				9;
			return await usersApi.assignCustomPermissions(id, payload, companyId);
		},
		onSuccess: () => {
			toast.success("User permissions updated successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({
				queryKey: ["user", permissionsUser?.id],
			});
			queryClient.invalidateQueries({
				queryKey: ["user-detail", permissionsUser?.id],
			});
			queryClient.invalidateQueries({ queryKey: ["profile"] });
			setPermissionsUser(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const excludeGrantMutation = useMutation({
		mutationFn: ({
			id,
			module,
			actions,
		}: {
			id: string | number;
			module: string;
			actions: string[];
		}) => usersApi.excludePermissionsGrant(id, { [module]: actions }),
		onSuccess: () => {
			toast.success("Grant permissions excluded for user");
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setExcludeGrantUser(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreGrantMutation = useMutation({
		mutationFn: ({
			id,
			module,
			action,
		}: {
			id: string | number;
			module: string;
			action: string;
		}) => usersApi.restorePermissionsGrant(id, { [module]: [action] }),
		onSuccess: () => {
			toast.success("Excluded grant restored successfully");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => usersApi.remove(id),
		onSuccess: () => {
			toast.success("User account deleted");
			queryClient.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setClonedFromUser(null);
		registerForm.reset({
			username: "",
			email: "",
			firstname: "",
			lastname: "",
			password: "",
			phone: "",
			gender: "MALE",
			emergencyPhone: "",
			divisionId: "",
			departmentId: "",
			imageUrl: "",
			bio: "",
			initial: "",
			remark: "",
			employeeCode: "",
			position: "",
			nickName: "",
			primaryPhone: "",
			secondaryPhone: "",
			employmentDate: "",
			dob: "",
			address: "",
			roleIds: [],
		});
		setIsCreateOpen(true);
	};

	const openClone = async (user: User) => {
		setClonedFromUser(user);

		// Extract assigned role IDs
		const initialRoleIds = extractUserRoleIds(
			user,
			rolesData?.items || [],
		).map(String);

		// Extract division and department IDs
		const divId = user.divisionId
			? String(user.divisionId)
			: (user as any).division?.id
				? String((user as any).division.id)
				: "";
		const deptId = user.departmentId
			? String(user.departmentId)
			: (user as any).department?.id
				? String((user as any).department.id)
				: "";

		registerForm.reset({
			username: "",
			email: "",
			firstname: "",
			lastname: "",
			password: "",
			phone: "",
			gender: (user.gender as any) || "MALE",
			emergencyPhone: "",
			divisionId: divId,
			departmentId: deptId,
			imageUrl: "",
			bio: user.bio || "",
			initial: "",
			remark: user.remark
				? `${user.remark} (Cloned from @${user.username})`
				: `Cloned from @${user.username}`,
			employeeCode: "",
			position: user.position || "",
			nickName: "",
			primaryPhone: "",
			secondaryPhone: "",
			employmentDate: "",
			dob: "",
			address: user.address || "",
			roleIds: initialRoleIds,
		});

		setIsCreateOpen(true);

		// Asynchronously fetch full user to get complete role mapping if needed
		try {
			const fullUser = await usersApi.get(user.id);
			if (fullUser) {
				setClonedFromUser(fullUser);
				const detailedRoleIds = extractUserRoleIds(
					fullUser,
					rolesData?.items || [],
				).map(String);
				const fullDivId = fullUser.divisionId
					? String(fullUser.divisionId)
					: (fullUser as any).division?.id
						? String((fullUser as any).division.id)
						: divId;
				const fullDeptId = fullUser.departmentId
					? String(fullUser.departmentId)
					: (fullUser as any).department?.id
						? String((fullUser as any).department.id)
						: deptId;

				registerForm.setValue(
					"roleIds",
					detailedRoleIds.length > 0 ? detailedRoleIds : initialRoleIds,
				);
				if (fullDivId) registerForm.setValue("divisionId", fullDivId);
				if (fullDeptId) registerForm.setValue("departmentId", fullDeptId);
				if (fullUser.position)
					registerForm.setValue("position", fullUser.position);
			}
		} catch (err) {
			console.error("Failed to fetch full user for cloning:", err);
		}
	};

	const openEdit = async (user: User) => {
		setEditingUser(user);
		setIsLoadingEditUser(true);

		// Immediate extraction from existing user data & loaded roles
		const initialRoleIds = extractUserRoleIds(user, rolesData?.items || []);
		setEditRoleIds(initialRoleIds);
		setEditActiveStatus(
			user.active !== undefined
				? user.active
				: user.status?.toLowerCase() === "active",
		);

		try {
			// Fetch full user details from server to ensure complete role mapping
			const fullUser = await usersApi.get(user.id);
			if (fullUser) {
				setEditingUser(fullUser);
				const detailedRoleIds = extractUserRoleIds(
					fullUser,
					rolesData?.items || [],
				);
				setEditRoleIds(detailedRoleIds);
				setEditActiveStatus(
					fullUser.active !== undefined
						? fullUser.active
						: fullUser.status?.toLowerCase() === "active",
				);
			}
		} catch (err) {
			console.error("Failed to load user roles details:", err);
		} finally {
			setIsLoadingEditUser(false);
		}
	};

	const saveUserRolesEdit = () => {
		if (editingUser) {
			assignRolesMutation.mutate({
				id: editingUser.id,
				roleIds: editRoleIds,
			});
		}
	};

	const openPermissions = async (user: User) => {
		setPermissionsUser(user);
		setSelectedPermissions(user.addedPermissionIds || []);
		setExcludedPermissions(user.excludedPermissionIds || []);
		setIsLoadingPermissionsUser(true);

		try {
			const fullUser = await usersApi.get(user.id);
			if (fullUser) {
				setPermissionsUser(fullUser);
				// If backend returned custom permissions as object { "INVOICE": ["UPDATE"] } or array
				const customObj =
					(fullUser as any)?.permissions ||
					(fullUser as any)?.customPermissions ||
					(fullUser as any)?.attributes?.permissions;
				if (
					customObj &&
					typeof customObj === "object" &&
					!Array.isArray(customObj)
				) {
					const keys: string[] = [];
					Object.entries(customObj).forEach(([mod, acts]) => {
						if (Array.isArray(acts)) {
							acts.forEach((act) => keys.push(`${mod}.${act}`));
						}
					});
					if (keys.length > 0) {
						setSelectedPermissions(keys);
					} else {
						setSelectedPermissions(fullUser.addedPermissionIds || []);
					}
				} else {
					setSelectedPermissions(fullUser.addedPermissionIds || []);
				}
				setExcludedPermissions(fullUser.excludedPermissionIds || []);
			}
		} catch (err) {
			console.error("Failed to load user permissions details:", err);
		} finally {
			setIsLoadingPermissionsUser(false);
		}
	};

	const savePermissions = () => {
		if (permissionsUser) {
			assignPermissionsMutation.mutate({
				id: permissionsUser.id,
				added: selectedPermissions,
				userCompanyId:
					permissionsUser.companyId || (permissionsUser.company as any)?.id,
			});
		}
	};

	const toggleActive = (user: User) => {
		const nextState = !(user.active !== undefined
			? user.active
			: user.status?.toLowerCase() === "active");
		updateStatusMutation.mutate({ id: user.id, active: nextState });
	};

	const resetPasswordMutation = useMutation({
		mutationFn: (user: User) =>
			usersApi.adminResetPassword(
				user.id,
				user.companyId || (user.company as any)?.id,
			),
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["users"] });
			setResetPasswordUser(null);
			if (data?.tempPassword) {
				setTempPasswordResult({
					username: data.username || variables.username,
					tempPassword: data.tempPassword,
					isOpen: true,
				});
				setShowTempPassword(false);
			} else {
				toast.success(
					t(
						"users.resetPasswordSuccess",
						"Password reset successfully. The user will be required to set a new password on their next login.",
					),
				);
			}
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const formatDateToBackend = (dateStr?: string) => {
		if (!dateStr) return null;
		const parts = dateStr.split("-");
		if (parts.length === 3) {
			// If already DD-MM-YYYY (parts[0] is day 1-31, parts[2] is 4-digit year)
			if (parts[0].length === 2 && parts[2].length === 4) {
				return dateStr;
			}
			// If YYYY-MM-DD (parts[0] is 4-digit year), convert to DD-MM-YYYY
			if (parts[0].length === 4 && parts[2].length <= 2) {
				return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
			}
			return `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		return dateStr;
	};

	// Extract available system modules for Exclude Grant selector
	const availableGrantModules = useMemo(() => {
		const set = new Set<string>();

		// 1. From user's assigned roles
		if (excludeGrantUser?.roles && Array.isArray(excludeGrantUser.roles)) {
			excludeGrantUser.roles.forEach((r: any) => {
				if (Array.isArray(r.permissions)) {
					r.permissions.forEach((p: any) => {
						if (p.name) set.add(p.name);
						if (p.module) set.add(p.module);
					});
				}
			});
		}

		// 2. From permissions catalog
		if (Array.isArray(permissionsData)) {
			permissionsData.forEach((p: any) => {
				if (p.module) set.add(p.module);
				if (p.name && !p.module) set.add(p.name);
			});
		}

		// 3. Fallback standard modules
		const defaults = [
			"Customer",
			"Order",
			"Payment",
			"Inventory",
			"Stock",
			"Export",
			"Price_History",
			"Report",
			"Supplier",
			"Purchase",
			"User",
			"Role",
		];
		defaults.forEach((m) => set.add(m));

		return Array.from(set)
			.sort()
			.map((mod) => ({
				value: mod,
				label: mod,
			}));
	}, [permissionsData, excludeGrantUser]);

	const toggleExcludeAction = (actionName: string) => {
		setExcludeGrantActions((prev) =>
			prev.includes(actionName)
				? prev.filter((a) => a !== actionName)
				: [...prev, actionName],
		);
	};

	const selectAllActions = () => {
		setExcludeGrantActions(STANDARD_GRANT_ACTIONS.map((a) => a.name));
	};

	const clearAllActions = () => {
		setExcludeGrantActions([]);
	};

	const onRegisterSubmit = (values: z.infer<typeof registerFormSchema>) => {
		const payload = {
			username: values.username,
			password: values.password,
			phone: values.phone,
			email: values.email,
			firstname: values.firstname,
			lastname: values.lastname,
			gender: values.gender,
			emergencyPhone: values.emergencyPhone || null,
			divisionId: values.divisionId ? Number(values.divisionId) : null,
			departmentId: values.departmentId ? Number(values.departmentId) : null,
			imageUrl: values.imageUrl || null,
			bio: values.bio || null,
			initial: values.initial || null,
			remark: values.remark || null,
			employeeCode: values.employeeCode || null,
			position: values.position || null,
			nickName: values.nickName || null,
			primaryPhone: values.primaryPhone || null,
			secondaryPhone: values.secondaryPhone || null,
			employmentDate: formatDateToBackend(values.employmentDate),
			dob: formatDateToBackend(values.dob),
			address: values.address || null,
			roleIds: values.roleIds.map(Number),
		};
		createMutation.mutate(payload);
	};

	// Clean, separated columns for maximum clarity & scannability
	const columns: ColumnDef<User>[] = [
		{
			id: "user",
			header: t("users.fullName"),
			accessorFn: (u) =>
				`${u.firstname || u.firstName || ""} ${u.lastname || u.lastName || ""}`,
			sortable: true,
			cell: ({ row }) => {
				const fullName =
					`${row.firstname || row.firstName || ""} ${row.lastname || row.lastName || ""}`.trim() ||
					row.username;
				const image = safeImageUrl(
					row.imageUrl || row.avatarUrl || fileUrl(row.avatarKey),
				);
				const isActive =
					row.active !== undefined
						? row.active
						: row.status?.toLowerCase() === "active";

				return (
					<div
						onClick={() => setViewingUser(row)}
						className="flex items-center gap-3 cursor-pointer group py-0.5"
						title="Click to view full user profile"
					>
						<div className="relative shrink-0">
							<img
								src={image}
								alt={fullName}
								className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-2xs group-hover:border-purple-400 transition-colors"
								onError={(e) => {
									(e.target as HTMLElement).style.display = "none";
								}}
							/>
							<span
								className={cn(
									"absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900",
									isActive ? "bg-emerald-500" : "bg-slate-400",
								)}
							/>
						</div>

						<div className="flex items-center gap-1.5 flex-wrap min-w-0">
							<span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors truncate">
								{fullName}
							</span>
							{row.initial && (
								<Badge
									variant="outline"
									className="text-[9px] font-mono font-bold px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
								>
									{row.initial}
								</Badge>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "username",
			header: t("users.username"),
			accessorFn: (u) => u.username,
			sortable: true,
			cell: ({ row }) => (
				<span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
					@{row.username}
				</span>
			),
		},
		{
			id: "email",
			header: t("users.email"),
			accessorFn: (u) => u.email,
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
					<Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
					<span className="truncate max-w-[180px]">{row.email || "—"}</span>
				</div>
			),
		},
		{
			id: "phone",
			header: t("users.phone"),
			cell: ({ row }) => {
				const phone = row.primaryPhone || row.phone;
				return phone ? (
					<div className="flex items-center gap-1.5 text-xs font-mono text-foreground">
						<Phone className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>{phone}</span>
					</div>
				) : (
					<span className="text-xs text-muted-foreground italic">—</span>
				);
			},
		},
		{
			id: "company",
			header: t("company.name") || "Company",
			accessorFn: (u) => u.company?.name || u.companyName || "",
			sortable: true,
			cell: ({ row }) => {
				const companyName = row.company?.name || row.companyName;
				return companyName ? (
					<Badge
						variant="outline"
						className="text-[10px] font-medium bg-slate-50 text-slate-700 border-slate-200/80 dark:bg-slate-900 dark:text-slate-300 flex items-center gap-1 px-1.5 py-0.5"
					>
						<Building2 className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
						<span className="truncate max-w-[130px]">{companyName}</span>
					</Badge>
				) : (
					<span className="text-xs text-muted-foreground italic">—</span>
				);
			},
		},
		{
			id: "roles_permissions",
			header: t("users.assignedRoles"),
			cell: ({ row }) => {
				const rolesList: string[] = [];

				if (Array.isArray(row.roles) && row.roles.length > 0) {
					row.roles.forEach((r: any) => {
						if (r.name) rolesList.push(r.name);
					});
				} else if (Array.isArray(row.roleIds) && row.roleIds.length > 0) {
					row.roleIds.forEach((roleId) => {
						const roleObj = rolesData?.items.find(
							(r) => String(r.id) === String(roleId),
						);
						rolesList.push(roleObj?.name || `Role #${roleId}`);
					});
				}

				const visibleRoles = rolesList.slice(0, 2);
				const remainingCount = rolesList.length - visibleRoles.length;

				return (
					<div className="space-y-1">
						<div className="flex flex-wrap items-center gap-1">
							{row.isSuperAdmin && (
								<Badge className="bg-purple-600 hover:bg-purple-700 text-[10px] font-bold text-white shadow-2xs">
									Super Admin
								</Badge>
							)}
							{visibleRoles.map((roleName, i) => (
								<Badge
									key={i}
									variant="secondary"
									className="text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60"
								>
									<Sparkles className="h-2.5 w-2.5 mr-1 text-purple-600 dark:text-purple-400" />
									{roleName}
								</Badge>
							))}
							{remainingCount > 0 && (
								<Badge
									variant="outline"
									className="text-[10px] font-medium text-muted-foreground border-slate-200 dark:border-slate-800"
								>
									+{remainingCount} {t("common.more")}
								</Badge>
							)}
							{!row.isSuperAdmin && rolesList.length === 0 && (
								<span className="text-xs text-muted-foreground italic">
									No roles
								</span>
							)}
						</div>

						{/* Direct & Excluded badges */}
						{(row.addedPermissionIds?.length > 0 ||
							row.excludedPermissionIds?.length > 0) && (
							<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
								{row.addedPermissionIds?.length > 0 && (
									<Badge
										variant="outline"
										className="text-[9px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
									>
										+{row.addedPermissionIds.length} Direct
									</Badge>
								)}
								{row.excludedPermissionIds?.length > 0 && (
									<Badge
										variant="outline"
										className="text-[9px] border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300"
									>
										-{row.excludedPermissionIds.length} Excluded
									</Badge>
								)}
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "status_flags",
			header: t("users.status"),
			cell: ({ row }) => {
				const isActive =
					row.active !== undefined
						? row.active
						: row.status?.toLowerCase() === "active";
				return (
					<div className="flex items-center gap-2">
						<Switch
							checked={isActive}
							onCheckedChange={() => toggleActive(row)}
						/>
						<StatusBadgeCell
							status={isActive ? t("users.active") : t("users.inactive")}
							type="account"
						/>
					</div>
				);
			},
		},
	];

	const customActions: RowAction<User>[] = [
		{
			label: t("users.viewProfile"),
			icon: <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
			onClick: (user) => {
				setViewingUser(user);
				setActiveModalTab("profile");
			},
		},
		{
			label: t("users.cloneUser", "Clone User"),
			icon: (
				<Copy className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
			),
			onClick: (user) => openClone(user),
		},
		{
			label: t("users.auditLogs"),
			icon: (
				<Activity className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
			),
			onClick: (user) => setAuditLogsUser(user),
		},
		{
			label: t("users.manageRolesStatus"),
			icon: (
				<UserCog className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
			),
			onClick: (user) => openEdit(user),
		},
		{
			label: t("users.manageDirectPermissions"),
			icon: (
				<Key className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
			),
			onClick: (user) => openPermissions(user),
		},
		// {
		//   label: "Custom Direct Permissions",
		//   icon: <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />,
		//   onClick: (user) => setCustomPermissionsUser(user),
		// },
		{
			label: t("users.excludeActionGrants"),
			icon: (
				<ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
			),
			onClick: (user) => {
				setExcludeGrantUser(user);
				const firstMod =
					(user.roles as any)?.[0]?.permissions?.[0]?.name || "Customer";
				setExcludeGrantModule(firstMod);
				setExcludeGrantActions(["delete"]);
			},
		},
		{
			label: t("users.resetPassword", "Reset Password"),
			icon: <Lock className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />,
			onClick: (user) => setResetPasswordUser(user),
		},
		{
			label: t("users.deactivateUser"),
			icon: <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />,
			onClick: (user) => toggleActive(user),
		},
	];

	return (
		<div className="space-y-4 pb-12">
			{/* Reusable Data Table Component */}
			<DataTable<User>
				data={usersData?.items || []}
				columns={columns}
				getRowId={(u) => String(u.id)}
				hideHeader={true}
				hideImportExport={true}
				searchPlaceholder={t("users.searchPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				primaryAction={
					<Button
						onClick={openCreate}
						className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
					>
						<UserPlus className="h-3.5 w-3.5" />
						<span>{t("users.registerNewUser", "Register New User")}</span>
					</Button>
				}
				manualPagination={true}
				totalCount={usersData?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onRowClick={(u) => setViewingUser(u)}
				onEditRow={(u) => openEdit(u)}
				onDeleteRow={(u) => !u.isSuperAdmin && deleteMutation.mutate(u.id)}
				customRowActions={customActions}
			/>

			{/* View Full Profile Details Modal */}
			<ModernModal
				isOpen={!!viewingUser}
				onClose={() => setViewingUser(null)}
				title={`${t("users.userProfile")}: ${viewingUser?.firstname || viewingUser?.firstName || ""} ${viewingUser?.lastname || viewingUser?.lastName || ""}`}
				subtitle={`Complete identity details, role permissions, and custom access for @${viewingUser?.username}.`}
				icon={<Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
				size="2xl"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setViewingUser(null)}
							label={t("common.close")}
						/>
						<ModernModalActionButton
							onClick={() => {
								const targetUser = viewingUser;
								setViewingUser(null);
								if (targetUser) openClone(targetUser);
							}}
							className="border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
							icon={<Copy className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />}
						>
							{t("users.cloneUser", "Clone User")}
						</ModernModalActionButton>
						<ModernModalActionButton
							onClick={() => {
								const targetUser = viewingUser;
								if (targetUser) setResetPasswordUser(targetUser);
							}}
							className="border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50"
							icon={<Lock className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />}
						>
							{t("users.resetPassword", "Reset Password")}
						</ModernModalActionButton>
						<ModernModalSubmitButton
							onClick={() => {
								const targetUser = viewingUser;
								setViewingUser(null);
								if (targetUser) openEdit(targetUser);
							}}
							icon={<UserCog className="h-4 w-4 shrink-0" />}
						>
							{t("users.manageRolesStatus")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				{viewingUser && (
					<div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
						<ModernTabs
							value={activeModalTab}
							onValueChange={(v) => setActiveModalTab(v as any)}
						>
							<ModernTabsList variant="pills" size="md">
								<ModernTabsTrigger
									value="profile"
									icon={<Sparkles className="size-4" />}
								>
									{t("users.personalDetails")}
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="audit"
									icon={<Activity className="size-4 text-purple-600" />}
									badge="Audit Logs"
									badgeColor="purple"
								>
									{t("users.auditLogs")}
								</ModernTabsTrigger>
							</ModernTabsList>

							<ModernTabsContent value="profile" className="space-y-6 pt-2">
								{/* ============================================================ */}
								{/* 1. GENERAL OVERVIEW SECTION                                  */}
								{/* ============================================================ */}
								<div className="space-y-4">
									{/* Header profile card */}
									<div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-900 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
										<div className="flex items-center gap-4">
											<img
												src={safeImageUrl(
													viewingUser.imageUrl ||
														viewingUser.avatarUrl ||
														fileUrl(viewingUser.avatarKey),
												)}
												alt={viewingUser.username}
												className="h-16 w-16 rounded-2xl object-cover border-2 border-purple-500 shadow-md shrink-0"
											/>
											<div>
												<div className="flex items-center gap-2 flex-wrap">
													<h3 className="text-base font-bold text-foreground">
														{viewingUser.firstname || viewingUser.firstName}{" "}
														{viewingUser.lastname || viewingUser.lastName}
													</h3>
													{viewingUser.initial && (
														<Badge
															variant="outline"
															className="text-xs font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-900/60"
														>
															{viewingUser.initial}
														</Badge>
													)}
													<StatusBadgeCell
														status={
															viewingUser.status ||
															(viewingUser.active
																? t("users.active")
																: t("users.inactive"))
														}
														type="account"
													/>
												</div>
												<p className="text-xs text-muted-foreground mt-0.5">
													@{viewingUser.username} • {viewingUser.email}
												</p>
												<p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
													<Building2 className="h-3.5 w-3.5" />
													{viewingUser.company?.name ||
														viewingUser.companyName ||
														"Organization"}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-2 flex-wrap">
											{viewingUser.completedSetup && (
												<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
													<CheckCircle2 className="h-3 w-3 mr-1" /> Setup Done
												</Badge>
											)}
											{viewingUser.pinSet && (
												<Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-semibold">
													<Lock className="h-3 w-3 mr-1" /> PIN Set
												</Badge>
											)}
											{viewingUser.isOrdering && (
												<Badge className="bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 text-xs font-semibold">
													<Zap className="h-3 w-3 mr-1" /> Ordering Enabled
												</Badge>
											)}
											{viewingUser.passwordResetRequired && (
												<Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold">
													<Lock className="h-3 w-3 mr-1" /> Password Reset Required
												</Badge>
											)}
										</div>
									</div>

									{/* Bio & Remark section */}
									{viewingUser.bio && (
										<div className="p-3.5 rounded-xl border border-purple-200/80 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/20 text-xs">
											<span className="font-bold text-purple-700 dark:text-purple-300 block mb-1">
												{t("users.bioNotes")}
											</span>
											<p className="text-slate-700 dark:text-slate-300 italic">
												{viewingUser.bio}
											</p>
										</div>
									)}

									{viewingUser.remark && (
										<div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 text-xs">
											<span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
												Administrative Remark
											</span>
											<p className="text-slate-600 dark:text-slate-400">
												{viewingUser.remark}
											</p>
										</div>
									)}

									{/* Personal Information & Contact Numbers grid */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
										<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-2.5 shadow-2xs">
											<span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
												{t("users.personalDetails")}
											</span>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.gender")}
													</span>
													<span className="font-semibold text-foreground">
														{viewingUser.gender || "N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.dateOfBirth")}
													</span>
													<span className="font-semibold text-foreground">
														{viewingUser.dob || "N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.nickName")}
													</span>
													<span className="font-semibold text-foreground">
														{viewingUser.nickName || "N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														Initial
													</span>
													<span className="font-semibold text-foreground">
														{viewingUser.initial || "N/A"}
													</span>
												</div>
												<div className="col-span-2">
													<span className="text-muted-foreground block text-[10px]">
														{t("users.address")}
													</span>
													<span className="font-semibold text-foreground">
														{viewingUser.address || "N/A"}
													</span>
												</div>
											</div>
										</div>

										<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-card space-y-2.5 shadow-2xs">
											<span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
												{t("users.contactDetails")}
											</span>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.phone")}
													</span>
													<span className="font-semibold text-foreground font-mono">
														{viewingUser.phone || "N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.primaryPhone")}
													</span>
													<span className="font-semibold text-foreground font-mono">
														{viewingUser.primaryPhone ||
															viewingUser.phone ||
															"N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.secondaryPhone")}
													</span>
													<span className="font-semibold text-foreground font-mono">
														{viewingUser.secondaryPhone || "N/A"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground block text-[10px]">
														{t("users.emergencyPhone")}
													</span>
													<span className="font-semibold text-foreground font-mono">
														{viewingUser.emergencyPhone || "N/A"}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* ============================================================ */}
								{/* 2. ROLES & ACTIONS MATRIX SECTION                            */}
								{/* ============================================================ */}
								<div className="space-y-3 pt-2">
									<div className="flex items-center justify-between border-b pb-2.5 border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<div className="p-1 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
												<Sparkles className="size-4" />
											</div>
											<div>
												<h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
													{t("users.assignedRoles")} (
													{viewingUser.roles?.length ||
														viewingUser.roleIds?.length ||
														0}
													)
												</h4>
												<p className="text-[11px] text-muted-foreground">
													Assigned role templates, permissions, and enabled
													actions
												</p>
											</div>
										</div>
									</div>

									{Array.isArray(viewingUser.roles) &&
									viewingUser.roles.length > 0 ? (
										<div className="space-y-3">
											{viewingUser.roles.map((role: any, idx: number) => (
												<div
													key={idx}
													className="rounded-2xl border border-purple-200/80 dark:border-purple-900/60 bg-card overflow-hidden shadow-2xs"
												>
													<div className="px-4 py-2.5 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between">
														<div className="flex items-center gap-2">
															<Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
															<span className="font-bold text-xs uppercase tracking-wider text-purple-900 dark:text-purple-200">
																Role: {role.name}
															</span>
															<Badge
																variant="outline"
																className="text-[10px] font-mono"
															>
																ID #{role.id}
															</Badge>
														</div>
													</div>

													<div className="p-4 space-y-3">
														{Array.isArray(role.permissions) &&
														role.permissions.length > 0 ? (
															<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
																{role.permissions.map((perm: any) => (
																	<div
																		key={perm.id || perm.name}
																		className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5"
																	>
																		<div className="flex items-center justify-between">
																			<span className="font-mono font-bold text-xs text-foreground">
																				{perm.name}
																			</span>
																			<Badge
																				variant="secondary"
																				className="text-[9px]"
																			>
																				ID #{perm.id}
																			</Badge>
																		</div>
																		<div className="flex flex-wrap gap-1 pt-1">
																			{Array.isArray(perm.actions) ? (
																				perm.actions.map((act: any) => (
																					<Badge
																						key={act.name}
																						variant={
																							act.enabled
																								? "default"
																								: "outline"
																						}
																						className={`text-[9px] font-semibold ${act.enabled ? "bg-emerald-600 text-white" : "text-muted-foreground border-slate-200 dark:border-slate-800"}`}
																					>
																						{act.enabled && (
																							<Check className="h-2.5 w-2.5 mr-0.5" />
																						)}
																						{act.name}
																					</Badge>
																				))
																			) : (
																				<span className="text-[10px] text-muted-foreground">
																					Standard module access
																				</span>
																			)}
																		</div>
																	</div>
																))}
															</div>
														) : (
															<p className="text-xs text-muted-foreground">
																No explicit action permissions configured for
																this role.
															</p>
														)}
													</div>
												</div>
											))}
										</div>
									) : (
										<div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
											Assigned Role IDs:{" "}
											{viewingUser.roleIds?.join(", ") || "None"}
										</div>
									)}
								</div>

								{/* ============================================================ */}
								{/* 3. DIRECT PERMISSIONS & EXCLUDED GRANTS SECTION              */}
								{/* ============================================================ */}
								<div className="space-y-3 pt-2">
									<div className="flex items-center justify-between border-b pb-2.5 border-slate-200/80 dark:border-slate-800">
										<div className="flex items-center gap-2">
											<div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
												<Key className="size-4" />
											</div>
											<div>
												<h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
													{t("users.customPermissionsTitle")}
												</h4>
												<p className="text-[11px] text-muted-foreground">
													{t("users.customPermissionsSubtitle")}
												</p>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-2.5 shadow-2xs">
											<h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
												<ShieldCheck className="h-4 w-4 text-emerald-600" />{" "}
												{t("users.allowedPermissions")}
											</h4>
											{viewingUser.addedPermissionIds?.length > 0 ? (
												<div className="flex flex-wrap gap-1.5 pt-1">
													{viewingUser.addedPermissionIds.map((p) => (
														<Badge
															key={p}
															className="bg-emerald-600 text-white text-xs font-mono font-bold shadow-2xs"
														>
															+{p}
														</Badge>
													))}
												</div>
											) : (
												<p className="text-xs text-muted-foreground pt-1">
													No custom direct permission overrides added.
												</p>
											)}
										</div>

										<div className="p-4 rounded-2xl border border-rose-200/80 bg-rose-50/30 dark:border-rose-950 dark:bg-rose-950/20 space-y-2.5 shadow-2xs">
											<h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
												<ShieldAlert className="h-4 w-4 text-rose-600" />{" "}
												{t("users.excludedPermissions")}
											</h4>
											{viewingUser.excludedPermissionIds?.length > 0 ? (
												<div className="flex flex-wrap gap-2 pt-1">
													{viewingUser.excludedPermissionIds.map((p) => (
														<div key={p} className="flex items-center gap-1">
															<Badge className="bg-rose-600 text-white text-xs font-mono font-bold shadow-2xs">
																-{p}
															</Badge>
															<button
																type="button"
																onClick={() =>
																	restoreGrantMutation.mutate({
																		id: viewingUser.id,
																		module: p,
																		action: "delete",
																	})
																}
																className="p-1 rounded-lg hover:bg-rose-100 text-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/50 text-[10px] border border-rose-200 dark:border-rose-900"
																title="Restore grant"
															>
																<RotateCcw className="h-3 w-3" />
															</button>
														</div>
													))}
												</div>
											) : (
												<p className="text-xs text-muted-foreground pt-1">
													No role permissions excluded for this account.
												</p>
											)}
										</div>
									</div>
								</div>
							</ModernTabsContent>

							<ModernTabsContent value="audit" className="pt-2">
								<UserAuditLogsSection
									username={
										viewingUser.username || (viewingUser as any).userName
									}
									userDisplayName={`${viewingUser.firstname || viewingUser.firstName || ""} ${viewingUser.lastname || viewingUser.lastName || ""}`.trim()}
								/>
							</ModernTabsContent>
						</ModernTabs>
					</div>
				)}
			</ModernModal>

			{/* Standalone User Audit Logs Modal */}
			<UserAuditLogsModal
				user={auditLogsUser}
				open={!!auditLogsUser}
				onOpenChange={(open) => !open && setAuditLogsUser(null)}
			/>

			{/* Register / Clone User Modal */}
			<ModernModal
				isOpen={isCreateOpen}
				onClose={() => {
					setIsCreateOpen(false);
					setClonedFromUser(null);
				}}
				title={
					clonedFromUser
						? `${t("users.cloneUser", "Clone User")}: @${clonedFromUser.username}`
						: t("users.registerNewUser")
				}
				subtitle={
					clonedFromUser
						? `Provision a new user account with roles, division, and department cloned from @${clonedFromUser.username}. Enter new credentials to complete registration.`
						: "Provision a user account with specific roles for your organization."
				}
				icon={
					clonedFromUser ? (
						<Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
					) : (
						<UserCog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
					)
				}
				size="xl"
				isLoading={createMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => {
								setIsCreateOpen(false);
								setClonedFromUser(null);
							}}
						/>
						<ModernModalSubmitButton
							form="register-user-form"
							isLoading={createMutation.isPending}
						>
							{clonedFromUser
								? "Create Cloned User"
								: t("users.registerNewUser")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="register-user-form"
					onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
					className="space-y-6"
				>
					{clonedFromUser && (
						<div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-center justify-between gap-3 text-xs shadow-2xs">
							<div className="flex items-center gap-2.5">
								<div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
									<Copy className="h-3.5 w-3.5" />
								</div>
								<div>
									<div className="font-bold text-purple-950 dark:text-purple-200">
										Cloning from @{clonedFromUser.username}{" "}
										{(clonedFromUser.firstname ||
											(clonedFromUser as any).firstName) &&
											`(${clonedFromUser.firstname || (clonedFromUser as any).firstName} ${clonedFromUser.lastname || (clonedFromUser as any).lastName || ""})`}
									</div>
									<p className="text-[11px] text-purple-700/90 dark:text-purple-300/90">
										Organizational hierarchy, department, position, and role assignments are pre-filled. Enter credentials for the new user.
									</p>
								</div>
							</div>
							<Badge className="bg-purple-600 text-white text-[10px] shrink-0 font-bold">
								Template Mode
							</Badge>
						</div>
					)}
					<div className="space-y-4">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
							{t("users.securityRoleDetails")}
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<ModernInput
								label={`${t("users.username")} *`}
								placeholder="mrlang"
								{...registerForm.register("username")}
								error={registerForm.formState.errors.username?.message}
								required
							/>
							<ModernInput
								label={`${t("users.password")} *`}
								type="password"
								placeholder="••••••••"
								{...registerForm.register("password")}
								error={registerForm.formState.errors.password?.message}
								required
							/>
							<ModernInput
								label={`${t("users.email")} *`}
								type="email"
								placeholder="bronx001@gmail.com"
								{...registerForm.register("email")}
								error={registerForm.formState.errors.email?.message}
								required
							/>
							<ModernInput
								label={`${t("users.primaryPhone")} *`}
								placeholder="099889987"
								{...registerForm.register("phone")}
								error={registerForm.formState.errors.phone?.message}
								required
							/>
						</div>
					</div>

					<div className="space-y-4 pt-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
							{t("users.personalDetails")}
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<ModernInput
								label={`${t("users.firstName")} *`}
								placeholder="Bronx"
								{...registerForm.register("firstname")}
								error={registerForm.formState.errors.firstname?.message}
								required
							/>
							<ModernInput
								label={`${t("users.lastName")} *`}
								placeholder="Technology"
								{...registerForm.register("lastname")}
								error={registerForm.formState.errors.lastname?.message}
								required
							/>
							<ModernSelect
								label={`${t("users.gender")} *`}
								value={registerForm.watch("gender")}
								onChange={(val) => registerForm.setValue("gender", val as any)}
								options={[
									{ value: "MALE", label: "Male" },
									{ value: "FEMALE", label: "Female" },
									{ value: "OTHER", label: "Other" },
								]}
							/>
							<ModernDatePicker
								label={t("users.dateOfBirth")}
								value={registerForm.watch("dob")}
								onChange={(date) =>
									registerForm.setValue("dob", date, {
										shouldValidate: true,
										shouldDirty: true,
									})
								}
								placeholder="Select date of birth..."
								clearable
								error={registerForm.formState.errors.dob?.message}
							/>
							<ModernInput
								label={t("users.nickName")}
								placeholder="Dego Rosta"
								{...registerForm.register("nickName")}
							/>
							<ModernInput
								label="Initial Code"
								placeholder="DCD_Test"
								{...registerForm.register("initial")}
							/>
							<ModernInput
								label={t("users.secondaryPhone")}
								placeholder="098739374"
								{...registerForm.register("secondaryPhone")}
							/>
							<ModernInput
								label={t("users.emergencyPhone")}
								placeholder="Emergency contact number"
								{...registerForm.register("emergencyPhone")}
							/>
							<div className="md:col-span-2">
								<ModernInput
									label={t("users.address")}
									placeholder="Phnom Penh City"
									{...registerForm.register("address")}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-4 pt-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-1 dark:border-slate-800">
							{t("users.bioNotes")}
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2">
								<ModernInput
									label={t("users.bioNotes")}
									placeholder="Bio..."
									{...registerForm.register("bio")}
								/>
							</div>
							<div className="md:col-span-2">
								<ModernInput
									label="Remark / Admin Notes"
									placeholder="Additional notes about user..."
									{...registerForm.register("remark")}
								/>
							</div>
						</div>
					</div>

					<RoleSelector
						roles={rolesData?.items || []}
						selectedRoleIds={registerForm.watch("roleIds") || []}
						onChange={(ids) => registerForm.setValue("roleIds", ids)}
						title={t("users.assignedRoles")}
						description="Select the role(s) to grant permission capabilities to this user."
					/>
					{registerForm.formState.errors.roleIds && (
						<p className="text-xs font-medium text-destructive">
							{registerForm.formState.errors.roleIds.message}
						</p>
					)}
				</form>
			</ModernModal>

			{/* Edit User Roles Modal (/api/v1/users/{id}/roles) */}
			<ModernModal
				isOpen={!!editingUser}
				onClose={() => {
					setEditingUser(null);
					setIsLoadingEditUser(false);
				}}
				title={`${t("users.manageRolesStatus")}: ${editingUser?.firstname || editingUser?.firstName || ""} ${editingUser?.lastname || editingUser?.lastName || ""}`}
				subtitle={`Assign or update system roles for @${editingUser?.username}`}
				icon={
					<UserCog className="h-5 w-5 text-purple-600 dark:text-purple-400" />
				}
				size="xl"
				isLoading={assignRolesMutation.isPending || isLoadingEditUser}
				loadingText={
					isLoadingEditUser ? "Loading user roles..." : "Saving user roles..."
				}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setEditingUser(null)} />
						<ModernModalSubmitButton
							onClick={saveUserRolesEdit}
							isLoading={assignRolesMutation.isPending || isLoadingEditUser}
						>
							{t("common.saveChanges")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-6">
					<ModernSwitch
						label={t("users.status")}
						description="Active users can sign in and access organization resources."
						checked={editActiveStatus}
						onCheckedChange={(val) => {
							setEditActiveStatus(val);
							if (editingUser) {
								toggleActive(editingUser);
							}
						}}
					/>

					<RoleSelector
						roles={rolesData?.items || []}
						selectedRoleIds={editRoleIds}
						onChange={setEditRoleIds}
						title={t("users.assignedRoles")}
						description="Manage roles assigned to this user."
					/>
				</div>
			</ModernModal>

			{/* Direct Custom Permissions Modal (/api/v1/users/{id}/permissions) */}
			<ModernModal
				isOpen={!!permissionsUser}
				onClose={() => {
					setPermissionsUser(null);
					setIsLoadingPermissionsUser(false);
				}}
				title={`${t("users.manageDirectPermissions")}: ${permissionsUser?.firstname || permissionsUser?.firstName || ""}`}
				subtitle={t("users.customPermissionsSubtitle")}
				icon={<Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
				size="xl"
				isLoading={
					assignPermissionsMutation.isPending || isLoadingPermissionsUser
				}
				loadingText={isLoadingPermissionsUser ? "Loading..." : "Saving..."}
				footer={
					<ModernModalFooter>
						<ModernModalActionButton
							onClick={() => {
								const u = permissionsUser;
								setPermissionsUser(null);
								setCustomPermissionsUser(u);
							}}
							className="mr-auto border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30"
							icon={<Sparkles className="h-4 w-4 shrink-0 text-purple-600" />}
						>
							Dynamic Resource Permissions Studio
						</ModernModalActionButton>
						<ModernModalCancelButton onClick={() => setPermissionsUser(null)} />
						<ModernModalSubmitButton
							onClick={savePermissions}
							isLoading={
								assignPermissionsMutation.isPending || isLoadingPermissionsUser
							}
						>
							{t("users.savePermissions")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<ModernTabs defaultValue="granted">
					<ModernTabsList variant="glass" size="md" fullWidth>
						<ModernTabsTrigger
							value="granted"
							icon={<ShieldCheck className="size-3.5 text-emerald-600" />}
							badge={`+${selectedPermissions.length}`}
							badgeColor="emerald"
						>
							{t("users.allowedPermissions")}
						</ModernTabsTrigger>
						<ModernTabsTrigger
							value="excluded"
							icon={<ShieldAlert className="size-3.5 text-rose-600" />}
							badge={`-${excludedPermissions.length}`}
							badgeColor="amber"
						>
							{t("users.excludedPermissions")}
						</ModernTabsTrigger>
					</ModernTabsList>

					<ModernTabsContent value="granted" className="mt-0">
						<PermissionSelector
							permissions={permissionsData}
							selectedIds={selectedPermissions}
							onChange={setSelectedPermissions}
							title={t("users.allowedPermissions")}
							description="Grant extra permissions directly to this user beyond their assigned roles."
							badgeVariant="emerald"
						/>
					</ModernTabsContent>

					<ModernTabsContent value="excluded" className="mt-0">
						<PermissionSelector
							permissions={permissionsData}
							selectedIds={excludedPermissions}
							onChange={setExcludedPermissions}
							title={t("users.excludedPermissions")}
							description="Override role grants by blocking specific permissions for this user."
							badgeVariant="rose"
						/>
					</ModernTabsContent>
				</ModernTabs>
			</ModernModal>

			{/* Exclude Permissions Grant Modal (/api/v1/users/{id}/exclude-permissions-grant) */}
			<ModernModal
				isOpen={!!excludeGrantUser}
				onClose={() => setExcludeGrantUser(null)}
				title={
					`${t("users.excludeGrantTitle")}: ${excludeGrantUser?.firstname || excludeGrantUser?.firstName || ""} ${excludeGrantUser?.lastname || excludeGrantUser?.lastName || ""}`.trim() ||
					`${t("users.excludeGrantTitle")}: @${excludeGrantUser?.username}`
				}
				subtitle={t("users.excludeGrantSubtitle")}
				icon={
					<ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
				}
				size="lg"
				isLoading={excludeGrantMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setExcludeGrantUser(null)}
						/>
						<ModernModalSubmitButton
							onClick={() => {
								if (
									excludeGrantUser &&
									excludeGrantModule &&
									excludeGrantActions.length > 0
								) {
									excludeGrantMutation.mutate({
										id: excludeGrantUser.id,
										module: excludeGrantModule,
										actions: excludeGrantActions,
									});
								}
							}}
							disabled={!excludeGrantModule || excludeGrantActions.length === 0}
							isLoading={excludeGrantMutation.isPending}
							icon={<ShieldAlert className="h-4 w-4 shrink-0" />}
						>
							{t("users.applyExclusions")}{" "}
							{excludeGrantActions.length > 0
								? `(${excludeGrantActions.length})`
								: ""}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				{excludeGrantUser && (
					<div className="space-y-5 py-1">
						{/* User Target Banner */}
						<div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-slate-500/5 dark:from-amber-950/30 dark:via-purple-950/20 dark:to-slate-900/40 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-between gap-4">
							<div className="flex items-center gap-3">
								<img
									src={safeImageUrl(
										excludeGrantUser.imageUrl ||
											excludeGrantUser.avatarUrl ||
											fileUrl(excludeGrantUser.avatarKey),
									)}
									alt={excludeGrantUser.username}
									className="h-11 w-11 rounded-xl object-cover border border-amber-300 dark:border-amber-800 shadow-2xs shrink-0"
								/>
								<div>
									<div className="flex items-center gap-2">
										<span className="font-bold text-xs text-foreground">
											{excludeGrantUser.firstname || excludeGrantUser.firstName}{" "}
											{excludeGrantUser.lastname || excludeGrantUser.lastName}
										</span>
										<Badge
											variant="outline"
											className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/60"
										>
											ID #{excludeGrantUser.id}
										</Badge>
									</div>
									<p className="text-[11px] text-muted-foreground">
										@{excludeGrantUser.username} • {excludeGrantUser.email}
									</p>
								</div>
							</div>

							{/* Roles chips */}
							<div className="flex items-center gap-1.5 flex-wrap justify-end">
								{excludeGrantUser.isSuperAdmin && (
									<Badge className="bg-purple-600 text-white text-[10px] font-bold">
										Super Admin
									</Badge>
								)}
								{Array.isArray(excludeGrantUser.roles) &&
									excludeGrantUser.roles.map((r: any, i: number) => (
										<Badge
											key={i}
											variant="secondary"
											className="text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900"
										>
											<Sparkles className="size-2.5 mr-1 text-purple-600" />
											{r.name}
										</Badge>
									))}
							</div>
						</div>

						{/* 1. Module Selector */}
						<div className="space-y-2">
							<label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
								<span className="flex items-center gap-1.5">
									<Layers className="size-3.5 text-purple-600 dark:text-purple-400" />
									1. Target System Module
								</span>
								<span className="text-[11px] text-muted-foreground font-normal lowercase">
									({availableGrantModules.length} modules available)
								</span>
							</label>

							<ModernSelect
								options={availableGrantModules}
								value={excludeGrantModule}
								onChange={(val) => setExcludeGrantModule(val)}
								placeholder="Search or select module..."
								searchable={true}
								leftIcon={<Layers className="size-4 text-purple-600" />}
							/>

							{/* Quick-pick Module Chips */}
							<div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
								<span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
									Quick Pick:
								</span>
								{[
									"Customer",
									"Payment",
									"Order",
									"Inventory",
									"Stock",
									"Export",
									"Price_History",
									"Report",
								].map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setExcludeGrantModule(m)}
										className={cn(
											"px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 border",
											excludeGrantModule.toLowerCase() === m.toLowerCase()
												? "bg-purple-600 text-white border-purple-600 shadow-2xs"
												: "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
										)}
									>
										{m}
									</button>
								))}
							</div>
						</div>

						{/* 2. Actions Selector */}
						<div className="space-y-2.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
									<ShieldAlert className="size-3.5 text-rose-600 dark:text-rose-400" />
									2. Select Actions to Exclude ({excludeGrantActions.length}{" "}
									selected)
								</label>

								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={selectAllActions}
										className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
									>
										<CheckSquare className="size-3" /> Select All
									</button>
									<span className="text-slate-300 dark:text-slate-700">•</span>
									<button
										type="button"
										onClick={clearAllActions}
										className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
									>
										<Square className="size-3" /> Clear
									</button>
								</div>
							</div>

							{/* Action Cards Grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
								{STANDARD_GRANT_ACTIONS.map((act) => {
									const isSelected = excludeGrantActions.includes(act.name);
									const ActionIcon = act.icon;

									return (
										<div
											key={act.name}
											onClick={() => toggleExcludeAction(act.name)}
											className={cn(
												"flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none",
												isSelected
													? "border-rose-400 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-950/30 shadow-2xs"
													: "border-slate-200/80 bg-card hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
											)}
										>
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggleExcludeAction(act.name)}
												className="mt-0.5 shrink-0 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
											/>
											<div className="space-y-0.5 min-w-0 flex-1">
												<div className="flex items-center justify-between gap-1.5">
													<span className="font-bold text-xs text-foreground flex items-center gap-1.5">
														<ActionIcon
															className={cn(
																"size-3.5",
																isSelected
																	? "text-rose-600 dark:text-rose-400"
																	: "text-muted-foreground",
															)}
														/>
														{act.label}
													</span>
													<Badge
														variant="outline"
														className={cn(
															"text-[9px] font-mono font-bold uppercase px-1 py-0",
															act.badgeColor,
														)}
													>
														{act.name}
													</Badge>
												</div>
												<p className="text-[11px] text-muted-foreground leading-tight">
													{act.description}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* 3. Live Impact Confirmation Banner */}
						<div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs space-y-2">
							<div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
								<AlertCircle className="size-4 text-amber-600 shrink-0" />
								<span>Exclusion Summary & Impact</span>
							</div>
							<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
								<span className="text-amber-800 dark:text-amber-300 font-medium">
									Module:
								</span>
								<Badge className="bg-purple-600 text-white text-[10px] font-bold">
									{excludeGrantModule}
								</Badge>
								<span className="text-amber-800 dark:text-amber-300 font-medium ml-1">
									Excluded Actions:
								</span>
								{excludeGrantActions.length > 0 ? (
									excludeGrantActions.map((a) => (
										<Badge
											key={a}
											className="bg-rose-600 text-white font-mono text-[10px] font-bold"
										>
											-{a}
										</Badge>
									))
								) : (
									<span className="text-muted-foreground italic">
										None selected
									</span>
								)}
							</div>
							<p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
								This rule will restrict{" "}
								<strong>@{excludeGrantUser.username}</strong> from executing the
								specified actions on <strong>{excludeGrantModule}</strong>, even
								if granted by their assigned role templates.
							</p>
						</div>
					</div>
				)}
			</ModernModal>

			{/* Admin Reset Password Confirmation Modal */}
			<ModernModal
				isOpen={!!resetPasswordUser}
				onClose={() => setResetPasswordUser(null)}
				title={t("users.resetPasswordTitle", "Reset User Password")}
				description={t(
					"users.resetPasswordDesc",
					"Are you sure you want to reset this user's password? Their existing password will be cleared, any account lockout will be removed, and they will be forced to set a new password on their next login.",
				)}
				size="md"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setResetPasswordUser(null)}
							disabled={resetPasswordMutation.isPending}
						/>
						<ModernModalActionButton
							variant="destructive"
							onClick={() =>
								resetPasswordUser &&
								resetPasswordMutation.mutate(resetPasswordUser)
							}
							disabled={resetPasswordMutation.isPending}
							icon={
								resetPasswordMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin shrink-0" />
								) : (
									<Lock className="h-4 w-4 shrink-0" />
								)
							}
						>
							{t("users.confirmResetPassword", "Reset Password")}
						</ModernModalActionButton>
					</ModernModalFooter>
				}
			>
				{resetPasswordUser && (
					<div className="space-y-3 py-2">
						<div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-2.5">
							<AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
							<p>
								This will immediately terminate all active sessions for{" "}
								<strong>
									@{resetPasswordUser.username ||
										`${resetPasswordUser.firstname || resetPasswordUser.firstName || ""} ${resetPasswordUser.lastname || resetPasswordUser.lastName || ""}`.trim()}
								</strong>
								. They will be prompted to create a new password upon login.
							</p>
						</div>
					</div>
				)}
			</ModernModal>

			{/* Temporary Password Result Modal */}
			<ModernModal
				isOpen={Boolean(tempPasswordResult?.isOpen)}
				onClose={() => setTempPasswordResult(null)}
				title={t("users.tempPasswordTitle", "Temporary Password Generated")}
				description={t(
					"users.tempPasswordDesc",
					"The user's password has been reset. Provide this temporary password to the user to log in.",
				)}
				size="md"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							label={t("common.copyAll", "Copy Credentials")}
							onClick={() => {
								if (tempPasswordResult) {
									handleCopyCredentials(
										`Username: ${tempPasswordResult.username}\nTemporary Password: ${tempPasswordResult.tempPassword}`,
										"Credentials",
									);
								}
							}}
							icon={<Copy className="h-4 w-4 shrink-0" />}
						/>
						<ModernModalActionButton
							variant="default"
							onClick={() => setTempPasswordResult(null)}
							icon={<Check className="h-4 w-4 shrink-0" />}
						>
							{t("common.done", "Done")}
						</ModernModalActionButton>
					</ModernModalFooter>
				}
			>
				{tempPasswordResult && (
					<div className="space-y-4 py-2">
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-start gap-2.5">
							<CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
							<p>
								Password reset complete! When this user logs in with this temporary password, they will be automatically prompted to set a new permanent password.
							</p>
						</div>

						{/* Username Card */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
								Username
							</label>
							<div className="flex items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
								<span className="font-mono text-sm font-semibold text-slate-900 dark:text-white select-all">
									{tempPasswordResult.username}
								</span>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									className="h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
									onClick={() =>
										handleCopyCredentials(tempPasswordResult.username, "Username")
									}
								>
									{copiedField === "Username" ? (
										<Check className="h-4 w-4 text-emerald-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						{/* Temp Password Card */}
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
								Temporary Password
							</label>
							<div className="flex items-center justify-between gap-2 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60">
								<span className="font-mono text-base font-bold text-indigo-900 dark:text-indigo-200 tracking-wider select-all">
									{showTempPassword ? tempPasswordResult.tempPassword : "••••••••••"}
								</span>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-8 px-2 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white"
										onClick={() => setShowTempPassword((prev) => !prev)}
									>
										{showTempPassword ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-8 px-2 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white"
										onClick={() =>
											handleCopyCredentials(
												tempPasswordResult.tempPassword,
												"Temporary Password",
											)
										}
									>
										{copiedField === "Temporary Password" ? (
											<Check className="h-4 w-4 text-emerald-600" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</Button>
								</div>
							</div>
						</div>
					</div>
				)}
			</ModernModal>

			{/* Direct Custom Dynamic Permissions Modal (?companyId=...) */}
			{/* <CustomPermissionsModal
        user={customPermissionsUser}
        open={Boolean(customPermissionsUser)}
        onOpenChange={(open) => !open && setCustomPermissionsUser(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] })
        }}
      /> */}
		</div>
	);
}

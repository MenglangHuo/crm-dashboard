"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminsApi } from "@/lib/api/endpoints";
import {
	SystemAdmin,
	CreateSystemAdminInput,
	UpdateSystemAdminInput,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	ShieldAlert,
	ShieldCheck,
	Shield,
	Eye,
	Pencil,
	Mail,
	Lock,
	Unlock,
	KeyRound,
	Users,
	CheckCircle2,
	XCircle,
	Clock,
	Calendar,
	Sparkles,
	UserCheck,
	Headphones,
	FileText,
	Copy,
	CheckCheck,
	AlertTriangle,
	RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	DataTable,
	ColumnDef,
	UserDetailCell,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernSwitch,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
} from "@/components/ui-custom/modern-tabs";
import { useTranslation } from "@/lib/i18n/context";

// Admin Level Options
const ADMIN_LEVEL_OPTIONS = [
	{
		value: "SUPPORT",
		label: "Support Team (SUPPORT)",
		description: "Operational support, user assistance, and management",
	},
	{
		value: "READ_ONLY",
		label: "Read Only (READ_ONLY)",
		description: "View-only access across administrative domains",
	},
	{
		value: "FULL",
		label: "Full Administrator (FULL)",
		description: "Unrestricted root administrative permissions and settings",
	},
];

// Form validation schemas
const createFormSchema = z.object({
	displayName: z.string().min(1, "Display name is required"),
	username: z.string().min(3, "Username must be at least 3 characters"),
	email: z.string().email("Valid email address is required"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	adminLevel: z.string().min(1, "Admin level is required"),
	isActive: z.boolean().default(true),
	notes: z.string().optional(),
});

const editFormSchema = z.object({
	displayName: z.string().min(1, "Display name is required"),
	username: z.string().min(3, "Username must be at least 3 characters"),
	email: z.string().email("Valid email address is required"),
	password: z.string().optional(),
	adminLevel: z.string().min(1, "Admin level is required"),
	isActive: z.boolean().default(true),
	notes: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

export default function SystemAdminsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Localized Admin Level Options
	const adminLevelOptions = [
		{
			value: "SUPPORT",
			label: t(
				"superAdmin.admins.createModal.supportLevelLabel",
				"Support Team (SUPPORT)",
			),
			description: t(
				"superAdmin.admins.createModal.supportLevelDesc",
				"Operational support, user assistance, and management",
			),
		},
		{
			value: "READ_ONLY",
			label: t(
				"superAdmin.admins.createModal.readOnlyLevelLabel",
				"Read Only (READ_ONLY)",
			),
			description: t(
				"superAdmin.admins.createModal.readOnlyLevelDesc",
				"View-only access across administrative domains",
			),
		},
		{
			value: "FULL",
			label: t(
				"superAdmin.admins.createModal.fullLevelLabel",
				"Full Administrator (FULL)",
			),
			description: t(
				"superAdmin.admins.createModal.fullLevelDesc",
				"Unrestricted root administrative permissions and settings",
			),
		},
	];

	// Table & Filter State
	const [search, setSearch] = useState("");
	const [levelFilter, setLevelFilter] = useState("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [sortBy, setSortBy] = useState("createdAt");
	const [orderBy, setOrderBy] = useState<"ASC" | "DESC">("DESC");

	// Modals & Action State
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingAdmin, setEditingAdmin] = useState<SystemAdmin | null>(null);
	const [viewingAdmin, setViewingAdmin] = useState<SystemAdmin | null>(null);
	const [togglingId, setTogglingId] = useState<string | number | null>(null);
	const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

	// Fetch System Admins List
	const { data, isLoading } = useQuery({
		queryKey: [
			"system-admins",
			{ page, pageSize, search, level: levelFilter, sortBy, orderBy },
		],
		queryFn: () =>
			adminsApi.list({
				page,
				size: pageSize,
				limit: pageSize,
				search,
				level: levelFilter === "ALL" ? undefined : levelFilter,
				sortBy,
				orderBy,
			}),
	});

	// Fetch detail for viewing admin modal
	const { data: detailedAdmin } = useQuery({
		queryKey: ["system-admin-detail", viewingAdmin?.id],
		queryFn: () => (viewingAdmin ? adminsApi.get(viewingAdmin.id) : null),
		enabled: !!viewingAdmin,
	});

	const activeAdminDetails = detailedAdmin || viewingAdmin;

	// Create Form
	const createForm = useForm<CreateFormValues>({
		resolver: zodResolver(createFormSchema) as any,
		defaultValues: {
			displayName: "",
			username: "",
			email: "",
			password: "",
			adminLevel: "SUPPORT",
			isActive: true,
			notes: "",
		},
	});

	// Edit Form
	const editForm = useForm<EditFormValues>({
		resolver: zodResolver(editFormSchema) as any,
		defaultValues: {
			displayName: "",
			username: "",
			email: "",
			password: "",
			adminLevel: "SUPPORT",
			isActive: true,
			notes: "",
		},
	});

	// Create Mutation
	const createMutation = useMutation({
		mutationFn: (values: CreateFormValues) => adminsApi.create(values),
		onSuccess: (res) => {
			toast.success(
				res?.username
					? `Admin "${res.username}" created successfully`
					: "System Admin created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["system-admins"] });
			setIsCreateOpen(false);
			createForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Update Mutation
	const updateMutation = useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string | number;
			body: UpdateSystemAdminInput;
		}) => adminsApi.update(id, body),
		onSuccess: (res) => {
			toast.success(
				res?.username
					? `Admin "${res.username}" updated successfully`
					: "System Admin updated successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["system-admins"] });
			if (viewingAdmin && String(viewingAdmin.id) === String(res?.id)) {
				setViewingAdmin(res);
			}
			setEditingAdmin(null);
			editForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Status Switch (Active -> DELETE /system_admins/{id}, Inactive -> PATCH /system_admins/{id}/restore)
	const handleToggleStatus = async (
		admin: SystemAdmin,
		nextActive: boolean,
	) => {
		const adminId = admin.id;
		setTogglingId(adminId);
		const adminName = admin.displayName || admin.username || `ID #${admin.id}`;
		try {
			if (nextActive) {
				// Activate via PATCH {{crm-url}}/api/v1/system_admins/{id}/restore
				await adminsApi.restore(adminId);
				toast.success(`Admin "${adminName}" restored and activated`);
			} else {
				// Deactivate via DELETE {{crm-url}}/api/v1/system_admins/{id}
				await adminsApi.remove(adminId);
				toast.success(`Admin "${adminName}" deactivated`);
			}
			queryClient.invalidateQueries({ queryKey: ["system-admins"] });
			queryClient.invalidateQueries({
				queryKey: ["system-admin-detail", adminId],
			});
			if (viewingAdmin && String(viewingAdmin.id) === String(adminId)) {
				setViewingAdmin((prev) =>
					prev ? { ...prev, isActive: nextActive } : null,
				);
			}
		} catch (err: any) {
			const msg = getErrorMessage(err) || "Failed to update admin status";
			toast.error(msg);
		} finally {
			setTogglingId(null);
		}
	};

	// Open Create Modal
	const openCreateModal = () => {
		createForm.reset({
			displayName: "",
			username: "",
			email: "",
			password: "",
			adminLevel: "SUPPORT",
			isActive: true,
			notes: "",
		});
		setIsCreateOpen(true);
	};

	// Open Edit Modal
	const openEditModal = (admin: SystemAdmin) => {
		setEditingAdmin(admin);
		editForm.reset({
			displayName: admin.displayName || "",
			username: admin.username || "",
			email: admin.email || "",
			password: "",
			adminLevel: admin.adminLevel || "SUPPORT",
			isActive: admin.isActive !== false,
			notes: admin.notes || "",
		});
	};

	// Handle Create Submit
	const handleCreateSubmit = (values: CreateFormValues) => {
		createMutation.mutate(values);
	};

	// Handle Edit Submit
	const handleEditSubmit = (values: EditFormValues) => {
		if (!editingAdmin) return;
		const payload: UpdateSystemAdminInput = {
			displayName: values.displayName,
			username: values.username,
			email: values.email,
			adminLevel: values.adminLevel,
			isActive: values.isActive,
			notes: values.notes,
		};
		// Only send password if user entered one
		if (values.password && values.password.trim().length > 0) {
			payload.password = values.password.trim();
		}
		updateMutation.mutate({ id: editingAdmin.id, body: payload });
	};

	// Copy email helper
	const handleCopyEmail = (email: string, e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(email);
		setCopiedEmail(email);
		toast.success("Email address copied to clipboard");
		setTimeout(() => setCopiedEmail(null), 2000);
	};

	// Stats calculation
	const adminList = data?.items || [];
	const totalAdmins = data?.total || 0;
	const activeAdminsCount = adminList.filter((a) => a.isActive).length;
	const fullAdminsCount = adminList.filter(
		(a) => (a.adminLevel || "").toUpperCase() === "FULL",
	).length;
	const supportAdminsCount = adminList.filter(
		(a) => (a.adminLevel || "").toUpperCase() === "SUPPORT",
	).length;
	const readOnlyAdminsCount = adminList.filter(
		(a) => (a.adminLevel || "").toUpperCase() === "READ_ONLY",
	).length;
	const lockedAccountsCount = adminList.filter((a) => a.isLocked).length;

	// Render Admin Level Badge
	const renderLevelBadge = (level: string) => {
		const norm = (level || "").toUpperCase();
		if (norm === "FULL") {
			return (
				<Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs font-semibold gap-1.5 shadow-2xs">
					<ShieldAlert className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
					<span>Full Admin</span>
				</Badge>
			);
		}
		if (norm === "SUPPORT") {
			return (
				<Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-xs font-semibold gap-1.5 shadow-2xs">
					<Headphones className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
					<span>Support Team</span>
				</Badge>
			);
		}
		if (norm === "READ_ONLY") {
			return (
				<Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs font-medium gap-1.5 shadow-2xs">
					<Eye className="h-3.5 w-3.5 text-slate-500" />
					<span>Read Only</span>
				</Badge>
			);
		}
		return (
			<Badge variant="outline" className="text-xs font-medium">
				{level}
			</Badge>
		);
	};

	// Format date helper
	const formatDate = (isoString?: string | null) => {
		if (!isoString) return "—";
		try {
			const d = new Date(isoString);
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return isoString;
		}
	};

	// Data Table Columns
	const columns: ColumnDef<SystemAdmin>[] = [
		{
			id: "admin",
			header: t("superAdmin.admins.columns.adminInfo", "Admin Name & Username"),
			accessorFn: (a) => `${a.displayName || ""} ${a.username || ""}`,
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-3">
					<UserDetailCell
						name={row.displayName || row.username}
						subtitle={`@${row.username}`}
					/>
					<Badge
						variant="outline"
						className="text-[10px] font-mono text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 px-1.5 py-0 h-4.5"
					>
						#{row.id}
					</Badge>
				</div>
			),
		},
		{
			id: "email",
			header: t("superAdmin.admins.columns.email", "Email Address"),
			accessorKey: "email",
			sortable: true,
			cell: ({ row }) => (
				<div
					className="group/email flex items-center gap-1.5 text-xs text-foreground font-medium cursor-pointer hover:text-primary transition-colors"
					onClick={(e) => handleCopyEmail(row.email, e)}
					title="Click to copy email"
				>
					<Mail className="h-3.5 w-3.5 text-muted-foreground group-hover/email:text-primary transition-colors shrink-0" />
					<span className="truncate max-w-[180px]">{row.email}</span>
					{copiedEmail === row.email ? (
						<CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
					) : (
						<Copy className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0" />
					)}
				</div>
			),
		},
		{
			id: "adminLevel",
			header: t("superAdmin.admins.columns.level", "Privilege Level"),
			accessorKey: "adminLevel",
			sortable: true,
			cell: ({ row }) => renderLevelBadge(row.adminLevel),
		},
		{
			id: "status",
			header: t("superAdmin.admins.columns.status", "Account Status"),
			accessorKey: "isActive",
			sortable: true,
			cell: ({ row }) => {
				const isRowActive = row.isActive !== false;
				const isToggling = togglingId === row.id;

				return (
					<div
						className="flex items-center gap-2.5"
						onClick={(e) => e.stopPropagation()}
					>
						<ModernSwitch
							checked={isRowActive}
							isLoading={isToggling}
							disabled={isToggling}
							switchSize="sm"
							onCheckedChange={(checked) => handleToggleStatus(row, checked)}
						/>
						<span
							className={`text-xs font-semibold transition-colors ${
								isRowActive
									? "text-emerald-600 dark:text-emerald-400"
									: "text-slate-400 dark:text-slate-500"
							}`}
						>
							{isRowActive ? "Active" : "Inactive"}
						</span>
					</div>
				);
			},
		},
		{
			id: "security",
			header: "Security & Lock",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.isLocked ? (
						<Badge className="bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800 text-[11px] gap-1 font-semibold">
							<Lock className="h-3 w-3 text-red-600 dark:text-red-400" />
							<span>Locked</span>
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 gap-1 font-medium"
						>
							<ShieldCheck className="h-3 w-3 text-emerald-600" />
							<span>Secure</span>
						</Badge>
					)}

					{typeof row.loginAttempts === "number" && row.loginAttempts > 0 && (
						<Badge
							variant="outline"
							className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
						>
							{row.loginAttempts} failed
						</Badge>
					)}
				</div>
			),
		},
		{
			id: "lastLogin",
			header: "Last Login",
			accessorKey: "lastLoginAt",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Clock className="h-3 w-3 text-slate-400 shrink-0" />
					<span>
						{row.lastLoginAt ? formatDate(row.lastLoginAt) : "Never logged in"}
					</span>
				</div>
			),
		},
		{
			id: "notes",
			header: "Notes",
			accessorKey: "notes",
			cell: ({ row }) =>
				row.notes ? (
					<span
						className="text-xs text-muted-foreground truncate max-w-[160px] block"
						title={row.notes}
					>
						{row.notes}
					</span>
				) : (
					<span className="text-xs text-slate-300 dark:text-slate-600 italic">
						—
					</span>
				),
		},
		{
			id: "createdAt",
			header: t("superAdmin.admins.columns.created", "Created Date"),
			accessorKey: "createdAt",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Calendar className="h-3 w-3 text-slate-400 shrink-0" />
					<span>{formatDate(row.createdAt)}</span>
				</div>
			),
		},
	];

	// Custom Actions Dropdown
	const customRowActions: RowAction<SystemAdmin>[] = [
		{
			id: "view",
			label: t(
				"superAdmin.admins.actions.viewProfile",
				"Inspect Admin Profile",
			),
			icon: <Eye className="h-3.5 w-3.5 text-purple-600" />,
			onClick: (admin) => setViewingAdmin(admin),
		},
		{
			id: "edit",
			label: t(
				"superAdmin.admins.actions.editAdmin",
				"Edit Credentials & Level",
			),
			icon: <Pencil className="h-3.5 w-3.5 text-blue-600" />,
			onClick: (admin) => openEditModal(admin),
		},
		{
			id: "toggle",
			label: (admin) =>
				admin.isActive
					? t("superAdmin.admins.actions.deactivate", "Deactivate Admin")
					: t("superAdmin.admins.actions.activate", "Activate Admin"),
			icon: (admin) =>
				admin.isActive ? (
					<XCircle className="h-3.5 w-3.5 text-amber-600" />
				) : (
					<RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
				),
			onClick: (admin) => handleToggleStatus(admin, !admin.isActive),
		},
	];

	return (
		<div className="space-y-6">
			{/* Top Header & Intro */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
						<div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60 shadow-2xs">
							<ShieldAlert className="h-5 w-5" />
						</div>
						<span>
							{t("superAdmin.admins.title", "System Administrators Directory")}
						</span>
					</h1>
					<p className="text-xs text-muted-foreground mt-1">
						{t(
							"superAdmin.admins.subtitle",
							"Root governance, security roles, operational support staff, and administrative audit trails.",
						)}
					</p>
				</div>

				<Button
					onClick={openCreateModal}
					className="rounded-xl px-4 py-2 text-xs font-bold gap-2 shadow-sm shadow-primary/20"
				>
					<ShieldAlert className="h-4 w-4" />
					<span>{t("superAdmin.admins.addAdmin", "Provision Admin")}</span>
				</Button>
			</div>

			{/* Overview Metric Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("superAdmin.admins.totalAdmins", "Total System Admins")}
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{totalAdmins}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								Global Super Accounts
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
							<Shield className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t(
									"superAdmin.admins.activeCredentials",
									"Active System Credentials",
								)}
							</p>
							<h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
								{activeAdminsCount}
							</h3>
							<p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
								Active & Operational
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("superAdmin.admins.supportStaff", "Support Staff")}
							</p>
							<h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
								{supportAdminsCount + readOnlyAdminsCount}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{supportAdminsCount} Support / {readOnlyAdminsCount} Read-Only
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
							<Users className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								Account Security
							</p>
							<h3
								className={`text-2xl font-bold mt-1 ${lockedAccountsCount > 0 ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}
							>
								{lockedAccountsCount > 0
									? `${lockedAccountsCount} Locked`
									: "All Secure"}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{lockedAccountsCount > 0
									? "Requires review"
									: "No security lockouts"}
							</p>
						</div>
						<div
							className={`h-11 w-11 rounded-xl flex items-center justify-center ${
								lockedAccountsCount > 0
									? "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
									: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
							}`}
						>
							{lockedAccountsCount > 0 ? (
								<Lock className="h-5 w-5" />
							) : (
								<ShieldCheck className="h-5 w-5" />
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Privilege Level Filter Tabs */}
			<ModernTabs
				value={levelFilter}
				onValueChange={(val) => {
					setLevelFilter(val);
					setPage(1);
				}}
			>
				<ModernTabsList variant="pills" size="sm">
					<ModernTabsTrigger
						value="ALL"
						badge={totalAdmins}
						badgeColor="purple"
						icon={<Shield className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.admins.allAdmins", "All Admins")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="SUPPORT"
						badge={supportAdminsCount}
						badgeColor="sky"
						icon={<Headphones className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.admins.supportTab", "Support Staff")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="READ_ONLY"
						badge={readOnlyAdminsCount}
						badgeColor="slate"
						icon={<Eye className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.admins.readOnlyTab", "Read Only")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="FULL"
						badge={fullAdminsCount}
						badgeColor="indigo"
						icon={<ShieldAlert className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.admins.rootTab", "Root Full Admin")}
					</ModernTabsTrigger>
				</ModernTabsList>
			</ModernTabs>

			{/* Main Data Table */}
			<DataTable<SystemAdmin>
				data={adminList}
				columns={columns}
				getRowId={(a) => String(a.id)}
				title={t("superAdmin.admins.listTitle", "System Administrators List")}
				searchPlaceholder={t(
					"superAdmin.admins.searchPlaceholder",
					"Search admin by name, username, email, notes...",
				)}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel={t("superAdmin.admins.addAdmin", "Provision Admin")}
				onCreateNew={openCreateModal}
				actions={customRowActions}
				manualPagination={true}
				totalCount={data?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				exportFilename="system-admins"
				emptyStateTitle={t(
					"superAdmin.admins.emptyTitle",
					"No administrators found",
				)}
				emptyStateDescription={t(
					"superAdmin.admins.emptyDesc",
					"Provision a new administrator account or adjust search criteria.",
				)}
			/>

			{/* ============================================================ */}
			{/* 1. CREATE SYSTEM ADMIN MODAL                                */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				title={t(
					"superAdmin.admins.createModal.title",
					"Provision System Administrator",
				)}
				subtitle={t(
					"superAdmin.admins.createModal.subtitle",
					"Create a new administrative account with designated privilege level and credentials.",
				)}
				icon={<ShieldAlert className="h-5 w-5 text-purple-600" />}
				size="md"
				isLoading={createMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsCreateOpen(false)} />
						<ModernModalSubmitButton
							form="create-admin-form"
							isLoading={createMutation.isPending}
						>
							{t(
								"superAdmin.admins.createModal.submitButton",
								"Provision Administrator",
							)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="create-admin-form"
					onSubmit={createForm.handleSubmit(handleCreateSubmit)}
					className="space-y-4"
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.displayNameLabel",
								"Display Name",
							)}
							placeholder={t(
								"superAdmin.admins.createModal.displayNamePlaceholder",
								"e.g. Menglang Huo",
							)}
							{...createForm.register("displayName")}
							error={createForm.formState.errors.displayName?.message}
							required
						/>
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.usernameLabel",
								"Username",
							)}
							placeholder={t(
								"superAdmin.admins.createModal.usernamePlaceholder",
								"e.g. huomenglang",
							)}
							{...createForm.register("username")}
							error={createForm.formState.errors.username?.message}
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.emailLabel",
								"Email Address",
							)}
							type="email"
							placeholder={t(
								"superAdmin.admins.createModal.emailPlaceholder",
								"e.g. menglanghuo@gmail.com",
							)}
							{...createForm.register("email")}
							error={createForm.formState.errors.email?.message}
							required
						/>
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.passwordLabel",
								"Account Password",
							)}
							type="password"
							placeholder={t(
								"superAdmin.admins.createModal.passwordPlaceholder",
								"••••••••",
							)}
							{...createForm.register("password")}
							error={createForm.formState.errors.password?.message}
							required
						/>
					</div>

					<ModernSelect
						label={t(
							"superAdmin.admins.createModal.levelLabel",
							"Admin Access Level",
						)}
						options={adminLevelOptions}
						value={createForm.watch("adminLevel")}
						onChange={(val) => createForm.setValue("adminLevel", val)}
						error={createForm.formState.errors.adminLevel?.message}
						required
					/>

					<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
								{t(
									"superAdmin.admins.createModal.statusLabel",
									"Account Active Status",
								)}
							</label>
							<p className="text-[11px] text-muted-foreground">
								Enable immediate login access upon account creation.
							</p>
						</div>
						<ModernSwitch
							checked={createForm.watch("isActive")}
							onCheckedChange={(val) => createForm.setValue("isActive", val)}
							switchSize="md"
						/>
					</div>

					<ModernTextarea
						label={t(
							"superAdmin.admins.createModal.notesLabel",
							"Internal Operational Notes",
						)}
						placeholder={t(
							"superAdmin.admins.createModal.notesPlaceholder",
							"Operational scope, contact details, or notes...",
						)}
						rows={3}
						{...createForm.register("notes")}
						error={createForm.formState.errors.notes?.message}
					/>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* 2. EDIT SYSTEM ADMIN MODAL                                  */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={!!editingAdmin}
				onClose={() => setEditingAdmin(null)}
				title={t(
					"superAdmin.admins.editModal.title",
					"Edit Administrator #{{id}}",
					{ id: editingAdmin?.id || "" },
				)}
				subtitle={t(
					"superAdmin.admins.editModal.subtitle",
					"Update account profile, access privileges, security parameters, and active status.",
				)}
				icon={<Pencil className="h-5 w-5 text-blue-600" />}
				size="md"
				isLoading={updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setEditingAdmin(null)} />
						<ModernModalSubmitButton
							form="edit-admin-form"
							isLoading={updateMutation.isPending}
						>
							{t("superAdmin.admins.editModal.saveButton", "Save Changes")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="edit-admin-form"
					onSubmit={editForm.handleSubmit(handleEditSubmit)}
					className="space-y-4"
				>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.displayNameLabel",
								"Display Name",
							)}
							placeholder={t(
								"superAdmin.admins.createModal.displayNamePlaceholder",
								"e.g. Menglang Huo",
							)}
							{...editForm.register("displayName")}
							error={editForm.formState.errors.displayName?.message}
							required
						/>
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.usernameLabel",
								"Username",
							)}
							placeholder={t(
								"superAdmin.admins.createModal.usernamePlaceholder",
								"e.g. huomenglang",
							)}
							{...editForm.register("username")}
							error={editForm.formState.errors.username?.message}
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.emailLabel",
								"Email Address",
							)}
							type="email"
							placeholder={t(
								"superAdmin.admins.createModal.emailPlaceholder",
								"e.g. menglanghuo@gmail.com",
							)}
							{...editForm.register("email")}
							error={editForm.formState.errors.email?.message}
							required
						/>
						<ModernInput
							label={t(
								"superAdmin.admins.createModal.passwordLabel",
								"Account Password",
							)}
							type="password"
							placeholder="••••••••"
							{...editForm.register("password")}
							error={editForm.formState.errors.password?.message}
							helperText={t(
								"superAdmin.admins.editModal.passwordHelper",
								"Leave blank to keep existing password unchanged",
							)}
						/>
					</div>

					<ModernSelect
						label={t(
							"superAdmin.admins.createModal.levelLabel",
							"Admin Access Level",
						)}
						options={adminLevelOptions}
						value={editForm.watch("adminLevel")}
						onChange={(val) => editForm.setValue("adminLevel", val)}
						error={editForm.formState.errors.adminLevel?.message}
						required
					/>

					<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
						<div className="space-y-0.5">
							<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
								{t(
									"superAdmin.admins.createModal.statusLabel",
									"Account Active Status",
								)}
							</label>
							<p className="text-[11px] text-muted-foreground">
								Active accounts can sign in and perform system operations.
							</p>
						</div>
						<ModernSwitch
							checked={editForm.watch("isActive")}
							onCheckedChange={(val) => editForm.setValue("isActive", val)}
							switchSize="md"
						/>
					</div>

					<ModernTextarea
						label={t(
							"superAdmin.admins.createModal.notesLabel",
							"Internal Operational Notes",
						)}
						placeholder={t(
							"superAdmin.admins.createModal.notesPlaceholder",
							"Operational scope, contact details, or notes...",
						)}
						rows={3}
						{...editForm.register("notes")}
						error={editForm.formState.errors.notes?.message}
					/>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* 3. VIEW SYSTEM ADMIN DETAILS MODAL                          */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={!!viewingAdmin}
				onClose={() => setViewingAdmin(null)}
				title={t(
					"superAdmin.admins.inspectModal.title",
					"System Administrator Profile #{{id}}",
					{ id: viewingAdmin?.id || "" },
				)}
				subtitle={t(
					"superAdmin.admins.inspectModal.subtitle",
					"Comprehensive security parameters, access privileges, and creation metadata.",
				)}
				icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setViewingAdmin(null)}
							label={t("common.close", "Close")}
						/>
						{activeAdminDetails && (
							<Button
								variant="outline"
								className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 border-slate-200 dark:border-slate-800"
								onClick={() => {
									const target = activeAdminDetails;
									setViewingAdmin(null);
									openEditModal(target);
								}}
							>
								<Pencil className="h-3.5 w-3.5" />
								<span>
									{t(
										"superAdmin.admins.actions.editAdmin",
										"Edit Credentials & Level",
									)}
								</span>
							</Button>
						)}
					</ModernModalFooter>
				}
			>
				{activeAdminDetails && (
					<div className="space-y-5">
						{/* Header Profile Card */}
						<div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:to-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div className="flex items-center gap-3.5">
								<div className="h-13 w-13 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
									{(
										activeAdminDetails.displayName ||
										activeAdminDetails.username ||
										"A"
									)
										.slice(0, 2)
										.toUpperCase()}
								</div>
								<div>
									<div className="flex items-center gap-2">
										<h3 className="font-bold text-base text-slate-900 dark:text-white">
											{activeAdminDetails.displayName ||
												activeAdminDetails.username}
										</h3>
										<Badge
											variant="outline"
											className="text-[10px] font-mono text-slate-400 border-slate-200 dark:border-slate-800"
										>
											ID: #{activeAdminDetails.id}
										</Badge>
									</div>
									<p className="text-xs text-muted-foreground font-mono mt-0.5">
										@{activeAdminDetails.username}
									</p>
									<p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
										<Mail className="h-3 w-3 text-muted-foreground" />
										<span>{activeAdminDetails.email}</span>
									</p>
								</div>
							</div>

							<div className="flex flex-col items-start sm:items-end gap-2">
								<div>{renderLevelBadge(activeAdminDetails.adminLevel)}</div>
								<div className="flex items-center gap-2">
									<span className="text-[11px] text-muted-foreground">
										Account Status:
									</span>
									<ModernSwitch
										checked={activeAdminDetails.isActive !== false}
										isLoading={togglingId === activeAdminDetails.id}
										disabled={togglingId === activeAdminDetails.id}
										switchSize="sm"
										onCheckedChange={(checked) =>
											handleToggleStatus(activeAdminDetails, checked)
										}
									/>
									<span
										className={`text-xs font-bold ${
											activeAdminDetails.isActive !== false
												? "text-emerald-600 dark:text-emerald-400"
												: "text-slate-400 dark:text-slate-500"
										}`}
									>
										{activeAdminDetails.isActive !== false
											? "Active"
											: "Inactive"}
									</span>
								</div>
							</div>
						</div>

						{/* Security & Audit Info Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
										Account Lock State
									</span>
									{activeAdminDetails.isLocked ? (
										<Badge className="bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 text-[10px]">
											Locked
										</Badge>
									) : (
										<Badge
											variant="outline"
											className="text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 border-emerald-200 text-[10px]"
										>
											Unlocked
										</Badge>
									)}
								</div>
								<p className="text-xs text-slate-900 dark:text-slate-100 font-medium">
									{activeAdminDetails.isLocked
										? "Account is locked due to security rules"
										: "Normal security status"}
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
										Failed Login Attempts
									</span>
									<span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
										{activeAdminDetails.loginAttempts || 0}
									</span>
								</div>
								<p className="text-xs text-slate-900 dark:text-slate-100 font-medium">
									{activeAdminDetails.loginAttempts &&
									activeAdminDetails.loginAttempts > 0
										? `${activeAdminDetails.loginAttempts} failed attempts recorded`
										: "No failed attempts on record"}
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
									Last Login Timestamp
								</span>
								<p className="text-xs text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1.5">
									<Clock className="h-3.5 w-3.5 text-muted-foreground" />
									<span>
										{activeAdminDetails.lastLoginAt
											? formatDate(activeAdminDetails.lastLoginAt)
											: "Never logged in"}
									</span>
								</p>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
									Registered Date
								</span>
								<p className="text-xs text-slate-900 dark:text-slate-100 font-medium flex items-center gap-1.5">
									<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
									<span>{formatDate(activeAdminDetails.createdAt)}</span>
								</p>
							</div>
						</div>

						{/* Notes Section */}
						{activeAdminDetails.notes && (
							<div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1.5">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<FileText className="h-3.5 w-3.5 text-muted-foreground" />
									<span>Administrative Notes</span>
								</span>
								<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
									{activeAdminDetails.notes}
								</p>
							</div>
						)}
					</div>
				)}
			</ModernModal>
		</div>
	);
}

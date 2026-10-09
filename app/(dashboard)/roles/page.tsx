"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, permissionsApi } from "@/lib/api/endpoints";
import { Role } from "@/lib/types";
import {
	getRoleTotalPermissionsCount,
	getRoleModuleBreakdown,
	getRolePriorityConfig,
	formatRolePermissionsPayload,
	extractRolePermissionIds,
} from "@/lib/role-utils";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	ShieldCheck,
	ShieldAlert,
	Crown,
	Shield,
	Layers,
	LayoutGrid,
	List,
	Eye,
	Plus,
	Search,
	Sparkles,
	Calendar,
	MoreVertical,
	CheckCircle2,
	Trash2,
	Edit,
	ArrowUpDown,
	ChevronDown,
	Copy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	DataTable,
	ColumnDef,
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
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { PermissionSelector } from "@/components/ui-custom/permission-selector";
import { RoleMatrixModal } from "@/components/ui-custom/role-matrix-modal";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

const formSchema = z.object({
	name: z.string().min(2, "Name is required"),
	displayName: z.string().optional(),
	description: z.string().optional(),
	priority: z.number().optional(),
	permissionIds: z.array(z.string()),
});

export default function RolesPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [viewMode, setViewMode] = useState<"table" | "grid">("table");
	const [sortField, setSortField] = useState<
		"displayName" | "name" | "createdAt"
	>("displayName");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	// Selected Role ID for detailed inspect modal (fetches GET /api/v1/roles/{id})
	const [selectedRoleId, setSelectedRoleId] = useState<string | number | null>(
		null,
	);

	const { data: roleDetail, isLoading: isLoadingRoleDetail } = useQuery({
		queryKey: ["role-detail", selectedRoleId],
		queryFn: () => rolesApi.get(selectedRoleId!),
		enabled: !!selectedRoleId,
	});

	// Dialog state for Role Create/Edit
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<Role | null>(null);
	const [clonedFromRole, setClonedFromRole] = useState<Role | null>(null);
	const [isLoadingEditRole, setIsLoadingEditRole] = useState(false);

	// Dialog state for Role Permission Exclusions
	const [excludeRole, setExcludeRole] = useState<Role | null>(null);
	const [excludedPermissionIds, setExcludedPermissionIds] = useState<string[]>(
		[],
	);
	const [isLoadingExcludeRole, setIsLoadingExcludeRole] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: ["roles", { page, pageSize, search }],
		queryFn: () => rolesApi.list({ page, limit: pageSize, search }),
	});

	const { data: permissionsData = [] } = useQuery({
		queryKey: ["permissions-all"],
		queryFn: () => permissionsApi.list({ limit: 500 }).then((r) => r.items),
	});

	const rawRolesList: Role[] = data?.items || [];

	const rolesList: Role[] = useMemo(() => {
		const list = [...rawRolesList];
		list.sort((a: any, b: any) => {
			const valA = String(a[sortField] || "").toLowerCase();
			const valB = String(b[sortField] || "").toLowerCase();
			if (valA < valB) return sortDirection === "asc" ? -1 : 1;
			if (valA > valB) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});
		return list;
	}, [rawRolesList, sortField, sortDirection]);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			displayName: "",
			description: "",
			priority: 2,
			permissionIds: [],
		},
	});

	const createMutation = useMutation({
		mutationFn: rolesApi.create,
		onSuccess: () => {
			toast.success(
				clonedFromRole
					? "Role cloned and created successfully!"
					: t("roles.createdSuccess") || "Role created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			setIsDialogOpen(false);
			setClonedFromRole(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string | number; body: any }) =>
			rolesApi.update(id, body),
		onSuccess: () => {
			toast.success(t("roles.updatedSuccess") || "Role updated successfully");
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			setIsDialogOpen(false);
			setEditingRole(null);
			setClonedFromRole(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const excludeMutation = useMutation({
		mutationFn: ({
			id,
			permissionIds,
		}: {
			id: string | number;
			permissionIds: string[];
		}) => rolesApi.excludePermissions(id, permissionIds),
		onSuccess: () => {
			toast.success("Role permission exclusions updated");
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			setExcludeRole(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: rolesApi.remove,
		onSuccess: () => {
			toast.success(t("roles.deletedSuccess") || "Role deleted successfully");
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setEditingRole(null);
		setClonedFromRole(null);
		setIsLoadingEditRole(false);
		form.reset({
			name: "",
			displayName: "",
			description: "",
			priority: 2,
			permissionIds: [],
		});
		setIsDialogOpen(true);
	};

	const openEdit = async (role: Role) => {
		setEditingRole(role);
		setClonedFromRole(null);
		setIsDialogOpen(true);
		setIsLoadingEditRole(true);

		// Initial instant population from current role object
		const initialPermIds = extractRolePermissionIds(role, permissionsData);
		form.reset({
			name: role.name || "",
			displayName: role.displayName || "",
			description: role.description || "",
			priority: role.priority ?? 2,
			permissionIds: initialPermIds,
		});

		try {
			// Fetch full role definition from server to get all active permissions & actions
			const fullRole = await rolesApi.get(role.id);
			if (fullRole) {
				setEditingRole(fullRole);
				const detailedPermIds = extractRolePermissionIds(
					fullRole,
					permissionsData,
				);
				form.reset({
					name: fullRole.name || "",
					displayName: fullRole.displayName || "",
					description: fullRole.description || "",
					priority: fullRole.priority ?? 2,
					permissionIds: detailedPermIds,
				});
			}
		} catch (err) {
			console.error(
				"Failed to load role permissions details for editing:",
				err,
			);
		} finally {
			setIsLoadingEditRole(false);
		}
	};

	const openClone = async (role: Role) => {
		setEditingRole(null);
		setClonedFromRole(role);
		setIsDialogOpen(true);
		setIsLoadingEditRole(true);

		// Initial instant population from source role
		const initialPermIds = extractRolePermissionIds(role, permissionsData);
		const baseCode = role.name ? `${role.name}_COPY` : "NEW_ROLE_COPY";
		const baseDisplay = role.displayName
			? `${role.displayName} (Copy)`
			: `${role.name} (Copy)`;

		form.reset({
			name: baseCode,
			displayName: baseDisplay,
			description: role.description ? `${role.description} (Cloned)` : "",
			priority: role.priority ?? 2,
			permissionIds: initialPermIds,
		});

		try {
			// Fetch full role definition from server to get all assigned permissions
			const fullRole = await rolesApi.get(role.id);
			if (fullRole) {
				setClonedFromRole(fullRole);
				const detailedPermIds = extractRolePermissionIds(
					fullRole,
					permissionsData,
				);
				form.reset({
					name: baseCode,
					displayName: baseDisplay,
					description: fullRole.description
						? `${fullRole.description} (Cloned)`
						: "",
					priority: fullRole.priority ?? 2,
					permissionIds: detailedPermIds,
				});
			}
		} catch (err) {
			console.error(
				"Failed to load role permissions details for cloning:",
				err,
			);
		} finally {
			setIsLoadingEditRole(false);
		}
	};

	const openExcludeModal = async (role: Role) => {
		setExcludeRole(role);
		setExcludedPermissionIds(role.excludedPermissionIds || []);
		setIsLoadingExcludeRole(true);

		try {
			const fullRole = await rolesApi.get(role.id);
			if (fullRole) {
				setExcludeRole(fullRole);
				setExcludedPermissionIds(fullRole.excludedPermissionIds || []);
			}
		} catch (err) {
			console.error("Failed to load role exclusions details:", err);
		} finally {
			setIsLoadingExcludeRole(false);
		}
	};

	const saveExclusions = () => {
		if (excludeRole) {
			excludeMutation.mutate({
				id: excludeRole.id,
				permissionIds: excludedPermissionIds,
			});
		}
	};

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		const formattedPermissions = formatRolePermissionsPayload(
			values.permissionIds || [],
			permissionsData,
			editingRole?.permissions,
		);

		const payload = {
			name: values.name,
			displayName: values.displayName || values.name,
			description: values.description || "",
			permissions: formattedPermissions,
		};

		if (editingRole) {
			updateMutation.mutate({ id: editingRole.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	// Summary Metrics calculations
	const stats = useMemo(() => {
		const totalRoles = data?.total || rolesList.length;
		const topTierCount = rolesList.filter(
			(r) => r.priority === 0 || r.name === "VILLA_ADMIN",
		).length;
		const moduleSet = new Set<string>();
		rolesList.forEach((r) => {
			const breakdown = getRoleModuleBreakdown(r);
			breakdown.forEach((b) => moduleSet.add(b.module));
		});
		return {
			totalRoles,
			topTierCount,
			activeModulesCount: moduleSet.size,
		};
	}, [rolesList, data?.total]);

	const renderPriorityBadge = (priority?: number) => {
		const conf = getRolePriorityConfig(priority);
		return (
			<Badge
				variant="outline"
				className={cn(
					"text-[10px] gap-1 font-semibold px-2 py-0.5 shrink-0",
					conf.badgeClass,
				)}
			>
				{conf.iconName === "crown" && (
					<Crown className="size-3 text-rose-500" />
				)}
				{conf.iconName === "shield-check" && (
					<ShieldCheck className="size-3 text-primary" />
				)}
				{conf.iconName === "shield-alert" && (
					<ShieldAlert className="size-3 text-blue-500" />
				)}
				{conf.iconName === "shield" && (
					<Shield className="size-3 text-emerald-500" />
				)}
				{conf.shortLabel}
			</Badge>
		);
	};

	const columns: ColumnDef<Role>[] = [
		{
			id: "roleInfo",
			header: t("roles.roleName"),
			accessorKey: "displayName",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-start gap-3 py-1">
					<div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
						<ShieldCheck className="size-4" />
					</div>
					<div className="space-y-1 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-bold text-foreground text-sm leading-none">
								{row.displayName || row.name}
							</span>
							{renderPriorityBadge(row.priority)}
							{row.isSystem && (
								<Badge
									variant="secondary"
									className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
								>
									System
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
								{row.name}
							</span>
							{row.createdAt && (
								<span className="text-[11px] text-muted-foreground">
									•{" "}
									{new Date(row.createdAt).toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
										year: "numeric",
									})}
								</span>
							)}
						</div>
					</div>
				</div>
			),
		},
		{
			id: "description",
			header: t("roles.description"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground line-clamp-2 max-w-[400px]">
					{value ? String(value).trim() : "—"}
				</span>
			),
		},
	];

	const customActions: RowAction<Role>[] = [
		{
			label: t("roles.editRole"),
			icon: <Edit className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
			onClick: (role) => openEdit(role),
		},
		{
			label: t("roles.cloneRole", "Clone Role"),
			icon: <Copy className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
			onClick: (role) => openClone(role),
		},
		{
			label: t("roles.viewDetails"),
			icon: <Eye className="h-3.5 w-3.5 text-primary" />,
			onClick: (role) => setSelectedRoleId(role.id),
		},
		{
			label: t("roles.roleExclusions"),
			icon: <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />,
			onClick: (role) => openExcludeModal(role),
		},
	];

	const toolbarActionsNode = (
		<div className="flex items-center gap-2 flex-wrap">
			{/* View Mode Switcher Tabs */}
			<div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 p-1 shadow-2xs">
				<button
					type="button"
					onClick={() => setViewMode("table")}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none",
						viewMode === "table"
							? "bg-white dark:bg-slate-950 text-primary shadow-xs border border-slate-200/80 dark:border-slate-800"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
					)}
				>
					<List className="size-3.5" /> {t("roles.listView", "List View")}
				</button>
				<button
					type="button"
					onClick={() => setViewMode("grid")}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-150 cursor-pointer select-none",
						viewMode === "grid"
							? "bg-white dark:bg-slate-950 text-primary shadow-xs border border-slate-200/80 dark:border-slate-800"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
					)}
				>
					<LayoutGrid className="size-3.5" /> {t("roles.matrixView", "Module Matrix")}
				</button>
			</div>

			{/* Create Role Button */}
			<Button
				type="button"
				onClick={openCreate}
				className="h-9 px-3.5 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs rounded-lg cursor-pointer"
			>
				<Plus className="size-4" /> {t("roles.createRole")}
			</Button>
		</div>
	);

	return (
		<div className="space-y-4 pb-12">
			{/* Grid Cards View Mode */}
			{viewMode === "grid" ? (
				<div className="space-y-4">
					{/* Controls Toolbar for Grid View */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								type="text"
								placeholder="Search roles by display name, code, description..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="pl-9 h-9 bg-background text-xs rounded-lg border-slate-200 dark:border-slate-800"
							/>
						</div>

						<div className="flex items-center gap-2 ml-auto flex-wrap">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant="outline"
											size="sm"
											className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg border-slate-200 dark:border-slate-800 bg-background"
										>
											<ArrowUpDown className="size-3.5 text-primary" />
											<span>
												Sort:{" "}
												{sortField === "name"
													? "Code"
													: sortField === "createdAt"
														? "Date"
														: "Display Name"}{" "}
												({sortDirection.toUpperCase()})
											</span>
											<ChevronDown className="size-3 text-muted-foreground" />
										</Button>
									}
								/>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuItem
										onClick={() => setSortField("displayName")}
										className="cursor-pointer text-xs font-medium"
									>
										Sort by Display Name
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setSortField("name")}
										className="cursor-pointer text-xs font-medium"
									>
										Sort by Role Code
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => setSortField("createdAt")}
										className="cursor-pointer text-xs font-medium"
									>
										Sort by Date Created
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() =>
											setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
										}
										className="cursor-pointer text-xs font-semibold text-primary"
									>
										Order:{" "}
										{sortDirection === "asc" ? "Ascending ↑" : "Descending ↓"}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{toolbarActionsNode}
						</div>
					</div>

					{isLoading ? (
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className="h-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card p-4 animate-pulse space-y-4"
								>
									<div className="h-6 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-md" />
									<div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
									<div className="h-20 bg-slate-100 dark:bg-slate-900 rounded-xl" />
								</div>
							))}
						</div>
					) : rolesList.length === 0 ? (
						<div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
							No roles found matching "{search}".
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{rolesList.map((role) => {
								const breakdown = getRoleModuleBreakdown(role);
								const totalActions = getRoleTotalPermissionsCount(role);

								return (
									<div
										key={role.id}
										className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
									>
										{/* Role Header Banner (Click to view role details) */}
										<div
											onClick={() => setSelectedRoleId(role.id)}
											className="p-4 bg-gradient-to-r from-slate-50 via-primary/5 to-slate-50 dark:from-slate-900 dark:via-primary/10 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 space-y-2 cursor-pointer hover:bg-primary/10 transition-colors"
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex items-center gap-2.5">
													<div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
														<ShieldCheck className="size-5" />
													</div>
													<div>
														<h3 className="font-bold text-sm text-foreground leading-tight">
															{role.displayName || role.name}
														</h3>
														<span className="font-mono text-[11px] text-primary font-semibold">
															{role.name}
														</span>
													</div>
												</div>

												{renderPriorityBadge(role.priority)}
											</div>

											<p className="text-xs text-muted-foreground line-clamp-2 pt-1">
												{role.description || "No description provided."}
											</p>
										</div>

										{/* Module Permissions Breakdown */}
										<div className="p-4 space-y-3 flex-1">
											<div className="flex items-center justify-between text-xs font-semibold text-foreground border-b pb-2">
												<span className="flex items-center gap-1.5">
													<Layers className="size-3.5 text-primary" />
													Module Access Matrix
												</span>
												<Badge
													variant="outline"
													className="text-[10px] border-primary/30 text-primary bg-primary/10"
												>
													{totalActions} Actions
												</Badge>
											</div>

											<div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
												{breakdown.length > 0 ? (
													breakdown.map((item) => (
														<Badge
															key={item.module}
															variant="secondary"
															className="text-[11px] font-medium px-2 py-0.5 capitalize bg-slate-100 dark:bg-slate-800 text-foreground"
														>
															{item.module}:{" "}
															<strong className="ml-1 text-primary">
																{item.enabledCount}
															</strong>
														</Badge>
													))
												) : (
													<span className="text-xs text-muted-foreground italic">
														No custom permission matrix
													</span>
												)}
											</div>
										</div>

										{/* Card Actions Footer */}
										<div className="p-3 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => setSelectedRoleId(role.id)}
												className="h-8 text-xs gap-1.5 font-semibold text-primary hover:bg-primary/10"
											>
												<Eye className="size-3.5" /> Inspect Matrix
											</Button>

											<div className="flex items-center gap-1">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => openExcludeModal(role)}
													className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
													title="Exclude permissions"
												>
													<ShieldAlert className="size-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => openClone(role)}
													className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
													title={t("roles.cloneRole", "Clone Role")}
												>
													<Copy className="size-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => openEdit(role)}
													className="h-8 px-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
													title="Edit Role"
												>
													<Edit className="size-3.5" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => deleteMutation.mutate(role.id)}
													className="h-8 px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
													title="Delete Role"
												>
													<Trash2 className="size-3.5" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			) : (
				/* Reusable Data Table Component View */
				<DataTable<Role>
					data={rolesList}
					columns={columns}
					getRowId={(r) => String(r.id)}
					hideHeader={true}
					hideImportExport={true}
					searchPlaceholder={t("roles.searchPlaceholder")}
					searchValue={search}
					onSearchChange={(val) => {
						setSearch(val);
						setPage(1);
					}}
					primaryAction={toolbarActionsNode}
					manualPagination={true}
					totalCount={data?.total || 0}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					isLoading={isLoading}
					onRowClick={(r) => setSelectedRoleId(r.id)}
					onEditRow={(r) => openEdit(r)}
					onDeleteRow={(r) => deleteMutation.mutate(r.id)}
					customRowActions={customActions}
				/>
			)}

			{/* Role Matrix Detail Modal */}
			<RoleMatrixModal
				role={roleDetail || null}
				isOpen={!!selectedRoleId}
				isLoading={isLoadingRoleDetail}
				onClose={() => setSelectedRoleId(null)}
			/>

			{/* Role Create / Edit / Clone Modal */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => {
					setIsDialogOpen(false);
					setEditingRole(null);
					setClonedFromRole(null);
					setIsLoadingEditRole(false);
				}}
				title={
					editingRole
						? `${t("roles.editRole")}: ${editingRole.displayName || editingRole.name}`
						: clonedFromRole
							? `${t("roles.cloneRole", "Clone Role")}: ${clonedFromRole.displayName || clonedFromRole.name}`
							: t("roles.createRole")
				}
				subtitle={
					editingRole
						? t("roles.roleDetailsSubtitle")
						: clonedFromRole
							? `Cloning permission matrix and hierarchy rank from "${clonedFromRole.displayName || clonedFromRole.name}". Review and customize before creating.`
							: t("roles.roleDetailsSubtitle")
				}
				icon={
					clonedFromRole ? (
						<Copy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					) : (
						<ShieldCheck className="h-5 w-5 text-primary" />
					)
				}
				size="xl"
				isLoading={
					createMutation.isPending ||
					updateMutation.isPending ||
					isLoadingEditRole
				}
				loadingText={isLoadingEditRole ? "Loading..." : "Saving..."}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => {
								setIsDialogOpen(false);
								setClonedFromRole(null);
							}}
						/>
						<ModernModalSubmitButton
							form="role-form"
							isLoading={
								createMutation.isPending ||
								updateMutation.isPending ||
								isLoadingEditRole
							}
						>
							{editingRole
								? t("common.saveChanges")
								: clonedFromRole
									? "Create Cloned Role"
									: t("roles.createRole")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="role-form"
					onSubmit={form.handleSubmit((values: any) => onSubmit(values))}
					className="space-y-6"
				>
					{clonedFromRole && (
						<div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-3 text-xs shadow-2xs">
							<div className="flex items-center gap-2">
								<Copy className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span className="text-indigo-950 dark:text-indigo-200">
									Cloning template from <strong>{clonedFromRole.displayName || clonedFromRole.name}</strong>. All {form.watch("permissionIds")?.length || 0} module permissions are pre-selected.
								</span>
							</div>
							<Badge className="bg-indigo-600 text-white text-[10px] shrink-0 font-bold">
								Template Mode
							</Badge>
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ModernInput
							label={t("roles.roleNameInput")}
							placeholder="e.g. MANAGER or REAL_ESTATE_OFFICER"
							{...form.register("name")}
							error={form.formState.errors.name?.message}
							required
						/>
						<ModernInput
							label={t("roles.displayNameInput")}
							placeholder="e.g. Real Estate Loan Officer"
							{...form.register("displayName")}
						/>
					</div>

					<ModernTextarea
						label={t("roles.descriptionInput")}
						placeholder="Describe responsibilities..."
						rows={2}
						{...form.register("description")}
					/>

					<PermissionSelector
						permissions={permissionsData}
						selectedIds={form.watch("permissionIds") || []}
						onChange={(ids) => form.setValue("permissionIds", ids)}
						title={t("roles.assignedPermissionsBundle")}
						description="Toggle actions allowed for users holding this role across system modules."
						badgeVariant="purple"
					/>
				</form>
			</ModernModal>

			{/* Role Excluded Permissions Modal */}
			<ModernModal
				isOpen={!!excludeRole}
				onClose={() => {
					setExcludeRole(null);
					setIsLoadingExcludeRole(false);
				}}
				title={`${t("roles.roleExclusions")}: ${excludeRole?.displayName || excludeRole?.name}`}
				subtitle="Explicitly revoke specific module actions from this role."
				icon={<ShieldAlert className="h-5 w-5 text-rose-500" />}
				size="xl"
				isLoading={excludeMutation.isPending || isLoadingExcludeRole}
				loadingText={isLoadingExcludeRole ? "Loading..." : "Saving..."}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setExcludeRole(null)} />
						<ModernModalSubmitButton
							onClick={saveExclusions}
							isLoading={excludeMutation.isPending || isLoadingExcludeRole}
						>
							{t("common.saveChanges")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<PermissionSelector
					permissions={permissionsData}
					selectedIds={excludedPermissionIds}
					onChange={setExcludedPermissionIds}
					title={t("roles.roleExclusions")}
					description="Select actions that must be strictly blocked for users holding this role."
					badgeVariant="rose"
				/>
			</ModernModal>
		</div>
	);
}

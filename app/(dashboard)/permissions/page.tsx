"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi, rolesApi } from "@/lib/api/endpoints";
import { Permission, Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
	Shield,
	ShieldCheck,
	Key,
	Lock,
	Layers,
	Filter,
	CheckCircle2,
} from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import { useTranslation } from "@/lib/i18n/context";

export default function PermissionsPage() {
	const { t } = useTranslation();
	const [search, setSearch] = useState("");
	const [selectedModule, setSelectedModule] = useState<string>("ALL");

	const { data: permissionsData = [], isLoading } = useQuery({
		queryKey: ["permissions"],
		queryFn: () => permissionsApi.list({ limit: 500 }).then((r) => r.items),
	});

	const { data: rolesData } = useQuery({
		queryKey: ["roles-all"],
		queryFn: () => rolesApi.list({ limit: 100 }),
	});

	const roles = rolesData?.items || [];

	// Extract unique modules
	const modules = Array.from(
		new Set(permissionsData.map((p) => p.module || "General")),
	);

	const filteredPermissions = permissionsData.filter((p) => {
		const matchesModule =
			selectedModule === "ALL" || p.module === selectedModule;
		const matchesSearch =
			!search ||
			p.name.toLowerCase().includes(search.toLowerCase()) ||
			p.description.toLowerCase().includes(search.toLowerCase()) ||
			p.module.toLowerCase().includes(search.toLowerCase());
		return matchesModule && matchesSearch;
	});

	// Get roles containing a permission
	const getRolesForPermission = (permissionId: string): Role[] => {
		return roles.filter((r) => r.permissionIds?.includes(permissionId));
	};

	const columns: ColumnDef<Permission>[] = [
		{
			id: "name",
			header: t("permissions.permissionCode"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
						<Key className="size-3.5" />
					</div>
					<span className="font-mono text-xs font-semibold text-foreground">
						{row.name}
					</span>
				</div>
			),
		},
		{
			id: "module",
			header: t("permissions.module"),
			accessorKey: "module",
			sortable: true,
			filterType: "select",
			filterOptions: modules.map((m) => ({ label: m, value: m })),
			cell: ({ value }) => (
				<Badge
					variant="outline"
					className="text-xs font-medium bg-slate-50 dark:bg-slate-900/50"
				>
					{value}
				</Badge>
			),
		},
		{
			id: "description",
			header: t("permissions.description"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground">{value || "—"}</span>
			),
		},
		{
			id: "assignedRoles",
			header: t("permissions.assignedRoles"),
			cell: ({ row }) => {
				const assignedRoles = getRolesForPermission(row.id);
				if (assignedRoles.length === 0) {
					return (
						<span className="text-xs text-slate-400 italic">
							No roles assigned
						</span>
					);
				}
				return (
					<div className="flex flex-wrap gap-1 max-w-[300px]">
						{assignedRoles.map((role) => (
							<Badge
								key={role.id}
								variant="secondary"
								className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50"
							>
								{role.name}
							</Badge>
						))}
					</div>
				);
			},
		},
	];

	const totalPermissions = permissionsData.length;
	const totalModules = modules.length;
	const superAdminPerms = permissionsData.filter(
		(p) => p.name.startsWith("companies.") || p.name.startsWith("admins."),
	).length;
	const tenantPerms = totalPermissions - superAdminPerms;

	const groupedPermissions = permissionsData.reduce(
		(acc, p) => {
			const mod = p.module || "General";
			if (!acc[mod]) acc[mod] = [];
			acc[mod].push(p);
			return acc;
		},
		{} as Record<string, Permission[]>,
	);

	return (
		<div className="space-y-6">
			{/* Header Stat Cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{t("permissions.totalPermissions")}
						</CardTitle>
						<div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
							<Shield className="size-4" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalPermissions}</div>
						<p className="text-xs text-muted-foreground mt-1">
							System-wide active permissions
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{t("permissions.activeModules")}
						</CardTitle>
						<div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
							<Layers className="size-4" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalModules}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Functional domain categories
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{t("permissions.tenantScope")}
						</CardTitle>
						<div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
							<ShieldCheck className="size-4" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{tenantPerms}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Assignable to organization roles
						</p>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							{t("permissions.superAdminScope")}
						</CardTitle>
						<div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
							<Lock className="size-4" />
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{superAdminPerms}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Restricted super admin operations
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabs & Matrix View */}
			<ModernTabs defaultValue="list">
				<div className="flex items-center justify-between mb-4">
					<ModernTabsList variant="pills" size="md">
						<ModernTabsTrigger
							value="list"
							icon={<Shield className="h-4 w-4" />}
						>
							List View
						</ModernTabsTrigger>
						<ModernTabsTrigger
							value="matrix"
							icon={<Layers className="h-4 w-4" />}
						>
							Module Matrix
						</ModernTabsTrigger>
					</ModernTabsList>
				</div>

				<ModernTabsContent value="list" className="mt-0">
					<DataTable<Permission>
						data={filteredPermissions}
						columns={columns}
						getRowId={(p) => p.id}
						title={t("permissions.title")}
						searchPlaceholder={t("permissions.searchPlaceholder")}
						searchValue={search}
						onSearchChange={setSearch}
						isLoading={isLoading}
						exportFilename="permissions-list"
					/>
				</ModernTabsContent>

				<ModernTabsContent value="matrix" className="mt-0 space-y-6">
					{(Object.entries(groupedPermissions) as [string, Permission[]][]).map(
						([moduleName, perms]) => (
							<Card
								key={moduleName}
								className="border-slate-200/80 dark:border-slate-800/80"
							>
								<CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-900/50">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Layers className="size-4 text-purple-600 dark:text-purple-400" />
											<CardTitle className="text-base font-semibold">
												{moduleName}
											</CardTitle>
										</div>
										<Badge variant="secondary" className="text-xs">
											{perms.length} {t("permissions.totalPermissions")}
										</Badge>
									</div>
									<CardDescription className="text-xs">
										Access permissions controlling operations in {moduleName}
									</CardDescription>
								</CardHeader>
								<CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{perms.map((p) => {
										const assignedRoles = getRolesForPermission(p.id);
										return (
											<div
												key={p.id}
												className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
											>
												<div className="flex items-start justify-between gap-2">
													<div className="flex items-center gap-2">
														<CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
														<span className="font-mono text-xs font-bold text-foreground">
															{p.name}
														</span>
													</div>
												</div>
												<p className="text-xs text-muted-foreground leading-relaxed">
													{p.description}
												</p>
												<div className="pt-1 flex items-center gap-1.5 flex-wrap">
													<span className="text-[10px] text-slate-400 font-medium">
														Roles:
													</span>
													{assignedRoles.length > 0 ? (
														assignedRoles.map((r) => (
															<Badge
																key={r.id}
																variant="outline"
																className="text-[9px] px-1.5 py-0"
															>
																{r.name}
															</Badge>
														))
													) : (
														<span className="text-[10px] text-slate-400 italic">
															None
														</span>
													)}
												</div>
											</div>
										);
									})}
								</CardContent>
							</Card>
						),
					)}
				</ModernTabsContent>
			</ModernTabs>
		</div>
	);
}

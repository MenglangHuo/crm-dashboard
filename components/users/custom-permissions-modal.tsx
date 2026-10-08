"use client";

import {
	ModernModal,
	ModernModalCancelButton,
	ModernModalFooter,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api/client";
import { profileApi, usersApi } from "@/lib/api/endpoints";
import { User } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	Check,
	Code2,
	Key,
	Layers,
	Plus,
	ShieldCheck,
	Sparkles,
	Trash2,
	User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const COMMON_MODULE_SUGGESTIONS = [
	"customers",
	"invoices",
	"orders",
	"loans",
	"payments",
	"products",
	"inventory",
	"finance",
	"reports",
	"settings",
	"users",
];

const STANDARD_ACTION_PRESETS = [
	"read",
	"write",
	"update",
	"delete",
	"approve",
	"export",
	"manage",
];

interface PermissionRow {
	id: string;
	moduleName: string;
	actions: string[];
	customActionInput: string;
}

interface CustomPermissionsModalProps {
	user: User | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function CustomPermissionsModal({
	user,
	open,
	onOpenChange,
	onSuccess,
}: CustomPermissionsModalProps) {
	const queryClient = useQueryClient();
	const [showJsonPreview, setShowJsonPreview] = useState(false);

	// Retrieve cached profile for company ID fallback
	const cachedProfile: any =
		queryClient.getQueryData(["profile"]) || profileApi.getCachedProfile();
	const effectiveCompanyId =
		user?.companyId ||
		(user?.company as any)?.id ||
		cachedProfile?.companyId ||
		cachedProfile?.company?.id ||
		9;

	// Dynamic permission entries
	const [rows, setRows] = useState<PermissionRow[]>([
		{
			id: "row-1",
			moduleName: "dynamicName",
			actions: ["read", "write", "update"],
			customActionInput: "",
		},
	]);

	// Initialize or reset when user modal opens
	useEffect(() => {
		if (open && user) {
			// If user has existing dynamic permissions in attributes or object, initialize from them
			const existingPermissions =
				(user as any)?.customPermissions ||
				(user as any)?.attributes?.permissions;
			if (
				existingPermissions &&
				typeof existingPermissions === "object" &&
				!Array.isArray(existingPermissions)
			) {
				const loadedRows: PermissionRow[] = Object.entries(
					existingPermissions,
				).map(([mod, acts], idx) => ({
					id: `row-${idx + 1}`,
					moduleName: mod,
					actions: Array.isArray(acts) ? (acts as string[]) : [],
					customActionInput: "",
				}));
				if (loadedRows.length > 0) {
					setRows(loadedRows);
					return;
				}
			}

			// Default sample row matching user request
			setRows([
				{
					id: "row-1",
					moduleName: "dynamicName",
					actions: ["read", "write", "update"],
					customActionInput: "",
				},
			]);
		}
	}, [open, user]);

	// Construct JSON payload
	const generatedPayload = useMemo(() => {
		const permissionsMap: Record<string, string[]> = {};
		rows.forEach((r) => {
			const cleanName = r.moduleName.trim();
			if (cleanName && r.actions.length > 0) {
				permissionsMap[cleanName] = r.actions;
			}
		});
		return {
			permissions: permissionsMap,
		};
	}, [rows]);

	// Row Manipulation Handlers
	const addRow = (initialModule = "") => {
		const newId = `row-${Date.now()}`;
		setRows((prev) => [
			...prev,
			{
				id: newId,
				moduleName: initialModule || `customModule${prev.length + 1}`,
				actions: ["read", "write", "update"],
				customActionInput: "",
			},
		]);
	};

	const removeRow = (id: string) => {
		setRows((prev) => prev.filter((r) => r.id !== id));
	};

	const updateRowModule = (id: string, moduleName: string) => {
		setRows((prev) =>
			prev.map((r) => (r.id === id ? { ...r, moduleName } : r)),
		);
	};

	const toggleAction = (rowId: string, action: string) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.id !== rowId) return r;
				const has = r.actions.includes(action);
				const updated = has
					? r.actions.filter((a) => a !== action)
					: [...r.actions, action];
				return { ...r, actions: updated };
			}),
		);
	};

	const addCustomAction = (rowId: string) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.id !== rowId) return r;
				const act = r.customActionInput.trim().toLowerCase();
				if (!act || r.actions.includes(act)) {
					return { ...r, customActionInput: "" };
				}
				return {
					...r,
					actions: [...r.actions, act],
					customActionInput: "",
				};
			}),
		);
	};

	// Quick Action Presets
	const handleGrantCrudAll = () => {
		const crud = ["read", "write", "update", "delete"];
		setRows((prev) =>
			prev.map((r) => ({
				...r,
				actions: Array.from(new Set([...r.actions, ...crud])),
			})),
		);
		toast.info("Applied CRUD actions to all module rows");
	};

	const handleReadOnlyAll = () => {
		setRows((prev) =>
			prev.map((r) => ({
				...r,
				actions: ["read"],
			})),
		);
	};

	const handleClearAll = () => {
		setRows([]);
	};

	// Mutation
	const assignCustomPermissionsMutation = useMutation({
		mutationFn: async () => {
			if (!user) throw new Error("No user selected");
			const validEntries = Object.keys(generatedPayload.permissions).length;
			if (validEntries === 0) {
				throw new Error(
					"Please specify at least one module name with assigned actions.",
				);
			}

			return await usersApi.assignCustomPermissions(
				user.id,
				generatedPayload,
				effectiveCompanyId,
			);
		},
		onSuccess: () => {
			toast.success(
				`Direct custom permissions assigned to ${user?.firstname || user?.username || "user"} successfully!`,
			);
			queryClient.invalidateQueries({ queryKey: ["users"] });
			queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
			queryClient.invalidateQueries({ queryKey: ["user-detail", user?.id] });
			queryClient.invalidateQueries({ queryKey: ["profile"] });

			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={`Assign Custom Direct Permissions: ${user?.firstname || user?.firstName || user?.username || ""}`}
			subtitle="Directly configure custom module-level permissions for this user scoped by company."
			icon={<Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
			size="xl"
			isLoading={assignCustomPermissionsMutation.isPending}
			loadingText="Saving custom permissions..."
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => assignCustomPermissionsMutation.mutate()}
						disabled={
							Object.keys(generatedPayload.permissions).length === 0 ||
							assignCustomPermissionsMutation.isPending
						}
						isLoading={assignCustomPermissionsMutation.isPending}
						icon={<ShieldCheck className="h-4 w-4" />}
					>
						<span>
							Save Custom Permissions (
							{Object.keys(generatedPayload.permissions).length} Modules)
						</span>
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-5 py-1">
				{/* User & Company Header Card */}
				{user && (
					<div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 dark:bg-purple-950/20 dark:border-purple-800/30 flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="size-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
								<UserIcon className="size-5" />
							</div>
							<div>
								<div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
									Target User
								</div>
								<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
									{user.firstname || user.firstName
										? `${user.firstname || user.firstName} ${user.lastname || user.lastName || ""}`
										: `@${user.username}`}
								</h4>
								<p className="text-[11px] font-mono text-slate-500">
									ID: {user.id} • Username: @{user.username}
								</p>
							</div>
						</div>

						<div className="text-right">
							<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 justify-end">
								<Building2 className="size-3 text-purple-500" />
								<span>Company Scope</span>
							</div>
							<div className="text-sm font-mono font-bold text-purple-700 dark:text-purple-300">
								Company #{effectiveCompanyId}
							</div>
							<span className="text-[10px] text-slate-400">
								?companyId={effectiveCompanyId}
							</span>
						</div>
					</div>
				)}

				{/* Toolbar & Quick Actions */}
				<div className="flex flex-wrap items-center justify-between gap-2 pt-1">
					<div className="flex items-center gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={() => addRow()}
							className="h-8 px-3 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-xs"
						>
							<Plus className="size-3.5" />
							<span>Add Module Permission</span>
						</Button>

						<Button
							variant="outline"
							size="sm"
							onClick={handleGrantCrudAll}
							className="h-8 px-2.5 text-xs font-medium rounded-lg border-border hover:bg-muted text-foreground gap-1"
						>
							<Sparkles className="size-3 text-amber-500" />
							<span>Grant CRUD All</span>
						</Button>

						<Button
							variant="outline"
							size="sm"
							onClick={handleReadOnlyAll}
							className="h-8 px-2.5 text-xs font-medium rounded-lg border-border hover:bg-muted text-foreground"
						>
							Read Only
						</Button>
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowJsonPreview(!showJsonPreview)}
							className="h-8 px-2.5 text-xs font-medium gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 dark:text-purple-400"
						>
							<Code2 className="size-3.5" />
							<span>{showJsonPreview ? "Hide JSON" : "View JSON Payload"}</span>
						</Button>

						{rows.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleClearAll}
								className="h-8 px-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10"
							>
								Clear
							</Button>
						)}
					</div>
				</div>

				{/* Dynamic Permission Rows */}
				<div className="space-y-3">
					{rows.length === 0 ? (
						<div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
							<Layers className="size-8 text-slate-300 dark:text-slate-600 mx-auto" />
							<p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
								No custom permissions configured
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() => addRow()}
								className="text-xs font-semibold h-8 rounded-lg"
							>
								<Plus className="size-3.5 mr-1 text-purple-600" />
								Add First Module Permission
							</Button>
						</div>
					) : (
						rows.map((row, idx) => (
							<div
								key={row.id}
								className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
							>
								{/* Module Name Row */}
								<div className="flex items-center justify-between gap-3">
									<div className="flex-1 max-w-sm">
										<label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
											Module / Resource Name #{idx + 1}
										</label>
										<div className="relative">
											<input
												type="text"
												value={row.moduleName}
												onChange={(e) =>
													updateRowModule(row.id, e.target.value)
												}
												placeholder="e.g. dynamicName, customers, invoices..."
												className="w-full h-8 px-3 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
											/>
										</div>
									</div>

									{/* Suggestion Dropdown Chips */}
									<div className="flex flex-wrap items-center gap-1 max-w-md pt-5">
										<span className="text-[10px] text-slate-400">Presets:</span>
										{COMMON_MODULE_SUGGESTIONS.slice(0, 5).map((mod) => (
											<button
												key={mod}
												type="button"
												onClick={() => updateRowModule(row.id, mod)}
												className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono transition-colors ${
													row.moduleName === mod
														? "bg-purple-600 text-white font-bold"
														: "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
												}`}
											>
												{mod}
											</button>
										))}
									</div>

									<button
										type="button"
										onClick={() => removeRow(row.id)}
										className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors mt-4"
										title="Remove module permission"
									>
										<Trash2 className="size-4" />
									</button>
								</div>

								{/* Actions Pill Selector */}
								<div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
									<div className="text-[11px] font-semibold text-slate-500">
										Granted Actions for{" "}
										<span className="font-mono font-bold text-purple-600 dark:text-purple-400">
											"{row.moduleName || "module"}"
										</span>
										:
									</div>

									<div className="flex flex-wrap items-center gap-1.5">
										{/* Standard Action Pills */}
										{STANDARD_ACTION_PRESETS.map((act) => {
											const isSelected = row.actions.includes(act);
											return (
												<button
													key={act}
													type="button"
													onClick={() => toggleAction(row.id, act)}
													className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
														isSelected
															? "bg-purple-600 text-white shadow-2xs"
															: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700"
													}`}
												>
													{isSelected && <Check className="size-3" />}
													<span>{act}</span>
												</button>
											);
										})}

										{/* Custom Action Tags in this row */}
										{row.actions
											.filter((act) => !STANDARD_ACTION_PRESETS.includes(act))
											.map((act) => (
												<button
													key={act}
													type="button"
													onClick={() => toggleAction(row.id, act)}
													className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-2xs cursor-pointer"
												>
													<Check className="size-3" />
													<span>{act}</span>
												</button>
											))}

										{/* Add Custom Action Input */}
										<div className="inline-flex items-center gap-1 ml-2">
											<input
												type="text"
												value={row.customActionInput}
												onChange={(e) =>
													setRows((prev) =>
														prev.map((r) =>
															r.id === row.id
																? { ...r, customActionInput: e.target.value }
																: r,
														),
													)
												}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														addCustomAction(row.id);
													}
												}}
												placeholder="+ custom action..."
												className="h-7 px-2 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 w-28 focus:outline-hidden focus:ring-1 focus:ring-purple-500"
											/>
											{row.customActionInput.trim() && (
												<Button
													size="sm"
													type="button"
													onClick={() => addCustomAction(row.id)}
													className="h-7 px-2 text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
												>
													Add
												</Button>
											)}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>

				{/* Live JSON Payload Inspector */}
				{showJsonPreview && (
					<div className="space-y-1.5 p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono animate-in fade-in">
						<div className="flex items-center justify-between text-slate-400 text-[11px] pb-2 border-b border-slate-800">
							<span className="flex items-center gap-1.5 text-purple-400 font-bold">
								<Code2 className="size-3.5" />
								<span>
									POST /api/v1/users/{user?.id}/permissions?companyId=
									{effectiveCompanyId}
								</span>
							</span>
							<span>application/json</span>
						</div>
						<pre className="overflow-x-auto text-[11px] text-emerald-400 pt-2">
							{JSON.stringify(generatedPayload, null, 2)}
						</pre>
					</div>
				)}
			</div>
		</ModernModal>
	);
}

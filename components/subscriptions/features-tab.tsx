"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { featuresApi } from "@/lib/api/endpoints";
import { FeatureItem, FeatureRequest } from "@/types/subscription";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Sparkles,
	Plus,
	Search,
	CheckCircle2,
	Trash2,
	Edit,
	RotateCcw,
	Key,
	ShieldCheck,
	Zap,
	Filter,
	Check,
	AlertCircle,
	Tag,
	Layers,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useTranslation } from "@/lib/i18n/context";

export function FeaturesTab({ isSystemAdmin }: { isSystemAdmin: boolean }) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(
		null,
	);
	const [deleteConfirmFeature, setDeleteConfirmFeature] =
		useState<FeatureItem | null>(null);

	// Form states
	const [formData, setFormData] = useState<FeatureRequest>({
		code: "",
		name: "",
		description: "",
	});

	// Queries
	const {
		data: featuresData = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["subscription-features"],
		queryFn: () => featuresApi.list(),
	});

	// Mutations
	const createMutation = useMutation({
		mutationFn: (data: FeatureRequest) => featuresApi.create(data),
		onSuccess: () => {
			toast.success("Feature flag registered successfully");
			setIsCreateModalOpen(false);
			setFormData({ code: "", name: "", description: "" });
			queryClient.invalidateQueries({ queryKey: ["subscription-features"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to create feature");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: number | string;
			data: Partial<FeatureRequest>;
		}) => featuresApi.update(id, data),
		onSuccess: () => {
			toast.success("Feature updated successfully");
			setEditingFeature(null);
			queryClient.invalidateQueries({ queryKey: ["subscription-features"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to update feature");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: number | string) => featuresApi.remove(id),
		onSuccess: () => {
			toast.success("Feature deactivated successfully");
			setDeleteConfirmFeature(null);
			queryClient.invalidateQueries({ queryKey: ["subscription-features"] });
			queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to delete feature");
		},
	});

	const restoreMutation = useMutation({
		mutationFn: (id: number | string) => featuresApi.restore(id),
		onSuccess: () => {
			toast.success("Feature restored successfully");
			queryClient.invalidateQueries({ queryKey: ["subscription-features"] });
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to restore feature");
		},
	});

	const handleOpenCreate = () => {
		setFormData({ code: "", name: "", description: "" });
		setIsCreateModalOpen(true);
	};

	const handleOpenEdit = (feature: FeatureItem) => {
		setEditingFeature(feature);
		setFormData({
			code: feature.code,
			name: feature.name,
			description: feature.description || "",
		});
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.code.trim() || !formData.name.trim()) {
			toast.error("Code and Name are required fields");
			return;
		}

		if (editingFeature) {
			updateMutation.mutate({
				id: editingFeature.id,
				data: formData,
			});
		} else {
			createMutation.mutate(formData);
		}
	};

	// Filter list
	const filteredFeatures = useMemo(() => {
		return featuresData.filter((item) => {
			const isInactive = item.status === "Inactive" || Boolean(item.deletedAt);
			const matchesStatus =
				statusFilter === "ALL" ||
				(statusFilter === "ACTIVE" && !isInactive) ||
				(statusFilter === "INACTIVE" && isInactive);

			const query = search.toLowerCase().trim();
			const matchesSearch =
				!query ||
				item.code.toLowerCase().includes(query) ||
				item.name.toLowerCase().includes(query) ||
				(item.description && item.description.toLowerCase().includes(query));

			return matchesStatus && matchesSearch;
		});
	}, [featuresData, search, statusFilter]);

	// Summary Metrics
	const metrics = useMemo(() => {
		const total = featuresData.length;
		const active = featuresData.filter(
			(f) => f.status === "Active" && !f.deletedAt,
		).length;
		const inactive = total - active;
		return { total, active, inactive };
	}, [featuresData]);

	// Table Columns
	const columns: ColumnDef<FeatureItem>[] = [
		{
			id: "code",
			header: t("subscriptions.featuresTab.columns.code", "Feature Code"),
			accessorKey: "code",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 ring-1 ring-blue-500/20">
						<Zap className="size-4" />
					</div>
					<div>
						<span className="font-mono text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
							{row.code}
						</span>
						<div className="text-[10px] text-slate-400">
							ID #{String(row.id)}
						</div>
					</div>
				</div>
			),
		},
		{
			id: "name",
			header: t("subscriptions.featuresTab.columns.name", "Feature Name"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
						{row.name}
					</span>
					<p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-sm">
						{row.description || "No description provided"}
					</p>
				</div>
			),
		},
		{
			id: "status",
			header: t("subscriptions.featuresTab.columns.status", "Status"),
			accessorKey: "status",
			sortable: true,
			cell: ({ row }) => {
				const isInactive = row.status === "Inactive" || Boolean(row.deletedAt);
				return (
					<Badge
						variant="outline"
						className={`text-xs px-2.5 py-0.5 font-medium rounded-lg ${
							!isInactive
								? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
								: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400"
						}`}
					>
						<span
							className={`mr-1.5 size-1.5 rounded-full inline-block ${
								!isInactive ? "bg-emerald-500" : "bg-slate-400"
							}`}
						/>
						{isInactive
							? t(
									"subscriptions.featuresTab.statusInactive",
									"Inactive / Archived",
								)
							: t("subscriptions.featuresTab.statusActive", "Active")}
					</Badge>
				);
			},
		},
		{
			id: "createdAt",
			header: t(
				"subscriptions.featuresTab.columns.registeredDate",
				"Registered Date",
			),
			accessorKey: "createdAt",
			sortable: true,
			cell: ({ value }) => (
				<span className="text-xs text-slate-500">
					{value
						? new Date(value).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
							})
						: "—"}
				</span>
			),
		},
		{
			id: "actions",
			header: t("subscriptions.featuresTab.columns.actions", "Actions"),
			cell: ({ row }) => {
				const isInactive = row.status === "Inactive" || Boolean(row.deletedAt);
				return (
					<div className="flex items-center gap-1.5 justify-end">
						<Button
							size="sm"
							variant="outline"
							onClick={() => handleOpenEdit(row)}
							className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
						>
							<Edit className="size-3" />
							<span>{t("subscriptions.featuresTab.actions.edit", "Edit")}</span>
						</Button>
						{isInactive ? (
							<Button
								size="sm"
								variant="outline"
								onClick={() => restoreMutation.mutate(row.id)}
								className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
							>
								<RotateCcw className="size-3" />
								<span>
									{t("subscriptions.featuresTab.actions.restore", "Restore")}
								</span>
							</Button>
						) : (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setDeleteConfirmFeature(row)}
								className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 cursor-pointer"
							>
								<Trash2 className="size-3" />
								<span>
									{t("subscriptions.featuresTab.actions.archive", "Archive")}
								</span>
							</Button>
						)}
					</div>
				);
			},
		},
	];

	const rowActions: RowAction<FeatureItem>[] = [
		{
			label: t("subscriptions.featuresTab.actions.edit", "Edit Feature"),
			icon: <Edit className="size-3.5" />,
			onClick: (row) => handleOpenEdit(row),
		},
		{
			label: t("subscriptions.featuresTab.actions.restore", "Restore Feature"),
			icon: <RotateCcw className="size-3.5 text-emerald-600" />,
			onClick: (row) => restoreMutation.mutate(row.id),
			hidden: (row) => row.status !== "Inactive" && !row.deletedAt,
		},
		{
			label: t(
				"subscriptions.featuresTab.actions.archive",
				"Deactivate Feature",
			),
			icon: <Trash2 className="size-3.5 text-rose-500" />,
			onClick: (row) => setDeleteConfirmFeature(row),
			variant: "destructive",
			hidden: (row) => row.status === "Inactive" || Boolean(row.deletedAt),
		},
	];

	return (
		<div className="space-y-6">
			{/* Main Table */}
			<DataTable
				columns={columns}
				data={filteredFeatures}
				isLoading={isLoading}
				customRowActions={rowActions}
				onEditRow={(row) => handleOpenEdit(row)}
				onDeleteRow={(row) => setDeleteConfirmFeature(row)}
				onCreateNew={handleOpenCreate}
				createButtonLabel={t(
					"subscriptions.featuresTab.createButton",
					"Create Feature",
				)}
				emptyState={
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<Sparkles className="size-8 text-slate-400 mb-2 opacity-50" />
						<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
							{t("subscriptions.featuresTab.emptyTitle", "No features found")}
						</p>
						<p className="text-xs text-slate-400 mt-1 max-w-xs">
							{t(
								"subscriptions.featuresTab.emptyDesc",
								"Try adjusting your search criteria or register a new feature code.",
							)}
						</p>
					</div>
				}
			/>

			{/* Create / Edit Modal */}
			<ModernModal
				open={isCreateModalOpen || Boolean(editingFeature)}
				onOpenChange={(open) => {
					if (!open) {
						setIsCreateModalOpen(false);
						setEditingFeature(null);
					}
				}}
				title={
					editingFeature
						? t(
								"subscriptions.featuresTab.modal.editTitle",
								"Edit Feature Definition",
							)
						: t(
								"subscriptions.featuresTab.modal.createTitle",
								"Register New Feature",
							)
				}
				description={t(
					"subscriptions.featuresTab.modal.desc",
					"Configure feature keys for role and plan entitlements gating.",
				)}
				icon={<Sparkles className="size-5 text-blue-600" />}
			>
				<form onSubmit={handleSave} className="space-y-4 py-2">
					<ModernInput
						label={t(
							"subscriptions.featuresTab.modal.codeLabel",
							"Feature Code",
						)}
						placeholder={t(
							"subscriptions.featuresTab.modal.codePlaceholder",
							"e.g. ADVANCED_ANALYTICS",
						)}
						value={formData.code}
						onChange={(e) =>
							setFormData((prev) => ({
								...prev,
								code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
							}))
						}
						required
						helperText={t(
							"subscriptions.featuresTab.modal.codeHelper",
							"Unique uppercase system identifier (e.g. CONTACT_MGMT, DEAL_PIPELINE)",
						)}
					/>

					<ModernInput
						label={t(
							"subscriptions.featuresTab.modal.nameLabel",
							"Feature Name",
						)}
						placeholder={t(
							"subscriptions.featuresTab.modal.namePlaceholder",
							"e.g. Advanced Analytics & Funnels",
						)}
						value={formData.name}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, name: e.target.value }))
						}
						required
					/>

					<ModernTextarea
						label={t(
							"subscriptions.featuresTab.modal.descLabel",
							"Description",
						)}
						placeholder={t(
							"subscriptions.featuresTab.modal.descPlaceholder",
							"Describe what capabilities this feature unlocks in the platform...",
						)}
						value={formData.description}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, description: e.target.value }))
						}
						rows={3}
					/>

					<ModernModalFooter>
						<ModernModalCancelButton
							type="button"
							onClick={() => {
								setIsCreateModalOpen(false);
								setEditingFeature(null);
							}}
						/>
						<ModernModalSubmitButton
							type="submit"
							loading={createMutation.isPending || updateMutation.isPending}
						>
							{editingFeature
								? t(
										"subscriptions.featuresTab.modal.saveChanges",
										"Save Changes",
									)
								: t(
										"subscriptions.featuresTab.modal.createFeature",
										"Create Feature",
									)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* Soft Delete Confirm Modal */}
			<ModernModal
				open={Boolean(deleteConfirmFeature)}
				onOpenChange={(open) => {
					if (!open) setDeleteConfirmFeature(null);
				}}
				title={t(
					"subscriptions.featuresTab.archiveModal.title",
					"Deactivate Feature",
				)}
				description={t(
					"subscriptions.featuresTab.archiveModal.desc",
					"Are you sure you want to deactivate this feature? It will be removed from future plan assignments.",
				)}
				icon={<AlertCircle className="size-5 text-rose-500" />}
			>
				<div className="py-3">
					<div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
						{t(
							"subscriptions.featuresTab.archiveModal.confirmMessage",
							"Deactivating {{code}} ({{name}}) will flag this entitlement as inactive. You can restore it at any time.",
							{
								code: deleteConfirmFeature?.code || "",
								name: deleteConfirmFeature?.name || "",
							},
						)}
					</div>
				</div>
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={() => setDeleteConfirmFeature(null)}
					/>
					<Button
						type="button"
						variant="destructive"
						className="rounded-xl text-xs font-semibold px-4"
						disabled={deleteMutation.isPending}
						onClick={() =>
							deleteConfirmFeature &&
							deleteMutation.mutate(deleteConfirmFeature.id)
						}
					>
						{deleteMutation.isPending
							? t(
									"subscriptions.featuresTab.archiveModal.deactivating",
									"Deactivating...",
								)
							: t(
									"subscriptions.featuresTab.archiveModal.confirm",
									"Deactivate Feature",
								)}
					</Button>
				</ModernModalFooter>
			</ModernModal>
		</div>
	);
}

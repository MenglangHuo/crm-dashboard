"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi } from "@/lib/api/endpoints";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
	DataTable,
	ColumnDef,
	SUPPLIER_DOMAIN_FILTERS,
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
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Truck, Phone, Building2, RotateCcw, Ban, Edit2, Plus } from "lucide-react";
import type { Supplier } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export default function SuppliersPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string | undefined>(
		undefined,
	);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	// Dialog & Form State
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [primaryPhone, setPrimaryPhone] = useState("");
	const [secondaryPhone, setSecondaryPhone] = useState("");

	// Fetch Suppliers Query
	const { data: suppliersData, isLoading } = useQuery({
		queryKey: ["suppliers", page, pageSize, search, statusFilter],
		queryFn: () =>
			suppliersApi.list({
				page,
				limit: pageSize,
				search,
				status: statusFilter,
			}),
	});

	// Mutations
	const createMutation = useMutation({
		mutationFn: suppliersApi.create,
		onSuccess: () => {
			toast.success(t("suppliers.createdSuccess"));
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setIsDialogOpen(false);
			resetForm();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string | number;
			body: Partial<Supplier>;
		}) => suppliersApi.update(id, body),
		onSuccess: () => {
			toast.success(t("suppliers.updatedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
			setIsDialogOpen(false);
			setEditingSupplier(null);
			resetForm();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: suppliersApi.remove,
		onSuccess: () => {
			toast.success(t("suppliers.inactivatedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreMutation = useMutation({
		mutationFn: suppliersApi.restore,
		onSuccess: () => {
			toast.success(t("suppliers.restoredSuccess"));
			queryClient.invalidateQueries({ queryKey: ["suppliers"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const resetForm = () => {
		setName("");
		setDescription("");
		setPrimaryPhone("");
		setSecondaryPhone("");
	};

	const openCreate = () => {
		setEditingSupplier(null);
		resetForm();
		setIsDialogOpen(true);
	};

	const openEdit = (supplier: Supplier) => {
		setEditingSupplier(supplier);
		setName(supplier.name || "");
		setDescription(supplier.description || "");
		setPrimaryPhone(supplier.primaryPhone || supplier.phone || "");
		setSecondaryPhone(supplier.secondaryPhone || "");
		setIsDialogOpen(true);
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error(t("suppliers.nameRequired"));
			return;
		}

		const payload = {
			name: name.trim(),
			description: description.trim(),
			primaryPhone: primaryPhone.trim(),
			secondaryPhone: secondaryPhone.trim(),
		};

		if (editingSupplier) {
			updateMutation.mutate({ id: editingSupplier.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const columns: ColumnDef<Supplier>[] = [
		{
			id: "name",
			header: t("suppliers.supplierName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-bold text-slate-900 dark:text-white">
					{value}
				</span>
			),
		},
		{
			id: "primaryPhone",
			header: t("suppliers.primaryPhone"),
			accessorKey: "primaryPhone",
			cell: ({ row }) => {
				const phoneVal = row.primaryPhone || row.phone;
				return (
					<span className="text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center gap-1.5">
						{phoneVal ? (
							<>
								<Phone className="h-3.5 w-3.5 text-indigo-500" />
								{phoneVal}
							</>
						) : (
							<span className="text-slate-400 italic">None</span>
						)}
					</span>
				);
			},
		},
		{
			id: "secondaryPhone",
			header: t("suppliers.secondaryPhone"),
			accessorKey: "secondaryPhone",
			cell: ({ value }) => (
				<span className="text-slate-600 dark:text-slate-400 font-mono text-xs flex items-center gap-1.5">
					{value ? (
						<>
							<Phone className="h-3.5 w-3.5 text-slate-400" />
							{value}
						</>
					) : (
						<span className="text-slate-400 italic">None</span>
					)}
				</span>
			),
		},
		{
			id: "status",
			header: t("suppliers.status"),
			accessorKey: "status",
			cell: ({ row }) => {
				const status = row.status || (row.isActive ? "Active" : "Inactive");
				const isActive = status === "Active";
				return (
					<Badge
						variant="outline"
						className={
							isActive
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium"
								: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-medium"
						}
					>
						{status}
					</Badge>
				);
			},
		},
		{
			id: "company",
			header: t("suppliers.company"),
			accessorKey: "company",
			cell: ({ row }) => {
				const companyName = row.company?.name;
				return (
					<span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
						<Building2 className="h-3.5 w-3.5 text-slate-400" />
						{companyName || "Default"}
					</span>
				);
			},
		},
		{
			id: "description",
			header: t("suppliers.overviewDescription"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span
					className="text-xs text-slate-500 max-w-xs truncate block"
					title={value}
				>
					{value || "—"}
				</span>
			),
		},
		{
			id: "actions",
			header: t("suppliers.actions"),
			cell: ({ row }) => {
				const supplier = row;
				const isActive =
					(supplier.status || (supplier.isActive ? "Active" : "Inactive")) ===
					"Active";
				const isPending =
					(deleteMutation.isPending &&
						deleteMutation.variables === supplier.id) ||
					(restoreMutation.isPending &&
						restoreMutation.variables === supplier.id);

				return (
					<div className="flex items-center gap-3">
						<button
							onClick={() => openEdit(supplier)}
							className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							title="Edit Supplier"
						>
							<Edit2 className="h-4 w-4" />
						</button>

						<div
							className="flex items-center gap-2"
							title={isActive ? "Deactivate Supplier" : "Activate Supplier"}
						>
							<Switch
								checked={isActive}
								disabled={isPending}
								onCheckedChange={(checked) => {
									if (checked) {
										restoreMutation.mutate(supplier.id);
									} else {
										deleteMutation.mutate(supplier.id);
									}
								}}
							/>
							<span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[48px]">
								{isActive ? "Active" : "Inactive"}
							</span>
						</div>
					</div>
				);
			},
		},
	];

	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="space-y-4 pb-12">
			{/* Data Table */}
			<DataTable<Supplier>
				data={suppliersData?.items || []}
				columns={columns}
				getRowId={(s) => String(s.id)}
				hideHeader={true}
				hideImportExport={true}
				searchPlaceholder={t("suppliers.searchPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={SUPPLIER_DOMAIN_FILTERS}
				primaryAction={
					<Button
						onClick={openCreate}
						className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						<span>{t("suppliers.addSupplier", "Add Supplier")}</span>
					</Button>
				}
				manualPagination={true}
				totalCount={suppliersData?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onEditRow={openEdit}
				onDeleteRow={(s) => deleteMutation.mutate(s.id)}
			/>

			{/* CREATE/EDIT MODAL */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={
					editingSupplier
						? t("suppliers.editSupplier")
						: t("suppliers.createSupplier")
				}
				subtitle={t("suppliers.modalSubtitle")}
				icon={<Truck className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={isSaving}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton form="supplier-form" isLoading={isSaving}>
							{editingSupplier
								? t("common.saveChanges")
								: t("suppliers.createSupplier")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="supplier-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					<ModernInput
						label={`${t("suppliers.supplierName")} *`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. MR.Lang Supplier Corp"
						leftIcon={<Truck className="h-4 w-4 text-muted-foreground" />}
						required
					/>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={t("suppliers.primaryPhone")}
							value={primaryPhone}
							onChange={(e) => setPrimaryPhone(e.target.value)}
							placeholder="e.g. 019283433"
							leftIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
						/>

						<ModernInput
							label={t("suppliers.secondaryPhone")}
							value={secondaryPhone}
							onChange={(e) => setSecondaryPhone(e.target.value)}
							placeholder="e.g. 099889933"
							leftIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
						/>
					</div>

					<ModernTextarea
						label={t("suppliers.overviewDescription")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Primary supplier for hardware and raw materials..."
					/>
				</form>
			</ModernModal>
		</div>
	);
}

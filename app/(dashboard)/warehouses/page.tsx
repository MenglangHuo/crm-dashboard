"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warehousesApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Warehouse as WarehouseIcon, Home, CheckCircle } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	WAREHOUSE_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSwitch,
} from "@/components/ui-custom/form-controls";
import type { Warehouse } from "@/lib/types";

export default function WarehousesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
		null,
	);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isDefault, setIsDefault] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: ["warehouses", page, pageSize, search],
		queryFn: () => warehousesApi.list({ page, limit: pageSize, search }),
	});

	const saveMutation = useMutation({
		mutationFn: (values: {
			name: string;
			description?: string;
			isDefault?: boolean;
		}) => {
			if (editingWarehouse) {
				return warehousesApi.update(editingWarehouse.id, values);
			}
			return warehousesApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingWarehouse
					? "Warehouse updated successfully"
					: "Warehouse created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["warehouses"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: warehousesApi.remove,
		onSuccess: () => {
			toast.success("Warehouse deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["warehouses"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingWarehouse(null);
		setName("");
		setDescription("");
		setIsDefault(false);
		setIsDialogOpen(true);
	};

	const openEditDialog = (wh: Warehouse) => {
		setEditingWarehouse(wh);
		setName(wh.name);
		setDescription(wh.description || "");
		setIsDefault(wh.isDefault || false);
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingWarehouse(null);
		setName("");
		setDescription("");
		setIsDefault(false);
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Warehouse name is required");
			return;
		}
		saveMutation.mutate({ name, description, isDefault });
	};

	const columns: ColumnDef<Warehouse>[] = [
		{
			id: "name",
			header: "Warehouse Name",
			accessorKey: "name",
			sortable: true,
			cell: ({ value, row }) => (
				<span className="font-semibold text-slate-900 flex items-center gap-2">
					{value}
					{row.isDefault && (
						<Badge
							variant="outline"
							className="text-indigo-600 border-indigo-200 bg-indigo-50 gap-1 text-[10px]"
						>
							<Home className="h-3 w-3" /> Primary
						</Badge>
					)}
				</span>
			),
		},
		{
			id: "description",
			header: "Description",
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-slate-500 text-xs max-w-xs truncate">
					{value || "—"}
				</span>
			),
		},
		{
			id: "isDefault",
			header: "Default Depot",
			accessorKey: "isDefault",
			cell: ({ value }) =>
				value ? (
					<span className="text-emerald-600 font-medium text-xs flex items-center gap-1">
						<CheckCircle className="h-3.5 w-3.5" /> Default Location
					</span>
				) : (
					<span className="text-slate-400 text-xs">Standard</span>
				),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ value }) => (
				<Badge variant={value === "ACTIVE" || !value ? "default" : "secondary"}>
					{value || "ACTIVE"}
				</Badge>
			),
		},
	];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-10">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						<WarehouseIcon className="h-6 w-6 text-indigo-600" /> Storage
						Warehouses
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						Manage physical stock warehouses and primary depot settings.
					</p>
				</div>
			</div>

			<DataTable<Warehouse>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title="Warehouses Directory"
				searchPlaceholder="Search warehouses by name or description..."
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={WAREHOUSE_DOMAIN_FILTERS}
				createButtonLabel="Add Warehouse"
				onCreateNew={openCreateDialog}
				manualPagination={true}
				totalCount={data?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onEditRow={openEditDialog}
				onDeleteRow={(item) => deleteMutation.mutate(item.id)}
			/>

			<ModernModal
				isOpen={isDialogOpen}
				onClose={closeDialog}
				title={
					editingWarehouse ? "Edit Warehouse Depot" : "Register New Warehouse"
				}
				subtitle="Manage physical storage location and default inventory distribution settings."
				icon={<WarehouseIcon className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="warehouse-form"
							isLoading={saveMutation.isPending}
						>
							{editingWarehouse ? "Save Changes" : "Create Warehouse"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="warehouse-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					<ModernInput
						label="Warehouse Name *"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Central Logistics Depot"
						leftIcon={
							<WarehouseIcon className="h-4 w-4 text-muted-foreground" />
						}
						required
					/>
					<ModernInput
						label="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Warehouse location or notes..."
					/>
					<div className="pt-2">
						<ModernSwitch
							label="Set as default warehouse depot for new stock items"
							checked={isDefault}
							onCheckedChange={(val) => setIsDefault(val)}
							showStatusBadge
						/>
					</div>
				</form>
			</ModernModal>
		</div>
	);
}

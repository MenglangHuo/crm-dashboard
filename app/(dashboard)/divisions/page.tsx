"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { divisionsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	DIVISION_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernInput } from "@/components/ui-custom/form-controls";
import type { Division } from "@/lib/types";

export default function DivisionsPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingDivision, setEditingDivision] = useState<Division | null>(null);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["divisions", page, pageSize, search],
		queryFn: () => divisionsApi.list({ page, limit: pageSize, search }),
	});

	const saveMutation = useMutation({
		mutationFn: (values: { name: string; description?: string }) => {
			if (editingDivision) {
				return divisionsApi.update(editingDivision.id, values);
			}
			return divisionsApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingDivision
					? "Division updated successfully"
					: "Division created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["divisions"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: divisionsApi.remove,
		onSuccess: () => {
			toast.success("Division deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["divisions"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingDivision(null);
		setName("");
		setDescription("");
		setIsDialogOpen(true);
	};

	const openEditDialog = (div: Division) => {
		setEditingDivision(div);
		setName(div.name);
		setDescription(div.description || "");
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingDivision(null);
		setName("");
		setDescription("");
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Division name is required");
			return;
		}
		saveMutation.mutate({ name, description });
	};

	const columns: ColumnDef<Division>[] = [
		{
			id: "name",
			header: "Division Name",
			accessorKey: "name",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-semibold text-slate-900">{value}</span>
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
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ value }) => (
				<Badge variant={value === "ACTIVE" || !value ? "default" : "secondary"}>
					{value || "ACTIVE"}
				</Badge>
			),
		},
		{
			id: "createdAt",
			header: "Created Date",
			accessorKey: "createdAt",
			cell: ({ value }) => (
				<span className="text-slate-500 text-xs">
					{value ? new Date(value).toLocaleDateString() : "—"}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-10">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						<Layers className="h-6 w-6 text-indigo-600" /> Organizational
						Divisions
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						Manage company divisions and department boundaries.
					</p>
				</div>
			</div>

			<DataTable<Division>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title="Company Divisions Directory"
				searchPlaceholder="Search divisions by name or description..."
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={DIVISION_DOMAIN_FILTERS}
				createButtonLabel="Add Division"
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
				title={editingDivision ? "Edit Division" : "Create New Division"}
				subtitle="Manage organizational division structures and operational scopes."
				icon={<Layers className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="division-form"
							isLoading={saveMutation.isPending}
						>
							{editingDivision ? "Save Changes" : "Create Division"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="division-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					<ModernInput
						label="Division Name *"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Technology & Innovation"
						leftIcon={<Layers className="h-4 w-4 text-muted-foreground" />}
						required
					/>
					<ModernInput
						label="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Division mandate or scope..."
					/>
				</form>
			</ModernModal>
		</div>
	);
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unitsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	UNIT_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernInput } from "@/components/ui-custom/form-controls";
import { useTranslation } from "@/lib/i18n/context";
import type { Unit } from "@/lib/types";

export default function UnitsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

	const [name, setName] = useState("");
	const [symbol, setSymbol] = useState("");
	const [description, setDescription] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["units", page, pageSize, search],
		queryFn: () => unitsApi.list({ page, limit: pageSize, search }),
	});

	const saveMutation = useMutation({
		mutationFn: (values: Partial<Unit>) => {
			if (editingUnit) {
				return unitsApi.update(editingUnit.id, values);
			}
			return unitsApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingUnit ? "Unit updated successfully" : "Unit created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["units"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: unitsApi.remove,
		onSuccess: () => {
			toast.success("Unit deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["units"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingUnit(null);
		setName("");
		setSymbol("");
		setDescription("");
		setIsDialogOpen(true);
	};

	const openEditDialog = (unit: Unit) => {
		setEditingUnit(unit);
		setName(unit.name);
		setSymbol(unit.symbol || "");
		setDescription(unit.description || "");
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingUnit(null);
		setName("");
		setSymbol("");
		setDescription("");
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Unit name is required");
			return;
		}
		saveMutation.mutate({ name, symbol, description });
	};

	const columns: ColumnDef<Unit>[] = [
		{
			id: "name",
			header: t("products.unitName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-semibold text-slate-900">{value}</span>
			),
		},
		{
			id: "symbol",
			header: t("products.unitSymbol"),
			accessorKey: "symbol",
			cell: ({ value, row }) => (
				<Badge variant="outline" className="font-mono text-xs">
					{value || row.name?.substring(0, 3).toUpperCase()}
				</Badge>
			),
		},
		{
			id: "description",
			header: t("products.detailedDescription"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-slate-500 text-xs max-w-xs truncate">
					{value || "—"}
				</span>
			),
		},
		{
			id: "status",
			header: t("products.status"),
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
						<SlidersHorizontal className="h-6 w-6 text-indigo-600" />{" "}
						{t("sidebar.units")}
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						{t("products.createUnitDesc")}
					</p>
				</div>
			</div>

			<DataTable<Unit>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("sidebar.units")}
				searchPlaceholder={t("products.searchProductsPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={UNIT_DOMAIN_FILTERS}
				createButtonLabel={t("products.addUnit")}
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
				title={editingUnit ? t("products.editUnit") : t("products.createUnit")}
				subtitle={t("products.subtitle")}
				icon={<SlidersHorizontal className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="unit-form"
							isLoading={saveMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form id="unit-form" onSubmit={handleSave} className="space-y-4 pt-1">
					<ModernInput
						label={`${t("products.unitName")} *`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={t("products.unitNamePlaceholder")}
						leftIcon={
							<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
						}
						required
					/>
					<ModernInput
						label={t("products.unitSymbol")}
						value={symbol}
						onChange={(e) => setSymbol(e.target.value)}
						placeholder={t("products.unitSymbolPlaceholder")}
					/>
					<ModernInput
						label={t("products.detailedDescription")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder={t("products.unitDescriptionPlaceholder")}
					/>
				</form>
			</ModernModal>
		</div>
	);
}

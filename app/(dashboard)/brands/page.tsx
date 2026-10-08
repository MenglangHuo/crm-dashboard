"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brandsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	BRAND_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernInput } from "@/components/ui-custom/form-controls";
import { useTranslation } from "@/lib/i18n/context";
import type { Brand } from "@/lib/types";

export default function BrandsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [logoUrl, setLogoUrl] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["brands", page, pageSize, search],
		queryFn: () => brandsApi.list({ page, limit: pageSize, search }),
	});

	const saveMutation = useMutation({
		mutationFn: (values: Partial<Brand>) => {
			if (editingBrand) {
				return brandsApi.update(String(editingBrand.id), values);
			}
			return brandsApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingBrand
					? "Brand updated successfully"
					: "Brand created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["brands"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => brandsApi.remove(String(id)),
		onSuccess: () => {
			toast.success("Brand deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["brands"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingBrand(null);
		setName("");
		setDescription("");
		setLogoUrl("");
		setIsDialogOpen(true);
	};

	const openEditDialog = (brand: Brand) => {
		setEditingBrand(brand);
		setName(brand.name);
		setDescription(brand.description || "");
		setLogoUrl(brand.logoUrl || "");
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingBrand(null);
		setName("");
		setDescription("");
		setLogoUrl("");
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Brand name is required");
			return;
		}
		saveMutation.mutate({ name, description, logoUrl });
	};

	const columns: ColumnDef<Brand>[] = [
		{
			id: "name",
			header: t("products.brandName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value, row }) => (
				<span className="font-semibold text-slate-900 flex items-center gap-2">
					{row.logoUrl ? (
						<img
							src={row.logoUrl}
							alt={value}
							className="h-6 w-6 rounded object-cover border"
						/>
					) : null}
					{value}
				</span>
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
			id: "isActive",
			header: t("products.status"),
			accessorKey: "isActive",
			cell: ({ value }) => (
				<Badge variant={value !== false ? "default" : "secondary"}>
					{value !== false ? "ACTIVE" : "INACTIVE"}
				</Badge>
			),
		},
	];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-10">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						<Tag className="h-6 w-6 text-indigo-600" /> {t("sidebar.brands")}
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						{t("products.createBrandDesc")}
					</p>
				</div>
			</div>

			<DataTable<Brand>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("sidebar.brands")}
				searchPlaceholder={t("products.searchProductsPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={BRAND_DOMAIN_FILTERS}
				createButtonLabel={t("products.addBrand")}
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
					editingBrand ? t("products.editBrand") : t("products.createBrand")
				}
				subtitle={t("products.subtitle")}
				icon={<Tag className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="brand-form"
							isLoading={saveMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form id="brand-form" onSubmit={handleSave} className="space-y-4 pt-1">
					<ModernInput
						label={`${t("products.brandName")} *`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={t("products.brandNamePlaceholder")}
						leftIcon={<Tag className="h-4 w-4 text-muted-foreground" />}
						required
					/>
					<ModernInput
						label={t("products.brandLogo")}
						value={logoUrl}
						onChange={(e) => setLogoUrl(e.target.value)}
						placeholder="https://..."
					/>
					<ModernInput
						label={t("products.detailedDescription")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Brand description..."
					/>
				</form>
			</ModernModal>
		</div>
	);
}

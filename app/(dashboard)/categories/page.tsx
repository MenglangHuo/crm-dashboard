"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	categoriesApi,
	safeImageUrl,
	DEFAULT_IMAGE_URL,
	uploadService,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderTree, Upload, Loader2, Trash2 } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	CATEGORY_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernInput } from "@/components/ui-custom/form-controls";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState("#4f46e5");
	const [logoUrl, setLogoUrl] = useState("");
	const [uploadingImage, setUploadingImage] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["categories", page, pageSize, search],
		queryFn: () => categoriesApi.list({ page, limit: pageSize, search }),
	});

	const saveMutation = useMutation({
		mutationFn: (values: Partial<Category>) => {
			if (editingCategory) {
				return categoriesApi.update(String(editingCategory.id), values);
			}
			return categoriesApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingCategory
					? "Category updated successfully"
					: "Category created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["categories-all"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => categoriesApi.remove(String(id)),
		onSuccess: () => {
			toast.success("Category deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["categories-all"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingCategory(null);
		setName("");
		setDescription("");
		setColor("#4f46e5");
		setLogoUrl("");
		setIsDialogOpen(true);
	};

	const openEditDialog = (cat: Category) => {
		setEditingCategory(cat);
		setName(cat.name || "");
		setDescription(cat.description || "");
		setColor(cat.color || "#4f46e5");
		setLogoUrl(cat.logoUrl || cat.imageUrl || "");
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingCategory(null);
		setName("");
		setDescription("");
		setColor("#4f46e5");
		setLogoUrl("");
	};

	const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploadingImage(true);
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				category: "CATEGORIES",
				description: `Category logo: ${file.name}`,
			});
			const finalUrl = res.url || res.fileKey || "";
			setLogoUrl(finalUrl);
			toast.success("Category logo uploaded successfully!");
		} catch (err) {
			toast.error(getErrorMessage(err) || "Failed to upload image");
		} finally {
			setUploadingImage(false);
			if (e.target) e.target.value = "";
		}
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Category name is required");
			return;
		}
		saveMutation.mutate({
			name,
			description,
			color,
			logoUrl,
			imageUrl: logoUrl,
		});
	};

	const columns: ColumnDef<Category>[] = [
		{
			id: "name",
			header: t("products.categoryName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value, row }) => {
				const img = row.logoUrl || row.imageUrl;
				return (
					<span className="font-semibold text-slate-900 flex items-center gap-2">
						{img ? (
							<img
								src={safeImageUrl(img)}
								alt={value}
								className="h-6 w-6 rounded-md object-contain border bg-white p-0.5 shrink-0"
								onError={(e) => {
									e.currentTarget.onerror = null;
									e.currentTarget.src = DEFAULT_IMAGE_URL;
								}}
							/>
						) : row.color ? (
							<span
								className="h-3 w-3 rounded-full inline-block shrink-0"
								style={{ backgroundColor: row.color }}
							/>
						) : null}
						{value}
					</span>
				);
			},
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
						<FolderTree className="h-6 w-6 text-indigo-600" />{" "}
						{t("sidebar.categories")}
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						{t("products.createCategoryDesc")}
					</p>
				</div>
			</div>

			<DataTable<Category>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("sidebar.categories")}
				searchPlaceholder={t("products.searchProductsPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={CATEGORY_DOMAIN_FILTERS}
				createButtonLabel={t("products.addCategory")}
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
					editingCategory
						? t("products.editCategory")
						: t("products.createCategory")
				}
				subtitle={t("products.subtitle")}
				icon={<FolderTree className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="category-form"
							isLoading={saveMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="category-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					<ModernInput
						label={`${t("products.categoryName")} *`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={t("products.categoryNamePlaceholder")}
						leftIcon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
						required
					/>

					{/* Logo / Image Upload */}
					<div className="space-y-1.5">
						<Label className="font-semibold text-xs text-foreground tracking-wide">
							{t("products.categoryImageOrLogo")}
						</Label>
						<div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
							<div className="relative h-14 w-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
								{logoUrl ? (
									<img
										src={safeImageUrl(logoUrl)}
										alt="Category logo preview"
										className="h-full w-full object-contain p-1"
										onError={(e) => {
											e.currentTarget.onerror = null;
											e.currentTarget.src = DEFAULT_IMAGE_URL;
										}}
									/>
								) : (
									<div
										className="h-full w-full flex items-center justify-center text-white"
										style={{ backgroundColor: color || "#4f46e5" }}
									>
										<FolderTree className="h-6 w-6" />
									</div>
								)}
							</div>

							<div className="flex-1 space-y-1">
								<div className="flex items-center gap-2 flex-wrap">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={uploadingImage}
										onClick={() => fileInputRef.current?.click()}
										className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
									>
										{uploadingImage ? (
											<>
												<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin text-purple-600" />
												{t("common.loading")}
											</>
										) : (
											<>
												<Upload className="h-3.5 w-3.5 mr-1 text-purple-600" />
												{t("products.uploadNew")}
											</>
										)}
									</Button>
									<input
										type="file"
										ref={fileInputRef}
										className="hidden"
										accept="image/*"
										onChange={handleUploadImage}
									/>
									{logoUrl && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setLogoUrl("")}
											className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
										>
											<Trash2 className="h-3.5 w-3.5 mr-1" />
											{t("common.delete")}
										</Button>
									)}
								</div>
								<p className="text-[11px] text-slate-400">
									{t("products.uploadCategoryLogoDesc")}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs font-semibold text-slate-700">
							{t("products.badgeColor")}
						</Label>
						<div className="flex items-center gap-3">
							<Input
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="h-10 w-20 p-1 rounded-xl cursor-pointer"
							/>
							<span className="text-xs font-mono text-slate-500 uppercase">
								{color}
							</span>
						</div>
					</div>
					<ModernInput
						label={t("products.detailedDescription")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Category summary..."
					/>
				</form>
			</ModernModal>
		</div>
	);
}

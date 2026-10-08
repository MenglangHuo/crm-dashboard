"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { departmentsApi, divisionsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import {
	DataTable,
	ColumnDef,
	DEPARTMENT_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
} from "@/components/ui-custom/form-controls";
import type { Department } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export default function DepartmentsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingDepartment, setEditingDepartment] = useState<Department | null>(
		null,
	);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [divisionId, setDivisionId] = useState<string>("");

	const { data: divisionsData } = useQuery({
		queryKey: ["divisions-all"],
		queryFn: () => divisionsApi.list({ limit: 100 }),
	});

	const { data, isLoading } = useQuery({
		queryKey: ["departments", page, pageSize, search],
		queryFn: () => departmentsApi.list({ page, limit: pageSize, search }),
	});

	const divisionOptions = useMemo(() => {
		if (!divisionsData?.items) return [];
		return divisionsData.items.map((div) => ({
			value: String(div.id),
			label: div.name,
		}));
	}, [divisionsData]);

	const domainFilterFields = useMemo(() => {
		return DEPARTMENT_DOMAIN_FILTERS.map((field) => {
			if (field.field === "divisionId") {
				return {
					...field,
					options: divisionOptions,
				};
			}
			return field;
		});
	}, [divisionOptions]);

	const saveMutation = useMutation({
		mutationFn: (values: {
			name: string;
			description?: string;
			divisionId?: string | number;
		}) => {
			if (editingDepartment) {
				return departmentsApi.update(editingDepartment.id, values);
			}
			return departmentsApi.create(values);
		},
		onSuccess: () => {
			toast.success(
				editingDepartment
					? t("departments.updatedSuccess")
					: t("departments.createdSuccess"),
			);
			queryClient.invalidateQueries({ queryKey: ["departments"] });
			closeDialog();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => departmentsApi.remove(id),
		onSuccess: () => {
			toast.success(t("departments.deactivatedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["departments"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreateDialog = () => {
		setEditingDepartment(null);
		setName("");
		setDescription("");
		setDivisionId("");
		setIsDialogOpen(true);
	};

	const openEditDialog = (dept: Department) => {
		setEditingDepartment(dept);
		setName(dept.name);
		setDescription(dept.description || "");
		setDivisionId(
			dept.divisionId
				? String(dept.divisionId)
				: dept.division?.id
					? String(dept.division.id)
					: "",
		);
		setIsDialogOpen(true);
	};

	const closeDialog = () => {
		setIsDialogOpen(false);
		setEditingDepartment(null);
		setName("");
		setDescription("");
		setDivisionId("");
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error(t("departments.nameRequired"));
			return;
		}
		saveMutation.mutate({
			name,
			description,
			divisionId: divisionId || undefined,
		});
	};

	const columns: ColumnDef<Department>[] = [
		{
			id: "name",
			header: t("departments.departmentName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-semibold text-slate-900">{value}</span>
			),
		},
		{
			id: "division",
			header: t("departments.parentDivision"),
			cell: ({ row }) => (
				<span className="text-slate-600 text-xs">
					{row.division?.name || t("departments.unassigned")}
				</span>
			),
		},
		{
			id: "description",
			header: t("departments.description"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-slate-500 text-xs max-w-xs truncate">
					{value || "—"}
				</span>
			),
		},
		{
			id: "status",
			header: t("departments.status"),
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
						<Building2 className="h-6 w-6 text-indigo-600" />{" "}
						{t("departments.title")}
					</h1>
					<p className="text-slate-500 text-xs mt-1">
						{t("departments.subtitle")}
					</p>
				</div>
			</div>

			<DataTable<Department>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("departments.title")}
				searchPlaceholder={t("departments.searchPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={domainFilterFields}
				createButtonLabel={t("departments.addDepartment")}
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
					editingDepartment
						? t("departments.editDepartment")
						: t("departments.createDepartment")
				}
				subtitle={t("departments.modalSubtitle")}
				icon={<Building2 className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={saveMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={closeDialog} />
						<ModernModalSubmitButton
							form="department-form"
							isLoading={saveMutation.isPending}
						>
							{editingDepartment
								? t("common.saveChanges")
								: t("departments.createDepartment")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="department-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					<ModernInput
						label={`${t("departments.departmentName")} *`}
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Software Engineering"
						leftIcon={<Building2 className="h-4 w-4 text-muted-foreground" />}
						required
					/>

					<ModernSelect
						label={t("departments.parentDivision")}
						value={divisionId}
						onChange={(val) => setDivisionId(val)}
						options={divisionOptions}
						placeholder="Select division (optional)"
					/>

					<ModernInput
						label={t("departments.description")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Department responsibilities..."
					/>
				</form>
			</ModernModal>
		</div>
	);
}

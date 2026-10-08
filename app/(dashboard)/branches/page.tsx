"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { branchesApi, BranchInput } from "@/lib/api/endpoints";
import { Branch } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, Phone, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
	DataTable,
	ColumnDef,
	StatusBadgeCell,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernInput } from "@/components/ui-custom/form-controls";

const formSchema = z.object({
	name: z.string().min(2, "Name is required"),
	phone: z.string().min(5, "Phone is required"),
	address: z.string().min(2, "Address is required"),
	active: z.boolean().optional(),
});

export default function BranchesPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

	const { data, isLoading, isFetching, refetch } = useQuery({
		queryKey: ["branches", { page, pageSize, search }],
		queryFn: () =>
			branchesApi.list({ page, limit: pageSize, search, includeDeleted: true }),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			phone: "",
			address: "",
			active: true,
		},
	});

	const createMutation = useMutation({
		mutationFn: branchesApi.create,
		onSuccess: () => {
			toast.success("Branch created successfully");
			queryClient.invalidateQueries({ queryKey: ["branches"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string; body: Partial<BranchInput> }) =>
			branchesApi.update(id, body),
		onSuccess: () => {
			toast.success("Branch updated successfully");
			queryClient.invalidateQueries({ queryKey: ["branches"] });
			setIsDialogOpen(false);
			setEditingBranch(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: branchesApi.remove,
		onSuccess: () => {
			toast.success("Branch deleted");
			queryClient.invalidateQueries({ queryKey: ["branches"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreMutation = useMutation({
		mutationFn: branchesApi.restore,
		onSuccess: () => {
			toast.success("Branch restored");
			queryClient.invalidateQueries({ queryKey: ["branches"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setEditingBranch(null);
		form.reset({
			name: "",
			phone: "",
			address: "",
			active: true,
		});
		setIsDialogOpen(true);
	};

	const openEdit = (branch: Branch) => {
		setEditingBranch(branch);
		form.reset({
			name: branch.name,
			phone: branch.phone,
			address: branch.address,
			active: branch.active,
		});
		setIsDialogOpen(true);
	};

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		if (editingBranch) {
			updateMutation.mutate({ id: editingBranch.id, body: values });
		} else {
			createMutation.mutate(values);
		}
	};

	const toggleActive = (branch: Branch) => {
		updateMutation.mutate({
			id: branch.id,
			body: {
				name: branch.name,
				phone: branch.phone,
				address: branch.address,
				active: !branch.active,
			},
		});
	};

	const columns: ColumnDef<Branch>[] = [
		{
			id: "name",
			header: "Branch Name",
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<div className="font-semibold text-foreground text-sm">
						{row.name}
					</div>
					<div className="text-xs text-muted-foreground">ID: {row.id}</div>
				</div>
			),
		},
		{
			id: "contact",
			header: "Contact & Address",
			accessorFn: (b) => `${b.phone} ${b.address}`,
			cell: ({ row }) => (
				<div className="space-y-0.5">
					<div className="flex items-center text-xs font-medium gap-1.5 text-foreground">
						<Phone className="h-3 w-3 text-muted-foreground shrink-0" />
						<span>{row.phone}</span>
					</div>
					<div className="flex items-center text-xs text-muted-foreground gap-1.5">
						<MapPin className="h-3 w-3 shrink-0" />
						<span className="truncate max-w-[220px]">{row.address}</span>
					</div>
				</div>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorFn: (b) =>
				b.deletedAt ? "Deleted" : b.active ? "Active" : "Inactive",
			filterType: "select",
			filterOptions: [
				{ label: "Active", value: "Active" },
				{ label: "Inactive", value: "Inactive" },
				{ label: "Deleted", value: "Deleted" },
			],
			cell: ({ row }) =>
				row.deletedAt ? (
					<StatusBadgeCell status="Deleted" customVariant="danger" />
				) : (
					<div className="flex items-center gap-2">
						<Switch
							checked={row.active}
							onCheckedChange={() => toggleActive(row)}
						/>
						<StatusBadgeCell
							status={row.active ? "Active" : "Inactive"}
							type="account"
						/>
					</div>
				),
		},
	];

	const customActions: RowAction<Branch>[] = [
		{
			label: "Restore",
			icon: <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />,
			hidden: (b) => !b.deletedAt,
			onClick: (b) => restoreMutation.mutate(b.id),
		},
	];

	return (
		<div className="space-y-4">
			{/* Reusable Data Table Component */}
			<DataTable<Branch>
				data={data?.items || []}
				columns={columns}
				getRowId={(b) => b.id}
				title="Branches"
				searchPlaceholder="Search branch name, phone, address..."
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel="Add Branch"
				onCreateNew={openCreate}
				manualPagination={true}
				totalCount={data?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onRefresh={() => refetch()}
				onEditRow={(b) => !b.deletedAt && openEdit(b)}
				onDeleteRow={(b) => !b.deletedAt && deleteMutation.mutate(b.id)}
				customRowActions={customActions}
				exportFilename="branches-list"
			/>

			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={editingBranch ? "Edit Branch" : "Create Branch"}
				subtitle={
					editingBranch
						? "Update branch details."
						: "Add a new branch to your company."
				}
				icon={<MapPin className="h-5 w-5" />}
				size="md"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="branch-form"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							{editingBranch ? "Save Changes" : "Create Branch"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="branch-form"
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<ModernInput
						label="Branch Name"
						placeholder="Enter branch name"
						{...form.register("name")}
						error={form.formState.errors.name?.message}
						required
					/>
					<ModernInput
						label="Phone Number"
						placeholder="Enter phone number"
						leftIcon={<Phone className="size-4" />}
						{...form.register("phone")}
						error={form.formState.errors.phone?.message}
						required
					/>
					<ModernInput
						label="Address"
						placeholder="Enter branch address"
						leftIcon={<MapPin className="size-4" />}
						{...form.register("address")}
						error={form.formState.errors.address?.message}
						required
					/>
				</form>
			</ModernModal>
		</div>
	);
}

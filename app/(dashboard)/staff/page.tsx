"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi, StaffInput } from "@/lib/api/endpoints";
import { Staff } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Loader2,
	Briefcase,
	FileIcon,
	Mail,
	Phone,
	RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	DataTable,
	ColumnDef,
	UserDetailCell,
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
import { FileUpload } from "@/components/ui-custom/file-upload";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	position: z.string().min(1, "Position is required"),
	salary: z.coerce.number().min(0, "Salary must be positive"),
	email: z.string().email("Valid email is required"),
	phone: z.string().min(5, "Phone is required"),
	urgentContactName: z.string().min(1, "Urgent contact name is required"),
	urgentContactPhone: z.string().min(1, "Urgent contact phone is required"),
	documents: z
		.array(
			z.object({
				fileKey: z.string(),
				fileName: z.string(),
			}),
		)
		.optional(),
});

export default function StaffPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["staff", { page, pageSize, search }],
		queryFn: () =>
			staffApi.list({ page, limit: pageSize, search, includeDeleted: true }),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema as any),
		defaultValues: {
			firstName: "",
			lastName: "",
			position: "",
			salary: 0,
			email: "",
			phone: "",
			urgentContactName: "",
			urgentContactPhone: "",
			documents: [],
		},
	});

	const { fields, append, remove } = useFieldArray({
		name: "documents",
		control: form.control,
	});

	const createMutation = useMutation({
		mutationFn: staffApi.create,
		onSuccess: () => {
			toast.success("Staff member added successfully");
			queryClient.invalidateQueries({ queryKey: ["staff"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string; body: Partial<StaffInput> }) =>
			staffApi.update(id, body),
		onSuccess: () => {
			toast.success("Staff member updated successfully");
			queryClient.invalidateQueries({ queryKey: ["staff"] });
			setIsDialogOpen(false);
			setEditingStaff(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: staffApi.remove,
		onSuccess: () => {
			toast.success("Staff member deleted");
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreMutation = useMutation({
		mutationFn: staffApi.restore,
		onSuccess: () => {
			toast.success("Staff member restored");
			queryClient.invalidateQueries({ queryKey: ["staff"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setEditingStaff(null);
		form.reset({
			firstName: "",
			lastName: "",
			position: "",
			salary: 0,
			email: "",
			phone: "",
			urgentContactName: "",
			urgentContactPhone: "",
			documents: [],
		});
		setIsDialogOpen(true);
	};

	const openEdit = (staff: Staff) => {
		setEditingStaff(staff);
		form.reset({
			firstName: staff.firstName,
			lastName: staff.lastName,
			position: staff.position,
			salary: staff.salary,
			email: staff.email,
			phone: staff.phone,
			urgentContactName: staff.urgentContactName,
			urgentContactPhone: staff.urgentContactPhone,
			documents: staff.documents,
		});
		setIsDialogOpen(true);
	};

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		if (editingStaff) {
			updateMutation.mutate({ id: editingStaff.id, body: values });
		} else {
			createMutation.mutate(values);
		}
	};

	const columns: ColumnDef<Staff>[] = [
		{
			id: "employee",
			header: "Employee",
			accessorFn: (s) => `${s.firstName} ${s.lastName}`,
			sortable: true,
			cell: ({ row }) => (
				<UserDetailCell
					name={`${row.firstName} ${row.lastName}`}
					subtitle={`ID: ${String(row.id).split("-")[0]}`}
					onClick={() => !row.deletedAt && openEdit(row)}
				/>
			),
		},
		{
			id: "contact",
			header: "Contact Details",
			cell: ({ row }) => (
				<div className="space-y-0.5">
					<div className="flex items-center text-xs font-medium gap-1.5 text-foreground">
						<Mail className="h-3 w-3 text-muted-foreground shrink-0" />
						<span>{row.email}</span>
					</div>
					<div className="flex items-center text-xs text-muted-foreground gap-1.5">
						<Phone className="h-3 w-3 shrink-0" />
						<span>{row.phone}</span>
					</div>
				</div>
			),
		},
		{
			id: "position",
			header: "Position & Salary",
			accessorKey: "position",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<div className="font-semibold text-xs text-foreground">
						{row.position}
					</div>
					<div className="text-xs text-muted-foreground">
						${row.salary?.toLocaleString()} / yr
					</div>
				</div>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorFn: (s) => (s.deletedAt ? "Terminated" : "Active"),
			filterType: "select",
			filterOptions: [
				{ label: "Active", value: "Active" },
				{ label: "Terminated", value: "Terminated" },
			],
			cell: ({ row }) =>
				row.deletedAt ? (
					<StatusBadgeCell status="Terminated" customVariant="danger" />
				) : (
					<StatusBadgeCell status="Active" type="account" />
				),
		},
	];

	const customActions: RowAction<Staff>[] = [
		{
			label: "Restore",
			icon: <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />,
			hidden: (staff) => !staff.deletedAt,
			onClick: (staff) => restoreMutation.mutate(staff.id),
		},
	];

	return (
		<div className="space-y-4">
			{/* Reusable Data Table */}
			<DataTable<Staff>
				data={data?.items || []}
				columns={columns}
				getRowId={(s) => s.id}
				title="Staff Directory"
				searchPlaceholder="Search staff name, email, position..."
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel="Add Staff"
				onCreateNew={openCreate}
				manualPagination={true}
				totalCount={data?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onEditRow={(staff) => !staff.deletedAt && openEdit(staff)}
				onDeleteRow={(staff) =>
					!staff.deletedAt && deleteMutation.mutate(staff.id)
				}
				customRowActions={customActions}
				exportFilename="staff-directory"
			/>

			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={editingStaff ? "Edit Staff" : "Add Staff Member"}
				subtitle={
					editingStaff
						? "Update employee records and documents."
						: "Onboard a new employee to the company."
				}
				icon={<Briefcase className="h-5 w-5" />}
				size="lg"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="staff-form"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							Save changes
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="staff-form"
					onSubmit={form.handleSubmit(onSubmit as any)}
					className="space-y-6"
				>
					<div className="space-y-4">
						<h4 className="text-xs font-bold text-primary uppercase tracking-wider">
							Personal Details
						</h4>
						<div className="grid grid-cols-2 gap-4">
							<ModernInput
								label="First Name"
								placeholder="John"
								{...form.register("firstName")}
								error={form.formState.errors.firstName?.message}
								required
							/>
							<ModernInput
								label="Last Name"
								placeholder="Doe"
								{...form.register("lastName")}
								error={form.formState.errors.lastName?.message}
								required
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<ModernInput
								label="Email Address"
								type="email"
								placeholder="john@example.com"
								leftIcon={<Mail className="size-4" />}
								{...form.register("email")}
								error={form.formState.errors.email?.message}
								required
							/>
							<ModernInput
								label="Phone Number"
								placeholder="+1 234 567 890"
								leftIcon={<Phone className="size-4" />}
								{...form.register("phone")}
								error={form.formState.errors.phone?.message}
								required
							/>
						</div>
					</div>

					<div className="space-y-4">
						<h4 className="text-xs font-bold text-primary uppercase tracking-wider">
							Employment Details
						</h4>
						<div className="grid grid-cols-2 gap-4">
							<ModernInput
								label="Position"
								placeholder="e.g. Sales Manager"
								leftIcon={<Briefcase className="size-4" />}
								{...form.register("position")}
								error={form.formState.errors.position?.message}
								required
							/>
							<ModernInput
								label="Salary"
								type="number"
								placeholder="0.00"
								{...form.register("salary")}
								error={form.formState.errors.salary?.message}
								required
							/>
						</div>
					</div>

					<div className="space-y-4">
						<h4 className="text-xs font-bold text-primary uppercase tracking-wider">
							Emergency Contact
						</h4>
						<div className="grid grid-cols-2 gap-4">
							<ModernInput
								label="Contact Name"
								placeholder="Emergency contact full name"
								{...form.register("urgentContactName")}
								error={form.formState.errors.urgentContactName?.message}
								required
							/>
							<ModernInput
								label="Contact Phone"
								placeholder="+1 234 567 890"
								leftIcon={<Phone className="size-4" />}
								{...form.register("urgentContactPhone")}
								error={form.formState.errors.urgentContactPhone?.message}
								required
							/>
						</div>
					</div>

					<div className="space-y-4">
						<h4 className="text-sm font-semibold text-primary">Documents</h4>
						<FileUpload
							onUploadSuccess={(fileKey, fileName) => {
								append({ fileKey, fileName });
							}}
							accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
						/>

						{fields.length > 0 && (
							<div className="space-y-2 mt-4">
								{fields.map((field, index) => (
									<div
										key={field.id}
										className="flex items-center justify-between p-2 border rounded-md text-sm"
									>
										<div className="flex items-center gap-2 overflow-hidden">
											<FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
											<span className="truncate">{field.fileName}</span>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => remove(index)}
											className="text-destructive"
										>
											Remove
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</form>
			</ModernModal>
		</div>
	);
}

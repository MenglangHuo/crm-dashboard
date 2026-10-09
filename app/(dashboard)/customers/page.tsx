"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/endpoints";
import { Customer, Province } from "@/lib/types";
import { CAMBODIA_PROVINCES, getProvinceByCode } from "@/lib/data/provinces";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Plus,
	Loader2,
	Phone,
	MapPin,
	Building2,
	Users,
	Zap,
	Trash2,
	RotateCcw,
	ExternalLink,
	Edit3,
	Compass,
	List,
	Eye,
	Image as ImageIcon,
	CheckCircle2,
	Clock,
	Sparkles,
	Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ModernButton } from "@/components/ui-custom/button";
import {
	ModernSwitch,
	ModernSearchSelect,
	SearchSelectOption,
} from "@/components/ui-custom/form-controls";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import { CUSTOMER_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import { VisitStatusBadge } from "@/components/customers/visit-status-badge";
import { LogVisitModal } from "@/components/customers/log-visit-modal";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { CustomerDetailsModal } from "@/components/customers/customer-details-modal";
import { NearbyMapView } from "@/components/customers/nearby-map-view";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/lib/i18n/context";
import { useCompanyContext } from "@/components/providers/company-context";
import { useDebounce } from "@/hooks/use-debounce";

export default function CustomersPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selectedCompanyId } = useCompanyContext();

	const [viewMode, setViewMode] = useState<"list" | "nearby">("list");
	const [selectedProvinceCode, setSelectedProvinceCode] =
		useState<string>("ALL");
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [domainFilterGroup, setDomainFilterGroup] = useState<any>(null);

	// Modals & action state
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
	const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
	const [deletingId, setDeletingId] = useState<string | number | null>(null);
	const [togglingId, setTogglingId] = useState<string | number | null>(null);
	const [visitModalCustomer, setVisitModalCustomer] = useState<{
		id: number | string;
		name: string;
	} | null>(null);

	// Toggle Customer Status (Active -> DELETE /customers/{id}, Inactive -> PATCH /customers/{id}/restore)
	const handleToggleStatus = async (
		customer: Customer,
		nextActive: boolean,
	) => {
		const customerId = customer.id;
		setTogglingId(customerId);
		try {
			if (nextActive) {
				// Activate via PATCH {{crm-url}}/api/v1/customers/{id}/restore
				await customersApi.restore(customerId);
				toast.success(`Customer "${customer.name}" activated`);
			} else {
				// Deactivate via DELETE {{crm-url}}/api/v1/customers/{id}
				await customersApi.remove(customerId);
				toast.success(`Customer "${customer.name}" deactivated`);
			}
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customerId)],
			});
		} catch (err: any) {
			const msg =
				err?.response?.data?.message ||
				err?.message ||
				"Failed to update customer status";
			toast.error(msg);
		} finally {
			setTogglingId(null);
		}
	};

	// 1. Fetch Active Provinces (/api/v1/customers/active-provinces)
	const { data: rawActiveProvinces = [] } = useQuery({
		queryKey: ["customer-active-provinces"],
		queryFn: () => customersApi.getActiveProvinces(),
	});

	// Format active provinces with proper names
	const activeProvinces = useMemo(() => {
		return rawActiveProvinces.map((p: any) => {
			const code = p.provinceCode || p.code || "";
			const lookup = getProvinceByCode(code);
			return {
				provinceCode: code,
				provinceEn:
					p.provinceEn ||
					p.provinceNameEn ||
					lookup?.provinceEn ||
					`Province ${code}`,
				provinceKh:
					p.provinceKh || p.provinceNameKh || lookup?.provinceKh || "",
			};
		});
	}, [rawActiveProvinces]);

	// 2. Build Filter for Search
	const filterGroup = useMemo(() => {
		const filters: any[] = [];

		if (selectedProvinceCode !== "ALL") {
			filters.push({
				field: "addressCode",
				operator: "EQ",
				value: selectedProvinceCode,
			});
		}

		if (domainFilterGroup?.filterGroup?.filters) {
			filters.push(...domainFilterGroup.filterGroup.filters);
		} else if (domainFilterGroup?.filters) {
			filters.push(...domainFilterGroup.filters);
		}

		if (filters.length === 0) return undefined;

		return {
			operator: "AND",
			filters,
		};
	}, [selectedProvinceCode, domainFilterGroup]);

	// 3. Fetch Customers List
	const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
		queryKey: [
			"customers",
			selectedCompanyId,
			{ page, pageSize, search: debouncedSearch, filterGroup },
		],
		queryFn: () =>
			customersApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch.trim() || undefined,
				filterGroup,
			}),
	});

	const customersList = data?.items || [];
	const totalElements = data?.total || 0;

	// 4. Mutations
	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => customersApi.remove(id),
		onSuccess: () => {
			toast.success("Customer deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			setDeletingId(null);
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to delete customer"),
	});

	const restoreMutation = useMutation({
		mutationFn: (id: string | number) => customersApi.restore(id),
		onSuccess: () => {
			toast.success("Customer reactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["customers"] });
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to restore customer"),
	});

	const openCreateModal = () => {
		setEditingCustomer(null);
		setIsFormOpen(true);
	};

	const openEditModal = (customer: Customer) => {
		setEditingCustomer(customer);
		setIsFormOpen(true);
	};

	// 5. Modern DataTable Columns Definition with Complete Customer Attributes
	const columns: ColumnDef<Customer>[] = [
		{
			id: "customer",
			header: `${t("customers.customerName", "Customer")} & Store`,
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => {
				const photoUrl =
					row.profileUrls?.[0] ||
					row.profileUrl ||
					row.imageUrl ||
					"/images/default-customer.png";
				const photoCount =
					row.profileUrls?.length || (row.profileUrl || row.imageUrl ? 1 : 0);

				return (
					<div className="flex items-center gap-3 py-0.5 min-w-[200px] max-w-xs">
						{/* Photo with multiple-photo badge */}
						<div className="relative group/photo shrink-0">
							<div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-2xs">
								<img
									src={photoUrl}
									alt={row.name}
									onError={(e) => {
										(e.currentTarget as HTMLImageElement).src =
											"/images/default-customer.png";
									}}
									className="h-full w-full object-cover group-hover/photo:scale-105 transition-transform duration-200"
								/>
							</div>
							{photoCount > 1 && (
								<span
									title={`${photoCount} photos available`}
									className="absolute -bottom-1 -right-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[9px] font-black rounded-full px-1 shadow-xs border border-white dark:border-slate-950"
								>
									+{photoCount - 1}
								</span>
							)}
						</div>

						{/* Customer Name & Meta */}
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5 flex-wrap">
								<Link
									href={`/customers/${row.id}`}
									className="font-bold text-slate-950 dark:text-white hover:text-primary transition-colors inline-flex items-center gap-1 text-xs truncate max-w-[170px]"
									title={row.name}
								>
									<span className="truncate">{row.name}</span>
									<ExternalLink className="h-3 w-3 opacity-40 shrink-0" />
								</Link>
								<span className="text-[10px] font-mono font-bold text-slate-400">
									#{row.id}
								</span>
							</div>
							{row.merchantName ? (
								<p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1 truncate mt-0.5">
									<Building2 className="h-3 w-3 text-slate-400 shrink-0" />
									<span className="truncate">{row.merchantName}</span>
								</p>
							) : (
								<span className="text-[11px] text-slate-400 italic block mt-0.5">
									No store name
								</span>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "phone",
			header: t("customers.phone", "Phone Number"),
			accessorKey: "phoneNumber",
			cell: ({ row }) => {
				const primaryPhone = row.phoneNumber || row.phone;
				return (
					<div className="space-y-0.5 min-w-[125px]">
						{primaryPhone ? (
							<a
								href={`tel:${primaryPhone}`}
								className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 text-xs"
							>
								<Phone className="h-3 w-3 shrink-0" /> {primaryPhone}
							</a>
						) : (
							<span className="text-slate-400 text-xs">—</span>
						)}
						{row.contact && row.contact !== primaryPhone && (
							<span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate block">
								Alt: {row.contact}
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "staff",
			header: "Assigned Staff",
			cell: ({ row }) => {
				const staffList = row.staffInfos || [];
				if (staffList.length === 0) {
					return (
						<span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
							Unassigned
						</span>
					);
				}

				const primaryStaff = staffList[0];
				const remainingCount = staffList.length - 1;

				return (
					<div className="flex items-center gap-1 max-w-[170px]">
						<span
							className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[110px]"
							title={primaryStaff.name}
						>
							<Users className="h-2.5 w-2.5 shrink-0" />
							<span className="truncate">{primaryStaff.name}</span>
						</span>
						{remainingCount > 0 && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0">
										+{remainingCount} more
									</span>
								</TooltipTrigger>
								<TooltipContent className="p-2.5 space-y-1.5 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 text-xs">
									<p className="font-bold text-[11px] text-slate-300 border-b border-slate-800 pb-1">
										All Assigned Staff ({staffList.length})
									</p>
									<div className="space-y-1 max-h-40 overflow-y-auto pr-1">
										{staffList.map((s) => (
											<div
												key={s.id}
												className="flex items-center gap-1.5 text-[11px] text-slate-200"
											>
												<Users className="h-3 w-3 text-blue-400 shrink-0" />
												<span>{s.name}</span>
											</div>
										))}
									</div>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				);
			},
		},
		{
			id: "location",
			header: t("customers.address", "Address"),
			cell: ({ row }) => (
				<div className="space-y-0.5 min-w-[140px] max-w-[200px]">
					<p
						className="text-slate-800 dark:text-slate-200 font-medium text-xs truncate"
						title={row.address || "No street address"}
					>
						{row.address || (
							<span className="text-slate-400 italic">No street address</span>
						)}
					</p>
					{row.addressInfo?.province ? (
						<span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 truncate">
							<MapPin className="h-3 w-3 text-rose-500 shrink-0" />
							<span className="truncate">
								{row.addressInfo.province}
								{row.addressInfo.district ? `, ${row.addressInfo.district}` : ""}
							</span>
						</span>
					) : (
						<span className="text-[10px] text-slate-400 italic block">
							No province
						</span>
					)}
				</div>
			),
		},
		{
			id: "coordinates",
			header: "GPS / Map",
			width: "120px",
			cell: ({ row }) => {
				if (!row.lat || !row.lng) {
					return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>;
				}
				const lat = Number(row.lat);
				const lng = Number(row.lng);
				return (
					<a
						href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 transition-colors shadow-2xs group/map"
						onClick={(e) => e.stopPropagation()}
						title={`Open in Google Maps: ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
					>
						<Compass className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover/map:rotate-45 transition-transform" />
						<span>
							{lat.toFixed(3)}, {lng.toFixed(3)}
						</span>
						<ExternalLink className="h-2.5 w-2.5 opacity-50 shrink-0" />
					</a>
				);
			},
		},
		{
			id: "delivery",
			header: "Delivery Route",
			cell: ({ row }) => {
				const primary =
					row.primaryDelivery || (row.deliveries && row.deliveries[0]);
				if (!primary) {
					return (
						<span className="text-slate-400 dark:text-slate-500 text-xs italic">
							—
						</span>
					);
				}
				return (
					<div className="space-y-0.5 min-w-[130px] max-w-[180px]">
						<div className="flex items-center gap-1 font-bold text-xs text-purple-700 dark:text-purple-300 truncate">
							<Truck className="h-3 w-3 shrink-0 text-purple-500" />
							<span className="truncate">{primary.name}</span>
						</div>
						{(primary.driverName || primary.vehicleNumber) && (
							<p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
								{primary.driverName ? `👤 ${primary.driverName}` : ""}
								{primary.vehicleNumber ? ` (${primary.vehicleNumber})` : ""}
							</p>
						)}
					</div>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			width: "120px",
			cell: ({ row }) => {
				const isRowActive =
					typeof row.status === "string"
						? row.status.toLowerCase() === "active"
						: row.isActive !== false &&
							row.active !== false &&
							row.status !== "Inactive";
				const isToggling = togglingId === row.id;

				return (
					<div
						className="flex items-center gap-2"
						onClick={(e) => e.stopPropagation()}
					>
						<ModernSwitch
							checked={isRowActive}
							isLoading={isToggling}
							disabled={isToggling}
							switchSize="sm"
							onCheckedChange={(checked) => handleToggleStatus(row, checked)}
						/>
						<span
							className={`text-xs font-bold transition-colors ${
								isRowActive
									? "text-emerald-600 dark:text-emerald-400"
									: "text-slate-400 dark:text-slate-500"
							}`}
						>
							{isRowActive ? "Active" : "Inactive"}
						</span>
					</div>
				);
			},
		},
		{
			id: "visitStatus",
			header: "Visit Aging",
			cell: ({ row }) => <VisitStatusBadge status={row.visitStatus} />,
		},
	];

	// Custom Row Actions
	const customRowActions: RowAction<Customer>[] = [
		{
			id: "log-visit",
			label: t("customers.logSalesVisit"),
			icon: <Zap className="h-3.5 w-3.5 fill-current text-amber-500" />,
			onClick: (row) => setVisitModalCustomer({ id: row.id, name: row.name }),
		},
		{
			id: "view-details",
			label: t("customers.viewDetails"),
			icon: <Eye className="h-3.5 w-3.5 text-blue-500" />,
			onClick: (row) => setViewingCustomer(row),
		},
		{
			id: "edit-record",
			label: t("customers.editCustomer"),
			icon: <Edit3 className="h-3.5 w-3.5 text-amber-600" />,
			onClick: (row) => openEditModal(row),
		},
		{
			id: "open-360",
			label: "Open 360 Profile",
			icon: <ExternalLink className="h-3.5 w-3.5 text-slate-400" />,
			onClick: (row) => router.push(`/customers/${row.id}`),
		},
	];

	// Mode Switcher Tabs (Placed next to Province Select & Add Customer button)
	const modeSwitcherTabs = (
		<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
			<button
				type="button"
				onClick={() => setViewMode("list")}
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
					viewMode === "list"
						? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
						: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
				}`}
			>
				<List className="h-3.5 w-3.5" /> {t("customers.listTab")}
			</button>
			<button
				type="button"
				onClick={() => setViewMode("nearby")}
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
					viewMode === "nearby"
						? "bg-emerald-600 text-white shadow-xs"
						: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
				}`}
			>
				<Compass className="h-3.5 w-3.5" /> {t("customers.nearbyMapTab")}
			</button>
		</div>
	);

	// Cambodia Provinces Searchable Options List
	const provinceFilterOptions: SearchSelectOption[] = useMemo(() => {
		const opts: SearchSelectOption[] = [
			{
				value: "ALL",
				label: t("customers.allProvinces", "All Provinces"),
				badge: "ALL",
			},
		];
		activeProvinces.forEach((p) => {
			opts.push({
				value: p.provinceCode,
				label: p.provinceEn,
				subtitle: p.provinceKh,
				badge: p.provinceCode,
				icon: <MapPin className="h-3.5 w-3.5 text-rose-500" />,
			});
		});
		return opts;
	}, [activeProvinces, t]);

	// Clean ModernSearchSelect Dropdown placed right beside Customer List Tab
	const provinceSelectWidget = (
		<div className="w-48 sm:w-56 shrink-0">
			<ModernSearchSelect
				placeholder={t("customers.allProvinces", "All Provinces")}
				searchPlaceholder="Filter province..."
				selectSize="sm"
				options={provinceFilterOptions}
				value={selectedProvinceCode}
				onChange={(val) => {
					setSelectedProvinceCode(val || "ALL");
					setPage(1);
				}}
			/>
		</div>
	);

	return (
		<div className="space-y-4 pb-12">
			{/* Main View Mode Body */}
			{viewMode === "nearby" ? (
				<div className="space-y-4">
					{/* Header Action Strip with Tabs and Province Select next to Add Customer */}
					<div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
						<div className="flex items-center gap-2.5">
							<h1 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
								{t("customers.title")}
							</h1>
							<Badge
								variant="outline"
								className="text-xs font-bold px-2 py-0.5 border-slate-300 dark:border-slate-700"
							>
								{totalElements} Total
							</Badge>
						</div>

						<div className="flex items-center gap-2 shrink-0 flex-wrap">
							{modeSwitcherTabs}
							{provinceSelectWidget}

							<Button
								onClick={openCreateModal}
								className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								<span>{t("customers.addNewCustomer", "Add Customer")}</span>
							</Button>
						</div>
					</div>

					<NearbyMapView onLogVisit={(cust) => setVisitModalCustomer(cust)} />
				</div>
			) : (
				<div className="space-y-4">
					{/* Custom Modern DataTable with Integrated Toolbar */}
					<DataTable<Customer>
						hideHeader={true}
						hideImportExport={true}
						data={customersList}
						columns={columns}
						getRowId={(row) => String(row.id)}
						isLoading={isLoading}
						isError={isError}
						error={error}
						onRetry={() => refetch()}
						searchable={true}
						searchField="text"
						searchPlaceholder={t("customers.searchPlaceholder")}
						searchValue={search}
						onSearchChange={(val) => {
							setSearch(val);
							setPage(1);
						}}
						primaryAction={
							<div className="flex items-center gap-2 flex-wrap">
								{modeSwitcherTabs}
								{provinceSelectWidget}
								<Button
									onClick={openCreateModal}
									className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
								>
									<Plus className="h-3.5 w-3.5" />
									<span>{t("customers.addNewCustomer", "Add Customer")}</span>
								</Button>
							</div>
						}
						onEditRow={(row) => openEditModal(row)}
						onDeleteRow={(row) => setDeletingId(row.id)}
						onViewRow={(row) => setViewingCustomer(row)}
						customRowActions={customRowActions}
						manualPagination={true}
						totalCount={totalElements}
						page={page}
						pageSize={pageSize}
						onPageChange={(p) => setPage(p)}
						onPageSizeChange={(sz) => {
							setPageSize(sz);
							setPage(1);
						}}
						domainFilterFields={CUSTOMER_DOMAIN_FILTERS}
						domainTitle={t("customers.filterByProvince")}
						onSearchFilterChange={(filterPayload) => {
							setDomainFilterGroup(filterPayload);
							setPage(1);
						}}
					/>
				</div>
			)}

			{/* Customer Create/Edit Form Modal */}
			<CustomerFormModal
				isOpen={isFormOpen}
				onClose={() => setIsFormOpen(false)}
				customer={editingCustomer}
			/>

			{/* Customer All Info Details Modal */}
			<CustomerDetailsModal
				isOpen={!!viewingCustomer}
				onClose={() => setViewingCustomer(null)}
				customer={viewingCustomer}
				onEdit={(cust) => openEditModal(cust)}
				onLogVisit={(cust) => setVisitModalCustomer(cust)}
			/>

			{/* Log Visit Modal */}
			<LogVisitModal
				isOpen={!!visitModalCustomer}
				onClose={() => setVisitModalCustomer(null)}
				customer={visitModalCustomer}
			/>

			{/* Deactivate Confirmation Alert */}
			<AlertDialog
				open={!!deletingId}
				onOpenChange={(open) => !open && setDeletingId(null)}
			>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Customer Account?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate this customer? They will be
							hidden from active routes and standard directory searches.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deletingId && deleteMutation.mutate(deletingId)}
							className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

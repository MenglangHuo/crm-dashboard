"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { deliveriesApi } from "@/lib/api/endpoints";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import { DELIVERY_DOMAIN_FILTERS } from "@/components/ui-custom/data-table/domain-filter-configs";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
	ModernSelect,
	ModernCombobox,
} from "@/components/ui-custom/form-controls";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
	CAMBODIA_PROVINCES,
	getProvinceByCode,
	resolveDeliveryProvinces,
	getProvinceCoordinates,
} from "@/lib/data/provinces";
import { LeafletMap } from "@/components/customers/leaflet-map";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Truck,
	Phone,
	Building2,
	Edit2,
	MapPin,
	UserCheck,
	ShieldCheck,
	Eye,
	Search,
	Navigation,
	Globe,
	RotateCcw,
	ExternalLink,
	Loader2,
	Plus,
} from "lucide-react";
import type { Delivery, DeliveryInput } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

const DELIVERY_TYPES = [
	{
		value: "TRUCK",
		label: "Truck Carrier",
		color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
	},
	{
		value: "VAN",
		label: "Express Van",
		color:
			"bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
	},
	{
		value: "MOTORCYCLE",
		label: "Motorcycle Dispatch",
		color:
			"bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
	},
	{
		value: "EXPRESS",
		label: "Air Express",
		color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
	},
	{
		value: "CONTAINER",
		label: "Heavy Container",
		color:
			"bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
	},
];

export default function DeliveriesPage() {
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
	const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
	const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null);

	// Form Fields
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [deliveryType, setDeliveryType] = useState("TRUCK");
	const [driverName, setDriverName] = useState("");
	const [primaryPhone, setPrimaryPhone] = useState("");
	const [secondaryPhone, setSecondaryPhone] = useState("");
	const [vehicleNumber, setVehicleNumber] = useState("");
	const [description, setDescription] = useState("");
	const [primaryProvinceCode, setPrimaryProvinceCode] = useState("12");
	const [selectedProvinceCodes, setSelectedProvinceCodes] = useState<string[]>([
		"12",
	]);
	const [lat, setLat] = useState<string>("");
	const [lng, setLng] = useState<string>("");
	const [isGettingLocation, setIsGettingLocation] = useState(false);

	// Quick Location Update Dialog
	const [locationModalOpen, setLocationModalOpen] = useState(false);
	const [locationDelivery, setLocationDelivery] = useState<Delivery | null>(null);
	const [quickLat, setQuickLat] = useState<string>("");
	const [quickLng, setQuickLng] = useState<string>("");
	const [isGettingQuickLocation, setIsGettingQuickLocation] = useState(false);

	// GPS capture function
	const captureGPS = (isQuick = false) => {
		if (typeof window === "undefined" || !navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}
		if (isQuick) {
			setIsGettingQuickLocation(true);
		} else {
			setIsGettingLocation(true);
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const newLat = Number(pos.coords.latitude.toFixed(6));
				const newLng = Number(pos.coords.longitude.toFixed(6));
				if (isQuick) {
					setQuickLat(String(newLat));
					setQuickLng(String(newLng));
					setIsGettingQuickLocation(false);
				} else {
					setLat(String(newLat));
					setLng(String(newLng));
					setIsGettingLocation(false);
				}
				toast.success(`GPS coordinates captured: ${newLat}, ${newLng}`);
			},
			(err) => {
				if (isQuick) {
					setIsGettingQuickLocation(false);
				} else {
					setIsGettingLocation(false);
				}
				toast.error("Could not capture GPS: " + err.message);
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
		);
	};

	// Options for Searchable Primary Province Select
	const provinceOptions = useMemo(() => {
		return CAMBODIA_PROVINCES.map((p) => ({
			value: p.provinceCode,
			label: `[${p.provinceCode}] ${p.provinceEn} — ${p.provinceKh}`,
			description: `${p.provinceEn} (${p.provinceKh})`,
			icon: <MapPin className="h-4 w-4 text-rose-500 shrink-0" />,
		}));
	}, []);

	// Options for Delivery Type Combobox
	const deliveryTypeOptions = useMemo(() => {
		return DELIVERY_TYPES.map((tItem) => ({
			value: tItem.value,
			label: tItem.label,
			badge: tItem.value,
			color: tItem.color,
			icon: <Truck className="h-4 w-4 text-indigo-500 shrink-0" />,
		}));
	}, []);

	// Fetch Deliveries Query
	const { data: deliveriesData, isLoading } = useQuery({
		queryKey: ["deliveries", page, pageSize, search, statusFilter],
		queryFn: () =>
			deliveriesApi.list({
				page,
				limit: pageSize,
				search,
				status: statusFilter,
			}),
	});

	// Mutations
	const createMutation = useMutation({
		mutationFn: deliveriesApi.create,
		onSuccess: () => {
			toast.success(t("deliveries.createdSuccess"));
			queryClient.invalidateQueries({ queryKey: ["deliveries"] });
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
			body: Partial<DeliveryInput>;
		}) => deliveriesApi.update(id, body),
		onSuccess: () => {
			toast.success(t("deliveries.updatedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["deliveries"] });
			setIsDialogOpen(false);
			setEditingDelivery(null);
			resetForm();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateLocationMutation = useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string | number;
			body: { lat: number; lng: number };
		}) => deliveriesApi.updateLocations(id, body),
		onSuccess: () => {
			toast.success("ទីតាំងដឹកជញ្ជូនត្រូវបានកែប្រែជោគជ័យ (Locations updated)");
			queryClient.invalidateQueries({ queryKey: ["deliveries"] });
			setLocationModalOpen(false);
			setLocationDelivery(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: deliveriesApi.remove,
		onSuccess: () => {
			toast.success(t("deliveries.inactivatedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["deliveries"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreMutation = useMutation({
		mutationFn: deliveriesApi.restore,
		onSuccess: () => {
			toast.success(t("deliveries.restoredSuccess"));
			queryClient.invalidateQueries({ queryKey: ["deliveries"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const resetForm = () => {
		setName("");
		setCode("");
		setDeliveryType("TRUCK");
		setDriverName("");
		setPrimaryPhone("");
		setSecondaryPhone("");
		setVehicleNumber("");
		setDescription("");
		setPrimaryProvinceCode("12");
		setSelectedProvinceCodes(["12"]);
		setLat("");
		setLng("");
	};

	const openCreate = () => {
		setEditingDelivery(null);
		resetForm();
		// Auto-generate code draft if creating new
		const nextNum = (deliveriesData?.total || 0) + 1;
		setCode(`DEL-TRK-${String(nextNum).padStart(2, "0")}`);
		const defaultCoords = getProvinceCoordinates("12");
		setLat(String(defaultCoords.lat));
		setLng(String(defaultCoords.lng));
		setIsDialogOpen(true);
	};

	const openEdit = (delivery: Delivery) => {
		setEditingDelivery(delivery);
		setName(delivery.name || "");
		setCode(delivery.code || "");
		setDeliveryType(delivery.deliveryType || "TRUCK");
		setDriverName(delivery.driverName || "");
		setPrimaryPhone(delivery.primaryPhone || "");
		setSecondaryPhone(delivery.secondaryPhone || "");
		setVehicleNumber(delivery.vehicleNumber || "");
		setDescription(delivery.description || "");
		setPrimaryProvinceCode(delivery.primaryProvinceCode || "12");
		setSelectedProvinceCodes(
			delivery.provinceCodes || [delivery.primaryProvinceCode || "12"],
		);
		setLat(delivery.lat !== undefined && delivery.lat !== null ? String(delivery.lat) : "");
		setLng(delivery.lng !== undefined && delivery.lng !== null ? String(delivery.lng) : "");
		setIsDialogOpen(true);
	};

	const openLocationModal = (delivery: Delivery) => {
		setLocationDelivery(delivery);
		setQuickLat(delivery.lat !== undefined && delivery.lat !== null ? String(delivery.lat) : "11.5564");
		setQuickLng(delivery.lng !== undefined && delivery.lng !== null ? String(delivery.lng) : "104.9282");
		setLocationModalOpen(true);
	};

	const handleLocationSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!locationDelivery) return;
		if (!quickLat || !quickLng) {
			toast.error("Both Latitude and Longitude are required");
			return;
		}
		updateLocationMutation.mutate({
			id: locationDelivery.id,
			body: {
				lat: Number(quickLat),
				lng: Number(quickLng),
			},
		});
	};

	const handleProvinceToggle = (pCode: string) => {
		setSelectedProvinceCodes((prev) => {
			if (prev.includes(pCode)) {
				const next = prev.filter((c) => c !== pCode);
				if (pCode === primaryProvinceCode && next.length > 0) {
					setPrimaryProvinceCode(next[0]);
				}
				return next;
			} else {
				return [...prev, pCode];
			}
		});
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error(t("deliveries.nameRequired"));
			return;
		}
		if (!code.trim()) {
			toast.error(t("deliveries.codeRequired"));
			return;
		}
		if (!driverName.trim()) {
			toast.error(t("deliveries.driverRequired"));
			return;
		}
		if (!primaryPhone.trim()) {
			toast.error(t("deliveries.phoneRequired"));
			return;
		}

		// Ensure primary province is included in provinceCodes
		const finalProvinceCodes = Array.from(
			new Set([primaryProvinceCode, ...selectedProvinceCodes]),
		);

		const payload: DeliveryInput = {
			name: name.trim(),
			code: code.trim(),
			deliveryType,
			driverName: driverName.trim(),
			primaryPhone: primaryPhone.trim(),
			secondaryPhone: secondaryPhone.trim(),
			vehicleNumber: vehicleNumber.trim(),
			description: description.trim(),
			primaryProvinceCode,
			provinceCodes: finalProvinceCodes,
			lat: lat ? Number(lat) : null,
			lng: lng ? Number(lng) : null,
		};

		if (editingDelivery) {
			updateMutation.mutate({ id: editingDelivery.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	// Summary Metrics Calculations
	const allDeliveries = deliveriesData?.items || [];
	const activeCount = allDeliveries.filter(
		(d) => (d.status || (d.isActive ? "Active" : "Inactive")) === "Active",
	).length;
	const phnomPenhCount = allDeliveries.filter(
		(d) => d.primaryProvinceCode === "12" || d.provinceCodes?.includes("12"),
	).length;
	const totalCoveredProvinces = new Set(
		allDeliveries.flatMap((d) => d.provinceCodes || []),
	).size;

	const columns: ColumnDef<Delivery>[] = [
		{
			id: "code",
			header: t("deliveries.carrierCode"),
			accessorKey: "code",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md w-fit border border-primary/20">
						{row.code}
					</span>
				</div>
			),
		},
		{
			id: "name",
			header: t("deliveries.carrierName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-bold text-slate-900 dark:text-white text-sm">
						{row.name}
					</span>
					{row.company?.name && (
						<span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
							<Building2 className="h-3 w-3 text-slate-400" />
							{row.company.name}
						</span>
					)}
				</div>
			),
		},
		{
			id: "deliveryType",
			header: t("deliveries.deliveryType"),
			accessorKey: "deliveryType",
			cell: ({ row }) => {
				const rawType = row.deliveryType || "TRUCK";
				const typeKey = rawType.toUpperCase();
				const config = DELIVERY_TYPES.find(
					(t) => t.value === typeKey || t.label.toUpperCase() === typeKey,
				) || {
					label: rawType,
					color:
						"bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
				};
				return (
					<Badge
						variant="outline"
						className={`text-xs font-semibold ${config.color}`}
					>
						<Truck className="h-3 w-3 mr-1" />
						{config.label}
					</Badge>
				);
			},
		},
		{
			id: "driver",
			header: `${t("deliveries.driverName")} & ${t("deliveries.vehicleNumber")}`,
			accessorKey: "driverName",
			cell: ({ row }) => (
				<div className="flex flex-col gap-0.5">
					<span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
						<UserCheck className="h-3.5 w-3.5 text-indigo-500" />
						{row.driverName}
					</span>
					{row.vehicleNumber ? (
						<span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
							Plate:{" "}
							<strong className="text-slate-700 dark:text-slate-300">
								{row.vehicleNumber}
							</strong>
						</span>
					) : (
						<span className="text-[11px] text-slate-400 italic">
							No Vehicle Plate
						</span>
					)}
				</div>
			),
		},
		{
			id: "phones",
			header: t("deliveries.primaryPhone"),
			accessorKey: "primaryPhone",
			cell: ({ row }) => (
				<div className="flex flex-col gap-0.5 text-xs font-mono">
					<span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<Phone className="h-3.5 w-3.5 text-emerald-500" />
						{row.primaryPhone}
					</span>
					{row.secondaryPhone && (
						<span className="text-[11px] text-slate-500 flex items-center gap-1.5 pl-5">
							{row.secondaryPhone}
						</span>
					)}
				</div>
			),
		},
		{
			id: "primaryProvince",
			header: t("deliveries.provinceCoverage"),
			accessorKey: "primaryProvinceCode",
			cell: ({ row }) => {
				const primary =
					row.primaryProvince || getProvinceByCode(row.primaryProvinceCode);
				const totalProvinces =
					row.provinceCodes?.length || row.provinces?.length || 0;
				return (
					<div className="flex flex-col gap-1">
						<span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
							<MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
							{primary
								? `${primary.provinceEn} (${primary.provinceKh})`
								: "Phnom Penh"}
						</span>
						{totalProvinces > 1 ? (
							<span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
								+{totalProvinces - 1} extra province(s) covered
							</span>
						) : (
							<span className="text-[11px] text-slate-400">
								Single hub route
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "location",
			header: "GPS Location",
			cell: ({ row }) => {
				const hasLocation =
					row.lat !== undefined &&
					row.lat !== null &&
					row.lng !== undefined &&
					row.lng !== null;
				return hasLocation ? (
					<a
						href={`https://www.google.com/maps?q=${row.lat},${row.lng}`}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/50"
					>
						<Navigation className="h-3 w-3 shrink-0" />
						{Number(row.lat).toFixed(4)}, {Number(row.lng).toFixed(4)}
					</a>
				) : (
					<span className="text-slate-400 text-xs">—</span>
				);
			},
		},
		{
			id: "status",
			header: t("deliveries.status"),
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
			id: "actions",
			header: t("deliveries.actions"),
			cell: ({ row }) => {
				const delivery = row;
				const isActive =
					(delivery.status || (delivery.isActive ? "Active" : "Inactive")) ===
					"Active";
				const isPending =
					(deleteMutation.isPending &&
						deleteMutation.variables === delivery.id) ||
					(restoreMutation.isPending &&
						restoreMutation.variables === delivery.id);

				return (
					<div className="flex items-center gap-2">
						<button
							onClick={() => setViewingDelivery(delivery)}
							className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							title="View Carrier Details"
						>
							<Eye className="h-4 w-4" />
						</button>

						<button
							onClick={() => openLocationModal(delivery)}
							className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							title="Update GPS Location (PATCH /locations)"
						>
							<Navigation className="h-4 w-4 text-indigo-500" />
						</button>

						<button
							onClick={() => openEdit(delivery)}
							className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							title="Edit Carrier"
						>
							<Edit2 className="h-4 w-4" />
						</button>

						<div
							className="flex items-center gap-1.5 ml-1"
							title={isActive ? "Deactivate Carrier" : "Activate Carrier"}
						>
							<Switch
								checked={isActive}
								disabled={isPending}
								onCheckedChange={(checked) => {
									if (checked) {
										restoreMutation.mutate(delivery.id);
									} else {
										deleteMutation.mutate(delivery.id);
									}
								}}
							/>
						</div>
					</div>
				);
			},
		},
	];

	const isSaving = createMutation.isPending || updateMutation.isPending;

	return (
		<div className="space-y-4 pb-12">
			{/* Metrics Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
					<CardContent className="p-4 flex items-center gap-3.5">
						<div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
							<Truck className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("deliveries.title")}
							</p>
							<h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
								{deliveriesData?.total || 0}
							</h3>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
					<CardContent className="p-4 flex items-center gap-3.5">
						<div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
							<ShieldCheck className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("deliveries.activeFleets")}
							</p>
							<h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
								{activeCount}
							</h3>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
					<CardContent className="p-4 flex items-center gap-3.5">
						<div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
							<Navigation className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("deliveries.phnomPenhHubs")}
							</p>
							<h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
								{phnomPenhCount}
							</h3>
						</div>
					</CardContent>
				</Card>

				<Card className="rounded-2xl border-slate-200/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
					<CardContent className="p-4 flex items-center gap-3.5">
						<div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
							<Globe className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("deliveries.provincesCovered")}
							</p>
							<h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
								{totalCoveredProvinces} / 25
							</h3>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Data Table */}
			<DataTable<Delivery>
				data={deliveriesData?.items || []}
				columns={columns}
				getRowId={(d) => String(d.id)}
				hideHeader={true}
				hideImportExport={true}
				searchPlaceholder={t("deliveries.searchPlaceholder")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				domainFilterFields={DELIVERY_DOMAIN_FILTERS}
				primaryAction={
					<Button
						onClick={openCreate}
						className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
					>
						<Plus className="h-3.5 w-3.5" />
						<span>{t("deliveries.addCarrier", "Add Carrier")}</span>
					</Button>
				}
				manualPagination={true}
				totalCount={deliveriesData?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onEditRow={openEdit}
				onDeleteRow={(d) => deleteMutation.mutate(d.id)}
			/>

			{/* CREATE & EDIT MODAL */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={
					editingDelivery
						? t("deliveries.editCarrier")
						: t("deliveries.createCarrier")
				}
				subtitle={t("deliveries.modalSubtitle")}
				icon={<Truck className="h-5 w-5 text-indigo-600" />}
				size="lg"
				isLoading={isSaving}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton form="delivery-form" isLoading={isSaving}>
							{editingDelivery
								? t("common.saveChanges")
								: t("deliveries.createCarrier")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="delivery-form"
					onSubmit={handleSave}
					className="space-y-4 pt-1"
				>
					{/* Row 1: Code & Name */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label={`${t("deliveries.carrierName")} *`}
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Phnom Penh Express Truck 08"
							leftIcon={<Truck className="h-4 w-4 text-muted-foreground" />}
							required
						/>

						<ModernInput
							label={`${t("deliveries.carrierCode")} *`}
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder="e.g. DEL-TRK-08"
							leftIcon={<Building2 className="h-4 w-4 text-muted-foreground" />}
							required
						/>
					</div>

					{/* Row 2: Delivery Type & Driver Name */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernCombobox
							label={t("deliveries.deliveryType")}
							value={deliveryType}
							onChange={(val) => setDeliveryType(val)}
							options={deliveryTypeOptions}
							placeholder="Select carrier type or type custom..."
							leftIcon={<Truck className="h-4 w-4 text-muted-foreground" />}
							allowCustom={true}
							customActionLabel={(text) => `Use custom type: "${text}"`}
						/>

						<ModernInput
							label={`${t("deliveries.driverName")} *`}
							value={driverName}
							onChange={(e) => setDriverName(e.target.value)}
							placeholder="e.g. Sok Somnang"
							leftIcon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
							required
						/>
					</div>

					{/* Row 3: Phones & Vehicle Number */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<ModernInput
							label={`${t("deliveries.primaryPhone")} *`}
							value={primaryPhone}
							onChange={(e) => setPrimaryPhone(e.target.value)}
							placeholder="e.g. +85512345678"
							leftIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
							required
						/>

						<ModernInput
							label={t("deliveries.secondaryPhone")}
							value={secondaryPhone}
							onChange={(e) => setSecondaryPhone(e.target.value)}
							placeholder="e.g. +85515667788"
							leftIcon={<Phone className="h-4 w-4 text-muted-foreground" />}
						/>

						<ModernInput
							label={t("deliveries.vehicleNumber")}
							value={vehicleNumber}
							onChange={(e) => setVehicleNumber(e.target.value)}
							placeholder="e.g. PP-2A-8888"
							leftIcon={
								<Navigation className="h-4 w-4 text-muted-foreground" />
							}
						/>
					</div>

					{/* Row 4: Primary Province Selection */}
					<ModernSelect
						label={`${t("deliveries.primaryProvince")} *`}
						value={primaryProvinceCode}
						onChange={(newCode) => {
							if (!newCode) return;
							setPrimaryProvinceCode(newCode);
							if (!selectedProvinceCodes.includes(newCode)) {
								setSelectedProvinceCodes((prev) => [...prev, newCode]);
							}
							// If lat/lng not set yet, set coordinates to province center
							if (!lat || !lng) {
								const coords = getProvinceCoordinates(newCode);
								setLat(String(coords.lat));
								setLng(String(coords.lng));
							}
						}}
						options={provinceOptions}
						searchable={true}
						placeholder="Search and select primary province..."
						leftIcon={<MapPin className="h-4 w-4 text-rose-500" />}
					/>

					{/* Row 5: Covered Provinces Multi-Select Grid */}
					<div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
								{t("deliveries.provinceCoverage")} (
								{selectedProvinceCodes.length} selected)
							</Label>
							<button
								type="button"
								onClick={() =>
									setSelectedProvinceCodes(
										selectedProvinceCodes.length === CAMBODIA_PROVINCES.length
											? [primaryProvinceCode]
											: CAMBODIA_PROVINCES.map((p) => p.provinceCode),
									)
								}
								className="text-xs font-semibold text-primary hover:underline"
							>
								{selectedProvinceCodes.length === CAMBODIA_PROVINCES.length
									? "Clear All (Keep Primary)"
									: "Select All 25 Provinces"}
							</button>
						</div>

						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 pt-1">
							{CAMBODIA_PROVINCES.map((p) => {
								const isSelected = selectedProvinceCodes.includes(
									p.provinceCode,
								);
								const isPrimary = primaryProvinceCode === p.provinceCode;
								return (
									<label
										key={p.provinceCode}
										className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
											isPrimary
												? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
												: isSelected
													? "border-indigo-300 bg-indigo-50/70 text-indigo-900 dark:border-indigo-500/40 dark:bg-indigo-950/30 dark:text-indigo-200 font-semibold"
													: "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 hover:border-slate-300"
										}`}
									>
										<Checkbox
											checked={isSelected}
											onCheckedChange={() =>
												handleProvinceToggle(p.provinceCode)
											}
										/>
										<span className="truncate">
											{p.provinceEn}
											{isPrimary && " ★"}
										</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Row 6: Coordinates with Interactive Map Pinning */}
					<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
							<div>
								<div className="flex items-center gap-2">
									<MapPin className="h-4 w-4 text-rose-500 shrink-0" />
									<Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
										GPS Hub Location Pin (កូអរដោនេ GPS)
									</Label>
								</div>
								<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
									Click anywhere on the map or drag the pin to automatically set coordinates
								</p>
							</div>

							<div className="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onClick={() => captureGPS(false)}
									disabled={isGettingLocation}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors disabled:opacity-50"
								>
									{isGettingLocation ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin" />
									) : (
										<Navigation className="h-3.5 w-3.5 text-emerald-600" />
									)}
									<span>{isGettingLocation ? "Detecting GPS..." : "Use My GPS"}</span>
								</button>

								{lat && lng && (
									<button
										type="button"
										onClick={() => {
											setLat("");
											setLng("");
										}}
										className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
										title="Reset coordinates"
									>
										<RotateCcw className="h-3 w-3" />
										<span>Reset</span>
									</button>
								)}
							</div>
						</div>

						{/* Interactive Leaflet Map for Pinning */}
						<div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
							<LeafletMap
								height="260px"
								selectable={true}
								center={
									lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
										? [Number(lat), Number(lng)]
										: [
												getProvinceCoordinates(primaryProvinceCode).lat,
												getProvinceCoordinates(primaryProvinceCode).lng,
											]
								}
								zoom={lat && lng ? 14 : 11}
								selectedPosition={
									lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
										? { lat: Number(lat), lng: Number(lng) }
										: null
								}
								onSelectPosition={(pos) => {
									setLat(String(Number(pos.lat.toFixed(6))));
									setLng(String(Number(pos.lng.toFixed(6))));
								}}
							/>
						</div>

						{/* Manual Coordinates Input (Synced Bidirectionally) */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
							<ModernInput
								label="Latitude (រយៈទទឹង)"
								type="number"
								step="any"
								value={lat}
								onChange={(e) => setLat(e.target.value)}
								placeholder="e.g. 11.5564"
								leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
							/>

							<ModernInput
								label="Longitude (រយៈបណ្តោយ)"
								type="number"
								step="any"
								value={lng}
								onChange={(e) => setLng(e.target.value)}
								placeholder="e.g. 104.9282"
								leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
							/>
						</div>

						{lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng)) && (
							<div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
								<span className="font-mono">
									Current Coordinates: {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
								</span>
								<a
									href={`https://www.google.com/maps?q=${lat},${lng}`}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
								>
									<ExternalLink className="h-3 w-3" />
									Open in Google Maps
								</a>
							</div>
						)}
					</div>

					<ModernTextarea
						label={t("deliveries.description")}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Primary carrier for high-capacity shipments inside Phnom Penh..."
					/>
				</form>
			</ModernModal>

			{/* QUICK LOCATION UPDATE MODAL (PATCH /api/v1/deliveries/:id/locations) */}
			<ModernModal
				isOpen={locationModalOpen}
				onClose={() => setLocationModalOpen(false)}
				title="កែប្រែទីតាំង GPS (Update GPS Location)"
				subtitle={`កែប្រែកូអរដោនេ GPS សម្រាប់ ${locationDelivery?.name || ""}`}
				icon={<Navigation className="h-5 w-5 text-indigo-600" />}
				size="md"
				isLoading={updateLocationMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setLocationModalOpen(false)} />
						<ModernModalSubmitButton
							form="quick-location-form"
							isLoading={updateLocationMutation.isPending}
						>
							រក្សាទុកទីតាំង (Save Location)
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="quick-location-form"
					onSubmit={handleLocationSave}
					className="space-y-4 pt-1"
				>
					<div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
						ចំណាំ៖ មុខងារនេះហៅទៅកាន់ API <code className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">PATCH /deliveries/{locationDelivery?.id}/locations</code> ដោយផ្ទាល់។
					</div>

					<div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
								ចុចលើផែនទីដើម្បីកំណត់ទីតាំង (Click map to pin)
							</span>
							<button
								type="button"
								onClick={() => captureGPS(true)}
								disabled={isGettingQuickLocation}
								className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
							>
								{isGettingQuickLocation ? (
									<Loader2 className="h-3 w-3 animate-spin" />
								) : (
									<Navigation className="h-3 w-3 text-emerald-600" />
								)}
								<span>Use My GPS</span>
							</button>
						</div>

						<div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
							<LeafletMap
								height="220px"
								selectable={true}
								center={
									quickLat && quickLng && !isNaN(Number(quickLat)) && !isNaN(Number(quickLng))
										? [Number(quickLat), Number(quickLng)]
										: [11.5564, 104.9282]
								}
								zoom={quickLat && quickLng ? 14 : 12}
								selectedPosition={
									quickLat && quickLng && !isNaN(Number(quickLat)) && !isNaN(Number(quickLng))
										? { lat: Number(quickLat), lng: Number(quickLng) }
										: null
								}
								onSelectPosition={(pos) => {
									setQuickLat(String(Number(pos.lat.toFixed(6))));
									setQuickLng(String(Number(pos.lng.toFixed(6))));
								}}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<ModernInput
							label="Latitude (រយៈទទឹង) *"
							type="number"
							step="any"
							value={quickLat}
							onChange={(e) => setQuickLat(e.target.value)}
							placeholder="e.g. 11.556411"
							leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
							required
						/>

						<ModernInput
							label="Longitude (រយៈបណ្តោយ) *"
							type="number"
							step="any"
							value={quickLng}
							onChange={(e) => setQuickLng(e.target.value)}
							placeholder="e.g. 104.928213"
							leftIcon={<MapPin className="h-4 w-4 text-muted-foreground" />}
							required
						/>
					</div>
				</form>
			</ModernModal>

			{/* VIEW DETAILS MODAL */}
			<ModernModal
				isOpen={Boolean(viewingDelivery)}
				onClose={() => setViewingDelivery(null)}
				title={t("deliveries.carrierDetails")}
				subtitle={`Complete details and province coverage list for ${viewingDelivery?.name || ""}`}
				icon={<Eye className="h-5 w-5 text-indigo-600" />}
				size="md"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setViewingDelivery(null)}>
							{t("common.close")}
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				{viewingDelivery && (
					<div className="space-y-4 pt-1 text-xs">
						<div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-950/20 space-y-2">
							<div className="flex items-center justify-between">
								<span className="font-mono font-bold text-sm text-primary">
									{viewingDelivery.code}
								</span>
								<Badge
									variant="outline"
									className={
										viewingDelivery.status === "Active"
											? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
											: "bg-slate-500/10 text-slate-600 border-slate-500/20 font-bold"
									}
								>
									{viewingDelivery.status || "Active"}
								</Badge>
							</div>
							<h3 className="text-base font-extrabold text-slate-900 dark:text-white">
								{viewingDelivery.name}
							</h3>
							{viewingDelivery.description && (
								<p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
									{viewingDelivery.description}
								</p>
							)}
						</div>

						{/* GPS Coordinates Section */}
						<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
							<div className="space-y-0.5">
								<span className="text-[11px] font-bold text-slate-400 uppercase">
									GPS Coordinates
								</span>
								<p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
									<MapPin className="h-3.5 w-3.5 text-rose-500" />
									{viewingDelivery.lat !== undefined && viewingDelivery.lat !== null
										? `${viewingDelivery.lat}, ${viewingDelivery.lng}`
										: "Not configured"}
								</p>
							</div>
							{viewingDelivery.lat !== undefined && viewingDelivery.lat !== null && (
								<a
									href={`https://www.google.com/maps?q=${viewingDelivery.lat},${viewingDelivery.lng}`}
									target="_blank"
									rel="noreferrer"
									className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
								>
									<Navigation className="h-3.5 w-3.5" /> Google Maps
								</a>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
								<span className="text-[11px] font-bold text-slate-400 uppercase">
									{t("deliveries.driverName")}
								</span>
								<p className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
									<UserCheck className="h-3.5 w-3.5 text-indigo-500" />
									{viewingDelivery.driverName}
								</p>
							</div>

							<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
								<span className="text-[11px] font-bold text-slate-400 uppercase">
									{t("deliveries.vehicleNumber")}
								</span>
								<p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
									{viewingDelivery.vehicleNumber || "N/A"}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
								<span className="text-[11px] font-bold text-slate-400 uppercase">
									{t("deliveries.primaryPhone")}
								</span>
								<p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
									<Phone className="h-3.5 w-3.5 text-emerald-500" />
									{viewingDelivery.primaryPhone}
								</p>
							</div>

							<div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
								<span className="text-[11px] font-bold text-slate-400 uppercase">
									{t("deliveries.secondaryPhone")}
								</span>
								<p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">
									{viewingDelivery.secondaryPhone || "N/A"}
								</p>
							</div>
						</div>

						{/* Covered Provinces */}
						<div className="space-y-2 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
							<span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
								{t("deliveries.provinceCoverage")} (
								{viewingDelivery.provinces?.length ||
									viewingDelivery.provinceCodes?.length ||
									0}
								)
							</span>
							<div className="flex flex-wrap gap-1.5">
								{(
									viewingDelivery.provinces ||
									resolveDeliveryProvinces(
										viewingDelivery.primaryProvinceCode,
										viewingDelivery.provinceCodes,
									).provinces
								).map((prov) => {
									const isPrimary =
										prov.provinceCode === viewingDelivery.primaryProvinceCode;
									return (
										<span
											key={prov.provinceCode}
											className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
												isPrimary
													? "bg-primary text-primary-foreground shadow-2xs"
													: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
											}`}
										>
											<MapPin className="h-3 w-3" />
											{prov.provinceEn} ({prov.provinceKh})
										</span>
									);
								})}
							</div>
						</div>
					</div>
				)}
			</ModernModal>
		</div>
	);
}

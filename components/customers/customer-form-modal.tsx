"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi, usersApi, deliveriesApi } from "@/lib/api/endpoints";
import { Customer } from "@/lib/types";
import { CAMBODIA_PROVINCES } from "@/lib/data/provinces";
import { toast } from "sonner";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernSearchSelect,
	ModernImageUpload,
	SearchSelectOption,
} from "@/components/ui-custom/form-controls";
import { ModernButton } from "@/components/ui-custom/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LeafletMap } from "./leaflet-map";
import {
	MapPin,
	Users,
	Truck,
	Building,
	Navigation,
	Loader2,
	Phone,
	Sparkles,
} from "lucide-react";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	customer?: Customer | null;
}

import { useTranslation } from "@/lib/i18n/context";

export function CustomerFormModal({ isOpen, onClose, customer }: Props) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const isEditing = Boolean(customer?.id);

	const [form, setForm] = useState({
		name: "",
		merchantName: "",
		gender: "MALE",
		phoneNumber: "",
		contact: "",
		description: "",
		address: "",
		addressCode: "",
		lat: 11.5564 as number | undefined,
		lng: 104.9282 as number | undefined,
		isActive: true,
		users: [] as number[],
		deliveryIds: [] as number[],
		primaryDeliveryId: undefined as number | undefined,
		profileUrls: [] as string[],
	});

	const [isGettingLocation, setIsGettingLocation] = useState(false);

	// Fetch Users / Staff with search capability
	const { data: usersData, isLoading: isLoadingUsers } = useQuery({
		queryKey: ["all-users-selection"],
		queryFn: () => usersApi.list({ limit: 100 }),
		enabled: isOpen,
	});
	const availableUsers = usersData?.items || [];

	// Fetch Deliveries with search capability
	const { data: deliveriesData, isLoading: isLoadingDeliveries } = useQuery({
		queryKey: ["all-deliveries-selection"],
		queryFn: () => deliveriesApi.list({ limit: 100 }),
		enabled: isOpen,
	});
	const availableDeliveries = deliveriesData?.items || [];

	// Provinces
	const availableProvinces = CAMBODIA_PROVINCES;

	useEffect(() => {
		if (customer && isOpen) {
			const assignedUserIds =
				customer.staffInfos?.map((s) => Number(s.id)) ||
				(Array.isArray(customer.users)
					? customer.users.map((u: any) => Number(u?.id || u))
					: []);

			const assignedDeliveryIds =
				customer.deliveries?.map((d) => Number(d.id)) ||
				(Array.isArray(customer.deliveryIds)
					? customer.deliveryIds.map((d: any) => Number(d?.id || d))
					: []);

			const primaryId = customer.primaryDelivery?.id
				? Number(customer.primaryDelivery.id)
				: customer.primaryDeliveryId
					? Number(customer.primaryDeliveryId)
					: assignedDeliveryIds[0];

			const latNum =
				customer.lat !== undefined &&
				customer.lat !== null &&
				!isNaN(Number(customer.lat))
					? Number(customer.lat)
					: 11.5564;
			const lngNum =
				customer.lng !== undefined &&
				customer.lng !== null &&
				!isNaN(Number(customer.lng))
					? Number(customer.lng)
					: 104.9282;

			setForm({
				name: customer.name || "",
				merchantName: customer.merchantName || "",
				gender: (customer.gender || "MALE").toUpperCase(),
				phoneNumber: customer.phoneNumber || customer.phone || "",
				contact: customer.contact || "",
				description: customer.description || "",
				address: customer.address || "",
				addressCode: customer.addressCode || "",
				lat: latNum,
				lng: lngNum,
				isActive:
					customer.isActive !== undefined
						? customer.isActive
						: customer.active !== undefined
							? customer.active
							: true,
				users: assignedUserIds,
				deliveryIds: assignedDeliveryIds,
				primaryDeliveryId: primaryId,
				profileUrls:
					customer.profileUrls ||
					(customer.profileUrl ? [customer.profileUrl] : []),
			});
		} else if (isOpen) {
			setForm({
				name: "",
				merchantName: "",
				gender: "MALE",
				phoneNumber: "",
				contact: "",
				description: "",
				address: "",
				addressCode: "",
				lat: 11.5564,
				lng: 104.9282,
				isActive: true,
				users: [],
				deliveryIds: [],
				primaryDeliveryId: undefined,
				profileUrls: [],
			});
		}
	}, [customer, isOpen]);

	// Map users to SearchSelectOption format
	const userOptions: SearchSelectOption[] = useMemo(() => {
		return availableUsers.map((u: any) => {
			const name = u.profile
				? `${u.profile.firstname || ""} ${u.profile.lastname || ""}`.trim()
				: u.username || u.name;
			const rolesLabel = u.roles?.map((r: any) => r.name || r).join(", ");
			return {
				value: Number(u.id),
				label: name || `User #${u.id}`,
				subtitle: u.email || rolesLabel || `Staff ID: ${u.id}`,
				icon: <Users className="h-3.5 w-3.5 text-blue-500" />,
				badge: u.username || undefined,
				raw: u,
			};
		});
	}, [availableUsers]);

	// Map deliveries to SearchSelectOption format
	const deliveryOptions: SearchSelectOption[] = useMemo(() => {
		return availableDeliveries.map((d: any) => {
			const details = [
				d.code ? `Code: ${d.code}` : null,
				d.driverName ? `Driver: ${d.driverName}` : null,
				d.vehicleNumber ? `Plate: ${d.vehicleNumber}` : null,
			]
				.filter(Boolean)
				.join(" • ");

			return {
				value: Number(d.id),
				label: d.name || `Delivery Route #${d.id}`,
				subtitle: details || d.primaryPhone || "Standard Logistics Route",
				icon: <Truck className="h-3.5 w-3.5 text-purple-500" />,
				badge: d.code || undefined,
				raw: d,
			};
		});
	}, [availableDeliveries]);

	const captureGPS = () => {
		if (!navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}
		setIsGettingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setForm((prev) => ({
					...prev,
					lat: Number(pos.coords.latitude.toFixed(6)),
					lng: Number(pos.coords.longitude.toFixed(6)),
				}));
				setIsGettingLocation(false);
				toast.success("Current GPS location filled");
			},
			(err) => {
				setIsGettingLocation(false);
				toast.error("Could not capture GPS: " + err.message);
			},
			{ enableHighAccuracy: true },
		);
	};

	const saveMutation = useMutation({
		mutationFn: () => {
			const payload: any = {
				name: form.name.trim(),
				gender: form.gender,
				phoneNumber: form.phoneNumber.trim(),
				contact: form.contact.trim() || form.phoneNumber.trim(),
				merchantName: form.merchantName.trim() || undefined,
				lat: form.lat !== undefined ? Number(form.lat) : undefined,
				lng: form.lng !== undefined ? Number(form.lng) : undefined,
				description: form.description.trim() || undefined,
				profileUrls: form.profileUrls.length > 0 ? form.profileUrls : undefined,
				address: form.address.trim() || undefined,
				addressCode: form.addressCode || undefined,
				users: form.users.length > 0 ? form.users : undefined,
				deliveryIds: form.deliveryIds.length > 0 ? form.deliveryIds : undefined,
				primaryDeliveryId: form.primaryDeliveryId
					? Number(form.primaryDeliveryId)
					: undefined,
			};

			if (isEditing && customer?.id) {
				return customersApi.update(customer.id, payload);
			}
			return customersApi.create(payload);
		},
		onSuccess: () => {
			toast.success(
				isEditing
					? "Customer updated successfully"
					: "Customer created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			queryClient.invalidateQueries({
				queryKey: ["customer-active-provinces"],
			});
			if (customer?.id) {
				queryClient.invalidateQueries({
					queryKey: ["customer-detail", String(customer.id)],
				});
			}
			onClose();
		},
		onError: (error: any) => {
			const msg =
				error?.response?.data?.message ||
				error?.message ||
				"Failed to save customer";
			toast.error(msg);
		},
	});

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				isEditing
					? `${t("customers.editCustomer")} — ${customer?.name}`
					: t("customers.createCustomer")
			}
			subtitle={t("customers.modalSubtitle")}
			size="2xl"
		>
			<div className="space-y-5 py-2 max-h-[75vh] overflow-y-auto pr-1">
				{/* Basic Information */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
					<ModernInput
						label={`${t("customers.customerName")} *`}
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
						placeholder="E.g. Chornai Mart Kandal"
					/>

					<ModernInput
						label={t("customers.merchantName")}
						value={form.merchantName}
						onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
						placeholder="E.g. Angkor Mart Group"
					/>

					<ModernInput
						label={`${t("customers.primaryPhone")} *`}
						value={form.phoneNumber}
						onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
						placeholder="E.g. 078380331"
					/>

					<ModernInput
						label={t("customers.contactPerson")}
						value={form.contact}
						onChange={(e) => setForm({ ...form, contact: e.target.value })}
						placeholder="E.g. 078380331"
					/>

					<ModernSelect
						label={`${t("customers.gender")} *`}
						value={form.gender}
						onChange={(val) => setForm({ ...form, gender: val })}
						options={[
							{ value: "MALE", label: t("customers.male") },
							{ value: "FEMALE", label: t("customers.female") },
							{ value: "OTHER", label: t("customers.other") },
						]}
					/>

					<ModernSelect
						label={t("customers.provinceCode")}
						value={form.addressCode}
						onChange={(val) => setForm({ ...form, addressCode: val })}
						placeholder="Select province..."
						options={[
							{ value: "", label: "None / Custom Code" },
							...availableProvinces.map((p) => ({
								value: p.provinceCode,
								label: `${p.provinceEn} (${p.provinceKh}) - [${p.provinceCode}]`,
							})),
						]}
					/>
				</div>

				{/* Street Address */}
				<ModernInput
					label={t("customers.streetAddress")}
					value={form.address}
					onChange={(e) => setForm({ ...form, address: e.target.value })}
					placeholder="E.g. Street 200, Group 4, Sangkat 2, Sihanoukville Province, Cambodia"
				/>

				{/* Leaflet Map Coordinate Picker */}
				<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<MapPin className="h-4 w-4 text-rose-500" />
							<div>
								<span className="text-xs font-bold text-slate-900 dark:text-white block">
									{t("customers.selectGpsCoordinates")}
								</span>
								<span className="text-[11px] text-slate-500">
									Click anywhere on the map or drag the pin to set store
									coordinates
								</span>
							</div>
						</div>

						<ModernButton
							variant="outline"
							size="xs"
							onClick={captureGPS}
							disabled={isGettingLocation}
							isLoading={isGettingLocation}
							loadingText="Detecting GPS..."
							leftIcon={<Navigation className="h-3.5 w-3.5 text-emerald-600" />}
						>
							{t("customers.useMyGps")}
						</ModernButton>
					</div>

					{/* Interactive Leaflet Map */}
					<LeafletMap
						height="240px"
						selectable={true}
						selectedPosition={
							form.lat && form.lng
								? { lat: Number(form.lat), lng: Number(form.lng) }
								: null
						}
						onSelectPosition={(pos) =>
							setForm((prev) => ({
								...prev,
								lat: Number(pos.lat.toFixed(6)),
								lng: Number(pos.lng.toFixed(6)),
							}))
						}
					/>

					<div className="grid grid-cols-2 gap-3 pt-1">
						<ModernInput
							label={t("customers.selectedLatitude")}
							type="number"
							step="any"
							value={form.lat !== undefined ? String(form.lat) : ""}
							onChange={(e) =>
								setForm({
									...form,
									lat: e.target.value ? parseFloat(e.target.value) : undefined,
								})
							}
							placeholder="E.g. 10.6275"
						/>
						<ModernInput
							label={t("customers.selectedLongitude")}
							type="number"
							step="any"
							value={form.lng !== undefined ? String(form.lng) : ""}
							onChange={(e) =>
								setForm({
									...form,
									lng: e.target.value ? parseFloat(e.target.value) : undefined,
								})
							}
							placeholder="E.g. 103.5221"
						/>
					</div>
				</div>

				{/* Assigned Staff (Searchable Multi-Select with 500ms debounce delay) */}
				<ModernSearchSelect
					label={t("customers.assignedStaff")}
					description="Search and assign sales reps and account managers responsible for this customer."
					placeholder="Search and select staff members..."
					searchPlaceholder="Search staff by name, email, or role..."
					isMulti={true}
					debounceMs={500}
					options={userOptions}
					value={form.users}
					onChange={(newIds) => setForm({ ...form, users: newIds })}
				/>

				{/* Delivery Routes & Logistics (Searchable Multi-Select with Primary Route Support) */}
				<ModernSearchSelect
					label={t("customers.deliveryRoutes")}
					description="Search and select logistics trucks/routes. The star icon sets the primary delivery route."
					placeholder="Search and select delivery routes..."
					searchPlaceholder="Search route by code, name, driver, or truck plate..."
					isMulti={true}
					debounceMs={500}
					options={deliveryOptions}
					value={form.deliveryIds}
					onChange={(newIds) => {
						let primary = form.primaryDeliveryId;
						if (primary && !newIds.includes(Number(primary))) {
							primary = newIds[0];
						} else if (!primary && newIds.length > 0) {
							primary = newIds[0];
						}
						setForm({
							...form,
							deliveryIds: newIds,
							primaryDeliveryId: primary,
						});
					}}
					primaryValue={form.primaryDeliveryId}
					onSetPrimary={(primaryVal) =>
						setForm({ ...form, primaryDeliveryId: Number(primaryVal) })
					}
					primaryLabel="Primary"
				/>

				{/* Storefront & Public Profile Images (Multiple Image Upload) */}
				<ModernImageUpload
					label={t("customers.storefrontImages")}
					description="Upload multiple store storefront photos, branch images, or paste image web URLs."
					value={form.profileUrls}
					onChange={(urls) => setForm({ ...form, profileUrls: urls })}
					maxFiles={8}
					fallbackAvatar="/images/default-customer.png"
				/>

				{/* Description */}
				<ModernInput
					label={t("customers.description")}
					value={form.description}
					onChange={(e) => setForm({ ...form, description: e.target.value })}
					placeholder="E.g. Premium wholesale convenience store chain branch."
				/>
			</div>

			<ModernModalFooter>
				<ModernModalCancelButton onClick={onClose} />
				<ModernModalSubmitButton
					onClick={() => saveMutation.mutate()}
					isLoading={saveMutation.isPending}
					loadingText={isEditing ? "Updating..." : "Creating..."}
					disabled={!form.name.trim() || !form.phoneNumber.trim()}
				>
					{isEditing
						? t("customers.updateCustomer")
						: t("customers.createCustomer")}
				</ModernModalSubmitButton>
			</ModernModalFooter>
		</ModernModal>
	);
}

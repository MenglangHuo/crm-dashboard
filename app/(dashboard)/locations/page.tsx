"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { locationsApi } from "@/lib/api/endpoints";
import {
	Province,
	District,
	Commune,
	Village,
	AddressInfo,
	AdministrativeDivisionLevel,
	CreateAdministrativeDivisionInput,
	UpdateAdministrativeDivisionInput,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	MapPin,
	Search,
	Plus,
	Pencil,
	Copy,
	CheckCheck,
	RefreshCw,
	ChevronRight,
	Layers,
	Compass,
	Building,
	Home,
	Landmark,
	FileText,
	Globe,
	Sparkles,
	SlidersHorizontal,
	Table as TableIcon,
	LayoutGrid,
	Info,
	ArrowRight,
	ExternalLink,
	Hash,
	X,
	CheckCircle2,
	Eye,
	Building2,
	Map,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { useTranslation } from "@/lib/i18n/context";

// Helper getters for bilingual values
function getProvinceName(p: Province, lang: string = "en"): string {
	if (lang === "km") {
		return (
			p.provinceKh ||
			p.provinceNameKh ||
			p.nameKh ||
			p.provinceEn ||
			p.provinceNameEn ||
			p.name ||
			p.provinceCode
		);
	}
	return (
		p.provinceEn ||
		p.provinceNameEn ||
		p.nameEn ||
		p.name ||
		p.provinceKh ||
		p.provinceNameKh ||
		p.provinceCode
	);
}

function getDistrictName(d: District, lang: string = "en"): string {
	if (lang === "km") {
		return (
			d.districtKh ||
			d.districtNameKh ||
			d.nameKh ||
			d.districtEn ||
			d.districtNameEn ||
			d.name ||
			d.districtCode
		);
	}
	return (
		d.districtEn ||
		d.districtNameEn ||
		d.nameEn ||
		d.name ||
		d.districtKh ||
		d.districtNameKh ||
		d.districtCode
	);
}

function getCommuneName(c: Commune, lang: string = "en"): string {
	if (lang === "km") {
		return (
			c.communeKh ||
			c.communeNameKh ||
			c.nameKh ||
			c.communeEn ||
			c.communeNameEn ||
			c.name ||
			c.communeCode
		);
	}
	return (
		c.communeEn ||
		c.communeNameEn ||
		c.nameEn ||
		c.name ||
		c.communeKh ||
		c.communeNameKh ||
		c.communeCode
	);
}

function getVillageName(v: Village, lang: string = "en"): string {
	if (lang === "km") {
		return (
			v.villageKh ||
			v.villageNameKh ||
			v.nameKh ||
			v.villageEn ||
			v.villageNameEn ||
			v.name ||
			v.villageCode
		);
	}
	return (
		v.villageEn ||
		v.villageNameEn ||
		v.nameEn ||
		v.name ||
		v.villageKh ||
		v.villageNameKh ||
		v.villageCode
	);
}

// Zod validation schemas
const createDivisionSchema = z.object({
	level: z.enum(["PROVINCE", "DISTRICT", "COMMUNE", "VILLAGE"]),
	parentProvinceCode: z.string().optional(),
	parentDistrictCode: z.string().optional(),
	parentCommuneCode: z.string().optional(),
	nameKh: z.string().min(1, "Khmer name is required"),
	nameEn: z.string().min(1, "English name is required"),
	displayOrder: z.coerce.number().min(0).default(0),
	postalCode: z.string().optional(),
});

type CreateDivisionFormValues = z.infer<typeof createDivisionSchema>;

const editDivisionSchema = z.object({
	code: z.string().min(1, "Code is required"),
	level: z.enum(["PROVINCE", "DISTRICT", "COMMUNE", "VILLAGE"]),
	parentCode: z.string().nullable().optional(),
	nameKh: z.string().min(1, "Khmer name is required"),
	nameEn: z.string().min(1, "English name is required"),
	displayOrder: z.coerce.number().min(0).default(0),
	postalCode: z.string().optional(),
});

type EditDivisionFormValues = z.infer<typeof editDivisionSchema>;

export default function LocationsPage() {
	const { t, locale } = useTranslation();
	const queryClient = useQueryClient();

	// View mode: 'cascade' (hierarchical multi-column) or 'table' (flat list)
	const [viewMode, setViewMode] = useState<"cascade" | "table">("cascade");

	// Global quick search query
	const [globalSearch, setGlobalSearch] = useState("");
	const [isSearchFocused, setIsSearchFocused] = useState(false);

	// Active selection state in cascade view
	const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
	const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
	const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);
	const [selectedVillage, setSelectedVillage] = useState<Village | null>(null);

	// Column search filters
	const [provinceSearch, setProvinceSearch] = useState("");
	const [districtSearch, setDistrictSearch] = useState("");
	const [communeSearch, setCommuneSearch] = useState("");
	const [villageSearch, setVillageSearch] = useState("");

	// Flat table active tab & search
	const [tableTab, setTableTab] = useState<AdministrativeDivisionLevel>("PROVINCE");
	const [tableSearch, setTableSearch] = useState("");

	// Address Info Quick Inspector tool
	const [lookupCode, setLookupCode] = useState("");
	const [lookupLang, setLookupLang] = useState<"en" | "km">("en");
	const [activeLookupCode, setActiveLookupCode] = useState<string | null>(null);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	// Modal states
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [editingDivision, setEditingDivision] = useState<{
		code: string;
		level: AdministrativeDivisionLevel;
		parentCode?: string | null;
		nameKh: string;
		nameEn: string;
		postalCode?: string;
		displayOrder?: number;
	} | null>(null);

	// Copy to clipboard helper
	const copyText = (text: string, key: string, label: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		toast.success(`${label} copied: ${text}`);
		setTimeout(() => setCopiedKey(null), 2000);
	};

	// -------------------------------------------------------------
	// Data Queries
	// -------------------------------------------------------------

	// 1. Provinces Query
	const {
		data: provincesData,
		isLoading: isLoadingProvinces,
		refetch: refetchProvinces,
		isFetching: isFetchingProvinces,
	} = useQuery({
		queryKey: ["locations-provinces"],
		queryFn: () => locationsApi.getProvinces({ size: 100, page: 0 }),
	});

	const provinces: Province[] = useMemo(() => {
		return provincesData?.items || [];
	}, [provincesData]);

	// Auto-select first province (prefer Phnom Penh code 12)
	useEffect(() => {
		if (provinces.length > 0 && !selectedProvince) {
			const phnomPenh = provinces.find((p) => p.provinceCode === "12");
			setSelectedProvince(phnomPenh || provinces[0]);
		}
	}, [provinces, selectedProvince]);

	// 2. Districts Query (depends on selectedProvince)
	const {
		data: districtsData,
		isLoading: isLoadingDistricts,
		refetch: refetchDistricts,
		isFetching: isFetchingDistricts,
	} = useQuery({
		queryKey: ["locations-districts", selectedProvince?.provinceCode],
		queryFn: () =>
			selectedProvince
				? locationsApi.getDistricts(selectedProvince.provinceCode, { size: 100, page: 0 })
				: Promise.resolve({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
		enabled: !!selectedProvince?.provinceCode,
	});

	const districts: District[] = useMemo(() => {
		return districtsData?.items || [];
	}, [districtsData]);

	// Auto-select first district on province change
	useEffect(() => {
		if (districts.length > 0) {
			setSelectedDistrict(districts[0]);
		} else {
			setSelectedDistrict(null);
		}
		setSelectedCommune(null);
		setSelectedVillage(null);
	}, [selectedProvince?.provinceCode, districts]);

	// 3. Communes Query (depends on selectedDistrict)
	const {
		data: communesData,
		isLoading: isLoadingCommunes,
		refetch: refetchCommunes,
		isFetching: isFetchingCommunes,
	} = useQuery({
		queryKey: ["locations-communes", selectedDistrict?.districtCode],
		queryFn: () =>
			selectedDistrict
				? locationsApi.getCommunes(selectedDistrict.districtCode, { size: 100, page: 0 })
				: Promise.resolve({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
		enabled: !!selectedDistrict?.districtCode,
	});

	const communes: Commune[] = useMemo(() => {
		return communesData?.items || [];
	}, [communesData]);

	// Auto-select first commune on district change
	useEffect(() => {
		if (communes.length > 0) {
			setSelectedCommune(communes[0]);
		} else {
			setSelectedCommune(null);
		}
		setSelectedVillage(null);
	}, [selectedDistrict?.districtCode, communes]);

	// 4. Villages Query (depends on selectedCommune)
	const {
		data: villagesData,
		isLoading: isLoadingVillages,
		refetch: refetchVillages,
		isFetching: isFetchingVillages,
	} = useQuery({
		queryKey: ["locations-villages", selectedCommune?.communeCode],
		queryFn: () =>
			selectedCommune
				? locationsApi.getVillages(selectedCommune.communeCode, { size: 100, page: 0 })
				: Promise.resolve({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
		enabled: !!selectedCommune?.communeCode,
	});

	const villages: Village[] = useMemo(() => {
		return villagesData?.items || [];
	}, [villagesData]);

	// Auto-select first village
	useEffect(() => {
		if (villages.length > 0) {
			setSelectedVillage(villages[0]);
		} else {
			setSelectedVillage(null);
		}
	}, [selectedCommune?.communeCode, villages]);

	// 5. Address Info Inspector Query
	const {
		data: addressInfoData,
		isLoading: isLoadingAddressInfo,
		isFetching: isFetchingAddressInfo,
	} = useQuery({
		queryKey: ["locations-address-info", activeLookupCode, lookupLang],
		queryFn: () =>
			activeLookupCode ? locationsApi.getAddressInfo(activeLookupCode, lookupLang) : null,
		enabled: !!activeLookupCode,
	});

	const handleExecuteLookup = (codeToLookup?: string) => {
		const target = (codeToLookup || lookupCode).trim();
		if (!target) {
			toast.error("Please enter a location code to inspect (e.g. 12011103 or 08031006)");
			return;
		}
		setActiveLookupCode(target);
	};

	// -------------------------------------------------------------
	// Filtering
	// -------------------------------------------------------------
	const filteredProvinces = useMemo(() => {
		if (!provinceSearch.trim()) return provinces;
		const s = provinceSearch.toLowerCase();
		return provinces.filter(
			(p) =>
				p.provinceCode.toLowerCase().includes(s) ||
				(p.provinceEn || p.provinceNameEn || p.nameEn || p.name || "").toLowerCase().includes(s) ||
				(p.provinceKh || p.provinceNameKh || p.nameKh || "").includes(s),
		);
	}, [provinces, provinceSearch]);

	const filteredDistricts = useMemo(() => {
		if (!districtSearch.trim()) return districts;
		const s = districtSearch.toLowerCase();
		return districts.filter(
			(d) =>
				d.districtCode.toLowerCase().includes(s) ||
				(d.districtEn || d.districtNameEn || d.nameEn || d.name || "").toLowerCase().includes(s) ||
				(d.districtKh || d.districtNameKh || d.nameKh || "").includes(s),
		);
	}, [districts, districtSearch]);

	const filteredCommunes = useMemo(() => {
		if (!communeSearch.trim()) return communes;
		const s = communeSearch.toLowerCase();
		return communes.filter(
			(c) =>
				c.communeCode.toLowerCase().includes(s) ||
				(c.communeEn || c.communeNameEn || c.nameEn || c.name || "").toLowerCase().includes(s) ||
				(c.communeKh || c.communeNameKh || c.nameKh || "").includes(s),
		);
	}, [communes, communeSearch]);

	const filteredVillages = useMemo(() => {
		if (!villageSearch.trim()) return villages;
		const s = villageSearch.toLowerCase();
		return villages.filter(
			(v) =>
				v.villageCode.toLowerCase().includes(s) ||
				(v.villageEn || v.villageNameEn || v.nameEn || v.name || "").toLowerCase().includes(s) ||
				(v.villageKh || v.villageNameKh || v.nameKh || "").includes(s),
		);
	}, [villages, villageSearch]);

	// Global quick search matches
	const globalMatches = useMemo(() => {
		if (!globalSearch.trim()) return [];
		const s = globalSearch.toLowerCase().trim();
		const matchedProvinces = provinces
			.filter(
				(p) =>
					p.provinceCode.includes(s) ||
					(p.provinceEn || p.provinceNameEn || p.nameEn || "").toLowerCase().includes(s) ||
					(p.provinceKh || p.provinceNameKh || p.nameKh || "").includes(s),
			)
			.slice(0, 6)
			.map((p) => ({
				type: "PROVINCE" as const,
				code: p.provinceCode,
				nameEn: p.provinceEn || p.provinceNameEn || p.name || "",
				nameKh: p.provinceKh || p.provinceNameKh || "",
				parent: "Cambodia",
				item: p,
			}));

		const matchedDistricts = districts
			.filter(
				(d) =>
					d.districtCode.includes(s) ||
					(d.districtEn || d.districtNameEn || d.nameEn || "").toLowerCase().includes(s) ||
					(d.districtKh || d.districtNameKh || d.nameKh || "").includes(s),
			)
			.slice(0, 6)
			.map((d) => ({
				type: "DISTRICT" as const,
				code: d.districtCode,
				nameEn: d.districtEn || d.districtNameEn || d.name || "",
				nameKh: d.districtKh || d.districtNameKh || "",
				parent: selectedProvince ? getProvinceName(selectedProvince, locale) : "Province",
				item: d,
			}));

		return [...matchedProvinces, ...matchedDistricts];
	}, [globalSearch, provinces, districts, selectedProvince, locale]);

	// -------------------------------------------------------------
	// Create & Edit Division Forms
	// -------------------------------------------------------------
	const createForm = useForm<CreateDivisionFormValues>({
		resolver: zodResolver(createDivisionSchema) as any,
		defaultValues: {
			level: "PROVINCE",
			parentProvinceCode: "",
			parentDistrictCode: "",
			parentCommuneCode: "",
			nameKh: "",
			nameEn: "",
			displayOrder: 0,
			postalCode: "",
		},
	});

	const watchLevel = createForm.watch("level");
	const watchParentProvince = createForm.watch("parentProvinceCode");
	const watchParentDistrict = createForm.watch("parentDistrictCode");

	const { data: formDistrictsData } = useQuery({
		queryKey: ["locations-form-districts", watchParentProvince],
		queryFn: () =>
			watchParentProvince
				? locationsApi.getDistricts(watchParentProvince, { size: 100, page: 0 })
				: Promise.resolve({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
		enabled: !!watchParentProvince && (watchLevel === "COMMUNE" || watchLevel === "VILLAGE"),
	});
	const formDistricts = formDistrictsData?.items || [];

	const { data: formCommunesData } = useQuery({
		queryKey: ["locations-form-communes", watchParentDistrict],
		queryFn: () =>
			watchParentDistrict
				? locationsApi.getCommunes(watchParentDistrict, { size: 100, page: 0 })
				: Promise.resolve({ items: [], total: 0, page: 1, limit: 100, totalPages: 1 }),
		enabled: !!watchParentDistrict && watchLevel === "VILLAGE",
	});
	const formCommunes = formCommunesData?.items || [];

	const createMutation = useMutation({
		mutationFn: (values: CreateDivisionFormValues) => {
			let parentCode: string | null = null;
			if (values.level === "DISTRICT") {
				parentCode = values.parentProvinceCode || null;
			} else if (values.level === "COMMUNE") {
				parentCode = values.parentDistrictCode || null;
			} else if (values.level === "VILLAGE") {
				parentCode = values.parentCommuneCode || null;
			}

			const payload: CreateAdministrativeDivisionInput = {
				parentCode,
				level: values.level,
				nameKh: values.nameKh,
				nameEn: values.nameEn,
				displayOrder: values.displayOrder,
				postalCode: values.postalCode || undefined,
			};

			return locationsApi.createAdministrativeDivision(payload);
		},
		onSuccess: (_, variables) => {
			toast.success(`Successfully added new ${variables.level.toLowerCase()} division`);
			setIsCreateModalOpen(false);
			createForm.reset();
			queryClient.invalidateQueries({ queryKey: ["locations-provinces"] });
			if (selectedProvince) {
				queryClient.invalidateQueries({
					queryKey: ["locations-districts", selectedProvince.provinceCode],
				});
			}
			if (selectedDistrict) {
				queryClient.invalidateQueries({
					queryKey: ["locations-communes", selectedDistrict.districtCode],
				});
			}
			if (selectedCommune) {
				queryClient.invalidateQueries({
					queryKey: ["locations-villages", selectedCommune.communeCode],
				});
			}
		},
		onError: (err) => {
			toast.error(getErrorMessage(err));
		},
	});

	const openCreateModalForLevel = (level: AdministrativeDivisionLevel) => {
		createForm.reset({
			level,
			parentProvinceCode: selectedProvince?.provinceCode || "",
			parentDistrictCode: selectedDistrict?.districtCode || "",
			parentCommuneCode: selectedCommune?.communeCode || "",
			nameKh: "",
			nameEn: "",
			displayOrder: 0,
			postalCode: "",
		});
		setIsCreateModalOpen(true);
	};

	const editForm = useForm<EditDivisionFormValues>({
		resolver: zodResolver(editDivisionSchema) as any,
		defaultValues: {
			code: "",
			level: "PROVINCE",
			parentCode: null,
			nameKh: "",
			nameEn: "",
			displayOrder: 0,
			postalCode: "",
		},
	});

	const editMutation = useMutation({
		mutationFn: (values: EditDivisionFormValues) => {
			const payload: UpdateAdministrativeDivisionInput = {
				code: values.code,
				parentCode: values.parentCode || null,
				level: values.level,
				nameKh: values.nameKh,
				nameEn: values.nameEn,
				displayOrder: values.displayOrder,
				postalCode: values.postalCode || undefined,
			};

			return locationsApi.updateAdministrativeDivision(values.code, payload);
		},
		onSuccess: (_, variables) => {
			toast.success(`Division #${variables.code} updated successfully`);
			setIsEditModalOpen(false);
			queryClient.invalidateQueries({ queryKey: ["locations-provinces"] });
			if (selectedProvince) {
				queryClient.invalidateQueries({
					queryKey: ["locations-districts", selectedProvince.provinceCode],
				});
			}
			if (selectedDistrict) {
				queryClient.invalidateQueries({
					queryKey: ["locations-communes", selectedDistrict.districtCode],
				});
			}
			if (selectedCommune) {
				queryClient.invalidateQueries({
					queryKey: ["locations-villages", selectedCommune.communeCode],
				});
			}
		},
		onError: (err) => {
			toast.error(getErrorMessage(err));
		},
	});

	const openEditModal = (division: {
		code: string;
		level: AdministrativeDivisionLevel;
		parentCode?: string | null;
		nameKh: string;
		nameEn: string;
		postalCode?: string;
		displayOrder?: number;
	}) => {
		setEditingDivision(division);
		editForm.reset({
			code: division.code,
			level: division.level,
			parentCode: division.parentCode || null,
			nameKh: division.nameKh || "",
			nameEn: division.nameEn || "",
			displayOrder: division.displayOrder ?? 0,
			postalCode: division.postalCode || "",
		});
		setIsEditModalOpen(true);
	};

	return (
		<div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
			{/* Top Header & Breadcrumb */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1.5">
					<Breadcrumb>
						<BreadcrumbList className="text-xs">
							<BreadcrumbItem>
								<BreadcrumbLink
									href="/"
									className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
								>
									{t("locations.breadcrumb.dashboard", "Dashboard")}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<span className="text-slate-400">
									{t("locations.breadcrumb.company", "Company & Logistics")}
								</span>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="font-semibold text-slate-900 dark:text-white">
									{t("locations.breadcrumb.locations", "Locations")}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>

					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
							<MapPin className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
								{t("locations.title", "Administrative Locations")}
							</h1>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								{t(
									"locations.subtitle",
									"Cambodia geographic boundaries: 25 Provinces, Districts, Communes, Villages, and Address Code Resolution.",
								)}
							</p>
						</div>
					</div>
				</div>

				{/* Header Actions & Controls */}
				<div className="flex flex-wrap items-center gap-2.5">
					{/* Refresh button */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							refetchProvinces();
							if (selectedProvince) refetchDistricts();
							if (selectedDistrict) refetchCommunes();
							if (selectedCommune) refetchVillages();
							toast.info("Refreshed administrative boundaries");
						}}
						className="rounded-xl h-9 text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${
								isFetchingProvinces ||
								isFetchingDistricts ||
								isFetchingCommunes ||
								isFetchingVillages
									? "animate-spin text-primary"
									: ""
							}`}
						/>
						<span className="hidden sm:inline">Refresh</span>
					</Button>

					{/* View Toggle */}
					<div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setViewMode("cascade")}
							className={`h-7 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
								viewMode === "cascade"
									? "bg-white dark:bg-slate-900 text-primary shadow-xs font-bold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
							<span>Cascade Explorer</span>
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setViewMode("table")}
							className={`h-7 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
								viewMode === "table"
									? "bg-white dark:bg-slate-900 text-primary shadow-xs font-bold"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<TableIcon className="h-3.5 w-3.5" />
							<span>List View</span>
						</Button>
					</div>

					{/* Add Location Button */}
					<Button
						onClick={() => openCreateModalForLevel("PROVINCE")}
						className="rounded-xl h-9 px-4 text-xs font-bold gap-2 shadow-sm shadow-primary/25 cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						<span>{t("locations.addNew", "Add New Location")}</span>
					</Button>
				</div>
			</div>

			{/* Metric Overview Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
				<Card className="border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-2xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Provinces / Cities
							</p>
							<div className="flex items-baseline gap-2 mt-1">
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{provinces.length}
								</h3>
								<span className="text-xs font-medium text-blue-600 dark:text-blue-400">
									ខេត្ត / រាជធានី
								</span>
							</div>
						</div>
						<div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
							<Landmark className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-slate-900 shadow-2xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Districts / Khans
							</p>
							<div className="flex items-baseline gap-2 mt-1">
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{districts.length}
								</h3>
								<span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[130px]">
									{selectedProvince
										? `in ${getProvinceName(selectedProvince, locale)}`
										: "ស្រុក / ខណ្ឌ"}
								</span>
							</div>
						</div>
						<div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
							<Building className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-slate-900 shadow-2xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Communes / Sangkats
							</p>
							<div className="flex items-baseline gap-2 mt-1">
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{communes.length}
								</h3>
								<span className="text-xs font-medium text-purple-600 dark:text-purple-400 truncate max-w-[130px]">
									{selectedDistrict
										? `in ${getDistrictName(selectedDistrict, locale)}`
										: "ឃុំ / សង្កាត់"}
								</span>
							</div>
						</div>
						<div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
							<Home className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-2xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Villages / Phums
							</p>
							<div className="flex items-baseline gap-2 mt-1">
								<h3 className="text-2xl font-black text-slate-900 dark:text-white">
									{villages.length}
								</h3>
								<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate max-w-[130px]">
									{selectedCommune
										? `in ${getCommuneName(selectedCommune, locale)}`
										: "ភូមិ"}
								</span>
							</div>
						</div>
						<div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
							<MapPin className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Smart Global Search & Jump Bar */}
			<div className="relative">
				<div className="relative flex items-center">
					<Search className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
					<Input
						value={globalSearch}
						onChange={(e) => setGlobalSearch(e.target.value)}
						onFocus={() => setIsSearchFocused(true)}
						onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
						placeholder={t(
							"locations.globalSearchPlaceholder",
							"Quick jump to any Province or District (e.g. Phnom Penh, Siem Reap, Chamkar Mon, 12, 17)...",
						)}
						className="h-11 pl-11 pr-10 text-xs sm:text-sm rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs focus-visible:ring-primary"
					/>
					{globalSearch && (
						<button
							onClick={() => setGlobalSearch("")}
							className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Quick Search Autocomplete Dropdown */}
				{isSearchFocused && globalMatches.length > 0 && (
					<div className="absolute top-12 left-0 right-0 z-30 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 max-h-72 overflow-y-auto space-y-1">
						<div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
							Quick Matches ({globalMatches.length})
						</div>
						{globalMatches.map((m, idx) => (
							<div
								key={`${m.type}-${m.code}-${idx}`}
								onMouseDown={() => {
									if (m.type === "PROVINCE") {
										setSelectedProvince(m.item as Province);
										setSelectedDistrict(null);
										setSelectedCommune(null);
										setSelectedVillage(null);
										toast.success(`Selected ${m.nameEn}`);
									} else {
										setSelectedDistrict(m.item as District);
										toast.success(`Selected district ${m.nameEn}`);
									}
									setGlobalSearch("");
								}}
								className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs"
							>
								<div className="flex items-center gap-2.5">
									<Badge
										variant="outline"
										className={`text-[10px] font-mono px-1.5 py-0 ${
											m.type === "PROVINCE"
												? "border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
												: "border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300"
										}`}
									>
										{m.type} • {m.code}
									</Badge>
									<span className="font-bold text-slate-900 dark:text-white">
										{m.nameEn}
									</span>
									{m.nameKh && (
										<span className="text-slate-400 font-medium">({m.nameKh})</span>
									)}
								</div>
								<span className="text-[11px] text-slate-400 flex items-center gap-1">
									<span>{m.parent}</span>
									<ArrowRight className="h-3 w-3" />
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ========================================================================= */}
			{/* MODE 1: CASCADE MULTI-COLUMN HIERARCHICAL EXPLORER                        */}
			{/* ========================================================================= */}
			{viewMode === "cascade" && (
				<div className="space-y-3">
					{/* Interactive Breadcrumb Stepper */}
					<div className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs shadow-2xs">
						<button
							onClick={() => {
								setSelectedDistrict(null);
								setSelectedCommune(null);
								setSelectedVillage(null);
							}}
							className="font-bold text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
						>
							<Globe className="h-3.5 w-3.5 text-primary" />
							<span>Cambodia (កម្ពុជា)</span>
						</button>

						{selectedProvince && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
								<button
									onClick={() => {
										setSelectedCommune(null);
										setSelectedVillage(null);
									}}
									className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
										!selectedDistrict
											? "bg-white dark:bg-slate-800 text-primary font-bold shadow-2xs"
											: "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-primary"
									}`}
								>
									{getProvinceName(selectedProvince, locale)} ({selectedProvince.provinceCode})
								</button>
							</>
						)}

						{selectedDistrict && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
								<button
									onClick={() => setSelectedVillage(null)}
									className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
										!selectedCommune
											? "bg-white dark:bg-slate-800 text-primary font-bold shadow-2xs"
											: "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-primary"
									}`}
								>
									{getDistrictName(selectedDistrict, locale)} ({selectedDistrict.districtCode})
								</button>
							</>
						)}

						{selectedCommune && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
								<button
									className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
										!selectedVillage
											? "bg-white dark:bg-slate-800 text-primary font-bold shadow-2xs"
											: "text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-primary"
									}`}
								>
									{getCommuneName(selectedCommune, locale)} ({selectedCommune.communeCode})
								</button>
							</>
						)}

						{selectedVillage && (
							<>
								<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
								<span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
									{getVillageName(selectedVillage, locale)} ({selectedVillage.villageCode})
								</span>
							</>
						)}
					</div>

					{/* 4 Cascading Columns */}
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
						{/* COLUMN 1: PROVINCES */}
						<div className="flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden h-[600px]">
							{/* Header */}
							<div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="size-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
											1
										</div>
										<div>
											<h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
												Provinces / Cities
											</h2>
											<p className="text-[10px] text-muted-foreground">
												{filteredProvinces.length} of {provinces.length} provinces
											</p>
										</div>
									</div>

									<Button
										variant="ghost"
										size="sm"
										onClick={() => openCreateModalForLevel("PROVINCE")}
										className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
										title="Add Province"
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>

								{/* Column Search */}
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										value={provinceSearch}
										onChange={(e) => setProvinceSearch(e.target.value)}
										placeholder="Filter province..."
										className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
									/>
									{provinceSearch && (
										<button
											onClick={() => setProvinceSearch("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
							</div>

							{/* Province Item List */}
							<div className="flex-1 overflow-y-auto p-2 space-y-1">
								{isLoadingProvinces ? (
									<div className="p-8 text-center text-xs text-muted-foreground space-y-2">
										<RefreshCw className="h-5 w-5 animate-spin text-primary mx-auto" />
										<p>Loading provinces...</p>
									</div>
								) : filteredProvinces.length === 0 ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										No provinces match "{provinceSearch}"
									</div>
								) : (
									filteredProvinces.map((p) => {
										const isSelected = selectedProvince?.provinceCode === p.provinceCode;
										return (
											<div
												key={p.provinceCode}
												onClick={() => {
													setSelectedProvince(p);
													setSelectedDistrict(null);
													setSelectedCommune(null);
													setSelectedVillage(null);
												}}
												className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
													isSelected
														? "bg-primary/10 border-primary/40 text-primary font-bold shadow-xs"
														: "border-transparent bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
												}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													<Badge
														variant="outline"
														className={`font-mono text-[10px] px-1.5 py-0 shrink-0 ${
															isSelected
																? "border-primary text-primary bg-white dark:bg-slate-900"
																: "border-slate-300 dark:border-slate-700 text-slate-500"
														}`}
													>
														{p.provinceCode}
													</Badge>
													<div className="min-w-0 leading-tight">
														<p className="text-xs truncate font-semibold">
															{p.provinceEn || p.provinceNameEn || p.name || p.provinceCode}
														</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{p.provinceKh || p.provinceNameKh || "—"}
														</p>
													</div>
												</div>

												{/* Quick Actions */}
												<div className="flex items-center gap-1 shrink-0">
													<button
														onClick={(e) => {
															e.stopPropagation();
															openEditModal({
																code: p.provinceCode,
																level: "PROVINCE",
																parentCode: null,
																nameKh: p.provinceKh || p.provinceNameKh || "",
																nameEn: p.provinceEn || p.provinceNameEn || p.name || "",
																postalCode: p.postalCode,
																displayOrder: p.displayOrder,
															});
														}}
														className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-opacity"
														title="Edit Province"
													>
														<Pencil className="h-3 w-3" />
													</button>
													<ChevronRight
														className={`h-4 w-4 transition-transform ${
															isSelected
																? "text-primary translate-x-0.5"
																: "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
														}`}
													/>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* COLUMN 2: DISTRICTS */}
						<div className="flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden h-[600px]">
							{/* Header */}
							<div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="size-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
											2
										</div>
										<div>
											<h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
												Districts / Khans
											</h2>
											<p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
												{selectedProvince
													? `${filteredDistricts.length} in ${getProvinceName(selectedProvince, locale)}`
													: "Select Province"}
											</p>
										</div>
									</div>

									{selectedProvince && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => openCreateModalForLevel("DISTRICT")}
											className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
											title="Add District"
										>
											<Plus className="h-4 w-4" />
										</Button>
									)}
								</div>

								{/* Column Search */}
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										value={districtSearch}
										onChange={(e) => setDistrictSearch(e.target.value)}
										disabled={!selectedProvince}
										placeholder="Filter district..."
										className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
									/>
									{districtSearch && (
										<button
											onClick={() => setDistrictSearch("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
							</div>

							{/* District Item List */}
							<div className="flex-1 overflow-y-auto p-2 space-y-1">
								{!selectedProvince ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										Select a Province to view its Districts
									</div>
								) : isLoadingDistricts ? (
									<div className="p-8 text-center text-xs text-muted-foreground space-y-2">
										<RefreshCw className="h-5 w-5 animate-spin text-primary mx-auto" />
										<p>Loading districts...</p>
									</div>
								) : filteredDistricts.length === 0 ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										No districts found
									</div>
								) : (
									filteredDistricts.map((d) => {
										const isSelected = selectedDistrict?.districtCode === d.districtCode;
										return (
											<div
												key={d.districtCode}
												onClick={() => {
													setSelectedDistrict(d);
													setSelectedCommune(null);
													setSelectedVillage(null);
												}}
												className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
													isSelected
														? "bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs"
														: "border-transparent bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
												}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													<Badge
														variant="outline"
														className={`font-mono text-[10px] px-1.5 py-0 shrink-0 ${
															isSelected
																? "border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900"
																: "border-slate-300 dark:border-slate-700 text-slate-500"
														}`}
													>
														{d.districtCode}
													</Badge>
													<div className="min-w-0 leading-tight">
														<p className="text-xs truncate font-semibold">
															{d.districtEn || d.districtNameEn || d.name || d.districtCode}
														</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{d.districtKh || d.districtNameKh || "—"}
														</p>
													</div>
												</div>

												{/* Quick Actions */}
												<div className="flex items-center gap-1 shrink-0">
													<button
														onClick={(e) => {
															e.stopPropagation();
															openEditModal({
																code: d.districtCode,
																level: "DISTRICT",
																parentCode: selectedProvince?.provinceCode || null,
																nameKh: d.districtKh || d.districtNameKh || "",
																nameEn: d.districtEn || d.districtNameEn || d.name || "",
																postalCode: d.postalCode,
																displayOrder: d.displayOrder,
															});
														}}
														className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-opacity"
														title="Edit District"
													>
														<Pencil className="h-3 w-3" />
													</button>
													<ChevronRight
														className={`h-4 w-4 transition-transform ${
															isSelected
																? "text-indigo-600 dark:text-indigo-400 translate-x-0.5"
																: "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
														}`}
													/>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* COLUMN 3: COMMUNES */}
						<div className="flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden h-[600px]">
							{/* Header */}
							<div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="size-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
											3
										</div>
										<div>
											<h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
												Communes / Sangkats
											</h2>
											<p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
												{selectedDistrict
													? `${filteredCommunes.length} in ${getDistrictName(selectedDistrict, locale)}`
													: "Select District"}
											</p>
										</div>
									</div>

									{selectedDistrict && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => openCreateModalForLevel("COMMUNE")}
											className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
											title="Add Commune"
										>
											<Plus className="h-4 w-4" />
										</Button>
									)}
								</div>

								{/* Column Search */}
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										value={communeSearch}
										onChange={(e) => setCommuneSearch(e.target.value)}
										disabled={!selectedDistrict}
										placeholder="Filter commune..."
										className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
									/>
									{communeSearch && (
										<button
											onClick={() => setCommuneSearch("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
							</div>

							{/* Commune Item List */}
							<div className="flex-1 overflow-y-auto p-2 space-y-1">
								{!selectedDistrict ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										Select a District to view its Communes
									</div>
								) : isLoadingCommunes ? (
									<div className="p-8 text-center text-xs text-muted-foreground space-y-2">
										<RefreshCw className="h-5 w-5 animate-spin text-primary mx-auto" />
										<p>Loading communes...</p>
									</div>
								) : filteredCommunes.length === 0 ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										No communes found
									</div>
								) : (
									filteredCommunes.map((c) => {
										const isSelected = selectedCommune?.communeCode === c.communeCode;
										return (
											<div
												key={c.communeCode}
												onClick={() => {
													setSelectedCommune(c);
													setSelectedVillage(null);
												}}
												className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
													isSelected
														? "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold shadow-xs"
														: "border-transparent bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
												}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													<Badge
														variant="outline"
														className={`font-mono text-[10px] px-1.5 py-0 shrink-0 ${
															isSelected
																? "border-purple-400 text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-900"
																: "border-slate-300 dark:border-slate-700 text-slate-500"
														}`}
													>
														{c.communeCode}
													</Badge>
													<div className="min-w-0 leading-tight">
														<p className="text-xs truncate font-semibold">
															{c.communeEn || c.communeNameEn || c.name || c.communeCode}
														</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{c.communeKh || c.communeNameKh || "—"}
														</p>
													</div>
												</div>

												{/* Quick Actions */}
												<div className="flex items-center gap-1 shrink-0">
													<button
														onClick={(e) => {
															e.stopPropagation();
															openEditModal({
																code: c.communeCode,
																level: "COMMUNE",
																parentCode: selectedDistrict?.districtCode || null,
																nameKh: c.communeKh || c.communeNameKh || "",
																nameEn: c.communeEn || c.communeNameEn || c.name || "",
																postalCode: c.postalCode,
																displayOrder: c.displayOrder,
															});
														}}
														className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-opacity"
														title="Edit Commune"
													>
														<Pencil className="h-3 w-3" />
													</button>
													<ChevronRight
														className={`h-4 w-4 transition-transform ${
															isSelected
																? "text-purple-600 dark:text-purple-400 translate-x-0.5"
																: "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
														}`}
													/>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* COLUMN 4: VILLAGES */}
						<div className="flex flex-col rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm overflow-hidden h-[600px]">
							{/* Header */}
							<div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
											4
										</div>
										<div>
											<h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
												Villages / Phums
											</h2>
											<p className="text-[10px] text-muted-foreground truncate max-w-[140px]">
												{selectedCommune
													? `${filteredVillages.length} in ${getCommuneName(selectedCommune, locale)}`
													: "Select Commune"}
											</p>
										</div>
									</div>

									{selectedCommune && (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => openCreateModalForLevel("VILLAGE")}
											className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10 cursor-pointer"
											title="Add Village"
										>
											<Plus className="h-4 w-4" />
										</Button>
									)}
								</div>

								{/* Column Search */}
								<div className="relative">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										value={villageSearch}
										onChange={(e) => setVillageSearch(e.target.value)}
										disabled={!selectedCommune}
										placeholder="Filter village..."
										className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
									/>
									{villageSearch && (
										<button
											onClick={() => setVillageSearch("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
										>
											<X className="h-3 w-3" />
										</button>
									)}
								</div>
							</div>

							{/* Village Item List */}
							<div className="flex-1 overflow-y-auto p-2 space-y-1">
								{!selectedCommune ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										Select a Commune to view its Villages
									</div>
								) : isLoadingVillages ? (
									<div className="p-8 text-center text-xs text-muted-foreground space-y-2">
										<RefreshCw className="h-5 w-5 animate-spin text-primary mx-auto" />
										<p>Loading villages...</p>
									</div>
								) : filteredVillages.length === 0 ? (
									<div className="p-8 text-center text-xs text-muted-foreground">
										No villages found
									</div>
								) : (
									filteredVillages.map((v) => {
										const isSelected = selectedVillage?.villageCode === v.villageCode;
										return (
											<div
												key={v.villageCode}
												onClick={() => setSelectedVillage(v)}
												className={`group relative flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
													isSelected
														? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
														: "border-transparent bg-slate-50/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
												}`}
											>
												<div className="flex items-center gap-2 min-w-0">
													<Badge
														variant="outline"
														className={`font-mono text-[10px] px-1.5 py-0 shrink-0 ${
															isSelected
																? "border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900"
																: "border-slate-300 dark:border-slate-700 text-slate-500"
														}`}
													>
														{v.villageCode}
													</Badge>
													<div className="min-w-0 leading-tight">
														<p className="text-xs truncate font-semibold">
															{v.villageEn || v.villageNameEn || v.name || v.villageCode}
														</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{v.villageKh || v.villageNameKh || "—"}
														</p>
													</div>
												</div>

												{/* Copy Code & Edit */}
												<div className="flex items-center gap-1 shrink-0">
													<button
														onClick={(e) =>
															copyText(v.villageCode, `v-${v.villageCode}`, "Village Code", e)
														}
														className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-900"
														title="Copy Village Code"
													>
														{copiedKey === `v-${v.villageCode}` ? (
															<CheckCheck className="h-3 w-3 text-emerald-600" />
														) : (
															<Copy className="h-3 w-3" />
														)}
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															openEditModal({
																code: v.villageCode,
																level: "VILLAGE",
																parentCode: selectedCommune?.communeCode || null,
																nameKh: v.villageKh || v.villageNameKh || "",
																nameEn: v.villageEn || v.villageNameEn || v.name || "",
																postalCode: v.postalCode,
																displayOrder: v.displayOrder,
															});
														}}
														className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-opacity"
														title="Edit Village"
													>
														<Pencil className="h-3 w-3" />
													</button>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ========================================================================= */}
			{/* MODE 2: FLAT LIST / TABULAR VIEW                                          */}
			{/* ========================================================================= */}
			{viewMode === "table" && (
				<Card className="border-slate-200/90 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden">
					<CardContent className="p-4 space-y-4">
						{/* Tab selection & Search */}
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
								{(["PROVINCE", "DISTRICT", "COMMUNE", "VILLAGE"] as AdministrativeDivisionLevel[]).map(
									(lvl) => (
										<button
											key={lvl}
											onClick={() => setTableTab(lvl)}
											className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
												tableTab === lvl
													? "bg-white dark:bg-slate-900 text-primary shadow-xs"
													: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
											}`}
										>
											{lvl}
										</button>
									),
								)}
							</div>

							<div className="relative w-full sm:w-64">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
								<Input
									value={tableSearch}
									onChange={(e) => setTableSearch(e.target.value)}
									placeholder={`Search in ${tableTab.toLowerCase()}s...`}
									className="h-9 pl-9 text-xs rounded-xl bg-white dark:bg-slate-950"
								/>
							</div>
						</div>

						{/* Table Content */}
						<div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
							<table className="w-full text-xs text-left">
								<thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th className="py-3 px-4">Code</th>
										<th className="py-3 px-4">English Name</th>
										<th className="py-3 px-4">Khmer Name</th>
										<th className="py-3 px-4">Postal Code</th>
										<th className="py-3 px-4 text-right">Actions</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
									{tableTab === "PROVINCE" &&
										filteredProvinces.map((p) => (
											<tr key={p.provinceCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
												<td className="py-2.5 px-4 font-mono font-bold text-primary">
													{p.provinceCode}
												</td>
												<td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
													{p.provinceEn || p.provinceNameEn || p.name || "—"}
												</td>
												<td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
													{p.provinceKh || p.provinceNameKh || "—"}
												</td>
												<td className="py-2.5 px-4 font-mono text-slate-400">
													{p.postalCode || "—"}
												</td>
												<td className="py-2.5 px-4 text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															openEditModal({
																code: p.provinceCode,
																level: "PROVINCE",
																nameKh: p.provinceKh || p.provinceNameKh || "",
																nameEn: p.provinceEn || p.provinceNameEn || p.name || "",
																postalCode: p.postalCode,
																displayOrder: p.displayOrder,
															})
														}
														className="h-7 w-7 p-0"
													>
														<Pencil className="h-3 w-3" />
													</Button>
												</td>
											</tr>
										))}

									{tableTab === "DISTRICT" &&
										filteredDistricts.map((d) => (
											<tr key={d.districtCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
												<td className="py-2.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
													{d.districtCode}
												</td>
												<td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
													{d.districtEn || d.districtNameEn || d.name || "—"}
												</td>
												<td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
													{d.districtKh || d.districtNameKh || "—"}
												</td>
												<td className="py-2.5 px-4 font-mono text-slate-400">
													{d.postalCode || "—"}
												</td>
												<td className="py-2.5 px-4 text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															openEditModal({
																code: d.districtCode,
																level: "DISTRICT",
																parentCode: selectedProvince?.provinceCode || null,
																nameKh: d.districtKh || d.districtNameKh || "",
																nameEn: d.districtEn || d.districtNameEn || d.name || "",
																postalCode: d.postalCode,
																displayOrder: d.displayOrder,
															})
														}
														className="h-7 w-7 p-0"
													>
														<Pencil className="h-3 w-3" />
													</Button>
												</td>
											</tr>
										))}

									{tableTab === "COMMUNE" &&
										filteredCommunes.map((c) => (
											<tr key={c.communeCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
												<td className="py-2.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
													{c.communeCode}
												</td>
												<td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
													{c.communeEn || c.communeNameEn || c.name || "—"}
												</td>
												<td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
													{c.communeKh || c.communeNameKh || "—"}
												</td>
												<td className="py-2.5 px-4 font-mono text-slate-400">
													{c.postalCode || "—"}
												</td>
												<td className="py-2.5 px-4 text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															openEditModal({
																code: c.communeCode,
																level: "COMMUNE",
																parentCode: selectedDistrict?.districtCode || null,
																nameKh: c.communeKh || c.communeNameKh || "",
																nameEn: c.communeEn || c.communeNameEn || c.name || "",
																postalCode: c.postalCode,
																displayOrder: c.displayOrder,
															})
														}
														className="h-7 w-7 p-0"
													>
														<Pencil className="h-3 w-3" />
													</Button>
												</td>
											</tr>
										))}

									{tableTab === "VILLAGE" &&
										filteredVillages.map((v) => (
											<tr key={v.villageCode} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
												<td className="py-2.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
													{v.villageCode}
												</td>
												<td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
													{v.villageEn || v.villageNameEn || v.name || "—"}
												</td>
												<td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
													{v.villageKh || v.villageNameKh || "—"}
												</td>
												<td className="py-2.5 px-4 font-mono text-slate-400">
													{v.postalCode || "—"}
												</td>
												<td className="py-2.5 px-4 text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															openEditModal({
																code: v.villageCode,
																level: "VILLAGE",
																parentCode: selectedCommune?.communeCode || null,
																nameKh: v.villageKh || v.villageNameKh || "",
																nameEn: v.villageEn || v.villageNameEn || v.name || "",
																postalCode: v.postalCode,
																displayOrder: v.displayOrder,
															})
														}
														className="h-7 w-7 p-0"
													>
														<Pencil className="h-3 w-3" />
													</Button>
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Interactive Address Code Resolver Card */}
			<Card className="border-slate-200/90 dark:border-slate-800 shadow-sm rounded-3xl bg-gradient-to-r from-slate-50 via-white to-amber-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/10">
				<CardContent className="p-5">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
								<h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
									<Compass className="h-4 w-4 text-amber-500" />
									<span>Address Code Resolver & Full Path Inspector</span>
								</h3>
								<Badge
									variant="outline"
									className="text-[10px] font-mono px-2 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
								>
									/api/v1/locations/address_info/&#123;code&#125;
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground">
								Type any 8-digit village or administrative code (e.g.{" "}
								<span
									className="font-mono text-primary font-semibold cursor-pointer hover:underline"
									onClick={() => {
										setLookupCode("12011103");
										handleExecuteLookup("12011103");
									}}
								>
									12011103
								</span>
								,{" "}
								<span
									className="font-mono text-primary font-semibold cursor-pointer hover:underline"
									onClick={() => {
										setLookupCode("08031006");
										handleExecuteLookup("08031006");
									}}
								>
									08031006
								</span>
								) to resolve the full address hierarchy.
							</p>
						</div>

						{/* Lookup Input */}
						<div className="flex items-center gap-2 w-full md:w-auto">
							<div className="relative flex-1 md:w-56">
								<Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
								<Input
									value={lookupCode}
									onChange={(e) => setLookupCode(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleExecuteLookup();
									}}
									placeholder="e.g. 12011103"
									className="pl-8 text-xs font-mono h-9 rounded-xl bg-white dark:bg-slate-950"
								/>
							</div>

							{/* Lang Toggle */}
							<div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
								<button
									type="button"
									onClick={() => setLookupLang("en")}
									className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
										lookupLang === "en"
											? "bg-white dark:bg-slate-900 text-primary shadow-2xs"
											: "text-slate-500 hover:text-slate-900 dark:hover:text-white"
									}`}
								>
									EN
								</button>
								<button
									type="button"
									onClick={() => setLookupLang("km")}
									className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
										lookupLang === "km"
											? "bg-white dark:bg-slate-900 text-primary shadow-2xs"
											: "text-slate-500 hover:text-slate-900 dark:hover:text-white"
									}`}
								>
									KM
								</button>
							</div>

							<Button
								size="sm"
								onClick={() => handleExecuteLookup()}
								disabled={isLoadingAddressInfo || isFetchingAddressInfo}
								className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-2xs cursor-pointer"
							>
								{isLoadingAddressInfo || isFetchingAddressInfo ? (
									<RefreshCw className="h-3.5 w-3.5 animate-spin" />
								) : (
									<Search className="h-3.5 w-3.5" />
								)}
								<span>Inspect</span>
							</Button>
						</div>
					</div>

					{/* Lookup Result Box */}
					{activeLookupCode && (
						<div className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800">
							{isLoadingAddressInfo || isFetchingAddressInfo ? (
								<div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
									<RefreshCw className="h-4 w-4 animate-spin text-primary" />
									<span>Resolving administrative address for code #{activeLookupCode}...</span>
								</div>
							) : addressInfoData ? (
								<div className="bg-white dark:bg-slate-950/80 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
									<div className="flex flex-wrap items-center gap-2 text-xs">
										<Badge variant="secondary" className="font-mono text-xs font-bold px-2 py-0.5">
											#{activeLookupCode}
										</Badge>
										<div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
											<span className="font-bold text-slate-900 dark:text-white">
												{addressInfoData.province || "—"}
											</span>
											<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
											<span className="font-semibold text-slate-800 dark:text-slate-200">
												{addressInfoData.district || "—"}
											</span>
											<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
											<span className="text-slate-700 dark:text-slate-300">
												{addressInfoData.commune || "—"}
											</span>
											<ChevronRight className="h-3.5 w-3.5 text-slate-400" />
											<span className="text-primary font-bold">
												{addressInfoData.village || "—"}
											</span>
										</div>
									</div>

									<div className="flex items-center gap-2 self-end md:self-auto">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												const full = [
													addressInfoData.village,
													addressInfoData.commune,
													addressInfoData.district,
													addressInfoData.province,
													"Cambodia",
												]
													.filter(Boolean)
													.join(", ");
												copyText(full, "address-lookup", "Full address");
											}}
											className="h-8 px-3 rounded-xl text-xs gap-1.5 cursor-pointer shadow-2xs"
										>
											{copiedKey === "address-lookup" ? (
												<CheckCheck className="h-3 w-3 text-emerald-600" />
											) : (
												<Copy className="h-3 w-3" />
											)}
											<span>Copy Full Address</span>
										</Button>

										<Button
											variant="ghost"
											size="sm"
											onClick={() => setActiveLookupCode(null)}
											className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-slate-600"
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								</div>
							) : (
								<div className="py-3 text-center text-xs text-amber-600 dark:text-amber-400">
									No address information found for code #{activeLookupCode}.
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ========================================================================= */}
			{/* MODALS: CREATE & EDIT ADMINISTRATIVE DIVISION                             */}
			{/* ========================================================================= */}

			{/* Create Division Modal */}
			<ModernModal
				open={isCreateModalOpen}
				onOpenChange={setIsCreateModalOpen}
				title={t("locations.createModal.title", "Add Administrative Division")}
				description={t(
					"locations.createModal.desc",
					"Create a new geographic boundary division in the Cambodia address registry.",
				)}
				icon={<MapPin className="h-5 w-5 text-primary" />}
			>
				<form
					onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))}
					className="space-y-4 py-2"
				>
					<ModernSelect
						label="Division Level"
						value={createForm.watch("level")}
						onChange={(val) =>
							createForm.setValue("level", val as AdministrativeDivisionLevel)
						}
						options={[
							{ label: "Province / City (ខេត្ត / រាជធានី)", value: "PROVINCE" },
							{ label: "District / Khan (ស្រុក / ខណ្ឌ)", value: "DISTRICT" },
							{ label: "Commune / Sangkat (ឃុំ / សង្កាត់)", value: "COMMUNE" },
							{ label: "Village / Phum (ភូមិ)", value: "VILLAGE" },
						]}
						required
					/>

					{watchLevel !== "PROVINCE" && (
						<ModernSelect
							label="Parent Province"
							value={watchParentProvince || ""}
							onChange={(val) => createForm.setValue("parentProvinceCode", val)}
							options={provinces.map((p) => ({
								label: `${getProvinceName(p, locale)} (${p.provinceCode})`,
								value: p.provinceCode,
							}))}
							required
						/>
					)}

					{(watchLevel === "COMMUNE" || watchLevel === "VILLAGE") && (
						<ModernSelect
							label="Parent District"
							value={watchParentDistrict || ""}
							onChange={(val) => createForm.setValue("parentDistrictCode", val)}
							options={formDistricts.map((d) => ({
								label: `${getDistrictName(d, locale)} (${d.districtCode})`,
								value: d.districtCode,
							}))}
							required
						/>
					)}

					{watchLevel === "VILLAGE" && (
						<ModernSelect
							label="Parent Commune"
							value={createForm.watch("parentCommuneCode") || ""}
							onChange={(val) => createForm.setValue("parentCommuneCode", val)}
							options={formCommunes.map((c) => ({
								label: `${getCommuneName(c, locale)} (${c.communeCode})`,
								value: c.communeCode,
							}))}
							required
						/>
					)}

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label="English Name"
							placeholder="e.g. Phnom Penh"
							{...createForm.register("nameEn")}
							error={createForm.formState.errors.nameEn?.message}
							required
						/>
						<ModernInput
							label="Khmer Name"
							placeholder="e.g. ភ្នំពេញ"
							{...createForm.register("nameKh")}
							error={createForm.formState.errors.nameKh?.message}
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label="Postal Code (Optional)"
							placeholder="e.g. 120000"
							{...createForm.register("postalCode")}
						/>
						<ModernInput
							label="Display Order"
							type="number"
							placeholder="0"
							{...createForm.register("displayOrder")}
						/>
					</div>

					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsCreateModalOpen(false)} />
						<ModernModalSubmitButton loading={createMutation.isPending}>
							{createMutation.isPending ? "Creating..." : "Create Division"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>

			{/* Edit Division Modal */}
			<ModernModal
				open={isEditModalOpen}
				onOpenChange={setIsEditModalOpen}
				title={t("locations.editModal.title", "Edit Administrative Division")}
				description={t(
					"locations.editModal.desc",
					"Update geographic name, postal code, or display sorting.",
				)}
				icon={<Pencil className="h-5 w-5 text-primary" />}
			>
				<form
					onSubmit={editForm.handleSubmit((d) => editMutation.mutate(d))}
					className="space-y-4 py-2"
				>
					<div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
						<span className="text-slate-500 font-medium">Division Code & Level:</span>
						<Badge variant="outline" className="font-mono font-bold">
							#{editingDivision?.code} ({editingDivision?.level})
						</Badge>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label="English Name"
							{...editForm.register("nameEn")}
							error={editForm.formState.errors.nameEn?.message}
							required
						/>
						<ModernInput
							label="Khmer Name"
							{...editForm.register("nameKh")}
							error={editForm.formState.errors.nameKh?.message}
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<ModernInput
							label="Postal Code (Optional)"
							{...editForm.register("postalCode")}
						/>
						<ModernInput
							label="Display Order"
							type="number"
							{...editForm.register("displayOrder")}
						/>
					</div>

					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsEditModalOpen(false)} />
						<ModernModalSubmitButton loading={editMutation.isPending}>
							{editMutation.isPending ? "Saving Changes..." : "Save Changes"}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				</form>
			</ModernModal>
		</div>
	);
}

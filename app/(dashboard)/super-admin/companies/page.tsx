"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { companiesApi, CompanyInput } from "@/lib/api/endpoints";
import { Company, CompanySubscriptionInfo } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	Building2,
	Sparkles,
	CheckCircle2,
	XCircle,
	AlertCircle,
	Calendar,
	Clock,
	MapPin,
	Mail,
	Phone,
	GitBranch,
	ExternalLink,
	Copy,
	CheckCheck,
	Pencil,
	Eye,
	RefreshCw,
	RotateCcw,
	ShieldCheck,
	FileText,
	Users,
	CreditCard,
	Compass,
	Navigation,
	Globe,
	Tag,
	Plus,
	ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	DataTable,
	ColumnDef,
	UserDetailCell,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
	ModernSwitch,
} from "@/components/ui-custom/form-controls";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
} from "@/components/ui-custom/modern-tabs";
import { useTranslation } from "@/lib/i18n/context";

// Form validation schema
const companyFormSchema = z.object({
	name: z.string().min(2, "Company name is required"),
	username: z.string().optional(),
	email: z.string().email("Valid email address is required"),
	phone: z.string().min(3, "Valid phone number is required"),
	address: z.string().min(2, "Address is required"),
	note: z.string().optional(),
	lat: z.coerce.number().optional(),
	lng: z.coerce.number().optional(),
	enableBranch: z.boolean().default(false),
	active: z.boolean().default(true),
	ownerUsername: z.string().optional(),
	ownerPassword: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function CompaniesPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// State Management
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("ALL");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [sortBy, setSortBy] = useState("createdAt");
	const [orderBy, setOrderBy] = useState<"ASC" | "DESC">("DESC");

	// Modals & Interactivity State
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingCompany, setEditingCompany] = useState<Company | null>(null);
	const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
	const [togglingId, setTogglingId] = useState<string | number | null>(null);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	// Fetch Companies List
	const { data, isLoading, refetch, isRefetching } = useQuery({
		queryKey: [
			"companies",
			{ page, pageSize, search, statusFilter, sortBy, orderBy },
		],
		queryFn: () =>
			companiesApi.list({
				page,
				limit: pageSize,
				search,
				includeDeleted: true,
				sortBy,
				orderBy,
			}),
	});

	// Fetch detailed info for viewing modal
	const { data: detailedCompany } = useQuery({
		queryKey: ["company-detail", viewingCompany?.id],
		queryFn: () =>
			viewingCompany ? companiesApi.get(viewingCompany.id) : null,
		enabled: !!viewingCompany,
	});

	const activeCompanyDetails = detailedCompany || viewingCompany;

	// Create Form
	const createForm = useForm<CompanyFormValues>({
		resolver: zodResolver(companyFormSchema) as any,
		defaultValues: {
			name: "",
			username: "",
			email: "",
			phone: "",
			address: "",
			note: "",
			lat: undefined,
			lng: undefined,
			enableBranch: false,
			active: true,
			ownerUsername: "",
			ownerPassword: "",
		},
	});

	// Edit Form
	const editForm = useForm<CompanyFormValues>({
		resolver: zodResolver(companyFormSchema) as any,
		defaultValues: {
			name: "",
			username: "",
			email: "",
			phone: "",
			address: "",
			note: "",
			lat: undefined,
			lng: undefined,
			enableBranch: false,
			active: true,
			ownerUsername: "",
			ownerPassword: "",
		},
	});

	// Mutations
	const createMutation = useMutation({
		mutationFn: (values: CompanyFormValues) => {
			const payload: CompanyInput = {
				name: values.name.trim(),
				username: values.username?.trim() || values.ownerUsername?.trim(),
				email: values.email.trim(),
				phone: values.phone.trim(),
				phoneNumber: values.phone.trim(),
				address: values.address.trim(),
				description: values.note?.trim() || "",
				note: values.note?.trim() || "",
				lat: values.lat,
				lng: values.lng,
				enableBranch: values.enableBranch,
				active: values.active,
				ownerUsername: values.ownerUsername?.trim(),
				ownerPassword: values.ownerPassword?.trim(),
			};
			return companiesApi.create(payload);
		},
		onSuccess: (res) => {
			toast.success(
				res?.name
					? `Company "${res.name}" created successfully`
					: "Company created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			setIsCreateOpen(false);
			createForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			values,
		}: {
			id: string | number;
			values: CompanyFormValues;
		}) => {
			const payload: Partial<CompanyInput> = {
				name: values.name.trim(),
				username: values.username?.trim(),
				email: values.email.trim(),
				phone: values.phone.trim(),
				phoneNumber: values.phone.trim(),
				address: values.address.trim(),
				description: values.note?.trim() || "",
				note: values.note?.trim() || "",
				lat: values.lat,
				lng: values.lng,
				enableBranch: values.enableBranch,
				active: values.active,
			};
			return companiesApi.update(id, payload);
		},
		onSuccess: (res) => {
			toast.success(
				res?.name
					? `Company "${res.name}" updated successfully`
					: "Company updated successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			if (viewingCompany && String(viewingCompany.id) === String(res?.id)) {
				setViewingCompany(res);
			}
			setEditingCompany(null);
			editForm.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => companiesApi.remove(id),
		onSuccess: () => {
			toast.success("Company marked as inactive / soft-deleted");
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			if (viewingCompany) setViewingCompany(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const restoreMutation = useMutation({
		mutationFn: (id: string | number) => companiesApi.restore(id),
		onSuccess: () => {
			toast.success("Company restored and reactivated");
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			if (viewingCompany) setViewingCompany(null);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const toggleActiveMutation = useMutation({
		mutationFn: (company: Company) => {
			const nextActive = !company.active;
			setTogglingId(company.id);
			return companiesApi.update(company.id, {
				active: nextActive,
				isActive: nextActive,
			});
		},
		onSuccess: (res) => {
			toast.success(`Company "${res.name}" active status updated`);
			queryClient.invalidateQueries({ queryKey: ["companies"] });
			if (viewingCompany && String(viewingCompany.id) === String(res?.id)) {
				setViewingCompany(res);
			}
		},
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: () => setTogglingId(null),
	});

	// Open Create Modal
	const openCreateModal = () => {
		createForm.reset({
			name: "",
			username: "",
			email: "",
			phone: "",
			address: "",
			note: "",
			lat: undefined,
			lng: undefined,
			enableBranch: false,
			active: true,
			ownerUsername: "",
			ownerPassword: "",
		});
		setIsCreateOpen(true);
	};

	// Open Edit Modal
	const openEditModal = (company: Company) => {
		setEditingCompany(company);
		editForm.reset({
			name: company.name || "",
			username: company.username || "",
			email: company.email || "",
			phone: company.phone || company.phoneNumber || "",
			address: company.address || "",
			note: company.note || company.description || "",
			lat: typeof company.lat === "number" ? company.lat : undefined,
			lng: typeof company.lng === "number" ? company.lng : undefined,
			enableBranch: Boolean(company.enableBranch),
			active: company.active !== false,
			ownerUsername: company.username || "",
			ownerPassword: "",
		});
	};

	// Form Handlers
	const handleCreateSubmit = (values: CompanyFormValues) => {
		createMutation.mutate(values);
	};

	const handleEditSubmit = (values: CompanyFormValues) => {
		if (!editingCompany) return;
		updateMutation.mutate({ id: editingCompany.id, values });
	};

	// Clipboard Helper
	const copyToClipboard = (
		text: string,
		key: string,
		label: string,
		e?: React.MouseEvent,
	) => {
		if (e) e.stopPropagation();
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		toast.success(`${label} copied to clipboard`);
		setTimeout(() => setCopiedKey(null), 2000);
	};

	// Date Formatting Helper
	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return "—";
		try {
			const parsedStr = dateStr.includes("T")
				? dateStr
				: dateStr.replace(" ", "T");
			const d = new Date(parsedStr);
			if (isNaN(d.getTime())) return dateStr;
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return dateStr;
		}
	};

	// Subscription calculation helper
	const getSubscriptionInfo = (sub?: CompanySubscriptionInfo | null) => {
		if (!sub) return null;
		const status = (sub.status || "TRIAL").toUpperCase();
		const planName = sub.planName || "Free Tier";
		const price = typeof sub.planPrice === "number" ? sub.planPrice : 0;
		const billingCycle = (sub.billingCycle || "FREE_TIER").toUpperCase();

		let daysLeft: number | null = null;
		let totalDays: number | null = null;
		let progressPercent = 100;

		if (sub.endDate) {
			try {
				const end = new Date(
					sub.endDate.includes("T")
						? sub.endDate
						: sub.endDate.replace(" ", "T"),
				).getTime();
				const now = Date.now();
				const diffMs = end - now;
				daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

				if (sub.startDate) {
					const start = new Date(
						sub.startDate.includes("T")
							? sub.startDate
							: sub.startDate.replace(" ", "T"),
					).getTime();
					const totalMs = Math.max(1, end - start);
					const passedMs = Math.max(0, Math.min(totalMs, now - start));
					progressPercent = Math.round((passedMs / totalMs) * 100);
					totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
				}
			} catch {}
		}

		return {
			status,
			planName,
			price,
			billingCycle,
			daysLeft,
			totalDays,
			progressPercent,
			startDate: sub.startDate,
			endDate: sub.endDate,
		};
	};

	// Render Plan Tier Badge
	const renderPlanBadge = (sub?: CompanySubscriptionInfo | null) => {
		if (!sub) {
			return (
				<Badge
					variant="outline"
					className="text-[11px] font-medium text-slate-500 border-slate-200 dark:border-slate-800"
				>
					No Plan
				</Badge>
			);
		}

		const planLower = (sub.planName || "").toLowerCase();
		const isFree =
			planLower.includes("free") ||
			(sub.billingCycle || "").toUpperCase() === "FREE_TIER" ||
			sub.planPrice === 0;
		const isPro = planLower.includes("pro") || planLower.includes("enterprise");
		const isStarter = planLower.includes("starter");

		if (isFree) {
			return (
				<Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-[11px] font-semibold gap-1.5 shadow-2xs">
					<Sparkles className="h-3 w-3 text-sky-600 dark:text-sky-400" />
					<span>{sub.planName || "Free Tier"}</span>
				</Badge>
			);
		}

		if (isPro) {
			return (
				<Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] font-semibold gap-1.5 shadow-2xs">
					<CreditCard className="h-3 w-3 text-purple-600 dark:text-purple-400" />
					<span>{sub.planName || "Pro Enterprise"}</span>
				</Badge>
			);
		}

		if (isStarter) {
			return (
				<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold gap-1.5 shadow-2xs">
					<Tag className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
					<span>{sub.planName || "CRM Starter"}</span>
				</Badge>
			);
		}

		return (
			<Badge
				variant="outline"
				className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 border-indigo-200 bg-indigo-50/50"
			>
				{sub.planName}
			</Badge>
		);
	};

	// Render Subscription Status Badge
	const renderSubscriptionStatus = (sub?: CompanySubscriptionInfo | null) => {
		if (!sub) return null;
		const subInfo = getSubscriptionInfo(sub);
		if (!subInfo) return null;

		const { status, daysLeft } = subInfo;

		if (status === "TRIAL") {
			return (
				<div className="flex items-center gap-1.5">
					<Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-bold gap-1 shadow-2xs">
						<Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
						<span>TRIAL</span>
					</Badge>
					{typeof daysLeft === "number" && (
						<span
							className={`text-[10px] font-semibold ${
								daysLeft <= 3
									? "text-rose-600 dark:text-rose-400 animate-pulse"
									: "text-amber-600 dark:text-amber-400"
							}`}
						>
							{daysLeft > 0 ? `${daysLeft}d left` : "Ending today"}
						</span>
					)}
				</div>
			);
		}

		if (status === "ACTIVE") {
			return (
				<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold gap-1 shadow-2xs">
					<CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
					<span>ACTIVE</span>
				</Badge>
			);
		}

		if (status === "EXPIRED") {
			return (
				<Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[10px] font-bold gap-1 shadow-2xs">
					<AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
					<span>EXPIRED</span>
				</Badge>
			);
		}

		return (
			<Badge
				variant="outline"
				className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 border-slate-200"
			>
				{status}
			</Badge>
		);
	};

	// Companies List & Computed Statistics
	const companiesList = data?.items || [];
	const totalCompanies = data?.total || 0;

	// Filtered list based on statusFilter tab
	const displayCompanies = useMemo(() => {
		if (statusFilter === "ALL") return companiesList;
		if (statusFilter === "ACTIVE")
			return companiesList.filter((c) => c.active && !c.deletedAt);
		if (statusFilter === "TRIAL")
			return companiesList.filter(
				(c) =>
					(c.subscription?.status || "").toUpperCase() === "TRIAL" ||
					(c.subscription?.billingCycle || "").toUpperCase() === "FREE_TIER",
			);
		if (statusFilter === "PAID")
			return companiesList.filter(
				(c) =>
					(c.subscription?.planPrice || 0) > 0 &&
					(c.subscription?.status || "").toUpperCase() === "ACTIVE",
			);
		if (statusFilter === "DELETED")
			return companiesList.filter((c) => c.deletedAt || !c.active);
		return companiesList;
	}, [companiesList, statusFilter]);

	const activeCompaniesCount = companiesList.filter(
		(c) => c.active && !c.deletedAt,
	).length;
	const trialCompaniesCount = companiesList.filter(
		(c) =>
			(c.subscription?.status || "").toUpperCase() === "TRIAL" ||
			(c.subscription?.billingCycle || "").toUpperCase() === "FREE_TIER",
	).length;
	const paidCompaniesCount = companiesList.filter(
		(c) =>
			(c.subscription?.planPrice || 0) > 0 &&
			(c.subscription?.status || "").toUpperCase() === "ACTIVE",
	).length;
	const deletedCompaniesCount = companiesList.filter(
		(c) => c.deletedAt || !c.active,
	).length;
	const multiBranchCount = companiesList.filter((c) => c.enableBranch).length;
	const geoTaggedCount = companiesList.filter(
		(c) => typeof c.lat === "number" && typeof c.lng === "number",
	).length;

	// Table Columns Definition
	const columns: ColumnDef<Company>[] = [
		{
			id: "company",
			header: t("superAdmin.companies.columns.companyOwner", "Company & Owner"),
			accessorFn: (c) => `${c.name} ${c.username || ""} ${c.id}`,
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-3">
					<UserDetailCell
						name={row.name}
						subtitle={row.username ? `@${row.username}` : `Tenant #${row.id}`}
						fallbackText={row.name.slice(0, 2).toUpperCase()}
						onClick={() => setViewingCompany(row)}
					/>
					<Badge
						variant="outline"
						className="text-[10px] font-mono text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 px-1.5 py-0 h-4.5 shrink-0"
					>
						#{row.id}
					</Badge>
				</div>
			),
		},
		{
			id: "subscription",
			header: t(
				"superAdmin.companies.columns.subscriptionPlan",
				"Subscription & Plan",
			),
			accessorFn: (c) => c.subscription?.planName || "Free Tier",
			sortable: true,
			cell: ({ row }) => {
				const sub = row.subscription;
				const price = sub?.planPrice !== undefined ? sub.planPrice : 0;
				const isFree =
					price === 0 ||
					(sub?.billingCycle || "").toUpperCase() === "FREE_TIER";

				return (
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							{renderPlanBadge(sub)}
							{renderSubscriptionStatus(sub)}
						</div>
						<div className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
							<span>
								{isFree
									? "Free Tier ($0.00)"
									: `$${price.toFixed(2)} / ${sub?.billingCycle?.toLowerCase() || "mo"}`}
							</span>
							{row.enableBranch && (
								<>
									<span>•</span>
									<span className="text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
										<GitBranch className="h-3 w-3" /> Multi-Branch
									</span>
								</>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "contact",
			header: t(
				"superAdmin.companies.columns.contactDetails",
				"Contact Details",
			),
			accessorKey: "email",
			cell: ({ row }) => {
				const phone = row.phoneNumber || row.phone;
				return (
					<div className="space-y-1">
						<div
							className="group/email flex items-center gap-1.5 text-xs text-foreground font-medium cursor-pointer hover:text-primary transition-colors"
							onClick={(e) =>
								copyToClipboard(row.email, `email-${row.id}`, "Email", e)
							}
							title="Click to copy email"
						>
							<Mail className="h-3.5 w-3.5 text-muted-foreground group-hover/email:text-primary transition-colors shrink-0" />
							<span className="truncate max-w-[170px]">{row.email}</span>
							{copiedKey === `email-${row.id}` ? (
								<CheckCheck className="h-3 w-3 text-emerald-600 shrink-0" />
							) : (
								<Copy className="h-3 w-3 text-muted-foreground/60 opacity-0 group-hover/email:opacity-100 transition-opacity shrink-0" />
							)}
						</div>
						{phone && (
							<div
								className="group/phone flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
								onClick={(e) =>
									copyToClipboard(phone, `phone-${row.id}`, "Phone number", e)
								}
								title="Click to copy phone"
							>
								<Phone className="h-3 w-3 text-slate-400 group-hover/phone:text-primary transition-colors shrink-0" />
								<span className="truncate max-w-[170px] font-mono">
									{phone}
								</span>
								{copiedKey === `phone-${row.id}` ? (
									<CheckCheck className="h-3 w-3 text-emerald-600 shrink-0" />
								) : (
									<Copy className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover/phone:opacity-100 transition-opacity shrink-0" />
								)}
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "location",
			header: t(
				"superAdmin.companies.columns.locationCoordinates",
				"Location & Coordinates",
			),
			accessorKey: "address",
			cell: ({ row }) => {
				const hasCoords =
					typeof row.lat === "number" && typeof row.lng === "number";
				const address = row.address || row.note || "No address provided";

				return (
					<div className="space-y-1">
						<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
							<MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
							<span className="truncate max-w-[190px]" title={address}>
								{address}
							</span>
						</div>
						{hasCoords ? (
							<div className="flex items-center gap-2">
								<a
									href={`https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => e.stopPropagation()}
									className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
									title="Open location in Google Maps"
								>
									<Navigation className="h-2.5 w-2.5" />
									<span>
										{row.lat?.toFixed(4)}, {row.lng?.toFixed(4)}
									</span>
									<ArrowUpRight className="h-2.5 w-2.5 ml-0.5" />
								</a>
							</div>
						) : (
							<span className="text-[10px] text-slate-400 dark:text-slate-600 italic">
								No GPS coordinates
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "status",
			header: t("superAdmin.companies.columns.status", "Status"),
			accessorKey: "active",
			sortable: true,
			cell: ({ row }) => {
				const isRowActive = row.active !== false && !row.deletedAt;
				const isToggling = togglingId === row.id;

				if (row.deletedAt) {
					return (
						<Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 text-xs font-semibold gap-1">
							<XCircle className="h-3 w-3" /> Soft-Deleted
						</Badge>
					);
				}

				return (
					<div
						className="flex items-center gap-2.5"
						onClick={(e) => e.stopPropagation()}
					>
						<ModernSwitch
							checked={isRowActive}
							isLoading={isToggling}
							disabled={isToggling}
							switchSize="sm"
							onCheckedChange={() => toggleActiveMutation.mutate(row)}
						/>
						<span
							className={`text-xs font-semibold transition-colors ${
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
			id: "createdAt",
			header: t("superAdmin.companies.columns.registered", "Registered"),
			accessorKey: "createdAt",
			sortable: true,
			cell: ({ row }) => (
				<div className="space-y-0.5">
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Calendar className="h-3 w-3 text-slate-400 shrink-0" />
						<span>{formatDate(row.createdAt)}</span>
					</div>
					{row.updatedAt && (
						<div className="text-[10px] text-slate-400 flex items-center gap-1 pl-4">
							<span>Updated: {formatDate(row.updatedAt).split(",")[0]}</span>
						</div>
					)}
				</div>
			),
		},
	];

	// Custom Row Actions
	const customRowActions: RowAction<Company>[] = [
		{
			id: "view",
			label: t(
				"superAdmin.companies.actions.viewOverview",
				"View Operations Overview",
			),
			icon: <Eye className="h-3.5 w-3.5 text-purple-600" />,
			onClick: (company) => setViewingCompany(company),
		},
		{
			id: "edit",
			label: t(
				"superAdmin.companies.actions.editProfile",
				"Edit Company Profile",
			),
			icon: <Pencil className="h-3.5 w-3.5 text-blue-600" />,
			onClick: (company) => openEditModal(company),
		},
		{
			id: "maps",
			label: t("superAdmin.companies.actions.openMaps", "Open in Google Maps"),
			icon: <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />,
			hidden: (c) => typeof c.lat !== "number" || typeof c.lng !== "number",
			onClick: (c) => {
				window.open(
					`https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`,
					"_blank",
				);
			},
		},
		{
			id: "copy-coords",
			label: t(
				"superAdmin.companies.actions.copyCoords",
				"Copy GPS Coordinates",
			),
			icon: <Copy className="h-3.5 w-3.5 text-slate-600" />,
			hidden: (c) => typeof c.lat !== "number" || typeof c.lng !== "number",
			onClick: (c) => {
				copyToClipboard(`${c.lat}, ${c.lng}`, `coords-${c.id}`, "Coordinates");
			},
		},
		{
			id: "toggle",
			label: (c) =>
				c.deletedAt
					? t(
							"superAdmin.companies.actions.restoreReactivate",
							"Restore & Reactivate",
						)
					: c.active
						? t(
								"superAdmin.companies.actions.deactivateCompany",
								"Deactivate Company",
							)
						: t(
								"superAdmin.companies.actions.activateCompany",
								"Activate Company",
							),
			icon: (c) =>
				c.deletedAt ? (
					<RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
				) : c.active ? (
					<XCircle className="h-3.5 w-3.5 text-amber-600" />
				) : (
					<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
				),
			onClick: (c) => {
				if (c.deletedAt) {
					restoreMutation.mutate(c.id);
				} else {
					toggleActiveMutation.mutate(c);
				}
			},
		},
	];

	const activeSubInfo = activeCompanyDetails
		? getSubscriptionInfo(activeCompanyDetails.subscription)
		: null;

	return (
		<div className="space-y-6">
			{/* Top Header & Intro */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
						<div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60 shadow-2xs">
							<Building2 className="h-5 w-5" />
						</div>
						<span>
							{t(
								"superAdmin.companies.title",
								"Company Tenants & Subscriptions",
							)}
						</span>
					</h1>
					<p className="text-xs text-muted-foreground mt-1">
						{t(
							"superAdmin.companies.subtitle",
							"Manage multi-tenant business accounts, subscription licensing, branch configurations, and geographic locations.",
						)}
					</p>
				</div>

				<div className="flex items-center gap-2.5">
					<Button
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isRefetching}
						className="rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800"
					>
						<RefreshCw
							className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-purple-600" : "text-slate-500"}`}
						/>
						<span>{t("superAdmin.companies.syncData", "Sync Data")}</span>
					</Button>

					<Button
						onClick={openCreateModal}
						className="rounded-xl px-4 py-2 text-xs font-bold gap-2 shadow-sm shadow-primary/20"
					>
						<Plus className="h-4 w-4" />
						<span>{t("superAdmin.companies.addCompany", "Add Company")}</span>
					</Button>
				</div>
			</div>

			{/* Overview Metric Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("superAdmin.companies.totalCompanies", "Total Companies")}
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{totalCompanies}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{t(
									"superAdmin.companies.registeredTenants",
									"Registered tenants",
								)}
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
							<Building2 className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t(
									"superAdmin.companies.activeOperational",
									"Active & Operational",
								)}
							</p>
							<h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
								{activeCompaniesCount}
							</h3>
							<p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
								{t(
									"superAdmin.companies.operatingTenants",
									"Operating tenants",
								)}
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
							<CheckCircle2 className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("superAdmin.companies.trialFreeTier", "Trial & Free Tier")}
							</p>
							<h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">
								{trialCompaniesCount}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{t(
									"superAdmin.companies.paidTrialRatio",
									"{{paid}} Paid / {{trial}} Trial",
									{ paid: paidCompaniesCount, trial: trialCompaniesCount },
								)}
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400">
							<Sparkles className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-4 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								{t("superAdmin.companies.multiBranchGeo", "Multi-Branch & Geo")}
							</p>
							<h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
								{multiBranchCount}
							</h3>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{t(
									"superAdmin.companies.geoLocatedCount",
									"{{count}} Geo-located",
									{ count: geoTaggedCount },
								)}
							</p>
						</div>
						<div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
							<GitBranch className="h-5 w-5" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filter Tabs */}
			<ModernTabs
				value={statusFilter}
				onValueChange={(val) => {
					setStatusFilter(val);
					setPage(1);
				}}
			>
				<ModernTabsList variant="pills" size="sm">
					<ModernTabsTrigger
						value="ALL"
						badge={totalCompanies}
						badgeColor="purple"
						icon={<Building2 className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.companies.allCompanies", "All Companies")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="ACTIVE"
						badge={activeCompaniesCount}
						badgeColor="emerald"
						icon={<CheckCircle2 className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.companies.activeTab", "Active & Operational")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="TRIAL"
						badge={trialCompaniesCount}
						badgeColor="sky"
						icon={<Sparkles className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.companies.trialTab", "Free & Trial")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="PAID"
						badge={paidCompaniesCount}
						badgeColor="indigo"
						icon={<CreditCard className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.companies.paidTab", "Paid Subscriptions")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="DELETED"
						badge={deletedCompaniesCount}
						badgeColor="slate"
						icon={<XCircle className="h-3.5 w-3.5" />}
					>
						{t("superAdmin.companies.deletedTab", "Inactive / Deleted")}
					</ModernTabsTrigger>
				</ModernTabsList>
			</ModernTabs>

			{/* Main Data Table */}
			<DataTable<Company>
				data={displayCompanies}
				columns={columns}
				getRowId={(c) => String(c.id)}
				title={t("superAdmin.companies.listTitle", "Tenants List")}
				searchPlaceholder={t(
					"superAdmin.companies.searchPlaceholder",
					"Search company by name, username, email, phone, address, notes...",
				)}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel={t("superAdmin.companies.addCompany", "Add Company")}
				onCreateNew={openCreateModal}
				actions={customRowActions}
				manualPagination={true}
				totalCount={totalCompanies}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
				onEditRow={(c) => !c.deletedAt && openEditModal(c)}
				onDeleteRow={(c) => !c.deletedAt && deleteMutation.mutate(c.id)}
				exportFilename="companies-tenants-list"
				emptyStateTitle={t(
					"superAdmin.companies.emptyTitle",
					"No companies found",
				)}
				emptyStateDescription={t(
					"superAdmin.companies.emptyDesc",
					"Create a new company tenant or adjust your search filter query.",
				)}
			/>

			{/* ============================================================ */}
			{/* 1. CREATE COMPANY MODAL                                      */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				title={t(
					"superAdmin.companies.createModal.title",
					"Register New Company",
				)}
				subtitle={t(
					"superAdmin.companies.createModal.subtitle",
					"Provision a new tenant organization with licensing, owner credentials, and coordinates.",
				)}
				icon={<Building2 className="h-5 w-5 text-purple-600" />}
				size="lg"
				isLoading={createMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsCreateOpen(false)} />
						<ModernModalSubmitButton
							form="create-company-form"
							isLoading={createMutation.isPending}
						>
							{t(
								"superAdmin.companies.createModal.submitButton",
								"Create Company",
							)}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="create-company-form"
					onSubmit={createForm.handleSubmit(handleCreateSubmit)}
					className="space-y-4"
				>
					{/* Section: Company Profile */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
							<Building2 className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.companyInfo",
								"Company Information",
							)}
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.nameLabel",
									"Company Name",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.namePlaceholder",
									"e.g. Menglang",
								)}
								{...createForm.register("name")}
								error={createForm.formState.errors.name?.message}
								required
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.usernameLabel",
									"Owner / Tenant Username",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.usernamePlaceholder",
									"e.g. huomenglang",
								)}
								{...createForm.register("username")}
								error={createForm.formState.errors.username?.message}
								helperText={t(
									"superAdmin.companies.createModal.usernameHelper",
									"Unique username handle for tenant identification",
								)}
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.emailLabel",
									"Email Address",
								)}
								type="email"
								placeholder={t(
									"superAdmin.companies.createModal.emailPlaceholder",
									"e.g. menglanghuo@gmail.com",
								)}
								leftIcon={<Mail className="size-4" />}
								{...createForm.register("email")}
								error={createForm.formState.errors.email?.message}
								required
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.phoneLabel",
									"Phone Number",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.phonePlaceholder",
									"e.g. +855968137739",
								)}
								leftIcon={<Phone className="size-4" />}
								{...createForm.register("phone")}
								error={createForm.formState.errors.phone?.message}
								required
							/>
						</div>
					</div>

					{/* Section: Geographic Location */}
					<div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
						<h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.addressGps",
								"Address & GPS Coordinates",
							)}
						</h4>
						<ModernInput
							label={t(
								"superAdmin.companies.createModal.addressLabel",
								"Street Address / Location",
							)}
							placeholder={t(
								"superAdmin.companies.createModal.addressPlaceholder",
								"e.g. Preah Prasab, Khsach Kandal, Kandal",
							)}
							leftIcon={<MapPin className="size-4" />}
							{...createForm.register("address")}
							error={createForm.formState.errors.address?.message}
							required
						/>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.latLabel",
									"Latitude (GPS)",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.latPlaceholder",
									"e.g. 11.767284",
								)}
								type="number"
								step="any"
								leftIcon={<Compass className="size-4" />}
								{...createForm.register("lat")}
								error={createForm.formState.errors.lat?.message}
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.lngLabel",
									"Longitude (GPS)",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.lngPlaceholder",
									"e.g. 105.024648",
								)}
								type="number"
								step="any"
								leftIcon={<Compass className="size-4" />}
								{...createForm.register("lng")}
								error={createForm.formState.errors.lng?.message}
							/>
						</div>
					</div>

					{/* Section: Operational Settings */}
					<div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<GitBranch className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.businessOps",
								"Business Features & Operations",
							)}
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
								<div className="space-y-0.5">
									<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
										{t(
											"superAdmin.companies.createModal.multiBranchLabel",
											"Multi-Branch Support",
										)}
									</label>
									<p className="text-[11px] text-muted-foreground">
										{t(
											"superAdmin.companies.createModal.multiBranchDesc",
											"Enable branch hierarchy and multi-location data partitioning",
										)}
									</p>
								</div>
								<ModernSwitch
									checked={createForm.watch("enableBranch")}
									onCheckedChange={(val) =>
										createForm.setValue("enableBranch", val)
									}
									switchSize="sm"
								/>
							</div>

							<div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
								<div className="space-y-0.5">
									<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
										{t(
											"superAdmin.companies.createModal.accountStatusLabel",
											"Initial Account Status",
										)}
									</label>
									<p className="text-[11px] text-muted-foreground">
										{t(
											"superAdmin.companies.createModal.accountStatusDesc",
											"Activate company upon creation to grant immediate access",
										)}
									</p>
								</div>
								<ModernSwitch
									checked={createForm.watch("active")}
									onCheckedChange={(val) => createForm.setValue("active", val)}
									switchSize="sm"
								/>
							</div>
						</div>

						<ModernTextarea
							label={t(
								"superAdmin.companies.createModal.notesLabel",
								"Internal Notes / Remarks",
							)}
							placeholder={t(
								"superAdmin.companies.createModal.notesPlaceholder",
								"Internal operational notes...",
							)}
							rows={2}
							{...createForm.register("note")}
							error={createForm.formState.errors.note?.message}
						/>
					</div>

					{/* Section: Initial Owner Account Credentials */}
					<div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
						<h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
							<ShieldCheck className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.ownerCredentials",
								"Owner Administrative Account Credentials",
							)}
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.ownerUsernameLabel",
									"Owner Initial Username",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.ownerUsernamePlaceholder",
									"e.g. admin_menglang",
								)}
								{...createForm.register("ownerUsername")}
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.ownerPasswordLabel",
									"Owner Initial Password",
								)}
								type="password"
								placeholder={t(
									"superAdmin.companies.createModal.ownerPasswordPlaceholder",
									"••••••••",
								)}
								{...createForm.register("ownerPassword")}
							/>
						</div>
					</div>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* 2. EDIT COMPANY MODAL                                        */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={!!editingCompany}
				onClose={() => setEditingCompany(null)}
				title={t(
					"superAdmin.companies.editModal.title",
					"Edit Company Tenant #{{id}}",
					{ id: editingCompany?.id || "" },
				)}
				subtitle={t(
					"superAdmin.companies.editModal.subtitle",
					"Update organization profile, location details, branch capabilities, and operational status.",
				)}
				icon={<Pencil className="h-5 w-5 text-blue-600" />}
				size="lg"
				isLoading={updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setEditingCompany(null)} />
						<ModernModalSubmitButton
							form="edit-company-form"
							isLoading={updateMutation.isPending}
						>
							{t("superAdmin.companies.editModal.saveButton", "Save Changes")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="edit-company-form"
					onSubmit={editForm.handleSubmit(handleEditSubmit)}
					className="space-y-4"
				>
					<div className="space-y-3">
						<h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
							<Building2 className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.companyInfo",
								"Company Information",
							)}
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.nameLabel",
									"Company Name",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.namePlaceholder",
									"e.g. Menglang",
								)}
								{...editForm.register("name")}
								error={editForm.formState.errors.name?.message}
								required
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.usernameLabel",
									"Owner / Tenant Username",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.usernamePlaceholder",
									"e.g. huomenglang",
								)}
								{...editForm.register("username")}
								error={editForm.formState.errors.username?.message}
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.emailLabel",
									"Email Address",
								)}
								type="email"
								placeholder={t(
									"superAdmin.companies.createModal.emailPlaceholder",
									"e.g. menglanghuo@gmail.com",
								)}
								leftIcon={<Mail className="size-4" />}
								{...editForm.register("email")}
								error={editForm.formState.errors.email?.message}
								required
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.phoneLabel",
									"Phone Number",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.phonePlaceholder",
									"e.g. +855968137739",
								)}
								leftIcon={<Phone className="size-4" />}
								{...editForm.register("phone")}
								error={editForm.formState.errors.phone?.message}
								required
							/>
						</div>
					</div>

					<div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
						<h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.addressGps",
								"Address & GPS Coordinates",
							)}
						</h4>
						<ModernInput
							label={t(
								"superAdmin.companies.createModal.addressLabel",
								"Street Address / Location",
							)}
							placeholder={t(
								"superAdmin.companies.createModal.addressPlaceholder",
								"e.g. Preah Prasab, Khsach Kandal, Kandal",
							)}
							leftIcon={<MapPin className="size-4" />}
							{...editForm.register("address")}
							error={editForm.formState.errors.address?.message}
							required
						/>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.latLabel",
									"Latitude (GPS)",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.latPlaceholder",
									"e.g. 11.767284",
								)}
								type="number"
								step="any"
								leftIcon={<Compass className="size-4" />}
								{...editForm.register("lat")}
								error={editForm.formState.errors.lat?.message}
							/>
							<ModernInput
								label={t(
									"superAdmin.companies.createModal.lngLabel",
									"Longitude (GPS)",
								)}
								placeholder={t(
									"superAdmin.companies.createModal.lngPlaceholder",
									"e.g. 105.024648",
								)}
								type="number"
								step="any"
								leftIcon={<Compass className="size-4" />}
								{...editForm.register("lng")}
								error={editForm.formState.errors.lng?.message}
							/>
						</div>
					</div>

					<div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<GitBranch className="h-3.5 w-3.5" />{" "}
							{t(
								"superAdmin.companies.createModal.businessOps",
								"Business Features & Status",
							)}
						</h4>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
							<div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
								<div className="space-y-0.5">
									<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
										{t(
											"superAdmin.companies.createModal.multiBranchLabel",
											"Multi-Branch Mode",
										)}
									</label>
									<p className="text-[11px] text-muted-foreground">
										{t(
											"superAdmin.companies.createModal.multiBranchDesc",
											"Enable branch network management",
										)}
									</p>
								</div>
								<ModernSwitch
									checked={editForm.watch("enableBranch")}
									onCheckedChange={(val) =>
										editForm.setValue("enableBranch", val)
									}
									switchSize="sm"
								/>
							</div>

							<div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
								<div className="space-y-0.5">
									<label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
										{t(
											"superAdmin.companies.createModal.accountStatusLabel",
											"Account Active Status",
										)}
									</label>
									<p className="text-[11px] text-muted-foreground">
										{t(
											"superAdmin.companies.createModal.accountStatusDesc",
											"Active accounts can log in & process data",
										)}
									</p>
								</div>
								<ModernSwitch
									checked={editForm.watch("active")}
									onCheckedChange={(val) => editForm.setValue("active", val)}
									switchSize="sm"
								/>
							</div>
						</div>

						<ModernTextarea
							label={t(
								"superAdmin.companies.createModal.notesLabel",
								"Internal Notes / Remarks",
							)}
							placeholder={t(
								"superAdmin.companies.createModal.notesPlaceholder",
								"e.g. B2B at Kandal Province...",
							)}
							rows={2}
							{...editForm.register("note")}
							error={editForm.formState.errors.note?.message}
						/>
					</div>
				</form>
			</ModernModal>

			{/* ============================================================ */}
			{/* 3. VIEW COMPANY DETAILS MODAL                                */}
			{/* ============================================================ */}
			<ModernModal
				isOpen={!!viewingCompany}
				onClose={() => setViewingCompany(null)}
				title={t(
					"superAdmin.companies.inspectModal.title",
					"Company Operations Overview #{{id}}",
					{ id: viewingCompany?.id || "" },
				)}
				subtitle={t(
					"superAdmin.companies.inspectModal.subtitle",
					"Detailed tenant specifications, active subscription state, branch structure, and owner details.",
				)}
				icon={<Building2 className="h-5 w-5 text-purple-600" />}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setViewingCompany(null)}
							label={t("common.close", "Close")}
						/>
						{activeCompanyDetails && (
							<Button
								variant="outline"
								className="rounded-xl px-4 py-2 text-xs font-semibold gap-2 border-slate-200 dark:border-slate-800"
								onClick={() => {
									const target = activeCompanyDetails;
									setViewingCompany(null);
									openEditModal(target);
								}}
							>
								<Pencil className="h-3.5 w-3.5" />
								<span>
									{t(
										"superAdmin.companies.actions.editProfile",
										"Edit Company",
									)}
								</span>
							</Button>
						)}
					</ModernModalFooter>
				}
			>
				{activeCompanyDetails && (
					<div className="space-y-5">
						{/* Header Profile Banner */}
						<div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/40 dark:from-slate-900/80 dark:to-purple-950/30 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div className="flex items-center gap-3.5">
								<div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
									{activeCompanyDetails.name.slice(0, 2).toUpperCase()}
								</div>
								<div>
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="font-bold text-lg text-slate-900 dark:text-white">
											{activeCompanyDetails.name}
										</h3>
										<Badge
											variant="outline"
											className="text-[10px] font-mono text-slate-400 border-slate-200 dark:border-slate-800"
										>
											ID: #{activeCompanyDetails.id}
										</Badge>
									</div>
									{activeCompanyDetails.username && (
										<p className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5">
											@{activeCompanyDetails.username}
										</p>
									)}
									<p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
										<span className="flex items-center gap-1">
											<Calendar className="h-3 w-3" /> Registered{" "}
											{formatDate(activeCompanyDetails.createdAt)}
										</span>
									</p>
								</div>
							</div>

							<div className="flex flex-col items-start sm:items-end gap-2">
								<div className="flex items-center gap-2">
									{renderPlanBadge(activeCompanyDetails.subscription)}
									{renderSubscriptionStatus(activeCompanyDetails.subscription)}
								</div>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-[11px] text-muted-foreground">
										Account Status:
									</span>
									<ModernSwitch
										checked={
											activeCompanyDetails.active !== false &&
											!activeCompanyDetails.deletedAt
										}
										isLoading={togglingId === activeCompanyDetails.id}
										disabled={togglingId === activeCompanyDetails.id}
										switchSize="sm"
										onCheckedChange={() =>
											toggleActiveMutation.mutate(activeCompanyDetails)
										}
									/>
									<span
										className={`text-xs font-bold ${
											activeCompanyDetails.active !== false &&
											!activeCompanyDetails.deletedAt
												? "text-emerald-600 dark:text-emerald-400"
												: "text-slate-400 dark:text-slate-500"
										}`}
									>
										{activeCompanyDetails.deletedAt
											? "Deleted"
											: activeCompanyDetails.active !== false
												? "Active"
												: "Inactive"}
									</span>
								</div>
							</div>
						</div>

						{/* Subscription & Entitlement Details Card */}
						{activeCompanyDetails.subscription && activeSubInfo && (
							<div className="p-4 rounded-xl border border-sky-200/70 dark:border-sky-900/50 bg-gradient-to-r from-sky-50/50 to-indigo-50/30 dark:from-sky-950/20 dark:to-indigo-950/20 space-y-3">
								<div className="flex items-center justify-between flex-wrap gap-2">
									<div className="flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
										<h4 className="text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-200">
											Subscription Licensing & Entitlement
										</h4>
									</div>
									<div className="flex items-center gap-2">
										<Badge className="text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 border-sky-300">
											{activeSubInfo.billingCycle}
										</Badge>
										<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
											{activeSubInfo.price === 0
												? "Free Plan ($0.00)"
												: `$${activeSubInfo.price.toFixed(2)}`}
										</span>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
									<div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-sky-100 dark:border-sky-900/40">
										<span className="text-[11px] text-muted-foreground block font-medium">
											Plan Name
										</span>
										<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
											{activeSubInfo.planName}
										</span>
									</div>
									<div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-sky-100 dark:border-sky-900/40">
										<span className="text-[11px] text-muted-foreground block font-medium">
											Start Date
										</span>
										<span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
											{formatDate(activeSubInfo.startDate)}
										</span>
									</div>
									<div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-sky-100 dark:border-sky-900/40">
										<span className="text-[11px] text-muted-foreground block font-medium">
											End / Renewal Date
										</span>
										<span className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 block">
											{formatDate(activeSubInfo.endDate)}
										</span>
									</div>
								</div>

								{/* Progress bar for trial or active duration */}
								{typeof activeSubInfo.daysLeft === "number" && (
									<div className="space-y-1.5 pt-1">
										<div className="flex items-center justify-between text-[11px]">
											<span className="text-slate-600 dark:text-slate-400 font-medium">
												{activeSubInfo.status === "TRIAL"
													? "Evaluation Trial Period"
													: "Subscription Period"}
											</span>
											<span
												className={`font-bold ${
													activeSubInfo.daysLeft <= 3
														? "text-rose-600 dark:text-rose-400"
														: "text-sky-700 dark:text-sky-300"
												}`}
											>
												{activeSubInfo.daysLeft > 0
													? `${activeSubInfo.daysLeft} days remaining`
													: "Expired today"}
											</span>
										</div>
										<div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all ${
													activeSubInfo.daysLeft <= 3
														? "bg-rose-500"
														: activeSubInfo.status === "TRIAL"
															? "bg-amber-500"
															: "bg-emerald-500"
												}`}
												style={{
													width: `${Math.min(100, Math.max(5, 100 - activeSubInfo.progressPercent))}%`,
												}}
											/>
										</div>
									</div>
								)}
							</div>
						)}

						{/* Quick Metrics */}
						<div className="grid grid-cols-3 gap-3 text-center">
							<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
								<p className="text-xs text-slate-500 font-medium">
									Branches Mode
								</p>
								<p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5 flex items-center justify-center gap-1">
									<GitBranch className="h-4 w-4" />
									<span>
										{detailedCompany?.branchCount !== undefined
											? `${detailedCompany.branchCount} Branch${detailedCompany.branchCount === 1 ? "" : "es"}`
											: activeCompanyDetails.enableBranch
												? "Multi-Branch"
												: "Single Branch"}
									</span>
								</p>
							</div>
							<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
								<p className="text-xs text-slate-500 font-medium">
									Staff Members
								</p>
								<p className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-center gap-1">
									<Users className="h-4 w-4" />
									<span>{detailedCompany?.staffCount ?? "1+"}</span>
								</p>
							</div>
							<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
								<p className="text-xs text-slate-500 font-medium">
									User Accounts
								</p>
								<p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center justify-center gap-1">
									<ShieldCheck className="h-4 w-4" />
									<span>{detailedCompany?.userCount ?? "1+"}</span>
								</p>
							</div>
						</div>

						{/* Contact & Location Details Grid */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1.5">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email
									Address
								</span>
								<div className="flex items-center justify-between gap-2">
									<p className="text-slate-900 dark:text-slate-100 font-medium truncate">
										{activeCompanyDetails.email}
									</p>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 px-2 text-[11px] gap-1"
										onClick={(e) =>
											copyToClipboard(
												activeCompanyDetails.email,
												"modal-email",
												"Email",
												e,
											)
										}
									>
										{copiedKey === "modal-email" ? (
											<CheckCheck className="h-3 w-3 text-emerald-600" />
										) : (
											<Copy className="h-3 w-3" />
										)}
										<span>Copy</span>
									</Button>
								</div>
							</div>

							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1.5">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone
									Number
								</span>
								<div className="flex items-center justify-between gap-2">
									<p className="text-slate-900 dark:text-slate-100 font-mono font-medium truncate">
										{activeCompanyDetails.phoneNumber ||
											activeCompanyDetails.phone ||
											"—"}
									</p>
									{(activeCompanyDetails.phoneNumber ||
										activeCompanyDetails.phone) && (
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-[11px] gap-1"
											onClick={(e) =>
												copyToClipboard(
													activeCompanyDetails.phoneNumber ||
														activeCompanyDetails.phone ||
														"",
													"modal-phone",
													"Phone number",
													e,
												)
											}
										>
											{copiedKey === "modal-phone" ? (
												<CheckCheck className="h-3 w-3 text-emerald-600" />
											) : (
												<Copy className="h-3 w-3" />
											)}
											<span>Copy</span>
										</Button>
									)}
								</div>
							</div>

							{/* Address */}
							<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1 sm:col-span-2">
								<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
									<MapPin className="h-3.5 w-3.5 text-rose-500" /> Physical
									Address
								</span>
								<p className="text-slate-900 dark:text-slate-100 font-medium">
									{activeCompanyDetails.address || "No address specified."}
								</p>
							</div>

							{/* GPS Coordinates & Google Maps Link */}
							{typeof activeCompanyDetails.lat === "number" &&
								typeof activeCompanyDetails.lng === "number" && (
									<div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2 sm:col-span-2">
										<div className="flex items-center justify-between flex-wrap gap-2">
											<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
												<Navigation className="h-3.5 w-3.5 text-emerald-600" />{" "}
												Geographic GPS Location
											</span>
											<div className="flex items-center gap-2">
												<Button
													variant="ghost"
													size="sm"
													className="h-7 px-2 text-[11px] gap-1 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
													onClick={(e) =>
														copyToClipboard(
															`${activeCompanyDetails.lat}, ${activeCompanyDetails.lng}`,
															"modal-coords",
															"Coordinates",
															e,
														)
													}
												>
													{copiedKey === "modal-coords" ? (
														<CheckCheck className="h-3 w-3 text-emerald-600" />
													) : (
														<Copy className="h-3 w-3" />
													)}
													<span>Copy GPS</span>
												</Button>

												<a
													href={`https://www.google.com/maps/search/?api=1&query=${activeCompanyDetails.lat},${activeCompanyDetails.lng}`}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg shadow-2xs transition-colors"
												>
													<Globe className="h-3.5 w-3.5" />
													<span>Open in Google Maps</span>
													<ExternalLink className="h-3 w-3 ml-0.5" />
												</a>
											</div>
										</div>
										<p className="text-xs font-mono text-emerald-900 dark:text-emerald-200 font-medium">
											Latitude: {activeCompanyDetails.lat} | Longitude:{" "}
											{activeCompanyDetails.lng}
										</p>
									</div>
								)}

							{/* Note / B2B Description */}
							{(activeCompanyDetails.note ||
								activeCompanyDetails.description) && (
								<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1.5 sm:col-span-2">
									<span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
										<FileText className="h-3.5 w-3.5 text-muted-foreground" />{" "}
										Business Notes / Description
									</span>
									<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
										{activeCompanyDetails.note ||
											activeCompanyDetails.description}
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</ModernModal>
		</div>
	);
}

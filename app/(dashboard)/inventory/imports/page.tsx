"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	inventoryImportsApi,
	supplierReturnsApi,
	suppliersApi,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
} from "@/components/ui-custom/modern-tabs";
import { DynamicInventoryStudioModal } from "@/components/inventory/dynamic-inventory-studio-modal";
import { ImportDetailsDrawer } from "@/components/inventory/import-details-drawer";
import { SupplierReturnModal } from "@/components/inventory/supplier-return-modal";
import { SupplierReturnDetailsDrawer } from "@/components/inventory/supplier-return-details-drawer";
import { DynamicFilterModal } from "@/components/ui-custom/data-table/dynamic-filter-modal";
import {
	IMPORT_DOMAIN_FILTERS,
	SUPPLIER_RETURN_DOMAIN_FILTERS,
} from "@/components/ui-custom/data-table/domain-filter-configs";
import { FilterCriterion } from "@/components/ui-custom/data-table/search-filter-types";
import type { InventoryImport, SupplierReturn } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";
import {
	Truck,
	Plus,
	Boxes,
	Building2,
	Calendar,
	DollarSign,
	TrendingUp,
	RefreshCw,
	Eye,
	Pencil,
	Copy,
	CheckCheck,
	Trash2,
	Tag,
	CheckCircle2,
	Clock,
	Package,
	Layers,
	SlidersHorizontal,
	ShieldCheck,
	RotateCcw,
	AlertTriangle,
	ExternalLink,
} from "lucide-react";

export default function InventoryImportsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Top-level Navigation Tab State: "SHIPMENTS" | "SUPPLIER_RETURNS"
	const [activeTab, setActiveTab] = useState<"SHIPMENTS" | "SUPPLIER_RETURNS">(
		"SHIPMENTS",
	);

	// =========================================================================
	// 1. SHIPMENTS TAB STATE & QUERY
	// =========================================================================
	const [shipmentSearch, setShipmentSearch] = useState("");
	const [shipmentPage, setShipmentPage] = useState(1);
	const [shipmentPageSize, setShipmentPageSize] = useState(10);
	const [isShipmentFilterStudioOpen, setIsShipmentFilterStudioOpen] =
		useState(false);
	const [activeShipmentFilters, setActiveShipmentFilters] = useState<
		FilterCriterion[]
	>([]);

	// Build Criteria for Imports Search API
	const shipmentSearchPayload = useMemo(() => {
		const pageZeroBased = Math.max(0, shipmentPage - 1);
		const criteria: any[] = [];

		// 1. Search Bar Filter
		if (shipmentSearch.trim()) {
			criteria.push({
				field: "referenceNo",
				operator: "STARTS_WITH",
				value: shipmentSearch.trim(),
			});
		}

		// 2. Dynamic Studio Filters
		activeShipmentFilters.forEach((f) => {
			if (f.field === "referenceNo" && shipmentSearch.trim()) return;

			if (
				(f.operator === "IN" || f.operator === "NOT_IN") &&
				Array.isArray(f.values) &&
				f.values.length > 0
			) {
				criteria.push({
					field: f.field,
					operator: f.operator,
					values: f.values,
				});
			} else if (
				f.operator === "BETWEEN" &&
				(f.value !== "" || f.valueTo !== "")
			) {
				criteria.push({
					field: f.field,
					operator: f.operator,
					value: f.value !== "" && f.value !== undefined ? f.value : undefined,
					valueTo:
						f.valueTo !== "" && f.valueTo !== undefined ? f.valueTo : undefined,
				});
			} else if (f.value !== "" && f.value !== undefined && f.value !== null) {
				criteria.push({
					field: f.field,
					operator: f.operator,
					value: f.value,
				});
			}
		});

		return {
			page: pageZeroBased,
			size: shipmentPageSize,
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			filterGroup: {
				logicalOperator: "AND",
				criteria,
			},
		};
	}, [shipmentPage, shipmentPageSize, shipmentSearch, activeShipmentFilters]);

	// Fetch Imports List using POST /api/v1/imports/search
	const {
		data: shipmentsData,
		isLoading: isShipmentsLoading,
		refetch: refetchShipments,
		isRefetching: isShipmentsRefetching,
	} = useQuery({
		queryKey: ["inventory-imports", shipmentSearchPayload],
		queryFn: () => inventoryImportsApi.search(shipmentSearchPayload),
	});

	// Delete Import Mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => inventoryImportsApi.remove(id),
		onSuccess: () => {
			toast.success("Stock import record removed");
			queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
			queryClient.invalidateQueries({ queryKey: ["stocks"] });
			if (viewingImportId) {
				setViewingImportId(null);
				setViewingImport(null);
			}
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// =========================================================================
	// 2. SUPPLIER RETURNS TAB STATE & QUERY
	// =========================================================================
	const [returnSearch, setReturnSearch] = useState("");
	const [returnPage, setReturnPage] = useState(1);
	const [returnPageSize, setReturnPageSize] = useState(10);
	const [isReturnFilterStudioOpen, setIsReturnFilterStudioOpen] =
		useState(false);
	const [activeReturnFilters, setActiveReturnFilters] = useState<
		FilterCriterion[]
	>([]);

	// Build Criteria for Supplier Returns Search API (POST /api/v1/supplier-returns/search)
	const supplierReturnSearchPayload = useMemo(() => {
		const pageZeroBased = Math.max(0, returnPage - 1);
		const criteria: any[] = [];

		// 1. Search Bar Filter (by returnNumber LIKE)
		if (returnSearch.trim()) {
			criteria.push({
				field: "returnNumber",
				operator: "LIKE",
				value: returnSearch.trim(),
			});
		}

		// 2. Dynamic Studio Filters
		activeReturnFilters.forEach((f) => {
			if (f.field === "returnNumber" && returnSearch.trim()) return;

			if (
				(f.operator === "IN" || f.operator === "NOT_IN") &&
				Array.isArray(f.values) &&
				f.values.length > 0
			) {
				criteria.push({
					field: f.field,
					operator: f.operator,
					values: f.values,
				});
			} else if (
				f.operator === "BETWEEN" &&
				(f.value !== "" || f.valueTo !== "")
			) {
				criteria.push({
					field: f.field,
					operator: f.operator,
					value: f.value !== "" && f.value !== undefined ? f.value : undefined,
					valueTo:
						f.valueTo !== "" && f.valueTo !== undefined ? f.valueTo : undefined,
				});
			} else if (f.value !== "" && f.value !== undefined && f.value !== null) {
				let val: any = f.value;
				if (f.field === "returnAll") {
					val = val === "true" || val === true;
				} else if (
					(f.field === "supplierId" || f.field === "importId") &&
					!isNaN(Number(val))
				) {
					val = Number(val);
				}
				criteria.push({
					field: f.field,
					operator: f.operator,
					value: val,
				});
			}
		});

		return {
			filterGroup: {
				logicalOperator: "AND",
				criteria,
			},
			sort: [
				{
					field: "createdAt",
					direction: "DESC",
				},
			],
			page: pageZeroBased,
			size: returnPageSize,
		};
	}, [returnPage, returnPageSize, returnSearch, activeReturnFilters]);

	// Fetch Supplier Returns List using POST /api/v1/supplier-returns/search
	const {
		data: returnsData,
		isLoading: isReturnsLoading,
		refetch: refetchReturns,
		isRefetching: isReturnsRefetching,
	} = useQuery({
		queryKey: ["supplier-returns", supplierReturnSearchPayload],
		queryFn: () => supplierReturnsApi.search(supplierReturnSearchPayload),
	});

	// =========================================================================
	// 3. SHARED MODALS & DRAWERS STATE
	// =========================================================================
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [isStudioOpen, setIsStudioOpen] = useState(false);
	const [viewingImportId, setViewingImportId] = useState<
		string | number | null
	>(null);
	const [viewingImport, setViewingImport] = useState<InventoryImport | null>(
		null,
	);
	const [editingImport, setEditingImport] = useState<InventoryImport | null>(
		null,
	);
	const [returningImport, setReturningImport] =
		useState<InventoryImport | null>(null);

	// Supplier Return Details Drawer
	const [viewingReturnId, setViewingReturnId] = useState<
		string | number | null
	>(null);
	const [viewingReturn, setViewingReturn] = useState<SupplierReturn | null>(
		null,
	);

	// Derived Counts
	const rawImports = shipmentsData?.items || [];
	const totalImports = shipmentsData?.total || 0;

	const rawReturns = returnsData?.items || [];
	const totalReturns = returnsData?.total || 0;

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

	// Format Date Helper
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

	// =========================================================================
	// 4. SHIPMENTS TABLE COLUMNS
	// =========================================================================
	const shipmentColumns: ColumnDef<InventoryImport>[] = [
		{
			id: "referenceNo",
			header: t("invoices.referenceNumber"),
			accessorFn: (row) => row.referenceNo || row.importNo || `IMP-${row.id}`,
			sortable: true,
			cell: ({ row }) => {
				const refNo = row.referenceNo || row.importNo || `IMP-${row.id}`;
				return (
					<div className="flex items-center gap-2">
						<span
							onClick={() => {
								setViewingImportId(row.id);
								setViewingImport(row);
							}}
							className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1.5"
						>
							<Truck className="h-3.5 w-3.5 text-purple-500 shrink-0" />#{refNo}
						</span>
						<button
							onClick={(e) =>
								copyToClipboard(refNo, `ref-${row.id}`, "Reference number", e)
							}
							className="text-slate-400 hover:text-purple-600 transition-colors"
							title="Copy Reference"
						>
							{copiedKey === `ref-${row.id}` ? (
								<CheckCheck className="h-3 w-3 text-emerald-600" />
							) : (
								<Copy className="h-3 w-3" />
							)}
						</button>
					</div>
				);
			},
		},
		{
			id: "supplier",
			header: t("sidebar.suppliers"),
			accessorFn: (row) =>
				row.supplierName || row.supplier?.name || "Primary Supplier",
			sortable: true,
			cell: ({ row }) => {
				const name =
					row.supplierName || row.supplier?.name || "Primary Supplier";
				const phone =
					row.supplierPhone ||
					row.supplier?.primaryPhone ||
					row.supplier?.phone;
				return (
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center shrink-0">
								{name.slice(0, 2).toUpperCase()}
							</div>
							<span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
								{name}
							</span>
						</div>
						{phone && (
							<p className="text-[10px] text-muted-foreground font-mono pl-8 truncate max-w-[160px]">
								{phone}
							</p>
						)}
					</div>
				);
			},
		},
		{
			id: "items",
			header: t("stocks.quantityOnHand"),
			cell: ({ row }) => {
				const products = row.products || [];
				const items = row.items || [];
				const hasProducts = products.length > 0;
				const totalItemsCount = items.length;
				const units =
					row.totalUnits ??
					items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

				const firstLabel =
					hasProducts && products[0]
						? products[0].name
						: items[0]
							? items[0].productName ||
								items[0].variantName ||
								`Product #${items[0].variantId}`
							: "";

				return (
					<div className="space-y-0.5">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
							<Boxes className="h-3.5 w-3.5 text-purple-600 shrink-0" />
							<span>
								{hasProducts
									? `${products.length} Products`
									: `${totalItemsCount} Items`}{" "}
								({units} units)
							</span>
						</div>
						{firstLabel && (
							<p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
								{firstLabel}
								{(hasProducts ? products.length : totalItemsCount) > 1
									? ` +${(hasProducts ? products.length : totalItemsCount) - 1} more`
									: ""}
							</p>
						)}
					</div>
				);
			},
		},
		{
			id: "totalCost",
			header: t("products.costPrice"),
			accessorFn: (row) => row.totalCost ?? row.totalAmount ?? 0,
			sortable: true,
			cell: ({ row }) => {
				const cost = Number(row.totalCost ?? row.totalAmount ?? 0);
				return (
					<div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
						$
						{cost.toLocaleString(undefined, {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					</div>
				);
			},
		},
		{
			id: "importDate",
			header: t("invoices.issueDate"),
			accessorKey: "importDate",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
					<span>{formatDate(row.importDate)}</span>
				</div>
			),
		},
		{
			id: "status",
			header: t("common.status"),
			accessorKey: "status",
			sortable: true,
			cell: ({ row }) => {
				const status = (row.status || "COMPLETED").toUpperCase();
				if (status === "COMPLETED") {
					return (
						<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold gap-1">
							<CheckCircle2 className="h-3 w-3 text-emerald-600" /> COMPLETED
						</Badge>
					);
				}
				if (status === "VERIFIED") {
					return (
						<Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-bold gap-1">
							<ShieldCheck className="h-3 w-3 text-blue-600" /> VERIFIED
						</Badge>
					);
				}
				if (status === "PENDING" || status === "IN_TRANSIT") {
					return (
						<Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px] font-bold gap-1">
							<Clock className="h-3 w-3 text-amber-600" />{" "}
							{status === "IN_TRANSIT" ? "IN TRANSIT" : "PENDING"}
						</Badge>
					);
				}
				return (
					<Badge
						variant="outline"
						className="text-[10px] font-bold text-slate-600 border-slate-200"
					>
						{status}
					</Badge>
				);
			},
		},
	];

	// Custom Row Actions for Shipments
	const customShipmentRowActions: RowAction<InventoryImport>[] = [
		{
			id: "view",
			label: t("invoices.invoiceDetails"),
			icon: <Eye className="h-3.5 w-3.5 text-purple-600" />,
			onClick: (item) => {
				setViewingImportId(item.id);
				setViewingImport(item);
			},
		},
		{
			id: "edit",
			label: t("common.edit"),
			icon: <Pencil className="h-3.5 w-3.5 text-blue-600" />,
			onClick: (item) => {
				setEditingImport(item);
				setIsStudioOpen(true);
			},
		},
		{
			id: "copy-ref",
			label: t("invoices.referenceNumber"),
			icon: <Copy className="h-3.5 w-3.5 text-slate-600" />,
			onClick: (item) => {
				copyToClipboard(
					item.referenceNo || item.importNo || `IMP-${item.id}`,
					`ref-menu-${item.id}`,
					"Reference #",
				);
			},
		},
		{
			id: "return",
			label: "Return to Supplier",
			icon: <RotateCcw className="h-3.5 w-3.5 text-rose-600" />,
			onClick: (item) => {
				setReturningImport(item);
			},
		},
		{
			id: "delete",
			label: t("common.delete"),
			icon: <Trash2 className="h-3.5 w-3.5 text-rose-600" />,
			onClick: (item) => {
				if (
					confirm(
						`Are you sure you want to remove import record "${item.referenceNo || item.importNo}"?`,
					)
				) {
					deleteMutation.mutate(item.id);
				}
			},
		},
	];

	// =========================================================================
	// 5. SUPPLIER RETURNS TABLE COLUMNS
	// =========================================================================
	const supplierReturnColumns: ColumnDef<SupplierReturn>[] = [
		{
			id: "returnNumber",
			header: "Return Number",
			accessorFn: (row) => row.returnNumber,
			sortable: true,
			cell: ({ row }) => {
				return (
					<div className="flex items-center gap-2">
						<span
							onClick={() => {
								setViewingReturnId(row.id);
								setViewingReturn(row);
							}}
							className="font-mono font-bold text-xs text-rose-700 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1.5"
						>
							<RotateCcw className="h-3.5 w-3.5 text-rose-500 shrink-0" />#
							{row.returnNumber}
						</span>
						<button
							onClick={(e) =>
								copyToClipboard(
									row.returnNumber,
									`ret-${row.id}`,
									"Return number",
									e,
								)
							}
							className="text-slate-400 hover:text-rose-600 transition-colors"
							title="Copy Return #"
						>
							{copiedKey === `ret-${row.id}` ? (
								<CheckCheck className="h-3 w-3 text-emerald-600" />
							) : (
								<Copy className="h-3 w-3" />
							)}
						</button>
					</div>
				);
			},
		},
		{
			id: "importNumber",
			header: "Origin Import",
			accessorFn: (row) =>
				row.importNumber || row.referenceNo || `IMP-${row.importId}`,
			sortable: true,
			cell: ({ row }) => {
				const impNo =
					row.importNumber ||
					row.referenceNo ||
					(row.importId ? `IMP-${row.importId}` : "—");
				return (
					<div className="flex items-center gap-2">
						<span
							onClick={() => {
								if (row.importId) {
									setViewingImportId(row.importId);
									setViewingImport(null);
								}
							}}
							className={`font-mono font-bold text-xs text-purple-700 dark:text-purple-400 flex items-center gap-1.5 ${
								row.importId ? "hover:underline cursor-pointer" : ""
							}`}
						>
							<Truck className="h-3.5 w-3.5 text-purple-500 shrink-0" />#{impNo}
						</span>
						{impNo !== "—" && (
							<button
								onClick={(e) =>
									copyToClipboard(
										impNo,
										`imp-ref-${row.id}`,
										"Import reference",
										e,
									)
								}
								className="text-slate-400 hover:text-purple-600 transition-colors"
								title="Copy Import Reference"
							>
								{copiedKey === `imp-ref-${row.id}` ? (
									<CheckCheck className="h-3 w-3 text-emerald-600" />
								) : (
									<Copy className="h-3 w-3" />
								)}
							</button>
						)}
					</div>
				);
			},
		},
		{
			id: "supplier",
			header: t("sidebar.suppliers"),
			accessorFn: (row) => row.supplierName || "Supplier",
			sortable: true,
			cell: ({ row }) => {
				const name = row.supplierName || "Supplier";
				return (
					<div className="space-y-0.5">
						<div className="flex items-center gap-2">
							<div className="h-6 w-6 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-bold text-[10px] flex items-center justify-center shrink-0">
								{name.slice(0, 2).toUpperCase()}
							</div>
							<span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
								{name}
							</span>
						</div>
						{row.warehouseName && (
							<p className="text-[10px] text-muted-foreground pl-8 truncate max-w-[160px]">
								{row.warehouseName}
							</p>
						)}
					</div>
				);
			},
		},
		{
			id: "items",
			header: "Returned Items",
			cell: ({ row }) => {
				const items = row.items || [];
				const totalUnits = items.reduce(
					(sum, it) =>
						sum + (Number(it.quantity) || Number(it.inputQuantity) || 0),
					0,
				);
				const firstItem = items[0];
				const firstLabel =
					firstItem?.variantName || firstItem?.variantSku || "";

				return (
					<div className="space-y-0.5">
						<div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
							<Boxes className="h-3.5 w-3.5 text-rose-600 shrink-0" />
							<span>
								{items.length} Line{items.length > 1 ? "s" : ""} ({totalUnits}{" "}
								units)
							</span>
							<Badge
								variant="outline"
								className={`text-[9px] px-1 py-0 h-4 font-bold ${
									row.returnAll
										? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
										: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
								}`}
							>
								{row.returnAll ? "Full" : "Partial"}
							</Badge>
						</div>
						{firstLabel && (
							<p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
								{firstLabel}
								{items.length > 1 ? ` +${items.length - 1} more` : ""}
							</p>
						)}
					</div>
				);
			},
		},
		{
			id: "totalCost",
			header: "Return Value",
			accessorFn: (row) => row.totalCost,
			sortable: true,
			cell: ({ row }) => {
				const cost = Number(row.totalCost || 0);
				return (
					<div className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
						$
						{cost.toLocaleString(undefined, {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2,
						})}
					</div>
				);
			},
		},
		{
			id: "returnDate",
			header: "Return Date",
			accessorKey: "returnDate",
			sortable: true,
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
					<span>{formatDate(row.returnDate)}</span>
				</div>
			),
		},
		{
			id: "status",
			header: t("common.status"),
			accessorKey: "status",
			sortable: true,
			cell: ({ row }) => {
				const status = (row.status || "COMPLETED").toUpperCase();
				if (status === "COMPLETED") {
					return (
						<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold gap-1">
							<CheckCircle2 className="h-3 w-3 text-emerald-600" /> COMPLETED
						</Badge>
					);
				}
				if (status === "APPROVED") {
					return (
						<Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-bold gap-1">
							<ShieldCheck className="h-3 w-3 text-blue-600" /> APPROVED
						</Badge>
					);
				}
				if (status === "PENDING") {
					return (
						<Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px] font-bold gap-1">
							<Clock className="h-3 w-3 text-amber-600" /> PENDING
						</Badge>
					);
				}
				if (status === "REJECTED") {
					return (
						<Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 text-[10px] font-bold gap-1">
							<AlertTriangle className="h-3 w-3 text-rose-600" /> REJECTED
						</Badge>
					);
				}
				return (
					<Badge
						variant="outline"
						className="text-[10px] font-bold text-slate-600 border-slate-200"
					>
						{status}
					</Badge>
				);
			},
		},
	];

	// Custom Row Actions for Supplier Returns
	const customReturnRowActions: RowAction<SupplierReturn>[] = [
		{
			id: "view-return",
			label: "View Return Voucher",
			icon: <Eye className="h-3.5 w-3.5 text-rose-600" />,
			onClick: (item) => {
				setViewingReturnId(item.id);
				setViewingReturn(item);
			},
		},
		{
			id: "view-import",
			label: "View Origin Import",
			icon: <Truck className="h-3.5 w-3.5 text-purple-600" />,
			onClick: (item) => {
				if (item.importId) {
					setViewingImportId(item.importId);
					setViewingImport(null);
				} else {
					toast.error("Origin import ID not linked");
				}
			},
		},
		{
			id: "copy-return-num",
			label: "Copy Return Number",
			icon: <Copy className="h-3.5 w-3.5 text-slate-600" />,
			onClick: (item) => {
				copyToClipboard(item.returnNumber, `ret-menu-${item.id}`, "Return #");
			},
		},
		{
			id: "copy-import-num",
			label: "Copy Import Reference",
			icon: <Copy className="h-3.5 w-3.5 text-purple-600" />,
			onClick: (item) => {
				const impRef =
					item.importNumber ||
					item.referenceNo ||
					(item.importId ? `IMP-${item.importId}` : "");
				if (impRef) {
					copyToClipboard(impRef, `imp-menu-${item.id}`, "Import Ref #");
				}
			},
		},
	];

	return (
		<div className="space-y-6">
			{/* Top Navigation Tabs: All Shipments vs Supplier Return */}
			<ModernTabs
				value={activeTab}
				onValueChange={(val) => {
					setActiveTab(val as "SHIPMENTS" | "SUPPLIER_RETURNS");
				}}
			>
				<ModernTabsList variant="pills" size="sm">
					<ModernTabsTrigger
						value="SHIPMENTS"
						badge={totalImports}
						badgeColor="purple"
						icon={<Truck className="h-3.5 w-3.5" />}
					>
						All Shipments
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="SUPPLIER_RETURNS"
						badge={totalReturns}
						badgeColor="rose"
						icon={<RotateCcw className="h-3.5 w-3.5" />}
					>
						Supplier Return
					</ModernTabsTrigger>
				</ModernTabsList>
			</ModernTabs>

			{/* ============================================================ */}
			{/* 1. ALL SHIPMENTS DATA TABLE                                  */}
			{/* ============================================================ */}
			{activeTab === "SHIPMENTS" && (
				<DataTable<InventoryImport>
					data={rawImports}
					columns={shipmentColumns}
					getRowId={(item) => String(item.id)}
					hideHeader={true}
					hideImportExport={true}
					searchPlaceholder="Search reference #, supplier..."
					searchValue={shipmentSearch}
					onSearchChange={(val) => {
						setShipmentSearch(val);
						setShipmentPage(1);
					}}
					primaryAction={
						<div className="flex items-center gap-2">
							<Button
								onClick={() => {
									setEditingImport(null);
									setIsStudioOpen(true);
								}}
								size="sm"
								className="h-9 px-3.5 rounded-lg text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								<span>New Import</span>
							</Button>

							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsShipmentFilterStudioOpen(true)}
								className={`h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer ${
									activeShipmentFilters.length > 0
										? "border-purple-400 bg-purple-50/50 text-purple-700 dark:bg-purple-950/40"
										: ""
								}`}
							>
								<SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" />
								<span>Filter Studio</span>
								{activeShipmentFilters.length > 0 && (
									<Badge className="ml-0.5 h-4 px-1.5 text-[9px] bg-purple-600 text-white">
										{activeShipmentFilters.length}
									</Badge>
								)}
							</Button>

							<Button
								variant="outline"
								size="sm"
								onClick={() => refetchShipments()}
								disabled={isShipmentsRefetching}
								className="h-9 px-2.5 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer"
								title="Refresh Shipments"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${
										isShipmentsRefetching
											? "animate-spin text-purple-600"
											: "text-muted-foreground"
									}`}
								/>
							</Button>
						</div>
					}
					actions={customShipmentRowActions}
					manualPagination={true}
					totalCount={totalImports}
					page={shipmentPage}
					pageSize={shipmentPageSize}
					onPageChange={setShipmentPage}
					onPageSizeChange={setShipmentPageSize}
					isLoading={isShipmentsLoading}
					exportFilename="inventory-stock-imports"
					emptyStateTitle="No import shipments found"
					emptyStateDescription="No inbound shipment records matching the current filters."
				/>
			)}

			{/* ============================================================ */}
			{/* 2. SUPPLIER RETURN DATA TABLE                                */}
			{/* ============================================================ */}
			{activeTab === "SUPPLIER_RETURNS" && (
				<DataTable<SupplierReturn>
					data={rawReturns}
					columns={supplierReturnColumns}
					getRowId={(item) => String(item.id)}
					hideHeader={true}
					hideImportExport={true}
					searchPlaceholder="Search return #, import #, supplier..."
					searchValue={returnSearch}
					onSearchChange={(val) => {
						setReturnSearch(val);
						setReturnPage(1);
					}}
					primaryAction={
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsReturnFilterStudioOpen(true)}
								className={`h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer ${
									activeReturnFilters.length > 0
										? "border-rose-400 bg-rose-50/50 text-rose-700 dark:bg-rose-950/40"
										: ""
								}`}
							>
								<SlidersHorizontal className="h-3.5 w-3.5 text-rose-600" />
								<span>Filter Studio</span>
								{activeReturnFilters.length > 0 && (
									<Badge className="ml-0.5 h-4 px-1.5 text-[9px] bg-rose-600 text-white">
										{activeReturnFilters.length}
									</Badge>
								)}
							</Button>

							<Button
								variant="outline"
								size="sm"
								onClick={() => refetchReturns()}
								disabled={isReturnsRefetching}
								className="h-9 px-2.5 rounded-lg text-xs font-semibold gap-1.5 border-border hover:bg-muted cursor-pointer"
								title="Refresh Returns"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${
										isReturnsRefetching
											? "animate-spin text-rose-600"
											: "text-muted-foreground"
									}`}
								/>
							</Button>
						</div>
					}
					actions={customReturnRowActions}
					manualPagination={true}
					totalCount={totalReturns}
					page={returnPage}
					pageSize={returnPageSize}
					onPageChange={setReturnPage}
					onPageSizeChange={setReturnPageSize}
					isLoading={isReturnsLoading}
					exportFilename="supplier-returns"
					emptyStateTitle="No supplier returns found"
					emptyStateDescription="No supplier return records matching the current search criteria."
				/>
			)}

			{/* ============================================================ */}
			{/* 3. DYNAMIC FILTER STUDIO MODAL FOR SHIPMENTS                 */}
			{/* ============================================================ */}
			<DynamicFilterModal
				open={isShipmentFilterStudioOpen}
				onOpenChange={setIsShipmentFilterStudioOpen}
				fields={IMPORT_DOMAIN_FILTERS}
				activeFilters={activeShipmentFilters}
				domainTitle="Import Shipments Filter Studio"
				searchValue={shipmentSearch}
				onApplyFilters={(filters) => {
					setActiveShipmentFilters(filters);
					setShipmentPage(1);
				}}
				onResetFilters={() => {
					setActiveShipmentFilters([]);
					setShipmentPage(1);
				}}
			/>

			{/* ============================================================ */}
			{/* 4. DYNAMIC FILTER STUDIO MODAL FOR SUPPLIER RETURNS          */}
			{/* ============================================================ */}
			<DynamicFilterModal
				open={isReturnFilterStudioOpen}
				onOpenChange={setIsReturnFilterStudioOpen}
				fields={SUPPLIER_RETURN_DOMAIN_FILTERS}
				activeFilters={activeReturnFilters}
				domainTitle="Supplier Returns Filter Studio"
				searchValue={returnSearch}
				onApplyFilters={(filters) => {
					setActiveReturnFilters(filters);
					setReturnPage(1);
				}}
				onResetFilters={() => {
					setActiveReturnFilters([]);
					setReturnPage(1);
				}}
			/>

			{/* ============================================================ */}
			{/* 5. DYNAMIC INVENTORY IMPORT STUDIO MODAL                     */}
			{/* ============================================================ */}
			<DynamicInventoryStudioModal
				open={isStudioOpen}
				onOpenChange={setIsStudioOpen}
				mode="IMPORT"
				referencePrefix="IMP"
				initialItems={editingImport?.items as any}
				defaultSupplierId={editingImport?.supplierId}
				defaultWarehouseId={editingImport?.warehouseId}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
				}}
			/>

			{/* ============================================================ */}
			{/* 6. INBOUND MANIFEST DETAILS DRAWER (GET /imports/{id})        */}
			{/* ============================================================ */}
			<ImportDetailsDrawer
				importId={viewingImportId}
				importData={viewingImport}
				open={Boolean(viewingImportId)}
				onClose={() => {
					setViewingImportId(null);
					setViewingImport(null);
				}}
				onEdit={(item) => {
					setEditingImport(item);
					setIsStudioOpen(true);
				}}
				onReturn={(item) => {
					setReturningImport(item);
				}}
			/>

			{/* ============================================================ */}
			{/* 7. SUPPLIER RETURN DETAILS DRAWER (GET /supplier-returns/{id})*/}
			{/* ============================================================ */}
			<SupplierReturnDetailsDrawer
				returnId={viewingReturnId}
				returnData={viewingReturn}
				open={Boolean(viewingReturnId)}
				onClose={() => {
					setViewingReturnId(null);
					setViewingReturn(null);
				}}
				onViewOriginImport={(importId) => {
					setViewingReturnId(null);
					setViewingReturn(null);
					setViewingImportId(importId);
				}}
			/>

			{/* ============================================================ */}
			{/* 8. RETURN STOCK TO SUPPLIER MODAL (POST /supplier-returns)   */}
			{/* ============================================================ */}
			<SupplierReturnModal
				importData={returningImport}
				open={Boolean(returningImport)}
				onClose={() => setReturningImport(null)}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
					queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
				}}
			/>
		</div>
	);
}

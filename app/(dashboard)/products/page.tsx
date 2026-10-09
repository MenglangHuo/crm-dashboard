"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	productsApi,
	categoriesApi,
	brandsApi,
	unitsApi,
	uploadFile,
	uploadFileWithAttachment,
	uploadService,
	fileUrl,
	storageApi,
	priceHistoryApi,
	safeImageUrl,
	DEFAULT_IMAGE_URL,
} from "@/lib/api/endpoints";
import {
	Product,
	Category,
	Brand,
	Unit,
	ProductDetails,
	VariantOperations,
	ProductUnit,
	VariantUnit,
} from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useQuickActionDispatch } from "@/components/quick-action-modal-context";
import {
	RowAction,
	PRODUCT_DOMAIN_FILTERS,
	FilterCriterion,
	buildSearchFilterPayload,
} from "@/components/ui-custom/data-table";
import { MediaPickerModal } from "@/components/attachments/media-picker-modal";
import { ProductPriceHistoryModal } from "@/components/product-price-history-modal";
import { MapProductUnitModal } from "@/components/map-product-unit-modal";
import {
	UnitHierarchyTree,
	buildUnitTree,
} from "@/components/unit-hierarchy-tree";
import { useTranslation } from "@/lib/i18n/context";
import { useCompanyContext } from "@/components/providers/company-context";
import { useDebounce } from "@/hooks/use-debounce";
import {
	Loader2,
	Package,
	Tag,
	Tags,
	Bookmark,
	Sparkles,
	ListPlus,
	Plus,
	Trash2,
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	FileSpreadsheet,
	Eye,
	DollarSign,
	TrendingUp,
	Boxes,
	Layers,
	Scale,
	LayoutGrid,
	LayoutList,
	Upload,
	Image as ImageIcon,
	FileImage,
	Pencil,
	ExternalLink,
	FolderOpen,
	X,
	Search,
	SlidersHorizontal,
	RotateCcw,
	History,
	ArrowUpRight,
	ArrowDownLeft,
	TrendingDown,
	RefreshCw,
	User,
	ChevronDown,
	CornerDownRight,
	FolderPlus,
	Camera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	DataTable,
	ColumnDef,
	StatusBadgeCell,
	UserDetailCell,
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
	ModernTextarea,
	ModernSwitch,
	ModernTagsInput,
} from "@/components/ui-custom/form-controls";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

// ============================================================
// Schemas
// ============================================================

const productSchema = z.object({
	name: z.string().min(1, "Product name is required"),
	brandId: z.string().nullable().optional(),
	categoryId: z.string().nullable().optional(),
	unitId: z.string().nullable().optional(),
	model: z.string().optional(),
	serialNumber: z.string().optional(),
	baseSku: z.string().optional(),
	baseBarcode: z.string().optional(),
	year: z.preprocess(
		(val) =>
			val === "" || val === undefined || val === null ? null : Number(val),
		z.number().nullable().optional(),
	),
	condition: z.string().default("NEW"),
	basePrice: z.coerce
		.number()
		.min(0, "Base price must be greater than or equal to 0"),
	sellPrice: z.coerce
		.number()
		.min(0, "Sell price must be greater than or equal to 0"),
	currency: z.string().default("USD"),
	description: z.string().optional(),
	imageUrl: z.string().optional(),
	color: z.string().optional(),
	lowStockThreshold: z.coerce.number().default(5),
	stockQty: z.coerce.number().default(0),
	discountNote: z.string().optional(),
	tags: z.union([z.string(), z.array(z.string())]).optional(),
	featured: z.string().default("NORMAL"),
	isSamePrice: z.boolean().default(false),
	status: z.string().default("AVAILABLE"),
	isActive: z.boolean().default(true),
	notes: z.string().optional(),
});

const categorySchema = z.object({
	name: z.string().min(1, "Category name is required"),
	description: z.string().optional(),
	color: z.string().optional(),
	parentId: z.string().nullable().optional(),
	imageUrl: z.string().optional(),
	logoUrl: z.string().optional(),
	sortOrder: z.coerce.number().default(0),
	isActive: z.boolean().default(true),
});

const brandSchema = z.object({
	name: z.string().min(1, "Brand name is required"),
	description: z.string().optional(),
	logoUrl: z.string().optional(),
	isActive: z.boolean().default(true),
});

const unitSchema = z.object({
	name: z.string().min(1, "Unit name is required"),
	symbol: z.string().optional(),
	description: z.string().optional(),
	isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;
type BrandFormValues = z.infer<typeof brandSchema>;
type UnitFormValues = z.infer<typeof unitSchema>;

// ============================================================
// Main Page Component
// ============================================================

export default function ProductsPage() {
	const { t } = useTranslation();
	const [mainTab, setMainTab] = useState<
		"products" | "categories" | "brands" | "units"
	>("products");

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-3xl font-bold tracking-tight">
					{t("products.title")}
				</h2>
				<p className="text-muted-foreground text-sm">
					{t("products.subtitle")}
				</p>
			</div>

			<ModernTabs value={mainTab} onValueChange={(val: any) => setMainTab(val)}>
				<ModernTabsList variant="glass" size="md">
					<ModernTabsTrigger
						value="products"
						icon={<Package className="h-4 w-4" />}
					>
						{t("sidebar.allProducts")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="categories"
						icon={<Tags className="h-4 w-4" />}
					>
						{t("sidebar.categories")}
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="brands"
						icon={<Bookmark className="h-4 w-4" />}
					>
						{t("sidebar.brands")}
					</ModernTabsTrigger>
					<ModernTabsTrigger value="units" icon={<Scale className="h-4 w-4" />}>
						{t("sidebar.units")}
					</ModernTabsTrigger>
				</ModernTabsList>

				<ModernTabsContent value="products">
					<ProductsTab />
				</ModernTabsContent>

				<ModernTabsContent value="categories">
					{mainTab === "categories" && <CategoriesTab />}
				</ModernTabsContent>

				<ModernTabsContent value="brands">
					{mainTab === "brands" && <BrandsTab />}
				</ModernTabsContent>

				<ModernTabsContent value="units">
					{mainTab === "units" && <UnitsTab />}
				</ModernTabsContent>
			</ModernTabs>
		</div>
	);
}

// ============================================================
// 1. PRODUCTS TAB
// ============================================================

function ProductsTab() {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const { selectedCompanyId } = useCompanyContext();
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [viewMode, setViewMode] = useState<"table" | "grid">("table");
	const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);
	const [expandedVariantIds, setExpandedVariantIds] = useState<string[]>([]);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingProduct, setEditingProduct] = useState<Product | null>(null);
	const [selectedProductDetails, setSelectedProductDetails] =
		useState<Product | null>(null);

	// Advanced Filter Bar States
	const [filterCategory, setFilterCategory] = useState("ALL");
	const [filterBrand, setFilterBrand] = useState("ALL");
	const [filterStockStatus, setFilterStockStatus] = useState("ALL");
	const [filterFeatured, setFilterFeatured] = useState("ALL");
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [minStock, setMinStock] = useState("");
	const [sortField, setSortField] = useState("createdAt");
	const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
	const [isFilterExpanded, setIsFilterExpanded] = useState(false);

	// Creation State - Has Variants?
	const [hasVariants, setHasVariants] = useState(false);
	const [attributesInput, setAttributesInput] = useState<
		{
			name: string;
			displayOrder: number;
			values: { value: string; displayOrder: number; hexColor?: string }[];
		}[]
	>([
		{
			name: "Color",
			displayOrder: 1,
			values: [
				{ value: "Black", displayOrder: 1, hexColor: "#000000" },
				{ value: "White", displayOrder: 2, hexColor: "#FFFFFF" },
			],
		},
		{
			name: "Size",
			displayOrder: 2,
			values: [
				{ value: "S", displayOrder: 1 },
				{ value: "M", displayOrder: 2 },
			],
		},
	]);
	const [excludedVariants, setExcludedVariants] = useState<
		Record<string, string>[]
	>([]);
	const [customAttributes, setCustomAttributes] = useState<
		{ key: string; value: string }[]
	>([]);
	const [variantDimensions, setVariantDimensions] = useState<{
		netWeight?: string;
		grossWeight?: string;
		height?: string;
		width?: string;
		depth?: string;
		volume?: string;
	}>({});
	const [previewedVariants, setPreviewedVariants] = useState<any[]>([]);
	const [productDialogTab, setProductDialogTab] = useState<
		"general" | "physical"
	>("general");

	const generateProductBaseSku = () => {
		const namePart =
			(form.getValues("name") || "PRD")
				.toUpperCase()
				.replace(/[^A-Z0-9]/g, "")
				.slice(0, 6) || "PRD";
		const rand = Math.floor(1000 + Math.random() * 9000);
		return `SKU-${namePart}-${rand}`;
	};

	const generateProductBaseBarcode = () => {
		const rand = Math.floor(100000000000 + Math.random() * 900000000000);
		return `89${rand}`;
	};

	// Modal Detail Sub-dialogs
	const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
	const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
	const [selectedVariant, setSelectedVariant] = useState<any>(null);
	const [isMapUnitOpen, setIsMapUnitOpen] = useState(false);

	// Forms states for variant additions
	const [newVarName, setNewVarName] = useState("");
	const [newVarSku, setNewVarSku] = useState("");
	const [newVarBarcode, setNewVarBarcode] = useState("");
	const [newVarPrice, setNewVarPrice] = useState("0");
	const [newVarCost, setNewVarCost] = useState("0");
	const [newVarStock, setNewVarStock] = useState("10");
	const [newVarColor, setNewVarColor] = useState("");
	const [newVarUnitId, setNewVarUnitId] = useState("");
	const [newVarThumbnail, setNewVarThumbnail] = useState("");
	const [newVarNetWeight, setNewVarNetWeight] = useState("");
	const [newVarGrossWeight, setNewVarGrossWeight] = useState("");
	const [newVarHeight, setNewVarHeight] = useState("");
	const [newVarWidth, setNewVarWidth] = useState("");
	const [newVarDepth, setNewVarDepth] = useState("");
	const [newVarVolume, setNewVarVolume] = useState("");

	// Unit mapping selection for edit
	const [selectedUnitForEdit, setSelectedUnitForEdit] = useState<any>(null);

	// Variant Modal Tab States
	const [addVarTab, setAddVarTab] = useState<"general" | "physical">("general");
	const [editVarTab, setEditVarTab] = useState<"general" | "physical">(
		"general",
	);

	// Price History Grouping View Mode ("all" | "byUnit")
	const [priceHistoryGroupMode, setPriceHistoryGroupMode] = useState<
		"all" | "byUnit"
	>("all");

	// Media Picker & Image Upload State
	const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
	const [mediaPickerTarget, setMediaPickerTarget] = useState<
		"product" | "newVariant" | "editVariant"
	>("product");
	const [uploadingImage, setUploadingImage] = useState(false);
	const [uploadingVariantThumbnail, setUploadingVariantThumbnail] =
		useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const addVarThumbnailInputRef = useRef<HTMLInputElement | null>(null);
	const editVarThumbnailInputRef = useRef<HTMLInputElement | null>(null);

	// Variant & Unit Specific Price History State
	const [selectedVariantIdForHistory, setSelectedVariantIdForHistory] =
		useState<string | number | null>(null);
	const [selectedUnitIdForHistory, setSelectedUnitIdForHistory] = useState<
		string | number | null
	>(null);

	// Variant Specific Image Update State
	const [variantForImageUpdate, setVariantForImageUpdate] = useState<any>(null);
	const variantFileInputRef = useRef<HTMLInputElement | null>(null);

	// Standalone Price History Modal State
	const [isStandaloneHistoryOpen, setIsStandaloneHistoryOpen] = useState(false);
	const [historyModalProduct, setHistoryModalProduct] = useState<any>(null);

	// Fetch variant-specific price history if selected
	const { data: variantPriceHistory } = useQuery({
		queryKey: ["variant-price-history", selectedVariantIdForHistory],
		queryFn: () => priceHistoryApi.getByVariant(selectedVariantIdForHistory!),
		enabled: !!selectedVariantIdForHistory,
	});

	// Image update mutations
	const updateProductImageMutation = useMutation({
		mutationFn: ({ id, imageUrl }: { id: string | number; imageUrl: string }) =>
			productsApi.updateProductImageUrl(id, imageUrl),
		onSuccess: () => {
			toast.success("Main product image updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const updateVariantImageMutation = useMutation({
		mutationFn: ({
			variantId,
			imageUrl,
		}: {
			variantId: string | number;
			imageUrl: string;
		}) => productsApi.updateVariantImageUrl(variantId, imageUrl),
		onSuccess: () => {
			toast.success("Variant image updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
			setVariantForImageUpdate(null);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const restoreMutation = useMutation({
		mutationFn: productsApi.restore,
		onSuccess: () => {
			toast.success("Product restored and reactivated!");
			queryClient.invalidateQueries({ queryKey: ["products"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const handleVariantFileUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file || !variantForImageUpdate) return;
		try {
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				category: "PRODUCTS",
				description: `Variant image: ${variantForImageUpdate.name}`,
			});
			const finalUrl = res.url || res.fileKey || "";
			updateVariantImageMutation.mutate({
				variantId: variantForImageUpdate.id,
				imageUrl: finalUrl,
			});
		} catch (err) {
			toast.error("Failed to upload variant image");
		} finally {
			if (e.target) e.target.value = "";
		}
	};

	// Batch Import State
	const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);
	const [batchDefaultBrandId, setBatchDefaultBrandId] = useState("");
	const [batchDefaultCategoryId, setBatchDefaultCategoryId] = useState("");
	const [batchDefaultCurrency, setBatchDefaultCurrency] = useState("USD");
	const [batchRows, setBatchRows] = useState<
		{
			id: string;
			name: string;
			model: string;
			serialNumber: string;
			basePrice: number;
			sellPrice: number;
			condition: string;
		}[]
	>([
		{
			id: "1",
			name: "",
			model: "",
			serialNumber: "",
			basePrice: 0,
			sellPrice: 0,
			condition: "NEW",
		},
		{
			id: "2",
			name: "",
			model: "",
			serialNumber: "",
			basePrice: 0,
			sellPrice: 0,
			condition: "NEW",
		},
	]);
	const [batchImportResult, setBatchImportResult] = useState<any>(null);

	// Active Domain Filters State for Advanced Search
	const [activeDomainFilters, setActiveDomainFilters] = useState<
		FilterCriterion[]
	>([]);

	// Fetch lists using POST /v1/products/search with fallback
	const {
		data: productsData,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: [
			"products-search",
			selectedCompanyId,
			{
				page,
				pageSize,
				search: debouncedSearch,
				activeDomainFilters,
				filterCategory,
				filterBrand,
				filterStockStatus,
				filterFeatured,
				minPrice,
				maxPrice,
				minStock,
				sortField,
				sortDirection,
			},
		],
		queryFn: async () => {
			try {
				const payload = buildSearchFilterPayload({
					searchValue: debouncedSearch,
					activeFilters: activeDomainFilters,
					sortState: [
						{ field: sortField, direction: sortDirection as "ASC" | "DESC" },
					],
					page: Math.max(0, page - 1),
					size: pageSize,
				});

				// Also merge legacy filter values if set from top controls
				if (
					filterCategory &&
					filterCategory !== "ALL" &&
					!activeDomainFilters.some((f) => f.field === "category")
				) {
					payload.filterGroup?.filters.push({
						field: "category",
						operator: "EQUAL",
						value: Number(filterCategory),
					});
				}
				if (
					filterBrand &&
					filterBrand !== "ALL" &&
					!activeDomainFilters.some((f) => f.field === "brand")
				) {
					payload.filterGroup?.filters.push({
						field: "brand",
						operator: "EQUAL",
						value: Number(filterBrand),
					});
				}
				if (
					filterStockStatus &&
					filterStockStatus !== "ALL" &&
					!activeDomainFilters.some((f) => f.field === "stockStatus")
				) {
					payload.filterGroup?.filters.push({
						field: "stockStatus",
						operator: "EQUAL",
						value: filterStockStatus,
					});
				}
				if (
					filterFeatured &&
					filterFeatured !== "ALL" &&
					!activeDomainFilters.some((f) => f.field === "featured")
				) {
					payload.filterGroup?.filters.push({
						field: "featured",
						operator: "EQUAL",
						value: filterFeatured,
					});
				}
				if (
					(minPrice !== "" || maxPrice !== "") &&
					!activeDomainFilters.some((f) => f.field === "price")
				) {
					payload.filterGroup?.filters.push({
						field: "price",
						operator: "BETWEEN",
						value: minPrice ? Number(minPrice) : 0,
						valueTo: maxPrice ? Number(maxPrice) : 9999999,
					});
				}
				if (
					minStock !== "" &&
					!activeDomainFilters.some((f) => f.field === "stock")
				) {
					payload.filterGroup?.filters.push({
						field: "stock",
						operator: "GREATER_THAN",
						value: Number(minStock),
					});
				}

				const res = await productsApi.search(payload);
				if (res) {
					const items =
						(res as any).content ||
						res.items ||
						(Array.isArray(res) ? res : []);
					return {
						items: items.map((item: any) => ({
							...item,
							id: item.id,
							name: item.name,
							categoryName: item.categoryName,
							brandName: item.brandName,
							sellPrice: getProductBasePrice(item),
							basePrice: getProductBaseCost(item),
							status: item.status || "AVAILABLE",
							isActive: item.isActive !== false,
							imageUrl: item.imageUrl,
							variants: item.variants || [],
							baseSku: item.baseSku || item.sku || item.variants?.[0]?.sku || "",
							baseBarcode: item.baseBarcode || item.barcode || item.variants?.[0]?.barcode || "",
							units: item.units || [],
						})),
						total: (res as any).totalElements || res.total || items.length,
						totalPages: res.totalPages || 1,
					};
				}
			} catch (e) {
				console.warn("Search endpoint fallback to standard list", e);
			}
			return productsApi.list({ page, limit: pageSize, search: debouncedSearch });
		},
	});

	const { data: brandsData } = useQuery({
		queryKey: ["brands-all"],
		queryFn: () => brandsApi.list({ limit: 100 }),
		enabled: isDialogOpen || isMapUnitOpen,
	});

	const { data: categoriesData } = useQuery({
		queryKey: ["categories-all"],
		queryFn: () => categoriesApi.list({ limit: 100 }),
		enabled: isDialogOpen || isMapUnitOpen,
	});

	const { data: unitsData } = useQuery({
		queryKey: ["units-all"],
		queryFn: () => unitsApi.list({ limit: 100 }),
		enabled: isDialogOpen || isMapUnitOpen,
	});

	// Full Details Query for Selected Product (carrying units, variants, lookup)
	const { data: fullProduct, isLoading: isLoadingFullDetails } = useQuery({
		queryKey: ["product-details", selectedProductDetails?.id],
		queryFn: () => productsApi.get(selectedProductDetails!.id),
		enabled: !!selectedProductDetails?.id,
	});

	// Product Units Query for Selected Product (calling /api/v1/products/:id/units)
	const { data: fetchedProductUnits = [], isLoading: isLoadingProductUnits } =
		useQuery({
			queryKey: ["product-units-list", selectedProductDetails?.id],
			queryFn: () => productsApi.getProductUnits(selectedProductDetails!.id),
			enabled: !!selectedProductDetails?.id,
		});

	const productUnitsList = useMemo(() => {
		const rawUnits =
			fetchedProductUnits && fetchedProductUnits.length > 0
				? fetchedProductUnits
				: fullProduct?.units || [];

		const mapped = rawUnits.map((u: any) => {
			const unitName = u.unitName || u.name || "Unit";
			const unitPrice =
				u.unitPrice ?? u.price ?? u.sellPrice ?? u.basePrice ?? null;
			return {
				...u,
				unitName,
				name: unitName,
				unitPrice,
			};
		});

		const tree = buildUnitTree(mapped);
		const flattened: any[] = [];
		function traverse(nodes: any[], depth = 0) {
			nodes.forEach((node) => {
				flattened.push({
					...node,
					treeDepth: depth,
					hasParent: Boolean(node.parentUnitId && node.parentUnitName),
				});
				if (node.children && node.children.length > 0) {
					traverse(node.children, depth + 1);
				}
			});
		}
		traverse(tree, 0);
		return flattened.length > 0 ? flattened : mapped;
	}, [fetchedProductUnits, fullProduct?.units]);

	// Select Unit options filtered strictly to this product's units (/products/{id}/units)
	const productSpecificUnitOptions = useMemo(() => {
		const list =
			fetchedProductUnits && fetchedProductUnits.length > 0
				? fetchedProductUnits
				: fullProduct?.units && fullProduct.units.length > 0
					? fullProduct.units
					: productUnitsList;

		if (!list || list.length === 0) {
			return (unitsData?.items || []).map((u: any) => ({
				value: String(u.id),
				label: `${u.name} (${u.symbol || u.code || "Unit"})`,
			}));
		}

		return list.map((u: any) => {
			const id = String(u.unitId ?? u.id ?? "");
			const name = u.unitName || u.name || "Unit";
			const symbol = u.symbol ? ` (${u.symbol})` : "";
			const isBaseBadge = u.isBase ? " • [Base Unit]" : "";
			return {
				value: id,
				label: `${name}${symbol}${isBaseBadge}`,
			};
		});
	}, [
		fetchedProductUnits,
		fullProduct?.units,
		productUnitsList,
		unitsData?.items,
	]);

	// Variant SKU & Barcode Generator Helpers
	const generateVariantSku = (varName?: string) => {
		const prodCode =
			fullProduct?.baseSku ||
			selectedProductDetails?.baseSku ||
			fullProduct?.name ||
			selectedProductDetails?.name ||
			"PRD";
		const cleanPrefix =
			prodCode
				.replace(/[^a-zA-Z0-9]/g, "")
				.toUpperCase()
				.slice(0, 5) || "PRD";
		const cleanVar =
			(varName || "VAR")
				.replace(/[^a-zA-Z0-9]/g, "")
				.toUpperCase()
				.slice(0, 6) || "VAR";
		const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
		return `${cleanPrefix}-${cleanVar}-${randSuffix}`;
	};

	const generateVariantBarcode = () => {
		const ts = Date.now().toString().slice(-8);
		const rand = Math.floor(1000 + Math.random() * 9000).toString();
		return `890${ts}${rand}`.slice(0, 13);
	};

	const handleVariantThumbnailUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
		isEditMode = false,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploadingVariantThumbnail(true);
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				category: "PRODUCTS",
				description: `Variant thumbnail: ${file.name}`,
			});
			const finalUrl = res.url || res.fileKey || "";
			if (isEditMode) {
				setSelectedVariant((prev: any) => ({ ...prev, thumbnail: finalUrl }));
			} else {
				setNewVarThumbnail(finalUrl);
			}
			toast.success("Variant thumbnail uploaded successfully!");
		} catch (err) {
			toast.error(getErrorMessage(err) || "Failed to upload image");
		} finally {
			setUploadingVariantThumbnail(false);
			if (e.target) e.target.value = "";
		}
	};

	// Price History Query
	const { data: priceHistory = [] } = useQuery({
		queryKey: [
			"product-price-history",
			selectedProductDetails?.id,
			selectedVariantIdForHistory,
			selectedUnitIdForHistory,
		],
		queryFn: async () => {
			if (!selectedProductDetails?.id) return [];
			if (selectedVariantIdForHistory && selectedUnitIdForHistory) {
				return priceHistoryApi.getByVariantAndUnit(
					selectedVariantIdForHistory,
					selectedUnitIdForHistory,
				);
			}
			if (selectedVariantIdForHistory) {
				return priceHistoryApi.getByVariant(selectedVariantIdForHistory);
			}
			return priceHistoryApi.getByProduct(selectedProductDetails.id);
		},
		enabled: !!selectedProductDetails?.id,
	});

	const brandMap = useMemo(() => {
		const map = new Map<string, string>();
		brandsData?.items?.forEach((b) => map.set(String(b.id), b.name));
		return map;
	}, [brandsData]);

	const categoryMap = useMemo(() => {
		const map = new Map<string, string>();
		categoriesData?.items?.forEach((c) => map.set(String(c.id), c.name));
		return map;
	}, [categoriesData]);

	const brandNameToIdMap = useMemo(() => {
		const map = new Map<string, string>();
		brandsData?.items?.forEach((b) =>
			map.set(b.name.toLowerCase().trim(), String(b.id)),
		);
		return map;
	}, [brandsData]);

	const categoryNameToIdMap = useMemo(() => {
		const map = new Map<string, string>();
		categoriesData?.items?.forEach((c) =>
			map.set(c.name.toLowerCase().trim(), String(c.id)),
		);
		return map;
	}, [categoriesData]);

	// KPI Metrics Calculation
	const metrics = useMemo(() => {
		const items = productsData?.items || [];
		const totalCount = productsData?.total || items.length;
		const availableCount = items.filter(
			(p: any) => p.status === "AVAILABLE" || !p.status,
		).length;
		const reservedCount = items.filter(
			(p: any) => p.status === "RESERVED" || p.status === "IN_LOAN",
		).length;
		const totalValue = items.reduce(
			(sum: number, p: any) => sum + (p.sellPrice || p.basePrice || 0),
			0,
		);
		return { totalCount, availableCount, reservedCount, totalValue };
	}, [productsData]);

	// Handle Search Input
	const handleSearchChange = (val: string) => {
		setSearch(val);
		setPage(1);
	};

	// Handle preview variants combinations
	const handlePreviewVariants = async () => {
		const name = form.watch("name");
		const brandId = form.watch("brandId");
		const categoryId = form.watch("categoryId");
		const unitId = form.watch("unitId");
		const price = form.watch("sellPrice");
		const cost = form.watch("basePrice");
		const baseSku =
			form.watch("baseSku") ||
			form.watch("serialNumber") ||
			`SKU-${Date.now().toString().slice(-4)}`;

		if (!name || !categoryId || !brandId || !unitId) {
			toast.error("Please fill in Name, Category, Brand, and Base Unit first.");
			return;
		}

		const formattedProductAttributes = attributesInput.map((attr, idx) => ({
			name: attr.name,
			displayOrder: attr.displayOrder || idx + 1,
			description: `${attr.name} options`,
			values: attr.values.map((vObj, vIdx) => ({
				value: vObj.value.trim(),
				displayOrder: vObj.displayOrder || vIdx + 1,
				hexColor: vObj.hexColor || undefined,
			})),
		}));

		const payload = {
			productAttributes: formattedProductAttributes,
			baseSku: baseSku,
			price: Number(price) || 0,
		};

		try {
			const res = await productsApi.previewVariantProduct(payload);
			const rawVariants = res?.data?.variants || res?.variants || [];
			if (rawVariants && rawVariants.length > 0) {
				setPreviewedVariants(
					rawVariants.map((v: any, index: number) => ({
						id: String(index),
						name:
							v.name ||
							`${name} ${Object.values(v.attributes || {}).join(" ")}`.trim(),
						sku: v.sku,
						barcode: v.barcode || v.sku,
						price: v.price || price || 0,
						cost: cost || 0,
						stockQty: 10,
						attributes: v.attributes,
					})),
				);
				toast.success("Combinations preview generated successfully!");
			} else {
				toast.info("No variant combinations were returned by preview service.");
			}
		} catch (err) {
			toast.error(
				getErrorMessage(err) || "Failed to generate combinations preview",
			);
		}
	};

	const handleDirectFileUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploadingImage(true);
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				category: "PRODUCTS",
				description: `Product asset image: ${file.name}`,
			});
			const finalUrl = res.url || res.fileKey || "";
			form.setValue("imageUrl", finalUrl);
			toast.success("Image uploaded successfully!");
		} catch (err) {
			toast.error(getErrorMessage(err) || "Failed to upload image");
		} finally {
			setUploadingImage(false);
			if (e.target) e.target.value = "";
		}
	};

	const form = useForm<ProductFormValues>({
		resolver: zodResolver(productSchema as any),
		defaultValues: {
			name: "",
			brandId: "",
			categoryId: "",
			unitId: "",
			model: "",
			serialNumber: "",
			baseSku: "",
			baseBarcode: "",
			year: null,
			condition: "NEW",
			basePrice: 0,
			sellPrice: 0,
			currency: "USD",
			description: "",
			imageUrl: "",
			color: "",
			lowStockThreshold: 5,
			stockQty: 0,
			discountNote: "",
			tags: "",
			featured: "NORMAL",
			isSamePrice: false,
			status: "AVAILABLE",
			isActive: true,
			notes: "",
		},
	});

	const createMutation = useMutation({
		mutationFn: (payload: any) => {
			if (hasVariants) {
				return productsApi.createVariantProduct(payload);
			} else {
				return productsApi.createSimpleProduct(payload);
			}
		},
		onSuccess: () => {
			toast.success(
				hasVariants
					? "Product with variants created!"
					: "Simple product created!",
			);
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["products-search"] });
			setIsDialogOpen(false);
			form.reset();
			setPreviewedVariants([]);
			setExcludedVariants([]);
			setCustomAttributes([]);
			setVariantDimensions({});
			setHasVariants(false);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string | number;
			body: Partial<Product>;
		}) => productsApi.update(id, body),
		onSuccess: () => {
			toast.success("Product updated successfully");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["products-search"] });
			setIsDialogOpen(false);
			setEditingProduct(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: productsApi.remove,
		onSuccess: () => {
			toast.success("Product deleted");
			queryClient.invalidateQueries({ queryKey: ["products"] });
			queryClient.invalidateQueries({ queryKey: ["products-search"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const batchImportMutation = useMutation({
		mutationFn: productsApi.importBatch,
		onSuccess: (res) => {
			setBatchImportResult(res);
			if (res.successCount > 0) {
				toast.success(
					`Batch import completed: ${res.successCount} items created`,
				);
				queryClient.invalidateQueries({ queryKey: ["products"] });
				queryClient.invalidateQueries({ queryKey: ["products-search"] });
			} else {
				toast.error(`Batch import failed. ${res.failedCount} items failed.`);
			}
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Dialog operations
	const openCreate = () => {
		setEditingProduct(null);
		setHasVariants(false);
		setPreviewedVariants([]);
		setExcludedVariants([]);
		setCustomAttributes([]);
		setVariantDimensions({});
		setProductDialogTab("general");
		form.reset({
			name: "",
			brandId: "",
			categoryId: "",
			unitId: "",
			model: "",
			serialNumber: "",
			baseSku: "",
			baseBarcode: "",
			year: null,
			condition: "NEW",
			basePrice: 0,
			sellPrice: 0,
			currency: "USD",
			description: "",
			imageUrl: "",
			color: "",
			lowStockThreshold: 5,
			stockQty: 0,
			discountNote: "",
			tags: [],
			featured: "NORMAL",
			isSamePrice: false,
			status: "AVAILABLE",
			isActive: true,
			notes: "",
		});
		setIsDialogOpen(true);
	};

	const openEdit = async (product: any) => {
		let full: any = product;
		try {
			if (product.id) {
				const res = await productsApi.get(product.id);
				if (res) full = res;
			}
		} catch (e) {
			console.warn(
				"Could not fetch full details, using local product object",
				e,
			);
		}

		setEditingProduct(full);
		setHasVariants(false);
		setVariantDimensions({
			netWeight: full.variantAttributes?.netWeight
				? String(full.variantAttributes.netWeight)
				: "",
			grossWeight: full.variantAttributes?.grossWeight
				? String(full.variantAttributes.grossWeight)
				: "",
			height: full.variantAttributes?.height
				? String(full.variantAttributes.height)
				: "",
			width: full.variantAttributes?.width
				? String(full.variantAttributes.width)
				: "",
			depth: full.variantAttributes?.depth
				? String(full.variantAttributes.depth)
				: "",
			volume: full.variantAttributes?.volume || "",
		});
		setProductDialogTab("general");

		let resolvedBrandId = full.brandId ? String(full.brandId) : "";
		if (!resolvedBrandId && full.brandName) {
			resolvedBrandId =
				brandNameToIdMap.get(full.brandName.toLowerCase().trim()) || "";
		}

		let resolvedCategoryId = full.categoryId ? String(full.categoryId) : "";
		if (!resolvedCategoryId && full.categoryName) {
			resolvedCategoryId =
				categoryNameToIdMap.get(full.categoryName.toLowerCase().trim()) || "";
		}

		const baseUnitObj = getProductBaseUnit(full);

		const resolvedUnitId = full.unitId
			? String(full.unitId)
			: baseUnitObj?.unitId
				? String(baseUnitObj.unitId)
				: full.units?.[0]?.unitId
					? String(full.units[0].unitId)
					: unitsData?.items?.[0]?.id
						? String(unitsData.items[0].id)
						: "";

		const sellPrice = getProductBasePrice(full);
		const basePrice = getProductBaseCost(full);

		const resolvedSku =
			full.baseSku ||
			full.sku ||
			full.skuCode ||
			full.code ||
			full.variants?.[0]?.sku ||
			full.variants?.[0]?.skuCode ||
			full.variants?.[0]?.baseSku ||
			product?.baseSku ||
			product?.sku ||
			product?.skuCode ||
			product?.code ||
			product?.variants?.[0]?.sku ||
			full.serialNumber ||
			product?.serialNumber ||
			"";

		const resolvedBarcode =
			full.baseBarcode ||
			full.barcode ||
			full.barCode ||
			full.variants?.[0]?.barcode ||
			full.variants?.[0]?.barCode ||
			full.variants?.[0]?.baseBarcode ||
			product?.baseBarcode ||
			product?.barcode ||
			product?.barCode ||
			product?.variants?.[0]?.barcode ||
			"";

		const tagsList: string[] = Array.isArray(full.tags)
			? full.tags
					.map((tag: any) =>
						typeof tag === "string" ? tag : tag?.name || tag?.tagName || "",
					)
					.filter(Boolean)
			: typeof full.tags === "string" && full.tags.trim()
				? full.tags
						.split(",")
						.map((s: string) => s.trim())
						.filter(Boolean)
				: [];

		form.reset({
			name: full.name || "",
			brandId: resolvedBrandId,
			categoryId: resolvedCategoryId,
			unitId: resolvedUnitId,
			model: full.model || "",
			serialNumber: full.serialNumber || resolvedSku,
			baseSku: resolvedSku,
			baseBarcode: resolvedBarcode,
			year: full.year ?? null,
			condition: full.condition || "NEW",
			basePrice: Number(basePrice) || 0,
			sellPrice: Number(sellPrice) || 0,
			currency: full.currency || "USD",
			description: full.description || "",
			imageUrl: full.imageUrl || "",
			color: full.color || "",
			lowStockThreshold: full.lowStockThreshold || 5,
			stockQty: full.stockQty || 0,
			discountNote: full.discountNote || "",
			tags: tagsList,
			featured: full.featured || "NORMAL",
			isSamePrice: false,
			status: full.status || "AVAILABLE",
			isActive: full.isActive !== false,
			notes: full.notes || "",
		});

		setIsDialogOpen(true);
	};

	const onSubmit = async (values: ProductFormValues) => {
		const variantAttributesObj: Record<string, any> = {};
		if (variantDimensions.netWeight)
			variantAttributesObj.netWeight = Number(variantDimensions.netWeight);
		if (variantDimensions.grossWeight)
			variantAttributesObj.grossWeight = Number(variantDimensions.grossWeight);
		if (variantDimensions.height)
			variantAttributesObj.height = Number(variantDimensions.height);
		if (variantDimensions.width)
			variantAttributesObj.width = Number(variantDimensions.width);
		if (variantDimensions.depth)
			variantAttributesObj.depth = Number(variantDimensions.depth);
		if (variantDimensions.volume)
			variantAttributesObj.volume = variantDimensions.volume;

		if (editingProduct) {
			try {
				const tagsArray = values.tags
					? Array.isArray(values.tags)
						? values.tags
						: values.tags
								.split(",")
								.map((t: string) => t.trim())
								.filter(Boolean)
					: [];

				await productsApi.update(editingProduct.id, {
					name: values.name,
					description: values.description || undefined,
					brandId: values.brandId ? Number(values.brandId) : undefined,
					categoryId: values.categoryId ? Number(values.categoryId) : undefined,
					baseSku:
						values.baseSku ||
						values.serialNumber ||
						editingProduct.baseSku ||
						undefined,
					skuCode:
						values.baseSku ||
						values.serialNumber ||
						editingProduct.baseSku ||
						undefined,
					baseBarcode:
						values.baseBarcode ||
						values.serialNumber ||
						editingProduct.baseBarcode ||
						undefined,
					barcode:
						values.baseBarcode ||
						values.serialNumber ||
						editingProduct.baseBarcode ||
						undefined,
					imageUrl: values.imageUrl || undefined,
					color: values.color || undefined,
					tags: tagsArray,
					featured: values.featured,
					lowStockThreshold: values.lowStockThreshold
						? Number(values.lowStockThreshold)
						: undefined,
					price: values.sellPrice ? Number(values.sellPrice) : undefined,
					sellPrice: values.sellPrice ? Number(values.sellPrice) : undefined,
					cost: values.basePrice ? Number(values.basePrice) : undefined,
					basePrice: values.basePrice ? Number(values.basePrice) : undefined,
					discountNote: values.discountNote || undefined,
				});

				toast.success("Product updated successfully!");
				queryClient.invalidateQueries({ queryKey: ["products"] });
				queryClient.invalidateQueries({ queryKey: ["products-search"] });
				queryClient.invalidateQueries({ queryKey: ["product-details"] });
				setIsDialogOpen(false);
				setEditingProduct(null);
			} catch (err) {
				toast.error(getErrorMessage(err) || "Failed to update product");
			}
		} else {
			const tagsArray = values.tags
				? Array.isArray(values.tags)
					? values.tags
					: values.tags
							.split(",")
							.map((t: string) => t.trim())
							.filter(Boolean)
				: [];

			if (!hasVariants) {
				const payload: any = {
					name: values.name,
					description: values.description || undefined,
					brandId: Number(values.brandId),
					categoryId: Number(values.categoryId),
					tags: tagsArray,
					baseSku: values.baseSku || values.serialNumber || `SKU-${Date.now()}`,
					baseBarcode:
						values.baseBarcode || values.serialNumber || `BAR-${Date.now()}`,
					imageUrl: values.imageUrl || undefined,
					lowStockThreshold: Number(values.lowStockThreshold) || 5,
					unitId: Number(values.unitId || 1),
					price: Number(values.sellPrice) || 0,
					cost: Number(values.basePrice) || 0,
					discountNote: values.discountNote || undefined,
					variantAttributes:
						Object.keys(variantAttributesObj).length > 0
							? variantAttributesObj
							: undefined,
				};
				createMutation.mutate(payload);
			} else {
				const activeVariants = previewedVariants.filter((pv) => {
					return !excludedVariants.some((ex) => {
						return Object.entries(ex).every(([k, v]) => pv.attributes[k] === v);
					});
				});

				if (activeVariants.length === 0) {
					toast.error(
						"Please configure and preview variant combinations before creating the product.",
					);
					return;
				}

				const payload: any = {
					brandId: Number(values.brandId),
					categoryId: Number(values.categoryId),
					unitId: Number(values.unitId || 1),
					name: values.name,
					description: values.description || undefined,
					imageUrl: values.imageUrl || undefined,
					baseSku: values.baseSku || values.serialNumber || `SKU-${Date.now()}`,
					baseBarcode:
						values.baseBarcode || values.serialNumber || `BAR-${Date.now()}`,
					price: Number(values.sellPrice) || 0,
					cost: Number(values.basePrice) || 0,
					featured: values.featured || "NEW_ARRIVAL",
					lowStockThreshold: Number(values.lowStockThreshold) || 10,
					isSamePrice: false,
					tags: tagsArray,
					excludedVariants:
						excludedVariants.length > 0 ? excludedVariants : undefined,
					variants: activeVariants.map((v) => ({
						attributes: v.attributes,
						price: Number(v.price) || Number(values.sellPrice) || 0,
						sku: v.sku,
						barcode: v.barcode || v.sku,
						name: v.name || Object.values(v.attributes).join(" "),
					})),
					discountNote: values.discountNote || undefined,
				};
				createMutation.mutate(payload);
			}
		}
	};

	// Variant operations mutations (add/edit)
	const addVariantMutation = useMutation({
		mutationFn: (body: any) =>
			productsApi.addVariant(selectedProductDetails!.id, body),
		onSuccess: () => {
			toast.success("Variant added successfully!");
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
			setIsAddVariantOpen(false);
			resetAddVariantForm();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const updateVariantMutation = useMutation({
		mutationFn: (body: any) =>
			productsApi.updateVariant(selectedVariant.id, body),
		onSuccess: () => {
			toast.success("Variant updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
			setIsEditVariantOpen(false);
			setSelectedVariant(null);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const addUnitMutation = useMutation({
		mutationFn: (body: any) =>
			productsApi.addProductUnits(selectedProductDetails!.id, body),
		onSuccess: () => {
			toast.success("Product unit conversion saved successfully!");
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
			queryClient.invalidateQueries({ queryKey: ["product-units-list"] });
			setIsMapUnitOpen(false);
			setSelectedUnitForEdit(null);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const deleteUnitMutation = useMutation({
		mutationFn: (unitId: string | number) =>
			productsApi.deleteProductUnit(selectedProductDetails!.id, unitId),
		onSuccess: () => {
			toast.success("Unit mapping removed successfully!");
			queryClient.invalidateQueries({ queryKey: ["product-details"] });
			queryClient.invalidateQueries({ queryKey: ["product-units-list"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const resetAddVariantForm = () => {
		setAddVarTab("general");
		setNewVarName("");
		setNewVarSku("");
		setNewVarBarcode("");
		setNewVarPrice("0");
		setNewVarCost("0");
		setNewVarStock("10");
		setNewVarColor("");
		const baseUnit =
			productUnitsList.find((u: any) => u.isBase) || productUnitsList[0];
		setNewVarUnitId(
			baseUnit ? String(baseUnit.unitId ?? baseUnit.id ?? "") : "",
		);
		setNewVarThumbnail("");
		setNewVarNetWeight("");
		setNewVarGrossWeight("");
		setNewVarHeight("");
		setNewVarWidth("");
		setNewVarDepth("");
		setNewVarVolume("");
	};

	const handleAddVariantSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newVarName || !newVarSku || !newVarUnitId) {
			toast.error("Please fill in Name, SKU, and Unit for the variant.");
			return;
		}
		const varAttrs: Record<string, any> = {};
		if (newVarNetWeight) varAttrs.netWeight = Number(newVarNetWeight);
		if (newVarGrossWeight) varAttrs.grossWeight = Number(newVarGrossWeight);
		if (newVarHeight) varAttrs.height = Number(newVarHeight);
		if (newVarWidth) varAttrs.width = Number(newVarWidth);
		if (newVarDepth) varAttrs.depth = Number(newVarDepth);
		if (newVarVolume) varAttrs.volume = newVarVolume;

		addVariantMutation.mutate({
			name: newVarName,
			sku: newVarSku,
			barcode: newVarBarcode || newVarSku,
			thumbnail: newVarThumbnail || undefined,
			variantAttributes:
				Object.keys(varAttrs).length > 0 ? varAttrs : undefined,
			price: Number(newVarPrice),
			unitId: Number(newVarUnitId),
		});
	};

	const handleUpdateVariantSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedVariant) return;

		const varAttrs: Record<string, any> =
			selectedVariant.variantAttributes || {};
		if (selectedVariant.netWeight !== undefined)
			varAttrs.netWeight = Number(selectedVariant.netWeight);
		if (selectedVariant.grossWeight !== undefined)
			varAttrs.grossWeight = Number(selectedVariant.grossWeight);
		if (selectedVariant.height !== undefined)
			varAttrs.height = Number(selectedVariant.height);
		if (selectedVariant.width !== undefined)
			varAttrs.width = Number(selectedVariant.width);
		if (selectedVariant.depth !== undefined)
			varAttrs.depth = Number(selectedVariant.depth);
		if (selectedVariant.volume !== undefined)
			varAttrs.volume = selectedVariant.volume;

		updateVariantMutation.mutate({
			name: selectedVariant.name,
			sku: selectedVariant.sku,
			barcode: selectedVariant.barcode || selectedVariant.sku,
			thumbnail: selectedVariant.thumbnail || undefined,
			variantAttributes:
				Object.keys(varAttrs).length > 0 ? varAttrs : undefined,
			price: Number(selectedVariant.price),
			unitId: Number(selectedVariant.unitId || 1),
		});
	};

	const toggleActive = (product: Product) => {
		updateMutation.mutate({
			id: product.id,
			body: {
				...product,
				isActive: !product.isActive,
			},
		});
	};

	const columns: ColumnDef<Product>[] = [
		{
			id: "expand",
			header: "",
			width: "40px",
			cell: ({ row }: { row: any }) => {
				const isExpanded = expandedProductIds.includes(String(row.id));
				const hasVariantsCount = row.variants?.length > 0;
				return (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
						onClick={(e) => {
							e.stopPropagation();
							setExpandedProductIds((prev) =>
								prev.includes(String(row.id))
									? prev.filter((id) => id !== String(row.id))
									: [...prev, String(row.id)],
							);
						}}
						title={
							isExpanded ? "Collapse Details" : "Expand Variant List & Details"
						}
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform duration-200",
								isExpanded
									? "rotate-180 text-purple-600 dark:text-purple-400 font-bold"
									: "",
							)}
						/>
					</Button>
				);
			},
		},
		{
			id: "name",
			header: t("products.productName"),
			accessorKey: "name",
			sortable: true,
			stickyLeft: true,
			cell: ({ row }: { row: any }) => (
				<div
					className="cursor-pointer group flex items-center gap-2 pr-2"
					onClick={() => setSelectedProductDetails(row)}
				>
					<UserDetailCell
						name={row.name}
						subtitle={
							row.model
								? `Model: ${row.model}`
								: row.serialNumber
									? `S/N: ${row.serialNumber}`
									: undefined
						}
						avatarUrl={row.imageUrl}
					/>
					{row.variants && row.variants.length > 0 ? (
						<Badge
							variant="outline"
							className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 font-bold shrink-0"
						>
							{row.variants.length} Var
						</Badge>
					) : (
						<Badge
							variant="ghost"
							className="text-[9px] text-slate-400 font-normal shrink-0"
						>
							Simple
						</Badge>
					)}
				</div>
			),
		},
		{
			id: "sku",
			header: t("products.sku"),
			accessorKey: "baseSku",
			accessorFn: (row: any) =>
				row.baseSku ||
				row.sku ||
				(row.variants && row.variants.length > 0
					? row.variants.map((v: any) => v.sku).filter(Boolean).join(" ")
					: "") ||
				"",
			sortable: true,
			cell: ({ row }: { row: any }) => {
				const sku = row.baseSku || row.sku || row.variants?.[0]?.sku || "—";
				return (
					<span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
						{sku}
					</span>
				);
			},
		},
		{
			id: "barcode",
			header: t("products.barcode"),
			accessorKey: "baseBarcode",
			accessorFn: (row: any) =>
				row.baseBarcode ||
				row.barcode ||
				(row.variants && row.variants.length > 0
					? row.variants
							.map((v: any) => v.barcode)
							.filter(Boolean)
							.join(" ")
					: "") ||
				"",
			sortable: true,
			cell: ({ row }: { row: any }) => {
				const barcode =
					row.baseBarcode || row.barcode || row.variants?.[0]?.barcode || null;
				return barcode ? (
					<span className="font-mono text-xs text-slate-500">{barcode}</span>
				) : (
					<span className="text-[11px] text-slate-400">—</span>
				);
			},
		},
		{
			id: "category",
			header: t("products.category"),
			accessorKey: "categoryName",
			sortable: true,
			cell: ({ row }: { row: any }) => {
				const catName =
					row.categoryName ||
					(row.categoryId ? categoryMap.get(String(row.categoryId)) : null);
				return catName ? (
					<Badge
						variant="secondary"
						className="text-[10px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 font-semibold"
					>
						{catName}
					</Badge>
				) : (
					<span className="text-[11px] text-slate-400">—</span>
				);
			},
		},
		{
			id: "brand",
			header: t("products.brand"),
			accessorKey: "brandName",
			sortable: true,
			cell: ({ row }: { row: any }) => {
				const brandName =
					row.brandName ||
					(row.brandId ? brandMap.get(String(row.brandId)) : null);
				return brandName ? (
					<Badge
						variant="outline"
						className="text-[10px] text-sky-600 border-sky-200 dark:text-sky-400 font-semibold"
					>
						{brandName}
					</Badge>
				) : (
					<span className="text-[11px] text-slate-400">—</span>
				);
			},
		},
		{
			id: "pricing",
			header: t("products.sellingPrice"),
			cell: ({ row }: { row: any }) => {
				const price = getProductBasePrice(row);
				const baseUnit = getProductBaseUnit(row);
				const unitLabel =
					row.unitName ||
					row.baseUnitName ||
					baseUnit?.unitName ||
					baseUnit?.name ||
					(baseUnit?.symbol ? `(${baseUnit.symbol})` : "") ||
					"";
				return (
					<div>
						<div className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
							$
							{Number(price || 0).toLocaleString(undefined, {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</div>
						{unitLabel && (
							<span className="text-[10px] text-slate-400 font-medium block mt-0.5">
								/ {unitLabel}
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: "inventory",
			header: t("products.stockQuantity"),
			cell: ({ row }: { row: any }) => {
				let stock = row.stockQty ?? row.stock;
				if (
					(stock === undefined || stock === 0) &&
					row.variants &&
					row.variants.length > 0
				) {
					stock = row.variants.reduce(
						(acc: number, v: any) => acc + getVariantStock(v, row),
						0,
					);
				}
				stock = Number(stock || 0);
				const lowThreshold = row.lowStockThreshold || 5;
				const isLow = stock <= lowThreshold;
				return (
					<div>
						<div className="flex items-center gap-1.5">
							<Badge
								variant={
									stock > 0 ? (isLow ? "outline" : "secondary") : "destructive"
								}
								className="text-[10px] font-bold"
							>
								{stock} units
							</Badge>
						</div>
						{isLow && stock > 0 && (
							<div className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 flex items-center gap-1">
								<AlertCircle className="h-2.5 w-2.5" /> Threshold:{" "}
								{lowThreshold}
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "units",
			header: t("products.mapUnits"),
			cell: ({ row }: { row: any }) => {
				const unitsCount = row.units?.length || 0;
				return (
					<Badge
						variant="outline"
						className="text-[10px] bg-slate-50 font-semibold dark:bg-slate-900"
					>
						{unitsCount} Unit(s)
					</Badge>
				);
			},
		},
		{
			id: "isActive",
			header: t("products.status"),
			accessorKey: "isActive",
			cell: ({ row }: { row: any }) => (
				<Switch
					checked={row.isActive !== false}
					onCheckedChange={(checked) => {
						if (checked) {
							restoreMutation.mutate(row.id);
						} else {
							deleteMutation.mutate(row.id);
						}
					}}
				/>
			),
		},
	];

	const { openLoanWizard } = useQuickActionDispatch();

	const productActions: RowAction<Product>[] = [
		{
			label: "View Details",
			icon: <Eye className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (product) => setSelectedProductDetails(product),
		},
		{
			label: "+ Loan Asset",
			icon: <Sparkles className="h-3.5 w-3.5 text-emerald-500" />,
			onClick: (product) => {
				openLoanWizard({
					productId: String(product.id),
					productName: product.name,
					sellPrice: product.sellPrice || product.basePrice || 0,
				});
			},
		},
		{
			label: "Price History",
			icon: <History className="h-3.5 w-3.5 text-purple-500" />,
			onClick: (product) => {
				setHistoryModalProduct(product);
				setIsStandaloneHistoryOpen(true);
			},
		},
	];

	return (
		<div className="space-y-4">
			{/* Hidden input for direct variant image updates */}
			<input
				ref={variantFileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleVariantFileUpload}
			/>

			{/* Overview Banner and Actions */}

			{viewMode === "table" ? (
				<DataTable<Product>
					data={(productsData?.items || []).map((p: any) => ({
						...p,
						_isExpanded: expandedProductIds.includes(String(p.id)),
					}))}
					columns={columns}
					getRowId={(p) => String(p.id)}
					hideHeader={true}
					hideImportExport={true}
					expandedRowIds={expandedProductIds}
					onToggleExpandRow={(rowId) =>
						setExpandedProductIds((prev) =>
							prev.includes(rowId)
								? prev.filter((id) => id !== rowId)
								: [...prev, rowId],
						)
					}
					searchPlaceholder={t("common.search")}
					searchValue={search}
					onSearchChange={handleSearchChange}
					primaryAction={
						<div className="flex items-center gap-2">
							<div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/40">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={() => setViewMode("table")}
									className="h-7 px-2 text-xs cursor-pointer"
								>
									<LayoutList className="h-3.5 w-3.5 mr-1" /> Table
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setViewMode("grid")}
									className="h-7 px-2 text-xs cursor-pointer"
								>
									<LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
								</Button>
							</div>
							<Button
								onClick={openCreate}
								className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-xs gap-1.5 text-xs transition-all cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								<span>{t("products.addNewProduct", "New Product")}</span>
							</Button>
						</div>
					}
					manualPagination={true}
					manualFiltering={true}
					manualSorting={true}
					sortState={
						sortField
							? {
									columnId: sortField,
									direction: sortDirection.toLowerCase() as "asc" | "desc",
							  }
							: null
					}
					onSortChange={(nextSort) => {
						if (nextSort) {
							setSortField(nextSort.columnId);
							setSortDirection(
								nextSort.direction.toUpperCase() as "ASC" | "DESC",
							);
						} else {
							setSortField("createdAt");
							setSortDirection("DESC");
						}
						setPage(1);
					}}
					totalCount={productsData?.total || 0}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					isLoading={isLoading}
					isError={isError}
					error={error}
					onRetry={() => refetch()}
					onEditRow={openEdit}
					onDeleteRow={(p) => deleteMutation.mutate(p.id)}
					customRowActions={productActions}
					activeDomainFilters={activeDomainFilters}
					domainFilterFields={PRODUCT_DOMAIN_FILTERS}
					domainTitle="Product Asset Catalog Filter Studio"
					onDomainFilterChange={(filters) => {
						setActiveDomainFilters(filters);
						setPage(1);
					}}
					onSearchFilterChange={(payload) => {
						if (payload.filterGroup?.filters) {
							const domainOnly = payload.filterGroup.filters.filter(
								(f) => f.field !== "search",
							);
							setActiveDomainFilters(domainOnly);
							setPage(1);
						}
					}}
					renderSubComponent={(product) => (
						<ProductVariantsAccordionSubRow
							product={product}
							categoryMap={categoryMap}
							brandMap={brandMap}
						/>
					)}
				/>
			) : (
				/* GRID VIEW */
				<div className="space-y-4">
					{/* ADVANCED FILTER TOOLBAR */}
					<div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
							<div className="relative flex-1 max-w-md">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
								<Input
									value={search}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder="Full-text search product name, SKU, barcode..."
									className="h-9 text-xs pl-9 pr-8 rounded-xl"
								/>
								{search && (
									<button
										onClick={() => {
											setSearch("");
										}}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
									>
										<X className="h-3.5 w-3.5" />
									</button>
								)}
							</div>

							<div className="flex items-center gap-2 justify-between sm:justify-end flex-wrap">
								<span className="text-xs text-muted-foreground font-medium hidden sm:inline">
									Showing {productsData?.items?.length || 0} of{" "}
									{productsData?.total || 0} items
								</span>
								<div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/40">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => setViewMode("table")}
										className="h-7 px-2 text-xs cursor-pointer"
									>
										<LayoutList className="h-3.5 w-3.5 mr-1" /> Table
									</Button>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										onClick={() => setViewMode("grid")}
										className="h-7 px-2 text-xs cursor-pointer"
									>
										<LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
									</Button>
								</div>
								<Button
									type="button"
									variant={isFilterExpanded ? "secondary" : "outline"}
									size="sm"
									onClick={() => setIsFilterExpanded(!isFilterExpanded)}
									className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-lg border cursor-pointer"
								>
									<SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
									<span>Filters</span>
									{(filterCategory !== "ALL" ||
										filterBrand !== "ALL" ||
										filterStockStatus !== "ALL" ||
										filterFeatured !== "ALL" ||
										minPrice ||
										maxPrice ||
										minStock) && (
										<Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1 rounded-full ml-1">
											Active
										</Badge>
									)}
								</Button>
								<Button
									onClick={openCreate}
									className="h-9 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-xs gap-1.5 cursor-pointer"
								>
									<Plus className="h-3.5 w-3.5" />
									<span>{t("products.addNewProduct", "New Product")}</span>
								</Button>
							</div>
						</div>

						{/* EXPANDABLE ADVANCED FILTER CONTROLS */}
						{isFilterExpanded && (
							<div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
								<ModernSelect
									label="Category"
									value={filterCategory}
									onChange={(val) => {
										setFilterCategory(val);
										setPage(1);
									}}
									options={[
										{ value: "ALL", label: "All Categories" },
										...(categoriesData?.items?.map((c) => ({
											value: String(c.id),
											label: c.name,
										})) || []),
									]}
								/>

								<ModernSelect
									label="Brand"
									value={filterBrand}
									onChange={(val) => {
										setFilterBrand(val);
										setPage(1);
									}}
									options={[
										{ value: "ALL", label: "All Brands" },
										...(brandsData?.items?.map((b) => ({
											value: String(b.id),
											label: b.name,
										})) || []),
									]}
								/>

								<ModernSelect
									label="Stock Status"
									value={filterStockStatus}
									onChange={(val) => {
										setFilterStockStatus(val);
										setPage(1);
									}}
									options={[
										{ value: "ALL", label: "All Statuses" },
										{ value: "IN_STOCK", label: "In Stock" },
										{ value: "OUT_OF_STOCK", label: "Out of Stock" },
										{ value: "LOW_STOCK", label: "Low Stock" },
									]}
								/>

								<ModernSelect
									label="Featured Tag"
									value={filterFeatured}
									onChange={(val) => {
										setFilterFeatured(val);
										setPage(1);
									}}
									options={[
										{ value: "ALL", label: "All Types" },
										{ value: "NORMAL", label: "Standard" },
										{ value: "NEW_ARRIVAL", label: "New Arrival" },
										{ value: "FEATURED", label: "Featured" },
									]}
								/>

								<ModernSelect
									label="Sort Field"
									value={sortField}
									onChange={(val) => setSortField(val)}
									options={[
										{ value: "createdAt", label: "Created Date" },
										{ value: "price", label: "Selling Price" },
										{ value: "stock", label: "Stock Quantity" },
										{ value: "name", label: "Product Name" },
									]}
								/>

								<ModernInput
									label="Min Price ($)"
									type="number"
									value={minPrice}
									onChange={(e) => {
										setMinPrice(e.target.value);
										setPage(1);
									}}
									placeholder="0.00"
								/>

								<ModernInput
									label="Max Price ($)"
									type="number"
									value={maxPrice}
									onChange={(e) => {
										setMaxPrice(e.target.value);
										setPage(1);
									}}
									placeholder="9999.00"
								/>

								<ModernInput
									label="Min Stock Qty"
									type="number"
									value={minStock}
									onChange={(e) => {
										setMinStock(e.target.value);
										setPage(1);
									}}
									placeholder="0"
								/>

								<ModernSelect
									label="Sort Direction"
									value={sortDirection}
									onChange={(val) => setSortDirection(val as "ASC" | "DESC")}
									options={[
										{ value: "DESC", label: "Descending (Z-A / High-Low)" },
										{ value: "ASC", label: "Ascending (A-Z / Low-High)" },
									]}
								/>

								<div className="flex items-end">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setSearch("");
											setFilterCategory("ALL");
											setFilterBrand("ALL");
											setFilterStockStatus("ALL");
											setFilterFeatured("ALL");
											setMinPrice("");
											setMaxPrice("");
											setMinStock("");
											setSortField("createdAt");
											setSortDirection("DESC");
											setPage(1);
										}}
										className="w-full h-9 text-xs gap-1.5 text-slate-500 rounded-xl"
									>
										<RotateCcw className="h-3.5 w-3.5" /> Reset Filters
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* Cards Grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse"
								/>
							))}
						</div>
					) : (productsData?.items || []).length === 0 ? (
						<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3">
							<Package className="h-12 w-12 text-slate-300 mx-auto" />
							<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
								No Products Found
							</h4>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{(productsData?.items || []).map((product: any) => {
								const stockQty = Number(
									product.stockQty ??
										product.stock ??
										product.inventory?.availableQty ??
										(Array.isArray(product.variants)
											? product.variants.reduce(
													(acc: number, v: any) =>
														acc + (v.stockQty || v.inventory?.quantity || 0),
													0,
												)
											: 0),
								);
								const lowThreshold = Number(product.lowStockThreshold ?? 5);
								const isLowStock = stockQty <= lowThreshold;
								const variantCount =
									Array.isArray(product.variants) && product.variants.length > 0
										? product.variants.length
										: 1;
								const unitCount =
									Array.isArray(product.units) && product.units.length > 0
										? product.units.length
										: product.unitBreakdown?.length || 1;
								const baseUnit = getProductBaseUnit(product);
								const baseUnitName =
									product.unitName ||
									product.baseUnitName ||
									baseUnit?.unitName ||
									baseUnit?.name ||
									product.unit?.name ||
									"Base";
								const sellPriceVal = getProductBasePrice(product);

								return (
									<div
										key={product.id}
										onClick={() => setSelectedProductDetails(product)}
										className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700/80 transition-all flex flex-col justify-between cursor-pointer space-y-3"
									>
										<div className="space-y-3">
											{/* Product Image Container */}
											<div className="relative h-44 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3">
												<img
													src={safeImageUrl(product.imageUrl)}
													alt={product.name}
													className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
													onError={(e) => {
														e.currentTarget.onerror = null;
														e.currentTarget.src = DEFAULT_IMAGE_URL;
													}}
												/>

												{/* Top-left: Low Stock Alert Badge (if applicable) */}
												{isLowStock && (
													<div className="absolute top-2 left-2">
														<Badge
															variant="destructive"
															className="text-[10px] font-bold px-2 py-0.5 shadow-xs flex items-center gap-1 bg-rose-500 text-white"
														>
															<AlertTriangle className="size-3" /> Low Stock
														</Badge>
													</div>
												)}

												{/* Top-right: Status Badge */}
												<div className="absolute top-2 right-2">
													<StatusBadgeCell
														status={
															product.status ||
															(product.isActive ? "Active" : "Inactive")
														}
														type="account"
													/>
												</div>
											</div>

											{/* Title & Brand/Category Info */}
											<div>
												<h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
													{product.name}
												</h4>
												<p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
													{[product.categoryName, product.brandName]
														.filter(Boolean)
														.join(" • ") || "General Catalog Item"}
												</p>
											</div>

											{/* Product Info Chips: Stock Qty, Total Variants, Total Units */}
											<div className="flex flex-wrap gap-1.5 pt-1">
												<span
													className={cn(
														"inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border",
														isLowStock
															? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
															: "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-700",
													)}
												>
													<Boxes className="size-3 text-slate-500" />
													Stock: {stockQty}
												</span>

												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
													<Layers className="size-3 text-purple-500" />
													{variantCount}{" "}
													{variantCount === 1 ? "variant" : "variants"}
												</span>

												<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
													<Tag className="size-3 text-indigo-500" />
													{unitCount} {unitCount === 1 ? "unit" : "units"}
												</span>
											</div>
										</div>

										{/* Card Footer: Price of Base Unit with Color Highlight & Quick Eye action */}
										<div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
											<div>
												<span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
													Base Unit Price
												</span>
												<div className="flex items-baseline gap-1 mt-0.5">
													<span className="text-base font-black text-emerald-600 dark:text-emerald-400">
														$
														{sellPriceVal.toLocaleString("en-US", {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
													<span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
														/ {baseUnitName}
													</span>
												</div>
											</div>

											<div className="flex items-center text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
												<Eye className="size-4" />
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* Product Create/Edit Dialog */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={
					editingProduct
						? t("products.editProductTitle")
						: t("products.createProductTitle")
				}
				subtitle={
					editingProduct ? t("products.subtitle") : t("products.subtitle")
				}
				icon={<Package className="h-5 w-5" />}
				size="lg"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="product-form"
							type="submit"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="product-form"
					onSubmit={form.handleSubmit(onSubmit)}
					className="space-y-4"
				>
					<ModernTabs
						value={productDialogTab}
						onValueChange={(v: any) => setProductDialogTab(v)}
						className="w-full"
					>
						<ModernTabsList className="grid grid-cols-2 w-full mb-4">
							<ModernTabsTrigger
								value="general"
								icon={<Package className="h-4 w-4" />}
								className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
							>
								{t("products.basicInfo")}
							</ModernTabsTrigger>
							<ModernTabsTrigger
								value="physical"
								icon={<Boxes className="h-4 w-4" />}
								className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
							>
								{t("products.inventorySettings")}
							</ModernTabsTrigger>
						</ModernTabsList>

						{/* TAB 1: GENERAL & PRICING */}
						<ModernTabsContent value="general" className="space-y-6 mt-0">
							{/* Top Centered Product Photo (Bigger Medium Size & Click to Browse) */}
							<div className="flex flex-col items-center justify-center pt-2 pb-2">
								<div
									onClick={() => fileInputRef.current?.click()}
									className="relative group size-36 sm:size-40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 bg-slate-50/80 dark:bg-slate-900/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 flex flex-col items-center justify-center cursor-pointer transition-all shadow-xs overflow-hidden"
									title={t("products.clickToUpload", "Click to browse photo")}
								>
									{uploadingImage ? (
										<div className="flex flex-col items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
											<Loader2 className="h-8 w-8 animate-spin" />
											<span className="text-xs font-medium">Uploading...</span>
										</div>
									) : form.watch("imageUrl") ? (
										<>
											<img
												src={safeImageUrl(form.watch("imageUrl"))}
												alt="Product Photo"
												className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
												onError={(e) => {
													e.currentTarget.onerror = null;
													e.currentTarget.src = DEFAULT_IMAGE_URL;
												}}
											/>
											{/* Hover Change Overlay */}
											<div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5">
												<Camera className="h-6 w-6" />
												<span className="text-xs font-bold tracking-wide">
													{t("common.change", "Change Photo")}
												</span>
											</div>
										</>
									) : (
										<div className="flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors p-3 text-center">
											<div className="p-3 rounded-full bg-purple-100/80 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shadow-xs">
												<Camera className="h-6 w-6" />
											</div>
											<div className="space-y-0.5">
												<p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
													{t("products.addPhoto", "Add Photo")}
												</p>
												<p className="text-[10px] text-slate-400 dark:text-slate-500">
													Click to browse
												</p>
											</div>
										</div>
									)}

									{/* Quick Remove Button when image exists */}
									{form.watch("imageUrl") && !uploadingImage && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												form.setValue("imageUrl", "");
											}}
											className="absolute top-2 right-2 bg-white/95 dark:bg-slate-900/95 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-full p-1.5 shadow-md border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 transition-colors z-10"
											title={t("common.remove", "Remove")}
										>
											<X className="h-3.5 w-3.5" />
										</button>
									)}
								</div>

								<input
									type="file"
									ref={fileInputRef}
									className="hidden"
									accept="image/*"
									onChange={handleDirectFileUpload}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<ModernInput
										label={t("products.productName")}
										placeholder={t("products.productNamePlaceholder")}
										{...form.register("name")}
										error={form.formState.errors.name?.message}
										required
									/>
								</div>

								<ModernSelect
									label={`${t("products.category")} *`}
									placeholder={t("products.selectCategory")}
									value={form.watch("categoryId")}
									onChange={(val) => form.setValue("categoryId", val)}
									options={
										categoriesData?.items.map((cat) => ({
											value: String(cat.id),
											label: cat.name,
										})) || []
									}
									searchable
								/>

								<ModernSelect
									label={`${t("products.brand")} *`}
									placeholder={t("products.selectBrand")}
									value={form.watch("brandId")}
									onChange={(val) => form.setValue("brandId", val)}
									options={
										brandsData?.items.map((brand) => ({
											value: String(brand.id),
											label: brand.name,
										})) || []
									}
									searchable
								/>

								{!editingProduct && (
									<ModernSelect
										label={`${t("products.baseUnit")} *`}
										placeholder={t("products.selectBaseUnit")}
										value={form.watch("unitId")}
										onChange={(val) => form.setValue("unitId", val)}
										options={
											unitsData?.items.map((u) => ({
												value: String(u.id),
												label: `${u.name} (${u.symbol || ""})`,
											})) || []
										}
										searchable
									/>
								)}

								<ModernInput
									label={t("products.sellingPrice")}
									type="number"
									step="0.01"
									{...form.register("sellPrice")}
									error={form.formState.errors.sellPrice?.message}
								/>

								{/* Base SKU Code with Generator */}
								<div className="w-full space-y-1.5">
									<div className="flex items-center justify-between text-xs min-h-[20px]">
										<Label className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1">
											{t("products.baseSkuCode")}
											<span className="text-destructive font-bold">*</span>
										</Label>
										<button
											type="button"
											onClick={() => {
												const sku = generateProductBaseSku();
												form.setValue("baseSku", sku);
												toast.info(`Generated SKU: ${sku}`);
											}}
											className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
										>
											<Sparkles className="h-3 w-3" />
											{t("products.generate")}
										</button>
									</div>
									<div className="group relative flex w-full items-center rounded-xl border border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700 dark:focus-within:border-primary transition-all duration-200 shadow-2xs overflow-hidden h-11">
										<input
											placeholder={t("products.skuPlaceholder")}
											{...form.register("baseSku")}
											className="w-full h-11 bg-transparent border-0 outline-none px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 pr-10"
										/>
										<button
											type="button"
											onClick={() => {
												const sku = generateProductBaseSku();
												form.setValue("baseSku", sku);
												toast.info(`Generated SKU: ${sku}`);
											}}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1 cursor-pointer"
											title={t("products.generate")}
										>
											<Sparkles className="h-4 w-4" />
										</button>
									</div>
								</div>

								{/* Barcode, Low Stock Alert, Discount Note on the SAME ROW */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:col-span-2">
									{/* Base Barcode with Generator */}
									<div className="w-full space-y-1.5">
										<div className="flex items-center justify-between text-xs min-h-[20px]">
											<Label className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1">
												{t("products.baseBarcode")}
												<span className="text-destructive font-bold">*</span>
											</Label>
											<button
												type="button"
												onClick={() => {
													const barcode = generateProductBaseBarcode();
													form.setValue("baseBarcode", barcode);
													toast.info(`Generated Barcode: ${barcode}`);
												}}
												className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
											>
												<Sparkles className="h-3 w-3" />
												{t("products.generate")}
											</button>
										</div>
										<div className="group relative flex w-full items-center rounded-xl border border-slate-200/80 bg-slate-50/80 hover:border-slate-300 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700 dark:focus-within:border-primary transition-all duration-200 shadow-2xs overflow-hidden h-11">
											<input
												placeholder={t("products.barcodePlaceholder")}
												{...form.register("baseBarcode")}
												className="w-full h-11 bg-transparent border-0 outline-none px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 pr-10"
											/>
											<button
												type="button"
												onClick={() => {
													const barcode = generateProductBaseBarcode();
													form.setValue("baseBarcode", barcode);
													toast.info(`Generated Barcode: ${barcode}`);
												}}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1 cursor-pointer"
												title={t("products.generate")}
											>
												<Sparkles className="h-4 w-4" />
											</button>
										</div>
									</div>

									<ModernInput
										label={t("products.lowStockThreshold")}
										type="number"
										{...form.register("lowStockThreshold")}
									/>

									<ModernInput
										label={t("products.discountNote")}
										placeholder="e.g. Standard office pack discount 1%"
										{...form.register("discountNote")}
									/>
								</div>

								{/* Tags Input */}
								<div className="md:col-span-2">
									<ModernTagsInput
										label={t("products.tags", "Tags")}
										placeholder={t(
											"products.tagsPlaceholder",
											"Search existing tags or type to create new...",
										)}
										value={form.watch("tags")}
										onChange={(newTags) =>
											form.setValue("tags", newTags, {
												shouldValidate: true,
												shouldDirty: true,
											})
										}
									/>
								</div>

								{/* DETAILED DESCRIPTION (MOVED ABOVE VARIANT GENERATOR) */}
								<div className="space-y-1.5 md:col-span-2">
									<Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
										{t("products.detailedDescription")}
									</Label>
									<Textarea
										placeholder={t("products.detailedDescriptionPlaceholder")}
										{...form.register("description")}
										className="rounded-xl text-xs h-20"
									/>
								</div>
							</div>

							{/* VARIANTS DESIGN FOR CREATION */}
							{!editingProduct && (
								<div className="border-t pt-4 space-y-4 dark:border-slate-800">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
												{t("products.productVariantsGenerator")}
											</h4>
											<p className="text-[10px] text-slate-400">
												{t("products.generateVariantsDesc")}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="text-xs font-semibold">
												{t("products.enableVariants")}
											</span>
											<Switch
												checked={hasVariants}
												onCheckedChange={setHasVariants}
											/>
										</div>
									</div>

									{hasVariants && (
										<div className="space-y-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
											<div className="space-y-3">
												<div className="flex justify-between items-center">
													<Label className="text-xs font-bold text-slate-700">
														{t("products.attributesAndValues")}
													</Label>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															setAttributesInput([
																...attributesInput,
																{
																	name: "",
																	displayOrder: attributesInput.length + 1,
																	values: [{ value: "", displayOrder: 1 }],
																},
															])
														}
														className="h-7 text-xs rounded-lg"
													>
														{t("products.addAttributeBox")}
													</Button>
												</div>

												{attributesInput.map((attr, idx) => {
													const isColor = attr.name
														.toLowerCase()
														.includes("color");
													return (
														<div
															key={idx}
															className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border space-y-2"
														>
															<div className="flex items-center gap-2">
																<Input
																	placeholder={t(
																		"products.attributeNamePlaceholder",
																	)}
																	value={attr.name}
																	onChange={(e) => {
																		const copy = [...attributesInput];
																		copy[idx].name = e.target.value;
																		setAttributesInput(copy);
																	}}
																	className="h-8 text-xs font-bold rounded-lg w-36 sm:w-44 shrink-0"
																/>

																{/* Compact Chip Values Container */}
																<div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
																	{attr.values.map((vObj, vIdx) => (
																		<div
																			key={vIdx}
																			className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg text-xs"
																		>
																			{isColor && (
																				<input
																					type="color"
																					title="Pick Color"
																					value={vObj.hexColor || "#000000"}
																					onChange={(e) => {
																						const copy = [...attributesInput];
																						copy[idx].values[vIdx].hexColor =
																							e.target.value;
																						setAttributesInput(copy);
																					}}
																					className="h-3.5 w-3.5 rounded-full cursor-pointer border-0 p-0 overflow-hidden shrink-0"
																				/>
																			)}
																			<input
																				type="text"
																				placeholder="Value..."
																				value={vObj.value}
																				onChange={(e) => {
																					const copy = [...attributesInput];
																					copy[idx].values[vIdx].value =
																						e.target.value;
																					setAttributesInput(copy);
																				}}
																				className="bg-transparent border-0 p-0 text-xs font-medium focus:outline-none w-16 sm:w-20"
																			/>
																			<button
																				type="button"
																				onClick={() => {
																					const copy = [...attributesInput];
																					copy[idx].values = copy[
																						idx
																					].values.filter((_, i) => i !== vIdx);
																					setAttributesInput(copy);
																				}}
																				className="text-slate-400 hover:text-red-500 text-xs"
																			>
																				<X className="h-3 w-3" />
																			</button>
																		</div>
																	))}

																	<Button
																		type="button"
																		variant="ghost"
																		size="sm"
																		onClick={() => {
																			const copy = [...attributesInput];
																			copy[idx].values.push({
																				value: "",
																				displayOrder:
																					copy[idx].values.length + 1,
																			});
																			setAttributesInput(copy);
																		}}
																		className="h-7 px-2 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg"
																	>
																		{t("products.addValue")}
																	</Button>
																</div>

																<Button
																	type="button"
																	variant="ghost"
																	onClick={() =>
																		setAttributesInput(
																			attributesInput.filter(
																				(_, i) => i !== idx,
																			),
																		)
																	}
																	className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-500 shrink-0"
																>
																	<X className="h-4 w-4" />
																</Button>
															</div>
														</div>
													);
												})}
											</div>

											<Button
												type="button"
												variant="outline"
												onClick={handlePreviewVariants}
												className="w-full text-xs font-bold border-indigo-500/20 text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-xl h-9"
											>
												{t("products.previewVariantMatrix")}
											</Button>

											{/* VARIANT PREVIEW MATRIX & EXCLUDED VARIANTS MANAGER */}
											{previewedVariants.length > 0 && (
												<div className="space-y-3 border-t pt-3 dark:border-slate-800">
													<div className="flex items-center justify-between">
														<Label className="text-xs font-bold text-slate-700">{`${t("products.variantMatrix")} (${previewedVariants.length} ${t("products.combinations")})`}</Label>
														<span className="text-[10px] text-slate-400">
															Click &apos;Exclude&apos; to add to
															excludedVariants payload
														</span>
													</div>

													{/* EXCLUDED VARIANTS BADGES */}
													{excludedVariants.length > 0 && (
														<div className="bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 space-y-1">
															<span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
																{t("products.excludedCombinations")}:
															</span>
															<div className="flex flex-wrap gap-1.5">
																{excludedVariants.map((exItem, exIdx) => (
																	<Badge
																		key={exIdx}
																		className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-semibold gap-1"
																	>
																		{Object.entries(exItem)
																			.map(([k, v]) => `${k}:${v}`)
																			.join(" | ")}
																		<button
																			type="button"
																			onClick={() =>
																				setExcludedVariants(
																					excludedVariants.filter(
																						(_, i) => i !== exIdx,
																					),
																				)
																			}
																			className="ml-1 hover:text-rose-900"
																		>
																			<X className="h-3 w-3" />
																		</button>
																	</Badge>
																))}
															</div>
														</div>
													)}

													<div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs">
														<Table>
															<TableHeader>
																<TableRow>
																	<TableHead>
																		{t("products.combination")}
																	</TableHead>
																	<TableHead>Variant Name</TableHead>
																	<TableHead>{t("stocks.sku")}</TableHead>
																	<TableHead>{t("products.barcode")}</TableHead>
																	<TableHead>
																		{t("products.retailSellPrice")}
																	</TableHead>
																	<TableHead className="text-right">
																		{t("common.actions")}
																	</TableHead>
																</TableRow>
															</TableHeader>
															<TableBody>
																{previewedVariants.map((item) => {
																	const isExcluded = excludedVariants.some(
																		(ex) =>
																			Object.entries(ex).every(
																				([k, v]) => item.attributes[k] === v,
																			),
																	);
																	return (
																		<TableRow
																			key={item.id}
																			className={
																				isExcluded
																					? "opacity-40 bg-slate-50 dark:bg-slate-900/50"
																					: ""
																			}
																		>
																			<TableCell className="font-semibold text-slate-800 dark:text-slate-200">
																				{Object.values(item.attributes).join(
																					" / ",
																				)}
																			</TableCell>
																			<TableCell>
																				<Input
																					value={item.name || ""}
																					placeholder="Variant Name"
																					onChange={(e) => {
																						const copy = [...previewedVariants];
																						const found = copy.find(
																							(r) => r.id === item.id,
																						);
																						if (found)
																							found.name = e.target.value;
																						setPreviewedVariants(copy);
																					}}
																					className="h-7 text-[11px] rounded w-32"
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					value={item.sku}
																					onChange={(e) => {
																						const copy = [...previewedVariants];
																						const found = copy.find(
																							(r) => r.id === item.id,
																						);
																						if (found)
																							found.sku = e.target.value;
																						setPreviewedVariants(copy);
																					}}
																					className="h-7 text-[11px] font-mono rounded w-28"
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					value={item.barcode || item.sku}
																					onChange={(e) => {
																						const copy = [...previewedVariants];
																						const found = copy.find(
																							(r) => r.id === item.id,
																						);
																						if (found)
																							found.barcode = e.target.value;
																						setPreviewedVariants(copy);
																					}}
																					className="h-7 text-[11px] font-mono rounded w-28"
																				/>
																			</TableCell>
																			<TableCell>
																				<Input
																					type="number"
																					value={item.price}
																					onChange={(e) => {
																						const copy = [...previewedVariants];
																						const found = copy.find(
																							(r) => r.id === item.id,
																						);
																						if (found)
																							found.price =
																								Number(e.target.value) || 0;
																						setPreviewedVariants(copy);
																					}}
																					className="h-7 text-[11px] rounded w-20"
																				/>
																			</TableCell>
																			<TableCell className="text-right">
																				<Button
																					type="button"
																					variant={
																						isExcluded ? "outline" : "ghost"
																					}
																					size="sm"
																					onClick={() => {
																						if (isExcluded) {
																							setExcludedVariants(
																								excludedVariants.filter(
																									(ex) =>
																										!Object.entries(ex).every(
																											([k, v]) =>
																												item.attributes[k] ===
																												v,
																										),
																								),
																							);
																						} else {
																							setExcludedVariants([
																								...excludedVariants,
																								item.attributes,
																							]);
																						}
																					}}
																					className={
																						isExcluded
																							? "h-6 text-[10px] text-emerald-600"
																							: "h-6 text-[10px] text-rose-600"
																					}
																				>
																					{isExcluded
																						? t("products.include")
																						: t("products.exclude")}
																				</Button>
																			</TableCell>
																		</TableRow>
																	);
																})}
															</TableBody>
														</Table>
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)}
						</ModernTabsContent>

						{/* TAB 2: PHYSICAL DIMENSIONS & WEIGHT (NOT REQUIRED) */}
						<ModernTabsContent value="physical" className="space-y-4 mt-0">
							<div className="flex items-center gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 text-xs">
								<Sparkles className="h-4 w-4 shrink-0" />
								<span>{t("products.optionalPhysicalSpecs")}</span>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
								<ModernInput
									label={t("products.netWeight")}
									type="number"
									step="0.01"
									value={variantDimensions.netWeight || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											netWeight: e.target.value,
										})
									}
									placeholder="0.12"
								/>
								<ModernInput
									label={t("products.grossWeight")}
									type="number"
									step="0.01"
									value={variantDimensions.grossWeight || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											grossWeight: e.target.value,
										})
									}
									placeholder="0.15"
								/>
								<ModernInput
									label={t("products.height")}
									type="number"
									step="0.1"
									value={variantDimensions.height || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											height: e.target.value,
										})
									}
									placeholder="3.5"
								/>
								<ModernInput
									label={t("products.width")}
									type="number"
									step="0.1"
									value={variantDimensions.width || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											width: e.target.value,
										})
									}
									placeholder="6.0"
								/>
								<ModernInput
									label={t("products.depth")}
									type="number"
									step="0.1"
									value={variantDimensions.depth || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											depth: e.target.value,
										})
									}
									placeholder="10.5"
								/>
								<ModernInput
									label={t("products.volume")}
									value={variantDimensions.volume || ""}
									onChange={(e) =>
										setVariantDimensions({
											...variantDimensions,
											volume: e.target.value,
										})
									}
									placeholder="750ml"
								/>
							</div>
						</ModernTabsContent>
					</ModernTabs>
				</form>
			</ModernModal>

			{/* VIEW PRODUCT DETAILS MODAL (WITH ENHANCED TABS, FULL API DATA & DYNAMIC FOOTER BUTTONS) */}
			<ModernModal
				isOpen={!!selectedProductDetails}
				onClose={() => {
					setSelectedProductDetails(null);
					setSelectedVariantIdForHistory(null);
				}}
				title={
					fullProduct?.name ||
					selectedProductDetails?.name ||
					t("products.productDetails")
				}
				subtitle={`${t("products.category")}: ${fullProduct?.categoryName || "—"} • ${t("products.brand")}: ${fullProduct?.brandName || "—"}`}
				icon={
					<Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
				}
				size="xl"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setSelectedProductDetails(null)}
							label={t("common.close")}
							height="h-11"
							width="min-w-[110px]"
						/>
						{selectedProductDetails && !selectedProductDetails.isActive && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									restoreMutation.mutate(selectedProductDetails.id)
								}
								className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 font-bold text-xs gap-1.5 h-11 px-5 rounded-xl"
							>
								<RotateCcw className="h-4 w-4" /> {t("products.restoreAsset")}
							</Button>
						)}
						<ModernModalSubmitButton
							onClick={() => {
								const p = selectedProductDetails;
								setSelectedProductDetails(null);
								if (p) openEdit(p);
							}}
							label={t("products.editProduct")}
							icon={<Pencil className="h-4 w-4" />}
							height="h-11"
							width="min-w-[140px]"
						/>
					</ModernModalFooter>
				}
			>
				{selectedProductDetails && (
					<div className="space-y-6 py-2">
						{/* Hero Showcase Header Card */}
						{(() => {
							const targetProduct: any = fullProduct || selectedProductDetails;
							const baseUnit = getProductBaseUnit(
								targetProduct,
								productUnitsList,
							);
							const baseUnitName =
								baseUnit?.unitName ||
								baseUnit?.name ||
								targetProduct?.unitName ||
								targetProduct?.baseUnitName ||
								t("products.baseUnit");

							const sellP = getProductBasePrice(
								targetProduct,
								productUnitsList,
							);
							const costP = getProductBaseCost(targetProduct, productUnitsList);

							const marginAmt = sellP - costP;
							const marginPct = sellP > 0 ? (marginAmt / sellP) * 100 : 0;

							return (
								<div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-100/80 dark:from-slate-900/90 dark:via-purple-950/20 dark:to-slate-950 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm items-center">
									<div className="md:col-span-4 h-44 w-full rounded-2xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center overflow-hidden relative group shadow-sm p-2">
										<img
											src={safeImageUrl(
												fullProduct?.imageUrl ||
													selectedProductDetails.imageUrl,
											)}
											className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
											alt={selectedProductDetails.name}
											onError={(e) => {
												e.currentTarget.onerror = null;
												e.currentTarget.src = DEFAULT_IMAGE_URL;
											}}
										/>
										<label
											htmlFor="product-detail-quick-image-upload"
											className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 text-white transition-opacity cursor-pointer z-20 backdrop-blur-xs rounded-2xl"
										>
											<Camera className="h-6 w-6" />
											<span className="text-[11px] font-semibold tracking-wide">
												Change Image
											</span>
										</label>
										<input
											id="product-detail-quick-image-upload"
											type="file"
											accept="image/*"
											className="hidden"
											onChange={async (e) => {
												const file = e.target.files?.[0];
												if (!file || !targetProduct?.id) return;
												const toastId = toast.loading(
													"Uploading product image...",
												);
												try {
													const res = await uploadService.uploadSingle(file, {
														isPublic: true,
														category: "PRODUCTS",
													});
													const finalUrl = res.url || res.fileKey || "";
													toast.dismiss(toastId);
													updateProductImageMutation.mutate({
														id: targetProduct.id,
														imageUrl: finalUrl,
													});
												} catch (err) {
													toast.dismiss(toastId);
													toast.error("Failed to upload product image");
												} finally {
													if (e.target) e.target.value = "";
												}
											}}
										/>
									</div>

									<div className="md:col-span-8 space-y-3">
										<div className="flex flex-wrap gap-2 items-center">
											<Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[11px] font-bold dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
												{fullProduct?.categoryName || t("sidebar.allProducts")}
											</Badge>
											{fullProduct?.subCategoryName && (
												<Badge
													variant="outline"
													className="text-[11px] font-medium text-slate-600 dark:text-slate-300"
												>
													{fullProduct.subCategoryName}
												</Badge>
											)}
											{fullProduct?.brandName && (
												<Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[11px] font-bold dark:bg-sky-950/30 dark:text-sky-300">
													{fullProduct.brandName}
												</Badge>
											)}
											<Badge
												className={
													(fullProduct?.status ||
														selectedProductDetails.status) === "Active" ||
													selectedProductDetails.isActive
														? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
														: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
												}
											>
												{fullProduct?.status ||
													(selectedProductDetails.isActive
														? t("common.active")
														: t("common.inactive"))}
											</Badge>
										</div>

										<h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
											{fullProduct?.name || selectedProductDetails.name}
										</h3>

										<p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
											{fullProduct?.description ||
												selectedProductDetails.description ||
												t("products.noDescriptionRegistered")}
										</p>

										{/* KPI Cards Row */}
										<div className="grid grid-cols-3 gap-3 pt-1">
											<div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
												<span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
													{t("products.retailSellPrice")}
												</span>
												<div className="flex items-baseline gap-1">
													<span className="text-base font-black text-emerald-600 dark:text-emerald-400">
														${sellP.toFixed(2)}
													</span>
													<span className="text-[10px] text-slate-400 font-medium">
														/ {baseUnitName}
													</span>
												</div>
											</div>
											<div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
												<span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
													{t("products.baseUnitCost")}
												</span>
												<div className="flex items-baseline gap-1">
													<span className="text-base font-bold text-slate-700 dark:text-slate-200">
														${costP.toFixed(2)}
													</span>
													<span className="text-[10px] text-slate-400 font-medium">
														/ {baseUnitName}
													</span>
												</div>
											</div>
											<div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
												<span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
													{t("products.estGrossMargin")}
												</span>
												<span className="text-base font-bold text-purple-600 dark:text-purple-400">
													{marginPct.toFixed(0)}%{" "}
													<span className="text-[10px] text-slate-400 font-medium">
														(${marginAmt.toFixed(2)})
													</span>
												</span>
											</div>
										</div>
									</div>
								</div>
							);
						})()}

						{/* Sub-tabs in detail modal using ModernTabs */}
						<ModernTabs defaultValue="details">
							<ModernTabsList
								variant="pills"
								size="md"
								className="w-full justify-start border-b pb-1 mb-4"
							>
								<ModernTabsTrigger
									value="details"
									icon={<Package className="h-3.5 w-3.5" />}
								>
									{t("products.overviewSpecs")}
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="variants"
									icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
									badge={fullProduct?.variants?.length || 0}
									badgeColor="purple"
								>
									{t("products.variantsAndMatrix")}
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="units"
									icon={<Layers className="h-3.5 w-3.5" />}
									badge={productUnitsList.length}
									badgeColor="emerald"
								>
									{t("products.productUnits")}
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="priceHistory"
									icon={<History className="h-3.5 w-3.5" />}
									badge={priceHistory?.length || 0}
									badgeColor="sky"
								>
									{t("products.priceHistoryLog")}
								</ModernTabsTrigger>
							</ModernTabsList>

							{/* OVERVIEW TAB */}
							<ModernTabsContent value="details" className="space-y-4 mt-0">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* System & Metadata Card */}
									<div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
										<h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b pb-2 dark:border-slate-800">
											<Package className="h-4 w-4 text-purple-500" />{" "}
											{t("products.productMetadataClassification")}
										</h4>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.productId")}:
											</span>
											<span className="font-mono font-bold text-slate-800 dark:text-slate-200">
												#{selectedProductDetails.id}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.systemUuid")}:
											</span>
											<span className="font-mono font-medium text-slate-600 dark:text-slate-400">
												{fullProduct?.uuid ||
													selectedProductDetails.uuid ||
													"—"}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.primaryCategory")}:
											</span>
											<span className="font-semibold text-purple-600 dark:text-purple-400">
												{fullProduct?.categoryName || "—"}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.subCategory")}:
											</span>
											<span className="font-semibold text-slate-700 dark:text-slate-300">
												{fullProduct?.subCategoryName || "—"}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.brandContext")}:
											</span>
											<span className="font-semibold text-sky-600 dark:text-sky-400">
												{fullProduct?.brandName || "—"}
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("stocks.stockStatus")}:
											</span>
											<Badge
												variant="outline"
												className="text-[10px] font-bold"
											>
												{fullProduct?.stockStatus || "IN_STOCK"}
											</Badge>
										</div>
										<div className="flex justify-between py-1">
											<span className="text-slate-500">
												{t("products.featuredItem")}:
											</span>
											<span className="font-bold text-amber-600">
												{fullProduct?.featured
													? `${t("common.yes")} ⭐`
													: t("common.no")}
											</span>
										</div>
									</div>

									{/* Catalog & Inventory Summary Card */}
									<div className="space-y-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
										<h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2 border-b pb-2 dark:border-slate-800">
											<SlidersHorizontal className="h-4 w-4 text-emerald-500" />{" "}
											{t("products.structureAttributeOptions")}
										</h4>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.configuredVariants")}:
											</span>
											<span className="font-bold text-slate-800 dark:text-slate-200">
												{fullProduct?.variants?.length || 1} Variant(s)
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.mappedUnits")}:
											</span>
											<span className="font-bold text-slate-800 dark:text-slate-200">
												{fullProduct?.units?.length || 1} Unit(s)
											</span>
										</div>
										<div className="flex justify-between py-1 border-b dark:border-slate-850">
											<span className="text-slate-500">
												{t("products.baseUnitName")}:
											</span>
											<span className="font-semibold text-emerald-600">
												{getProductBaseUnit(fullProduct)?.name ||
													getProductBaseUnit(fullProduct)?.unitName ||
													(fullProduct as any)?.unitName ||
													(fullProduct as any)?.baseUnitName ||
													t("products.baseUnit")}
											</span>
										</div>
										<div className="space-y-1.5 pt-1">
											<span className="text-slate-500 block">
												{t("products.attributeAxes")}:
											</span>
											{fullProduct?.attributeAxes &&
											fullProduct.attributeAxes.length > 0 ? (
												<div className="space-y-1">
													{fullProduct.attributeAxes.map(
														(axis: any, idx: number) => (
															<div
																key={idx}
																className="flex items-center gap-1.5"
															>
																<span className="font-bold text-slate-700 dark:text-slate-300">
																	{axis.name}:
																</span>
																<div className="flex flex-wrap gap-1">
																	{axis.options?.map(
																		(opt: any, oIdx: number) => (
																			<Badge
																				key={oIdx}
																				variant="secondary"
																				className="text-[10px] bg-slate-100 dark:bg-slate-800"
																			>
																				{opt.value}
																			</Badge>
																		),
																	)}
																</div>
															</div>
														),
													)}
												</div>
											) : (
												<span className="text-slate-400 italic">
													{t("products.noDynamicAttributes")}
												</span>
											)}
										</div>
									</div>
								</div>

								{/* Description & Tags Card */}
								<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
									<h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
										{t("products.tagsOverviewRemarks")}
									</h4>
									{fullProduct?.tags && fullProduct.tags.length > 0 && (
										<div className="flex flex-wrap gap-1.5 py-1">
											{fullProduct.tags.map((tag: string, tIdx: number) => (
												<Badge
													key={tIdx}
													className="bg-purple-50 text-purple-600 border-purple-200 text-[10px]"
												>
													#{tag}
												</Badge>
											))}
										</div>
									)}
									<p className="text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
										{fullProduct?.description ||
											selectedProductDetails.description ||
											t("products.noDescriptionRegistered")}
									</p>
								</div>
							</ModernTabsContent>

							{/* VARIANTS LIST TAB WITH CUSTOM DATATABLE */}
							<ModernTabsContent value="variants" className="space-y-4 mt-0">
								<DataTable<VariantOperations>
									data={fullProduct?.variants || []}
									columns={[
										{
											id: "expand",
											header: "",
											width: "40px",
											cell: ({ row }: { row: any }) => {
												const isExpanded = expandedVariantIds.includes(
													String(row.id),
												);
												return (
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
														onClick={(e) => {
															e.stopPropagation();
															setExpandedVariantIds((prev) =>
																prev.includes(String(row.id))
																	? prev.filter((id) => id !== String(row.id))
																	: [...prev, String(row.id)],
															);
														}}
														title={
															isExpanded
																? "Collapse Variant Unit Prices"
																: "Expand Variant Unit Prices & Conversion Matrix"
														}
													>
														<ChevronDown
															className={cn(
																"h-4 w-4 transition-transform duration-200",
																isExpanded
																	? "rotate-180 text-primary font-bold"
																	: "",
															)}
														/>
													</Button>
												);
											},
										},
										{
											id: "name",
											header: t("products.variantsAndPricing"),
											accessorKey: "name",
											cell: ({ row }) => {
												const v = row;
												return (
													<div className="flex items-center gap-3 py-1">
														<div
															className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs group/varimg cursor-pointer"
															onClick={(e) => {
																e.stopPropagation();
																setVariantForImageUpdate(v);
																variantFileInputRef.current?.click();
															}}
															title="Click to update variant image"
														>
															<img
																src={safeImageUrl(
																	v.thumbnail || (v as any).imageUrl,
																)}
																className="h-full w-full object-cover relative z-10"
																alt={v.name}
																onError={(e) => {
																	e.currentTarget.onerror = null;
																	e.currentTarget.src = DEFAULT_IMAGE_URL;
																}}
															/>
															<div className="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover/varimg:opacity-100 flex items-center justify-center transition-opacity text-white">
																<Camera className="h-3.5 w-3.5" />
															</div>
														</div>

														<div>
															<span className="font-bold text-slate-900 dark:text-white block text-xs">
																{v.name}
															</span>
															{v.attributeValues &&
																v.attributeValues.length > 0 && (
																	<div className="flex flex-wrap gap-1 mt-0.5">
																		{v.attributeValues.map(
																			(av: any, idx: number) => (
																				<span
																					key={idx}
																					className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-medium"
																				>
																					{av.attributeName}:{" "}
																					<strong className="text-purple-600 dark:text-purple-400">
																						{av.value}
																					</strong>
																				</span>
																			),
																		)}
																	</div>
																)}
														</div>
													</div>
												);
											},
										},
										{
											id: "sku",
											header: t("stocks.sku"),
											accessorKey: "sku",
											cell: ({ row }) => (
												<span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
													{row.sku || "—"}
												</span>
											),
										},
										{
											id: "barcode",
											header: t("products.barcode"),
											accessorKey: "barcode",
											cell: ({ row }) => (
												<span className="font-mono text-[11px] text-slate-500">
													{row.barcode || "—"}
												</span>
											),
										},
										{
											id: "price",
											header: t("products.retailSellPrice"),
											cell: ({ row }) => {
												const price = getVariantPrice(
													row,
													fullProduct,
													productUnitsList,
												);
												const varBaseUnit = getVariantBaseUnit(
													row,
													fullProduct,
													productUnitsList,
												);
												const unitName =
													(row as any).unitName ||
													varBaseUnit?.unitName ||
													varBaseUnit?.name ||
													"";
												return (
													<div>
														<span className="font-black text-emerald-600 dark:text-emerald-400 text-xs block">
															${price.toFixed(2)}
														</span>
														{unitName && (
															<span className="text-[10px] text-slate-400 font-normal block mt-0.5">
																/ {unitName}
															</span>
														)}
													</div>
												);
											},
										},
										{
											id: "cost",
											header: t("products.baseUnitCost"),
											cell: ({ row }) => {
												const cost = getVariantCost(
													row,
													fullProduct,
													productUnitsList,
												);
												const varBaseUnit = getVariantBaseUnit(
													row,
													fullProduct,
													productUnitsList,
												);
												const unitName =
													(row as any).unitName ||
													varBaseUnit?.unitName ||
													varBaseUnit?.name ||
													"";
												return (
													<div>
														<span className="font-semibold text-slate-600 dark:text-slate-400 text-xs block">
															${cost.toFixed(2)}
														</span>
														{unitName && (
															<span className="text-[10px] text-slate-400 font-normal block mt-0.5">
																/ {unitName}
															</span>
														)}
													</div>
												);
											},
										},
										{
											id: "inventory",
											header: t("stocks.availableQuantity"),
											cell: ({ row }) => {
												const qty = getVariantStock(row, fullProduct);
												const reserved =
													row.inventory?.reservedQty ?? row.reservedQty ?? 0;
												return (
													<div className="space-y-0.5">
														<span className="font-extrabold text-slate-900 dark:text-white text-xs">
															{qty} units
														</span>
														{reserved > 0 && (
															<span className="text-[10px] text-amber-600 font-semibold block">
																({reserved} reserved)
															</span>
														)}
													</div>
												);
											},
										},
										{
											id: "status",
											header: t("common.status"),
											cell: ({ row }) => (
												<Badge
													className={
														row.status === "Active" ||
														row.status === "AVAILABLE"
															? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
															: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
													}
												>
													{row.status === "Active" || row.status === "AVAILABLE"
														? t("common.active")
														: t("common.inactive")}
												</Badge>
											),
										},
									]}
									title={t("products.productVariants")}
									searchPlaceholder={t("common.search")}
									expandedRowIds={expandedVariantIds}
									renderSubComponent={(variant) => (
										<VariantUnitsAccordionSubRow variant={variant} />
									)}
									onCreateNew={() => {
										resetAddVariantForm();
										setIsAddVariantOpen(true);
									}}
									createButtonLabel={t("products.addVariant")}
									isLoading={isLoadingFullDetails}
									onEditRow={(row: any) => {
										setEditVarTab("general");
										const unitPriceObj = getVariantBaseUnit(
											row,
											fullProduct,
											productUnitsList,
										);
										const resolvedUnitId =
											row.unitId || unitPriceObj?.unitId || "";
										setSelectedVariant({
											id: row.id,
											name: row.name || "",
											sku: row.sku || "",
											barcode: row.barcode || "",
											price: getVariantPrice(
												row,
												fullProduct,
												productUnitsList,
											),
											cost: getVariantCost(row, fullProduct, productUnitsList),
											stockQty: row.inventory?.availableQty || 0,
											unitId: resolvedUnitId ? String(resolvedUnitId) : "",
											thumbnail: row.thumbnail || row.imageUrl || "",
											netWeight:
												row.variantAttributes?.netWeight ?? row.netWeight ?? "",
											grossWeight:
												row.variantAttributes?.grossWeight ??
												row.grossWeight ??
												"",
											height: row.variantAttributes?.height ?? row.height ?? "",
											width: row.variantAttributes?.width ?? row.width ?? "",
											depth: row.variantAttributes?.depth ?? row.depth ?? "",
											volume: row.variantAttributes?.volume ?? row.volume ?? "",
											variantAttributes: row.variantAttributes || {},
											isActive:
												row.status === "Active" || row.status === "AVAILABLE",
										});
										setIsEditVariantOpen(true);
									}}
									pageSizeOptions={[5, 10, 20]}
								/>
							</ModernTabsContent>

							{/* PRODUCT UNITS TAB WITH CUSTOM DATATABLE */}
							<ModernTabsContent value="units" className="space-y-4 mt-0">
								{/* Summary KPI Banner for Mapped Units */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gradient-to-r from-purple-50/60 via-slate-50 to-indigo-50/60 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 rounded-2xl border border-slate-200/90 dark:border-slate-800">
									<div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 shrink-0">
											<Layers className="h-4 w-4" />
										</div>
										<div>
											<span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
												{t("products.mappedUnits")}
											</span>
											<span className="text-sm font-black text-slate-900 dark:text-slate-100">
												{productUnitsList.length} Unit Tier(s)
											</span>
										</div>
									</div>

									<div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xs">
										<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
											<Package className="h-4 w-4" />
										</div>
										<div>
											<span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
												{t("products.baseUnitName")}
											</span>
											<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
												{productUnitsList.find((u: any) => u.isBase)
													?.unitName ||
													productUnitsList[0]?.unitName ||
													t("products.baseUnit")}
											</span>
										</div>
									</div>
								</div>

								<DataTable<any>
									data={productUnitsList}
									columns={[
										{
											id: "name",
											header: t("products.unit"),
											cell: ({ row }) => (
												<div className="flex items-center gap-2">
													<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-bold text-xs shrink-0 border border-purple-200/50 dark:border-purple-800/50">
														{(row.unitName || row.name || "U")[0]}
													</div>
													<div>
														<div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
															{row.unitName || row.name || "Unit"}
														</div>
														{row.symbol && (
															<span className="text-[10px] font-mono text-slate-400">
																({row.symbol})
															</span>
														)}
													</div>
												</div>
											),
										},
										{
											id: "baseContext",
											header: t("products.baseReference"),
											cell: ({ row }) => {
												const hasParent = Boolean(
													row.parentUnitId && row.parentUnitName,
												);
												if (row.isBase) {
													return (
														<Badge
															variant="outline"
															className="font-medium text-slate-700 dark:text-slate-300 text-xs"
														>
															{row.baseUnitName ||
																row.unitName ||
																t("products.baseUnit")}
														</Badge>
													);
												}
												if (hasParent) {
													return (
														<Badge
															variant="outline"
															className="font-medium text-slate-700 dark:text-slate-300 text-xs"
														>
															{row.parentUnitName}
														</Badge>
													);
												}
												return (
													<Badge
														variant="outline"
														className="font-medium text-slate-700 dark:text-slate-300 text-xs"
													>
														{row.baseUnitName || t("products.baseUnit")}
													</Badge>
												);
											},
										},
										{
											id: "multiplier",
											header: t("products.conversionRatio"),
											cell: ({ row }) => {
												const hasParent = Boolean(
													row.parentUnitId && row.parentUnitName,
												);
												if (row.isBase) {
													return (
														<span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/60 font-mono font-bold text-[11px]">
															1 {row.unitName || row.name || "Unit"} = 1{" "}
															{row.baseUnitName || row.unitName || "Base"}
														</span>
													);
												}

												const parentQty =
													row.parentQuantity ?? row.baseQuantity ?? 1;
												const parentName =
													row.parentUnitName || row.baseUnitName || "Base";
												const formula = `1 ${row.unitName || row.name || "Unit"} = ${parentQty} ${parentName}`;

												return (
													<span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/60 font-mono font-bold text-[11px]">
														{formula}
													</span>
												);
											},
										},
										{
											id: "price",
											header: t("invoices.unitPrice"),
											cell: ({ row }) => {
												const priceVal =
													row.unitPrice ??
													row.price ??
													row.sellPrice ??
													row.basePrice;
												const hasPrice =
													priceVal !== undefined &&
													priceVal !== null &&
													priceVal !== "" &&
													!isNaN(Number(priceVal));
												const formattedPrice = hasPrice
													? `$${Number(priceVal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
													: "—";
												const qty = Number(
													row.parentQuantity || row.baseQuantity || 1,
												);
												const refName =
													row.parentUnitName || row.baseUnitName || "unit";
												const perRef =
													hasPrice && qty > 0 ? Number(priceVal) / qty : 0;
												return (
													<div>
														<span className="font-black text-emerald-600 dark:text-emerald-400 text-xs block">
															{formattedPrice}
														</span>
														{hasPrice && qty > 1 && (
															<span className="text-[10px] text-slate-400 font-mono block">
																≈ ${perRef.toFixed(2)} / {refName}
															</span>
														)}
													</div>
												);
											},
										},
										{
											id: "variantPrices",
											header: t("products.variantsAndPricing"),
											cell: ({ row }: { row: any }) => {
												if (
													!row.variantPrices ||
													row.variantPrices.length === 0
												) {
													return (
														<span className="text-[11px] text-slate-400 font-medium">
															{t("products.samePriceAcrossVariants")}
														</span>
													);
												}
												return (
													<div className="space-y-1 max-h-24 overflow-y-auto pr-1">
														<div className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
															{row.variantPrices.length}{" "}
															{t("products.customVariantPrices")}
														</div>
														{row.variantPrices.map((vp: any, vIdx: number) => {
															const varObj = fullProduct?.variants?.find(
																(v: any) =>
																	Number(v.id) === Number(vp.variantId),
															);
															const varLabel = varObj
																? varObj.name
																: `Variant #${vp.variantId}`;
															return (
																<div
																	key={vIdx}
																	className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded border"
																>
																	<span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
																		{varLabel}:
																	</span>
																	<span className="font-extrabold text-emerald-600 dark:text-emerald-400">
																		$
																		{Number(vp.unitPrice || 0).toLocaleString(
																			"en-US",
																			{
																				minimumFractionDigits: 2,
																				maximumFractionDigits: 2,
																			},
																		)}
																	</span>
																</div>
															);
														})}
													</div>
												);
											},
										},
										{
											id: "role",
											header: t("products.roleAndStatus"),
											cell: ({ row }) => (
												<div className="flex flex-wrap gap-1 items-center">
													{row.isBase ? (
														<Badge className="bg-emerald-500 text-white font-bold text-[10px] shadow-2xs">
															{t("products.baseUnit")}
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="text-[10px] text-slate-500 border-slate-200 dark:border-slate-800"
														>
															{t("products.secondaryUnit")}
														</Badge>
													)}
												</div>
											),
										},
										{
											id: "discount",
											header: t("products.discountAndNotes"),
											cell: ({ row }) => (
												<div className="space-y-0.5 text-xs">
													{row.discountNote ? (
														<span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded text-[11px] font-medium border border-purple-100 dark:border-purple-900/30">
															<Tag className="h-3 w-3" />
															{row.discountNote}
														</span>
													) : (
														<span className="text-slate-400 text-[11px]">
															—
														</span>
													)}
												</div>
											),
										},
									]}
									title={t("products.unitHierarchy")}
									searchPlaceholder={t("common.search")}
									onCreateNew={() => {
										setSelectedUnitForEdit(null);
										setIsMapUnitOpen(true);
									}}
									createButtonLabel={t("products.mapUnits")}
									onEditRow={(row) => {
										setSelectedUnitForEdit(row);
										setIsMapUnitOpen(true);
									}}
									onDeleteRow={(row) => {
										if (row.isBase) {
											toast.error(
												"Cannot delete the primary base unit. Please assign another unit as base first.",
											);
											return;
										}
										const uId = row.unitId ?? row.id;
										if (uId) {
											deleteUnitMutation.mutate(uId);
										}
									}}
									isLoading={isLoadingFullDetails || isLoadingProductUnits}
									pageSizeOptions={[5, 10, 20]}
								/>
							</ModernTabsContent>

							{/* PRICE HISTORY TAB WITH CUSTOM DATATABLE */}
							<ModernTabsContent
								value="priceHistory"
								className="space-y-4 mt-0"
							>
								<div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
									<div className="flex flex-wrap items-center gap-3">
										{fullProduct?.variants &&
											fullProduct.variants.length > 0 && (
												<div className="flex items-center gap-2">
													<History className="h-4 w-4 text-sky-500 shrink-0" />
													<span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
														{t("products.variantsAndPricing")}:
													</span>
													<div className="w-48">
														<ModernSelect
															label=""
															value={
																selectedVariantIdForHistory
																	? String(selectedVariantIdForHistory)
																	: "ALL"
															}
															onChange={(val) =>
																setSelectedVariantIdForHistory(
																	val === "ALL" ? null : Number(val),
																)
															}
															options={[
																{
																	value: "ALL",
																	label: t("products.productVariants"),
																},
																...fullProduct.variants.map((v: any) => ({
																	value: String(v.id),
																	label: v.name,
																})),
															]}
														/>
													</div>
												</div>
											)}

										{fullProduct?.units && fullProduct.units.length > 0 && (
											<div className="flex items-center gap-2">
												<Layers className="h-4 w-4 text-purple-500 shrink-0" />
												<span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
													{t("products.unit")}:
												</span>
												<div className="w-44">
													<ModernSelect
														label=""
														value={
															selectedUnitIdForHistory
																? String(selectedUnitIdForHistory)
																: "ALL"
														}
														onChange={(val) =>
															setSelectedUnitIdForHistory(
																val === "ALL" ? null : Number(val),
															)
														}
														options={[
															{ value: "ALL", label: t("products.units") },
															...fullProduct.units.map((u: any) => ({
																value: String(u.unitId || u.id),
																label:
																	u.name || u.unitName || `Unit #${u.unitId}`,
															})),
														]}
													/>
												</div>
											</div>
										)}
									</div>
								</div>

								<DataTable<any>
									data={priceHistory || []}
									columns={[
										{
											id: "reason",
											header: t("products.reason"),
											cell: ({ row }) => (
												<div className="space-y-0.5">
													<span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
														{row.reason || "Price Change"}
													</span>
													<span className="text-[10px] text-slate-400 font-mono block">
														{row.createdAt
															? new Date(row.createdAt).toLocaleString()
															: "—"}
													</span>
												</div>
											),
										},
										{
											id: "variantSku",
											header: t("stocks.sku"),
											cell: ({ row }) => (
												<span className="font-mono font-medium text-slate-600 dark:text-slate-400 text-xs">
													{row.variantSku || "Default Variant"}
												</span>
											),
										},
										{
											id: "unitName",
											header: t("products.unit"),
											cell: ({ row }) => (
												<Badge
													variant="outline"
													className="text-[10px] bg-slate-50 font-semibold dark:bg-slate-900"
												>
													{row.unitName || "Base Unit"}
												</Badge>
											),
										},
										{
											id: "priceComparison",
											header: t("products.priceChange"),
											cell: ({ row }) => {
												const before =
													row.priceBefore !== undefined &&
													row.priceBefore !== null
														? Number(row.priceBefore)
														: 0;
												const after =
													row.priceAfter !== undefined &&
													row.priceAfter !== null
														? Number(row.priceAfter)
														: 0;
												return (
													<div className="flex items-center gap-2 text-xs">
														<span className="text-slate-400 line-through">
															${before.toFixed(2)}
														</span>
														<span className="text-slate-400">&rarr;</span>
														<span className="font-extrabold text-emerald-600 dark:text-emerald-400">
															${after.toFixed(2)}
														</span>
													</div>
												);
											},
										},
										{
											id: "trend",
											header: t("products.estGrossMargin"),
											cell: ({ row }) => {
												const before =
													row.priceBefore !== undefined &&
													row.priceBefore !== null
														? Number(row.priceBefore)
														: 0;
												const after =
													row.priceAfter !== undefined &&
													row.priceAfter !== null
														? Number(row.priceAfter)
														: 0;
												const diff = after - before;
												const pct = before > 0 ? (diff / before) * 100 : 0;

												if (diff > 0) {
													return (
														<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 text-[10px] font-bold gap-1">
															<TrendingUp className="h-3 w-3 text-emerald-600" />{" "}
															+${diff.toFixed(2)} (+{pct.toFixed(1)}%)
														</Badge>
													);
												} else if (diff < 0) {
													return (
														<Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 text-[10px] font-bold gap-1">
															<TrendingDown className="h-3 w-3 text-rose-600" />{" "}
															-${Math.abs(diff).toFixed(2)} ({pct.toFixed(1)}%)
														</Badge>
													);
												} else {
													return (
														<Badge className="bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 text-[10px] font-bold gap-1">
															<RefreshCw className="h-3 w-3 text-sky-600" />{" "}
															Discount Shift ({row.discountBefore || 0}% &rarr;{" "}
															{row.discountAfter || 0}%)
														</Badge>
													);
												}
											},
										},
										{
											id: "changedBy",
											header: t("products.changedBy"),
											cell: ({ row }) => (
												<div className="flex items-center gap-1.5 text-xs">
													<User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
													<span className="font-semibold text-slate-700 dark:text-slate-300">
														{row.changedByUsername ||
															(row.changedBy
																? `User #${row.changedBy}`
																: "System Admin")}
													</span>
												</div>
											),
										},
									]}
									title={t("products.priceHistoryModalTitle")}
									searchPlaceholder={t("common.search")}
									isLoading={isLoadingFullDetails}
									pageSizeOptions={[5, 10, 20]}
								/>
							</ModernTabsContent>
						</ModernTabs>
					</div>
				)}
			</ModernModal>

			{/* ADD NEW VARIANT MODAL */}
			<ModernModal
				isOpen={isAddVariantOpen}
				onClose={() => setIsAddVariantOpen(false)}
				title={t("products.addVariant")}
				subtitle={t("products.subtitle")}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsAddVariantOpen(false)}
						/>
						<ModernModalSubmitButton
							onClick={handleAddVariantSubmit}
							label={t("products.addVariant")}
							isLoading={addVariantMutation.isPending}
						/>
					</ModernModalFooter>
				}
			>
				<input
					type="file"
					ref={addVarThumbnailInputRef}
					className="hidden"
					accept="image/*"
					onChange={(e) => handleVariantThumbnailUpload(e, false)}
				/>
				<form
					onSubmit={handleAddVariantSubmit}
					className="space-y-4 py-1 text-xs"
				>
					<ModernTabs
						value={addVarTab}
						onValueChange={(v: any) => setAddVarTab(v)}
						className="w-full"
					>
						<ModernTabsList className="grid grid-cols-2 w-full mb-3">
							<ModernTabsTrigger
								value="general"
								icon={<Package className="h-4 w-4" />}
								className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
							>
								{t("products.basicInfo")}
							</ModernTabsTrigger>
							<ModernTabsTrigger
								value="physical"
								icon={<Boxes className="h-4 w-4" />}
								className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
							>
								{t("products.inventorySettings")}
							</ModernTabsTrigger>
						</ModernTabsList>

						{/* TAB 1: GENERAL & PRICING */}
						<ModernTabsContent value="general" className="space-y-3 mt-0">
							<ModernInput
								label={`${t("products.variantName")} *`}
								value={newVarName}
								onChange={(e) => setNewVarName(e.target.value)}
								placeholder={t("products.variantNamePlaceholder")}
								required
							/>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{/* SKU Code with Generator */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
											{t("stocks.sku")} *
										</Label>
										<button
											type="button"
											onClick={() => {
												const sku = generateVariantSku(newVarName);
												setNewVarSku(sku);
												toast.info(`Generated SKU: ${sku}`);
											}}
											className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
										>
											<Sparkles className="h-3 w-3" />
											{t("products.generate")}
										</button>
									</div>
									<div className="relative">
										<Input
											value={newVarSku}
											onChange={(e) => setNewVarSku(e.target.value)}
											placeholder="e.g. SKU-RED-256"
											className="pr-8 font-mono text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
											required
										/>
										<button
											type="button"
											onClick={() => {
												const sku = generateVariantSku(newVarName);
												setNewVarSku(sku);
												toast.info(`Generated SKU: ${sku}`);
											}}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
											title={t("products.generate")}
										>
											<Sparkles className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>

								{/* Barcode with Generator */}
								<div>
									<div className="flex items-center justify-between mb-1.5">
										<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
											{t("products.barcode")}
										</Label>
										<button
											type="button"
											onClick={() => {
												const code = generateVariantBarcode();
												setNewVarBarcode(code);
												toast.info(`Generated Barcode: ${code}`);
											}}
											className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
										>
											<Sparkles className="h-3 w-3" />
											{t("products.generate")}
										</button>
									</div>
									<div className="relative">
										<Input
											value={newVarBarcode}
											onChange={(e) => setNewVarBarcode(e.target.value)}
											placeholder="e.g. 8901234567890"
											className="pr-8 font-mono text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
										/>
										<button
											type="button"
											onClick={() => {
												const code = generateVariantBarcode();
												setNewVarBarcode(code);
												toast.info(`Generated Barcode: ${code}`);
											}}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
											title={t("products.generate")}
										>
											<Sparkles className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<ModernInput
									label={`${t("products.retailSellPrice")} *`}
									type="number"
									step="0.01"
									value={newVarPrice}
									onChange={(e) => setNewVarPrice(e.target.value)}
									placeholder="0.00"
								/>
								<ModernSelect
									label={`${t("products.unit")} *`}
									value={newVarUnitId}
									onChange={(val) => setNewVarUnitId(val)}
									options={productSpecificUnitOptions}
								/>
							</div>

							{/* Custom Thumbnail Upload Component */}
							<div className="space-y-1.5 pt-1">
								<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
									{t("products.productImage")}
								</Label>
								<div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
									<div className="relative h-16 w-16 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center group shadow-2xs">
										<img
											src={safeImageUrl(newVarThumbnail)}
											alt="Thumbnail Preview"
											className="h-full w-full object-cover"
											onError={(e) => {
												e.currentTarget.onerror = null;
												e.currentTarget.src = DEFAULT_IMAGE_URL;
											}}
										/>
										{newVarThumbnail && (
											<button
												type="button"
												onClick={() => setNewVarThumbnail("")}
												className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
												title="Remove Image"
											>
												<X className="h-3 w-3" />
											</button>
										)}
									</div>

									<div className="flex-1 space-y-2">
										<div className="flex flex-wrap items-center gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={uploadingVariantThumbnail}
												onClick={() => addVarThumbnailInputRef.current?.click()}
												className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
											>
												{uploadingVariantThumbnail ? (
													<>
														<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-purple-600" />
														{t("common.loading")}
													</>
												) : (
													<>
														<Upload className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
														{t("products.uploadFromComputer")}
													</>
												)}
											</Button>

											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => {
													setMediaPickerTarget("newVariant");
													setIsMediaPickerOpen(true);
												}}
												className="rounded-xl h-8 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
											>
												<FolderOpen className="h-3.5 w-3.5 mr-1.5" />
												{t("products.chooseFromVault")}
											</Button>
										</div>

										<div className="flex items-center gap-1.5">
											<Input
												type="text"
												value={newVarThumbnail}
												onChange={(e) => setNewVarThumbnail(e.target.value)}
												placeholder="Or paste direct image URL (https://...)"
												className="h-7 text-[11px] rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
											/>
											{newVarThumbnail && (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => setNewVarThumbnail("")}
													className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
													title="Clear URL"
												>
													<X className="h-3.5 w-3.5" />
												</Button>
											)}
										</div>
									</div>
								</div>
							</div>
						</ModernTabsContent>

						{/* TAB 2: PHYSICAL DIMENSIONS & WEIGHT (OPTIONAL) */}
						<ModernTabsContent value="physical" className="space-y-3 mt-0">
							<div className="flex items-center gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 text-xs">
								<Sparkles className="h-4 w-4 shrink-0" />
								<span>{t("products.optionalPhysicalSpecs")}</span>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
								<ModernInput
									label={t("products.netWeight")}
									type="number"
									step="0.01"
									value={newVarNetWeight}
									onChange={(e) => setNewVarNetWeight(e.target.value)}
									placeholder="0.12"
								/>
								<ModernInput
									label={t("products.grossWeight")}
									type="number"
									step="0.01"
									value={newVarGrossWeight}
									onChange={(e) => setNewVarGrossWeight(e.target.value)}
									placeholder="0.15"
								/>
								<ModernInput
									label={t("products.height")}
									type="number"
									step="0.1"
									value={newVarHeight}
									onChange={(e) => setNewVarHeight(e.target.value)}
									placeholder="3.5"
								/>
								<ModernInput
									label={t("products.width")}
									type="number"
									step="0.1"
									value={newVarWidth}
									onChange={(e) => setNewVarWidth(e.target.value)}
									placeholder="6.0"
								/>
								<ModernInput
									label={t("products.depth")}
									type="number"
									step="0.1"
									value={newVarDepth}
									onChange={(e) => setNewVarDepth(e.target.value)}
									placeholder="10.5"
								/>
								<ModernInput
									label={t("products.volume")}
									value={newVarVolume}
									onChange={(e) => setNewVarVolume(e.target.value)}
									placeholder="750ml"
								/>
							</div>
						</ModernTabsContent>
					</ModernTabs>
				</form>
			</ModernModal>

			{/* EDIT VARIANT MODAL */}
			<ModernModal
				isOpen={isEditVariantOpen}
				onClose={() => setIsEditVariantOpen(false)}
				title={t("products.editVariant")}
				subtitle={t("products.subtitle")}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => setIsEditVariantOpen(false)}
						/>
						<ModernModalSubmitButton
							onClick={handleUpdateVariantSubmit}
							label={t("common.save")}
							isLoading={updateVariantMutation.isPending}
						/>
					</ModernModalFooter>
				}
			>
				<input
					type="file"
					ref={editVarThumbnailInputRef}
					className="hidden"
					accept="image/*"
					onChange={(e) => handleVariantThumbnailUpload(e, true)}
				/>
				{selectedVariant && (
					<form
						onSubmit={handleUpdateVariantSubmit}
						className="space-y-4 py-1 text-xs"
					>
						<ModernTabs
							value={editVarTab}
							onValueChange={(v: any) => setEditVarTab(v)}
							className="w-full"
						>
							<ModernTabsList className="grid grid-cols-2 w-full mb-3">
								<ModernTabsTrigger
									value="general"
									icon={<Package className="h-4 w-4" />}
									className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
								>
									{t("products.basicInfo")}
								</ModernTabsTrigger>
								<ModernTabsTrigger
									value="physical"
									icon={<Boxes className="h-4 w-4" />}
									className="flex-row items-center justify-center gap-2 text-xs font-bold py-2"
								>
									{t("products.inventorySettings")}
								</ModernTabsTrigger>
							</ModernTabsList>

							{/* TAB 1: GENERAL & PRICING */}
							<ModernTabsContent value="general" className="space-y-3 mt-0">
								<ModernInput
									label={t("products.variantName")}
									value={selectedVariant.name || ""}
									onChange={(e) =>
										setSelectedVariant({
											...selectedVariant,
											name: e.target.value,
										})
									}
									placeholder="e.g. Black / 512GB"
								/>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{/* SKU Code with Generator */}
									<div>
										<div className="flex items-center justify-between mb-1.5">
											<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												{t("stocks.sku")}
											</Label>
											<button
												type="button"
												onClick={() => {
													const sku = generateVariantSku(selectedVariant.name);
													setSelectedVariant({ ...selectedVariant, sku });
													toast.info(`Generated SKU: ${sku}`);
												}}
												className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
											>
												<Sparkles className="h-3 w-3" />
												{t("products.generate")}
											</button>
										</div>
										<div className="relative">
											<Input
												value={selectedVariant.sku || ""}
												onChange={(e) =>
													setSelectedVariant({
														...selectedVariant,
														sku: e.target.value,
													})
												}
												placeholder="SKU-1001"
												className="pr-8 font-mono text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
											/>
											<button
												type="button"
												onClick={() => {
													const sku = generateVariantSku(selectedVariant.name);
													setSelectedVariant({ ...selectedVariant, sku });
													toast.info(`Generated SKU: ${sku}`);
												}}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
												title={t("products.generate")}
											>
												<Sparkles className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>

									{/* Barcode with Generator */}
									<div>
										<div className="flex items-center justify-between mb-1.5">
											<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
												{t("products.barcode")}
											</Label>
											<button
												type="button"
												onClick={() => {
													const code = generateVariantBarcode();
													setSelectedVariant({
														...selectedVariant,
														barcode: code,
													});
													toast.info(`Generated Barcode: ${code}`);
												}}
												className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:underline cursor-pointer"
											>
												<Sparkles className="h-3 w-3" />
												{t("products.generate")}
											</button>
										</div>
										<div className="relative">
											<Input
												value={selectedVariant.barcode || ""}
												onChange={(e) =>
													setSelectedVariant({
														...selectedVariant,
														barcode: e.target.value,
													})
												}
												placeholder="BAR-1001"
												className="pr-8 font-mono text-xs rounded-xl bg-slate-50/50 dark:bg-slate-900/50"
											/>
											<button
												type="button"
												onClick={() => {
													const code = generateVariantBarcode();
													setSelectedVariant({
														...selectedVariant,
														barcode: code,
													});
													toast.info(`Generated Barcode: ${code}`);
												}}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 p-1 cursor-pointer"
												title={t("products.generate")}
											>
												<Sparkles className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									<ModernInput
										label={t("products.retailSellPrice")}
										type="number"
										step="0.01"
										value={selectedVariant.price || "0"}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												price: e.target.value,
											})
										}
										placeholder="0.00"
									/>
									<ModernSelect
										label={t("products.unit")}
										value={
											selectedVariant.unitId
												? String(selectedVariant.unitId)
												: ""
										}
										onChange={(val) =>
											setSelectedVariant({ ...selectedVariant, unitId: val })
										}
										options={productSpecificUnitOptions}
									/>
								</div>

								{/* Custom Thumbnail Upload Component */}
								<div className="space-y-1.5 pt-1">
									<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
										{t("products.productImage")}
									</Label>
									<div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
										<div className="relative h-16 w-16 bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center group shadow-2xs">
											<img
												src={safeImageUrl(selectedVariant.thumbnail)}
												alt="Thumbnail Preview"
												className="h-full w-full object-cover"
												onError={(e) => {
													e.currentTarget.onerror = null;
													e.currentTarget.src = DEFAULT_IMAGE_URL;
												}}
											/>
											{selectedVariant.thumbnail && (
												<button
													type="button"
													onClick={() =>
														setSelectedVariant({
															...selectedVariant,
															thumbnail: "",
														})
													}
													className="absolute top-1 right-1 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
													title="Remove Image"
												>
													<X className="h-3 w-3" />
												</button>
											)}
										</div>

										<div className="flex-1 space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={uploadingVariantThumbnail}
													onClick={() =>
														editVarThumbnailInputRef.current?.click()
													}
													className="rounded-xl h-8 text-xs font-semibold cursor-pointer"
												>
													{uploadingVariantThumbnail ? (
														<>
															<Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-purple-600" />
															{t("common.loading")}
														</>
													) : (
														<>
															<Upload className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
															{t("products.uploadFromComputer")}
														</>
													)}
												</Button>

												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => {
														setMediaPickerTarget("editVariant");
														setIsMediaPickerOpen(true);
													}}
													className="rounded-xl h-8 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
												>
													<FolderOpen className="h-3.5 w-3.5 mr-1.5" />
													{t("products.chooseFromVault")}
												</Button>
											</div>

											<div className="flex items-center gap-1.5">
												<Input
													type="text"
													value={selectedVariant.thumbnail || ""}
													onChange={(e) =>
														setSelectedVariant({
															...selectedVariant,
															thumbnail: e.target.value,
														})
													}
													placeholder="Or paste direct image URL (https://...)"
													className="h-7 text-[11px] rounded-lg bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
												/>
												{selectedVariant.thumbnail && (
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() =>
															setSelectedVariant({
																...selectedVariant,
																thumbnail: "",
															})
														}
														className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
														title="Clear URL"
													>
														<X className="h-3.5 w-3.5" />
													</Button>
												)}
											</div>
										</div>
									</div>
								</div>
							</ModernTabsContent>

							{/* TAB 2: PHYSICAL DIMENSIONS & WEIGHT (OPTIONAL) */}
							<ModernTabsContent value="physical" className="space-y-3 mt-0">
								<div className="flex items-center gap-2 p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-300 text-xs">
									<Sparkles className="h-4 w-4 shrink-0" />
									<span>{t("products.optionalPhysicalSpecs")}</span>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
									<ModernInput
										label={t("products.netWeight")}
										type="number"
										step="0.01"
										value={
											selectedVariant.netWeight !== undefined
												? selectedVariant.netWeight
												: selectedVariant.variantAttributes?.netWeight || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												netWeight: e.target.value,
											})
										}
										placeholder="0.12"
									/>
									<ModernInput
										label={t("products.grossWeight")}
										type="number"
										step="0.01"
										value={
											selectedVariant.grossWeight !== undefined
												? selectedVariant.grossWeight
												: selectedVariant.variantAttributes?.grossWeight || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												grossWeight: e.target.value,
											})
										}
										placeholder="0.15"
									/>
									<ModernInput
										label={t("products.height")}
										type="number"
										step="0.1"
										value={
											selectedVariant.height !== undefined
												? selectedVariant.height
												: selectedVariant.variantAttributes?.height || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												height: e.target.value,
											})
										}
										placeholder="3.5"
									/>
									<ModernInput
										label={t("products.width")}
										type="number"
										step="0.1"
										value={
											selectedVariant.width !== undefined
												? selectedVariant.width
												: selectedVariant.variantAttributes?.width || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												width: e.target.value,
											})
										}
										placeholder="6.0"
									/>
									<ModernInput
										label={t("products.depth")}
										type="number"
										step="0.1"
										value={
											selectedVariant.depth !== undefined
												? selectedVariant.depth
												: selectedVariant.variantAttributes?.depth || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												depth: e.target.value,
											})
										}
										placeholder="10.5"
									/>
									<ModernInput
										label={t("products.volume")}
										value={
											selectedVariant.volume !== undefined
												? selectedVariant.volume
												: selectedVariant.variantAttributes?.volume || ""
										}
										onChange={(e) =>
											setSelectedVariant({
												...selectedVariant,
												volume: e.target.value,
											})
										}
										placeholder="750ml"
									/>
								</div>
							</ModernTabsContent>
						</ModernTabs>
					</form>
				)}
			</ModernModal>

			{/* MAP / EDIT PRODUCT UNIT CONVERSION MODAL */}
			<MapProductUnitModal
				isOpen={isMapUnitOpen}
				onClose={() => {
					setIsMapUnitOpen(false);
					setSelectedUnitForEdit(null);
				}}
				product={fullProduct || selectedProductDetails}
				availableUnits={unitsData?.items || []}
				existingMappedUnits={productUnitsList}
				initialUnit={selectedUnitForEdit}
				onSave={async (payload) => {
					await addUnitMutation.mutateAsync(payload);
				}}
				onDelete={async (unitId) => {
					await deleteUnitMutation.mutateAsync(unitId);
					setIsMapUnitOpen(false);
					setSelectedUnitForEdit(null);
				}}
				isLoading={addUnitMutation.isPending}
				isDeleting={deleteUnitMutation.isPending}
				
			/>
			<MediaPickerModal
				open={isMediaPickerOpen}
				onOpenChange={setIsMediaPickerOpen}
				multiple={false}
				title="Select Product Image Asset"
				description="Pick an image from existing attachments or upload a new file directly to S3."
				onSelect={async (selected) => {
					if (selected.length > 0) {
						const att = selected[0];
						const url =
							att.fileUrl ||
							(att.fileKey &&
							(att.fileKey.startsWith("http") || att.fileKey.startsWith("/"))
								? att.fileKey
								: fileUrl(att.fileKey) || "");
						if (mediaPickerTarget === "newVariant") {
							setNewVarThumbnail(url);
						} else if (mediaPickerTarget === "editVariant") {
							setSelectedVariant((prev: any) => ({ ...prev, thumbnail: url }));
						} else if (selectedProductDetails && !isDialogOpen) {
							updateProductImageMutation.mutate({
								id: selectedProductDetails.id,
								imageUrl: url,
							});
						} else {
							form.setValue("imageUrl", url);
						}
						toast.success(`Selected ${att.fileName}`);
					}
				}}
			/>

			<ProductPriceHistoryModal
				isOpen={isStandaloneHistoryOpen}
				onClose={() => {
					setIsStandaloneHistoryOpen(false);
					setHistoryModalProduct(null);
				}}
				productId={historyModalProduct?.id}
				productName={historyModalProduct?.name}
				productVariants={historyModalProduct?.variants || []}
				productUnits={historyModalProduct?.units || []}
			/>
		</div>
	);
}

// ============================================================
// 2. CATEGORIES TAB
// ============================================================

function CategoriesTab() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(12);
	const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
	const [expandedGridCardIds, setExpandedGridCardIds] = useState<
		Set<string | number>
	>(new Set());
	const [uploadingImage, setUploadingImage] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const {
		data: categoriesData,
		isLoading,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: ["categories", { page, pageSize, search }],
		queryFn: () => categoriesApi.list({ page, limit: pageSize, search }),
	});

	// All categories for parent dropdown lookup
	const { data: allCategoriesData } = useQuery({
		queryKey: ["categories-all"],
		queryFn: () => categoriesApi.list({ limit: 100 }),
	});

	const categoryMap = useMemo(() => {
		const map = new Map<string, string>();
		allCategoriesData?.items.forEach((c) => {
			map.set(String(c.id), c.name);
			if (Array.isArray(c.children) && c.children.length > 0) {
				c.children.forEach((child) => map.set(String(child.id), child.name));
			}
		});
		return map;
	}, [allCategoriesData]);

	const form = useForm<CategoryFormValues>({
		resolver: zodResolver(categorySchema as any),
		defaultValues: {
			name: "",
			description: "",
			color: "#3b82f6",
			parentId: "",
			imageUrl: "",
			logoUrl: "",
			sortOrder: 0,
			isActive: true,
		},
	});

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
			form.setValue("imageUrl", finalUrl);
			form.setValue("logoUrl", finalUrl);
			toast.success("Category image uploaded successfully!");
		} catch (err) {
			toast.error(getErrorMessage(err) || "Failed to upload image");
		} finally {
			setUploadingImage(false);
			if (e.target) e.target.value = "";
		}
	};

	const createMutation = useMutation({
		mutationFn: categoriesApi.create,
		onSuccess: () => {
			toast.success("Category created successfully");
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["categories-all"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string | number;
			body: Partial<Category>;
		}) => categoriesApi.update(id, body),
		onSuccess: () => {
			toast.success("Category updated successfully");
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["categories-all"] });
			setIsDialogOpen(false);
			setEditingCategory(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => categoriesApi.remove(id),
		onSuccess: () => {
			toast.success("Category deleted");
			queryClient.invalidateQueries({ queryKey: ["categories"] });
			queryClient.invalidateQueries({ queryKey: ["categories-all"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = (defaultParentId?: string | number) => {
		setEditingCategory(null);
		form.reset({
			name: "",
			description: "",
			color: "#3b82f6",
			parentId: defaultParentId ? String(defaultParentId) : "",
			imageUrl: "",
			logoUrl: "",
			sortOrder: 0,
			isActive: true,
		});
		setIsDialogOpen(true);
	};

	const openEdit = (cat: Category) => {
		setEditingCategory(cat);
		const isCatActive = cat.status
			? cat.status.toLowerCase() === "active"
			: (cat.isActive ?? true);
		const currentLogo = cat.logoUrl || cat.imageUrl || "";
		form.reset({
			name: cat.name || "",
			description: cat.description || "",
			color: cat.color || "#3b82f6",
			parentId: cat.parentId ? String(cat.parentId) : "",
			imageUrl: currentLogo,
			logoUrl: currentLogo,
			sortOrder: cat.sortOrder ?? 0,
			isActive: isCatActive,
		});
		setIsDialogOpen(true);
	};

	const onSubmit = (values: CategoryFormValues) => {
		const finalLogo = values.logoUrl || values.imageUrl || "";
		const payload = {
			...values,
			logoUrl: finalLogo,
			imageUrl: finalLogo,
			parentId: values.parentId ? Number(values.parentId) : null,
			status: values.isActive ? "Active" : "Inactive",
		};
		if (editingCategory) {
			updateMutation.mutate({ id: editingCategory.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const toggleActive = (cat: Category) => {
		const currentActive = cat.status
			? cat.status.toLowerCase() === "active"
			: (cat.isActive ?? true);
		updateMutation.mutate({
			id: cat.id,
			body: {
				...cat,
				isActive: !currentActive,
				status: !currentActive ? "Active" : "Inactive",
			},
		});
	};

	const columns: ColumnDef<Category>[] = [
		{
			id: "expander",
			header: "",
			width: "40px",
			cell: ({ row }: { row: Category }) => {
				const hasChildren =
					Array.isArray(row.children) && row.children.length > 0;
				if (!hasChildren) return <div className="w-7" />;
				const isExpanded = expandedCategoryIds.includes(String(row.id));
				return (
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
						onClick={(e) => {
							e.stopPropagation();
							setExpandedCategoryIds((prev) =>
								prev.includes(String(row.id))
									? prev.filter((id) => id !== String(row.id))
									: [...prev, String(row.id)],
							);
						}}
						title={
							isExpanded
								? "Collapse Subcategories"
								: "Expand Subcategories List"
						}
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform duration-200",
								isExpanded &&
									"rotate-180 text-purple-600 dark:text-purple-400 font-bold",
							)}
						/>
					</Button>
				);
			},
		},
		{
			id: "name",
			header: t("products.categoryName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }: { row: Category }) => (
				<div
					className="flex items-center gap-2.5 cursor-pointer group"
					onClick={() => openEdit(row)}
				>
					<UserDetailCell
						name={row.name}
						subtitle={
							row.parentId && categoryMap.has(String(row.parentId))
								? `${t("products.subcategoryOf")}: ${categoryMap.get(String(row.parentId))}`
								: `ID: #${row.id}`
						}
						avatarUrl={row.logoUrl || row.imageUrl}
					/>
					{Array.isArray(row.children) && row.children.length > 0 ? (
						<Badge
							variant="outline"
							className="text-[9px] bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 font-bold shrink-0"
						>
							{row.children.length} {t("products.subcategories")}
						</Badge>
					) : (
						<Badge
							variant="ghost"
							className="text-[9px] text-slate-400 font-normal shrink-0"
						>
							Main
						</Badge>
					)}
				</div>
			),
		},
		{
			id: "parent",
			header: t("products.parentCategory"),
			accessorKey: "parentId",
			cell: ({ row }) => {
				const parentTitle =
					row.parentName ||
					(row.parentId && categoryMap.has(String(row.parentId))
						? categoryMap.get(String(row.parentId))
						: null);
				return parentTitle ? (
					<Badge
						variant="outline"
						className="text-xs bg-purple-50/50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300"
					>
						{parentTitle}
					</Badge>
				) : (
					<span className="text-xs text-muted-foreground font-medium">
						{t("products.topLevelRoot")}
					</span>
				);
			},
		},
		{
			id: "color",
			header: t("products.themeColor"),
			accessorKey: "color",
			cell: ({ row }) =>
				row.color ? (
					<div className="flex items-center gap-1.5 font-mono text-xs">
						<span
							className="h-3 w-3 rounded-full border border-black/10 shrink-0"
							style={{ backgroundColor: row.color }}
						/>
						<span className="text-slate-600 dark:text-slate-400">
							{row.color}
						</span>
					</div>
				) : (
					<span className="text-xs text-muted-foreground">—</span>
				),
		},
		{
			id: "description",
			header: t("products.detailedDescription"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground truncate max-w-[200px] block">
					{value || "—"}
				</span>
			),
		},
		{
			id: "sortOrder",
			header: t("products.sortOrder"),
			accessorKey: "sortOrder",
			sortable: true,
			cell: ({ value }) => (
				<Badge variant="secondary" className="text-xs">
					{value ?? 0}
				</Badge>
			),
		},
		{
			id: "isActive",
			header: t("products.status"),
			accessorKey: "isActive",
			cell: ({ row }) => {
				const isCatActive = row.status
					? row.status.toLowerCase() === "active"
					: (row.isActive ?? true);
				return (
					<div className="flex items-center gap-2">
						<Switch
							checked={isCatActive}
							onCheckedChange={() => toggleActive(row)}
						/>
						<StatusBadgeCell
							status={isCatActive ? "Active" : "Inactive"}
							type="account"
						/>
					</div>
				);
			},
		},
	];

	const totalCount = categoriesData?.total || 0;
	const totalPages = Math.ceil(totalCount / pageSize) || 1;

	return (
		<div className="space-y-4">
			{/* Unified Search, Refetch, View Switcher & Add Category Toolbar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
				{/* Search Input */}
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<Input
						placeholder={t("products.searchProductsPlaceholder")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
					/>
				</div>

				{/* Toolbar Actions on Same Line */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Refetch Button */}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isFetching}
						title={t("common.refresh")}
						className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
					>
						<RefreshCw
							className={cn(
								"h-3.5 w-3.5",
								isFetching && "animate-spin text-purple-600",
							)}
						/>
						<span>{t("common.refresh")}</span>
					</Button>

					{/* View Switcher */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<Button
							type="button"
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("grid")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "grid" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t("common.grid")}
						</Button>
						<Button
							type="button"
							variant={viewMode === "table" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("table")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "table" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutList className="h-3.5 w-3.5 mr-1" /> {t("common.table")}
						</Button>
					</div>

					{/* Modern Add Category Button */}
					<Button
						onClick={() => openCreate()}
						className="gap-1.5 text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						<span>{t("products.addCategory")}</span>
					</Button>
				</div>
			</div>

			{viewMode === "table" ? (
				<DataTable<Category>
					data={categoriesData?.items || []}
					columns={columns}
					getRowId={(c) => String(c.id)}
					expandedRowIds={expandedCategoryIds}
					onToggleExpandRow={(rowId) =>
						setExpandedCategoryIds((prev) =>
							prev.includes(rowId)
								? prev.filter((id) => id !== rowId)
								: [...prev, rowId],
						)
					}
					title={t("sidebar.categories")}
					hideSearch={true}
					onRefresh={() => refetch()}
					manualPagination={true}
					totalCount={totalCount}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					isLoading={isLoading}
					onEditRow={openEdit}
					onDeleteRow={(c) => deleteMutation.mutate(c.id)}
					renderSubComponent={(category) => (
						<CategoryChildrenAccordionSubRow
							category={category}
							onEdit={openEdit}
							onDelete={(id) => deleteMutation.mutate(id)}
							onAddSub={(parentId) => openCreate(parentId)}
							onToggleActive={toggleActive}
						/>
					)}
					exportFilename="product-categories"
				/>
			) : (
				<div className="space-y-4">
					{/* Cards Grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse"
								/>
							))}
						</div>
					) : (categoriesData?.items || []).length === 0 ? (
						<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
							<Tags className="h-12 w-12 text-slate-300 mx-auto" />
							<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
								{t("products.noCategoriesFound")}
							</h4>
							<p className="text-xs text-slate-500">
								{t("products.createCategoryDesc")}
							</p>
							<Button
								onClick={() => openCreate()}
								className="gap-2 text-xs font-bold h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								{t("products.addCategory")}
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{(categoriesData?.items || []).map((cat: Category) => {
								const img = cat.logoUrl || cat.imageUrl;
								const isCatActive = cat.status
									? cat.status.toLowerCase() === "active"
									: (cat.isActive ?? true);
								const hasChildren =
									Array.isArray(cat.children) && cat.children.length > 0;
								const childCount = cat.children?.length || 0;
								const isGridExpanded = expandedGridCardIds.has(cat.id);

								return (
									<div
										key={cat.id}
										className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700/80 transition-all flex flex-col justify-between space-y-3.5"
									>
										<div className="space-y-3">
											{/* Image / Logo Container */}
											<div className="relative h-36 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3">
												{img ? (
													<img
														src={safeImageUrl(img)}
														alt={cat.name}
														className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
														onError={(e) => {
															e.currentTarget.onerror = null;
															e.currentTarget.src = DEFAULT_IMAGE_URL;
														}}
													/>
												) : (
													<div
														className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-xs text-white group-hover:scale-105 transition-transform duration-300"
														style={{ backgroundColor: cat.color || "#3b82f6" }}
													>
														<Tags className="size-8" />
													</div>
												)}

												{/* Top-right: Status Badge */}
												<div className="absolute top-2 right-2">
													<StatusBadgeCell
														status={isCatActive ? "Active" : "Inactive"}
														type="account"
													/>
												</div>

												{/* Theme Color Chip */}
												{cat.color && (
													<div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-800 text-[10px] font-mono shadow-2xs">
														<span
															className="h-2 w-2 rounded-full"
															style={{ backgroundColor: cat.color }}
														/>
														<span className="text-slate-600 dark:text-slate-400 font-bold">
															{cat.color}
														</span>
													</div>
												)}
											</div>

											{/* Title & Parent Hierarchy Info */}
											<div>
												<div className="flex items-center justify-between gap-2">
													<h4
														className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
														onClick={() => openEdit(cat)}
														title={cat.name}
													>
														{cat.name}
													</h4>
													<span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
														#{cat.id}
													</span>
												</div>
												<p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
													{cat.parentId && categoryMap.has(String(cat.parentId))
														? `${t("products.subcategoryOf")}: ${categoryMap.get(String(cat.parentId))}`
														: t("products.category")}
												</p>
											</div>

											{/* Description */}
											{cat.description && (
												<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
													{cat.description}
												</p>
											)}

											{/* Subcategories Collapsible Box (Default Hidden / Collapsed) */}
											{hasChildren ? (
												<div className="space-y-2">
													{/* Toggle Button */}
													<button
														type="button"
														onClick={() => {
															setExpandedGridCardIds((prev) => {
																const next = new Set(prev);
																if (next.has(cat.id)) next.delete(cat.id);
																else next.add(cat.id);
																return next;
															});
														}}
														className={cn(
															"w-full flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all duration-200",
															isGridExpanded
																? "bg-purple-50/90 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-2xs"
																: "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-50/40 hover:text-purple-600 hover:border-purple-200",
														)}
													>
														<div className="flex items-center gap-1.5">
															<CornerDownRight className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
															<span>{t("products.subcategories")}</span>
															<Badge
																variant="secondary"
																className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold"
															>
																{childCount}
															</Badge>
														</div>
														<div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
															<span>{isGridExpanded ? "Hide" : "Show"}</span>
															<ChevronDown
																className={cn(
																	"h-3.5 w-3.5 transition-transform duration-200",
																	isGridExpanded &&
																		"rotate-180 text-purple-600",
																)}
															/>
														</div>
													</button>

													{/* Expanded Children List */}
													{isGridExpanded && (
														<div className="rounded-xl border border-purple-100 dark:border-purple-950/60 bg-slate-50/40 dark:bg-slate-950/40 p-2 space-y-1.5 animate-in fade-in-50 duration-200">
															<div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
																<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
																	{t("products.subcategories")}
																</span>
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() => openCreate(cat.id)}
																	className="h-5 px-1.5 text-[10px] font-bold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md gap-0.5"
																>
																	<Plus className="h-3 w-3" />{" "}
																	{t("products.addCategory")}
																</Button>
															</div>

															<div className="space-y-1 max-h-36 overflow-y-auto pr-0.5 custom-scrollbar">
																{cat.children!.map((child) => {
																	const isChildActive = child.status
																		? child.status.toLowerCase() === "active"
																		: (child.isActive ?? true);
																	return (
																		<div
																			key={child.id}
																			className="flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs hover:border-purple-200 transition-colors"
																		>
																			<div className="flex items-center gap-1.5 min-w-0 flex-1">
																				<span
																					className="h-2 w-2 rounded-full shrink-0 border border-black/10"
																					style={{
																						backgroundColor:
																							child.color || "#3b82f6",
																					}}
																				/>
																				<span
																					onClick={() => openEdit(child)}
																					className="font-medium text-[11px] text-slate-700 dark:text-slate-200 truncate cursor-pointer hover:text-purple-600"
																					title={child.name}
																				>
																					{child.name}
																				</span>
																			</div>

																			<div className="flex items-center gap-1 shrink-0">
																				<span
																					className={cn(
																						"text-[9px] font-mono px-1 py-0.2 rounded font-semibold",
																						isChildActive
																							? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50"
																							: "text-slate-400 bg-slate-100 dark:bg-slate-800",
																					)}
																				>
																					{isChildActive ? "Act" : "Inact"}
																				</span>
																				<button
																					type="button"
																					onClick={() => openEdit(child)}
																					className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
																					title={t("common.edit")}
																				>
																					<Pencil className="h-3 w-3" />
																				</button>
																				<button
																					type="button"
																					onClick={() =>
																						deleteMutation.mutate(child.id)
																					}
																					className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
																					title={t("common.delete")}
																				>
																					<Trash2 className="h-3 w-3" />
																				</button>
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													)}
												</div>
											) : (
												<div className="flex items-center justify-between pt-1">
													<span className="text-[11px] text-slate-400">
														{t("products.noCategoriesFound")}
													</span>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => openCreate(cat.id)}
														className="h-6 px-2 text-[10px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-md gap-1"
													>
														<Plus className="h-3 w-3" />{" "}
														{t("products.addCategory")}
													</Button>
												</div>
											)}
										</div>

										{/* Footer with Sort Order and Actions */}
										<div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
											<span
												className={cn(
													"text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
													isCatActive
														? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
														: "text-slate-500 bg-slate-100 dark:bg-slate-800",
												)}
											>
												{isCatActive ? "Active" : "Inactive"}
											</span>

											<div className="flex items-center gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openCreate(cat.id)}
													className="h-7 px-2 rounded-lg text-slate-500 hover:text-purple-600 text-xs font-semibold gap-1"
													title="Add child subcategory"
												>
													<FolderPlus className="h-3.5 w-3.5" />
													<span className="hidden sm:inline">
														{t("products.subcategories")}
													</span>
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openEdit(cat)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-purple-600"
													title={t("common.edit")}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => deleteMutation.mutate(cat.id)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-rose-600"
													title={t("common.delete")}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Pagination */}
					{totalCount > pageSize && (
						<div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
							<div>
								Showing {(page - 1) * pageSize + 1} to{" "}
								{Math.min(page * pageSize, totalCount)} of {totalCount} items
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									className="h-8 px-3 text-xs"
								>
									Previous
								</Button>
								<span className="font-semibold px-2">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="h-8 px-3 text-xs"
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Category Create/Edit Modal with Custom Upload */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={
					editingCategory
						? t("products.editCategory")
						: t("products.createCategory")
				}
				subtitle={
					editingCategory ? t("products.subtitle") : t("products.subtitle")
				}
				icon={<Tags className="h-5 w-5" />}
				size="md"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="category-form"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="category-form"
					onSubmit={form.handleSubmit(onSubmit as any)}
					className="space-y-4"
				>
					<ModernInput
						label={t("products.categoryName")}
						placeholder={t("products.categoryNamePlaceholder")}
						{...form.register("name")}
						error={form.formState.errors.name?.message}
						required
					/>

					{/* Custom Upload Component */}
					<div className="space-y-1.5">
						<Label className="font-semibold text-xs text-foreground tracking-wide">
							{t("products.categoryImageOrLogo")}
						</Label>
						<div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
							<div className="relative h-14 w-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
								{form.watch("logoUrl") || form.watch("imageUrl") ? (
									<img
										src={safeImageUrl(
											form.watch("logoUrl") || form.watch("imageUrl"),
										)}
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
										style={{
											backgroundColor: form.watch("color") || "#3b82f6",
										}}
									>
										<Tags className="h-6 w-6" />
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
									{(form.watch("imageUrl") || form.watch("logoUrl")) && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												form.setValue("imageUrl", "");
												form.setValue("logoUrl", "");
											}}
											className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
										>
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

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label className="font-semibold text-xs text-foreground tracking-wide">
								{t("products.badgeColor")}
							</Label>
							<div className="flex items-center gap-2">
								<input
									type="color"
									className="h-11 w-14 rounded-xl border border-slate-200 cursor-pointer p-1 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 shrink-0"
									value={form.watch("color") || "#3b82f6"}
									onChange={(e) => form.setValue("color", e.target.value)}
								/>
								<ModernInput
									placeholder="#3b82f6"
									{...form.register("color")}
								/>
							</div>
						</div>

						<ModernInput
							label={t("products.sortOrder")}
							type="number"
							{...form.register("sortOrder")}
						/>
					</div>

					<ModernSelect
						label={t("products.parentCategory")}
						placeholder={t("products.topLevelRoot")}
						value={form.watch("parentId")}
						onChange={(val) => form.setValue("parentId", val)}
						options={[
							{ value: "", label: t("products.topLevelRoot") },
							...(allCategoriesData?.items
								?.filter((c) => c.id !== editingCategory?.id)
								.map((c) => ({
									value: String(c.id),
									label: c.name,
								})) || []),
						]}
						searchable
					/>

					<ModernTextarea
						label={t("products.detailedDescription")}
						rows={3}
						placeholder="Category overview..."
						{...form.register("description")}
					/>

					<div className="pt-2">
						<ModernSwitch
							label={t("products.activeCategoryStatus")}
							showStatusBadge
							checked={form.watch("isActive")}
							onCheckedChange={(checked) => form.setValue("isActive", checked)}
						/>
					</div>
				</form>
			</ModernModal>
		</div>
	);
}

// Category Children Accordion Sub-Row for Table View (Styled exactly like ProductVariantsAccordionSubRow)
function CategoryChildrenAccordionSubRow({
	category,
	onEdit,
	onDelete,
	onAddSub,
	onToggleActive,
}: {
	category: Category;
	onEdit: (cat: Category) => void;
	onDelete: (id: string | number) => void;
	onAddSub: (parentId: string | number) => void;
	onToggleActive: (cat: Category) => void;
}) {
	const { t } = useTranslation();
	const children = category.children || [];

	return (
		<div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-purple-100 dark:border-purple-950/60 space-y-3 shadow-inner text-xs">
			<div className="flex items-center justify-between border-b pb-2.5 border-slate-200/80 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
						<CornerDownRight className="h-3.5 w-3.5" />
					</div>
					<span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
						{category.name} —{" "}
						{children.length > 0
							? `${children.length} ${t("products.subcategories")}`
							: t("products.subcategories")}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-[10px] font-mono">
						Parent ID: #{category.id}
					</Badge>
					<Button
						type="button"
						size="sm"
						onClick={() => onAddSub(category.id)}
						className="h-7 px-2.5 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-1 shadow-2xs cursor-pointer"
					>
						<Plus className="h-3 w-3" /> {t("products.addCategory")}
					</Button>
				</div>
			</div>

			{children.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-w-0 max-w-full shadow-2xs">
					<table className="w-full text-left text-xs min-w-[650px]">
						<thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
							<tr>
								<th className="p-2.5">{t("products.categoryName")}</th>
								<th className="p-2.5">{t("products.badgeColor")}</th>
								<th className="p-2.5">{t("products.detailedDescription")}</th>
								<th className="p-2.5">{t("products.sortOrder")}</th>
								<th className="p-2.5">{t("products.status")}</th>
								<th className="p-2.5 text-right">{t("products.actions")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
							{children.map((child: Category) => {
								const isChildActive = child.status
									? child.status.toLowerCase() === "active"
									: (child.isActive ?? true);
								const img = child.logoUrl || child.imageUrl;

								return (
									<tr
										key={child.id}
										className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
									>
										<td className="p-2.5">
											<div className="flex items-center gap-2.5">
												<div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
													{img ? (
														<img
															src={safeImageUrl(img)}
															alt={child.name}
															className="h-full w-full object-contain p-0.5"
															onError={(e) => {
																e.currentTarget.onerror = null;
																e.currentTarget.src = DEFAULT_IMAGE_URL;
															}}
														/>
													) : (
														<span
															className="h-full w-full flex items-center justify-center text-white text-[10px] font-bold"
															style={{
																backgroundColor: child.color || "#3b82f6",
															}}
														>
															{child.name.slice(0, 2).toUpperCase()}
														</span>
													)}
												</div>
												<div>
													<span
														className="font-bold text-slate-800 dark:text-slate-200 hover:text-purple-600 cursor-pointer block truncate"
														onClick={() => onEdit(child)}
													>
														{child.name}
													</span>
													<span className="text-[10px] text-slate-400 font-mono">
														ID: #{child.id}
													</span>
												</div>
											</div>
										</td>
										<td className="p-2.5">
											{child.color ? (
												<div className="flex items-center gap-1.5 font-mono text-[11px]">
													<span
														className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
														style={{ backgroundColor: child.color }}
													/>
													<span className="text-slate-600 dark:text-slate-400">
														{child.color}
													</span>
												</div>
											) : (
												<span className="text-slate-400">—</span>
											)}
										</td>
										<td className="p-2.5 text-slate-500 max-w-[200px] truncate">
											{child.description || "—"}
										</td>
										<td className="p-2.5">
											<Badge
												variant="secondary"
												className="text-[10px] font-mono"
											>
												{child.sortOrder ?? 0}
											</Badge>
										</td>
										<td className="p-2.5">
											<div className="flex items-center gap-2">
												<Switch
													checked={isChildActive}
													onCheckedChange={() => onToggleActive(child)}
												/>
												<StatusBadgeCell
													status={isChildActive ? "Active" : "Inactive"}
													type="account"
												/>
											</div>
										</td>
										<td className="p-2.5 text-right">
											<div className="flex items-center justify-end gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => onEdit(child)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50"
													title={t("common.edit")}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => onDelete(child.id)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
													title={t("common.delete")}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div className="py-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
					{t("products.noCategoriesFound")}
				</div>
			)}
		</div>
	);
}

// ============================================================
// 3. BRANDS TAB
// ============================================================

function BrandsTab() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(12);
	const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const {
		data: brandsData,
		isLoading,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: ["brands", { page, pageSize, search }],
		queryFn: () => brandsApi.list({ page, limit: pageSize, search }),
	});

	const form = useForm<BrandFormValues>({
		resolver: zodResolver(brandSchema as any),
		defaultValues: {
			name: "",
			description: "",
			logoUrl: "",
			isActive: true,
		},
	});

	const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			setUploadingLogo(true);
			const res = await uploadService.uploadSingle(file, {
				isPublic: true,
				category: "BRANDS",
				description: `Brand logo: ${file.name}`,
			});
			const finalUrl = res.url || res.fileKey || "";
			form.setValue("logoUrl", finalUrl);
			toast.success("Brand logo uploaded successfully!");
		} catch (err) {
			toast.error(getErrorMessage(err) || "Failed to upload logo");
		} finally {
			setUploadingLogo(false);
			if (e.target) e.target.value = "";
		}
	};

	const createMutation = useMutation({
		mutationFn: brandsApi.create,
		onSuccess: () => {
			toast.success("Brand created successfully");
			queryClient.invalidateQueries({ queryKey: ["brands"] });
			queryClient.invalidateQueries({ queryKey: ["brands-all"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string | number; body: Partial<Brand> }) =>
			brandsApi.update(id, body),
		onSuccess: () => {
			toast.success("Brand updated successfully");
			queryClient.invalidateQueries({ queryKey: ["brands"] });
			queryClient.invalidateQueries({ queryKey: ["brands-all"] });
			setIsDialogOpen(false);
			setEditingBrand(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => brandsApi.remove(id),
		onSuccess: () => {
			toast.success("Brand deleted");
			queryClient.invalidateQueries({ queryKey: ["brands"] });
			queryClient.invalidateQueries({ queryKey: ["brands-all"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setEditingBrand(null);
		form.reset({
			name: "",
			description: "",
			logoUrl: "",
			isActive: true,
		});
		setIsDialogOpen(true);
	};

	const openEdit = (brand: Brand) => {
		setEditingBrand(brand);
		const isBrandActive = brand.status
			? brand.status.toLowerCase() === "active"
			: (brand.isActive ?? true);
		form.reset({
			name: brand.name || "",
			description: brand.description || "",
			logoUrl: brand.logoUrl || (brand as any).imageUrl || "",
			isActive: isBrandActive,
		});
		setIsDialogOpen(true);
	};

	const onSubmit = (values: BrandFormValues) => {
		const payload = {
			...values,
			status: values.isActive ? "Active" : "Inactive",
		};
		if (editingBrand) {
			updateMutation.mutate({ id: editingBrand.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const toggleActive = (brand: Brand) => {
		const currentActive = brand.status
			? brand.status.toLowerCase() === "active"
			: (brand.isActive ?? true);
		updateMutation.mutate({
			id: brand.id,
			body: {
				...brand,
				isActive: !currentActive,
				status: !currentActive ? "Active" : "Inactive",
			},
		});
	};

	const columns: ColumnDef<Brand>[] = [
		{
			id: "name",
			header: t("products.brandName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ row }) => (
				<UserDetailCell
					name={row.name}
					subtitle={`ID: ${row.id}`}
					avatarUrl={row.logoUrl}
				/>
			),
		},
		{
			id: "description",
			header: t("products.detailedDescription"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground">{value || "—"}</span>
			),
		},
		{
			id: "isActive",
			header: t("products.status"),
			accessorKey: "isActive",
			cell: ({ row }) => {
				const isBrandActive = row.status
					? row.status.toLowerCase() === "active"
					: (row.isActive ?? true);
				return (
					<Switch
						checked={isBrandActive}
						onCheckedChange={() => toggleActive(row)}
					/>
				);
			},
		},
	];

	const totalCount = brandsData?.total || 0;
	const totalPages = Math.ceil(totalCount / pageSize) || 1;

	return (
		<div className="space-y-4">
			{/* Unified Search, Refetch, View Switcher & Add Brand Toolbar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
				{/* Search Input */}
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<Input
						placeholder={t("products.searchProductsPlaceholder")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
					/>
				</div>

				{/* Toolbar Actions on Same Line */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Refetch Button */}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isFetching}
						title={t("common.refresh")}
						className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
					>
						<RefreshCw
							className={cn(
								"h-3.5 w-3.5",
								isFetching && "animate-spin text-purple-600",
							)}
						/>
						<span>{t("common.refresh")}</span>
					</Button>

					{/* View Switcher */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<Button
							type="button"
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("grid")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "grid" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t("common.grid")}
						</Button>
						<Button
							type="button"
							variant={viewMode === "table" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("table")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "table" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutList className="h-3.5 w-3.5 mr-1" /> {t("common.table")}
						</Button>
					</div>

					{/* Modern Add Brand Button */}
					<Button
						onClick={openCreate}
						className="gap-1.5 text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						<span>{t("products.addBrand")}</span>
					</Button>
				</div>
			</div>

			{viewMode === "table" ? (
				<DataTable<Brand>
					data={brandsData?.items || []}
					columns={columns}
					getRowId={(b) => String(b.id)}
					title={t("sidebar.brands")}
					hideSearch={true}
					onRefresh={() => refetch()}
					manualPagination={true}
					totalCount={totalCount}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					isLoading={isLoading}
					onEditRow={openEdit}
					onDeleteRow={(b) => deleteMutation.mutate(b.id)}
					exportFilename="product-brands"
				/>
			) : (
				<div className="space-y-4">
					{/* Cards Grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse"
								/>
							))}
						</div>
					) : (brandsData?.items || []).length === 0 ? (
						<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
							<Bookmark className="h-12 w-12 text-slate-300 mx-auto" />
							<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
								{t("products.noBrandsFound")}
							</h4>
							<p className="text-xs text-slate-500">
								{t("products.createBrandDesc")}
							</p>
							<Button
								onClick={openCreate}
								className="gap-2 text-xs font-bold h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								{t("products.addBrand")}
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{(brandsData?.items || []).map((brand: Brand) => {
								const logo = brand.logoUrl || (brand as any).imageUrl;
								const isBrandActive = brand.status
									? brand.status.toLowerCase() === "active"
									: (brand.isActive ?? true);

								return (
									<div
										key={brand.id}
										className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700/80 transition-all flex flex-col justify-between space-y-3"
									>
										<div className="space-y-3">
											{/* Logo Container */}
											<div className="relative h-36 w-full rounded-xl bg-slate-50 dark:bg-slate-950/60 overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3">
												{logo ? (
													<img
														src={safeImageUrl(logo)}
														alt={brand.name}
														className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
														onError={(e) => {
															e.currentTarget.onerror = null;
															e.currentTarget.src = DEFAULT_IMAGE_URL;
														}}
													/>
												) : (
													<div className="h-16 w-16 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-300">
														<Bookmark className="size-8" />
													</div>
												)}

												{/* Top-right: Status Badge */}
												<div className="absolute top-2 right-2">
													<StatusBadgeCell
														status={isBrandActive ? "Active" : "Inactive"}
														type="account"
													/>
												</div>
											</div>

											{/* Brand Name & ID */}
											<div>
												<h4
													className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
													onClick={() => openEdit(brand)}
												>
													{brand.name}
												</h4>
												<p className="text-[11px] text-slate-400 font-mono mt-0.5">
													ID: #{brand.id}
												</p>
											</div>

											{/* Description */}
											{brand.description && (
												<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
													{brand.description}
												</p>
											)}
										</div>

										{/* Footer with Actions */}
										<div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
											<span
												className={cn(
													"text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
													isBrandActive
														? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
														: "text-slate-500 bg-slate-100 dark:bg-slate-800",
												)}
											>
												{isBrandActive ? "Active" : "Disabled"}
											</span>

											<div className="flex items-center gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openEdit(brand)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-purple-600"
													title={t("common.edit")}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => deleteMutation.mutate(brand.id)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-rose-600"
													title={t("common.delete")}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Pagination */}
					{totalCount > pageSize && (
						<div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
							<div>
								Showing {(page - 1) * pageSize + 1} to{" "}
								{Math.min(page * pageSize, totalCount)} of {totalCount} items
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									className="h-8 px-3 text-xs"
								>
									Previous
								</Button>
								<span className="font-semibold px-2">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="h-8 px-3 text-xs"
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Brand Create/Edit Modal with Custom Upload */}
			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={
					editingBrand ? t("products.editBrand") : t("products.createBrand")
				}
				subtitle={
					editingBrand ? t("products.subtitle") : t("products.subtitle")
				}
				icon={<Bookmark className="h-5 w-5" />}
				size="md"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="brand-form"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="brand-form"
					onSubmit={form.handleSubmit(onSubmit as any)}
					className="space-y-4"
				>
					<ModernInput
						label={t("products.brandName")}
						placeholder={t("products.brandNamePlaceholder")}
						{...form.register("name")}
						error={form.formState.errors.name?.message}
						required
					/>

					{/* Custom Upload Component */}
					<div className="space-y-1.5">
						<Label className="font-semibold text-xs text-foreground tracking-wide">
							{t("products.brandLogo")}
						</Label>
						<div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
							<div className="relative h-14 w-14 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
								{form.watch("logoUrl") ? (
									<img
										src={safeImageUrl(form.watch("logoUrl"))}
										alt="Brand logo preview"
										className="h-full w-full object-contain p-1"
										onError={(e) => {
											e.currentTarget.onerror = null;
											e.currentTarget.src = DEFAULT_IMAGE_URL;
										}}
									/>
								) : (
									<div className="h-full w-full flex items-center justify-center text-purple-600 bg-purple-50 dark:bg-purple-950/50">
										<Bookmark className="h-6 w-6" />
									</div>
								)}
							</div>

							<div className="flex-1 space-y-1">
								<div className="flex items-center gap-2 flex-wrap">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={uploadingLogo}
										onClick={() => fileInputRef.current?.click()}
										className="h-8 px-3 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs"
									>
										{uploadingLogo ? (
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
										onChange={handleUploadLogo}
									/>
									{form.watch("logoUrl") && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => form.setValue("logoUrl", "")}
											className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
										>
											{t("common.delete")}
										</Button>
									)}
								</div>
								<p className="text-[11px] text-slate-400">
									{t("products.uploadBrandLogoDesc")}
								</p>
							</div>
						</div>
					</div>

					<ModernTextarea
						label={t("products.detailedDescription")}
						rows={3}
						placeholder="Brand overview..."
						{...form.register("description")}
					/>

					<div className="pt-2">
						<ModernSwitch
							label={t("products.activeBrandStatus")}
							showStatusBadge
							checked={form.watch("isActive")}
							onCheckedChange={(checked) => form.setValue("isActive", checked)}
						/>
					</div>
				</form>
			</ModernModal>
		</div>
	);
}

// ============================================================
// 4. UNITS TAB
// ============================================================

function UnitsTab() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(12);
	const [viewMode, setViewMode] = useState<"table" | "grid">("grid");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

	const {
		data: unitsData,
		isLoading,
		isFetching,
		refetch,
	} = useQuery({
		queryKey: ["units", { page, pageSize, search }],
		queryFn: () => unitsApi.list({ page, limit: pageSize, search }),
	});

	const form = useForm<UnitFormValues>({
		resolver: zodResolver(unitSchema as any),
		defaultValues: {
			name: "",
			symbol: "",
			description: "",
			isActive: true,
		},
	});

	const createMutation = useMutation({
		mutationFn: unitsApi.create,
		onSuccess: () => {
			toast.success("Unit created successfully");
			queryClient.invalidateQueries({ queryKey: ["units"] });
			setIsDialogOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, body }: { id: string | number; body: Partial<Unit> }) =>
			unitsApi.update(id, body),
		onSuccess: () => {
			toast.success("Unit updated successfully");
			queryClient.invalidateQueries({ queryKey: ["units"] });
			setIsDialogOpen(false);
			setEditingUnit(null);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => unitsApi.remove(id),
		onSuccess: () => {
			toast.success("Unit deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["units"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setEditingUnit(null);
		form.reset({
			name: "",
			symbol: "",
			description: "",
			isActive: true,
		});
		setIsDialogOpen(true);
	};

	const openEdit = (unit: Unit) => {
		setEditingUnit(unit);
		const isUnitActive = unit.status
			? unit.status.toLowerCase() === "active"
			: (unit.isActive ?? true);
		form.reset({
			name: unit.name || "",
			symbol: unit.symbol || "",
			description: unit.description || "",
			isActive: isUnitActive,
		});
		setIsDialogOpen(true);
	};

	const onSubmit = (values: UnitFormValues) => {
		const payload = {
			...values,
			status: values.isActive ? "Active" : "Inactive",
		};
		if (editingUnit) {
			updateMutation.mutate({ id: editingUnit.id, body: payload });
		} else {
			createMutation.mutate(payload);
		}
	};

	const columns: ColumnDef<Unit>[] = [
		{
			id: "name",
			header: t("products.unitName"),
			accessorKey: "name",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
					{value}
				</span>
			),
		},
		{
			id: "symbol",
			header: t("products.unitSymbol"),
			accessorKey: "symbol",
			cell: ({ value, row }) => (
				<Badge variant="outline" className="font-mono text-xs font-bold">
					{value || row.name?.substring(0, 3).toUpperCase()}
				</Badge>
			),
		},
		{
			id: "description",
			header: t("products.detailedDescription"),
			accessorKey: "description",
			cell: ({ value }) => (
				<span className="text-xs text-muted-foreground">{value || "—"}</span>
			),
		},
		{
			id: "status",
			header: t("products.status"),
			accessorKey: "status",
			cell: ({ row }) => {
				const isUnitActive = row.status
					? row.status.toLowerCase() === "active"
					: (row.isActive ?? true);
				return (
					<StatusBadgeCell
						status={isUnitActive ? "Active" : "Inactive"}
						type="account"
					/>
				);
			},
		},
	];

	const totalCount = unitsData?.total || 0;
	const totalPages = Math.ceil(totalCount / pageSize) || 1;

	return (
		<div className="space-y-4">
			{/* Unified Search, Refetch, View Switcher & Add Unit Toolbar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
				{/* Search Input */}
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<Input
						placeholder={t("products.searchProductsPlaceholder")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						className="pl-9 h-9 text-xs rounded-xl bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800"
					/>
				</div>

				{/* Toolbar Actions on Same Line */}
				<div className="flex items-center gap-2 flex-wrap">
					{/* Refetch Button */}
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => refetch()}
						disabled={isFetching}
						title={t("common.refresh")}
						className="h-9 px-3 rounded-xl gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
					>
						<RefreshCw
							className={cn(
								"h-3.5 w-3.5",
								isFetching && "animate-spin text-purple-600",
							)}
						/>
						<span>{t("common.refresh")}</span>
					</Button>

					{/* View Switcher */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<Button
							type="button"
							variant={viewMode === "grid" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("grid")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "grid" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutGrid className="h-3.5 w-3.5 mr-1" /> {t("common.grid")}
						</Button>
						<Button
							type="button"
							variant={viewMode === "table" ? "secondary" : "ghost"}
							size="sm"
							onClick={() => setViewMode("table")}
							className={cn(
								"h-7 px-2.5 text-xs font-bold rounded-lg transition-all",
								viewMode === "table" &&
									"bg-white dark:bg-slate-900 shadow-2xs text-purple-600 dark:text-purple-400",
							)}
						>
							<LayoutList className="h-3.5 w-3.5 mr-1" /> {t("common.table")}
						</Button>
					</div>

					{/* Modern Add Unit Button */}
					<Button
						onClick={openCreate}
						className="gap-1.5 text-xs font-bold h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs cursor-pointer"
					>
						<Plus className="h-4 w-4" />
						<span>{t("products.addUnit")}</span>
					</Button>
				</div>
			</div>

			{viewMode === "table" ? (
				<DataTable<Unit>
					data={unitsData?.items || []}
					columns={columns}
					getRowId={(u) => String(u.id)}
					title={t("sidebar.units")}
					hideSearch={true}
					onRefresh={() => refetch()}
					manualPagination={true}
					totalCount={totalCount}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					isLoading={isLoading}
					onEditRow={openEdit}
					onDeleteRow={(u) => deleteMutation.mutate(u.id)}
					exportFilename="units-of-measure"
				/>
			) : (
				<div className="space-y-4">
					{/* Cards Grid */}
					{isLoading ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse"
								/>
							))}
						</div>
					) : (unitsData?.items || []).length === 0 ? (
						<div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
							<Scale className="h-12 w-12 text-slate-300 mx-auto" />
							<h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
								{t("products.noUnitsFound")}
							</h4>
							<p className="text-xs text-slate-500">
								{t("products.createUnitDesc")}
							</p>
							<Button
								onClick={openCreate}
								className="gap-2 text-xs font-bold h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer"
							>
								<Plus className="h-3.5 w-3.5" />
								{t("products.addUnit")}
							</Button>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{(unitsData?.items || []).map((unit: Unit) => {
								const isUnitActive = unit.status
									? unit.status.toLowerCase() === "active"
									: (unit.isActive ?? true);

								return (
									<div
										key={unit.id}
										className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-3.5 shadow-2xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700/80 transition-all flex flex-col justify-between space-y-3"
									>
										<div className="space-y-3">
											{/* Default Unit Icon Box (Units do not have logoUrl) */}
											<div className="relative h-32 w-full rounded-xl bg-gradient-to-br from-purple-50 via-slate-50 to-indigo-50 dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 overflow-hidden border border-slate-100 dark:border-slate-800 flex items-center justify-center p-3">
												<div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform duration-300">
													<Scale className="size-8 text-purple-600 dark:text-purple-400" />
												</div>

												{/* Status Badge */}
												<div className="absolute top-2 right-2">
													<StatusBadgeCell
														status={isUnitActive ? "Active" : "Inactive"}
														type="account"
													/>
												</div>
											</div>

											{/* Unit Name & Symbol */}
											<div>
												<div className="flex items-center gap-2">
													<h4
														className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
														onClick={() => openEdit(unit)}
													>
														{unit.name}
													</h4>
													<Badge
														variant="outline"
														className="font-mono text-[10px] uppercase font-bold shrink-0"
													>
														{unit.symbol ||
															unit.name?.substring(0, 3).toUpperCase()}
													</Badge>
												</div>
												<p className="text-[11px] text-slate-400 font-mono mt-0.5">
													ID: #{unit.id}
												</p>
											</div>

											{/* Description */}
											{unit.description && (
												<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
													{unit.description}
												</p>
											)}
										</div>

										{/* Footer with Actions */}
										<div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
											<span
												className={cn(
													"text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
													isUnitActive
														? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
														: "text-slate-500 bg-slate-100 dark:bg-slate-800",
												)}
											>
												{isUnitActive ? "Active" : "Inactive"}
											</span>

											<div className="flex items-center gap-1">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => openEdit(unit)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-purple-600"
													title={t("common.edit")}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => deleteMutation.mutate(unit.id)}
													className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-rose-600"
													title={t("common.delete")}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}

					{/* Pagination */}
					{totalCount > pageSize && (
						<div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
							<div>
								Showing {(page - 1) * pageSize + 1} to{" "}
								{Math.min(page * pageSize, totalCount)} of {totalCount} items
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									className="h-8 px-3 text-xs"
								>
									Previous
								</Button>
								<span className="font-semibold px-2">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
									className="h-8 px-3 text-xs"
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			<ModernModal
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				title={editingUnit ? t("products.editUnit") : t("products.createUnit")}
				subtitle={editingUnit ? t("products.subtitle") : t("products.subtitle")}
				icon={<Scale className="h-5 w-5" />}
				size="md"
				isLoading={createMutation.isPending || updateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsDialogOpen(false)} />
						<ModernModalSubmitButton
							form="unit-form"
							isLoading={createMutation.isPending || updateMutation.isPending}
						>
							{t("common.save")}
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="unit-form"
					onSubmit={form.handleSubmit(onSubmit as any)}
					className="space-y-4"
				>
					<ModernInput
						label={t("products.unitName")}
						placeholder={t("products.unitNamePlaceholder")}
						{...form.register("name")}
						error={form.formState.errors.name?.message}
						required
					/>

					<ModernInput
						label={t("products.unitSymbol")}
						placeholder={t("products.unitSymbolPlaceholder")}
						{...form.register("symbol")}
					/>

					<ModernTextarea
						label={t("products.detailedDescription")}
						rows={3}
						placeholder={t("products.unitDescriptionPlaceholder")}
						{...form.register("description")}
					/>
				</form>
			</ModernModal>
		</div>
	);
}

function getProductBaseUnit(
	product: any,
	fallbackUnits?: any[],
): any | null {
	if (!product && (!fallbackUnits || fallbackUnits.length === 0)) return null;

	// 1. Check product.units
	if (Array.isArray(product?.units) && product.units.length > 0) {
		const baseUnit = product.units.find(
			(u: any) =>
				u.isBase ||
				u.is_base ||
				(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
		);
		if (baseUnit) return baseUnit;
	}

	// 2. Check fallbackUnits (e.g. productUnitsList / fetchedProductUnits)
	if (Array.isArray(fallbackUnits) && fallbackUnits.length > 0) {
		const baseUnit = fallbackUnits.find(
			(u: any) =>
				u.isBase ||
				u.is_base ||
				(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
		);
		if (baseUnit) return baseUnit;
	}

	// 3. Check product.productUnits or product.unitBreakdown
	const extraUnits =
		product?.productUnits || product?.unitBreakdown || product?.items;
	if (Array.isArray(extraUnits) && extraUnits.length > 0) {
		const baseUnit = extraUnits.find(
			(u: any) =>
				u.isBase ||
				u.is_base ||
				(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
		);
		if (baseUnit) return baseUnit;
	}

	// 4. Check first variant's units
	if (Array.isArray(product?.variants) && product.variants.length > 0) {
		const firstVar = product.variants[0];
		if (Array.isArray(firstVar?.units) && firstVar.units.length > 0) {
			const baseUnit = firstVar.units.find(
				(u: any) =>
					u.isBase ||
					u.is_base ||
					(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
			);
			if (baseUnit) return baseUnit;
		}
	}

	// 5. Fallback to index 0 of units if available
	if (Array.isArray(product?.units) && product.units.length > 0)
		return product.units[0];
	if (Array.isArray(fallbackUnits) && fallbackUnits.length > 0)
		return fallbackUnits[0];
	if (product?.unit) return product.unit;

	return null;
}

function getVariantBaseUnit(
	v: any,
	product?: any,
	fallbackUnits?: any[],
): any | null {
	if (v && Array.isArray(v.units) && v.units.length > 0) {
		const baseUnit = v.units.find(
			(u: any) =>
				u.isBase ||
				u.is_base ||
				(u.unitId && u.baseUnitId && u.unitId === u.baseUnitId),
		);
		if (baseUnit) return baseUnit;
		return v.units[0];
	}

	if (v && Array.isArray(v.unitPrices) && v.unitPrices.length > 0) {
		const baseUnit = v.unitPrices.find((up: any) => up.isBase || up.is_base);
		if (baseUnit) return baseUnit;
	}

	return getProductBaseUnit(product, fallbackUnits);
}

function getProductBasePrice(
	product: any,
	fallbackUnits?: any[],
): number {
	if (!product && (!fallbackUnits || fallbackUnits.length === 0)) return 0;

	const baseUnit = getProductBaseUnit(product, fallbackUnits);
	const firstVar =
		Array.isArray(product?.variants) && product.variants.length > 0
			? product.variants[0]
			: null;
	const firstVarBaseUnit = firstVar
		? getVariantBaseUnit(firstVar, product, fallbackUnits)
		: null;

	const baseUnitPrice =
		baseUnit?.finalPrice ??
		baseUnit?.unitPrice ??
		baseUnit?.sellPrice ??
		baseUnit?.price ??
		baseUnit?.basePrice;

	if (
		baseUnitPrice !== undefined &&
		baseUnitPrice !== null &&
		!isNaN(Number(baseUnitPrice)) &&
		Number(baseUnitPrice) > 0
	) {
		return Number(baseUnitPrice);
	}

	const firstVarBaseUnitPrice =
		firstVarBaseUnit?.finalPrice ??
		firstVarBaseUnit?.unitPrice ??
		firstVarBaseUnit?.sellPrice ??
		firstVarBaseUnit?.price ??
		firstVarBaseUnit?.basePrice;

	if (
		firstVarBaseUnitPrice !== undefined &&
		firstVarBaseUnitPrice !== null &&
		!isNaN(Number(firstVarBaseUnitPrice)) &&
		Number(firstVarBaseUnitPrice) > 0
	) {
		return Number(firstVarBaseUnitPrice);
	}

	const val =
		baseUnitPrice ??
		firstVarBaseUnitPrice ??
		product?.sellPrice ??
		product?.price ??
		firstVar?.sellPrice ??
		firstVar?.price ??
		product?.basePrice ??
		product?.cost ??
		0;

	return Number(val) || 0;
}

function getProductBaseCost(
	product: any,
	fallbackUnits?: any[],
): number {
	if (!product && (!fallbackUnits || fallbackUnits.length === 0)) return 0;

	const baseUnit = getProductBaseUnit(product, fallbackUnits);
	const firstVar =
		Array.isArray(product?.variants) && product.variants.length > 0
			? product.variants[0]
			: null;
	const firstVarBaseUnit = firstVar
		? getVariantBaseUnit(firstVar, product, fallbackUnits)
		: null;

	const baseUnitCost =
		baseUnit?.basePrice ??
		baseUnit?.cost ??
		baseUnit?.baseCost ??
		baseUnit?.unitCost;

	if (
		baseUnitCost !== undefined &&
		baseUnitCost !== null &&
		!isNaN(Number(baseUnitCost)) &&
		Number(baseUnitCost) > 0
	) {
		return Number(baseUnitCost);
	}

	const firstVarBaseUnitCost =
		firstVarBaseUnit?.basePrice ??
		firstVarBaseUnit?.cost ??
		firstVarBaseUnit?.baseCost ??
		firstVarBaseUnit?.unitCost;

	if (
		firstVarBaseUnitCost !== undefined &&
		firstVarBaseUnitCost !== null &&
		!isNaN(Number(firstVarBaseUnitCost)) &&
		Number(firstVarBaseUnitCost) > 0
	) {
		return Number(firstVarBaseUnitCost);
	}

	const val =
		baseUnitCost ??
		firstVarBaseUnitCost ??
		product?.basePrice ??
		product?.cost ??
		firstVar?.cost ??
		0;

	return Number(val) || 0;
}

function getVariantPrice(
	v: any,
	product?: any,
	fallbackUnits?: any[],
): number {
	if (!v) return getProductBasePrice(product, fallbackUnits);

	const variantBaseUnit = getVariantBaseUnit(v, product, fallbackUnits);
	const variantUnitPricesBase =
		Array.isArray(v.unitPrices) && v.unitPrices.length > 0
			? v.unitPrices.find((up: any) => up.isBase || up.is_base) ||
				v.unitPrices[0]
			: null;
	const productBaseUnit = getProductBaseUnit(product, fallbackUnits);

	const vBasePrice =
		variantBaseUnit?.finalPrice ??
		variantBaseUnit?.unitPrice ??
		variantBaseUnit?.sellPrice ??
		variantBaseUnit?.price ??
		variantBaseUnit?.basePrice ??
		variantUnitPricesBase?.finalPrice ??
		variantUnitPricesBase?.unitPrice ??
		variantUnitPricesBase?.price;

	if (
		vBasePrice !== undefined &&
		vBasePrice !== null &&
		!isNaN(Number(vBasePrice)) &&
		Number(vBasePrice) > 0
	) {
		return Number(vBasePrice);
	}

	const pBasePrice =
		productBaseUnit?.finalPrice ??
		productBaseUnit?.unitPrice ??
		productBaseUnit?.sellPrice ??
		productBaseUnit?.price ??
		productBaseUnit?.basePrice;

	if (
		pBasePrice !== undefined &&
		pBasePrice !== null &&
		!isNaN(Number(pBasePrice)) &&
		Number(pBasePrice) > 0
	) {
		return Number(pBasePrice);
	}

	const val =
		vBasePrice ??
		pBasePrice ??
		v.finalPrice ??
		v.sellPrice ??
		v.price ??
		v.unitPrice ??
		v.basePrice ??
		v.retailPrice ??
		product?.sellPrice ??
		product?.price ??
		product?.basePrice ??
		0;

	return Number(val) || 0;
}

function getVariantCost(
	v: any,
	product?: any,
	fallbackUnits?: any[],
): number {
	if (!v) return getProductBaseCost(product, fallbackUnits);

	const variantBaseUnit = getVariantBaseUnit(v, product, fallbackUnits);
	const productBaseUnit = getProductBaseUnit(product, fallbackUnits);

	const vBaseCost =
		variantBaseUnit?.basePrice ??
		variantBaseUnit?.cost ??
		variantBaseUnit?.baseCost ??
		variantBaseUnit?.unitCost;

	if (
		vBaseCost !== undefined &&
		vBaseCost !== null &&
		!isNaN(Number(vBaseCost)) &&
		Number(vBaseCost) > 0
	) {
		return Number(vBaseCost);
	}

	const pBaseCost =
		productBaseUnit?.basePrice ??
		productBaseUnit?.cost ??
		productBaseUnit?.baseCost ??
		productBaseUnit?.unitCost;

	if (
		pBaseCost !== undefined &&
		pBaseCost !== null &&
		!isNaN(Number(pBaseCost)) &&
		Number(pBaseCost) > 0
	) {
		return Number(pBaseCost);
	}

	const val =
		vBaseCost ??
		pBaseCost ??
		v.cost ??
		v.costPrice ??
		v.baseCost ??
		v.importCost ??
		v.unitCost ??
		v.basePrice ??
		product?.cost ??
		product?.basePrice ??
		0;

	return Number(val) || 0;
}

function getVariantStock(v: any, product?: any): number {
	if (!v) return Number(product?.stockQty || product?.inventory?.quantity || 0);

	const val =
		v.stockQty ??
		v.stockQuantity ??
		v.quantity ??
		v.stock ??
		v.qty ??
		v.availableQuantity ??
		v.availableStock ??
		v.totalStock ??
		v.inStock ??
		v.inventory?.availableQty ??
		v.inventory?.availableQuantity ??
		v.inventory?.quantity ??
		v.inventory?.stockQty ??
		v.inventory?.stockQuantity ??
		v.inventory?.totalQty ??
		v.stocks?.[0]?.quantity ??
		v.stocks?.[0]?.availableQuantity ??
		product?.stockQty ??
		product?.inventory?.availableQty ??
		product?.inventory?.quantity ??
		0;

	return Number(val) || 0;
}

function renderVariantAttributes(v: any) {
	if (!v) return <span className="text-slate-400">—</span>;

	if (
		v.attributes &&
		typeof v.attributes === "object" &&
		!Array.isArray(v.attributes) &&
		Object.keys(v.attributes).length > 0
	) {
		return (
			<div className="flex flex-wrap gap-1">
				{Object.entries(v.attributes).map(([k, val]) => (
					<Badge key={k} variant="outline" className="text-[9px] font-semibold">
						{k}: {String(val)}
					</Badge>
				))}
			</div>
		);
	}

	if (Array.isArray(v.attributeValues) && v.attributeValues.length > 0) {
		return (
			<div className="flex flex-wrap gap-1">
				{v.attributeValues.map((av: any, idx: number) => {
					const name =
						av.attributeName || av.name || av.key || `Attr ${idx + 1}`;
					const val = av.value || av.val || av.displayValue;
					return (
						<Badge
							key={idx}
							variant="outline"
							className="text-[9px] font-semibold"
						>
							{name}: {String(val)}
						</Badge>
					);
				})}
			</div>
		);
	}

	if (v.variantAttributes && typeof v.variantAttributes === "object") {
		const entries = Array.isArray(v.variantAttributes)
			? v.variantAttributes.map((item: any) => [
					item.name || item.key,
					item.value,
				])
			: Object.entries(v.variantAttributes);

		if (entries.length > 0) {
			return (
				<div className="flex flex-wrap gap-1">
					{entries.map(([k, val]: any, idx: number) => (
						<Badge
							key={idx}
							variant="outline"
							className="text-[9px] font-semibold"
						>
							{k}: {String(val)}
						</Badge>
					))}
				</div>
			);
		}
	}

	if (Array.isArray(v.attributes) && v.attributes.length > 0) {
		return (
			<div className="flex flex-wrap gap-1">
				{v.attributes.map((item: any, idx: number) => (
					<Badge
						key={idx}
						variant="outline"
						className="text-[9px] font-semibold"
					>
						{item.name || item.key || `Option ${idx + 1}`}:{" "}
						{String(item.value || item.val)}
					</Badge>
				))}
			</div>
		);
	}

	return <span className="text-slate-400">—</span>;
}

function ProductVariantsAccordionSubRow({
	product,
	categoryMap,
	brandMap,
}: {
	product: any;
	categoryMap: Map<string, string>;
	brandMap: Map<string, string>;
}) {
	const variants = product.variants || [];
	const units = product.units || [];

	return (
		<div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-inner text-xs">
			<div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
					<span className="font-bold text-slate-800 dark:text-slate-200">
						{product.name} —{" "}
						{variants.length > 0
							? `${variants.length} Variants List`
							: "Single Variant Product Details"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-[10px] font-mono">
						ID: #{product.id}
					</Badge>
					{product.baseSku && (
						<Badge variant="secondary" className="text-[10px] font-mono">
							Base SKU: {product.baseSku}
						</Badge>
					)}
				</div>
			</div>

			{variants.length > 0 ? (
				<div className="overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-800 min-w-0 max-w-full">
					<table className="w-full text-left text-xs min-w-[700px]">
						<thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b">
							<tr>
								<th className="p-2.5">Variant Name</th>
								<th className="p-2.5">SKU Code</th>
								<th className="p-2.5">Barcode</th>
								<th className="p-2.5">Retail Price</th>
								<th className="p-2.5">Cost</th>
								<th className="p-2.5">Stock Qty</th>
								<th className="p-2.5">Attributes</th>
								<th className="p-2.5">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
							{variants.map((v: any) => {
								const price = getVariantPrice(v, product);
								const cost = getVariantCost(v, product);
								const stockQty = getVariantStock(v, product);
								const varBaseUnit = getVariantBaseUnit(v, product);
								const varUnitLabel =
									v.unitName ||
									varBaseUnit?.unitName ||
									varBaseUnit?.name ||
									"";

								return (
									<tr
										key={v.id || v.sku || Math.random()}
										className="hover:bg-slate-50 dark:hover:bg-slate-900/40"
									>
										<td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
											<img
												src={safeImageUrl(
													v.thumbnail || v.imageUrl || product.imageUrl,
												)}
												className="h-6 w-6 rounded object-cover border"
												onError={(e) => {
													e.currentTarget.onerror = null;
													e.currentTarget.src = DEFAULT_IMAGE_URL;
												}}
											/>
											<span>{v.name || v.sku}</span>
										</td>
										<td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
											{v.sku || "—"}
										</td>
										<td className="p-2.5 font-mono text-slate-500">
											{v.barcode || "—"}
										</td>
										<td className="p-2.5 font-extrabold text-emerald-600 dark:text-emerald-400">
											${price.toFixed(2)}
											{varUnitLabel && (
												<span className="text-[10px] text-slate-400 font-normal block">
													/ {varUnitLabel}
												</span>
											)}
										</td>
										<td className="p-2.5 text-slate-500">${cost.toFixed(2)}</td>
										<td className="p-2.5 font-bold">
											<Badge
												variant={stockQty > 0 ? "secondary" : "destructive"}
												className="text-[10px]"
											>
												{stockQty} in stock
											</Badge>
										</td>
										<td className="p-2.5">{renderVariantAttributes(v)}</td>
										<td className="p-2.5">
											<Badge
												variant={v.isActive !== false ? "default" : "outline"}
												className="text-[10px]"
											>
												{v.isActive !== false ? "Active" : "Inactive"}
											</Badge>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
					<div>
						<span className="text-slate-400 text-[10px] block font-medium">
							Base Barcode
						</span>
						<span className="font-mono font-bold text-slate-700 dark:text-slate-300">
							{product.baseBarcode || "—"}
						</span>
					</div>
					<div>
						<span className="text-slate-400 text-[10px] block font-medium">
							Low Stock Threshold
						</span>
						<span className="font-bold text-slate-700 dark:text-slate-300">
							{product.lowStockThreshold || 5} units
						</span>
					</div>
					<div>
						<span className="text-slate-400 text-[10px] block font-medium">
							Mapped Unit Conversions
						</span>
						<span className="font-bold text-purple-600 dark:text-purple-400">
							{units.length} unit(s)
						</span>
					</div>
					<div>
						<span className="text-slate-400 text-[10px] block font-medium">
							Discount Term
						</span>
						<span className="font-medium text-slate-700 dark:text-slate-300">
							{product.discountNote || "Standard"}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}

function VariantUnitsAccordionSubRow({ variant }: { variant: any }) {
	const {
		data: units = [],
		isLoading,
		isError,
		refetch,
	} = useQuery<VariantUnit[]>({
		queryKey: ["variant-units", variant?.id],
		queryFn: () => productsApi.getVariantUnits(variant.id),
		enabled: Boolean(variant?.id),
		staleTime: 60 * 1000,
	});

	return (
		<div className="p-3.5 bg-slate-50/90 dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-inner text-xs">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800 pb-2.5">
				<div className="flex items-center gap-2.5">
					<div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
						<Layers className="h-3.5 w-3.5" />
					</div>
					<div>
						<span className="font-bold text-slate-900 dark:text-white">
							{variant?.name || variant?.sku || `Variant #${variant?.id}`} —
							Unit Prices & Tier Matrix
						</span>
						<span className="text-[10px] text-slate-400 block font-mono">
							Variant ID: #{variant?.id} • SKU: {variant?.sku || "—"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className="text-[10px] font-bold border-primary/30 bg-primary/10 text-primary"
					>
						{units.length} Unit Tier(s)
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => refetch()}
						className="h-7 px-2 text-[11px] rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
						title="Reload Variant Unit Prices"
					>
						<RotateCcw className="h-3 w-3 mr-1" /> Reload
					</Button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-6 gap-2 text-slate-400">
					<Loader2 className="h-4 w-4 animate-spin text-primary" />
					<span>Loading variant unit prices...</span>
				</div>
			) : isError ? (
				<div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-between">
					<span>Failed to retrieve unit prices for this variant.</span>
					<Button
						size="sm"
						variant="outline"
						onClick={() => refetch()}
						className="h-7 text-xs"
					>
						Retry
					</Button>
				</div>
			) : units.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xs">
					<table className="w-full text-left text-xs min-w-[620px]">
						<thead className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
							<tr>
								<th className="p-2.5">Unit Tier Name</th>
								<th className="p-2.5">Classification</th>
								<th className="p-2.5">Conversion Multiplier</th>
								<th className="p-2.5">Base Price</th>
								<th className="p-2.5">Discount Rate</th>
								<th className="p-2.5">Final Selling Price</th>
								<th className="p-2.5">Hierarchy Context</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
							{units.map((u, idx) => {
								const isBase = u.isBase || u.unitId === u.baseUnitId;
								const discount = u.discountPercentage || 0;
								return (
									<tr
										key={u.unitId || idx}
										className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
									>
										<td className="p-2.5">
											<div className="flex items-center gap-2">
												<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-[10px]">
													{u.symbol || u.unitName?.[0] || "U"}
												</div>
												<span className="font-bold text-slate-900 dark:text-white">
													{u.unitName}
												</span>
												{u.symbol && (
													<span className="text-[10px] text-slate-400 font-mono">
														({u.symbol})
													</span>
												)}
											</div>
										</td>
										<td className="p-2.5">
											<Badge
												variant={isBase ? "default" : "secondary"}
												className={
													isBase
														? "text-[10px] bg-primary text-primary-foreground font-bold"
														: "text-[10px] font-medium"
												}
											>
												{isBase ? "Base Unit" : "Secondary Unit"}
											</Badge>
										</td>
										<td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
											{u.baseQuantity ? (
												<span>
													<strong>{u.baseQuantity}x</strong>{" "}
													{u.baseUnitName || "Base"}
												</span>
											) : (
												"1x (Base)"
											)}
										</td>
										<td className="p-2.5 font-semibold text-slate-600 dark:text-slate-400">
											${Number(u.basePrice ?? 0).toFixed(2)}
										</td>
										<td className="p-2.5">
											{discount > 0 || u.discountNote ? (
												<Badge
													variant="outline"
													className="text-[10px] text-amber-700 dark:text-amber-300 border-amber-300 bg-amber-50 dark:bg-amber-950/40 font-bold"
												>
													{u.discountNote || `${discount}%`}
												</Badge>
											) : (
												<span className="text-slate-400 text-[11px]">—</span>
											)}
										</td>
										<td className="p-2.5">
											<span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
												${Number(u.finalPrice ?? u.basePrice ?? 0).toFixed(2)}
											</span>
										</td>
										<td className="p-2.5 text-[11px] text-slate-500">
											{u.parentUnitName ? (
												<span>
													Parent: <strong>{u.parentQuantity}x</strong>{" "}
													{u.parentUnitName}
												</span>
											) : (
												<span className="text-slate-400">Primary Anchor</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<div className="p-4 text-center rounded-xl bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
					<p className="text-xs">
						No specific unit tiers configured for this variant.
					</p>
				</div>
			)}
		</div>
	);
}

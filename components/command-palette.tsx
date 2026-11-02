"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
	Search,
	CreditCard,
	UserPlus,
	PackagePlus,
	ArrowRight,
	Sparkles,
	X,
	LayoutDashboard,
	ShoppingCart,
	FileText,
	Package,
	Warehouse,
	Truck,
	SlidersHorizontal,
	ArrowLeftRight,
	Contact,
	MapPin,
	Building2,
	Building,
	Users,
	ShieldCheck,
	KeyRound,
	Clock,
	User,
	ShieldAlert,
	SunMoon,
	Palette,
	History,
	CornerDownLeft,
	CornerDownRight,
	MessageSquare,
	Star,
	Plus,
	Filter,
	TrendingUp,
	BarChart3,
} from "lucide-react";

import {
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
} from "@/components/ui/command";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { useCustomTheme } from "@/components/custom-theme-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { isUserSystemAdmin } from "@/components/providers/company-context";
import { useTranslation } from "@/lib/i18n/context";

interface CommandActionItem {
	id: string;
	title: string;
	rawTitle: string;
	description: string;
	badge: string;
	badgeType?: "page" | "modal" | "filter" | "action" | "pos" | string;
	keywords: string;
	icon: React.ComponentType<{ className?: string }>;
	color: string;
	shortcut?: string;
	url?: string;
	perform?: () => void;
	adminOnly?: boolean;
	isCommonlyUsed?: boolean;
	isSubItem?: boolean;
	parentId?: string;
	parentTitle?: string;
}

const RECENT_COMMANDS_KEY = "crm_recent_commands_v4";

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Enhanced Relevance Scorer
 * Strictly orders results:
 * Tier 1 (7,000 - 10,000): Main Title match (Exact > StartsWith > WordBoundary > Substring)
 * Tier 2 (3,000 - 5,000):  Description match (StartsWith > WordBoundary > Substring)
 * Tier 3 (1,000 - 2,500):  Badge / Keywords match
 * 0: Excluded (No match)
 */
function scoreItem(item: CommandActionItem, rawQuery: string): number {
	const q = rawQuery.trim().toLowerCase();
	if (!q) return 0;

	const title = item.title.toLowerCase();
	const rawTitle = (item.rawTitle || "").toLowerCase();
	const desc = item.description.toLowerCase();
	const keywords = item.keywords.toLowerCase();
	const badge = (item.badge || "").toLowerCase();

	const wordBoundaryRegex = new RegExp(`(^|\\s|[-_/])${escapeRegex(q)}`);

	// =========================================================================
	// TIER 1: MAIN TITLE MATCH (Highest Priority)
	// =========================================================================
	if (title === q || rawTitle === q) {
		return 10000;
	}
	if (title.startsWith(q) || rawTitle.startsWith(q)) {
		return 9000;
	}
	if (wordBoundaryRegex.test(title) || wordBoundaryRegex.test(rawTitle)) {
		return 8000;
	}
	if (title.includes(q) || rawTitle.includes(q)) {
		return 7000;
	}

	// =========================================================================
	// TIER 2: DESCRIPTION MATCH (Second Priority)
	// =========================================================================
	if (desc.startsWith(q)) {
		return 5000;
	}
	if (wordBoundaryRegex.test(desc)) {
		return 4000;
	}
	if (desc.includes(q)) {
		return 3000;
	}

	// =========================================================================
	// TIER 3: BADGE & KEYWORDS MATCH (Third Priority)
	// =========================================================================
	if (badge === q) {
		return 2500;
	}
	if (badge.startsWith(q) || wordBoundaryRegex.test(badge)) {
		return 2200;
	}
	if (wordBoundaryRegex.test(keywords)) {
		return 1500;
	}
	if (keywords.includes(q)) {
		return 1000;
	}

	// =========================================================================
	// MULTI-WORD QUERY MATCHING (e.g. "create product", "new order", "filter customer")
	// =========================================================================
	const words = q.split(/\s+/).filter(Boolean);
	if (words.length > 1) {
		const allInTitle = words.every((w) => title.includes(w) || rawTitle.includes(w));
		if (allInTitle) return 6500;

		const allInTitleOrDesc = words.every(
			(w) => title.includes(w) || rawTitle.includes(w) || desc.includes(w),
		);
		if (allInTitleOrDesc) return 2800;

		const allInItem = words.every(
			(w) =>
				title.includes(w) ||
				rawTitle.includes(w) ||
				desc.includes(w) ||
				keywords.includes(w) ||
				badge.includes(w),
		);
		if (allInItem) return 800;
	}

	return 0; // Excluded: no match
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
	const trimmed = query.trim();
	if (!trimmed) return <>{text}</>;

	const safeRegex = new RegExp(`(${escapeRegex(trimmed)})`, "gi");
	const parts = text.split(safeRegex);

	if (parts.length === 1) return <>{text}</>;

	return (
		<>
			{parts.map((part, index) =>
				part.toLowerCase() === trimmed.toLowerCase() ? (
					<mark
						key={index}
						className="bg-primary/20 text-primary font-bold rounded-xs px-0.5 no-underline"
					>
						{part}
					</mark>
				) : (
					<React.Fragment key={index}>{part}</React.Fragment>
				),
			)}
		</>
	);
}

function getBadgeStyle(type?: string): string {
	switch (type?.toLowerCase()) {
		case "modal":
			return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25";
		case "filter":
			return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25";
		case "1-click":
			return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25";
		case "pos":
			return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25";
		case "theme":
			return "bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/25";
		case "profit":
			return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25";
		case "charts":
			return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25";
		case "leaderboard":
			return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25";
		default:
			return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
	}
}

export function CommandPalette() {
	const {
		isCommandPaletteOpen,
		setCommandPaletteOpen,
		openQuickPay,
		openAddCustomer,
		openAddProduct,
	} = useQuickActions();

	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { setIsCustomizerOpen } = useCustomTheme();
	const { t } = useTranslation();
	const { userProfile } = usePermissions();

	const isSystemAdmin = isUserSystemAdmin(userProfile);

	const [search, setSearch] = useState("");
	const [recentIds, setRecentIds] = useState<string[]>([]);

	// Load recent commands from localStorage on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem(RECENT_COMMANDS_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) {
					setRecentIds(parsed);
				}
			}
		} catch {
			// Ignore localStorage errors
		}
	}, []);

	// Save recent item
	const trackRecentCommand = useCallback((id: string) => {
		setRecentIds((prev) => {
			const next = [id, ...prev.filter((item) => item !== id)].slice(0, 5);
			try {
				localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
			} catch {
				// Ignore
			}
			return next;
		});
	}, []);

	// Clear recent item history
	const clearRecentCommands = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setRecentIds([]);
		try {
			localStorage.removeItem(RECENT_COMMANDS_KEY);
		} catch {
			// Ignore
		}
	}, []);

	// Reset search state when modal closes
	useEffect(() => {
		if (!isCommandPaletteOpen) {
			setSearch("");
		}
	}, [isCommandPaletteOpen]);

	// Global "/" shortcut to open search when not typing in an input
	useEffect(() => {
		const handleGlobalSlash = (e: KeyboardEvent) => {
			if (e.key === "/" && !isCommandPaletteOpen) {
				const target = e.target as HTMLElement;
				const isInput =
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable;
				if (!isInput) {
					e.preventDefault();
					setCommandPaletteOpen(true);
				}
			}
		};
		window.addEventListener("keydown", handleGlobalSlash);
		return () => window.removeEventListener("keydown", handleGlobalSlash);
	}, [isCommandPaletteOpen, setCommandPaletteOpen]);

	// =========================================================================
	// COMPLETE CRM ACTIONS & SUB-SHORTCUT DIRECTORY
	// Includes parent features and sub-actions (modals, filters, 1-click tools)
	// =========================================================================
	const allItems: CommandActionItem[] = useMemo(() => {
		return [
			// ==========================================
			// 1. DASHBOARD & FINANCIAL ANALYTICS
			// ==========================================
			{
				id: "nav-dashboard",
				title: t("sidebar.dashboard", "Dashboard"),
				rawTitle: "Dashboard",
				description:
					"Executive overview of revenue, gross profit, sales analytics, and business KPIs",
				badge: "Home",
				badgeType: "page",
				shortcut: "D",
				icon: LayoutDashboard,
				color: "text-primary bg-primary/10 border-primary/20",
				keywords:
					"dashboard home overview profit gross profit net profit revenue net revenue gross sales income earnings profit margin financial kpi metrics sales cashflow stats analytics trends top products best sellers performance reports executive business summary",
				url: "/",
				isCommonlyUsed: true,
			},
			{
				id: "sub-dashboard-revenue-profit",
				title: "Revenue & Gross Profit",
				rawTitle: "Revenue & Gross Profit",
				description:
					"Financial performance summaries, gross profit, net revenue, and margin metrics",
				badge: "Profit",
				badgeType: "profit",
				icon: TrendingUp,
				color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
				parentId: "nav-dashboard",
				parentTitle: "Dashboard",
				isSubItem: true,
				keywords:
					"revenue gross profit net revenue profit margin income earnings financial kpi metrics gross sales cashflow financial overview",
				url: "/",
			},
			{
				id: "sub-dashboard-analytics",
				title: "Sales Analytics & Trends",
				rawTitle: "Sales Analytics & Trends",
				description:
					"Time-series analytics charts, revenue growth tracking, and sales performance",
				badge: "Charts",
				badgeType: "charts",
				icon: BarChart3,
				color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
				parentId: "nav-dashboard",
				parentTitle: "Dashboard",
				isSubItem: true,
				keywords:
					"sales analytics trends time series charts volume performance growth tracking statistics report graphs",
				url: "/",
			},
			{
				id: "sub-dashboard-top-products",
				title: "Top Selling Products",
				rawTitle: "Top Selling Products",
				description:
					"Leaderboard ranking of top products by revenue generated and units sold",
				badge: "Leaderboard",
				badgeType: "leaderboard",
				icon: Sparkles,
				color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
				parentId: "nav-dashboard",
				parentTitle: "Dashboard",
				isSubItem: true,
				keywords:
					"top selling products best sellers revenue rank units quantity top items popular ranking products report",
				url: "/",
			},

			// ==========================================
			// 2. ORDERS DOMAIN & SUB-SHORTCUTS
			// ==========================================
			{
				id: "nav-orders",
				title: t("sidebar.order", "Order"),
				rawTitle: "Order",
				description:
					"Customer sales orders, POS checkout, order fulfillment, and transaction history",
				badge: "Sales",
				badgeType: "page",
				shortcut: "O",
				icon: ShoppingCart,
				color: "text-blue-600 bg-blue-600/10 border-blue-600/20",
				keywords:
					"order orders sales pos checkout customer purchases items shopping cart fulfillment quotation draft transactions booking sales log order tracking deals",
				url: "/orders",
				isCommonlyUsed: true,
			},
			{
				id: "sub-order-create",
				title: "Create Order",
				rawTitle: "Create Order",
				description:
					"Open modal dialog to create a new customer sales order or installment quotation",
				badge: "Modal",
				badgeType: "modal",
				icon: Plus,
				color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
				parentId: "nav-orders",
				parentTitle: "Order",
				isSubItem: true,
				keywords:
					"create order new order add order sales quotation draft customer purchase order modal shortcut form deal booking new sale",
				perform: () => {
					if (typeof window !== "undefined" && window.location.pathname === "/orders") {
						window.dispatchEvent(new CustomEvent("crm:open-create-order"));
					} else {
						router.push("/orders?action=create");
					}
				},
				isCommonlyUsed: true,
			},
			{
				id: "sub-order-pos",
				title: "POS Order Studio",
				rawTitle: "POS Order Studio",
				description:
					"Open Point-of-Sale studio for fast barcode scanning, cart building, and cashier checkout",
				badge: "POS",
				badgeType: "pos",
				icon: ShoppingCart,
				color: "text-blue-600 bg-blue-600/10 border-blue-600/20",
				parentId: "nav-orders",
				parentTitle: "Order",
				isSubItem: true,
				keywords:
					"pos order studio point of sale quick checkout cart barcode scanner orders cashier retail register quick sale pos modal shortcut",
				perform: () => {
					if (typeof window !== "undefined" && window.location.pathname === "/orders") {
						window.dispatchEvent(new CustomEvent("crm:open-pos-order"));
					} else {
						router.push("/orders?action=pos");
					}
				},
			},
			{
				id: "sub-order-filter",
				title: "Filter Orders",
				rawTitle: "Filter Orders",
				description:
					"Filter sales orders by stage: Draft, Submitted, Approved, or Invoiced",
				badge: "Filter",
				badgeType: "filter",
				icon: Filter,
				color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
				parentId: "nav-orders",
				parentTitle: "Order",
				isSubItem: true,
				keywords: "filter orders status draft submitted approved invoiced stage sales pipeline status search filter shortcut",
				url: "/orders",
			},

			// ==========================================
			// 3. PRODUCT & INVENTORY DOMAIN & SUB-SHORTCUTS
			// ==========================================
			{
				id: "nav-products",
				title: t("sidebar.allProducts", "All Products"),
				rawTitle: "All Products",
				description:
					"Complete product catalog, asset models, serial numbers, price histories, and variants",
				badge: "Catalog",
				badgeType: "page",
				shortcut: "P",
				icon: Package,
				color: "text-amber-600 bg-amber-600/10 border-amber-600/20",
				keywords: "all products product products catalog inventory items goods models pricing assets catalog sku barcode units variants cost sell price price list warehouse stock commodities merchandise",
				url: "/products",
				isCommonlyUsed: true,
			},
			{
				id: "sub-product-create",
				title: "Create Product",
				rawTitle: "Create Product",
				description:
					"Open modal dialog to register and configure a new inventory product or asset item",
				badge: "Modal",
				badgeType: "modal",
				shortcut: "N",
				icon: PackagePlus,
				color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
				parentId: "nav-products",
				parentTitle: "Product",
				isSubItem: true,
				keywords:
					"create product new product add product asset item inventory sku price goods modal shortcut product form register item new asset",
				perform: () => {
					openAddProduct();
					if (typeof window !== "undefined" && window.location.pathname === "/products") {
						window.dispatchEvent(new CustomEvent("crm:open-create-product"));
					} else {
						router.push("/products?action=create");
					}
				},
				isCommonlyUsed: true,
			},
			{
				id: "sub-product-filter",
				title: "Filter Products",
				rawTitle: "Filter Products",
				description:
					"Open filter controls to filter product catalog by category, brand, and stock status",
				badge: "Filter",
				badgeType: "filter",
				icon: SlidersHorizontal,
				color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
				parentId: "nav-products",
				parentTitle: "Product",
				isSubItem: true,
				keywords:
					"filter products category brand stock price status catalog criteria dynamic filter modal shortcut search filter find items",
				perform: () => {
					if (typeof window !== "undefined" && window.location.pathname === "/products") {
						window.dispatchEvent(new CustomEvent("crm:open-filter-product"));
					} else {
						router.push("/products?action=filter");
					}
				},
			},
			{
				id: "sub-product-stock",
				title: "Product Stock",
				rawTitle: "Product Stock",
				description:
					"Real-time warehouse stock balances, SKU inventory quantities, and low stock alerts",
				badge: "Inventory",
				badgeType: "page",
				shortcut: "S",
				icon: Warehouse,
				color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
				parentId: "nav-products",
				parentTitle: "Product",
				isSubItem: true,
				keywords:
					"product stock warehouse balance inventory quantity counts sku low stock items out of stock stocktake on hand stock levels physical inventory",
				url: "/inventory/stock",
			},
			{
				id: "sub-product-imports",
				title: "Product Imports",
				rawTitle: "Product Imports",
				description:
					"Supplier incoming goods receipts, inventory shipment intake, and GRN verification",
				badge: "Imports",
				badgeType: "page",
				icon: Truck,
				color: "text-cyan-600 bg-cyan-600/10 border-cyan-600/20",
				parentId: "nav-products",
				parentTitle: "Product",
				isSubItem: true,
				keywords:
					"product imports incoming goods shipments grn intake supplier receipts verification inventory restock receiving freight delivery goods in",
				url: "/inventory/imports",
			},

			// ==========================================
			// 4. INVOICES DOMAIN & SUB-SHORTCUTS
			// ==========================================
			{
				id: "nav-invoices",
				title: t("sidebar.invoice", "Invoice"),
				rawTitle: "Invoice",
				description:
					"Sales billing statements, customer invoices, payment due dates, and refunds",
				badge: "Billing",
				badgeType: "page",
				shortcut: "I",
				icon: FileText,
				color: "text-sky-600 bg-sky-600/10 border-sky-600/20",
				keywords:
					"invoice invoices sales billing bill bills statements dues payments collections finance accounts receivable unpaid overdue partial payment due date tax receipt refund credit note statement debt",
				url: "/invoices",
				isCommonlyUsed: true,
			},
			{
				id: "sub-invoice-pay",
				title: "Pay Invoice / KHQR",
				rawTitle: "Pay Invoice / KHQR",
				description:
					"Open 1-click modal to generate KHQR code or record installment settlement on an invoice",
				badge: "1-Click",
				badgeType: "modal",
				shortcut: "K",
				icon: CreditCard,
				color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
				parentId: "nav-invoices",
				parentTitle: "Invoice",
				isSubItem: true,
				keywords:
					"pay invoice collect payment khqr aba settlement billing statement dues modal shortcut instant checkout qr code scan to pay installment collection",
				perform: () => {
					openQuickPay();
				},
				isCommonlyUsed: true,
			},
			{
				id: "sub-invoice-multi",
				title: "Multi-Invoice Settlement",
				rawTitle: "Multi-Invoice Settlement",
				description:
					"Open modal to batch reconcile and settle multiple customer invoices at once",
				badge: "Modal",
				badgeType: "modal",
				icon: FileText,
				color: "text-sky-600 bg-sky-600/10 border-sky-600/20",
				parentId: "nav-invoices",
				parentTitle: "Invoice",
				isSubItem: true,
				keywords:
					"multi invoice settlement batch pay multiple invoices customer bulk payment modal shortcut consolidate invoices bulk settle balance",
				url: "/invoices",
			},
			{
				id: "sub-invoice-filter",
				title: "Filter Invoices",
				rawTitle: "Filter Invoices",
				description:
					"Filter billing statements by Overdue, Partially Paid, Paid, or Void status",
				badge: "Filter",
				badgeType: "filter",
				icon: Filter,
				color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
				parentId: "nav-invoices",
				parentTitle: "Invoice",
				isSubItem: true,
				keywords: "filter invoices overdue paid unpaid billing status finance shortcut filter by due date payment status",
				url: "/invoices",
			},

			// ==========================================
			// 5. PAYMENTS DOMAIN & SUB-SHORTCUTS
			// ==========================================
			{
				id: "nav-payments",
				title: t("sidebar.payments", "Payments"),
				rawTitle: "Payments",
				description:
					"Payment ledger records, settlement transactions, and bank reconciliations",
				badge: "Finance",
				badgeType: "page",
				icon: CreditCard,
				color: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
				keywords:
					"payments payment settlements ledger bank reconciliation transactions receipts history finance cash bank transfer aba bakong khqr installment deposit payout money collection paid accounts bookkeeping",
				url: "/payments",
				isCommonlyUsed: true,
			},
			{
				id: "sub-payment-collect",
				title: "Collect Payment / KHQR",
				rawTitle: "Collect Payment / KHQR",
				description:
					"Record customer installment settlement, issue receipt, or generate KHQR code",
				badge: "1-Click",
				badgeType: "modal",
				shortcut: "K",
				icon: CreditCard,
				color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
				parentId: "nav-payments",
				parentTitle: "Payments",
				isSubItem: true,
				keywords:
					"collect payment pay aba khqr settlement receipt transaction customer payment finance modal shortcut instant pay scan qr cash register installment",
				perform: () => {
					openQuickPay();
				},
				isCommonlyUsed: true,
			},
			{
				id: "sub-payment-reconcile",
				title: "Bulk Bank Reconciliation",
				rawTitle: "Bulk Bank Reconciliation",
				description:
					"Open modal to reconcile bank transaction statements with payment receipts",
				badge: "Modal",
				badgeType: "modal",
				icon: SlidersHorizontal,
				color: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
				parentId: "nav-payments",
				parentTitle: "Payments",
				isSubItem: true,
				keywords:
					"bulk reconciliation bank match payments statement ledger audit finance modal shortcut bank statement import reconcile transactions accounts match",
				url: "/payments",
			},

			// ==========================================
			// 6. CUSTOMER DOMAIN & SUB-SHORTCUTS
			// ==========================================
			{
				id: "nav-customers",
				title: t("sidebar.customer", "Customer"),
				rawTitle: "Customer",
				description:
					"Customer CRM directory, borrower accounts, contact details, and locations",
				badge: "CRM",
				badgeType: "page",
				icon: Contact,
				color: "text-violet-600 bg-violet-600/10 border-violet-600/20",
				keywords:
					"customer customers clients directory accounts contacts phone profile crm borrowers members debtors address national id kyc loyalty leads individuals companies client management people",
				url: "/customers",
				isCommonlyUsed: true,
			},
			{
				id: "sub-customer-add",
				title: "Add New Customer",
				rawTitle: "Add New Customer",
				description:
					"Open modal dialog to register customer profile with national ID, phone number, and KYC contacts",
				badge: "1-Click",
				badgeType: "modal",
				shortcut: "C",
				icon: UserPlus,
				color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
				parentId: "nav-customers",
				parentTitle: "Customer",
				isSubItem: true,
				keywords:
					"add customer create client borrower register profile contact phone kyc crm modal shortcut new borrower new debtor add lead register member",
				perform: () => {
					openAddCustomer();
					if (typeof window !== "undefined" && window.location.pathname === "/customers") {
						window.dispatchEvent(new CustomEvent("crm:open-create-customer"));
					} else {
						router.push("/customers?action=create");
					}
				},
				isCommonlyUsed: true,
			},
			{
				id: "sub-customer-filter",
				title: "Filter Customers",
				rawTitle: "Filter Customers",
				description:
					"Filter customer directory by province, KYC verification status, and credit tier",
				badge: "Filter",
				badgeType: "filter",
				icon: Filter,
				color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
				parentId: "nav-customers",
				parentTitle: "Customer",
				isSubItem: true,
				keywords:
					"filter customers kyc status province credit score active loans directory crm shortcut location filter province city",
				url: "/customers",
			},

			// ==========================================
			// 7. COMPANY & LOGISTICS MANAGEMENT
			// ==========================================
			{
				id: "nav-departments",
				title: t("sidebar.department", "Department"),
				rawTitle: "Department",
				description:
					"Internal corporate departments, organization teams, branches, and operational structure",
				badge: "Org",
				badgeType: "page",
				icon: Building,
				color: "text-slate-600 bg-slate-600/10 border-slate-600/20",
				keywords:
					"department departments organization teams corporate structure hierarchy company divisions branches units employees staff offices internal management company org team members",
				url: "/departments",
			},
			{
				id: "nav-suppliers",
				title: t("sidebar.supplier", "Supplier"),
				rawTitle: "Supplier",
				description:
					"Procurement partner directory, vendor profiles, and supply chain contact info",
				badge: "Logistics",
				badgeType: "page",
				icon: Truck,
				color: "text-cyan-600 bg-cyan-600/10 border-cyan-600/20",
				keywords:
					"supplier suppliers vendors procurement contacts partners logistics company distributors manufacturers sourcing wholesale supply chain vendor directory contracts",
				url: "/suppliers",
			},
			{
				id: "nav-deliveries",
				title: t("sidebar.delivery", "Delivery"),
				rawTitle: "Delivery",
				description:
					"Fleet delivery dispatch, tracking shipment status, driver tasks, and delivery routes",
				badge: "Dispatch",
				badgeType: "page",
				icon: MapPin,
				color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
				keywords:
					"delivery deliveries dispatch fleet shipping driver route tracking tasks company logistics shipment transport courier dispatch tracking destination shipping orders vans trucks",
				url: "/deliveries",
			},
			{
				id: "nav-feedback",
				title: t("sidebar.feedback", "Feedback"),
				rawTitle: "Feedback",
				description:
					"Customer feedback questionnaires, survey templates, and client satisfaction ratings",
				badge: "Surveys",
				badgeType: "page",
				icon: MessageSquare,
				color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
				keywords:
					"feedback surveys reviews satisfaction customer questions csat metrics company ratings nps client comments survey forms feedback responses evaluation quality",
				url: "/feedback",
			},

			// ==========================================
			// 8. USER MANAGEMENT (Strictly user-related data)
			// ==========================================
			{
				id: "nav-users",
				title: t("sidebar.user", "User"),
				rawTitle: "User",
				description:
					"System user accounts, authentication states, email profiles, and access status",
				badge: "Accounts",
				badgeType: "page",
				icon: Users,
				color: "text-blue-600 bg-blue-600/10 border-blue-600/20",
				keywords:
					"user users accounts logins security profiles access status user management credentials authentication staff accounts operators email access members system users",
				url: "/users",
			},
			{
				id: "nav-roles",
				title: t("sidebar.role", "Role"),
				rawTitle: "Role",
				description:
					"Security roles, access matrix assignment, and group authorization policies (RBAC)",
				badge: "RBAC",
				badgeType: "page",
				icon: ShieldCheck,
				color: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
				keywords:
					"role roles rbac permissions access matrix privileges security user management access control authority groups role assignments policies security roles permissions matrix",
				url: "/roles",
			},
			{
				id: "nav-permissions",
				title: t("sidebar.permission", "Permission"),
				rawTitle: "Permission",
				description:
					"Granular system permissions catalog, feature privileges, and API action keys",
				badge: "RBAC",
				badgeType: "page",
				icon: KeyRound,
				color: "text-amber-600 bg-amber-600/10 border-amber-600/20",
				keywords:
					"permission permissions access capabilities authority keys tokens user management feature privileges api access rbac rules security rights permission keys access grants",
				url: "/permissions",
			},

			// ==========================================
			// 9. SYSTEM SETTINGS & THEME SHORTCUTS
			// ==========================================
			{
				id: "nav-configurations",
				title: t("sidebar.configurations", "Configurations"),
				rawTitle: "Configurations",
				description:
					"System-wide configuration parameters, IP security rules, and business options",
				badge: "Settings",
				badgeType: "page",
				icon: SlidersHorizontal,
				color: "text-indigo-600 bg-indigo-600/10 border-indigo-600/20",
				keywords:
					"configurations settings preferences parameters rules security ip discounts early payment system options config variables thresholds business rules global settings",
				url: "/configurations",
			},
			{
				id: "sub-action-toggle-theme",
				title: "Toggle Light / Dark Mode",
				rawTitle: "Toggle Light / Dark Mode",
				description:
					"Switch between light and dark theme mode across the CRM dashboard",
				badge: "Theme",
				badgeType: "theme",
				shortcut: "T",
				icon: SunMoon,
				color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
				parentId: "nav-configurations",
				parentTitle: "Configurations",
				isSubItem: true,
				keywords: "toggle theme mode dark light color appearance styling shortcut dark mode light mode theme switcher night mode brightness display",
				perform: () => {
					setTheme(theme === "light" ? "dark" : "light");
				},
			},
			{
				id: "sub-action-customize-theme",
				title: "Customize Theme Colors & Branding",
				rawTitle: "Customize Theme Colors & Branding",
				description:
					"Open theme customizer modal to adjust primary colors, font families, and border radius",
				badge: "Modal",
				badgeType: "modal",
				icon: Palette,
				color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
				parentId: "nav-configurations",
				parentTitle: "Configurations",
				isSubItem: true,
				keywords:
					"customize theme brand colors palette radius styling appearance customizer modal shortcut brand theme custom colors primary color styling",
				perform: () => {
					setIsCustomizerOpen(true);
				},
			},
			{
				id: "nav-payment-terms",
				title: t("sidebar.paymentTerms", "Payment Terms"),
				rawTitle: "Payment Terms",
				description:
					"Installment credit schedules, payment term policies, grace periods, and late fees",
				badge: "Policies",
				badgeType: "page",
				icon: Clock,
				color: "text-sky-600 bg-sky-600/10 border-sky-600/20",
				keywords:
					"payment terms installments credit policies schedules grace penalty settings finance installment plans loan duration late fee terms conditions billing cycles grace days interest penalty fee",
				url: "/payment-terms",
			},
			{
				id: "nav-subscriptions",
				title: t("sidebar.subscription", "Subscription"),
				rawTitle: "Subscription",
				description:
					"Company subscription plan tiers, billing status, feature quotas, and plan renewal",
				badge: "Billing",
				badgeType: "page",
				icon: CreditCard,
				color: "text-teal-600 bg-teal-600/10 border-teal-600/20",
				keywords:
					"subscription subscriptions plans tiers billing pricing features quotas settings monthly annual upgrade downgrade renew license tenant quota payment plan SaaS plan active plan",
				url: "/subscriptions",
			},
			{
				id: "nav-profile",
				title: t("header.myProfileAndAccount", "My Profile & Account"),
				rawTitle: "My Profile & Account",
				description:
					"Personal user profile details, account security, password update, and profile image",
				badge: "Account",
				badgeType: "page",
				icon: User,
				color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
				keywords: "profile account me password avatar credentials user settings my account change password security settings user profile personal details profile picture email update",
				url: "/profile",
			},

			// ==========================================
			// 10. ADMINISTRATOR ONLY
			// ==========================================
			{
				id: "nav-admin-user",
				title: t("sidebar.systemAdminUser", "System Admin User"),
				rawTitle: "System Admin User",
				description:
					"Platform super administrator user accounts, root credentials, and admin governance",
				badge: "Admin",
				badgeType: "page",
				icon: ShieldAlert,
				color: "text-rose-600 bg-rose-600/10 border-rose-600/20",
				keywords:
					"super admin platform administrators root security credentials system admin user governance root access multi-tenant admin platform management platform owners",
				url: "/super-admin/admins",
				adminOnly: true,
			},
			{
				id: "nav-company-management",
				title: t("sidebar.companyManagement", "Company Management"),
				rawTitle: "Company Management",
				description:
					"Multi-tenant company directory, tenant onboarding, company info, and organization status",
				badge: "Admin",
				badgeType: "page",
				icon: Building2,
				color: "text-amber-600 bg-amber-600/10 border-amber-600/20",
				keywords:
					"company management multi-tenant platform organizations onboarding companies admin tenants business entities corporate accounts registration tenant list clients",
				url: "/super-admin/companies",
				adminOnly: true,
			},
			{
				id: "nav-locations",
				title: t("sidebar.locations", "Locations"),
				rawTitle: "Locations",
				description:
					"Geographic locations master registry: countries, provinces, districts, and communes",
				badge: "Admin",
				badgeType: "page",
				icon: MapPin,
				color: "text-emerald-600 bg-emerald-600/10 border-emerald-600/20",
				keywords:
					"locations provinces districts communes geography postal codes country master data admin address lookup regions administrative areas khmer provinces cambodia locations",
				url: "/locations",
				adminOnly: true,
			},
			{
				id: "nav-data-migration",
				title: t("sidebar.dataMigration", "Data Migration"),
				rawTitle: "Data Migration",
				description:
					"Database schema migrations, system ETL pipelines, data import/export, and seeders",
				badge: "Admin",
				badgeType: "page",
				icon: ArrowLeftRight,
				color: "text-violet-600 bg-violet-600/10 border-violet-600/20",
				keywords:
					"data migration import export etl database seeders transfer schema admin backup restore data sync sql transfer database dump",
				url: "/super-admin/migrations",
				adminOnly: true,
			},
		];
	}, [
		t,
		router,
		openQuickPay,
		openAddCustomer,
		openAddProduct,
		theme,
		setTheme,
		setIsCustomizerOpen,
	]);

	// Authorized items based on permissions
	const authorizedItems = useMemo(() => {
		return allItems.filter((item) => !item.adminOnly || isSystemAdmin);
	}, [allItems, isSystemAdmin]);

	const isSearching = search.trim().length > 0;

	// Search results ranked strictly by Main Title -> Description -> Keywords
	const searchResults = useMemo(() => {
		if (!isSearching) return [];
		return authorizedItems
			.map((item) => ({ item, score: scoreItem(item, search) }))
			.filter((entry) => entry.score > 0)
			.sort((a, b) => {
				if (b.score !== a.score) {
					return b.score - a.score;
				}
				// If parent and sub-item both match equally, put parent first
				if (a.item.parentId === b.item.id) return 1;
				if (b.item.parentId === a.item.id) return -1;
				return a.item.title.length - b.item.title.length;
			})
			.map((entry) => entry.item);
	}, [authorizedItems, isSearching, search]);

	// Recent items list (shown on empty search)
	const recentItems = useMemo(() => {
		if (recentIds.length === 0 || isSearching) {
			return [];
		}
		return recentIds
			.map((id) => authorizedItems.find((it) => it.id === id))
			.filter(Boolean) as CommandActionItem[];
	}, [recentIds, isSearching, authorizedItems]);

	// Group core features with sub-shortcuts when search is empty
	const featureActions = useMemo(() => {
		return authorizedItems.filter(
			(item) =>
				item.isCommonlyUsed ||
				item.isSubItem ||
				[
					"nav-dashboard",
					"nav-orders",
					"nav-products",
					"nav-invoices",
					"nav-payments",
					"nav-customers",
					"nav-configurations",
				].includes(item.id),
		);
	}, [authorizedItems]);

	// Remaining features for empty search
	const otherFeatures = useMemo(() => {
		const coreIds = new Set(featureActions.map((f) => f.id));
		return authorizedItems.filter((item) => !coreIds.has(item.id));
	}, [authorizedItems, featureActions]);

	// Navigation Handler
	const handleNavigate = useCallback(
		(item: CommandActionItem) => {
			trackRecentCommand(item.id);
			setCommandPaletteOpen(false);

			if (item.perform) {
				item.perform();
			} else if (item.url) {
				router.push(item.url);
			}
		},
		[router, setCommandPaletteOpen, trackRecentCommand],
	);

	// Command item renderer supporting parent items and indented sub-action shortcuts
	const renderItem = (item: CommandActionItem, isSearchMatch: boolean) => {
		const Icon = item.icon;
		const isSub = Boolean(item.isSubItem);

		return (
			<CommandItem
				key={item.id}
				value={item.id}
				onSelect={() => handleNavigate(item)}
				onClick={() => handleNavigate(item)}
				className={`group/item flex items-center justify-between rounded-xl cursor-pointer select-none transition-all duration-150 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-800 my-0.5 ${
					isSub
						? "ml-4 sm:ml-6 pl-2.5 py-2.5 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/70 border-l-2 border-l-slate-300 dark:border-l-slate-700 hover:border-l-primary"
						: "px-3.5 py-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
				}`}
			>
				<div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 pr-3">
					{isSub && (
						<CornerDownRight className="size-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
					)}
					<div
						className={`flex ${isSub ? "size-8" : "size-9"} shrink-0 items-center justify-center rounded-xl border ${item.color} shadow-2xs`}
					>
						<Icon className={isSub ? "size-4" : "size-4.5"} />
					</div>
					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2">
							<span
								className={`font-semibold ${isSub ? "text-xs sm:text-sm font-medium" : "text-sm font-bold"} text-slate-900 dark:text-slate-100 truncate`}
							>
								{isSearchMatch ? (
									<HighlightMatch text={item.title} query={search} />
								) : (
									item.title
								)}
							</span>
							<span
								className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${getBadgeStyle(item.badgeType || item.badge)}`}
							>
								{item.badge}
							</span>
						</div>
						<span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
							{isSearchMatch ? (
								<HighlightMatch text={item.description} query={search} />
							) : (
								item.description
							)}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{item.shortcut && (
						<CommandShortcut className="hidden sm:inline-flex h-5 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
							{item.shortcut}
						</CommandShortcut>
					)}
					<ArrowRight
						className={`size-3.5 sm:size-4 text-slate-300 transition-transform duration-150 group-hover/item:translate-x-1 group-hover/item:text-primary dark:text-slate-600`}
					/>
				</div>
			</CommandItem>
		);
	};

	return (
		<CommandDialog
			open={isCommandPaletteOpen}
			onOpenChange={setCommandPaletteOpen}
			shouldFilter={false}
			title="CRM Global Search & Command Center"
			description="Search all CRM features, routes, and modal shortcuts"
			className="max-w-[96vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
		>
			{/* Top Header Search Input */}
			<div className="relative border-b border-slate-100 dark:border-slate-800/80">
				<CommandInput
					placeholder="Search CRM features... (e.g. Profit, Revenue, Orders, Products, ⌘K)"
					value={search}
					onValueChange={setSearch}
					className="h-12 text-sm sm:text-base font-medium"
				/>
				{search && (
					<button
						type="button"
						onClick={() => setSearch("")}
						className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
						title="Clear search"
					>
						<X className="size-4" />
					</button>
				)}
			</div>

			{/* Command List Body */}
			<CommandList className="max-h-[460px] overflow-y-auto px-2.5 py-2">
				{/* Empty state when searching and no results */}
				{isSearching && searchResults.length === 0 && (
					<CommandEmpty className="py-14 text-center">
						<div className="flex flex-col items-center justify-center gap-2.5">
							<div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
								<Search className="size-5" />
							</div>
							<p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
								No matching CRM features found for &ldquo;{search}&rdquo;
							</p>
							<p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm">
								Try searching for &ldquo;Profit&rdquo;, &ldquo;Revenue&rdquo;, &ldquo;Orders&rdquo;, &ldquo;User&rdquo;, or &ldquo;Products&rdquo;.
							</p>
						</div>
					</CommandEmpty>
				)}

				{/* ============================================================= */}
				{/* ACTIVE SEARCH: Flat Results Ordered by Main Title -> Desc     */}
				{/* ============================================================= */}
				{isSearching && searchResults.length > 0 && (
					<CommandGroup
						heading={
							<span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
								Matching Features ({searchResults.length})
							</span>
						}
					>
						{searchResults.map((item) => renderItem(item, true))}
					</CommandGroup>
				)}

				{/* ============================================================= */}
				{/* EMPTY SEARCH: Recent Searches, Core Features & Sub-Shortcuts  */}
				{/* ============================================================= */}
				{!isSearching && (
					<>
						{/* Recent Searches Section */}
						{recentItems.length > 0 && (
							<>
								<CommandGroup
									heading={
										<div className="flex items-center justify-between w-full pr-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
											<span className="flex items-center gap-1.5">
												<History className="size-3.5 text-slate-400" />
												<span>Recent Searches & Actions</span>
											</span>
											<button
												type="button"
												onClick={clearRecentCommands}
												className="text-[10px] lowercase font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
											>
												clear history
											</button>
										</div>
									}
								>
									{recentItems.map((item) => renderItem(item, false))}
								</CommandGroup>
								<CommandSeparator className="my-2" />
							</>
						)}

						{/* Core CRM Features & Modal Shortcuts */}
						<CommandGroup
							heading={
								<div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
									<Star className="size-3 text-amber-500 fill-amber-500 inline" />
									<span>CRM Features & Action Shortcuts</span>
								</div>
							}
						>
							{featureActions.map((item) => renderItem(item, false))}
						</CommandGroup>

						<CommandSeparator className="my-2" />

						{/* Management & Admin Features */}
						<CommandGroup
							heading={
								<span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
									All Features & Management
								</span>
							}
						>
							{otherFeatures.map((item) => renderItem(item, false))}
						</CommandGroup>
					</>
				)}
			</CommandList>

			{/* Clean Keyboard Navigation & Status Footer */}
			<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/90 px-4 py-3 text-[11px] font-medium text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-400 select-none">
				<div className="flex items-center gap-3">
					<span className="flex items-center gap-1">
						<kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
							↑↓
						</kbd>{" "}
						navigate
					</span>
					<span className="flex items-center gap-1">
						<kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
							<CornerDownLeft className="size-2.5 inline" />
						</kbd>{" "}
						select
					</span>
					<span className="flex items-center gap-1">
						<kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-md border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
							esc
						</kbd>{" "}
						close
					</span>
				</div>

				<div className="flex items-center gap-1.5 text-primary font-semibold">
					<Sparkles className="size-3.5 text-primary" />
					<span>CRM Global Command Center</span>
				</div>
			</div>
		</CommandDialog>
	);
}

"use client";

import * as React from "react";
import {
	Building2,
	Users,
	Briefcase,
	MapPin,
	ShieldAlert,
	LayoutDashboard,
	LogOut,
	Settings,
	Contact,
	Package,
	Landmark,
	Receipt,
	FileText,
	Clock,
	ChevronRight,
	Folder,
	ShieldCheck,
	KeyRound,
	Layers,
	Boxes,
	SlidersHorizontal,
	ShoppingCart,
	Tag,
	Ruler,
	Warehouse,
	ArrowLeftRight,
	Truck,
	MessageSquare,
	GitFork,
	Building,
	Activity,
	CreditCard,
	User as UserIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { profileApi, authApi, fileUrl } from "@/lib/api/endpoints";
import { clearAuthCookies } from "@/app/actions/auth";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isUserSystemAdmin } from "@/components/providers/company-context";
import { useTranslation } from "@/lib/i18n/context";
import { usePermissions } from "@/hooks/use-permissions";

function SidebarEmblemSvg() {
	return (
		<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/20 transition-colors">
			<svg
				className="size-5"
				viewBox="0 0 100 100"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="50" cy="50" r="46" stroke="#ffffff" strokeWidth="6" />
				<path
					d="M50 20 L70 32 V54 C70 66 50 78 50 78 C50 78 30 66 30 54 V32 Z"
					fill="#ffffff"
					opacity="0.95"
				/>
				<path
					d="M40 52 L47 58 L62 44"
					stroke="var(--primary, #2252E9)"
					strokeWidth="6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

interface SubMenuItem {
	title: string;
	url: string;
	icon: React.ComponentType<{ className?: string }>;
}

interface MenuItem {
	title: string;
	url?: string;
	icon: React.ComponentType<{ className?: string }>;
	subItems?: SubMenuItem[];
}

function SidebarCollapsibleGroup({
	item,
	pathname,
}: {
	item: MenuItem;
	pathname: string;
}) {
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const isChildActive = item.subItems?.some(
		(sub) => pathname === sub.url || pathname.startsWith(`${sub.url}/`),
	);
	const [isOpen, setIsOpen] = React.useState(Boolean(isChildActive));

	React.useEffect(() => {
		if (isChildActive) {
			setIsOpen(true);
		}
	}, [isChildActive]);

	// ==========================================
	// Collapsed Mode Rendering (Icon Rail)
	// ==========================================
	if (isCollapsed) {
		return (
			<SidebarMenuItem className="flex justify-center my-1.5">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								tooltip={item.title}
								isActive={isChildActive}
								className={`size-10 justify-center rounded-xl transition-all duration-200 ${
									isChildActive
										? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25"
										: "bg-slate-100/90 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-700"
								}`}
							/>
						}
					>
						<item.icon
							className={`size-5 ${isChildActive ? "text-primary-foreground" : "text-slate-600 dark:text-slate-400"}`}
						/>
					</DropdownMenuTrigger>

					{/* Floating Submenu Dropdown in Collapsed Mode */}
					<DropdownMenuContent
						side="right"
						align="start"
						sideOffset={12}
						className="w-52 rounded-2xl p-1.5 shadow-xl border border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 space-y-1"
					>
						<div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
							{item.title}
						</div>
						{item.subItems?.map((sub) => {
							const active =
								pathname === sub.url || pathname.startsWith(`${sub.url}/`);
							const SubIcon = sub.icon;
							return (
								<DropdownMenuItem
									key={sub.title}
									render={<Link href={sub.url} />}
									className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs cursor-pointer transition-all ${
										active
											? "border-l-[3px] border-primary bg-primary/10 text-primary font-bold shadow-sm shadow-primary/10"
											: "border-l-2 border-transparent bg-slate-100/80 text-slate-700 font-semibold dark:bg-slate-800/60 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
									}`}
								>
									<SubIcon
										className={`size-4 ${active ? "text-primary" : "text-slate-500 dark:text-slate-400"}`}
									/>
									<span>{sub.title}</span>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		);
	}

	// ==========================================
	// Expanded Mode Tree View Rendering
	// ==========================================
	return (
		<Collapsible
			open={isOpen}
			onOpenChange={setIsOpen}
			className="group/collapsible my-1.5"
		>
			<SidebarMenuItem>
				<SidebarMenuButton
					render={<CollapsibleTrigger />}
					className={`h-10.5 rounded-xl px-3.5 transition-all duration-150 border-l-2 ${
						isChildActive
							? "bg-primary/12 border-primary text-primary font-bold dark:bg-primary/20 shadow-2xs"
							: "bg-slate-100/80 border-transparent text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-slate-100 font-medium"
					}`}
				>
					<div className="flex items-center gap-3 w-full">
						<item.icon
							className={`size-4.5 transition-colors ${
								isChildActive
									? "text-primary"
									: "text-slate-500 dark:text-slate-400"
							}`}
						/>
						<span className="text-sm font-semibold flex-1 text-left truncate">
							{item.title}
						</span>
						<ChevronRight
							className={`size-3.5 transition-transform duration-200 group-data-open/collapsible:rotate-90 ${
								isChildActive
									? "text-primary"
									: "text-slate-400 dark:text-slate-500"
							}`}
						/>
					</div>
				</SidebarMenuButton>

				{/* Tree Structure Submenu */}
				<CollapsibleContent className="pt-1 pb-1">
					<div className="ml-5.5 pl-3.5 border-l border-slate-200 dark:border-slate-800 my-1.5 space-y-1.5 relative">
						{item.subItems?.map((subItem) => {
							const isSubActive =
								pathname === subItem.url ||
								pathname.startsWith(`${subItem.url}/`);
							const SubIcon = subItem.icon;

							return (
								<div key={subItem.title} className="relative flex items-center">
									{/* Tree Branch Horizontal Line Connector */}
									<span
										className={`absolute -left-[15px] top-1/2 -translate-y-1/2 transition-all ${
											isSubActive
												? "w-4 h-[2px] bg-primary"
												: "w-3 h-[1px] bg-slate-300 dark:bg-slate-700"
										}`}
									/>

									{/* Submenu Item Pill: Matches parent active style when active */}
									<SidebarMenuSubButton
										render={<Link href={subItem.url} />}
										isActive={isSubActive}
										className={`flex items-center gap-2.5 w-full h-9 rounded-xl px-3 text-xs transition-all ${
											isSubActive
												? "border-l-[3px] border-primary bg-primary/10 text-primary font-bold shadow-sm shadow-primary/10"
												: "border-l-2 border-transparent bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800/40 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200 font-medium"
										}`}
									>
										<SubIcon
											className={`size-3.5 shrink-0 transition-colors ${
												isSubActive
													? "text-primary"
													: "text-slate-500 dark:text-slate-400"
											}`}
										/>
										<span className="truncate">{subItem.title}</span>
									</SidebarMenuSubButton>
								</div>
							);
						})}
					</div>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}

export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { state } = useSidebar();
	const isCollapsed = state === "collapsed";
	const { t } = useTranslation();
	const {
		isMounted,
		userProfile,
		isLoading,
	} = usePermissions();

	const handleSignOut = async () => {
		try {
			await authApi.signOut();
		} catch {
			// ignore
		}
		if (typeof window !== "undefined") {
			localStorage.removeItem("rumluos_user_profile");
			localStorage.removeItem("rumluos_access_token");
			localStorage.removeItem("rumluos_refresh_token");
			localStorage.removeItem("rumluos_company_id");
		}
		await clearAuthCookies();
		router.push("/sign-in");
	};

	// Administrator visible ONLY when user login as ROLE_SYSTEM_ADMIN / platform system admin
	const isSystemAdmin = isUserSystemAdmin(userProfile);

	// 1. Sales & Finance Domain (Static frontend menu)
	const salesFinanceSubItems: SubMenuItem[] = [
		{ title: t("sidebar.order"), url: "/orders", icon: ShoppingCart },
		{ title: t("sidebar.invoice"), url: "/invoices", icon: FileText },
		{ title: t("sidebar.payments", "Payments"), url: "/payments", icon: CreditCard },
	];

	const salesFinanceDomain: MenuItem = {
		title: t("sidebar.saleAndFinance"),
		icon: Layers,
		subItems: salesFinanceSubItems,
	};

	// 2. Product & Inventory Domain (Static frontend menu)
	const productInventorySubItems: SubMenuItem[] = [
		{ title: t("sidebar.allProducts"), url: "/products", icon: Package },
		{ title: t("sidebar.stock"), url: "/inventory/stock", icon: Warehouse },
		{ title: t("sidebar.import"), url: "/inventory/imports", icon: Truck },
	];

	const productInventoryDomain: MenuItem = {
		title: t("sidebar.productAndInventory"),
		icon: Boxes,
		subItems: productInventorySubItems,
	};

	// 3. Company Domain (Static frontend menu)
	const companySubItems: SubMenuItem[] = [
		{ title: t("sidebar.department"), url: "/departments", icon: Building },
		{ title: t("sidebar.supplier"), url: "/suppliers", icon: Truck },
		{ title: t("sidebar.delivery"), url: "/deliveries", icon: MapPin },
		{ title: t("sidebar.locations", "Locations"), url: "/locations", icon: MapPin },
		{ title: t("sidebar.customer"), url: "/customers", icon: Contact },
		{ title: t("sidebar.feedback"), url: "/feedback", icon: MessageSquare },
	];

	const companyDomain: MenuItem = {
		title: t("sidebar.company"),
		icon: Building2,
		subItems: companySubItems,
	};

	// 4. User Management Domain (Static frontend menu)
	const userManagementSubItems: SubMenuItem[] = [
		{ title: t("sidebar.user"), url: "/users", icon: Users },
		{ title: t("sidebar.role"), url: "/roles", icon: ShieldCheck },
		{ title: t("sidebar.permission"), url: "/permissions", icon: KeyRound },
	];

	const userManagementDomain: MenuItem = {
		title: t("sidebar.userManagement"),
		icon: Users,
		subItems: userManagementSubItems,
	};

	// 5. System Settings Domain (Static frontend menu)
	const systemSettingsSubItems: SubMenuItem[] = [
		{
			title: t("sidebar.configurations"),
			url: "/configurations",
			icon: SlidersHorizontal,
		},
		{
			title: t("sidebar.paymentTerms", "Payment Terms"),
			url: "/payment-terms",
			icon: Clock,
		},
		{
			title: t("sidebar.subscription"),
			url: "/subscriptions",
			icon: CreditCard,
		},
	];

	const systemSettingsDomain: MenuItem = {
		title: t("sidebar.systemSettings"),
		icon: Settings,
		subItems: systemSettingsSubItems,
	};

	// 6. Administrator Domain (SHOW ONLY FOR PLATFORM SYSTEM ADMIN: system_admin / bronx@dmin)
	const systemAdminDomain: MenuItem = {
		title: t("sidebar.administrator", "Administrator"),
		icon: ShieldAlert,
		subItems: [
			{
				title: t("sidebar.systemAdminUser", "System Admin User"),
				url: "/super-admin/admins",
				icon: ShieldAlert,
			},
			{
				title: t("sidebar.companyManagement", "Company Management"),
				url: "/super-admin/companies",
				icon: Building2,
			},
			{
				title: t("sidebar.locations", "Locations"),
				url: "/locations",
				icon: MapPin,
			},
			{
				title: t("sidebar.dataMigration", "Data Migration"),
				url: "/super-admin/migrations",
				icon: ArrowLeftRight,
			},
		],
	};

	const hasAnyManagementDomains = true;

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 transition-all duration-300"
		>
			{/* Header with App Logo & Title */}
			<SidebarHeader className="p-3 pb-2 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center group-data-[collapsible=icon]:justify-center">
						<Link
							href="/"
							className="flex items-center gap-3 overflow-hidden rounded-xl p-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
						>
							<SidebarEmblemSvg />
							<div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
								<span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
									CRM <span className="text-primary">App</span>
								</span>
								<span
									suppressHydrationWarning
									className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 truncate"
								>
									{!isMounted || (isLoading && !userProfile) ? (
										<Skeleton className="h-2.5 w-24 my-0.5" />
									) : isSystemAdmin ? (
										t("common.systemAdminPortal", "System Admin Portal")
									) : userProfile?.company?.name || userProfile?.companyName ? (
										userProfile?.company?.name || userProfile?.companyName
									) : (
										t("common.operationalPortal", "Operational Portal")
									)}
								</span>
							</div>
						</Link>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			{/* Main Navigation Content */}
			<SidebarContent className="px-3.5 py-2 space-y-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-1 group-data-[collapsible=icon]:space-y-1">
				{/* Core Menu */}
				<SidebarGroup className="p-0">
					<SidebarGroupLabel
						suppressHydrationWarning
						className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1.5 group-data-[collapsible=icon]:hidden"
					>
						{t("sidebar.core")}
					</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-1">
							{/* Dashboard Item */}
							<SidebarMenuItem className="flex group-data-[collapsible=icon]:justify-center my-1.5">
								<SidebarMenuButton
									render={<Link href="/" />}
									isActive={pathname === "/"}
									tooltip={t("sidebar.dashboard")}
									className={`flex items-center gap-3 w-full h-10.5 rounded-xl px-3.5 transition-all border-l-2 ${
										pathname === "/"
											? "bg-primary/12 border-primary text-primary font-bold dark:bg-primary/20 shadow-2xs"
											: "bg-slate-100/80 border-transparent text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-slate-100 font-medium"
									} group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-l-0`}
								>
									<LayoutDashboard
										className={`size-4.5 ${pathname === "/" ? "text-primary" : "text-slate-500 dark:text-slate-400"}`}
									/>
									<span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
										{t("sidebar.dashboard")}
									</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Management & Domains */}
				{hasAnyManagementDomains && (
					<SidebarGroup className="p-0">
						<SidebarGroupLabel
							suppressHydrationWarning
							className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-2 mb-1.5 group-data-[collapsible=icon]:hidden"
						>
							{t("sidebar.domainsAndManagement")}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="space-y-1">
								{salesFinanceSubItems.length > 0 && (
									<SidebarCollapsibleGroup
										item={salesFinanceDomain}
										pathname={pathname}
									/>
								)}
								{productInventorySubItems.length > 0 && (
									<SidebarCollapsibleGroup
										item={productInventoryDomain}
										pathname={pathname}
									/>
								)}
								{companySubItems.length > 0 && (
									<SidebarCollapsibleGroup
										item={companyDomain}
										pathname={pathname}
									/>
								)}
								{userManagementSubItems.length > 0 && (
									<SidebarCollapsibleGroup
										item={userManagementDomain}
										pathname={pathname}
									/>
								)}
								{systemSettingsSubItems.length > 0 && (
									<SidebarCollapsibleGroup
										item={systemSettingsDomain}
										pathname={pathname}
									/>
								)}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}

				{/* Administrator Domain (SHOW ONLY FOR PLATFORM SYSTEM_ADMIN: system_admin / bronx@dmin) */}
				{isSystemAdmin && (
					<SidebarGroup className="p-0">
						<SidebarGroupLabel
							suppressHydrationWarning
							className="text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase px-2 mb-1.5 group-data-[collapsible=icon]:hidden"
						>
							{t("sidebar.systemAdminOnly", "System Admin Only")}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu className="space-y-1">
								<SidebarCollapsibleGroup
									item={systemAdminDomain}
									pathname={pathname}
								/>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>

			{/* Footer Profile & Logout Menu */}
			<SidebarFooter className="p-3 border-t border-slate-200/80 dark:border-slate-800 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
				<SidebarMenu>
					<SidebarMenuItem className="flex group-data-[collapsible=icon]:justify-center">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<SidebarMenuButton
										size="lg"
										tooltip={userProfile?.firstName || "Profile"}
										className="hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl p-1.5 transition-all group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center"
									/>
								}
							>
								<Avatar className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700">
									<AvatarImage
										src={fileUrl(userProfile?.avatarKey) || ""}
										alt={userProfile?.firstName}
									/>
									<AvatarFallback
										suppressHydrationWarning
										className="rounded-lg bg-primary/10 text-primary font-bold text-xs"
									>
										{isMounted &&
										(userProfile?.firstName?.[0] ||
											userProfile?.username?.[0]) ? (
											(
												userProfile.firstName?.[0] ||
												userProfile.username?.[0]
											).toUpperCase()
										) : (
											<UserIcon className="size-3.5" />
										)}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col gap-0.5 leading-none flex-1 overflow-hidden ml-2 text-left group-data-[collapsible=icon]:hidden">
									<span
										suppressHydrationWarning
										className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate"
									>
										{!isMounted || (isLoading && !userProfile) ? (
											<Skeleton className="h-3 w-20 mb-0.5" />
										) : userProfile?.firstName ? (
											`${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
										) : userProfile?.username ? (
											userProfile.username
										) : (
											""
										)}
									</span>
									<span
										suppressHydrationWarning
										className="text-[10px] text-slate-400 dark:text-slate-500 truncate"
									>
										{!isMounted || (isLoading && !userProfile) ? (
											<Skeleton className="h-2 w-14" />
										) : userProfile?.username ? (
											`@${userProfile.username}`
										) : isSystemAdmin ? (
											"@system_admin"
										) : userProfile?.roles?.[0]?.name ? (
											`@${userProfile.roles[0].name.toLowerCase()}`
										) : (
											""
										)}
									</span>
								</div>
							</DropdownMenuTrigger>
							{/* <DropdownMenuContent className="w-52 rounded-2xl p-1.5 shadow-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950" align="end" side="right" sideOffset={8}>
                <DropdownMenuItem render={<Link href="/profile" />} className="cursor-pointer rounded-xl dark:hover:bg-slate-800">
                  <Settings className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span>{t("sidebar.profileSettings")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="rounded-xl text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("sidebar.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent> */}
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

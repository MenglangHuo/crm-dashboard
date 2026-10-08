"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi, ordersApi, financeApi, invoicesApi } from "@/lib/api/endpoints";
import { Customer } from "@/lib/types";
import { toast } from "sonner";
import {
	User,
	Phone,
	MapPin,
	Building2,
	Users,
	Zap,
	ArrowLeft,
	Calendar,
	Clock,
	ExternalLink,
	Edit3,
	Trash2,
	RotateCcw,
	Truck,
	ShieldCheck,
	FileText,
	DollarSign,
	ShoppingCart,
	Navigation,
	Image as ImageIcon,
	BarChart3,
	Receipt,
} from "lucide-react";

import { ModernButton } from "@/components/ui-custom/button";
import { Badge } from "@/components/ui/badge";
import { VisitStatusBadge } from "@/components/customers/visit-status-badge";
import { LogVisitModal } from "@/components/customers/log-visit-modal";
import { CustomerFormModal } from "@/components/customers/customer-form-modal";
import { ShopContactsSection } from "@/components/customers/shop-contacts-section";
import { CustomerReportTab } from "@/components/customers/customer-report-tab";
import { CustomerOrdersTab } from "@/components/customers/customer-orders-tab";
import { CustomerInvoicesTab } from "@/components/customers/customer-invoices-tab";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
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

export default function CustomerProfilePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { t } = useTranslation();
	const { id: customerId } = use(params);
	const queryClient = useQueryClient();

	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
	const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
	const [visitPage, setVisitPage] = useState(0);

	// 1. Fetch Customer 360 Details
	const { data: customer, isLoading: isLoadingCustomer } = useQuery({
		queryKey: ["customer-detail", String(customerId)],
		queryFn: () => customersApi.get(customerId),
	});

	// 2. Fetch Customer Visit History
	const { data: visitsData, isLoading: isLoadingVisits } = useQuery({
		queryKey: ["customer-visits", String(customerId), visitPage],
		queryFn: () => customersApi.getVisitHistory(customerId, visitPage, 10),
	});

	// 3. Fetch Customer Orders
	const { data: ordersData } = useQuery({
		queryKey: ["customer-orders", String(customerId)],
		queryFn: () => ordersApi.list({ limit: 20 }),
	});
	const customerOrders =
		ordersData?.items?.filter(
			(o: any) => String(o.customerId || o.customer?.id) === String(customerId),
		) || [];

	// 4. Fetch Customer Invoices Count
	const { data: invoicesData } = useQuery({
		queryKey: ["customer-invoices-count", String(customerId)],
		queryFn: () => invoicesApi.list({ limit: 20 }),
	});
	const customerInvoices =
		invoicesData?.items?.filter(
			(i: any) => String(i.customerId || i.customer?.id) === String(customerId),
		) || [];

	// Deactivate Mutation
	const deleteMutation = useMutation({
		mutationFn: () => customersApi.remove(customerId),
		onSuccess: () => {
			toast.success(
				t("customers.inactivatedSuccess") ||
					"Customer deactivated successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customerId)],
			});
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			setIsDeleteAlertOpen(false);
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to deactivate customer"),
	});

	// Reactivate Mutation
	const restoreMutation = useMutation({
		mutationFn: () => customersApi.restore(customerId),
		onSuccess: () => {
			toast.success(
				t("customers.restoredSuccess") || "Customer reactivated successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customerId)],
			});
			queryClient.invalidateQueries({ queryKey: ["customers"] });
		},
		onError: (err: any) =>
			toast.error(err?.message || "Failed to reactivate customer"),
	});

	if (isLoadingCustomer) {
		return (
			<div className="flex h-72 items-center justify-center">
				<div className="flex items-center gap-2 text-sm text-slate-500">
					<Clock className="h-4 w-4 animate-spin text-slate-400" /> Loading
					customer 360 profile...
				</div>
			</div>
		);
	}

	if (!customer) {
		return (
			<div className="p-12 text-center space-y-4">
				<h2 className="text-lg font-bold text-slate-900 dark:text-white">
					Customer Not Found
				</h2>
				<p className="text-xs text-slate-500">
					The customer profile you requested does not exist or has been removed.
				</p>
				<Link href="/customers">
					<ModernButton variant="primary" size="sm">
						{t("customers.backToCustomers")}
					</ModernButton>
				</Link>
			</div>
		);
	}

	const visitItems = visitsData?.items || [];
	const totalVisits = visitsData?.total || 0;
	const headerPhoto =
		customer.profileUrls?.[0] ||
		customer.profileUrl ||
		customer.imageUrl ||
		"/images/default-customer.png";

	return (
		<div className="space-y-6 pb-12">
			{/* Top Breadcrumb & Actions Bar */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
				<div className="flex items-start gap-4">
					{/* Customer Avatar Thumbnail */}
					<div className="h-16 w-16 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 shadow-sm">
						<img
							src={headerPhoto}
							alt={customer.name}
							onError={(e) => {
								(e.currentTarget as HTMLImageElement).src =
									"/images/default-customer.png";
							}}
							className="h-full w-full object-cover"
						/>
					</div>

					<div className="space-y-1.5">
						<Link
							href="/customers"
							className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
						>
							<ArrowLeft className="mr-1 h-3.5 w-3.5" />{" "}
							{t("customers.backToCustomers")}
						</Link>

						<div className="flex flex-wrap items-center gap-3">
							<h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
								{customer.name}
							</h1>
							{customer.merchantName && (
								<span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2.5 py-0.5 rounded-xl">
									🏬 {customer.merchantName}
								</span>
							)}
							<VisitStatusBadge status={customer.visitStatus} />
							<Badge
								variant="outline"
								className={`text-xs font-bold ${
									customer.isActive !== false && customer.active !== false
										? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
										: "text-slate-400 border-slate-300"
								}`}
							>
								{customer.isActive !== false && customer.active !== false
									? "Active"
									: "Inactive"}
							</Badge>
						</div>

						{/* Assigned Staff tags */}
						<div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
							<span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
								<Users className="h-3.5 w-3.5 text-blue-600" />{" "}
								{t("customers.assignedHandlers")}:
							</span>
							{customer.staffInfos && customer.staffInfos.length > 0 ? (
								<div className="flex flex-wrap gap-1.5">
									{customer.staffInfos.map((s: any) => (
										<span
											key={s.id}
											className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
										>
											{s.name}
										</span>
									))}
								</div>
							) : (
								<span className="text-slate-400 italic">No staff assigned</span>
							)}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2.5 w-full sm:w-auto">
					<ModernButton
						variant="warning"
						size="sm"
						onClick={() => setIsVisitModalOpen(true)}
						leftIcon={<Zap className="mr-1.5 h-4 w-4 fill-current" />}
					>
						{t("customers.logSalesVisit")}
					</ModernButton>

					<ModernButton
						variant="outline"
						size="sm"
						onClick={() => setIsEditOpen(true)}
						leftIcon={<Edit3 className="mr-1.5 h-3.5 w-3.5" />}
					>
						{t("customers.editProfile")}
					</ModernButton>

					{customer.isActive === false || customer.active === false ? (
						<ModernButton
							variant="outline"
							size="sm"
							onClick={() => restoreMutation.mutate()}
							isLoading={restoreMutation.isPending}
							className="text-emerald-600 border-emerald-200"
							leftIcon={<RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
						>
							Reactivate
						</ModernButton>
					) : (
						<ModernButton
							variant="danger"
							size="icon-sm"
							onClick={() => setIsDeleteAlertOpen(true)}
							title="Deactivate Customer"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</ModernButton>
					)}
				</div>
			</div>

			{/* Main Tabs Container */}
			<ModernTabs defaultValue="contacts">
				<ModernTabsList className="bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
					<ModernTabsTrigger
						value="contacts"
						className="rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
					>
						<User className="h-3.5 w-3.5" />
						<span>{t("customers.profileTab")}</span>
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="visits"
						className="rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
					>
						<MapPin className="h-3.5 w-3.5" />
						<span>{t("customers.visitLogsTab")} ({totalVisits})</span>
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="analytics"
						className="rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
					>
						<BarChart3 className="h-3.5 w-3.5" />
						<span>{t("customers.financialReportsTab")}</span>
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="orders"
						className="rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
					>
						<ShoppingCart className="h-3.5 w-3.5" />
						<span>{t("customers.ordersSalesTab")} ({customerOrders.length})</span>
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="invoices"
						className="rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
					>
						<Receipt className="h-3.5 w-3.5" />
						<span>{t("sidebar.invoices", "Invoices")} ({customerInvoices.length})</span>
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* Tab 1: Profile & Shop Contacts Hierarchy */}
				<ModernTabsContent value="contacts" className="space-y-6 pt-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* General Information Card */}
						<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 shadow-xs">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<User className="h-4 w-4 text-blue-600" />{" "}
								{t("customers.storeAccountDetails")}
							</h3>

							<div className="space-y-3 text-xs">
								<div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
									<span className="text-slate-400">
										{t("customers.customerName")}
									</span>
									<span className="font-bold text-slate-900 dark:text-white">
										{customer.name}
									</span>
								</div>

								<div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
									<span className="text-slate-400">
										{t("customers.merchantName")}
									</span>
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										{customer.merchantName || "—"}
									</span>
								</div>

								<div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
									<span className="text-slate-400">
										{t("customers.primaryPhone")}
									</span>
									<a
										href={`tel:${customer.phoneNumber || customer.phone}`}
										className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
									>
										{customer.phoneNumber || customer.phone || "—"}
									</a>
								</div>

								<div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
									<span className="text-slate-400">
										{t("customers.alternateContact")}
									</span>
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										{customer.contact || "—"}
									</span>
								</div>

								<div className="flex justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
									<span className="text-slate-400">
										{t("customers.gender")}
									</span>
									<span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
										{customer.gender?.toUpperCase() === "FEMALE"
											? t("customers.female")
											: customer.gender?.toUpperCase() === "MALE"
												? t("customers.male")
												: customer.gender || "MALE"}
									</span>
								</div>

								{customer.description && (
									<div className="pt-1">
										<span className="text-slate-400 block mb-1">
											{t("customers.descriptionNotes")}
										</span>
										<p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl leading-relaxed">
											{customer.description}
										</p>
									</div>
								)}
							</div>
						</div>

						{/* Location & Delivery Card */}
						<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 shadow-xs">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<MapPin className="h-4 w-4 text-emerald-600" />{" "}
								{t("customers.locationLogistics")}
							</h3>

							<div className="space-y-3 text-xs">
								<div>
									<span className="text-slate-400 block mb-1">
										{t("customers.streetAddress")}
									</span>
									<p className="font-semibold text-slate-800 dark:text-slate-200">
										{customer.address || "No address text provided"}
									</p>
								</div>

								{customer.addressInfo && (
									<div className="space-y-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
										<span className="text-[10px] font-bold uppercase text-slate-400">
											{t("customers.adminHierarchy")}
										</span>
										<p className="font-medium text-slate-700 dark:text-slate-300">
											📍 {customer.addressInfo.province || "—"}
											{customer.addressInfo.district
												? `, ${customer.addressInfo.district}`
												: ""}
											{customer.addressInfo.commune
												? `, ${customer.addressInfo.commune}`
												: ""}
											{customer.addressInfo.village
												? `, ${customer.addressInfo.village}`
												: ""}
										</p>
									</div>
								)}

								{/* GPS Coordinates */}
								{customer.lat && customer.lng ? (
									<div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
										<div>
											<span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">
												{t("customers.gpsLocation")}
											</span>
											<span className="font-mono text-emerald-800 dark:text-emerald-200">
												{customer.lat}, {customer.lng}
											</span>
										</div>
										<a
											href={`https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
										>
											{t("customers.openMap")}{" "}
											<ExternalLink className="h-3 w-3" />
										</a>
									</div>
								) : (
									<p className="text-slate-400 italic">
										No GPS coordinates pinned yet.
									</p>
								)}

								{/* Delivery routes */}
								<div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
									<span className="text-slate-400 block mb-1.5 flex items-center gap-1 font-medium">
										<Truck className="h-3.5 w-3.5 text-purple-600" />{" "}
										{t("customers.deliveryRoutes")}:
									</span>
									{customer.deliveries && customer.deliveries.length > 0 ? (
										<div className="flex flex-wrap gap-1.5">
											{customer.deliveries.map((d: any) => {
												const isPrimary = customer.primaryDelivery?.id === d.id;
												return (
													<span
														key={d.id}
														className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
															isPrimary
																? "bg-purple-600 text-white shadow-xs"
																: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
														}`}
													>
														<span>{d.name}</span>
														{isPrimary && (
															<span className="text-[9px] bg-white/20 px-1 rounded-sm">
																Primary
															</span>
														)}
													</span>
												);
											})}
										</div>
									) : (
										<span className="text-slate-400">
											No delivery routes linked
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Store Photos Gallery */}
						<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 shadow-xs">
							<h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
								<ImageIcon className="h-4 w-4 text-purple-600" />{" "}
								{t("customers.storefrontImages")}
							</h3>

							{customer.profileUrls && customer.profileUrls.length > 0 ? (
								<div className="grid grid-cols-2 gap-2.5">
									{customer.profileUrls.map((url: any, index: number) => (
										<a
											key={index}
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
										>
											<img
												src={url}
												alt={`Store photo ${index + 1}`}
												onError={(e) => {
													(e.currentTarget as HTMLImageElement).src =
														"/images/default-customer.png";
												}}
												className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
											/>
										</a>
									))}
								</div>
							) : (
								<div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-400">
									No storefront photos attached.
								</div>
							)}
						</div>
					</div>

					{/* Shop Contacts Section Component */}
					<div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-xs">
						<ShopContactsSection
							customerId={customerId}
							customerName={customer.name}
						/>
					</div>
				</ModernTabsContent>

				{/* Tab 2: Field Visit History & Timeline */}
				<ModernTabsContent value="visits" className="space-y-4 pt-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-950 dark:text-white">
								{t("customers.visitTimelineTitle")}
							</h3>
							<p className="text-xs text-slate-500">
								{t("customers.visitTimelineSubtitle")}
							</p>
						</div>

						<ModernButton
							variant="warning"
							size="sm"
							onClick={() => setIsVisitModalOpen(true)}
							leftIcon={<Zap className="mr-1.5 h-3.5 w-3.5 fill-current" />}
						>
							{t("customers.recordNewVisit")}
						</ModernButton>
					</div>

					{isLoadingVisits ? (
						<div className="py-12 text-center text-xs text-slate-400">
							Loading visit history...
						</div>
					) : visitItems.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-950">
							<Calendar className="mx-auto h-8 w-8 text-slate-400 mb-2" />
							<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
								{t("customers.noVisitsYet")}
							</p>
							<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
								{t("customers.visitSyncDesc")}
							</p>
							<ModernButton
								variant="warning"
								size="sm"
								onClick={() => setIsVisitModalOpen(true)}
								className="mt-4"
								leftIcon={<Zap className="mr-1.5 h-3.5 w-3.5 fill-current" />}
							>
								{t("customers.recordFirstVisit")}
							</ModernButton>
						</div>
					) : (
						<div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
							<div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 pl-6">
								{visitItems.map((visit) => (
									<div key={visit.id} className="relative group">
										{/* Timeline dot */}
										<div className="absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-950 shadow-xs" />

										<div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
											<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
												<div className="flex items-center gap-2">
													<span className="font-bold text-sm text-slate-950 dark:text-white">
														{visit.visitedByName ||
															`Staff #${visit.visitedById}`}
													</span>
													<span className="text-[11px] text-slate-400 font-medium">
														{t("customers.conductedOnsiteVisit")}
													</span>
												</div>
												<span className="text-xs font-semibold text-slate-500">
													{new Date(visit.visitedAt).toLocaleString(undefined, {
														dateStyle: "medium",
														timeStyle: "short",
													})}
												</span>
											</div>

											{visit.notes && (
												<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
													"{visit.notes}"
												</p>
											)}

											{visit.visitLat && visit.visitLng && (
												<div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono pt-1">
													<Navigation className="h-3 w-3 text-emerald-600" />
													GPS Check-In: {visit.visitLat.toFixed(5)},{" "}
													{visit.visitLng.toFixed(5)}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</ModernTabsContent>

				{/* Tab 3: Financial Analytics & Reports (CustomerReportController) */}
				<ModernTabsContent value="analytics" className="pt-4">
					<CustomerReportTab
						customerId={customerId}
						customerName={customer.name}
					/>
				</ModernTabsContent>

				{/* Tab 4: Orders & Transactions */}
				<ModernTabsContent value="orders" className="space-y-4 pt-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-950 dark:text-white">
								{t("customers.recentOrdersTitle")}
							</h3>
							<p className="text-xs text-slate-500">
								{t("customers.recentOrdersSubtitle")}
							</p>
						</div>
						<Link href="/orders">
							<ModernButton variant="outline" size="sm">
								{t("customers.viewAllOrders")}
							</ModernButton>
						</Link>
					</div>

					<CustomerOrdersTab
						customerId={customerId}
						customerName={customer.name}
					/>
				</ModernTabsContent>

				{/* Tab 5: Invoices & Receivables */}
				<ModernTabsContent value="invoices" className="space-y-4 pt-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-950 dark:text-white">
								{t("sidebar.invoices", "Invoices")} &amp; {t("invoices.paymentStatus", "Receivables")}
							</h3>
							<p className="text-xs text-slate-500">
								All invoices, payment status, and receivables history for this customer.
							</p>
						</div>
						<Link href="/invoices">
							<ModernButton variant="outline" size="sm">
								View Invoices Page
							</ModernButton>
						</Link>
					</div>

					<CustomerInvoicesTab
						customerId={customerId}
						customerName={customer.name}
					/>
				</ModernTabsContent>
			</ModernTabs>

			{/* Edit Customer Form Modal */}
			<CustomerFormModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				customer={customer}
			/>

			{/* Log Visit Modal */}
			<LogVisitModal
				isOpen={isVisitModalOpen}
				onClose={() => setIsVisitModalOpen(false)}
				customer={{ id: customer.id, name: customer.name }}
			/>

			{/* Deactivate Alert Dialog */}
			<AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Deactivate Customer Account?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to deactivate {customer.name}? They will be
							hidden from active routes and directory searches.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteMutation.mutate()}
							className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
						>
							Deactivate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

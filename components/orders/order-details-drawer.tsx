"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, safeImageUrl, fileUrl } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Order, OrderItem } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
} from "@/components/ui-custom/modal";
import { OrderStatusStepper } from "@/components/orders/order-status-stepper";
import { WarehouseVerifyModal } from "@/components/orders/warehouse-verify-modal";
import { OrderApprovalModal } from "@/components/orders/order-approval-modal";
import { IssueInvoiceModal } from "@/components/orders/issue-invoice-modal";
import { OrderActionReasonModal } from "@/components/orders/order-action-reason-modal";
import { OrderTimelineDrawer } from "@/components/orders/order-timeline-drawer";
import { PosOrderStudioModal } from "@/components/orders/pos-order-studio-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	Loader2,
	Send,
	Boxes,
	AlertCircle,
	ShieldCheck,
	Receipt,
	RotateCcw,
	XCircle,
	History,
	CheckCircle2,
	Building2,
	User,
	PackageCheck,
	Eye,
	ShoppingCart,
	DollarSign,
	Tag,
	Package,
	Check,
	Save,
	Gift,
	Truck,
	MapPin,
	UserCheck,
	Ban,
	ChevronDown,
	Clock,
	SlidersHorizontal,
	FileText,
	Maximize2,
} from "lucide-react";

interface OrderDetailsDrawerProps {
	orderId: string | number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

// Prominent Product Image Component with Lightbox Affordance
function SafeProductThumbnail({
	src,
	alt,
	onPreview,
}: {
	src?: string;
	alt: string;
	onPreview?: (url: string, title: string) => void;
}) {
	const [error, setError] = useState(false);
	const fullUrl = src ? safeImageUrl(src) : undefined;

	if (!fullUrl || error) {
		return (
			<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-400 shrink-0 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
				<Package className="h-6 w-6 stroke-[1.25] text-slate-400/90" />
			</div>
		);
	}

	return (
		<div
			className="group/img relative h-14 w-14 rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-700/80 shadow-2xs shrink-0 cursor-pointer bg-slate-50 dark:bg-slate-900"
			onClick={() => onPreview?.(fullUrl, alt)}
			title="Click to zoom product image"
		>
			<img
				src={fullUrl}
				alt={alt}
				onError={() => setError(true)}
				className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
			/>
			<div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
				<Maximize2 className="h-4 w-4 drop-shadow-xs" />
			</div>
		</div>
	);
}

export function OrderDetailsDrawer({
	orderId,
	open,
	onOpenChange,
}: OrderDetailsDrawerProps) {
	const queryClient = useQueryClient();
	const {
		isAdmin,
		isSale,
		canCreateOrder,
		canPostOrder,
		canUnpostOrder,
		canVoidOrder,
		canVerifyStock,
		canApproveSale,
		canApproveSpecial,
		canUnapproveOrder,
		canRejectOrder,
		canIssueInvoice,
	} = usePermissions();

	// Action Modals State
	const [isVerifyOpen, setIsVerifyOpen] = useState(false);
	const [isApproveOpen, setIsApproveOpen] = useState(false);
	const [approvalScope, setApprovalScope] = useState<string>("AUTO");
	const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
	const [isUnpostOpen, setIsUnpostOpen] = useState(false);
	const [isVoidOpen, setIsVoidOpen] = useState(false);
	const [isMoveToDraftOpen, setIsMoveToDraftOpen] = useState(false);
	const [isUnapproveOpen, setIsUnapproveOpen] = useState(false);
	const [isRejectOpen, setIsRejectOpen] = useState(false);
	const [isTimelineOpen, setIsTimelineOpen] = useState(false);
	const [isPosStudioOpen, setIsPosStudioOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("orderitems");

	// Image Lightbox Preview State
	const [previewImage, setPreviewImage] = useState<{
		url: string;
		title: string;
	} | null>(null);

	const { data: order, isLoading } = useQuery({
		queryKey: ["order-detail", orderId],
		queryFn: async () => {
			if (!orderId) return null;
			const idStr = String(orderId).trim();
			if (/^\d+$/.test(idStr)) {
				return ordersApi.get(Number(idStr));
			}
			return ordersApi.getByNumber(idStr);
		},
		enabled: Boolean(orderId) && open,
	});

	// Editable items state for DRAFT mode
	const [editableItems, setEditableItems] = useState<any[]>([]);

	React.useEffect(() => {
		if (order?.items) {
			setEditableItems(
				order.items.map((it: any) => ({
					...it,
					quantity: Number(it.quantity) || 1,
					discount: Number(it.discount) || 0,
					discountType: it.discountType || "FLAT",
					unitPrice: Number(it.unitPrice) || 0,
					totalAmount:
						Number(it.totalAmount) ||
						(Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
				})),
			);
		}
	}, [order]);

	const handleEditableItemChange = (
		index: number,
		field: string,
		value: any,
	) => {
		setEditableItems((prev) =>
			prev.map((item, idx) => {
				if (idx !== index) return item;
				const updated = { ...item, [field]: value };
				const qty = Number(updated.quantity) || 0;
				const price = Number(updated.unitPrice) || 0;
				const disc = Number(updated.discount) || 0;
				const linePrice =
					updated.discountType === "PERCENTAGE"
						? price * (1 - disc / 100)
						: price - disc;
				updated.totalAmount = Math.max(0, linePrice) * qty;
				return updated;
			}),
		);
	};

	// Update Mutation (PUT /v1/orders/{id})
	const updateMutation = useMutation({
		mutationFn: () => {
			if (!order) return Promise.reject("No order loaded");
			const payload = {
				customerId: order.customerId,
				companyId: order.companyId,
				discountAmount: order.discountAmount || 0,
				discountType: order.discountType || "FLAT",
				customerNote: order.customerNote || "",
				internalNote: order.internalNote || "",
				items: editableItems.map((it: any) => ({
					id: it.id,
					variantId: it.variantId || it.productId || it.id,
					unitId: it.unitId || 1,
					quantity: Number(it.quantity) || 1,
					unitPrice: Number(it.unitPrice) || 0,
					discount: Number(it.discount) || 0,
					discountType: it.discountType || "FLAT",
				})),
			};
			return ordersApi.update(order.id, payload);
		},
		onSuccess: () => {
			toast.success("Order draft items & discounts updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Post Mutation (DRAFT -> POSTED)
	const postMutation = useMutation({
		mutationFn: (id: string | number) => ordersApi.postOrder(id),
		onSuccess: () => {
			toast.success(
				"Order submitted to POSTED status. Warehouse stock reserved!",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Unpost Mutation (POSTED -> DRAFT)
	const unpostMutation = useMutation({
		mutationFn: (reason: string) =>
			orderId
				? ordersApi.unpostOrder(orderId, reason)
				: Promise.reject("No order ID"),
		onSuccess: () => {
			toast.success(
				"Order unposted to DRAFT! Reserved stock released back to available inventory.",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
			setIsUnpostOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Void Mutation (DRAFT/POSTED -> VOID)
	const voidMutation = useMutation({
		mutationFn: (reason: string) =>
			orderId
				? ordersApi.voidOrder(orderId, reason)
				: Promise.reject("No order ID"),
		onSuccess: () => {
			toast.success(
				"Order voided! Reserved stock released back to available inventory.",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
			setIsVoidOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Move to Draft Mutation (VOID -> DRAFT)
	const moveToDraftMutation = useMutation({
		mutationFn: (reason?: string) =>
			orderId
				? ordersApi.moveToDraft(orderId, reason)
				: Promise.reject("No order ID"),
		onSuccess: () => {
			toast.success(
				"Order returned to DRAFT! You can now edit items and re-post.",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
			setIsMoveToDraftOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Unapprove Mutation (APPROVED -> DRAFT)
	const unApproveMutation = useMutation({
		mutationFn: (reason: string) =>
			orderId
				? ordersApi.unApproveOrder(orderId, reason)
				: Promise.reject("No order ID"),
		onSuccess: () => {
			toast.success(
				"Order signoffs reset back to DRAFT! Approvals revoked and reserved stock released.",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
			setIsUnapproveOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Reject Mutation (APPROVED -> POSTED)
	const rejectMutation = useMutation({
		mutationFn: (reason: string) =>
			orderId
				? ordersApi.rejectOrder(orderId, reason)
				: Promise.reject("No order ID"),
		onSuccess: () => {
			toast.success(
				"Order rejected back to POSTED for fix. Approval flags reset.",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
			setIsRejectOpen(false);
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!orderId) return null;

	const items =
		order?.status === "DRAFT" && editableItems.length > 0
			? editableItems
			: order?.items || [];
	const addons =
		(order?.addonsItems && order.addonsItems.length > 0
			? order.addonsItems
			: order?.addons) || [];

	const isDualApproved = Boolean(
		order?.status === "APPROVED" ||
			order?.status === "COMPLETED" ||
			(order?.stockkeeperApproved && order?.saleManagerApproved),
	);

	const orderSubtitle = order
		? `Created ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""} • ${order.customerName || order.customer?.name || "Walk-in Customer"} • ${order.warehouseName || "Main Warehouse"}`
		: "Detailed view of order items, verification, and action lifecycle.";

	return (
		<>
			<ModernModal
				isOpen={open && !isPosStudioOpen}
				onClose={() => {
					onOpenChange(false);
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
				}}
				title={`Order ${order?.orderNumber || order?.orderNo || `#${orderId}`}`}
				subtitle={orderSubtitle}
				icon={<Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
				size="xl"
				glassmorphism={true}
				draggable={true}
				resizable={true}
				isLoading={isLoading}
				loadingText="Fetching order details..."
				footer={
					<ModernModalFooter className="flex items-center justify-between w-full">
						{/* Left: Secondary Utility Actions */}
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsTimelineOpen(true)}
								className="h-9 rounded-xl text-xs gap-1.5 border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
							>
								<History className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
								<span>Audit Timeline</span>
							</Button>
						</div>

						{/* Right: Stage-driven Primary Actions & Dropdown */}
						<div className="flex items-center gap-2">
							{/* DRAFT STAGE ACTIONS */}
							{order && order.status === "DRAFT" && (
								<>
									{canCreateOrder && (
										<>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setIsPosStudioOpen(true)}
												className="h-9 px-3 rounded-xl border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold text-xs gap-1.5"
											>
												<ShoppingCart className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
												<span>Open in POS Studio</span>
											</Button>

											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => updateMutation.mutate()}
												disabled={updateMutation.isPending}
												className="h-9 px-3.5 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold text-xs gap-1.5"
											>
												{updateMutation.isPending ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Save className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
												)}
												<span>Save Changes</span>
											</Button>
										</>
									)}

									{/* Primary Post CTA */}
									{canPostOrder && (
										<Button
											type="button"
											size="sm"
											onClick={() => postMutation.mutate(order.id)}
											disabled={postMutation.isPending}
											className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs gap-1.5 transition-all"
										>
											{postMutation.isPending ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Send className="h-3.5 w-3.5 fill-current" />
											)}
											<span>Post Order (Reserve Stock)</span>
										</Button>
									)}

									{/* Secondary / Destructive Dropdown for DRAFT */}
									{canVoidOrder && !isSale && (
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button
														size="sm"
														variant="outline"
														className="h-9 px-2.5 text-xs font-semibold gap-1 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl"
													/>
												}
											>
												<SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
												<ChevronDown className="h-3 w-3 text-slate-400" />
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end" className="w-48">
												<DropdownMenuItem
													onClick={() => setIsVoidOpen(true)}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
												>
													<Ban className="h-3.5 w-3.5" />
													<span>Void Order</span>
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</>
							)}

							{/* POSTED STAGE ACTIONS */}
							{order && order.status === "POSTED" && (
								<>
									{!order.saleManagerApproved ? (
										<Button
											size="sm"
											disabled={isSale || !canApproveSale}
											onClick={() => {
												setApprovalScope("SALE_MANAGER");
												setIsApproveOpen(true);
											}}
											className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs gap-1.5 disabled:opacity-50"
										>
											<UserCheck className="h-3.5 w-3.5" />
											<span>Approve as Sale Manager</span>
										</Button>
									) : !order.stockkeeperApproved ? (
										<Button
											size="sm"
											disabled={isSale || !canVerifyStock}
											onClick={() => setIsVerifyOpen(true)}
											className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs gap-1.5 disabled:opacity-50"
										>
											<Boxes className="h-3.5 w-3.5" />
											<span>Verify Stock Items</span>
										</Button>
									) : null}

									{/* More Actions Dropdown for POSTED */}
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													size="sm"
													variant="outline"
													className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
												/>
											}
										>
											<SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
											<span>More actions</span>
											<ChevronDown className="h-3 w-3 text-slate-400" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-56">
											{canApproveSpecial && !isSale && (
												<DropdownMenuItem
													onClick={() => {
														setApprovalScope("AUTO");
														setIsApproveOpen(true);
													}}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
												>
													<ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
													<span>Smart Bypass Approval</span>
												</DropdownMenuItem>
											)}

											{canUnpostOrder && (
												<DropdownMenuItem
													disabled={isSale}
													onClick={() => setIsUnpostOpen(true)}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
												>
													<RotateCcw className="h-3.5 w-3.5 text-amber-600" />
													<span>Unpost to Draft</span>
												</DropdownMenuItem>
											)}

											{canVoidOrder && !isSale && (
												<>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => setIsVoidOpen(true)}
														className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
													>
														<Ban className="h-3.5 w-3.5" />
														<span>Void Order</span>
													</DropdownMenuItem>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</>
							)}

							{/* APPROVED STAGE ACTIONS */}
							{order && order.status === "APPROVED" && (
								<>
									{canIssueInvoice && (
										<Button
											size="sm"
											onClick={() => setIsInvoiceOpen(true)}
											className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs gap-1.5"
										>
											<Receipt className="h-3.5 w-3.5" />
											<span>Issue Invoice</span>
										</Button>
									)}

									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													size="sm"
													variant="outline"
													className="h-9 px-3 text-xs font-semibold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl"
												/>
											}
										>
											<SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
											<span>More actions</span>
											<ChevronDown className="h-3 w-3 text-slate-400" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-56">
											{canUnapproveOrder && (
												<DropdownMenuItem
													onClick={() => setIsUnapproveOpen(true)}
													className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
												>
													<RotateCcw className="h-3.5 w-3.5 text-amber-600" />
													<span>Reset Signoffs (To Draft)</span>
												</DropdownMenuItem>
											)}

											{canRejectOrder && (
												<>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => setIsRejectOpen(true)}
														className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
													>
														<XCircle className="h-3.5 w-3.5" />
														<span>Reject to Posted</span>
													</DropdownMenuItem>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								</>
							)}

							{/* COMPLETED STAGE BADGE */}
							{order && order.status === "COMPLETED" && (
								<Badge className="h-9 px-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold gap-1.5">
									<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
									<span>Invoiced & Completed</span>
								</Badge>
							)}

							{/* VOID STAGE ACTIONS */}
							{order && order.status === "VOID" && canVoidOrder && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => setIsMoveToDraftOpen(true)}
									className="h-9 px-4 rounded-xl border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs shadow-2xs gap-1.5"
								>
									<RotateCcw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
									<span>Move to Draft</span>
								</Button>
							)}
						</div>
					</ModernModalFooter>
				}
			>
				{order && (
					<div className="space-y-3 py-1">
						{/* Ultra-Compact Lifecycle Tracker (Conserves maximum vertical screen) */}
						<OrderStatusStepper
							order={order}
							onOpenFullTimeline={() => setIsTimelineOpen(true)}
							onStepAction={(stepId) => {
								if (isSale && stepId !== "POSTED") return;
								if (stepId === "COMPLETED" && order.status === "APPROVED") {
									if (canIssueInvoice) setIsInvoiceOpen(true);
								} else if (stepId === "APPROVED" && order.status === "POSTED") {
									if (canApproveSpecial) {
										setApprovalScope("AUTO");
										setIsApproveOpen(true);
									} else if (canApproveSale && !order.saleManagerApproved) {
										setApprovalScope("SALE_MANAGER");
										setIsApproveOpen(true);
									} else if (canVerifyStock) {
										setIsVerifyOpen(true);
									}
								} else if (stepId === "POSTED" && order.status === "DRAFT") {
									if (canPostOrder) postMutation.mutate(order.id);
								}
							}}
						/>

						{/* Main Content Focused on Product Items */}
						<ModernTabs value={activeTab} onValueChange={setActiveTab}>
							<div className="flex items-center justify-between pb-2">
								<ModernTabsList variant="glass" size="sm" className="h-8 p-0.5">
									<ModernTabsTrigger
										value="orderitems"
										icon={<ShoppingCart className="h-3.5 w-3.5" />}
										badge={
											addons.length > 0
												? `${items.length} (+${addons.length})`
												: items.length
										}
										badgeColor="indigo"
										className="text-xs px-3 py-1"
									>
										Product Items
									</ModernTabsTrigger>

									<ModernTabsTrigger
										value="customer-warehouse"
										icon={<User className="h-3.5 w-3.5" />}
										className="text-xs px-3 py-1"
									>
										Customer & Delivery
									</ModernTabsTrigger>

									<ModernTabsTrigger
										value="dual-approved"
										icon={<ShieldCheck className="h-3.5 w-3.5" />}
										badge={isDualApproved ? "Approved" : "Pending"}
										badgeColor={isDualApproved ? "emerald" : "amber"}
										className="text-xs px-3 py-1"
									>
										Signoffs
									</ModernTabsTrigger>
								</ModernTabsList>
							</div>

							{/* TAB 1: HERO VIEW - Product Items with Prominent Thumbnails */}
							<ModernTabsContent value="orderitems" className="space-y-3">
								<div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
									<table className="w-full text-left text-xs">
										<thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800">
											<tr>
												<th className="p-3 min-w-[260px]">Product Item</th>
												<th className="p-3 w-20 text-center">Unit</th>
												<th className="p-3 w-24 text-center">Qty</th>
												<th className="p-3 w-28 text-right">Unit Price</th>
												<th className="p-3 w-24 text-right">Discount</th>
												<th className="p-3 w-32 text-right">Line Total</th>
												<th className="p-3 w-32 text-center">Stock Check</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
											{items.length > 0 ? (
												items.map((item: OrderItem, idx: number) => {
													const qty = Number(item.quantity) || 1;
													const price = Number(item.unitPrice) || 0;
													const disc = Number(item.discount) || 0;
													const total =
														Number(item.totalAmount || item.totalPrice) ||
														qty * price;

													const rawImage =
														(item as any).imageUrl ||
														(item as any).productImageUrl ||
														(item as any).product?.imageUrl ||
														(item as any).thumbnail ||
														(item as any).image;

													return (
														<tr
															key={item.id || idx}
															className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
														>
															{/* Product Thumbnail & Details (HERO FOCUS) */}
															<td className="p-3">
																<div className="flex items-center gap-3.5">
																	<SafeProductThumbnail
																		src={rawImage}
																		alt={item.productName || "Product"}
																		onPreview={(url, title) =>
																			setPreviewImage({ url, title })
																		}
																	/>
																	<div className="min-w-0 space-y-0.5">
																		<div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
																			{item.productName || `Item #${item.id}`}
																		</div>
																		{item.availableStock !== undefined && (
																			<div className="flex items-center gap-1.5 pt-0.5 text-xs">
																				<span
																					className={`inline-flex items-center gap-1 text-[11px] font-medium ${
																						item.availableStock < qty
																							? "text-rose-600 dark:text-rose-400 font-semibold"
																							: "text-emerald-600 dark:text-emerald-400"
																					}`}
																				>
																					<span
																						className={`h-1.5 w-1.5 rounded-full ${
																							item.availableStock < qty
																								? "bg-rose-500 animate-pulse"
																								: "bg-emerald-500"
																						}`}
																					/>
																					{item.availableStock} in stock
																					{item.availableStock < qty &&
																						" (Shortage)"}
																				</span>
																			</div>
																		)}
																	</div>
																</div>
															</td>

															{/* Unit */}
															<td className="p-3 text-center">
																<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
																	{item.unitName || "PCS"}
																</span>
															</td>

															{/* Quantity */}
															<td className="p-3 text-center">
																{order.status === "DRAFT" && canCreateOrder ? (
																	<input
																		type="number"
																		min="1"
																		value={item.quantity}
																		onChange={(e) =>
																			handleEditableItemChange(
																				idx,
																				"quantity",
																				Number(e.target.value),
																			)
																		}
																		className="w-14 h-8 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold text-slate-900 dark:text-slate-100 shadow-2xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all mx-auto block"
																	/>
																) : (
																	<span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
																		{qty}
																	</span>
																)}
															</td>

															{/* Unit Price */}
															<td className="p-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 text-xs font-medium">
																$
																{price.toLocaleString(undefined, {
																	minimumFractionDigits: 2,
																})}
															</td>

															{/* Discount */}
															<td className="p-3 text-right">
																{order.status === "DRAFT" && canCreateOrder ? (
																	<div className="inline-flex items-center justify-end">
																		<div className="flex items-center h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
																			<input
																				type="number"
																				step="0.01"
																				min="0"
																				value={item.discount || ""}
																				placeholder="0"
																				onChange={(e) =>
																					handleEditableItemChange(
																						idx,
																						"discount",
																						Number(e.target.value),
																					)
																				}
																				className="w-12 h-full text-right px-1.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent outline-none tabular-nums"
																			/>
																			<select
																				value={item.discountType || "FLAT"}
																				onChange={(e) =>
																					handleEditableItemChange(
																						idx,
																						"discountType",
																						e.target.value,
																					)
																				}
																				className="h-full px-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
																			>
																				<option value="FLAT">$</option>
																				<option value="PERCENTAGE">%</option>
																			</select>
																		</div>
																	</div>
																) : disc > 0 ? (
																	<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-mono">
																		{item.discountType === "PERCENTAGE"
																			? `${disc}% off`
																			: `-$${disc.toFixed(2)}`}
																	</span>
																) : (
																	<span className="text-slate-400 font-mono text-xs">
																		—
																	</span>
																)}
															</td>

															{/* Line Total */}
															<td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 text-xs">
																$
																{total.toLocaleString(undefined, {
																	minimumFractionDigits: 2,
																})}
															</td>

															{/* Stock Verification Status Badge */}
															<td className="p-3 text-center">
																{item.isVerified ? (
																	<Badge
																		variant="outline"
																		className="bg-emerald-50/70 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] gap-1 py-0.5"
																	>
																		<CheckCircle2 className="h-3 w-3 text-emerald-600" />
																		<span>
																			Verified ({item.verifiedQuantity ?? qty})
																		</span>
																	</Badge>
																) : (
																	<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
																		Unverified
																	</span>
																)}
															</td>
														</tr>
													);
												})
											) : (
												<tr>
													<td
														colSpan={7}
														className="p-8 text-center text-slate-400 text-xs"
													>
														No line items listed in this order.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>

								{/* Add-Ons Table (Complimentary Gifts / Add-ons) */}
								{addons && addons.length > 0 && (
									<div className="space-y-1.5 pt-1">
										<div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
											<Gift className="h-3.5 w-3.5 text-purple-600" />
											<span>
												Complimentary Gifts & Add-Ons ({addons.length})
											</span>
										</div>
										<div className="overflow-x-auto rounded-2xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/20 shadow-2xs">
											<table className="w-full text-left text-xs">
												<thead className="bg-purple-100/50 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 font-bold border-b border-purple-200 dark:border-purple-800">
													<tr>
														<th className="p-2.5">Add-On Item</th>
														<th className="p-2.5 w-24 text-center">Unit</th>
														<th className="p-2.5 w-20 text-center">Qty</th>
														<th className="p-2.5 w-28 text-right">
															Unit Price
														</th>
														<th className="p-2.5 w-28 text-right">Total</th>
														<th className="p-2.5 w-32 text-center">
															Verification
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-purple-100 dark:divide-purple-900/40">
													{addons.map((addon: any, aIdx: number) => {
														const aQty = Number(addon.quantity) || 1;
														const aPrice = Number(addon.unitPrice) || 0;
														const aTotal =
															Number(addon.totalAmount || addon.totalPrice) ||
															aQty * aPrice;
														const aRawImg =
															addon.imageUrl ||
															addon.productImageUrl ||
															addon.product?.imageUrl;

														return (
															<tr
																key={addon.id || aIdx}
																className="hover:bg-purple-100/30 dark:hover:bg-purple-900/30"
															>
																<td className="p-2.5">
																	<div className="flex items-center gap-2.5">
																		<SafeProductThumbnail
																			src={aRawImg}
																			alt={addon.productName || "Addon"}
																			onPreview={(url, title) =>
																				setPreviewImage({ url, title })
																			}
																		/>
																		<div>
																			<div className="font-bold text-purple-950 dark:text-purple-200 text-xs">
																				{addon.productName ||
																					addon.name ||
																					addon.description ||
																					`Add-on #${addon.id || aIdx + 1}`}
																			</div>
																			{addon.availableStock !== undefined && (
																				<div className="text-[9px] font-mono mt-0.5 flex items-center gap-1">
																					<span className="text-purple-400">
																						Stock:
																					</span>
																					<strong
																						className={
																							addon.availableStock < aQty
																								? "text-rose-600 dark:text-rose-400 font-bold"
																								: "text-emerald-600 dark:text-emerald-400 font-bold"
																						}
																					>
																						{addon.availableStock} avail
																					</strong>
																				</div>
																			)}
																		</div>
																	</div>
																</td>
																<td className="p-2.5 text-center">
																	<Badge
																		variant="secondary"
																		className="text-[10px] px-1.5 py-0 font-mono bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
																	>
																		{addon.unitName || "PCS"}
																	</Badge>
																</td>
																<td className="p-2.5 text-center font-mono font-bold text-purple-900 dark:text-purple-200">
																	{aQty}
																</td>
																<td className="p-2.5 text-right font-mono text-purple-700 dark:text-purple-300">
																	{aPrice === 0
																		? "FREE"
																		: `$${aPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
																</td>
																<td className="p-2.5 text-right font-mono font-bold text-purple-900 dark:text-purple-200">
																	{aTotal === 0
																		? "FREE ($0.00)"
																		: `$${aTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
																</td>
																<td className="p-2.5 text-center">
																	{addon.isVerified ? (
																		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
																			<CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
																			Verified ({addon.verifiedQuantity ?? aQty})
																		</span>
																	) : (
																		<span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
																			Unverified
																		</span>
																	)}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								)}

								{/* Financial Summary & Order Notes (Receipt Card) */}
								<div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs items-center">
									{/* Notes Section (Compact & Professional) */}
									<div className="md:col-span-6 space-y-1.5">
										<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
											<FileText className="h-3 w-3" />
											<span>Order Notes</span>
										</div>

										{order.customerNote || order.internalNote ? (
											<div className="space-y-1.5">
												{order.customerNote && (
													<div className="p-2 rounded-lg bg-white dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 text-[11px]">
														<span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">
															Customer:
														</span>
														<span className="text-slate-700 dark:text-slate-300 font-medium">
															{order.customerNote}
														</span>
													</div>
												)}
												{order.internalNote && (
													<div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-[11px]">
														<span className="font-bold text-amber-700 dark:text-amber-400 mr-1.5">
															Internal:
														</span>
														<span className="text-amber-900 dark:text-amber-200 font-medium">
															{order.internalNote}
														</span>
													</div>
												)}
											</div>
										) : (
											<div className="px-2.5 py-2 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 italic">
												No customer or internal notes attached.
											</div>
										)}
									</div>

									{/* Financial Breakdown Receipt */}
									<div className="md:col-span-6 space-y-1 text-right md:pl-4 md:border-l md:border-slate-200/80 md:dark:border-slate-800 flex flex-col justify-center">
										<div className="flex justify-between text-slate-600 dark:text-slate-400">
											<span>Subtotal ({items.length} items):</span>
											<span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
												$
												{(
													Number(order.subtotal || order.totalAmount) || 0
												).toLocaleString(undefined, {
													minimumFractionDigits: 2,
												})}
											</span>
										</div>

										{(Number(order.discountAmount || order.discount) || 0) >
											0 && (
											<div className="flex justify-between text-amber-600 dark:text-amber-400">
												<span>Order Discount:</span>
												<span className="font-mono tabular-nums font-semibold">
													-$
													{(
														Number(order.discountAmount || order.discount) || 0
													).toLocaleString(undefined, {
														minimumFractionDigits: 2,
													})}
												</span>
											</div>
										)}

										{(Number(order.shippingAmount) || 0) > 0 && (
											<div className="flex justify-between text-slate-600 dark:text-slate-400">
												<span>Shipping Fee:</span>
												<span className="font-mono tabular-nums font-semibold">
													+$
													{(Number(order.shippingAmount) || 0).toLocaleString(
														undefined,
														{ minimumFractionDigits: 2 },
													)}
												</span>
											</div>
										)}

										{(Number(order.taxAmount) || 0) > 0 && (
											<div className="flex justify-between text-slate-600 dark:text-slate-400">
												<span>Tax Fee:</span>
												<span className="font-mono tabular-nums font-semibold">
													+$
													{(Number(order.taxAmount) || 0).toLocaleString(
														undefined,
														{ minimumFractionDigits: 2 },
													)}
												</span>
											</div>
										)}

										<div className="flex justify-between items-baseline pt-2 mt-1 border-t border-slate-200 dark:border-slate-800">
											<span className="font-bold text-slate-900 dark:text-slate-100">
												Total Amount:
											</span>
											<span className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-slate-50">
												$
												{(Number(order.totalAmount) || 0).toLocaleString(
													undefined,
													{ minimumFractionDigits: 2 },
												)}
											</span>
										</div>
									</div>
								</div>
							</ModernTabsContent>

							{/* TAB 2: Customer & Delivery (Optional Data) */}
							<ModernTabsContent
								value="customer-warehouse"
								className="pt-2 space-y-4"
							>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Customer Profile Card */}
									<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
										<div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
											<User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
											<span>Customer Profile & Destination</span>
										</div>
										<div className="text-xs space-y-2 text-slate-600 dark:text-slate-400 pt-0.5">
											<div className="flex justify-between">
												<span className="text-slate-400">Name:</span>
												<strong className="text-slate-900 dark:text-slate-100 font-semibold">
													{order.customerName || order.customer?.name || "—"}
												</strong>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-400">Phone:</span>
												<span className="font-mono text-slate-700 dark:text-slate-300">
													{order.customer?.phone || "—"}
												</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-400">Email:</span>
												<span className="text-slate-700 dark:text-slate-300">
													{order.customer?.email || "—"}
												</span>
											</div>
											{order.shippingAddress?.customerAddress && (
												<div className="flex justify-between">
													<span className="text-slate-400">Destination:</span>
													<strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
														{order.shippingAddress.customerAddress}
													</strong>
												</div>
											)}
											<div>
												<span className="text-slate-400">Street / Info:</span>
												<div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
													{order.shippingAddress?.homeInfo ||
														order.customer?.address ||
														"—"}
												</div>
											</div>
										</div>
									</div>

									{/* Fulfillment & Logistics Card */}
									<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
										<div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
											<Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
											<span>Fulfillment & Logistics Carrier</span>
										</div>
										<div className="text-xs space-y-2 text-slate-600 dark:text-slate-400 pt-0.5">
											<div className="flex justify-between">
												<span className="text-slate-400">Warehouse:</span>
												<strong className="text-slate-900 dark:text-slate-100 font-semibold">
													{order.warehouseName ||
														`Warehouse #${order.warehouseId || 1}`}
												</strong>
											</div>

											{order.delivery && (
												<div className="flex justify-between items-center">
													<span className="text-slate-400">Delivery:</span>
													<div className="text-right">
														<strong className="text-purple-600 dark:text-purple-400 font-semibold">
															{order.delivery.name} (
															{order.delivery.deliveryType || "Carrier"})
														</strong>
														{order.delivery.lat !== undefined &&
															order.delivery.lat !== null && (
																<span className="block font-mono text-[10px] text-slate-400">
																	[{order.delivery.lat}, {order.delivery.lng}]
																</span>
															)}
													</div>
												</div>
											)}

											{order.paymentTerm && (
												<div>
													<div className="flex justify-between">
														<span className="text-slate-400">Payment Term:</span>
														<strong className="text-indigo-600 dark:text-indigo-400 font-semibold">
															{order.paymentTerm.name} (
															{order.paymentTerm.dueDays === 0
																? "Immediate / COD"
																: `Due in ${order.paymentTerm.dueDays}d`}
															{Array.isArray(order.paymentTerm.conditions) &&
															order.paymentTerm.conditions.length > 0
																? ` • ${order.paymentTerm.conditions.length} tier(s)`
																: order.paymentTerm.discountPercentage
																	? `, -${order.paymentTerm.discountPercentage}%`
																	: ""}
															)
														</strong>
													</div>
													{Array.isArray(order.paymentTerm.conditions) &&
														order.paymentTerm.conditions.length > 0 && (
															<div className="mt-1 flex flex-wrap gap-1">
																{order.paymentTerm.conditions.map(
																	(c: any, i: number) => (
																		<span
																			key={i}
																			className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
																		>
																			{c.discountDays === 0
																				? "Immediate"
																				: `≤${c.discountDays}d`}
																			: {c.discount}%
																		</span>
																	),
																)}
															</div>
														)}
												</div>
											)}

											<div className="flex justify-between">
												<span className="text-slate-400">Sales Staff:</span>
												<span className="text-slate-900 dark:text-slate-100 font-medium">
													{order.staffInfo
														? `${order.staffInfo.firstname || ""} ${order.staffInfo.lastname || ""}`
														: "Sales Representative"}
												</span>
											</div>

											<div className="flex justify-between">
												<span className="text-slate-400">Staff Phone:</span>
												<span className="font-mono text-slate-700 dark:text-slate-300">
													{order.staffInfo?.primaryPhone || "—"}
												</span>
											</div>
										</div>
									</div>
								</div>
							</ModernTabsContent>

							{/* TAB 3: Signoffs & Approvals (Optional Data) */}
							<ModernTabsContent value="dual-approved" className="pt-2 space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Card 1: Sale Manager Pricing Approval */}
									<div
										className={`p-4 rounded-2xl border transition-all ${
											order.saleManagerApproved
												? "bg-emerald-50/40 border-emerald-300/80 dark:bg-emerald-950/20"
												: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
										} space-y-3 shadow-2xs`}
									>
										<div className="flex items-center justify-between text-xs font-bold">
											<span className="text-slate-900 dark:text-slate-100">
												1. Sale Manager Pricing Approval
											</span>
											{order.saleManagerApproved ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : (
												<Clock className="h-4 w-4 text-amber-500" />
											)}
										</div>

										<div className="text-xs space-y-1">
											<div className="text-slate-600 dark:text-slate-400">
												Status:{" "}
												<strong
													className={
														order.saleManagerApproved
															? "text-emerald-700 dark:text-emerald-400"
															: "text-amber-600"
													}
												>
													{order.saleManagerApproved
														? "Pricing Approved"
														: "Pending Manager Approval"}
												</strong>
											</div>
											{order.saleManagerApprovedAt && (
												<div className="text-[11px] font-mono text-slate-400">
													Approved at:{" "}
													{new Date(order.saleManagerApprovedAt).toLocaleString()}
												</div>
											)}
										</div>

										{!order.saleManagerApproved &&
											order.status === "POSTED" && (
												<div className="pt-2">
													<Button
														size="sm"
														disabled={isSale || !canApproveSale}
														onClick={() => {
															setApprovalScope("SALE_MANAGER");
															setIsApproveOpen(true);
														}}
														className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-bold shadow-xs disabled:opacity-50"
													>
														<UserCheck className="h-3.5 w-3.5 mr-1.5" />
														<span>Approve as Sale Manager</span>
													</Button>
												</div>
											)}
									</div>

									{/* Card 2: Stockkeeper Physical Verification */}
									<div
										className={`p-4 rounded-2xl border transition-all ${
											order.stockkeeperApproved
												? "bg-emerald-50/40 border-emerald-300/80 dark:bg-emerald-950/20"
												: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
										} space-y-3 shadow-2xs`}
									>
										<div className="flex items-center justify-between text-xs font-bold">
											<span className="text-slate-900 dark:text-slate-100">
												2. Stockkeeper Physical Verification
											</span>
											{order.stockkeeperApproved ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : order.saleManagerApproved ? (
												<Boxes className="h-4 w-4 text-blue-500" />
											) : (
												<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
													LOCKED
												</span>
											)}
										</div>

										<div className="text-xs space-y-1">
											<div className="text-slate-600 dark:text-slate-400">
												Status:{" "}
												<strong
													className={
														order.stockkeeperApproved
															? "text-emerald-700 dark:text-emerald-400"
															: order.saleManagerApproved
																? "text-blue-600 dark:text-blue-400"
																: "text-slate-400"
													}
												>
													{order.stockkeeperApproved
														? "Verified & Approved"
														: order.saleManagerApproved
															? "Ready for Item Verification"
															: "Locked (Awaiting Sale Manager)"}
												</strong>
											</div>
											{order.stockkeeperApprovedAt && (
												<div className="text-[11px] font-mono text-slate-400">
													Approved at:{" "}
													{new Date(order.stockkeeperApprovedAt).toLocaleString()}
												</div>
											)}
										</div>

										{!order.stockkeeperApproved &&
											order.status === "POSTED" && (
												<div className="pt-2">
													<Button
														size="sm"
														variant="outline"
														disabled={
															isSale || !canVerifyStock || !order.saleManagerApproved
														}
														onClick={() => setIsVerifyOpen(true)}
														className="w-full text-xs rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold disabled:opacity-50"
													>
														<Boxes className="h-3.5 w-3.5 mr-1.5" />
														<span>
															{order.saleManagerApproved
																? "Open Item Verification"
																: "Locked (Awaiting Manager)"}
														</span>
													</Button>
												</div>
											)}
									</div>
								</div>
							</ModernTabsContent>
						</ModernTabs>
					</div>
				)}
			</ModernModal>

			{/* Full-resolution Product Image Lightbox Modal */}
			{previewImage && (
				<ModernModal
					isOpen={Boolean(previewImage)}
					onClose={() => setPreviewImage(null)}
					title={previewImage.title || "Product Image Preview"}
					subtitle="High-resolution product photo inspection"
					size="md"
					glassmorphism={true}
				>
					<div className="flex flex-col items-center justify-center p-3">
						<div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-md p-1">
							<img
								src={previewImage.url}
								alt={previewImage.title}
								className="max-h-[60vh] max-w-full rounded-xl object-contain mx-auto"
							/>
						</div>
						<div className="mt-3 text-center">
							<div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
								{previewImage.title}
							</div>
						</div>
					</div>
				</ModernModal>
			)}

			{/* Sub Modals */}
			<PosOrderStudioModal
				open={isPosStudioOpen}
				onOpenChange={setIsPosStudioOpen}
				editingOrder={order || null}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ["order-detail", orderId],
					});
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
				}}
			/>


			<WarehouseVerifyModal
				order={order || null}
				open={isVerifyOpen}
				onOpenChange={setIsVerifyOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ["order-detail", orderId],
					});
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<OrderApprovalModal
				order={order || null}
				open={isApproveOpen}
				onOpenChange={setIsApproveOpen}
				initialApprovalType={approvalScope}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ["order-detail", orderId],
					});
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
				}}
			/>

			<IssueInvoiceModal
				order={order || null}
				open={isInvoiceOpen}
				onOpenChange={setIsInvoiceOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ["order-detail", orderId],
					});
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					queryClient.invalidateQueries({ queryKey: ["invoices"] });
					queryClient.invalidateQueries({ queryKey: ["invoices-search-v1"] });
					queryClient.invalidateQueries({ queryKey: ["invoice-details"] });
				}}
			/>

			<OrderActionReasonModal
				open={isUnpostOpen}
				onOpenChange={setIsUnpostOpen}
				title="Unpost Order back to DRAFT?"
				description="Unposting will release reserved stock back to available inventory and reset approval flags so items/prices can be edited."
				confirmLabel="Confirm Unpost"
				variant="amber"
				isLoading={unpostMutation.isPending}
				onConfirm={(reason) => unpostMutation.mutate(reason)}
			/>

			<OrderActionReasonModal
				open={isVoidOpen}
				onOpenChange={setIsVoidOpen}
				title="Void Order?"
				description="Voiding this order will release all reserved inventory stock back to available warehouse balance and mark the order as void."
				confirmLabel="Confirm Void"
				variant="destructive"
				isLoading={voidMutation.isPending}
				onConfirm={(reason) => voidMutation.mutate(reason)}
			/>

			<OrderActionReasonModal
				open={isMoveToDraftOpen}
				onOpenChange={setIsMoveToDraftOpen}
				title="Move Order to DRAFT?"
				description="Returning this voided order to DRAFT will allow editing items, quantities, pricing, and re-submitting for posting."
				confirmLabel="Confirm Move to Draft"
				variant="amber"
				isLoading={moveToDraftMutation.isPending}
				onConfirm={(reason) => moveToDraftMutation.mutate(reason)}
			/>

			<OrderActionReasonModal
				open={isUnapproveOpen}
				onOpenChange={setIsUnapproveOpen}
				title="Reset Signoffs / Unapprove to DRAFT?"
				description="Unapproving will revoke all manager and stockkeeper approval sign-offs, release reserved stock back to available inventory, and return the order to DRAFT for item/pricing modifications."
				confirmLabel="Confirm Reset Signoffs"
				variant="amber"
				isLoading={unApproveMutation.isPending}
				onConfirm={(reason) => unApproveMutation.mutate(reason)}
			/>

			<OrderActionReasonModal
				open={isRejectOpen}
				onOpenChange={setIsRejectOpen}
				title="Reject Order back to POSTED?"
				description="Accountant rejection returns approved order to POSTED status for fixes and resets approval flags."
				confirmLabel="Confirm Rejection"
				variant="destructive"
				isLoading={rejectMutation.isPending}
				onConfirm={(reason) => rejectMutation.mutate(reason)}
			/>

			<OrderTimelineDrawer
				orderId={orderId}
				orderNumber={order?.orderNumber || order?.orderNo}
				open={isTimelineOpen}
				onOpenChange={setIsTimelineOpen}
			/>
		</>
	);
}

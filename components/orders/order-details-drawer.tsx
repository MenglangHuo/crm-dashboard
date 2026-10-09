"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, fileUrl } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Order, OrderItem } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
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
	Copy,
} from "lucide-react";

interface OrderDetailsDrawerProps {
	orderId: string | number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function SafeItemImage({ src, alt }: { src?: string; alt: string }) {
	const [error, setError] = useState(false);
	const fullUrl = src ? fileUrl(src) : undefined;

	if (!fullUrl || error) {
		return (
			<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
				<Package className="h-5 w-5" />
			</div>
		);
	}

	return (
		<img
			src={fullUrl}
			alt={alt}
			onError={() => setError(true)}
			className="h-10 w-10 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
		/>
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
	const [isCloneStudioOpen, setIsCloneStudioOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("orderitems");

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

	return (
		<>
			<ModernModal
				isOpen={open && !isPosStudioOpen && !isCloneStudioOpen}
				onClose={() => {
					onOpenChange(false);
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
				}}
				title={`Order Inspector: ${order?.orderNumber || order?.orderNo || `#${orderId}`}`}
				subtitle="Detailed view of order items, physical verification, dual approvals, and action lifecycle."
				icon={<Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
				size="xl"
				glassmorphism={true}
				draggable={true}
				resizable={true}
				isLoading={isLoading}
				loadingText="Fetching order details..."
				footer={
					<ModernModalFooter className="flex items-center justify-between w-full">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsTimelineOpen(true)}
							className="rounded-xl text-xs gap-1.5 border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300"
						>
							<History className="h-3.5 w-3.5 text-indigo-600" /> Full Audit
							Timeline
						</Button>

						<div className="flex items-center gap-2">
							{order && order.status === "DRAFT" && (
								<>
									{canCreateOrder && (
										<>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setIsPosStudioOpen(true)}
												className="h-9 px-3.5 rounded-xl border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs shadow-2xs gap-1.5"
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
												className="h-9 px-4 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-bold text-xs shadow-2xs gap-1.5 transition-all"
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

									{canPostOrder && (
										<Button
											type="button"
											size="sm"
											onClick={() => postMutation.mutate(order.id)}
											disabled={postMutation.isPending}
											className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md gap-1.5 transition-all"
										>
											{postMutation.isPending ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Send className="h-3.5 w-3.5 fill-current" />
											)}
											<span>Post Order (Reserve Stock)</span>
										</Button>
									)}
								</>
							)}

							{order && canCreateOrder && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => setIsCloneStudioOpen(true)}
									className="h-9 px-3.5 rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-bold text-xs shadow-2xs gap-1.5"
									title="Create a new sales order cloned from this order"
								>
									<Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
									<span>Clone Order</span>
								</Button>
							)}

							{order && order.status === "VOID" && canVoidOrder && (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => setIsMoveToDraftOpen(true)}
									className="h-9 px-4 rounded-xl border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs shadow-2xs gap-1.5 transition-all"
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
					<div className="space-y-4 py-1">
						{/* Stepper Lifecycle Header */}
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
									} else if (canApproveSale) {
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

						{/* Stage Action Controls Toolbar */}
						<div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Stage Actions:
								</span>
								<Badge
									variant="outline"
									className="text-[10px] font-mono font-semibold py-0.5 border-slate-300 dark:border-slate-700"
								>
									{order.status === "DRAFT" && "📦 Stock: Untouched"}
									{order.status === "POSTED" &&
										"🔒 Stock: Reserved (Allocated)"}
									{order.status === "APPROVED" &&
										"🔒 Stock: Reserved (Dual-Signed)"}
									{order.status === "COMPLETED" && "💰 Stock: Sold (Deducted)"}
									{order.status === "REFUNDED" &&
										"🔄 Stock: Restocked (Returned)"}
									{order.status === "CANCELLED" && "🚫 Stock: Released"}
									{order.status === "VOID" && "🚫 Stock: Released"}
								</Badge>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								{/* DRAFT -> Actions */}
								{order.status === "DRAFT" && (
									<>
										{canCreateOrder && (
											<Button
												size="sm"
												onClick={() => setIsPosStudioOpen(true)}
												className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-bold shadow-xs gap-1.5"
											>
												<ShoppingCart className="h-3.5 w-3.5" /> Edit in POS
												Ordering Studio
											</Button>
										)}
										{canVoidOrder && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsVoidOpen(true)}
												className="text-xs rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-medium gap-1"
											>
												<Ban className="h-3.5 w-3.5" /> Void Order
											</Button>
										)}
									</>
								)}

								{/* POSTED Stage Actions */}
								{order.status === "POSTED" && (
									<>
										{/* Step 1: Sale Manager Approve */}
										{(canApproveSale || isSale) && (
											<Button
												size="sm"
												variant={!order.saleManagerApproved ? "default" : "outline"}
												disabled={isSale || !canApproveSale || Boolean(order.saleManagerApproved)}
												onClick={() => {
													setApprovalScope("SALE_MANAGER");
													setIsApproveOpen(true);
												}}
												className={`text-xs rounded-xl font-semibold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
													!order.saleManagerApproved
														? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs animate-pulse"
														: "border-indigo-300 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300"
												}`}
												title={
													isSale
														? "Sale Manager Approve (Restricted for Sale role)"
														: order.saleManagerApproved
															? "Sale Manager has already approved this order"
															: undefined
												}
											>
												<UserCheck className="h-3.5 w-3.5" />
												{order.saleManagerApproved
													? "✓ Sale Manager Approved"
													: "1. Sale Manager Approve"}
											</Button>
										)}

										{/* Step 2: Stockkeeper Physical Verification */}
										{(canVerifyStock || isSale) && (
											<Button
												size="sm"
												variant={order.saleManagerApproved && !order.stockkeeperApproved ? "default" : "outline"}
												disabled={isSale || !canVerifyStock || !order.saleManagerApproved}
												onClick={() => setIsVerifyOpen(true)}
												className={`text-xs rounded-xl font-semibold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
													order.saleManagerApproved && !order.stockkeeperApproved
														? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
														: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300"
												}`}
												title={
													!order.saleManagerApproved
														? "Sale Manager must approve the order before stock verification can begin"
														: isSale
															? "Stockkeeper Physical Verification (Restricted for Sale role)"
															: undefined
												}
											>
												<Boxes className="h-3.5 w-3.5" />
												{order.stockkeeperApproved
													? "✓ Items Verified"
													: "2. Physical Verification"}
											</Button>
										)}

										{(canApproveSpecial || isSale) && (
											<Button
												size="sm"
												disabled={isSale || !canApproveSpecial}
												onClick={() => {
													setApprovalScope("AUTO");
													setIsApproveOpen(true);
												}}
												className="bg-slate-800 hover:bg-slate-900 text-white text-xs rounded-xl font-semibold shadow-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
												title={
													isSale
														? "Smart Dual-Approve (Restricted for Sale role)"
														: undefined
												}
											>
												<ShieldCheck className="h-3.5 w-3.5" /> Smart Bypass
											</Button>
										)}

										{(canUnpostOrder || isSale) && (
											<Button
												size="sm"
												variant="outline"
												disabled={isSale || !canUnpostOrder}
												onClick={() => setIsUnpostOpen(true)}
												className="text-xs rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 font-medium gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
												title={
													isSale
														? "Unpost to Draft (Restricted for Sale role)"
														: undefined
												}
											>
												<RotateCcw className="h-3.5 w-3.5" /> Unpost to Draft
											</Button>
										)}

										{canVoidOrder && !isSale && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsVoidOpen(true)}
												className="text-xs rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-medium gap-1"
											>
												<Ban className="h-3.5 w-3.5" /> Void Order
											</Button>
										)}
									</>
								)}

								{/* APPROVED Stage Actions */}
								{order.status === "APPROVED" && (
									<>
										{canIssueInvoice && (
											<Button
												size="sm"
												onClick={() => setIsInvoiceOpen(true)}
												className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-semibold shadow-xs gap-1.5"
											>
												<Receipt className="h-3.5 w-3.5" /> Issue Invoice
												(Accountant)
											</Button>
										)}

										{canUnapproveOrder && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsUnapproveOpen(true)}
												className="text-xs rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 font-semibold gap-1.5"
												title="Reset all approval signoffs and return order to Draft"
											>
												<RotateCcw className="h-3.5 w-3.5" /> Reset Signoffs (To
												Draft)
											</Button>
										)}

										{canRejectOrder && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsRejectOpen(true)}
												className="text-xs rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-medium gap-1.5"
											>
												<XCircle className="h-3.5 w-3.5" /> Reject to Posted
											</Button>
										)}
									</>
								)}

								{/* COMPLETED Stage Info */}
								{order.status === "COMPLETED" && (
									<Badge className="bg-emerald-600 text-white text-xs py-1 px-3">
										✓ Invoiced & Completed
									</Badge>
								)}

								{/* REFUNDED Stage Info */}
								{order.status === "REFUNDED" && (
									<Badge className="bg-purple-600 text-white text-xs py-1 px-3">
										✓ Credit Note Refunded
									</Badge>
								)}

								{/* VOID Stage Actions */}
								{order.status === "VOID" && (
									<>
										{canVoidOrder && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setIsMoveToDraftOpen(true)}
												className="text-xs rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 font-semibold gap-1.5"
											>
												<RotateCcw className="h-3.5 w-3.5" /> Move to Draft
											</Button>
										)}
									</>
								)}
							</div>
						</div>

						{/* Re-approval Notice if Stockkeeper adjusted quantities */}
						{order.status === "POSTED" &&
							!order.saleManagerApproved &&
							(order.stockVerificationStatus === "PARTIAL_CHECK" ||
								(order.verifiedItemCount ?? 0) > 0) && (
								<div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-2xs">
									<AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
									<div className="space-y-1">
										<div className="font-bold text-slate-900 dark:text-slate-100">
											Action Required: Awaiting Sale Manager Re-Approval
										</div>
										<div className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
											Stockkeeper adjusted item quantities due to stock shortage.
											The Sale Manager must review and re-approve the updated totals, or Unpost the order to DRAFT for modification.
										</div>
									</div>
								</div>
							)}

						{/* Modern Tabs Section */}
						<ModernTabs value={activeTab} onValueChange={setActiveTab}>
							<ModernTabsList variant="glass" size="md">
								<ModernTabsTrigger
									value="orderitems"
									icon={<ShoppingCart className="h-4 w-4" />}
									badge={
										addons.length > 0
											? `${items.length} (+${addons.length})`
											: items.length
									}
									badgeColor="purple"
								>
									Order Items
								</ModernTabsTrigger>

								<ModernTabsTrigger
									value="customer-warehouse"
									icon={<User className="h-4 w-4" />}
								>
									Customer & Warehouse
								</ModernTabsTrigger>

								<ModernTabsTrigger
									value="dual-approved"
									icon={<ShieldCheck className="h-4 w-4" />}
									badge={order.isFullyApproved ? "Approved" : "Pending"}
									badgeColor={order.isFullyApproved ? "emerald" : "amber"}
								>
									Dual Approved
								</ModernTabsTrigger>
							</ModernTabsList>

							{/* Tab 1: Order Items Table & Financial Breakdown */}
							<ModernTabsContent value="orderitems" className="pt-3 space-y-3">
								<div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
									<table className="w-full text-left text-xs">
										<thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
											<tr>
												<th className="p-3">Product Item</th>
												<th className="p-3 w-20">Unit</th>
												<th className="p-3 w-20 text-center">Qty</th>
												<th className="p-3 w-24 text-right">Unit Price</th>
												<th className="p-3 w-24 text-right">Discount</th>
												<th className="p-3 w-28 text-right">Line Total</th>
												<th className="p-3 w-32 text-center">
													Stock Verification
												</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
											{items.length > 0 ? (
												items.map((item: OrderItem, idx: number) => {
													const qty = Number(item.quantity) || 1;
													const price = Number(item.unitPrice) || 0;
													const disc = Number(item.discount) || 0;
													const total =
														Number(item.totalAmount || item.totalPrice) ||
														qty * price;

													return (
														<tr
															key={item.id || idx}
															className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
														>
															{/* Product Thumbnail & Details */}
															<td className="p-3">
																<div className="flex items-center gap-3">
																	<SafeItemImage
																		src={
																			(item as any).imageUrl ||
																			(item as any).productImageUrl
																		}
																		alt={item.productName || "Product"}
																	/>
																	<div className="min-w-0">
																		<div className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
																			{item.productName || `Item #${item.id}`}
																		</div>
																		<div className="text-[11px] font-mono text-slate-400">
																			SKU:{" "}
																			<strong className="text-slate-600 dark:text-slate-300">
																				{item.sku || "—"}
																			</strong>
																		</div>
																		{item.availableStock !== undefined && (
																			<div className="text-[10px] font-mono mt-0.5 flex items-center gap-1.5">
																				<span className="text-slate-400">Stock:</span>
																				<strong
																					className={
																						item.availableStock < qty
																							? "text-rose-600 dark:text-rose-400 font-bold"
																							: "text-emerald-600 dark:text-emerald-400 font-bold"
																					}
																				>
																					{item.availableStock} avail
																				</strong>
																				{item.availableStock < qty && (
																					<span className="text-[9px] px-1 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold">
																						Shortage
																					</span>
																				)}
																			</div>
																		)}
																	</div>
																</div>
															</td>

															{/* Unit */}
															<td className="p-3 font-medium text-slate-600 dark:text-slate-400">
																<Badge
																	variant="secondary"
																	className="text-[10px] px-1.5 py-0 font-mono"
																>
																	{item.unitName || "PCS"}
																</Badge>
															</td>

															{/* Quantity */}
															<td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
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
																		className="w-16 h-7 text-center rounded border border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/40 font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
																	/>
																) : (
																	qty
																)}
															</td>

															{/* Unit Price */}
															<td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
																$
																{price.toLocaleString(undefined, {
																	minimumFractionDigits: 2,
																})}
															</td>

															{/* Discount */}
															<td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400 font-semibold">
																{order.status === "DRAFT" && canCreateOrder ? (
																	<div className="flex items-center justify-end gap-1">
																		<input
																			type="number"
																			step="0.01"
																			min="0"
																			value={item.discount}
																			onChange={(e) =>
																				handleEditableItemChange(
																					idx,
																					"discount",
																					Number(e.target.value),
																				)
																			}
																			className="w-16 h-7 text-right px-1 rounded border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/40 font-mono text-xs font-bold outline-none focus:ring-1 focus:ring-amber-500"
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
																			className="h-7 text-[10px] font-bold rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 outline-none"
																		>
																			<option value="FLAT">$</option>
																			<option value="PERCENTAGE">%</option>
																		</select>
																	</div>
																) : disc > 0 ? (
																	<span>
																		{item.discountType === "PERCENTAGE"
																			? `${disc}%`
																			: `-$${disc}`}
																	</span>
																) : (
																	<span className="text-slate-400">—</span>
																)}
															</td>

															{/* Line Total */}
															<td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
																$
																{total.toLocaleString(undefined, {
																	minimumFractionDigits: 2,
																})}
															</td>

															{/* Stock Verification Status Badge */}
															<td className="p-3 text-center">
																{item.isVerified ? (
																	<Badge className="bg-emerald-600 text-white text-[10px] gap-1 py-0.5">
																		<CheckCircle2 className="h-3 w-3" />{" "}
																		Verified ({item.verifiedQuantity ?? qty})
																	</Badge>
																) : (
																	<Badge
																		variant="outline"
																		className="text-slate-400 border-slate-300 text-[10px] py-0.5"
																	>
																		Not Verified
																	</Badge>
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

								{/* Add-Ons Table (If Order Contains Add-Ons or AddonsItems) */}
								{addons && addons.length > 0 && (
									<div className="space-y-1.5 pt-1">
										<div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
											<Gift className="h-3.5 w-3.5 text-purple-600" />{" "}
											Complimentary Add-Ons & Gifts ({addons.length})
										</div>
										<div className="overflow-x-auto rounded-2xl border border-purple-200/80 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/20 shadow-2xs">
											<table className="w-full text-left text-xs">
												<thead className="bg-purple-100/50 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200 font-bold border-b border-purple-200 dark:border-purple-800">
													<tr>
														<th className="p-2.5">Add-On Item</th>
														<th className="p-2.5 w-24">Unit</th>
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
														return (
															<tr
																key={addon.id || aIdx}
																className="hover:bg-purple-100/30 dark:hover:bg-purple-900/30"
															>
																<td className="p-2.5">
																	<div className="flex items-center gap-2">
																		<SafeItemImage
																			src={
																				addon.imageUrl || addon.productImageUrl
																			}
																			alt={addon.productName || "Addon"}
																		/>
																		<div>
																			<div className="font-bold text-purple-950 dark:text-purple-200 text-xs">
																				{addon.productName ||
																					addon.name ||
																					addon.description ||
																					`Add-on #${addon.id || aIdx + 1}`}
																			</div>
																			<div className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
																				SKU: {addon.sku || "—"}
																			</div>
																			{addon.availableStock !== undefined && (
																				<div className="text-[9px] font-mono mt-0.5 flex items-center gap-1">
																					<span className="text-purple-400">Stock:</span>
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
																<td className="p-2.5">
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
																		<Badge className="bg-emerald-600 text-white text-[10px] gap-1 py-0.5">
																			<CheckCircle2 className="h-3 w-3" />{" "}
																			Verified ({addon.verifiedQuantity ?? aQty}
																			)
																		</Badge>
																	) : (
																		<Badge
																			variant="outline"
																			className="text-slate-400 border-slate-300 text-[10px] py-0.5"
																		>
																			Not Verified
																		</Badge>
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

								{/* Financial Summary & Order Notes */}
								<div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-start gap-4 text-xs">
									<div className="space-y-1.5 max-w-md">
										<div className="text-slate-500">
											Customer Note:{" "}
											<span className="text-slate-800 dark:text-slate-200 font-medium">
												{order.customerNote || "—"}
											</span>
										</div>
										<div className="text-slate-500">
											Internal Note:{" "}
											<span className="text-slate-800 dark:text-slate-200 font-medium">
												{order.internalNote || "—"}
											</span>
										</div>
									</div>

									<div className="space-y-1 text-right min-w-[220px]">
										<div className="flex justify-between text-slate-600 dark:text-slate-400">
											<span>Subtotal ({items.length} items):</span>
											<span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
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
												<span className="font-mono font-semibold">
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
											<div className="flex justify-between text-purple-600 dark:text-purple-400">
												<span>Shipping Fee:</span>
												<span className="font-mono font-semibold">
													+$
													{(Number(order.shippingAmount) || 0).toLocaleString(
														undefined,
														{ minimumFractionDigits: 2 },
													)}
												</span>
											</div>
										)}

										{(Number(order.taxAmount) || 0) > 0 && (
											<div className="flex justify-between text-emerald-600 dark:text-emerald-400">
												<span>Tax Fee:</span>
												<span className="font-mono font-semibold">
													+$
													{(Number(order.taxAmount) || 0).toLocaleString(
														undefined,
														{ minimumFractionDigits: 2 },
													)}
												</span>
											</div>
										)}

										<div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
											<span>Total Amount:</span>
											<span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
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

							{/* Tab 2: Customer & Warehouse & Logistics */}
							<ModernTabsContent
								value="customer-warehouse"
								className="pt-3 space-y-4"
							>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
										<div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
											<User className="h-4 w-4 text-indigo-600" /> Customer
											Profile & Destination
										</div>
										<div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
											<div>
												Name:{" "}
												<strong className="text-slate-900 dark:text-slate-100">
													{order.customerName || order.customer?.name || "—"}
												</strong>
											</div>
											<div>Phone: {order.customer?.phone || "—"}</div>
											<div>Email: {order.customer?.email || "—"}</div>
											{order.shippingAddress?.customerAddress && (
												<div>
													Destination Region:{" "}
													<strong className="text-indigo-600 dark:text-indigo-400">
														{order.shippingAddress.customerAddress}
													</strong>
												</div>
											)}
											<div>
												Street / Home Info:{" "}
												{order.shippingAddress?.homeInfo ||
													order.customer?.address ||
													"—"}
											</div>
										</div>
									</div>

									<div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs">
										<div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
											<Building2 className="h-4 w-4 text-indigo-600" />{" "}
											Fulfillment & Logistics Carrier
										</div>
										<div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 pt-1">
											<div>
												Warehouse:{" "}
												<strong className="text-slate-900 dark:text-slate-100">
													{order.warehouseName ||
														`Warehouse #${order.warehouseId || 1}`}
												</strong>
											</div>
											{order.delivery && (
												<div>
													Delivery Carrier:{" "}
													<strong className="text-purple-600 dark:text-purple-400">
														{order.delivery.name} (
														{order.delivery.deliveryType || "Carrier"})
													</strong>
													{order.delivery.lat !== undefined && order.delivery.lat !== null && (
														<span className="ml-2 font-mono text-[11px] text-slate-500">
															[{order.delivery.lat}, {order.delivery.lng}]
														</span>
													)}
												</div>
											)}
											{order.paymentTerm && (
												<div>
													Payment Term:{" "}
													<strong className="text-indigo-600 dark:text-indigo-400">
														{order.paymentTerm.name} ({order.paymentTerm.dueDays === 0 ? "Immediate / COD" : `Due in ${order.paymentTerm.dueDays}d`}
														{Array.isArray(order.paymentTerm.conditions) && order.paymentTerm.conditions.length > 0
															? ` • ${order.paymentTerm.conditions.length} tier(s)`
															: order.paymentTerm.discountPercentage
																? `, -${order.paymentTerm.discountPercentage}%`
																: ""})
													</strong>
													{Array.isArray(order.paymentTerm.conditions) && order.paymentTerm.conditions.length > 0 && (
														<div className="mt-1 flex flex-wrap gap-1">
															{order.paymentTerm.conditions.map((c: any, i: number) => (
																<span
																	key={i}
																	className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
																>
																	{c.discountDays === 0 ? "Immediate" : `≤${c.discountDays}d`}: {c.discount}%
																</span>
															))}
														</div>
													)}
												</div>
											)}
											<div>
												Staff Representative:{" "}
												{order.staffInfo
													? `${order.staffInfo.firstname || ""} ${order.staffInfo.lastname || ""}`
													: "Sales Representative"}
											</div>
											<div>
												Staff Contact: {order.staffInfo?.primaryPhone || "—"}
											</div>
										</div>
									</div>
								</div>
							</ModernTabsContent>

							{/* Tab 3: Dual Approved Matrix */}
							<ModernTabsContent
								value="dual-approved"
								className="pt-3 space-y-4"
							>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Card 1: Sale Manager Pricing Approval */}
									<div
										className={`p-4 rounded-2xl border ${order.saleManagerApproved ? "bg-emerald-50/40 border-emerald-300/80 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"} space-y-2 shadow-2xs`}
									>
										<div className="flex items-center justify-between text-xs font-bold">
											<span>1. Sale Manager Pricing Approval</span>
											{order.saleManagerApproved ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : (
												<Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
											)}
										</div>
										<div className="text-xs text-slate-600 dark:text-slate-400">
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
														className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
														title={
															isSale
																? "Sale Manager Approval (Restricted for Sale role)"
																: undefined
														}
													>
														<UserCheck className="h-3.5 w-3.5 mr-1.5" /> Approve
														as Sale Manager
													</Button>
												</div>
											)}
									</div>

									{/* Card 2: Stockkeeper Physical Verification */}
									<div
										className={`p-4 rounded-2xl border ${order.stockkeeperApproved ? "bg-emerald-50/40 border-emerald-300/80 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"} space-y-2 shadow-2xs`}
									>
										<div className="flex items-center justify-between text-xs font-bold">
											<span>2. Stockkeeper Physical Verification</span>
											{order.stockkeeperApproved ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : order.saleManagerApproved ? (
												<Loader2 className="h-4 w-4 text-blue-500" />
											) : (
												<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
													LOCKED
												</span>
											)}
										</div>
										<div className="text-xs text-slate-600 dark:text-slate-400">
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
										{!order.stockkeeperApproved &&
											order.status === "POSTED" && (
												<div className="pt-2">
													<Button
														size="sm"
														variant="outline"
														disabled={isSale || !canVerifyStock || !order.saleManagerApproved}
														onClick={() => setIsVerifyOpen(true)}
														className="w-full text-xs rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
														title={
															!order.saleManagerApproved
																? "Sale Manager must approve this order before physical verification can begin"
																: isSale
																	? "Stockkeeper Verification (Restricted for Sale role)"
																	: undefined
														}
													>
														<Boxes className="h-3.5 w-3.5 mr-1.5" />
														{order.saleManagerApproved
															? "Open Item Verification"
															: "Locked (Awaiting Manager)"}
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

			<PosOrderStudioModal
				open={isCloneStudioOpen}
				onOpenChange={setIsCloneStudioOpen}
				clonedOrder={order || null}
				onSuccess={() => {
					queryClient.invalidateQueries({ queryKey: ["orders-search"] });
					onOpenChange(false);
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

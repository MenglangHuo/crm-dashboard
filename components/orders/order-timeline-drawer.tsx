"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { OrderChangeLogResponse } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { OrderHistoryDetailModal } from "@/components/orders/order-history-detail-modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	History,
	ArrowRight,
	UserCheck,
	FileDiff,
	Tag,
	Clock,
	Layers,
	Edit3,
	CheckCircle2,
	Eye,
	PlusCircle,
	MinusCircle,
	Package,
	DollarSign,
	Search,
	Hash,
	Shield,
	Calendar,
} from "lucide-react";

interface OrderTimelineDrawerProps {
	orderId: string | number | null;
	orderNumber?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function formatFieldName(fieldName?: string): string {
	if (!fieldName) return "Field";
	const map: Record<string, string> = {
		totalAmount: "Total Amount ($)",
		subtotal: "Subtotal ($)",
		discountAmount: "Discount Amount ($)",
		totalDiscountAmount: "Total Discount ($)",
		discount: "Discount",
		shippingAmount: "Shipping Amount ($)",
		taxAmount: "Tax Amount ($)",
		customerNote: "Customer Note",
		internalNote: "Internal Note",
		status: "Order Status",
		paymentStatus: "Payment Status",
		quantity: "Item Quantity",
		unitPrice: "Unit Price ($)",
		warehouseId: "Warehouse",
		deliveryId: "Delivery Method",
		customerId: "Customer",
	};
	return (
		map[fieldName] ||
		fieldName
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (str) => str.toUpperCase())
	);
}

function formatDiffValue(fieldName: string | undefined, val: any): string {
	if (val === null || val === undefined || val === "") return "(empty)";
	const amountFields = [
		"totalAmount",
		"subtotal",
		"discountAmount",
		"totalDiscountAmount",
		"shippingAmount",
		"taxAmount",
		"unitPrice",
	];
	if (fieldName && amountFields.includes(fieldName)) {
		const num = Number(val);
		if (!isNaN(num)) {
			return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		}
	}
	return String(val);
}

function getChangeTypeMeta(change: OrderChangeLogResponse) {
	const type = (change.changeType || change.action || "").toUpperCase();
	const field = (change.fieldName || "").toLowerCase();

	if (type === "ITEM_ADDED") {
		return {
			label: "ITEM ADDED",
			badgeClass:
				"bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
			icon: (
				<PlusCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
			),
			accentBorder: "border-l-4 border-l-emerald-500",
			title: change.context?.productName
				? `Added Item: ${change.context.productName}`
				: "New Item Added to Order",
		};
	}

	if (type === "ITEM_REMOVED") {
		return {
			label: "ITEM REMOVED",
			badgeClass:
				"bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
			icon: (
				<MinusCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
			),
			accentBorder: "border-l-4 border-l-rose-500",
			title: change.context?.productName
				? `Removed Item: ${change.context.productName}`
				: "Item Removed from Order",
		};
	}

	if (
		type === "ITEM_QUANTITY" ||
		(type.includes("ITEM") && field === "quantity")
	) {
		return {
			label: "ITEM QUANTITY",
			badgeClass:
				"bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
			icon: <Layers className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />,
			accentBorder: "border-l-4 border-l-sky-500",
			title: change.context?.productName
				? `Quantity Changed: ${change.context.productName}`
				: "Item Quantity Modified",
		};
	}

	if (type === "STATUS_CHANGE" || field === "status") {
		return {
			label: "STATUS CHANGE",
			badgeClass:
				"bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
			icon: (
				<CheckCircle2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
			),
			accentBorder: "border-l-4 border-l-purple-500",
			title: "Order Status Transition",
		};
	}

	if (
		type === "ORDER_AMOUNT" ||
		field.includes("amount") ||
		field.includes("price") ||
		field.includes("total")
	) {
		return {
			label: "ORDER AMOUNT",
			badgeClass:
				"bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
			icon: (
				<DollarSign className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
			),
			accentBorder: "border-l-4 border-l-amber-500",
			title: `${formatFieldName(change.fieldName)} Modified`,
		};
	}

	return {
		label: type || "FIELD MUTATION",
		badgeClass:
			"bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800",
		icon: (
			<Edit3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
		),
		accentBorder: "border-l-4 border-l-indigo-500",
		title: change.fieldName
			? `${formatFieldName(change.fieldName)} Modified`
			: type || "Field Modified",
	};
}

export function OrderTimelineDrawer({
	orderId,
	orderNumber,
	open,
	onOpenChange,
}: OrderTimelineDrawerProps) {
	const [activeTab, setActiveTab] = useState<string>("timeline");
	const [selectedHistoryId, setSelectedHistoryId] = useState<
		string | number | null
	>(null);
	const [selectedHistoryData, setSelectedHistoryData] = useState<any | null>(
		null,
	);
	const [diffFilter, setDiffFilter] = useState<"ALL" | "ITEMS" | "FIELDS">(
		"ALL",
	);
	const [diffSearch, setDiffSearch] = useState<string>("");

	// Fetch Stage Milestones (/v1/orders/{orderId}/histories)
	const { data: historiesData, isLoading: isHistoriesLoading } = useQuery({
		queryKey: ["order-histories", orderId],
		queryFn: () =>
			orderId ? ordersApi.getOrderHistories(orderId) : Promise.resolve([]),
		enabled: Boolean(orderId) && open,
	});

	// Fetch Field & Item Changes Log (/v1/orders/{orderId}/changes)
	const { data: changesData = [], isLoading: isChangesLoading } = useQuery({
		queryKey: ["order-changes", orderId],
		queryFn: () =>
			orderId ? ordersApi.getOrderChanges(orderId) : Promise.resolve([]),
		enabled: Boolean(orderId) && open,
	});

	const isLoading = isHistoriesLoading || isChangesLoading;
	const histories = Array.isArray(historiesData) ? historiesData : [];
	const changes: OrderChangeLogResponse[] = Array.isArray(changesData)
		? changesData
		: [];

	// Filter changes for tab 2
	const filteredChanges = useMemo(() => {
		return changes.filter((c) => {
			const type = (c.changeType || c.action || "").toUpperCase();
			const isItemOp =
				type.includes("ITEM") ||
				Boolean(c.context?.productName || c.context?.sku);

			if (diffFilter === "ITEMS" && !isItemOp) return false;
			if (diffFilter === "FIELDS" && isItemOp) return false;

			if (!diffSearch.trim()) return true;
			const query = diffSearch.toLowerCase();
			const searchTarget = [
				c.changeType,
				c.fieldName,
				c.oldValue,
				c.newValue,
				c.changedByUsername,
				c.changedByRole,
				c.context?.productName,
				c.context?.sku,
				c.notes,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return searchTarget.includes(query);
		});
	}, [changes, diffFilter, diffSearch]);

	if (!orderId) return null;

	const handleHistoryClick = (item: any) => {
		const hId = item.id || item.historyId;
		setSelectedHistoryId(hId);
		setSelectedHistoryData(item);
	};

	const itemChangesCount = changes.filter(
		(c) =>
			(c.changeType || "").toUpperCase().includes("ITEM") ||
			Boolean(c.context?.productName),
	).length;
	const fieldChangesCount = changes.length - itemChangesCount;

	return (
		<>
			<ModernModal
				isOpen={open}
				onClose={() => onOpenChange(false)}
				title="Order Audit & Activity Intelligence"
				subtitle={`Complete lifecycle and item mutation audit for Order ${orderNumber || `#${orderId}`}`}
				icon={
					<History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				}
				size="xl"
				glassmorphism={true}
				draggable={true}
				resizable={true}
				isLoading={isLoading}
				loadingText="Loading audit logs..."
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => onOpenChange(false)}>
							Close Inspector
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				<div className="pt-1">
					<ModernTabs value={activeTab} onValueChange={setActiveTab}>
						<ModernTabsList variant="glass" size="md">
							<ModernTabsTrigger
								value="timeline"
								icon={<History className="h-4 w-4" />}
								badge={histories.length}
								badgeColor="indigo"
							>
								Stage Milestones ({histories.length})
							</ModernTabsTrigger>

							<ModernTabsTrigger
								value="changes"
								icon={<FileDiff className="h-4 w-4" />}
								badge={changes.length}
								badgeColor="purple"
							>
								Item & Field Diffs ({changes.length})
							</ModernTabsTrigger>
						</ModernTabsList>

						{/* Tab 1: Stage Milestones Timeline */}
						<ModernTabsContent value="timeline" className="pt-4 space-y-4">
							{histories.length === 0 ? (
								<div className="text-center py-12 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
									No milestone transitions recorded for this order yet.
								</div>
							) : (
								<div className="relative pl-6 border-l-2 border-indigo-200 dark:border-slate-800 space-y-4">
									{histories.map((item: any, idx: number) => {
										const title =
											item.title || item.actionType || "Order Action";
										const desc =
											item.description || item.reason || "Action performed";
										const user =
											item.actionByUserName ||
											item.actionByUser ||
											item.createdBy ||
											"System User";
										const role = item.actorRole || "User";
										const timestamp = item.createdAt || item.timestamp;
										const fromStatus = item.fromStatus;
										const toStatus = item.toStatus;
										const badgeText =
											item.badgeText || item.actionType || title;

										return (
											<div
												key={item.historyId || item.id || idx}
												className="relative group"
											>
												<div className="absolute -left-[31px] top-3.5 h-4 w-4 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900 flex items-center justify-center text-white text-[9px] font-bold shadow-xs">
													✓
												</div>

												<div
													onClick={() => handleHistoryClick(item)}
													className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 cursor-pointer transition-all duration-200"
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="flex items-center gap-2">
															<Badge className="bg-indigo-600 text-white text-[10px] py-0.5 px-2.5 font-bold">
																{badgeText}
															</Badge>

															{fromStatus && toStatus && (
																<div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
																	<span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
																		{fromStatus}
																	</span>
																	<ArrowRight className="h-3 w-3 text-slate-400" />
																	<span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300">
																		{toStatus}
																	</span>
																</div>
															)}
														</div>

														<span className="text-[10px] font-mono text-slate-400">
															{timestamp
																? new Date(timestamp).toLocaleString()
																: "—"}
														</span>
													</div>

													<div className="flex items-center justify-between gap-2">
														<div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
															{title}
														</div>
														<span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
															<Eye className="h-3.5 w-3.5" /> View Audit Detail
														</span>
													</div>

													<p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
														{desc}
													</p>

													<div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
														<span className="flex items-center gap-1">
															<UserCheck className="h-3.5 w-3.5 text-indigo-500" />
															<span>
																Action By:{" "}
																<strong className="text-slate-700 dark:text-slate-300">
																	{user}
																</strong>
															</span>
														</span>
														<span className="uppercase tracking-wider font-semibold text-slate-400">
															{role}
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</ModernTabsContent>

						{/* Tab 2: Item & Field Changes Log */}
						<ModernTabsContent value="changes" className="pt-4 space-y-3.5">
							{/* Filter and Search Sub-Toolbar */}
							<div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
								<div className="flex items-center gap-1.5">
									<button
										type="button"
										onClick={() => setDiffFilter("ALL")}
										className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
											diffFilter === "ALL"
												? "bg-indigo-600 text-white shadow-2xs"
												: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900"
										}`}
									>
										All Diffs ({changes.length})
									</button>

									<button
										type="button"
										onClick={() => setDiffFilter("ITEMS")}
										className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
											diffFilter === "ITEMS"
												? "bg-indigo-600 text-white shadow-2xs"
												: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900"
										}`}
									>
										Items ({itemChangesCount})
									</button>

									<button
										type="button"
										onClick={() => setDiffFilter("FIELDS")}
										className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
											diffFilter === "FIELDS"
												? "bg-indigo-600 text-white shadow-2xs"
												: "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-slate-900"
										}`}
									>
										Fields & Price ({fieldChangesCount})
									</button>
								</div>

								<div className="relative min-w-[200px] flex-1 sm:flex-initial">
									<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										placeholder="Search SKU, item, user, or field..."
										value={diffSearch}
										onChange={(e) => setDiffSearch(e.target.value)}
										className="h-8 pl-8 text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
									/>
								</div>
							</div>

							{filteredChanges.length === 0 ? (
								<div className="text-center py-12 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
									<FileDiff className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
									<p className="font-semibold text-slate-600 dark:text-slate-400">
										{diffSearch
											? "No mutations matching your search query."
											: "No granular item or price mutations logged for this order."}
									</p>
									<p className="text-[11px] text-slate-400">
										All order actions and field modifications are audited in
										real time.
									</p>
								</div>
							) : (
								<div className="space-y-3">
									{filteredChanges.map((change, idx) => {
										const meta = getChangeTypeMeta(change);
										const user =
											change.changedByUsername ||
											(change.changedBy
												? `User #${change.changedBy}`
												: "System User");
										const role = change.changedByRole || "ADMIN";
										const date = change.changedAt
											? new Date(change.changedAt).toLocaleString()
											: "—";
										const hasDiff =
											(change.oldValue !== undefined &&
												change.oldValue !== null) ||
											(change.newValue !== undefined &&
												change.newValue !== null);
										const hasItemContext = Boolean(
											change.context &&
												(Boolean(change.context.productName) ||
													Boolean(change.context.sku)) &&
												(change.changeType || "")
													.toUpperCase()
													.includes("ITEM"),
										);

										return (
											<div
												key={change.id || idx}
												className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 text-xs ${meta.accentBorder}`}
											>
												{/* Header Line */}
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div className="flex items-center gap-2">
														<Badge
															variant="outline"
															className={`gap-1 px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-lg ${meta.badgeClass}`}
														>
															{meta.icon}
															{meta.label}
														</Badge>

														<span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
															{meta.title}
														</span>

														{change.orderItemId && (
															<span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
																Item #{change.orderItemId}
															</span>
														)}
													</div>

													<div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
														<Clock className="h-3 w-3 text-slate-400" />
														<span>{date}</span>
													</div>
												</div>

												{/* Item Context Showcase (Rendered strictly when actual item context is present) */}
												{hasItemContext && change.context && (
													<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
														<div className="flex items-center gap-2.5 min-w-0">
															<div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
																<Package className="h-4 w-4" />
															</div>

															<div className="min-w-0">
																<div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
																	{change.context.productName || "Product Item"}
																</div>
																{change.context.sku && (
																	<div className="text-[10px] font-mono text-slate-500">
																		SKU:{" "}
																		<span className="font-bold text-slate-700 dark:text-slate-300">
																			{change.context.sku}
																		</span>
																	</div>
																)}
															</div>
														</div>

														<div className="flex items-center gap-2 text-xs">
															{change.context.quantity !== undefined && (
																<Badge
																	variant="secondary"
																	className="font-mono text-[11px] font-bold px-2 py-0.5"
																>
																	Qty: {change.context.quantity}
																</Badge>
															)}
															{change.context.unitPrice !== undefined && (
																<span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
																	${Number(change.context.unitPrice).toFixed(2)}
																</span>
															)}
														</div>
													</div>
												)}

												{/* Value Before vs After Diff View */}
												{hasDiff && (
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-slate-50/80 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
														<div className="text-rose-600 dark:text-rose-400 space-y-0.5">
															<span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
																Previous Value (Before)
															</span>
															<div className="line-through bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-1.5 rounded-lg">
																{formatDiffValue(
																	change.fieldName,
																	change.oldValue,
																)}
															</div>
														</div>

														<div className="text-emerald-600 dark:text-emerald-400 space-y-0.5 font-bold">
															<span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
																Updated Value (After)
															</span>
															<div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-1.5 rounded-lg">
																{formatDiffValue(
																	change.fieldName,
																	change.newValue,
																)}
															</div>
														</div>
													</div>
												)}

												{/* Notes or description if any */}
												{change.notes && (
													<p className="text-[11px] text-slate-500 italic bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
														<strong>Note:</strong> {change.notes}
													</p>
												)}

												{/* Footer Audit Actor */}
												<div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
													<span className="flex items-center gap-1.5">
														<UserCheck className="h-3.5 w-3.5 text-indigo-500" />
														<span>
															Modified by:{" "}
															<strong className="text-slate-800 dark:text-slate-200">
																{user}
															</strong>
														</span>
													</span>

													<Badge
														variant="secondary"
														className="text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5"
													>
														<Shield className="h-2.5 w-2.5 mr-1 text-slate-400" />
														{role}
													</Badge>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</ModernTabsContent>
					</ModernTabs>
				</div>
			</ModernModal>

			{/* History Detail Snapshot Modal when timeline item clicked */}
			<OrderHistoryDetailModal
				orderId={orderId}
				historyId={selectedHistoryId}
				initialHistoryData={selectedHistoryData}
				open={Boolean(selectedHistoryId)}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setSelectedHistoryId(null);
						setSelectedHistoryData(null);
					}
				}}
			/>
		</>
	);
}

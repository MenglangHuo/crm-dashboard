"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { Order } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
	History,
	Calendar,
	User,
	ArrowRight,
	Loader2,
	Info,
	UserCheck,
	Boxes,
	Receipt,
	CheckCircle2,
	ShieldCheck,
	Plus,
	Gift,
	FileEdit,
	Edit3,
	Send,
	Package,
} from "lucide-react";

interface OrderHistoryDetailModalProps {
	orderId: string | number | null;
	historyId?: string | number | null;
	stepId?:
		| "DRAFT"
		| "POSTED"
		| "APPROVED"
		| "COMPLETED"
		| "ISSUE_INVOICE"
		| string
		| null;
	order?: Order | null;
	allHistories?: any[];
	initialHistoryData?: any;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onActionStep?: (stepId: string) => void;
}

function HistorySnapshotView({
	orderId,
	historyRecord,
	defaultFromStatus,
	defaultToStatus,
}: {
	orderId: string | number | null;
	historyRecord: any | null;
	defaultFromStatus?: string;
	defaultToStatus?: string;
}) {
	const historyId = historyRecord?.id || historyRecord?.historyId;

	const { data: fetchedDetail, isLoading } = useQuery({
		queryKey: ["order-history-detail-sub", orderId, historyId],
		queryFn: () =>
			orderId && historyId
				? ordersApi.getOrderHistoryDetail(orderId, historyId)
				: Promise.resolve(null),
		enabled: Boolean(orderId) && Boolean(historyId),
	});

	const historyDetail = fetchedDetail || historyRecord;

	if (!historyRecord && !historyDetail) {
		return (
			<div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
				<Info className="h-5 w-5 mx-auto text-slate-400 mb-1" />
				<p className="font-semibold text-slate-600 dark:text-slate-400">
					No audit history record found for this verification stage yet.
				</p>
			</div>
		);
	}

	if (isLoading && !historyDetail) {
		return (
			<div className="p-8 text-center space-y-2">
				<Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
				<p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
					Fetching audit snapshot details...
				</p>
			</div>
		);
	}

	// Safe status defaults: if fromStatus is null, default is 'DRAFT'
	const fromStatus = historyDetail.fromStatus || defaultFromStatus || "DRAFT";
	const toStatus = historyDetail.toStatus || defaultToStatus;

	const snapshot = historyDetail.snapshotData || historyDetail.snapshot || {};
	const itemsList = snapshot.items || [];
	const addonsList = snapshot.addonsItems || snapshot.addons || [];
	const hasSnapshot = Boolean(
		snapshot.items ||
			snapshot.addonsItems ||
			snapshot.addons ||
			snapshot.totalAmount !== undefined ||
			snapshot.subtotal !== undefined,
	);

	return (
		<div className="space-y-4">
			{/* Header Audit Meta Card */}
			<div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<Badge className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5">
						{historyDetail.actionType || "AUDIT_EVENT"}
					</Badge>

					<div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
						<Calendar className="h-3.5 w-3.5 text-slate-400" />
						<span>
							{historyDetail.createdAt
								? new Date(historyDetail.createdAt).toLocaleString()
								: "—"}
						</span>
					</div>
				</div>

				<div className="space-y-0.5">
					<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
						{historyDetail.title || "Order History Action"}
					</h4>
					<p className="text-xs text-slate-600 dark:text-slate-400">
						{historyDetail.description || "No action description provided."}
					</p>
				</div>

				<div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
					<div className="flex items-center gap-1.5">
						<User className="h-3.5 w-3.5 text-indigo-500" />
						<span>
							Action By:{" "}
							<strong className="text-slate-900 dark:text-slate-100">
								{historyDetail.actionByUserName ||
									(historyDetail.actionByUserId
										? `User #${historyDetail.actionByUserId}`
										: "System")}
							</strong>
						</span>
					</div>

					{(fromStatus || toStatus) && (
						<div className="flex items-center gap-1 text-[11px] font-mono">
							<span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
								{fromStatus}
							</span>
							{toStatus && (
								<>
									<ArrowRight className="h-3 w-3 text-slate-400" />
									<span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 font-bold text-indigo-700 dark:text-indigo-300">
										{toStatus}
									</span>
								</>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Audit Snapshot Data */}
			{hasSnapshot ? (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
							Order Snapshot at Event Time
						</span>
						<span className="text-[11px] font-mono text-indigo-600 font-bold">
							{snapshot.orderNumber || (orderId ? `#${orderId}` : "")}
						</span>
					</div>

					{snapshot.reason && (
						<div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
							<strong>Reason / Note:</strong> {snapshot.reason}
						</div>
					)}

					{/* Snapshot Items Table */}
					{itemsList.length > 0 ? (
						<div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
							<div className="bg-slate-100/90 dark:bg-slate-800/90 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
								<Package className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
								Line Items ({itemsList.length})
							</div>
							<table className="w-full text-left border-collapse">
								<thead>
									<tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
										<th className="p-2.5">Item & SKU</th>
										<th className="p-2.5 text-center w-16">Qty</th>
										<th className="p-2.5 text-right w-24">Unit Price</th>
										<th className="p-2.5 text-right w-24">Discount</th>
										<th className="p-2.5 text-right w-28">Total</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
									{itemsList.map((item: any, idx: number) => (
										<tr
											key={item.id || idx}
											className="hover:bg-slate-50 dark:hover:bg-slate-900/50"
										>
											<td className="p-2.5">
												<div className="font-bold text-slate-900 dark:text-slate-100">
													{item.productName ||
														item.description ||
														`Item #${item.id || idx + 1}`}
												</div>
												{item.sku && (
													<div className="text-[10px] font-mono text-slate-500">
														SKU: {item.sku}
													</div>
												)}
											</td>
											<td className="p-2.5 text-center font-mono font-semibold">
												{item.quantity}
											</td>
											<td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
												${Number(item.unitPrice || 0).toFixed(2)}
											</td>
											<td className="p-2.5 text-right font-mono text-slate-500">
												${Number(item.discount || 0).toFixed(2)}
											</td>
											<td className="p-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
												$
												{Number(
													item.totalAmount ||
														item.totalPrice ||
														item.quantity * item.unitPrice ||
														0,
												).toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl">
							No main item records present in this history snapshot.
						</div>
					)}

					{/* Complimentary Add-Ons & Gifts Table (addonsItems / addons) */}
					{addonsList.length > 0 && (
						<div className="space-y-1.5 pt-1">
							<div className="rounded-xl border border-purple-200/80 dark:border-purple-900/60 overflow-hidden text-xs bg-purple-50/20 dark:bg-purple-950/20">
								<div className="bg-purple-100/60 dark:bg-purple-900/40 px-3 py-1.5 border-b border-purple-200 dark:border-purple-800 text-[11px] font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
									<Gift className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
									Complimentary Add-Ons & Gifts ({addonsList.length})
								</div>
								<table className="w-full text-left border-collapse">
									<thead>
										<tr className="bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
											<th className="p-2.5">Add-On Item & SKU</th>
											<th className="p-2.5 w-20">Unit</th>
											<th className="p-2.5 text-center w-16">Qty</th>
											<th className="p-2.5 text-right w-24">Unit Price</th>
											<th className="p-2.5 text-right w-28">Total</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-purple-100 dark:divide-purple-900/40">
										{addonsList.map((addon: any, idx: number) => {
											const aQty = Number(addon.quantity) || 1;
											const aPrice = Number(addon.unitPrice) || 0;
											const aTotal =
												Number(addon.totalAmount || addon.totalPrice) ||
												aQty * aPrice;
											return (
												<tr
													key={addon.id || idx}
													className="hover:bg-purple-100/30 dark:hover:bg-purple-900/30"
												>
													<td className="p-2.5">
														<div className="font-bold text-purple-950 dark:text-purple-100">
															{addon.productName ||
																addon.name ||
																addon.description ||
																`Add-on #${addon.id || idx + 1}`}
														</div>
														{addon.sku && (
															<div className="text-[10px] font-mono text-purple-600 dark:text-purple-400">
																SKU: {addon.sku}
															</div>
														)}
													</td>
													<td className="p-2.5">
														<Badge
															variant="secondary"
															className="text-[10px] px-1.5 py-0 font-mono bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
														>
															{addon.unitName || "PCS"}
														</Badge>
													</td>
													<td className="p-2.5 text-center font-mono font-semibold text-purple-900 dark:text-purple-200">
														{aQty}
													</td>
													<td className="p-2.5 text-right font-mono text-purple-700 dark:text-purple-300">
														{aPrice === 0 ? "FREE" : `$${aPrice.toFixed(2)}`}
													</td>
													<td className="p-2.5 text-right font-mono font-bold text-purple-900 dark:text-purple-200">
														{aTotal === 0
															? "FREE ($0.00)"
															: `$${aTotal.toFixed(2)}`}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* Financial Snapshot Summary */}
					<div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex justify-end">
						<div className="w-full max-w-xs space-y-1 text-xs">
							<div className="flex justify-between text-slate-600 dark:text-slate-400">
								<span>Subtotal:</span>
								<span className="font-mono">
									${Number(snapshot.subtotal || 0).toFixed(2)}
								</span>
							</div>
							{Number(
								snapshot.discountAmount || snapshot.totalDiscountAmount || 0,
							) > 0 && (
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Discount:</span>
									<span className="font-mono text-emerald-600">
										-$
										{Number(
											snapshot.totalDiscountAmount ||
												snapshot.discountAmount ||
												0,
										).toFixed(2)}
									</span>
								</div>
							)}
							{Number(snapshot.taxAmount || 0) > 0 && (
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Tax:</span>
									<span className="font-mono">
										${Number(snapshot.taxAmount || 0).toFixed(2)}
									</span>
								</div>
							)}
							{Number(snapshot.shippingAmount || 0) > 0 && (
								<div className="flex justify-between text-slate-600 dark:text-slate-400">
									<span>Shipping:</span>
									<span className="font-mono">
										${Number(snapshot.shippingAmount || 0).toFixed(2)}
									</span>
								</div>
							)}
							<div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
								<span>Total Amount:</span>
								<span className="font-mono text-indigo-600 dark:text-indigo-400">
									${Number(snapshot.totalAmount || 0).toFixed(2)}
								</span>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl">
					No snapshot data recorded for this audit entry.
				</div>
			)}
		</div>
	);
}

export function OrderHistoryDetailModal({
	orderId,
	historyId,
	stepId,
	order,
	allHistories = [],
	initialHistoryData,
	open,
	onOpenChange,
	onActionStep,
}: OrderHistoryDetailModalProps) {
	const [draftTab, setDraftTab] = useState<"created" | "modified">("created");
	const [approvalTab, setApprovalTab] = useState<"sale_manager" | "stock">(
		"sale_manager",
	);

	if (!open) return null;

	// 1. STEP DRAFT: ORDER_CREATED & ORDER_MODIFIED
	if (stepId === "DRAFT") {
		const createdHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				return (
					type === "ORDER_CREATED" ||
					type.includes("ORDER_CREATED") ||
					type.includes("CREATE_ORDER") ||
					type.includes("CREATED")
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);

		const modifiedHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				return (
					type === "ORDER_MODIFIED" ||
					type.includes("ORDER_MODIFIED") ||
					type.includes("UPDATE_ORDER") ||
					type.includes("MODIFIED") ||
					type.includes("ORDER_UPDATE")
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);

		const createdHistory = createdHistories[0] || null;
		const modifiedHistory = modifiedHistories[0] || null;
		const hasBoth = Boolean(createdHistory && modifiedHistory);

		// If both ORDER_CREATED and ORDER_MODIFIED exist, show as tabs
		if (hasBoth) {
			return (
				<ModernModal
					isOpen={open}
					onClose={() => onOpenChange(false)}
					title="Step 1: Draft — Audit Trail"
					subtitle={`Draft audit snapshots for Order #${order?.orderNumber || orderId || ""}`}
					icon={
						<FileEdit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
					}
					size="lg"
					footer={
						<ModernModalFooter>
							<ModernModalCancelButton onClick={() => onOpenChange(false)}>
								Close Audit Detail
							</ModernModalCancelButton>
						</ModernModalFooter>
					}
				>
					<div className="space-y-4 py-1">
						<ModernTabs
							value={draftTab}
							onValueChange={(val) => setDraftTab(val as any)}
						>
							<ModernTabsList variant="glass" size="md">
								<ModernTabsTrigger
									value="created"
									icon={<FileEdit className="h-4 w-4" />}
									badge="ORDER_CREATED"
									badgeColor="indigo"
								>
									Order Created
								</ModernTabsTrigger>

								<ModernTabsTrigger
									value="modified"
									icon={<Edit3 className="h-4 w-4" />}
									badge="ORDER_MODIFIED"
									badgeColor="purple"
								>
									Order Modified
								</ModernTabsTrigger>
							</ModernTabsList>

							<ModernTabsContent value="created" className="pt-4 space-y-4">
								<HistorySnapshotView
									orderId={orderId}
									historyRecord={createdHistory}
									defaultFromStatus="DRAFT"
								/>
							</ModernTabsContent>

							<ModernTabsContent value="modified" className="pt-4 space-y-4">
								<HistorySnapshotView
									orderId={orderId}
									historyRecord={modifiedHistory}
									defaultFromStatus="DRAFT"
								/>
							</ModernTabsContent>
						</ModernTabs>
					</div>
				</ModernModal>
			);
		}

		// Only one of them exists or fallback
		const singleDraftRecord =
			createdHistory ||
			modifiedHistory ||
			allHistories.find(
				(h: any) =>
					(h.toStatus || h.fromStatus || "").toUpperCase() === "DRAFT",
			) ||
			initialHistoryData ||
			allHistories[0];

		return (
			<ModernModal
				isOpen={open}
				onClose={() => onOpenChange(false)}
				title={
					modifiedHistory && !createdHistory
						? "Step 1: Draft — Order Modified Audit"
						: "Step 1: Draft — Order Created Audit"
				}
				subtitle={`Draft configuration audit snapshot for Order #${order?.orderNumber || orderId || ""}`}
				icon={
					<FileEdit className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => onOpenChange(false)}>
							Close Audit Detail
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-1">
					{singleDraftRecord ? (
						<HistorySnapshotView
							orderId={orderId}
							historyRecord={singleDraftRecord}
							defaultFromStatus="DRAFT"
						/>
					) : (
						<div className="p-8 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20">
							<FileEdit className="h-8 w-8 mx-auto text-slate-400" />
							<h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
								Draft Snapshot
							</h4>
							<p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
								Initial draft audit snapshot has been established for this
								order.
							</p>
						</div>
					)}
				</div>
			</ModernModal>
		);
	}

	// 2. STEP POSTED: STATUS_CHANGE (Get latest date)
	if (stepId === "POSTED") {
		const postedHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				const to = (h.toStatus || "").toUpperCase();
				return (
					type === "STATUS_CHANGE" ||
					to === "POSTED" ||
					type.includes("STATUS_CHANGE") ||
					type.includes("POST")
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);

		const postedHistory = postedHistories[0] || null;

		return (
			<ModernModal
				isOpen={open}
				onClose={() => onOpenChange(false)}
				title="Step 2: Posted — Status Transition Audit"
				subtitle={`Audit record of submission to POSTED (Stock Reserved) for Order #${order?.orderNumber || orderId || ""}`}
				icon={<Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => onOpenChange(false)}>
							Close Audit Detail
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-1">
					{postedHistory ? (
						<HistorySnapshotView
							orderId={orderId}
							historyRecord={postedHistory}
							defaultFromStatus="DRAFT"
							defaultToStatus="POSTED"
						/>
					) : (
						<div className="p-8 text-center space-y-2 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20">
							<Send className="h-8 w-8 mx-auto text-amber-500" />
							<h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
								Order Submission (POSTED) Pending
							</h4>
							<p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
								This order is currently in DRAFT and has not yet been submitted
								to POSTED status.
							</p>
						</div>
					)}
				</div>
			</ModernModal>
		);
	}

	// 3. STEP APPROVED: STOCKKEEPER_APPROVED & SALE_MANAGER_APPROVED (Get latest date for each)
	if (stepId === "APPROVED") {
		// Find latest Stockkeeper Approval history
		const stockHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				return (
					type === "STOCKKEEPER_APPROVED" ||
					type.includes("STOCKKEEPER_APPROVED") ||
					type.includes("STOCK") ||
					type.includes("WAREHOUSE") ||
					type.includes("VERIF")
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);
		const stockHistory = stockHistories[0] || null;

		// Find latest Sale Manager Approval history
		const saleManagerHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				const to = (h.toStatus || "").toUpperCase();
				return (
					type === "SALE_MANAGER_APPROVED" ||
					type.includes("SALE_MANAGER_APPROVED") ||
					type.includes("SALE_MANAGER") ||
					type.includes("SALES_MANAGER") ||
					type.includes("MANAGER_APPROVED") ||
					(to === "APPROVED" && !type.includes("STOCK"))
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);
		const saleManagerHistory = saleManagerHistories[0] || null;

		return (
			<ModernModal
				isOpen={open}
				onClose={() => onOpenChange(false)}
				title="Step 3: Approved — Dual Verification Audit"
				subtitle={`Dual verification audit trail for Order #${order?.orderNumber || orderId || ""}`}
				icon={
					<ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => onOpenChange(false)}>
							Close Audit Detail
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-1">
					<ModernTabs
						value={approvalTab}
						onValueChange={(val) => setApprovalTab(val as any)}
					>
						<ModernTabsList variant="glass" size="md">
							<ModernTabsTrigger
								value="sale_manager"
								icon={<UserCheck className="h-4 w-4" />}
								badge={saleManagerHistory ? "Verified" : "Pending"}
								badgeColor={saleManagerHistory ? "emerald" : "amber"}
							>
								Sale Manager Approval
							</ModernTabsTrigger>

							<ModernTabsTrigger
								value="stock"
								icon={<Boxes className="h-4 w-4" />}
								badge={stockHistory ? "Verified" : "Pending"}
								badgeColor={stockHistory ? "emerald" : "amber"}
							>
								Stock Verification
							</ModernTabsTrigger>
						</ModernTabsList>

						{/* Tab 1: Sale Manager Approval */}
						<ModernTabsContent value="sale_manager" className="pt-4 space-y-4">
							{saleManagerHistory ? (
								<HistorySnapshotView
									orderId={orderId}
									historyRecord={saleManagerHistory}
									defaultFromStatus="POSTED"
									defaultToStatus="APPROVED"
								/>
							) : (
								<div className="p-8 text-center space-y-2 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20">
									<UserCheck className="h-8 w-8 mx-auto text-amber-500" />
									<h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
										Sale Manager Verification Pending
									</h4>
									<p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
										This order has not yet completed Sale Manager verification
										audit.
									</p>
								</div>
							)}
						</ModernTabsContent>

						{/* Tab 2: Stockkeeper Verification */}
						<ModernTabsContent value="stock" className="pt-4 space-y-4">
							{stockHistory ? (
								<HistorySnapshotView
									orderId={orderId}
									historyRecord={stockHistory}
									defaultFromStatus="POSTED"
									defaultToStatus="APPROVED"
								/>
							) : (
								<div className="p-8 text-center space-y-2 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20">
									<Boxes className="h-8 w-8 mx-auto text-amber-500" />
									<h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
										Stock Verification Pending
									</h4>
									<p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
										Warehouse and stock verification audit has not yet been
										recorded for this order.
									</p>
								</div>
							)}
						</ModernTabsContent>
					</ModernTabs>
				</div>
			</ModernModal>
		);
	}

	// 4. STEP ISSUE_INVOICE (or COMPLETED): INVOICE_ISSUED (Get latest date)
	if (stepId === "COMPLETED" || stepId === "ISSUE_INVOICE") {
		const invoiceHistories = allHistories
			.filter((h: any) => {
				const type = (h.actionType || h.title || "").toUpperCase();
				const from = (h.fromStatus || "").toUpperCase();
				const to = (h.toStatus || "").toUpperCase();
				return (
					type === "INVOICE_ISSUED" ||
					type.includes("INVOICE_ISSUED") ||
					type.includes("INVOICE") ||
					(from === "APPROVED" && to === "COMPLETED") ||
					to === "COMPLETED" ||
					type.includes("COMPLETED")
				);
			})
			.sort(
				(a: any, b: any) =>
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime(),
			);

		const invoiceHistory = invoiceHistories[0] || null;
		const isCompleted =
			(order?.status || "").toUpperCase() === "COMPLETED" ||
			Boolean(invoiceHistory);

		return (
			<ModernModal
				isOpen={open}
				onClose={() => onOpenChange(false)}
				title="Step 4: Issue Invoice — Transition Audit"
				subtitle={`Audit record of invoice issuance and completion for Order #${order?.orderNumber || orderId || ""}`}
				icon={
					<Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				}
				size="lg"
				footer={
					<ModernModalFooter className="flex items-center justify-between w-full">
						{!isCompleted && onActionStep ? (
							<Button
								type="button"
								onClick={() => {
									onOpenChange(false);
									onActionStep("COMPLETED");
								}}
								className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-10 px-4 gap-1.5 shadow-md shadow-emerald-600/20"
							>
								<Plus className="h-4 w-4" /> Issue Invoice Now
							</Button>
						) : (
							<div />
						)}

						<ModernModalCancelButton onClick={() => onOpenChange(false)}>
							Close Audit Detail
						</ModernModalCancelButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-1">
					{invoiceHistory ? (
						<HistorySnapshotView
							orderId={orderId}
							historyRecord={invoiceHistory}
							defaultFromStatus="APPROVED"
							defaultToStatus="COMPLETED"
						/>
					) : (
						<div className="p-8 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40">
							<Receipt className="h-8 w-8 mx-auto text-slate-400" />
							<div className="space-y-1">
								<h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
									Awaiting Invoice Issuance
								</h4>
								<p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
									This order has dual approval completed (APPROVED) and is ready
									for the Accountant to issue an invoice and mark it COMPLETED.
								</p>
							</div>
						</div>
					)}
				</div>
			</ModernModal>
		);
	}

	// DEFAULT CASE: Direct History Record / Other steps
	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Audit History Snapshot"
			subtitle={`Event log detail for Order #${order?.orderNumber || orderId || ""} (History ID: #${historyId || ""})`}
			icon={
				<History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)}>
						Close Audit Detail
					</ModernModalCancelButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				<HistorySnapshotView
					orderId={orderId}
					historyRecord={
						initialHistoryData || (historyId ? { id: historyId } : null)
					}
					defaultFromStatus="DRAFT"
				/>
			</div>
		</ModernModal>
	);
}

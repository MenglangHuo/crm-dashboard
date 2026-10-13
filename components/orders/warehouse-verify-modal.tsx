"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import {
	Order,
	OrderItem,
	OrderAddon,
	VerifyOrderItemsRequest,
	ItemVerificationDetail,
	AddonVerificationDetail,
} from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
	ModernModalActionButton,
} from "@/components/ui-custom/modal";
import { cn } from "@/lib/utils";
import {
	ModernInput,
	ModernTextarea,
	ModernCheckbox,
} from "@/components/ui-custom/form-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	Boxes,
	CheckCircle2,
	Save,
	ShieldCheck,
	PackageCheck,
	AlertCircle,
	Gift,
	Package,
} from "lucide-react";

interface WarehouseVerifyModalProps {
	order: Order | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

interface VerificationRow {
	rowKey: string;
	id: number;
	isAddon: boolean;
	productName: string;
	sku: string;
	unitName?: string;
	orderQuantity: number;
	isVerified: boolean;
	physicalQuantity: number | string;
	adjustedQuantity?: number;
	availableStock?: number;
}

export function WarehouseVerifyModal({
	order,
	open,
	onOpenChange,
	onSuccess,
}: WarehouseVerifyModalProps) {
	const queryClient = useQueryClient();
	const { canVerifyStock } = usePermissions();
	const [rows, setRows] = useState<VerificationRow[]>([]);
	const [reason, setReason] = useState<string>("");

	// Fetch freshest order detail to ensure latest items & addons are loaded
	const { data: freshOrder, isLoading: isOrderLoading } = useQuery({
		queryKey: ["order-detail", order?.id],
		queryFn: () =>
			order?.id ? ordersApi.get(order.id) : Promise.resolve(null),
		enabled: Boolean(order?.id && open),
		staleTime: 0,
	});

	const activeOrder = freshOrder || order;

	useEffect(() => {
		if (activeOrder) {
			const regularItems: VerificationRow[] = (activeOrder.items || []).map(
				(item: OrderItem) => {
					const itemId = Number(item.id || item.orderItemId);
					const qty = Number(item.quantity) || 1;
					const existingAdj = (item as any).adjustedQuantity;
					const hasAdjustment =
						existingAdj !== undefined &&
						existingAdj !== null &&
						Number(existingAdj) !== qty;
					const physicalQty = hasAdjustment ? Number(existingAdj) : qty;

					return {
						rowKey: `item-${itemId}`,
						id: itemId,
						isAddon: false,
						productName: item.productName || item.sku || `Item #${itemId}`,
						sku: item.sku || "—",
						unitName: item.unitName,
						orderQuantity: qty,
						availableStock: item.availableStock ?? item.warehouseStock,
						isVerified: hasAdjustment ? false : Boolean(item.isVerified),
						physicalQuantity: physicalQty,
						adjustedQuantity: hasAdjustment ? physicalQty : undefined,
					};
				},
			);

			const addonsList = activeOrder.addons || activeOrder.addonsItems || [];
			const addonItems: VerificationRow[] = addonsList.map(
				(addon: OrderAddon, idx: number) => {
					const addonId = Number(addon.id);
					const qty = Number(addon.quantity) || 1;
					const existingAdj = (addon as any).adjustedQuantity;
					const hasAdjustment =
						existingAdj !== undefined &&
						existingAdj !== null &&
						Number(existingAdj) !== qty;
					const physicalQty = hasAdjustment ? Number(existingAdj) : qty;

					return {
						rowKey: `addon-${addonId || idx}`,
						id: addonId,
						isAddon: true,
						productName:
							addon.productName ||
							addon.name ||
							addon.description ||
							`Add-on #${addonId || idx + 1}`,
						sku: addon.sku || "—",
						unitName: addon.unitName,
						orderQuantity: qty,
						availableStock: addon.availableStock ?? addon.warehouseStock,
						isVerified: hasAdjustment ? false : Boolean(addon.isVerified),
						physicalQuantity: physicalQty,
						adjustedQuantity: hasAdjustment ? physicalQty : undefined,
					};
				},
			);

			setRows([...regularItems, ...addonItems]);
		} else {
			setRows([]);
		}
	}, [activeOrder]);

	const verifyMutation = useMutation({
		mutationFn: (payload: {
			id: string | number;
			request: VerifyOrderItemsRequest;
		}) => ordersApi.verifyOrderItems(payload.id, payload.request),
		onSuccess: (_, variables) => {
			const isTemp = variables.request.isTemporarySave;
			const hasAdjustment =
				(variables.request.items || []).some(
					(i) => i.adjustedQuantity !== undefined && i.adjustedQuantity !== null,
				) ||
				(variables.request.addons || []).some(
					(a) => a.adjustedQuantity !== undefined && a.adjustedQuantity !== null,
				);

			if (isTemp) {
				toast.success(
					"Warehouse verification progress saved (Draft - No Audit Log)",
				);
			} else if (hasAdjustment) {
				toast.info(
					"Quantities adjusted due to stock shortage. Order returned to Sale Manager for re-approval.",
				);
			} else {
				toast.success(
					"Final warehouse verification approved & stockkeeper signature recorded!",
				);
			}
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.invalidateQueries({ queryKey: ["order-histories"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!order) return null;

	const totalItems = rows.length;
	const checkedCount = rows.filter((r) => r.isVerified).length;
	const percentChecked =
		totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
	const hasAnyAdjustment = rows.some(
		(r) => r.adjustedQuantity !== undefined && r.adjustedQuantity !== r.orderQuantity,
	);

	const isManagerApproved = Boolean(activeOrder?.saleManagerApproved);
	const canSubmitVerification = canVerifyStock && isManagerApproved;

	const handleToggleVerify = (rowKey: string, checked: boolean) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.rowKey !== rowKey) return r;
				const hasAdjustment =
					r.adjustedQuantity !== undefined &&
					r.adjustedQuantity !== r.orderQuantity;
				if (hasAdjustment && checked) {
					toast.warning(
						"Cannot mark as verified while physical count differs from ordered quantity",
					);
					return { ...r, isVerified: false };
				}
				return { ...r, isVerified: checked };
			}),
		);
	};

	const handleToggleCheckAll = (checked: boolean) => {
		setRows((prev) =>
			prev.map((r) => {
				const hasAdjustment =
					r.adjustedQuantity !== undefined &&
					r.adjustedQuantity !== r.orderQuantity;
				return {
					...r,
					isVerified: hasAdjustment ? false : checked,
				};
			}),
		);
	};

	const handlePhysicalQtyChange = (
		rowKey: string,
		rawVal: number | string,
	) => {
		setRows((prev) =>
			prev.map((r) => {
				if (r.rowKey !== rowKey) return r;
				if (rawVal === "") {
					return {
						...r,
						physicalQuantity: "",
						adjustedQuantity: 0,
						isVerified: false,
					};
				}
				const numVal = Math.max(0, Number(rawVal));
				const isAdjusted = numVal !== r.orderQuantity;
				return {
					...r,
					physicalQuantity: numVal,
					adjustedQuantity: isAdjusted ? numVal : undefined,
					isVerified: isAdjusted ? false : r.isVerified,
				};
			}),
		);
	};

	const handleSave = (isTemporarySave: boolean) => {
		const itemDetails: ItemVerificationDetail[] = rows
			.filter((r) => !r.isAddon)
			.map((r) => {
				const hasAdjustment =
					r.adjustedQuantity !== undefined &&
					r.adjustedQuantity !== null &&
					r.adjustedQuantity !== r.orderQuantity;

				const detail: ItemVerificationDetail = {
					orderItemId: r.id,
					isVerified: hasAdjustment ? false : r.isVerified,
					verifiedQuantity: r.orderQuantity,
				};

				if (hasAdjustment) {
					detail.adjustedQuantity = r.adjustedQuantity;
				}

				return detail;
			});

		const addonDetails: AddonVerificationDetail[] = rows
			.filter((r) => r.isAddon)
			.map((r) => {
				const hasAdjustment =
					r.adjustedQuantity !== undefined &&
					r.adjustedQuantity !== null &&
					r.adjustedQuantity !== r.orderQuantity;

				const detail: AddonVerificationDetail = {
					orderItemId: r.id,
					orderAddonId: r.id,
					isVerified: hasAdjustment ? false : r.isVerified,
					verifiedQuantity: r.orderQuantity,
				};

				if (hasAdjustment) {
					detail.adjustedQuantity = r.adjustedQuantity;
				}

				return detail;
			});

		const request: VerifyOrderItemsRequest = {
			isTemporarySave,
			reason:
				reason.trim() ||
				(isTemporarySave
					? "Temporary progress save in warehouse"
					: "Physical item verification complete"),
			items: itemDetails,
			addons: addonDetails,
		};

		verifyMutation.mutate({ id: order.id, request });
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Physical Warehouse Verification (Stockkeeper)"
			subtitle={`Inspect physical stock in warehouse for Order ${
				order.orderNumber || order.orderNo
			}`}
			icon={<Boxes className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
			size="xl"
			glassmorphism={true}
			draggable={true}
			resizable={true}
			isLoading={verifyMutation.isPending || isOrderLoading}
			footer={
				<ModernModalFooter className="gap-3">
					<ModernModalCancelButton
						onClick={() => onOpenChange(false)}
						height="h-11"
						width="min-w-[120px]"
						padding="px-5"
					/>
					<ModernModalActionButton
						onClick={() => handleSave(true)}
						disabled={verifyMutation.isPending || !canSubmitVerification}
						variant="outline"
						height="h-11"
						width="min-w-[170px]"
						padding="px-5"
						className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40 font-semibold"
						icon={<Save className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
					>
						Temporary Save (Draft)
					</ModernModalActionButton>
					<ModernModalSubmitButton
						onClick={() => handleSave(false)}
						disabled={!canSubmitVerification}
						isLoading={verifyMutation.isPending}
						loadingText="Submitting..."
						height="h-11"
						width="min-w-[190px]"
						padding="px-6"
						icon={
							hasAnyAdjustment ? (
								<AlertCircle className="h-4 w-4" />
							) : (
								<ShieldCheck className="h-4 w-4" />
							)
						}
						className={
							hasAnyAdjustment
								? "bg-amber-600 hover:bg-amber-700 text-white"
								: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
						}
					>
						{hasAnyAdjustment
							? "Adjust & Request Re-approval"
							: "Submit Final Approval"}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-5">
				{/* Warning banner when awaiting Sale Manager approval */}
				{!isManagerApproved && (
					<div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3 text-rose-900 dark:text-rose-200">
						<AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
						<div className="space-y-0.5">
							<h5 className="font-bold text-xs">Awaiting Sale Manager Approval</h5>
							<p className="text-[11px] text-rose-700 dark:text-rose-300">
								Physical warehouse verification is locked until the Sale Manager approves the order pricing.
							</p>
						</div>
					</div>
				)}

				{/* Warning banner when quantities are adjusted */}
				{hasAnyAdjustment && (
					<div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200">
						<AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
						<div className="space-y-0.5">
							<h5 className="font-bold text-xs">Physical Quantity Adjusted</h5>
							<p className="text-[11px] text-amber-700 dark:text-amber-300">
								You have adjusted the physical count of one or more items. Submitting will reset the Sale Manager approval and return this order to the Sale Manager for re-approval or modification.
							</p>
						</div>
					</div>
				)}
				{/* Progress & Summary Bar */}
				<div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<PackageCheck className="h-4 w-4 text-emerald-600" />
							<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Inspection Progress: {checkedCount} / {totalItems} items
								verified ({percentChecked}%)
							</span>
						</div>
						<Badge
							variant="outline"
							className={`text-xs font-semibold ${
								percentChecked === 100
									? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
									: percentChecked > 0
										? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
										: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
							}`}
						>
							{percentChecked === 100 ? (
								<span className="inline-flex items-center gap-1">
									<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
									All Items Verified
								</span>
							) : percentChecked > 0 ? (
								"Partially Verified"
							) : (
								"Pending Inspection"
							)}
						</Badge>
					</div>

					<Progress value={percentChecked} className="h-2 rounded-full" />
				</div>

				{/* Verification Items Table */}
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-4 px-1 py-1">
						<ModernCheckbox
							label="Check / Uncheck All Line Items"
							checked={totalItems > 0 && checkedCount === totalItems}
							onCheckedChange={(c) => handleToggleCheckAll(Boolean(c))}
						/>
						<div className="flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0">
							<span className="text-slate-400 dark:text-slate-500 font-medium">Order No:</span>
							<span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/90 dark:border-slate-700/80 select-all">
								{order.orderNumber || order.orderNo || `#${order.id}`}
							</span>
						</div>
					</div>

					<div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
						<table className="w-full text-left text-xs">
							<thead className="bg-slate-100/90 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
								<tr>
									<th className="p-3 w-14 text-center">Verify</th>
									<th className="p-3">Product Items</th>
									<th className="p-3 w-28 text-center">Ordered Qty</th>
									<th className="p-3 w-36 text-center">Physical Count</th>
									<th className="p-3 w-32 text-center">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
								{rows.map((row) => {
									const physicalCount =
										typeof row.physicalQuantity === "number"
											? row.physicalQuantity
											: row.physicalQuantity === ""
												? 0
												: Number(row.physicalQuantity) || 0;
									const hasDifference =
										row.adjustedQuantity !== undefined &&
										row.adjustedQuantity !== row.orderQuantity;
									const delta = physicalCount - row.orderQuantity;

									return (
										<tr
											key={row.rowKey}
											className={
												row.isVerified
													? "bg-emerald-50/30 dark:bg-emerald-950/20"
													: row.isAddon
														? "bg-purple-50/20 dark:bg-purple-950/10"
														: ""
											}
										>
											<td className="p-3 text-center">
												<ModernCheckbox
													checked={row.isVerified}
													onCheckedChange={(c) =>
														handleToggleVerify(row.rowKey, Boolean(c))
													}
												/>
											</td>

											<td className="p-3">
												<div className="flex items-center gap-2.5">
													<div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
														{row.isAddon ? (
															<Gift className="h-4 w-4 text-purple-600 dark:text-purple-400" />
														) : (
															<Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
														)}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span className="font-bold text-slate-900 dark:text-slate-100 truncate">
																{row.productName}
															</span>
															{row.isAddon && (
																<Badge
																	variant="secondary"
																	className="bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] py-0 px-1.5 font-semibold gap-1"
																>
																	<Gift className="h-2.5 w-2.5" /> Add-On
																</Badge>
															)}
														</div>
														<div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
															{row.availableStock !== undefined && (
																<span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
																	<span
																		className={cn(
																			"h-1.5 w-1.5 rounded-full shrink-0",
																			row.availableStock >= row.orderQuantity
																				? "bg-emerald-500"
																				: "bg-rose-500",
																		)}
																	/>
																	<span>
																		In Stock:{" "}
																		<strong className="font-semibold text-slate-700 dark:text-slate-300">
																			{row.availableStock}
																		</strong>
																	</span>
																</span>
															)}
															{row.availableStock !== undefined &&
																row.availableStock < row.orderQuantity && (
																	<Badge
																		variant="outline"
																		className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 text-[10px] py-0 px-1.5 font-semibold"
																	>
																		Shortage: Lack {row.orderQuantity - row.availableStock}
																	</Badge>
																)}
														</div>
													</div>
												</div>
											</td>

											<td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
												{row.orderQuantity}
												{row.unitName && (
													<span className="ml-1 text-[10px] font-normal text-slate-400">
														{row.unitName}
													</span>
												)}
											</td>

											<td className="p-2">
												<ModernInput
													type="number"
													min="0"
													value={row.physicalQuantity}
													onChange={(e) =>
														handlePhysicalQtyChange(
															row.rowKey,
															e.target.value === ""
																? ""
																: Number(e.target.value),
														)
													}
													inputSize="sm"
													className={`font-mono font-bold text-center ${
														hasDifference
															? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
															: ""
													}`}
												/>
												{hasDifference && (
													<div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 text-center">
														Delta ({delta > 0 ? `+${delta}` : delta})
													</div>
												)}
											</td>

											<td className="p-3 text-center">
												{row.isVerified ? (
													<Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] py-0.5 px-2.5 gap-1 shadow-2xs">
														<CheckCircle2 className="h-3 w-3" /> Checked
													</Badge>
												) : (
													<Badge
														variant="outline"
														className="text-slate-400 border-slate-300 dark:border-slate-700 text-[10px]"
													>
														Pending
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

				{/* Verification Note */}
				<div className="space-y-1">
					<ModernTextarea
						label="Stockkeeper Inspection Notes"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Notes on aisle location, physical condition, packaging integrity, or variance justification..."
						rows={2}
						helperText="Optional reference notes recorded with this verification submission."
					/>
				</div>
			</div>
		</ModernModal>
	);
}

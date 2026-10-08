"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	InventoryImport,
	SupplierReturn,
	CreateSupplierReturnRequest,
	SupplierReturnItemInput,
} from "@/lib/types";
import { supplierReturnsApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Truck,
	Building2,
	Calendar,
	DollarSign,
	Boxes,
	RotateCcw,
	AlertTriangle,
	FileText,
	CheckCircle2,
	Package,
	Layers,
	Copy,
	CheckCheck,
	Printer,
	ChevronRight,
	Sparkles,
} from "lucide-react";

interface SupplierReturnModalProps {
	importData: InventoryImport | null;
	open: boolean;
	onClose: () => void;
	onSuccess?: (returnData: SupplierReturn) => void;
}

interface ReturnItemRowState {
	selected: boolean;
	variantId: number | string;
	productId?: number | string;
	productName: string;
	variantName?: string;
	sku?: string;
	unitId: number | string;
	unitName: string;
	maxQuantity: number;
	quantity: number;
	unitCost: number;
	reason: string;
}

export function SupplierReturnModal({
	importData,
	open,
	onClose,
	onSuccess,
}: SupplierReturnModalProps) {
	const queryClient = useQueryClient();

	// State Management
	const [returnAll, setReturnAll] = useState(true);
	const [reason, setReason] = useState("Quality defect — full batch rejected");
	const [notes, setNotes] = useState("");
	const [itemRows, setItemRows] = useState<ReturnItemRowState[]>([]);
	const [completedReturn, setCompletedReturn] = useState<SupplierReturn | null>(
		null,
	);
	const [copiedReturnNum, setCopiedReturnNum] = useState(false);

	// Initialize line items when importData changes
	useEffect(() => {
		if (!importData) {
			setItemRows([]);
			return;
		}

		const items = importData.items || [];
		const initialRows: ReturnItemRowState[] = items.map((it) => {
			const qty = Number(it.quantity) || 1;
			const cost = Number(it.unitCost) || 0;
			return {
				selected: true,
				variantId: it.variantId || it.productId || 1,
				productId: it.productId,
				productName: it.productName || it.variantName || "Product",
				variantName: it.variantName,
				sku: it.sku,
				unitId: it.unitId || 1,
				unitName: it.unitName || "Pcs",
				maxQuantity: qty,
				quantity: qty,
				unitCost: cost,
				reason: "",
			};
		});

		setItemRows(initialRows);
		setReturnAll(true);
		setReason("Quality defect — full batch rejected");
		setNotes("");
		setCompletedReturn(null);
	}, [importData, open]);

	// Computed Totals
	const selectedRows = useMemo(
		() => itemRows.filter((r) => r.selected && r.quantity > 0),
		[itemRows],
	);

	const totalReturnUnits = useMemo(() => {
		if (returnAll) {
			return itemRows.reduce((sum, r) => sum + r.maxQuantity, 0);
		}
		return selectedRows.reduce((sum, r) => sum + r.quantity, 0);
	}, [returnAll, itemRows, selectedRows]);

	const totalReturnCost = useMemo(() => {
		if (returnAll) {
			return (
				Number(importData?.totalCost ?? importData?.totalAmount) ||
				itemRows.reduce((sum, r) => sum + r.maxQuantity * r.unitCost, 0)
			);
		}
		return selectedRows.reduce((sum, r) => sum + r.quantity * r.unitCost, 0);
	}, [returnAll, importData, itemRows, selectedRows]);

	// Return Mutation
	const returnMutation = useMutation({
		mutationFn: (payload: CreateSupplierReturnRequest) =>
			supplierReturnsApi.create(payload),
		onSuccess: (returnData) => {
			toast.success(`Return #${returnData.returnNumber || "Success"} recorded`);
			queryClient.invalidateQueries({ queryKey: ["inventory-imports"] });
			queryClient.invalidateQueries({ queryKey: ["supplier-returns"] });
			queryClient.invalidateQueries({ queryKey: ["inventory-import-detail"] });
			queryClient.invalidateQueries({ queryKey: ["stocks"] });
			setCompletedReturn(returnData);
			if (onSuccess) onSuccess(returnData);
		},
		onError: (err) => {
			toast.error(getErrorMessage(err));
		},
	});

	if (!importData) return null;

	const refNo =
		importData.referenceNo || importData.importNo || `IMP-${importData.id}`;

	const handleToggleRow = (index: number) => {
		setItemRows((prev) =>
			prev.map((row, i) =>
				i === index ? { ...row, selected: !row.selected } : row,
			),
		);
	};

	const handleQuantityChange = (index: number, val: number) => {
		setItemRows((prev) =>
			prev.map((row, i) => {
				if (i !== index) return row;
				const clamped = Math.max(1, Math.min(val || 1, row.maxQuantity));
				return { ...row, quantity: clamped };
			}),
		);
	};

	const handleItemReasonChange = (index: number, val: string) => {
		setItemRows((prev) =>
			prev.map((row, i) => (i === index ? { ...row, reason: val } : row)),
		);
	};

	const handleSelectAll = (checked: boolean) => {
		setItemRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
	};

	const handleSubmit = () => {
		if (!reason.trim()) {
			toast.error("Please enter a return reason");
			return;
		}

		if (!returnAll && selectedRows.length === 0) {
			toast.error("Please select at least one item to return");
			return;
		}

		const payload: CreateSupplierReturnRequest = {
			importId: importData.id,
			referenceNo: refNo,
			returnAll,
			reason: reason.trim(),
			notes: notes.trim() || undefined,
			items: !returnAll
				? selectedRows.map((r) => ({
						variantId: r.variantId,
						unitId: r.unitId,
						quantity: r.quantity,
						reason: r.reason.trim() || reason.trim(),
					}))
				: undefined,
		};

		returnMutation.mutate(payload);
	};

	const handleCopyReturnNum = (num: string) => {
		navigator.clipboard.writeText(num);
		setCopiedReturnNum(true);
		toast.success("Return number copied to clipboard");
		setTimeout(() => setCopiedReturnNum(false), 2000);
	};

	// ==========================================
	// Success Receipt View
	// ==========================================
	if (completedReturn) {
		return (
			<ModernModal
				isOpen={open}
				onClose={onClose}
				title="Stock Return Registered"
				subtitle="The return voucher has been generated and stock balances adjusted."
				icon={
					<div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 shadow-2xs">
						<CheckCircle2 className="h-5 w-5" />
					</div>
				}
				size="lg"
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton
							onClick={() => window.print()}
							label="Print Return Slip"
							icon={<Printer className="h-4 w-4 text-slate-500" />}
						/>
						<Button
							onClick={onClose}
							className="rounded-xl px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
						>
							Done
						</Button>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-1">
					{/* Voucher Header Card */}
					<div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div>
								<span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
									Return Voucher Number
								</span>
								<div className="flex items-center gap-2 mt-0.5">
									<span className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
										{completedReturn.returnNumber}
									</span>
									<button
										onClick={() =>
											handleCopyReturnNum(completedReturn.returnNumber)
										}
										className="text-slate-400 hover:text-emerald-600 transition-colors"
									>
										{copiedReturnNum ? (
											<CheckCheck className="h-4 w-4 text-emerald-600" />
										) : (
											<Copy className="h-4 w-4" />
										)}
									</button>
								</div>
							</div>

							<div className="text-left sm:text-right">
								<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
									Return Credit Value
								</span>
								<span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 block mt-0.5">
									$
									{Number(completedReturn.totalCost).toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</span>
							</div>
						</div>

						<div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
							<div>
								<span className="text-[10px] text-muted-foreground block">
									Import Ref
								</span>
								<span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
									{completedReturn.importNumber || refNo}
								</span>
							</div>
							<div>
								<span className="text-[10px] text-muted-foreground block">
									Supplier
								</span>
								<span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
									{completedReturn.supplierName ||
										importData.supplierName ||
										"Supplier"}
								</span>
							</div>
							<div>
								<span className="text-[10px] text-muted-foreground block">
									Mode
								</span>
								<Badge
									variant="outline"
									className={`text-[9px] font-bold ${
										completedReturn.returnAll
											? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
											: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
									}`}
								>
									{completedReturn.returnAll ? "Full Return" : "Partial Return"}
								</Badge>
							</div>
							<div>
								<span className="text-[10px] text-muted-foreground block">
									Total Items
								</span>
								<span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
									{completedReturn.items?.length || 0} returned lines
								</span>
							</div>
						</div>
					</div>

					{/* Returned Items Table */}
					<div className="space-y-2">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<Boxes className="h-3.5 w-3.5 text-emerald-600" />
							<span>
								Returned Manifest Items ({completedReturn.items?.length || 0})
							</span>
						</h4>

						<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-xs">
									<thead>
										<tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-muted-foreground font-semibold text-[11px]">
											<th className="py-2.5 px-3 text-left">Item / SKU</th>
											<th className="py-2.5 px-3 text-left">Unit</th>
											<th className="py-2.5 px-3 text-right">Returned Qty</th>
											<th className="py-2.5 px-3 text-right">Unit Cost</th>
											<th className="py-2.5 px-3 text-right">Total Credit</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
										{completedReturn.items?.map((item, idx) => (
											<tr
												key={idx}
												className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
											>
												<td className="py-2.5 px-3">
													<div className="space-y-0.5">
														<span className="font-bold text-slate-900 dark:text-slate-100 block">
															{item.variantName || `Item #${item.variantId}`}
														</span>
														{item.variantSku && (
															<span className="text-[10px] font-mono text-muted-foreground block">
																{item.variantSku}
															</span>
														)}
													</div>
												</td>
												<td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">
													{item.inputUnitName || "Pcs"}
												</td>
												<td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
													{item.quantity || item.inputQuantity}
												</td>
												<td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
													${Number(item.unitCost).toFixed(2)}
												</td>
												<td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
													${Number(item.totalCost).toFixed(2)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Reason & Notes */}
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1 text-xs">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
							Reason / Justification
						</span>
						<p className="text-slate-800 dark:text-slate-200">
							{completedReturn.reason}
						</p>
						{completedReturn.notes && (
							<p className="text-muted-foreground pt-1 border-t border-slate-200 dark:border-slate-800">
								<span className="font-semibold">Notes:</span>{" "}
								{completedReturn.notes}
							</p>
						)}
					</div>
				</div>
			</ModernModal>
		);
	}

	// ==========================================
	// Main Return Creation Modal
	// ==========================================
	return (
		<ModernModal
			isOpen={open}
			onClose={onClose}
			title={`Return Stock to Supplier`}
			subtitle={`Origin Import: #${refNo} • ${importData.supplierName || "Supplier"}`}
			icon={
				<div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 shadow-2xs">
					<RotateCcw className="h-5 w-5" />
				</div>
			}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={onClose}
						disabled={returnMutation.isPending}
					/>
					<ModernModalSubmitButton
						onClick={handleSubmit}
						disabled={returnMutation.isPending}
						label={
							returnMutation.isPending
								? "Processing Return..."
								: `Confirm Return (${totalReturnUnits} Units)`
						}
						icon={<RotateCcw className="h-4 w-4 shrink-0" />}
					/>
				</ModernModalFooter>
			}
		>
			<div className="space-y-5">
				{/* Source Import Overview Banner */}
				<div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/30 dark:from-slate-900/80 dark:to-purple-950/20 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">
								#{refNo}
							</span>
							<span className="text-xs text-muted-foreground">•</span>
							<span className="font-bold text-xs text-slate-900 dark:text-slate-100">
								{importData.supplierName || "Primary Supplier"}
							</span>
						</div>
						<p className="text-[11px] text-muted-foreground flex items-center gap-2">
							<span>{importData.warehouseName || "Main Hub Warehouse"}</span>
							<span>•</span>
							<span>{itemRows.length} item lines in manifest</span>
						</p>
					</div>

					<div className="text-right">
						<span className="text-[10px] text-muted-foreground block">
							Original Shipment Total
						</span>
						<span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
							$
							{(
								Number(importData.totalCost ?? importData.totalAmount) || 0
							).toLocaleString(undefined, {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</span>
					</div>
				</div>

				{/* Return Mode Selection */}
				<div className="space-y-2">
					<Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
						Select Return Mode
					</Label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{/* Full Return Card */}
						<div
							onClick={() => setReturnAll(true)}
							className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
								returnAll
									? "border-rose-500 bg-rose-50/40 dark:bg-rose-950/30 shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300"
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<div
											className={`h-4 w-4 rounded-full border flex items-center justify-center ${
												returnAll
													? "border-rose-600 bg-rose-600 text-white"
													: "border-slate-300 dark:border-slate-700"
											}`}
										>
											{returnAll && (
												<div className="h-1.5 w-1.5 rounded-full bg-white" />
											)}
										</div>
										<span className="font-bold text-xs text-slate-900 dark:text-slate-100">
											Full Batch Return
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground pl-6">
										Return all {itemRows.length} item lines in this import back
										to the supplier.
									</p>
								</div>
							</div>
						</div>

						{/* Partial Return Card */}
						<div
							onClick={() => setReturnAll(false)}
							className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
								!returnAll
									? "border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300"
							}`}
						>
							<div className="flex items-start justify-between">
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<div
											className={`h-4 w-4 rounded-full border flex items-center justify-center ${
												!returnAll
													? "border-purple-600 bg-purple-600 text-white"
													: "border-slate-300 dark:border-slate-700"
											}`}
										>
											{!returnAll && (
												<div className="h-1.5 w-1.5 rounded-full bg-white" />
											)}
										</div>
										<span className="font-bold text-xs text-slate-900 dark:text-slate-100">
											Partial Return (Select SKUs)
										</span>
									</div>
									<p className="text-[11px] text-muted-foreground pl-6">
										Choose specific defective or excess items and quantities to
										return.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Partial Return Item Selector Table */}
				{!returnAll && (
					<div className="space-y-2.5 animate-in fade-in duration-200">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
								<Boxes className="h-3.5 w-3.5 text-purple-600" />
								<span>Select Items & Quantities to Return</span>
							</Label>

							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleSelectAll(true)}
									className="h-7 text-[11px] font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50"
								>
									Select All
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => handleSelectAll(false)}
									className="h-7 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
								>
									Deselect All
								</Button>
							</div>
						</div>

						<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden max-h-64 overflow-y-auto">
							<table className="w-full text-xs">
								<thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
									<tr className="border-b border-slate-200 dark:border-slate-700 text-muted-foreground font-semibold text-[11px]">
										<th className="py-2.5 px-3 text-left w-8">
											<Checkbox
												checked={
													itemRows.length > 0 &&
													itemRows.every((r) => r.selected)
												}
												onCheckedChange={(checked) =>
													handleSelectAll(Boolean(checked))
												}
											/>
										</th>
										<th className="py-2.5 px-3 text-left">Item / Variant</th>
										<th className="py-2.5 px-3 text-left">Unit</th>
										<th className="py-2.5 px-3 text-center w-28">Return Qty</th>
										<th className="py-2.5 px-3 text-left">
											Item Reason (Optional)
										</th>
										<th className="py-2.5 px-3 text-right">Credit Value</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{itemRows.map((row, idx) => {
										const lineCredit = row.quantity * row.unitCost;
										return (
											<tr
												key={idx}
												className={`transition-colors ${
													row.selected
														? "bg-purple-50/20 dark:bg-purple-950/20"
														: "opacity-60 hover:opacity-100"
												}`}
											>
												<td className="py-2.5 px-3">
													<Checkbox
														checked={row.selected}
														onCheckedChange={() => handleToggleRow(idx)}
													/>
												</td>
												<td className="py-2.5 px-3">
													<div className="space-y-0.5 max-w-[180px]">
														<span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
															{row.productName}
														</span>
														<div className="flex items-center gap-1.5 flex-wrap">
															{row.variantName && (
																<Badge className="text-[9px] px-1 py-0 h-4 bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200">
																	{row.variantName}
																</Badge>
															)}
															{row.sku && (
																<span className="text-[10px] font-mono text-muted-foreground">
																	{row.sku}
																</span>
															)}
														</div>
													</div>
												</td>
												<td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">
													{row.unitName}
												</td>
												<td className="py-2.5 px-3 text-center">
													<div className="flex items-center justify-center gap-1">
														<Input
															type="number"
															min={1}
															max={row.maxQuantity}
															value={row.quantity}
															disabled={!row.selected}
															onChange={(e) =>
																handleQuantityChange(
																	idx,
																	parseInt(e.target.value, 10),
																)
															}
															className="h-7 w-16 text-xs text-center font-mono font-bold"
														/>
														<span className="text-[10px] text-muted-foreground">
															/ {row.maxQuantity}
														</span>
													</div>
												</td>
												<td className="py-2.5 px-3">
													<Input
														placeholder="e.g. Wrong colour delivered"
														value={row.reason}
														disabled={!row.selected}
														onChange={(e) =>
															handleItemReasonChange(idx, e.target.value)
														}
														className="h-7 text-xs"
													/>
												</td>
												<td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
													${lineCredit.toFixed(2)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Return Reason Field (Required) */}
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Return Reason <span className="text-rose-500">*</span>
						</Label>
						<span className="text-[11px] text-muted-foreground">
							Select a preset or type custom reason
						</span>
					</div>

					<Input
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g. Quality defect — full batch rejected"
						className="text-xs font-medium"
					/>

					{/* Quick Preset Badges */}
					<div className="flex items-center gap-1.5 flex-wrap pt-1">
						<span className="text-[10px] text-muted-foreground font-semibold">
							Presets:
						</span>
						{[
							"Quality defect — full batch rejected",
							"Partial quality issue",
							"Wrong items / specifications delivered",
							"Damaged during transit",
							"Supplier recall",
						].map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => setReason(preset)}
								className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-100 hover:text-purple-700 transition-colors"
							>
								{preset}
							</button>
						))}
					</div>
				</div>

				{/* Notes Field (Optional) */}
				<div className="space-y-1.5">
					<Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
						Notes / Correspondence (Optional)
					</Label>
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="e.g. Supplier agreed via email 2026-08-10, RMA #4881"
						rows={2}
						className="text-xs resize-none"
					/>
				</div>

				{/* Real-time Summary Card */}
				<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
					<div className="space-y-0.5">
						<span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
							Estimated Return Summary
						</span>
						<div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
							<Badge
								variant="secondary"
								className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold"
							>
								{returnAll ? "FULL RETURN" : "PARTIAL RETURN"}
							</Badge>
							<span>
								{totalReturnUnits} units across{" "}
								{returnAll ? itemRows.length : selectedRows.length} item line(s)
							</span>
						</div>
					</div>

					<div className="text-right">
						<span className="text-[10px] text-muted-foreground block">
							Total Return Credit
						</span>
						<span className="text-lg font-mono font-extrabold text-rose-600 dark:text-rose-400">
							$
							{totalReturnCost.toLocaleString(undefined, {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</span>
					</div>
				</div>
			</div>
		</ModernModal>
	);
}

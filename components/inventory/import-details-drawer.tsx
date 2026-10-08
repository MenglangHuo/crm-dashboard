"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryImport, ImportProductGroup } from "@/lib/types";
import { inventoryImportsApi, safeImageUrl } from "@/lib/api/endpoints";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Truck,
	Building2,
	Calendar,
	Clock,
	Package,
	FileText,
	Printer,
	Copy,
	CheckCheck,
	TrendingUp,
	Boxes,
	Layers,
	DollarSign,
	Phone,
	Tag,
	CheckCircle2,
	Loader2,
	ShieldCheck,
	CircleDot,
	RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface ImportDetailsDrawerProps {
	importId?: string | number | null;
	importData?: InventoryImport | null;
	open: boolean;
	onClose: () => void;
	onEdit?: (importData: InventoryImport) => void;
	onReturn?: (importData: InventoryImport) => void;
}

function SafeThumb({ src, alt }: { src?: string; alt?: string }) {
	const [error, setError] = useState(false);
	const url = safeImageUrl(src);

	if (error || !src) {
		return (
			<div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
				<Package className="h-4 w-4 opacity-60" />
			</div>
		);
	}

	return (
		<img
			src={url}
			alt={alt || "Product"}
			onError={() => setError(true)}
			className="h-9 w-9 rounded-lg object-cover border border-slate-100 dark:border-slate-800 shrink-0"
		/>
	);
}

export function ImportDetailsDrawer({
	importId,
	importData: initialData,
	open,
	onClose,
	onEdit,
	onReturn,
}: ImportDetailsDrawerProps) {
	const [copied, setCopied] = useState(false);

	const effectiveId = importId ?? initialData?.id;

	// Fetch full details via GET /api/v1/imports/{importId}
	const { data: fetchedData, isLoading } = useQuery({
		queryKey: ["inventory-import-detail", effectiveId],
		queryFn: () => (effectiveId ? inventoryImportsApi.get(effectiveId) : null),
		enabled: open && Boolean(effectiveId),
		staleTime: 60 * 1000,
	});

	const importData = fetchedData || initialData;

	if (!open) return null;

	if (isLoading && !importData) {
		return (
			<ModernModal
				isOpen={open}
				onClose={onClose}
				title="Loading Import Shipment Details..."
				size="lg"
			>
				<div className="flex flex-col items-center justify-center py-16 space-y-3">
					<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
					<p className="text-sm font-medium text-muted-foreground">
						Retrieving inbound manifest from server...
					</p>
				</div>
			</ModernModal>
		);
	}

	if (!importData) return null;

	const items = importData.items || [];
	const products: ImportProductGroup[] = importData.products || [];
	const hasGroupedProducts = products.length > 0;

	const totalCost = Number(importData.totalCost ?? importData.totalAmount ?? 0);
	const totalUnits =
		importData.totalUnits ??
		items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

	const totalRetail = items.reduce(
		(sum, it) =>
			sum +
			(Number(it.quantity) || 0) *
				(Number(it.untiPrice ?? it.unitPrice ?? it.unitCost) || 0),
		0,
	);
	const grossProfit = Math.max(0, totalRetail - totalCost);
	const marginPct =
		totalRetail > 0 ? ((grossProfit / totalRetail) * 100).toFixed(1) : "0.0";

	const refNo =
		importData.referenceNo || importData.importNo || `IMP-${importData.id}`;

	const handleCopyRef = () => {
		navigator.clipboard.writeText(refNo);
		setCopied(true);
		toast.success("Reference number copied");
		setTimeout(() => setCopied(false), 2000);
	};

	const handlePrint = () => {
		window.print();
	};

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return "—";
		try {
			const d = new Date(
				dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T"),
			);
			if (isNaN(d.getTime())) return dateStr;
			return d.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return dateStr;
		}
	};

	const renderStatusBadge = (statusStr?: string) => {
		const status = (statusStr || "COMPLETED").toUpperCase();
		if (status === "COMPLETED") {
			return (
				<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold gap-1">
					<CheckCircle2 className="h-3 w-3 text-emerald-600" /> COMPLETED
				</Badge>
			);
		}
		if (status === "VERIFIED") {
			return (
				<Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-bold gap-1">
					<ShieldCheck className="h-3 w-3 text-blue-600" /> VERIFIED
				</Badge>
			);
		}
		if (status === "PENDING" || status === "IN_TRANSIT") {
			return (
				<Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px] font-bold gap-1">
					<Clock className="h-3 w-3 text-amber-600" />{" "}
					{status === "IN_TRANSIT" ? "IN TRANSIT" : "PENDING"}
				</Badge>
			);
		}
		return (
			<Badge
				variant="outline"
				className="text-[10px] font-bold text-slate-600 border-slate-200"
			>
				{status}
			</Badge>
		);
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={onClose}
			title={`Inbound Shipment Overview: ${refNo}`}
			subtitle="Complete supplier manifest, multi-unit quantities, and landed cost breakdown."
			icon={
				<div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/60 shadow-2xs">
					<Truck className="h-5 w-5" />
				</div>
			}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={onClose} label="Close" />
					<ModernModalCancelButton
						onClick={handlePrint}
						label="Print Slip"
						icon={<Printer className="h-4 w-4 shrink-0 text-slate-500" />}
					/>
					{onReturn && (
						<Button
							variant="outline"
							onClick={() => {
								onClose();
								onReturn(importData);
							}}
							className="h-9 px-3 rounded-lg text-xs font-semibold gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
						>
							<RotateCcw className="h-3.5 w-3.5 shrink-0 text-rose-500" />
							<span>Return to Supplier</span>
						</Button>
					)}
					{onEdit && (
						<ModernModalSubmitButton
							onClick={() => {
								onClose();
								onEdit(importData);
							}}
							label="Edit Shipment"
							icon={<Truck className="h-4 w-4 shrink-0" />}
						/>
					)}
				</ModernModalFooter>
			}
		>
			<div className="space-y-5">
				{/* Header Summary Banner */}
				<div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/40 dark:from-slate-900/80 dark:to-purple-950/30 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="space-y-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
								{refNo}
							</span>
							<button
								onClick={handleCopyRef}
								className="text-slate-400 hover:text-purple-600 transition-colors"
							>
								{copied ? (
									<CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
								) : (
									<Copy className="h-3.5 w-3.5" />
								)}
							</button>
							{renderStatusBadge(importData.status)}
						</div>
						<p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
							<span className="flex items-center gap-1">
								<Calendar className="h-3 w-3 text-slate-400" /> Received:{" "}
								{formatDate(importData.importDate)}
							</span>
						</p>
					</div>

					<div className="text-left sm:text-right">
						<span className="text-[11px] text-muted-foreground block font-medium">
							Total Landed Shipment Cost
						</span>
						<span className="text-xl font-bold font-mono text-purple-700 dark:text-purple-400 block mt-0.5">
							$
							{totalCost.toLocaleString(undefined, {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</span>
					</div>
				</div>

				{/* Supplier & Warehouse Details */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
							<Truck className="h-3 w-3" /> Supplier Vendor
						</span>
						<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
							{importData.supplierName ||
								importData.supplier?.name ||
								"Primary Supplier"}
						</h4>
						<p className="text-xs text-muted-foreground font-mono">
							{importData.supplierPhone ||
								importData.supplier?.primaryPhone ||
								importData.supplier?.phone ||
								"No phone listed"}
						</p>
					</div>

					<div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
							<Building2 className="h-3 w-3" /> Destination Warehouse
						</span>
						<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
							{importData.warehouseName ||
								(importData.warehouseId
									? `Warehouse #${importData.warehouseId}`
									: "Main Hub")}
						</h4>
						<p className="text-xs text-muted-foreground">
							Inbound Receiving Area
						</p>
					</div>
				</div>

				{/* Metrics Overview Cards */}
				<div className="grid grid-cols-3 gap-2.5 text-center">
					<div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
						<span className="text-[10px] text-slate-500 font-medium block">
							Total Units
						</span>
						<span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
							{totalUnits}
						</span>
					</div>
					<div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/60">
						<span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium block">
							Retail Valuation
						</span>
						<span className="text-base font-bold text-purple-700 dark:text-purple-400 font-mono mt-0.5 block">
							${totalRetail.toFixed(2)}
						</span>
					</div>
					<div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60">
						<span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block">
							Gross Margin
						</span>
						<span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5 block">
							+${grossProfit.toFixed(2)} ({marginPct}%)
						</span>
					</div>
				</div>

				{/* Manifest Line Items Table / Hierarchical Product Breakdown */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<Boxes className="h-3.5 w-3.5 text-purple-600" />
							<span>
								Manifest Items{" "}
								{hasGroupedProducts
									? `(${products.length} Products, ${items.length} Variants)`
									: `(${items.length})`}
							</span>
						</h4>
					</div>

					{hasGroupedProducts ? (
						<div className="space-y-3">
							{products.map((product) => {
								const prodItems = product.items || [];
								const prodTotalCost = prodItems.reduce(
									(sum, it) =>
										sum +
										(Number(it.totalCost) ||
											Number(it.quantity) * Number(it.unitCost)),
									0,
								);
								const prodUnits = prodItems.reduce(
									(sum, it) => sum + (Number(it.quantity) || 0),
									0,
								);

								return (
									<div
										key={product.id}
										className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/40"
									>
										{/* Product Group Header */}
										<div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
													<Package className="h-4 w-4" />
												</div>
												<div>
													<span className="font-bold text-xs text-slate-900 dark:text-slate-100">
														{product.name}
													</span>
													<div className="flex items-center gap-1.5 mt-0.5">
														{product.brand?.name && (
															<Badge
																variant="outline"
																className="text-[9px] px-1.5 py-0 h-4 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
															>
																{product.brand.name}
															</Badge>
														)}
														{product.category?.name && (
															<Badge
																variant="secondary"
																className="text-[9px] px-1.5 py-0 h-4 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
															>
																{product.category.name}
															</Badge>
														)}
													</div>
												</div>
											</div>

											<div className="text-right">
												<span className="text-[10px] text-muted-foreground block">
													{prodUnits} units
												</span>
												<span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400">
													$
													{prodTotalCost.toLocaleString(undefined, {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})}
												</span>
											</div>
										</div>

										{/* Variant Items Table */}
										<div className="overflow-x-auto">
											<table className="w-full text-xs">
												<thead>
													<tr className="bg-slate-50/40 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 text-muted-foreground font-semibold text-[11px]">
														<th className="py-2 px-3 text-left">
															Variant / SKU
														</th>
														<th className="py-2 px-3 text-left">Unit</th>
														<th className="py-2 px-3 text-right">Qty</th>
														<th className="py-2 px-3 text-right">Unit Cost</th>
														<th className="py-2 px-3 text-right">
															Target Retail
														</th>
														<th className="py-2 px-3 text-right">Total Cost</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
													{prodItems.map((item, idx) => {
														const varName =
															item.variant?.name ||
															item.variantName ||
															`Variant #${item.variant?.id || item.variantId || idx + 1}`;
														const sku = item.variant?.sku || item.sku || "";
														const lineCost =
															Number(item.totalCost) ||
															Number(item.quantity) * Number(item.unitCost);

														return (
															<tr
																key={idx}
																className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
															>
																<td className="py-2 px-3">
																	<div className="space-y-0.5">
																		<span className="font-semibold text-slate-800 dark:text-slate-200 block">
																			{varName}
																		</span>
																		{sku && (
																			<span className="text-[10px] font-mono text-muted-foreground block">
																				{sku}
																			</span>
																		)}
																	</div>
																</td>
																<td className="py-2 px-3 font-medium text-slate-600 dark:text-slate-400">
																	{item.unitName || "Pcs"}
																</td>
																<td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
																	{item.quantity}
																</td>
																<td className="py-2 px-3 text-right font-mono text-purple-700 dark:text-purple-400 font-semibold">
																	${Number(item.unitCost).toFixed(2)}
																</td>
																<td className="py-2 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
																	$
																	{Number(
																		item.unitPrice ??
																			item.untiPrice ??
																			item.unitCost,
																	).toFixed(2)}
																</td>
																<td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
																	${lineCost.toFixed(2)}
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-xs">
									<thead>
										<tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-muted-foreground font-semibold text-[11px]">
											<th className="py-2.5 px-3 text-left">Item / Variant</th>
											<th className="py-2.5 px-3 text-left">Unit</th>
											<th className="py-2.5 px-3 text-right">Qty</th>
											<th className="py-2.5 px-3 text-right">Unit Cost</th>
											<th className="py-2.5 px-3 text-right">Target Retail</th>
											<th className="py-2.5 px-3 text-right">Total Cost</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
										{items.map((item, idx) => {
											const lineCost =
												Number(item.totalCost) ||
												Number(item.quantity) * Number(item.unitCost);
											return (
												<tr
													key={idx}
													className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
												>
													<td className="py-2.5 px-3">
														<div className="flex items-center gap-2.5">
															<SafeThumb
																src={item.imageUrl}
																alt={item.productName}
															/>
															<div>
																<span className="font-bold text-slate-900 dark:text-slate-100 block">
																	{item.productName ||
																		`Item #${item.variantId}`}
																</span>
																<div className="flex items-center gap-1 mt-0.5">
																	{item.variantName && (
																		<Badge className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 px-1 py-0 h-4">
																			{item.variantName}
																		</Badge>
																	)}
																	{item.sku && (
																		<span className="text-[10px] text-muted-foreground font-mono">
																			{item.sku}
																		</span>
																	)}
																</div>
															</div>
														</div>
													</td>
													<td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">
														{item.unitName || "Pcs"}
													</td>
													<td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
														{item.quantity}
													</td>
													<td className="py-2.5 px-3 text-right font-mono text-purple-700 dark:text-purple-400 font-semibold">
														${Number(item.unitCost).toFixed(2)}
													</td>
													<td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
														$
														{Number(
															item.untiPrice ?? item.unitPrice ?? item.unitCost,
														).toFixed(2)}
													</td>
													<td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
														${lineCost.toFixed(2)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>

				{/* Note / B2B Shipment Log */}
				{(importData.note || importData.notes) && (
					<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
							<FileText className="h-3 w-3" /> Receiving & Shipment Notes
						</span>
						<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
							{importData.note || importData.notes}
						</p>
					</div>
				)}
			</div>
		</ModernModal>
	);
}

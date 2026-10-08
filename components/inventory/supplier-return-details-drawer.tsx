"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SupplierReturn } from "@/lib/types";
import { supplierReturnsApi } from "@/lib/api/endpoints";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	RotateCcw,
	Truck,
	Building2,
	Calendar,
	DollarSign,
	Boxes,
	Package,
	Layers,
	CheckCircle2,
	ShieldCheck,
	Clock,
	AlertTriangle,
	Copy,
	CheckCheck,
	Printer,
	Loader2,
	FileText,
	UserCheck,
	ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface SupplierReturnDetailsDrawerProps {
	returnId?: string | number | null;
	returnData?: SupplierReturn | null;
	open: boolean;
	onClose: () => void;
	onViewOriginImport?: (
		importId: string | number,
		importNumber?: string,
	) => void;
}

export function SupplierReturnDetailsDrawer({
	returnId,
	returnData: initialData,
	open,
	onClose,
	onViewOriginImport,
}: SupplierReturnDetailsDrawerProps) {
	const [copiedReturnNum, setCopiedReturnNum] = useState(false);
	const [copiedImportNum, setCopiedImportNum] = useState(false);

	const effectiveId = returnId ?? initialData?.id;

	// Fetch full details via GET /api/v1/supplier-returns/{id}
	const { data: fetchedData, isLoading } = useQuery({
		queryKey: ["supplier-return-detail", effectiveId],
		queryFn: () => (effectiveId ? supplierReturnsApi.get(effectiveId) : null),
		enabled: open && Boolean(effectiveId),
		staleTime: 60 * 1000,
	});

	const returnData = fetchedData || initialData;

	if (!open) return null;

	if (isLoading && !returnData) {
		return (
			<ModernModal
				isOpen={open}
				onClose={onClose}
				title="Loading Return Voucher..."
				size="lg"
			>
				<div className="flex flex-col items-center justify-center py-16 space-y-3">
					<Loader2 className="h-8 w-8 animate-spin text-rose-600" />
					<p className="text-sm font-medium text-muted-foreground">
						Retrieving supplier return details from server...
					</p>
				</div>
			</ModernModal>
		);
	}

	if (!returnData) return null;

	const items = returnData.items || [];
	const totalUnits = items.reduce(
		(sum, it) => sum + (Number(it.quantity) || Number(it.inputQuantity) || 0),
		0,
	);
	const totalCost = Number(returnData.totalCost) || 0;

	const handleCopy = (text: string, type: "return" | "import") => {
		navigator.clipboard.writeText(text);
		if (type === "return") {
			setCopiedReturnNum(true);
			setTimeout(() => setCopiedReturnNum(false), 2000);
		} else {
			setCopiedImportNum(true);
			setTimeout(() => setCopiedImportNum(false), 2000);
		}
		toast.success("Copied to clipboard");
	};

	const formatDate = (dateStr?: string | null) => {
		if (!dateStr) return "—";
		try {
			const parsed = dateStr.includes("T")
				? dateStr
				: dateStr.replace(" ", "T");
			const d = new Date(parsed);
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

	const status = (returnData.status || "COMPLETED").toUpperCase();

	const renderStatusBadge = () => {
		if (status === "COMPLETED") {
			return (
				<Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold gap-1">
					<CheckCircle2 className="h-3 w-3 text-emerald-600" /> COMPLETED
				</Badge>
			);
		}
		if (status === "APPROVED") {
			return (
				<Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-bold gap-1">
					<ShieldCheck className="h-3 w-3 text-blue-600" /> APPROVED
				</Badge>
			);
		}
		if (status === "PENDING") {
			return (
				<Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 text-[10px] font-bold gap-1">
					<Clock className="h-3 w-3 text-amber-600" /> PENDING
				</Badge>
			);
		}
		if (status === "REJECTED") {
			return (
				<Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 text-[10px] font-bold gap-1">
					<AlertTriangle className="h-3 w-3 text-rose-600" /> REJECTED
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
			title="Supplier Return Voucher"
			subtitle={`Return #${returnData.returnNumber} • ${returnData.supplierName || "Supplier"}`}
			icon={
				<div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 shadow-2xs">
					<RotateCcw className="h-5 w-5" />
				</div>
			}
			size="lg"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={() => window.print()}
						label="Print Voucher"
						icon={<Printer className="h-4 w-4 text-slate-500" />}
					/>
					<Button
						onClick={onClose}
						className="rounded-xl px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
					>
						Close
					</Button>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Header Voucher Card */}
				<div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/60 via-purple-50/30 to-slate-50 dark:from-rose-950/30 dark:via-purple-950/20 dark:to-slate-900/50 border border-rose-200/80 dark:border-rose-900/60 space-y-3">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
								Return Voucher Number
							</span>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
									#{returnData.returnNumber}
								</span>
								<button
									onClick={() => handleCopy(returnData.returnNumber, "return")}
									className="text-slate-400 hover:text-rose-600 transition-colors"
									title="Copy Return #"
								>
									{copiedReturnNum ? (
										<CheckCheck className="h-4 w-4 text-emerald-600" />
									) : (
										<Copy className="h-4 w-4" />
									)}
								</button>
								{renderStatusBadge()}
							</div>
						</div>

						<div className="text-left sm:text-right">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
								Total Credit Value
							</span>
							<span className="text-xl font-mono font-extrabold text-rose-600 dark:text-rose-400 block mt-0.5">
								$
								{totalCost.toLocaleString(undefined, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}
							</span>
						</div>
					</div>

					<div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
						<div>
							<span className="text-[10px] text-muted-foreground block">
								Origin Import
							</span>
							<div className="flex items-center gap-1 mt-0.5">
								<span className="font-semibold text-purple-700 dark:text-purple-300 font-mono">
									#
									{returnData.importNumber ||
										returnData.referenceNo ||
										`IMP-${returnData.importId}`}
								</span>
								{returnData.importId && onViewOriginImport && (
									<button
										onClick={() => {
											onViewOriginImport(
												returnData.importId!,
												returnData.importNumber || returnData.referenceNo,
											);
										}}
										className="text-purple-500 hover:text-purple-700"
										title="View Origin Import"
									>
										<ExternalLink className="h-3 w-3" />
									</button>
								)}
							</div>
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground block">
								Supplier
							</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
								{returnData.supplierName || "Primary Supplier"}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground block">
								Warehouse
							</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
								{returnData.warehouseName || "Main Hub"}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-muted-foreground block">
								Return Mode
							</span>
							<Badge
								variant="outline"
								className={`mt-0.5 text-[9px] font-bold ${
									returnData.returnAll
										? "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
										: "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
								}`}
							>
								{returnData.returnAll ? "Full Return" : "Partial Return"}
							</Badge>
						</div>
					</div>
				</div>

				{/* Returned Items Table */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<Boxes className="h-3.5 w-3.5 text-rose-600" />
							<span>Returned Items Manifest ({items.length})</span>
						</h4>
						<span className="text-xs font-semibold text-muted-foreground">
							Total Units:{" "}
							<span className="font-mono text-slate-900 dark:text-white font-bold">
								{totalUnits}
							</span>
						</span>
					</div>

					<div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-xs">
								<thead>
									<tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-muted-foreground font-semibold text-[11px]">
										<th className="py-2.5 px-3 text-left">Item / SKU</th>
										<th className="py-2.5 px-3 text-left">Unit</th>
										<th className="py-2.5 px-3 text-right">Returned Qty</th>
										<th className="py-2.5 px-3 text-right">Total Qty</th>
										<th className="py-2.5 px-3 text-right">Unit Cost</th>
										<th className="py-2.5 px-3 text-right">Total Credit</th>
										<th className="py-2.5 px-3 text-left">Item Reason</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800">
									{items.map((item, idx) => (
										<tr
											key={idx}
											className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
										>
											<td className="py-2.5 px-3">
												<div className="space-y-0.5">
													<span className="font-bold text-slate-900 dark:text-slate-100 block">
														{item.variantName || `Variant #${item.variantId}`}
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
												{item.inputQuantity || 1}
											</td>
											<td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
												{item.quantity || 1}
											</td>
											<td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
												${Number(item.unitCost || 0).toFixed(2)}
											</td>
											<td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
												${Number(item.totalCost || 0).toFixed(2)}
											</td>
											<td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
												{item.reason || "—"}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>

				{/* Reason, Notes & Approval Metadata */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
					{/* Reason & Notes Card */}
					<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
							Return Reason / Justification
						</span>
						<p className="font-medium text-slate-900 dark:text-slate-100">
							{returnData.reason}
						</p>
						{returnData.notes && (
							<p className="text-muted-foreground pt-1.5 border-t border-slate-200 dark:border-slate-800">
								<span className="font-semibold text-slate-700 dark:text-slate-300">
									Notes:
								</span>{" "}
								{returnData.notes}
							</p>
						)}
					</div>

					{/* Audit / Approval Card */}
					<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
							Timeline & Approval
						</span>
						<div className="space-y-1 text-slate-700 dark:text-slate-300">
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground">Return Date:</span>
								<span className="font-mono font-semibold">
									{formatDate(returnData.returnDate)}
								</span>
							</div>
							{returnData.approvedAt && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Approved:</span>
									<span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
										{formatDate(returnData.approvedAt)}
									</span>
								</div>
							)}
							{returnData.approvedBy && (
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Approved By:</span>
									<span className="font-medium">
										User #{returnData.approvedBy}
									</span>
								</div>
							)}
							{returnData.rejectionReason && (
								<div className="pt-1 text-rose-600 dark:text-rose-400 border-t border-rose-200 dark:border-rose-900">
									<span className="font-semibold">Rejection Reason:</span>{" "}
									{returnData.rejectionReason}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</ModernModal>
	);
}

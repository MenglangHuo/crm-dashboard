"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import {
	Order,
	OrderStatus,
	OrderPaymentStatus,
	StockVerificationStatus,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
	FileEdit,
	Send,
	Boxes,
	CheckCircle2,
	Receipt,
	XCircle,
	ShieldCheck,
	PackageCheck,
	UserCheck,
	DollarSign,
} from "lucide-react";
import { OrderHistoryDetailModal } from "@/components/orders/order-history-detail-modal";

interface OrderStatusStepperProps {
	order: Order;
	className?: string;
	onOpenFullTimeline?: () => void;
	onStepAction?: (stepId: string) => void;
}

export function OrderStatusStepper({
	order,
	className = "",
	onOpenFullTimeline,
	onStepAction,
}: OrderStatusStepperProps) {
	const status = (order.status || "DRAFT").toUpperCase() as OrderStatus;
	const paymentStatus = (
		order.paymentStatus || "PENDING"
	).toUpperCase() as OrderPaymentStatus;
	const stockVerificationStatus = (
		order.stockVerificationStatus || "NOT_YET"
	).toUpperCase() as StockVerificationStatus;

	// Fetch all order history records for step matching
	const { data: fetchedHistories = [] } = useQuery({
		queryKey: ["order-histories-stepper", order.id],
		queryFn: () =>
			order.id ? ordersApi.getOrderHistories(order.id) : Promise.resolve([]),
		enabled: Boolean(order.id),
	});

	const allHistories =
		fetchedHistories.length > 0
			? fetchedHistories
			: order.historyTimelines || [];

	// Selected step & history ID state for inspection modal
	const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
	const [selectedHistoryId, setSelectedHistoryId] = useState<
		number | string | null
	>(null);
	const [selectedHistoryData, setSelectedHistoryData] = useState<any | null>(
		null,
	);

	// Determine current active step (4-step lifecycle: 0=Draft, 1=Posted, 2=Approved, 3=Issue Invoice)
	const isVoid = status === "VOID" || status === "CANCELLED";
	const isRefunded = status === "REFUNDED" || paymentStatus === "REFUNDED";

	const isDualApproved = Boolean(
		status === "APPROVED" ||
			status === "COMPLETED" ||
			(order.stockkeeperApproved && order.saleManagerApproved),
	);

	let currentStepIndex = 0;
	if (status === "POSTED") {
		currentStepIndex = 1;
	} else if (status === "APPROVED") {
		currentStepIndex = 3; // Current status is APPROVED -> standing on Step 4: Issue Invoice
	} else if (
		status === "COMPLETED" ||
		status === "INVOICED" ||
		status === "ISSUED" ||
		status === "PAID" ||
		paymentStatus === "PAID"
	) {
		currentStepIndex = 3; // Standing on Step 4: Issue Invoice (Completed)
	}

	const steps = [
		{
			id: "DRAFT",
			stageNo: 1,
			label: "Draft",
			role: "Sales Rep",
			desc: "Items & prices configured (Editable)",
			stockState: "Untouched",
			icon: FileEdit,
			statusMatch: ["DRAFT"],
		},
		{
			id: "POSTED",
			stageNo: 2,
			label: "Posted",
			role: "Sale Manager Approval",
			desc: "Stock reserved & awaiting Sale Manager approval",
			stockState: "Reserved",
			icon: Send,
			statusMatch: ["POSTED"],
		},
		{
			id: "APPROVED",
			stageNo: 3,
			label: "Approved",
			role: "Stockkeeper Verification",
			desc: "Manager approved & items verified by stockkeeper",
			stockState: "Reserved",
			icon: Boxes,
			statusMatch: ["APPROVED"],
		},
		{
			id: "COMPLETED",
			stageNo: 4,
			label: "Issue Invoice",
			role: "Accountant",
			desc: "Order completed & stock sold",
			stockState: "Sold",
			icon: Receipt,
			statusMatch: ["COMPLETED", "INVOICED", "ISSUED"],
		},
	];

	// Filter histories for selected step
	const getStepHistories = (stepId: string) => {
		return allHistories.filter((t: any) => {
			const historyStatus = (t.toStatus || t.fromStatus || "").toUpperCase();
			const historyType = (t.actionType || t.title || "").toUpperCase();
			const targetStep = stepId.toUpperCase();
			return historyStatus === targetStep || historyType.includes(targetStep);
		});
	};

	const handleStepClick = (step: (typeof steps)[0]) => {
		setSelectedStepId(step.id);
		setSelectedHistoryId(step.id);
	};

	return (
		<>
			<div
				className={`w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3.5 shadow-2xs backdrop-blur-md ${className}`}
			>
				{/* Compact Header Bar */}
				<div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
					<div className="flex items-center gap-2 min-w-0">
						<div className="h-8 w-8 rounded-xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
							<ShieldCheck className="h-4.5 w-4.5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
									Lifecycle Workflow
								</span>
								<span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
									{order.orderNumber || order.orderNo || `#${order.id}`}
								</span>
							</div>
						</div>
					</div>

					{/* Compact Status Badges */}
					<div className="flex items-center gap-2 flex-wrap text-xs">
						<Badge
							variant="outline"
							className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg gap-1 ${
								isVoid
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300"
									: isRefunded
										? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300"
										: status === "COMPLETED"
											? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
											: status === "APPROVED"
												? "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300"
												: status === "POSTED"
													? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
													: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
							}`}
						>
							{isVoid ? (
								<XCircle className="h-3 w-3" />
							) : (
								<CheckCircle2 className="h-3 w-3" />
							)}
							{status}
						</Badge>

						<Badge
							variant="outline"
							className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg gap-1 ${
								stockVerificationStatus === "CHECKED_ALL"
									? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30"
									: stockVerificationStatus === "PARTIAL_CHECK"
										? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30"
										: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800"
							}`}
						>
							<PackageCheck className="h-3 w-3" />
							{stockVerificationStatus === "CHECKED_ALL"
								? "Verified"
								: stockVerificationStatus === "PARTIAL_CHECK"
									? `${order.verifiedItemCount || 0}/${order.totalItemCount || 0}`
									: "Unverified"}
						</Badge>

						<Badge
							variant="outline"
							className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg gap-1 ${
								paymentStatus === "PAID"
									? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950"
									: paymentStatus === "PARTIALLY_PAID"
										? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950"
										: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950"
							}`}
						>
							<DollarSign className="h-3 w-3" />
							Pay: {paymentStatus}
						</Badge>
					</div>
				</div>

				{/* Compact Stepper Row (4 Steps: Draft, Posted, Approved, Issue Invoice) */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
					{steps.map((step, idx) => {
						const StepIcon = step.icon;
						const isCompletedOrder =
							status === "COMPLETED" ||
							status === "INVOICED" ||
							status === "ISSUED" ||
							status === "PAID" ||
							paymentStatus === "PAID";
						const isDone =
							!isVoid && (isCompletedOrder ? true : idx < currentStepIndex);
						const isCurrent =
							!isVoid && !isCompletedOrder && idx === currentStepIndex;
						const stepHistories = getStepHistories(step.id);
						const hasHistory = stepHistories.length > 0 || isDone;

						return (
							<div
								key={step.id}
								onClick={() => handleStepClick(step)}
								className={`group relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
									isDone
										? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-500/80 dark:border-emerald-700/80 hover:border-emerald-600 shadow-2xs"
										: isCurrent
											? "bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
											: "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 text-slate-400 hover:border-slate-300"
								}`}
								title={
									step.id === "COMPLETED" && status === "APPROVED"
										? "Click to Issue Invoice"
										: `Click to view ${step.label} history audit detail`
								}
							>
								<div className="flex items-center justify-between gap-1 mb-1.5">
									<div className="flex items-center gap-1.5">
										<div
											className={`h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
												isCurrent
													? "bg-indigo-600 text-white shadow-2xs animate-pulse"
													: isDone
														? "bg-emerald-600 text-white"
														: "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
											}`}
										>
											{isDone ? (
												<CheckCircle2 className="h-3.5 w-3.5" />
											) : (
												<StepIcon className="h-3 w-3" />
											)}
										</div>
										<span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
											{step.stageNo}. {step.label}
										</span>
									</div>

									{step.id === "COMPLETED" && status === "APPROVED" ? (
										<span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-emerald-600 text-white font-bold animate-bounce shadow-2xs">
											Action Ready
										</span>
									) : hasHistory ? (
										<span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
											History
										</span>
									) : null}
								</div>

								<div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
									<span className="truncate">{step.role}</span>
									<span
										className={`font-semibold shrink-0 ${isCurrent ? "text-indigo-600 dark:text-indigo-400 font-bold" : isDone ? "text-emerald-600" : "text-slate-400"}`}
									>
										{step.stockState}
									</span>
								</div>
							</div>
						);
					})}
				</div>

				{/* Sequential Approval Pipeline Sub-bar */}
				{(status === "POSTED" ||
					status === "APPROVED" ||
					status === "COMPLETED") && (
					<div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
						<div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
							<UserCheck className="h-3.5 w-3.5 text-indigo-500" />
							<span>Sequential Pipeline:</span>
						</div>

						<div className="flex items-center gap-2 flex-wrap">
							{/* Step 1: Sale Manager */}
							<span className="text-[11px] text-slate-500 flex items-center gap-1">
								<span>1. Sale Mgr:</span>
								<strong
									className={
										order.saleManagerApproved || isDualApproved
											? "text-emerald-600 dark:text-emerald-400"
											: "text-amber-600 font-bold"
									}
								>
									{order.saleManagerApproved || isDualApproved
										? "✓ Approved"
										: "Pending"}
								</strong>
							</span>

							<span className="text-slate-300 font-bold">→</span>

							{/* Step 2: Stockkeeper Verification */}
							<span className="text-[11px] text-slate-500 flex items-center gap-1">
								<span>2. Stock Verify:</span>
								<strong
									className={
										order.stockkeeperApproved || isDualApproved
											? "text-emerald-600 dark:text-emerald-400"
											: order.saleManagerApproved
												? "text-blue-600 dark:text-blue-400 font-bold"
												: "text-slate-400"
									}
								>
									{order.stockkeeperApproved || isDualApproved
										? "✓ Verified"
										: order.saleManagerApproved
											? "Ready"
											: "Awaiting Mgr"}
								</strong>
							</span>
						</div>
					</div>
				)}
			</div>

			{/* History Detail Snapshot Modal when step history clicked */}
			<OrderHistoryDetailModal
				orderId={order.id}
				historyId={selectedHistoryId}
				stepId={selectedStepId}
				order={order}
				allHistories={allHistories}
				initialHistoryData={selectedHistoryData}
				open={Boolean(selectedHistoryId)}
				onActionStep={onStepAction}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setSelectedHistoryId(null);
						setSelectedHistoryData(null);
						setSelectedStepId(null);
					}
				}}
			/>
		</>
	);
}

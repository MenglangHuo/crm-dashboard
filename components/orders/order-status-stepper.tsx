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
import { Button } from "@/components/ui/button";
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
	Clock,
	Check,
	AlertCircle,
	ArrowRight,
	History,
	ChevronRight,
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

	// Status flags
	const isVoid = status === "VOID" || status === "CANCELLED";
	const isRefunded = status === "REFUNDED" || paymentStatus === "REFUNDED";
	const isDualApproved = Boolean(
		status === "APPROVED" ||
			status === "COMPLETED" ||
			(order.stockkeeperApproved && order.saleManagerApproved),
	);
	const isCompletedOrder =
		status === "COMPLETED" ||
		status === "INVOICED" ||
		status === "ISSUED" ||
		status === "PAID" ||
		paymentStatus === "PAID";

	let currentStepIndex = 0;
	if (status === "POSTED") {
		currentStepIndex = 1;
	} else if (status === "APPROVED") {
		currentStepIndex = 2;
	} else if (isCompletedOrder) {
		currentStepIndex = 3;
	}

	const steps = [
		{
			id: "DRAFT",
			stageNo: 1,
			label: "Draft",
			stockState: "Untouched",
			icon: FileEdit,
		},
		{
			id: "POSTED",
			stageNo: 2,
			label: "Posted",
			stockState: "Reserved",
			icon: Send,
		},
		{
			id: "APPROVED",
			stageNo: 3,
			label: "Approved",
			stockState: "Reserved",
			icon: ShieldCheck,
		},
		{
			id: "COMPLETED",
			stageNo: 4,
			label: "Invoiced",
			stockState: "Sold",
			icon: Receipt,
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

	const hasShortage =
		status === "POSTED" &&
		!order.saleManagerApproved &&
		(order.stockVerificationStatus === "PARTIAL_CHECK" ||
			(order.verifiedItemCount ?? 0) > 0);

	return (
		<>
			{/* Ultra-Compact Single-Row Pipeline Ribbon (Saves maximum vertical space) */}
			<div className={`space-y-2 ${className}`}>
				<div className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2 sm:px-3 sm:py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
					{/* Left: Compact Status & Inventory Badge */}
					<div className="flex items-center gap-2 shrink-0">
						<Badge
							variant="outline"
							className={`px-2 py-0.5 text-[11px] font-bold rounded-md gap-1 border ${
								isVoid
									? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
									: isRefunded
										? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300"
										: isCompletedOrder
											? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
											: status === "APPROVED"
												? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
												: status === "POSTED"
													? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
													: "bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
							}`}
						>
							{isVoid ? (
								<XCircle className="h-3 w-3" />
							) : isCompletedOrder ? (
								<CheckCircle2 className="h-3 w-3 text-emerald-600" />
							) : (
								<Clock className="h-3 w-3" />
							)}
							<span>{status}</span>
						</Badge>

						<span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
							Stock:{" "}
							<strong className="text-slate-700 dark:text-slate-300 font-semibold">
								{steps[currentStepIndex]?.stockState || "Untouched"}
							</strong>
						</span>
					</div>

					{/* Center: Slim Connected 4-Step Tracker */}
					<div className="flex items-center gap-1.5 sm:gap-2">
						{steps.map((step, idx) => {
							const StepIcon = step.icon;
							const isDone =
								!isVoid && (isCompletedOrder ? true : idx < currentStepIndex);
							const isCurrent =
								!isVoid && !isCompletedOrder && idx === currentStepIndex;

							return (
								<React.Fragment key={step.id}>
									{idx > 0 && (
										<div
											className={`w-3 sm:w-6 h-[2px] transition-colors ${
												isDone || isCurrent
													? "bg-emerald-500"
													: "bg-slate-200 dark:bg-slate-700"
											}`}
										/>
									)}

									<button
										type="button"
										onClick={() => handleStepClick(step)}
										className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer select-none ${
											isCurrent
												? "bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500/20"
												: isDone
													? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40"
													: "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
										}`}
										title={`Click to view ${step.label} history audit snapshot`}
									>
										<StepIcon
											className={`h-3 w-3 shrink-0 ${
												isDone
													? "text-emerald-600 dark:text-emerald-400"
													: isCurrent
														? "text-white"
														: "text-slate-400"
											}`}
										/>
										<span className="text-[11px] tracking-tight">
											{step.label}
										</span>
										{isDone && (
											<Check className="h-2.5 w-2.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
										)}
									</button>
								</React.Fragment>
							);
						})}
					</div>

					{/* Right: Quick Action or Timeline Link */}
					<div className="flex items-center gap-1.5 shrink-0">
						{status === "DRAFT" && onStepAction ? (
							<Button
								size="sm"
								onClick={() => onStepAction("POSTED")}
								className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] gap-1 shadow-2xs"
							>
								<Send className="h-3 w-3" /> Post
							</Button>
						) : status === "POSTED" && !order.saleManagerApproved && onStepAction ? (
							<Button
								size="sm"
								onClick={() => onStepAction("APPROVED")}
								className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] gap-1 shadow-2xs"
							>
								<UserCheck className="h-3 w-3" /> Approve
							</Button>
						) : status === "POSTED" &&
						  order.saleManagerApproved &&
						  !order.stockkeeperApproved &&
						  onStepAction ? (
							<Button
								size="sm"
								onClick={() => onStepAction("APPROVED")}
								className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 shadow-2xs"
							>
								<Boxes className="h-3 w-3" /> Verify
							</Button>
						) : status === "APPROVED" && onStepAction ? (
							<Button
								size="sm"
								onClick={() => onStepAction("COMPLETED")}
								className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] gap-1 shadow-2xs"
							>
								<Receipt className="h-3 w-3" /> Invoice
							</Button>
						) : (
							<button
								type="button"
								onClick={onOpenFullTimeline}
								className="text-[11px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 font-medium flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
								title="Open order audit timeline"
							>
								<History className="h-3 w-3 text-slate-400" />
								<span className="hidden md:inline">Audit</span>
							</button>
						)}
					</div>
				</div>

				{/* Slim Alert Pill ONLY if shortage or critical attention needed */}
				{hasShortage && (
					<div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
						<div className="flex items-center gap-1.5 min-w-0">
							<AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
							<span className="text-[11px] font-medium truncate">
								Stock shortage adjusted in warehouse. Sale Manager re-approval
								required.
							</span>
						</div>
						{onStepAction && (
							<Button
								size="sm"
								onClick={() => onStepAction("APPROVED")}
								className="h-6 px-2 text-[10px] rounded bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0"
							>
								Review
							</Button>
						)}
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

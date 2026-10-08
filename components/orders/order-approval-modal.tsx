"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
import { Order } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernSelect,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import {
	ShieldCheck,
	CheckCircle2,
	Clock,
	UserCheck,
	Shield,
} from "lucide-react";

interface OrderApprovalModalProps {
	order: Order | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
	initialApprovalType?:
		| "AUTO"
		| "SALE_MANAGER"
		| "STOCKKEEPER"
		| "SPECIAL"
		| string;
}

export function OrderApprovalModal({
	order,
	open,
	onOpenChange,
	onSuccess,
	initialApprovalType = "AUTO",
}: OrderApprovalModalProps) {
	const queryClient = useQueryClient();
	const { isAdmin, canApproveSale, canVerifyStock, canApproveSpecial } =
		usePermissions();

	const defaultScope = React.useMemo(() => {
		if (initialApprovalType && initialApprovalType !== "AUTO")
			return initialApprovalType;
		if (canApproveSpecial) return "AUTO";
		if (canApproveSale && !canVerifyStock) return "SALE_MANAGER";
		if (canVerifyStock && !canApproveSale) return "STOCKKEEPER";
		return "AUTO";
	}, [initialApprovalType, canApproveSpecial, canApproveSale, canVerifyStock]);

	const [approvalType, setApprovalType] = useState<string>(defaultScope);
	const [reason, setReason] = useState<string>("");

	useEffect(() => {
		if (open) {
			setApprovalType(defaultScope);
			setReason("");
		}
	}, [open, defaultScope]);

	const approveMutation = useMutation({
		mutationFn: (payload: {
			id: string | number;
			type: string;
			reason?: string;
		}) => ordersApi.approveOrder(payload.id, payload.type, payload.reason),
		onSuccess: (updatedOrder) => {
			const isFully =
				updatedOrder?.isFullyApproved || updatedOrder?.status === "APPROVED";
			toast.success(
				isFully
					? "Order dual-approval complete! Order is now APPROVED and ready for Accountant invoicing."
					: "Approval sign-off recorded successfully!",
			);
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			queryClient.invalidateQueries({ queryKey: ["orders-search"] });
			queryClient.invalidateQueries({ queryKey: ["order-detail"] });
			queryClient.invalidateQueries({ queryKey: ["order-histories"] });
			queryClient.refetchQueries({ queryKey: ["orders-search"] });
			onOpenChange(false);
			setReason("");
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	if (!order) return null;

	const handleApprove = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		approveMutation.mutate({
			id: order.id,
			type: approvalType,
			reason: reason.trim() || undefined,
		});
	};

	const approvalOptions: { value: string; label: string }[] = [];

	if (canApproveSpecial) {
		approvalOptions.push(
			{ value: "AUTO", label: "⚡ AUTO (Auto-Detect Role from User Token)" },
			{
				value: "SPECIAL",
				label: "🚨 SPECIAL (Super Admin 1-Click Dual Approval Bypass)",
			},
			{ value: "SALE_MANAGER", label: "🏷️ Sale Manager Pricing Approval Only" },
			{
				value: "STOCKKEEPER",
				label: "📦 Stockkeeper Item Verification Signoff Only",
			},
		);
	} else {
		if (canApproveSale && canVerifyStock) {
			approvalOptions.push(
				{ value: "AUTO", label: "⚡ AUTO (Auto-Detect Role from User Token)" },
				{ value: "SALE_MANAGER", label: "🏷️ Sale Manager Pricing Approval" },
				{
					value: "STOCKKEEPER",
					label: "📦 Stockkeeper Item Verification Signoff",
				},
			);
		} else if (canApproveSale) {
			approvalOptions.push({
				value: "SALE_MANAGER",
				label: "🏷️ Sale Manager Pricing Approval Only",
			});
		} else if (canVerifyStock) {
			approvalOptions.push({
				value: "STOCKKEEPER",
				label: "📦 Stockkeeper Item Verification Signoff Only",
			});
		} else {
			approvalOptions.push({
				value: "AUTO",
				label: "⚡ AUTO (Auto-Detect Role from User Token)",
			});
		}
	}

	const isSaleManagerMode = approvalType === "SALE_MANAGER";

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={
				isSaleManagerMode
					? "Sale Manager Pricing Approval"
					: "Smart Order Dual-Approval"
			}
			subtitle={`Process sign-off flags for Order ${order.orderNumber || order.orderNo || `#${order.id}`}`}
			icon={
				isSaleManagerMode ? (
					<UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				) : (
					<ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
				)
			}
			size="md"
			glassmorphism={true}
			draggable={true}
			isLoading={approveMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleApprove()}
						isLoading={approveMutation.isPending}
						loadingText="Recording Approval..."
						icon={
							isSaleManagerMode ? (
								<UserCheck className="h-4 w-4" />
							) : (
								<ShieldCheck className="h-4 w-4" />
							)
						}
					>
						{isSaleManagerMode ? "Approve Pricing" : "Confirm Approval"}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleApprove} className="space-y-4">
				{/* Dual Approval Status Grid */}
				<div className="grid grid-cols-2 gap-3">
					<div
						className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
							order.stockkeeperApproved
								? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
								: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
						}`}
					>
						<div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
							<span>Stockkeeper Check</span>
							{order.stockkeeperApproved ? (
								<CheckCircle2 className="h-4 w-4 text-emerald-600" />
							) : (
								<Clock className="h-4 w-4 text-amber-500" />
							)}
						</div>
						<div className="mt-2">
							<Badge
								variant="outline"
								className={`text-[10px] font-semibold ${
									order.stockkeeperApproved
										? "bg-emerald-600 text-white border-emerald-600"
										: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
								}`}
							>
								{order.stockkeeperApproved
									? "Verified & Approved"
									: "Pending Check"}
							</Badge>
						</div>
					</div>

					<div
						className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
							order.saleManagerApproved
								? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
								: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
						}`}
					>
						<div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
							<span>Sale Manager Pricing</span>
							{order.saleManagerApproved ? (
								<CheckCircle2 className="h-4 w-4 text-emerald-600" />
							) : (
								<Clock className="h-4 w-4 text-amber-500" />
							)}
						</div>
						<div className="mt-2">
							<Badge
								variant="outline"
								className={`text-[10px] font-semibold ${
									order.saleManagerApproved
										? "bg-emerald-600 text-white border-emerald-600"
										: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
								}`}
							>
								{order.saleManagerApproved
									? "Pricing Approved"
									: "Pending Pricing"}
							</Badge>
						</div>
					</div>
				</div>

				{/* Approval Scope */}
				<ModernSelect
					label="Approval Scope / Mode"
					options={approvalOptions}
					value={approvalType}
					onChange={setApprovalType}
				/>

				{/* Remarks */}
				<ModernTextarea
					label="Approval Remarks (Optional)"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Comments or approval reference notes..."
					rows={2}
				/>
			</form>
		</ModernModal>
	);
}

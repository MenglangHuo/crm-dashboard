"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ModernTextarea } from "@/components/ui-custom/form-controls";
import { ShieldCheck, UserCheck } from "lucide-react";

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
	const { canApproveSale, canApproveSpecial } = usePermissions();

	const defaultScope = React.useMemo(() => {
		if (initialApprovalType && initialApprovalType !== "AUTO")
			return initialApprovalType;
		if (canApproveSpecial) return "AUTO";
		if (canApproveSale) return "SALE_MANAGER";
		return "AUTO";
	}, [initialApprovalType, canApproveSpecial, canApproveSale]);

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
					: "Sale Manager pricing approval recorded successfully!",
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

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Sale Manager Pricing Approval"
			subtitle={`Review and authorize Order ${order.orderNumber || order.orderNo || `#${order.id}`}`}
			icon={
				<UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
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
						icon={<UserCheck className="h-4 w-4" />}
					>
						Approve Order
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleApprove} className="space-y-4">
				{/* Quick Order Snapshot */}
				<div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
					<div className="space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
							Order Total
						</span>
						<div className="text-base font-bold text-slate-900 dark:text-white">
							$
							{(Number(order.totalAmount) || 0).toLocaleString("en-US", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							})}
						</div>
					</div>
					<div className="text-right space-y-0.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
							Customer
						</span>
						<div className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
							{order.customer?.name || order.customerName || "Walk-in Customer"}
						</div>
					</div>
				</div>

				{/* Sale Manager Review Guidance Note */}
				<div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/90 dark:border-indigo-900/50 flex items-start gap-3">
					<div className="p-2 rounded-xl bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
						<ShieldCheck className="h-4 w-4" />
					</div>
					<div className="space-y-1">
						<h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
							Sale Manager Review & Authorization
						</h4>
						<p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
							Please verify customer pricing, applied discounts, and commercial
							terms before confirming. Approving authorizes commercial release
							and advances this order to warehouse stock verification.
						</p>
					</div>
				</div>

				{/* Remarks Section */}
				<div className="space-y-1.5">
					<ModernTextarea
						label="Approval Remarks"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="e.g., Verified unit pricing and approved 5% promotional discount. Ready for warehouse processing."
						rows={3}
						helperText="Add any authorization notes, customer agreement references, or instructions for the warehouse team."
					/>
				</div>
			</form>
		</ModernModal>
	);
}

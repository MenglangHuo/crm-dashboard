"use client";

import React, { useState } from "react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernTextarea } from "@/components/ui-custom/form-controls";
import { AlertTriangle } from "lucide-react";

interface OrderActionReasonModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel?: string;
	variant?: "destructive" | "amber" | "indigo";
	isLoading?: boolean;
	onConfirm: (reason: string) => void;
}

export function OrderActionReasonModal({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirm Action",
	variant = "amber",
	isLoading = false,
	onConfirm,
}: OrderActionReasonModalProps) {
	const [reason, setReason] = useState("");

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!reason.trim()) return;
		onConfirm(reason.trim());
		setReason("");
	};

	const getSubmitColor = () => {
		if (variant === "destructive")
			return "bg-rose-600 hover:bg-rose-700 text-white";
		if (variant === "amber")
			return "bg-amber-600 hover:bg-amber-700 text-white";
		return "bg-indigo-600 hover:bg-indigo-700 text-white";
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={title}
			subtitle={description}
			icon={
				<AlertTriangle
					className={`h-5 w-5 ${variant === "destructive" ? "text-rose-500" : "text-amber-500"}`}
				/>
			}
			size="md"
			glassmorphism={true}
			draggable={true}
			isLoading={isLoading}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleSubmit()}
						disabled={!reason.trim() || isLoading}
						isLoading={isLoading}
						className={getSubmitColor()}
					>
						{confirmLabel}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form onSubmit={handleSubmit} className="space-y-4">
				<ModernTextarea
					label="Reason / Justification Note *"
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Please state the reason for this action..."
					rows={3}
					required
				/>
			</form>
		</ModernModal>
	);
}

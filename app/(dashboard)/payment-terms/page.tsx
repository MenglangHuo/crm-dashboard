"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentTermsApi } from "@/lib/api/endpoints";
import { PaymentTerm } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Clock,
	Plus,
	Percent,
	Calendar,
	Sparkles,
	Edit2,
	Trash2,
	CheckCircle2,
	ShieldCheck,
	Zap,
	SlidersHorizontal,
	Eye,
} from "lucide-react";

import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import { Badge } from "@/components/ui/badge";
import { ModernButton } from "@/components/ui-custom/modern-button";
import { PaymentTermModal } from "@/components/payment-terms/payment-term-modal";
import { PaymentTermDetailsModal } from "@/components/payment-terms/payment-term-details-modal";
import { useTranslation } from "@/lib/i18n/context";

export default function PaymentTermsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
	const [viewingTerm, setViewingTerm] = useState<PaymentTerm | null>(null);
	const [search, setSearch] = useState("");

	// Fetch Payment Terms for active company
	const {
		data: terms = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["payment-terms"],
		queryFn: () => paymentTermsApi.list(),
	});

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => paymentTermsApi.delete(id),
		onSuccess: () => {
			toast.success("Payment term deactivated successfully");
			queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const openCreateModal = () => {
		setEditingTerm(null);
		setIsModalOpen(true);
	};

	const openEditModal = (term: PaymentTerm) => {
		setEditingTerm(term);
		setIsModalOpen(true);
	};

	const handleDelete = (term: PaymentTerm) => {
		if (
			confirm(
				`Are you sure you want to deactivate payment term '${term.name}'?`,
			)
		) {
			deleteMutation.mutate(term.id);
		}
	};

	// Filtered terms
	const filteredTerms = useMemo(() => {
		if (!search.trim()) return terms;
		const q = search.toLowerCase();
		return terms.filter(
			(term: PaymentTerm) =>
				term.name?.toLowerCase().includes(q) ||
				term.description?.toLowerCase().includes(q),
		);
	}, [terms, search]);

	// DataTable Columns
	const columns: ColumnDef<PaymentTerm>[] = [
		{
			id: "name",
			header: "Term Name",
			accessorKey: "name",
			cell: ({ row }) => {
				const item = row;
				const hasEarly =
					item.discountDays &&
					item.discountDays > 0 &&
					item.discountPercentage &&
					item.discountPercentage > 0;
				return (
					<div className="flex items-center gap-2.5 py-1">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
							<Clock className="size-4.5" />
						</div>
						<div>
							<div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
								<span>{item.name}</span>
								{hasEarly && (
									<Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 font-mono">
										⚡ {item.discountPercentage}% off
									</Badge>
								)}
							</div>
							{item.description && (
								<p className="text-[11px] text-slate-500 line-clamp-1 max-w-[280px]">
									{item.description}
								</p>
							)}
						</div>
					</div>
				);
			},
		},
		{
			id: "dueDays",
			header: "Due Window",
			accessorKey: "dueDays",
			cell: ({ row }) => {
				const days = row.dueDays;
				return (
					<div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
						{days === 0 ? (
							<Badge
								variant="outline"
								className="font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300"
							>
								Same Day (COD)
							</Badge>
						) : (
							<span>+{days} Days</span>
						)}
					</div>
				);
			},
		},
		{
			id: "discountDays",
			header: "Early Pay Window",
			accessorKey: "discountDays",
			cell: ({ row }) => {
				const conds = row.conditions;
				if (conds && conds.length > 1) {
					const maxDays = Math.max(...conds.map((c) => Number(c.discountDays) || 0));
					return (
						<div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
							<Zap className="size-3 text-indigo-500 fill-current" />
							<span>{conds.length} Tiers (0–{maxDays}d)</span>
						</div>
					);
				}
				const days = row.discountDays;
				return days && days > 0 ? (
					<div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
						<Zap className="size-3 text-indigo-500 fill-current" />
						<span>Within {days} Days</span>
					</div>
				) : (
					<span className="text-slate-400 text-xs">—</span>
				);
			},
		},
		{
			id: "discountPercentage",
			header: "Cash Discount & Policy",
			accessorKey: "discountPercentage",
			cell: ({ row }) => {
				const conds = row.conditions;
				const policy = row.discountPolicy || "FINAL_SETTLEMENT";
				if (conds && conds.length > 1) {
					const maxPct = Math.max(...conds.map((c) => Number(c.discount) || 0));
					return (
						<div className="space-y-1">
							<Badge className="bg-indigo-600 text-white font-mono text-[10px] font-bold">
								Up to {maxPct}% ({conds.length} tiers)
							</Badge>
							<div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
								{policy === "PROPORTIONAL"
									? "⚡ Proportional"
									: "Settlement Only"}
							</div>
						</div>
					);
				}
				const pct = row.discountPercentage;
				return pct && pct > 0 ? (
					<div className="space-y-1">
						<Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
							{pct}% Cash Discount
						</Badge>
						<div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
							{policy === "PROPORTIONAL"
								? "⚡ Proportional"
								: "Settlement Only"}
						</div>
					</div>
				) : (
					<span className="text-slate-400 text-xs">—</span>
				);
			},
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "isActive",
			cell: ({ row }) => {
				const active = row.isActive !== false;
				return (
					<Badge
						variant="outline"
						className={`text-[10px] font-bold uppercase ${
							active
								? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
								: "bg-slate-100 text-slate-500 border-slate-300"
						}`}
					>
						{active ? "Active" : "Inactive"}
					</Badge>
				);
			},
		},
	];

	const rowActions: RowAction<PaymentTerm>[] = [
		{
			label: "View Details",
			icon: <Eye className="size-3.5 text-sky-500" />,
			onClick: (term) => setViewingTerm(term),
		},
		{
			label: "Edit Term",
			icon: <Edit2 className="size-3.5" />,
			onClick: (term) => openEditModal(term),
		},
		{
			label: "Deactivate",
			icon: <Trash2 className="size-3.5 text-rose-500" />,
			variant: "destructive",
			onClick: (term) => handleDelete(term),
		},
	];

	return (
		<div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
			{/* Main DataTable */}
			<DataTable<PaymentTerm>
				title="Payment Terms & Early Settlement"
				titleIcon={<Clock className="size-5 text-primary" />}
				columns={columns}
				data={filteredTerms}
				isLoading={isLoading}
				actions={rowActions}
				onRowClick={(term) => setViewingTerm(term)}
				searchable
				searchValue={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search payment terms by name or description..."
				toolbarActions={
					<ModernButton
						variant="primary"
						size="sm"
						rounded="lg"
						onClick={openCreateModal}
						leftIcon={<Plus className="size-4" />}
					>
						New Payment Term
					</ModernButton>
				}
			/>

			{/* Payment Term Edit/Create Modal */}
			<PaymentTermModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				editingTerm={editingTerm}
				onSuccess={() => refetch()}
			/>

			{/* Payment Term View Details Specification Modal */}
			<PaymentTermDetailsModal
				term={viewingTerm}
				open={Boolean(viewingTerm)}
				onOpenChange={(open) => !open && setViewingTerm(null)}
				onEdit={(term) => openEditModal(term)}
			/>
		</div>
	);
}

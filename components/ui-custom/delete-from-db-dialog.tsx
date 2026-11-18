"use client";

import React from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Database, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/context";

export interface DeleteFromDbDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	itemName: string;
	itemType: "category" | "brand" | "unit" | string;
	itemIdentifier?: string | number;
	isLoading?: boolean;
	onConfirm: () => void;
	onDeactivate?: () => void;
	isDeactivating?: boolean;
}

export function DeleteFromDbDialog({
	open,
	onOpenChange,
	title,
	itemName,
	itemType,
	itemIdentifier,
	isLoading = false,
	onConfirm,
	onDeactivate,
	isDeactivating = false,
}: DeleteFromDbDialogProps) {
	const { t } = useTranslation();

	const capitalizedType =
		itemType.charAt(0).toUpperCase() + itemType.slice(1);
	const defaultTitle = `Delete ${capitalizedType} from Database`;

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent className="rounded-3xl max-w-md p-6 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
				<AlertDialogHeader className="space-y-3">
					<div className="flex items-center gap-3">
						<div className="h-11 w-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 shadow-2xs">
							<Trash2 className="h-5 w-5" />
						</div>
						<div className="min-w-0 flex-1">
							<AlertDialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								{title || defaultTitle}
							</AlertDialogTitle>
							<p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5 flex items-center gap-1">
								<Database className="h-3.5 w-3.5" /> Permanent Database Deletion
							</p>
						</div>
					</div>

					<AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 space-y-3 pt-1">
						<span>
							Are you sure you want to permanently delete this {itemType}?
						</span>

						{/* Item preview pill */}
						<div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
							<span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
								{itemName}
							</span>
							{itemIdentifier && (
								<Badge variant="outline" className="font-mono text-[10px] shrink-0">
									ID: {itemIdentifier}
								</Badge>
							)}
						</div>

						{/* Rule & Validation explanation */}
						<div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
							<div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
								<Info className="h-3.5 w-3.5 shrink-0" />
								<span>Condition for deletion</span>
							</div>
							<p>
								This action is meant for mistaken or unused inputs and completely removes the record from the database. It will only succeed if this {itemType} has <strong>not yet been linked</strong> to products, orders, or other relationships.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<AlertDialogFooter className="mt-5 flex-col-reverse sm:flex-row gap-2">
					<AlertDialogCancel
						disabled={isLoading || isDeactivating}
						className="rounded-xl text-xs font-medium h-9"
					>
						{t("common.cancel") || "Cancel"}
					</AlertDialogCancel>

					{onDeactivate && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isLoading || isDeactivating}
							isLoading={isDeactivating}
							onClick={onDeactivate}
							className="rounded-xl text-xs font-semibold h-9 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
						>
							Deactivate Only
						</Button>
					)}

					<Button
						type="button"
						size="sm"
						disabled={isLoading || isDeactivating}
						isLoading={isLoading}
						onClick={onConfirm}
						className="rounded-xl text-xs font-semibold h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
					>
						<Trash2 className="h-3.5 w-3.5" />
						Delete from DB
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

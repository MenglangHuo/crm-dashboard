"use client";

import * as React from "react";
import Link from "next/link";
import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Boxes,
	CheckCircle2,
	FileText,
	ShieldCheck,
	Truck,
	Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardReportData } from "@/lib/types";

export interface InventoryHealthBannerProps {
	data?: DashboardReportData;
}

export function InventoryHealthBanner({ data }: InventoryHealthBannerProps) {
	const outOfStock = data?.outOfStockCount ?? 0;
	const lowStock = data?.lowStockCount ?? 0;
	const totalProducts = data?.totalProducts ?? 0;
	const totalUnpaid = data?.totalUnpaid ?? 0;

	const hasInventoryAlert = outOfStock > 0 || lowStock > 0;

	return (
		<div className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-2xs backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/90 sm:p-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="flex items-start gap-3.5">
					<div
						className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
							hasInventoryAlert
								? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
								: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
						}`}
					>
						{hasInventoryAlert ? (
							<AlertTriangle className="h-5 w-5" />
						) : (
							<ShieldCheck className="h-5 w-5" />
						)}
					</div>

					<div className="space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
								{hasInventoryAlert
									? "Inventory Replenishment Notice"
									: "All Inventory Catalogs Healthy"}
							</h3>
							{outOfStock > 0 && (
								<span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
									{outOfStock} SKUs Out of Stock
								</span>
							)}
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
							{hasInventoryAlert
								? `There are currently ${outOfStock} out-of-stock items and ${lowStock} low-stock thresholds requiring procurement or warehouse transfer.`
								: `All catalog stock quantities (${totalProducts} products) are within target operational thresholds with no critical stockouts.`}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2.5 shrink-0">
					<Button
						render={<Link href="/inventory" />}
						size="sm"
						variant="outline"
						className="h-9 rounded-xl border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
					>
						<Warehouse className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
						Manage Warehouse
					</Button>

					<Button
						render={<Link href="/products" />}
						size="sm"
						className="h-9 rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
					>
						Restock Inventory
						<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

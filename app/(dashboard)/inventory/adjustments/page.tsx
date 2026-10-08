"use client";

import React, { Suspense } from "react";
import { StockAdjustmentsAuditView } from "@/components/inventory/stock-adjustments-audit-view";
import { History, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function StockAdjustmentsPageContent() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
				<div>
					<div className="flex items-center gap-2 mb-1">
						<Link
							href="/inventory/stock"
							className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 font-medium transition-colors"
						>
							<ArrowLeft className="size-3" />
							<span>Back to Stock</span>
						</Link>
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
						<History className="size-7 text-primary" />
						<span>Stock Adjustments Audit</span>
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
						Search and review historical inventory quantity modifications and audit trails.
					</p>
				</div>
			</div>

			{/* Main Audit Search View */}
			<StockAdjustmentsAuditView />
		</div>
	);
}

export default function StockAdjustmentsPage() {
	return (
		<Suspense fallback={<div className="p-8 text-center text-xs">Loading stock adjustments audit...</div>}>
			<StockAdjustmentsPageContent />
		</Suspense>
	);
}

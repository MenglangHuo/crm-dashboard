"use client";

import React from "react";
import { VisitStatusInfo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface Props {
	status?: VisitStatusInfo | null;
	className?: string;
	compact?: boolean;
}

export function VisitStatusBadge({
	status,
	className = "",
	compact = false,
}: Props) {
	if (!status || !status.label) {
		return (
			<Badge
				variant="outline"
				className={`border-dashed border-slate-300 dark:border-slate-700 text-slate-400 font-normal text-[11px] ${className}`}
			>
				Never Visited
			</Badge>
		);
	}

	const labelLower = status.label.toLowerCase();

	const getStyle = () => {
		if (
			labelLower.includes("just") ||
			labelLower.includes("today") ||
			labelLower.includes("ថ្ងៃនេះ")
		) {
			return "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30";
		}
		if (
			labelLower.includes("1 week") ||
			labelLower.includes("week") ||
			labelLower.includes("១ សប្ដាហ៍")
		) {
			return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
		}
		if (labelLower.includes("2 week") || labelLower.includes("២ សប្ដាហ៍")) {
			return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
		}
		if (
			(labelLower.includes("month") || labelLower.includes("ខែ")) &&
			!labelLower.includes("3") &&
			!labelLower.includes("៣") &&
			!labelLower.includes("6") &&
			!labelLower.includes("៦")
		) {
			return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
		}
		if (
			labelLower.includes("3 month") ||
			labelLower.includes("៣ ខែ")
		) {
			return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
		}
		if (
			labelLower.includes("6 month") ||
			labelLower.includes("6+") ||
			labelLower.includes("6 months") ||
			labelLower.includes("៦ ខែ")
		) {
			return "bg-slate-900/10 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-700/40";
		}
		return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
	};

	const customInlineStyle: React.CSSProperties =
		status.color
			? {
					borderColor: `${status.color}40`,
			  }
			: {};

	return (
		<span
			style={customInlineStyle}
			className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStyle()} ${className}`}
		>
			<span className="shrink-0 text-[10px]">{status.icon || "📍"}</span>
			<span className="font-bold">{status.label}</span>
			{!compact &&
				status.daysSinceVisit !== null &&
				status.daysSinceVisit !== undefined && (
					<span className="opacity-60 font-medium text-[10px]">
						({status.daysSinceVisit}d)
					</span>
				)}
		</span>
	);
}

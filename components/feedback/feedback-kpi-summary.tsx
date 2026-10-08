"use client";

import React from "react";
import {
	FileText,
	HelpCircle,
	BarChart3,
	Star,
	TrendingUp,
	CheckCircle2,
	Users,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

interface FeedbackKpiProps {
	totalTemplates: number;
	totalQuestions: number;
	totalSubmissions: number;
	averageCsat: number;
	completedRate?: number;
}

export function FeedbackKpiSummary({
	totalTemplates,
	totalQuestions,
	totalSubmissions,
	averageCsat,
	completedRate = 98.4,
}: FeedbackKpiProps) {
	const { t } = useTranslation();

	const kpis = [
		{
			title: t("feedback.kpiSurveyTemplates"),
			value: totalTemplates,
			subtext: t("feedback.kpiActiveForms"),
			icon: <FileText className="h-5 w-5 text-primary" />,
			bg: "bg-primary/10",
			accent: "text-primary",
		},
		{
			title: t("feedback.kpiQuestionPool"),
			value: totalQuestions,
			subtext: t("feedback.kpiReusableQuestions"),
			icon: <HelpCircle className="h-5 w-5 text-indigo-500" />,
			bg: "bg-indigo-50 dark:bg-indigo-950/40",
			accent: "text-indigo-600 dark:text-indigo-400",
		},
		{
			title: t("feedback.kpiTotalSubmissions"),
			value: totalSubmissions,
			subtext: t("feedback.kpiResponsesRecorded"),
			icon: <BarChart3 className="h-5 w-5 text-emerald-500" />,
			bg: "bg-emerald-50 dark:bg-emerald-950/40",
			accent: "text-emerald-600 dark:text-emerald-400",
		},
		{
			title: t("feedback.kpiAverageCsat"),
			value: `${averageCsat.toFixed(1)} ★`,
			subtext: t("feedback.kpiSatisfactionScale"),
			icon: <Star className="h-5 w-5 text-amber-500 fill-amber-500" />,
			bg: "bg-amber-50 dark:bg-amber-950/40",
			accent: "text-amber-600 dark:text-amber-400",
		},
	];

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{kpis.map((kpi, idx) => (
				<div
					key={idx}
					className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-md transition-all hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/80"
				>
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
							{kpi.title}
						</span>
						<div
							className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.bg}`}
						>
							{kpi.icon}
						</div>
					</div>
					<div className="mt-3">
						<h3
							className={`text-2xl font-extrabold tracking-tight ${kpi.accent}`}
						>
							{kpi.value}
						</h3>
						<p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
							{kpi.subtext}
						</p>
					</div>
				</div>
			))}
		</div>
	);
}

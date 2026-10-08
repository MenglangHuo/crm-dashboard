"use client";

import React from "react";
import type { FeedbackSubmission } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { Badge } from "@/components/ui/badge";
import { ModernButton } from "@/components/ui-custom/button";
import {
	MessageSquare,
	Star,
	CheckCircle2,
	Calendar,
	User,
	Building2,
	FileText,
	Quote,
	Check,
	Award,
} from "lucide-react";

interface SubmissionDetailsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	submission?: FeedbackSubmission | null;
}

import { useTranslation } from "@/lib/i18n/context";

export function SubmissionDetailsDrawer({
	open,
	onOpenChange,
	submission,
}: SubmissionDetailsDrawerProps) {
	const { t } = useTranslation();
	if (!submission) return null;

	const totalScoreFormatted =
		submission.totalScore !== undefined && submission.totalScore !== null
			? Number(submission.totalScore).toFixed(1)
			: "5.0";

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={`${t("feedback.submissionsTab")} #SUB-${submission.submissionId}`}
			subtitle={`Customer response for "${submission.template?.name || "Survey Form"}"`}
			icon={<MessageSquare className="h-5 w-5 text-primary" />}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={() => onOpenChange(false)}
						label={t("common.close")}
					/>
				</ModernModalFooter>
			}
		>
			<div className="space-y-6">
				{/* Executive Summary Header Card */}
				<div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-primary/5 via-slate-50 to-indigo-50/20 p-5 dark:border-slate-800 dark:from-primary/10 dark:via-slate-900 dark:to-indigo-950/20">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<Badge className="rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
									{submission.status || "COMPLETED"}
								</Badge>
								<span className="text-xs font-mono text-slate-400">
									ID: #{submission.submissionId}
								</span>
							</div>
							<h3 className="text-base font-extrabold text-slate-900 dark:text-white">
								{submission.template?.name || "Customer Feedback Survey"}
							</h3>
						</div>

						{/* Score Pill */}
						<div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-950 p-3 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
								<Star className="h-6 w-6 fill-amber-500" />
							</div>
							<div>
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
									Evaluation Score
								</span>
								<span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
									{totalScoreFormatted}{" "}
									<span className="text-xs text-slate-400 font-sans font-medium">
										pts
									</span>
								</span>
							</div>
						</div>
					</div>

					{/* Metadata Grid */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
						<div>
							<span className="text-[10px] text-slate-400 font-medium block">
								Customer
							</span>
							<span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
								<User className="h-3 w-3 text-primary" />
								{submission.customerName ||
									`Customer #${submission.customerId || "N/A"}`}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-slate-400 font-medium block">
								Submitted By
							</span>
							<span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
								@{submission.userName || "bronx"}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-slate-400 font-medium block">
								Channel
							</span>
							<span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
								{submission.channel || "WEB"}
							</span>
						</div>
						<div>
							<span className="text-[10px] text-slate-400 font-medium block">
								Date & Time
							</span>
							<span className="font-semibold text-slate-600 dark:text-slate-400 font-mono text-[11px] block mt-0.5">
								{submission.submittedAt
									? new Date(submission.submittedAt).toLocaleString(undefined, {
											month: "short",
											day: "numeric",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
									: "—"}
							</span>
						</div>
					</div>
				</div>

				{/* Answers Breakdown Section */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
							<Award className="h-4 w-4 text-primary" />
							Detailed Question Responses ({submission.answers?.length || 0})
						</h4>
					</div>

					{submission.answers && submission.answers.length > 0 ? (
						<div className="space-y-3">
							{submission.answers.map((ans, idx) => {
								const isMulti = ans.questionType === "MULTI_CHOICE";
								const isSingle =
									ans.questionType === "SINGLE_CHOICE" ||
									ans.questionType === "RATING" ||
									ans.questionType === "MULTIPLE_CHOICE";
								const isFreeText =
									ans.questionType === "FREE_TEXT" ||
									ans.questionType === "TEXT";

								return (
									<div
										key={ans.answerId || idx}
										className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80 space-y-2.5"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-start gap-2 min-w-0">
												<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 font-mono">
													{idx + 1}
												</span>
												<p className="text-xs font-bold text-slate-900 dark:text-slate-100">
													{ans.questionText || `Question #${ans.questionId}`}
												</p>
											</div>
											<Badge
												variant="outline"
												className="text-[9px] font-bold px-1.5 h-4 shrink-0"
											>
												{ans.questionType || "SINGLE_CHOICE"}
											</Badge>
										</div>

										{/* Single Choice Output */}
										{isSingle && (
											<div className="pl-7">
												{ans.selectedOption ? (
													<div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
														<CheckCircle2 className="h-3.5 w-3.5" />
														<span>{ans.selectedOption.label}</span>
														{typeof ans.selectedOption.scoreValue ===
															"number" && (
															<span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
																({ans.selectedOption.scoreValue}★)
															</span>
														)}
													</div>
												) : (
													<span className="text-xs text-slate-400 italic">
														No option selected
													</span>
												)}
											</div>
										)}

										{/* Multi Choice Output */}
										{isMulti && (
											<div className="pl-7">
												{ans.selectedOptions &&
												ans.selectedOptions.length > 0 ? (
													<div className="flex flex-wrap gap-2">
														{ans.selectedOptions.map((opt, optIdx) => (
															<span
																key={optIdx}
																className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"
															>
																<Check className="h-3 w-3" />
																<span>{opt.label}</span>
																{typeof opt.scoreValue === "number" && (
																	<span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
																		({opt.scoreValue}★)
																	</span>
																)}
															</span>
														))}
													</div>
												) : ans.selectedOption ? (
													<div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
														<Check className="h-3 w-3" />
														<span>{ans.selectedOption.label}</span>
														{typeof ans.selectedOption.scoreValue ===
															"number" && (
															<span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
																({ans.selectedOption.scoreValue}★)
															</span>
														)}
													</div>
												) : (
													<span className="text-xs text-slate-400 italic">
														No options selected
													</span>
												)}
											</div>
										)}

										{/* Free Text Output */}
										{isFreeText && (
											<div className="pl-7">
												<div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 italic flex items-start gap-2">
													<Quote className="h-4 w-4 text-primary shrink-0 opacity-60" />
													<span>{ans.freeTextValue || "—"}</span>
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div className="p-8 text-center text-slate-400 text-xs">
							No individual answer records recorded for this submission.
						</div>
					)}
				</div>
			</div>
		</ModernModal>
	);
}

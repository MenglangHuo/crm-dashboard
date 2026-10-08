"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedbackApi, customersApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type {
	FeedbackTemplate,
	CreateFeedbackSubmissionRequest,
	Customer,
} from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalSubmitButton,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernSearchSelect,
	SearchSelectOption,
} from "@/components/ui-custom/form-controls/modern-search-select";
import { ModernButton } from "@/components/ui-custom/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	Send,
	Star,
	CheckCircle2,
	CheckSquare,
	AlignLeft,
	User,
	Building2,
	HelpCircle,
	Sparkles,
	Loader2,
} from "lucide-react";

interface SubmitSurveyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template?: FeedbackTemplate | null;
	onSuccess?: () => void;
}

interface AnswerState {
	singleOptionId?: number | string | null;
	multiOptionIds?: (number | string)[];
	freeText?: string;
}

import { useTranslation } from "@/lib/i18n/context";

export function SubmitSurveyModal({
	open,
	onOpenChange,
	template,
	onSuccess,
}: SubmitSurveyModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [customerId, setCustomerId] = useState<string>("1");
	const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
	const initializedTemplateIdRef = useRef<number | string | null>(null);

	// Fetch full template with questions from Real API to ensure complete question & choice data
	const { data: fullTemplateData, isLoading: isLoadingFullTemplate } = useQuery(
		{
			queryKey: ["feedback-template-details", template?.templateId],
			queryFn: () => feedbackApi.getTemplate(template!.templateId),
			enabled: Boolean(template?.templateId && open),
			staleTime: 60 * 1000,
		},
	);

	const currentTemplate: FeedbackTemplate | null =
		fullTemplateData || template || null;

	// Fetch initial customers for instant dropdown
	const { data: customersData } = useQuery({
		queryKey: ["customers-short-list"],
		queryFn: () => customersApi.list({ limit: 50 }),
		enabled: open,
		staleTime: 3 * 60 * 1000,
	});
	const customersList: Customer[] = customersData?.items || [];

	// Pre-populate customer options
	const customerOptions: SearchSelectOption[] = useMemo(() => {
		return customersList.map((c) => {
			const codeOrId = (c as any).customerCode || (c as any).code || `#${c.id}`;
			return {
				value: c.id,
				label: `${c.name || `Customer #${c.id}`} (${codeOrId})`,
				subtitle: c.phone
					? `Phone: ${c.phone}${c.address ? ` • ${c.address}` : ""}`
					: c.address || undefined,
				badge:
					c.status || (c.companyId ? `Company #${c.companyId}` : undefined),
				icon: <User className="h-3.5 w-3.5 text-primary" />,
				raw: c,
			};
		});
	}, [customersList]);

	// Dynamic async search for customers
	const loadCustomerOptions = async (
		query: string,
	): Promise<SearchSelectOption[]> => {
		try {
			const res = await customersApi.list({ search: query, limit: 30 });
			const items = res?.items || [];
			return items.map((c) => {
				const codeOrId =
					(c as any).customerCode || (c as any).code || `#${c.id}`;
				return {
					value: c.id,
					label: `${c.name || `Customer #${c.id}`} (${codeOrId})`,
					subtitle: c.phone
						? `Phone: ${c.phone}${c.address ? ` • ${c.address}` : ""}`
						: c.address || undefined,
					badge:
						c.status || (c.companyId ? `Company #${c.companyId}` : undefined),
					icon: <User className="h-3.5 w-3.5 text-primary" />,
					raw: c,
				};
			});
		} catch (err) {
			console.error("Failed to search customers:", err);
			return [];
		}
	};

	// Set default customer if none selected
	useEffect(() => {
		if (customersList.length > 0 && (!customerId || customerId === "1")) {
			const first = customersList[0];
			setCustomerId(String(first.id));
		}
	}, [customersList, customerId]);

	// Initialize answers state ONLY once when modal opens or template changes (NEVER overwrite active answers)
	useEffect(() => {
		if (open && template?.templateId) {
			if (initializedTemplateIdRef.current !== template.templateId) {
				initializedTemplateIdRef.current = template.templateId;
				const questions = (currentTemplate?.questions ||
					template?.questions ||
					[]) as any[];
				const initial: Record<string, AnswerState> = {};
				questions.forEach((q: any) => {
					const qId =
						q.questionId ?? q.id ?? q.question?.questionId ?? q.question?.id;
					if (qId) {
						initial[String(qId)] = {
							singleOptionId: null,
							multiOptionIds: [],
							freeText: "",
						};
					}
				});
				setAnswers(initial);
			}
		} else if (!open) {
			initializedTemplateIdRef.current = null;
		}
	}, [open, template?.templateId]);

	// If fullTemplateData arrives later, merge missing questions without clearing user selections
	useEffect(() => {
		if (fullTemplateData?.questions && open) {
			setAnswers((prev) => {
				const next = { ...prev };
				fullTemplateData.questions.forEach((q: any) => {
					const qId =
						q.questionId ?? q.id ?? q.question?.questionId ?? q.question?.id;
					if (qId && !next[String(qId)]) {
						next[String(qId)] = {
							singleOptionId: null,
							multiOptionIds: [],
							freeText: "",
						};
					}
				});
				return next;
			});
		}
	}, [fullTemplateData, open]);

	// Submit Mutation directly targeting Real Backend API: POST /api/v1/templates/{templateId}/submissions
	const submitMutation = useMutation({
		mutationFn: async (payload: CreateFeedbackSubmissionRequest) => {
			const tplId = currentTemplate?.templateId || template?.templateId;
			if (!tplId) throw new Error("No template selected");
			return feedbackApi.createSubmission(tplId, payload);
		},
		onSuccess: (data) => {
			toast.success(
				"Feedback survey response submitted to CRM API successfully!",
			);
			queryClient.invalidateQueries({ queryKey: ["feedback-submissions"] });
			queryClient.invalidateQueries({ queryKey: ["feedback-templates"] });
			onSuccess?.();
			onOpenChange(false);
		},
		onError: (err) => {
			const msg = getErrorMessage(err) || "Failed to submit survey to CRM API";
			toast.error(msg);
			console.error("Submission error:", err);
		},
	});

	// Handle single choice select
	const handleSelectSingle = (
		questionId: number | string,
		optionId: number | string,
	) => {
		setAnswers((prev) => ({
			...prev,
			[String(questionId)]: {
				...prev[String(questionId)],
				singleOptionId: optionId,
			},
		}));
	};

	// Handle multi choice toggle
	const handleToggleMulti = (
		questionId: number | string,
		optionId: number | string,
	) => {
		const qKey = String(questionId);
		const currentList = answers[qKey]?.multiOptionIds || [];
		const exists = currentList.some((id) => String(id) === String(optionId));
		const updated = exists
			? currentList.filter((id) => String(id) !== String(optionId))
			: [...currentList, optionId];

		setAnswers((prev) => ({
			...prev,
			[qKey]: {
				...prev[qKey],
				multiOptionIds: updated,
			},
		}));
	};

	// Handle free text update
	const handleUpdateFreeText = (questionId: number | string, val: string) => {
		setAnswers((prev) => ({
			...prev,
			[String(questionId)]: {
				...prev[String(questionId)],
				freeText: val,
			},
		}));
	};

	const handleCustomerChange = (val: any) => {
		setCustomerId(val ? String(val) : "");
	};

	const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
		if (e?.preventDefault) e.preventDefault();
		if (!currentTemplate) return;

		if (!customerId) {
			toast.error("Please select a target customer");
			return;
		}

		const questions = (currentTemplate.questions || []) as any[];

		// Validation
		for (const q of questions) {
			const qId =
				q.questionId ?? q.id ?? q.question?.questionId ?? q.question?.id;
			const qKey = String(qId);
			const qAns = answers[qKey];
			const isReq = q.required !== false;
			const qType =
				q.questionType || q.question?.questionType || "SINGLE_CHOICE";

			if (isReq) {
				if (qType === "FREE_TEXT") {
					if (!qAns?.freeText?.trim()) {
						toast.error(
							`Please answer required question: "${q.text || q.question?.text || `Question #${qId}`}"`,
						);
						return;
					}
				} else if (qType === "MULTI_CHOICE") {
					if (!qAns?.multiOptionIds || qAns.multiOptionIds.length === 0) {
						toast.error(
							`Please select at least one option for: "${q.text || q.question?.text || `Question #${qId}`}"`,
						);
						return;
					}
				} else {
					// SINGLE_CHOICE
					if (
						qAns?.singleOptionId === null ||
						qAns?.singleOptionId === undefined
					) {
						toast.error(
							`Please select an answer for: "${q.text || q.question?.text || `Question #${qId}`}"`,
						);
						return;
					}
				}
			}
		}

		// Build payload matching exact backend specification (no companyId field)
		const compiledAnswers = questions.map((q: any) => {
			const qId = Number(
				q.questionId ?? q.id ?? q.question?.questionId ?? q.question?.id,
			);
			const qKey = String(qId);
			const qAns = answers[qKey];
			const qType =
				q.questionType || q.question?.questionType || "SINGLE_CHOICE";

			if (qType === "FREE_TEXT") {
				return {
					questionId: qId,
					answerOptionId: null,
					freeTextValue: qAns?.freeText?.trim() || "",
				};
			}

			if (qType === "MULTI_CHOICE") {
				const optionIds = (qAns?.multiOptionIds || []).map((id) => Number(id));
				return {
					questionId: qId,
					answerOptionId: optionIds.length > 0 ? optionIds : null,
					freeTextValue: null,
				};
			}

			// SINGLE_CHOICE
			return {
				questionId: qId,
				answerOptionId:
					qAns?.singleOptionId !== undefined && qAns?.singleOptionId !== null
						? Number(qAns.singleOptionId)
						: null,
				freeTextValue: null,
			};
		});

		const payload: CreateFeedbackSubmissionRequest = {
			customerId: Number(customerId) || 1,
			answers: compiledAnswers,
		};

		submitMutation.mutate(payload);
	};

	const questionsToRender = (currentTemplate?.questions || []) as any[];

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			size="lg"
			title={`${t("feedback.runSurvey")}: ${currentTemplate?.name || "Customer Feedback"}`}
			subtitle="Complete questionnaire response on behalf of customer or for live testing."
			icon={<Send className="h-5 w-5 text-primary" />}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						form="survey-runner-form"
						onClick={handleSubmit}
						isLoading={submitMutation.isPending}
						loadingText="Submitting to CRM API..."
						label={t("feedback.runSurvey")}
					/>
				</ModernModalFooter>
			}
		>
			<form
				id="survey-runner-form"
				onSubmit={handleSubmit}
				className="space-y-6"
			>
				{/* Searchable Target Customer Selection */}
				<div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
					<ModernSearchSelect
						label="Target Customer *"
						placeholder="Search and select customer by name, code, phone..."
						searchPlaceholder="Search customer..."
						value={
							customerId
								? isNaN(Number(customerId))
									? customerId
									: Number(customerId)
								: null
						}
						options={customerOptions}
						loadOptions={loadCustomerOptions}
						onChange={handleCustomerChange}
					/>
				</div>

				{/* Survey Questions Responder */}
				<div className="space-y-5">
					{isLoadingFullTemplate ? (
						<div className="flex flex-col items-center justify-center p-12 space-y-2">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
							<span className="text-xs text-slate-400">
								Loading survey questions from API...
							</span>
						</div>
					) : questionsToRender.length > 0 ? (
						questionsToRender.map((q: any, idx) => {
							const qId =
								q.questionId ??
								q.id ??
								q.question?.questionId ??
								q.question?.id ??
								idx + 1;
							const qKey = String(qId);
							const qAns = answers[qKey];
							const qType =
								q.questionType || q.question?.questionType || "SINGLE_CHOICE";
							const isReq = q.required !== false;
							const qText =
								q.text || q.question?.text || `Evaluation Question #${qId}`;
							const opts: any[] = q.options || q.question?.options || [];

							return (
								<div
									key={qId || idx}
									className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80 space-y-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-start gap-2.5">
											<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
												{idx + 1}
											</span>
											<div>
												<h4 className="text-sm font-bold text-slate-900 dark:text-white">
													{qText}
													{isReq && (
														<span className="text-rose-500 ml-1">*</span>
													)}
												</h4>
												<span className="text-[10px] text-slate-400 font-medium">
													{qType === "SINGLE_CHOICE"
														? "Select one option"
														: qType === "MULTI_CHOICE"
															? "Select all that apply"
															: "Write detailed response"}
												</span>
											</div>
										</div>

										<Badge variant="outline" className="text-[10px] font-bold">
											{qType}
										</Badge>
									</div>

									{/* Render Choices based on questionType */}
									{qType === "FREE_TEXT" ? (
										<textarea
											rows={3}
											value={qAns?.freeText || ""}
											onChange={(e) =>
												handleUpdateFreeText(qId, e.target.value)
											}
											placeholder="Type customer comments or feedback notes here..."
											className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
										/>
									) : qType === "MULTI_CHOICE" ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
											{opts.map((opt: any, optIdx: number) => {
												const optId =
													opt.answerOptionId ??
													opt.optionId ??
													opt.id ??
													optIdx + 1;
												const isSelected =
													qAns?.multiOptionIds?.some(
														(id) => String(id) === String(optId),
													) || false;
												return (
													<button
														key={optId}
														type="button"
														onClick={() => handleToggleMulti(qId, optId)}
														className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
															isSelected
																? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary"
																: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:border-slate-300 text-slate-700 dark:text-slate-300"
														}`}
													>
														<span className="flex items-center gap-2 text-xs">
															<span
																className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
																	isSelected
																		? "bg-primary border-primary text-white"
																		: "border-slate-300 dark:border-slate-700"
																}`}
															>
																{isSelected && (
																	<CheckSquare className="h-3 w-3" />
																)}
															</span>
															{opt.label}
														</span>
														{typeof opt.scoreValue === "number" && (
															<span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
																{opt.scoreValue}★
															</span>
														)}
													</button>
												);
											})}
										</div>
									) : (
										/* SINGLE CHOICE */
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
											{opts.map((opt: any, optIdx: number) => {
												const optId =
													opt.answerOptionId ??
													opt.optionId ??
													opt.id ??
													optIdx + 1;
												const isSelected =
													qAns?.singleOptionId !== null &&
													qAns?.singleOptionId !== undefined &&
													String(qAns.singleOptionId) === String(optId);
												return (
													<button
														key={optId}
														type="button"
														onClick={() => handleSelectSingle(qId, optId)}
														className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
															isSelected
																? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary"
																: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:border-slate-300 text-slate-700 dark:text-slate-300"
														}`}
													>
														<span className="flex items-center gap-2 text-xs">
															<span
																className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
																	isSelected
																		? "border-primary bg-primary"
																		: "border-slate-300 dark:border-slate-700"
																}`}
															>
																{isSelected && (
																	<span className="h-1.5 w-1.5 rounded-full bg-white" />
																)}
															</span>
															{opt.label}
														</span>
														{typeof opt.scoreValue === "number" && (
															<span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
																{opt.scoreValue}★
															</span>
														)}
													</button>
												);
											})}
										</div>
									)}
								</div>
							);
						})
					) : (
						<div className="p-8 text-center text-slate-400 text-xs">
							No questions found in this template. Please add questions to the
							template first.
						</div>
					)}
				</div>
			</form>
		</ModernModal>
	);
}

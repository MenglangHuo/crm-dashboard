"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type {
	FeedbackQuestion,
	CreateFeedbackQuestionInput,
	AnswerOptionItem,
} from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalSubmitButton,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import { ModernButton } from "@/components/ui-custom/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
	HelpCircle,
	Plus,
	Trash2,
	Sparkles,
	Star,
	CheckCircle2,
	CheckSquare,
	AlignLeft,
	Check,
	ArrowUp,
	ArrowDown,
	Eye,
} from "lucide-react";

interface QuestionFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	question?: FeedbackQuestion | null;
	onSuccess?: () => void;
}

interface EditableOption {
	id: string;
	label: string;
	scoreValue: number;
	orderIndex: number;
}

const PRESETS = [
	{
		name: "5-Tier Rating",
		type: "SINGLE_CHOICE" as const,
		options: [
			{ label: "best", scoreValue: 5, orderIndex: 1 },
			{ label: "better", scoreValue: 4, orderIndex: 2 },
			{ label: "good", scoreValue: 3, orderIndex: 3 },
			{ label: "not good", scoreValue: 2, orderIndex: 4 },
			{ label: "bad", scoreValue: 1, orderIndex: 5 },
		],
	},
	{
		name: "CSAT Satisfaction",
		type: "SINGLE_CHOICE" as const,
		options: [
			{ label: "Very Satisfied", scoreValue: 5, orderIndex: 1 },
			{ label: "Satisfied", scoreValue: 4, orderIndex: 2 },
			{ label: "Neutral", scoreValue: 3, orderIndex: 3 },
			{ label: "Unsatisfied", scoreValue: 2, orderIndex: 4 },
			{ label: "Very Unsatisfied", scoreValue: 1, orderIndex: 5 },
		],
	},
	{
		name: "Yes / No",
		type: "SINGLE_CHOICE" as const,
		options: [
			{ label: "Yes", scoreValue: 5, orderIndex: 1 },
			{ label: "No", scoreValue: 1, orderIndex: 2 },
		],
	},
	{
		name: "Feature Checklist",
		type: "MULTI_CHOICE" as const,
		options: [
			{ label: "Quality & Freshness", scoreValue: 5, orderIndex: 1 },
			{ label: "Delivery Speed", scoreValue: 5, orderIndex: 2 },
			{ label: "Packaging & Cleanliness", scoreValue: 5, orderIndex: 3 },
			{ label: "Staff Friendliness", scoreValue: 5, orderIndex: 4 },
		],
	},
	{
		name: "Open-ended Feedback",
		type: "FREE_TEXT" as const,
		options: [],
	},
];

import { useTranslation } from "@/lib/i18n/context";

export function QuestionFormModal({
	open,
	onOpenChange,
	question,
	onSuccess,
}: QuestionFormModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const isEditing = Boolean(question?.questionId);

	const [text, setText] = useState("");
	const [questionType, setQuestionType] = useState<string>("SINGLE_CHOICE");
	const [options, setOptions] = useState<EditableOption[]>([]);
	const [activePresetName, setActivePresetName] = useState<string | null>(
		"5-Tier Rating",
	);

	// Reset or initialize state
	useEffect(() => {
		if (question && open) {
			setText(question.text || "");
			const normType =
				question.questionType === "RATING" ||
				question.questionType === "MULTIPLE_CHOICE"
					? "SINGLE_CHOICE"
					: question.questionType === "TEXT"
						? "FREE_TEXT"
						: question.questionType || "SINGLE_CHOICE";
			setQuestionType(normType);

			if (question.options && question.options.length > 0) {
				setOptions(
					question.options.map((opt, idx) => ({
						id: `opt-${opt.answerOptionId || idx}-${Date.now()}`,
						label: opt.label,
						scoreValue:
							typeof opt.scoreValue === "number" ? opt.scoreValue : 5 - idx,
						orderIndex: opt.orderIndex || idx + 1,
					})),
				);
			} else if (normType !== "FREE_TEXT") {
				setOptions([
					{ id: "opt-1", label: "best", scoreValue: 5, orderIndex: 1 },
					{ id: "opt-2", label: "better", scoreValue: 4, orderIndex: 2 },
					{ id: "opt-3", label: "good", scoreValue: 3, orderIndex: 3 },
					{ id: "opt-4", label: "not good", scoreValue: 2, orderIndex: 4 },
					{ id: "opt-5", label: "bad", scoreValue: 1, orderIndex: 5 },
				]);
			} else {
				setOptions([]);
			}
			setActivePresetName(null);
		} else if (open) {
			setText("");
			setQuestionType("SINGLE_CHOICE");
			setOptions([
				{ id: "opt-1", label: "best", scoreValue: 5, orderIndex: 1 },
				{ id: "opt-2", label: "better", scoreValue: 4, orderIndex: 2 },
				{ id: "opt-3", label: "good", scoreValue: 3, orderIndex: 3 },
				{ id: "opt-4", label: "not good", scoreValue: 2, orderIndex: 4 },
				{ id: "opt-5", label: "bad", scoreValue: 1, orderIndex: 5 },
			]);
			setActivePresetName("5-Tier Rating");
		}
	}, [question, open]);

	// Mutation
	const saveMutation = useMutation({
		mutationFn: async (payload: CreateFeedbackQuestionInput) => {
			if (isEditing && question?.questionId) {
				return feedbackApi.updateQuestion(question.questionId, payload);
			}
			return feedbackApi.createQuestion(payload);
		},
		onSuccess: () => {
			toast.success(
				isEditing
					? "Question updated successfully"
					: "Question created in bank",
			);
			queryClient.invalidateQueries({ queryKey: ["feedback-questions"] });
			onSuccess?.();
			onOpenChange(false);
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to save question");
		},
	});

	const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
		setActivePresetName(preset.name);
		setQuestionType(preset.type);
		setOptions(
			preset.options.map((opt, idx) => ({
				id: `preset-${idx}-${Date.now()}`,
				label: opt.label,
				scoreValue: opt.scoreValue,
				orderIndex: opt.orderIndex,
			})),
		);
	};

	const handleAddOption = () => {
		setActivePresetName(null);
		const nextIndex = options.length + 1;
		const nextScore = Math.max(1, 6 - nextIndex);
		setOptions((prev) => [
			...prev,
			{
				id: `custom-${Date.now()}-${nextIndex}`,
				label: `Option ${nextIndex}`,
				scoreValue: nextScore,
				orderIndex: nextIndex,
			},
		]);
	};

	const handleRemoveOption = (id: string) => {
		setActivePresetName(null);
		if (options.length <= 1) {
			toast.error("At least one option is required for choice questions");
			return;
		}
		setOptions((prev) => {
			const filtered = prev.filter((o) => o.id !== id);
			return filtered.map((o, idx) => ({ ...o, orderIndex: idx + 1 }));
		});
	};

	const handleUpdateOption = (id: string, updates: Partial<EditableOption>) => {
		setActivePresetName(null);
		setOptions((prev) =>
			prev.map((o) => (o.id === id ? { ...o, ...updates } : o)),
		);
	};

	const handleMoveOption = (index: number, direction: "up" | "down") => {
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === options.length - 1) return;

		setActivePresetName(null);
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		const copy = [...options];
		const temp = copy[index];
		copy[index] = copy[targetIndex];
		copy[targetIndex] = temp;

		setOptions(copy.map((item, idx) => ({ ...item, orderIndex: idx + 1 })));
	};

	const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
		if (e?.preventDefault) {
			e.preventDefault();
		}
		if (!text.trim()) {
			toast.error("Please enter a question prompt");
			return;
		}

		let finalOptions: AnswerOptionItem[] = [];
		if (questionType === "SINGLE_CHOICE" || questionType === "MULTI_CHOICE") {
			if (options.length === 0) {
				toast.error("Please configure at least one answer option");
				return;
			}
			finalOptions = options.map((opt, idx) => ({
				label: opt.label.trim() || `Option ${idx + 1}`,
				scoreValue: Number(opt.scoreValue) || 0,
				orderIndex: idx + 1,
			}));
		}

		saveMutation.mutate({
			text: text.trim(),
			questionType,
			options: finalOptions,
		});
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={
				isEditing
					? `${t("feedback.editQuestion")} — Q-${question?.questionId}`
					: t("feedback.addQuestion")
			}
			subtitle="Configure prompt text, select question response type, and set rating points for choices."
			icon={<HelpCircle className="h-5 w-5 text-primary" />}
			size="xl"
			isLoading={saveMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						form="question-form"
						onClick={handleSubmit}
						isLoading={saveMutation.isPending}
						loadingText={isEditing ? "Updating..." : "Creating..."}
						disabled={!text.trim()}
					>
						{isEditing ? t("common.saveChanges") : t("feedback.addQuestion")}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form id="question-form" onSubmit={handleSubmit} className="space-y-6">
				{/* Presets Bar */}
				<div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-2.5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-1.5">
							<Sparkles className="h-3.5 w-3.5 text-primary" />
							<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
								Quick Scale Presets
							</span>
						</div>
						<span className="text-[10px] text-slate-400">
							Click to apply pre-configured evaluation scales
						</span>
					</div>

					<div className="flex flex-wrap gap-2">
						{PRESETS.map((preset, i) => {
							const isActive = activePresetName === preset.name;
							return (
								<ModernButton
									key={i}
									type="button"
									variant={isActive ? "primary" : "outline"}
									size="xs"
									onClick={() => handleApplyPreset(preset)}
									className={
										isActive
											? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs h-7 text-[11px] rounded-xl"
											: "h-7 text-[11px] rounded-xl border-slate-200/80 bg-white hover:border-primary hover:text-primary dark:bg-slate-900 dark:border-slate-800 transition-colors"
									}
									leftIcon={
										isActive ? <Check className="h-3 w-3" /> : undefined
									}
								>
									{preset.name}
								</ModernButton>
							);
						})}
					</div>
				</div>

				{/* Question Text with ModernInput */}
				<div className="space-y-1.5">
					<ModernInput
						label="Question Prompt"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="e.g. How would you rate the taste of the beverage?"
						required
						clearable
						onClear={() => setText("")}
						leftIcon={<HelpCircle className="h-4 w-4 text-primary" />}
						autoFocus
					/>
				</div>

				{/* Question Type Selection */}
				<div className="space-y-1.5">
					<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
						Question Type *
					</Label>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{[
							{
								type: "SINGLE_CHOICE",
								label: "Single Choice",
								desc: "Radio scale (one selection)",
								icon: <CheckCircle2 className="h-4 w-4 text-primary" />,
							},
							{
								type: "MULTI_CHOICE",
								label: "Multiple Choice",
								desc: "Checklist (select multiple)",
								icon: <CheckSquare className="h-4 w-4 text-emerald-500" />,
							},
							{
								type: "FREE_TEXT",
								label: "Free Text",
								desc: "Open customer comment",
								icon: <AlignLeft className="h-4 w-4 text-indigo-500" />,
							},
						].map((item) => {
							const isSelected = questionType === item.type;
							return (
								<div
									key={item.type}
									onClick={() => {
										setQuestionType(item.type);
										setActivePresetName(null);
									}}
									className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 flex flex-col justify-between ${
										isSelected
											? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1.5 ring-primary"
											: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
									}`}
								>
									<div className="flex items-center justify-between mb-1">
										<span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
											{item.icon}
											{item.label}
										</span>
										{isSelected && (
											<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[10px]">
												<Check className="h-2.5 w-2.5" />
											</span>
										)}
									</div>
									<p className="text-[11px] text-slate-400">{item.desc}</p>
								</div>
							);
						})}
					</div>
				</div>

				{/* Dynamic Options Manager */}
				{questionType !== "FREE_TEXT" && (
					<div className="space-y-3 pt-2">
						<div className="flex items-center justify-between">
							<div>
								<Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
									Answer Options & Score Values
								</Label>
								<p className="text-[11px] text-slate-400">
									Define available choices with associated evaluation points.
								</p>
							</div>
							<ModernButton
								size="sm"
								variant="outline"
								type="button"
								onClick={handleAddOption}
								className="h-8 rounded-xl text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
								leftIcon={<Plus className="h-3.5 w-3.5" />}
							>
								Add Choice
							</ModernButton>
						</div>

						<div className="space-y-2">
							{options.map((opt, idx) => (
								<div
									key={opt.id}
									className="flex items-center gap-2 p-2 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/80"
								>
									{/* Option Order Number */}
									<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-primary border border-slate-200/60 dark:border-slate-700/60 font-mono">
										#{idx + 1}
									</span>

									{/* Option Label Field */}
									<div className="flex-1">
										<input
											type="text"
											value={opt.label}
											onChange={(e) =>
												handleUpdateOption(opt.id, { label: e.target.value })
											}
											placeholder={`Option ${idx + 1} label (e.g. good, bad)`}
											className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
										/>
									</div>

									{/* Option Score Points Input */}
									<div className="w-24 shrink-0 flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1">
										<Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
										<input
											type="number"
											step="0.5"
											min="0"
											max="100"
											value={opt.scoreValue}
											onChange={(e) =>
												handleUpdateOption(opt.id, {
													scoreValue: parseFloat(e.target.value) || 0,
												})
											}
											className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 text-right focus:outline-none font-mono"
											placeholder="5"
										/>
										<span className="text-[10px] text-slate-400 font-mono">
											pts
										</span>
									</div>

									{/* Reorder Buttons */}
									<div className="flex items-center gap-0.5 shrink-0">
										<ModernButton
											size="icon-xs"
											variant="ghost"
											type="button"
											disabled={idx === 0}
											onClick={() => handleMoveOption(idx, "up")}
											leftIcon={<ArrowUp className="h-3 w-3" />}
											className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
										/>
										<ModernButton
											size="icon-xs"
											variant="ghost"
											type="button"
											disabled={idx === options.length - 1}
											onClick={() => handleMoveOption(idx, "down")}
											leftIcon={<ArrowDown className="h-3 w-3" />}
											className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
										/>
									</div>

									{/* Delete Option */}
									<ModernButton
										size="icon-xs"
										variant="ghost"
										type="button"
										onClick={() => handleRemoveOption(opt.id)}
										leftIcon={<Trash2 className="h-3.5 w-3.5" />}
										className="h-7 w-7 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
									/>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Live Survey Interactive Preview Box */}
				<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10 space-y-2.5">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
							<Eye className="h-3 w-3" /> Live Question Preview
						</span>
						<Badge variant="outline" className="text-[9px] font-bold">
							{questionType}
						</Badge>
					</div>

					<div className="space-y-2">
						<p className="text-xs font-bold text-slate-900 dark:text-slate-100">
							{text.trim() || "How would you rate your overall experience?"}
						</p>

						{questionType === "FREE_TEXT" ? (
							<textarea
								disabled
								placeholder="Respondent enters open comments here..."
								rows={2}
								className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 resize-none"
							/>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
								{options.map((opt, i) => (
									<div
										key={i}
										className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 shadow-2xs text-xs font-medium text-slate-700 dark:text-slate-300"
									>
										<span className="flex items-center gap-2">
											{questionType === "SINGLE_CHOICE" ? (
												<span className="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-slate-600 inline-block" />
											) : (
												<span className="h-3.5 w-3.5 rounded border border-slate-300 dark:border-slate-600 inline-block" />
											)}
											<span>{opt.label || `Option ${i + 1}`}</span>
										</span>
										<Badge
											variant="secondary"
											className="h-4 px-1.5 text-[9px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
										>
											{opt.scoreValue}★
										</Badge>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</form>
		</ModernModal>
	);
}

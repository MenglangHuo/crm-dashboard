"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type {
	FeedbackTemplate,
	FeedbackQuestion,
	CreateFeedbackTemplateInput,
	TemplateQuestionAssignment,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	FileText,
	Plus,
	Trash2,
	HelpCircle,
	ArrowUp,
	ArrowDown,
	CheckCircle2,
	Search,
	Sparkles,
	Layers,
	Check,
	GripVertical,
} from "lucide-react";

interface TemplateFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template?: FeedbackTemplate | null;
	onSuccess?: () => void;
}

interface AssignedQuestionItem {
	questionId: number | string;
	orderIndex: number;
	required: boolean;
	text: string;
	questionType?: string;
	options?: any[];
}

import { useTranslation } from "@/lib/i18n/context";

export function TemplateFormModal({
	open,
	onOpenChange,
	template,
	onSuccess,
}: TemplateFormModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const isEditing = Boolean(template?.templateId);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [assignedQuestions, setAssignedQuestions] = useState<
		AssignedQuestionItem[]
	>([]);
	const [bankSearch, setBankSearch] = useState("");

	// Drag and Drop state for reordering
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// Fetch Question Bank
	const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
		queryKey: ["feedback-questions-for-template"],
		queryFn: () => feedbackApi.searchQuestions({ size: 100 }),
		enabled: open,
	});

	const questionBank: FeedbackQuestion[] = questionsData?.items || [];

	// Initialize or reset state
	useEffect(() => {
		if (template && open) {
			setName(template.name || "");
			setDescription(template.description || "");

			if (template.questions && template.questions.length > 0) {
				setAssignedQuestions(
					template.questions.map((q: any, idx) => ({
						questionId: q.questionId,
						orderIndex: q.orderIndex || idx + 1,
						required: q.required !== false,
						text: q.text || `Question #${q.questionId}`,
						questionType: q.questionType || "SINGLE_CHOICE",
						options: q.options || [],
					})),
				);
			} else {
				setAssignedQuestions([]);
			}
		} else if (open) {
			setName("");
			setDescription("");
			setAssignedQuestions([]);
		}
	}, [template, open]);

	// Mutation
	const saveMutation = useMutation({
		mutationFn: async (payload: CreateFeedbackTemplateInput) => {
			if (isEditing && template?.templateId) {
				return feedbackApi.updateTemplate(template.templateId, payload);
			}
			return feedbackApi.createTemplate(payload);
		},
		onSuccess: () => {
			toast.success(
				isEditing
					? "Template updated successfully"
					: "Survey template created successfully",
			);
			queryClient.invalidateQueries({ queryKey: ["feedback-templates"] });
			onSuccess?.();
			onOpenChange(false);
		},
		onError: (err) => {
			toast.error(getErrorMessage(err) || "Failed to save template");
		},
	});

	// Add question from bank
	const handleAddQuestionFromBank = (q: FeedbackQuestion) => {
		const alreadyAdded = assignedQuestions.some(
			(item) => String(item.questionId) === String(q.questionId),
		);
		if (alreadyAdded) {
			toast.info("This question is already in the survey");
			return;
		}

		setAssignedQuestions((prev) => [
			...prev,
			{
				questionId: q.questionId,
				orderIndex: prev.length + 1,
				required: true,
				text: q.text,
				questionType: q.questionType,
				options: q.options,
			},
		]);
	};

	// Remove assigned question
	const handleRemoveQuestion = (questionId: number | string) => {
		setAssignedQuestions((prev) => {
			const filtered = prev.filter(
				(item) => String(item.questionId) !== String(questionId),
			);
			return filtered.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
		});
	};

	// Move Up / Down fine-tuning buttons
	const handleMove = (index: number, direction: "up" | "down") => {
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === assignedQuestions.length - 1) return;

		const targetIndex = direction === "up" ? index - 1 : index + 1;
		const copy = [...assignedQuestions];
		const temp = copy[index];
		copy[index] = copy[targetIndex];
		copy[targetIndex] = temp;

		setAssignedQuestions(
			copy.map((item, idx) => ({ ...item, orderIndex: idx + 1 })),
		);
	};

	// -------------------------------------------------------------
	// Drag and Drop Handlers (Left Click / Touch Move Reorder)
	// -------------------------------------------------------------
	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(index));
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if (dragOverIndex !== index) {
			setDragOverIndex(index);
		}
	};

	const handleDragEnter = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		setDragOverIndex(index);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent, targetIndex: number) => {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === targetIndex) {
			setDraggedIndex(null);
			setDragOverIndex(null);
			return;
		}

		const updated = [...assignedQuestions];
		const [movedItem] = updated.splice(draggedIndex, 1);
		updated.splice(targetIndex, 0, movedItem);

		setAssignedQuestions(
			updated.map((item, idx) => ({ ...item, orderIndex: idx + 1 })),
		);
		setDraggedIndex(null);
		setDragOverIndex(null);
		toast.success(`Question moved to position #${targetIndex + 1}`, {
			duration: 1500,
		});
	};

	// Toggle Required
	const handleToggleRequired = (questionId: number | string) => {
		setAssignedQuestions((prev) =>
			prev.map((item) =>
				String(item.questionId) === String(questionId)
					? { ...item, required: !item.required }
					: item,
			),
		);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Template name is required");
			return;
		}

		if (assignedQuestions.length === 0) {
			toast.error("Please add at least one question to the template");
			return;
		}

		const payload: CreateFeedbackTemplateInput = {
			name: name.trim(),
			description: description.trim() || undefined,
			questions: assignedQuestions.map((q, idx) => ({
				questionId: q.questionId,
				orderIndex: idx + 1,
				required: q.required,
			})),
		};

		saveMutation.mutate(payload);
	};

	// Filtered bank
	const filteredBank = useMemo(() => {
		if (!bankSearch.trim()) return questionBank;
		const q = bankSearch.toLowerCase();
		return questionBank.filter(
			(item) =>
				item.text?.toLowerCase().includes(q) ||
				item.questionType?.toLowerCase().includes(q),
		);
	}, [questionBank, bankSearch]);

	return (
		<ModernModal
			open={open}
			onOpenChange={onOpenChange}
			size="xl"
			title={
				isEditing
					? `${t("feedback.editTemplate")} — ${template?.name}`
					: t("feedback.createTemplate")
			}
			subtitle="Design questionnaire structure, select question pool, and set required answers."
			icon={<FileText className="h-5 w-5 text-primary" />}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						form="template-form"
						onClick={handleSubmit}
						isLoading={saveMutation.isPending}
						loadingText="Saving template..."
						label={
							isEditing ? t("common.saveChanges") : t("feedback.createTemplate")
						}
					/>
				</ModernModalFooter>
			}
		>
			<form id="template-form" onSubmit={handleSubmit} className="space-y-6">
				{/* Basic Info */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<ModernInput
						label="Survey Template Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="e.g. Q3 Customer Satisfaction Survey"
						required
						clearable
						onClear={() => setName("")}
						autoFocus
					/>
					<ModernInput
						label="Description / Purpose"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="e.g. Standard survey sent to customers post-support resolution."
						clearable
						onClear={() => setDescription("")}
					/>
				</div>

				{/* Question Selector Studio Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
					{/* Left Column: Assigned Questions with Drag & Drop */}
					<div className="lg:col-span-7 space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
									<Layers className="h-4 w-4 text-primary" />
									Survey Questions Flow ({assignedQuestions.length})
								</Label>
								<p className="text-[11px] text-slate-400">
									Drag & drop items to reorder question position.
								</p>
							</div>

							{assignedQuestions.length > 1 && (
								<span className="inline-flex items-center gap-1 text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
									<GripVertical className="h-3 w-3" />
									Drag handle to reorder
								</span>
							)}
						</div>

						{assignedQuestions.length > 0 ? (
							<div className="space-y-2.5">
								{assignedQuestions.map((q, idx) => {
									const isDragging = draggedIndex === idx;
									const isHovered =
										dragOverIndex === idx && draggedIndex !== idx;

									return (
										<div
											key={q.questionId}
											draggable
											onDragStart={(e) => handleDragStart(e, idx)}
											onDragOver={(e) => handleDragOver(e, idx)}
											onDragEnter={(e) => handleDragEnter(e, idx)}
											onDragEnd={handleDragEnd}
											onDrop={(e) => handleDrop(e, idx)}
											className={`group relative flex items-start justify-between gap-3 p-3 rounded-2xl border transition-all select-none ${
												isDragging
													? "opacity-40 border-dashed border-primary bg-primary/5 scale-[0.99] shadow-inner"
													: isHovered
														? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md scale-[1.01]"
														: "border-slate-200/90 bg-slate-50/70 hover:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900 hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700"
											}`}
										>
											<div className="flex items-start gap-2 min-w-0 flex-1">
												{/* Drag Handle Indicator */}
												<div
													className="pt-0.5 text-slate-400 group-hover:text-primary cursor-grab active:cursor-grabbing hover:bg-slate-200/60 dark:hover:bg-slate-800 p-1 rounded-lg transition-colors shrink-0"
													title="Click and drag to reorder question position"
												>
													<GripVertical className="h-4 w-4" />
												</div>

												{/* Sequence Number */}
												<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold font-mono shadow-2xs">
													{idx + 1}
												</span>

												{/* Question Details */}
												<div className="min-w-0 flex-1">
													<p className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
														{q.text}
													</p>
													<div className="flex items-center gap-2 mt-1.5">
														<Badge
															variant="outline"
															className="h-4 text-[9px] font-bold px-1 rounded"
														>
															{q.questionType || "SINGLE_CHOICE"}
														</Badge>
														<button
															type="button"
															onClick={() => handleToggleRequired(q.questionId)}
															className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
																q.required
																	? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
																	: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
															}`}
														>
															{q.required ? "Required *" : "Optional"}
														</button>
													</div>
												</div>
											</div>

											{/* Right Action Tools (Move & Delete) */}
											<div className="flex items-center gap-0.5 shrink-0">
												<ModernButton
													size="icon-xs"
													variant="ghost"
													type="button"
													disabled={idx === 0}
													onClick={() => handleMove(idx, "up")}
													leftIcon={<ArrowUp className="h-3.5 w-3.5" />}
													className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
													title="Move up"
												/>
												<ModernButton
													size="icon-xs"
													variant="ghost"
													type="button"
													disabled={idx === assignedQuestions.length - 1}
													onClick={() => handleMove(idx, "down")}
													leftIcon={<ArrowDown className="h-3.5 w-3.5" />}
													className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
													title="Move down"
												/>
												<ModernButton
													size="icon-xs"
													variant="ghost"
													type="button"
													onClick={() => handleRemoveQuestion(q.questionId)}
													leftIcon={<Trash2 className="h-3.5 w-3.5" />}
													className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
													title="Remove question"
												/>
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 space-y-2">
								<HelpCircle className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
								<p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
									No questions added yet
								</p>
								<p className="text-[11px] text-slate-400 max-w-xs mx-auto">
									Pick questions from the right-hand Question Bank to build this
									survey form.
								</p>
							</div>
						)}
					</div>

					{/* Right Column: Question Bank Picker */}
					<div className="lg:col-span-5 space-y-3">
						<div>
							<Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
								<span>Select From Question Bank</span>
								<span className="text-[10px] text-slate-400 font-mono">
									{filteredBank.length} available
								</span>
							</Label>
							<div className="relative mt-1.5">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
								<input
									type="text"
									value={bankSearch}
									onChange={(e) => setBankSearch(e.target.value)}
									placeholder="Search questions by keyword..."
									className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
						</div>

						<ScrollArea className="h-[300px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
							<div className="space-y-1.5">
								{filteredBank.map((q) => {
									const isAdded = assignedQuestions.some(
										(item) => String(item.questionId) === String(q.questionId),
									);
									return (
										<div
											key={q.questionId}
											className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
												isAdded
													? "bg-primary/5 border-primary/20 dark:bg-primary/10"
													: "bg-slate-50/50 hover:bg-slate-100/70 border-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:border-slate-800"
											}`}
										>
											<div className="min-w-0 flex-1">
												<p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
													{q.text}
												</p>
												<div className="flex items-center gap-1.5 mt-0.5">
													<span className="text-[10px] text-slate-400 font-mono">
														Q-{q.questionId}
													</span>
													<span className="text-[10px] text-slate-400">•</span>
													<span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
														{q.questionType}
													</span>
												</div>
											</div>

											<ModernButton
												size="xs"
												variant={isAdded ? "primary" : "outline"}
												type="button"
												onClick={() =>
													isAdded
														? handleRemoveQuestion(q.questionId)
														: handleAddQuestionFromBank(q)
												}
												className={
													isAdded
														? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs h-7 px-2.5 text-[11px] rounded-lg shrink-0"
														: "border-primary/30 text-primary hover:bg-primary/10 h-7 px-2.5 text-[11px] rounded-lg shrink-0"
												}
												leftIcon={
													isAdded ? (
														<Check className="h-3 w-3" />
													) : (
														<Plus className="h-3 w-3" />
													)
												}
											>
												{isAdded ? "Added" : "Add"}
											</ModernButton>
										</div>
									);
								})}
								{filteredBank.length === 0 && (
									<div className="py-8 text-center text-xs text-slate-400">
										No questions match search.
									</div>
								)}
							</div>
						</ScrollArea>
					</div>
				</div>
			</form>
		</ModernModal>
	);
}

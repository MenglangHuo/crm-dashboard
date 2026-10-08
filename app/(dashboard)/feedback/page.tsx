"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackApi } from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import type {
	FeedbackSubmission,
	FeedbackTemplate,
	FeedbackQuestion,
} from "@/lib/types";

import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import { ModernButton } from "@/components/ui-custom/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import {
	MessageSquare,
	Plus,
	Search,
	Star,
	FileText,
	HelpCircle,
	Eye,
	Loader2,
	CheckCircle2,
	BarChart3,
	Send,
	Edit3,
	Trash2,
	Layers,
	Sparkles,
	Filter,
	ArrowRight,
	Clock,
	User,
	Quote,
	CheckSquare,
	ListOrdered,
	RotateCw,
	Calendar,
	Check,
	Inbox,
} from "lucide-react";

import { FeedbackKpiSummary } from "@/components/feedback/feedback-kpi-summary";
import { QuestionFormModal } from "@/components/feedback/question-form-modal";
import { TemplateFormModal } from "@/components/feedback/template-form-modal";
import { SubmitSurveyModal } from "@/components/feedback/submit-survey-modal";
import { SubmissionDetailsDrawer } from "@/components/feedback/submission-details-drawer";
import { useTranslation } from "@/lib/i18n/context";

export default function FeedbackPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<string>("templates");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [selectedTemplateId, setSelectedTemplateId] = useState<
		number | string | null
	>(null);
	const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

	// Debounce search query to avoid aggressive API requests
	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedSearch(search.trim());
		}, 350);
		return () => clearTimeout(handler);
	}, [search]);

	// Modal States
	const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
	const [editingQuestion, setEditingQuestion] =
		useState<FeedbackQuestion | null>(null);

	const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
	const [editingTemplate, setEditingTemplate] =
		useState<FeedbackTemplate | null>(null);

	const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
	const [runningTemplate, setRunningTemplate] =
		useState<FeedbackTemplate | null>(null);

	const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
	const [selectedSubmission, setSelectedSubmission] =
		useState<FeedbackSubmission | null>(null);

	// 1. Fetch Survey Templates (Real API, cached for 1 min)
	const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
		queryKey: ["feedback-templates", debouncedSearch],
		queryFn: () =>
			feedbackApi.searchTemplates({
				search: debouncedSearch,
				size: 50,
			}),
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const templatesList: FeedbackTemplate[] = templatesData?.items || [];

	// Auto-select active template
	useEffect(() => {
		if (templatesList.length > 0 && !selectedTemplateId) {
			setSelectedTemplateId(templatesList[0].templateId);
		}
	}, [templatesList, selectedTemplateId]);

	// 2. Fetch Question Bank (Real API, lazy-loaded ONLY when Question Bank tab is active)
	const { data: questionsData, isLoading: isLoadingQuestions } = useQuery({
		queryKey: ["feedback-questions", debouncedSearch, selectedTypeFilter],
		queryFn: () =>
			feedbackApi.searchQuestions({
				search: debouncedSearch,
				questionType:
					selectedTypeFilter !== "ALL" ? selectedTypeFilter : undefined,
				size: 50,
			}),
		enabled: activeTab === "questions",
		staleTime: 60 * 1000,
		refetchOnWindowFocus: false,
	});

	const questionsList: FeedbackQuestion[] = questionsData?.items || [];

	// 3. Fetch Submissions (Real API, lazy-loaded ONLY when Submissions or Answers tab is active)
	const {
		data: submissionsData,
		isLoading: isLoadingSubmissions,
		refetch: refetchSubmissions,
	} = useQuery({
		queryKey: ["feedback-submissions", selectedTemplateId],
		queryFn: async () => {
			if (!selectedTemplateId) return { items: [], total: 0 };
			return feedbackApi.searchSubmissions(selectedTemplateId, { size: 50 });
		},
		enabled:
			(activeTab === "submissions" || activeTab === "answers") &&
			Boolean(selectedTemplateId),
		staleTime: 45 * 1000,
		refetchOnWindowFocus: false,
	});

	const submissionsList: FeedbackSubmission[] = submissionsData?.items || [];

	// Active template object
	const activeTemplate = useMemo(() => {
		return (
			templatesList.find(
				(t) => String(t.templateId) === String(selectedTemplateId),
			) ||
			templatesList[0] ||
			null
		);
	}, [templatesList, selectedTemplateId]);

	// Calculate dynamic CSAT average from real submissions
	const dynamicCsatAverage = useMemo(() => {
		if (!submissionsList || submissionsList.length === 0) return 5.0;
		const validScores = submissionsList
			.map((s) => Number(s.totalScore))
			.filter((val) => !isNaN(val) && val > 0);
		if (validScores.length === 0) return 5.0;
		const sum = validScores.reduce((acc, score) => acc + score, 0);
		return Number((sum / validScores.length).toFixed(1));
	}, [submissionsList]);

	// Flattened customer answers for drilldown exploration (Real API data)
	const answersList = useMemo(() => {
		const list: any[] = [];
		submissionsList.forEach((sub) => {
			sub.answers?.forEach((ans, idx) => {
				const optionLabel =
					ans.selectedOptions && ans.selectedOptions.length > 0
						? ans.selectedOptions.map((o) => o.label).join(", ")
						: ans.selectedOption
							? ans.selectedOption.label
							: ans.freeTextValue || "—";

				const score =
					ans.selectedOptions && ans.selectedOptions.length > 0
						? ans.selectedOptions.reduce(
								(acc, o) => acc + (o.scoreValue || 0),
								0,
							)
						: ans.selectedOption?.scoreValue || null;

				list.push({
					id: `${sub.submissionId}-${ans.questionId}-${idx}`,
					submissionId: sub.submissionId,
					templateName:
						sub.template?.name || activeTemplate?.name || "Survey Form",
					customerId: sub.customerId,
					userName: sub.userName || "staff",
					questionText: ans.questionText || `Question #${ans.questionId}`,
					questionType: ans.questionType || "SINGLE_CHOICE",
					answerVal: optionLabel,
					freeText: ans.freeTextValue,
					scoreValue: score,
					submittedAt: sub.submittedAt,
				});
			});
		});
		return list;
	}, [submissionsList, activeTemplate]);

	// Delete Template Mutation
	const deleteTemplateMutation = useMutation({
		mutationFn: feedbackApi.deleteTemplate,
		onSuccess: () => {
			toast.success(t("feedback.deletedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["feedback-templates"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// Delete Question Mutation
	const deleteQuestionMutation = useMutation({
		mutationFn: feedbackApi.deleteQuestion,
		onSuccess: () => {
			toast.success(t("feedback.deletedSuccess"));
			queryClient.invalidateQueries({ queryKey: ["feedback-questions"] });
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	// -------------------------------------------------------------
	// DataTable Column Definitions
	// -------------------------------------------------------------

	// 1. Question Bank Columns
	const questionColumns: ColumnDef<FeedbackQuestion>[] = [
		{
			id: "questionId",
			header: "Q-ID",
			accessorKey: "questionId",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-mono font-bold text-xs text-primary">
					Q-{value}
				</span>
			),
		},
		{
			id: "text",
			header: t("feedback.questionPrompt"),
			accessorKey: "text",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-bold text-xs text-slate-900 dark:text-slate-100 max-w-sm block">
					{value}
				</span>
			),
		},
		{
			id: "questionType",
			header: t("feedback.questionType"),
			accessorKey: "questionType",
			cell: ({ value }) => (
				<Badge
					variant="outline"
					className={`rounded-lg text-[10px] font-bold px-2 py-0.5 ${
						value === "SINGLE_CHOICE"
							? "border-primary/30 text-primary bg-primary/5"
							: value === "MULTI_CHOICE"
								? "border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
								: "border-indigo-200 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40"
					}`}
				>
					{value}
				</Badge>
			),
		},
		{
			id: "options",
			header: "Choices & Evaluation Points",
			accessorKey: "options",
			cell: ({ value, row }) => {
				const opts = value || row.options;
				if (opts && opts.length > 0) {
					return (
						<div className="flex flex-wrap gap-1.5 max-w-md">
							{opts.map((opt: any, idx: number) => (
								<span
									key={idx}
									className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white dark:bg-slate-950 dark:border-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 shadow-2xs"
								>
									<span>{opt.label}</span>
									{typeof opt.scoreValue === "number" && (
										<span className="font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
											({opt.scoreValue}★)
										</span>
									)}
								</span>
							))}
						</div>
					);
				}
				return (
					<span className="text-xs text-slate-400 italic">
						Free Text Response
					</span>
				);
			},
		},
		{
			id: "actions",
			header: "Actions",
			cell: ({ row }) => (
				<div className="flex items-center justify-end gap-1">
					<ModernButton
						size="icon-sm"
						variant="ghost"
						onClick={() => {
							setEditingQuestion(row);
							setIsQuestionModalOpen(true);
						}}
						title="Edit Question"
						leftIcon={<Edit3 className="h-3.5 w-3.5" />}
						className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
					/>
					<ModernButton
						size="icon-sm"
						variant="ghost"
						onClick={() => {
							if (confirm(`Remove question "${row.text}" from bank?`)) {
								deleteQuestionMutation.mutate(row.questionId);
							}
						}}
						title="Delete Question"
						leftIcon={<Trash2 className="h-3.5 w-3.5" />}
						className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
					/>
				</div>
			),
		},
	];

	// 2. Submissions Log Columns
	const submissionColumns: ColumnDef<FeedbackSubmission>[] = [
		{
			id: "submissionId",
			header: t("feedback.submissions"),
			accessorKey: "submissionId",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
					#SUB-{value}
				</span>
			),
		},
		{
			id: "template",
			header: t("feedback.templateName"),
			accessorKey: "template",
			cell: ({ value }) => (
				<span className="font-bold text-xs text-slate-900 dark:text-white">
					{value?.name || activeTemplate?.name || "Survey Form"}
				</span>
			),
		},
		{
			id: "customerId",
			header: "Customer",
			accessorKey: "customerId",
			cell: ({ value }) => (
				<span className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
					<User className="h-3.5 w-3.5 text-primary" />
					Customer #{value || "N/A"}
				</span>
			),
		},
		{
			id: "userName",
			header: "Submitted By",
			accessorKey: "userName",
			cell: ({ value }) => (
				<span className="text-xs font-mono text-slate-500">
					@{value || "staff"}
				</span>
			),
		},
		{
			id: "totalScore",
			header: t("feedback.csatScore"),
			accessorKey: "totalScore",
			sortable: true,
			cell: ({ value }) => {
				const scoreFormatted =
					value !== undefined && value !== null
						? Number(value).toFixed(1)
						: "—";
				return (
					<div className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-mono">
						<Star className="h-3 w-3 fill-amber-500 text-amber-500" />
						<span>{scoreFormatted} pts</span>
					</div>
				);
			},
		},
		{
			id: "submittedAt",
			header: "Date & Time",
			accessorKey: "submittedAt",
			sortable: true,
			cell: ({ value }) => (
				<span className="text-xs text-slate-500 font-mono">
					{value ? new Date(value).toLocaleDateString() : "—"}
				</span>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			cell: ({ value }) => (
				<Badge className="rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
					{value || "COMPLETED"}
				</Badge>
			),
		},
		{
			id: "actions",
			header: "Review",
			cell: ({ row }) => (
				<ModernButton
					size="sm"
					variant="outline"
					onClick={() => {
						setSelectedSubmission(row);
						setIsDetailDrawerOpen(true);
					}}
					className="h-8 px-2.5 text-xs rounded-xl"
					leftIcon={<Eye className="h-3 w-3 text-primary" />}
				>
					{t("common.details")}
				</ModernButton>
			),
		},
	];

	// 3. Answers Explorer Columns
	const answerColumns: ColumnDef<any>[] = [
		{
			id: "customerId",
			header: "Customer / Submitter",
			accessorKey: "customerId",
			cell: ({ value, row }) => (
				<div>
					<span className="font-bold text-xs text-slate-900 dark:text-white block">
						Customer #{value}
					</span>
					<span className="text-[10px] text-slate-400 font-mono">
						by @{row.userName}
					</span>
				</div>
			),
		},
		{
			id: "templateName",
			header: "Survey Context",
			accessorKey: "templateName",
			cell: ({ value }) => (
				<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
					{value}
				</span>
			),
		},
		{
			id: "questionText",
			header: t("feedback.questionPrompt"),
			accessorKey: "questionText",
			cell: ({ value }) => (
				<span
					className="text-xs font-bold text-slate-900 dark:text-slate-100 max-w-xs block truncate"
					title={value}
				>
					{value}
				</span>
			),
		},
		{
			id: "answerVal",
			header: "Submitted Answer",
			accessorKey: "answerVal",
			cell: ({ value, row }) => {
				if (row.scoreValue !== null) {
					return (
						<span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary">
							<Star className="h-3 w-3 fill-primary" />
							<span>{value}</span>
							<span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
								({row.scoreValue}★)
							</span>
						</span>
					);
				}
				return (
					<span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 italic bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
						<Quote className="h-3 w-3 text-primary" />"{row.freeText || value}"
					</span>
				);
			},
		},
		{
			id: "submittedAt",
			header: "Date",
			accessorKey: "submittedAt",
			cell: ({ value }) => (
				<span className="text-xs font-mono text-slate-400">
					{value ? new Date(value).toLocaleDateString() : "—"}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-16">
			{/* Top Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<div className="flex items-center gap-2.5">
						<div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20">
							<MessageSquare className="h-5 w-5" />
						</div>
						<div>
							<h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
								{t("feedback.title")}
							</h1>
							<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
								{t("feedback.subtitle")}
							</p>
						</div>
					</div>
				</div>

				{/* Global Action Buttons */}
				<div className="flex items-center gap-2.5 flex-wrap">
					<ModernButton
						size="sm"
						variant="outline"
						onClick={() => {
							setEditingQuestion(null);
							setIsQuestionModalOpen(true);
						}}
						leftIcon={<Plus className="h-3.5 w-3.5 text-primary" />}
					>
						{t("feedback.addQuestion")}
					</ModernButton>

					<ModernButton
						size="sm"
						onClick={() => {
							setEditingTemplate(null);
							setIsTemplateModalOpen(true);
						}}
						className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
						leftIcon={<Plus className="h-3.5 w-3.5" />}
					>
						{t("feedback.createTemplate")}
					</ModernButton>
				</div>
			</div>

			{/* KPI Overview Summary Banner (Powered by Real API data) */}
			<FeedbackKpiSummary
				totalTemplates={templatesData?.total ?? templatesList.length}
				totalQuestions={questionsData?.total ?? questionsList.length}
				totalSubmissions={submissionsData?.total ?? submissionsList.length}
				averageCsat={dynamicCsatAverage}
			/>

			{/* Main Tabs Navigation */}
			<ModernTabs value={activeTab} onValueChange={setActiveTab}>
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
					<ModernTabsList variant="pills" size="md">
						<ModernTabsTrigger
							value="templates"
							icon={<FileText className="h-3.5 w-3.5" />}
							badge={templatesList.length}
							badgeColor="blue"
						>
							{t("feedback.templatesTab")}
						</ModernTabsTrigger>

						<ModernTabsTrigger
							value="questions"
							icon={<HelpCircle className="h-3.5 w-3.5" />}
							badge={questionsList.length}
							badgeColor="purple"
						>
							{t("feedback.questionsTab")}
						</ModernTabsTrigger>

						<ModernTabsTrigger
							value="submissions"
							icon={<BarChart3 className="h-3.5 w-3.5" />}
							badge={submissionsList.length}
							badgeColor="emerald"
						>
							{t("feedback.submissionsTab")}
						</ModernTabsTrigger>

						<ModernTabsTrigger
							value="answers"
							icon={<CheckCircle2 className="h-3.5 w-3.5" />}
							badge={answersList.length}
							badgeColor="indigo"
						>
							{t("feedback.answersTab")}
						</ModernTabsTrigger>
					</ModernTabsList>

					{/* Search bar with debouncing */}
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t("feedback.searchPlaceholder")}
							className="pl-8.5 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
						/>
					</div>
				</div>

				{/* ------------------------------------------------------------- */}
				{/* TAB 1: SURVEY TEMPLATES                                       */}
				{/* ------------------------------------------------------------- */}
				<ModernTabsContent value="templates">
					{isLoadingTemplates ? (
						<div className="flex flex-col items-center justify-center p-16 space-y-2">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
							<span className="text-xs text-slate-400">
								Loading survey templates...
							</span>
						</div>
					) : templatesList.length === 0 ? (
						<div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
							<Inbox className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
							<h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
								No Survey Templates Found
							</h3>
							<p className="text-xs text-slate-400 max-w-sm mx-auto">
								Get started by creating your first survey evaluation template to
								gather customer feedback.
							</p>
							<ModernButton
								size="sm"
								onClick={() => {
									setEditingTemplate(null);
									setIsTemplateModalOpen(true);
								}}
								className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
								leftIcon={<Plus className="h-3.5 w-3.5" />}
							>
								{t("feedback.createTemplate")}
							</ModernButton>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
							{templatesList.map((tpl) => (
								<div
									key={tpl.templateId}
									className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md transition-all duration-200 hover:shadow-lg hover:border-primary/30 dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-primary/40"
								>
									<div>
										{/* Top Status & ID */}
										<div className="flex items-center justify-between gap-2 mb-3">
											<Badge
												className={`rounded-lg text-[10px] font-bold border px-2 py-0.5 ${
													tpl.status === "PUBLISHED"
														? "bg-primary/10 text-primary border-primary/20"
														: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
												}`}
											>
												{tpl.status || "PUBLISHED"}
											</Badge>
											<span className="text-[11px] font-mono text-slate-400 font-semibold">
												TPL-{tpl.templateId}
											</span>
										</div>

										{/* Title & Description */}
										<h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
											{tpl.name}
										</h3>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
											{tpl.description ||
												"Standard survey evaluation questionnaire."}
										</p>

										{/* Questions Flow Chips */}
										<div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
											<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
												<span>{t("feedback.configuredQuestions")}</span>
												<span className="font-mono text-primary font-bold">
													{tpl.questions?.length || 0}{" "}
													{t("feedback.questionsCount")}
												</span>
											</span>

											<div className="flex flex-wrap gap-1.5 pt-1">
												{tpl.questions && tpl.questions.length > 0 ? (
													tpl.questions.slice(0, 3).map((q: any, i) => (
														<span
															key={i}
															className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]"
															title={q.text}
														>
															<span className="font-bold text-primary">
																#{i + 1}
															</span>
															<span className="truncate">
																{q.text || `Q-${q.questionId}`}
															</span>
														</span>
													))
												) : (
													<span className="text-[11px] text-slate-400 italic">
														{t("feedback.noQuestionsAssigned")}
													</span>
												)}
												{tpl.questions && tpl.questions.length > 3 && (
													<span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
														+{tpl.questions.length - 3} {t("common.more")}
													</span>
												)}
											</div>
										</div>
									</div>

									{/* Actions Footer */}
									<div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
										<div className="flex items-center gap-1">
											<ModernButton
												size="icon-sm"
												variant="ghost"
												onClick={() => {
													setEditingTemplate(tpl);
													setIsTemplateModalOpen(true);
												}}
												title="Edit Template"
												leftIcon={<Edit3 className="h-3.5 w-3.5" />}
												className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
											/>
											<ModernButton
												size="icon-sm"
												variant="ghost"
												onClick={() => {
													if (confirm(`${t("feedback.deleteConfirm")}`)) {
														deleteTemplateMutation.mutate(tpl.templateId);
													}
												}}
												title="Delete Template"
												leftIcon={<Trash2 className="h-3.5 w-3.5" />}
												className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
											/>
											<ModernButton
												size="xs"
												variant="outline"
												onClick={() => {
													setSelectedTemplateId(tpl.templateId);
													setActiveTab("submissions");
												}}
												title="View Submissions"
												className="h-8 px-2 text-[11px] font-bold"
												leftIcon={<Eye className="h-3 w-3 text-primary" />}
											>
												{t("feedback.viewSubmissions")}
											</ModernButton>
										</div>

										<ModernButton
											size="sm"
											onClick={() => {
												setRunningTemplate(tpl);
												setIsSubmitModalOpen(true);
											}}
											className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 rounded-xl text-xs gap-1.5 h-8 px-3"
											leftIcon={<Send className="h-3 w-3" />}
										>
											{t("feedback.runSurvey")}
										</ModernButton>
									</div>
								</div>
							))}
						</div>
					)}
				</ModernTabsContent>

				{/* ------------------------------------------------------------- */}
				{/* TAB 2: QUESTION BANK (Using Custom DataTable)                */}
				{/* ------------------------------------------------------------- */}
				<ModernTabsContent value="questions">
					<DataTable<FeedbackQuestion>
						title={t("feedback.questionsTab")}
						data={questionsList}
						columns={questionColumns}
						getRowId={(row) => String(row.questionId)}
						searchable={false}
						isLoading={isLoadingQuestions}
						onCreateNew={() => {
							setEditingQuestion(null);
							setIsQuestionModalOpen(true);
						}}
						createButtonLabel={t("feedback.addQuestion")}
						createButtonIcon={<Plus className="h-4 w-4" />}
						extraHeaderContent={
							<div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
								{["ALL", "SINGLE_CHOICE", "MULTI_CHOICE", "FREE_TEXT"].map(
									(type) => (
										<button
											key={type}
											onClick={() => setSelectedTypeFilter(type)}
											className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
												selectedTypeFilter === type
													? "bg-white dark:bg-slate-900 text-primary shadow-2xs"
													: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
											}`}
										>
											{type === "ALL"
												? t("feedback.allTypes")
												: type.replace("_", " ")}
										</button>
									),
								)}
							</div>
						}
					/>
				</ModernTabsContent>

				{/* ------------------------------------------------------------- */}
				{/* TAB 3: CUSTOMER SUBMISSIONS (Dynamic Template Selector & Log) */}
				{/* ------------------------------------------------------------- */}
				<ModernTabsContent value="submissions" className="space-y-6">
					{/* Top Section: All Templates Preview Selector Cards */}
					<div className="space-y-2.5">
						<div className="flex items-center justify-between">
							<div>
								<Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
									<Layers className="h-3.5 w-3.5 text-primary" />
									{t("feedback.selectTemplateToPreview")} (
									{templatesList.length})
								</Label>
								<p className="text-[11px] text-slate-400">
									{t("feedback.clickTemplateDesc")}{" "}
									<code className="text-primary font-mono text-[10px]">
										/api/v1/templates/{`{template_id}`}/submissions
									</code>
								</p>
							</div>

							{selectedTemplateId && (
								<span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
									{t("feedback.activeId")}:{" "}
									<span className="font-mono text-primary font-extrabold">
										#{selectedTemplateId}
									</span>
								</span>
							)}
						</div>

						{/* Template Selector Cards Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
							{templatesList.map((tpl) => {
								const isSelected =
									String(selectedTemplateId) === String(tpl.templateId);
								return (
									<div
										key={tpl.templateId}
										onClick={() => setSelectedTemplateId(tpl.templateId)}
										className={`group relative rounded-2xl border p-3.5 cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${
											isSelected
												? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary shadow-md"
												: "border-slate-200/90 bg-white/90 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:bg-slate-900 hover:border-slate-300"
										}`}
									>
										<div>
											<div className="flex items-center justify-between gap-1.5 mb-1.5">
												<span className="text-[10px] font-mono font-bold text-slate-400">
													TPL-{tpl.templateId}
												</span>
												<div className="flex items-center gap-1">
													<Badge
														className={`rounded-md text-[9px] font-bold px-1.5 py-0 ${
															tpl.status === "PUBLISHED"
																? "bg-primary/10 text-primary border-primary/20"
																: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
														}`}
													>
														{tpl.status || "PUBLISHED"}
													</Badge>
													{isSelected && (
														<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white text-[9px]">
															<Check className="h-2.5 w-2.5" />
														</span>
													)}
												</div>
											</div>

											<h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
												{tpl.name}
											</h4>
											<p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
												{tpl.description || "Customer evaluation survey."}
											</p>
										</div>

										<div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
											<span className="font-semibold text-slate-500">
												<span className="font-bold text-primary">
													{tpl.questions?.length || 0}
												</span>{" "}
												{t("feedback.questionsCount")}
											</span>
											<span className="font-mono text-slate-400">
												v{tpl.version || 1}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Active Template Overview Banner & Action Controls */}
					{activeTemplate && (
						<div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-indigo-50/20 p-5 dark:border-primary/30 dark:bg-slate-900/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
							<div className="space-y-1 min-w-0">
								<div className="flex items-center gap-2">
									<Badge className="bg-primary text-primary-foreground font-bold text-[10px] rounded-lg">
										{t("feedback.selectedTemplate")}
									</Badge>
									<span className="text-xs font-mono text-primary font-bold">
										TPL-{activeTemplate.templateId}
									</span>
								</div>
								<h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
									{activeTemplate.name}
								</h3>
								<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
									{activeTemplate.description ||
										"Standard survey evaluation questionnaire."}
								</p>
							</div>

							<div className="flex items-center gap-2 shrink-0 flex-wrap">
								<ModernButton
									size="sm"
									variant="outline"
									onClick={() => refetchSubmissions()}
									className="h-8.5 rounded-xl text-xs"
									leftIcon={<RotateCw className="h-3.5 w-3.5" />}
									title="Reload submissions"
								>
									{t("common.refresh")}
								</ModernButton>
								<ModernButton
									size="sm"
									variant="outline"
									onClick={() => {
										setEditingTemplate(activeTemplate);
										setIsTemplateModalOpen(true);
									}}
									className="h-8.5 rounded-xl text-xs"
									leftIcon={<Edit3 className="h-3.5 w-3.5" />}
								>
									{t("feedback.editTemplate")}
								</ModernButton>
								<ModernButton
									size="sm"
									onClick={() => {
										setRunningTemplate(activeTemplate);
										setIsSubmitModalOpen(true);
									}}
									className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 h-8.5 rounded-xl text-xs gap-1.5"
									leftIcon={<Send className="h-3.5 w-3.5" />}
								>
									{t("feedback.runSurvey")}
								</ModernButton>
							</div>
						</div>
					)}

					{/* Dynamic Submissions Log Table for Selected Template */}
					<DataTable<FeedbackSubmission>
						title={`${t("feedback.customerSubmissionsFor")} "${activeTemplate?.name || `Template #${selectedTemplateId}`}"`}
						data={submissionsList}
						columns={submissionColumns}
						getRowId={(row) => String(row.submissionId)}
						searchable={false}
						isLoading={isLoadingSubmissions}
						onCreateNew={() => {
							if (activeTemplate) {
								setRunningTemplate(activeTemplate);
								setIsSubmitModalOpen(true);
							}
						}}
						createButtonLabel={t("feedback.runSurvey")}
						createButtonIcon={<Send className="h-4 w-4" />}
						extraHeaderContent={
							<div className="flex items-center gap-2">
								<span className="text-xs font-semibold text-slate-500">
									{t("feedback.submissionsRecorded")}
								</span>
								<Badge
									variant="secondary"
									className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800"
								>
									{submissionsList.length} {t("feedback.responsesCount")}
								</Badge>
							</div>
						}
					/>
				</ModernTabsContent>

				{/* ------------------------------------------------------------- */}
				{/* TAB 4: INDIVIDUAL ANSWERS EXPLORER (Using Custom DataTable)   */}
				{/* ------------------------------------------------------------- */}
				<ModernTabsContent value="answers">
					<DataTable<any>
						title={t("feedback.answersTab")}
						data={answersList}
						columns={answerColumns}
						getRowId={(row) => String(row.id)}
						searchable={false}
					/>
				</ModernTabsContent>
			</ModernTabs>

			{/* ------------------------------------------------------------- */}
			{/* MODALS                                                        */}
			{/* ------------------------------------------------------------- */}
			<QuestionFormModal
				open={isQuestionModalOpen}
				onOpenChange={setIsQuestionModalOpen}
				question={editingQuestion}
			/>

			<TemplateFormModal
				open={isTemplateModalOpen}
				onOpenChange={setIsTemplateModalOpen}
				template={editingTemplate}
			/>

			<SubmitSurveyModal
				open={isSubmitModalOpen}
				onOpenChange={setIsSubmitModalOpen}
				template={runningTemplate}
				onSuccess={() => {
					refetchSubmissions();
					queryClient.invalidateQueries({ queryKey: ["feedback-submissions"] });
				}}
			/>

			<SubmissionDetailsDrawer
				open={isDetailDrawerOpen}
				onOpenChange={setIsDetailDrawerOpen}
				submission={selectedSubmission}
			/>
		</div>
	);
}

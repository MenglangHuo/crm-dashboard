"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loansApi, customersApi, productsApi } from "@/lib/api/endpoints";
import { Loan, Customer, Product } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
	CreditCard,
	CheckCircle2,
	RefreshCw,
	FileText,
	User,
	Clock,
	Percent,
	DollarSign,
	TrendingUp,
	ShieldCheck,
	Building2,
	Calendar,
	Sparkles,
	Info,
	Eye,
	AlertCircle,
	Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DataTable,
	ColumnDef,
	RowAction,
} from "@/components/ui-custom/data-table";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernTextarea,
} from "@/components/ui-custom/form-controls";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from "@/components/ui/sheet";

import { LoanDetailsModal } from "@/components/loan-details-modal";

const formSchema = z.object({
	loanKey: z.string().optional(),
	customerId: z.string().min(1, "Customer is required"),
	currency: z.string().min(1, "Currency is required"),
	principal: z.coerce.number().positive("Principal must be greater than 0"),
	interestRateBps: z.coerce
		.number()
		.min(0, "Interest rate must be 0 or higher"),
	interestMethod: z.string().min(1, "Interest method is required"),
	term: z.string().min(1, "Term is required"),
	numberOfPeriods: z.coerce.number().min(1, "Must be at least 1 period"),
	assetPrice: z.coerce.number().min(0).optional(),
	totalInterest: z.coerce.number().min(0).optional(),
	deposit: z.coerce.number().min(0).optional(),
	description: z.string().optional(),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoansPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
	const [activateLoan, setActivateLoan] = useState<Loan | null>(null);
	const [activateNotes, setActivateNotes] = useState("");

	const [restructureLoan, setRestructureLoan] = useState<Loan | null>(null);
	const [restructureNotes, setRestructureNotes] = useState("");

	const [defaultLoan, setDefaultLoan] = useState<Loan | null>(null);
	const [defaultNotes, setDefaultNotes] = useState("");

	const [closeLoanState, setCloseLoanState] = useState<Loan | null>(null);
	const [closeNotes, setCloseNotes] = useState("");

	const [selectedProductId, setSelectedProductId] = useState("");

	// Query Loans
	const { data: loansData, isLoading: isLoadingLoans } = useQuery({
		queryKey: ["loans", { page, pageSize, search }],
		queryFn: () => loansApi.list({ page, limit: pageSize, search }),
	});

	// Query Customers for selection dropdown & mapping names
	const { data: customersData } = useQuery({
		queryKey: ["customers-list"],
		queryFn: () => customersApi.list({ page: 1, limit: 100 }),
	});

	// Query Products for selection dropdown
	const { data: productsData } = useQuery({
		queryKey: ["products-list-all"],
		queryFn: () => productsApi.list({ page: 1, limit: 100 }),
	});

	const customerMap = useMemo(() => {
		const map = new Map<string, Customer>();
		customersData?.items?.forEach((c) => map.set(String(c.id), c));
		return map;
	}, [customersData]);

	// Calculate Overview Metrics
	const metrics = useMemo(() => {
		const items = loansData?.items || [];
		const totalCount = loansData?.total || items.length;
		const activeCount = items.filter((l) => l.status === "ACTIVE").length;
		const totalPrincipal = items.reduce(
			(acc, l) => acc + (l.principal || 0),
			0,
		);
		const totalInterest = items.reduce(
			(acc, l) => acc + (l.totalInterest || 0),
			0,
		);
		const avgRateBps =
			items.length > 0
				? Math.round(
						items.reduce((acc, l) => acc + (l.interestRateBps || 0), 0) /
							items.length,
					)
				: 1200;

		return {
			totalCount,
			activeCount,
			totalPrincipal,
			totalInterest,
			avgRatePct: (avgRateBps / 100).toFixed(2),
		};
	}, [loansData]);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema as any),
		defaultValues: {
			loanKey: "",
			customerId: "",
			currency: "USD",
			principal: 1000,
			interestRateBps: 1200,
			interestMethod: "EMI",
			term: "12 MONTHLY",
			numberOfPeriods: 12,
			assetPrice: 0,
			totalInterest: 0,
			deposit: 0,
			description: "",
			notes: "",
		},
	});

	// Create Loan Mutation
	const createMutation = useMutation({
		mutationFn: (body: Partial<Loan>) => loansApi.create(body),
		onSuccess: (loan) => {
			toast.success(`Loan ${loan?.loanKey || "record"} created successfully!`, {
				description:
					"Backend DB sequence generated clean audit tracking number.",
			});
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			setIsCreateOpen(false);
			form.reset();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Activate Loan Mutation
	const activateMutation = useMutation({
		mutationFn: ({ id, notes }: { id: string | number; notes?: string }) =>
			loansApi.activate(id, { notes }),
		onSuccess: () => {
			toast.success("Loan activated successfully");
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			setActivateLoan(null);
			setActivateNotes("");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Restructure Loan Mutation
	const restructureMutation = useMutation({
		mutationFn: ({ id, notes }: { id: string | number; notes?: string }) =>
			loansApi.restructure(id, { notes }),
		onSuccess: () => {
			toast.success("Loan restructured successfully");
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			setRestructureLoan(null);
			setRestructureNotes("");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Mark Default Loan Mutation
	const defaultMutation = useMutation({
		mutationFn: ({ id, notes }: { id: string | number; notes?: string }) =>
			loansApi.defaultLoan(id, { notes }),
		onSuccess: () => {
			toast.success("Loan marked as defaulted");
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			setDefaultLoan(null);
			setDefaultNotes("");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// Close Loan Mutation
	const closeMutation = useMutation({
		mutationFn: ({ id, notes }: { id: string | number; notes?: string }) =>
			loansApi.closeLoan(id, { notes }),
		onSuccess: () => {
			toast.success("Loan closed successfully");
			queryClient.invalidateQueries({ queryKey: ["loans"] });
			setCloseLoanState(null);
			setCloseNotes("");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const openCreate = () => {
		setSelectedProductId("");
		form.reset({
			loanKey: "",
			customerId: customersData?.items?.[0]?.id
				? String(customersData.items[0].id)
				: "",
			currency: "USD",
			principal: 1000,
			interestRateBps: 1200,
			interestMethod: "EMI",
			term: "12 MONTHLY",
			numberOfPeriods: 12,
			assetPrice: 0,
			totalInterest: 0,
			deposit: 0,
			description: "",
			notes: "",
		});
		setIsCreateOpen(true);
	};

	const onSubmit = (values: FormValues) => {
		const selectedProduct = productsData?.items?.find(
			(p) => String(p.id) === selectedProductId,
		);
		const items = selectedProduct
			? [
					{
						productId: String(selectedProduct.id),
						productName: selectedProduct.name,
						productModel: selectedProduct.model,
						serialNumber: selectedProduct.serialNumber,
						condition: selectedProduct.condition,
						unitPriceSnapshot:
							selectedProduct.sellPrice || selectedProduct.basePrice || 0,
						currency: selectedProduct.currency || values.currency,
						attributesSnapshot: selectedProduct.attributes,
					},
				]
			: undefined;

		createMutation.mutate({
			...values,
			items,
		});
	};

	const handleActivateSubmit = () => {
		if (!activateLoan) return;
		activateMutation.mutate({ id: activateLoan.id, notes: activateNotes });
	};

	const handleRestructureSubmit = () => {
		if (!restructureLoan) return;
		restructureMutation.mutate({
			id: restructureLoan.id,
			notes: restructureNotes,
		});
	};

	const renderStatusBadge = (status?: string) => {
		const s = (status || "PENDING").toUpperCase();
		switch (s) {
			case "ACTIVE":
				return (
					<Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1">
						<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
						Active
					</Badge>
				);
			case "APPROVED":
				return (
					<Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 font-semibold gap-1">
						<CheckCircle2 className="h-3 w-3 text-sky-500" />
						Approved
					</Badge>
				);
			case "RESTRUCTURED":
				return (
					<Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-semibold gap-1">
						<RefreshCw className="h-3 w-3 text-purple-500" />
						Restructured
					</Badge>
				);
			case "DEFAULTED":
				return (
					<Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold gap-1">
						<AlertCircle className="h-3 w-3 text-rose-500" />
						Defaulted
					</Badge>
				);
			case "COMPLETED":
			case "CLOSED":
				return (
					<Badge variant="secondary" className="font-semibold gap-1">
						Closed
					</Badge>
				);
			case "PENDING":
			default:
				return (
					<Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold gap-1">
						<Clock className="h-3 w-3 text-amber-500" />
						Pending
					</Badge>
				);
		}
	};

	const columns: ColumnDef<Loan>[] = [
		{
			id: "loanKey",
			header: "Loan Reference",
			accessorKey: "loanKey",
			sortable: true,
			cell: ({ row }) => (
				<div>
					<div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
						<CreditCard className="h-3.5 w-3.5" />
						<span>{row.loanKey}</span>
					</div>
					<div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
						<FileText className="h-3 w-3 text-slate-400" />
						<span className="truncate max-w-[200px]">
							{row.description || "Asset Financing Agreement"}
						</span>
					</div>
				</div>
			),
		},
		{
			id: "customer",
			header: "Borrower Profile",
			accessorFn: (loan) => {
				const c = customerMap.get(loan.customerId);
				return c ? c.name : loan.customerId;
			},
			cell: ({ row }) => {
				const customer = customerMap.get(row.customerId);
				const customerName = customer
					? customer.name
					: `ID: ${String(row.customerId).slice(0, 8)}...`;
				const initials =
					customerName
						.split(" ")
						.map((n) => n[0])
						.join("")
						.toUpperCase()
						.slice(0, 2) || "CU";

				return (
					<div className="flex items-center gap-2.5">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs">
							{initials}
						</div>
						<div>
							<div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
								<span>{customerName}</span>
							</div>
							<div className="text-[11px] text-slate-500 dark:text-slate-400">
								{customer?.phone || customer?.email || "Registered Client"}
							</div>
						</div>
					</div>
				);
			},
		},
		{
			id: "principal",
			header: "Financed Principal",
			accessorKey: "principal",
			sortable: true,
			cell: ({ row }) => {
				const principalVal = row.principal || 0;
				const depositVal = row.deposit || 0;
				return (
					<div>
						<div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
							{row.currency || "$"}{" "}
							{principalVal.toLocaleString(undefined, {
								minimumFractionDigits: 2,
							})}
						</div>
						{depositVal > 0 && (
							<div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
								Down Payment: {row.currency || "$"}{" "}
								{depositVal.toLocaleString()}
							</div>
						)}
					</div>
				);
			},
		},
		{
			id: "interest",
			header: "Interest & Total Payable",
			accessorKey: "totalInterest",
			sortable: true,
			cell: ({ row }) => {
				const pct = ((row.interestRateBps || 0) / 100).toFixed(2);
				const totalInt = row.totalInterest || 0;
				const totalPayable = (row.principal || 0) + totalInt;

				return (
					<div>
						<div className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400">
							<Percent className="h-3 w-3" />
							<span>
								{pct}% ({row.interestMethod || "EMI"})
							</span>
						</div>
						<div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
							Total Interest: {row.currency || "$"}{" "}
							{totalInt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
						</div>
					</div>
				);
			},
		},
		{
			id: "term",
			header: "Term & Repayment",
			accessorKey: "term",
			cell: ({ row }) => (
				<div>
					<div className="flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-200">
						<Clock className="h-3 w-3 text-slate-400" />
						<span>{row.term}</span>
					</div>
					<div className="text-[11px] text-slate-500 dark:text-slate-400">
						{row.numberOfPeriods || 1} Installment Period(s)
					</div>
				</div>
			),
		},
		{
			id: "status",
			header: "Status",
			accessorKey: "status",
			filterType: "select",
			filterOptions: [
				{ label: "Active", value: "ACTIVE" },
				{ label: "Pending", value: "PENDING" },
				{ label: "Approved", value: "APPROVED" },
				{ label: "Restructured", value: "RESTRUCTURED" },
				{ label: "Defaulted", value: "DEFAULTED" },
				{ label: "Completed", value: "COMPLETED" },
				{ label: "Closed", value: "CLOSED" },
			],
			cell: ({ value }) => renderStatusBadge(String(value)),
		},
	];

	const customActions: RowAction<Loan>[] = [
		{
			label: "View Details & Schedule",
			icon: <Eye className="h-3.5 w-3.5 text-sky-500" />,
			onClick: (loan) => setSelectedLoanId(loan.id),
		},
		{
			label: "Activate Loan",
			icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
			hidden: (loan) =>
				loan.status === "ACTIVE" ||
				loan.status === "COMPLETED" ||
				loan.status === "CLOSED" ||
				loan.status === "DEFAULTED",
			onClick: (loan) => {
				setActivateLoan(loan);
				setActivateNotes("");
			},
		},
		{
			label: "Restructure",
			icon: <RefreshCw className="h-3.5 w-3.5 text-purple-500" />,
			hidden: (loan) =>
				loan.status === "CLOSED" ||
				loan.status === "COMPLETED" ||
				loan.status === "DEFAULTED",
			onClick: (loan) => {
				setRestructureLoan(loan);
				setRestructureNotes("");
			},
		},
		{
			label: "Mark Default",
			icon: <AlertCircle className="h-3.5 w-3.5 text-rose-500" />,
			hidden: (loan) =>
				loan.status === "CLOSED" ||
				loan.status === "COMPLETED" ||
				loan.status === "DEFAULTED",
			onClick: (loan) => {
				setDefaultLoan(loan);
				setDefaultNotes("");
			},
		},
		{
			label: "Close Loan",
			icon: <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />,
			hidden: (loan) => loan.status === "CLOSED" || loan.status === "COMPLETED",
			onClick: (loan) => {
				setCloseLoanState(loan);
				setCloseNotes("");
			},
		},
	];

	return (
		<div className="space-y-6">
			{/* Top Overview KPI Header */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm flex items-center justify-between">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
							Total Portfolio Loans
						</span>
						<span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
							{metrics.totalCount}
						</span>
						<span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
							<ShieldCheck className="h-3 w-3" /> {metrics.activeCount}{" "}
							Currently Active
						</span>
					</div>
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
						<CreditCard className="h-6 w-6" />
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm flex items-center justify-between">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
							Total Capital Financed
						</span>
						<span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
							$
							{metrics.totalPrincipal.toLocaleString(undefined, {
								maximumFractionDigits: 0,
							})}
						</span>
						<span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1 mt-1">
							<TrendingUp className="h-3 w-3" /> Active Principal Outstanding
						</span>
					</div>
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
						<DollarSign className="h-6 w-6" />
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm flex items-center justify-between">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
							Accrued Interest Income
						</span>
						<span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 mt-1 block">
							$
							{metrics.totalInterest.toLocaleString(undefined, {
								maximumFractionDigits: 0,
							})}
						</span>
						<span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 mt-1">
							<Sparkles className="h-3 w-3" /> Projected Return Total
						</span>
					</div>
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
						<Percent className="h-6 w-6" />
					</div>
				</div>

				<div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm flex items-center justify-between">
					<div>
						<span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
							Average Portfolio Yield
						</span>
						<span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
							{metrics.avgRatePct}% / year
						</span>
						<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
							<Clock className="h-3 w-3" /> Declining & EMI Balance
						</span>
					</div>
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
						<TrendingUp className="h-6 w-6" />
					</div>
				</div>
			</div>

			{/* Reusable Data Table Component */}
			<DataTable<Loan>
				data={loansData?.items || []}
				columns={columns}
				getRowId={(l) => l.id}
				title="Loan Origination Portfolio"
				searchPlaceholder="Search by loan reference key, borrower name, purpose notes..."
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel="Originate Loan"
				onCreateNew={openCreate}
				manualPagination={true}
				totalCount={loansData?.total || loansData?.items?.length || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoadingLoans}
				customRowActions={customActions}
				exportFilename="loans-portfolio"
			/>

			{/* Create Loan Modal */}
			<ModernModal
				isOpen={isCreateOpen}
				onClose={() => setIsCreateOpen(false)}
				title="Create Loan Agreement"
				subtitle="Issue a new loan record with automatic sequence numbering."
				icon={<CreditCard className="h-5 w-5 text-emerald-500" />}
				size="lg"
				isLoading={createMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setIsCreateOpen(false)} />
						<ModernModalSubmitButton
							form="create-loan-form"
							isLoading={createMutation.isPending}
						>
							Create & Originate Loan
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<form
					id="create-loan-form"
					onSubmit={form.handleSubmit(onSubmit as any)}
					className="space-y-6"
				>
					{/* Audit & Sequence Notice */}
					<div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 flex items-start gap-3 text-xs text-sky-700 dark:text-sky-300">
						<Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
						<div>
							<span className="font-bold block">
								Best Practice Audit Sequence
							</span>
							Leave <strong>Loan Reference Key</strong> blank to let the backend
							DB sequence auto-generate a unique audit number (e.g.{" "}
							<code>LN-1001</code>).
						</div>
					</div>

					{/* Section 1: Customer & Key & Product */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
							Borrower & Financed Product Asset
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<ModernSelect
								label="Customer Borrower"
								placeholder="-- Select Customer --"
								value={form.watch("customerId")}
								onChange={(val) => form.setValue("customerId", val)}
								options={
									customersData?.items?.map((c) => ({
										value: String(c.id),
										label: c.name,
										description:
											c.phone || c.email || `ID: ${String(c.id).slice(0, 6)}`,
									})) || []
								}
								searchable
								error={form.formState.errors.customerId?.message}
								required
							/>

							<ModernSelect
								label="Financed Product Asset (Optional)"
								placeholder="-- Select Catalog Product --"
								value={selectedProductId}
								onChange={(val) => {
									setSelectedProductId(val);
									const prod = productsData?.items?.find(
										(p) => String(p.id) === val,
									);
									if (prod) {
										const price = prod.sellPrice || prod.basePrice || 0;
										if (price > 0) {
											form.setValue("assetPrice", price);
											const deposit = form.getValues("deposit") || 0;
											form.setValue("principal", Math.max(0, price - deposit));
										}
									}
								}}
								options={
									productsData?.items?.map((p) => ({
										value: String(p.id),
										label: p.name,
										description: `${p.currency || "$"} ${(p.sellPrice || p.basePrice || 0).toLocaleString()} • S/N: ${p.serialNumber || "N/A"}`,
									})) || []
								}
								searchable
							/>

							<ModernInput
								label="Loan Reference Key (Optional)"
								placeholder="Auto-generated (e.g. LN-1001) if blank"
								{...form.register("loanKey")}
								error={form.formState.errors.loanKey?.message}
							/>
						</div>
					</div>

					{/* Section 2: Financial Terms */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
							Financial Structure & Terms
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<ModernInput
								label="Principal Amount"
								type="number"
								step="any"
								{...form.register("principal")}
								error={form.formState.errors.principal?.message}
								required
							/>

							<ModernSelect
								label="Currency"
								value={form.watch("currency")}
								onChange={(val) => form.setValue("currency", val as any)}
								options={[
									{ value: "USD", label: "USD ($)" },
									{ value: "KHR", label: "KHR (៛)" },
									{ value: "THB", label: "THB (฿)" },
								]}
							/>

							<ModernInput
								label="Interest Rate (BPS)"
								type="number"
								placeholder="e.g. 1200 for 12%"
								{...form.register("interestRateBps")}
								error={form.formState.errors.interestRateBps?.message}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<ModernSelect
								label="Interest Method"
								value={form.watch("interestMethod")}
								onChange={(val) => form.setValue("interestMethod", val as any)}
								options={[
									{ value: "EMI", label: "EMI (Declining Balance)" },
									{ value: "FLAT", label: "Flat Rate" },
									{ value: "EQUAL_PRINCIPAL", label: "Equal Principal" },
								]}
							/>

							<ModernInput
								label="Loan Term"
								placeholder="e.g. 12 MONTHLY"
								{...form.register("term")}
								error={form.formState.errors.term?.message}
							/>

							<ModernInput
								label="Number of Periods"
								type="number"
								{...form.register("numberOfPeriods")}
								error={form.formState.errors.numberOfPeriods?.message}
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<ModernInput
								label="Down Payment / Deposit"
								type="number"
								step="any"
								{...form.register("deposit")}
							/>

							<ModernInput
								label="Asset Price (Optional)"
								type="number"
								step="any"
								{...form.register("assetPrice")}
							/>

							<ModernInput
								label="Total Interest (Auto-calculated if blank)"
								type="number"
								step="any"
								{...form.register("totalInterest")}
							/>
						</div>
					</div>

					{/* Section 3: Notes & Description */}
					<div className="space-y-3">
						<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
							Purpose & Audit Notes
						</h4>
						<ModernInput
							label="Description"
							placeholder="Short summary of loan purpose..."
							{...form.register("description")}
						/>

						<ModernTextarea
							label="Internal Notes"
							placeholder="Any special terms, collateral notes, or borrower conditions..."
							rows={3}
							{...form.register("notes")}
						/>
					</div>
				</form>
			</ModernModal>

			{/* Loan Details Modal & Visual Repayment Schedule */}
			<LoanDetailsModal
				loanId={selectedLoanId}
				onClose={() => setSelectedLoanId(null)}
				onSelectLoanId={setSelectedLoanId}
			/>

			{/* Activate Loan Modal */}
			<ModernModal
				isOpen={!!activateLoan}
				onClose={() => setActivateLoan(null)}
				title={`Activate Loan ${activateLoan?.loanKey || ""}`}
				subtitle="This action will mark the loan as active and trigger repayment schedule generation."
				icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
				size="md"
				isLoading={activateMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setActivateLoan(null)} />
						<ModernModalSubmitButton
							onClick={handleActivateSubmit}
							isLoading={activateMutation.isPending}
							className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
						>
							Confirm Activation
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-2">
					<ModernTextarea
						label="Activation Notes / Memo (Optional)"
						placeholder="Enter disbursement notes or approval memo..."
						value={activateNotes}
						onChange={(e) => setActivateNotes(e.target.value)}
						rows={3}
					/>
				</div>
			</ModernModal>

			{/* Restructure Loan Modal */}
			<ModernModal
				isOpen={!!restructureLoan}
				onClose={() => setRestructureLoan(null)}
				title={`Restructure Loan ${restructureLoan?.loanKey || ""}`}
				subtitle="Restructure payment schedule and terms for this loan."
				icon={<RefreshCw className="h-5 w-5 text-purple-500" />}
				size="md"
				isLoading={restructureMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setRestructureLoan(null)} />
						<ModernModalSubmitButton
							onClick={handleRestructureSubmit}
							isLoading={restructureMutation.isPending}
							className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500"
						>
							Confirm Restructure
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-2">
					<ModernTextarea
						label="Restructuring Reason / Terms Memo"
						placeholder="Detail reason for restructuring and updated term agreement..."
						value={restructureNotes}
						onChange={(e) => setRestructureNotes(e.target.value)}
						rows={3}
					/>
				</div>
			</ModernModal>
			{/* Mark Default Loan Modal */}
			<ModernModal
				isOpen={!!defaultLoan}
				onClose={() => setDefaultLoan(null)}
				title={`Mark Loan ${defaultLoan?.loanKey || ""} as Defaulted`}
				subtitle="This action flags the loan as delinquent / defaulted in portfolio metrics."
				icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
				size="md"
				isLoading={defaultMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setDefaultLoan(null)} />
						<ModernModalSubmitButton
							onClick={() =>
								defaultLoan &&
								defaultMutation.mutate({
									id: defaultLoan.id,
									notes: defaultNotes,
								})
							}
							isLoading={defaultMutation.isPending}
							className="bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white font-bold"
						>
							Confirm Default Flag
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-2">
					<ModernTextarea
						label="Default Reason / Arrears Memo"
						placeholder="Specify reason for marking loan as default (e.g., 90+ days in arrears, uncontactable borrower)..."
						value={defaultNotes}
						onChange={(e) => setDefaultNotes(e.target.value)}
						rows={3}
					/>
				</div>
			</ModernModal>

			{/* Close Loan Modal */}
			<ModernModal
				isOpen={!!closeLoanState}
				onClose={() => setCloseLoanState(null)}
				title={`Close Loan ${closeLoanState?.loanKey || ""}`}
				subtitle="Mark contract as fully paid off or settled."
				icon={<ShieldCheck className="h-5 w-5 text-slate-500" />}
				size="md"
				isLoading={closeMutation.isPending}
				footer={
					<ModernModalFooter>
						<ModernModalCancelButton onClick={() => setCloseLoanState(null)} />
						<ModernModalSubmitButton
							onClick={() =>
								closeLoanState &&
								closeMutation.mutate({
									id: closeLoanState.id,
									notes: closeNotes,
								})
							}
							isLoading={closeMutation.isPending}
							className="bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold"
						>
							Confirm Loan Closure
						</ModernModalSubmitButton>
					</ModernModalFooter>
				}
			>
				<div className="space-y-4 py-2">
					<ModernTextarea
						label="Closure & Settlement Memo"
						placeholder="Enter payoff completion notes or collateral release memo..."
						value={closeNotes}
						onChange={(e) => setCloseNotes(e.target.value)}
						rows={3}
					/>
				</div>
			</ModernModal>
		</div>
	);
}

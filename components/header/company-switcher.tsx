"use client";

import React, { useState } from "react";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCompanyContext } from "@/components/providers/company-context";
import { companiesApi } from "@/lib/api/endpoints";
import { Company } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchablePaginatedDropdown } from "@/components/ui-custom/searchable-paginated-dropdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COMPANY_PAGE_SIZE = 5;

export function CompanySwitcher() {
	const [mounted, setMounted] = useState(false);
	const {
		selectedCompanyId,
		setSelectedCompanyId,
		selectedCompany: contextSelectedCompany,
		isLoadingCompanies,
		isSystemAdmin,
	} = useCompanyContext();

	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(1);
	const debouncedSearch = useDebounce(searchTerm.trim(), 300);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	const {
		data: companiesPage,
		isLoading: isLoadingPage,
		isFetching: isFetchingPage,
	} = useQuery({
		queryKey: ["company-switcher-list", page, debouncedSearch],
		queryFn: () =>
			companiesApi.list({
				page,
				limit: COMPANY_PAGE_SIZE,
				search: debouncedSearch || undefined,
			}),
		enabled: mounted && isSystemAdmin,
		placeholderData: keepPreviousData,
		staleTime: 2 * 60 * 1000,
	});

	if (!mounted || !isSystemAdmin) {
		return null;
	}

	const pagedCompanies = companiesPage?.items || [];
	const totalPages = companiesPage?.totalPages ?? 1;
	const totalItems = companiesPage?.total;

	const selectedCompany =
		pagedCompanies.find(
			(c) => String(c.id) === String(selectedCompanyId),
		) ?? contextSelectedCompany;

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setPage(1);
	};

	const handleCompanySelect = (company: Company) => {
		const newId = String(company.id);
		if (newId !== String(selectedCompanyId)) {
			setSelectedCompanyId(newId);
			toast.success(
				`Switched target company context to ${company.name || `#${company.id}`}`,
			);
		}
	};

	return (
		<div className="flex items-center">
			<SearchablePaginatedDropdown<Company>
				title="Target Company Context"
				items={pagedCompanies}
				getItemKey={(company) => company.id}
				isItemSelected={(company) =>
					String(company.id) === String(selectedCompanyId)
				}
				onSelect={handleCompanySelect}
				searchValue={searchTerm}
				onSearchChange={handleSearchChange}
				searchPlaceholder="Search company..."
				page={page}
				totalPages={totalPages}
				totalItems={totalItems}
				onPageChange={setPage}
				isLoading={isLoadingPage}
				isFetching={isFetchingPage}
				loadingText="Loading companies list..."
				emptyText="No matching companies"
				align="end"
				renderTrigger={({ isOpen, toggle }) => (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={toggle}
						aria-expanded={isOpen}
						className="group flex h-9.5 max-w-[240px] md:max-w-[280px] items-center gap-2 rounded-2xl border-primary/25 bg-primary/10 px-3.5 text-xs font-bold text-primary shadow-xs transition-all duration-150 hover:border-primary/40 hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15 dark:text-primary-foreground dark:hover:bg-primary/25 cursor-pointer"
					>
						{isLoadingCompanies && !selectedCompany ? (
							<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
						) : (
							<Building2 className="h-4 w-4 text-primary shrink-0" />
						)}
						<div className="flex flex-col text-left truncate leading-tight">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								Company Context
							</span>
							<span className="truncate font-black text-slate-900 dark:text-white">
								{isLoadingCompanies && !selectedCompany
									? "Loading Companies..."
									: selectedCompany
										? selectedCompany.name
										: "Select Company"}
							</span>
						</div>
						<ChevronDown
							className={cn(
								"h-3.5 w-3.5 text-primary opacity-80 shrink-0 ml-1 transition-transform duration-150",
								isOpen && "rotate-180",
							)}
						/>
					</Button>
				)}
				renderItem={(company, isSelected) => (
					<>
						<div className="flex items-center gap-2.5 min-w-0">
							<div
								className={cn(
									"flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0",
									isSelected
										? "bg-primary text-primary-foreground"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
								)}
							>
								<Building2 className="h-3.5 w-3.5" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="truncate">{company.name}</span>
								{(company as any).code && (
									<span className="text-[10px] text-slate-400 font-mono">
										{(company as any).code}
									</span>
								)}
							</div>
						</div>
						{isSelected && (
							<Check className="h-4 w-4 text-primary shrink-0 ml-1" />
						)}
					</>
				)}
			/>
		</div>
	);
}

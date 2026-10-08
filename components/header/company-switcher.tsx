"use client";

import React, { useState } from "react";
import { Building2, ChevronDown, Check, Search, Loader2 } from "lucide-react";
import { useCompanyContext } from "@/components/providers/company-context";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

export function CompanySwitcher() {
	const [mounted, setMounted] = useState(false);
	const {
		selectedCompanyId,
		setSelectedCompanyId,
		companies,
		isLoadingCompanies,
		isSystemAdmin,
	} = useCompanyContext();
	const [searchTerm, setSearchTerm] = useState("");

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !isSystemAdmin) {
		return null;
	}

	const selectedCompany = companies.find(
		(c) => String(c.id) === String(selectedCompanyId),
	);

	const filteredCompanies = companies.filter((company) => {
		if (!searchTerm.trim()) return true;
		const term = searchTerm.toLowerCase();
		return (
			company.name?.toLowerCase().includes(term) ||
			(company as any).code?.toLowerCase().includes(term) ||
			String(company.id).includes(term)
		);
	});

	const handleCompanySelect = (company: (typeof companies)[0]) => {
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
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="sm"
							className="group flex h-9.5 max-w-[240px] md:max-w-[280px] items-center gap-2 rounded-2xl border-primary/25 bg-primary/10 px-3.5 text-xs font-bold text-primary shadow-xs transition-all duration-150 hover:border-primary/40 hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15 dark:text-primary-foreground dark:hover:bg-primary/25 cursor-pointer"
						/>
					}
				>
					{isLoadingCompanies ? (
						<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
					) : (
						<Building2 className="h-4 w-4 text-primary shrink-0" />
					)}
					<div className="flex flex-col text-left truncate leading-tight">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Company Context
						</span>
						<span className="truncate font-black text-slate-900 dark:text-white">
							{isLoadingCompanies
								? "Loading Companies..."
								: selectedCompany
									? selectedCompany.name
									: "Select Company"}
						</span>
					</div>
					<ChevronDown className="h-3.5 w-3.5 text-primary opacity-80 shrink-0 ml-1 transition-transform group-data-open:rotate-180" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					sideOffset={8}
					className="w-64 rounded-2xl border border-slate-200/90 bg-white/98 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/98 space-y-1.5"
				>
					<div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
						Target Company Context
					</div>

					{companies.length > 5 && (
						<div className="relative px-1 pb-1">
							<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
							<input
								type="text"
								placeholder="Search company..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full h-8 pl-8 pr-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							/>
						</div>
					)}

					<div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
						{filteredCompanies.length === 0 ? (
							<div className="px-3 py-3 text-center text-xs text-slate-500 font-medium">
								{isLoadingCompanies
									? "Loading companies list..."
									: "No matching companies"}
							</div>
						) : (
							filteredCompanies.map((company) => {
								const isSelected =
									String(company.id) === String(selectedCompanyId);
								return (
									<DropdownMenuItem
										key={company.id}
										onClick={() => handleCompanySelect(company)}
										className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
											isSelected
												? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary-foreground"
												: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
										}`}
									>
										<div className="flex items-center gap-2.5 min-w-0">
											<div
												className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
													isSelected
														? "bg-primary text-primary-foreground"
														: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
												}`}
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
									</DropdownMenuItem>
								);
							})
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

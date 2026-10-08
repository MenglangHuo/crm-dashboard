"use client";

import React, { useState, useEffect } from "react";
import {
	Search,
	FilePlus,
	CreditCard,
	UserPlus,
	PackagePlus,
	ArrowRight,
	Sparkles,
	Command,
	X,
} from "lucide-react";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { useRouter } from "next/navigation";

export function CommandPalette() {
	const {
		isCommandPaletteOpen,
		setCommandPaletteOpen,
		openLoanWizard,
		openQuickPay,
		openAddCustomer,
		openAddProduct,
	} = useQuickActions();

	const router = useRouter();
	const [search, setSearch] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);

	const actions = [
		{
			id: "originate-loan",
			title: "Originate New Loan",
			description:
				"1-Click loan wizard for assets, financing, and automatic schedule creation",
			category: "Loan Management",
			icon: FilePlus,
			color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
			badge: "Option A",
			shortcut: "1",
			onSelect: () => {
				setCommandPaletteOpen(false);
				openLoanWizard();
			},
		},
		{
			id: "collect-payment",
			title: "Collect Payment",
			description:
				"Record installment settlement, issue receipt, or generate KHQR code",
			category: "Finance & Invoices",
			icon: CreditCard,
			color: "text-sky-500 bg-sky-500/10 border-sky-500/20",
			badge: "Option B",
			shortcut: "2",
			onSelect: () => {
				setCommandPaletteOpen(false);
				openQuickPay();
			},
		},
		{
			id: "add-customer",
			title: "Add Customer",
			description:
				"Register a new borrower profile with contact & identity info",
			category: "Customers",
			icon: UserPlus,
			color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
			badge: "Option C",
			shortcut: "3",
			onSelect: () => {
				setCommandPaletteOpen(false);
				openAddCustomer();
			},
		},
		{
			id: "add-product",
			title: "Add Product",
			description:
				"Add new asset/product item into inventory catalog for installment sales",
			category: "Inventory & Catalog",
			icon: PackagePlus,
			color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
			badge: "Option D",
			shortcut: "4",
			onSelect: () => {
				setCommandPaletteOpen(false);
				openAddProduct();
			},
		},
		{
			id: "nav-finance",
			title: "Go to Invoices & Finance",
			description:
				"View all billing statements, payment logs, and KHQR collection status",
			category: "Navigation",
			icon: ArrowRight,
			color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
			badge: "Nav",
			shortcut: "F",
			onSelect: () => {
				setCommandPaletteOpen(false);
				router.push("/finance");
			},
		},
		{
			id: "nav-products",
			title: "Go to Product Catalog",
			description: "Browse products and initiate 'Loan This Asset' directly",
			category: "Navigation",
			icon: ArrowRight,
			color: "text-slate-400 bg-slate-500/10 border-slate-500/20",
			badge: "Nav",
			shortcut: "P",
			onSelect: () => {
				setCommandPaletteOpen(false);
				router.push("/products");
			},
		},
	];

	const filteredActions = actions.filter(
		(item) =>
			item.title.toLowerCase().includes(search.toLowerCase()) ||
			item.description.toLowerCase().includes(search.toLowerCase()) ||
			item.category.toLowerCase().includes(search.toLowerCase()),
	);

	useEffect(() => {
		setSelectedIndex(0);
	}, [search]);

	useEffect(() => {
		if (!isCommandPaletteOpen) {
			setSearch("");
		}
	}, [isCommandPaletteOpen]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!isCommandPaletteOpen) return;

			if (e.key === "Escape") {
				setCommandPaletteOpen(false);
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex(
					(prev) =>
						(prev - 1 + filteredActions.length) % (filteredActions.length || 1),
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (filteredActions[selectedIndex]) {
					filteredActions[selectedIndex].onSelect();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isCommandPaletteOpen,
		filteredActions,
		selectedIndex,
		setCommandPaletteOpen,
	]);

	if (!isCommandPaletteOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md transition-all animate-in fade-in duration-200">
			<div
				className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-150"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Search Header Input */}
				<div className="flex items-center border-b border-slate-100 px-4 py-3.5 dark:border-slate-800/80">
					<Search className="mr-3 h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />
					<input
						type="text"
						className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
						placeholder="Type a command or quick action... (e.g. Loan, Payment, Customer)"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						autoFocus
					/>
					<button
						onClick={() => setCommandPaletteOpen(false)}
						className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Action List */}
				<div className="max-h-[380px] overflow-y-auto p-2">
					{filteredActions.length === 0 ? (
						<div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
							No matching actions found for "{search}"
						</div>
					) : (
						<div className="space-y-1">
							<div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500 flex items-center justify-between">
								<span>Quick Actions</span>
								<span className="flex items-center gap-1">
									<Command className="h-3 w-3" /> Navigation
								</span>
							</div>
							{filteredActions.map((action, idx) => {
								const Icon = action.icon;
								const isSelected = idx === selectedIndex;

								return (
									<div
										key={action.id}
										onClick={action.onSelect}
										onMouseEnter={() => setSelectedIndex(idx)}
										className={`group flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-3 transition-all ${
											isSelected
												? "bg-emerald-500/10 text-slate-900 dark:bg-emerald-500/15 dark:text-white ring-1 ring-emerald-500/30"
												: "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/60"
										}`}
									>
										<div className="flex items-center gap-3.5">
											<div
												className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${action.color}`}
											>
												<Icon className="h-4 w-4" />
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
														{action.title}
													</span>
													<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
														{action.badge}
													</span>
												</div>
												<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
													{action.description}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
												{action.shortcut}
											</kbd>
											<ArrowRight
												className={`h-4 w-4 transition-transform ${isSelected ? "translate-x-1 text-emerald-500" : "text-slate-300 dark:text-slate-600"}`}
											/>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer info bar */}
				<div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-medium text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/60 dark:text-slate-400">
					<div className="flex items-center gap-2">
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-white px-1 dark:border-slate-700 dark:bg-slate-800">
								↑↓
							</kbd>{" "}
							navigate
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-white px-1 dark:border-slate-700 dark:bg-slate-800">
								↵
							</kbd>{" "}
							select
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border bg-white px-1 dark:border-slate-700 dark:bg-slate-800">
								esc
							</kbd>{" "}
							close
						</span>
					</div>
					<div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
						<Sparkles className="h-3 w-3" />
						<span>Crm 1-Click Studio</span>
					</div>
				</div>
			</div>
		</div>
	);
}

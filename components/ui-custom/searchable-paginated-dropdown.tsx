"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface SearchablePaginatedDropdownProps<TItem> {
	renderTrigger: (props: {
		isOpen: boolean;
		toggle: () => void;
	}) => React.ReactNode;
	title?: string;
	items: TItem[];
	getItemKey: (item: TItem) => string | number;
	isItemSelected?: (item: TItem) => boolean;
	renderItem: (item: TItem, isSelected: boolean) => React.ReactNode;
	onSelect: (item: TItem) => void;
	searchValue: string;
	onSearchChange: (value: string) => void;
	searchPlaceholder?: string;
	page: number;
	totalPages: number;
	totalItems?: number;
	onPageChange: (nextPage: number) => void;
	isLoading?: boolean;
	isFetching?: boolean;
	emptyText?: string;
	loadingText?: string;
	align?: "start" | "end";
	className?: string;
	contentClassName?: string;
	onOpenChange?: (open: boolean) => void;
}

export function SearchablePaginatedDropdown<TItem>({
	renderTrigger,
	title,
	items,
	getItemKey,
	isItemSelected,
	renderItem,
	onSelect,
	searchValue,
	onSearchChange,
	searchPlaceholder = "Search...",
	page,
	totalPages,
	totalItems,
	onPageChange,
	isLoading = false,
	isFetching = false,
	emptyText = "No matching results",
	loadingText = "Loading...",
	align = "end",
	className,
	contentClassName,
	onOpenChange,
}: SearchablePaginatedDropdownProps<TItem>) {
	const [isOpen, setIsOpen] = useState(false);
	const [coords, setCoords] = useState<{
		top: number;
		left?: number;
		right?: number;
	} | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const setOpenState = useCallback(
		(next: boolean) => {
			setIsOpen(next);
			onOpenChange?.(next);
		},
		[onOpenChange],
	);

	const updateCoords = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const top = rect.bottom + 8;
		if (align === "end") {
			setCoords({
				top,
				right: Math.max(8, window.innerWidth - rect.right),
			});
		} else {
			setCoords({
				top,
				left: Math.max(8, rect.left),
			});
		}
	}, [align]);

	const toggle = () => {
		if (!isOpen) {
			updateCoords();
		}
		setOpenState(!isOpen);
	};

	useEffect(() => {
		if (!isOpen) return;

		updateCoords();

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const inTrigger = containerRef.current?.contains(target);
			const inPopover = popoverRef.current?.contains(target);
			if (!inTrigger && !inPopover) {
				setOpenState(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpenState(false);
			}
		};

		const handleReposition = () => {
			updateCoords();
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		window.addEventListener("resize", handleReposition);
		window.addEventListener("scroll", handleReposition, true);

		const timer = setTimeout(() => {
			searchInputRef.current?.focus();
		}, 0);

		return () => {
			clearTimeout(timer);
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("resize", handleReposition);
			window.removeEventListener("scroll", handleReposition, true);
		};
	}, [isOpen, setOpenState, updateCoords]);

	const safeTotalPages = Math.max(1, totalPages || 1);
	const canGoPrev = page > 1 && !isFetching;
	const canGoNext = page < safeTotalPages && !isFetching;

	const dropdownContent =
		isOpen && coords && typeof document !== "undefined"
			? createPortal(
					<div
						ref={popoverRef}
						role="dialog"
						aria-label={title || "Select option"}
						style={{
							position: "fixed",
							top: coords.top,
							left: coords.left,
							right: coords.right,
						}}
						className={cn(
							"z-[100] w-72 rounded-2xl border border-slate-200/90 bg-white/98 p-2 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/98 space-y-2 animate-in fade-in-0 zoom-in-95 duration-100",
							contentClassName,
						)}
					>
						{title && (
							<div className="flex items-center justify-between px-2 pt-1">
								<span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
									{title}
								</span>
								{typeof totalItems === "number" && (
									<span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
										{totalItems} total
									</span>
								)}
							</div>
						)}

						<div className="relative px-0.5">
							<Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
							<input
								ref={searchInputRef}
								type="text"
								placeholder={searchPlaceholder}
								value={searchValue}
								onChange={(e) => onSearchChange(e.target.value)}
								className="h-8.5 w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
							/>
							{searchValue && (
								<button
									type="button"
									aria-label="Clear search"
									onClick={() => {
										onSearchChange("");
										searchInputRef.current?.focus();
									}}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</div>

						<div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
							{isLoading && items.length === 0 ? (
								<div className="flex items-center justify-center gap-2 px-3 py-4 text-xs font-medium text-slate-500">
									<Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
									<span>{loadingText}</span>
								</div>
							) : items.length === 0 ? (
								<div className="px-3 py-4 text-center text-xs font-medium text-slate-500">
									{emptyText}
								</div>
							) : (
								items.map((item) => {
									const isSelected = Boolean(isItemSelected?.(item));
									return (
										<button
											key={getItemKey(item)}
											type="button"
											onClick={() => {
												onSelect(item);
												setOpenState(false);
											}}
											className={cn(
												"flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors cursor-pointer",
												isSelected
													? "bg-primary/10 text-primary font-bold dark:bg-primary/20 dark:text-primary-foreground"
													: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80",
											)}
										>
											{renderItem(item, isSelected)}
										</button>
									);
								})
							)}
						</div>

						<div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 px-0.5 dark:border-slate-800/80">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canGoPrev}
								onClick={() => onPageChange(Math.max(1, page - 1))}
								className="h-7 rounded-lg px-2 text-[11px] font-semibold gap-1 cursor-pointer"
							>
								<ChevronLeft className="h-3.5 w-3.5" />
								<span>Prev</span>
							</Button>

							<div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
								{isFetching && items.length > 0 && (
									<Loader2 className="h-3 w-3 animate-spin text-primary" />
								)}
								<span>
									{page} / {safeTotalPages}
								</span>
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!canGoNext}
								onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
								className="h-7 rounded-lg px-2 text-[11px] font-semibold gap-1 cursor-pointer"
							>
								<span>Next</span>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>,
					document.body,
				)
			: null;

	return (
		<div ref={containerRef} className={cn("relative inline-flex", className)}>
			{renderTrigger({ isOpen, toggle })}
			{dropdownContent}
		</div>
	);
}

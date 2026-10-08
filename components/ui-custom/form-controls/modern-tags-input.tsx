"use client";

import * as React from "react";
import { Tag, X, Plus, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { tagsApi, TagItem } from "@/lib/api/endpoints";

export interface ModernTagsInputProps {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: React.ReactNode;
	placeholder?: string;
	value?: string[] | string;
	onChange?: (tags: string[]) => void;
	disabled?: boolean;
	required?: boolean;
	className?: string;
	maxTags?: number;
	allowCreate?: boolean;
	id?: string;
}

export function ModernTagsInput({
	label,
	helperText,
	error,
	placeholder = "Search or type new tags...",
	value,
	onChange,
	disabled = false,
	required = false,
	className,
	maxTags,
	allowCreate = true,
	id,
}: ModernTagsInputProps) {
	const generatedId = React.useId();
	const inputId = id || generatedId;

	const containerRef = React.useRef<HTMLDivElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const dropdownRef = React.useRef<HTMLDivElement>(null);

	// Parse value into string array
	const currentTags: string[] = React.useMemo(() => {
		if (Array.isArray(value)) {
			return value
				.map((t) => (typeof t === "string" ? t.trim() : String(t).trim()))
				.filter(Boolean);
		}
		if (typeof value === "string" && value.trim()) {
			return value
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
		}
		return [];
	}, [value]);

	const [inputValue, setInputValue] = React.useState("");
	const [isOpen, setIsOpen] = React.useState(false);
	const [isFocused, setIsFocused] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const [searchResults, setSearchResults] = React.useState<TagItem[]>([]);
	const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);

	const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

	const fetchTags = React.useCallback(async (query: string) => {
		setIsLoading(true);
		try {
			const res = await tagsApi.search({ name: query, page: 0, size: 20 });
			setSearchResults(res);
		} catch (err) {
			console.error("Failed to search tags:", err);
			setSearchResults([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Search on typing with debounce
	React.useEffect(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		if (!isOpen) return;

		debounceTimerRef.current = setTimeout(() => {
			fetchTags(inputValue);
		}, 250);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [inputValue, isOpen, fetchTags]);

	// Handle click outside to close dropdown
	React.useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
				setIsFocused(false);
				setHighlightedIndex(-1);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleAddTag = React.useCallback(
		(newTag: string) => {
			const trimmed = newTag.trim();
			if (!trimmed) return;

			// Avoid duplicate tag (case-insensitive check)
			const alreadyExists = currentTags.some(
				(t) => t.toLowerCase() === trimmed.toLowerCase(),
			);

			if (!alreadyExists) {
				if (maxTags && currentTags.length >= maxTags) return;

				const nextTags = [...currentTags, trimmed];
				onChange?.(nextTags);

				// Background call to create tag endpoint if enabled
				if (allowCreate) {
					tagsApi.create(trimmed).catch(() => {});
				}
			}

			setInputValue("");
			setHighlightedIndex(-1);
			inputRef.current?.focus();
		},
		[currentTags, maxTags, onChange, allowCreate],
	);

	const handleRemoveTag = React.useCallback(
		(tagToRemove: string) => {
			if (disabled) return;
			const nextTags = currentTags.filter((t) => t !== tagToRemove);
			onChange?.(nextTags);
		},
		[currentTags, disabled, onChange],
	);

	const handleClearAll = React.useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (disabled) return;
			onChange?.([]);
			setInputValue("");
		},
		[disabled, onChange],
	);

	// Check if the current typed input can be created as a new tag
	const trimmedQuery = inputValue.trim();
	const queryExistsInCurrent = currentTags.some(
		(t) => t.toLowerCase() === trimmedQuery.toLowerCase(),
	);
	const queryExactMatchInResults = searchResults.some(
		(item) => item.name.toLowerCase() === trimmedQuery.toLowerCase(),
	);
	const showCreateOption =
		allowCreate &&
		trimmedQuery.length > 0 &&
		!queryExistsInCurrent &&
		!queryExactMatchInResults;

	// Total options count for keyboard navigation:
	// 0: Create option (if showCreateOption)
	// 1..N: Search results
	const totalItems = (showCreateOption ? 1 : 0) + searchResults.length;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();

			if (highlightedIndex >= 0) {
				if (showCreateOption && highlightedIndex === 0) {
					handleAddTag(trimmedQuery);
					return;
				}
				const resultIdx = showCreateOption
					? highlightedIndex - 1
					: highlightedIndex;
				const selectedItem = searchResults[resultIdx];
				if (selectedItem) {
					handleAddTag(selectedItem.name);
					return;
				}
			}

			// If nothing highlighted or no dropdown selection, add current input
			if (trimmedQuery) {
				handleAddTag(trimmedQuery);
			}
		} else if (e.key === ",") {
			e.preventDefault();
			if (trimmedQuery) {
				handleAddTag(trimmedQuery);
			}
		} else if (
			e.key === "Backspace" &&
			inputValue === "" &&
			currentTags.length > 0
		) {
			e.preventDefault();
			handleRemoveTag(currentTags[currentTags.length - 1]);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
				return;
			}
			setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!isOpen) {
				setIsOpen(true);
				return;
			}
			setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
		} else if (e.key === "Escape") {
			setIsOpen(false);
			setHighlightedIndex(-1);
		}
	};

	return (
		<div className="w-full space-y-1.5" ref={containerRef}>
			{label && (
				<Label
					htmlFor={inputId}
					className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1"
				>
					{label}
					{required && <span className="text-destructive font-bold">*</span>}
				</Label>
			)}

			<div className="relative">
				{/* Input box with chips */}
				<div
					onClick={() => {
						if (!disabled) {
							inputRef.current?.focus();
							setIsOpen(true);
						}
					}}
					className={cn(
						"group relative flex flex-wrap items-center gap-1.5 min-h-[44px] w-full rounded-xl border px-3 py-1.5 transition-all duration-200 shadow-2xs cursor-text",
						"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700",
						isFocused &&
							"border-primary ring-2 ring-primary/20 dark:border-primary",
						disabled &&
							"pointer-events-none opacity-50 bg-muted/50 cursor-not-allowed",
						error &&
							"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
						className,
					)}
				>
					{/* Render Badges */}
					{currentTags.map((tag) => (
						<span
							key={tag}
							className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs animate-in fade-in zoom-in-95 duration-100"
						>
							<Tag className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
							<span className="truncate max-w-[160px]">{tag}</span>
							{!disabled && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleRemoveTag(tag);
									}}
									className="rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</span>
					))}

					{/* Inline text input */}
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						value={inputValue}
						onChange={(e) => {
							setInputValue(e.target.value);
							if (!isOpen) setIsOpen(true);
						}}
						onFocus={() => {
							setIsFocused(true);
							setIsOpen(true);
						}}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						placeholder={
							currentTags.length === 0 ? placeholder : "Add more tags..."
						}
						className="flex-1 min-w-[130px] bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-0 p-1 h-7"
					/>

					{/* Right indicators */}
					<div className="flex items-center gap-1 ml-auto shrink-0 pr-1">
						{isLoading && (
							<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						)}
						{currentTags.length > 0 && !disabled && (
							<button
								type="button"
								onClick={handleClearAll}
								className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
								title="Clear all tags"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>
				</div>

				{/* Dropdown Popup */}
				{isOpen && !disabled && (
					<div
						ref={dropdownRef}
						className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/90 bg-popover text-popover-foreground shadow-2xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden dark:bg-slate-900 dark:border-slate-800 p-1.5 max-h-60 overflow-y-auto space-y-1"
					>
						{/* Option: Create new tag */}
						{showCreateOption && (
							<div
								role="button"
								tabIndex={0}
								onClick={() => handleAddTag(trimmedQuery)}
								className={cn(
									"flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40",
									highlightedIndex === 0 &&
										"bg-purple-50 dark:bg-purple-950/40 ring-1 ring-purple-400/30",
								)}
							>
								<div className="flex items-center gap-2">
									<Plus className="h-3.5 w-3.5 shrink-0" />
									<span>
										Create tag &quot;<strong>{trimmedQuery}</strong>&quot;
									</span>
								</div>
								<span className="text-[10px] text-muted-foreground font-normal">
									↵ Enter
								</span>
							</div>
						)}

						{/* Option: Existing tags from search results */}
						{searchResults.map((item, idx) => {
							const itemIndex = showCreateOption ? idx + 1 : idx;
							const isHighlighted = highlightedIndex === itemIndex;
							const isSelected = currentTags.some(
								(t) => t.toLowerCase() === item.name.toLowerCase(),
							);

							return (
								<div
									key={item.id || item.name}
									role="button"
									tabIndex={0}
									onClick={() => {
										if (isSelected) {
											handleRemoveTag(item.name);
										} else {
											handleAddTag(item.name);
										}
									}}
									className={cn(
										"flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors text-left",
										isHighlighted && "bg-muted/80",
										isSelected
											? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
											: "hover:bg-muted/60 text-foreground",
									)}
								>
									<div className="flex items-center gap-2">
										<Tag className="h-3 w-3 text-slate-400 shrink-0" />
										<span>{item.name}</span>
									</div>
									{isSelected ? (
										<span className="flex items-center gap-1 text-[11px] text-primary font-semibold">
											<Check className="h-3 w-3" /> Selected
										</span>
									) : (
										<span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">
											Select
										</span>
									)}
								</div>
							);
						})}

						{/* Empty state */}
						{!showCreateOption &&
							searchResults.length === 0 &&
							!isLoading && (
								<div className="py-4 text-center text-xs text-muted-foreground">
									{trimmedQuery
										? `No tags found matching "${trimmedQuery}".`
										: "Type to search or create tags."}
								</div>
							)}
					</div>
				)}
			</div>

			{helperText && !error && (
				<p className="text-[11px] text-muted-foreground">{helperText}</p>
			)}
			{error && (
				<p className="text-[11px] text-destructive font-medium">{error}</p>
			)}
		</div>
	);
}

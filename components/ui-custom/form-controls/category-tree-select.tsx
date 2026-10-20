"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
	Folder,
	FolderOpen,
	Tag,
	ChevronRight,
	ChevronDown,
	Check,
	Search,
	X,
	Loader2,
	Layers,
	CornerDownRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { categoriesApi } from "@/lib/api/endpoints";
import { Category } from "@/lib/types";
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CategoryTreeNode extends Category {
	children: CategoryTreeNode[];
	depth: number;
	path: string[];
	hasChildren: boolean;
}

export interface CategoryTreeSelectProps {
	label?: string;
	description?: string;
	error?: string;
	placeholder?: string;
	searchPlaceholder?: string;
	value?: string | number | null;
	onChange?: (
		val: string | number | null,
		selectedCategory?: CategoryTreeNode | Category | null,
	) => void;
	categories?: Category[];
	loadCategories?: () => Promise<Category[]>;
	disabled?: boolean;
	className?: string;
	selectSize?: "sm" | "md" | "lg";
	portal?: boolean;
	allowSelectParent?: boolean;
}

const sizeStyles = {
	sm: "h-9 px-3 text-xs rounded-xl",
	md: "h-11 px-3.5 text-sm rounded-xl",
	lg: "h-12 px-4 text-base rounded-2xl",
};

/**
 * Builds a hierarchical tree from a flat or nested category list.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
	if (!categories || categories.length === 0) return [];

	const nodeMap = new Map<string | number, CategoryTreeNode>();

	// 1. Initialize map
	categories.forEach((cat) => {
		nodeMap.set(cat.id, {
			...cat,
			children: [],
			depth: 0,
			path: [cat.name],
			hasChildren: false,
		});
	});

	const roots: CategoryTreeNode[] = [];

	// 2. Link parents and children
	categories.forEach((cat) => {
		const node = nodeMap.get(cat.id)!;
		const parentId = cat.parentId;
		const hasValidParent =
			parentId !== null &&
			parentId !== undefined &&
			parentId !== "" &&
			parentId !== 0 &&
			nodeMap.has(parentId) &&
			String(parentId) !== String(cat.id);

		if (hasValidParent) {
			const parentNode = nodeMap.get(parentId!)!;
			parentNode.children.push(node);
			parentNode.hasChildren = true;
		} else {
			roots.push(node);
		}
	});

	// Also check if any category arrived with pre-nested children from backend
	categories.forEach((cat) => {
		if (Array.isArray(cat.children) && cat.children.length > 0) {
			const parentNode = nodeMap.get(cat.id);
			if (parentNode) {
				cat.children.forEach((child) => {
					if (!parentNode.children.some((c) => String(c.id) === String(child.id))) {
						const childNode = nodeMap.get(child.id) || {
							...child,
							children: [],
							depth: 0,
							path: [cat.name, child.name],
							hasChildren: false,
						};
						parentNode.children.push(childNode);
						parentNode.hasChildren = true;
					}
				});
			}
		}
	});

	// 3. Compute depths and paths recursively
	function calculatePaths(nodes: CategoryTreeNode[], currentDepth = 0, currentPath: string[] = []) {
		nodes.forEach((node) => {
			node.depth = currentDepth;
			node.path = [...currentPath, node.name];
			if (node.children.length > 0) {
				node.hasChildren = true;
				calculatePaths(node.children, currentDepth + 1, node.path);
			}
		});
	}

	calculatePaths(roots, 0, []);
	return roots;
}

/**
 * Filter tree nodes based on search query, keeping parent nodes of matching children.
 */
function filterCategoryTree(
	nodes: CategoryTreeNode[],
	query: string,
	autoExpandIds: Set<string | number>,
): CategoryTreeNode[] {
	if (!query.trim()) return nodes;
	const lower = query.toLowerCase().trim();

	function filterNodes(list: CategoryTreeNode[]): CategoryTreeNode[] {
		const result: CategoryTreeNode[] = [];
		for (const node of list) {
			const isMatch =
				node.name.toLowerCase().includes(lower) ||
				(node.description && node.description.toLowerCase().includes(lower));

			const matchingChildren = filterNodes(node.children);

			if (isMatch || matchingChildren.length > 0) {
				if (matchingChildren.length > 0) {
					autoExpandIds.add(node.id);
				}
				result.push({
					...node,
					children: matchingChildren,
					hasChildren: matchingChildren.length > 0,
				});
			}
		}
		return result;
	}

	return filterNodes(nodes);
}

export function CategoryTreeSelect({
	label,
	description,
	error,
	placeholder = "Select category or subcategory...",
	searchPlaceholder = "Search category or subcategory...",
	value,
	onChange,
	categories: initialCategories,
	loadCategories,
	disabled = false,
	className,
	selectSize = "sm",
	portal = true,
	allowSelectParent = true,
}: CategoryTreeSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [categoriesList, setCategoriesList] = useState<Category[]>(
		initialCategories || [],
	);
	const [isLoading, setIsLoading] = useState(false);
	const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string | number>>(
		new Set(),
	);

	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	const [popoverCoords, setPopoverCoords] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);

	// Load categories if not provided
	useEffect(() => {
		if (initialCategories !== undefined) {
			setCategoriesList(initialCategories);
			return;
		}

		let active = true;
		const fetchCats = async () => {
			setIsLoading(true);
			try {
				if (loadCategories) {
					const res = await loadCategories();
					if (active) setCategoriesList(res || []);
				} else {
					const res = await categoriesApi.list({ limit: 500 } as any);
					if (active) setCategoriesList(res?.items || []);
				}
			} catch (err) {
				console.error("Failed to fetch categories for tree:", err);
			} finally {
				if (active) setIsLoading(false);
			}
		};

		fetchCats();
		return () => {
			active = false;
		};
	}, [initialCategories, loadCategories]);

	// Build hierarchical tree
	const tree = useMemo(() => {
		return buildCategoryTree(categoriesList);
	}, [categoriesList]);

	// Lookup map for instant item & path resolution
	const categoryLookupMap = useMemo(() => {
		const map = new Map<string | number, CategoryTreeNode>();
		function traverse(nodes: CategoryTreeNode[]) {
			nodes.forEach((n) => {
				map.set(n.id, n);
				map.set(String(n.id), n);
				if (n.children.length > 0) traverse(n.children);
			});
		}
		traverse(tree);
		return map;
	}, [tree]);

	// Current selected category node
	const selectedCategoryNode = useMemo(() => {
		if (value === undefined || value === null || value === "" || value === "ALL") return null;
		return categoryLookupMap.get(value) || categoryLookupMap.get(String(value)) || null;
	}, [value, categoryLookupMap]);

	// Set of auto-expanded nodes when searching
	const autoExpandedIds = useMemo(() => new Set<string | number>(), []);

	// Filtered tree based on search query
	const filteredTree = useMemo(() => {
		autoExpandedIds.clear();
		return filterCategoryTree(tree, searchQuery, autoExpandedIds);
	}, [tree, searchQuery, autoExpandedIds]);

	// Auto-expand branches when search query changes or when selected node is set
	useEffect(() => {
		if (searchQuery.trim()) {
			setExpandedNodeIds((prev) => new Set([...prev, ...autoExpandedIds]));
		}
	}, [searchQuery, autoExpandedIds]);

	useEffect(() => {
		if (selectedCategoryNode && selectedCategoryNode.parentId) {
			setExpandedNodeIds((prev) => {
				const next = new Set(prev);
				next.add(selectedCategoryNode.parentId!);
				return next;
			});
		}
	}, [selectedCategoryNode]);

	// Toggle node expansion
	const toggleExpand = (nodeId: string | number, e: React.MouseEvent) => {
		e.stopPropagation();
		setExpandedNodeIds((prev) => {
			const next = new Set(prev);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			return next;
		});
	};

	// Position calculator for portal popover
	const calculatePopoverCoords = useCallback(() => {
		if (!triggerRef.current) return null;
		const rect = triggerRef.current.getBoundingClientRect();
		const dropdownHeight = 360;
		const spaceBelow = window.innerHeight - rect.bottom;
		let top = rect.bottom + 6;

		// Flip upwards if below space is insufficient and top has room
		if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
			top = Math.max(10, rect.top - dropdownHeight - 6);
		}

		const width = Math.max(rect.width, 320);
		let left = rect.left;
		if (typeof window !== "undefined" && left + width > window.innerWidth - 10) {
			left = Math.max(10, window.innerWidth - width - 10);
		}

		return {
			top,
			left,
			width,
		};
	}, []);

	const updatePopoverCoords = useCallback(() => {
		const coords = calculatePopoverCoords();
		if (coords) {
			setPopoverCoords(coords);
		}
	}, [calculatePopoverCoords]);

	// Sync coordinates synchronously before paint
	useIsomorphicLayoutEffect(() => {
		if (isOpen && portal) {
			updatePopoverCoords();
		}
	}, [isOpen, portal, updatePopoverCoords]);

	// Listen to scroll & resize
	useEffect(() => {
		if (isOpen && portal) {
			const handleScrollOrResize = () => {
				updatePopoverCoords();
			};
			window.addEventListener("scroll", handleScrollOrResize, true);
			window.addEventListener("resize", handleScrollOrResize);
			return () => {
				window.removeEventListener("scroll", handleScrollOrResize, true);
				window.removeEventListener("resize", handleScrollOrResize);
			};
		}
	}, [isOpen, portal, updatePopoverCoords]);

	// Close on outside click
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node;
			if (
				triggerRef.current?.contains(target) ||
				popoverRef.current?.contains(target)
			) {
				return;
			}
			setIsOpen(false);
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isOpen]);

	const handleSelect = (node: CategoryTreeNode) => {
		onChange?.(node.id, node);
		setIsOpen(false);
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange?.(null, null);
	};

	// Render a single node row in the tree
	const renderTreeNode = (node: CategoryTreeNode) => {
		const isExpanded = expandedNodeIds.has(node.id) || searchQuery.trim().length > 0;
		const isSelected =
			selectedCategoryNode?.id !== undefined &&
			String(selectedCategoryNode.id) === String(node.id);
		const hasChildren = node.hasChildren && node.children.length > 0;
		const isRoot = node.depth === 0;

		return (
			<div key={node.id} className="space-y-0.5">
				<div
					onClick={() => handleSelect(node)}
					className={cn(
						"group flex items-center justify-between py-1.5 px-2 rounded-xl text-xs transition-all cursor-pointer select-none",
						isSelected
							? "bg-purple-600 text-white font-bold shadow-xs"
							: "hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200",
						!isRoot && "ml-4 pl-2 border-l-2 border-slate-200/80 dark:border-slate-800",
					)}
					style={{
						paddingLeft: isRoot ? "0.5rem" : `${Math.max(node.depth * 0.75, 0.5)}rem`,
					}}
				>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						{/* Expand/Collapse Chevron Button */}
						{hasChildren ? (
							<button
								type="button"
								onClick={(e) => toggleExpand(node.id, e)}
								className={cn(
									"size-5 rounded-md flex items-center justify-center transition-colors shrink-0 cursor-pointer",
									isSelected
										? "hover:bg-white/20 text-white"
										: "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
								)}
								title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
							>
								{isExpanded ? (
									<ChevronDown className="size-3.5" />
								) : (
									<ChevronRight className="size-3.5" />
								)}
							</button>
						) : !isRoot ? (
							<CornerDownRight
								className={cn(
									"size-3.5 shrink-0 ml-1.5",
									isSelected ? "text-purple-200" : "text-slate-400",
								)}
							/>
						) : (
							<div className="w-5 shrink-0" />
						)}

						{/* Icon / Color Chip */}
						{isRoot ? (
							<span
								className={cn(
									"size-5 rounded-lg flex items-center justify-center shrink-0",
									isSelected
										? "bg-white/20 text-white"
										: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
								)}
								style={
									!isSelected && node.color
										? { backgroundColor: `${node.color}20`, color: node.color }
										: undefined
								}
							>
								{hasChildren ? (
									isExpanded ? (
										<FolderOpen className="size-3" />
									) : (
										<Folder className="size-3" />
									)
								) : (
									<Tag className="size-3" />
								)}
							</span>
						) : (
							<span
								className={cn(
									"size-4 rounded-md flex items-center justify-center shrink-0",
									isSelected
										? "bg-white/20 text-white"
										: "bg-slate-100 dark:bg-slate-800 text-slate-500",
								)}
							>
								<Tag className="size-2.5" />
							</span>
						)}

						{/* Category Title & Breadcrumb */}
						<div className="min-w-0 flex-1 truncate">
							<span className="truncate block font-medium">
								{node.name}
							</span>
						</div>
					</div>

					{/* Right Indicators: Subcategory Count & Checkmark */}
					<div className="flex items-center gap-1.5 shrink-0 ml-2">
						{hasChildren && (
							<Badge
								variant="outline"
								className={cn(
									"text-[10px] font-mono px-1.5 py-0 rounded-md font-semibold",
									isSelected
										? "bg-white/20 text-white border-transparent"
										: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
								)}
							>
								{node.children.length}{" "}
								{node.children.length === 1 ? "sub" : "subs"}
							</Badge>
						)}

						{isSelected && (
							<Check className="size-3.5 text-white shrink-0" />
						)}
					</div>
				</div>

				{/* Child Nodes (Recursively Rendered) */}
				{hasChildren && isExpanded && (
					<div className="space-y-0.5 pt-0.5">
						{node.children.map((child) => renderTreeNode(child))}
					</div>
				)}
			</div>
		);
	};

	// Popover Content
	const popoverContent = (!portal || popoverCoords) ? (
		<div
			ref={popoverRef}
			style={
				portal && popoverCoords
					? {
							position: "fixed",
							top: `${popoverCoords.top}px`,
							left: `${popoverCoords.left}px`,
							width: `${popoverCoords.width}px`,
							zIndex: 99999,
						}
					: undefined
			}
			className={cn(
				"rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-2 max-h-80 select-none",
				!portal && "absolute top-1 left-0 right-0 z-50",
			)}
		>
			{/* Search Input Bar */}
			<div className="relative">
				<Search className="absolute left-3 top-2.5 size-3.5 text-slate-400 pointer-events-none" />
				<input
					ref={inputRef}
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={searchPlaceholder}
					className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-8 pr-7 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
					>
						<X className="size-3" />
					</button>
				)}
			</div>

			{/* Tree Header Info */}
			<div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-1.5">
				<span className="flex items-center gap-1">
					<Layers className="size-3 text-purple-500" />
					<span>Categories & Subcategories</span>
				</span>
				<span>{tree.length} Root Categories</span>
			</div>

			{/* Tree Scroll Container */}
			<div className="overflow-y-auto space-y-1 flex-1 pr-1 max-h-60 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
				{isLoading ? (
					<div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400">
						<Loader2 className="size-4 animate-spin text-purple-600" />
						<span>Loading category hierarchy...</span>
					</div>
				) : filteredTree.length === 0 ? (
					<div className="py-8 text-center text-xs text-slate-400">
						No categories matching &quot;{searchQuery}&quot;
					</div>
				) : (
					<>
						{(!searchQuery.trim() ||
							"all categories".includes(
								searchQuery.toLowerCase().trim(),
							)) && (
							<div
								onClick={() => {
									onChange?.(null, null);
									setIsOpen(false);
								}}
								className={cn(
									"group flex items-center justify-between py-1.5 px-2 rounded-xl text-xs transition-all cursor-pointer select-none mb-1",
									!selectedCategoryNode
										? "bg-purple-600 text-white font-bold shadow-xs"
										: "hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-800 dark:text-slate-200",
								)}
							>
								<div className="flex items-center gap-2 min-w-0 flex-1">
									<span
										className={cn(
											"size-5 rounded-lg flex items-center justify-center shrink-0",
											!selectedCategoryNode
												? "bg-white/20 text-white"
												: "bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
										)}
									>
										<Layers className="size-3" />
									</span>
									<span className="truncate block font-medium">
										All Categories
									</span>
								</div>
								{!selectedCategoryNode && (
									<Check className="size-3.5 text-white shrink-0" />
								)}
							</div>
						)}
						{filteredTree.map((rootNode) => renderTreeNode(rootNode))}
					</>
				)}
			</div>

			{/* Footer: Clear selection */}
			{selectedCategoryNode && (
				<div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
					<span className="text-[11px] text-slate-500 truncate max-w-[200px]">
						Selected: <strong>{selectedCategoryNode.name}</strong>
					</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={handleClear}
						className="h-6 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 rounded-lg cursor-pointer"
					>
						Clear selection
					</Button>
				</div>
			)}
		</div>
	) : null;

	return (
		<div ref={containerRef} className={cn("w-full space-y-1.5", className)}>
			{label && (
				<Label className="font-semibold text-xs text-foreground tracking-wide flex items-center gap-1">
					{label}
				</Label>
			)}
			{description && (
				<p className="text-[11px] text-muted-foreground leading-normal">
					{description}
				</p>
			)}

			{/* Trigger Control Box */}
			<div
				ref={triggerRef}
				onClick={() => {
					if (!disabled) {
						if (!isOpen) {
							if (portal) {
								const coords = calculatePopoverCoords();
								if (coords) setPopoverCoords(coords);
							}
							setIsOpen(true);
							setTimeout(() => inputRef.current?.focus(), 60);
						} else {
							setIsOpen(false);
						}
					}
				}}
				className={cn(
					"w-full border transition-all cursor-pointer flex items-center justify-between gap-2 shadow-2xs outline-none focus:outline-none select-none",
					sizeStyles[selectSize],
					"border-slate-200/80 bg-slate-50/80 hover:border-slate-300 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700",
					isOpen &&
						"border-purple-500 ring-2 ring-purple-500/20 dark:border-purple-500 dark:ring-purple-500/20",
					disabled &&
						"pointer-events-none opacity-50 bg-muted/50 cursor-not-allowed",
					error &&
						"border-destructive ring-2 ring-destructive/20 dark:border-destructive/60",
				)}
			>
				{/* Display Selected Value */}
				<div className="flex items-center gap-2 flex-1 min-w-0">
					{selectedCategoryNode ? (
						<div className="flex items-center gap-1.5 min-w-0 flex-wrap">
							{selectedCategoryNode.path.length > 1 ? (
								<>
									<Badge
										variant="outline"
										className="text-[10px] font-normal px-1.5 py-0 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
									>
										{selectedCategoryNode.path[0]}
									</Badge>
									<ChevronRight className="size-3 text-slate-400 shrink-0" />
									<span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
										{selectedCategoryNode.name}
									</span>
								</>
							) : (
								<div className="flex items-center gap-1.5 truncate">
									<Folder className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
									<span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
										{selectedCategoryNode.name}
									</span>
									{selectedCategoryNode.hasChildren && (
										<span className="text-[10px] text-muted-foreground font-normal">
											(All subcategories)
										</span>
									)}
								</div>
							)}
						</div>
					) : (
						<span className="select-none truncate text-muted-foreground/70 text-xs">
							{placeholder}
						</span>
					)}
				</div>

				{/* Right Tools (Clear button + Chevron) */}
				<div className="flex items-center gap-1.5 shrink-0 text-slate-400">
					{selectedCategoryNode && !disabled && (
						<button
							type="button"
							onClick={handleClear}
							className="hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full cursor-pointer"
							title="Clear selection"
						>
							<X className="size-3.5" />
						</button>
					)}

					<ChevronDown
						className={cn(
							"transition-transform duration-200 shrink-0 size-3.5",
							isOpen && "rotate-180 text-purple-600",
						)}
					/>
				</div>
			</div>

			{/* Dropdown Menu (via portal into document.body or inline) */}
			{isOpen &&
				(!portal || popoverCoords) &&
				(portal && typeof document !== "undefined"
					? createPortal(popoverContent, document.body)
					: popoverContent)}
		</div>
	);
}

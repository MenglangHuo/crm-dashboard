"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import {
	ArrowRight,
	ChevronDown,
	ChevronRight,
	CornerDownRight,
	Layers,
	Percent,
	Sparkles
} from "lucide-react";
import { useMemo, useState } from "react";

export interface ProductUnitHierarchyItem {
	unitId: number | string;
	name: string;
	symbol?: string;
	isBase?: boolean;
	baseUnitId?: number | string;
	baseUnitName?: string;
	baseQuantity?: number;
	parentUnitId?: number | string;
	parentUnitName?: string;
	parentQuantity?: number;
	discountNote?: string;
	unitPrice?: number | string;
	sellable?: boolean;
	variantPrices?: any[];
	[key: string]: any;
}

export interface UnitTreeNode extends ProductUnitHierarchyItem {
	children: UnitTreeNode[];
	depth: number;
}

/**
 * Transforms flat unit items into a hierarchical tree structure.
 */
export function buildUnitTree(
	units: ProductUnitHierarchyItem[],
): UnitTreeNode[] {
	if (!units || units.length === 0) return [];

	const nodeMap = new Map<string | number, UnitTreeNode>();

	// 1. Initialize map of tree nodes
	units.forEach((unit) => {
		nodeMap.set(unit.unitId, {
			...unit,
			children: [],
			depth: 0,
		});
	});

	const roots: UnitTreeNode[] = [];

	// 2. Link child nodes to their respective parents
	units.forEach((unit) => {
		const node = nodeMap.get(unit.unitId)!;

		// Effective parent is parentUnitId (if distinct) or baseUnitId if not base
		const hasParentId =
			unit.parentUnitId !== undefined &&
			unit.parentUnitId !== null &&
			String(unit.parentUnitId) !== String(unit.unitId);

		const parentId = hasParentId
			? unit.parentUnitId!
			: !unit.isBase &&
					unit.baseUnitId !== undefined &&
					unit.baseUnitId !== null &&
					String(unit.baseUnitId) !== String(unit.unitId)
				? unit.baseUnitId!
				: null;

		if (parentId !== null && nodeMap.has(parentId)) {
			nodeMap.get(parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	});

	// 3. Recursively assign depth levels
	function calculateDepth(nodes: UnitTreeNode[], currentDepth = 0) {
		nodes.forEach((n) => {
			n.depth = currentDepth;
			if (n.children.length > 0) {
				calculateDepth(n.children, currentDepth + 1);
			}
		});
	}

	calculateDepth(roots, 0);
	return roots;
}

/**
 * Helper to get the conversion details for any unit:
 * If parent exists -> returns parent quantity & parent name.
 * Else -> returns base unit quantity & base unit name.
 */
export function getUnitConversion(unit: ProductUnitHierarchyItem) {
	const isBase = !!unit.isBase;

	// If unit has parent unit defined
	if (unit.parentUnitId && unit.parentUnitName) {
		const parentQty = unit.parentQuantity ?? 1;
		return {
			isBase: false,
			hasParent: true,
			referenceQty: parentQty,
			referenceName: unit.parentUnitName,
			formula: `1 ${unit.name} = ${parentQty} ${unit.parentUnitName}`,
			baseTotalFormula:
				unit.baseQuantity &&
				unit.baseQuantity !== parentQty &&
				unit.baseUnitName
					? `(= ${unit.baseQuantity} ${unit.baseUnitName})`
					: null,
		};
	}

	// Base unit or direct base conversion
	if (isBase) {
		return {
			isBase: true,
			hasParent: false,
			referenceQty: 1,
			referenceName: unit.baseUnitName || unit.name,
			formula: `1 ${unit.name} (Base Reference)`,
			baseTotalFormula: null,
		};
	}

	// Direct child of base unit without explicit parentUnit fields
	const baseQty = unit.baseQuantity ?? 1;
	return {
		isBase: false,
		hasParent: false,
		referenceQty: baseQty,
		referenceName: unit.baseUnitName || "Base Unit",
		formula: `1 ${unit.name} = ${baseQty} ${unit.baseUnitName || "Base Unit"}`,
		baseTotalFormula: null,
	};
}

interface UnitTreeNodeCardProps {
	node: UnitTreeNode;
	isLastChild?: boolean;
	isRoot?: boolean;
}

function UnitTreeNodeCard({
	node,
	isLastChild = false,
	isRoot = false,
}: UnitTreeNodeCardProps) {
	const { t } = useTranslation();
	const [isExpanded, setIsExpanded] = useState<boolean>(true);
	const hasChildren = node.children && node.children.length > 0;
	const conversion = getUnitConversion(node);

	const hasPrice =
		node.unitPrice !== undefined &&
		node.unitPrice !== null &&
		node.unitPrice !== "" &&
		!isNaN(Number(node.unitPrice));

	return (
		<div className="relative">
			{/* Node Row Card */}
			<div
				className={cn(
					"group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all duration-200",
					isRoot
						? "bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent dark:from-purple-950/40 dark:via-indigo-950/20 border-purple-200/80 dark:border-purple-800/60 shadow-2xs"
						: "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 shadow-2xs",
				)}
			>
				{/* Left Side: Unit Info & Icon */}
				<div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
					{/* Toggle / Depth Indicator */}
					<div className="flex items-center gap-1.5 shrink-0 pt-0.5 sm:pt-0">
						{hasChildren ? (
							<button
								type="button"
								onClick={() => setIsExpanded(!isExpanded)}
								className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-950 transition-colors cursor-pointer"
								title={isExpanded ? "Collapse branch" : "Expand branch"}
							>
								{isExpanded ? (
									<ChevronDown className="h-3.5 w-3.5" />
								) : (
									<ChevronRight className="h-3.5 w-3.5" />
								)}
							</button>
						) : !isRoot ? (
							<div className="flex h-6 w-6 items-center justify-center text-slate-300 dark:text-slate-600">
								<CornerDownRight className="h-3.5 w-3.5" />
							</div>
						) : null}

						<div
							className={cn(
								"flex h-9 w-9 items-center justify-center rounded-xl font-black text-sm shrink-0 border",
								isRoot
									? "bg-purple-600 text-white border-purple-500 shadow-xs"
									: conversion.hasParent
										? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
										: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/70",
							)}
						>
							{node.symbol ? node.symbol : node.name ? node.name[0] : "U"}
						</div>
					</div>

					{/* Unit Name, Symbol & Hierarchy Path */}
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-sm font-bold text-slate-900 dark:text-white truncate">
								{node.name}
							</span>

							{node.symbol && (
								<span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
									({node.symbol})
								</span>
							)}

							{isRoot && (
								<Badge
									variant="outline"
									className="bg-purple-100/70 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-bold py-0 h-5"
								>
									<Sparkles className="h-2.5 w-2.5 mr-1" />{" "}
									{t("products.baseUnit")}
								</Badge>
							)}

							{node.discountNote && (
								<Badge
									variant="secondary"
									className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-semibold py-0 h-5 gap-1"
								>
									<Percent className="h-2.5 w-2.5" />
									{node.discountNote}
								</Badge>
							)}
						</div>

						{/* Conversion Formula Row */}
						<div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
							{isRoot ? (
								<span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
									{t("products.primaryUnitDesc")}
								</span>
							) : (
								<div className="flex items-center gap-1.5 flex-wrap">
									{/* Primary Parent-Relative Conversion */}
									<span className="inline-flex items-center gap-1 font-mono font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60 text-[11px]">
										<ArrowRight className="h-3 w-3 text-purple-500" />
										{conversion.formula}
									</span>

									{/* Secondary Base Total (if parent is not base) */}
									{conversion.baseTotalFormula && (
										<span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
											{conversion.baseTotalFormula}
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right Side: Pricing / Meta */}
				<div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 shrink-0">
					{hasPrice ? (
						<div className="text-left sm:text-right">
							<span className="text-[10px] text-slate-400 uppercase font-semibold block">
								{t("invoices.unitPrice")}
							</span>
							<span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
								${Number(node.unitPrice).toFixed(2)}
							</span>
						</div>
					) : (
						<div className="text-left sm:text-right">
							<span className="text-[10px] text-slate-400 uppercase font-semibold block">
								{t("products.conversionRatio")}
							</span>
							<span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
								×{conversion.referenceQty}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Child Nodes (Recursive Branch) */}
			{hasChildren && isExpanded && (
				<div className="relative pl-6 sm:pl-8 mt-2 space-y-2">
					{/* Vertical Branch Guide Line */}
					<div
						className={cn(
							"absolute left-3 sm:left-4 top-0 w-0.5 bg-slate-200 dark:bg-slate-800",
							isLastChild ? "h-6" : "h-full",
						)}
					/>

					{node.children.map((child, idx) => (
						<div key={child.unitId} className="relative">
							{/* Horizontal Branch Curve */}
							<div className="absolute -left-3 sm:-left-4 top-5 w-3 sm:w-4 h-0.5 bg-slate-200 dark:bg-slate-800" />
							<UnitTreeNodeCard
								node={child}
								isLastChild={idx === node.children.length - 1}
								isRoot={false}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export interface UnitHierarchyTreeProps {
	data: ProductUnitHierarchyItem[];
	title?: string;
	className?: string;
}

export function UnitHierarchyTree({
	data = [],
	title,
	className,
}: UnitHierarchyTreeProps) {
	const { t } = useTranslation();
	const treeRoots = useMemo(() => buildUnitTree(data), [data]);
	const treeTitle = title || t("products.unitConversionHierarchy");

	if (!data || data.length === 0) {
		return (
			<div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
				{t("products.noUnitData")}
			</div>
		);
	}

	return (
		<div className={cn("space-y-3.5", className)}>
			{/* Header Banner */}
			<div className="flex items-center justify-between px-1">
				<div className="flex items-center gap-2">
					<Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
					<h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
						{treeTitle}
					</h4>
				</div>
				<Badge variant="secondary" className="text-[10px] font-mono">
					{data.length} Tier{data.length > 1 ? "s" : ""}
				</Badge>
			</div>

			{/* Tree View */}
			<div className="space-y-3">
				{treeRoots.map((rootNode) => (
					<UnitTreeNodeCard
						key={rootNode.unitId}
						node={rootNode}
						isRoot={true}
					/>
				))}
			</div>
		</div>
	);
}

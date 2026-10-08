"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
	Filter,
	RotateCcw,
	Check,
	X,
	SlidersHorizontal,
	Calendar,
	DollarSign,
	Sparkles,
	Code,
	Tag,
	CheckSquare,
	ChevronDown,
	Layers,
	Building2,
	Users,
	Package,
	Store,
	Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSelect,
	ModernSearchSelect,
	ModernDatePicker,
	type SearchSelectOption,
	type SelectOption,
} from "@/components/ui-custom/form-controls";
import {
	customersApi,
	categoriesApi,
	brandsApi,
	warehousesApi,
	branchesApi,
	suppliersApi,
	usersApi,
	divisionsApi,
	departmentsApi,
	unitsApi,
	productsApi,
} from "@/lib/api/endpoints";
import {
	DomainFilterField,
	FilterCriterion,
	FilterOperator,
	AsyncFilterEntityType,
	buildSearchFilterPayload,
} from "./search-filter-types";
import { cn } from "@/lib/utils";

export function isStatusField(fieldDef: DomainFilterField): boolean {
	if (fieldDef.isStatus === true) return true;
	const f = fieldDef.field.toLowerCase();
	const l = fieldDef.label.toLowerCase();
	if (f.includes("status") || l.includes("status")) return true;
	if (f.includes("verification") || l.includes("verification")) return true;
	if (f === "state" || l === "state") return true;
	return false;
}

export function resolveAsyncEntity(
	fieldDef: DomainFilterField,
): AsyncFilterEntityType | undefined {
	if (fieldDef.asyncEntity) return fieldDef.asyncEntity;
	const f = fieldDef.field.toLowerCase();
	if (f.includes("customer")) return "customer";
	if (f === "category" || f === "categoryid") return "category";
	if (f === "brand" || f === "brandid") return "brand";
	if (f === "warehouse" || f === "warehouseid") return "warehouse";
	if (f === "branch" || f === "branchid") return "branch";
	if (f === "supplier" || f === "supplierid") return "supplier";
	if (
		f === "user" ||
		f === "userid" ||
		f === "staff" ||
		f === "staffid" ||
		f.includes("receivedby") ||
		f.includes("collectedby") ||
		f.includes("issuedby") ||
		f.includes("salesperson") ||
		f.includes("seller")
	)
		return "user";
	if (f === "division" || f === "divisionid") return "division";
	if (f === "department" || f === "departmentid") return "department";
	if (f === "unit" || f === "unitid") return "unit";
	if (f === "product" || f === "productid") return "product";
	return undefined;
}

export async function loadEntityOptions(
	entity: AsyncFilterEntityType,
	query: string = "",
): Promise<SearchSelectOption[]> {
	try {
		switch (entity) {
			case "customer": {
				const res = await customersApi.list({
					search: query || undefined,
					limit: 30,
				} as any);
				const items = res?.items || [];
				return items.map((c: any) => {
					const fullName =
						`${c.firstName || c.firstname || ""} ${c.lastName || c.lastname || ""}`.trim();
					const name =
						c.name ||
						c.customerName ||
						fullName ||
						c.merchantName ||
						c.contact ||
						(c.phoneNumber ? `Customer (${c.phoneNumber})` : undefined) ||
						(c.phone ? `Customer (${c.phone})` : undefined) ||
						`Customer #${c.id}`;
					const details = [c.phone || c.phoneNumber, c.email, c.customerCode]
						.filter(Boolean)
						.join(" • ");
					return {
						value: c.id,
						label: name,
						subtitle: details || undefined,
						badge: c.status,
					};
				});
			}
			case "category": {
				const res = await categoriesApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((cat: any) => ({
					value: cat.id,
					label: cat.name || cat.categoryName || `Category #${cat.id}`,
					subtitle: cat.code ? `Code: ${cat.code}` : undefined,
				}));
			}
			case "brand": {
				const res = await brandsApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((b: any) => ({
					value: b.id,
					label: b.name || b.brandName || `Brand #${b.id}`,
					subtitle: b.code ? `Code: ${b.code}` : undefined,
				}));
			}
			case "warehouse": {
				const res = await warehousesApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((w: any) => ({
					value: w.id,
					label: w.name || w.warehouseName || `Warehouse #${w.id}`,
					subtitle: w.location || w.address || undefined,
				}));
			}
			case "branch": {
				const res = await branchesApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((br: any) => ({
					value: br.id,
					label: br.name || br.branchName || `Branch #${br.id}`,
					subtitle: br.address || br.phone || undefined,
				}));
			}
			case "supplier": {
				const res = await suppliersApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((s: any) => ({
					value: s.id,
					label: s.name || s.supplierName || `Supplier #${s.id}`,
					subtitle: s.contactName || s.phone || s.email || undefined,
				}));
			}
			case "user":
			case "staff": {
				const res = await usersApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((u: any) => {
					const fullName =
						`${u.firstName || u.firstname || ""} ${u.lastName || u.lastname || ""}`.trim();
					const name =
						u.fullName ||
						u.name ||
						fullName ||
						u.username ||
						`User #${u.id}`;
					const details = [u.email, u.phone].filter(Boolean).join(" • ");
					return {
						value: u.id,
						label: name,
						subtitle: details || undefined,
						badge: u.role || (u.roles && u.roles[0]?.name),
					};
				});
			}
			case "division": {
				const res = await divisionsApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((d: any) => ({
					value: d.id,
					label: d.name || d.divisionName || `Division #${d.id}`,
				}));
			}
			case "department": {
				const res = await departmentsApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((dep: any) => ({
					value: dep.id,
					label: dep.name || dep.departmentName || `Department #${dep.id}`,
				}));
			}
			case "unit": {
				const res = await unitsApi.list({
					search: query || undefined,
					limit: 100,
				} as any);
				const items = res?.items || [];
				return items.map((un: any) => ({
					value: un.id,
					label: un.name || un.unitName || `Unit #${un.id}`,
					subtitle: un.symbol ? `Symbol: ${un.symbol}` : undefined,
				}));
			}
			case "product": {
				const res = await productsApi.list({
					search: query || undefined,
					limit: 50,
				} as any);
				const items = res?.items || [];
				return items.map((p: any) => ({
					value: p.id,
					label: p.name || p.productName || `Product #${p.id}`,
					subtitle: p.code ? `SKU: ${p.code}` : undefined,
				}));
			}
			default:
				return [];
		}
	} catch (err) {
		console.error(`Failed to load options for entity ${entity}:`, err);
		return [];
	}
}

interface DynamicFilterModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	fields: DomainFilterField[];
	activeFilters: FilterCriterion[];
	onApplyFilters: (filters: FilterCriterion[]) => void;
	onResetFilters?: () => void;
	domainTitle?: string;
	searchValue?: string;
}

export function DynamicFilterModal({
	open,
	onOpenChange,
	fields = [],
	activeFilters = [],
	onApplyFilters,
	onResetFilters,
	domainTitle = "Domain Filter Studio",
	searchValue = "",
}: DynamicFilterModalProps) {
	// Local state for draft filters before applying
	const [draftFilters, setDraftFilters] = useState<
		Record<string, FilterCriterion>
	>({});
	const [labelCache, setLabelCache] = useState<Record<string | number, string>>(
		{},
	);

	// Sync draft state whenever modal opens or activeFilters change
	useEffect(() => {
		if (open) {
			const map: Record<string, FilterCriterion> = {};
			activeFilters.forEach((af) => {
				map[af.field] = { ...af };
			});
			setDraftFilters(map);
		}
	}, [open, activeFilters]);

	// Get or initialize criterion for field
	const getFieldCriterion = (fieldDef: DomainFilterField): FilterCriterion => {
		const isStatus = isStatusField(fieldDef);
		const existing = draftFilters[fieldDef.field];
		if (existing) {
			if (isStatus && existing.operator !== "EQUAL") {
				return { ...existing, operator: "EQUAL" };
			}
			return existing;
		}
		return {
			field: fieldDef.field,
			operator: isStatus ? "EQUAL" : fieldDef.defaultOperator || "EQUAL",
		};
	};

	// Update criterion for field
	const updateFieldCriterion = (
		field: string,
		criterion: FilterCriterion | null,
	) => {
		setDraftFilters((prev) => {
			const next = { ...prev };
			if (!criterion) {
				delete next[field];
			} else {
				next[field] = criterion;
			}
			return next;
		});
	};

	// Clear single field
	const clearField = (field: string) => {
		updateFieldCriterion(field, null);
	};

	// Helper to validate active filter
	const isValidFilter = (f: FilterCriterion) => {
		if (f.field === "search") return false;
		if (f.operator === "IN" || f.operator === "NOT_IN") {
			return Array.isArray(f.values) && f.values.length > 0;
		}
		if (f.operator === "BETWEEN") {
			return (
				(f.value !== "" && f.value !== undefined && f.value !== null) ||
				(f.valueTo !== "" && f.valueTo !== undefined && f.valueTo !== null)
			);
		}
		if (f.operator === "IS_NULL" || f.operator === "IS_NOT_NULL") return true;
		return f.value !== undefined && f.value !== "" && f.value !== null;
	};

	// Handle Apply
	const handleApply = () => {
		const list = Object.values(draftFilters).filter(isValidFilter);
		onApplyFilters(list);
		onOpenChange(false);
	};

	// Handle Reset All
	const handleResetAll = () => {
		setDraftFilters({});
		if (onResetFilters) onResetFilters();
	};

	// Count active draft criteria
	const activeCount = useMemo(() => {
		return Object.values(draftFilters).filter(isValidFilter).length;
	}, [draftFilters]);

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={
				<div className="flex items-center gap-2.5">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
						<SlidersHorizontal className="h-5 w-5" />
					</div>
					<div>
						<h3 className="font-extrabold text-sm text-foreground">
							{domainTitle}
						</h3>
						<p className="text-[11px] text-muted-foreground">
							Dynamic domain filter builder & payload generator
						</p>
					</div>
				</div>
			}
			size="xl"
			footer={
				<ModernModalFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleResetAll}
						className="h-10 px-4 rounded-xl text-sm font-semibold border-border hover:bg-muted cursor-pointer gap-2"
					>
						<RotateCcw className="h-4 w-4 shrink-0" />
						<span>Reset Filters</span>
					</Button>

					<ModernModalCancelButton onClick={() => onOpenChange(false)} />

					<ModernModalSubmitButton
						onClick={handleApply}
						icon={<Check className="h-4 w-4 shrink-0" />}
					>
						Apply {activeCount > 0 ? `(${activeCount})` : ""} Filters
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Active Filter Chips Bar */}
				{activeCount > 0 && (
					<div className="flex flex-wrap items-center gap-2 bg-primary/5 p-3 rounded-2xl border border-primary/20">
						<span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
							<Filter className="h-3 w-3" /> Active ({activeCount}):
						</span>
						{Object.values(draftFilters).map((f) => {
							const fDef = fields.find((item) => item.field === f.field);
							const label = fDef?.label || f.field;
							let displayVal = labelCache[f.value] || String(f.value ?? "");

							if (fDef?.options) {
								const opt = fDef.options.find(
									(o) => String(o.value) === String(f.value),
								);
								if (opt) displayVal = opt.label;
							}

							if (
								(f.operator === "IN" || f.operator === "NOT_IN") &&
								Array.isArray(f.values)
							) {
								displayVal = `${f.operator === "NOT_IN" ? "NOT IN" : "IN"} [${f.values.join(", ")}]`;
							} else if (f.operator === "BETWEEN") {
								displayVal = `${f.value ?? "min"} to ${f.valueTo ?? "max"}`;
							} else if (
								f.operator === "IS_NULL" ||
								f.operator === "IS_NOT_NULL"
							) {
								displayVal = f.operator;
							}

							if (!isValidFilter(f)) return null;

							return (
								<Badge
									key={f.field}
									variant="secondary"
									className="text-xs font-semibold gap-1.5 px-3 py-1 bg-background border border-primary/30 text-foreground rounded-xl shadow-2xs"
								>
									<span className="text-muted-foreground font-normal">
										{label}:
									</span>
									<span className="font-bold text-primary">{displayVal}</span>
									<button
										type="button"
										onClick={() => clearField(f.field)}
										className="ml-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							);
						})}
					</div>
				)}

				{/* Dynamic Fields Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
					{fields.map((fieldDef) => {
						const criterion = getFieldCriterion(fieldDef);
						const isStatus = isStatusField(fieldDef);
						const asyncEntity = resolveAsyncEntity(fieldDef);
						const isSearchSelect =
							fieldDef.type === "search-select" || !!asyncEntity;

						return (
							<div
								key={fieldDef.field}
								className="bg-card p-4 rounded-2xl border border-border/80 space-y-2.5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs"
							>
								{/* Field Header */}
								<div className="flex items-center justify-between">
									<label className="text-xs font-bold text-foreground flex items-center gap-1.5">
										{fieldDef.icon || (
											<Tag className="h-3.5 w-3.5 text-primary" />
										)}
										<span>{fieldDef.label}</span>
									</label>
									<Badge
										variant="outline"
										className={cn(
											"text-[9px] font-mono uppercase font-bold rounded-md px-1.5 py-0.5",
											isStatus
												? "bg-primary/10 text-primary border-primary/20"
												: "text-muted-foreground",
										)}
									>
										{isStatus ? "EQUAL" : criterion.operator}
									</Badge>
								</div>

								{/* Field Controls by Type */}

								{/* 1. STATUS FIELD (Locked operator 'EQ', full-width ModernSelect) */}
								{isStatus && !isSearchSelect && (
									<div className="w-full">
										<ModernSelect
											selectSize="sm"
											placeholder={
												fieldDef.placeholder || `All ${fieldDef.label}s`
											}
											clearable={true}
											searchable={
												!!(fieldDef.options && fieldDef.options.length > 5)
											}
											value={
												criterion.value !== undefined &&
												criterion.value !== null
													? String(criterion.value)
													: ""
											}
											onChange={(val) => {
												if (val === "" || val === null || val === undefined) {
													clearField(fieldDef.field);
												} else {
													const matchedOpt = fieldDef.options?.find(
														(opt) => String(opt.value) === val,
													);
													const finalVal = matchedOpt ? matchedOpt.value : val;
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: "EQUAL",
														value: finalVal,
													});
												}
											}}
											options={
												fieldDef.options?.map((opt) => ({
													label: opt.label,
													value: String(opt.value),
													badge: opt.badgeColor ? opt.label : undefined,
												})) || []
											}
										/>
									</div>
								)}

								{/* 2. ASYNC SEARCH SELECT (Customer, Category, Brand, Warehouse, Branch, Supplier, etc.) */}
								{isSearchSelect && (
									<div className="w-full">
										<ModernSearchSelect
											selectSize="sm"
											placeholder={
												fieldDef.placeholder ||
												`Search & select ${fieldDef.label.toLowerCase()}...`
											}
											searchPlaceholder={`Type to search ${fieldDef.label.toLowerCase()}...`}
											value={criterion.value}
											options={
												fieldDef.options?.map((opt) => ({
													value: opt.value,
													label: opt.label,
													subtitle: opt.subtitle,
												})) || []
											}
											loadOptions={
												fieldDef.loadOptions
													? fieldDef.loadOptions
													: asyncEntity
														? (q) => loadEntityOptions(asyncEntity, q)
														: undefined
											}
											onChange={(val, selectedOptions) => {
												if (selectedOptions && selectedOptions.length > 0) {
													setLabelCache((prev) => {
														const next = { ...prev };
														selectedOptions.forEach((opt) => {
															next[opt.value] = opt.label;
														});
														return next;
													});
												}
												if (val === "" || val === null || val === undefined) {
													clearField(fieldDef.field);
												} else {
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: isStatus
															? "EQUAL"
															: criterion.operator ||
																fieldDef.defaultOperator ||
																"EQUAL",
														value: val,
													});
												}
											}}
										/>
									</div>
								)}

								{/* 3. STANDARD SELECT (Non-Status) */}
								{!isStatus && !isSearchSelect && fieldDef.type === "select" && (
									<div className="flex items-center gap-2">
										<div className="w-28 shrink-0">
											<ModernSelect
												selectSize="sm"
												value={criterion.operator || "EQUAL"}
												onChange={(op) => {
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: op as FilterOperator,
														value:
															op === "IS_NULL" || op === "IS_NOT_NULL"
																? undefined
																: criterion.value,
													});
												}}
												options={[
													{ label: "= EQ", value: "EQUAL" },
													{ label: "≠ NE", value: "NOT_EQUAL" },
													{ label: "IS NULL", value: "IS_NULL" },
													{ label: "IS NOT NULL", value: "IS_NOT_NULL" },
												]}
											/>
										</div>

										{criterion.operator !== "IS_NULL" &&
											criterion.operator !== "IS_NOT_NULL" && (
												<div className="flex-1 min-w-0">
													<ModernSelect
														selectSize="sm"
														placeholder={
															fieldDef.placeholder || `All ${fieldDef.label}s`
														}
														clearable={true}
														searchable={
															!!(
																fieldDef.options && fieldDef.options.length > 5
															)
														}
														value={
															criterion.value !== undefined &&
															criterion.value !== null
																? String(criterion.value)
																: ""
														}
														onChange={(val) => {
															if (
																val === "" ||
																val === null ||
																val === undefined
															) {
																clearField(fieldDef.field);
															} else {
																const matchedOpt = fieldDef.options?.find(
																	(opt) => String(opt.value) === val,
																);
																const finalVal = matchedOpt
																	? matchedOpt.value
																	: val;
																updateFieldCriterion(fieldDef.field, {
																	field: fieldDef.field,
																	operator:
																		criterion.operator ||
																		fieldDef.defaultOperator ||
																		"EQUAL",
																	value: finalVal,
																});
															}
														}}
														options={
															fieldDef.options?.map((opt) => ({
																label: opt.label,
																value: String(opt.value),
																badge: opt.badgeColor ? opt.label : undefined,
															})) || []
														}
													/>
												</div>
											)}
									</div>
								)}

								{/* 4. MULTI-SELECT */}
								{!isSearchSelect && fieldDef.type === "multi-select" && (
									<div className="space-y-2">
										<div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
											<span>Select multiple items:</span>
											<button
												type="button"
												onClick={() => {
													const nextOp =
														criterion.operator === "NOT_IN" ? "IN" : "NOT_IN";
													updateFieldCriterion(fieldDef.field, {
														...criterion,
														operator: nextOp,
													});
												}}
												className="text-primary hover:underline font-bold transition-colors cursor-pointer"
											>
												Mode:{" "}
												{criterion.operator === "NOT_IN"
													? "NOT IN (Exclude)"
													: "IN (Include)"}
											</button>
										</div>
										<div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-muted/40 rounded-xl border border-border">
											{fieldDef.options?.map((opt) => {
												const currentValues: any[] = Array.isArray(
													criterion.values,
												)
													? criterion.values
													: [];
												const isChecked = currentValues.some(
													(v) => String(v) === String(opt.value),
												);

												return (
													<button
														key={String(opt.value)}
														type="button"
														onClick={() => {
															let nextValues: any[] = [];
															if (isChecked) {
																nextValues = currentValues.filter(
																	(v) => String(v) !== String(opt.value),
																);
															} else {
																nextValues = [...currentValues, opt.value];
															}

															if (nextValues.length === 0) {
																clearField(fieldDef.field);
															} else {
																updateFieldCriterion(fieldDef.field, {
																	field: fieldDef.field,
																	operator:
																		criterion.operator === "NOT_IN"
																			? "NOT_IN"
																			: "IN",
																	values: nextValues,
																});
															}
														}}
														className={cn(
															"px-2.5 py-1 text-xs font-semibold rounded-lg transition-all border cursor-pointer flex items-center gap-1.5",
															isChecked
																? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
																: "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
														)}
													>
														<CheckSquare
															className={cn(
																"h-3.5 w-3.5",
																isChecked ? "opacity-100" : "opacity-40",
															)}
														/>
														<span>{opt.label}</span>
													</button>
												);
											})}
										</div>
									</div>
								)}

								{/* 5. NUMBER RANGE (BETWEEN value and valueTo) */}
								{fieldDef.type === "number-range" && (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<div>
											<span className="text-[10px] font-bold text-muted-foreground block mb-1">
												Min Value
											</span>
											<ModernInput
												type="number"
												placeholder="e.g. 100"
												leftIcon={
													fieldDef.unitSymbol ? (
														<span className="font-bold text-xs">
															{fieldDef.unitSymbol}
														</span>
													) : undefined
												}
												value={criterion.value ?? ""}
												onChange={(e) => {
													const val =
														e.target.value === ""
															? undefined
															: Number(e.target.value);
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: "BETWEEN",
														value: val,
														valueTo: criterion.valueTo,
													});
												}}
												clearable={true}
												inputSize="sm"
											/>
										</div>
										<div>
											<span className="text-[10px] font-bold text-muted-foreground block mb-1">
												Max Value
											</span>
											<ModernInput
												type="number"
												placeholder="e.g. 500"
												leftIcon={
													fieldDef.unitSymbol ? (
														<span className="font-bold text-xs">
															{fieldDef.unitSymbol}
														</span>
													) : undefined
												}
												value={criterion.valueTo ?? ""}
												onChange={(e) => {
													const valTo =
														e.target.value === ""
															? undefined
															: Number(e.target.value);
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: "BETWEEN",
														value: criterion.value,
														valueTo: valTo,
													});
												}}
												clearable={true}
												inputSize="sm"
											/>
										</div>
									</div>
								)}

								{/* 6. DATE RANGE (BETWEEN start and end date with ModernDatePicker) */}
								{fieldDef.type === "date-range" && (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										<div>
											<span className="text-[10px] font-bold text-muted-foreground block mb-1">
												From Date
											</span>
											<ModernDatePicker
												datePickerSize="sm"
												value={criterion.value ?? ""}
												onChange={(dateStr) => {
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: "BETWEEN",
														value: dateStr || undefined,
														valueTo: criterion.valueTo,
													});
												}}
												clearable={true}
												placeholder="Select from date..."
											/>
										</div>
										<div>
											<span className="text-[10px] font-bold text-muted-foreground block mb-1">
												To Date
											</span>
											<ModernDatePicker
												datePickerSize="sm"
												value={criterion.valueTo ?? ""}
												onChange={(dateStr) => {
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: "BETWEEN",
														value: criterion.value,
														valueTo: dateStr || undefined,
													});
												}}
												clearable={true}
												placeholder="Select to date..."
											/>
										</div>
									</div>
								)}

								{/* 6b. SINGLE DATE */}
								{fieldDef.type === "date" && (
									<div className="flex items-center gap-2">
										<div className="w-32 shrink-0">
											<ModernSelect
												selectSize="sm"
												value={criterion.operator || "EQUAL"}
												onChange={(op) => {
													const opVal = op as FilterOperator;
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: opVal,
														value:
															opVal === "IS_NULL" || opVal === "IS_NOT_NULL"
																? undefined
																: criterion.value,
													});
												}}
												options={[
													{ label: "= EQ", value: "EQUAL" },
													{ label: "≠ NE", value: "NOT_EQUAL" },
													{ label: "> GT", value: "GREATER_THAN" },
													{ label: "≥ GTE", value: "GREATER_THAN_OR_EQUAL" },
													{ label: "< LT", value: "LESS_THAN" },
													{ label: "≤ LTE", value: "LESS_THAN_OR_EQUAL" },
													{ label: "IS NULL", value: "IS_NULL" },
													{ label: "IS NOT NULL", value: "IS_NOT_NULL" },
												]}
											/>
										</div>
										{criterion.operator !== "IS_NULL" &&
											criterion.operator !== "IS_NOT_NULL" && (
												<div className="flex-1 min-w-0">
													<ModernDatePicker
														datePickerSize="sm"
														value={criterion.value ?? ""}
														onChange={(dateStr) => {
															updateFieldCriterion(fieldDef.field, {
																field: fieldDef.field,
																operator: criterion.operator || "EQUAL",
																value: dateStr || undefined,
															});
														}}
														clearable={true}
														placeholder={
															fieldDef.placeholder ||
															`Select ${fieldDef.label.toLowerCase()}...`
														}
													/>
												</div>
											)}
									</div>
								)}

								{/* 7. NUMBER THRESHOLD */}
								{!isSearchSelect && fieldDef.type === "number-threshold" && (
									<div className="flex items-center gap-2">
										<div className="w-32 shrink-0">
											<ModernSelect
												selectSize="sm"
												value={criterion.operator || "GREATER_THAN"}
												onChange={(op) => {
													const opVal = op as FilterOperator;
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: opVal,
														value:
															opVal === "IS_NULL" || opVal === "IS_NOT_NULL"
																? undefined
																: criterion.value,
													});
												}}
												options={[
													{ label: "> GT", value: "GREATER_THAN" },
													{ label: "≥ GTE", value: "GREATER_THAN_OR_EQUAL" },
													{ label: "< LT", value: "LESS_THAN" },
													{ label: "≤ LTE", value: "LESS_THAN_OR_EQUAL" },
													{ label: "= EQ", value: "EQUAL" },
													{ label: "≠ NE", value: "NOT_EQUAL" },
													{ label: "IS NULL", value: "IS_NULL" },
													{ label: "IS NOT NULL", value: "IS_NOT_NULL" },
												]}
											/>
										</div>

										{criterion.operator !== "IS_NULL" &&
											criterion.operator !== "IS_NOT_NULL" && (
												<ModernInput
													type="number"
													placeholder={fieldDef.placeholder || "e.g. 10"}
													value={
														criterion.value !== undefined &&
														criterion.value !== null
															? criterion.value
															: ""
													}
													onChange={(e) => {
														const rawVal = e.target.value;
														if (rawVal === "" || rawVal === undefined) {
															clearField(fieldDef.field);
														} else {
															updateFieldCriterion(fieldDef.field, {
																field: fieldDef.field,
																operator:
																	criterion.operator ||
																	fieldDef.defaultOperator ||
																	"GREATER_THAN",
																value: Number(rawVal),
															});
														}
													}}
													clearable={true}
													inputSize="sm"
													className="flex-1"
												/>
											)}
									</div>
								)}

								{/* 8. BOOLEAN */}
								{fieldDef.type === "boolean" && (
									<div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
										<span className="text-xs font-semibold text-foreground">
											{fieldDef.placeholder || `Filter by ${fieldDef.label}`}
										</span>
										<div className="w-36">
											<ModernSelect
												selectSize="sm"
												value={
													criterion.value === undefined ||
													criterion.value === null
														? ""
														: String(criterion.value)
												}
												onChange={(val) => {
													if (val === "") clearField(fieldDef.field);
													else {
														updateFieldCriterion(fieldDef.field, {
															field: fieldDef.field,
															operator: "EQUAL",
															value: val === "true",
														});
													}
												}}
												options={[
													{ label: "Any State", value: "" },
													{ label: "True (Active)", value: "true" },
													{ label: "False (Inactive)", value: "false" },
												]}
											/>
										</div>
									</div>
								)}

								{/* 9. TEXT */}
								{fieldDef.type === "text" && (
									<div className="flex items-center gap-2">
										<div className="w-36 shrink-0">
											<ModernSelect
												selectSize="sm"
												value={criterion.operator || "LIKE"}
												onChange={(op) => {
													const opVal = op as FilterOperator;
													updateFieldCriterion(fieldDef.field, {
														field: fieldDef.field,
														operator: opVal,
														value:
															opVal === "IS_NULL" || opVal === "IS_NOT_NULL"
																? undefined
																: criterion.value,
													});
												}}
												options={[
													{ label: "Contains (LIKE)", value: "LIKE" },
													{ label: "Starts With", value: "STARTS_WITH" },
													{ label: "Ends With", value: "ENDS_WITH" },
													{ label: "Exact Match (EQ)", value: "EQUAL" },
													{ label: "Not Equal (NE)", value: "NOT_EQUAL" },
													{ label: "Full-Text", value: "FULL_TEXT" },
													{ label: "Is Null", value: "IS_NULL" },
													{ label: "Is Not Null", value: "IS_NOT_NULL" },
												]}
											/>
										</div>

										{criterion.operator !== "IS_NULL" &&
											criterion.operator !== "IS_NOT_NULL" && (
												<ModernInput
													placeholder={
														fieldDef.placeholder ||
														`Filter by ${fieldDef.label}...`
													}
													value={criterion.value ?? ""}
													onChange={(e) => {
														const val = e.target.value;
														if (!val) clearField(fieldDef.field);
														else {
															updateFieldCriterion(fieldDef.field, {
																field: fieldDef.field,
																operator:
																	criterion.operator ||
																	fieldDef.defaultOperator ||
																	"LIKE",
																value: val,
															});
														}
													}}
													clearable={true}
													inputSize="sm"
													className="flex-1"
												/>
											)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</ModernModal>
	);
}

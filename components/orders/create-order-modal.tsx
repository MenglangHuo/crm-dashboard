"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	customersApi,
	warehousesApi,
	productsApi,
	unitsApi,
	ordersApi,
	paymentTermsApi,
	deliveriesApi,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Plus,
	Trash2,
	ShoppingBag,
	User,
	Building2,
	Calculator,
	PackageCheck,
	Clock,
	Truck,
	AlertCircle,
} from "lucide-react";

interface CreateOrderModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

interface FormLineItem {
	id: string;
	productId: string;
	variantId: string;
	unitId: string;
	productName: string;
	variantName?: string;
	sku: string;
	unitPrice: number;
	quantity: number;
	discount: number;
	discountType: "FLAT" | "PERCENTAGE";
}

export function CreateOrderModal({
	open,
	onOpenChange,
	onSuccess,
}: CreateOrderModalProps) {
	const queryClient = useQueryClient();
	const { canCreateOrder } = usePermissions();

	const [customerId, setCustomerId] = useState<string>("");
	const [warehouseId, setWarehouseId] = useState<string>("");
	const [paymentTermId, setPaymentTermId] = useState<string>("");
	const [deliveryId, setDeliveryId] = useState<string>("");
	const [discount, setDiscount] = useState<number>(0);
	const [discountType, setDiscountType] = useState<"FLAT" | "PERCENTAGE">(
		"FLAT",
	);
	const [customerNote, setCustomerNote] = useState<string>("");
	const [internalNote, setInternalNote] = useState<string>("");

	const [items, setItems] = useState<FormLineItem[]>([]);

	// Load dropdown options
	const { data: customersData } = useQuery({
		queryKey: ["customers-dropdown"],
		queryFn: () => customersApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: paymentTerms = [] } = useQuery({
		queryKey: ["payment-terms-dropdown"],
		queryFn: () => paymentTermsApi.list(),
		enabled: open,
	});

	const { data: deliveriesData } = useQuery({
		queryKey: ["deliveries-dropdown"],
		queryFn: () => deliveriesApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses-dropdown"],
		queryFn: () => warehousesApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: productsData } = useQuery({
		queryKey: ["products-dropdown"],
		queryFn: () => productsApi.list({ limit: 100 }),
		enabled: open,
	});

	const { data: unitsData } = useQuery({
		queryKey: ["units-dropdown"],
		queryFn: () => unitsApi.list({ limit: 100 }),
		enabled: open,
	});

	// Auto-populate warehouse if not selected
	useEffect(() => {
		if (!warehouseId && warehousesData?.items && warehousesData.items.length > 0) {
			setWarehouseId(String(warehousesData.items[0].id));
		}
	}, [warehouseId, warehousesData]);

	// Auto-populate customer's default payment term and delivery if available
	useEffect(() => {
		if (!customerId) return;
		const cust: any = (customersData?.items || []).find(
			(c: any) => String(c.id) === String(customerId),
		);
		const defaultTerm =
			cust?.defaultPaymentTerm?.id ||
			cust?.defaultPaymentTermId ||
			cust?.paymentTermId ||
			cust?.paymentTerm?.id;
		if (defaultTerm && !paymentTermId) {
			setPaymentTermId(String(defaultTerm));
		}
		if (cust?.primaryDelivery?.id && !deliveryId) {
			setDeliveryId(String(cust.primaryDelivery.id));
		}
	}, [customerId, customersData, paymentTermId, deliveryId]);

	// Real-time stock availability check for sales
	const validItemsForStock = useMemo(() => {
		return items
			.filter((i) => i.variantId && Number(i.quantity) > 0)
			.map((i) => ({
				variantId: Number(i.variantId),
				unitId: i.unitId ? Number(i.unitId) : undefined,
				quantity: Number(i.quantity) || 1,
			}));
	}, [items]);

	const { data: stockCheckData } = useQuery({
		queryKey: [
			"stock-check",
			warehouseId,
			validItemsForStock.map((i) => `${i.variantId}:${i.quantity}`).join(","),
		],
		queryFn: () => {
			if (!warehouseId || validItemsForStock.length === 0) return null;
			return ordersApi.checkStock({
				warehouseId: Number(warehouseId),
				items: validItemsForStock,
			});
		},
		enabled: Boolean(warehouseId && validItemsForStock.length > 0 && open),
		staleTime: 5000,
	});

	const stockMap = useMemo(() => {
		const map: Record<number, { available: number; sufficient: boolean }> = {};
		if (stockCheckData?.items) {
			for (const res of stockCheckData.items) {
				map[Number(res.variantId)] = {
					available: res.availableQuantity,
					sufficient: res.isSufficient,
				};
			}
		}
		return map;
	}, [stockCheckData]);

	const createMutation = useMutation({
		mutationFn: (payload: any) =>
			ordersApi.create(payload, `ORD-KEY-${Date.now()}`),
		onSuccess: () => {
			toast.success("Sales order draft created successfully");
			queryClient.invalidateQueries({ queryKey: ["orders"] });
			onOpenChange(false);
			resetForm();
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	const resetForm = () => {
		setCustomerId("");
		setWarehouseId("");
		setPaymentTermId("");
		setDeliveryId("");
		setDiscount(0);
		setDiscountType("FLAT");
		setCustomerNote("");
		setInternalNote("");
		setItems([]);
	};

	const handleAddLineItem = () => {
		const firstProd = productsData?.items?.[0];
		const firstUnit = unitsData?.items?.[0];
		const defaultVariant = firstProd?.variants?.[0];

		const newItem: FormLineItem = {
			id: String(Date.now() + Math.random()),
			productId: firstProd ? String(firstProd.id) : "",
			variantId: defaultVariant
				? String(defaultVariant.id)
				: firstProd
					? String(firstProd.id)
					: "",
			unitId: firstUnit
				? String(firstUnit.id)
				: firstProd?.unitId
					? String(firstProd.unitId)
					: "1",
			productName: firstProd ? firstProd.name : "",
			sku: defaultVariant?.sku || firstProd?.baseSku || "",
			unitPrice: firstProd
				? firstProd.sellPrice || firstProd.basePrice || 0
				: 0,
			quantity: 1,
			discount: 0,
			discountType: "FLAT",
		};
		setItems((prev) => [...prev, newItem]);
	};

	const handleItemChange = (
		id: string,
		field: keyof FormLineItem,
		value: any,
	) => {
		setItems((prev) =>
			prev.map((item) => {
				if (item.id !== id) return item;

				if (field === "productId" || field === "variantId") {
					// Find matching product or variant
					let matchedProd = productsData?.items.find(
						(p) => String(p.id) === String(value),
					);
					let matchedVariant =
						matchedProd?.variants?.find(
							(v: any) => String(v.id) === String(value),
						) || matchedProd?.variants?.[0];

					if (!matchedProd) {
						matchedProd = productsData?.items.find((p) =>
							p.variants?.some((v: any) => String(v.id) === String(value)),
						);
						matchedVariant = matchedProd?.variants?.find(
							(v: any) => String(v.id) === String(value),
						);
					}

					const price = Number(
						matchedVariant?.sellPrice ||
							matchedVariant?.price ||
							matchedProd?.sellPrice ||
							matchedProd?.basePrice ||
							0,
					);

					return {
						...item,
						productId: matchedProd ? String(matchedProd.id) : item.productId,
						productName: matchedProd ? matchedProd.name : item.productName,
						variantId: matchedVariant
							? String(matchedVariant.id)
							: String(value),
						sku: matchedVariant?.sku || matchedProd?.baseSku || item.sku,
						unitPrice: price,
						unitId: matchedVariant?.unitId
							? String(matchedVariant.unitId)
							: matchedProd?.unitId
								? String(matchedProd.unitId)
								: item.unitId,
					};
				}

				if (field === "unitId") {
					const selectedProd = productsData?.items.find(
						(p) => String(p.id) === String(item.productId),
					);
					const variant = selectedProd?.variants?.find(
						(v: any) => String(v.id) === String(item.variantId),
					);
					const selectedUnitObj = unitsData?.items.find(
						(u: any) => String(u.id) === String(value),
					);

					// Check if variant has units configured with specific prices
					const variantUnitObj = variant?.units?.find(
						(u: any) => String(u.unitId || u.id) === String(value),
					);

					let calculatedPrice = 0;
					if (
						variantUnitObj &&
						Number(variantUnitObj.finalPrice ?? variantUnitObj.basePrice ?? 0) > 0
					) {
						calculatedPrice = Number(
							variantUnitObj.finalPrice ?? variantUnitObj.basePrice,
						);
					} else {
						const basePrice = Number(
							variant?.sellPrice ||
								variant?.price ||
								selectedProd?.sellPrice ||
								selectedProd?.basePrice ||
								item.unitPrice,
						);
						const factor = Number(
							variantUnitObj?.conversionFactor ||
								(selectedUnitObj as any)?.conversionFactor ||
								(selectedUnitObj as any)?.conversionRate ||
								(selectedUnitObj as any)?.multiplier ||
								1,
						);
						if (!isNaN(factor) && factor > 0) {
							calculatedPrice = basePrice * factor;
						} else {
							calculatedPrice = basePrice;
						}
					}

					return {
						...item,
						unitId: String(value),
						unitPrice: calculatedPrice,
					};
				}

				return { ...item, [field]: value };
			}),
		);
	};

	const handleRemoveLineItem = (id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
	};

	// Calculations
	const subtotal = items.reduce((sum, item) => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.unitPrice) || 0;
		const disc = Number(item.discount) || 0;
		const linePrice =
			item.discountType === "PERCENTAGE"
				? price * (1 - disc / 100)
				: price - disc;
		return sum + Math.max(0, linePrice) * qty;
	}, 0);

	const discountAmount =
		discountType === "PERCENTAGE"
			? subtotal * (Number(discount) / 100)
			: Number(discount);
	const grandTotal = Math.max(0, subtotal - discountAmount);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();

		if (!customerId) {
			toast.error("Please select a customer");
			return;
		}
		if (items.length === 0) {
			toast.error("Please add at least one item line to the order");
			return;
		}

		const payload = {
			customerId: Number(customerId),
			warehouseId: warehouseId ? Number(warehouseId) : undefined,
			paymentTermId: paymentTermId ? Number(paymentTermId) : undefined,
			deliveryId: deliveryId ? Number(deliveryId) : undefined,
			discount: Number(discount) || 0,
			discountType: discountType,
			customerNote,
			internalNote,
			items: items.map((item) => ({
				variantId: Number(item.variantId) || Number(item.productId),
				unitId: Number(item.unitId) || 1,
				quantity: Number(item.quantity) || 1,
				unitPrice: Number(item.unitPrice) || 0,
				discount: Number(item.discount) || 0,
				discountType: item.discountType,
			})),
		};

		createMutation.mutate(payload);
	};

	const customerOptions = (customersData?.items || []).map((c) => ({
		value: String(c.id),
		label: c.name,
		description: c.phone ? `Phone: ${c.phone}` : undefined,
		icon: <User className="h-4 w-4" />,
	}));

	const paymentTermOptions = useMemo(() => {
		return (paymentTerms || []).map((t: any) => ({
			value: String(t.id),
			label: `${t.name} (Due ${t.dueDays}d${t.discountPercentage ? `, -${t.discountPercentage}%` : ""})`,
			description: t.description || undefined,
			icon: <Clock className="h-4 w-4" />,
		}));
	}, [paymentTerms]);

	const deliveryOptions = useMemo(() => {
		return (deliveriesData?.items || []).map((d: any) => ({
			value: String(d.id),
			label: `${d.name} (${d.driverName || "Driver"} - ${d.primaryPhone || "No Phone"})`,
			description: d.vehicleNumber ? `Vehicle: ${d.vehicleNumber}` : undefined,
			icon: <Truck className="h-4 w-4" />,
		}));
	}, [deliveriesData]);

	const warehouseOptions = (warehousesData?.items || []).map((w) => ({
		value: String(w.id),
		label: w.name,
		description: w.description || undefined,
		icon: <Building2 className="h-4 w-4" />,
	}));

	// Product Variant options with Variant Name and Product Name
	const productOptions = (productsData?.items || []).flatMap((p) => {
		if (p.variants && p.variants.length > 0) {
			return p.variants.map((v: any) => ({
				value: String(v.id || v.variantId),
				label: `${v.name || v.sku || "Default Variant"} (${p.name})`,
				description: `Product: ${p.name} | Variant: ${v.name || v.sku} | Price: $${v.sellPrice || v.price || p.sellPrice || 0}`,
			}));
		}
		return [
			{
				value: String(p.id),
				label: p.name,
				description: `$${p.sellPrice || p.basePrice || 0}`,
			},
		];
	});

	const unitOptions = (unitsData?.items || []).map((u) => ({
		value: String(u.id),
		label: u.name,
	}));

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title="Create Sales Order (Draft)"
			subtitle="Configure customer details, line items, and discounts."
			icon={
				<ShoppingBag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
			}
			size="xl"
			glassmorphism={true}
			draggable={true}
			resizable={true}
			isLoading={createMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => handleSubmit()}
						disabled={!canCreateOrder}
						isLoading={createMutation.isPending}
						loadingText="Saving Order..."
					>
						Create Order Draft
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<form
				id="create-order-form"
				onSubmit={handleSubmit}
				className="space-y-6"
			>
				{/* Section 1: Customer, Warehouse, Terms & Delivery Selection */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
					<ModernSelect
						label="Customer *"
						options={customerOptions}
						value={customerId}
						onChange={setCustomerId}
						placeholder="Select customer..."
						searchable={true}
						clearable={true}
						leftIcon={<User className="h-4 w-4 text-indigo-500" />}
					/>

					<ModernSelect
						label="Fulfillment Warehouse"
						options={warehouseOptions}
						value={warehouseId}
						onChange={setWarehouseId}
						placeholder="Select warehouse..."
						searchable={true}
						clearable={true}
						leftIcon={<Building2 className="h-4 w-4 text-indigo-500" />}
					/>

					<ModernSelect
						label="Payment Term"
						options={paymentTermOptions}
						value={paymentTermId}
						onChange={setPaymentTermId}
						placeholder="Customer default term..."
						searchable={true}
						clearable={true}
						leftIcon={<Clock className="h-4 w-4 text-indigo-500" />}
					/>

					<ModernSelect
						label="Delivery Partner (Optional)"
						options={deliveryOptions}
						value={deliveryId}
						onChange={setDeliveryId}
						placeholder="Customer default delivery (optional)..."
						searchable={true}
						clearable={true}
						leftIcon={<Truck className="h-4 w-4 text-indigo-500" />}
					/>
				</div>

				{stockCheckData && !stockCheckData.allAvailable && (
					<div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
						<AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
						<span>
							<strong>Stock Shortage Notice:</strong> One or more selected items exceed current warehouse available stock. You can still proceed with draft creation; stockkeeper verification may adjust quantities if not restocked.
						</span>
					</div>
				)}

				{/* Section 2: Multi-Item Table */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<PackageCheck className="h-4 w-4 text-indigo-600" />
							<h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
								Order Items & Line Quantities ({items.length})
							</h3>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={handleAddLineItem}
							className="rounded-xl text-xs h-8 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-semibold"
						>
							<Plus className="h-3.5 w-3.5 mr-1" /> Add Item Line
						</Button>
					</div>

					{items.length === 0 ? (
						<div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
							No item lines added yet. Click &quot;Add Item Line&quot; above to
							configure items.
						</div>
					) : (
						<div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
							<table className="w-full text-left text-xs">
								<thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
									<tr>
										<th className="p-3">Product</th>
										<th className="p-3 w-32">Unit</th>
										<th className="p-3 w-24 text-center">In Stock</th>
										<th className="p-3 w-28">Quantity</th>
										<th className="p-3 w-32">Unit Price ($)</th>
										<th className="p-3 w-32 text-right">Line Total</th>
										<th className="p-3 w-10"></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-200 dark:divide-slate-800">
									{items.map((item) => {
										const qty = Number(item.quantity) || 0;
										const price = Number(item.unitPrice) || 0;
										const lineTotal = qty * price;

										return (
											<tr
												key={item.id}
												className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
											>
												<td className="p-2">
													<ModernSelect
														options={productOptions}
														value={item.productId}
														onChange={(val) =>
															handleItemChange(item.id, "productId", val)
														}
														placeholder="Choose product..."
														searchable={true}
														selectSize="sm"
													/>
												</td>

												<td className="p-2">
													<ModernSelect
														options={unitOptions}
														value={item.unitId}
														onChange={(val) =>
															handleItemChange(item.id, "unitId", val)
														}
														placeholder="Unit"
														selectSize="sm"
													/>
												</td>

												<td className="p-2 text-center">
													{warehouseId && item.variantId ? (
														stockMap[Number(item.variantId)] ? (
															<div className="flex flex-col items-center">
																<span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
																	{stockMap[Number(item.variantId)].available}
																</span>
																{!stockMap[Number(item.variantId)].sufficient ? (
																	<Badge
																		variant="destructive"
																		className="text-[9px] py-0 px-1 font-semibold mt-0.5"
																	>
																		Shortage
																	</Badge>
																) : (
																	<span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
																		Available
																	</span>
																)}
															</div>
														) : (
															<span className="text-slate-400 text-xs font-mono">—</span>
														)
													) : (
														<span className="text-slate-400 text-xs">—</span>
													)}
												</td>

												<td className="p-2">
													<ModernInput
														type="number"
														min="1"
														value={item.quantity}
														onChange={(e) =>
															handleItemChange(
																item.id,
																"quantity",
																e.target.value,
															)
														}
														inputSize="sm"
														className={`font-mono text-center font-bold ${
															stockMap[Number(item.variantId)] &&
															!stockMap[Number(item.variantId)].sufficient
																? "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200"
																: ""
														}`}
													/>
													{stockMap[Number(item.variantId)] &&
														!stockMap[Number(item.variantId)].sufficient && (
															<div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 text-center">
																Lack {Number(item.quantity) - stockMap[Number(item.variantId)].available}
															</div>
														)}
												</td>

												<td className="p-2">
													<ModernInput
														type="number"
														step="0.01"
														min="0"
														value={item.unitPrice}
														onChange={(e) =>
															handleItemChange(
																item.id,
																"unitPrice",
																e.target.value,
															)
														}
														inputSize="sm"
														className="font-mono"
													/>
												</td>

												<td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
													$
													{lineTotal.toLocaleString(undefined, {
														minimumFractionDigits: 2,
													})}
												</td>

												<td className="p-2 text-right">
													<Button
														type="button"
														variant="ghost"
														size="icon"
														onClick={() => handleRemoveLineItem(item.id)}
														className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Section 3: Notes & Financial Grand Total */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
					<div className="space-y-3">
						<ModernTextarea
							label="Customer Note"
							value={customerNote}
							onChange={(e) => setCustomerNote(e.target.value)}
							placeholder="Notes to appear on customer invoice..."
							rows={2}
						/>

						<ModernInput
							label="Internal Staff Note"
							value={internalNote}
							onChange={(e) => setInternalNote(e.target.value)}
							placeholder="Special warehouse instructions..."
						/>
					</div>

					<div className="bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
						<div className="flex justify-between items-center text-xs">
							<span className="text-slate-500 font-medium">Subtotal:</span>
							<span className="font-mono font-bold text-slate-900 dark:text-slate-100">
								$
								{subtotal.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>

						<div className="flex items-center justify-between gap-2 text-xs">
							<span className="text-slate-500 font-medium whitespace-nowrap">
								Order Discount:
							</span>
							<div className="flex items-center gap-2">
								<ModernInput
									type="number"
									step="0.01"
									min="0"
									value={discount}
									onChange={(e) => setDiscount(Number(e.target.value))}
									inputSize="sm"
									containerClassName="w-24"
									className="font-mono"
								/>
								<ModernSelect
									options={[
										{ value: "FLAT", label: "$ FLAT" },
										{ value: "PERCENTAGE", label: "% PERCENT" },
									]}
									value={discountType}
									onChange={(val: any) => setDiscountType(val)}
									selectSize="sm"
									containerClassName="w-28"
								/>
							</div>
						</div>

						<div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
							<span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
								<Calculator className="h-4 w-4 text-indigo-600" /> Grand Total:
							</span>
							<span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
								$
								{grandTotal.toLocaleString(undefined, {
									minimumFractionDigits: 2,
								})}
							</span>
						</div>
					</div>
				</div>
			</form>
		</ModernModal>
	);
}

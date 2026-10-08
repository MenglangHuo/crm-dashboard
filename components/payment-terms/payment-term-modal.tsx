"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentTermsApi } from "@/lib/api/endpoints";
import { PaymentTerm, CreatePaymentTermRequest, PaymentTermCondition } from "@/lib/types";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
	Clock,
	CheckCircle2,
	Calculator,
	Zap,
	Plus,
	Trash2,
	ListOrdered,
} from "lucide-react";

import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernTextarea,
	ModernSwitch,
	ModernSelect,
	SelectOption,
} from "@/components/ui-custom/form-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentTermModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingTerm?: PaymentTerm | null;
	onSuccess?: () => void;
}

interface ConditionItem {
	id?: number | string;
	discountDays: number | "";
	discount: number | "";
	discountType: "PERCENTAGE" | "FLAT";
}

interface PresetItem {
	id: string;
	label: string;
	name: string;
	dueDays: number;
	hasDiscount: boolean;
	discountDays?: number;
	discountPercentage?: number;
	discountPolicy?: "FINAL_SETTLEMENT" | "PROPORTIONAL";
	description: string;
	category: "standard" | "discount";
	tag?: string;
	conditions?: { discountDays: number; discount: number; discountType: "PERCENTAGE" | "FLAT" }[];
}

const PRESETS: PresetItem[] = [
	// Standard Terms
	{
		id: "immediate_cod",
		category: "standard",
		label: "COD (ភ្លាមៗ)",
		name: "ទូទាត់ភ្លាមៗ (Immediate / COD)",
		dueDays: 0,
		hasDiscount: false,
		description: "តម្រូវឱ្យទូទាត់ភ្លាមៗនៅពេលចេញវិក្កយបត្រ ឬពេលប្រគល់ទំនិញដល់ដៃអតិថិជន។",
		tag: "Same Day",
	},
	{
		id: "net_15",
		category: "standard",
		label: "Net 15 (១៥ ថ្ងៃ)",
		name: "ឥណទាន ១៥ ថ្ងៃ (Net 15)",
		dueDays: 15,
		hasDiscount: false,
		description: "កំណត់ឱ្យទូទាត់ប្រាក់ក្នុងរយៈពេល ១៥ ថ្ងៃបន្ទាប់ពីថ្ងៃចេញវិក្កយបត្រ។",
		tag: "15 Days",
	},
	{
		id: "net_30",
		category: "standard",
		label: "Net 30 (៣០ ថ្ងៃ)",
		name: "ឥណទាន ៣០ ថ្ងៃ (Net 30)",
		dueDays: 30,
		hasDiscount: false,
		description: "រយៈពេលទូទាត់ស្តង់ដារ ៣០ ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទវិក្កយបត្រ។",
		tag: "30 Days",
	},
	{
		id: "net_60_vip",
		category: "standard",
		label: "Net 60 VIP (៦០ ថ្ងៃ)",
		name: "ឥណទាន VIP ៦០ ថ្ងៃ (Net 60)",
		dueDays: 60,
		hasDiscount: false,
		description: "ឥណទានរយៈពេលវែង ៦០ ថ្ងៃ សម្រាប់អតិថិជន VIP និងដេប៉ូចែកចាយធំៗ។",
		tag: "60 Days",
	},
	// Tiered Discount Terms
	{
		id: "tiered_cod_net_30",
		category: "discount",
		label: "COD + 4 Tiers (7/5/2/1%)",
		name: "ទូទាត់ភ្លាមៗ (Immediate / COD)",
		dueDays: 30,
		hasDiscount: true,
		discountPolicy: "FINAL_SETTLEMENT",
		description: "តម្រូវឱ្យទូទាត់ភ្លាមៗនៅថ្ងៃចេញវិក្កយបត្រ ឬពេលប្រគល់ទំនិញដល់ដៃអតិថិជន។",
		tag: "⚡ 4 Tiers",
		conditions: [
			{ discountDays: 0, discount: 7, discountType: "PERCENTAGE" },
			{ discountDays: 10, discount: 5, discountType: "PERCENTAGE" },
			{ discountDays: 20, discount: 2, discountType: "PERCENTAGE" },
			{ discountDays: 30, discount: 1, discountType: "PERCENTAGE" },
		],
	},
	{
		id: "2_10_net_30",
		category: "discount",
		label: "2/10 Net 30",
		name: "បញ្ចុះតម្លៃ 2% ក្នុង 10 ថ្ងៃ / កំណត់ 30 ថ្ងៃ (2/10 Net 30)",
		dueDays: 30,
		hasDiscount: true,
		discountPolicy: "FINAL_SETTLEMENT",
		description:
			"ទទួលបានការបញ្ចុះតម្លៃ ២% ប្រសិនបើទូទាត់ផ្តាច់ក្នុងរយៈពេល ១០ ថ្ងៃដំបូង។ ថ្ងៃផុតកំណត់សរុបគឺ ៣០ ថ្ងៃ។",
		tag: "⚡ 2% (10d)",
		conditions: [
			{ discountDays: 10, discount: 2, discountType: "PERCENTAGE" },
		],
	},
	{
		id: "3_7_net_15",
		category: "discount",
		label: "3/7 Net 15",
		name: "បញ្ចុះតម្លៃ 3% ក្នុង 7 ថ្ងៃ / កំណត់ 15 ថ្ងៃ (3/7 Net 15)",
		dueDays: 15,
		hasDiscount: true,
		discountPolicy: "FINAL_SETTLEMENT",
		description:
			"បញ្ចុះតម្លៃ ៣% ប្រសិនបើទូទាត់ក្នុងរយៈពេល ៧ ថ្ងៃដំបូង។ រយៈពេលកំណត់ចុងក្រោយគឺ ១៥ ថ្ងៃ។",
		tag: "⚡ 3% (7d)",
		conditions: [
			{ discountDays: 7, discount: 3, discountType: "PERCENTAGE" },
		],
	},
	{
		id: "5_5_net_30_prop",
		category: "discount",
		label: "5/5 Net 30 (Proportional)",
		name: "បញ្ចុះតម្លៃ 5% តាមសមាមាត្រក្នុង 5 ថ្ងៃ (5/5 Net 30)",
		dueDays: 30,
		hasDiscount: true,
		discountPolicy: "PROPORTIONAL",
		description:
			"ទទួលបានការបញ្ចុះតម្លៃ ៥% តាមសមាមាត្រទឹកប្រាក់ដែលបានបង់ក្នុងរយៈពេល ៥ ថ្ងៃដំបូង។ ផុតកំណត់ ៣០ ថ្ងៃ។",
		tag: "⚡ 5% (Prop)",
		conditions: [
			{ discountDays: 5, discount: 5, discountType: "PERCENTAGE" },
		],
	},
];

const POLICY_OPTIONS: SelectOption[] = [
	{
		value: "FINAL_SETTLEMENT",
		label: "បង់ផ្តាច់ប៉ុណ្ណោះ (Final Settlement)",
		description: "បញ្ចុះតម្លៃលុះត្រាតែអតិថិជនទូទាត់ផ្តាច់វិក្កយបត្រទាំងមូល",
	},
	{
		value: "PROPORTIONAL",
		label: "តាមសមាមាត្រទឹកប្រាក់ (Proportional)",
		description: "បញ្ចុះតម្លៃគិតតាមសមាមាត្រទឹកប្រាក់ដែលបានបង់ក្នុងអំឡុងពេលបញ្ចុះតម្លៃ",
	},
];

export function PaymentTermModal({
	open,
	onOpenChange,
	editingTerm,
	onSuccess,
}: PaymentTermModalProps) {
	const queryClient = useQueryClient();

	// Form State
	const [name, setName] = useState("ឥណទាន ៣០ ថ្ងៃ (Net 30)");
	const [description, setDescription] = useState(
		"រយៈពេលទូទាត់ស្តង់ដារ ៣០ ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទវិក្កយបត្រ។",
	);
	const [dueDays, setDueDays] = useState<number>(30);

	// Progressive Disclosure: Early Cash Discount Tiers
	const [enableDiscount, setEnableDiscount] = useState<boolean>(false);
	const [discountPolicy, setDiscountPolicy] = useState<
		"FINAL_SETTLEMENT" | "PROPORTIONAL"
	>("FINAL_SETTLEMENT");

	const [conditions, setConditions] = useState<ConditionItem[]>([
		{ discountDays: 10, discount: 2, discountType: "PERCENTAGE" },
	]);

	// Preset Active Tracking
	const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

	// Simulation State
	const [simInvoiceAmount] = useState<number>(1000);

	useEffect(() => {
		if (editingTerm) {
			setName(editingTerm.name || "");
			setDescription(editingTerm.description || "");
			setDueDays(editingTerm.dueDays ?? 30);
			setDiscountPolicy(
				(editingTerm.discountPolicy as "FINAL_SETTLEMENT" | "PROPORTIONAL") ||
					"FINAL_SETTLEMENT",
			);

			if (editingTerm.conditions && editingTerm.conditions.length > 0) {
				setConditions(
					editingTerm.conditions.map((c: PaymentTermCondition) => ({
						id: c.id,
						discountDays: c.discountDays,
						discount: c.discount,
						discountType:
							c.discountType?.toUpperCase() === "FLAT" ? "FLAT" : "PERCENTAGE",
					})),
				);
				setEnableDiscount(true);
			} else if (editingTerm.discountDays !== undefined && editingTerm.discountPercentage !== undefined && Number(editingTerm.discountPercentage) > 0) {
				setConditions([
					{
						discountDays: editingTerm.discountDays ?? 10,
						discount: editingTerm.discountPercentage ?? 2,
						discountType: "PERCENTAGE",
					},
				]);
				setEnableDiscount(true);
			} else {
				setConditions([
					{ discountDays: 10, discount: 2, discountType: "PERCENTAGE" },
				]);
				setEnableDiscount(false);
			}
			setSelectedPresetId(null);
		} else {
			// Default clean view: standard Net 30
			setName("ឥណទាន ៣០ ថ្ងៃ (Net 30)");
			setDescription("រយៈពេលទូទាត់ស្តង់ដារ ៣០ ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទវិក្កយបត្រ។");
			setDueDays(30);
			setEnableDiscount(false);
			setConditions([
				{ discountDays: 10, discount: 2, discountType: "PERCENTAGE" },
			]);
			setDiscountPolicy("FINAL_SETTLEMENT");
			setSelectedPresetId("net_30");
		}
	}, [editingTerm, open]);

	// Quick Preset Handler
	const applyPreset = (preset: PresetItem) => {
		setSelectedPresetId(preset.id);
		setName(preset.name);
		setDueDays(preset.dueDays);
		setDescription(preset.description);
		if (preset.discountPolicy) {
			setDiscountPolicy(preset.discountPolicy);
		}

		if (preset.conditions && preset.conditions.length > 0) {
			setConditions(preset.conditions.map((c) => ({ ...c })));
			setEnableDiscount(true);
		} else if (preset.hasDiscount) {
			setConditions([
				{
					discountDays: preset.discountDays ?? 10,
					discount: preset.discountPercentage ?? 2,
					discountType: "PERCENTAGE",
				},
			]);
			setEnableDiscount(true);
		} else {
			setEnableDiscount(false);
		}

		toast.info(`បានជ្រើសរើស: ${preset.label}`);
	};

	const handleAddCondition = () => {
		const last = conditions[conditions.length - 1];
		const nextDays =
			last && typeof last.discountDays === "number" ? last.discountDays + 10 : 10;
		const nextDisc =
			last && typeof last.discount === "number"
				? Math.max(1, last.discount - 1)
				: 2;
		setConditions([
			...conditions,
			{
				discountDays: nextDays,
				discount: nextDisc,
				discountType: "PERCENTAGE",
			},
		]);
	};

	const handleRemoveCondition = (index: number) => {
		if (conditions.length <= 1) {
			toast.error("ត្រូវតែមានយ៉ាងហោចណាស់មួយដំណាក់កាលបញ្ចុះតម្លៃ");
			return;
		}
		setConditions(conditions.filter((_, idx) => idx !== index));
	};

	const handleConditionChange = (
		index: number,
		field: keyof ConditionItem,
		value: any,
	) => {
		setConditions(
			conditions.map((item, idx) => {
				if (idx !== index) return item;
				return { ...item, [field]: value };
			}),
		);
	};

	// Simulation calculations
	const activeConditions = enableDiscount
		? conditions
				.filter(
					(c) =>
						c.discountDays !== "" &&
						c.discount !== "" &&
						Number(c.discount) > 0,
				)
				.sort((a, b) => Number(a.discountDays) - Number(b.discountDays))
		: [];

	const termMutation = useMutation({
		mutationFn: async () => {
			if (!name.trim()) {
				throw new Error("សូមបញ្ចូលឈ្មោះលក្ខខណ្ឌទូទាត់ (Term Name)");
			}
			if (dueDays === undefined || dueDays < 0) {
				throw new Error("ចំនួនថ្ងៃផុតកំណត់ (Due Days) មិនអាចអវិជ្ជមានបានទេ");
			}

			const validConditions = enableDiscount
				? conditions
						.filter((c) => c.discountDays !== "" && c.discount !== "")
						.map((c, idx) => ({
							id: c.id ? Number(c.id) : undefined,
							discountDays: Number(c.discountDays),
							discount: Number(c.discount),
							discountType: c.discountType,
							discounttype: c.discountType.toLowerCase(),
							sequence: idx + 1,
						}))
				: [];

			if (enableDiscount) {
				if (validConditions.length === 0) {
					throw new Error("សូមបញ្ចូលយ៉ាងហោចណាស់មួយដំណាក់កាលបញ្ចុះតម្លៃ (At least 1 discount condition required)");
				}

				const seenDays = new Set<number>();
				for (const c of validConditions) {
					if (c.discountDays < 0) {
						throw new Error("ចំនួនថ្ងៃបញ្ចុះតម្លៃមិនអាចអវិជ្ជមានបានទេ");
					}
					if (c.discount <= 0) {
						throw new Error("ភាគរយ/តម្លៃបញ្ចុះតម្លៃត្រូវតែធំជាង 0");
					}
					if (c.discountType === "PERCENTAGE" && c.discount > 100) {
						throw new Error("ភាគរយបញ្ចុះតម្លៃមិនអាចលើសពី 100% បានទេ");
					}
					if (seenDays.has(c.discountDays)) {
						throw new Error(`ស្ទួនចំនួនថ្ងៃ ${c.discountDays} ថ្ងៃនៅក្នុងដំណាក់កាលបញ្ចុះតម្លៃ`);
					}
					seenDays.add(c.discountDays);
				}
			}

			// If conditions provided and dueDays == 0, auto-elevate dueDays to max discountDays
			let finalDueDays = Number(dueDays);
			if (validConditions.length > 0) {
				const maxCondDays = Math.max(...validConditions.map((c) => c.discountDays));
				if (finalDueDays === 0 || finalDueDays < maxCondDays) {
					finalDueDays = maxCondDays;
				}
			}

			const payload: CreatePaymentTermRequest = {
				name: name.trim(),
				description: description.trim() || undefined,
				dueDays: finalDueDays,
				discountPolicy,
				conditions: validConditions.length > 0 ? validConditions : undefined,
				discountDays:
					validConditions.length > 0
						? validConditions[validConditions.length - 1].discountDays
						: null,
				discountPercentage:
					validConditions.length > 0 &&
					validConditions[0].discountType === "PERCENTAGE"
						? validConditions[0].discount
						: null,
			};

			if (editingTerm?.id) {
				return await paymentTermsApi.update(editingTerm.id, payload);
			} else {
				return await paymentTermsApi.create(payload);
			}
		},
		onSuccess: () => {
			toast.success(
				editingTerm ? "បានកែប្រែលក្ខខណ្ឌទូទាត់ជោគជ័យ" : "បានបង្កើតលក្ខខណ្ឌទូទាត់ថ្មីជោគជ័យ",
				{ description: `លក្ខខណ្ឌ '${name}' ត្រូវបានរក្សាទុក។` },
			);
			queryClient.invalidateQueries({ queryKey: ["payment-terms"] });
			onOpenChange(false);
			if (onSuccess) onSuccess();
		},
		onError: (err) => toast.error(getErrorMessage(err)),
	});

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={editingTerm ? "កែប្រែលក្ខខណ្ឌទូទាត់" : "បង្កើតលក្ខខណ្ឌទូទាត់ថ្មី"}
			subtitle={
				editingTerm
					? "កែប្រែកាលកំណត់ទូទាត់ និងលក្ខខណ្ឌបញ្ចុះតម្លៃ"
					: "កំណត់កាលបរិច្ឆេទផុតកំណត់ និងការបញ្ចុះតម្លៃលើកទឹកចិត្តសម្រាប់ការទូទាត់រហ័ស"
			}
			icon={<Clock className="size-5 text-primary" />}
			size="lg"
			isLoading={termMutation.isPending}
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => onOpenChange(false)} />
					<ModernModalSubmitButton
						onClick={() => termMutation.mutate()}
						isLoading={termMutation.isPending}
						icon={<CheckCircle2 className="size-4" />}
					>
						{editingTerm ? "រក្សាទុកការកែប្រែ" : "បង្កើតលក្ខខណ្ឌទូទាត់"}
					</ModernModalSubmitButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-4 py-1">
				{/* Quick Presets Section */}
				{!editingTerm && (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
								<span>គំរូលក្ខខណ្ឌពេញនិយម (Presets)</span>
							</label>
						</div>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{PRESETS.map((preset) => {
								const isSelected = selectedPresetId === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => applyPreset(preset)}
										className={`p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
											isSelected
												? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/40 shadow-xs"
												: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-primary/50"
										}`}
									>
										<div className="space-y-1 w-full">
											<div className="flex items-center justify-between gap-1">
												<span className="font-semibold text-xs text-foreground truncate">
													{preset.label}
												</span>
												{preset.tag && (
													<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-muted-foreground shrink-0 font-medium">
														{preset.tag}
													</span>
												)}
											</div>
											<p className="text-[10px] text-muted-foreground line-clamp-1">
												{preset.description}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Basic Details (Name, Due Days) */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div className="sm:col-span-2">
						<ModernInput
							label="ឈ្មោះលក្ខខណ្ឌ (Term Name) *"
							placeholder="ឧ. ឥណទាន ៣០ ថ្ងៃ (Net 30)"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								setSelectedPresetId(null);
							}}
							required
						/>
					</div>

					<div>
						<ModernInput
							label="ថ្ងៃផុតកំណត់ (Due Days) *"
							type="number"
							min="0"
							placeholder="ឧ. 30"
							value={dueDays}
							onChange={(e) => {
								setDueDays(
									e.target.value === ""
										? 0
										: Math.max(0, parseInt(e.target.value) || 0),
								);
								setSelectedPresetId(null);
							}}
							suffixAddon="ថ្ងៃ"
							required
						/>
					</div>
				</div>

				{/* Progressive Disclosure Card: Tiered Discounts */}
				<div
					className={`rounded-2xl border transition-all ${
						enableDiscount
							? "border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20"
							: "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50"
					}`}
				>
					<div className="p-3.5 flex items-center justify-between gap-3">
						<div className="space-y-0.5">
							<div className="flex items-center gap-2">
								<Zap className="size-4 text-indigo-600 dark:text-indigo-400" />
								<h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
									លក្ខខណ្ឌបញ្ចុះតម្លៃសម្រាប់ការទូទាត់រហ័ស (Early Payment Discount Conditions)
								</h4>
							</div>
							<p className="text-[11px] text-slate-500 dark:text-slate-400">
								លើកទឹកចិត្តអតិថិជនឱ្យបង់ប្រាក់រហ័សតាមរយៈការបញ្ចុះតម្លៃតាមដំណាក់កាល
							</p>
						</div>

						<ModernSwitch
							checked={enableDiscount}
							onCheckedChange={setEnableDiscount}
							switchSize="sm"
						/>
					</div>

					{/* Expandable Discount Configuration Fields */}
					{enableDiscount && (
						<div className="p-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-3 bg-white dark:bg-slate-900/70 rounded-b-2xl">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<ListOrdered className="size-4 text-indigo-500" />
									<span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
										ដំណាក់កាលបញ្ចុះតម្លៃ ({conditions.length})
									</span>
								</div>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={handleAddCondition}
									className="h-7 text-xs gap-1 rounded-lg border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
								>
									<Plus className="size-3.5" /> បន្ថែមដំណាក់កាល (Add Tier)
								</Button>
							</div>

							<div className="space-y-2">
								{conditions.map((cond, idx) => (
									<div
										key={idx}
										className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
									>
										<div className="sm:col-span-1 flex items-center justify-center font-mono font-bold text-slate-400">
											#{idx + 1}
										</div>

										<div className="sm:col-span-4">
											<label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
												ចំនួនថ្ងៃ (Within Days)
											</label>
											<input
												type="number"
												min="0"
												value={cond.discountDays}
												onChange={(e) =>
													handleConditionChange(
														idx,
														"discountDays",
														e.target.value === ""
															? ""
															: Math.max(0, parseInt(e.target.value) || 0),
													)
												}
												placeholder="e.g. 0, 10, 20"
												className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>

										<div className="sm:col-span-3">
											<label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
												តម្លៃបញ្ចុះ (Discount)
											</label>
											<input
												type="number"
												step="0.01"
												min="0.01"
												value={cond.discount}
												onChange={(e) =>
													handleConditionChange(
														idx,
														"discount",
														e.target.value === ""
															? ""
															: Math.max(0, parseFloat(e.target.value) || 0),
													)
												}
												placeholder="e.g. 7.00"
												className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
											/>
										</div>

										<div className="sm:col-span-3">
											<label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
												ប្រភេទ (Type)
											</label>
											<select
												value={cond.discountType}
												onChange={(e) =>
													handleConditionChange(
														idx,
														"discountType",
														e.target.value,
													)
												}
												className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
											>
												<option value="PERCENTAGE">Percentage (%)</option>
												<option value="FLAT">Flat ($)</option>
											</select>
										</div>

										<div className="sm:col-span-1 flex justify-end">
											<button
												type="button"
												onClick={() => handleRemoveCondition(idx)}
												className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
												title="Remove Tier"
											>
												<Trash2 className="size-3.5" />
											</button>
										</div>
									</div>
								))}
							</div>

							<div>
								<label className="block text-xs font-semibold text-foreground mb-1">
									គោលការណ៍បញ្ចុះតម្លៃ (Policy)
								</label>
								<ModernSelect
									options={POLICY_OPTIONS}
									value={discountPolicy}
									onChange={(val) =>
										setDiscountPolicy(
											val as "FINAL_SETTLEMENT" | "PROPORTIONAL",
										)
									}
									placeholder="ជ្រើសរើសគោលការណ៍..."
								/>
							</div>
						</div>
					)}
				</div>

				{/* Live Simulation / Summary Banner */}
				<div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-3 space-y-2">
					<div className="flex items-center justify-between text-xs">
						<div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
							<Calculator className="size-3.5 text-indigo-500" />
							<span>ការគណនាគំរូជាក់ស្តែង (Simulation on $1,000 Invoice)</span>
						</div>
						<span className="text-[11px] font-mono text-muted-foreground">
							ទឹកប្រាក់ដើម: <strong className="text-foreground">$1,000.00</strong>
						</span>
					</div>

					{activeConditions.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
							{activeConditions.map((cond, i) => {
								const val = Number(cond.discount) || 0;
								const discountAmt =
									cond.discountType === "PERCENTAGE"
										? (simInvoiceAmount * val) / 100
										: val;
								const net = Math.max(0, simInvoiceAmount - discountAmt);
								return (
									<div
										key={i}
										className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col justify-between gap-1"
									>
										<div className="flex items-center justify-between">
											<span className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center gap-1">
												<Zap className="size-3 text-emerald-600 fill-current" />
												{cond.discountDays === 0
													? "COD / Day 0"
													: `ក្នុង ${cond.discountDays} ថ្ងៃ`}
											</span>
											<Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4 font-mono">
												{cond.discountType === "PERCENTAGE"
													? `-${val}%`
													: `-$${val}`}
											</Badge>
										</div>
										<div className="flex items-baseline justify-between pt-0.5">
											<span className="text-[10px] text-muted-foreground">
												ចំណេញ: ${discountAmt.toFixed(2)}
											</span>
											<span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
												${net.toFixed(2)}
											</span>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
							<div className="flex items-center gap-2">
								<div className="size-2 rounded-full bg-slate-400" />
								<span className="text-slate-700 dark:text-slate-300 text-[11px]">
									{dueDays === 0
										? "ទូទាត់ភ្លាមៗនៅថ្ងៃចេញវិក្កយបត្រ (Same Day / COD)"
										: `ទូទាត់ពេញចំនួនក្នុងរយៈពេលកំណត់ ${dueDays} ថ្ងៃ`}
								</span>
							</div>
							<div className="font-mono font-bold text-slate-900 dark:text-slate-100">
								$1,000.00
							</div>
						</div>
					)}
				</div>

				{/* Description Field */}
				<ModernTextarea
					label="ការពិពណ៌នាលម្អិត (Description / Details)"
					placeholder="ឧ. រយៈពេលទូទាត់ស្តង់ដារ ៣០ ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទវិក្កយបត្រ..."
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={2}
				/>
			</div>
		</ModernModal>
	);
}

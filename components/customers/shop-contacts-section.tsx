"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shopContactsApi } from "@/lib/api/endpoints";
import { ShopContact } from "@/lib/types";
import { toast } from "sonner";
import {
	Plus,
	Phone,
	Star,
	User,
	Trash2,
	Edit3,
	Briefcase,
	MessageSquare,
	ShieldCheck,
	Search,
} from "lucide-react";
import { ModernButton } from "@/components/ui-custom/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import {
	ModernInput,
	ModernSwitch,
} from "@/components/ui-custom/form-controls";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check } from "lucide-react";

interface Props {
	customerId: number | string;
	customerName?: string;
}

import { useTranslation } from "@/lib/i18n/context";

export function ShopContactsSection({ customerId, customerName }: Props) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [editingContact, setEditingContact] = useState<ShopContact | null>(
		null,
	);
	const [deletingId, setDeletingId] = useState<string | number | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	const [formState, setFormState] = useState({
		name: "",
		position: "",
		primaryPhone: "",
		secondaryPhone: "",
		description: "",
		isPrimary: false,
	});

	const { data: contacts = [], isLoading } = useQuery({
		queryKey: ["shop-contacts", String(customerId)],
		queryFn: () => shopContactsApi.getByCustomer(customerId),
	});

	const saveMutation = useMutation({
		mutationFn: () => {
			if (editingContact) {
				return shopContactsApi.update(editingContact.id, {
					customerId: Number(editingContact.customerId || customerId),
					...formState,
				});
			}
			return shopContactsApi.create({
				customerId: Number(customerId),
				...formState,
			});
		},
		onSuccess: () => {
			toast.success(
				editingContact
					? "Contact updated"
					: "Shop contact created successfully",
			);
			queryClient.invalidateQueries({
				queryKey: ["shop-contacts", String(customerId)],
			});
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customerId)],
			});
			setIsOpen(false);
			setEditingContact(null);
		},
		onError: (error: any) => {
			const msg =
				error?.response?.data?.message ||
				error?.message ||
				"Failed to save shop contact";
			toast.error(msg);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string | number) => shopContactsApi.remove(id),
		onSuccess: () => {
			toast.success("Contact removed");
			queryClient.invalidateQueries({
				queryKey: ["shop-contacts", String(customerId)],
			});
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customerId)],
			});
			setDeletingId(null);
		},
		onError: (error: any) => {
			const msg =
				error?.response?.data?.message ||
				error?.message ||
				"Failed to delete contact";
			toast.error(msg);
		},
	});

	const openCreate = () => {
		setEditingContact(null);
		setFormState({
			name: "",
			position: "",
			primaryPhone: "",
			secondaryPhone: "",
			description: "",
			isPrimary: contacts.length === 0,
		});
		setIsOpen(true);
	};

	const openEdit = (contact: ShopContact) => {
		setEditingContact(contact);
		setFormState({
			name: contact.name || "",
			position: contact.position || "",
			primaryPhone: contact.primaryPhone || "",
			secondaryPhone: contact.secondaryPhone || "",
			description: contact.description || "",
			isPrimary: !!contact.isPrimary,
		});
		setIsOpen(true);
	};

	const filteredContacts = contacts.filter((c) => {
		if (!searchTerm.trim()) return true;
		const term = searchTerm.toLowerCase();
		return (
			c.name?.toLowerCase().includes(term) ||
			c.position?.toLowerCase().includes(term) ||
			c.primaryPhone?.toLowerCase().includes(term) ||
			c.secondaryPhone?.toLowerCase().includes(term)
		);
	});

	return (
		<div className="space-y-4">
			{/* Header bar */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h3 className="text-base font-bold text-slate-950 dark:text-white">
							{t("customers.contacts")}
						</h3>
						<Badge
							variant="outline"
							className="text-xs font-semibold px-2 py-0.5"
						>
							{contacts.length} Contacts
						</Badge>
					</div>
					<p className="text-xs text-slate-500 mt-0.5">
						Key personnel, store owners, accountants, and decision makers for{" "}
						{customerName || "this customer"}
					</p>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					{contacts.length > 3 && (
						<div className="relative w-full sm:w-48">
							<Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
							<Input
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Filter contacts..."
								className="pl-8 h-9 text-xs rounded-xl"
							/>
						</div>
					)}
					<ModernButton
						onClick={openCreate}
						size="sm"
						variant="primary"
						leftIcon={<Plus className="h-3.5 w-3.5" />}
					>
						{t("customers.addShopContact")}
					</ModernButton>
				</div>
			</div>

			{/* Grid of Contacts */}
			{isLoading ? (
				<div className="py-8 text-center text-xs text-slate-400">
					Loading shop contacts...
				</div>
			) : filteredContacts.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
					<User className="mx-auto h-8 w-8 text-slate-400 mb-2" />
					<p className="text-sm font-bold text-slate-800 dark:text-slate-200">
						{searchTerm
							? "No matching contacts found"
							: "No shop contacts recorded"}
					</p>
					<p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
						{searchTerm
							? "Try adjusting your search keywords."
							: "Add store managers, purchasers, or accountants so staff know exactly who to reach."}
					</p>
					{!searchTerm && (
						<ModernButton
							onClick={openCreate}
							variant="outline"
							size="sm"
							className="mt-4"
							leftIcon={<Plus className="h-3.5 w-3.5" />}
						>
							{t("customers.addShopContact")}
						</ModernButton>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredContacts.map((contact) => (
						<div
							key={contact.id}
							className={`group relative rounded-2xl border p-4.5 transition-all duration-200 ${
								contact.isPrimary
									? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/5 shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
							}`}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="space-y-0.5">
									<div className="flex items-center gap-2">
										<span className="font-bold text-slate-900 dark:text-white text-sm">
											{contact.name}
										</span>
										{contact.isPrimary && (
											<Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] py-0 px-2 font-bold">
												<Star className="h-2.5 w-2.5 mr-1 fill-current" />{" "}
												Primary
											</Badge>
										)}
									</div>
									<p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
										<Briefcase className="h-3 w-3 text-slate-400" />
										{contact.position || "Store Staff"}
									</p>
								</div>

								<div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
									<ModernButton
										variant="ghost"
										size="icon-xs"
										onClick={() => openEdit(contact)}
										title="Edit Contact"
									>
										<Edit3 className="h-3.5 w-3.5 text-slate-500" />
									</ModernButton>
									<ModernButton
										variant="ghost"
										size="icon-xs"
										onClick={() => setDeletingId(contact.id)}
										title="Delete Contact"
										className="hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
									>
										<Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-rose-600" />
									</ModernButton>
								</div>
							</div>

							{/* Phone and Details */}
							<div className="mt-3.5 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-3">
								<div className="flex items-center justify-between">
									<span className="text-slate-400 font-medium">
										{t("customers.primaryPhone")}:
									</span>
									<a
										href={`tel:${contact.primaryPhone}`}
										className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
									>
										<Phone className="h-3 w-3" /> {contact.primaryPhone}
									</a>
								</div>

								{contact.secondaryPhone && (
									<div className="flex items-center justify-between">
										<span className="text-slate-400 font-medium">
											{t("customers.secondaryPhone")}:
										</span>
										<a
											href={`tel:${contact.secondaryPhone}`}
											className="font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1.5"
										>
											<Phone className="h-3 w-3 text-slate-400" />{" "}
											{contact.secondaryPhone}
										</a>
									</div>
								)}

								{contact.description && (
									<p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl mt-1">
										"{contact.description}"
									</p>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Create / Edit Modal */}
			<ModernModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				title={
					editingContact
						? t("customers.editShopContact")
						: t("customers.createShopContact")
				}
				subtitle={
					customerName
						? `Store contact personnel for ${customerName}`
						: "Add a store manager, accountant, or decision maker for this customer."
				}
				size="md"
			>
				<div className="space-y-4 py-2">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<ModernInput
							label={`${t("customers.customerName")} *`}
							value={formState.name}
							onChange={(e) =>
								setFormState({ ...formState, name: e.target.value })
							}
							placeholder="E.g. Sokha Chan"
						/>
						<ModernInput
							label={t("customers.positionRole")}
							value={formState.position}
							onChange={(e) =>
								setFormState({ ...formState, position: e.target.value })
							}
							placeholder="E.g. Store Owner, Inventory Manager, Accountant"
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
						<ModernInput
							label={`${t("customers.primaryPhone")} *`}
							value={formState.primaryPhone}
							onChange={(e) =>
								setFormState({ ...formState, primaryPhone: e.target.value })
							}
							placeholder="E.g. 012 345 678"
						/>
						<ModernInput
							label={t("customers.secondaryPhone")}
							value={formState.secondaryPhone}
							onChange={(e) =>
								setFormState({ ...formState, secondaryPhone: e.target.value })
							}
							placeholder="E.g. 098 765 432"
						/>
					</div>

					<ModernInput
						label={t("customers.descriptionNotes")}
						value={formState.description}
						onChange={(e) =>
							setFormState({ ...formState, description: e.target.value })
						}
						placeholder="E.g. Handles morning purchase orders only"
					/>

					<ModernSwitch
						variant="card"
						label={t("customers.setAsPrimaryContact")}
						description="Calls, messages, and invoices will default to this contact person."
						checked={formState.isPrimary}
						onCheckedChange={(checked) =>
							setFormState({ ...formState, isPrimary: checked })
						}
					/>
				</div>

				<ModernModalFooter>
					<ModernModalCancelButton onClick={() => setIsOpen(false)} />
					<ModernButton
						variant="primary"
						size="md"
						onClick={() => saveMutation.mutate()}
						isLoading={saveMutation.isPending}
						loadingText={editingContact ? "Updating..." : "Saving..."}
						disabled={!formState.name.trim() || !formState.primaryPhone.trim()}
						leftIcon={<Check className="h-4 w-4" />}
					>
						{editingContact
							? t("common.saveChanges")
							: t("customers.createShopContact")}
					</ModernButton>
				</ModernModalFooter>
			</ModernModal>

			{/* Delete Confirmation Alert */}
			<AlertDialog
				open={!!deletingId}
				onOpenChange={(open) => !open && setDeletingId(null)}
			>
				<AlertDialogContent className="rounded-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("customers.editShopContact")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("customers.deleteShopContactConfirm")}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deletingId && deleteMutation.mutate(deletingId)}
							className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
						>
							{t("common.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

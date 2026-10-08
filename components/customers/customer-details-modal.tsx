"use client";

import React from "react";
import { Customer } from "@/lib/types";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { VisitStatusBadge } from "./visit-status-badge";
import { Badge } from "@/components/ui/badge";
import { ModernButton } from "@/components/ui-custom/button";
import Link from "next/link";
import {
	User,
	Phone,
	Building2,
	MapPin,
	Users,
	Truck,
	Zap,
	ExternalLink,
	Calendar,
	Image as ImageIcon,
	Edit3,
	Star,
	FileText,
} from "lucide-react";

interface Props {
	isOpen: boolean;
	onClose: () => void;
	customer: Customer | null;
	onEdit?: (customer: Customer) => void;
	onLogVisit?: (customer: { id: number | string; name: string }) => void;
}

import { useTranslation } from "@/lib/i18n/context";

export function CustomerDetailsModal({
	isOpen,
	onClose,
	customer,
	onEdit,
	onLogVisit,
}: Props) {
	const { t } = useTranslation();
	if (!customer) return null;

	const photo =
		customer.profileUrls?.[0] ||
		customer.profileUrl ||
		customer.imageUrl ||
		"/images/default-customer.png";

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={
				<div className="flex items-center gap-2.5">
					<div className="h-10 w-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-2xs">
						<img
							src={photo}
							alt={customer.name}
							onError={(e) => {
								(e.currentTarget as HTMLImageElement).src =
									"/images/default-customer.png";
							}}
							className="h-full w-full object-cover"
						/>
					</div>
					<div>
						<span className="text-base font-bold text-slate-950 dark:text-white block">
							{customer.name}
						</span>
						{customer.merchantName && (
							<span className="text-xs font-semibold text-slate-500 block">
								🏬 {customer.merchantName}
							</span>
						)}
					</div>
				</div>
			}
			subtitle={customer.address || "Customer Account Overview"}
			size="xl"
		>
			<div className="space-y-5 py-2 max-h-[75vh] overflow-y-auto pr-1">
				{/* Status & Quick Action Strip */}
				<div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
					<div className="flex flex-wrap items-center gap-2">
						<VisitStatusBadge status={customer.visitStatus} />
						<Badge
							variant="outline"
							className={`text-xs font-bold ${
								customer.isActive !== false &&
								customer.active !== false &&
								customer.status !== "Inactive"
									? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10"
									: "text-slate-400 border-slate-300 bg-slate-100 dark:bg-slate-800"
							}`}
						>
							{customer.isActive !== false &&
							customer.active !== false &&
							customer.status !== "Inactive"
								? "Active"
								: "Inactive"}
						</Badge>
						{customer.gender && (
							<Badge
								variant="outline"
								className="text-xs font-semibold border-slate-200 dark:border-slate-800"
							>
								{customer.gender.toUpperCase() === "FEMALE"
									? `♀ ${t("customers.female")}`
									: customer.gender.toUpperCase() === "MALE"
										? `♂ ${t("customers.male")}`
										: customer.gender}
							</Badge>
						)}
						<Badge variant="secondary" className="text-xs font-mono font-bold">
							ID #{customer.id}
						</Badge>
					</div>

					<div className="flex items-center gap-2">
						{onLogVisit && (
							<ModernButton
								variant="warning"
								size="sm"
								onClick={() => {
									onClose();
									onLogVisit({ id: customer.id, name: customer.name });
								}}
								leftIcon={<Zap className="mr-1 h-3.5 w-3.5 fill-current" />}
							>
								{t("customers.logSalesVisit")}
							</ModernButton>
						)}
						<Link href={`/customers/${customer.id}`}>
							<ModernButton
								variant="outline"
								size="sm"
								rightIcon={<ExternalLink className="ml-1 h-3 w-3" />}
							>
								Full 360 Profile
							</ModernButton>
						</Link>
					</div>
				</div>

				{/* Grid of Key Sections */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* Primary Contact Details */}
					<div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2.5">
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<Phone className="h-3.5 w-3.5 text-blue-600" /> Contact & Lines
						</span>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-slate-400">Primary Phone:</span>
								<a
									href={`tel:${customer.phoneNumber || customer.phone}`}
									className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
								>
									<Phone className="h-3 w-3" />{" "}
									{customer.phoneNumber || customer.phone || "—"}
								</a>
							</div>
							{customer.contact && (
								<div className="flex items-center justify-between text-xs">
									<span className="text-slate-400">Contact Person / Alt:</span>
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										{customer.contact}
									</span>
								</div>
							)}
							{customer.email && (
								<div className="flex items-center justify-between text-xs">
									<span className="text-slate-400">Email:</span>
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										{customer.email}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Assigned Staff */}
					<div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2.5">
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<Users className="h-3.5 w-3.5 text-blue-600" /> Assigned Company
							Staff
						</span>
						{customer.staffInfos && customer.staffInfos.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{customer.staffInfos.map((s) => (
									<span
										key={s.id}
										className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
									>
										{s.name}
									</span>
								))}
							</div>
						) : (
							<p className="text-xs text-slate-400 italic">
								No sales staff assigned yet.
							</p>
						)}
					</div>
				</div>

				{/* Location & Administrative Hierarchy */}
				<div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2.5">
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
						<MapPin className="h-3.5 w-3.5 text-emerald-600" /> Location &
						Administrative Details
					</span>

					<p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
						{customer.address || "No street address recorded"}
					</p>

					{customer.addressInfo && (
						<div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl flex flex-wrap gap-x-4 gap-y-1">
							<span>
								<strong>Province:</strong>{" "}
								{customer.addressInfo.province || "—"}
							</span>
							<span>
								<strong>District:</strong>{" "}
								{customer.addressInfo.district || "—"}
							</span>
							<span>
								<strong>Commune:</strong> {customer.addressInfo.commune || "—"}
							</span>
							{customer.addressCode && (
								<span>
									<strong>Code:</strong> {customer.addressCode}
								</span>
							)}
						</div>
					)}

					{customer.lat && customer.lng && (
						<div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
							<span className="font-mono text-emerald-700 dark:text-emerald-400">
								📍 GPS: {customer.lat}, {customer.lng}
							</span>
							<a
								href={`https://www.google.com/maps/search/?api=1&query=${customer.lat},${customer.lng}`}
								target="_blank"
								rel="noopener noreferrer"
								className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
							>
								Open in Google Maps <ExternalLink className="h-3 w-3" />
							</a>
						</div>
					)}
				</div>

				{/* Logistics & Delivery Routes */}
				{((customer.deliveries && customer.deliveries.length > 0) ||
					customer.primaryDelivery) && (
					<div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<Truck className="h-3.5 w-3.5 text-purple-600" /> Logistics &
							Delivery Routes
						</span>

						{customer.primaryDelivery && (
							<div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1.5">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-purple-900 dark:text-purple-200">
										🚚 {customer.primaryDelivery.name}
									</span>
									<Badge className="bg-purple-600 text-white text-[10px] py-0 px-1.5 font-bold">
										Primary Route
									</Badge>
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
									{customer.primaryDelivery.code && (
										<span>
											<strong>Code:</strong> {customer.primaryDelivery.code}
										</span>
									)}
									{customer.primaryDelivery.driverName && (
										<span>
											<strong>Driver:</strong>{" "}
											{customer.primaryDelivery.driverName}
										</span>
									)}
									{customer.primaryDelivery.vehicleNumber && (
										<span>
											<strong>Plate:</strong>{" "}
											{customer.primaryDelivery.vehicleNumber}
										</span>
									)}
									{customer.primaryDelivery.primaryPhone && (
										<span>
											<strong>Phone:</strong>{" "}
											{customer.primaryDelivery.primaryPhone}
										</span>
									)}
									{customer.primaryDelivery.primaryProvince?.provinceEn && (
										<span>
											<strong>Province:</strong>{" "}
											{customer.primaryDelivery.primaryProvince.provinceEn}
										</span>
									)}
								</div>
							</div>
						)}

						{customer.deliveries && customer.deliveries.length > 1 && (
							<div className="space-y-1">
								<span className="text-[11px] font-semibold text-slate-400">
									Other Delivery Routes:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{customer.deliveries
										.filter((d) => d.id !== customer.primaryDelivery?.id)
										.map((d) => (
											<span
												key={d.id}
												className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
											>
												{d.name}
											</span>
										))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* Store Photos */}
				{customer.profileUrls && customer.profileUrls.length > 0 && (
					<div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<ImageIcon className="h-3.5 w-3.5 text-purple-600" /> Store Photos
							& Assets ({customer.profileUrls.length})
						</span>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
							{customer.profileUrls.map((url, i) => (
								<a
									key={i}
									href={url}
									target="_blank"
									rel="noopener noreferrer"
									className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 group relative block"
								>
									<img
										src={url}
										alt={`Store photo ${i + 1}`}
										onError={(e) => {
											(e.currentTarget as HTMLImageElement).src =
												"/images/default-customer.png";
										}}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
									/>
									<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
										View Full Image
									</div>
								</a>
							))}
						</div>
					</div>
				)}

				{/* Description / Bio */}
				{customer.description && (
					<div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
						<span className="text-[11px] font-medium text-slate-400 uppercase block mb-1">
							Notes / Description
						</span>
						<p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
							{customer.description}
						</p>
					</div>
				)}
			</div>

			<ModernModalFooter>
				{onEdit && (
					<ModernButton
						variant="outline"
						size="sm"
						onClick={() => {
							onClose();
							onEdit(customer);
						}}
						leftIcon={<Edit3 className="mr-1.5 h-3.5 w-3.5" />}
					>
						Edit Record
					</ModernButton>
				)}
				<ModernModalCancelButton onClick={onClose} />
			</ModernModalFooter>
		</ModernModal>
	);
}

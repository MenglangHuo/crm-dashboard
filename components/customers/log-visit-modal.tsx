"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/endpoints";
import { toast } from "sonner";
import {
	MapPin,
	Navigation,
	Loader2,
	Calendar,
	User,
	FileText,
} from "lucide-react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { ModernButton } from "@/components/ui-custom/button";
import { Label } from "@/components/ui/label";

interface LogVisitModalProps {
	isOpen: boolean;
	onClose: () => void;
	customer: { id: number | string; name: string } | null;
}

import { useTranslation } from "@/lib/i18n/context";

export function LogVisitModal({
	isOpen,
	onClose,
	customer,
}: LogVisitModalProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [notes, setNotes] = useState("");
	const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
	const [isGettingLocation, setIsGettingLocation] = useState(false);

	const captureLocation = () => {
		if (!navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}
		setIsGettingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				setIsGettingLocation(false);
				toast.success("GPS Location captured successfully");
			},
			(err) => {
				setIsGettingLocation(false);
				toast.error(
					"Could not capture GPS location: " +
						(err.message || "Permission denied"),
				);
			},
			{ enableHighAccuracy: true, timeout: 10000 },
		);
	};

	const visitMutation = useMutation({
		mutationFn: () =>
			customersApi.recordVisit(customer!.id, {
				visitLat: coords.lat != null ? coords.lat : null,
				visitLng: coords.lng != null ? coords.lng : null,
				notes: notes.trim() || undefined,
			}),
		onSuccess: () => {
			toast.success(`Visit logged for ${customer?.name}`);
			queryClient.invalidateQueries({ queryKey: ["customers"] });
			queryClient.invalidateQueries({
				queryKey: ["customer-detail", String(customer?.id)],
			});
			queryClient.invalidateQueries({
				queryKey: ["customer-visits", String(customer?.id)],
			});
			queryClient.invalidateQueries({ queryKey: ["nearby-customers"] });
			queryClient.invalidateQueries({
				queryKey: ["all-customers-map-fallback"],
			});
			setNotes("");
			setCoords({});
			onClose();
		},
		onError: (error: any) => {
			const msg =
				error?.response?.data?.message ||
				error?.message ||
				"Failed to record customer visit";
			toast.error(msg);
		},
	});

	if (!customer) return null;

	return (
		<ModernModal
			isOpen={isOpen}
			onClose={onClose}
			title={`${t("customers.logSalesVisit")} — ${customer.name}`}
			subtitle="Record meeting feedback and attach your current GPS coordinates to update the customer's visit status."
			size="md"
		>
			<div className="space-y-4 py-2">
				{/* GPS Capture Banner */}
				<div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
							<MapPin className="h-4 w-4" />
						</div>
						<div>
							<p className="text-xs font-bold text-slate-900 dark:text-slate-100">
								{t("customers.selectGpsCoordinates")}
							</p>
							<p className="text-[11px] text-slate-500 font-mono mt-0.5">
								{coords.lat && coords.lng
									? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
									: "Location not captured yet"}
							</p>
						</div>
					</div>
					<ModernButton
						variant="outline"
						size="xs"
						onClick={captureLocation}
						disabled={isGettingLocation}
						isLoading={isGettingLocation}
						loadingText="Detecting GPS..."
						leftIcon={<Navigation className="h-3.5 w-3.5 text-emerald-600" />}
					>
						{coords.lat ? "Re-detect GPS" : t("customers.useMyGps")}
					</ModernButton>
				</div>

				{/* Visit Notes */}
				<div className="space-y-1.5">
					<Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
						<FileText className="h-3.5 w-3.5 text-slate-400" />{" "}
						{t("customers.meetingNotes")}
					</Label>
					<textarea
						rows={4}
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="E.g. Visited store to introduce product catalog, verified inventory level, client requested next delivery on Monday..."
						className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-100 transition-all resize-none"
					/>
				</div>
			</div>

			<ModernModalFooter>
				<ModernModalCancelButton onClick={onClose} />
				<ModernModalSubmitButton
					onClick={() => visitMutation.mutate()}
					isLoading={visitMutation.isPending}
					loadingText="Recording Visit..."
				>
					{t("customers.confirmVisit")}
				</ModernModalSubmitButton>
			</ModernModalFooter>
		</ModernModal>
	);
}

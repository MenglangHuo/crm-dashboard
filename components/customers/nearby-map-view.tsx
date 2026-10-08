"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/endpoints";
import { Customer, CustomerNearbyResult } from "@/lib/types";
import { VisitStatusBadge } from "./visit-status-badge";
import { LeafletMap } from "./leaflet-map";
import {
	MapPin,
	Navigation,
	Compass,
	Phone,
	ExternalLink,
	Loader2,
	Users,
	Building2,
	Zap,
	Map as MapIcon,
	LayoutGrid,
	Image as ImageIcon,
	LocateFixed,
} from "lucide-react";
import { ModernButton } from "@/components/ui-custom/button";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
	onLogVisit: (customer: { id: number | string; name: string }) => void;
}

// Default coordinates for center point (Phnom Penh / User target coords)
const DEFAULT_CENTER = { lat: 11.764375227912407, lng: 105.02562655365823 };

export function NearbyMapView({ onLogVisit }: Props) {
	const [coords, setCoords] = useState<{ lat: number; lng: number }>(
		DEFAULT_CENTER,
	);
	const [hasUserGps, setHasUserGps] = useState(false);
	const [radiusKm, setRadiusKm] = useState<number | null>(30); // Default 30 km (or null for Top 10 Nearest)
	const [nearbySubView, setNearbySubView] = useState<"map" | "cards">("map");
	const [isDetecting, setIsDetecting] = useState(false);

	// 1. Automatically attempt to detect user GPS on mount
	useEffect(() => {
		if (typeof window !== "undefined" && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
					setHasUserGps(true);
				},
				() => {
					// Keep default center silently if not permitted
				},
				{ enableHighAccuracy: true, timeout: 6000 },
			);
		}
	}, []);

	const handleGetCurrentLocation = () => {
		if (!navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}
		setIsDetecting(true);
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				setHasUserGps(true);
				setIsDetecting(false);
				toast.success("GPS Location updated successfully");
			},
			(err) => {
				setIsDetecting(false);
				setCoords(DEFAULT_CENTER);
				toast.info("Using center coordinates fallback");
			},
			{ enableHighAccuracy: true, timeout: 8000 },
		);
	};

	// 2. Fetch Nearby Customers from /customers/nearby with exact body
	const { data: nearbyResults = [], isLoading: isLoadingNearby } = useQuery({
		queryKey: ["nearby-customers", coords.lat, coords.lng, radiusKm],
		queryFn: async () => {
			try {
				const results = await customersApi.findNearby({
					lat: coords.lat,
					lng: coords.lng,
					radiusKm: radiusKm !== null ? Number(radiusKm) : null,
					limit: radiusKm === null ? 10 : undefined,
				});
				if (Array.isArray(results) && results.length > 0) {
					return results;
				}
			} catch (err) {
				console.warn(
					"findNearby returned error, falling back to all customers",
					err,
				);
			}
			return [];
		},
	});

	// 3. Fallback Query: Fetch all customers with GPS so map is populated immediately if no nearby match
	const { data: allCustomersData, isLoading: isLoadingAll } = useQuery({
		queryKey: ["all-customers-map-fallback"],
		queryFn: () => customersApi.list({ limit: 100 }),
		enabled: nearbyResults.length === 0,
	});

	const allCustomersWithGps: Customer[] = (
		allCustomersData?.items || []
	).filter(
		(c) => c.lat && c.lng && !isNaN(Number(c.lat)) && !isNaN(Number(c.lng)),
	);

	// Merge items to display
	const displayItems: Array<{ customer: Customer; distance?: string }> =
		nearbyResults.length > 0
			? nearbyResults
			: allCustomersWithGps.map((c) => ({
					customer: c,
					distance: "Location Pin",
				}));

	const isLoading =
		isLoadingNearby || (nearbyResults.length === 0 && isLoadingAll);

	// Format markers for Leaflet Map
	const mapMarkers = displayItems.map(({ customer, distance }) => {
		const rawLastVisited =
			customer.visitStatus?.lastVisitedAt ||
			(customer as any)?.lastVisitedAt ||
			null;
		const rawDaysSince =
			customer.visitStatus?.daysSinceVisit !== undefined
				? customer.visitStatus.daysSinceVisit
				: null;

		return {
			id: customer.id,
			lat: Number(customer.lat),
			lng: Number(customer.lng),
			title: customer.name,
			subtitle: customer.merchantName || customer.address,
			photoUrl:
				customer.profileUrls?.[0] ||
				customer.profileUrl ||
				customer.imageUrl ||
				"/images/default-customer.png",
			distance,
			visitStatus: customer.visitStatus
				? {
						label: customer.visitStatus.label,
						color: customer.visitStatus.color,
						icon: customer.visitStatus.icon,
						lastVisitedAt: rawLastVisited,
						daysSinceVisit: rawDaysSince,
					}
				: null,
			lastVisitedAt: rawLastVisited,
			daysSinceVisit: rawDaysSince,
			phone: customer.phoneNumber || customer.phone || customer.contact,
			rawCustomer: customer,
		};
	});

	return (
		<div className="space-y-4">
			{/* Control Strip */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-xs">
				<div className="flex flex-wrap items-center gap-3">
					<ModernButton
						variant={hasUserGps ? "success" : "outline"}
						size="sm"
						onClick={handleGetCurrentLocation}
						disabled={isDetecting}
						isLoading={isDetecting}
						loadingText="Detecting GPS..."
						leftIcon={<LocateFixed className="h-3.5 w-3.5" />}
					>
						{hasUserGps ? "My GPS Active" : "Detect My Live GPS"}
					</ModernButton>

					<ModernButton
						variant="ghost"
						size="xs"
						onClick={() => {
							setCoords(DEFAULT_CENTER);
							setHasUserGps(false);
							toast.info("Reset to target center location");
						}}
						className="text-xs text-slate-500"
					>
						Reset Center
					</ModernButton>

					<div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
						<span className="font-semibold text-slate-700 dark:text-slate-300">
							Center:
						</span>
						<span>
							{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
						</span>
						{hasUserGps && (
							<span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
								Live GPS
							</span>
						)}
					</div>
				</div>

				{/* View Mode & Radius Selector */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Radius Options */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onClick={() => setRadiusKm(null)}
							className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
								radiusKm === null
									? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							Nearest (Top 10)
						</button>
						{[5, 10, 20, 30, 50].map((km) => (
							<button
								key={km}
								type="button"
								onClick={() => setRadiusKm(km)}
								className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
									radiusKm === km
										? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs"
										: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
								}`}
							>
								{km} km
							</button>
						))}
					</div>

					{/* Map vs Cards Sub-View Switcher */}
					<div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
						<button
							type="button"
							onClick={() => setNearbySubView("map")}
							className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
								nearbySubView === "map"
									? "bg-blue-600 text-white shadow-xs"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<MapIcon className="h-3.5 w-3.5" /> Map View
						</button>
						<button
							type="button"
							onClick={() => setNearbySubView("cards")}
							className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
								nearbySubView === "cards"
									? "bg-blue-600 text-white shadow-xs"
									: "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<LayoutGrid className="h-3.5 w-3.5" /> Cards View
						</button>
					</div>
				</div>
			</div>

			{/* Main Map / Cards View (Rendered by default) */}
			{isLoading ? (
				<div className="py-20 text-center text-xs text-slate-400 bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800">
					<Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400 mb-2" />
					Loading map coordinates and computing geographic routes...
				</div>
			) : displayItems.length === 0 ? (
				<div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 bg-white dark:bg-slate-950">
					No customer stores found with GPS coordinates. Add or edit customers
					to assign GPS coordinates.
				</div>
			) : nearbySubView === "map" ? (
				/* Option A: Leaflet Interactive Map View (Active by default) */
				<div className="space-y-3">
					<LeafletMap
						markers={mapMarkers}
						center={[coords.lat, coords.lng]}
						zoom={12}
						height="560px"
						onMarkerAction={(cust) => onLogVisit(cust)}
					/>
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs text-slate-500 px-2">
						<span>
							Showing <strong>{mapMarkers.length}</strong> customer stores on
							map
						</span>
						<span className="text-[11px] text-slate-400">
							Pins are color-coded by Visit Aging Status. Click any marker for
							store details & 1-click visit check-in.
						</span>
					</div>
				</div>
			) : (
				/* Option B: Card Grid View with Store Profile Photos */
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{displayItems.map(({ customer, distance }) => {
						const photoUrl =
							customer.profileUrls?.[0] ||
							customer.profileUrl ||
							customer.imageUrl ||
							"/images/default-customer.png";
						return (
							<div
								key={customer.id}
								className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden space-y-3.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
							>
								{/* Store Photo Cover */}
								<div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
									<img
										src={photoUrl}
										alt={customer.name}
										onError={(e) => {
											(e.currentTarget as HTMLImageElement).src =
												"/images/default-customer.png";
										}}
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
									/>
									{distance && (
										<span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-slate-950/80 backdrop-blur-md text-white shadow-md">
											⚡ {distance}
										</span>
									)}
								</div>

								<div className="p-5 pt-0 space-y-3 flex-1 flex flex-col justify-between">
									<div>
										<div className="flex items-start justify-between gap-2">
											<h4 className="font-black text-slate-950 dark:text-white text-sm">
												{customer.name}
											</h4>
										</div>
										{customer.merchantName && (
											<p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
												🏬 {customer.merchantName}
											</p>
										)}
										<p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
											{customer.address ||
												customer.addressInfo?.province ||
												"No address text"}
										</p>
									</div>

									{/* Status & Staff */}
									<div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
										<VisitStatusBadge status={customer.visitStatus} />

										{customer.staffInfos && customer.staffInfos.length > 0 ? (
											<span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
												{customer.staffInfos[0].name.split(" ")[0]}
												{customer.staffInfos.length > 1
													? ` +${customer.staffInfos.length - 1}`
													: ""}
											</span>
										) : (
											<span className="text-[10px] text-slate-400">
												Unassigned
											</span>
										)}
									</div>

									{/* Contact Phone */}
									{(customer.phoneNumber ||
										customer.phone ||
										customer.contact) && (
										<div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl flex items-center justify-between">
											<span className="text-slate-400 font-medium">Phone:</span>
											<a
												href={`tel:${customer.phoneNumber || customer.phone}`}
												className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
											>
												<Phone className="h-3 w-3" />{" "}
												{customer.phoneNumber ||
													customer.phone ||
													customer.contact}
											</a>
										</div>
									)}

									{/* Action Buttons */}
									<div className="pt-2 flex items-center justify-between gap-2">
										<Link
											href={`/customers/${customer.id}`}
											className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white inline-flex items-center gap-1"
										>
											360 Profile <ExternalLink className="h-3 w-3" />
										</Link>

										<ModernButton
											variant="warning"
											size="xs"
											onClick={() =>
												onLogVisit({ id: customer.id, name: customer.name })
											}
											leftIcon={<Zap className="mr-1 h-3 w-3 fill-current" />}
										>
											Log Visit
										</ModernButton>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

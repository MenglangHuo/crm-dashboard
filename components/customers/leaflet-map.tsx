"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "@/lib/types";
import {
	Loader2,
	Layers,
	Navigation,
	ZoomIn,
	ZoomOut,
	MapPin,
} from "lucide-react";

declare global {
	interface Window {
		L: any;
	}
}

interface MapMarkerItem {
	id: number | string;
	lat: number;
	lng: number;
	title: string;
	subtitle?: string;
	photoUrl?: string;
	distance?: string;
	visitStatus?: {
		label: string;
		color: string;
		icon: string;
		lastVisitedAt?: string | null;
		daysSinceVisit?: number | null;
	} | null;
	lastVisitedAt?: string | null;
	daysSinceVisit?: number | null;
	phone?: string;
	rawCustomer?: Customer;
}

interface LeafletMapProps {
	markers?: MapMarkerItem[];
	center?: [number, number];
	zoom?: number;
	height?: string;
	selectable?: boolean;
	selectedPosition?: { lat: number; lng: number } | null;
	onSelectPosition?: (pos: { lat: number; lng: number }) => void;
	onMarkerAction?: (customer: { id: number | string; name: string }) => void;
	className?: string;
}

function escapeHtml(str?: string | null): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatLastVisitedInfo(
	lastVisitedAt?: string | null,
	daysSinceVisit?: number | null,
	visitStatusLabel?: string,
) {
	if (lastVisitedAt) {
		try {
			const date = new Date(lastVisitedAt);
			if (!isNaN(date.getTime())) {
				const now = new Date();
				const diffMs = now.getTime() - date.getTime();
				const diffDays = Math.max(
					0,
					Math.floor(diffMs / (1000 * 60 * 60 * 24)),
				);
				const effectiveDays =
					daysSinceVisit !== undefined &&
					daysSinceVisit !== null &&
					!isNaN(daysSinceVisit)
						? daysSinceVisit
						: diffDays;

				const formattedDate = date.toLocaleDateString("en-GB", {
					day: "numeric",
					month: "short",
					year: "numeric",
				});

				let relativeLabel = "";
				let badgeBg = "#eff6ff";
				let badgeColor = "#2563eb";

				if (effectiveDays <= 0) {
					relativeLabel = "Today";
					badgeBg = "#fff7ed";
					badgeColor = "#ea580c";
				} else if (effectiveDays === 1) {
					relativeLabel = "Yesterday";
					badgeBg = "#f0fdf4";
					badgeColor = "#16a34a";
				} else if (effectiveDays < 7) {
					relativeLabel = `${effectiveDays}d ago`;
					badgeBg = "#f0fdf4";
					badgeColor = "#16a34a";
				} else if (effectiveDays < 30) {
					const weeks = Math.floor(effectiveDays / 7);
					relativeLabel = `${weeks}w ago`;
					badgeBg = "#eff6ff";
					badgeColor = "#2563eb";
				} else if (effectiveDays < 365) {
					const months = Math.floor(effectiveDays / 30);
					relativeLabel = `${months}mo ago`;
					badgeBg = "#fefce8";
					badgeColor = "#ca8a04";
				} else {
					const years = Math.floor(effectiveDays / 365);
					relativeLabel = `${years}y ago`;
					badgeBg = "#fef2f2";
					badgeColor = "#dc2626";
				}

				return {
					hasVisit: true,
					displayHtml: `
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 5px;">
              <span style="font-weight: 700; color: #0f172a; font-size: 11px;">${formattedDate}</span>
              <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 10px; padding: 1.5px 6px; border-radius: 6px; white-space: nowrap;">${relativeLabel}</span>
            </div>
          `,
				};
			}
		} catch {
			// Fall through to other checks
		}
	}

	if (
		daysSinceVisit !== undefined &&
		daysSinceVisit !== null &&
		!isNaN(daysSinceVisit)
	) {
		let relativeLabel = "";
		let badgeBg = "#eff6ff";
		let badgeColor = "#2563eb";

		if (daysSinceVisit <= 0) {
			relativeLabel = "Today";
			badgeBg = "#fff7ed";
			badgeColor = "#ea580c";
		} else if (daysSinceVisit === 1) {
			relativeLabel = "Yesterday";
			badgeBg = "#f0fdf4";
			badgeColor = "#16a34a";
		} else if (daysSinceVisit < 7) {
			relativeLabel = `${daysSinceVisit}d ago`;
			badgeBg = "#f0fdf4";
			badgeColor = "#16a34a";
		} else if (daysSinceVisit < 30) {
			const weeks = Math.floor(daysSinceVisit / 7);
			relativeLabel = `${weeks}w ago`;
			badgeBg = "#eff6ff";
			badgeColor = "#2563eb";
		} else if (daysSinceVisit < 365) {
			const months = Math.floor(daysSinceVisit / 30);
			relativeLabel = `${months}mo ago`;
			badgeBg = "#fefce8";
			badgeColor = "#ca8a04";
		} else {
			const years = Math.floor(daysSinceVisit / 365);
			relativeLabel = `${years}y ago`;
			badgeBg = "#fef2f2";
			badgeColor = "#dc2626";
		}

		return {
			hasVisit: true,
			displayHtml: `
        <span style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 800; font-size: 10px; padding: 1.5px 7px; border-radius: 6px;">${relativeLabel} (${daysSinceVisit}d)</span>
      `,
		};
	}

	return {
		hasVisit: false,
		displayHtml: `
      <span style="color: #94a3b8; font-style: italic; font-weight: 600; font-size: 11px;">Never visited</span>
    `,
	};
}

function getVisitPinStyle(
	status?: { label?: string; color?: string; icon?: string } | null,
) {
	const defaultMapIcon = "📍";
	const providedIcon =
		status?.icon && status.icon.trim() !== "" ? status.icon.trim() : null;

	if (!status || !status.label) {
		return {
			color: "#64748b", // Slate gray for Never Visited
			icon: providedIcon || defaultMapIcon,
			label: "Never Visited",
			bgBadge:
				"background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;",
		};
	}

	const labelLower = status.label.toLowerCase();
	const customColor =
		status.color && status.color.trim() !== "" ? status.color : null;

	if (labelLower.includes("just") || labelLower.includes("today")) {
		return {
			color: customColor || "#FF8C00", // Orange
			icon: providedIcon || defaultMapIcon,
			label: status.label || "Just Visited",
			bgBadge:
				"background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;",
		};
	}
	if (
		labelLower.includes("1 week") ||
		(labelLower.includes("week") && !labelLower.includes("2"))
	) {
		return {
			color: customColor || "#22C55E", // Green
			icon: providedIcon || defaultMapIcon,
			label: status.label || "1 Week",
			bgBadge:
				"background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;",
		};
	}
	if (labelLower.includes("2 week")) {
		return {
			color: customColor || "#3B82F6", // Blue
			icon: providedIcon || defaultMapIcon,
			label: status.label || "2 Weeks",
			bgBadge:
				"background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;",
		};
	}
	if (
		labelLower.includes("1 month") ||
		(labelLower.includes("month") &&
			!labelLower.includes("3") &&
			!labelLower.includes("6"))
	) {
		return {
			color: customColor || "#EAB308", // Yellow
			icon: providedIcon || defaultMapIcon,
			label: status.label || "1 Month",
			bgBadge:
				"background: #fefce8; color: #a16207; border: 1px solid #fef08a;",
		};
	}
	if (labelLower.includes("3 month")) {
		return {
			color: customColor || "#EF4444", // Red
			icon: providedIcon || defaultMapIcon,
			label: status.label || "3 Months",
			bgBadge:
				"background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;",
		};
	}
	if (labelLower.includes("6 month") || labelLower.includes("6+")) {
		return {
			color: customColor || "#1F2937", // Dark
			icon: providedIcon || defaultMapIcon,
			label: status.label || "6 Months+",
			bgBadge:
				"background: #f8fafc; color: #1e293b; border: 1px solid #94a3b8;",
		};
	}

	return {
		color: customColor || "#3B82F6",
		icon: providedIcon || defaultMapIcon,
		label: status.label,
		bgBadge: "background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;",
	};
}

export function LeafletMap({
	markers = [],
	center = [11.5564, 104.9282], // Default Phnom Penh Center
	zoom = 12,
	height = "450px",
	selectable = false,
	selectedPosition,
	onSelectPosition,
	onMarkerAction,
	className = "",
}: LeafletMapProps) {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<any>(null);
	const markerGroupRef = useRef<any>(null);
	const pickerMarkerRef = useRef<any>(null);
	const currentTileLayerRef = useRef<any>(null);

	const onSelectPositionRef = useRef(onSelectPosition);
	useEffect(() => {
		onSelectPositionRef.current = onSelectPosition;
	}, [onSelectPosition]);

	const selectableRef = useRef(selectable);
	useEffect(() => {
		selectableRef.current = selectable;
	}, [selectable]);

	const [isLoaded, setIsLoaded] = useState(false);
	const [activeLayer, setActiveLayer] = useState<"streets" | "satellite">(
		"streets",
	);

	// 1. Dynamically load Leaflet assets if not present
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Inject CSS
		const existingCss = document.getElementById("leaflet-css");
		if (!existingCss) {
			const link = document.createElement("link");
			link.id = "leaflet-css";
			link.rel = "stylesheet";
			link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
			document.head.appendChild(link);
		}

		if (window.L) {
			setIsLoaded(true);
			return;
		}

		// Inject JS
		const existingScript = document.getElementById("leaflet-script");
		if (!existingScript) {
			const script = document.createElement("script");
			script.id = "leaflet-script";
			script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
			script.async = true;
			script.onload = () => setIsLoaded(true);
			document.body.appendChild(script);
		} else {
			existingScript.addEventListener("load", () => setIsLoaded(true));
		}
	}, []);

	// 2. Initialize Leaflet Map
	useEffect(() => {
		if (
			!isLoaded ||
			!mapContainerRef.current ||
			mapInstanceRef.current ||
			!window.L
		)
			return;

		const L = window.L;

		const initialLat = selectedPosition?.lat || center[0];
		const initialLng = selectedPosition?.lng || center[1];

		const map = L.map(mapContainerRef.current, {
			center: [initialLat, initialLng],
			zoom: zoom,
			zoomControl: false,
		});

		mapInstanceRef.current = map;

		// Tile Layers: Standard Streets vs Satellite Imagery
		const streetTile = L.tileLayer(
			"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			{
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
				maxZoom: 19,
			},
		);

		currentTileLayerRef.current = streetTile;
		streetTile.addTo(map);

		// Create marker group
		const markerGroup = L.layerGroup().addTo(map);
		markerGroupRef.current = markerGroup;

		// Map click for coordinate picking
		map.on("click", (e: any) => {
			if (selectableRef.current && onSelectPositionRef.current) {
				const { lat, lng } = e.latlng;
				onSelectPositionRef.current({ lat, lng });
			}
		});

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
			}
		};
	}, [isLoaded]);

	// 3. Switch Tile Layers
	const handleLayerChange = (layerType: "streets" | "satellite") => {
		if (!mapInstanceRef.current || !window.L) return;
		const L = window.L;
		const map = mapInstanceRef.current;

		if (currentTileLayerRef.current) {
			map.removeLayer(currentTileLayerRef.current);
		}

		if (layerType === "satellite") {
			const satTile = L.tileLayer(
				"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
				{
					attribution:
						"Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye",
					maxZoom: 18,
				},
			);
			satTile.addTo(map);
			currentTileLayerRef.current = satTile;
		} else {
			const streetTile = L.tileLayer(
				"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
				{
					attribution: "&copy; OpenStreetMap contributors",
					maxZoom: 19,
				},
			);
			streetTile.addTo(map);
			currentTileLayerRef.current = streetTile;
		}
		setActiveLayer(layerType);
	};

	// 4. Update Markers & Center Location
	useEffect(() => {
		if (!mapInstanceRef.current || !window.L || !markerGroupRef.current) return;
		const L = window.L;
		const map = mapInstanceRef.current;
		const markerGroup = markerGroupRef.current;

		markerGroup.clearLayers();

		// Add Center Location Pin if center coords are provided
		if (
			center &&
			center[0] &&
			center[1] &&
			!isNaN(center[0]) &&
			!isNaN(center[1])
		) {
			const centerIcon = L.divIcon({
				className: "custom-center-pin",
				html: `
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.25);
              border: 1px solid rgba(37, 99, 235, 0.5);
            "></div>
            <div style="
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #2563eb;
              border: 2.5px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.35);
            "></div>
          </div>
        `,
				iconSize: [28, 28],
				iconAnchor: [14, 14],
				popupAnchor: [0, -14],
			});
			const centerMarker = L.marker([center[0], center[1]], {
				icon: centerIcon,
			});
			centerMarker.bindPopup(`
        <div style="font-family: inherit; min-width: 150px;">
          <div style="font-weight: 800; font-size: 12px; color: #1e293b;">📍 Search Center Location</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace; margin-top: 2px;">
            ${center[0].toFixed(5)}, ${center[1].toFixed(5)}
          </div>
        </div>
      `);
			markerGroup.addLayer(centerMarker);
		}

		if (markers.length > 0) {
			const bounds = L.latLngBounds([]);
			if (center && center[0] && center[1]) {
				bounds.extend([center[0], center[1]]);
			}

			markers.forEach((m) => {
				if (!m.lat || !m.lng || isNaN(m.lat) || isNaN(m.lng)) return;

				// 1. Dynamic pin color and icon resolution based on API visitStatus
				const pinStyle = getVisitPinStyle(m.visitStatus);
				const statusColor = pinStyle.color;

				const customIcon = L.divIcon({
					className: "custom-map-pin",
					html: `
            <div style="
              background-color: ${statusColor};
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2.5px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            ">
              <span style="
                transform: rotate(45deg);
                font-size: 19px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
              ">
                ${pinStyle.icon}
              </span>
            </div>
          `,
					iconSize: [38, 38],
					iconAnchor: [19, 38],
					popupAnchor: [0, -38],
				});

				const marker = L.marker([m.lat, m.lng], { icon: customIcon });

				// 2. Safe Photo HTML with automatic fallback to default customer image on error
				const photoSrc = m.photoUrl || "/images/default-customer.png";
				const safePhotoSrc = escapeHtml(photoSrc);
				const safeTitle = escapeHtml(m.title);
				const safeSubtitle = escapeHtml(m.subtitle);
				const safePhone = escapeHtml(m.phone);
				const safeDistance = escapeHtml(m.distance);

				const photoHtml = `
          <div style="width: 100%; height: 95px; border-radius: 12px; overflow: hidden; margin-bottom: 8px; background-color: #f1f5f9; position: relative;">
            <img
              src="${safePhotoSrc}"
              alt="${safeTitle}"
              onerror="this.onerror=null; this.src='/images/default-customer.png';"
              style="width: 100%; height: 100%; object-fit: cover; display: block;"
            />
          </div>
        `;

				const distanceBadge = safeDistance
					? `<span style="background: #eff6ff; color: #1d4ed8; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 9999px; white-space: nowrap;">⚡ ${safeDistance}</span>`
					: "";

				const visitStatusBadge = `
          <span style="font-size: 11px; font-weight: 700; padding: 2.5px 9px; border-radius: 9999px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; ${pinStyle.bgBadge}">
            <span style="font-size: 13px;">${pinStyle.icon}</span> <span>${pinStyle.label}</span>
          </span>
        `;

				// Extract lastVisitedAt and daysSinceVisit
				const lastVisitedAt =
					m.lastVisitedAt ||
					m.visitStatus?.lastVisitedAt ||
					m.rawCustomer?.visitStatus?.lastVisitedAt ||
					(m.rawCustomer as any)?.lastVisitedAt ||
					null;

				const daysSinceVisit =
					m.daysSinceVisit !== undefined && m.daysSinceVisit !== null
						? m.daysSinceVisit
						: m.visitStatus?.daysSinceVisit !== undefined &&
								m.visitStatus?.daysSinceVisit !== null
							? m.visitStatus.daysSinceVisit
							: m.rawCustomer?.visitStatus?.daysSinceVisit !== undefined &&
									m.rawCustomer?.visitStatus?.daysSinceVisit !== null
								? m.rawCustomer.visitStatus.daysSinceVisit
								: null;

				const visitedInfo = formatLastVisitedInfo(
					lastVisitedAt,
					daysSinceVisit,
					m.visitStatus?.label,
				);

				const popupContent = document.createElement("div");
				popupContent.style.minWidth = "230px";
				popupContent.style.maxWidth = "280px";
				popupContent.style.fontFamily = "inherit";
				const safeId = encodeURIComponent(String(m.id));

				popupContent.innerHTML = `
          ${photoHtml}
          <div style="display: flex; justify-content: space-between; align-items: start; gap: 6px; margin-bottom: 3px;">
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; line-height: 1.3;">${safeTitle}</div>
            ${distanceBadge}
          </div>
          ${safeSubtitle ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.2;">${safeSubtitle}</div>` : ""}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 7px;">
            ${visitStatusBadge}
            ${safePhone ? `<a href="tel:${safePhone}" style="font-size: 11px; color: #2563eb; font-weight: 700; text-decoration: none;">📞 ${safePhone}</a>` : ""}
          </div>
          <div style="
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 5px 9px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            font-size: 11px;
          ">
            <div style="display: flex; align-items: center; gap: 4.5px; color: #64748b; font-weight: 600; white-space: nowrap;">
              <span style="font-size: 12px;">🕒</span>
              <span style="color: #475569;">Last Visited:</span>
            </div>
            <div style="text-align: right; overflow: hidden;">
              ${visitedInfo.displayHtml}
            </div>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <a href="/customers/${safeId}" style="
              flex: 1;
              text-align: center;
              background: #f1f5f9;
              color: #0f172a;
              font-size: 11px;
              font-weight: 700;
              padding: 7px 6px;
              border-radius: 8px;
              text-decoration: none;
              border: 1px solid #e2e8f0;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            ">360 View</a>
            <button id="btn-visit-${safeId}" style="
              flex: 1;
              background: #f59e0b;
              color: #0f172a;
              font-size: 11px;
              font-weight: 800;
              padding: 7px 6px;
              border-radius: 8px;
              border: none;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">⚡ Log Visit</button>
          </div>
        `;

				// Add event listener to popup button
				marker.bindPopup(popupContent);
				marker.on("popupopen", () => {
					const btn = document.getElementById(`btn-visit-${safeId}`);
					if (btn && onMarkerAction) {
						btn.onclick = () => onMarkerAction({ id: m.id, name: m.title });
					}
				});

				markerGroup.addLayer(marker);
				bounds.extend([m.lat, m.lng]);
			});

			if (bounds.isValid()) {
				map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
			}
		} else if (center && center[0] && center[1]) {
			map.setView([center[0], center[1]], 12);
		}
	}, [markers, center, isLoaded]);

	// 5. Update Selected Position (Picker Mode)
	useEffect(() => {
		if (!mapInstanceRef.current || !window.L || !selectable) return;
		const L = window.L;
		const map = mapInstanceRef.current;

		if (selectedPosition?.lat && selectedPosition?.lng) {
			if (pickerMarkerRef.current) {
				pickerMarkerRef.current.setLatLng([
					selectedPosition.lat,
					selectedPosition.lng,
				]);
			} else {
				const pickerIcon = L.divIcon({
					className: "custom-picker-pin",
					html: `
            <div style="
              background-color: #ef4444;
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
            ">
              <span style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 16px;">📍</span>
            </div>
          `,
					iconSize: [36, 36],
					iconAnchor: [18, 36],
				});

				const marker = L.marker([selectedPosition.lat, selectedPosition.lng], {
					icon: pickerIcon,
					draggable: true,
				}).addTo(map);

				marker.on("dragend", (e: any) => {
					const { lat, lng } = e.target.getLatLng();
					if (onSelectPosition) {
						onSelectPosition({ lat, lng });
					}
				});

				pickerMarkerRef.current = marker;
			}
			map.panTo([selectedPosition.lat, selectedPosition.lng]);
		}
	}, [selectedPosition, isLoaded, selectable]);

	return (
		<div
			className={`relative isolate z-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs ${className}`}
		>
			{/* Map Element */}
			<div ref={mapContainerRef} style={{ height, width: "100%" }} />

			{!isLoaded && (
				<div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-500 gap-2">
					<Loader2 className="h-4 w-4 animate-spin text-slate-400" />
					Loading Leaflet Maps Engine...
				</div>
			)}

			{/* Floating Map Controls */}
			{isLoaded && (
				<div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
					{/* Layer Switcher (2 Layer Types: Street & Satellite) */}
					<div className="flex bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
						<button
							type="button"
							onClick={() => handleLayerChange("streets")}
							className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all ${
								activeLayer === "streets"
									? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							Streets
						</button>
						<button
							type="button"
							onClick={() => handleLayerChange("satellite")}
							className={`px-2.5 py-1 text-[11px] font-bold rounded-xl transition-all ${
								activeLayer === "satellite"
									? "bg-emerald-600 text-white shadow-xs"
									: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
							}`}
						>
							Satellite
						</button>
					</div>

					{/* Zoom controls */}
					<div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
						<button
							type="button"
							onClick={() => mapInstanceRef.current?.zoomIn()}
							className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800"
							title="Zoom In"
						>
							<ZoomIn className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => mapInstanceRef.current?.zoomOut()}
							className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							title="Zoom Out"
						>
							<ZoomOut className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}

			{/* Selectable Helper Tip */}
			{selectable && (
				<div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
					<MapPin className="h-3.5 w-3.5 text-rose-400" />
					<span>
						Click anywhere on the map or drag the pin to select GPS coordinates
					</span>
				</div>
			)}
		</div>
	);
}

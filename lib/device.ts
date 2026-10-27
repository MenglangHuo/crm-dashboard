import type { DeviceInfoRequest, DeviceType } from "@/lib/types";

const DEVICE_ID_KEY = "crm_device_id";

/**
 * Retrieves the persistent device ID for this client browser / device,
 * or generates and persists a new UUID if this is the first visit.
 */
export function getOrCreateDeviceId(): string {
	if (typeof window === "undefined") {
		return "server-node";
	}

	try {
		let deviceId = localStorage.getItem(DEVICE_ID_KEY);
		if (!deviceId || !deviceId.trim()) {
			deviceId = crypto.randomUUID();
			localStorage.setItem(DEVICE_ID_KEY, deviceId);
		}

		// Sync with cookie so Next.js server actions or proxy can optionally read it
		document.cookie = `${DEVICE_ID_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=31536000; SameSite=Lax`;
		return deviceId;
	} catch {
		return "browser-fallback-id";
	}
}

/**
 * Detects the client platform / OS from navigator.
 */
function detectPlatform(): string {
	if (typeof window === "undefined" || !navigator) {
		return "Unknown";
	}

	const ua = navigator.userAgent || "";
	const p = navigator.platform || "";

	if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
	if (/Android/i.test(ua)) return "Android";
	if (/Mac/i.test(p) || /Macintosh/i.test(ua)) return "macOS";
	if (/Win/i.test(p) || /Windows/i.test(ua)) return "Windows";
	if (/Linux/i.test(p) || /Linux/i.test(ua)) return "Linux";

	return p || "Unknown";
}

/**
 * Detects the browser name and version from userAgent.
 */
function detectBrowser(): string {
	if (typeof window === "undefined" || !navigator) {
		return "Web Browser";
	}

	const ua = navigator.userAgent || "";

	if (/Edg\//i.test(ua)) return "Edge";
	if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
	if (/Chrome\//i.test(ua)) return "Chrome";
	if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
	if (/Firefox\//i.test(ua)) return "Firefox";

	return "Browser";
}

/**
 * Classifies device into MOBILE, TABLET, DESKTOP, or WEB.
 */
function detectDeviceType(): DeviceType {
	if (typeof window === "undefined" || !navigator) {
		return "WEB";
	}

	const ua = navigator.userAgent || "";

	if (/iPad|Tablet|PlayBook/i.test(ua)) {
		return "TABLET";
	}

	if (/Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
		return "MOBILE";
	}

	if (typeof window !== "undefined" && window.innerWidth <= 768) {
		return "MOBILE";
	}

	return "DESKTOP";
}

/**
 * Builds the comprehensive DeviceInfoRequest payload for authentication.
 */
export function getDeviceInfo(): DeviceInfoRequest {
	const platform = detectPlatform();
	const browser = detectBrowser();
	const deviceType = detectDeviceType();
	const deviceId = getOrCreateDeviceId();

	const deviceName = `${browser} on ${platform}`;

	return {
		deviceId,
		deviceName,
		deviceType,
		platform,
	};
}

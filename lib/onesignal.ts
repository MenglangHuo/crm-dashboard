/**
 * OneSignal Web Push Notification Client Integration
 * For Bronx CRM Dashboard
 */

declare global {
	interface Window {
		OneSignalDeferred?: Array<(OneSignal: any) => void | Promise<void>>;
		OneSignal?: any;
	}
}

export interface OneSignalInitConfig {
	appId: string;
	allowLocalhostAsSecureOrigin?: boolean;
	serviceWorkerPath?: string;
	serviceWorkerParam?: { scope: string };
}

let isSdkScriptLoaded = false;
let isInitialized = false;
let isBlocked = false;

/**
 * Checks if OneSignal is blocked by browser extensions/adblockers.
 */
export function isOneSignalBlocked(): boolean {
	return isBlocked;
}

/**
 * Dynamically injects the OneSignal Web SDK script into the document header.
 */
export function loadOneSignalScript(): Promise<boolean> {
	if (typeof window === "undefined") return Promise.resolve(false);
	if (isSdkScriptLoaded || document.getElementById("onesignal-sdk-script")) {
		isSdkScriptLoaded = true;
		return Promise.resolve(true);
	}

	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.id = "onesignal-sdk-script";
		script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
		script.defer = true;
		script.async = true;
		script.onload = () => {
			isSdkScriptLoaded = true;
			isBlocked = false;
			resolve(true);
		};
		script.onerror = () => {
			isBlocked = true;
			console.warn(
				"[OneSignal] Push SDK script blocked by browser extension / ad blocker (e.g. uBlock, Brave Shields, AdBlock). In-app polling will be used.",
			);
			resolve(false);
		};
		document.head.appendChild(script);
	});
}

/**
 * Initializes the OneSignal SDK with the given configuration.
 */
export async function initOneSignal(appId?: string): Promise<boolean> {
	if (typeof window === "undefined") return false;
	const effectiveAppId = appId || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

	if (!effectiveAppId) {
		console.warn(
			"[OneSignal] No NEXT_PUBLIC_ONESIGNAL_APP_ID configured. Push notifications disabled.",
		);
		return false;
	}

	if (isInitialized && window.OneSignal) {
		return true;
	}

	try {
		const loaded = await loadOneSignalScript();
		if (!loaded) {
			return false;
		}

		window.OneSignalDeferred = window.OneSignalDeferred || [];

		return new Promise<boolean>((resolve) => {
			window.OneSignalDeferred!.push(async (OneSignal: any) => {
				try {
					await OneSignal.init({
						appId: effectiveAppId,
						allowLocalhostAsSecureOrigin: true,
						serviceWorkerPath: "OneSignalSDKWorker.js",
						serviceWorkerParam: { scope: "/" },
						notifyButton: {
							enable: false, // We use custom in-app bell & toast UI
						},
					});
					isInitialized = true;
					console.info(
						"[OneSignal] SDK successfully initialized with App ID:",
						effectiveAppId,
					);
					resolve(true);
				} catch (initErr) {
					console.warn(
						"[OneSignal] OneSignal.init encountered an issue:",
						initErr,
					);
					resolve(false);
				}
			});
		});
	} catch (err) {
		console.warn("[OneSignal] Initialization error:", err);
		return false;
	}
}

/**
 * Associate the active CRM user with OneSignal via External User ID.
 * Backend sends pushes to external IDs matching CRM user IDs.
 */
export async function loginOneSignalUser(
	userId: string | number,
): Promise<void> {
	if (typeof window === "undefined" || !userId) return;

	window.OneSignalDeferred = window.OneSignalDeferred || [];
	window.OneSignalDeferred.push(async (OneSignal: any) => {
		try {
			const externalId = String(userId);
			// If already logged in with this exact external ID, skip redundant login
			if (OneSignal.User?.externalId !== externalId) {
				await OneSignal.login(externalId).catch(() => {});
				console.info(
					`[OneSignal] Logged in user with External ID: ${externalId}`,
				);
			}
		} catch (err) {
			console.warn("[OneSignal] Error during user login:", err);
		}
	});
}

/**
 * Log out user from OneSignal when logging out of the CRM.
 */
export async function logoutOneSignalUser(): Promise<void> {
	if (typeof window === "undefined") return;

	window.OneSignalDeferred = window.OneSignalDeferred || [];
	window.OneSignalDeferred.push(async (OneSignal: any) => {
		try {
			if (OneSignal.User?.externalId) {
				await OneSignal.logout();
				console.info("[OneSignal] Logged out user session");
			}
		} catch (err) {
			console.warn("[OneSignal] Error during logout:", err);
		}
	});
}

/**
 * Requests browser push notification permission.
 */
export async function requestPushPermission(): Promise<boolean> {
	if (typeof window === "undefined" || !("Notification" in window))
		return false;

	return new Promise<boolean>((resolve) => {
		window.OneSignalDeferred = window.OneSignalDeferred || [];
		window.OneSignalDeferred.push(async (OneSignal: any) => {
			try {
				await OneSignal.Notifications.requestPermission();
				const granted =
					OneSignal.Notifications.permission === true ||
					Notification.permission === "granted";
				resolve(granted);
			} catch (err) {
				console.warn(
					"[OneSignal] Error requesting notification permission:",
					err,
				);
				resolve(Notification.permission === "granted");
			}
		});
	});
}

/**
 * Retrieves current browser notification permission.
 */
export function getPushPermissionStatus(): NotificationPermission {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "default";
	}
	return Notification.permission;
}

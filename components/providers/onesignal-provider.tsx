"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { profileApi } from "@/lib/api/endpoints";
import {
	initOneSignal,
	loginOneSignalUser,
	logoutOneSignalUser,
	requestPushPermission,
	getPushPermissionStatus,
	isOneSignalBlocked,
} from "@/lib/onesignal";
import { toast } from "sonner";
import {
	ShoppingCart,
	CheckCircle2,
	Receipt,
	Bell,
	ShieldCheck,
	FileText,
} from "lucide-react";
import { getNotificationTargetUrl } from "@/lib/notification-routing";

interface OneSignalContextValue {
	isInitialized: boolean;
	isSupported: boolean;
	isBlocked: boolean;
	permission: NotificationPermission;
	isSubscribed: boolean;
	requestPermission: () => Promise<boolean>;
	promptSubscription: () => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextValue>({
	isInitialized: false,
	isSupported: false,
	isBlocked: false,
	permission: "default",
	isSubscribed: false,
	requestPermission: async () => false,
	promptSubscription: async () => {},
});

export function useOneSignal() {
	return useContext(OneSignalContext);
}

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [isInitialized, setIsInitialized] = useState(false);
	const [isSupported, setIsSupported] = useState(false);
	const [isBlocked, setIsBlocked] = useState(false);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");
	const [isSubscribed, setIsSubscribed] = useState(false);

	const [hasToken, setHasToken] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const isAuthPage = [
			"/sign-in",
			"/forgot-password",
			"/reset-password",
			"/register-company",
		].some((p) => window.location.pathname.startsWith(p));
		const tokenExists =
			document.cookie.includes("rumluos_access_token") ||
			Boolean(localStorage.getItem("rumluos_access_token"));
		setHasToken(!isAuthPage && tokenExists);
	}, []);

	// 1. Fetch current logged-in profile only when token exists and not on auth pages
	const { data: userProfile } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 5 * 60 * 1000,
		retry: false,
		enabled: hasToken,
	});

	// 2. Initialize OneSignal on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		const supported = "Notification" in window && "serviceWorker" in navigator;
		setIsSupported(supported);
		setPermission(getPushPermissionStatus());

		const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
		if (!appId) return;

		initOneSignal(appId).then((success) => {
			if (!success) {
				setIsBlocked(isOneSignalBlocked());
				return;
			}
			setIsBlocked(false);
			setIsInitialized(true);

			window.OneSignalDeferred = window.OneSignalDeferred || [];
			window.OneSignalDeferred.push((OneSignal: any) => {
				// Initial permission and subscription state
				setPermission(getPushPermissionStatus());
				const sub = OneSignal.User?.PushSubscription;
				setIsSubscribed(Boolean(sub?.optedIn));

				// Listen for push subscription state change
				sub?.addEventListener("change", (event: any) => {
					const optedIn = Boolean(event?.current?.optedIn);
					setIsSubscribed(optedIn);
					setPermission(getPushPermissionStatus());
				});

				// Foreground Notification Handler (When user is actively viewing CRM dashboard)
				OneSignal.Notifications?.addEventListener(
					"foregroundWillDisplay",
					(event: any) => {
						const notif = event?.notification;
						if (!notif) return;

						const title = notif.title || "Notification";
						const body =
							notif.body || "A new status update has occurred.";
						const additionalData = notif.additionalData || {};

						const finalTarget = getNotificationTargetUrl({
							type: additionalData.type || notif.type,
							referenceId:
								additionalData.referenceId ||
								additionalData.paymentCode ||
								additionalData.invoiceCode ||
								additionalData.orderCode ||
								additionalData.orderId,
							title: notif.title,
							message: notif.body,
							url: additionalData.url || notif.launchURL,
						});

						// Determine appropriate icon & title for events
						let toastIcon = (
							<ShoppingCart className="h-5 w-5 text-indigo-500" />
						);
						const notifType = String(additionalData.type || "").toUpperCase();
						if (title.includes("Payment") || notifType.includes("PAYMENT")) {
							toastIcon = <Receipt className="h-5 w-5 text-emerald-500" />;
						} else if (title.includes("Approved") || title.includes("Ready")) {
							toastIcon = <ShieldCheck className="h-5 w-5 text-sky-500" />;
						} else if (title.includes("Invoice") || title.includes("Issued") || notifType.includes("INVOICE")) {
							toastIcon = <FileText className="h-5 w-5 text-sky-500" />;
						} else if (title.includes("Completed")) {
							toastIcon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
						}

						// Show interactive sonner toast
						toast(title, {
							description: body,
							icon: toastIcon,
							duration: 8000,
							action: {
								label: "View Details",
								onClick: () => {
									router.push(finalTarget);
								},
							},
						});

						// Invalidate React Query caches for real-time reactivity
						queryClient.invalidateQueries({ queryKey: ["orders"] });
						queryClient.invalidateQueries({ queryKey: ["orders-search"] });
						queryClient.invalidateQueries({ queryKey: ["order-detail"] });
						queryClient.invalidateQueries({ queryKey: ["notifications"] });
						queryClient.invalidateQueries({
							queryKey: ["notifications-infinite"],
						});
						queryClient.invalidateQueries({
							queryKey: ["notifications-total-unread"],
						});
						queryClient.invalidateQueries({ queryKey: ["invoices"] });
						queryClient.invalidateQueries({ queryKey: ["invoices-search"] });
						queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
						queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] });
					},
				);

				// Notification Click / Deep-link Handler (From OS desktop/mobile notification tray)
				OneSignal.Notifications?.addEventListener("click", (event: any) => {
					const additionalData = event?.notification?.additionalData || {};
					const targetUrl = getNotificationTargetUrl({
						type: additionalData.type,
						referenceId:
							additionalData.referenceId ||
							additionalData.paymentCode ||
							additionalData.invoiceCode ||
							additionalData.orderCode ||
							additionalData.orderId,
						title: event?.notification?.title,
						message: event?.notification?.body,
						url: event?.notification?.launchURL || additionalData.url,
					});

					router.push(targetUrl || "/orders");

					// Trigger cache refetch
					queryClient.refetchQueries({ queryKey: ["orders-search"] });
					queryClient.refetchQueries({ queryKey: ["notifications-infinite"] });
					queryClient.refetchQueries({
						queryKey: ["notifications-total-unread"],
					});
				});
			});
		});
	}, [queryClient, router]);

	// 3. User Login / Tag Syncing with OneSignal External User ID
	useEffect(() => {
		if (!isInitialized) return;

		if (userProfile && userProfile.id) {
			loginOneSignalUser(userProfile.id);
		} else {
			logoutOneSignalUser();
		}
	}, [userProfile?.id, isInitialized]);

	// Permission Request
	const handleRequestPermission = useCallback(async (): Promise<boolean> => {
		const granted = await requestPushPermission();
		setPermission(getPushPermissionStatus());
		setIsSubscribed(granted);
		if (granted) {
			toast.success("Browser push notifications enabled for order updates!");
		} else {
			toast.info("Push notification permission was not granted.");
		}
		return granted;
	}, []);

	const handlePromptSubscription = useCallback(async () => {
		await handleRequestPermission();
	}, [handleRequestPermission]);

	return (
		<OneSignalContext.Provider
			value={{
				isInitialized,
				isSupported,
				isBlocked,
				permission,
				isSubscribed,
				requestPermission: handleRequestPermission,
				promptSubscription: handlePromptSubscription,
			}}
		>
			{children}
		</OneSignalContext.Provider>
	);
}

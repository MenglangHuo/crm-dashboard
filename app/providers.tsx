"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { profileApi } from "@/lib/api/endpoints";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";

import dynamic from "next/dynamic";
import { QuickActionProvider } from "@/components/quick-action-modal-context";
import { CustomThemeProvider } from "@/components/custom-theme-provider";

const CommandPalette = dynamic(
	() => import("@/components/command-palette").then((m) => m.CommandPalette),
	{ ssr: false },
);
const UnifiedLoanWizardModal = dynamic(
	() =>
		import("@/components/unified-loan-wizard-modal").then(
			(m) => m.UnifiedLoanWizardModal,
		),
	{ ssr: false },
);
const QuickPaymentModal = dynamic(
	() =>
		import("@/components/quick-payment-modal").then(
			(m) => m.QuickPaymentModal,
		),
	{ ssr: false },
);
const AbaKhqrModal = dynamic(
	() => import("@/components/aba-khqr-modal").then((m) => m.AbaKhqrModal),
	{ ssr: false },
);
const PrintReceiptModal = dynamic(
	() =>
		import("@/components/print-receipt-modal").then(
			(m) => m.PrintReceiptModal,
		),
	{ ssr: false },
);
const ThemeCustomizerModal = dynamic(
	() =>
		import("@/components/theme-customizer-modal").then(
			(m) => m.ThemeCustomizerModal,
		),
	{ ssr: false },
);
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/types/i18n";

function ProfileCacheInitializer() {
	const queryClient = useQueryClient();
	useEffect(() => {
		const cached = profileApi.getCachedProfile();
		if (cached) {
			queryClient.setQueryData(
				["profile"],
				(existing: any) => existing || cached,
			);
		}
	}, [queryClient]);
	return null;
}

export function Providers({
	initialLocale,
	children,
}: {
	initialLocale?: Locale;
	children: React.ReactNode;
}) {
	const [queryClient] = useState(() => {
		return new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: 60 * 1000, // 1 minute
					retry: 1,
					refetchOnWindowFocus: false,
				},
			},
		});
	});

	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
		>
			<CustomThemeProvider>
				<I18nProvider initialLocale={initialLocale}>
					<QueryClientProvider client={queryClient}>
						<ProfileCacheInitializer />
						<OneSignalProvider>
							<QuickActionProvider>
								{children}
								<CommandPalette />
								<UnifiedLoanWizardModal />
								<QuickPaymentModal />
								<AbaKhqrModal />
								<PrintReceiptModal />
								<ThemeCustomizerModal />
								<Toaster richColors position="top-right" />
							</QuickActionProvider>
						</OneSignalProvider>
					</QueryClientProvider>
				</I18nProvider>
			</CustomThemeProvider>
		</ThemeProvider>
	);
}

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { profileApi } from "@/lib/api/endpoints";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { QuickActionProvider } from "@/components/quick-action-modal-context";
import { CustomThemeProvider } from "@/components/custom-theme-provider";
import { ThemeCustomizerModal } from "@/components/theme-customizer-modal";
import { CommandPalette } from "@/components/command-palette";
import { UnifiedLoanWizardModal } from "@/components/unified-loan-wizard-modal";
import { QuickPaymentModal } from "@/components/quick-payment-modal";
import { AbaKhqrModal } from "@/components/aba-khqr-modal";
import { PrintReceiptModal } from "@/components/print-receipt-modal";
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

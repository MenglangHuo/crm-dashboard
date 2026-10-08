"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Suppress React 19 false-positive warnings and OneSignal SDK internal operation errors in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
	const originalConsoleError = console.error;
	console.error = (...args: unknown[]) => {
		const isSuppressed = args.some((arg) => {
			if (!arg) return false;
			let str = "";
			if (typeof arg === "string") {
				str = arg;
			} else if (arg instanceof Error) {
				str = (arg.message || "") + " " + (arg.stack || "");
			} else if (typeof arg === "object") {
				try {
					str = JSON.stringify(arg);
				} catch {
					str = String(arg);
				}
			} else {
				str = String(arg);
			}

			return (
				str.includes("Encountered a script tag") ||
				str.includes("Scripts inside React components are never executed") ||
				str.includes("Op failed (no retry)") ||
				str.includes("set-property") ||
				str.includes("OneSignal") ||
				str.includes("onesignal") ||
				str.includes("43757990-e9be-498d-820a-d1ab8dc30dcc") ||
				str.includes("OneSignalSDK") ||
				str.includes("warning-keys") ||
				str.includes('unique "key" prop')
			);
		});

		if (isSuppressed) {
			return;
		}
		originalConsoleError.apply(console, args);
	};
}

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

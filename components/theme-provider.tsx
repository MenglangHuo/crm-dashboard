"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Suppress React 19 false-positive warnings and external extension errors in development
if (typeof window !== "undefined") {
	window.addEventListener(
		"error",
		(event) => {
			const msg = event?.message || "";
			if (
				msg.includes("daily-companion-app") ||
				msg.includes("react-modal")
			) {
				event.preventDefault();
				if (event.stopImmediatePropagation) {
					event.stopImmediatePropagation();
				}
			}
		},
		true,
	);

	window.addEventListener("unhandledrejection", (event) => {
		const reason = event?.reason;
		const msg = typeof reason === "string" ? reason : reason?.message || "";
		if (
			msg.includes("daily-companion-app") ||
			msg.includes("react-modal")
		) {
			event.preventDefault();
			if (event.stopImmediatePropagation) {
				event.stopImmediatePropagation();
			}
		}
	});

	if (process.env.NODE_ENV === "development") {
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
					str.includes("daily-companion-app") ||
					str.includes("react-modal: No elements were found for selector") ||
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
}

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

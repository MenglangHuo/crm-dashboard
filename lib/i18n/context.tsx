"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useMemo,
	useCallback,
} from "react";
import {
	Locale,
	DEFAULT_LOCALE,
	LOCALE_COOKIE_KEY,
	LOCALE_STORAGE_KEY,
	TranslationParams,
	I18nContextType,
} from "@/types/i18n";
import { en, Dictionary } from "./dictionaries/en";
import { km } from "./dictionaries/km";

const dictionaries: Record<Locale, Dictionary> = {
	en,
	km,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getStoredLocale(): Locale {
	if (typeof window === "undefined") return DEFAULT_LOCALE;

	try {
		const local = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
		if (local === "en" || local === "km") return local;

		const cookieMatch = document.cookie.match(
			new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`),
		);
		if (cookieMatch) {
			const cookieVal = decodeURIComponent(cookieMatch[1]) as Locale;
			if (cookieVal === "en" || cookieVal === "km") return cookieVal;
		}
	} catch {
		// ignore
	}

	return DEFAULT_LOCALE;
}

function persistLocale(newLocale: Locale) {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
		document.cookie = `${LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

		// Update HTML root attributes and font class
		document.documentElement.lang = newLocale;
		document.documentElement.setAttribute("data-locale", newLocale);
		if (newLocale === "km") {
			document.documentElement.classList.add("locale-km");
			document.body.classList.add("locale-km");
		} else {
			document.documentElement.classList.remove("locale-km");
			document.body.classList.remove("locale-km");
		}
	} catch {
		// ignore
	}
}

export function I18nProvider({
	initialLocale = DEFAULT_LOCALE,
	children,
}: {
	initialLocale?: Locale;
	children: React.ReactNode;
}) {
	const [locale, setLocaleState] = useState<Locale>(initialLocale);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const initial = getStoredLocale();
		if (initial && initial !== initialLocale) {
			setLocaleState(initial);
			persistLocale(initial);
		}
		setMounted(true);
	}, [initialLocale]);

	const setLocale = useCallback((newLocale: Locale) => {
		setLocaleState(newLocale);
		persistLocale(newLocale);
	}, []);

	const dict = useMemo(
		() => dictionaries[locale] || dictionaries[DEFAULT_LOCALE],
		[locale],
	);
	const fallbackDict = dictionaries[DEFAULT_LOCALE];

	const t = useCallback(
		(
			path: string,
			defaultTextOrParams?: string | TranslationParams,
			paramsObj?: TranslationParams,
		): string => {
			let defaultText: string | undefined;
			let params: TranslationParams | undefined;

			if (typeof defaultTextOrParams === "string") {
				defaultText = defaultTextOrParams;
				params = paramsObj;
			} else {
				params = defaultTextOrParams;
			}

			if (!path || typeof path !== "string") {
				return typeof defaultText === "string" ? defaultText : "";
			}

			const keys = path.split(".");

			let current: any = dict;
			for (const k of keys) {
				if (current && typeof current === "object" && k in current) {
					current = current[k];
				} else {
					current = undefined;
					break;
				}
			}

			// Fallback to English dictionary if not found in current locale
			if (current === undefined || typeof current !== "string") {
				let fallback: any = fallbackDict;
				for (const k of keys) {
					if (fallback && typeof fallback === "object" && k in fallback) {
						fallback = fallback[k];
					} else {
						fallback = undefined;
						break;
					}
				}
				current = typeof fallback === "string" ? fallback : defaultText || path;
			}

			let result = current as string;

			// Interpolate parameters {paramName} and {{paramName}}
			if (params && typeof result === "string") {
				Object.entries(params).forEach(([key, val]) => {
					result = result
						.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), String(val))
						.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), String(val));
				});
			}

			return result;
		},
		[dict, fallbackDict],
	);

	const formatCurrency = useCallback(
		(amount: number, currency: "USD" | "KHR" = "USD"): string => {
			try {
				if (currency === "KHR") {
					return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
						style: "currency",
						currency: "KHR",
						maximumFractionDigits: 0,
					}).format(amount);
				}
				return new Intl.NumberFormat(locale === "km" ? "km-KH" : "en-US", {
					style: "currency",
					currency: "USD",
					minimumFractionDigits: 2,
				}).format(amount);
			} catch {
				return currency === "KHR" ? `${amount} ៛` : `$${amount}`;
			}
		},
		[locale],
	);

	const formatDate = useCallback(
		(
			dateInput: Date | string | number,
			options?: Intl.DateTimeFormatOptions,
		): string => {
			try {
				const d =
					typeof dateInput === "string" || typeof dateInput === "number"
						? new Date(dateInput)
						: dateInput;
				const defaultOptions: Intl.DateTimeFormatOptions = options || {
					year: "numeric",
					month: "short",
					day: "numeric",
				};
				return new Intl.DateTimeFormat(
					locale === "km" ? "km-KH" : "en-US",
					defaultOptions,
				).format(d);
			} catch {
				return String(dateInput);
			}
		},
		[locale],
	);

	const formatNumber = useCallback(
		(value: number, options?: Intl.NumberFormatOptions): string => {
			try {
				return new Intl.NumberFormat(
					locale === "km" ? "km-KH" : "en-US",
					options,
				).format(value);
			} catch {
				return String(value);
			}
		},
		[locale],
	);

	const value = useMemo<I18nContextType>(
		() => ({
			locale,
			setLocale,
			t,
			formatCurrency,
			formatDate,
			formatNumber,
		}),
		[locale, setLocale, t, formatCurrency, formatDate, formatNumber],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
	const context = useContext(I18nContext);
	if (!context) {
		throw new Error("useTranslation must be used within an I18nProvider");
	}
	return context;
}

export const useLocale = useTranslation;

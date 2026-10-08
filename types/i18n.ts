export type Locale = "en" | "km";

export interface LocaleOption {
	code: Locale;
	label: string;
	nativeName: string;
	flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
	{
		code: "en",
		label: "English",
		nativeName: "English (US)",
		flag: "🇺🇸",
	},
	{
		code: "km",
		label: "Khmer",
		nativeName: "ភាសាខ្មែរ",
		flag: "🇰🇭",
	},
];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_KEY = "rumluos_locale";
export const LOCALE_STORAGE_KEY = "rumluos_locale";

export type TranslationParams = Record<string, string | number>;

export interface I18nContextType {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (
		path: string,
		defaultTextOrParams?: string | TranslationParams,
		params?: TranslationParams,
	) => string;
	formatCurrency: (amount: number, currency?: "USD" | "KHR") => string;
	formatDate: (
		date: Date | string | number,
		options?: Intl.DateTimeFormatOptions,
	) => string;
	formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

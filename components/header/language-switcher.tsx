"use client";

import React from "react";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/i18n/context";
import { SUPPORTED_LOCALES, Locale } from "@/types/i18n";
import { toast } from "sonner";

export function LanguageSwitcher() {
	const { locale, setLocale, t } = useTranslation();

	const currentOption =
		SUPPORTED_LOCALES.find((item) => item.code === locale) ||
		SUPPORTED_LOCALES[0];

	const handleSelect = (code: Locale) => {
		if (code === locale) return;
		setLocale(code);
		const selected = SUPPORTED_LOCALES.find((item) => item.code === code);
		toast.success(
			code === "km"
				? `បានប្តូរទៅភាសា៖ ${selected?.nativeName}`
				: `Language changed to: ${selected?.nativeName}`,
			{ duration: 2000 },
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className="relative h-8 w-8 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 cursor-pointer"
						title={t("header.selectLanguage")}
						aria-label={t("header.selectLanguage")}
					/>
				}
			>
				<Globe className="h-4 w-4" />
				<span className="sr-only">{t("header.language")}</span>
				<span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold uppercase text-primary border border-primary/20 leading-none">
					{locale === "km" ? "ខ្មែរ" : "EN"}
				</span>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				sideOffset={8}
				className="w-48 rounded-2xl p-1.5 shadow-xl border border-slate-200/90 bg-white/95 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-950/95 z-50"
			>
				<DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
					{t("header.selectLanguage")}
				</DropdownMenuLabel>
				<DropdownMenuSeparator className="my-1 bg-slate-200/60 dark:bg-slate-800/60" />

				{SUPPORTED_LOCALES.map((item) => {
					const isSelected = item.code === locale;
					return (
						<DropdownMenuItem
							key={item.code}
							onClick={() => handleSelect(item.code)}
							className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
								isSelected
									? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary font-bold"
									: "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
							}`}
						>
							<div className="flex items-center gap-2.5">
								<span className="text-base leading-none">{item.flag}</span>
								<div className="flex flex-col">
									<span>{item.nativeName}</span>
									<span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
										{item.label}
									</span>
								</div>
							</div>
							{isSelected && (
								<Check className="h-4 w-4 text-primary shrink-0" />
							)}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

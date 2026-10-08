"use client";

import React from "react";
import { useTheme } from "next-themes";
import {
	Palette,
	Sun,
	Moon,
	Monitor,
	Check,
	RotateCcw,
	Sparkles,
} from "lucide-react";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
} from "@/components/ui-custom/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useCustomTheme, THEME_PRESETS } from "./custom-theme-provider";
import { ModernButton } from "./ui-custom/modern-button";

export function ThemeCustomizerModal() {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const {
		preset,
		setPreset,
		customColor,
		setCustomColor,
		resetToDefault,
		isCustomizerOpen,
		setIsCustomizerOpen,
	} = useCustomTheme();

	const isDark = resolvedTheme === "dark";

	return (
		<ModernModal
			isOpen={isCustomizerOpen}
			onClose={() => setIsCustomizerOpen(false)}
			title="Customize App Theme & Colors"
			subtitle="Personalize primary branding color and light/dark theme modes across all components."
			icon={<Palette className="h-5 w-5 text-primary" />}
			size="md"
			footer={
				<ModernModalFooter>
					<ModernButton
						variant="primary"
						size="sm"
						onClick={resetToDefault}
						leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
						className="rounded-[12px] p-5"
					>
						Reset to Default
					</ModernButton>
					<ModernModalCancelButton onClick={() => setIsCustomizerOpen(false)}>
						Done
					</ModernModalCancelButton>
				</ModernModalFooter>
			}
		>
			<div className="space-y-6 py-2">
				{/* 1. Light / Dark Mode Switcher */}
				<div className="space-y-2">
					<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
						Appearance Mode
					</span>
					<div className="grid grid-cols-3 gap-2.5">
						<button
							type="button"
							onClick={() => setTheme("light")}
							className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-bold gap-2 cursor-pointer ${
								theme === "light"
									? "border-primary bg-primary/10 text-primary shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
							}`}
						>
							<Sun className="h-5 w-5 text-amber-500" />
							<span>Light Mode</span>
						</button>

						<button
							type="button"
							onClick={() => setTheme("dark")}
							className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-bold gap-2 cursor-pointer ${
								theme === "dark"
									? "border-primary bg-primary/10 text-primary shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
							}`}
						>
							<Moon className="h-5 w-5 text-indigo-400" />
							<span>Dark Mode</span>
						</button>

						<button
							type="button"
							onClick={() => setTheme("system")}
							className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-xs font-bold gap-2 cursor-pointer ${
								theme === "system"
									? "border-primary bg-primary/10 text-primary shadow-xs"
									: "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300"
							}`}
						>
							<Monitor className="h-5 w-5 text-sky-500" />
							<span>System Default</span>
						</button>
					</div>
				</div>

				{/* 2. Primary Color Presets */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
							Primary Brand Color Palette
						</span>
						<span className="text-[11px] font-medium text-slate-400">
							Applies to buttons, switches, inputs, tables & badges
						</span>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
						{THEME_PRESETS.map((p) => {
							const isSelected = preset === p.key && !customColor;
							const activeHex = isDark ? p.dark : p.light;
							return (
								<button
									key={p.key}
									type="button"
									onClick={() => setPreset(p.key)}
									className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs font-bold gap-2 cursor-pointer ${
										isSelected
											? "border-primary bg-primary/10 shadow-xs text-slate-900 dark:text-slate-100 ring-2 ring-primary/20"
											: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300"
									}`}
								>
									<div className="flex items-center gap-2.5">
										<span
											className="h-5 w-5 rounded-full shadow-xs shrink-0 flex items-center justify-center border border-white/20"
											style={{ backgroundColor: activeHex }}
										>
											{isSelected && <Check className="h-3 w-3 text-white" />}
										</span>
										<span className="truncate">{p.name.split(" ")[0]}</span>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* 3. Custom Hex Color Picker */}
				<div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
							<Sparkles className="h-4 w-4 text-primary" /> Custom Color Picker
						</span>
						{customColor && (
							<Badge
								variant="secondary"
								className="text-[10px] bg-primary/10 text-primary font-bold"
							>
								Custom Color Active
							</Badge>
						)}
					</div>

					<div className="flex items-center gap-3">
						<input
							type="color"
							value={customColor || (isDark ? "#4f7cf8" : "#2252E9")}
							onChange={(e) => setCustomColor(e.target.value)}
							className="h-9 w-12 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800"
						/>
						<Input
							value={customColor || ""}
							placeholder="e.g. #2252E9"
							onChange={(e) => setCustomColor(e.target.value || null)}
							className="h-9 text-xs font-mono rounded-xl max-w-xs"
						/>
						{customColor && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setCustomColor(null)}
								className="h-9 text-xs text-slate-500 hover:text-slate-700"
							>
								Clear Custom
							</Button>
						)}
					</div>
				</div>

				{/* 4. Live UI Component Preview */}
				<div className="space-y-2 pt-2 border-t dark:border-slate-800">
					<span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
						Live Component Color Preview
					</span>

					<div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
						<div className="flex flex-wrap items-center gap-3">
							<Button
								size="sm"
								className="bg-primary text-primary-foreground font-bold text-xs"
							>
								Primary Button
							</Button>
							<Badge className="bg-primary/15 text-primary border border-primary/20 font-bold text-xs">
								Active Status Badge
							</Badge>
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold text-slate-500">
									Active Toggle
								</span>
								<Switch checked={true} />
							</div>
						</div>

						<Input
							readOnly
							value="Sample Input with Focus Ring"
							className="h-9 text-xs border-primary ring-2 ring-primary/20 rounded-xl"
						/>
					</div>
				</div>
			</div>
		</ModernModal>
	);
}

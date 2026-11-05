"use client";

import React, { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useSplashScreen } from "./splash-context";
import { env } from "@/lib/config/env";

export function SplashScreen() {
	const { isActive, isFadingOut, hideSplash } = useSplashScreen();

	// Listen for Escape key to quickly skip
	useEffect(() => {
		if (!isActive) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				hideSplash();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isActive, hideSplash]);

	if (!isActive) {
		return null;
	}

	return (
		<div
			role="status"
			aria-live="polite"
			aria-label="Welcome to CRM Dashboard"
			aria-busy={!isFadingOut}
			onClick={hideSplash}
			className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between p-6 sm:p-10 select-none overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
				isFadingOut
					? "opacity-0 scale-[1.06] pointer-events-none blur-sm"
					: "opacity-100 scale-100 pointer-events-auto cursor-pointer"
			} bg-slate-50/98 dark:bg-[#0B0F19]/98 backdrop-blur-3xl text-slate-900 dark:text-slate-100`}
			style={{
				willChange: "transform, opacity, filter",
			}}
		>
			{/* Ambient Studio Lighting (Non-intrusive, soft atmospheric gradients) */}
			<div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
				{/* Top-left soft primary tint */}
				<div
					className="absolute -top-32 -left-32 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full blur-[140px] opacity-10 dark:opacity-15 pointer-events-none transition-all"
					style={{ background: "var(--primary)" }}
				/>
				{/* Bottom-right cool ambient glow */}
				<div className="absolute -bottom-32 -right-32 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full blur-[140px] opacity-10 dark:opacity-15 pointer-events-none bg-sky-500/20 dark:bg-indigo-500/20" />
				{/* Soft center illumination */}
				<div
					className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full blur-[100px] opacity-8 dark:opacity-12 pointer-events-none"
					style={{
						background:
							"radial-gradient(circle, var(--primary) 0%, transparent 70%)",
					}}
				/>

				{/* Refined dot grid with smooth radial falloff */}
				<div
					className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
					style={{
						backgroundImage:
							"radial-gradient(currentColor 1.2px, transparent 1.2px)",
						backgroundSize: "28px 28px",
						maskImage:
							"radial-gradient(ellipse 65% 55% at 50% 50%, black 40%, transparent 100%)",
						WebkitMaskImage:
							"radial-gradient(ellipse 65% 55% at 50% 50%, black 40%, transparent 100%)",
					}}
				/>
			</div>

			{/* Top Bar: Security Badge & Fast Skip */}
			<header className="w-full max-w-4xl flex items-center justify-between text-xs shrink-0 z-20">
				<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 shadow-2xs backdrop-blur-md">
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
					</span>
					<span className="font-medium text-slate-600 dark:text-slate-300 text-[11px] tracking-wide">
						Enterprise Secure Workspace
					</span>
				</div>

				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						hideSplash();
					}}
					className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-white/60 hover:bg-white/90 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
					title="Skip splash screen (Esc)"
				>
					<span>Skip</span>
					<kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
						Esc
					</kbd>
				</button>
			</header>

			{/* Center: Brand Motion Experience (TripAdvisor-Inspired Choreography) */}
			<main className="flex flex-col items-center justify-center text-center max-w-md w-full my-auto space-y-6 relative">
				{/* Logo & Concentric Ripple Waves (First radius cleanly outside logo) */}
				<div className="relative flex items-center justify-center splash-spring">
					{/* 8 Concentric Radiating Rings starting outside the Logo */}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
						{/* 8 Dynamic Expanding Circular Waves (Start size-44/48, completely outside logo) */}
						{[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
							<span
								key={`ripple-${index}`}
								className={`absolute size-44 sm:size-48 rounded-full border splash-ring-${index + 1}`}
								style={{
									borderColor: `color-mix(in srgb, var(--primary) ${Math.max(10, 36 - index * 3.5)}%, transparent)`,
								}}
							/>
						))}

						{/* 6 Layered Harmonic Orbit Radii (Innermost is size-44/48, clearly outside logo) */}
						<span
							className="absolute size-44 sm:size-48 rounded-full border -z-10 pointer-events-none splash-glow"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 24%, transparent)",
							}}
						/>
						<span
							className="absolute size-56 sm:size-60 rounded-full border -z-10 pointer-events-none"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 18%, transparent)",
							}}
						/>
						<span
							className="absolute size-68 sm:size-74 rounded-full border -z-10 pointer-events-none"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 13%, transparent)",
							}}
						/>
						<span
							className="absolute size-84 sm:size-92 rounded-full border -z-10 pointer-events-none"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 9%, transparent)",
							}}
						/>
						<span
							className="absolute size-[400px] sm:size-[440px] rounded-full border -z-10 pointer-events-none"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 6%, transparent)",
							}}
						/>
						<span
							className="absolute size-[480px] sm:size-[520px] rounded-full border -z-10 pointer-events-none"
							style={{
								borderColor:
									"color-mix(in srgb, var(--primary) 4%, transparent)",
							}}
						/>
					</div>

					{/* Floating Brand Mark Card */}
					<div className="splash-float">
						{/* Ambient Glow Halo */}
						<div
							className="absolute -inset-3 rounded-[30px] sm:rounded-[34px] blur-xl opacity-25 dark:opacity-35 splash-glow -z-10"
							style={{ backgroundColor: "var(--primary)" }}
						/>

						{/* Tactile App Icon Container */}
						<div className="relative flex size-24 sm:size-26 items-center justify-center rounded-[24px] sm:rounded-[26px] bg-[#F4F8FC] dark:bg-[#111624] border border-slate-200/80 dark:border-white/10 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.15),0_4px_12px_-2px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_48px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden transition-all">
							{/* Specular Curved Highlight */}
							<div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 dark:from-white/10 to-transparent pointer-events-none z-10" />

							{/* Glossy Diagonal Gleam Sweep */}
							<div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
								<div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent splash-gleam" />
							</div>

							<img
								src="/images/logo-light.jpeg"
								alt="CRM Logo"
								className="size-full object-cover dark:hidden scale-115"
								onError={(e) => {
									(e.target as HTMLImageElement).src = "/crm-web.png";
								}}
							/>
							<img
								src="/images/logo-dark.jpeg"
								alt="CRM Logo"
								className="size-full object-cover hidden dark:block scale-115"
								onError={(e) => {
									(e.target as HTMLImageElement).src = "/crm-web.png";
								}}
							/>
						</div>
					</div>
				</div>

				{/* Brand Typography & Tagline (Smooth Staggered Slide-Up) */}
				

				{/* Subtle Ambient Live Status Pill */}
				<div className="splash-slide-up-delay pt-0.5">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs backdrop-blur-md">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
						</span>
						<span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
							Workspace Initialized
						</span>
					</div>
				</div>
			</main>

			{/* Footer: Meta-grade Enterprise Platform Stamp */}
			<footer className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0 z-20">
				<div className="flex items-center gap-2">
					<div className="p-1 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
						<ShieldCheck className="size-3.5" />
					</div>
					<span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
						256-Bit SSL Encrypted Session
					</span>
				</div>

				<div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
					<span className="text-slate-400 dark:text-slate-500">Platform</span>
					<span className="font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
						BRONX CRM PLATFORM
					</span>
					<span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800">
						v{env.appVersion}
					</span>
				</div>
			</footer>
		</div>
	);
}

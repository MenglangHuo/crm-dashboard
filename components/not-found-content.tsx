"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
	LayoutDashboard,
	ArrowLeft,
	LogIn,
	Sun,
	Moon,
	Compass,
	Users,
	ShoppingCart,
	Package,
	HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/header/language-switcher";
import { useTranslation } from "@/lib/i18n/context";

function MinimalThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = React.useState(false);

	React.useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <div className="size-8" />;
	}

	const isDark = theme === "dark";

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className="size-8 rounded-xl text-slate-500 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
			aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{isDark ? (
				<Sun className="size-4 text-amber-400" />
			) : (
				<Moon className="size-4 text-slate-700" />
			)}
		</Button>
	);
}

function LogoShield() {
	return (
		<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20 ring-2 ring-primary/20 transition-transform hover:scale-105">
			<svg
				className="size-5"
				viewBox="0 0 100 100"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="50" cy="50" r="46" stroke="#ffffff" strokeWidth="6" />
				<path
					d="M50 20 L70 32 V54 C70 66 50 78 50 78 C50 78 30 66 30 54 V32 Z"
					fill="#ffffff"
					opacity="0.95"
				/>
				<path
					d="M40 52 L47 58 L62 44"
					stroke="var(--primary, #2252E9)"
					strokeWidth="6"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}

export function NotFoundContent() {
	const pathname = usePathname();
	const router = useRouter();
	const { t } = useTranslation();
	const [currentPath, setCurrentPath] = React.useState<string>("");

	React.useEffect(() => {
		if (pathname) {
			setCurrentPath(pathname);
		} else if (typeof window !== "undefined") {
			setCurrentPath(window.location.pathname);
		}
	}, [pathname]);

	const handleGoBack = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			router.back();
		} else {
			router.push("/");
		}
	};

	const quickLinks = [
		{
			href: "/",
			label: t("notFound.dashboard", "Dashboard"),
			icon: LayoutDashboard,
		},
		{
			href: "/customers",
			label: t("notFound.customers", "Customers"),
			icon: Users,
		},
		{
			href: "/orders",
			label: t("notFound.orders", "Orders"),
			icon: ShoppingCart,
		},
		{
			href: "/products",
			label: t("notFound.products", "Products"),
			icon: Package,
		},
	];

	return (
		<div className="relative flex min-h-screen w-full flex-col justify-between overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_26%),linear-gradient(180deg,#f8fafc,#f1f5f9)] dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_28%),linear-gradient(180deg,#020617,#0f172a)] text-slate-900 dark:text-slate-100 selection:bg-primary/20 selection:text-primary">
			{/* Top Navbar */}
			<header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/60 bg-white/70 px-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-950/70 sm:px-8">
				<Link
					href="/"
					className="flex items-center gap-3 transition-opacity hover:opacity-90"
				>
					<LogoShield />
					<div className="flex flex-col">
						<span className="font-heading text-base font-bold tracking-tight text-slate-900 dark:text-white">
							{t("common.appName", "CRM Admin Dashboard")}
						</span>
						<span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
							SaaS Enterprise Platform
						</span>
					</div>
				</Link>

				<div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80">
					<LanguageSwitcher />
					<MinimalThemeToggle />
				</div>
			</header>

			{/* Main Content */}
			<main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
				{/* Background Glows */}
				<div className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10 sm:h-96 sm:w-96" />
				<div className="pointer-events-none absolute bottom-10 right-1/4 -z-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-purple-500/10" />

				<div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
					{/* Emblem / Icon */}
					
					{/* 404 Large Display */}
					<div className="relative mb-2 select-none">
						<span className="font-heading text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-300 sm:text-9xl">
							404
						</span>
					</div>

					{/* Status Badge */}
					<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold text-primary dark:border-blue-400/20 dark:bg-blue-400/10">
						<span className="size-2 rounded-full bg-primary animate-ping" />
						<span>{t("notFound.badge", "404 Error")}</span>
					</div>

					{/* Heading & Description */}
					<h1 className="font-heading text-2xl font-bold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
						{t("notFound.title", "Page Not Found")}
					</h1>

					<p className="mt-3 max-w-lg text-sm text-slate-600 dark:text-slate-400 sm:text-base">
						{t(
							"notFound.description",
							"The page you are looking for might have been moved, deleted, or does not exist.",
						)}
					</p>

				
					{/* Action Buttons */}
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						

						<Button
							variant="outline"
							size="lg"
							onClick={handleGoBack}
							className="rounded-xl px-5 shadow-2xs cursor-pointer"
						>
							<ArrowLeft className="size-4" />
							{t("notFound.goBack", "Go Back")}
						</Button>

					
					</div>

				</div>
			</main>

			{/* Footer */}
			<footer className="w-full border-t border-slate-200/60 bg-white/40 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-400">
				<div className="flex items-center justify-center gap-1.5">
					<HelpCircle className="size-3.5 text-slate-400" />
					<span>
						{t(
							"notFound.needHelp",
							"Need help? Contact system administrator.",
						)}
					</span>
				</div>
			</footer>
		</div>
	);
}

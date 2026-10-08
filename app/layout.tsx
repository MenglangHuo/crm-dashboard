import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
	Inter,
	Outfit,
	Playfair_Display,
	Kantumruy_Pro,
} from "next/font/google";
import { LOCALE_COOKIE_KEY, type Locale } from "@/types/i18n";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const playfair = Playfair_Display({
	subsets: ["latin"],
	variable: "--font-playfair",
});
const kantumruy = Kantumruy_Pro({
	subsets: ["khmer", "latin"],
	variable: "--font-khmer",
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "Crm Admin Dashboard",
	description: "Manage your multi-tenant SaaS application",
	icons: {
		icon: [
			{
				url: "/icon-light-32x32.png",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/icon-dark-32x32.png",
				media: "(prefers-color-scheme: dark)",
			},
			{
				url: "/icon.svg",
				type: "image/svg+xml",
			},
		],
		apple: "/apple-icon.png",
	},
};

export const viewport: Viewport = {
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value as Locale | undefined;
	const initialLocale: Locale = cookieLocale === "km" ? "km" : "en";

	return (
		<html
			lang={initialLocale}
			className={initialLocale === "km" ? "locale-km" : ""}
			suppressHydrationWarning
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var sc=localStorage.getItem('rumluos_theme_custom_color'),sp=localStorage.getItem('rumluos_theme_preset'),ps={brand:{light:'#2252E9',dark:'#4f7cf8'},ocean:{light:'#0284c7',dark:'#38bdf8'},purple:{light:'#7c3aed',dark:'#a855f7'},emerald:{light:'#059669',dark:'#34d399'},rose:{light:'#e11d48',dark:'#fb7185'},amber:{light:'#d97706',dark:'#fbbf24'}},d=document.documentElement.classList.contains('dark')||localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&window.matchMedia('(prefers-color-scheme: dark)').matches),c=sc||((ps[sp]||ps.brand)[d?'dark':'light']);if(c){var r=document.documentElement;r.style.setProperty('--primary',c);r.style.setProperty('--ring',c);r.style.setProperty('--chart-1',c);r.style.setProperty('--sidebar-primary',c);r.style.setProperty('--sidebar-ring',c);r.style.setProperty('--sidebar-primary-foreground','#ffffff');}}catch(e){}})();`,
					}}
				/>
			</head>
			<body
				className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${kantumruy.variable} antialiased`}
			>
				<Providers initialLocale={initialLocale}>
					{children}
					{process.env.NODE_ENV === "production" && <Analytics />}
				</Providers>
			</body>
		</html>
	);
}

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { CompanyProvider } from "@/components/providers/company-context";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<CompanyProvider>
			<SidebarProvider>
				<AppSidebar />
				<SidebarInset className="flex flex-col min-w-0 max-w-full bg-[#f6f7fb] dark:bg-slate-950">
					<Header />
					<main className="flex-1 min-w-0 max-w-full bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_26%),linear-gradient(180deg,#f8fafc,#f1f5f9)] p-4 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_28%),linear-gradient(180deg,#020617,#0f172a)] md:p-6 lg:p-8">
						{children}
					</main>
				</SidebarInset>
			</SidebarProvider>
		</CompanyProvider>
	);
}

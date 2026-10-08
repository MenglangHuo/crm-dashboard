"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	companiesApi,
	branchesApi,
	staffApi,
	CompanyInput,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import {
	Building2,
	Mail,
	Phone,
	MapPin,
	FileText,
	Users,
	GitBranch,
	Save,
	Loader2,
	CheckCircle2,
	XCircle,
	ExternalLink,
	ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ModernTabs,
	ModernTabsList,
	ModernTabsTrigger,
	ModernTabsContent,
} from "@/components/ui-custom/modern-tabs";
import {
	ModernInput,
	ModernTextarea,
	ModernSwitch,
} from "@/components/ui-custom/form-controls";
import { StatusBadgeCell } from "@/components/ui-custom/data-table";

const formSchema = z.object({
	name: z.string().min(2, "Company name is required"),
	email: z.string().email("Valid email is required"),
	phone: z.string().min(3, "Phone number is required"),
	address: z.string().min(2, "Address is required"),
	description: z.string(),
	enableBranch: z.boolean(),
});

export default function CompanyProfilePage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState("overview");

	const {
		data: company,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["company-profile"],
		queryFn: companiesApi.getProfile,
	});

	const { data: branchesData } = useQuery({
		queryKey: ["branches", { limit: 50 }],
		queryFn: () => branchesApi.list({ limit: 50 }),
	});

	const { data: staffData } = useQuery({
		queryKey: ["staffs", { limit: 50 }],
		queryFn: () => staffApi.list({ limit: 50 }),
	});

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			address: "",
			description: "",
			enableBranch: false,
		},
	});

	useEffect(() => {
		if (company) {
			form.reset({
				name: company.name || "",
				email: company.email || "",
				phone: company.phone || "",
				address: company.address || "",
				description: company.description || "",
				enableBranch: company.enableBranch ?? false,
			});
		}
	}, [company, form]);

	const updateMutation = useMutation({
		mutationFn: (body: Partial<CompanyInput>) =>
			companiesApi.updateProfile(body),
		onSuccess: () => {
			toast.success("Company profile updated successfully");
			queryClient.invalidateQueries({ queryKey: ["company-profile"] });
			queryClient.invalidateQueries({ queryKey: ["profile"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		updateMutation.mutate(values);
	};

	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-purple-600" />
			</div>
		);
	}

	const branches = branchesData?.items || [];
	const staff = staffData?.items || [];

	return (
		<div className="space-y-6 max-w-7xl mx-auto pb-10">
			{/* Header Banner */}
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-xl">
				<div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
				<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="flex items-center gap-5">
						<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner text-purple-300">
							<Building2 className="h-8 w-8" />
						</div>
						<div className="space-y-1">
							<div className="flex items-center gap-3 flex-wrap">
								<h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
									{company?.name || "Company Profile"}
								</h1>
								<Badge
									variant="outline"
									className={
										company?.active
											? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
											: "border-slate-500/40 bg-slate-500/10 text-slate-300"
									}
								>
									{company?.active ? "Active Organization" : "Inactive"}
								</Badge>
							</div>
							<p className="text-xs md:text-sm text-purple-200/80 flex items-center gap-2">
								<span>ID: {company?.id}</span>
								<span>•</span>
								<span>
									Created{" "}
									{company?.createdAt
										? new Date(company.createdAt).toLocaleDateString()
										: "N/A"}
								</span>
							</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
						>
							Refresh Details
						</Button>
					</div>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								Total Branches
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{company?.branchCount ?? branches.length}
							</h3>
							<p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
								{company?.enableBranch
									? "Multi-branch enabled"
									: "Single branch mode"}
							</p>
						</div>
						<div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
							<GitBranch className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								Active Staff
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{company?.staffCount ?? staff.length}
							</h3>
							<p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
								Team members
							</p>
						</div>
						<div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
							<Users className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								System Users
							</p>
							<h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
								{company?.userCount ?? 1}
							</h3>
							<p className="text-xs text-slate-500 mt-1">Assigned accounts</p>
						</div>
						<div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
							<ShieldCheck className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>

				<Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
					<CardContent className="p-5 flex items-center justify-between">
						<div>
							<p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
								Branch Management
							</p>
							<div className="mt-1 flex items-center gap-2">
								<span className="text-sm font-bold">
									{company?.enableBranch ? "Enabled" : "Disabled"}
								</span>
								{company?.enableBranch ? (
									<CheckCircle2 className="h-4 w-4 text-emerald-500" />
								) : (
									<XCircle className="h-4 w-4 text-amber-500" />
								)}
							</div>
							<p className="text-xs text-slate-500 mt-1">Tenant setting</p>
						</div>
						<div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
							<Building2 className="h-6 w-6" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Tabs */}
			<ModernTabs value={activeTab} onValueChange={setActiveTab}>
				<ModernTabsList variant="glass" size="md" fullWidth>
					<ModernTabsTrigger
						value="overview"
						icon={<Building2 className="h-4 w-4" />}
					>
						Company Settings & Profile
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="branches"
						icon={<GitBranch className="h-4 w-4" />}
						badge={branches.length}
						badgeColor="purple"
					>
						Branches
					</ModernTabsTrigger>
					<ModernTabsTrigger
						value="staff"
						icon={<Users className="h-4 w-4" />}
						badge={staff.length}
						badgeColor="sky"
					>
						Staff Directory
					</ModernTabsTrigger>
				</ModernTabsList>

				{/* Tab 1: Settings Form */}
				<ModernTabsContent value="overview" className="space-y-6">
					<Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
						<CardHeader>
							<CardTitle className="text-lg font-bold flex items-center gap-2">
								<Building2 className="h-5 w-5 text-purple-600" />
								Company General Information
							</CardTitle>
							<CardDescription>
								Update your organization details, contact information, and
								branch configuration.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="space-y-6"
							>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<ModernInput
										label="Company Name"
										placeholder="e.g. Acme Financial"
										{...form.register("name")}
										error={form.formState.errors.name?.message}
										required
									/>

									<ModernInput
										label="Contact Email"
										type="email"
										placeholder="contact@company.com"
										leftIcon={<Mail className="size-4" />}
										{...form.register("email")}
										error={form.formState.errors.email?.message}
										required
									/>

									<ModernInput
										label="Phone Number"
										placeholder="+1 234 567 890"
										leftIcon={<Phone className="size-4" />}
										{...form.register("phone")}
										error={form.formState.errors.phone?.message}
										required
									/>

									<ModernInput
										label="Headquarters Address"
										placeholder="Street 123, City, Country"
										leftIcon={<MapPin className="size-4" />}
										{...form.register("address")}
										error={form.formState.errors.address?.message}
										required
									/>
								</div>

								<ModernTextarea
									label="Company Description"
									rows={3}
									placeholder="Describe your company services, mission, or note..."
									{...form.register("description")}
								/>

								<div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 flex items-center justify-between">
									<div>
										<h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
											Multi-Branch Management
										</h4>
										<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
											Enable branch segregation and assign staff members to
											specific branch locations.
										</p>
									</div>
									<ModernSwitch
										checked={form.watch("enableBranch")}
										onCheckedChange={(checked) =>
											form.setValue("enableBranch", checked)
										}
									/>
								</div>

								<div className="flex justify-end">
									<Button
										type="submit"
										disabled={updateMutation.isPending}
										className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 shadow-md shadow-purple-600/20"
									>
										{updateMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Saving Changes...
											</>
										) : (
											<>
												<Save className="mr-2 h-4 w-4" />
												Save Changes
											</>
										)}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</ModernTabsContent>

				{/* Tab 2: Branches List */}
				<ModernTabsContent value="branches" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
								Company Branches
							</h3>
							<p className="text-xs text-slate-500">
								Active branch locations configured for {company?.name}
							</p>
						</div>
						<Button
							render={<Link href="/branches" />}
							size="sm"
							variant="outline"
							className="gap-1.5 text-xs"
						>
							Manage Branches <ExternalLink className="h-3.5 w-3.5" />
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{branches.map((b) => (
							<Card
								key={b.id}
								className="border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all"
							>
								<CardContent className="p-4 space-y-3">
									<div className="flex items-center justify-between">
										<div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
											<GitBranch className="h-4 w-4 text-purple-600" />
											{b.name}
										</div>
										<StatusBadgeCell
											status={b.active ? "Active" : "Inactive"}
											type="account"
										/>
									</div>
									<div className="text-xs text-slate-500 space-y-1">
										<div className="flex items-center gap-1.5">
											<Phone className="h-3 w-3 text-slate-400" />
											<span>{b.phone || "N/A"}</span>
										</div>
										<div className="flex items-center gap-1.5">
											<MapPin className="h-3 w-3 text-slate-400 shrink-0" />
											<span className="truncate">{b.address || "N/A"}</span>
										</div>
									</div>
								</CardContent>
							</Card>
						))}

						{branches.length === 0 && (
							<div className="col-span-full text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
								<GitBranch className="mx-auto h-8 w-8 text-slate-400" />
								<p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">
									No branches configured yet
								</p>
								<Button
									render={<Link href="/branches" />}
									size="sm"
									className="mt-4 bg-purple-600 text-white"
								>
									Create First Branch
								</Button>
							</div>
						)}
					</div>
				</ModernTabsContent>

				{/* Tab 3: Staff List */}
				<ModernTabsContent value="staff" className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
								Staff Members
							</h3>
							<p className="text-xs text-slate-500">
								Personnel profiles registered under {company?.name}
							</p>
						</div>
						<Button
							render={<Link href="/staff" />}
							size="sm"
							variant="outline"
							className="gap-1.5 text-xs"
						>
							Manage Staff <ExternalLink className="h-3.5 w-3.5" />
						</Button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{staff.map((s) => (
							<Card
								key={s.id}
								className="border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all"
							>
								<CardContent className="p-4 space-y-3">
									<div className="flex items-center justify-between">
										<div>
											<div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
												{s.firstName} {s.lastName}
											</div>
											<Badge variant="secondary" className="text-[10px] mt-0.5">
												{s.position}
											</Badge>
										</div>
									</div>
									<div className="text-xs text-slate-500 space-y-1">
										<div className="flex items-center gap-1.5">
											<Mail className="h-3 w-3 text-slate-400" />
											<span>{s.email}</span>
										</div>
										<div className="flex items-center gap-1.5">
											<Phone className="h-3 w-3 text-slate-400" />
											<span>{s.phone}</span>
										</div>
									</div>
								</CardContent>
							</Card>
						))}

						{staff.length === 0 && (
							<div className="col-span-full text-center py-12 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
								<Users className="mx-auto h-8 w-8 text-slate-400" />
								<p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-2">
									No staff members found
								</p>
								<Button
									render={<Link href="/staff" />}
									size="sm"
									className="mt-4 bg-purple-600 text-white"
								>
									Add Staff Member
								</Button>
							</div>
						)}
					</div>
				</ModernTabsContent>
			</ModernTabs>
		</div>
	);
}

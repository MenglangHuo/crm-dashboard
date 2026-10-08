"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Plus, X, Globe, Network, Lock, Info } from "lucide-react";

export interface IpSecurityConfig {
	enabled: boolean;
	blackListIp: Array<{ ip: string }>;
	cidrRange: string[];
}

interface IpSecurityEditorProps {
	value: any;
	onChange: (newValue: IpSecurityConfig) => void;
	disabled?: boolean;
}

export function IpSecurityEditor({
	value,
	onChange,
	disabled = false,
}: IpSecurityEditorProps) {
	const [newIp, setNewIp] = useState("");
	const [newCidr, setNewCidr] = useState("");

	const parseConfig = (): IpSecurityConfig => {
		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			return {
				enabled: Boolean(value.enabled),
				blackListIp: Array.isArray(value.blackListIp) ? value.blackListIp : [],
				cidrRange: Array.isArray(value.cidrRange) ? value.cidrRange : [],
			};
		}
		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				if (typeof parsed === "object" && parsed !== null) {
					return {
						enabled: Boolean(parsed.enabled),
						blackListIp: Array.isArray(parsed.blackListIp)
							? parsed.blackListIp
							: [],
						cidrRange: Array.isArray(parsed.cidrRange) ? parsed.cidrRange : [],
					};
				}
			} catch {
				// fallback
			}
		}
		return {
			enabled: true,
			blackListIp: [{ ip: "100.0.0.1" }, { ip: "100.0.0.2" }],
			cidrRange: ["10.0.0.0/24", "10.0.0.0/16"],
		};
	};

	const config = parseConfig();

	const handleToggleEnabled = (checked: boolean) => {
		onChange({ ...config, enabled: checked });
	};

	const handleAddIp = () => {
		const trimmed = newIp.trim();
		if (!trimmed) return;
		const exists = config.blackListIp.some((item) => item.ip === trimmed);
		if (!exists) {
			onChange({
				...config,
				blackListIp: [...config.blackListIp, { ip: trimmed }],
			});
		}
		setNewIp("");
	};

	const handleRemoveIp = (index: number) => {
		const updated = config.blackListIp.filter((_, i) => i !== index);
		onChange({ ...config, blackListIp: updated });
	};

	const handleAddCidr = () => {
		const trimmed = newCidr.trim();
		if (!trimmed) return;
		if (!config.cidrRange.includes(trimmed)) {
			onChange({
				...config,
				cidrRange: [...config.cidrRange, trimmed],
			});
		}
		setNewCidr("");
	};

	const handleRemoveCidr = (index: number) => {
		const updated = config.cidrRange.filter((_, i) => i !== index);
		onChange({ ...config, cidrRange: updated });
	};

	return (
		<div className="w-full space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white p-5 shadow-xs dark:border-slate-800 dark:from-slate-900/60 dark:to-slate-950">
			{/* Top Banner with Policy Status */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
						<ShieldCheck className="h-5 w-5" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
							IP Whitelist & Restriction Rules
							{config.enabled ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
									Active Enforcement
								</span>
							) : (
								<span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
									Disabled
								</span>
							)}
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Only requests from these IP addresses or CIDR subnets are
							permitted for administrator login.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2.5 self-start sm:self-auto">
					<span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
						Enforce Policy
					</span>
					<Switch
						checked={config.enabled}
						onCheckedChange={handleToggleEnabled}
						disabled={disabled}
						className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
					/>
				</div>
			</div>

			{/* 2-Column Responsive Grid for IPs and CIDRs */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Individual IP Addresses */}
				<div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 space-y-3">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<Globe className="h-3.5 w-3.5 text-blue-500" />
							Allowed IP Addresses ({config.blackListIp.length})
						</label>
					</div>

					<div className="flex flex-wrap gap-1.5 min-h-[50px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70">
						{config.blackListIp.map((item, idx) => (
							<span
								key={idx}
								className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60"
							>
								{item.ip}
								{!disabled && (
									<button
										type="button"
										onClick={() => handleRemoveIp(idx)}
										className="text-blue-400 hover:text-red-500 ml-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</span>
						))}

						{config.blackListIp.length === 0 && (
							<span className="text-xs text-slate-400 italic py-1">
								No individual IP rules added.
							</span>
						)}
					</div>

					{!disabled && (
						<div className="flex items-center gap-1.5">
							<Input
								type="text"
								placeholder="e.g. 192.168.1.100"
								value={newIp}
								onChange={(e) => setNewIp(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === ",") {
										e.preventDefault();
										handleAddIp();
									}
								}}
								className="h-8 text-xs font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAddIp}
								className="h-8 gap-1 px-2.5 text-xs font-semibold"
							>
								<Plus className="h-3.5 w-3.5" />
								Add
							</Button>
						</div>
					)}
				</div>

				{/* CIDR Subnet Ranges */}
				<div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800/80 dark:bg-slate-900 space-y-3">
					<div className="flex items-center justify-between">
						<label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
							<Network className="h-3.5 w-3.5 text-amber-500" />
							CIDR Subnet Ranges ({config.cidrRange.length})
						</label>
					</div>

					<div className="flex flex-wrap gap-1.5 min-h-[50px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/70">
						{config.cidrRange.map((cidr, idx) => (
							<span
								key={idx}
								className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60"
							>
								{cidr}
								{!disabled && (
									<button
										type="button"
										onClick={() => handleRemoveCidr(idx)}
										className="text-amber-500 hover:text-red-500 ml-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</span>
						))}

						{config.cidrRange.length === 0 && (
							<span className="text-xs text-slate-400 italic py-1">
								No CIDR subnet rules added.
							</span>
						)}
					</div>

					{!disabled && (
						<div className="flex items-center gap-1.5">
							<Input
								type="text"
								placeholder="e.g. 10.0.0.0/24"
								value={newCidr}
								onChange={(e) => setNewCidr(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === ",") {
										e.preventDefault();
										handleAddCidr();
									}
								}}
								className="h-8 text-xs font-mono bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleAddCidr}
								className="h-8 gap-1 px-2.5 text-xs font-semibold"
							>
								<Plus className="h-3.5 w-3.5" />
								Add
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

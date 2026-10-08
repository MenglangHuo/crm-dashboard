"use client";

import React, { useState, useEffect } from "react";
import {
	Code2,
	Copy,
	Check,
	RotateCcw,
	Sparkles,
	AlertCircle,
	X,
	FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	ModernModal,
	ModernModalFooter,
	ModernModalCancelButton,
	ModernModalSubmitButton,
} from "@/components/ui-custom/modal";
import { toast } from "sonner";

interface JsonEditorModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	value: any;
	defaultValue?: string;
	onSave: (newValue: any) => void;
	isReadOnly?: boolean;
}

export function JsonEditorModal({
	open,
	onOpenChange,
	title,
	description,
	value,
	defaultValue,
	onSave,
	isReadOnly = false,
}: JsonEditorModalProps) {
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (open) {
			try {
				const initial =
					typeof value === "string"
						? JSON.stringify(JSON.parse(value), null, 2)
						: JSON.stringify(value ?? {}, null, 2);
				setText(initial);
				setError(null);
			} catch {
				setText(
					typeof value === "string" ? value : JSON.stringify(value ?? {}),
				);
				setError(null);
			}
		}
	}, [open, value]);

	const handleFormat = () => {
		try {
			const parsed = JSON.parse(text);
			setText(JSON.stringify(parsed, null, 2));
			setError(null);
			toast.success("JSON formatted successfully");
		} catch (err: any) {
			setError(err.message || "Invalid JSON syntax");
			toast.error("Cannot format invalid JSON");
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		toast.success("JSON copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	const handleResetDefault = () => {
		if (!defaultValue) return;
		try {
			const parsed = JSON.parse(defaultValue);
			setText(JSON.stringify(parsed, null, 2));
			setError(null);
			toast.info("Reset to default value");
		} catch {
			setText(defaultValue);
			setError(null);
		}
	};

	const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setText(val);
		try {
			JSON.parse(val);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Invalid JSON");
		}
	};

	const handleSave = () => {
		try {
			const parsed = JSON.parse(text);
			onSave(parsed);
			onOpenChange(false);
			toast.success("JSON configuration updated");
		} catch (err: any) {
			setError(err.message || "Invalid JSON format");
			toast.error("Please fix JSON syntax errors before saving");
		}
	};

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
						<FileJson className="h-4 w-4" />
					</div>
					<div>
						<div className="font-semibold text-slate-900 dark:text-slate-100">
							{title}
						</div>
						<div className="text-xs font-normal text-slate-500 dark:text-slate-400">
							JSON Configuration Editor
						</div>
					</div>
				</div>
			}
			subtitle={description || "Edit structured JSON configuration value"}
			size="2xl"
		>
			<div className="space-y-4">
				{/* Toolbar */}
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleFormat}
							disabled={isReadOnly}
							className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-300"
						>
							<Sparkles className="h-3.5 w-3.5 text-blue-500" />
							Format JSON
						</Button>
						{defaultValue && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleResetDefault}
								disabled={isReadOnly}
								className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-300"
							>
								<RotateCcw className="h-3.5 w-3.5 text-amber-500" />
								Default
							</Button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleCopy}
							className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
						>
							{copied ? (
								<>
									<Check className="h-3.5 w-3.5 text-emerald-500" />
									Copied
								</>
							) : (
								<>
									<Copy className="h-3.5 w-3.5" />
									Copy JSON
								</>
							)}
						</Button>
						{error ? (
							<Badge variant="destructive" className="gap-1 text-xs">
								<AlertCircle className="h-3 w-3" />
								Invalid JSON
							</Badge>
						) : (
							<Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 gap-1 text-xs">
								<Check className="h-3 w-3" />
								Valid JSON
							</Badge>
						)}
					</div>
				</div>

				{/* Code textarea with dark IDE look */}
				<div className="relative rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 shadow-inner dark:border-slate-800">
					<textarea
						value={text}
						onChange={handleTextChange}
						disabled={isReadOnly}
						rows={14}
						spellCheck={false}
						className="w-full resize-y bg-transparent font-mono text-xs text-emerald-400 outline-none placeholder:text-slate-600 disabled:opacity-60"
						placeholder="{\n  // enter JSON configuration\n}"
					/>
				</div>

				{error && (
					<div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900">
						<AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
						<span className="break-all">{error}</span>
					</div>
				)}
			</div>

			<ModernModalFooter>
				<ModernModalCancelButton onClick={() => onOpenChange(false)}>
					Cancel
				</ModernModalCancelButton>
				<ModernModalSubmitButton
					onClick={handleSave}
					disabled={isReadOnly || !!error}
					className="bg-blue-600 hover:bg-blue-500 text-white"
				>
					Apply Changes
				</ModernModalSubmitButton>
			</ModernModalFooter>
		</ModernModal>
	);
}

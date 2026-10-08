"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Code2, Eye, Sliders } from "lucide-react";

interface GenericJsonEditorProps {
	value: any;
	onChange: (newValue: any) => void;
	disabled?: boolean;
}

export function GenericJsonEditor({
	value,
	onChange,
	disabled = false,
}: GenericJsonEditorProps) {
	const [showRawJson, setShowRawJson] = useState(false);
	const [rawText, setRawText] = useState("");
	const [newKey, setNewKey] = useState("");
	const [newValue, setNewValue] = useState("");

	// Parse value
	const parsedValue = React.useMemo(() => {
		if (typeof value === "object" && value !== null) return value;
		if (typeof value === "string") {
			try {
				return JSON.parse(value);
			} catch {
				return {};
			}
		}
		return {};
	}, [value]);

	const isArray = Array.isArray(parsedValue);
	const isObject =
		typeof parsedValue === "object" && parsedValue !== null && !isArray;

	// 1. Array of Primitives (e.g. strings/numbers)
	if (
		isArray &&
		(parsedValue.length === 0 || typeof parsedValue[0] !== "object")
	) {
		const handleAdd = () => {
			const trimmed = newValue.trim();
			if (!trimmed) return;
			onChange([...parsedValue, trimmed]);
			setNewValue("");
		};

		const handleRemove = (index: number) => {
			onChange(parsedValue.filter((_, i) => i !== index));
		};

		return (
			<div className="w-full max-w-lg space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
				<div className="flex flex-wrap gap-1.5">
					{parsedValue.map((item: any, idx: number) => (
						<span
							key={idx}
							className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
						>
							{String(item)}
							{!disabled && (
								<button
									type="button"
									onClick={() => handleRemove(idx)}
									className="text-slate-400 hover:text-red-500"
								>
									<Trash2 className="h-3 w-3" />
								</button>
							)}
						</span>
					))}

					{!disabled && (
						<div className="flex items-center gap-1">
							<Input
								type="text"
								placeholder="+ Add Item"
								value={newValue}
								onChange={(e) => setNewValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleAdd();
									}
								}}
								className="h-7 w-28 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
							/>
						</div>
					)}
				</div>
			</div>
		);
	}

	// 2. Key-Value Dictionary Object
	if (isObject) {
		const entries = Object.entries(parsedValue);

		const handleFieldChange = (key: string, val: any) => {
			onChange({ ...parsedValue, [key]: val });
		};

		const handleFieldDelete = (key: string) => {
			const next = { ...parsedValue };
			delete next[key];
			onChange(next);
		};

		const handleAddEntry = () => {
			const k = newKey.trim();
			if (!k) return;
			onChange({ ...parsedValue, [k]: newValue.trim() });
			setNewKey("");
			setNewValue("");
		};

		return (
			<div className="w-full max-w-lg space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
				<div className="space-y-1.5">
					{entries.map(([k, v]) => {
						const isBool = typeof v === "boolean";
						const isNum = typeof v === "number";

						return (
							<div
								key={k}
								className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-950"
							>
								<span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[120px]">
									{k}:
								</span>

								<div className="flex-1">
									{isBool ? (
										<Switch
											checked={v}
											onCheckedChange={(checked) =>
												handleFieldChange(k, checked)
											}
											disabled={disabled}
										/>
									) : isNum ? (
										<Input
											type="number"
											value={v}
											disabled={disabled}
											onChange={(e) =>
												handleFieldChange(k, Number(e.target.value) || 0)
											}
											className="h-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
										/>
									) : (
										<Input
											type="text"
											value={String(v)}
											disabled={disabled}
											onChange={(e) => handleFieldChange(k, e.target.value)}
											className="h-7 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
										/>
									)}
								</div>

								{!disabled && (
									<button
										type="button"
										onClick={() => handleFieldDelete(k)}
										className="text-slate-400 hover:text-red-500"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
						);
					})}
				</div>

				{!disabled && (
					<div className="flex items-center gap-1.5 pt-1">
						<Input
							type="text"
							placeholder="Key"
							value={newKey}
							onChange={(e) => setNewKey(e.target.value)}
							className="h-7 w-28 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
						/>
						<Input
							type="text"
							placeholder="Value"
							value={newValue}
							onChange={(e) => setNewValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									handleAddEntry();
								}
							}}
							className="h-7 flex-1 text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleAddEntry}
							className="h-7 px-2 text-xs"
						>
							<Plus className="h-3 w-3" />
						</Button>
					</div>
				)}
			</div>
		);
	}

	// Fallback for complex nested data
	return (
		<div className="w-full max-w-lg">
			<Input
				type="text"
				value={typeof value === "string" ? value : JSON.stringify(value)}
				disabled={disabled}
				onChange={(e) => {
					try {
						onChange(JSON.parse(e.target.value));
					} catch {
						onChange(e.target.value);
					}
				}}
				className="h-8 font-mono text-xs"
			/>
		</div>
	);
}

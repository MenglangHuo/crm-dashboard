"use client";

import React, { useState } from "react";
import {
	Download,
	Upload,
	FileSpreadsheet,
	FileJson,
	Check,
	Loader2,
	AlertCircle,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

export interface ExportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	data: any[];
	selectedCount?: number;
	filename?: string;
	onExportDone?: (format: "csv" | "json", selectedOnly: boolean) => void;
}

export function ExportModal({
	open,
	onOpenChange,
	data,
	selectedCount = 0,
	filename = "table-data",
	onExportDone,
}: ExportModalProps) {
	const { t } = useTranslation();
	const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
	const [exportScope, setExportScope] = useState<"all" | "selected">("all");
	const [customFilename, setCustomFilename] = useState(filename);

	const handleExport = () => {
		if (!data || data.length === 0) {
			toast.error(t("common.noData", "No data available to export"));
			return;
		}

		const scopeSelected = exportScope === "selected" && selectedCount > 0;
		const exportData = scopeSelected
			? data.filter((row: any) => row._selected)
			: data;

		const name = (customFilename || filename)
			.trim()
			.replace(/\.csv$|\.json$/, "");

		if (exportFormat === "csv") {
			exportToCSV(exportData, name);
		} else {
			exportToJSON(exportData, name);
		}

		toast.success(
			`Exported ${exportData.length} records to ${exportFormat.toUpperCase()}`,
		);
		onExportDone?.(exportFormat, scopeSelected);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[440px] border border-border">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Download className="h-5 w-5 text-primary" />{" "}
						{t("common.export", "Export")}
					</DialogTitle>
					<DialogDescription>
						Download your table records as CSV or JSON file format.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Format selection */}
					<div className="space-y-2">
						<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							File Format
						</Label>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setExportFormat("csv")}
								className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
									exportFormat === "csv"
										? "border-primary bg-primary/5 ring-1 ring-primary"
										: "border-border hover:bg-muted/50"
								}`}
							>
								<FileSpreadsheet
									className={`h-6 w-6 ${exportFormat === "csv" ? "text-primary" : "text-muted-foreground"}`}
								/>
								<div>
									<div className="text-sm font-semibold">CSV</div>
									<div className="text-xs text-muted-foreground">
										Excel / Spreadsheet
									</div>
								</div>
							</button>

							<button
								type="button"
								onClick={() => setExportFormat("json")}
								className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
									exportFormat === "json"
										? "border-primary bg-primary/5 ring-1 ring-primary"
										: "border-border hover:bg-muted/50"
								}`}
							>
								<FileJson
									className={`h-6 w-6 ${exportFormat === "json" ? "text-primary" : "text-muted-foreground"}`}
								/>
								<div>
									<div className="text-sm font-semibold">JSON</div>
									<div className="text-xs text-muted-foreground">
										Developer Format
									</div>
								</div>
							</button>
						</div>
					</div>

					{/* Scope selection */}
					<div className="space-y-2">
						<Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
							Export Scope
						</Label>
						<div className="space-y-2">
							<label className="flex items-center justify-between p-2.5 rounded-md border border-border hover:bg-muted/40 cursor-pointer text-sm">
								<span className="flex items-center gap-2">
									<input
										type="radio"
										name="scope"
										checked={exportScope === "all"}
										onChange={() => setExportScope("all")}
										className="accent-primary"
									/>
									<span>All Records ({data.length})</span>
								</span>
								<Badge variant="secondary" className="text-xs">
									Full Table
								</Badge>
							</label>

							<label
								className={`flex items-center justify-between p-2.5 rounded-md border border-border cursor-pointer text-sm ${
									selectedCount === 0
										? "opacity-50 cursor-not-allowed"
										: "hover:bg-muted/40"
								}`}
							>
								<span className="flex items-center gap-2">
									<input
										type="radio"
										name="scope"
										disabled={selectedCount === 0}
										checked={exportScope === "selected" && selectedCount > 0}
										onChange={() => setExportScope("selected")}
										className="accent-primary"
									/>
									<span>Selected Rows Only ({selectedCount})</span>
								</span>
								<Badge variant="outline" className="text-xs">
									Selection
								</Badge>
							</label>
						</div>
					</div>

					{/* Filename input */}
					<div className="space-y-2">
						<Label
							htmlFor="filename"
							className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
						>
							File Name
						</Label>
						<Input
							id="filename"
							value={customFilename}
							onChange={(e) => setCustomFilename(e.target.value)}
							placeholder="export-data"
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-2 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleExport} className="gap-2">
						<Download className="h-4 w-4" /> Download File
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export interface ImportModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImportData: (importedRows: any[]) => void;
}

export function ImportModal({
	open,
	onOpenChange,
	onImportData,
}: ImportModalProps) {
	const { t } = useTranslation();
	const [file, setFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			setFile(e.target.files[0]);
		}
	};

	const handleProcessImport = async () => {
		if (!file) {
			toast.error("Please select a CSV or JSON file");
			return;
		}

		setIsProcessing(true);
		try {
			const text = await file.text();
			let rows: any[] = [];

			if (file.name.endsWith(".json")) {
				rows = JSON.parse(text);
				if (!Array.isArray(rows)) {
					throw new Error("JSON file must contain an array of objects");
				}
			} else {
				rows = parseCSV(text);
			}

			if (rows.length === 0) {
				toast.error("No valid data rows found in file");
				setIsProcessing(false);
				return;
			}

			onImportData(rows);
			toast.success(`Successfully imported ${rows.length} records!`);
			onOpenChange(false);
			setFile(null);
		} catch (err: any) {
			toast.error(err?.message || "Failed to parse import file");
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px] border border-border">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Upload className="h-5 w-5 text-primary" /> Import Data
					</DialogTitle>
					<DialogDescription>
						Upload a CSV or JSON file to populate or merge records into the
						table.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center transition-colors bg-muted/20">
						<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-60" />
						<p className="text-sm font-medium">
							Drag & drop your CSV/JSON file here
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							Supports .csv and .json files up to 10MB
						</p>

						<Input
							type="file"
							accept=".csv, .json, application/json, text/csv"
							onChange={handleFileChange}
							className="mt-4 max-w-xs mx-auto text-xs"
						/>
					</div>

					{file && (
						<div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 text-sm">
							<div className="flex items-center gap-2 truncate">
								<FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
								<span className="font-medium truncate">{file.name}</span>
								<span className="text-xs text-muted-foreground">
									({(file.size / 1024).toFixed(1)} KB)
								</span>
							</div>
							<Badge variant="secondary" className="text-[10px]">
								Ready
							</Badge>
						</div>
					)}
				</div>

				<div className="flex justify-end gap-2 pt-2 border-t">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleProcessImport}
						disabled={!file || isProcessing}
						className="gap-2"
					>
						{isProcessing ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Upload className="h-4 w-4" />
						)}
						Import Records
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function exportToCSV(data: any[], filename: string) {
	if (!data.length) return;
	const headers = Object.keys(data[0]).filter((k) => !k.startsWith("_"));
	const csvRows = [headers.join(",")];

	for (const row of data) {
		const values = headers.map((header) => {
			const val = row[header];
			const escaped = String(val ?? "").replace(/"/g, '""');
			return `"${escaped}"`;
		});
		csvRows.push(values.join(","));
	}

	const blob = new Blob([csvRows.join("\n")], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", `${filename}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function exportToJSON(data: any[], filename: string) {
	const cleanData = data.map((row) => {
		const clean: any = {};
		Object.keys(row).forEach((k) => {
			if (!k.startsWith("_")) clean[k] = row[k];
		});
		return clean;
	});

	const jsonString = JSON.stringify(cleanData, null, 2);
	const blob = new Blob([jsonString], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.setAttribute("href", url);
	link.setAttribute("download", `${filename}.json`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function parseCSV(csvText: string): any[] {
	const lines = csvText.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
	if (lines.length < 2) return [];

	const headers = lines[0]
		.split(",")
		.map((h) => h.trim().replace(/^"|"$/g, ""));
	const result: any[] = [];

	for (let i = 1; i < lines.length; i++) {
		const currentLine = lines[i]
			.split(",")
			.map((v) => v.trim().replace(/^"|"$/g, ""));
		if (currentLine.length === headers.length) {
			const obj: any = {};
			headers.forEach((h, index) => {
				obj[h] = currentLine[index];
			});
			result.push(obj);
		}
	}

	return result;
}

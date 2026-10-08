"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	stockMovementsApi,
	warehousesApi,
	productsApi,
} from "@/lib/api/endpoints";
import { getErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Loader2,
	Plus,
	SlidersHorizontal,
	ArrowUpRight,
	ArrowDownLeft,
} from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui-custom/data-table";
import type { StockMovement } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";

export default function StockMovementsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	const [warehouseId, setWarehouseId] = useState("");
	const [productId, setProductId] = useState("");
	const [movementType, setMovementType] = useState("IMPORT");
	const [quantity, setQuantity] = useState("1");
	const [referenceNo, setReferenceNo] = useState("");
	const [notes, setNotes] = useState("");

	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses-all"],
		queryFn: () => warehousesApi.list({ limit: 100 }),
	});

	const { data: productsData } = useQuery({
		queryKey: ["products-all"],
		queryFn: () => productsApi.list({ limit: 100 }),
	});

	const { data, isLoading } = useQuery({
		queryKey: ["stock-movements", page, pageSize, search],
		queryFn: () => stockMovementsApi.list({ page, limit: pageSize, search }),
	});

	const createMutation = useMutation({
		mutationFn: stockMovementsApi.create,
		onSuccess: () => {
			toast.success("Stock movement recorded successfully");
			queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
			queryClient.invalidateQueries({ queryKey: ["stocks"] });
			setIsDialogOpen(false);
			resetForm();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const resetForm = () => {
		setWarehouseId("");
		setProductId("");
		setMovementType("IMPORT");
		setQuantity("1");
		setReferenceNo("");
		setNotes("");
	};

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault();
		if (!warehouseId || !productId) {
			toast.error("Please select a warehouse and a product");
			return;
		}
		createMutation.mutate({
			warehouseId,
			productId,
			movementType,
			quantity: Number(quantity),
			referenceNo,
			notes,
		});
	};

	const columns: ColumnDef<StockMovement>[] = [
		{
			id: "movementType",
			header: t("stocks.stockStatus"),
			accessorKey: "movementType",
			cell: ({ value }) => (
				<Badge
					variant={
						value === "IMPORT"
							? "default"
							: value === "EXPORT"
								? "destructive"
								: "secondary"
					}
					className="gap-1 text-[10px]"
				>
					{value === "IMPORT" ? (
						<ArrowDownLeft className="h-3 w-3" />
					) : (
						<ArrowUpRight className="h-3 w-3" />
					)}
					{value || "IMPORT"}
				</Badge>
			),
		},
		{
			id: "product",
			header: t("stocks.productName"),
			cell: ({ row }) => (
				<span className="font-semibold text-slate-900 dark:text-slate-100">
					{row.productName ||
						(row.productId ? `Product #${row.productId}` : "—")}
				</span>
			),
		},
		{
			id: "warehouse",
			header: t("stocks.warehouse"),
			cell: ({ row }) => (
				<span className="text-slate-600 dark:text-slate-400 text-xs">
					{row.warehouseName ||
						(row.warehouseId ? `Warehouse #${row.warehouseId}` : "—")}
				</span>
			),
		},
		{
			id: "quantity",
			header: t("stocks.quantityOnHand"),
			accessorKey: "quantity",
			sortable: true,
			cell: ({ value }) => (
				<span className="font-bold text-slate-900 dark:text-slate-100">
					{value}
				</span>
			),
		},
		{
			id: "referenceNo",
			header: t("invoices.referenceNumber"),
			accessorKey: "referenceNo",
			cell: ({ value }) => (
				<span className="font-mono text-xs text-slate-500">{value || "—"}</span>
			),
		},
		{
			id: "createdAt",
			header: t("invoices.issueDate"),
			accessorKey: "createdAt",
			cell: ({ value }) => (
				<span className="text-slate-500 text-xs">
					{value ? new Date(value).toLocaleString() : "—"}
				</span>
			),
		},
	];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-1">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
						{t("sidebar.stockMovements")}
					</h1>
					<p className="text-sm text-slate-500">
						{t("stocks.movementHistorySubtitle")}
					</p>
				</div>
			</div>

			<DataTable<StockMovement>
				data={data?.items || []}
				columns={columns}
				getRowId={(item) => String(item.id)}
				title={t("stocks.allMovements")}
				searchPlaceholder={t("common.search")}
				searchValue={search}
				onSearchChange={(val) => {
					setSearch(val);
					setPage(1);
				}}
				createButtonLabel={t("stocks.adjustStock")}
				onCreateNew={() => setIsDialogOpen(true)}
				manualPagination={true}
				totalCount={data?.total || 0}
				page={page}
				pageSize={pageSize}
				onPageChange={setPage}
				onPageSizeChange={setPageSize}
				isLoading={isLoading}
			/>

			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-md rounded-2xl">
					<DialogHeader>
						<DialogTitle>{t("stocks.adjustStockTitle")}</DialogTitle>
						<DialogDescription>
							{t("stocks.adjustStockSubtitle")}
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSave} className="space-y-4 pt-2">
						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("stocks.stockStatus")} *
							</Label>
							<Select
								value={movementType}
								onValueChange={(val) => setMovementType(val || "IMPORT")}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="IMPORT">IMPORT (Add Stock)</SelectItem>
									<SelectItem value="EXPORT">EXPORT (Remove Stock)</SelectItem>
									<SelectItem value="TRANSFER">TRANSFER</SelectItem>
									<SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("stocks.warehouse")} *
							</Label>
							<Select
								value={warehouseId}
								onValueChange={(val) => setWarehouseId(val || "")}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder="Select warehouse" />
								</SelectTrigger>
								<SelectContent>
									{warehousesData?.items.map((wh) => (
										<SelectItem key={wh.id} value={String(wh.id)}>
											{wh.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("stocks.productName")} *
							</Label>
							<Select
								value={productId}
								onValueChange={(val) => setProductId(val || "")}
							>
								<SelectTrigger className="rounded-xl">
									<SelectValue placeholder="Select product" />
								</SelectTrigger>
								<SelectContent>
									{productsData?.items.map((p) => (
										<SelectItem key={p.id} value={String(p.id)}>
											{p.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("invoices.qty")} *
							</Label>
							<Input
								type="number"
								value={quantity}
								onChange={(e) => setQuantity(e.target.value)}
								min="1"
								className="rounded-xl"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("invoices.referenceNumber")}
							</Label>
							<Input
								value={referenceNo}
								onChange={(e) => setReferenceNo(e.target.value)}
								placeholder="PO-00123"
								className="rounded-xl"
							/>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs font-semibold text-slate-700">
								{t("invoices.notesDescription")}
							</Label>
							<Input
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Reason for adjustment..."
								className="rounded-xl"
							/>
						</div>

						<div className="flex justify-end gap-3 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsDialogOpen(false)}
								className="rounded-xl"
							>
								{t("common.cancel")}
							</Button>
							<Button
								type="submit"
								disabled={createMutation.isPending}
								className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
							>
								{createMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									t("common.save")
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

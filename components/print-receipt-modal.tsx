"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { profileApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";

function formatDateString(dateStr?: string | Date): string {
	if (!dateStr) return "—";
	try {
		const d = new Date(dateStr);
		if (isNaN(d.getTime())) return String(dateStr);
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${month}/${day}/${year}`;
	} catch {
		return String(dateStr);
	}
}

export function PrintReceiptModal() {
	const { isReceiptOpen, closeReceipt, receiptData } = useQuickActions();
	const queryClient = useQueryClient();
	const printRef = useRef<HTMLDivElement>(null);

	if (!isReceiptOpen || !receiptData) return null;

	const handlePrint = () => {
		window.print();
	};

	// Retrieve cached profile for company fallback
	const cachedProfile: any =
		queryClient.getQueryData(["profile"]) || profileApi.getCachedProfile();

	const rawInvoice = receiptData.invoice || null;
	const company = rawInvoice?.company || cachedProfile?.company || null;

	// Dynamic Company Info (No static fallbacks)
	const companyName =
		company?.name ||
		company?.companyName ||
		cachedProfile?.companyName ||
		receiptData.companyName ||
		"Menglang";

	const companyAddress =
		company?.address ||
		cachedProfile?.address ||
		receiptData.companyAddress ||
		"";

	const companyEmail =
		company?.email || cachedProfile?.email || receiptData.companyEmail || "";

	const companyPhone =
		company?.phone ||
		company?.primaryPhone ||
		cachedProfile?.phone ||
		receiptData.companyPhone ||
		"";

	// Dynamic Customer Info (No static fallbacks)
	const customer = rawInvoice?.customer || null;
	const customerName =
		customer?.name ||
		rawInvoice?.customerName ||
		receiptData.customerName ||
		"Valued Customer";

	const customerPhone =
		customer?.phoneNumber || customer?.phone || receiptData.customerPhone || "";

	const customerContact =
		customer?.contact || receiptData.customerContact || "";

	const customerAddress =
		rawInvoice?.billingAddress ||
		customer?.address ||
		receiptData.customerAddress ||
		"";

	const displayInvoiceNumber =
		rawInvoice?.invoiceNumber ||
		rawInvoice?.invoiceNo ||
		receiptData.invoiceNo ||
		(rawInvoice?.id ? `INV-${rawInvoice.id}` : "#");

	// Resolve items list: removed SKU, added unitPrice, discount, line total
	const rawItems =
		(rawInvoice?.items && rawInvoice.items.length > 0
			? rawInvoice.items
			: null) ||
		(rawInvoice?.invoiceItems && rawInvoice.invoiceItems.length > 0
			? rawInvoice.invoiceItems
			: null) ||
		(receiptData.items && receiptData.items.length > 0
			? receiptData.items
			: null);

	const items =
		rawItems && rawItems.length > 0
			? rawItems.map((it: any) => {
					const qty = Number(it.quantity ?? it.qty ?? 1);
					const unitPrice = Number(it.unitPrice ?? it.rate ?? 0);
					const discount = Number(
						it.discount ?? it.lineDiscountAmount ?? it.discountAmount ?? 0,
					);
					const amount = Number(
						it.totalAmount ?? it.total ?? qty * unitPrice - discount,
					);
					return {
						name: it.productName || it.name || it.description || "Line Item",
						unitName: it.unitName || undefined,
						qty,
						unitPrice,
						discount,
						amount,
					};
				})
			: [
					{
						name: receiptData.description || "Invoice Settlement Item",
						unitName: undefined,
						qty: 1,
						unitPrice: Number(receiptData.amount || 0),
						discount: 0,
						amount: Number(receiptData.amount || 0),
					},
				];

	const currencySymbol =
		(rawInvoice?.currency || receiptData.currency) === "KHR" ? "៛" : "$";

	const subtotal =
		rawInvoice?.subtotal !== undefined && Number(rawInvoice.subtotal) > 0
			? Number(rawInvoice.subtotal)
			: items.reduce((acc: number, it: any) => acc + (it.amount || 0), 0);

	const discountAmount = Number(
		rawInvoice?.discountAmount ??
			rawInvoice?.totalDiscountAmount ??
			receiptData.discountAmount ??
			0,
	);
	const paymentDiscountAmount = Number(
		rawInvoice?.paymentDiscountAmount ?? receiptData.paymentDiscountAmount ?? 0,
	);
	const taxAmount = Number(rawInvoice?.taxAmount ?? receiptData.taxAmount ?? 0);
	const shippingAmount = Number(
		rawInvoice?.shippingAmount ?? receiptData.shippingAmount ?? 0,
	);
	const totalAmount = Number(
		rawInvoice?.totalAmount ??
			receiptData.totalAmount ??
			receiptData.amount ??
			subtotal - discountAmount + taxAmount + shippingAmount,
	);
	const paidAmount = Number(
		rawInvoice?.paidAmount ??
			receiptData.paidAmount ??
			(rawInvoice?.status === "PAID" || receiptData.status === "PAID"
				? totalAmount - paymentDiscountAmount
				: 0),
	);
	const remainingAmount =
		rawInvoice?.remainingAmount !== undefined
			? Number(rawInvoice.remainingAmount)
			: receiptData.remainingAmount !== undefined
				? Number(receiptData.remainingAmount)
				: Math.max(0, totalAmount - paidAmount - paymentDiscountAmount);

	const invoiceDate =
		rawInvoice?.issuedAt || receiptData.issuedAt || receiptData.date;
	const dueDate =
		rawInvoice?.dueDate ||
		receiptData.dueDate ||
		rawInvoice?.discountDeadline ||
		invoiceDate;

	const formattedInvoiceDate = formatDateString(invoiceDate);
	const formattedDueDate = formatDateString(dueDate);

	const orderNumber =
		rawInvoice?.order?.orderNumber ||
		rawInvoice?.order?.orderNo ||
		(rawInvoice as any)?.orderNumber ||
		(rawInvoice as any)?.attributes?.orderNumber ||
		receiptData.orderNumber;

	const deliveryName =
		rawInvoice?.delivery?.name ||
		(rawInvoice as any)?.deliveryName ||
		receiptData.deliveryName;

	return (
		<>
			{/* Global CSS for A4 Multi-page Print Output */}
			<style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hide {
            display: none !important;
          }
          .a4-print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .a4-table {
            page-break-inside: auto;
            break-inside: auto;
            width: 100% !important;
          }
          .a4-table thead {
            display: table-header-group;
          }
          .a4-table tbody {
            display: table-row-group;
          }
          .a4-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: auto;
            break-after: auto;
          }
          .avoid-page-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

			{/* Modal Backdrop & Screen Wrapper */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:overflow-visible print:block">
				{/* A4 Sheet Container (Screen: 794px max-width, Print: 100% A4 width) */}
				<div
					className="relative w-full max-w-[794px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200 print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:my-0 print:bg-white a4-print-container"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Action Bar Header (Hidden in Print) */}
					<div className="print-hide flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80">
						<div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
							<span>Invoice Preview</span>
							<span className="font-mono text-slate-400 font-normal">
								({displayInvoiceNumber})
							</span>
						</div>

						<div className="flex items-center gap-2">
							<Button
								size="sm"
								onClick={handlePrint}
								className="h-8 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs gap-1.5 transition-all cursor-pointer"
							>
								<Printer className="size-3.5" />
								<span>Print / Save PDF</span>
							</Button>
							<button
								onClick={closeReceipt}
								className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
								title="Close"
							>
								<X className="size-4" />
							</button>
						</div>
					</div>

					{/* Printable Invoice Document Body (Clean Typography, Crisp Layout) */}
					<div
						ref={printRef}
						className="p-8 sm:p-12 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 space-y-8 font-sans print:p-0 print:text-slate-900 print:bg-white"
					>
						{/* 1. Top Header: Brand & Invoice # */}
						<div className="flex justify-between items-start gap-4 avoid-page-break">
							{/* Left: Brand Logo & Company Name */}
							<div className="space-y-1">
								<div className="flex items-center gap-3">
									<div className="size-9 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
										<svg className="size-5 fill-current" viewBox="0 0 24 24">
											<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93c-2.42-.48-4-2.5-4-4.93 0-.67.13-1.3.37-1.88l1.45 1.45c-.09.28-.14.58-.14.88 0 1.66 1.34 3 3 3 .3 0 .6-.05.88-.14l1.45 1.45c-.58.24-1.21.37-1.88.37v.001zm0-3.93c-.55 0-1-.45-1-1 0-.2.06-.38.16-.54l1.38 1.38c-.16.1-.34.16-.54.16zm3.63 2.19l-1.45-1.45c.09-.28.14-.58.14-.88 0-1.66-1.34-3-3-3-.3 0-.6.05-.88.14L9.99 7.62C10.57 7.38 11.2 7.25 11.87 7.25c3.31 0 6 2.69 6 6 0 .67-.13 1.3-.37 1.88z" />
										</svg>
									</div>
									<span className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 print:text-indigo-600">
										{companyName}
									</span>
								</div>
							</div>

							{/* Right: Invoice # and Company Location */}
							<div className="text-right">
								<h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight print:text-slate-900">
									Invoice #
								</h2>
								<div className="text-sm font-mono text-slate-700 dark:text-slate-300 font-semibold mt-0.5 print:text-slate-800">
									{displayInvoiceNumber}
								</div>
								{companyAddress && (
									<div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 space-y-0.5 leading-relaxed print:text-slate-600">
										{companyAddress
											.split("\n")
											.map((line: string, idx: number) => (
												<p key={idx}>{line}</p>
											))}
									</div>
								)}
							</div>
						</div>

						{/* 2. Bill to & Dates Grid (Enhanced Spacing & No Ellipsis Clipping) */}
						<div className="grid grid-cols-2 gap-8 pt-1 avoid-page-break items-start">
							{/* Left Column: Bill to */}
							<div className="space-y-1">
								<span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block print:text-slate-500">
									BILL TO:
								</span>
								<h3 className="text-base font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
									{customerName}
								</h3>
								<div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 leading-relaxed print:text-slate-700">
									{customerAddress &&
										customerAddress
											.split("\n")
											.map((line: string, idx: number) => (
												<p key={idx}>{line}</p>
											))}
									{customerPhone && (
										<p className="font-mono text-slate-700 dark:text-slate-300 print:text-slate-800">
											{customerPhone}
										</p>
									)}
									{customerContact && customerContact !== customerPhone && (
										<p className="font-mono text-slate-500 text-[11px] print:text-slate-600">
											Alt: {customerContact}
										</p>
									)}
								</div>
							</div>

							{/* Right Column: Invoice Dates & Order Details (No Truncation) */}
							<div className="flex flex-col items-end justify-start">
								<div className="grid grid-cols-[auto_auto] items-baseline gap-x-4 gap-y-1.5 text-xs text-right">
									<span className="font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
										Invoice date:
									</span>
									<span className="font-mono text-slate-600 dark:text-slate-300 print:text-slate-700">
										{formattedInvoiceDate}
									</span>

									<span className="font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">
										Due date:
									</span>
									<span className="font-mono text-slate-600 dark:text-slate-300 print:text-slate-700">
										{formattedDueDate}
									</span>

									{orderNumber && (
										<>
											<span className="font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
												Order Ref:
											</span>
											<span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap print:text-indigo-600">
												{orderNumber}
											</span>
										</>
									)}

									{deliveryName && (
										<>
											<span className="font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
												Delivery:
											</span>
											<span className="text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap print:text-slate-800">
												{deliveryName}
											</span>
										</>
									)}
								</div>
							</div>
						</div>

						{/* 3. Items Table: Multi-page supported with clean Khmer typography & aligned columns */}
						<div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-slate-300">
							<table className="w-full text-left text-xs a4-table border-collapse">
								<thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 print:bg-slate-100 print:border-slate-300 print:text-slate-700">
									<tr>
										<th className="py-3.5 px-4 font-semibold">ITEM</th>
										<th className="py-3.5 px-3 text-center w-16 font-semibold">
											QTY
										</th>
										<th className="py-3.5 px-3 text-right w-24 font-semibold">
											UNIT PRICE
										</th>
										<th className="py-3.5 px-3 text-right w-24 font-semibold">
											DISCOUNT
										</th>
										<th className="py-3.5 px-4 text-right w-28 font-semibold">
											LINE TOTAL
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
									{items.map((item: any, idx: number) => (
										<tr
											key={idx}
											className="text-slate-800 dark:text-slate-200 print:text-slate-900"
										>
											<td className="py-3.5 px-4">
												<span className="font-bold text-slate-900 dark:text-slate-100 text-[13px] leading-relaxed print:text-slate-900">
													{item.name}
												</span>
												{item.unitName && (
													<span className="ml-1.5 text-xs font-normal text-slate-400 print:text-slate-500">
														({item.unitName})
													</span>
												)}
											</td>
											<td className="py-3.5 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300 print:text-slate-800">
												{item.qty}
											</td>
											<td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700 dark:text-slate-300 print:text-slate-800">
												{currencySymbol}
												{item.unitPrice.toLocaleString(undefined, {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</td>
											<td className="py-3.5 px-3 text-right font-mono font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
												{item.discount > 0 ? (
													<span className="text-rose-600 dark:text-rose-400 font-semibold print:text-rose-700">
														-{currencySymbol}
														{item.discount.toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</span>
												) : (
													<span>—</span>
												)}
											</td>
											<td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 text-[13px] print:text-slate-900">
												{currencySymbol}
												{item.amount.toLocaleString(undefined, {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* 4. Financial Breakdown Totals (Clean Right-Aligned Key-Value Layout) */}
						<div className="flex justify-end pt-1 avoid-page-break">
							<div className="w-full sm:w-72 space-y-1.5 text-xs">
								{/* Subtotal */}
								<div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-slate-800">
									<span className="font-semibold">Subtotal:</span>
									<span className="font-mono text-slate-900 dark:text-slate-100 font-medium print:text-slate-900">
										{currencySymbol}
										{subtotal.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								{/* Sales Discount */}
								{discountAmount > 0 && (
									<div className="flex justify-between items-center text-rose-600 dark:text-rose-400 print:text-rose-700">
										<span className="font-medium">Discount:</span>
										<span className="font-mono font-medium">
											-{currencySymbol}
											{discountAmount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								{/* Early Settlement / Cash Discount */}
								{paymentDiscountAmount > 0 && (
									<div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 print:text-emerald-700">
										<span className="font-medium">Cash Discount:</span>
										<span className="font-mono font-medium">
											-{currencySymbol}
											{paymentDiscountAmount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								{/* Total */}
								<div className="flex justify-between items-center text-slate-900 dark:text-slate-100 py-1.5 border-t border-b border-slate-100 dark:border-slate-800 print:border-slate-300">
									<span className="font-bold">Total:</span>
									<span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[13px] print:text-slate-900">
										{currencySymbol}
										{totalAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								{/* Tax */}
								<div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-slate-800">
									<span className="font-medium">Tax:</span>
									<span className="font-mono text-slate-900 dark:text-slate-100 font-medium print:text-slate-900">
										{currencySymbol}
										{taxAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								{/* Shipping if any */}
								{shippingAmount > 0 && (
									<div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-slate-800">
										<span className="font-medium">Shipping:</span>
										<span className="font-mono text-slate-900 dark:text-slate-100 font-medium print:text-slate-900">
											+{currencySymbol}
											{shippingAmount.toLocaleString(undefined, {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</span>
									</div>
								)}

								{/* Amount paid */}
								<div className="flex justify-between items-center text-slate-700 dark:text-slate-300 print:text-slate-800">
									<span className="font-semibold">Amount paid:</span>
									<span className="font-mono text-slate-900 dark:text-slate-100 font-semibold print:text-slate-900">
										{currencySymbol}
										{paidAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>

								{/* Due balance */}
								<div className="flex justify-between items-center text-slate-900 dark:text-slate-100 pt-1">
									<span className="font-bold">Due balance:</span>
									<span
										className={`font-mono font-bold text-sm ${remainingAmount > 0 ? "text-rose-600 dark:text-rose-400 print:text-rose-700" : "text-slate-900 dark:text-slate-100 print:text-slate-900"}`}
									>
										{currencySymbol}
										{remainingAmount.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
									</span>
								</div>
							</div>
						</div>

						{/* 5. Thank you! & Support Contact Footer */}
						<div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3 print:border-slate-200 avoid-page-break">
							<div className="space-y-1">
								<h4 className="text-base font-bold text-slate-900 dark:text-slate-100 print:text-slate-900">
									Thank you!
								</h4>
								<p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed print:text-slate-600">
									If you have any questions concerning this invoice, use the
									following contact information:
								</p>
							</div>

							{(companyEmail || companyPhone) && (
								<div className="text-xs font-mono space-y-0.5 text-slate-700 dark:text-slate-300 print:text-slate-800">
									{companyEmail && <p>{companyEmail}</p>}
									{companyPhone && <p>{companyPhone}</p>}
								</div>
							)}

							<div className="pt-3 text-[11px] text-slate-400 dark:text-slate-500 print:text-slate-500">
								© {new Date().getFullYear()} {companyName}. All rights reserved.
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

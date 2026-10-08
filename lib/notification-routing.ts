import { AppNotification } from "./types";

export interface ResolvableNotification {
	type?: string | null;
	referenceId?: string | number | null;
	title?: string | null;
	message?: string | null;
	body?: string | null;
	url?: string | null;
	[key: string]: any;
}

/**
 * Resolves the appropriate destination URL and deep-link query parameters
 * for a notification based on its type and references.
 *
 * Priority order:
 * 1. Explicit target URL if provided
 * 2. Payment lifecycle (PAYMENT_RECEIVED, etc.) -> /invoices?view=payments
 * 3. Invoice lifecycle (INVOICE_ISSUED, etc.) -> /invoices?invoiceNumber=...
 * 4. Stock alerts (LOW_STOCK) -> /inventory/stock?tab=low_stock
 * 5. Subscription lifecycle -> /subscriptions
 * 6. Order lifecycle (ORDER_*) -> /orders?orderNumber=...
 * 7. Pattern matches on referenceId and text content
 */
export function getNotificationTargetUrl(
	n: ResolvableNotification,
): string {
	// 1. Explicit URL in notification payload
	if (n.url && typeof n.url === "string" && n.url.startsWith("/")) {
		return n.url;
	}

	const type = (n.type || "").toUpperCase();
	const refId = n.referenceId ? String(n.referenceId).trim() : "";
	const combinedText = `${n.title || ""} ${n.message || ""} ${n.body || ""}`;

	// Extract standard codes from text
	const paymentMatch = combinedText.match(/#?(PAY-[A-Za-z0-9-]+)/i);
	const invoiceMatch = combinedText.match(/#?(INV-[A-Za-z0-9-]+)/i);
	const orderMatch = combinedText.match(/#?(ORD-[A-Za-z0-9-]+)/i);

	const isRefPayment = refId.toUpperCase().startsWith("PAY-");
	const isRefInvoice = refId.toUpperCase().startsWith("INV-");
	const isRefOrder = refId.toUpperCase().startsWith("ORD-");

	// 2. Payment notifications:
	// MUST be evaluated before orderMatch to prevent "Order #ORD-..." references inside payment messages
	// from misdirecting payment alerts to the Orders page.
	const isPaymentNotification =
		type.startsWith("PAYMENT") ||
		type.includes("PAYMENT") ||
		isRefPayment ||
		Boolean(paymentMatch && !type.startsWith("ORDER"));

	if (isPaymentNotification) {
		const invoiceCode = isRefInvoice ? refId : invoiceMatch?.[1];
		const paymentCode = isRefPayment ? refId : paymentMatch?.[1];

		const params = new URLSearchParams();
		if (invoiceCode) {
			if (/^\d+$/.test(invoiceCode)) {
				params.set("invoiceId", invoiceCode);
			} else {
				params.set("invoiceNumber", invoiceCode);
			}
		}
		if (paymentCode) {
			params.set("paymentNumber", paymentCode);
		} else if (!invoiceCode && refId) {
			if (/^\d+$/.test(refId)) {
				params.set("paymentId", refId);
			} else {
				params.set("paymentNumber", refId);
			}
		}
		params.set("view", "payments");

		const queryString = params.toString();
		return queryString ? `/invoices?${queryString}` : "/invoices?tab=PAID";
	}

	// 3. Invoice notifications:
	// MUST also be evaluated before generic orderMatch so "Invoice #INV for Order #ORD" stays in Invoices.
	const isInvoiceNotification =
		type.startsWith("INVOICE") ||
		type.includes("INVOICE") ||
		isRefInvoice ||
		Boolean(invoiceMatch && !type.startsWith("ORDER"));

	if (isInvoiceNotification) {
		const invoiceCode = isRefInvoice ? refId : invoiceMatch?.[1] || refId;
		if (invoiceCode) {
			if (/^\d+$/.test(invoiceCode)) {
				return `/invoices?invoiceId=${encodeURIComponent(invoiceCode)}`;
			}
			return `/invoices?invoiceNumber=${encodeURIComponent(invoiceCode)}`;
		}
		return "/invoices";
	}

	// 4. Stock / Inventory notifications
	if (
		type === "LOW_STOCK" ||
		type.includes("STOCK") ||
		combinedText.toLowerCase().includes("low stock") ||
		combinedText.toLowerCase().includes("out of stock")
	) {
		return "/inventory/stock?tab=low_stock";
	}

	// 5. Subscription notifications
	if (type.startsWith("SUBSCRIPTION") || type.includes("SUBSCRIPTION")) {
		return "/subscriptions";
	}

	// 6. Order notifications
	const isOrderNotification =
		type.startsWith("ORDER") ||
		type.includes("ORDER") ||
		isRefOrder ||
		Boolean(orderMatch);

	if (isOrderNotification) {
		const orderCode = isRefOrder ? refId : orderMatch?.[1] || refId;
		if (orderCode) {
			if (/^\d+$/.test(orderCode)) {
				return `/orders?orderId=${encodeURIComponent(orderCode)}`;
			}
			return `/orders?orderNumber=${encodeURIComponent(orderCode)}`;
		}
		return "/orders";
	}

	// 7. Fallback matches on codes or numeric IDs
	if (isRefPayment || paymentMatch) {
		const pay = isRefPayment ? refId : paymentMatch?.[1];
		return `/invoices?paymentNumber=${encodeURIComponent(pay || "")}&view=payments`;
	}

	if (isRefInvoice || invoiceMatch) {
		const inv = isRefInvoice ? refId : invoiceMatch?.[1];
		return `/invoices?invoiceNumber=${encodeURIComponent(inv || "")}`;
	}

	if (isRefOrder || orderMatch) {
		const ord = isRefOrder ? refId : orderMatch?.[1];
		return `/orders?orderNumber=${encodeURIComponent(ord || "")}`;
	}

	if (refId && /^\d+$/.test(refId)) {
		return `/orders?orderId=${encodeURIComponent(refId)}`;
	}

	return "/orders";
}

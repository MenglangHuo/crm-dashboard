"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, Customer, Loan, Invoice, Payment } from "@/lib/types";

export interface LoanWizardInitialValues {
	productId?: string;
	productName?: string;
	sellPrice?: number;
	customerId?: string;
}

export interface QuickPayInitialValues {
	customerId?: string;
	invoiceId?: string;
	amount?: number;
	currency?: string;
	loanScheduleId?: string;
	invoiceNo?: string;
	receiptUrl?: string;
}

export interface KhqrModalData {
	invoiceNo?: string;
	amount: number;
	currency: string;
	customerName?: string;
	merchantName?: string;
	reference?: string;
}

export interface ReceiptData {
	invoiceNo?: string;
	paymentRef?: string;
	customerName?: string;
	customerPhone?: string;
	customerContact?: string;
	customerAddress?: string;
	customerGender?: string;
	companyName?: string;
	companyEmail?: string;
	companyPhone?: string;
	companyAddress?: string;
	orderNumber?: string;
	deliveryName?: string;
	paymentTermName?: string;
	issuedAt?: string;
	dueDate?: string;
	subtotal?: number;
	taxAmount?: number;
	shippingAmount?: number;
	discountAmount?: number;
	totalAmount?: number;
	paidAmount?: number;
	paymentDiscountAmount?: number;
	remainingAmount?: number;
	amount: number;
	currency: string;
	date: string;
	paymentMethod?: string;
	status: string;
	description?: string;
	notes?: string;
	items?: Array<{
		id?: string | number;
		name?: string;
		productName?: string;
		description?: string;
		sku?: string;
		unitName?: string;
		qty?: number;
		quantity?: number;
		unitPrice?: number;
		rate?: number;
		discount?: number;
		total?: number;
		totalAmount?: number;
	}>;
	invoice?: Invoice | any;
}

interface QuickActionContextType {
	// Command palette
	isCommandPaletteOpen: boolean;
	setCommandPaletteOpen: (open: boolean) => void;

	// Unified Loan Origination Wizard
	isLoanWizardOpen: boolean;
	loanWizardInitialData: LoanWizardInitialValues | null;
	openLoanWizard: (initialData?: LoanWizardInitialValues) => void;
	closeLoanWizard: () => void;

	// Quick Payment Modal
	isQuickPayOpen: boolean;
	quickPayInitialData: QuickPayInitialValues | null;
	openQuickPay: (initialData?: QuickPayInitialValues) => void;
	closeQuickPay: () => void;

	// KHQR Modal
	isKhqrOpen: boolean;
	khqrData: KhqrModalData | null;
	openKhqr: (data: KhqrModalData) => void;
	closeKhqr: () => void;

	// Print Receipt Modal
	isReceiptOpen: boolean;
	receiptData: ReceiptData | null;
	openReceipt: (data: ReceiptData) => void;
	closeReceipt: () => void;

	// Add Customer / Add Product quick triggers
	isAddCustomerOpen: boolean;
	openAddCustomer: () => void;
	closeAddCustomer: () => void;

	isAddProductOpen: boolean;
	openAddProduct: () => void;
	closeAddProduct: () => void;
}

const QuickActionContext = createContext<QuickActionContextType | undefined>(
	undefined,
);

export function QuickActionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

	const [isLoanWizardOpen, setIsLoanWizardOpen] = useState(false);
	const [loanWizardInitialData, setLoanWizardInitialData] =
		useState<LoanWizardInitialValues | null>(null);

	const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
	const [quickPayInitialData, setQuickPayInitialData] =
		useState<QuickPayInitialValues | null>(null);

	const [isKhqrOpen, setIsKhqrOpen] = useState(false);
	const [khqrData, setKhqrData] = useState<KhqrModalData | null>(null);

	const [isReceiptOpen, setIsReceiptOpen] = useState(false);
	const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

	const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
	const [isAddProductOpen, setIsAddProductOpen] = useState(false);

	// Listen for Ctrl+K or Cmd+K
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setCommandPaletteOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const openLoanWizard = (initialData?: LoanWizardInitialValues) => {
		setLoanWizardInitialData(initialData || null);
		setIsLoanWizardOpen(true);
	};
	const closeLoanWizard = () => {
		setIsLoanWizardOpen(false);
		setLoanWizardInitialData(null);
	};

	const openQuickPay = (initialData?: QuickPayInitialValues) => {
		setQuickPayInitialData(initialData || null);
		setIsQuickPayOpen(true);
	};
	const closeQuickPay = () => {
		setIsQuickPayOpen(false);
		setQuickPayInitialData(null);
	};

	const openKhqr = (data: KhqrModalData) => {
		setKhqrData(data);
		setIsKhqrOpen(true);
	};
	const closeKhqr = () => {
		setIsKhqrOpen(false);
		setKhqrData(null);
	};

	const openReceipt = (data: ReceiptData) => {
		setReceiptData(data);
		setIsReceiptOpen(true);
	};
	const closeReceipt = () => {
		setIsReceiptOpen(false);
		setReceiptData(null);
	};

	const openAddCustomer = () => setIsAddCustomerOpen(true);
	const closeAddCustomer = () => setIsAddCustomerOpen(false);

	const openAddProduct = () => setIsAddProductOpen(true);
	const closeAddProduct = () => setIsAddProductOpen(false);

	return (
		<QuickActionContext.Provider
			value={{
				isCommandPaletteOpen,
				setCommandPaletteOpen,
				isLoanWizardOpen,
				loanWizardInitialData,
				openLoanWizard,
				closeLoanWizard,
				isQuickPayOpen,
				quickPayInitialData,
				openQuickPay,
				closeQuickPay,
				isKhqrOpen,
				khqrData,
				openKhqr,
				closeKhqr,
				isReceiptOpen,
				receiptData,
				openReceipt,
				closeReceipt,
				isAddCustomerOpen,
				openAddCustomer,
				closeAddCustomer,
				isAddProductOpen,
				openAddProduct,
				closeAddProduct,
			}}
		>
			{children}
		</QuickActionContext.Provider>
	);
}

export function useQuickActions() {
	const context = useContext(QuickActionContext);
	if (!context) {
		throw new Error(
			"useQuickActions must be used within a QuickActionProvider",
		);
	}
	return context;
}

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

export interface QuickActionState {
	// Command palette
	isCommandPaletteOpen: boolean;

	// Unified Loan Origination Wizard
	isLoanWizardOpen: boolean;
	loanWizardInitialData: LoanWizardInitialValues | null;

	// Quick Payment Modal
	isQuickPayOpen: boolean;
	quickPayInitialData: QuickPayInitialValues | null;

	// KHQR Modal
	isKhqrOpen: boolean;
	khqrData: KhqrModalData | null;

	// Print Receipt Modal
	isReceiptOpen: boolean;
	receiptData: ReceiptData | null;

	// Add Customer / Add Product quick triggers
	isAddCustomerOpen: boolean;
	isAddProductOpen: boolean;
}

export interface QuickActionDispatch {
	setCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
	openLoanWizard: (initialData?: LoanWizardInitialValues) => void;
	closeLoanWizard: () => void;
	openQuickPay: (initialData?: QuickPayInitialValues) => void;
	closeQuickPay: () => void;
	openKhqr: (data: KhqrModalData) => void;
	closeKhqr: () => void;
	openReceipt: (data: ReceiptData) => void;
	closeReceipt: () => void;
	openAddCustomer: () => void;
	closeAddCustomer: () => void;
	openAddProduct: () => void;
	closeAddProduct: () => void;
}

export type QuickActionContextType = QuickActionState & QuickActionDispatch;

const QuickActionStateContext = createContext<QuickActionState | undefined>(
	undefined,
);
const QuickActionDispatchContext = createContext<
	QuickActionDispatch | undefined
>(undefined);

export function QuickActionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isCommandPaletteOpen, setCommandPaletteOpenState] = useState(false);

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

	const setCommandPaletteOpen = React.useCallback(
		(openOrFn: boolean | ((prev: boolean) => boolean)) => {
			setCommandPaletteOpenState(openOrFn);
		},
		[],
	);

	// Listen for Ctrl+K or Cmd+K
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setCommandPaletteOpenState((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const openLoanWizard = React.useCallback(
		(initialData?: LoanWizardInitialValues) => {
			setLoanWizardInitialData(initialData || null);
			setIsLoanWizardOpen(true);
		},
		[],
	);
	const closeLoanWizard = React.useCallback(() => {
		setIsLoanWizardOpen(false);
		setLoanWizardInitialData(null);
	}, []);

	const openQuickPay = React.useCallback(
		(initialData?: QuickPayInitialValues) => {
			setQuickPayInitialData(initialData || null);
			setIsQuickPayOpen(true);
		},
		[],
	);
	const closeQuickPay = React.useCallback(() => {
		setIsQuickPayOpen(false);
		setQuickPayInitialData(null);
	}, []);

	const openKhqr = React.useCallback((data: KhqrModalData) => {
		setKhqrData(data);
		setIsKhqrOpen(true);
	}, []);
	const closeKhqr = React.useCallback(() => {
		setIsKhqrOpen(false);
		setKhqrData(null);
	}, []);

	const openReceipt = React.useCallback((data: ReceiptData) => {
		setReceiptData(data);
		setIsReceiptOpen(true);
	}, []);
	const closeReceipt = React.useCallback(() => {
		setIsReceiptOpen(false);
		setReceiptData(null);
	}, []);

	const openAddCustomer = React.useCallback(() => setIsAddCustomerOpen(true), []);
	const closeAddCustomer = React.useCallback(() => setIsAddCustomerOpen(false), []);

	const openAddProduct = React.useCallback(() => setIsAddProductOpen(true), []);
	const closeAddProduct = React.useCallback(() => setIsAddProductOpen(false), []);

	const dispatchValue = React.useMemo<QuickActionDispatch>(
		() => ({
			setCommandPaletteOpen,
			openLoanWizard,
			closeLoanWizard,
			openQuickPay,
			closeQuickPay,
			openKhqr,
			closeKhqr,
			openReceipt,
			closeReceipt,
			openAddCustomer,
			closeAddCustomer,
			openAddProduct,
			closeAddProduct,
		}),
		[
			setCommandPaletteOpen,
			openLoanWizard,
			closeLoanWizard,
			openQuickPay,
			closeQuickPay,
			openKhqr,
			closeKhqr,
			openReceipt,
			closeReceipt,
			openAddCustomer,
			closeAddCustomer,
			openAddProduct,
			closeAddProduct,
		],
	);

	const stateValue = React.useMemo<QuickActionState>(
		() => ({
			isCommandPaletteOpen,
			isLoanWizardOpen,
			loanWizardInitialData,
			isQuickPayOpen,
			quickPayInitialData,
			isKhqrOpen,
			khqrData,
			isReceiptOpen,
			receiptData,
			isAddCustomerOpen,
			isAddProductOpen,
		}),
		[
			isCommandPaletteOpen,
			isLoanWizardOpen,
			loanWizardInitialData,
			isQuickPayOpen,
			quickPayInitialData,
			isKhqrOpen,
			khqrData,
			isReceiptOpen,
			receiptData,
			isAddCustomerOpen,
			isAddProductOpen,
		],
	);

	return (
		<QuickActionDispatchContext.Provider value={dispatchValue}>
			<QuickActionStateContext.Provider value={stateValue}>
				{children}
			</QuickActionStateContext.Provider>
		</QuickActionDispatchContext.Provider>
	);
}

export function useQuickActionDispatch(): QuickActionDispatch {
	const context = useContext(QuickActionDispatchContext);
	if (!context) {
		throw new Error(
			"useQuickActionDispatch must be used within a QuickActionProvider",
		);
	}
	return context;
}

export function useQuickActionState(): QuickActionState {
	const context = useContext(QuickActionStateContext);
	if (!context) {
		throw new Error(
			"useQuickActionState must be used within a QuickActionProvider",
		);
	}
	return context;
}

export function useQuickActions(): QuickActionContextType {
	const state = useContext(QuickActionStateContext);
	const dispatch = useContext(QuickActionDispatchContext);
	if (!state || !dispatch) {
		throw new Error(
			"useQuickActions must be used within a QuickActionProvider",
		);
	}
	return React.useMemo(
		() => ({
			...state,
			...dispatch,
		}),
		[state, dispatch],
	);
}

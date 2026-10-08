"use client";

import React, { useState, useEffect } from "react";
import {
	QrCode,
	Copy,
	CheckCircle2,
	RefreshCw,
	ShieldCheck,
	Download,
	Smartphone,
} from "lucide-react";
import { useQuickActions } from "@/components/quick-action-modal-context";
import { toast } from "sonner";

export function AbaKhqrModal() {
	const { isKhqrOpen, closeKhqr, khqrData } = useQuickActions();
	const [copied, setCopied] = useState(false);
	const [isSimulating, setIsSimulating] = useState(false);

	if (!isKhqrOpen || !khqrData) return null;

	const merchantName = khqrData.merchantName || "Crm Studio Enterprise";
	const amountStr = `${khqrData.currency === "KHR" ? "៛" : "$"}${khqrData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
	const referenceNo =
		khqrData.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`;

	const handleCopyLink = () => {
		navigator.clipboard.writeText(
			`khqr://pay?merchant=${encodeURIComponent(merchantName)}&amount=${khqrData.amount}&ref=${referenceNo}`,
		);
		setCopied(true);
		toast.success("KHQR string copied to clipboard!");
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSimulateScanSuccess = () => {
		setIsSimulating(true);
		setTimeout(() => {
			setIsSimulating(false);
			toast.success("Payment Received via ABA KHQR!", {
				description: `Successfully collected ${amountStr} for ${khqrData.customerName || "Customer"}`,
			});
			closeKhqr();
		}, 1200);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
			<div
				className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-rose-500/30 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-200"
				onClick={(e) => e.stopPropagation()}
			>
				{/* KHQR Header Banner */}
				<div className="bg-rose-600 px-6 py-4 text-center text-white relative overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-full bg-linear-to-r from-rose-700 to-rose-500 opacity-90" />
					<div className="relative z-10 flex flex-col items-center">
						<div className="flex items-center gap-2 font-black tracking-wider text-lg">
							<span className="bg-white text-rose-600 px-2 py-0.5 rounded-lg text-xs font-black">
								KHQR
							</span>
							<span>ABA PAY</span>
						</div>
						<p className="text-[11px] font-medium text-rose-100 mt-0.5">
							National QR Code Standard
						</p>
					</div>
				</div>

				{/* Modal Content */}
				<div className="p-6 text-center space-y-4">
					<div>
						<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
							{merchantName}
						</h4>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Scan with any Cambodian Mobile Banking App
						</p>
					</div>

					{/* Amount Badge */}
					<div className="inline-block rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-6 py-2.5">
						<span className="text-2xl font-black text-rose-600 dark:text-rose-400">
							{amountStr}
						</span>
					</div>

					{/* Dynamic Authentic KHQR Graphic Box */}
					<div className="relative mx-auto h-52 w-52 rounded-2xl border-2 border-rose-500 bg-white p-3 shadow-inner flex flex-col items-center justify-center">
						<div className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-bold text-rose-600">
							<ShieldCheck className="h-3 w-3" /> EMVCo
						</div>

						{/* Generated SVG QR Code Graphic */}
						<svg viewBox="0 0 100 100" className="h-40 w-40 text-slate-900">
							<rect x="0" y="0" width="100" height="100" fill="white" />
							{/* Outer Position Detection Squares */}
							<rect x="5" y="5" width="25" height="25" fill="black" />
							<rect x="9" y="9" width="17" height="17" fill="white" />
							<rect x="13" y="13" width="9" height="9" fill="#e11d48" />

							<rect x="70" y="5" width="25" height="25" fill="black" />
							<rect x="74" y="9" width="17" height="17" fill="white" />
							<rect x="78" y="13" width="9" height="9" fill="#e11d48" />

							<rect x="5" y="70" width="25" height="25" fill="black" />
							<rect x="9" y="74" width="17" height="17" fill="white" />
							<rect x="13" y="78" width="9" height="9" fill="#e11d48" />

							{/* Random Pattern Dots simulating QR payload */}
							<circle cx="40" cy="15" r="3" fill="black" />
							<circle cx="55" cy="15" r="3" fill="black" />
							<circle cx="45" cy="25" r="3" fill="#e11d48" />
							<circle cx="60" cy="25" r="3" fill="black" />
							<circle cx="15" cy="45" r="3" fill="black" />
							<circle cx="25" cy="55" r="3" fill="black" />
							<circle cx="35" cy="40" r="3" fill="black" />
							<circle cx="50" cy="50" r="4" fill="#e11d48" />
							<circle cx="65" cy="45" r="3" fill="black" />
							<circle cx="85" cy="45" r="3" fill="black" />
							<circle cx="40" cy="70" r="3" fill="black" />
							<circle cx="55" cy="80" r="3" fill="black" />
							<circle cx="70" cy="75" r="3" fill="black" />
							<circle cx="85" cy="80" r="3" fill="#e11d48" />
						</svg>

						{/* ABA Logo Badge Center */}
						<div className="absolute inset-0 m-auto h-9 w-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-white">
							ABA
						</div>
					</div>

					<div className="text-[11px] text-slate-400 font-mono">
						Ref: {referenceNo}
					</div>

					{/* Action Buttons */}
					<div className="space-y-2 pt-2">
						<button
							onClick={handleSimulateScanSuccess}
							disabled={isSimulating}
							className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
						>
							{isSimulating ? (
								<RefreshCw className="h-4 w-4 animate-spin" />
							) : (
								<CheckCircle2 className="h-4 w-4" />
							)}
							Simulate Instant Mobile Scan
						</button>

						<div className="flex items-center gap-2">
							<button
								onClick={handleCopyLink}
								className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100"
							>
								<Copy className="h-3.5 w-3.5" />
								{copied ? "Copied!" : "Copy Payload"}
							</button>

							<button
								onClick={closeKhqr}
								className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

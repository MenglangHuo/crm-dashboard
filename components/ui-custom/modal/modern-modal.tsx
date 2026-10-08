"use client";

import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useId,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
	X,
	Minimize2,
	Maximize2,
	Maximize,
	RotateCcw,
	Loader2,
	GripHorizontal,
	Sparkles,
	Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "auto";

export interface ModernModalProps {
	isOpen?: boolean;
	open?: boolean;
	onClose?: () => void;
	onOpenChange?: (open: boolean) => void;

	title?: ReactNode;
	subtitle?: ReactNode;
	description?: ReactNode;
	icon?: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;

	size?: ModalSize;
	defaultWidth?: number | string;
	defaultHeight?: number | string;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number | string;
	maxHeight?: number | string;

	draggable?: boolean;
	resizable?: boolean;
	closeOnEsc?: boolean;
	closeOnOutsideClick?: boolean;
	showOverlay?: boolean;
	glassmorphism?: boolean;
	isLoading?: boolean;
	loadingText?: string;

	allowMinimize?: boolean;
	allowMaximize?: boolean;
	allowFullscreen?: boolean;

	onCancel?: () => void;
	onSubmit?: () => void;
	cancelText?: ReactNode;
	submitText?: ReactNode;
	cancelIcon?: ReactNode;
	submitIcon?: ReactNode;
	submitFormId?: string;

	className?: string;
	headerClassName?: string;
	bodyClassName?: string;
	footerClassName?: string;
	overlayClassName?: string;

	onMinimizeChange?: (isMinimized: boolean) => void;
	onMaximizeChange?: (isMaximized: boolean) => void;
}

type WindowMode = "normal" | "minimized" | "maximized" | "fullscreen";

const SIZE_MAP: Record<ModalSize, { width: string; height: string }> = {
	sm: { width: "max-w-md w-full", height: "max-h-[80vh]" },
	md: { width: "max-w-xl w-full", height: "max-h-[85vh]" },
	lg: { width: "max-w-3xl w-full", height: "max-h-[88vh]" },
	xl: { width: "max-w-5xl w-full", height: "max-h-[90vh]" },
	"2xl": { width: "max-w-7xl w-full", height: "max-h-[92vh]" },
	full: { width: "w-[96vw]", height: "h-[94vh]" },
	auto: { width: "w-auto min-w-[320px]", height: "h-auto" },
};

export function ModernModal({
	isOpen,
	open,
	onClose,
	onOpenChange,
	title,
	subtitle,
	description,
	icon,
	children,
	footer,
	size = "lg",
	defaultWidth,
	defaultHeight,
	minWidth = 340,
	minHeight = 220,
	maxWidth,
	maxHeight,
	draggable = true,
	resizable = true,
	closeOnEsc = true,
	closeOnOutsideClick = true,
	showOverlay = true,
	glassmorphism = true,
	isLoading = false,
	loadingText = "Loading details...",
	allowMinimize = true,
	allowMaximize = true,
	allowFullscreen = true,
	onCancel,
	onSubmit,
	cancelText = "Cancel",
	submitText = "Save Changes",
	cancelIcon,
	submitIcon,
	submitFormId,
	className,
	headerClassName,
	bodyClassName,
	footerClassName,
	overlayClassName,
	onMinimizeChange,
	onMaximizeChange,
}: ModernModalProps) {
	const isModalOpen = Boolean(isOpen ?? open);
	const effectiveSubtitle = subtitle ?? description;
	const handleClose = () => {
		onClose?.();
		onOpenChange?.(false);
	};

	const [mounted, setMounted] = useState(false);
	const [mode, setMode] = useState<WindowMode>("normal");
	const [position, setPosition] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [dimensions, setDimensions] = useState<{
		width?: number;
		height?: number;
	}>({});
	const [isDragging, setIsDragging] = useState(false);
	const [isResizing, setIsResizing] = useState(false);

	const modalRef = useRef<HTMLDivElement>(null);
	const dragStartRef = useRef<{
		startX: number;
		startY: number;
		posX: number;
		posY: number;
	}>({
		startX: 0,
		startY: 0,
		posX: 0,
		posY: 0,
	});

	const resizeStartRef = useRef<{
		startX: number;
		startY: number;
		startW: number;
		startH: number;
		posX: number;
		posY: number;
		direction: string;
	}>({
		startX: 0,
		startY: 0,
		startW: 0,
		startH: 0,
		posX: 0,
		posY: 0,
		direction: "",
	});

	const titleId = useId();
	const descriptionId = useId();

	useEffect(() => {
		setMounted(true);
	}, []);

	// Reset window position and dimensions on open
	useEffect(() => {
		if (isModalOpen) {
			setMode("normal");
			setPosition({ x: 0, y: 0 });
			const initialW =
				typeof defaultWidth === "number" ? defaultWidth : undefined;
			const initialH =
				typeof defaultHeight === "number" ? defaultHeight : undefined;
			setDimensions({ width: initialW, height: initialH });
		}
	}, [isModalOpen, defaultWidth, defaultHeight]);

	// Sync mode callbacks
	useEffect(() => {
		onMinimizeChange?.(mode === "minimized");
		onMaximizeChange?.(mode === "maximized" || mode === "fullscreen");
	}, [mode, onMinimizeChange, onMaximizeChange]);

	// ESC Key listener
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!isModalOpen || mode === "minimized") return;
			if (closeOnEsc && e.key === "Escape") {
				e.preventDefault();
				handleClose();
			}
		},
		[isModalOpen, mode, closeOnEsc, onClose, onOpenChange],
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	// Lock body scroll when open (unless minimized)
	useEffect(() => {
		if (isModalOpen && mode !== "minimized") {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isModalOpen, mode]);

	// --- DRAG LOGIC ---
	const handleDragStart = (e: React.PointerEvent) => {
		if (!draggable || mode !== "normal") return;
		if (
			(e.target as HTMLElement).closest(
				"button, input, select, textarea, a, [data-nodrag]",
			)
		)
			return;

		setIsDragging(true);
		dragStartRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			posX: position.x,
			posY: position.y,
		};
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	};

	const handleDragMove = (e: React.PointerEvent) => {
		if (!isDragging) return;
		const dx = e.clientX - dragStartRef.current.startX;
		const dy = e.clientY - dragStartRef.current.startY;

		// Viewport constraints
		const maxOffset = Math.min(window.innerWidth / 2 - 100, 800);
		const newX = Math.max(
			-maxOffset,
			Math.min(maxOffset, dragStartRef.current.posX + dx),
		);
		const newY = Math.max(
			-maxOffset,
			Math.min(maxOffset, dragStartRef.current.posY + dy),
		);

		setPosition({ x: newX, y: newY });
	};

	const handleDragEnd = (e: React.PointerEvent) => {
		if (isDragging) {
			setIsDragging(false);
			try {
				(e.target as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				// ignore
			}
		}
	};

	// --- RESIZE LOGIC ---
	const handleResizeStart = (direction: string, e: React.PointerEvent) => {
		if (!resizable || mode !== "normal") return;
		e.preventDefault();
		e.stopPropagation();

		const rect = modalRef.current?.getBoundingClientRect();
		if (!rect) return;

		setIsResizing(true);
		resizeStartRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			startW: rect.width,
			startH: rect.height,
			posX: position.x,
			posY: position.y,
			direction,
		};
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	};

	const handleResizeMove = (e: React.PointerEvent) => {
		if (!isResizing) return;
		const { startX, startY, startW, startH, posX, posY, direction } =
			resizeStartRef.current;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;

		let newW = startW;
		let newH = startH;
		let newX = posX;
		let newY = posY;

		const maxW =
			typeof maxWidth === "number" ? maxWidth : window.innerWidth - 40;
		const maxH =
			typeof maxHeight === "number" ? maxHeight : window.innerHeight - 40;

		if (direction.includes("e"))
			newW = Math.min(maxW, Math.max(minWidth, startW + dx));
		if (direction.includes("s"))
			newH = Math.min(maxH, Math.max(minHeight, startH + dy));
		if (direction.includes("w")) {
			const possibleW = Math.min(maxW, Math.max(minWidth, startW - dx));
			newX = posX + (startW - possibleW) / 2;
			newW = possibleW;
		}
		if (direction.includes("n")) {
			const possibleH = Math.min(maxH, Math.max(minHeight, startH - dy));
			newY = posY + (startH - possibleH) / 2;
			newH = possibleH;
		}

		setDimensions({ width: newW, height: newH });
		setPosition({ x: newX, y: newY });
	};

	const handleResizeEnd = (e: React.PointerEvent) => {
		if (isResizing) {
			setIsResizing(false);
			try {
				(e.target as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				// ignore
			}
		}
	};

	// Double click header to toggle maximize
	const handleHeaderDoubleClick = () => {
		if (!allowMaximize) return;
		setMode((prev) => (prev === "maximized" ? "normal" : "maximized"));
	};

	if (!mounted || !isModalOpen) return null;

	// MINIMIZED TRAY BAR AT BOTTOM RIGHT
	if (mode === "minimized") {
		return createPortal(
			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 dark:border-slate-800/90 dark:bg-slate-900/90">
				<div className="flex items-center gap-2">
					{icon || (
						<Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
					)}
					<span className="max-w-[180px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
						{typeof title === "string" ? title : "Modal"}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setMode("normal")}
						className="h-7 w-7 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
						title="Restore modal"
					>
						<RotateCcw className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleClose}
						className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
						title="Close"
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>,
			document.body,
		);
	}

	// MODE STYLES & BOUNDS
	const isFullScreen = mode === "fullscreen";
	const isMaximized = mode === "maximized";

	let sizeClasses =
		typeof maxWidth === "string" && maxWidth.startsWith("max-w-")
			? maxWidth
			: SIZE_MAP[size].width;
	let heightClasses = SIZE_MAP[size].height;

	if (isFullScreen) {
		sizeClasses =
			"w-screen h-screen max-w-none max-h-none rounded-none border-0";
		heightClasses = "h-screen";
	} else if (isMaximized) {
		sizeClasses =
			"w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none max-h-none";
		heightClasses = "h-[calc(100vh-2rem)]";
	}

	const inlineStyles: React.CSSProperties = {
		transform:
			mode === "normal"
				? `translate3d(${position.x}px, ${position.y}px, 0)`
				: undefined,
		width:
			mode === "normal" && dimensions.width
				? `${dimensions.width}px`
				: undefined,
		height:
			mode === "normal" && dimensions.height
				? `${dimensions.height}px`
				: undefined,
	};

	// Auto-generate footer if footer prop is omitted but action handlers or submitFormId are passed
	const renderedFooter =
		footer ||
		(onCancel || onSubmit || submitFormId ? (
			<ModernModalFooter>
				<ModernModalCancelButton
					onClick={onCancel || handleClose}
					icon={cancelIcon}
				>
					{cancelText}
				</ModernModalCancelButton>
				<ModernModalSubmitButton
					onClick={onSubmit}
					form={submitFormId}
					isLoading={isLoading}
					icon={submitIcon}
				>
					{submitText}
				</ModernModalSubmitButton>
			</ModernModalFooter>
		) : null);

	return createPortal(
		<div
			tabIndex={-1}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={effectiveSubtitle ? descriptionId : undefined}
			className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 outline-none"
		>
			{/* BACKDROP OVERLAY */}
			{showOverlay && (
				<div
					onClick={() => closeOnOutsideClick && handleClose()}
					className={cn(
						"fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 dark:bg-slate-950/70",
						overlayClassName,
					)}
				/>
			)}

			{/* MODAL MAIN CONTAINER */}
			<div
				ref={modalRef}
				style={inlineStyles}
				className={cn(
					"relative z-50 flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white text-slate-900 shadow-2xl transition-shadow dark:border-slate-800/90 dark:bg-slate-950 dark:text-slate-100",
					glassmorphism && "bg-white/95 backdrop-blur-xl dark:bg-slate-950/95",
					sizeClasses,
					heightClasses,
					mode === "normal" && "animate-in fade-in zoom-in-95 duration-200",
					isDragging &&
						"cursor-grabbing select-none shadow-purple-500/10 ring-2 ring-purple-500/30",
					isResizing && "select-none ring-2 ring-purple-500/40",
					className,
				)}
			>
				{/* RESIZE HANDLES (8-axis) */}
				{resizable && mode === "normal" && (
					<>
						<div
							onPointerDown={(e) => handleResizeStart("n", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute top-0 left-4 right-4 h-1.5 cursor-n-resize z-50 hover:bg-purple-500/40 transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("s", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize z-50 hover:bg-purple-500/40 transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("w", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute top-4 bottom-4 left-0 w-1.5 cursor-w-resize z-50 hover:bg-purple-500/40 transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("e", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute top-4 bottom-4 right-0 w-1.5 cursor-e-resize z-50 hover:bg-purple-500/40 transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("nw", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute top-0 left-0 h-3 w-3 cursor-nw-resize z-50 hover:bg-purple-500/60 rounded-tl-xl transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("ne", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute top-0 right-0 h-3 w-3 cursor-ne-resize z-50 hover:bg-purple-500/60 rounded-tr-xl transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("sw", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute bottom-0 left-0 h-3 w-3 cursor-sw-resize z-50 hover:bg-purple-500/60 rounded-bl-xl transition-colors"
						/>
						<div
							onPointerDown={(e) => handleResizeStart("se", e)}
							onPointerMove={handleResizeMove}
							onPointerUp={handleResizeEnd}
							className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize z-50 hover:bg-purple-500/60 rounded-br-xl transition-colors"
						/>
					</>
				)}

				{/* HEADER */}
				<header
					onPointerDown={handleDragStart}
					onPointerMove={handleDragMove}
					onPointerUp={handleDragEnd}
					onDoubleClick={handleHeaderDoubleClick}
					className={cn(
						"sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4 transition-colors dark:border-slate-800/80 dark:bg-slate-900/80",
						draggable &&
							mode === "normal" &&
							"cursor-grab active:cursor-grabbing",
						headerClassName,
					)}
				>
					<div className="flex items-center gap-3 min-w-0 pr-4">
						{draggable && mode === "normal" && (
							<GripHorizontal className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
						)}
						{icon && (
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
								{icon}
							</div>
						)}
						<div className="min-w-0">
							{title && (
								<h3
									id={titleId}
									className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate"
								>
									{title}
								</h3>
							)}
							{effectiveSubtitle && (
								<p
									id={descriptionId}
									className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate"
								>
									{effectiveSubtitle}
								</p>
							)}
						</div>
					</div>

					{/* WINDOW CONTROLS */}
					<div className="flex items-center gap-1 shrink-0" data-nodrag>
						{allowMinimize && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setMode("minimized")}
								className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
								title="Minimize"
							>
								<Minimize2 className="h-4 w-4" />
							</Button>
						)}

						{allowMaximize && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() =>
									setMode(mode === "maximized" ? "normal" : "maximized")
								}
								className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
								title={mode === "maximized" ? "Restore" : "Maximize"}
							>
								{mode === "maximized" ? (
									<RotateCcw className="h-4 w-4" />
								) : (
									<Maximize2 className="h-4 w-4" />
								)}
							</Button>
						)}

						{allowFullscreen && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() =>
									setMode(mode === "fullscreen" ? "normal" : "fullscreen")
								}
								className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
								title={mode === "fullscreen" ? "Exit Fullscreen" : "Fullscreen"}
							>
								<Maximize className="h-4 w-4" />
							</Button>
						)}

						<Button
							variant="ghost"
							size="icon"
							onClick={handleClose}
							className="h-8 w-8 rounded-lg text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition-colors"
							title="Close (Esc)"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>
				</header>

				{/* BODY - SCROLLABLE ONLY */}
				<div
					className={cn(
						"relative flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700",
						bodyClassName,
					)}
				>
					{/* LOADING OVERLAY */}
					{isLoading && (
						<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs dark:bg-slate-950/80 animate-in fade-in duration-150">
							<Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
							<p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
								{loadingText}
							</p>
						</div>
					)}

					{children}
				</div>

				{/* FOOTER WITH ENHANCED PADDING AND ICON BUTTONS */}
				{renderedFooter && (
					<footer
						className={cn(
							"sticky bottom-0 z-20 flex shrink-0 items-center justify-end gap-4 border-t border-slate-200/80 bg-slate-50/95 px-6 sm:px-8 py-5 sm:py-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95",
							footerClassName,
						)}
					>
						{renderedFooter}
					</footer>
				)}
			</div>
		</div>,
		document.body,
	);
}

/**
 * Helper Subcomponents for structured usage
 */
export function ModernModalHeader({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn("space-y-1", className)}>{children}</div>;
}

export function ModernModalBody({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function ModernModalFooter({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-3.5 sm:gap-4 w-full justify-end",
				className,
			)}
		>
			{children}
		</div>
	);
}

export interface ModernModalButtonExtraProps {
	label?: ReactNode;
	height?: string;
	width?: string;
	padding?: string;
	icon?: ReactNode;
}

export interface ModernModalActionButtonProps
	extends React.ComponentProps<typeof Button>,
		ModernModalButtonExtraProps {}

export function ModernModalActionButton({
	onClick,
	label,
	children,
	className,
	disabled,
	height = "h-11",
	width = "min-w-[125px]",
	padding = "px-6",
	icon,
	variant = "outline",
	...props
}: ModernModalActionButtonProps) {
	const textContent = label ?? children;
	return (
		<Button
			type="button"
			variant={variant}
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-xl font-bold text-xs transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98] gap-2 cursor-pointer inline-flex items-center justify-center",
				height,
				width,
				padding,
				className,
			)}
			{...props}
		>
			{icon}
			{textContent && <span>{textContent}</span>}
		</Button>
	);
}

export function ModernModalCancelButton({
	onClick,
	label,
	children,
	className,
	disabled,
	height = "h-11",
	width = "min-w-[125px]",
	padding = "px-6",
	icon = (
		<X className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-slate-700 dark:text-slate-400" />
	),
	...props
}: React.ComponentProps<typeof Button> & ModernModalButtonExtraProps) {
	const { t } = useTranslation();
	const textContent = label ?? children ?? t("common.cancel");
	return (
		<Button
			type="button"
			variant="outline"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-xl font-bold text-xs border border-slate-300/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98] gap-2 cursor-pointer inline-flex items-center justify-center",
				height,
				width,
				padding,
				className,
			)}
			{...props}
		>
			{icon}
			<span>{textContent}</span>
		</Button>
	);
}

export function ModernModalSubmitButton({
	label,
	children,
	className,
	disabled,
	isLoading,
	loading,
	loadingText,
	form,
	type = "submit",
	onClick,
	height = "h-11",
	width = "min-w-[125px]",
	padding = "px-6",
	icon = <Check className="h-4 w-4 shrink-0" />,
	...props
}: React.ComponentProps<typeof Button> &
	ModernModalButtonExtraProps & {
		isLoading?: boolean;
		loading?: boolean;
		loadingText?: string;
	}) {
	const { t } = useTranslation();
	const textContent = label ?? children ?? t("common.save");
	const isPending = Boolean(isLoading || loading);
	const pendingText = loadingText ?? t("common.saving");
	return (
		<Button
			type={type}
			form={form}
			onClick={onClick}
			disabled={disabled || isPending}
			className={cn(
				"rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 active:scale-[0.98] gap-2 cursor-pointer inline-flex items-center justify-center",
				height,
				width,
				padding,
				className,
			)}
			{...props}
		>
			{isPending ? (
				<>
					<Loader2 className="h-4 w-4 animate-spin shrink-0" />
					<span>{pendingText}</span>
				</>
			) : (
				<>
					{icon}
					<span>{textContent}</span>
				</>
			)}
		</Button>
	);
}

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
	onResize?: (dimensions: { width?: number; height?: number }) => void;
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

function parseSizeToPixels(
	val: number | string | undefined,
	viewportDimension: number,
	defaultVal: number,
): number {
	if (typeof val === "number") return val;
	if (typeof val === "string") {
		const trimmed = val.trim();
		if (trimmed.endsWith("px")) {
			const parsed = parseFloat(trimmed);
			if (!isNaN(parsed)) return parsed;
		}
		if (trimmed.endsWith("vw") || trimmed.endsWith("vh")) {
			const parsed = parseFloat(trimmed);
			if (!isNaN(parsed)) return (parsed / 100) * viewportDimension;
		}
		if (trimmed.endsWith("%")) {
			const parsed = parseFloat(trimmed);
			if (!isNaN(parsed)) return (parsed / 100) * viewportDimension;
		}
		const tailwindMap: Record<string, number> = {
			sm: 384,
			md: 448,
			lg: 512,
			xl: 576,
			"2xl": 672,
			"3xl": 768,
			"4xl": 896,
			"5xl": 1024,
			"6xl": 1152,
			"7xl": 1280,
		};
		const key = trimmed.replace(/^max-w-/, "");
		if (tailwindMap[key]) return tailwindMap[key];
		const parsed = parseFloat(trimmed);
		if (!isNaN(parsed)) return parsed;
	}
	return defaultVal;
}

function getResizeCursor(direction: string): string {
	switch (direction) {
		case "n":
		case "s":
			return "ns-resize";
		case "e":
		case "w":
			return "ew-resize";
		case "nw":
		case "se":
			return "nwse-resize";
		case "ne":
		case "sw":
			return "nesw-resize";
		default:
			return "default";
	}
}

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
	size = "md",
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
	onResize,
}: ModernModalProps) {
	const isModalOpen = Boolean(isOpen ?? open);
	const effectiveSubtitle = subtitle ?? description;
	const handleClose = useCallback(() => {
		onClose?.();
		onOpenChange?.(false);
	}, [onClose, onOpenChange]);

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
	const prevOpenRef = useRef(false);
	const justInteractedRef = useRef(false);
	const isDraggingRef = useRef(false);
	const isResizingRef = useRef(false);

	const titleId = useId();
	const descriptionId = useId();

	useEffect(() => {
		setMounted(true);
	}, []);

	// Reset window position and dimensions only on initial open transition
	useEffect(() => {
		if (isModalOpen && !prevOpenRef.current) {
			setMode("normal");
			setPosition({ x: 0, y: 0 });
			const initialW =
				typeof defaultWidth === "number"
					? defaultWidth
					: typeof defaultWidth === "string"
						? parseSizeToPixels(
								defaultWidth,
								typeof window !== "undefined" ? window.innerWidth : 1024,
								0,
							) || undefined
						: undefined;
			const initialH =
				typeof defaultHeight === "number"
					? defaultHeight
					: typeof defaultHeight === "string"
						? parseSizeToPixels(
								defaultHeight,
								typeof window !== "undefined" ? window.innerHeight : 768,
								0,
							) || undefined
						: undefined;
			setDimensions({ width: initialW, height: initialH });
		}
		prevOpenRef.current = isModalOpen;
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
		[isModalOpen, mode, closeOnEsc, handleClose],
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

	// Keep modal comfortably within viewport when browser window is resized
	useEffect(() => {
		if (!isModalOpen || mode !== "normal") return;

		const handleWindowResize = () => {
			const maxW = Math.max(minWidth, window.innerWidth - 32);
			const maxH = Math.max(minHeight, window.innerHeight - 32);

			setDimensions((prev) => {
				if (!prev.width && !prev.height) return prev;
				const clampedW = prev.width ? Math.min(prev.width, maxW) : undefined;
				const clampedH = prev.height ? Math.min(prev.height, maxH) : undefined;
				if (clampedW === prev.width && clampedH === prev.height) return prev;
				return { width: clampedW, height: clampedH };
			});

			setPosition((prev) => {
				const maxOffsetX = Math.max(0, window.innerWidth / 2 - 80);
				const maxOffsetY = Math.max(0, window.innerHeight / 2 - 80);
				const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, prev.x));
				const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, prev.y));
				if (clampedX === prev.x && clampedY === prev.y) return prev;
				return { x: clampedX, y: clampedY };
			});
		};

		window.addEventListener("resize", handleWindowResize);
		return () => window.removeEventListener("resize", handleWindowResize);
	}, [isModalOpen, mode, minWidth, minHeight]);

	// --- DRAG LOGIC ---
	const handleDragStart = (e: React.PointerEvent) => {
		if (!draggable || mode !== "normal") return;
		if (
			(e.target as HTMLElement).closest(
				"button, input, select, textarea, a, [data-nodrag]",
			)
		)
			return;

		e.preventDefault();
		const rect = modalRef.current?.getBoundingClientRect();
		if (!rect) return;

		setIsDragging(true);
		isDraggingRef.current = true;

		const startX = e.clientX;
		const startY = e.clientY;
		const startPosX = position.x;
		const startPosY = position.y;
		const modalW = rect.width;
		const modalH = rect.height;

		document.body.style.userSelect = "none";

		const handlePointerMove = (moveEvent: PointerEvent) => {
			if (!isDraggingRef.current) return;
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;

			const halfVw = window.innerWidth / 2;
			const halfVh = window.innerHeight / 2;

			// Keep title bar inside the screen with a safe margin
			const minX = -halfVw + modalW / 2 + 16;
			const maxX = halfVw - modalW / 2 - 16;
			const minY = -halfVh + modalH / 2 + 16;
			const maxY = halfVh - modalH / 2 - 16;

			const clampedX =
				minX <= maxX
					? Math.max(minX, Math.min(maxX, startPosX + dx))
					: startPosX + dx;
			const clampedY =
				minY <= maxY
					? Math.max(minY, Math.min(maxY, startPosY + dy))
					: startPosY + dy;

			setPosition({ x: clampedX, y: clampedY });
		};

		const handlePointerUp = () => {
			isDraggingRef.current = false;
			setIsDragging(false);

			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerUp);

			document.body.style.userSelect = "";

			justInteractedRef.current = true;
			setTimeout(() => {
				justInteractedRef.current = false;
			}, 150);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerUp);
	};

	// --- 8-AXIS RESIZE LOGIC ---
	const handleResizeStart = (direction: string, e: React.PointerEvent) => {
		if (!resizable || mode !== "normal") return;
		e.preventDefault();
		e.stopPropagation();

		const rect = modalRef.current?.getBoundingClientRect();
		if (!rect) return;

		setIsResizing(true);
		isResizingRef.current = true;

		const startX = e.clientX;
		const startY = e.clientY;
		const startW = rect.width;
		const startH = rect.height;
		const startPosX = position.x;
		const startPosY = position.y;

		// Calculate initial edges in viewport coordinates
		const centerStartX = window.innerWidth / 2 + startPosX;
		const centerStartY = window.innerHeight / 2 + startPosY;
		const startLeft = centerStartX - startW / 2;
		const startRight = centerStartX + startW / 2;
		const startTop = centerStartY - startH / 2;
		const startBottom = centerStartY + startH / 2;

		const resolvedMaxW = parseSizeToPixels(
			maxWidth,
			window.innerWidth,
			window.innerWidth - 32,
		);
		const resolvedMaxH = parseSizeToPixels(
			maxHeight,
			window.innerHeight,
			window.innerHeight - 32,
		);

		document.body.style.userSelect = "none";
		document.body.style.cursor = getResizeCursor(direction);

		let finalW = startW;
		let finalH = startH;

		const handlePointerMove = (moveEvent: PointerEvent) => {
			if (!isResizingRef.current) return;
			const dx = moveEvent.clientX - startX;
			const dy = moveEvent.clientY - startY;

			let newW = startW;
			let newH = startH;
			let newX = startPosX;
			let newY = startPosY;

			// Horizontal Resize (East / West)
			if (direction.includes("e")) {
				// Right edge moves with cursor; left edge stays fixed at startLeft
				const desiredW = startW + dx;
				const maxAllowedW = Math.min(
					resolvedMaxW,
					window.innerWidth - 16 - startLeft,
				);
				newW = Math.max(minWidth, Math.min(maxAllowedW, desiredW));
				newX = startPosX + (newW - startW) / 2;
			} else if (direction.includes("w")) {
				// Left edge moves with cursor; right edge stays fixed at startRight
				const desiredW = startW - dx;
				const maxAllowedW = Math.min(resolvedMaxW, startRight - 16);
				newW = Math.max(minWidth, Math.min(maxAllowedW, desiredW));
				newX = startPosX - (newW - startW) / 2;
			}

			// Vertical Resize (South / North)
			if (direction.includes("s")) {
				// Bottom edge moves with cursor; top edge stays fixed at startTop
				const desiredH = startH + dy;
				const maxAllowedH = Math.min(
					resolvedMaxH,
					window.innerHeight - 16 - startTop,
				);
				newH = Math.max(minHeight, Math.min(maxAllowedH, desiredH));
				newY = startPosY + (newH - startH) / 2;
			} else if (direction.includes("n")) {
				// Top edge moves with cursor; bottom edge stays fixed at startBottom
				const desiredH = startH - dy;
				const maxAllowedH = Math.min(resolvedMaxH, startBottom - 16);
				newH = Math.max(minHeight, Math.min(maxAllowedH, desiredH));
				newY = startPosY - (newH - startH) / 2;
			}

			const isHoriz = direction.includes("e") || direction.includes("w");
			const isVert = direction.includes("s") || direction.includes("n");

			finalW = isHoriz ? newW : startW;
			finalH = isVert ? newH : startH;

			setDimensions((prev) => ({
				width: isHoriz ? newW : prev.width,
				height: isVert ? newH : prev.height,
			}));
			setPosition({ x: newX, y: newY });
		};

		const handlePointerUp = () => {
			isResizingRef.current = false;
			setIsResizing(false);

			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("pointercancel", handlePointerUp);

			document.body.style.userSelect = "";
			document.body.style.cursor = "";

			onResize?.({ width: finalW, height: finalH });

			justInteractedRef.current = true;
			setTimeout(() => {
				justInteractedRef.current = false;
			}, 150);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("pointercancel", handlePointerUp);
	};

	// Double click header to toggle maximize
	const handleHeaderDoubleClick = (e: React.MouseEvent) => {
		if (
			(e.target as HTMLElement).closest(
				"button, input, select, textarea, a, [data-nodrag]",
			)
		)
			return;
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

	const hasCustomWidth =
		typeof dimensions.width === "number" && dimensions.width > 0;
	const hasCustomHeight =
		typeof dimensions.height === "number" && dimensions.height > 0;

	const isModified =
		hasCustomWidth ||
		hasCustomHeight ||
		position.x !== 0 ||
		position.y !== 0;

	const handleResetLayout = () => {
		setPosition({ x: 0, y: 0 });
		const initialW =
			typeof defaultWidth === "number"
				? defaultWidth
				: typeof defaultWidth === "string"
					? parseSizeToPixels(
							defaultWidth,
							typeof window !== "undefined" ? window.innerWidth : 1024,
							0,
						) || undefined
					: undefined;
		const initialH =
			typeof defaultHeight === "number"
				? defaultHeight
				: typeof defaultHeight === "string"
					? parseSizeToPixels(
							defaultHeight,
							typeof window !== "undefined" ? window.innerHeight : 768,
							0,
						) || undefined
					: undefined;
		setDimensions({ width: initialW, height: initialH });
	};

	let sizeClasses = "";
	let heightClasses = "";

	if (isFullScreen) {
		sizeClasses =
			"w-screen h-screen max-w-none max-h-none rounded-none border-0";
		heightClasses = "h-screen";
	} else if (isMaximized) {
		sizeClasses =
			"w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none max-h-none";
		heightClasses = "h-[calc(100vh-2rem)]";
	} else {
		// Normal Mode: only apply default size width/height when not overridden by custom resize
		if (!hasCustomWidth) {
			if (typeof maxWidth === "string") {
				const trimmed = maxWidth.trim();
				if (trimmed.startsWith("max-w-")) {
					sizeClasses = `${trimmed} w-full`;
				} else if (SIZE_MAP[trimmed as ModalSize]) {
					sizeClasses = SIZE_MAP[trimmed as ModalSize].width;
				} else if (
					[
						"sm",
						"md",
						"lg",
						"xl",
						"2xl",
						"3xl",
						"4xl",
						"5xl",
						"6xl",
						"7xl",
					].includes(trimmed)
				) {
					sizeClasses = `max-w-${trimmed} w-full`;
				} else {
					sizeClasses = SIZE_MAP[size]?.width || SIZE_MAP.md.width;
				}
			} else {
				sizeClasses = SIZE_MAP[size]?.width || SIZE_MAP.md.width;
			}
		} else {
			sizeClasses = "max-w-none";
		}

		if (!hasCustomHeight) {
			heightClasses = SIZE_MAP[size]?.height || SIZE_MAP.md.height;
		} else {
			heightClasses = "max-h-none";
		}
	}

	const resolvedExplicitMaxWidth =
		typeof maxWidth === "number"
			? `${maxWidth}px`
			: typeof maxWidth === "string" &&
				  (maxWidth.endsWith("px") ||
						maxWidth.endsWith("%") ||
						maxWidth.endsWith("vw"))
				? maxWidth
				: undefined;

	const resolvedExplicitMaxHeight =
		typeof maxHeight === "number"
			? `${maxHeight}px`
			: typeof maxHeight === "string" &&
				  (maxHeight.endsWith("px") ||
						maxHeight.endsWith("%") ||
						maxHeight.endsWith("vh"))
				? maxHeight
				: undefined;

	const inlineStyles: React.CSSProperties = {
		transform:
			mode === "normal"
				? `translate3d(${position.x}px, ${position.y}px, 0)`
				: undefined,
		width:
			mode === "normal" && hasCustomWidth
				? `${dimensions.width}px`
				: undefined,
		height:
			mode === "normal" && hasCustomHeight
				? `${dimensions.height}px`
				: undefined,
		minWidth:
			mode === "normal"
				? typeof minWidth === "number"
					? `min(${minWidth}px, 100%)`
					: undefined
				: undefined,
		minHeight:
			mode === "normal"
				? typeof minHeight === "number"
					? `min(${minHeight}px, 100%)`
					: undefined
				: undefined,
		maxWidth:
			mode === "normal"
				? resolvedExplicitMaxWidth ??
				  (hasCustomWidth ? "calc(100vw - 2rem)" : undefined)
				: undefined,
		maxHeight:
			mode === "normal"
				? resolvedExplicitMaxHeight ??
				  (hasCustomHeight ? "calc(100vh - 2rem)" : undefined)
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
					onClick={() => {
						if (
							closeOnOutsideClick &&
							!justInteractedRef.current &&
							!isDragging &&
							!isResizing
						) {
							handleClose();
						}
					}}
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
					<div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-3xl">
						{/* North edge */}
						<div
							onPointerDown={(e) => handleResizeStart("n", e)}
							className="absolute top-0 left-6 right-6 h-2.5 cursor-ns-resize pointer-events-auto touch-none group"
							title="Resize height"
						>
							<div className="w-full h-1 bg-transparent group-hover:bg-purple-500/50 transition-colors rounded-full" />
						</div>

						{/* South edge */}
						<div
							onPointerDown={(e) => handleResizeStart("s", e)}
							className="absolute bottom-0 left-6 right-6 h-2.5 cursor-ns-resize pointer-events-auto touch-none group"
							title="Resize height"
						>
							<div className="w-full h-1 bg-transparent group-hover:bg-purple-500/50 transition-colors rounded-full mt-1.5" />
						</div>

						{/* West edge */}
						<div
							onPointerDown={(e) => handleResizeStart("w", e)}
							className="absolute top-6 bottom-6 left-0 w-2.5 cursor-ew-resize pointer-events-auto touch-none group"
							title="Resize width"
						>
							<div className="h-full w-1 bg-transparent group-hover:bg-purple-500/50 transition-colors rounded-full" />
						</div>

						{/* East edge */}
						<div
							onPointerDown={(e) => handleResizeStart("e", e)}
							className="absolute top-6 bottom-6 right-0 w-2.5 cursor-ew-resize pointer-events-auto touch-none group"
							title="Resize width"
						>
							<div className="h-full w-1 bg-transparent group-hover:bg-purple-500/50 transition-colors rounded-full ml-1.5" />
						</div>

						{/* North-West corner */}
						<div
							onPointerDown={(e) => handleResizeStart("nw", e)}
							className="absolute top-0 left-0 h-6 w-6 cursor-nwse-resize pointer-events-auto touch-none rounded-tl-3xl group"
							title="Resize"
						>
							<div className="absolute top-1 left-1 h-3 w-3 border-t-2 border-l-2 border-transparent group-hover:border-purple-500/70 transition-colors rounded-tl-sm" />
						</div>

						{/* North-East corner */}
						<div
							onPointerDown={(e) => handleResizeStart("ne", e)}
							className="absolute top-0 right-0 h-6 w-6 cursor-nesw-resize pointer-events-auto touch-none rounded-tr-3xl group"
							title="Resize"
						>
							<div className="absolute top-1 right-1 h-3 w-3 border-t-2 border-r-2 border-transparent group-hover:border-purple-500/70 transition-colors rounded-tr-sm" />
						</div>

						{/* South-West corner */}
						<div
							onPointerDown={(e) => handleResizeStart("sw", e)}
							className="absolute bottom-0 left-0 h-6 w-6 cursor-nesw-resize pointer-events-auto touch-none rounded-bl-3xl group"
							title="Resize"
						>
							<div className="absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-transparent group-hover:border-purple-500/70 transition-colors rounded-bl-sm" />
						</div>

						{/* South-East corner (Primary corner resize grip) */}
						<div
							onPointerDown={(e) => handleResizeStart("se", e)}
							className="absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize pointer-events-auto touch-none rounded-br-3xl group flex items-end justify-end p-1"
							title="Resize modal"
						>
							<svg
								className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors"
								viewBox="0 0 16 16"
								fill="currentColor"
								aria-hidden="true"
							>
								<path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM6 14H4V12H6V14ZM10 10H8V8H10V10Z" />
							</svg>
						</div>
					</div>
				)}

				{/* BLOCK INTERACTION OVERLAY WHILE DRAGGING OR RESIZING */}
				{(isDragging || isResizing) && (
					<div className="absolute inset-0 z-40 cursor-inherit select-none bg-transparent" />
				)}

				{/* HEADER */}
				<header
					onPointerDown={handleDragStart}
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
								<div
									id={descriptionId}
									className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate"
								>
									{effectiveSubtitle}
								</div>
							)}
						</div>
					</div>

					{/* WINDOW CONTROLS */}
					<div className="flex items-center gap-1 shrink-0" data-nodrag>
						{isModified && mode === "normal" && (
							<Button
								variant="ghost"
								size="icon"
								onClick={handleResetLayout}
								className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
								title="Reset window size and position"
							>
								<RotateCcw className="h-3.5 w-3.5" />
							</Button>
						)}

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
						"relative flex-1 min-h-0 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700",
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

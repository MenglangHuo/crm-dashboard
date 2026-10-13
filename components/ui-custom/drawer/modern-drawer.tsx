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
	Maximize2,
	Minimize2,
	Loader2,
	Check,
	GripVertical,
	GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

export type DrawerPlacement = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg" | "xl" | "half" | "full" | "auto";

export interface ModernDrawerProps {
	/** Controlled open state */
	isOpen?: boolean;
	open?: boolean;
	/** Close callback */
	onClose?: () => void;
	onOpenChange?: (open: boolean) => void;

	/** Placement direction: left, right, top, bottom. Defaults to 'right' */
	placement?: DrawerPlacement;

	/**
	 * Dynamic width for horizontal drawers (left/right).
	 * Defaults to '50%' (half screen width).
	 * Accepts percentages (e.g. '50%', '40%'), css values ('600px', '75vw'), or numbers (in pixels).
	 */
	width?: string | number;

	/**
	 * Dynamic height for vertical drawers (top/bottom).
	 * Defaults to '50%' (half screen height).
	 * Accepts percentages (e.g. '50%'), css values ('400px', '60vh'), or numbers (in pixels).
	 */
	height?: string | number;

	/** Size preset override */
	size?: DrawerSize;

	/** Constraints */
	minWidth?: number | string;
	maxWidth?: number | string;
	minHeight?: number | string;
	maxHeight?: number | string;

	/** Interactive edge drag resizing */
	resizable?: boolean;

	/** Header props */
	title?: ReactNode;
	subtitle?: ReactNode;
	description?: ReactNode;
	icon?: ReactNode;
	headerActions?: ReactNode;
	showCloseButton?: boolean;
	allowExpand?: boolean;

	/** Content and Footer */
	children?: ReactNode;
	footer?: ReactNode;

	/** Loading state */
	isLoading?: boolean;
	loadingText?: string;

	/** Interactions */
	closeOnEsc?: boolean;
	closeOnOutsideClick?: boolean;
	showOverlay?: boolean;
	glassmorphism?: boolean;

	/** Quick Action Footer Buttons */
	onCancel?: () => void;
	onSubmit?: () => void;
	cancelText?: ReactNode;
	submitText?: ReactNode;
	cancelIcon?: ReactNode;
	submitIcon?: ReactNode;
	submitFormId?: string;
	submitDisabled?: boolean;
	cancelDisabled?: boolean;

	/** Styling classes */
	className?: string;
	headerClassName?: string;
	bodyClassName?: string;
	footerClassName?: string;
	overlayClassName?: string;
}

const HORIZONTAL_SIZE_PRESETS: Record<DrawerSize, string> = {
	sm: "380px",
	md: "480px",
	lg: "640px",
	xl: "800px",
	half: "50%",
	full: "100%",
	auto: "auto",
};

const VERTICAL_SIZE_PRESETS: Record<DrawerSize, string> = {
	sm: "320px",
	md: "420px",
	lg: "520px",
	xl: "680px",
	half: "50%",
	full: "100%",
	auto: "auto",
};

export function ModernDrawer({
	isOpen,
	open,
	onClose,
	onOpenChange,
	placement = "right",
	width,
	height,
	size,
	minWidth,
	maxWidth,
	minHeight,
	maxHeight,
	resizable = false,
	title,
	subtitle,
	description,
	icon,
	headerActions,
	showCloseButton = true,
	allowExpand = false,
	children,
	footer,
	isLoading = false,
	loadingText = "Loading details...",
	closeOnEsc = true,
	closeOnOutsideClick = true,
	showOverlay = true,
	glassmorphism = true,
	onCancel,
	onSubmit,
	cancelText,
	submitText,
	cancelIcon,
	submitIcon,
	submitFormId,
	submitDisabled,
	cancelDisabled,
	className,
	headerClassName,
	bodyClassName,
	footerClassName,
	overlayClassName,
}: ModernDrawerProps) {
	const isDrawerOpen = Boolean(isOpen ?? open);
	const titleId = useId();
	const descriptionId = useId();

	const handleClose = useCallback(() => {
		onClose?.();
		onOpenChange?.(false);
	}, [onClose, onOpenChange]);

	// Mounting & Animation State
	const [mounted, setMounted] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [customDimension, setCustomDimension] = useState<number | null>(null);
	const [isResizing, setIsResizing] = useState(false);
	const previousActiveElementRef = useRef<HTMLElement | null>(null);
	const drawerRef = useRef<HTMLDivElement>(null);

	// Client-side hydration flag
	useEffect(() => {
		setMounted(true);
	}, []);

	// Handle open/close transitions with smooth delay
	useEffect(() => {
		if (isDrawerOpen) {
			previousActiveElementRef.current = document.activeElement as HTMLElement | null;
			// Trigger entrance animation on next tick
			const timer = setTimeout(() => {
				setIsVisible(true);
			}, 16);
			return () => clearTimeout(timer);
		} else {
			setIsVisible(false);
			const timer = setTimeout(() => {
				setCustomDimension(null);
				setIsExpanded(false);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [isDrawerOpen]);

	// Restore focus upon close
	useEffect(() => {
		if (!isDrawerOpen && previousActiveElementRef.current) {
			try {
				previousActiveElementRef.current.focus();
			} catch {
				// Ignore if element is not focusable
			}
		}
	}, [isDrawerOpen]);

	// Prevent body scroll when drawer is open
	useEffect(() => {
		if (!isDrawerOpen) return;
		const originalOverflow = document.body.style.overflow;
		const originalPaddingRight = document.body.style.paddingRight;
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

		document.body.style.overflow = "hidden";
		if (scrollbarWidth > 0) {
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		}

		return () => {
			document.body.style.overflow = originalOverflow;
			document.body.style.paddingRight = originalPaddingRight;
		};
	}, [isDrawerOpen]);

	// ESC Key Listener
	useEffect(() => {
		if (!isDrawerOpen || !closeOnEsc) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				handleClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isDrawerOpen, closeOnEsc, handleClose]);

	// Resize Drag Handlers
	const isHorizontal = placement === "left" || placement === "right";

	const handleMouseDownResize = useCallback(
		(e: React.MouseEvent) => {
			if (!resizable) return;
			e.preventDefault();
			setIsResizing(true);

			const startX = e.clientX;
			const startY = e.clientY;
			const rect = drawerRef.current?.getBoundingClientRect();
			const startWidth = rect?.width || (window.innerWidth * 0.5);
			const startHeight = rect?.height || (window.innerHeight * 0.5);

			const onMouseMove = (moveEvent: MouseEvent) => {
				if (isHorizontal) {
					let newW: number;
					if (placement === "right") {
						newW = startWidth + (startX - moveEvent.clientX);
					} else {
						newW = startWidth + (moveEvent.clientX - startX);
					}
					// Clamp within safe bounds
					const minW = typeof minWidth === "number" ? minWidth : 280;
					const maxW = typeof maxWidth === "number" ? maxWidth : window.innerWidth * 0.95;
					newW = Math.max(minW, Math.min(newW, maxW));
					setCustomDimension(newW);
				} else {
					let newH: number;
					if (placement === "bottom") {
						newH = startHeight + (startY - moveEvent.clientY);
					} else {
						newH = startHeight + (moveEvent.clientY - startY);
					}
					const minH = typeof minHeight === "number" ? minHeight : 200;
					const maxH = typeof maxHeight === "number" ? maxHeight : window.innerHeight * 0.95;
					newH = Math.max(minH, Math.min(newH, maxH));
					setCustomDimension(newH);
				}
			};

			const onMouseUp = () => {
				setIsResizing(false);
				window.removeEventListener("mousemove", onMouseMove);
				window.removeEventListener("mouseup", onMouseUp);
			};

			window.addEventListener("mousemove", onMouseMove);
			window.addEventListener("mouseup", onMouseUp);
		},
		[resizable, isHorizontal, placement, minWidth, maxWidth, minHeight, maxHeight],
	);

	if (!mounted || (!isDrawerOpen && !isVisible)) {
		return null;
	}

	// Compute Width / Height Style
	const computeDimensionStyle = (): React.CSSProperties => {
		const style: React.CSSProperties = {};

		if (isHorizontal) {
			if (isExpanded) {
				style.width = "100vw";
			} else if (customDimension !== null) {
				style.width = `${customDimension}px`;
			} else if (width !== undefined) {
				style.width = typeof width === "number" ? `${width}px` : width;
			} else if (size) {
				style.width = HORIZONTAL_SIZE_PRESETS[size];
			} else {
				// Default is 50% width on tablet/desktop, adapting on mobile
				style.width = "min(100vw, max(360px, 50%))";
			}

			if (minWidth) style.minWidth = typeof minWidth === "number" ? `${minWidth}px` : minWidth;
			if (maxWidth && !isExpanded) style.maxWidth = typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth;
		} else {
			// Vertical drawer
			if (isExpanded) {
				style.height = "100vh";
			} else if (customDimension !== null) {
				style.height = `${customDimension}px`;
			} else if (height !== undefined) {
				style.height = typeof height === "number" ? `${height}px` : height;
			} else if (size) {
				style.height = VERTICAL_SIZE_PRESETS[size];
			} else {
				// Default is 50% height
				style.height = "50vh";
			}

			if (minHeight) style.minHeight = typeof minHeight === "number" ? `${minHeight}px` : minHeight;
			if (maxHeight && !isExpanded) style.maxHeight = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
		}

		return style;
	};

	// CSS Classes for positioning & sliding animation
	const getPlacementClasses = () => {
		switch (placement) {
			case "left":
				return {
					container: "top-0 bottom-0 left-0 border-r",
					translateHidden: "-translate-x-full",
					translateVisible: "translate-x-0",
					resizer: "right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary",
				};
			case "top":
				return {
					container: "top-0 left-0 right-0 border-b",
					translateHidden: "-translate-y-full",
					translateVisible: "translate-y-0",
					resizer: "bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/40 active:bg-primary",
				};
			case "bottom":
				return {
					container: "bottom-0 left-0 right-0 border-t",
					translateHidden: "translate-y-full",
					translateVisible: "translate-y-0",
					resizer: "top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/40 active:bg-primary",
				};
			case "right":
			default:
				return {
					container: "top-0 bottom-0 right-0 border-l",
					translateHidden: "translate-x-full",
					translateVisible: "translate-x-0",
					resizer: "left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary",
				};
		}
	};

	const placementConfig = getPlacementClasses();
	const effectiveSubtitle = subtitle ?? description;

	const content = (
		<div
			className="fixed inset-0 z-50 flex overflow-hidden select-none"
			aria-labelledby={title ? titleId : undefined}
			aria-describedby={effectiveSubtitle ? descriptionId : undefined}
			role="dialog"
			aria-modal="true"
		>
			{/* Backdrop overlay */}
			{showOverlay && (
				<div
					onClick={closeOnOutsideClick ? handleClose : undefined}
					className={cn(
						"fixed inset-0 bg-slate-950/40 transition-opacity duration-300 ease-out cursor-pointer",
						glassmorphism && "backdrop-blur-xs",
						isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
						overlayClassName,
					)}
					aria-hidden="true"
				/>
			)}

			{/* Sliding Drawer Container */}
			<div
				ref={drawerRef}
				style={computeDimensionStyle()}
				className={cn(
					"fixed z-50 flex flex-col bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800",
					"shadow-2xl shadow-slate-950/15 dark:shadow-black/50 select-auto outline-hidden",
					glassmorphism && "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
					placementConfig.container,
					"transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)",
					isVisible ? placementConfig.translateVisible : placementConfig.translateHidden,
					isResizing && "transition-none select-none",
					className,
				)}
			>
				{/* Interactive Resize Handle */}
				{resizable && (
					<div
						onMouseDown={handleMouseDownResize}
						className={cn(
							"absolute z-20 flex items-center justify-center transition-colors group",
							placementConfig.resizer,
						)}
						title="Drag to resize, double click to reset"
						onDoubleClick={() => setCustomDimension(null)}
					>
						<div className="opacity-0 group-hover:opacity-100 transition-opacity">
							{isHorizontal ? (
								<GripVertical className="size-3.5 text-muted-foreground" />
							) : (
								<GripHorizontal className="size-3.5 text-muted-foreground" />
							)}
						</div>
					</div>
				)}

				{/* Header (rendered if title, subtitle, icon, or showCloseButton is present) */}
				{(title || icon || showCloseButton || headerActions) && (
					<div
						className={cn(
							"flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0",
							headerClassName,
						)}
					>
						<div className="flex items-center gap-3 min-w-0 flex-1">
							{icon && (
								<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
									{icon}
								</div>
							)}
							<div className="min-w-0 flex-1">
								{title && (
									<div
										id={titleId}
										className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate"
									>
										{title}
									</div>
								)}
								{effectiveSubtitle && (
									<div
										id={descriptionId}
										className="text-xs text-muted-foreground truncate mt-0.5"
									>
										{effectiveSubtitle}
									</div>
								)}
							</div>
						</div>

						{/* Header Right Actions & Close */}
						<div className="flex items-center gap-1.5 shrink-0">
							{headerActions}

							{allowExpand && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => setIsExpanded((prev) => !prev)}
									className="size-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
									title={isExpanded ? "Collapse" : "Expand to Full"}
								>
									{isExpanded ? (
										<Minimize2 className="size-4" />
									) : (
										<Maximize2 className="size-4" />
									)}
									<span className="sr-only">Toggle Fullscreen</span>
								</Button>
							)}

							{showCloseButton && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={handleClose}
									className="size-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
									aria-label="Close drawer"
								>
									<X className="size-4" />
								</Button>
							)}
						</div>
					</div>
				)}

				{/* Body Content */}
				<div
					className={cn(
						"flex-1 overflow-y-auto px-6 py-5 relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700",
						bodyClassName,
					)}
				>
					{isLoading && (
						<div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
							<Loader2 className="size-7 animate-spin text-primary" />
							<p className="text-xs font-medium text-slate-600 dark:text-slate-300">
								{loadingText}
							</p>
						</div>
					)}
					{children}
				</div>

				{/* Footer Area */}
				{(footer || onCancel || onSubmit) && (
					<div
						className={cn(
							"flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0",
							footerClassName,
						)}
					>
						{footer ? (
							footer
						) : (
							<>
								{onCancel && (
									<ModernDrawerCancelButton
										onClick={onCancel}
										disabled={cancelDisabled}
										label={cancelText}
										icon={cancelIcon}
									/>
								)}
								{onSubmit && (
									<ModernDrawerSubmitButton
										onClick={onSubmit}
										form={submitFormId}
										disabled={submitDisabled || isLoading}
										isLoading={isLoading}
										label={submitText}
										icon={submitIcon}
									/>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);

	return createPortal(content, document.body);
}

/**
 * Modular Subcomponents for Custom Drawer Layouts
 */

export function ModernDrawerHeader({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function ModernDrawerTitle({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn(
				"text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100",
				className,
			)}
			{...props}
		>
			{children}
		</h3>
	);
}

export function ModernDrawerDescription({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cn("text-xs text-muted-foreground mt-0.5", className)}
			{...props}
		>
			{children}
		</p>
	);
}

export function ModernDrawerBody({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function ModernDrawerFooter({
	className,
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function ModernDrawerClose({
	onClick,
	className,
	children,
	...props
}: React.ComponentProps<typeof Button>) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			onClick={onClick}
			className={cn(
				"size-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
				className,
			)}
			{...props}
		>
			{children || <X className="size-4" />}
			<span className="sr-only">Close drawer</span>
		</Button>
	);
}

export interface ModernDrawerButtonExtraProps {
	label?: ReactNode;
	icon?: ReactNode;
	height?: string;
	width?: string;
	padding?: string;
}

export function ModernDrawerCancelButton({
	onClick,
	label,
	children,
	className,
	disabled,
	height = "h-10",
	width = "min-w-[100px]",
	padding = "px-4",
	icon = <X className="size-3.5 shrink-0 text-slate-500 group-hover:text-slate-700 dark:text-slate-400" />,
	...props
}: React.ComponentProps<typeof Button> & ModernDrawerButtonExtraProps) {
	const { t } = useTranslation();
	const textContent = label ?? children ?? t("common.cancel", "Cancel");
	return (
		<Button
			type="button"
			variant="outline"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-xl font-semibold text-xs border border-slate-300/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] gap-1.5 cursor-pointer inline-flex items-center justify-center",
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

export function ModernDrawerSubmitButton({
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
	height = "h-10",
	width = "min-w-[110px]",
	padding = "px-4",
	icon = <Check className="size-3.5 shrink-0" />,
	...props
}: React.ComponentProps<typeof Button> &
	ModernDrawerButtonExtraProps & {
		isLoading?: boolean;
		loading?: boolean;
		loadingText?: string;
	}) {
	const { t } = useTranslation();
	const textContent = label ?? children ?? t("common.save", "Save");
	const isPending = Boolean(isLoading || loading);
	const pendingText = loadingText ?? t("common.saving", "Saving...");
	return (
		<Button
			type={type}
			form={form}
			onClick={onClick}
			disabled={disabled || isPending}
			className={cn(
				"rounded-xl font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98] gap-1.5 cursor-pointer inline-flex items-center justify-center",
				height,
				width,
				padding,
				className,
			)}
			{...props}
		>
			{isPending ? (
				<>
					<Loader2 className="size-3.5 animate-spin shrink-0" />
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

export function ModernDrawerActionButton({
	onClick,
	label,
	children,
	className,
	disabled,
	height = "h-10",
	width = "min-w-[100px]",
	padding = "px-4",
	icon,
	variant = "outline",
	...props
}: React.ComponentProps<typeof Button> &
	ModernDrawerButtonExtraProps & {
		variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
	}) {
	const textContent = label ?? children;
	return (
		<Button
			type="button"
			variant={variant}
			onClick={onClick}
			disabled={disabled}
			className={cn(
				"rounded-xl font-semibold text-xs transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] gap-1.5 cursor-pointer inline-flex items-center justify-center",
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

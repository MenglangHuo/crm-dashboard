"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ImageLoadingStatus = "idle" | "loading" | "loaded" | "error";

interface AvatarContextValue {
	status: ImageLoadingStatus;
	setStatus: (status: ImageLoadingStatus) => void;
}

const AvatarContext = React.createContext<AvatarContextValue>({
	status: "idle",
	setStatus: () => {},
});

export interface AvatarProps extends React.ComponentProps<"span"> {
	size?: "default" | "sm" | "lg";
}

function Avatar({
	className,
	size = "default",
	children,
	...props
}: AvatarProps) {
	const [status, setStatus] = React.useState<ImageLoadingStatus>("idle");

	return (
		<AvatarContext.Provider value={{ status, setStatus }}>
			<span
				data-slot="avatar"
				data-size={size}
				suppressHydrationWarning
				className={cn(
					"group/avatar relative flex size-8 shrink-0 rounded-full select-none overflow-hidden after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
					className,
				)}
				{...props}
			>
				{children}
			</span>
		</AvatarContext.Provider>
	);
}

export interface AvatarImageProps
	extends React.ImgHTMLAttributes<HTMLImageElement> {
	onLoadingStatusChange?: (status: ImageLoadingStatus) => void;
}

function AvatarImage({
	className,
	src,
	alt,
	onLoadingStatusChange,
	onError,
	onLoad,
	...props
}: AvatarImageProps) {
	const { status, setStatus } = React.useContext(AvatarContext);

	React.useEffect(() => {
		if (!src || src === "null" || src === "undefined") {
			setStatus("error");
			onLoadingStatusChange?.("error");
			return;
		}

		setStatus("loading");
		onLoadingStatusChange?.("loading");

		const img = new Image();
		img.src = String(src);
		img.onload = () => {
			setStatus("loaded");
			onLoadingStatusChange?.("loaded");
		};
		img.onerror = () => {
			setStatus("error");
			onLoadingStatusChange?.("error");
		};
	}, [src, setStatus, onLoadingStatusChange]);

	if (status !== "loaded" || !src || src === "null" || src === "undefined") {
		return null;
	}

	return (
		<img
			data-slot="avatar-image"
			src={src}
			alt={alt}
			className={cn(
				"aspect-square size-full rounded-full object-cover",
				className,
			)}
			onError={(e) => {
				setStatus("error");
				onError?.(e);
			}}
			onLoad={(e) => {
				setStatus("loaded");
				onLoad?.(e);
			}}
			{...props}
		/>
	);
}

export interface AvatarFallbackProps extends React.ComponentProps<"span"> {
	delayMs?: number;
}

function AvatarFallback({
	className,
	children,
	delayMs,
	...props
}: AvatarFallbackProps) {
	const { status } = React.useContext(AvatarContext);
	const [canRender, setCanRender] = React.useState(delayMs === undefined);

	React.useEffect(() => {
		if (delayMs !== undefined) {
			const timer = setTimeout(() => setCanRender(true), delayMs);
			return () => clearTimeout(timer);
		}
	}, [delayMs]);

	// Hide fallback if image loaded successfully or delay hasn't passed
	if (status === "loaded" || !canRender) {
		return null;
	}

	return (
		<span
			data-slot="avatar-fallback"
			suppressHydrationWarning
			className={cn(
				"flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="avatar-badge"
			className={cn(
				"absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
				"group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
				"group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
				"group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="avatar-group"
			className={cn(
				"group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarGroupCount({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="avatar-group-count"
			className={cn(
				"relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Avatar,
	AvatarImage,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarBadge,
};

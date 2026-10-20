"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

function Command({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive>) {
	return (
		<CommandPrimitive
			data-slot="command"
			className={cn(
				"flex h-full w-full flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function CommandDialog({
	title = "Global Command Menu",
	description = "Search all pages, navigation routes, and quick actions...",
	children,
	className,
	showCloseButton = false,
	open,
	onOpenChange,
	shouldFilter,
	...props
}: {
	title?: string;
	description?: string;
	className?: string;
	showCloseButton?: boolean;
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	shouldFilter?: boolean;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange} {...props}>
			<DialogHeader className="sr-only">
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogContent
				className={cn(
					"top-[8%] sm:top-[12%] -translate-y-0 w-full max-w-[96vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl overflow-hidden rounded-2xl! p-0 shadow-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl gap-0",
					className,
				)}
				showCloseButton={showCloseButton}
			>
				<Command
					shouldFilter={shouldFilter}
					className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase dark:[&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0"
				>
					{children}
				</Command>
			</DialogContent>
		</Dialog>
	);
}

function CommandInput({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
	return (
		<div
			data-slot="command-input-wrapper"
			className="flex items-center border-b border-slate-100 dark:border-slate-800/80 px-4 py-3.5"
		>
			<Search className="mr-3 size-4 shrink-0 text-slate-400 dark:text-slate-500" />
			<CommandPrimitive.Input
				data-slot="command-input"
				className={cn(
					"flex h-8 w-full rounded-md bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-900 dark:text-white",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function CommandList({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
	return (
		<CommandPrimitive.List
			data-slot="command-list"
			className={cn(
				"max-h-[380px] overflow-y-auto overflow-x-hidden p-2 outline-none scroll-py-2",
				className,
			)}
			{...props}
		/>
	);
}

function CommandEmpty({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
	return (
		<CommandPrimitive.Empty
			data-slot="command-empty"
			className={cn("py-12 text-center text-sm text-slate-500 dark:text-slate-400", className)}
			{...props}
		/>
	);
}

function CommandGroup({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
	return (
		<CommandPrimitive.Group
			data-slot="command-group"
			className={cn(
				"overflow-hidden p-1 text-slate-900 dark:text-slate-100 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400 [&_[cmdk-group-heading]]:uppercase dark:[&_[cmdk-group-heading]]:text-slate-500",
				className,
			)}
			{...props}
		/>
	);
}

function CommandSeparator({
	className,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
	return (
		<CommandPrimitive.Separator
			data-slot="command-separator"
			className={cn("-mx-1 my-1 h-px bg-slate-100 dark:bg-slate-800/80", className)}
			{...props}
		/>
	);
}

function CommandItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
	return (
		<CommandPrimitive.Item
			data-slot="command-item"
			className={cn(
				"group relative flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition-all data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 aria-selected:bg-primary/10 aria-selected:text-primary dark:aria-selected:bg-primary/15 dark:aria-selected:text-primary hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200",
				className,
			)}
			{...props}
		>
			{children}
		</CommandPrimitive.Item>
	);
}

function CommandShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="command-shortcut"
			className={cn(
				"ml-auto text-[10px] font-mono font-medium text-slate-400 tracking-wider",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
};

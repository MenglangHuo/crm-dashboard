"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSortableListOptions<T> {
	items: T[];
	getId: (item: T) => string | number;
	getLabel: (item: T) => string;
	disabled?: boolean;
	axis?: "grid" | "vertical";
	onReorder: (reorderedItems: T[], fromIndex: number, toIndex: number) => void;
}

export function reorderArray<T>(list: T[], fromIndex: number, toIndex: number): T[] {
	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= list.length ||
		toIndex >= list.length
	) {
		return list;
	}
	const next = [...list];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
}

export function useSortableList<T>({
	items,
	getId,
	getLabel,
	disabled = false,
	axis = "grid",
	onReorder,
}: UseSortableListOptions<T>) {
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);
	const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [keyboardGrabbedId, setKeyboardGrabbedId] = useState<string | null>(null);
	const [keyboardDraftItems, setKeyboardDraftItems] = useState<T[] | null>(null);
	const [statusMessage, setStatusMessage] = useState<string>("");

	const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
	const handleRefs = useRef<Map<string, HTMLElement>>(new Map());
	const activePointerRef = useRef<{
		pointerId: number;
		itemId: string;
		startIndex: number;
		startX: number;
		startY: number;
		hasMoved: boolean;
		handleEl: HTMLElement | null;
	} | null>(null);
	const overIdRef = useRef<string | null>(null);
	const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const keyboardStartIndexRef = useRef<number>(-1);
	const ignoringBlurRef = useRef<boolean>(false);

	const displayedItems = keyboardDraftItems ?? items;

	const announce = useCallback((message: string) => {
		if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
		setStatusMessage("");
		statusTimerRef.current = setTimeout(() => {
			setStatusMessage(message);
		}, 60);
	}, []);

	useEffect(() => {
		return () => {
			if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
			document.documentElement.classList.remove("is-dragging-sortable");
		};
	}, []);

	const registerItemRef = useCallback(
		(id: string | number) => (el: HTMLElement | null) => {
			const key = String(id);
			if (el) itemRefs.current.set(key, el);
			else itemRefs.current.delete(key);
		},
		[],
	);

	const registerHandleRef = useCallback(
		(id: string | number) => (el: HTMLElement | null) => {
			const key = String(id);
			if (el) handleRefs.current.set(key, el);
			else handleRefs.current.delete(key);
		},
		[],
	);

	const findTargetIdFromPoint = useCallback(
		(clientX: number, clientY: number, sourceId: string): string | null => {
			let bestId: string | null = null;
			let bestDist = Infinity;

			for (const item of items) {
				const id = String(getId(item));
				const el = itemRefs.current.get(id);
				if (!el) continue;
				const rect = el.getBoundingClientRect();

				// Direct hit inside bounding box
				if (
					clientX >= rect.left &&
					clientX <= rect.right &&
					clientY >= rect.top &&
					clientY <= rect.bottom
				) {
					return id === sourceId ? null : id;
				}

				// Closest center fallback for gaps between cards
				const cx = rect.left + rect.width / 2;
				const cy = rect.top + rect.height / 2;
				const dist =
					axis === "vertical"
						? Math.abs(clientY - cy)
						: Math.hypot(clientX - cx, clientY - cy);

				const maxThreshold =
					axis === "vertical"
						? rect.height * 1.1
						: Math.max(rect.width, rect.height) * 0.9;

				if (dist < bestDist && dist <= maxThreshold) {
					bestDist = dist;
					bestId = id;
				}
			}

			return bestId === sourceId ? null : bestId;
		},
		[items, getId, axis],
	);

	const cleanupPointerDrag = useCallback(() => {
		const active = activePointerRef.current;
		if (active?.handleEl) {
			try {
				if (active.handleEl.hasPointerCapture(active.pointerId)) {
					active.handleEl.releasePointerCapture(active.pointerId);
				}
			} catch {
				// Ignore if element unmounted or capture already released
			}
		}
		activePointerRef.current = null;
		overIdRef.current = null;
		setDraggedId(null);
		setOverId(null);
		setDragOffset({ x: 0, y: 0 });
		document.documentElement.classList.remove("is-dragging-sortable");
	}, []);

	useEffect(() => {
		if (!draggedId) return;

		const handlePointerMove = (e: PointerEvent) => {
			const active = activePointerRef.current;
			if (!active || e.pointerId !== active.pointerId) return;

			const dx = e.clientX - active.startX;
			const dy = e.clientY - active.startY;
			if (!active.hasMoved && Math.hypot(dx, dy) < 4) return;

			if (!active.hasMoved) {
				active.hasMoved = true;
				document.documentElement.classList.add("is-dragging-sortable");
			}

			setDragOffset({ x: dx, y: dy });
			const targetId = findTargetIdFromPoint(e.clientX, e.clientY, active.itemId);
			if (targetId !== overIdRef.current) {
				overIdRef.current = targetId;
				setOverId(targetId);
			}
		};

		const handlePointerUp = (e: PointerEvent) => {
			const active = activePointerRef.current;
			if (!active || e.pointerId !== active.pointerId) return;

			const targetId = overIdRef.current;
			const fromIndex = active.startIndex;
			const hadMoved = active.hasMoved;
			cleanupPointerDrag();

			if (!hadMoved || !targetId) return;
			const toIndex = items.findIndex((it) => String(getId(it)) === targetId);
			if (toIndex === -1 || toIndex === fromIndex) return;

			const movedItem = items[fromIndex];
			const next = reorderArray(items, fromIndex, toIndex);
			onReorder(next, fromIndex, toIndex);
			if (movedItem) {
				announce(
					`${getLabel(movedItem)} moved to position ${toIndex + 1} of ${items.length}.`,
				);
			}
		};

		const handlePointerCancel = (e: PointerEvent) => {
			const active = activePointerRef.current;
			if (!active || e.pointerId !== active.pointerId) return;
			cleanupPointerDrag();
			announce("Reordering cancelled.");
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && activePointerRef.current) {
				e.preventDefault();
				cleanupPointerDrag();
				announce("Reordering cancelled.");
			}
		};

		document.addEventListener("pointermove", handlePointerMove);
		document.addEventListener("pointerup", handlePointerUp);
		document.addEventListener("pointercancel", handlePointerCancel);
		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("pointermove", handlePointerMove);
			document.removeEventListener("pointerup", handlePointerUp);
			document.removeEventListener("pointercancel", handlePointerCancel);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		draggedId,
		items,
		getId,
		getLabel,
		findTargetIdFromPoint,
		cleanupPointerDrag,
		onReorder,
		announce,
	]);

	const handlePointerDown = useCallback(
		(item: T, index: number) => (e: React.PointerEvent<HTMLElement>) => {
			if (disabled || items.length < 2) return;
			if (e.button !== 0) return; // Primary button only
			if (activePointerRef.current) return; // Follow one pointer

			e.stopPropagation();
			const id = String(getId(item));
			const handleEl = e.currentTarget;
			try {
				handleEl.setPointerCapture(e.pointerId);
			} catch {
				// Fallback still works via document listeners
			}

			activePointerRef.current = {
				pointerId: e.pointerId,
				itemId: id,
				startIndex: index,
				startX: e.clientX,
				startY: e.clientY,
				hasMoved: false,
				handleEl,
			};
			setDraggedId(id);
			setDragOffset({ x: 0, y: 0 });
		},
		[disabled, items.length, getId],
	);

	const moveItemBy = useCallback(
		(index: number, delta: number) => {
			if (disabled) return;
			const targetIndex = index + delta;
			if (targetIndex < 0 || targetIndex >= items.length) return;
			const movedItem = items[index];
			const next = reorderArray(items, index, targetIndex);
			onReorder(next, index, targetIndex);
			if (movedItem) {
				announce(
					`${getLabel(movedItem)} moved to position ${targetIndex + 1} of ${items.length}.`,
				);
			}
		},
		[disabled, items, onReorder, getLabel, announce],
	);

	const commitKeyboardGrab = useCallback(
		(draft: T[] | null, grabbedId: string | null) => {
			if (!draft || !grabbedId) {
				setKeyboardGrabbedId(null);
				setKeyboardDraftItems(null);
				return;
			}
			const startIndex = keyboardStartIndexRef.current;
			const endIndex = draft.findIndex((it) => String(getId(it)) === grabbedId);
			setKeyboardGrabbedId(null);
			setKeyboardDraftItems(null);
			keyboardStartIndexRef.current = -1;

			if (endIndex !== -1 && startIndex !== -1 && endIndex !== startIndex) {
				const movedItem = draft[endIndex];
				onReorder(draft, startIndex, endIndex);
				if (movedItem) {
					announce(
						`${getLabel(movedItem)} dropped at position ${endIndex + 1} of ${draft.length}.`,
					);
				}
			}
		},
		[getId, getLabel, onReorder, announce],
	);

	const handleKeyDownOnHandle = useCallback(
		(item: T) => (e: React.KeyboardEvent<HTMLElement>) => {
			if (disabled || items.length < 2) return;
			const id = String(getId(item));

			if (e.key === " " || e.key === "Enter") {
				e.preventDefault();
				e.stopPropagation();
				if (keyboardGrabbedId === id) {
					commitKeyboardGrab(keyboardDraftItems, id);
				} else {
					const idx = items.findIndex((it) => String(getId(it)) === id);
					keyboardStartIndexRef.current = idx;
					setKeyboardGrabbedId(id);
					setKeyboardDraftItems([...items]);
					announce(
						`${getLabel(item)} picked up at position ${idx + 1} of ${items.length}. Use arrow keys to move, Space or Enter to drop, Escape to cancel.`,
					);
				}
				return;
			}

			if (keyboardGrabbedId !== id || !keyboardDraftItems) return;

			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				setKeyboardGrabbedId(null);
				setKeyboardDraftItems(null);
				keyboardStartIndexRef.current = -1;
				announce(`Reordering ${getLabel(item)} cancelled.`);
				return;
			}

			const prevKeys = axis === "vertical" ? ["ArrowUp"] : ["ArrowUp", "ArrowLeft"];
			const nextKeys =
				axis === "vertical" ? ["ArrowDown"] : ["ArrowDown", "ArrowRight"];

			let delta = 0;
			if (prevKeys.includes(e.key)) delta = -1;
			else if (nextKeys.includes(e.key)) delta = 1;
			else return;

			e.preventDefault();
			e.stopPropagation();

			const currentIdx = keyboardDraftItems.findIndex(
				(it) => String(getId(it)) === id,
			);
			const nextIdx = currentIdx + delta;
			if (nextIdx < 0 || nextIdx >= keyboardDraftItems.length) return;

			const nextDraft = reorderArray(keyboardDraftItems, currentIdx, nextIdx);
			ignoringBlurRef.current = true;
			setKeyboardDraftItems(nextDraft);
			announce(
				`${getLabel(item)} moved to position ${nextIdx + 1} of ${nextDraft.length}.`,
			);

			requestAnimationFrame(() => {
				const itemEl = itemRefs.current.get(id);
				itemEl?.scrollIntoView({ block: "nearest", inline: "nearest" });
				const handleEl = handleRefs.current.get(id);
				handleEl?.focus({ preventScroll: true });
				ignoringBlurRef.current = false;
			});
		},
		[
			disabled,
			items,
			getId,
			getLabel,
			axis,
			keyboardGrabbedId,
			keyboardDraftItems,
			commitKeyboardGrab,
			announce,
		],
	);

	const handleBlurOnHandle = useCallback(
		(item: T) => () => {
			if (ignoringBlurRef.current) return;
			const id = String(getId(item));
			if (keyboardGrabbedId === id) {
				commitKeyboardGrab(keyboardDraftItems, id);
			}
		},
		[getId, keyboardGrabbedId, keyboardDraftItems, commitKeyboardGrab],
	);

	return {
		displayedItems,
		draggedId,
		overId,
		dragOffset,
		keyboardGrabbedId,
		statusMessage,
		isDragging: draggedId !== null && activePointerRef.current?.hasMoved === true,
		registerItemRef,
		registerHandleRef,
		handlePointerDown,
		handleKeyDownOnHandle,
		handleBlurOnHandle,
		moveItemBy,
	};
}

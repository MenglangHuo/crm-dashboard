"use client";

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

export type SplashMode = "always" | "session" | "disabled";

interface SplashScreenContextType {
	isActive: boolean;
	isFadingOut: boolean;
	progress: number;
	statusMessage: string;
	mode: SplashMode;
	setMode: (mode: SplashMode) => void;
	showSplash: (options?: { preview?: boolean; duration?: number }) => void;
	hideSplash: () => void;
}

const SplashScreenContext = createContext<SplashScreenContextType | null>(null);

const STORAGE_KEY_MODE = "crm_splash_mode";
const SESSION_KEY_SHOWN = "crm_splash_session_shown";

export function SplashScreenProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mode, setModeState] = useState<SplashMode>("always");
	const [isActive, setIsActive] = useState(false);
	const [isFadingOut, setIsFadingOut] = useState(false);

	const splashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Load mode from localStorage on mount
	useEffect(() => {
		try {
			const savedMode = localStorage.getItem(STORAGE_KEY_MODE) as SplashMode | null;
			if (savedMode === "always" || savedMode === "session" || savedMode === "disabled") {
				setModeState(savedMode);
			}
		} catch {
			// Ignore localStorage access errors
		}
	}, []);

	const setMode = useCallback((newMode: SplashMode) => {
		setModeState(newMode);
		try {
			localStorage.setItem(STORAGE_KEY_MODE, newMode);
		} catch {
			// Ignore localStorage errors
		}
	}, []);

	const clearTimers = useCallback(() => {
		if (splashTimeoutRef.current) {
			clearTimeout(splashTimeoutRef.current);
			splashTimeoutRef.current = null;
		}
		if (exitTimeoutRef.current) {
			clearTimeout(exitTimeoutRef.current);
			exitTimeoutRef.current = null;
		}
	}, []);

	const hideSplash = useCallback(() => {
		clearTimers();
		setIsFadingOut(true);
		// Allow exit animation (450ms) to complete before unmounting
		exitTimeoutRef.current = setTimeout(() => {
			setIsActive(false);
			setIsFadingOut(false);
		}, 450);
	}, [clearTimers]);

	const showSplash = useCallback(
		(options?: { preview?: boolean; duration?: number }) => {
			clearTimers();
			setIsActive(true);
			setIsFadingOut(false);

			const totalDuration = options?.duration ?? 1750;

			// Seamless automatic transition into the workspace once the brand animation concludes
			splashTimeoutRef.current = setTimeout(() => {
				hideSplash();
			}, totalDuration);
		},
		[clearTimers, hideSplash],
	);

	// Initial launch check on mount
	useEffect(() => {
		try {
			const savedMode = (localStorage.getItem(STORAGE_KEY_MODE) as SplashMode) || "always";
			if (savedMode === "disabled") {
				return;
			}

			if (savedMode === "session") {
				const hasShownInSession = sessionStorage.getItem(SESSION_KEY_SHOWN);
				if (hasShownInSession) {
					return;
				}
				sessionStorage.setItem(SESSION_KEY_SHOWN, "true");
			}

			showSplash();
		} catch {
			showSplash();
		}

		return () => {
			clearTimers();
		};
	}, [showSplash, clearTimers]);

	return (
		<SplashScreenContext.Provider
			value={{
				isActive,
				isFadingOut,
				progress: 100,
				statusMessage: "Ready",
				mode,
				setMode,
				showSplash,
				hideSplash,
			}}
		>
			{children}
		</SplashScreenContext.Provider>
	);
}

export function useSplashScreen() {
	const context = useContext(SplashScreenContext);
	if (!context) {
		throw new Error("useSplashScreen must be used within a SplashScreenProvider");
	}
	return context;
}

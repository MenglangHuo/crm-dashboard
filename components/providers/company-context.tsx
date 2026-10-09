"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { companiesApi, profileApi } from "@/lib/api/endpoints";
import { Company } from "@/lib/types";

interface CompanyContextType {
	selectedCompanyId: string | null;
	setSelectedCompanyId: (id: string | null) => void;
	companies: Company[];
	isLoadingCompanies: boolean;
	isSystemAdmin: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
	selectedCompanyId: null,
	setSelectedCompanyId: () => {},
	companies: [],
	isLoadingCompanies: false,
	isSystemAdmin: false,
});

const COOKIE_NAME = "rumluos_company_id";
const ADMIN_COOKIE_NAME = "rumluos_is_system_admin";

export function isUserSystemAdmin(userProfile: any): boolean {
	if (!userProfile) return false;

	// 1. Explicit system admin boolean flags or accountType (Platform level only)
	if (
		userProfile.isSystemAdmin === true ||
		userProfile.isSystem === true ||
		userProfile.systemAdmin === true ||
		userProfile.accountType === "SYSTEM_ADMIN" ||
		userProfile.accountType === "SYSTEMADMIN"
	) {
		return true;
	}

	// 2. Explicit userType for system admin
	const userType = String(userProfile.userType || "")
		.toUpperCase()
		.replace(/[\s\-_]/g, "");
	if (
		userType === "SYSTEMADMIN" ||
		userType === "ROLESYSTEMADMIN" ||
		userType === "SYSTEM"
	) {
		return true;
	}

	// Strict matcher: ONLY matches platform system administrator roles/authorities
	// Explicitly excludes tenant-level SUPER_ADMIN / ADMIN roles
	const matchesSystemAdmin = (val: any): boolean => {
		if (!val) return false;
		if (typeof val === "string") {
			const normalized = val
				.trim()
				.toUpperCase()
				.replace(/[\s\-_]/g, "");
			return (
				normalized === "ROLESYSTEMADMIN" ||
				normalized === "SYSTEMADMIN" ||
				normalized === "ROLESYSADMIN" ||
				normalized === "SYSADMIN" ||
				normalized === "GLOBALADMIN" ||
				normalized === "ROLEGLOBALADMIN" ||
				normalized === "PLATFORMADMIN" ||
				normalized === "ROLEPLATFORMADMIN"
			);
		}
		if (typeof val === "object") {
			return (
				matchesSystemAdmin(val.name) ||
				matchesSystemAdmin(val.roleCode) ||
				matchesSystemAdmin(val.code) ||
				matchesSystemAdmin(val.authority) ||
				matchesSystemAdmin(val.displayName) ||
				matchesSystemAdmin(val.grantId) ||
				matchesSystemAdmin(val.role)
			);
		}
		return false;
	};

	// 4. Check grants (array, object, or string)
	if (userProfile.grants) {
		if (Array.isArray(userProfile.grants)) {
			if (userProfile.grants.some(matchesSystemAdmin)) return true;
		} else if (matchesSystemAdmin(userProfile.grants)) {
			return true;
		}
	}

	// 5. Check authorities (Spring Security UserDetails default)
	if (userProfile.authorities) {
		if (Array.isArray(userProfile.authorities)) {
			if (userProfile.authorities.some(matchesSystemAdmin)) return true;
		} else if (matchesSystemAdmin(userProfile.authorities)) {
			return true;
		}
	}

	// 6. Check roles (array of strings, array of objects, single string, or single object)
	if (userProfile.roles) {
		if (Array.isArray(userProfile.roles)) {
			if (userProfile.roles.some(matchesSystemAdmin)) return true;
		} else if (matchesSystemAdmin(userProfile.roles)) {
			return true;
		}
	}

	// 7. Check single roleCode / role / roleName / primaryRole fields
	if (
		matchesSystemAdmin(userProfile.roleCode) ||
		matchesSystemAdmin(userProfile.role) ||
		matchesSystemAdmin(userProfile.roleName) ||
		matchesSystemAdmin(userProfile.primaryRole)
	) {
		return true;
	}

	return false;
}

function getStoredCompanyId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const localStorageId = localStorage.getItem(COOKIE_NAME);
		if (localStorageId) return localStorageId;
	} catch {}

	const match = document.cookie.match(
		new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"),
	);
	return match ? decodeURIComponent(match[1]) : null;
}

function setStoredCompanyId(id: string | null) {
	if (typeof window === "undefined") return;
	try {
		if (id) {
			localStorage.setItem(COOKIE_NAME, id);
			document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
		} else {
			localStorage.removeItem(COOKIE_NAME);
			document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
		}
	} catch {}
}

function setStoredIsSystemAdmin(isAdmin: boolean) {
	if (typeof window === "undefined") return;
	try {
		if (isAdmin) {
			localStorage.setItem(ADMIN_COOKIE_NAME, "true");
			document.cookie = `${ADMIN_COOKIE_NAME}=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
		} else {
			localStorage.removeItem(ADMIN_COOKIE_NAME);
			document.cookie = `${ADMIN_COOKIE_NAME}=; path=/; max-age=0`;
		}
	} catch {}
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();

	const { data: userProfile } = useQuery({
		queryKey: ["profile"],
		queryFn: profileApi.me,
		staleTime: 5 * 60 * 1000,
	});

	const isSystemAdmin = isUserSystemAdmin(userProfile);

	useEffect(() => {
		setStoredIsSystemAdmin(isSystemAdmin);
	}, [isSystemAdmin]);

	const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
		queryKey: ["companies-list-selector"],
		queryFn: () => companiesApi.list({ page: 1, limit: 100 }),
		enabled: isSystemAdmin,
		staleTime: 5 * 60 * 1000,
	});

	const companies = companiesData?.items || [];

	const [selectedCompanyId, setSelectedCompanyIdState] = useState<
		string | null
	>(() => {
		const stored = getStoredCompanyId();
		if (stored) return stored;
		const cachedProf = profileApi.getCachedProfile();
		if (cachedProf) {
			const userCompId =
				cachedProf.company?.id != null
					? String(cachedProf.company.id)
					: cachedProf.companyId != null
						? String(cachedProf.companyId)
						: null;
			if (userCompId) return userCompId;
		}
		return null;
	});

	// Auto-sync company ID based on user type
	useEffect(() => {
		if (isSystemAdmin) {
			// System admin: pick stored company ID if valid, or default to first company in list
			if (companies.length > 0) {
				const currentStored = getStoredCompanyId();
				const exists = companies.some(
					(c) => String(c.id) === String(currentStored),
				);

				if (!currentStored || !exists) {
					const firstCompanyId = String(companies[0].id);
					setSelectedCompanyIdState(firstCompanyId);
					setStoredCompanyId(firstCompanyId);
				} else {
					setSelectedCompanyIdState(String(currentStored));
				}
			}
		} else if (userProfile) {
			// Company tenant user: enforce their own assigned company ID
			const userCompanyId =
				userProfile.company?.id != null
					? String(userProfile.company.id)
					: userProfile.companyId != null
						? String(userProfile.companyId)
						: null;

			if (userCompanyId) {
				setSelectedCompanyIdState(userCompanyId);
				setStoredCompanyId(userCompanyId);
			}
		}
	}, [companies, isSystemAdmin, userProfile]);

	const setSelectedCompanyId = React.useCallback(
		(id: string | null) => {
			setSelectedCompanyIdState(id);
			setStoredCompanyId(id);

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("company-context-changed", { detail: id }),
				);
			}

			// Remove all previous tenant data queries from memory cache so they do not leak or flash across companies
			queryClient.removeQueries({
				predicate: (query) => {
					const key = query.queryKey[0];
					return key !== "profile" && key !== "companies-list-selector";
				},
			});
		},
		[queryClient],
	);

	const contextValue = React.useMemo<CompanyContextType>(
		() => ({
			selectedCompanyId,
			setSelectedCompanyId,
			companies,
			isLoadingCompanies,
			isSystemAdmin,
		}),
		[
			selectedCompanyId,
			setSelectedCompanyId,
			companies,
			isLoadingCompanies,
			isSystemAdmin,
		],
	);

	return (
		<CompanyContext.Provider value={contextValue}>
			{children}
		</CompanyContext.Provider>
	);
}

export function useCompanyContext() {
	return useContext(CompanyContext);
}

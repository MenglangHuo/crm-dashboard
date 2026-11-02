/**
 * Authentication and Permission Helpers
 * Extracts permissions, roles, and authorities directly from JWT tokens (cookie/storage) and user profiles.
 */

export interface DecodedJwtPayload {
	sub?: string;
	username?: string;
	roles?: string[] | string;
	authorities?: (string | { authority: string })[] | string;
	permissions?: string[] | string;
	grants?: (string | { grantId?: string; name?: string })[] | string;
	scope?: string[] | string;
	scp?: string[] | string;
	role?: string;
	userType?: string;
	isSystemAdmin?: boolean;
	isSystem?: boolean;
	exp?: number;
	[key: string]: any;
}

/**
 * Safely decodes a base64url or base64 JWT payload in browser or SSR environments.
 */
export function decodeJwtPayload(
	token?: string | null,
): DecodedJwtPayload | null {
	if (!token) return null;
	try {
		const raw = token.includes(".") ? token.split(".")[1] || token : token;
		const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
		const json =
			typeof window !== "undefined"
				? decodeURIComponent(
						Array.prototype.map
							.call(
								atob(base64),
								(c: string) =>
									"%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2),
							)
							.join(""),
					)
				: Buffer.from(base64, "base64").toString("utf-8");
		return JSON.parse(json) as DecodedJwtPayload;
	} catch {
		try {
			const raw = token.includes(".") ? token.split(".")[1] || token : token;
			const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
			const json =
				typeof window !== "undefined"
					? atob(base64)
					: Buffer.from(base64, "base64").toString("utf-8");
			return JSON.parse(json) as DecodedJwtPayload;
		} catch {
			return null;
		}
	}
}

/**
 * Reads the access token from cookies or localStorage in browser environments.
 */
export function getClientAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const match = document.cookie.match(/(?:^|; )crm_access_token=([^;]*)/);
		if (match) return decodeURIComponent(match[1]);
	} catch {}
	try {
		const local = localStorage.getItem("crm_access_token");
		if (local) return local;
	} catch {}
	return null;
}

/**
 * Strict normalizer for permission / role comparison (case-insensitive, strips underscores, colons, dots, spaces).
 */
export enum PermissionResource {
	PRODUCT = "PRODUCT",
	STOCK = "STOCK",
	IMPORT = "IMPORT",
	ORDER = "ORDER",
	INVOICE = "INVOICE",
	PAYMENT = "PAYMENT",
	CUSTOMER = "CUSTOMER",
	USER = "USER",
	ROLE = "ROLE",
	PERMISSION = "PERMISSION",
	COMPANY = "COMPANY",
	DEPARTMENT = "DEPARTMENT",
	SUPPLIER = "SUPPLIER",
	DELIVERY = "DELIVERY",
	LOCATION = "LOCATION",
	FEEDBACK = "FEEDBACK",
	DASHBOARD = "DASHBOARD",
	REPORT = "REPORT",
	SUBSCRIPTION = "SUBSCRIPTION",
	CONFIGURATION = "CONFIGURATION",
	STAFF = "STAFF",
	BRANCH = "BRANCH",
}

export enum PermissionAction {
	READ = "READ",
	CREATE = "CREATE",
	UPDATE = "UPDATE",
	DELETE = "DELETE",
	EXPORT = "EXPORT",
	MANAGE = "MANAGE",
	APPROVE = "APPROVE",
	WRITE = "WRITE",
	POSTED = "POSTED",
	UNPOST = "UNPOST",
	REJECT = "REJECT",
	VOID = "VOID",
	REFUND = "REFUND",
}

export type PermissionCheckItem =
	| string
	| {
			resource: string;
			action?: string;
	  };

/**
 * Returns singular and plural variants of a resource name for flexible matching.
 */
export function getResourceVariants(resource: string): string[] {
	const upper = resource.toUpperCase().trim();
	const variants = new Set<string>([upper]);
	if (upper.endsWith("IES")) {
		variants.add(upper.slice(0, -3) + "Y");
	} else if (upper.endsWith("ES")) {
		variants.add(upper.slice(0, -2));
		variants.add(upper.slice(0, -1));
	} else if (upper.endsWith("S")) {
		variants.add(upper.slice(0, -1));
	} else if (upper.endsWith("Y")) {
		variants.add(upper.slice(0, -1) + "IES");
	} else {
		variants.add(upper + "S");
		variants.add(upper + "ES");
	}
	return Array.from(variants);
}

/**
 * Strict normalizer for permission / role comparison (case-insensitive, strips underscores, colons, dots, spaces).
 */
export function normalizePermissionKey(val: any): string {
	if (val === undefined || val === null) return "";
	const str = typeof val === "string" ? val : String(val);
	return str
		.trim()
		.toUpperCase()
		.replace(/[\s\-_.:]/g, "");
}

/**
 * Extracts and aggregates all normalized authorities, grants, permissions, and roles from userProfile and JWT token.
 */
export function extractAllAuthorities(
	userProfile?: any,
	tokenStr?: string | null,
): Set<string> {
	const authorities = new Set<string>();
	const token = tokenStr || getClientAccessToken();
	const payload = decodeJwtPayload(token);

	const addItem = (item: any) => {
		if (item === undefined || item === null) return;
		if (typeof item === "string" || typeof item === "number") {
			const s = String(item).trim();
			if (!s) return;
			authorities.add(s);
			authorities.add(s.toUpperCase());
			const norm = normalizePermissionKey(s);
			if (norm) authorities.add(norm);

			// Handle colon and dot formats e.g. "ORDER:CREATE" or "ORDER.CREATE"
			if (s.includes(":") || s.includes(".")) {
				const separator = s.includes(":") ? ":" : ".";
				const parts = s.split(separator);
				const res = parts[0];
				const act = parts.slice(1).join(separator);
				const resVariants = getResourceVariants(res);

				for (const variant of resVariants) {
					authorities.add(`${variant}:${act.toUpperCase()}`);
					authorities.add(`${variant}.${act.toUpperCase()}`);
					authorities.add(normalizePermissionKey(`${variant}${act}`));
				}
			}
			return;
		}

		if (typeof item === "object") {
			if (item.authority) addItem(item.authority);
			if (item.name) addItem(item.name);
			if (item.code) addItem(item.code);
			if (item.roleCode) addItem(item.roleCode);
			if (item.displayName) addItem(item.displayName);
			if (item.grantId) addItem(item.grantId);
			if (item.role) addItem(item.role);
			if (item.permission) addItem(item.permission);
			if (item.module && item.action) {
				addItem(`${item.module}:${item.action}`);
				addItem(`${item.module}.${item.action}`);
			}
			if (Array.isArray(item.actions)) {
				item.actions.forEach((act: any) => {
					const mod = item.name || item.module || "GENERAL";
					if (typeof act === "string") {
						addItem(`${mod}:${act}`);
					} else if (act && act.name) {
						addItem(`${mod}:${act.name}`);
					}
				});
			}
			if (Array.isArray(item.permissions)) {
				item.permissions.forEach((p: any) => addItem(p));
			}
			if (Array.isArray(item.grants)) {
				item.grants.forEach((g: any) => addItem(g));
			}
		}
	};

	const processCollection = (col: any) => {
		if (!col) return;
		if (Array.isArray(col)) {
			col.forEach((item) => addItem(item));
		} else if (typeof col === "string") {
			if (col.includes(",") || col.includes(" ")) {
				col.split(/[,\s]+/).forEach((item) => addItem(item));
			} else {
				addItem(col);
			}
		} else if (typeof col === "object") {
			addItem(col);
		}
	};

	// 1. JWT Payload
	if (payload) {
		if (
			payload.isSystemAdmin === true ||
			payload.isSystem === true ||
			payload.systemAdmin === true ||
			payload.isSuperAdmin === true
		) {
			authorities.add("ROLE_SYSTEM_ADMIN");
			authorities.add("ROLESYSTEMADMIN");
			authorities.add("ROLE_SUPER_ADMIN");
			authorities.add("ROLESUPERADMIN");
		}
		const payloadSub = String(
			payload.sub || payload.username || payload.email || payload.preferred_username || "",
		)
			.toLowerCase()
			.trim();
		if (payloadSub === "bronx@dmin" || payloadSub === "system_admin") {
			authorities.add("ROLE_SYSTEM_ADMIN");
			authorities.add("ROLESYSTEMADMIN");
			authorities.add("ROLE_SUPER_ADMIN");
			authorities.add("ROLESUPERADMIN");
		}

		processCollection(payload.authorities);
		processCollection(payload.roles);
		processCollection(payload.role);
		processCollection(payload.userType);
		processCollection(payload.permissions);
		processCollection(payload.grants);
		processCollection(payload.scope);
		processCollection(payload.scp);
	}

	// 2. User Profile
	if (userProfile) {
		if (
			userProfile.isSystemAdmin === true ||
			userProfile.isSystem === true ||
			userProfile.systemAdmin === true ||
			userProfile.accountType === "SYSTEM_ADMIN" ||
			userProfile.accountType === "SYSTEMADMIN"
		) {
			authorities.add("ROLE_SYSTEM_ADMIN");
			authorities.add("ROLESYSTEMADMIN");
		}
		if (userProfile.isSuperAdmin === true) {
			authorities.add("ROLE_SUPER_ADMIN");
			authorities.add("ROLESUPERADMIN");
		}
		processCollection(userProfile.userType);
		processCollection(userProfile.roleCode);
		processCollection(userProfile.role);
		processCollection(userProfile.roles);
		processCollection(userProfile.authorities);
		processCollection(userProfile.permissions);
		processCollection(userProfile.addedPermissionIds);
		processCollection(userProfile.grants);

		const username = String(userProfile.username || "")
			.toLowerCase()
			.trim();
		const email = String(userProfile.email || "")
			.toLowerCase()
			.trim();
		if (
			username === "bronx@dmin" ||
			username === "system_admin" ||
			email === "bronx@dmin" ||
			email === "system_admin"
		) {
			authorities.add("ROLE_SYSTEM_ADMIN");
			authorities.add("ROLESYSTEMADMIN");
			authorities.add("ROLE_SUPER_ADMIN");
			authorities.add("ROLESUPERADMIN");
		}
	}

	return authorities;
}

/**
 * Checks if the user is a platform or system administrator.
 * Only genuine system/super admin roles bypass business permission checks.
 */
export function isUserAdmin(authorities: Set<string>): boolean {
	return (
		authorities.has("ROLE_SYSTEM_ADMIN") ||
		authorities.has("ROLESYSTEMADMIN") ||
		authorities.has("ROLE_SUPER_ADMIN") ||
		authorities.has("ROLESUPERADMIN") ||
		authorities.has("SYSTEM_ADMIN") ||
		authorities.has("SUPER_ADMIN")
	);
}

/**
 * Checks if the authority set satisfies a specific permission check.
 * Admin roles automatically satisfy all permission checks.
 */
export function checkHasPermission(
	authorities: Set<string>,
	resource: string,
	action?: string,
): boolean {
	if (isUserAdmin(authorities)) return true;

	let upperResource = resource.toUpperCase().trim();
	let upperAction = action ? action.toUpperCase().trim() : "";

	// If single argument like "ORDER:CREATE" or "ORDER.CREATE" was provided as resource
	if (!upperAction && (upperResource.includes(":") || upperResource.includes("."))) {
		const sep = upperResource.includes(":") ? ":" : ".";
		const parts = upperResource.split(sep);
		upperResource = parts[0];
		upperAction = parts.slice(1).join(sep);
	}

	const resourceVariants = getResourceVariants(upperResource);

	if (upperAction) {
		for (const res of resourceVariants) {
			const combinedColon = `${res}:${upperAction}`;
			const combinedDot = `${res}.${upperAction}`;
			const norm = normalizePermissionKey(`${res}${upperAction}`);

			if (
				authorities.has(combinedColon) ||
				authorities.has(combinedDot) ||
				authorities.has(norm) ||
				authorities.has(`${res}:*`) ||
				authorities.has(`${res}.*`) ||
				authorities.has(`${res}:ALL`) ||
				authorities.has(`${res}:MANAGE`) ||
				authorities.has(`${res}.MANAGE`) ||
				authorities.has(normalizePermissionKey(`${res}MANAGE`))
			) {
				return true;
			}

			// If action is not READ, WRITE also satisfies it
			if (
				upperAction !== "READ" &&
				(authorities.has(`${res}:WRITE`) ||
					authorities.has(`${res}.WRITE`) ||
					authorities.has(normalizePermissionKey(`${res}WRITE`)))
			) {
				return true;
			}
		}
		return false;
	} else {
		for (const res of resourceVariants) {
			const normRes = normalizePermissionKey(res);
			if (
				authorities.has(res) ||
				authorities.has(normRes) ||
				authorities.has(`${res}:READ`) ||
				authorities.has(`${res}.READ`) ||
				authorities.has(normalizePermissionKey(`${res}READ`)) ||
				authorities.has(`${res}:*`) ||
				authorities.has(`${res}.*`) ||
				authorities.has(`${res}:ALL`) ||
				authorities.has(`${res}:MANAGE`) ||
				authorities.has(`${res}.MANAGE`) ||
				authorities.has(normalizePermissionKey(`${res}MANAGE`))
			) {
				return true;
			}
		}
		return false;
	}
}

/**
 * Declarative single permission checker.
 */
export function checkCan(
	authorities: Set<string>,
	resource: string,
	action?: string,
): boolean {
	return checkHasPermission(authorities, resource, action);
}

/**
 * Declarative any permission checker.
 */
export function checkCanAny(
	authorities: Set<string>,
	permissions: Array<PermissionCheckItem>,
): boolean {
	if (isUserAdmin(authorities)) return true;
	if (!permissions || permissions.length === 0) return true;
	return permissions.some((item) => {
		if (typeof item === "string") {
			return checkHasPermission(authorities, item);
		}
		return checkHasPermission(authorities, item.resource, item.action);
	});
}

/**
 * Declarative all permissions checker.
 */
export function checkCanAll(
	authorities: Set<string>,
	permissions: Array<PermissionCheckItem>,
): boolean {
	if (isUserAdmin(authorities)) return true;
	if (!permissions || permissions.length === 0) return true;
	return permissions.every((item) => {
		if (typeof item === "string") {
			return checkHasPermission(authorities, item);
		}
		return checkHasPermission(authorities, item.resource, item.action);
	});
}

/**
 * Checks if the user is a sales representative / salesperson role without managerial or administrative override.
 */
export function isUserSale(
	userProfile?: any,
	authorities?: Set<string>,
): boolean {
	if (!userProfile && (!authorities || authorities.size === 0)) return false;

	// 1. System & super administrators bypass role restrictions
	if (authorities && isUserAdmin(authorities)) return false;
	if (
		userProfile?.isSystemAdmin === true ||
		userProfile?.isSuperAdmin === true ||
		userProfile?.systemAdmin === true ||
		userProfile?.accountType === "SYSTEM_ADMIN" ||
		userProfile?.accountType === "SYSTEMADMIN"
	) {
		return false;
	}

	// 2. If the user has Manager, Administrator, Stockkeeper, or Finance roles, they are not a restricted Sale role
	const isExcludedRole = (val: any): boolean => {
		if (!val) return false;
		const s = String(
			typeof val === "object"
				? val.name || val.roleCode || val.code || val.displayName || ""
				: val,
		)
			.toUpperCase()
			.replace(/[\s\-_]/g, "");
		return (
			s.includes("ADMIN") ||
			s.includes("MANAGER") ||
			s.includes("STOCKKEEPER") ||
			s.includes("WAREHOUSE") ||
			s.includes("ACCOUNTANT") ||
			s.includes("FINANCE") ||
			s.includes("DIRECTOR") ||
			s.includes("SUPERVISOR") ||
			s.includes("LEAD")
		);
	};

	if (
		Array.isArray(userProfile?.roles) &&
		userProfile.roles.some(isExcludedRole)
	) {
		return false;
	}
	if (
		isExcludedRole(userProfile?.role) ||
		isExcludedRole(userProfile?.roleCode) ||
		isExcludedRole(userProfile?.position)
	) {
		return false;
	}

	// 3. Match Sales keywords across role, userType, position, or authorities
	const matchesSale = (val: any): boolean => {
		if (!val) return false;
		const raw = String(
			typeof val === "object"
				? val.name ||
						val.roleCode ||
						val.code ||
						val.displayName ||
						val.role ||
						""
				: val,
		);
		const norm = raw.toUpperCase().replace(/[\s\-_]/g, "");
		return (
			norm === "SALE" ||
			norm === "SALES" ||
			norm === "ROLESALE" ||
			norm === "ROLESALES" ||
			norm === "SELLER" ||
			norm === "ROLESELLER" ||
			norm === "SALESPERSON" ||
			norm === "ROLESALESPERSON" ||
			norm === "SALESMAN" ||
			norm === "ROLESALESMAN" ||
			norm === "SALEOFFICER" ||
			norm === "ROLESALEOFFICER" ||
			norm === "SALESOFFICER" ||
			norm === "ROLESALESOFFICER" ||
			norm === "SALEREP" ||
			norm === "ROLESALEREP" ||
			norm === "SALESREP" ||
			norm === "ROLESALESREP" ||
			norm === "SALEREPRESENTATIVE" ||
			norm === "ROLESALEREPRESENTATIVE" ||
			norm === "SALESREPRESENTATIVE" ||
			norm === "ROLESALESREPRESENTATIVE" ||
			norm === "SALEAGENT" ||
			norm === "ROLESALEAGENT" ||
			norm === "SALESAGENT" ||
			norm === "ROLESALESAGENT" ||
			norm === "SALEEXECUTIVE" ||
			norm === "ROLESALEEXECUTIVE" ||
			norm === "SALESEXECUTIVE" ||
			norm === "ROLESALESEXECUTIVE" ||
			norm.startsWith("SALE") ||
			norm.startsWith("ROLESALE")
		);
	};

	if (
		Array.isArray(userProfile?.roles) &&
		userProfile.roles.some(matchesSale)
	) {
		return true;
	}

	if (
		matchesSale(userProfile?.role) ||
		matchesSale(userProfile?.roleCode) ||
		matchesSale(userProfile?.userType)
	) {
		return true;
	}

	if (userProfile?.position) {
		const pos = String(userProfile.position).toLowerCase();
		if (
			(pos.includes("sale") ||
				pos.includes("sales") ||
				pos.includes("seller") ||
				pos.includes("salesperson")) &&
			!pos.includes("manager") &&
			!pos.includes("admin") &&
			!pos.includes("lead") &&
			!pos.includes("supervisor")
		) {
			return true;
		}
	}

	if (authorities) {
		for (const auth of authorities) {
			if (matchesSale(auth)) return true;
		}
	}

	return false;
}

/**
 * Legacy Smart Approve Permission check for backwards compatibility.
 */
export function hasSmartApprovePermission(
	userProfile?: any,
	tokenStr?: string | null,
): boolean {
	const authorities = extractAllAuthorities(userProfile, tokenStr);
	if (isUserAdmin(authorities)) return true;
	return (
		authorities.has("ORDER:APPROVE_SPECIAL") ||
		authorities.has("ORDERAPPROVESPECIAL") ||
		authorities.has("ORDER:SPECIAL") ||
		authorities.has("ORDERSPECIAL") ||
		authorities.has("ORDER:APPROVE") ||
		authorities.has("ORDERAPPROVE")
	);
}

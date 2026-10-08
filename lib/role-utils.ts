import { Role, RolePermissionItem, RolePermissionsMap } from "@/lib/types";

/**
 * Formats system role names like "REAL_ESTATE_OFFICER" into human-readable "Real Estate Officer".
 */
export function formatRoleName(name: string): string {
	if (!name) return "";
	// If it's already mixed/lower case with spaces, preserve it
	if (name.includes(" ") || /[a-z]/.test(name)) return name;
	return name
		.toLowerCase()
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * Extracts and normalizes all granted permission keys, codes, and IDs from a role object.
 * Robustly handles nested action matrices, flat permission lists, grant string arrays, and maps.
 */
export function extractRolePermissionIds(
	role: any,
	permissionsCatalog: any[] = [],
): string[] {
	if (!role) return [];
	const initialPermIds = new Set<string>();

	const addId = (val: any) => {
		if (val === undefined || val === null) return;
		const str = String(val).trim();
		if (!str) return;
		initialPermIds.add(str);
		initialPermIds.add(str.toLowerCase());
		initialPermIds.add(str.toUpperCase());
		if (str.includes(".")) {
			const parts = str.split(".");
			const mod = parts[0];
			const act = parts.slice(1).join(".");
			initialPermIds.add(`${mod.toUpperCase()}.${act.toUpperCase()}`);
			initialPermIds.add(`${mod.toLowerCase()}.${act.toLowerCase()}`);
			initialPermIds.add(`${mod.toUpperCase()}.${act.toLowerCase()}`);
			initialPermIds.add(`${mod.toLowerCase()}.${act.toUpperCase()}`);
		}
	};

	// 1. permissionIds array
	if (Array.isArray(role.permissionIds)) {
		role.permissionIds.forEach(addId);
	}

	// 2. grants array
	if (Array.isArray(role.grants)) {
		role.grants.forEach(addId);
	}

	// 3. actions array
	if (Array.isArray(role.actions)) {
		role.actions.forEach((act: any) => {
			if (typeof act === "string" || typeof act === "number") {
				addId(act);
			} else if (act && act.enabled !== false) {
				if (act.id) addId(act.id);
				if (act.grantId) addId(act.grantId);
				const mod = String(act.module || "GENERAL").toUpperCase();
				const name = String(act.name || act.action || "").trim();
				if (name) {
					if (name.includes(".")) {
						addId(name);
					} else {
						addId(`${mod}.${name}`);
					}
				}
			}
		});
	}

	// 4. rolePermissions array
	if (Array.isArray(role.rolePermissions)) {
		role.rolePermissions.forEach((rp: any) => {
			const p = rp.permission || rp;
			if (p.id) addId(p.id);
			if (p.name) addId(p.name);
			if (p.module && p.action) addId(`${p.module}.${p.action}`);
		});
	}

	// 5. permissions
	if (Array.isArray(role.permissions)) {
		role.permissions.forEach((modPerm: any) => {
			if (typeof modPerm === "string" || typeof modPerm === "number") {
				addId(modPerm);
				return;
			}
			if (!modPerm) return;

			const modName = String(
				modPerm.name || modPerm.module || "GENERAL",
			).toUpperCase();
			const actionsList = Array.isArray(modPerm.actions)
				? modPerm.actions
				: Array.isArray(modPerm.permissions)
					? modPerm.permissions
					: [];

			if (actionsList.length > 0) {
				actionsList.forEach((act: any) => {
					if (typeof act === "string" || typeof act === "number") {
						addId(act);
						addId(`${modName}.${act}`);
					} else if (act && act.enabled !== false) {
						if (act.id) addId(act.id);
						if (act.grantId) addId(act.grantId);
						const actName = String(act.name || act.action || "").trim();
						if (actName) {
							if (actName.includes(".")) {
								addId(actName);
							} else {
								addId(`${modName}.${actName}`);
							}
						}
					}
				});
			} else {
				// Flat permission object e.g. { id: 10, name: "READ", module: "DASHBOARD", enabled?: true }
				if (modPerm.enabled !== false) {
					if (modPerm.id) addId(modPerm.id);
					const actName = String(
						modPerm.name || modPerm.action || modPerm.code || "",
					).trim();
					if (actName) {
						if (actName.includes(".")) {
							addId(actName);
						} else {
							addId(`${modName}.${actName}`);
						}
					}
				}
			}
		});
	} else if (role.permissions && typeof role.permissions === "object") {
		Object.entries(role.permissions).forEach(
			([modName, items]: [string, any]) => {
				const upperMod = String(modName || "GENERAL").toUpperCase();
				if (Array.isArray(items)) {
					items.forEach((item: any) => {
						if (typeof item === "string" || typeof item === "number") {
							addId(item);
							addId(`${upperMod}.${item}`);
						} else if (item) {
							const isEnabled =
								item.enabled !== undefined ? Boolean(item.enabled) : true;
							if (isEnabled) {
								if (item.id) addId(item.id);
								if (item.grantId) addId(item.grantId);
								const actName = String(item.name || item.action || "").trim();
								if (actName) {
									if (actName.includes(".")) {
										addId(actName);
									} else {
										addId(`${upperMod}.${actName}`);
									}
								}
							}
						}
					});
				} else if (items && typeof items === "object") {
					Object.entries(items).forEach(([actName, isEnabled]) => {
						if (Boolean(isEnabled)) {
							addId(`${upperMod}.${actName}`);
						}
					});
				}
			},
		);
	}

	// 6. Cross-reference with permissionsCatalog
	if (Array.isArray(permissionsCatalog) && permissionsCatalog.length > 0) {
		permissionsCatalog.forEach((p) => {
			const idStr = String(p.id);
			const pName = String(p.name || "").trim();
			const pMod = String(p.module || "").trim();
			const act = pName.includes(".")
				? pName.split(".").slice(1).join(".")
				: pName;

			const matches =
				initialPermIds.has(idStr) ||
				initialPermIds.has(idStr.toLowerCase()) ||
				initialPermIds.has(pName) ||
				initialPermIds.has(pName.toLowerCase()) ||
				initialPermIds.has(pName.toUpperCase()) ||
				(pMod &&
					act &&
					(initialPermIds.has(`${pMod.toUpperCase()}.${act.toUpperCase()}`) ||
						initialPermIds.has(`${pMod.toLowerCase()}.${act.toLowerCase()}`) ||
						initialPermIds.has(`${pMod.toUpperCase()}.${act.toLowerCase()}`) ||
						initialPermIds.has(`${pMod.toLowerCase()}.${act.toUpperCase()}`) ||
						initialPermIds.has(`${pMod}.${act}`)));

			if (matches) {
				addId(idStr);
				if (pName) addId(pName);
				if (pMod && act) addId(`${pMod}.${act}`);
			}
		});
	}

	return Array.from(initialPermIds);
}

/**
 * Extracts and normalizes assigned role IDs from a user object.
 * Robustly handles user.roleIds, user.roles (objects or strings/numbers), user.userRoles, user.groups,
 * and maps role names/codes to the matching role IDs from availableRoles.
 */
export function extractUserRoleIds(
	user: any,
	availableRoles: Role[] = [],
): string[] {
	if (!user) return [];
	const roleIdentifierSet = new Set<string>();

	const addIdentifier = (val: any) => {
		if (val === undefined || val === null) return;
		const str = String(val).trim();
		if (!str) return;
		roleIdentifierSet.add(str);
		roleIdentifierSet.add(str.toLowerCase());
		roleIdentifierSet.add(str.toUpperCase());
	};

	// 1. user.roleIds array
	if (Array.isArray(user.roleIds)) {
		user.roleIds.forEach(addIdentifier);
	}

	// 2. user.roles array (can be array of role objects, strings, or numbers)
	if (Array.isArray(user.roles)) {
		user.roles.forEach((r: any) => {
			if (typeof r === "string" || typeof r === "number") {
				addIdentifier(r);
			} else if (r && typeof r === "object") {
				if (r.id !== undefined && r.id !== null) addIdentifier(r.id);
				if (r.roleId !== undefined && r.roleId !== null)
					addIdentifier(r.roleId);
				if (r.name) addIdentifier(r.name);
				if (r.displayName) addIdentifier(r.displayName);
				if (r.role?.id !== undefined && r.role?.id !== null)
					addIdentifier(r.role.id);
				if (r.role?.name) addIdentifier(r.role.name);
			}
		});
	}

	// 3. user.userRoles array
	if (Array.isArray(user.userRoles)) {
		user.userRoles.forEach((ur: any) => {
			if (ur.roleId !== undefined && ur.roleId !== null)
				addIdentifier(ur.roleId);
			if (ur.id !== undefined && ur.id !== null) addIdentifier(ur.id);
			if (ur.role?.id !== undefined && ur.role?.id !== null)
				addIdentifier(ur.role.id);
			if (ur.role?.name) addIdentifier(ur.role.name);
		});
	}

	// 4. user.groups array
	if (Array.isArray(user.groups)) {
		user.groups.forEach((g: any) => {
			if (g.roleId !== undefined && g.roleId !== null) addIdentifier(g.roleId);
			if (g.id !== undefined && g.id !== null) addIdentifier(g.id);
			if (g.name) addIdentifier(g.name);
		});
	}

	const finalRoleIds = new Set<string>();

	// Cross-reference with availableRoles to resolve role IDs
	if (Array.isArray(availableRoles) && availableRoles.length > 0) {
		availableRoles.forEach((r) => {
			const rId = String(r.id).trim();
			const rName = String(r.name || "").trim();
			const rDisplay = String(r.displayName || "").trim();

			const isMatch =
				roleIdentifierSet.has(rId) ||
				roleIdentifierSet.has(rId.toLowerCase()) ||
				(rName &&
					(roleIdentifierSet.has(rName) ||
						roleIdentifierSet.has(rName.toLowerCase()) ||
						roleIdentifierSet.has(rName.toUpperCase()))) ||
				(rDisplay &&
					(roleIdentifierSet.has(rDisplay) ||
						roleIdentifierSet.has(rDisplay.toLowerCase()) ||
						roleIdentifierSet.has(rDisplay.toUpperCase())));

			if (isMatch) {
				finalRoleIds.add(rId);
			}
		});
	}

	// If no available roles were provided or matched, keep any direct role IDs found in user
	if (finalRoleIds.size === 0 && roleIdentifierSet.size > 0) {
		if (Array.isArray(user.roleIds)) {
			user.roleIds.forEach((id: any) => finalRoleIds.add(String(id)));
		}
		if (Array.isArray(user.roles)) {
			user.roles.forEach((r: any) => {
				if (typeof r === "string" || typeof r === "number") {
					finalRoleIds.add(String(r));
				} else if (r?.id !== undefined && r?.id !== null) {
					finalRoleIds.add(String(r.id));
				}
			});
		}
	}

	return Array.from(finalRoleIds);
}

/**
 * Normalizes raw backend role object to ensure all UI components receive consistent fields.
 */
export function normalizeRole(raw: any): Role {
	if (!raw) {
		return {
			id: "",
			name: "",
			displayName: "",
			description: "",
			priority: 99,
			permissions: {},
			permissionIds: [],
			isSystem: false,
			createdAt: "",
		};
	}

	const name = String(raw.name || raw.displayName || "").trim();
	const displayName = raw.displayName || formatRoleName(name);
	const description = String(raw.description || "").trim();
	const priority = typeof raw.priority === "number" ? raw.priority : 99;
	const isSystem = Boolean(raw.isSystem === true);

	let permissionsMap: RolePermissionsMap = {};
	const derivedPermissionIds = extractRolePermissionIds(raw);

	if (Array.isArray(raw.permissions)) {
		raw.permissions.forEach((modPerm: any) => {
			if (!modPerm) return;
			const moduleName = String(
				modPerm.name || modPerm.module || "GENERAL",
			).toUpperCase();
			const actionsList = Array.isArray(modPerm.actions)
				? modPerm.actions
				: Array.isArray(modPerm.permissions)
					? modPerm.permissions
					: [];

			if (actionsList.length > 0) {
				permissionsMap[moduleName] = actionsList.map((act: any) => ({
					id: act.id ? String(act.id) : undefined,
					name: typeof act === "string" ? act : act.name || act.action,
					enabled:
						typeof act === "string" ? true : Boolean(act.enabled !== false),
				}));
			} else if (modPerm.name || modPerm.action || modPerm.code) {
				if (!permissionsMap[moduleName]) permissionsMap[moduleName] = [];
				permissionsMap[moduleName].push({
					id: modPerm.id ? String(modPerm.id) : undefined,
					name: String(modPerm.name || modPerm.action || modPerm.code),
					enabled: Boolean(modPerm.enabled !== false),
				});
			}
		});
	} else if (raw.permissions && typeof raw.permissions === "object") {
		Object.entries(raw.permissions).forEach(
			([moduleName, items]: [string, any]) => {
				const upperMod = String(moduleName || "GENERAL").toUpperCase();
				if (Array.isArray(items)) {
					permissionsMap[upperMod] = items.map((item: any) => {
						if (typeof item === "string") {
							return { name: item, enabled: true };
						}
						return {
							id: item?.id ? String(item.id) : undefined,
							name: item?.name || item?.action || "action",
							enabled:
								item?.enabled !== undefined ? Boolean(item.enabled) : true,
						};
					});
				} else if (items && typeof items === "object") {
					permissionsMap[upperMod] = Object.entries(items).map(
						([actName, isEnabled]) => ({
							name: actName,
							enabled: Boolean(isEnabled),
						}),
					);
				}
			},
		);
	}

	return {
		id: raw.id,
		companyId: raw.companyId || null,
		name,
		displayName,
		description,
		priority,
		permissions: permissionsMap,
		permissionIds: Array.from(new Set(derivedPermissionIds)),
		excludedPermissionIds: Array.isArray(raw.excludedPermissionIds)
			? raw.excludedPermissionIds
			: [],
		isSystem,
		createdAt: raw.createdAt || "",
		updatedAt: raw.updatedAt || null,
	};
}

export interface ModulePermissionSummary {
	module: string;
	permissions: RolePermissionItem[];
	enabledCount: number;
	totalCount: number;
}

/**
 * Extracts structured module permission breakdown from a role object.
 */
export function getRoleModuleBreakdown(role: Role): ModulePermissionSummary[] {
	const result: ModulePermissionSummary[] = [];
	if (!role) return result;

	if (
		role.permissions &&
		typeof role.permissions === "object" &&
		!Array.isArray(role.permissions)
	) {
		Object.entries(role.permissions).forEach(([moduleKey, items]) => {
			if (Array.isArray(items) && items.length > 0) {
				const enabledCount = items.filter((i) => i.enabled).length;
				result.push({
					module: moduleKey,
					permissions: items,
					enabledCount,
					totalCount: items.length,
				});
			}
		});
	}

	// If no permissions map, check permissionIds
	if (
		result.length === 0 &&
		Array.isArray(role.permissionIds) &&
		role.permissionIds.length > 0
	) {
		const groups: Record<string, RolePermissionItem[]> = {};
		role.permissionIds.forEach((id) => {
			const parts = id.split(".");
			const mod = parts.length > 1 ? parts[0].toUpperCase() : "GENERAL";
			const permName = parts.length > 1 ? parts.slice(1).join(".") : id;
			if (!groups[mod]) groups[mod] = [];
			// Avoid duplicate actions in group
			if (
				!groups[mod].some(
					(p) => p.name.toLowerCase() === permName.toLowerCase(),
				)
			) {
				groups[mod].push({ name: permName, enabled: true });
			}
		});

		Object.entries(groups).forEach(([mod, items]) => {
			result.push({
				module: mod,
				permissions: items,
				enabledCount: items.length,
				totalCount: items.length,
			});
		});
	}

	return result.sort((a, b) => a.module.localeCompare(b.module));
}

/**
 * Calculates total active permissions for a role.
 */
export function getRoleTotalPermissionsCount(role: Role): number {
	if (!role) return 0;
	const breakdown = getRoleModuleBreakdown(role);
	if (breakdown.length > 0) {
		return breakdown.reduce((acc, curr) => acc + curr.enabledCount, 0);
	}
	return role.permissionIds?.length || 0;
}

export interface PriorityConfig {
	label: string;
	shortLabel: string;
	badgeVariant: "rose" | "purple" | "blue" | "emerald" | "amber" | "outline";
	badgeClass: string;
	iconName: "crown" | "shield-check" | "shield-alert" | "shield" | "user-check";
}

/**
 * Get display styling and priority indicator configuration for a role.
 */
export function getRolePriorityConfig(priority?: number): PriorityConfig {
	switch (priority) {
		case 0:
			return {
				label: "Priority 0 • High / Manager Tier",
				shortLabel: "P0 • High",
				badgeVariant: "rose",
				badgeClass:
					"bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
				iconName: "crown",
			};
		case 1:
			return {
				label: "Priority 1 • Admin / Executive Tier",
				shortLabel: "P1 • Admin",
				badgeVariant: "purple",
				badgeClass:
					"bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
				iconName: "shield-check",
			};
		case 2:
			return {
				label: "Priority 2 • Operational Officer Tier",
				shortLabel: "P2 • Officer",
				badgeVariant: "blue",
				badgeClass:
					"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
				iconName: "shield-alert",
			};
		default:
			return {
				label:
					priority !== undefined && priority < 99
						? `Priority ${priority}`
						: "Custom Role",
				shortLabel:
					priority !== undefined && priority < 99 ? `P${priority}` : "Custom",
				badgeVariant: "emerald",
				badgeClass:
					"bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
				iconName: "shield",
			};
	}
}

/**
 * Formats user permission selections into the exact backend payload expected by POST/PUT /roles/actions
 * Dynamically preserves all module actions (standard CRUD + custom actions like "approved", "export", etc.)
 */
export function formatRolePermissionsPayload(
	permissionIds: string[],
	permissionsData: any[] = [],
	existingPermissions?: any,
): Record<string, Array<{ name: string; enabled: boolean }>> {
	const selectedSet = new Set(
		permissionIds.map((id) => String(id).toLowerCase()),
	);
	const selectedRawSet = new Set(permissionIds.map((id) => String(id)));

	const permissionsPayload: Record<
		string,
		Array<{ name: string; enabled: boolean }>
	> = {};
	const STANDARD_ACTIONS = ["read", "write", "update", "delete"];

	// moduleName (UPPERCASE) -> Set of all unique action names for that module (in order of appearance)
	const moduleActionsOrderMap = new Map<string, Set<string>>();
	// moduleName (UPPERCASE) -> Map of actionName (lowercase) -> boolean (enabled state)
	const moduleActionsStateMap = new Map<string, Map<string, boolean>>();

	const ensureModule = (mod: string) => {
		const upperMod = String(mod || "GENERAL")
			.trim()
			.toUpperCase();
		if (!moduleActionsOrderMap.has(upperMod)) {
			moduleActionsOrderMap.set(upperMod, new Set(STANDARD_ACTIONS));
		}
		if (!moduleActionsStateMap.has(upperMod)) {
			const stateMap = new Map<string, boolean>();
			STANDARD_ACTIONS.forEach((a) => stateMap.set(a, false));
			moduleActionsStateMap.set(upperMod, stateMap);
		}
		return upperMod;
	};

	// 1. Process existing permissions from editing role (to ensure known custom actions are retained)
	if (existingPermissions) {
		if (Array.isArray(existingPermissions)) {
			existingPermissions.forEach((modPerm: any) => {
				const mod = ensureModule(
					String(modPerm.name || modPerm.module || "GENERAL"),
				);
				const actions = Array.isArray(modPerm.actions)
					? modPerm.actions
					: Array.isArray(modPerm.permissions)
						? modPerm.permissions
						: [];
				actions.forEach((act: any) => {
					if (act && act.name) {
						const actName = String(act.name).toLowerCase();
						moduleActionsOrderMap.get(mod)!.add(actName);
						if (!moduleActionsStateMap.get(mod)!.has(actName)) {
							moduleActionsStateMap.get(mod)!.set(actName, false);
						}
					}
				});
			});
		} else if (typeof existingPermissions === "object") {
			Object.entries(existingPermissions).forEach(
				([modKey, actions]: [string, any]) => {
					const mod = ensureModule(modKey);
					if (Array.isArray(actions)) {
						actions.forEach((act: any) => {
							if (act && act.name) {
								const actName = String(act.name).toLowerCase();
								moduleActionsOrderMap.get(mod)!.add(actName);
								if (!moduleActionsStateMap.get(mod)!.has(actName)) {
									moduleActionsStateMap.get(mod)!.set(actName, false);
								}
							}
						});
					}
				},
			);
		}
	}

	// 2. Process all permissions from permissionsData catalog
	if (Array.isArray(permissionsData) && permissionsData.length > 0) {
		permissionsData.forEach((p) => {
			let rawMod = String(p.module || "").trim();
			let rawName = String(p.name || "").trim();
			let actionName = "";

			if (rawName.includes(".")) {
				const parts = rawName.split(".");
				if (!rawMod || rawMod.toUpperCase() === "GENERAL") {
					rawMod = parts[0];
				}
				actionName = parts.slice(1).join(".").toLowerCase();
			} else {
				actionName = rawName.toLowerCase();
			}

			if (!rawMod) rawMod = "GENERAL";
			if (!actionName) actionName = "read";

			const mod = ensureModule(rawMod);
			moduleActionsOrderMap.get(mod)!.add(actionName);

			const isEnabled =
				selectedRawSet.has(String(p.id)) ||
				selectedSet.has(String(p.id).toLowerCase()) ||
				(rawName.includes(".") &&
					(selectedSet.has(rawName.toLowerCase()) ||
						selectedSet.has(rawName.toUpperCase()))) ||
				selectedSet.has(`${mod.toLowerCase()}.${actionName}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${actionName.toUpperCase()}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${actionName.toLowerCase()}`) ||
				(actionName === "write" &&
					(selectedSet.has(`${mod.toLowerCase()}.create`) ||
						selectedSet.has(`${mod.toUpperCase()}.create`))) ||
				(actionName === "create" &&
					(selectedSet.has(`${mod.toLowerCase()}.write`) ||
						selectedSet.has(`${mod.toUpperCase()}.write`)));

			if (isEnabled) {
				moduleActionsStateMap.get(mod)!.set(actionName, true);
			} else if (!moduleActionsStateMap.get(mod)!.has(actionName)) {
				moduleActionsStateMap.get(mod)!.set(actionName, false);
			}
		});
	}

	// 3. Process direct selected permission keys formatted as MODULE.action (or module.action)
	selectedSet.forEach((key) => {
		if (key.includes(".")) {
			const parts = key.split(".");
			const modPart = parts[0];
			const actPart = parts.slice(1).join(".").toLowerCase();

			const mod = ensureModule(modPart);
			moduleActionsOrderMap.get(mod)!.add(actPart);
			moduleActionsStateMap.get(mod)!.set(actPart, true);
		}
	});

	// 4. Build output payload dictionary for modules that have configured permissions
	moduleActionsOrderMap.forEach((actionsSet, mod) => {
		const stateMap =
			moduleActionsStateMap.get(mod) || new Map<string, boolean>();

		// Check if any action in this module is enabled
		const hasAnyActive = Array.from(actionsSet).some((act) => {
			return (
				Boolean(stateMap.get(act)) ||
				selectedSet.has(`${mod.toLowerCase()}.${act}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${act.toUpperCase()}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${act.toLowerCase()}`) ||
				(act === "write" &&
					(selectedSet.has(`${mod.toLowerCase()}.create`) ||
						selectedSet.has(`${mod.toUpperCase()}.create`))) ||
				(act === "create" &&
					(selectedSet.has(`${mod.toLowerCase()}.write`) ||
						selectedSet.has(`${mod.toUpperCase()}.write`)))
			);
		});

		if (!hasAnyActive) return;

		// Order actions: standard actions first, followed by dynamic/custom actions in order
		const orderedActionNames = Array.from(actionsSet);

		permissionsPayload[mod] = orderedActionNames.map((actName) => {
			const isEnabled =
				Boolean(stateMap.get(actName)) ||
				selectedSet.has(`${mod.toLowerCase()}.${actName}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${actName.toUpperCase()}`) ||
				selectedSet.has(`${mod.toUpperCase()}.${actName.toLowerCase()}`) ||
				(actName === "write" &&
					(selectedSet.has(`${mod.toLowerCase()}.create`) ||
						selectedSet.has(`${mod.toUpperCase()}.create`))) ||
				(actName === "create" &&
					(selectedSet.has(`${mod.toLowerCase()}.write`) ||
						selectedSet.has(`${mod.toUpperCase()}.write`)));

			return {
				name: actName,
				enabled: Boolean(isEnabled),
			};
		});
	});

	return permissionsPayload;
}

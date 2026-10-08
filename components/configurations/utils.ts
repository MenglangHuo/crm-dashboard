/**
 * Utilities for formatting configuration labels and inferring user-friendly controls.
 */

const KNOWN_LABELS: Record<string, string> = {
	"inventory.allow_negative_stock": "Allow Negative Stock",
	"inventory.allow_correspondence_stock": "Allow Correspondence Stock",
	"inventory.allow_nonexpensive_stock": "Allow Non-expensive Stock",
	"inventory.auto_reserve_stock": "Auto Reserve Stock on Order",
	"inventory.low_stock_threshold": "Low Stock Warning Threshold",
	"inventory.critical_stock_threshold": "Critical Out-of-Stock Level",
	"inventory.default_warehouse_code": "Default Warehouse Code",

	"product.default_sort": "Product Default Sort Order",
	"product.low_stock_alert": "Low Stock Alert for Products",

	"invoice.number_format": "Invoice Number Format Pattern",
	"invoice.number_prefix": "Invoice Prefix (e.g. INV)",
	"invoice.sequence_padding": "Sequence Zero-Padding Length",
	"invoice.prefix": "Invoice Prefix (e.g. INV-)",
	"invoice.credit_note_prefix": "Credit Note Prefix (e.g. ILV-)",
	"invoice.start_sequence": "Starting Sequence Number",
	"invoice.auto_generation": "Auto Generate Sequence",
	"invoice.theme_color": "Invoice Header Accent Color",
	"invoice.tax_rate_percentage": "Standard VAT / Tax Rate (%)",
	"document.early_discount.rules": "Early Settlement Discount Rules",
	"invoice.early_discount.rules": "Early Settlement Discount Rules",

	"auth.max_login_attempts": "Maximum Login Attempts",
	"auth.lockout_duration_minutes": "Account Lockout Duration (Minutes)",
	"auth.lockout_duration_mins": "Account Lockout Duration (Minutes)",
	"auth.access_token_expiry_minutes": "Access Token Lifetime (Minutes)",
	"auth.refresh_token_expiry_days": "Refresh Token Lifetime (Days)",
	"auth.allow_multiple_sessions": "Allow Concurrent User Sessions",
	"auth.google_sso_enabled": "Enable Google Workspace SSO",
	"auth.oauth_allowed_domains": "Restricted OAuth Email Domains",

	"user.pin_code.enabled": "Enable PIN Code Feature",
	"user.pin_code.required": "Require PIN Code for All Users",
	"user.ordering_notice.enabled": "Enable Ordering Notice on Order Screen",

	"customer.visit_status_thresholds": "Visit Status & Map Pin Colors",
	"customer.status_color_visited": "Customer Status (Just Visited)",
	"customer.status_color_baddeg": "Baddeg Status Color",
	"customer.status_color_respond": "Respond Status Color",
	"customer.status_color_plusert": "Piusert Status Color",
	"customer.status_color_loper": "Loper Status Color",
	"customer.auto_assign_leads": "Auto Assign Inbound Leads",
	"customer.inactivity_warning_days": "Inactivity Warning Threshold (Days)",
	"customer.default_credit_limit": "Default Customer Credit Limit ($)",

	"security.blacklist_ip": "IP Blacklist & CIDR Filtering",
	"security.max_login_attempts": "Maximum Login Attempts",
	"security.lockout_duration_mins": "Account Lockout Duration (Minutes)",
	"security.two_factor_auth_enforced": "Enforce 2FA for Staff Accounts",
	"security.password_min_length": "Minimum Password Length",
	"security.session_timeout_minutes": "Session Inactivity Timeout (Minutes)",
	"security.ip_whitelist": "Allowed Admin IP Ranges (CIDR)",

	"system.timezone": "Primary System Timezone",
	"system.date_format": "Standard Date Format",
	"system.currency": "Default Operational Currency",
	"system.language": "Default Interface Language",
	"system.maintenance_mode": "Maintenance Mode",
	"system.debug_logging": "Verbose Audit Logging",
	"system.api_rate_limit": "API Rate Limit (Req / Min)",

	"workflow.multi_level_approval": "Multi-Level Order Approvals",
	"workflow.manager_approval_threshold": "Manager Approval Min Amount ($)",
	"workflow.director_approval_threshold": "Director Approval Min Amount ($)",
	"workflow.approval_chain_config": "Workflow Approval Rules Schema",

	"finance.enable_aba_khqr": "Enable ABA PayWay KHQR Integration",
	"finance.enable_stripe": "Enable Stripe Credit Card Gateway",
	"finance.default_gateway": "Primary Payment Gateway",
	"finance.vat_tin_number": "Company Tax / VAT TIN Number",
};

/**
 * Returns a human-friendly label for any configuration item.
 */
export function getHumanLabel(
	configKey: string,
	existingLabel?: string,
): string {
	if (
		existingLabel &&
		existingLabel.trim() &&
		existingLabel.trim() !== configKey
	) {
		return existingLabel.trim();
	}

	if (KNOWN_LABELS[configKey]) {
		return KNOWN_LABELS[configKey];
	}

	// Auto-generate title from key (e.g. "inventory.allow_negative_stock" -> "Allow Negative Stock")
	const parts = configKey.split(".");
	const lastPart = parts.slice(1).join(" ") || parts[0];
	return lastPart
		.replace(/[_-]/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalizes boolean values from "true", "false", 1, 0, or boolean
 */
export function normalizeBoolean(val: any): boolean {
	if (typeof val === "boolean") return val;
	if (typeof val === "string") {
		return val.toLowerCase() === "true" || val === "1";
	}
	if (typeof val === "number") return val === 1;
	return Boolean(val);
}

/**
 * Normalizes number values from string or number
 */
export function normalizeNumber(val: any, fallback = 0): number {
	if (typeof val === "number" && !isNaN(val)) return val;
	if (typeof val === "string") {
		const parsed = Number(val);
		return isNaN(parsed) ? fallback : parsed;
	}
	return fallback;
}

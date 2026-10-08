export type ConfigCategory =
	| "GENERAL"
	| "SECURITY"
	| "AUTH"
	| "FINANCE"
	| "INVENTORY"
	| "DOCUMENT"
	| "NOTIFICATION"
	| "FEATURE"
	| "PAYMENT"
	| "PRODUCT"
	| "WORKFLOW"
	| "CUSTOMER"
	| "SYSTEM";

export type ValueType = "STRING" | "INTEGER" | "DECIMAL" | "BOOLEAN" | "JSON";

export type UiComponent =
	| "TOGGLE"
	| "TEXT"
	| "NUMBER"
	| "DECIMAL"
	| "SELECT"
	| "TEXTAREA"
	| "JSON_EDITOR"
	| "TAGS"
	| "COLOR_PICKER"
	| "DATE";

export interface ConfigurationItem {
	id: number;
	configKey: string;
	label: string;
	configValue: any;
	valueType: ValueType;
	scope: "SYSTEM" | "COMPANY";
	companyId?: number;
	category: ConfigCategory;
	groupName?: string;
	uiComponent: UiComponent;
	options?: string;
	defaultValue?: string;
	description?: string;
	validationRule?: string;
	isEncrypted: boolean;
	isReadOnly: boolean;
	isSystemAdminOnly: boolean;
	displayOrder: number;
	overridden: boolean; // true = Company Override, false = System Default
	updatedAt?: string;
}

export interface ConfigurationSectionGroup {
	sectionName: string;
	configurations: ConfigurationItem[];
}

export interface ConfigurationDomainGroup {
	category: ConfigCategory;
	categoryLabel: string;
	description: string;
	icon: string;
	displayOrder: number;
	totalConfigurations: number;
	sections: ConfigurationSectionGroup[];
}

export interface BatchUpdateItem {
	configKey: string;
	valueType?: ValueType;
	scope?: "SYSTEM" | "COMPANY";
	category?: ConfigCategory;
	configValue: any;
	defaultValue?: string | null;
	description?: string | null;
	validationRule?: string | null;
	isEncrypted?: boolean;
	isReadOnly?: boolean;
	displayOrder?: number;
}

export interface BatchUpdateRequest {
	items: BatchUpdateItem[];
}

export interface DomainMetadata {
	category: ConfigCategory;
	categoryLabel: string;
	description: string;
	icon: string;
	displayOrder: number;
	sections?: string[];
}

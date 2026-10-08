export type PlanTier = "FREE_TRIAL" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
export type BillingCycle = "MONTHLY" | "YEARLY" | "QUARTERLY" | "ONE_TIME";
export type IntervalUnit = "DAY" | "MONTH" | "YEAR";
export type SubscriptionStatus =
	| "TRIAL"
	| "ACTIVE"
	| "PAST_DUE"
	| "EXPIRED"
	| "CANCELLED";

export interface FeatureItem {
	id: number | string;
	code: string;
	name: string;
	status?: string;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
	deletedAt?: string | null;
}

export interface FeatureRequest {
	code: string;
	name: string;
	description?: string;
}

export interface CompanyEntitlement {
	companyId: number | string;
	subscriptionStatus: SubscriptionStatus;
	active: boolean;
	planId?: number | string;
	planCode?: string;
	planName?: string;
	planDisplayName?: string;
	tier?: PlanTier;
	sortOrder?: number;
	planPriceId?: number | string;
	billingCycle?: BillingCycle;
	amount?: number;
	currency?: string;
	startDate?: string;
	endDate?: string;
	nextBillingDate?: string | null;
	autoRenew?: boolean;
	maxUsers?: number;
	featureCodes?: string[];
}

export interface PlanDetail {
	id: number | string;
	code: string;
	name: string;
	displayName?: string;
	description?: string;
	maxUsers: number;
	trial: boolean;
	active: boolean;
	publiclyVisible: boolean;
	sortOrder?: number;
	tier: PlanTier;
	features?: FeatureItem[];
	prices?: PlanPriceDetail[];
	status?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface PlanRequest {
	code: string;
	name: string;
	displayName?: string;
	description?: string;
	maxUsers: number;
	trial: boolean;
	publiclyVisible: boolean;
	tier: PlanTier;
	featureIds: (number | string)[];
	sortOrder?: number;
}

export interface PlanPriceDetail {
	id: number | string;
	planId: number | string;
	billingCycle: BillingCycle;
	amount: number;
	currency: string;
	intervalCount: number;
	intervalUnit: IntervalUnit;
	durationDays: number;
	status?: string;
	active?: boolean;
	createdAt?: string;
	updatedAt?: string;
}

export interface PlanPriceRequest {
	planId: number | string;
	billingCycle: BillingCycle;
	amount: number;
	currency: string;
	intervalCount: number;
	intervalUnit: IntervalUnit;
	durationDays: number;
}

export interface PlanPriceGroupResponse {
	id?: number | string;
	code?: string;
	name?: string;
	plan: PlanDetail;
	prices: PlanPriceDetail[];
	planPrice?: PlanPriceDetail[];
}

export interface ActiveSubscription {
	id: number | string;
	companyId: number | string;
	companyName?: string;
	plan?: PlanDetail;
	planPrice?: PlanPriceDetail;
	status: SubscriptionStatus;
	startDate: string;
	endDate: string;
	gracePeriodEnd?: string | null;
	nextBillingDate?: string | null;
	autoRenew: boolean;
	subscribedAmount: number;
	subscribedCurrency: string;
	cancellationReason?: string | null;
	createdAt: string;
	updatedAt?: string;
}

export interface SubscribeRequest {
	planPriceId: number | string;
	promoCodeId?: string | number;
	companyId?: number | string;
}

export interface CancelSubscriptionRequest {
	immediate: boolean;
	cancellationReason: string;
}

export interface SubscriptionAuditLog {
	id: number | string;
	companyId?: number | string;
	companyName?: string;
	oldPlan?: PlanDetail | null;
	newPlan?: PlanDetail | null;
	oldPlanPrice?:
		| PlanPriceDetail
		| {
				billingCycle: string;
				amount: number;
				currency?: string;
				intervalUnit?: string;
				durationDays?: number;
		  }
		| null;
	newPlanPrice?:
		| PlanPriceDetail
		| {
				billingCycle: string;
				amount: number;
				currency?: string;
				intervalUnit?: string;
				durationDays?: number;
		  }
		| null;
	oldStatus?: SubscriptionStatus | string | null;
	newStatus?: SubscriptionStatus | string | null;
	action:
		| "UPGRADE"
		| "DOWNGRADE"
		| "RENEW"
		| "CANCEL"
		| "TRIAL_START"
		| "SUBSCRIBE"
		| "CHANGE"
		| string;
	createdBy?: number | string;
	remark?: string;
	subscribeDate?: string | null;
	expireDate?: string | null;
	createdAt: string;
	// Optional / legacy active subscription fields
	subscribedAmount?: number;
	subscribedCurrency?: string;
	startDate?: string;
	endDate?: string;
	autoRenew?: boolean;
	cancellationReason?: string | null;
}

export interface CompanySubscriptionGroup {
	companyId: number | string;
	companyName: string;
	businessId?: string;
	activeSubscription?: ActiveSubscription | null;
	subscriptions: ActiveSubscription[];
	totalSubscriptions: number;
}

export interface SubscriptionSearchCriteria {
	field: string;
	operator: string;
	value: any;
}

export interface SubscriptionFilterGroup {
	logicalOperator?: "AND" | "OR";
	criteria?: SubscriptionSearchCriteria[];
}

export interface SubscriptionSearchRequest {
	filterGroup?: SubscriptionFilterGroup;
	sort?: { field: string; direction: "ASC" | "DESC" }[];
	page?: number;
	size?: number;
}

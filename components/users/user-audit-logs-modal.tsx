"use client";

import {
	ModernModal,
	ModernModalCancelButton,
	ModernModalFooter,
} from "@/components/ui-custom/modal";
import type { User } from "@/lib/types";
import { Activity } from "lucide-react";
import { UserAuditLogsSection } from "./user-audit-logs-section";

import { useTranslation } from "@/lib/i18n/context";

export interface UserAuditLogsModalProps {
	user: User | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserAuditLogsModal({
	user,
	open,
	onOpenChange,
}: UserAuditLogsModalProps) {
	const { t } = useTranslation();
	if (!user) return null;

	const username = user.username || (user as any).userName || "";
	const displayName =
		`${user.firstname || user.firstName || ""} ${user.lastname || user.lastName || ""}`.trim() ||
		username ||
		"User";

	return (
		<ModernModal
			isOpen={open}
			onClose={() => onOpenChange(false)}
			title={`${t("users.auditLogs")}: ${displayName}`}
			subtitle={`Complete system activity & change logs executed by user @${username}`}
			icon={
				<Activity className="size-5 text-purple-600 dark:text-purple-400" />
			}
			size="2xl"
			footer={
				<ModernModalFooter>
					<ModernModalCancelButton
						onClick={() => onOpenChange(false)}
						label={t("common.close")}
					/>
				</ModernModalFooter>
			}
		>
			<div className="max-h-[75vh] overflow-y-auto pr-1 py-1">
				<UserAuditLogsSection
					username={username}
					userDisplayName={displayName}
				/>
			</div>
		</ModernModal>
	);
}

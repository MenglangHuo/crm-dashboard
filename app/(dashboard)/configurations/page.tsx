"use client";

import { SystemConfigurationsView } from "@/components/configurations/system-configurations-view";
import { PermissionGuard } from "@/components/auth/permission-guard";

export default function ConfigurationsPage() {
	return (
		<PermissionGuard resource="COMPANY" action="READ">
			<SystemConfigurationsView />
		</PermissionGuard>
	);
}

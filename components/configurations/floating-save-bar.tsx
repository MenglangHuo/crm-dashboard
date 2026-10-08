"use client";

import { ModernButton } from "@/components/ui-custom/button";
import { Save, Undo2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface FloatingSaveBarProps {
	dirtyCount: number;
	onDiscard: () => void;
	onSave: () => void;
	isSaving: boolean;
}

export function FloatingSaveBar({
	dirtyCount,
	onDiscard,
	onSave,
	isSaving,
}: FloatingSaveBarProps) {
	const { t } = useTranslation();

	if (dirtyCount === 0) return null;

	return (
		<div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
			<div className="pointer-events-auto flex items-center gap-4 rounded-2xl bg-slate-950/95 px-5 py-2.5 text-white shadow-2xl shadow-slate-950/50 border border-slate-800/80 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
				{/* Unsaved count label */}
				<div className="flex items-center gap-2">
					<span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
					<span className="text-xs font-medium text-slate-200">
						{t("configurations.unsavedChangesPrefix", "You have")}{" "}
						<span className="font-bold text-white underline decoration-amber-400/60 underline-offset-2">
							{dirtyCount}
						</span>{" "}
						{dirtyCount > 1
							? t("configurations.unsavedChangesPlural", "unsaved changes")
							: t("configurations.unsavedChangesSingular", "unsaved change")}
					</span>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 border-l border-slate-800 pl-3">
					<ModernButton
						variant="ghost"
						size="sm"
						onClick={onDiscard}
						disabled={isSaving}
						className="text-slate-300 hover:bg-slate-800 hover:text-white"
						leftIcon={<Undo2 className="h-3.5 w-3.5" />}
					>
						{t("configurations.discard", "Discard")}
					</ModernButton>

					<ModernButton
						variant="primary"
						size="sm"
						onClick={onSave}
						disabled={isSaving}
						isLoading={isSaving}
						loadingText={t("configurations.saving", "Saving...")}
						leftIcon={<Save className="h-3.5 w-3.5" />}
					>
						{t("configurations.saveChanges", "Save Changes")}
					</ModernButton>
				</div>
			</div>
		</div>
	);
}

import { ApprovalInboxSurface } from "../approvals/approval-inbox-surface";
import { useShellCallbacks } from "../shell/shell-context";

export function ApprovalsPage() {
	const { openApplicationHelp } = useShellCallbacks();

	return <ApprovalInboxSurface onOpenApplicationHelp={openApplicationHelp} />;
}

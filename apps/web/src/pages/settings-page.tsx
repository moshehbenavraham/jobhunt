import { useNavigate, useOutletContext } from "react-router";
import type { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { SettingsSurface } from "../settings/settings-surface";
import type { useOperatorHome } from "../shell/use-operator-home";
import type { useOperatorShell } from "../shell/use-operator-shell";

type LayoutContext = {
	home: ReturnType<typeof useOperatorHome>;
	shell: ReturnType<typeof useOperatorShell>;
	startup: ReturnType<typeof useStartupDiagnostics>;
};

export function SettingsPage() {
	const { shell, startup } = useOutletContext<LayoutContext>();
	const navigate = useNavigate();

	return (
		<SettingsSurface
			onOpenOnboarding={() => navigate("/onboarding")}
			onOpenStartup={() => navigate("/startup")}
			onSummaryRefresh={() => {
				startup.refresh();
				shell.refresh();
			}}
		/>
	);
}

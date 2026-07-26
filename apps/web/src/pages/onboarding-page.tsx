import { useNavigate, useOutletContext } from "react-router";
import type { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { OnboardingWizardSurface } from "../onboarding/onboarding-wizard-surface";
import type { useOperatorHome } from "../shell/use-operator-home";
import type { useOperatorShell } from "../shell/use-operator-shell";

type LayoutContext = {
	home: ReturnType<typeof useOperatorHome>;
	shell: ReturnType<typeof useOperatorShell>;
	startup: ReturnType<typeof useStartupDiagnostics>;
};

export function OnboardingPage() {
	const { shell, startup } = useOutletContext<LayoutContext>();
	const navigate = useNavigate();

	return (
		<OnboardingWizardSurface
			onOpenHome={() => navigate("/")}
			onOpenStartup={() => navigate("/startup")}
			onRepairApplied={() => {
				startup.refresh();
				shell.refresh();
			}}
		/>
	);
}

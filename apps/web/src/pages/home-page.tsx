import { useOutletContext } from "react-router";
import type { useStartupDiagnostics } from "../boot/use-startup-diagnostics";
import { OperatorHomeSurface } from "../shell/operator-home-surface";
import { useShellCallbacks } from "../shell/shell-context";
import type { useOperatorHome } from "../shell/use-operator-home";
import type { useOperatorShell } from "../shell/use-operator-shell";

type LayoutContext = {
	home: ReturnType<typeof useOperatorHome>;
	shell: ReturnType<typeof useOperatorShell>;
	startup: ReturnType<typeof useStartupDiagnostics>;
};

export function HomePage() {
	const { home } = useOutletContext<LayoutContext>();
	const { runHomeAction } = useShellCallbacks();

	return (
		<OperatorHomeSurface
			onRefresh={home.refresh}
			onRunAction={runHomeAction}
			state={home.state}
		/>
	);
}

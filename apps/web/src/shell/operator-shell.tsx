import { RouterProvider } from "react-router";
import { router } from "../routes";

/**
 * Legacy entry point retained for backwards compatibility. The shell chrome is
 * now rendered by RootLayout inside the React Router tree (see routes.tsx).
 * New code should mount RouterProvider directly via main.tsx.
 */
export function OperatorShell() {
	return <RouterProvider router={router} />;
}

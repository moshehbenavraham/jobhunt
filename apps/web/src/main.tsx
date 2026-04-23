import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./routes";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Missing #root mount point in apps/web/index.html");
}

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);

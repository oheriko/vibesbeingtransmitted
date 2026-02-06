import { createRoot } from "react-dom/client";
import { Dashboard } from "./Dashboard";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<Dashboard />);

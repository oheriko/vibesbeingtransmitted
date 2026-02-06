import { createRoot } from "react-dom/client";
import { Support } from "./Support";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<Support />);

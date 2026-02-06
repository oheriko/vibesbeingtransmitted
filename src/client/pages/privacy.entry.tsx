import { createRoot } from "react-dom/client";
import { Privacy } from "./Privacy";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<Privacy />);

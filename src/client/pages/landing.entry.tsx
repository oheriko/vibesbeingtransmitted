import { createRoot } from "react-dom/client";
import { Landing } from "./Landing";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<Landing />);

import { useEffect, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";

type Page = "landing" | "dashboard";

export function App() {
	const [page, setPage] = useState<Page>("landing");
	const [sessionId, setSessionId] = useState<string | null>(null);

	useEffect(() => {
		// Check URL for routing
		const path = window.location.pathname;
		const params = new URLSearchParams(window.location.search);

		if (path === "/dashboard" || params.has("installed") || params.has("spotify")) {
			setPage("dashboard");
		}

		// Check for existing session
		const stored = localStorage.getItem("vibes_session");
		if (stored) {
			setSessionId(stored);
		}
	}, []);

	const handleLogin = (newSessionId: string) => {
		localStorage.setItem("vibes_session", newSessionId);
		setSessionId(newSessionId);
		setPage("dashboard");
	};

	const handleLogout = () => {
		localStorage.removeItem("vibes_session");
		setSessionId(null);
		setPage("landing");
	};

	if (page === "dashboard") {
		return <Dashboard sessionId={sessionId} onLogout={handleLogout} />;
	}

	return <Landing onLogin={handleLogin} />;
}

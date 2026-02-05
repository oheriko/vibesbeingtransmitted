import { useEffect, useState } from "react";
import { authClient } from "./auth";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";

type Page = "landing" | "dashboard";

export function App() {
	const { data: session, isPending } = authClient.useSession();
	const [page, setPage] = useState<Page>("landing");

	useEffect(() => {
		const path = window.location.pathname;
		const params = new URLSearchParams(window.location.search);

		if (path === "/dashboard" || params.has("installed") || params.has("spotify")) {
			setPage("dashboard");
		}
	}, []);

	// Redirect to landing if on dashboard without a session (after loading)
	useEffect(() => {
		if (!isPending && !session && page === "dashboard") {
			// Check if this is a post-install/connect redirect — give it a moment
			const params = new URLSearchParams(window.location.search);
			if (!params.has("installed") && !params.has("spotify")) {
				setPage("landing");
			}
		}
	}, [isPending, session, page]);

	const handleLogout = async () => {
		await authClient.signOut();
		setPage("landing");
		window.history.replaceState(null, "", "/");
	};

	if (isPending) {
		return (
			<div
				style={{
					minHeight: "100vh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: "#1a1a2e",
					color: "#eee",
					fontFamily: "system-ui, -apple-system, sans-serif",
				}}
			>
				<p>Loading...</p>
			</div>
		);
	}

	if (page === "dashboard") {
		return <Dashboard isSignedIn={!!session} onLogout={handleLogout} />;
	}

	return <Landing isSignedIn={!!session} />;
}

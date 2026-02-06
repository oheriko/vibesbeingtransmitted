import type { UserStatus } from "@shared/types";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "../auth";

export function Dashboard() {
	const { data: session, isPending } = authClient.useSession();
	const [status, setStatus] = useState<UserStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const params = new URLSearchParams(window.location.search);
	const justInstalled = params.has("installed");
	const spotifyConnected = params.has("spotify");

	const isSignedIn = !!session;

	const handleLogout = useCallback(async () => {
		await authClient.signOut();
		window.location.href = "/";
	}, []);

	const fetchStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/user/status", {
				credentials: "include",
			});

			if (!res.ok) {
				if (res.status === 401) {
					handleLogout();
					return;
				}
				throw new Error("Failed to fetch status");
			}

			setStatus(await res.json());
		} catch {
			setError("Failed to load status");
		} finally {
			setLoading(false);
		}
	}, [handleLogout]);

	useEffect(() => {
		if (isPending) return;
		if (isSignedIn) {
			fetchStatus();
		} else if (!justInstalled && !spotifyConnected) {
			window.location.href = "/";
		} else {
			setLoading(false);
		}
	}, [isPending, isSignedIn, fetchStatus, justInstalled, spotifyConnected]);

	async function toggleSharing() {
		if (!status) return;

		try {
			const res = await fetch("/api/user/sharing", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ isSharing: !status.isSharing }),
			});

			if (res.ok) {
				setStatus({ ...status, isSharing: !status.isSharing });
			}
		} catch {
			setError("Failed to update sharing");
		}
	}

	async function connectSpotify() {
		try {
			const res = await fetch("/api/spotify/connect-url", {
				credentials: "include",
			});

			if (res.ok) {
				const { url } = await res.json();
				window.location.href = url;
			}
		} catch {
			setError("Failed to get connect URL");
		}
	}

	async function disconnectSpotify() {
		try {
			const res = await fetch("/api/user/disconnect", {
				method: "POST",
				credentials: "include",
			});

			if (res.ok) {
				setStatus({ isConnected: false, isSharing: false, currentTrack: null });
			}
		} catch {
			setError("Failed to disconnect");
		}
	}

	if (isPending || loading) {
		return (
			<div style={styles.container}>
				<div style={styles.content}>
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	// No session — show post-install / post-connect message
	if (!isSignedIn) {
		return (
			<div style={styles.container}>
				<div style={styles.content}>
					<h1 style={styles.title}>🎵 Vibes Being Transmitted</h1>

					{justInstalled && <div style={styles.successBanner}>✅ App installed successfully!</div>}

					{spotifyConnected && (
						<div style={styles.successBanner}>
							✅ Spotify connected! Your status will now update.
						</div>
					)}

					<p style={styles.text}>
						Use the <strong>/vibes</strong> command in Slack or visit the App Home tab to manage
						your settings.
					</p>

					<div style={styles.commands}>
						<h3>Quick Commands:</h3>
						<ul>
							<li>
								<code>/vibes connect</code> - Connect Spotify
							</li>
							<li>
								<code>/vibes pause</code> - Pause sharing
							</li>
							<li>
								<code>/vibes resume</code> - Resume sharing
							</li>
							<li>
								<code>/vibes status</code> - Check status
							</li>
						</ul>
					</div>

					<a href="/" style={styles.link}>
						← Back to home
					</a>
				</div>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.content}>
				<h1 style={styles.title}>🎵 Dashboard</h1>

				{error && <div style={styles.errorBanner}>{error}</div>}

				{status && !status.isConnected ? (
					<div style={styles.card}>
						<h2>Connect Spotify</h2>
						<p>Link your Spotify account to start sharing what you're listening to.</p>
						<button type="button" onClick={connectSpotify} style={styles.primaryButton}>
							Connect Spotify
						</button>
					</div>
				) : status ? (
					<>
						<div style={styles.card}>
							<h2>Status</h2>
							<div style={styles.statusRow}>
								<span>{status.isSharing ? "🟢" : "⏸️"}</span>
								<span>{status.isSharing ? "Sharing enabled" : "Sharing paused"}</span>
							</div>

							{status.currentTrack && (
								<div style={styles.nowPlaying}>
									<span>🎵</span>
									<span>
										{status.currentTrack.name} - {status.currentTrack.artist}
									</span>
									<span style={styles.playingStatus}>
										{status.currentTrack.isPlaying ? "▶️ Playing" : "⏸️ Paused"}
									</span>
								</div>
							)}

							<button
								type="button"
								onClick={toggleSharing}
								style={status.isSharing ? styles.secondaryButton : styles.primaryButton}
							>
								{status.isSharing ? "Pause Sharing" : "Resume Sharing"}
							</button>
						</div>

						<div style={styles.card}>
							<h2>Settings</h2>
							<button type="button" onClick={disconnectSpotify} style={styles.dangerButton}>
								Disconnect Spotify
							</button>
						</div>
					</>
				) : null}

				<button type="button" onClick={handleLogout} style={styles.link}>
					Sign out
				</button>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		minHeight: "100vh",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#1a1a2e",
		color: "#eee",
		fontFamily: "system-ui, -apple-system, sans-serif",
		padding: "20px",
	},
	content: {
		maxWidth: "500px",
		width: "100%",
	},
	title: {
		fontSize: "2rem",
		marginBottom: "1.5rem",
		textAlign: "center",
	},
	text: {
		fontSize: "1.1rem",
		lineHeight: "1.6",
		marginBottom: "1.5rem",
	},
	card: {
		backgroundColor: "#252542",
		borderRadius: "12px",
		padding: "24px",
		marginBottom: "16px",
	},
	statusRow: {
		display: "flex",
		alignItems: "center",
		gap: "12px",
		fontSize: "1.2rem",
		marginBottom: "16px",
	},
	nowPlaying: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		backgroundColor: "#1a1a2e",
		padding: "12px",
		borderRadius: "8px",
		marginBottom: "16px",
		flexWrap: "wrap",
	},
	playingStatus: {
		marginLeft: "auto",
		fontSize: "0.9rem",
		color: "#888",
	},
	primaryButton: {
		backgroundColor: "#1db954",
		color: "white",
		border: "none",
		padding: "12px 24px",
		fontSize: "1rem",
		borderRadius: "6px",
		cursor: "pointer",
		fontWeight: "bold",
	},
	secondaryButton: {
		backgroundColor: "#444",
		color: "white",
		border: "none",
		padding: "12px 24px",
		fontSize: "1rem",
		borderRadius: "6px",
		cursor: "pointer",
	},
	dangerButton: {
		backgroundColor: "#e53935",
		color: "white",
		border: "none",
		padding: "12px 24px",
		fontSize: "1rem",
		borderRadius: "6px",
		cursor: "pointer",
	},
	link: {
		color: "#888",
		background: "none",
		border: "none",
		cursor: "pointer",
		textDecoration: "underline",
		fontSize: "0.9rem",
		display: "block",
		textAlign: "center",
		marginTop: "16px",
	},
	successBanner: {
		backgroundColor: "#1db954",
		color: "white",
		padding: "12px 16px",
		borderRadius: "8px",
		marginBottom: "16px",
		textAlign: "center",
	},
	errorBanner: {
		backgroundColor: "#e53935",
		color: "white",
		padding: "12px 16px",
		borderRadius: "8px",
		marginBottom: "16px",
		textAlign: "center",
	},
	commands: {
		backgroundColor: "#252542",
		borderRadius: "12px",
		padding: "20px",
		marginBottom: "16px",
		textAlign: "left",
	},
};

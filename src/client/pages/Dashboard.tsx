import type { DashboardStatus } from "@shared/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "../auth";

function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 5) return "just now";
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ago`;
}

export function Dashboard() {
	const { data: session, isPending } = authClient.useSession();
	const [status, setStatus] = useState<DashboardStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [agoText, setAgoText] = useState("");
	const [pulseOn, setPulseOn] = useState(true);

	const params = new URLSearchParams(window.location.search);
	const justInstalled = params.has("installed");
	const spotifyConnected = params.has("spotify");

	const isSignedIn = !!session;
	const statusRef = useRef(status);
	statusRef.current = status;

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
			const data: DashboardStatus = await res.json();
			setStatus(data);
			if (data.lastUpdated) setAgoText(timeAgo(data.lastUpdated));
		} catch {
			setError("Failed to load status");
		} finally {
			setLoading(false);
		}
	}, [handleLogout]);

	// Initial fetch + 10s polling
	useEffect(() => {
		if (isPending) return;
		if (isSignedIn) {
			fetchStatus();
			const interval = setInterval(fetchStatus, 10_000);
			return () => clearInterval(interval);
		}
		if (!justInstalled && !spotifyConnected) {
			window.location.href = "/";
		} else {
			setLoading(false);
		}
	}, [isPending, isSignedIn, fetchStatus, justInstalled, spotifyConnected]);

	// Tick "Updated Xs ago" every second
	useEffect(() => {
		const interval = setInterval(() => {
			const s = statusRef.current;
			if (s?.lastUpdated) setAgoText(timeAgo(s.lastUpdated));
		}, 1_000);
		return () => clearInterval(interval);
	}, []);

	// Pulse animation via state toggle
	useEffect(() => {
		const interval = setInterval(() => setPulseOn((v) => !v), 1_000);
		return () => clearInterval(interval);
	}, []);

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
				setStatus({
					isConnected: false,
					isSharing: false,
					currentTrack: null,
					lastSource: null,
					lastUpdated: null,
					hasExtensionToken: status?.hasExtensionToken ?? false,
				});
			}
		} catch {
			setError("Failed to disconnect");
		}
	}

	if (isPending || loading) {
		return (
			<div style={styles.page}>
				<div style={styles.container}>
					<p style={{ color: "#888" }}>Loading...</p>
				</div>
			</div>
		);
	}

	// No session — show post-install / post-connect message
	if (!isSignedIn) {
		return (
			<div style={styles.page}>
				<div style={styles.container}>
					<h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", textAlign: "center" as const }}>
						Vibes Being Transmitted
					</h1>
					{justInstalled && <div style={styles.successBanner}>App installed successfully!</div>}
					{spotifyConnected && (
						<div style={styles.successBanner}>Spotify connected! Your status will now update.</div>
					)}
					<p style={{ fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
						Use the <strong>/vibes</strong> command in Slack or visit the App Home tab to manage
						your settings.
					</p>
					<a href="/" style={styles.footerLink}>
						&larr; Back to home
					</a>
				</div>
			</div>
		);
	}

	const sourceLabel =
		status?.lastSource === "youtube-music"
			? "YouTube Music"
			: status?.lastSource === "spotify"
				? "Spotify"
				: null;
	const sourceColor = status?.lastSource === "youtube-music" ? "#ff0000" : "#1db954";

	const isPlaying = status?.currentTrack?.isPlaying ?? false;
	const setupDone = status?.isConnected ?? false;

	return (
		<div style={styles.page}>
			{/* Nav bar */}
			<nav style={styles.nav}>
				<a href="/" style={styles.navLogo}>
					Vibes Being Transmitted
				</a>
				<button type="button" onClick={handleLogout} style={styles.navSignOut}>
					Sign out
				</button>
			</nav>

			<div style={styles.container}>
				{error && <div style={styles.errorBanner}>{error}</div>}
				{justInstalled && <div style={styles.successBanner}>App installed successfully!</div>}
				{spotifyConnected && (
					<div style={styles.successBanner}>Spotify connected! Your status will now update.</div>
				)}

				{/* NOW PLAYING hero card */}
				<div style={styles.card}>
					<div style={styles.cardHeader}>
						<span style={styles.cardLabel}>NOW PLAYING</span>
						{status?.currentTrack && (
							<span
								style={{
									...styles.statusBadge,
									backgroundColor: isPlaying ? "rgba(29,185,84,0.15)" : "rgba(102,102,102,0.15)",
									color: isPlaying ? "#1db954" : "#666",
								}}
							>
								<span
									style={{
										display: "inline-block",
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: isPlaying ? "#1db954" : "#666",
										marginRight: 6,
										opacity: isPlaying ? (pulseOn ? 1 : 0.3) : 1,
										transition: "opacity 0.5s ease",
									}}
								/>
								{isPlaying ? "Playing" : "Paused"}
							</span>
						)}
					</div>

					{status?.currentTrack ? (
						<div style={{ marginTop: 16 }}>
							<div style={styles.trackName}>{status.currentTrack.name}</div>
							<div style={styles.artistName}>{status.currentTrack.artist}</div>
							<div style={styles.nowPlayingMeta}>
								{sourceLabel && (
									<span style={{ ...styles.sourceBadge, color: sourceColor }}>
										via {sourceLabel}
									</span>
								)}
								{agoText && (
									<span style={styles.updatedText}>
										{sourceLabel ? " · " : ""}Updated {agoText}
									</span>
								)}
							</div>
						</div>
					) : (
						<div style={{ marginTop: 16 }}>
							<div style={styles.artistName}>Nothing playing right now</div>
							{agoText && (
								<div style={{ ...styles.updatedText, marginTop: 8 }}>Last checked {agoText}</div>
							)}
						</div>
					)}

					<div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
						<button
							type="button"
							onClick={toggleSharing}
							style={status?.isSharing ? styles.secondaryButton : styles.primaryButton}
						>
							{status?.isSharing ? "Pause Sharing" : "Resume Sharing"}
						</button>
					</div>
				</div>

				{/* Connection cards */}
				<div style={styles.cardGrid}>
					{/* Spotify card */}
					<div style={styles.halfCard}>
						<span style={styles.cardLabel}>SPOTIFY</span>
						<div style={styles.connectionStatus}>
							<span
								style={{
									display: "inline-block",
									width: 8,
									height: 8,
									borderRadius: "50%",
									backgroundColor: status?.isConnected ? "#1db954" : "#666",
									marginRight: 8,
								}}
							/>
							{status?.isConnected ? "Connected" : "Not connected"}
						</div>
						{status?.isConnected ? (
							<button type="button" onClick={disconnectSpotify} style={styles.dangerButton}>
								Disconnect
							</button>
						) : (
							<button type="button" onClick={connectSpotify} style={styles.primaryButton}>
								Connect
							</button>
						)}
					</div>

					{/* YouTube Music card */}
					<div style={styles.halfCard}>
						<span style={styles.cardLabel}>YOUTUBE MUSIC</span>
						<div style={styles.connectionStatus}>
							<span
								style={{
									display: "inline-block",
									width: 8,
									height: 8,
									borderRadius: "50%",
									backgroundColor: status?.hasExtensionToken ? "#1db954" : "#666",
									marginRight: 8,
								}}
							/>
							Extension: {status?.hasExtensionToken ? "Active" : "Not configured"}
						</div>
						<div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 4 }}>
							{!status?.hasExtensionToken && (
								<span style={styles.hintText}>
									Use <strong>/vibes token</strong> in Slack
								</span>
							)}
							<div style={{ display: "flex", gap: 8 }}>
								<a href="/vibes-extension.zip" download style={styles.smallButton}>
									Chrome
								</a>
								<a href="/vibes-extension-firefox.zip" download style={styles.smallButton}>
									Firefox
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Setup checklist — only when Spotify not connected */}
				{!setupDone && (
					<div style={styles.setupBar}>
						<span style={styles.cardLabel}>SETUP</span>
						<div style={styles.setupSteps}>
							<span style={styles.setupStep}>
								<span style={{ color: "#1db954" }}>&#10003;</span> Slack
							</span>
							<span style={styles.setupDot}>&middot;</span>
							<span style={styles.setupStep}>
								{status?.isConnected ? (
									<span style={{ color: "#1db954" }}>&#10003;</span>
								) : (
									<span style={{ color: "#666" }}>&#9675;</span>
								)}{" "}
								Spotify
							</span>
							<span style={styles.setupDot}>&middot;</span>
							<span style={styles.setupStep}>
								{status?.hasExtensionToken ? (
									<span style={{ color: "#1db954" }}>&#10003;</span>
								) : (
									<span style={{ color: "#666" }}>&#9675;</span>
								)}{" "}
								Extension
							</span>
						</div>
					</div>
				)}

				{/* Footer */}
				<footer style={styles.footer}>
					<a href="/" style={styles.footerLink}>
						Home
					</a>
					<span style={styles.footerDot}>&middot;</span>
					<a href="/privacy" style={styles.footerLink}>
						Privacy
					</a>
				</footer>
			</div>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	page: {
		minHeight: "100vh",
		backgroundColor: "#0f0f1a",
		color: "#eee",
		fontFamily: "system-ui, -apple-system, sans-serif",
	},
	nav: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		padding: "16px 24px",
		borderBottom: "1px solid #1a1a2e",
		maxWidth: 800,
		margin: "0 auto",
	},
	navLogo: {
		color: "#eee",
		textDecoration: "none",
		fontFamily: '"ZamenhofInline", serif',
		fontSize: "2rem",
	},
	navSignOut: {
		background: "none",
		border: "1px solid #333",
		color: "#888",
		padding: "6px 14px",
		borderRadius: 6,
		cursor: "pointer",
		fontSize: "0.85rem",
	},
	container: {
		maxWidth: 800,
		margin: "0 auto",
		padding: "24px 20px",
	},
	card: {
		backgroundColor: "#1a1a2e",
		borderRadius: 12,
		padding: 24,
		marginBottom: 16,
	},
	cardHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
	},
	cardLabel: {
		fontSize: "0.75rem",
		fontWeight: 700,
		letterSpacing: "0.08em",
		color: "#888",
		textTransform: "uppercase" as const,
	},
	statusBadge: {
		display: "inline-flex",
		alignItems: "center",
		fontSize: "0.8rem",
		fontWeight: 600,
		padding: "4px 10px",
		borderRadius: 20,
	},
	trackName: {
		fontSize: "1.5rem",
		fontWeight: 700,
		lineHeight: 1.3,
	},
	artistName: {
		fontSize: "1.1rem",
		color: "#999",
		marginTop: 4,
	},
	nowPlayingMeta: {
		marginTop: 12,
		fontSize: "0.85rem",
		color: "#666",
	},
	sourceBadge: {
		fontWeight: 600,
	},
	updatedText: {
		color: "#555",
	},
	cardGrid: {
		display: "flex",
		gap: 16,
		flexWrap: "wrap" as const,
	},
	halfCard: {
		flex: "1 1 240px",
		backgroundColor: "#1a1a2e",
		borderRadius: 12,
		padding: 20,
		marginBottom: 16,
		display: "flex",
		flexDirection: "column" as const,
		gap: 12,
	},
	connectionStatus: {
		display: "flex",
		alignItems: "center",
		fontSize: "0.95rem",
	},
	hintText: {
		color: "#666",
		fontSize: "0.8rem",
	},
	smallButton: {
		display: "inline-block",
		backgroundColor: "#252542",
		color: "#ccc",
		padding: "5px 12px",
		borderRadius: 6,
		fontSize: "0.8rem",
		textDecoration: "none",
		border: "1px solid #333",
	},
	primaryButton: {
		backgroundColor: "#1db954",
		color: "white",
		border: "none",
		padding: "10px 20px",
		fontSize: "0.9rem",
		borderRadius: 6,
		cursor: "pointer",
		fontWeight: 600,
		alignSelf: "flex-start" as const,
	},
	secondaryButton: {
		backgroundColor: "#252542",
		color: "#ccc",
		border: "1px solid #333",
		padding: "10px 20px",
		fontSize: "0.9rem",
		borderRadius: 6,
		cursor: "pointer",
		fontWeight: 600,
	},
	dangerButton: {
		backgroundColor: "transparent",
		color: "#e53935",
		border: "1px solid #e53935",
		padding: "10px 20px",
		fontSize: "0.9rem",
		borderRadius: 6,
		cursor: "pointer",
		fontWeight: 600,
		alignSelf: "flex-start" as const,
	},
	setupBar: {
		backgroundColor: "#1a1a2e",
		borderRadius: 12,
		padding: "16px 20px",
		marginBottom: 16,
		display: "flex",
		alignItems: "center",
		gap: 16,
		flexWrap: "wrap" as const,
	},
	setupSteps: {
		display: "flex",
		alignItems: "center",
		gap: 0,
		fontSize: "0.9rem",
	},
	setupStep: {
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
	},
	setupDot: {
		margin: "0 10px",
		color: "#444",
	},
	footer: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		padding: "24px 0 0",
		marginTop: 8,
	},
	footerLink: {
		color: "#666",
		textDecoration: "none",
		fontSize: "0.9rem",
	},
	footerDot: {
		margin: "0 8px",
		color: "#444",
	},
	successBanner: {
		backgroundColor: "#1db954",
		color: "white",
		padding: "12px 16px",
		borderRadius: 8,
		marginBottom: 16,
		textAlign: "center" as const,
	},
	errorBanner: {
		backgroundColor: "#e53935",
		color: "white",
		padding: "12px 16px",
		borderRadius: 8,
		marginBottom: 16,
		textAlign: "center" as const,
	},
};

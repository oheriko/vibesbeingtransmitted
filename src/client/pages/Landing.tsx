interface LandingProps {
	onLogin: (sessionId: string) => void;
}

export function Landing(_props: LandingProps) {
	const slackAuthUrl = "/auth/slack";

	return (
		<div style={styles.container}>
			<div style={styles.content}>
				<h1 style={styles.title}>🎵 Vibes Being Transmitted</h1>
				<p style={styles.subtitle}>
					Share what you're listening to on Spotify with your Slack team
				</p>

				<div style={styles.features}>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>🎧</span>
						<span>Automatic status updates when you play music</span>
					</div>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>⏯️</span>
						<span>Pause and resume sharing anytime</span>
					</div>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>🔒</span>
						<span>Your data stays private - only status is shared</span>
					</div>
				</div>

				<a href={slackAuthUrl} style={styles.button}>
					Add to Slack
				</a>

				<p style={styles.note}>
					After installing, connect your Spotify account to start sharing your vibes.
				</p>
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
		textAlign: "center",
	},
	title: {
		fontSize: "2.5rem",
		marginBottom: "0.5rem",
	},
	subtitle: {
		fontSize: "1.2rem",
		color: "#aaa",
		marginBottom: "2rem",
	},
	features: {
		textAlign: "left",
		marginBottom: "2rem",
	},
	feature: {
		display: "flex",
		alignItems: "center",
		gap: "12px",
		marginBottom: "12px",
		fontSize: "1.1rem",
	},
	featureIcon: {
		fontSize: "1.5rem",
	},
	button: {
		display: "inline-block",
		backgroundColor: "#4a154b",
		color: "white",
		padding: "16px 32px",
		fontSize: "1.2rem",
		borderRadius: "8px",
		textDecoration: "none",
		fontWeight: "bold",
		transition: "background-color 0.2s",
	},
	note: {
		marginTop: "2rem",
		color: "#888",
		fontSize: "0.9rem",
	},
};

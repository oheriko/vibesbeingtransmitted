export function Privacy() {
	return (
		<div style={styles.page}>
			<nav style={styles.nav}>
				<a href="/" style={styles.navLink}>
					Home
				</a>
			</nav>

			<main style={styles.main}>
				<h1 style={styles.title}>Privacy Policy</h1>

				<div style={styles.content}>
					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>What We Collect</h2>
						<p style={styles.text}>
							Your Slack user ID and workspace ID, Slack access tokens (to update your status), and
							Spotify/YouTube Music tokens (to see what's playing). We also store the current track
							name temporarily.
						</p>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>What We Don't Do</h2>
						<p style={styles.text}>
							We don't store your listening history, share your data with third parties, or access
							anything beyond your playback status and Slack profile.
						</p>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Data Storage</h2>
						<p style={styles.text}>
							All tokens are encrypted at rest. You can disconnect at any time by removing the app
							from Slack, which deletes all your data.
						</p>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Open Source</h2>
						<p style={styles.text}>
							This app is fully open source. You can review the code on{" "}
							<a
								href="https://github.com/oheriko/vibesbeingtransmitted"
								style={styles.link}
								target="_blank"
								rel="noopener noreferrer"
							>
								GitHub
							</a>
							.
						</p>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Contact</h2>
						<p style={styles.text}>
							If you have questions about this privacy policy, please{" "}
							<a href="/support" style={styles.link}>
								contact us
							</a>
							.
						</p>
					</section>
				</div>
			</main>

			<footer style={styles.footer}>
				<a href="/" style={styles.footerLink}>
					Home
				</a>
				<span style={styles.footerDot}>&middot;</span>
				<a href="/support" style={styles.footerLink}>
					Support
				</a>
			</footer>
		</div>
	);
}

const styles: Record<string, React.CSSProperties> = {
	page: {
		minHeight: "100vh",
		backgroundColor: "#0f0f1a",
		color: "#e8e8e8",
		fontFamily: "system-ui, -apple-system, sans-serif",
	},
	nav: {
		padding: "16px 24px",
	},
	navLink: {
		color: "#b8b8b8",
		textDecoration: "none",
		fontSize: "14px",
		fontWeight: 500,
		border: "1px solid #444",
		borderRadius: "6px",
		padding: "6px 14px",
	},
	main: {
		maxWidth: "700px",
		margin: "0 auto",
		padding: "40px 20px 60px",
	},
	title: {
		fontSize: "2rem",
		marginBottom: "40px",
		color: "#fff",
	},
	content: {},
	section: {
		marginBottom: "32px",
	},
	sectionTitle: {
		fontSize: "1.2rem",
		marginBottom: "12px",
		color: "#fff",
	},
	text: {
		color: "#aaa",
		lineHeight: "1.7",
		fontSize: "0.95rem",
	},
	link: {
		color: "#7c5cff",
		textDecoration: "none",
	},
	footer: {
		textAlign: "center",
		padding: "40px 20px",
		color: "#666",
		borderTop: "1px solid #222",
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
};

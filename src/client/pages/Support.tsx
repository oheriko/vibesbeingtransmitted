export function Support() {
	return (
		<div style={styles.page}>
			<nav style={styles.nav}>
				<a href="/" style={styles.navLink}>
					Home
				</a>
			</nav>

			<main style={styles.main}>
				<h1 style={styles.title}>Support</h1>

				<div style={styles.content}>
					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Getting Help</h2>
						<p style={styles.text}>
							If you're having trouble with Vibes Being Transmitted, here are some ways to get help:
						</p>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Slack Commands</h2>
						<p style={styles.text}>Use these commands in any Slack channel:</p>
						<ul style={styles.list}>
							<li>
								<code style={styles.code}>/vibes status</code> — Check your connection status
							</li>
							<li>
								<code style={styles.code}>/vibes connect</code> — Connect Spotify
							</li>
							<li>
								<code style={styles.code}>/vibes pause</code> — Pause sharing
							</li>
							<li>
								<code style={styles.code}>/vibes resume</code> — Resume sharing
							</li>
							<li>
								<code style={styles.code}>/vibes token</code> — Get your YouTube Music extension
								token
							</li>
						</ul>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Common Issues</h2>
						<div style={styles.faq}>
							<div style={styles.faqItem}>
								<h3 style={styles.faqQuestion}>My Slack status isn't updating</h3>
								<p style={styles.text}>
									Make sure sharing is enabled (<code style={styles.code}>/vibes status</code>) and
									that you're actively playing music. Status updates happen every 30 seconds.
								</p>
							</div>
							<div style={styles.faqItem}>
								<h3 style={styles.faqQuestion}>Spotify disconnected</h3>
								<p style={styles.text}>
									Spotify tokens expire periodically. Use{" "}
									<code style={styles.code}>/vibes connect</code> to reconnect.
								</p>
							</div>
							<div style={styles.faqItem}>
								<h3 style={styles.faqQuestion}>YouTube Music extension not working</h3>
								<p style={styles.text}>
									Make sure you've entered your token in the extension popup. Get a fresh token with{" "}
									<code style={styles.code}>/vibes token</code> in Slack.
								</p>
							</div>
						</div>
					</section>

					<section style={styles.section}>
						<h2 style={styles.sectionTitle}>Report a Bug</h2>
						<p style={styles.text}>
							Found a bug or have a feature request? Open an issue on{" "}
							<a
								href="https://github.com/oheriko/vibesbeingtransmitted/issues"
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
							For other questions, reach out via{" "}
							<a
								href="https://github.com/oheriko/vibesbeingtransmitted/issues"
								style={styles.link}
								target="_blank"
								rel="noopener noreferrer"
							>
								GitHub Issues
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
				<a href="/privacy" style={styles.footerLink}>
					Privacy
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
	list: {
		paddingLeft: "24px",
		color: "#ccc",
		lineHeight: "2",
		marginTop: "8px",
	},
	code: {
		backgroundColor: "#2a2a3e",
		padding: "2px 8px",
		borderRadius: "4px",
		fontFamily: "monospace",
		fontSize: "0.9em",
	},
	link: {
		color: "#7c5cff",
		textDecoration: "none",
	},
	faq: {
		display: "flex",
		flexDirection: "column",
		gap: "20px",
		marginTop: "12px",
	},
	faqItem: {
		backgroundColor: "#1a1a2e",
		padding: "20px",
		borderRadius: "12px",
	},
	faqQuestion: {
		fontSize: "1rem",
		marginBottom: "8px",
		color: "#fff",
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

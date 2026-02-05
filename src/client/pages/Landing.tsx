interface LandingProps {
	onLogin: (sessionId: string) => void;
}

export function Landing(_props: LandingProps) {
	const slackAuthUrl =
		"https://slack.com/oauth/v2/authorize?client_id=1371702621683.10427102988647&scope=commands,chat:write,users:read&user_scope=users.profile:read,users.profile:write";

	return (
		<div style={styles.page}>
			{/* Nav */}
			<nav style={styles.nav}>
				<a
					href="https://github.com/oheriko/vibesbeingtransmitted"
					target="_blank"
					rel="noopener noreferrer"
					style={styles.githubLink}
					aria-label="View on GitHub"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 98 96"
						fill="currentColor"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							fillRule="evenodd"
							clipRule="evenodd"
							d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
						/>
					</svg>
				</a>
			</nav>

			{/* Hero Section */}
			<header style={styles.hero}>
				<img src="/favicon.svg" alt="Vibes logo" style={styles.heroIcon} />
				<h1 style={styles.logo}>Vibes Being Transmitted</h1>
				<p style={styles.tagline}>Share what you're listening to with your Slack team</p>
				<p style={styles.subtitle}>
					Works with <strong>Spotify</strong> and <strong>YouTube Music</strong>
				</p>
				<a href={slackAuthUrl}>
					<img
						alt="Add to Slack"
						height="40"
						width="139"
						src="https://platform.slack-edge.com/img/add_to_slack.png"
						srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
					/>
				</a>
			</header>

			{/* How It Works */}
			<section style={styles.section}>
				<h2 style={styles.sectionTitle}>How It Works</h2>
				<div style={styles.steps}>
					<div style={styles.step}>
						<div style={styles.stepNumber}>1</div>
						<h3 style={styles.stepTitle}>Install the Slack App</h3>
						<p style={styles.stepText}>
							Click "Add to Slack" and authorize the app to update your status
						</p>
					</div>
					<div style={styles.step}>
						<div style={styles.stepNumber}>2</div>
						<h3 style={styles.stepTitle}>Connect Your Music</h3>
						<p style={styles.stepText}>
							Link Spotify directly, or install our browser extension for YouTube Music
						</p>
					</div>
					<div style={styles.step}>
						<div style={styles.stepNumber}>3</div>
						<h3 style={styles.stepTitle}>Share Your Vibes</h3>
						<p style={styles.stepText}>
							Your Slack status automatically updates with what you're playing
						</p>
					</div>
				</div>
			</section>

			{/* Features */}
			<section style={{ ...styles.section, ...styles.sectionAlt }}>
				<h2 style={styles.sectionTitle}>Features</h2>
				<div style={styles.features}>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>🎧</span>
						<div>
							<h3 style={styles.featureTitle}>Automatic Updates</h3>
							<p style={styles.featureText}>Status updates in real-time as you listen</p>
						</div>
					</div>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>🔒</span>
						<div>
							<h3 style={styles.featureTitle}>Privacy First</h3>
							<p style={styles.featureText}>Only your current track is shared, nothing else</p>
						</div>
					</div>
					<div style={styles.feature}>
						<span style={styles.featureIcon}>🎵</span>
						<div>
							<h3 style={styles.featureTitle}>Multi-Platform</h3>
							<p style={styles.featureText}>Spotify native + YouTube Music via extension</p>
						</div>
					</div>
				</div>
			</section>

			{/* Browser Extension */}
			<section style={styles.section}>
				<h2 style={styles.sectionTitle}>YouTube Music Extension</h2>
				<p style={styles.extensionIntro}>
					To share what you're listening to on YouTube Music, install our browser extension.
				</p>

				<div style={styles.extensionSteps}>
					<h3 style={styles.extensionStepsTitle}>Installation (Chrome/Edge)</h3>
					<ol style={styles.extensionList}>
						<li>
							Download the extension:{" "}
							<a href="/vibes-extension.zip" style={styles.link}>
								vibes-extension.zip
							</a>
						</li>
						<li>Unzip the file to a folder on your computer</li>
						<li>
							Open <code style={styles.code}>chrome://extensions</code> (or{" "}
							<code style={styles.code}>edge://extensions</code>)
						</li>
						<li>Enable "Developer mode" (toggle in top right)</li>
						<li>Click "Load unpacked" and select the unzipped folder</li>
						<li>
							Get your token from Slack: type <code style={styles.code}>/vibes token</code> or click
							"Get Extension Token" in the App Home
						</li>
						<li>Click the extension icon and paste your token</li>
					</ol>
				</div>

				<div style={{ ...styles.extensionSteps, marginTop: "24px" }}>
					<h3 style={styles.extensionStepsTitle}>Installation (Firefox)</h3>
					<ol style={styles.extensionList}>
						<li>
							Download the Firefox extension:{" "}
							<a href="/vibes-extension-firefox.zip" style={styles.link}>
								vibes-extension-firefox.zip
							</a>
						</li>
						<li>
							Open <code style={styles.code}>about:debugging#/runtime/this-firefox</code>
						</li>
						<li>Click "Load Temporary Add-on" and select the zip file</li>
						<li>Get your token and configure as above</li>
					</ol>
					<p style={styles.note}>
						Note: Firefox temporary add-ons are removed when the browser closes.
					</p>
				</div>
			</section>

			{/* Privacy Policy */}
			<section id="privacy" style={{ ...styles.section, ...styles.sectionAlt }}>
				<h2 style={styles.sectionTitle}>Privacy Policy</h2>
				<div style={styles.privacyContent}>
					<p style={styles.privacyText}>
						<strong>What we collect:</strong> Your Slack user ID and workspace ID, Slack access
						tokens (to update your status), and Spotify/YouTube Music tokens (to see what's
						playing). We also store the current track name temporarily.
					</p>
					<p style={styles.privacyText}>
						<strong>What we don't do:</strong> We don't store your listening history, share your
						data with third parties, or access anything beyond your playback status and Slack
						profile.
					</p>
					<p style={styles.privacyText}>
						<strong>Data storage:</strong> All tokens are encrypted at rest. You can disconnect at
						any time by removing the app from Slack, which deletes all your data.
					</p>
					<p style={styles.privacyText}>
						<strong>Open source:</strong> This app is fully open source. You can review the code
						on{" "}
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
				</div>
			</section>

			{/* Footer */}
			<footer style={styles.footer}>
				<p>Made with 🎵 for music lovers everywhere</p>
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
		display: "flex",
		justifyContent: "flex-end",
		padding: "16px 24px",
		position: "absolute",
		top: 0,
		right: 0,
		left: 0,
	},
	githubLink: {
		color: "#888",
		textDecoration: "none",
		fontSize: "14px",
		fontWeight: 500,
	},
	hero: {
		textAlign: "center",
		padding: "80px 20px",
		background: "linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)",
	},
	heroIcon: {
		width: "96px",
		height: "96px",
		marginBottom: "24px",
		borderRadius: "12px",
	},
	logo: {
		fontFamily: '"ZamenhofInline", serif',
		fontSize: "clamp(2rem, 8vw, 4rem)",
		fontWeight: "normal",
		marginBottom: "16px",
		letterSpacing: "0.02em",
	},
	tagline: {
		fontSize: "1.4rem",
		color: "#b8b8b8",
		marginBottom: "8px",
	},
	subtitle: {
		fontSize: "1.1rem",
		color: "#888",
		marginBottom: "32px",
	},
	ctaButton: {
		display: "inline-block",
		backgroundColor: "#4a154b",
		color: "white",
		padding: "16px 40px",
		fontSize: "1.2rem",
		borderRadius: "8px",
		textDecoration: "none",
		fontWeight: "600",
		transition: "transform 0.2s, box-shadow 0.2s",
		boxShadow: "0 4px 14px rgba(74, 21, 75, 0.4)",
	},
	section: {
		padding: "60px 20px",
		maxWidth: "900px",
		margin: "0 auto",
	},
	sectionAlt: {
		backgroundColor: "#141424",
		maxWidth: "100%",
		paddingLeft: "20px",
		paddingRight: "20px",
	},
	sectionTitle: {
		fontSize: "2rem",
		textAlign: "center",
		marginBottom: "40px",
		color: "#fff",
	},
	steps: {
		display: "flex",
		flexWrap: "wrap",
		gap: "24px",
		justifyContent: "center",
	},
	step: {
		flex: "1 1 250px",
		maxWidth: "280px",
		textAlign: "center",
		padding: "24px",
	},
	stepNumber: {
		width: "48px",
		height: "48px",
		borderRadius: "50%",
		backgroundColor: "#4a154b",
		color: "white",
		fontSize: "1.5rem",
		fontWeight: "bold",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		margin: "0 auto 16px",
	},
	stepTitle: {
		fontSize: "1.2rem",
		marginBottom: "8px",
		color: "#fff",
	},
	stepText: {
		color: "#aaa",
		lineHeight: "1.5",
	},
	features: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
		gap: "24px",
		maxWidth: "900px",
		margin: "0 auto",
	},
	feature: {
		display: "flex",
		gap: "16px",
		padding: "20px",
		backgroundColor: "#1a1a2e",
		borderRadius: "12px",
	},
	featureIcon: {
		fontSize: "2rem",
		flexShrink: 0,
	},
	featureTitle: {
		fontSize: "1.1rem",
		marginBottom: "4px",
		color: "#fff",
	},
	featureText: {
		color: "#aaa",
		fontSize: "0.95rem",
	},
	extensionIntro: {
		textAlign: "center",
		color: "#aaa",
		marginBottom: "32px",
		fontSize: "1.1rem",
	},
	extensionSteps: {
		backgroundColor: "#1a1a2e",
		padding: "24px",
		borderRadius: "12px",
		maxWidth: "700px",
		margin: "0 auto",
	},
	extensionStepsTitle: {
		fontSize: "1.1rem",
		marginBottom: "16px",
		color: "#fff",
	},
	extensionList: {
		paddingLeft: "24px",
		color: "#ccc",
		lineHeight: "2",
	},
	link: {
		color: "#7c5cff",
		textDecoration: "none",
	},
	code: {
		backgroundColor: "#2a2a3e",
		padding: "2px 8px",
		borderRadius: "4px",
		fontFamily: "monospace",
		fontSize: "0.9em",
	},
	note: {
		marginTop: "16px",
		color: "#888",
		fontSize: "0.9rem",
		fontStyle: "italic",
	},
	footer: {
		textAlign: "center",
		padding: "40px 20px",
		color: "#666",
		borderTop: "1px solid #222",
	},
	privacyContent: {
		maxWidth: "700px",
		margin: "0 auto",
	},
	privacyText: {
		color: "#aaa",
		lineHeight: "1.7",
		marginBottom: "16px",
		fontSize: "0.95rem",
	},
};

interface LandingProps {
	onLogin: (sessionId: string) => void;
}

export function Landing(_props: LandingProps) {
	const slackAuthUrl = "/auth/slack";

	return (
		<div style={styles.page}>
			{/* Hero Section */}
			<header style={styles.hero}>
				<img src="/favicon.svg" alt="Vibes logo" style={styles.heroIcon} />
				<h1 style={styles.logo}>Vibes Being Transmitted</h1>
				<p style={styles.tagline}>Share what you're listening to with your Slack team</p>
				<p style={styles.subtitle}>
					Works with <strong>Spotify</strong> and <strong>YouTube Music</strong>
				</p>
				<a href={slackAuthUrl} style={styles.ctaButton}>
					Add to Slack
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
						<span style={styles.featureIcon}>⏯️</span>
						<div>
							<h3 style={styles.featureTitle}>Pause Anytime</h3>
							<p style={styles.featureText}>Toggle sharing on/off with a single command</p>
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
};

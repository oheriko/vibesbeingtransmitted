import { defineConfig } from "wxt";

export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Vibes Being Transmitted",
		description: "Share what you're listening to on YouTube Music with your Slack status",
		permissions: ["storage"],
		host_permissions: ["*://music.youtube.com/*"],
	},
});

import { defineConfig } from "wxt";
import { EXTENSION_VERSION } from "./utils/types";

export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	manifest: {
		name: "Vibes Being Transmitted",
		version: EXTENSION_VERSION,
		description: "Share what you're listening to on YouTube Music with your Slack status",
		permissions: ["storage"],
		host_permissions: ["*://music.youtube.com/*"],
		icons: {
			"16": "icon-16.png",
			"32": "icon-32.png",
			"48": "icon-48.png",
			"128": "icon-128.png",
		},
	},
});

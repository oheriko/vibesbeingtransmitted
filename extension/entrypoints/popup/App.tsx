import { useCallback, useEffect, useState } from "react";
import type { ExtensionConfig } from "@/utils/types";
import { DEFAULT_CONFIG } from "@/utils/types";

export default function App() {
	const [config, setConfig] = useState<ExtensionConfig>(DEFAULT_CONFIG);
	const [saved, setSaved] = useState(false);
	const [status, setStatus] = useState<"disconnected" | "connected" | "error">("disconnected");

	useEffect(() => {
		browser.storage.sync.get("config").then((result) => {
			if (result.config) {
				setConfig({ ...DEFAULT_CONFIG, ...result.config });
			}
		});
	}, []);

	const checkConnection = useCallback(async () => {
		try {
			const response = await fetch(`${config.serverUrl}/api/extension/status`, {
				headers: { "X-Extension-Token": config.apiToken },
			});
			setStatus(response.ok ? "connected" : "error");
		} catch {
			setStatus("error");
		}
	}, [config.serverUrl, config.apiToken]);

	useEffect(() => {
		if (config.apiToken && config.serverUrl) {
			checkConnection();
		} else {
			setStatus("disconnected");
		}
	}, [config.apiToken, config.serverUrl, checkConnection]);

	async function saveConfig() {
		await browser.storage.sync.set({ config });
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	}

	function updateConfig(updates: Partial<ExtensionConfig>) {
		setConfig((prev) => ({ ...prev, ...updates }));
	}

	return (
		<div className="container">
			<h1 className="title">Vibes Being Transmitted</h1>

			<div className="status">
				<span
					className="status-dot"
					style={{
						backgroundColor:
							status === "connected" ? "#1db954" : status === "error" ? "#e53935" : "#888",
					}}
				/>
				<span>
					{status === "connected"
						? "Connected"
						: status === "error"
							? "Connection failed"
							: "Not configured"}
				</span>
			</div>

			<div className="field">
				<label htmlFor="api-token" className="label">
					API Token
				</label>
				<input
					id="api-token"
					type="password"
					value={config.apiToken}
					onChange={(e) => updateConfig({ apiToken: e.target.value })}
					placeholder="Get this from /vibes token in Slack"
					className="input"
				/>
			</div>

			<div className="field">
				<label htmlFor="server-url" className="label">
					Server URL
				</label>
				<input
					id="server-url"
					type="text"
					value={config.serverUrl}
					onChange={(e) => updateConfig({ serverUrl: e.target.value })}
					className="input"
				/>
			</div>

			<div className="field">
				<label className="checkbox-label">
					<input
						type="checkbox"
						checked={config.enabled}
						onChange={(e) => updateConfig({ enabled: e.target.checked })}
					/>
					<span style={{ marginLeft: 8 }}>Enable status updates</span>
				</label>
			</div>

			<button type="button" onClick={saveConfig} className="button">
				{saved ? "Saved!" : "Save"}
			</button>

			<p className="hint">Open YouTube Music and play something to test.</p>
		</div>
	);
}

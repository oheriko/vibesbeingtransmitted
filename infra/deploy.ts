#!/usr/bin/env bun
/**
 * Deploy application to Hetzner Cloud server
 *
 * Syncs code, installs dependencies, and restarts the service
 *
 * Usage: bun run infra:deploy
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { $ } from "bun";
import { config } from "./config";
import { checkHcloud, getServer } from "./hcloud";

const REMOTE_DIR = "/opt/vibes";

async function main() {
	console.log("🚀 Deploying to Hetzner Cloud\n");

	// Verify hcloud CLI
	if (!(await checkHcloud())) {
		process.exit(1);
	}

	// Get server IP
	const server = await getServer(config.serverName);
	if (!server) {
		console.error(`Server '${config.serverName}' not found. Run 'bun run infra:setup' first.`);
		process.exit(1);
	}

	const ip = server.public_net.ipv4.ip;
	const keyPath = config.sshKeyPath.replace("~", homedir());
	const sshOpts = `-i ${keyPath} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
	const remote = `${config.deployUser}@${ip}`;

	console.log(`Deploying to ${ip}\n`);

	// Step 1: Build locally
	console.log("📦 Step 1: Building locally");
	await $`bun run build`.cwd(process.cwd().replace("/infra", ""));
	console.log("  ✓ Build complete\n");

	// Step 2: Sync files
	console.log("📤 Step 2: Syncing files");
	const excludes = [
		"node_modules",
		".git",
		".env",
		"*.db",
		"*.db-shm",
		"*.db-wal",
		".output",
		".wxt",
		"extension/node_modules",
		"extension/.output",
		"extension/.wxt",
		"infra",
	];

	const excludeArgs = excludes.map((e) => `--exclude=${e}`).join(" ");
	const projectRoot = process.cwd().replace("/infra", "");

	await $`rsync -avz --delete ${excludeArgs.split(" ")} -e "ssh ${sshOpts.split(" ")}" ${projectRoot}/ ${remote}:${REMOTE_DIR}/`;
	console.log("  ✓ Files synced\n");

	// Step 2b: Upload .env file if it exists locally
	const localEnvPath = `${projectRoot}/.env`;
	if (existsSync(localEnvPath)) {
		console.log("📤 Step 2b: Uploading .env file");
		await $`scp ${sshOpts.split(" ")} ${localEnvPath} ${remote}:${REMOTE_DIR}/.env`;
		console.log("  ✓ .env file uploaded\n");
	} else {
		console.log("⚠️  No local .env file found - service may fail without environment variables\n");
	}

	// Step 3: Install dependencies on server
	console.log("📥 Step 3: Installing dependencies");
	await $`ssh ${sshOpts.split(" ")} ${remote} "cd ${REMOTE_DIR} && bun install"`;
	console.log("  ✓ Dependencies installed\n");

	// Step 4: Stop any existing vibes processes
	console.log("🛑 Step 4: Stopping existing processes");
	await $`ssh ${sshOpts.split(" ")} ${remote} "systemctl stop vibes 2>/dev/null || true; pkill -f 'bun.*vibes' 2>/dev/null || true; sleep 1"`.nothrow();
	console.log("  ✓ Existing processes stopped\n");

	// Step 5: Update and restart service
	console.log("🔄 Step 5: Updating systemd service");
	const serviceFile = `[Unit]
Description=Vibes Being Transmitted
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vibes
ExecStart=/usr/local/bin/bun run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=-/opt/vibes/.env

[Install]
WantedBy=multi-user.target
`;
	await $`ssh ${sshOpts.split(" ")} ${remote} "cat > /etc/systemd/system/vibes.service << 'SVCEOF'
${serviceFile}SVCEOF"`;
	await $`ssh ${sshOpts.split(" ")} ${remote} "systemctl daemon-reload"`;
	console.log("  ✓ Service file updated\n");

	console.log("🔄 Step 6: Restarting service");
	await $`ssh ${sshOpts.split(" ")} ${remote} "systemctl restart vibes"`;

	// Check status
	const status = await $`ssh ${sshOpts.split(" ")} ${remote} "systemctl is-active vibes"`
		.text()
		.catch(() => "unknown");
	console.log(`  ✓ Service status: ${status.trim()}\n`);

	console.log("✅ Deployment complete!");
	console.log(`\nApp running at: https://vibesbeingtransmitted.com`);
	console.log(`(Caddy handles SSL automatically)`);
}

main().catch(console.error);

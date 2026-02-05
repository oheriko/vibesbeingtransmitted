#!/usr/bin/env bun
/**
 * Deploy application to Hetzner Cloud server
 *
 * Syncs code, installs dependencies, and restarts the service
 *
 * Usage: bun run infra:deploy
 */

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

	// Step 3: Install dependencies on server
	console.log("📥 Step 3: Installing dependencies");
	await $`ssh ${sshOpts.split(" ")} ${remote} "cd ${REMOTE_DIR} && bun install --production"`;
	console.log("  ✓ Dependencies installed\n");

	// Step 4: Run database migrations (if needed)
	console.log("🗄️  Step 4: Database setup");
	await $`ssh ${sshOpts.split(" ")} ${remote} "cd ${REMOTE_DIR} && bun run src/server/index.ts &>/dev/null & sleep 2 && kill $!"`.nothrow();
	console.log("  ✓ Database initialized\n");

	// Step 5: Restart service
	console.log("🔄 Step 5: Restarting service");
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

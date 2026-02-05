#!/usr/bin/env bun
/**
 * View logs from the Hetzner Cloud server
 *
 * Usage: bun run infra:logs [--follow]
 */

import { homedir } from "node:os";
import { config } from "./config";
import { checkHcloud, getServer } from "./hcloud";

async function main() {
	const follow = process.argv.includes("--follow") || process.argv.includes("-f");

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

	const journalctlArgs = follow ? "-fu vibes" : "-u vibes -n 100 --no-pager";

	console.log(`Fetching logs from ${config.serverName} (${ip})...\n`);

	const proc = Bun.spawn(
		[
			"ssh",
			"-i",
			keyPath,
			"-o",
			"StrictHostKeyChecking=no",
			"-o",
			"UserKnownHostsFile=/dev/null",
			`${config.deployUser}@${ip}`,
			`journalctl ${journalctlArgs}`,
		],
		{
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		}
	);

	await proc.exited;
}

main().catch(console.error);

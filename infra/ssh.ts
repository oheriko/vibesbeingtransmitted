#!/usr/bin/env bun
/**
 * SSH into the Hetzner Cloud server
 *
 * Usage: bun run infra:ssh
 */

import { homedir } from "node:os";
import { config } from "./config";
import { checkHcloud, getServer } from "./hcloud";

async function main() {
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

	console.log(`Connecting to ${config.serverName} (${ip})...\n`);

	// Execute SSH with proper TTY allocation
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

#!/usr/bin/env bun
/**
 * Show status of Hetzner Cloud infrastructure
 *
 * Usage: bun run infra:status
 */

import { config } from "./config";
import { checkHcloud, getFirewall, getServer, getSSHKey } from "./hcloud";

async function main() {
	console.log("📊 Hetzner Cloud Infrastructure Status\n");

	// Verify hcloud CLI
	if (!(await checkHcloud())) {
		process.exit(1);
	}

	console.log(`\nProject: ${config.projectName}`);
	console.log("─".repeat(40));

	// SSH Key
	const sshKey = await getSSHKey(config.sshKeyName);
	if (sshKey) {
		console.log(`\n🔑 SSH Key: ${sshKey.name}`);
		console.log(`   Fingerprint: ${sshKey.fingerprint}`);
	} else {
		console.log(`\n🔑 SSH Key: Not found`);
	}

	// Firewall
	const firewall = await getFirewall(config.firewallName);
	if (firewall) {
		console.log(`\n🛡️  Firewall: ${firewall.name}`);
		console.log(`   Rules: ${firewall.rules.length}`);
	} else {
		console.log(`\n🛡️  Firewall: Not found`);
	}

	// Server
	const server = await getServer(config.serverName);
	if (server) {
		console.log(`\n🖥️  Server: ${server.name}`);
		console.log(`   Status: ${server.status}`);
		console.log(`   IPv4: ${server.public_net.ipv4.ip}`);
		console.log(`   IPv6: ${server.public_net.ipv6.ip}`);
		console.log(`   Type: ${server.server_type.name}`);
		console.log(`   Location: ${server.datacenter.name}`);
		console.log(`   Image: ${server.image?.name || "unknown"}`);
	} else {
		console.log(`\n🖥️  Server: Not found`);
	}

	console.log("");
}

main().catch(console.error);

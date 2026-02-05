#!/usr/bin/env bun
/**
 * Destroy Hetzner Cloud infrastructure
 *
 * Removes server, firewall, and SSH key
 *
 * Usage: bun run infra:destroy
 */

import { config } from "./config";
import { checkHcloud, getFirewall, getServer, getSSHKey, hcloud } from "./hcloud";

async function main() {
	console.log("🗑️  Destroying Hetzner Cloud infrastructure\n");

	// Verify hcloud CLI
	if (!(await checkHcloud())) {
		process.exit(1);
	}

	// Confirm destruction
	const confirm = prompt(`Type '${config.projectName}' to confirm destruction: `);
	if (confirm !== config.projectName) {
		console.log("Aborted.");
		process.exit(0);
	}

	// Step 1: Delete server
	console.log("\n📋 Step 1: Server");
	const server = await getServer(config.serverName);
	if (server) {
		console.log(`  → Deleting server '${config.serverName}'`);
		const result = await hcloud(["server", "delete", config.serverName]);
		if (result.success) {
			console.log(`  ✓ Server deleted`);
		} else {
			console.error(`  ✗ Failed to delete server: ${result.error}`);
		}
	} else {
		console.log(`  ✓ Server '${config.serverName}' not found (already deleted)`);
	}

	// Step 2: Delete firewall
	console.log("\n📋 Step 2: Firewall");
	const firewall = await getFirewall(config.firewallName);
	if (firewall) {
		console.log(`  → Deleting firewall '${config.firewallName}'`);
		const result = await hcloud(["firewall", "delete", config.firewallName]);
		if (result.success) {
			console.log(`  ✓ Firewall deleted`);
		} else {
			console.error(`  ✗ Failed to delete firewall: ${result.error}`);
		}
	} else {
		console.log(`  ✓ Firewall '${config.firewallName}' not found (already deleted)`);
	}

	// Step 3: Delete SSH key (optional - keep for reuse)
	console.log("\n📋 Step 3: SSH Key");
	const sshKey = await getSSHKey(config.sshKeyName);
	if (sshKey) {
		const deleteKey = prompt("Delete SSH key from Hetzner? (y/N): ");
		if (deleteKey?.toLowerCase() === "y") {
			console.log(`  → Deleting SSH key '${config.sshKeyName}'`);
			const result = await hcloud(["ssh-key", "delete", config.sshKeyName]);
			if (result.success) {
				console.log(`  ✓ SSH key deleted from Hetzner`);
				console.log(`  ℹ Local key still exists at ${config.sshKeyPath}`);
			} else {
				console.error(`  ✗ Failed to delete SSH key: ${result.error}`);
			}
		} else {
			console.log(`  ✓ SSH key kept for future use`);
		}
	} else {
		console.log(`  ✓ SSH key '${config.sshKeyName}' not found (already deleted)`);
	}

	console.log("\n✅ Infrastructure destroyed!");
}

main().catch(console.error);

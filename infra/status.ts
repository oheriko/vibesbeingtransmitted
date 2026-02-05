#!/usr/bin/env bun
/**
 * Show status of Hetzner Cloud infrastructure
 *
 * Usage: bun run infra:status
 */

import { homedir } from "node:os";
import { config } from "./config";
import { checkHcloud, getFirewall, getServer, getSSHKey } from "./hcloud";

const DOMAIN = "www.vibesbeingtransmitted.com";

async function checkDns(nameserver: string, label: string): Promise<string | null> {
	try {
		const proc = Bun.spawn(["dig", `@${nameserver}`, DOMAIN, "+short", "+time=2", "+tries=1"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		const ip = output.trim().split("\n")[0];
		return ip || null;
	} catch {
		return null;
	}
}

async function checkHttps(): Promise<{ status: number; redirect?: string } | null> {
	try {
		const proc = Bun.spawn(["curl", "-sI", "--max-time", "5", `https://${DOMAIN}/health`], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		const statusMatch = output.match(/HTTP\/\d\.?\d?\s+(\d+)/);
		const status = statusMatch ? parseInt(statusMatch[1]) : 0;
		return { status };
	} catch {
		return null;
	}
}

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

		// Check cloud-init status via SSH
		if (server.status === "running") {
			const keyPath = config.sshKeyPath.replace("~", homedir());
			const ip = server.public_net.ipv4.ip;
			try {
				const proc = Bun.spawn(
					[
						"ssh",
						"-o",
						"IdentitiesOnly=yes",
						"-i",
						keyPath,
						"-o",
						"StrictHostKeyChecking=no",
						"-o",
						"UserKnownHostsFile=/dev/null",
						"-o",
						"ConnectTimeout=5",
						`${config.deployUser}@${ip}`,
						"cloud-init status 2>/dev/null || echo 'unknown'",
					],
					{ stdout: "pipe", stderr: "pipe" }
				);
				const output = await new Response(proc.stdout).text();
				await proc.exited;
				const status = output.trim();
				console.log(`   Cloud-init: ${status}`);
			} catch {
				console.log(`   Cloud-init: (unable to connect)`);
			}
		}
	} else {
		console.log(`\n🖥️  Server: Not found`);
	}

	// DNS Status
	console.log(`\n🌐 DNS Status for ${DOMAIN}:`);
	const serverIp = server?.public_net.ipv4.ip;

	const dnsChecks = [
		{ ns: "8.8.8.8", label: "Google" },
		{ ns: "1.1.1.1", label: "Cloudflare" },
		{ ns: "9.9.9.9", label: "Quad9" },
	];

	let allResolved = true;
	let correctIp = true;

	for (const { ns, label } of dnsChecks) {
		const resolvedIp = await checkDns(ns, label);
		if (resolvedIp) {
			const matches = serverIp && resolvedIp === serverIp;
			const icon = matches ? "✓" : "⚠";
			console.log(`   ${icon} ${label} (${ns}): ${resolvedIp}${matches ? "" : ` (expected ${serverIp})`}`);
			if (!matches) correctIp = false;
		} else {
			console.log(`   ✗ ${label} (${ns}): not resolving`);
			allResolved = false;
		}
	}

	// HTTPS check (only if DNS is resolving)
	if (allResolved && correctIp) {
		console.log(`\n🔒 HTTPS Status:`);
		const https = await checkHttps();
		if (https) {
			if (https.status === 200) {
				console.log(`   ✓ https://${DOMAIN} is live (HTTP ${https.status})`);
			} else if (https.status >= 300 && https.status < 400) {
				console.log(`   → https://${DOMAIN} redirecting (HTTP ${https.status})`);
			} else {
				console.log(`   ⚠ https://${DOMAIN} returned HTTP ${https.status}`);
			}
		} else {
			console.log(`   ✗ https://${DOMAIN} not responding (SSL cert may be provisioning)`);
		}
	} else if (!allResolved) {
		console.log(`\n🔒 HTTPS Status:`);
		console.log(`   ⏳ Waiting for DNS propagation before SSL can be provisioned`);
	}

	console.log("");
}

main().catch(console.error);

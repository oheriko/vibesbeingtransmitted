#!/usr/bin/env bun
/**
 * Setup Hetzner Cloud infrastructure
 *
 * Creates:
 * 1. SSH key (if not exists)
 * 2. Firewall with proper rules
 * 3. Server with Ubuntu 24.04
 *
 * Usage: bun run infra:setup
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { $ } from "bun";
import { config } from "./config";
import { checkHcloud, getFirewall, getServer, getSSHKey, hcloud } from "./hcloud";

async function main() {
	console.log("🚀 Setting up Hetzner Cloud infrastructure\n");

	// Verify hcloud CLI
	if (!(await checkHcloud())) {
		process.exit(1);
	}

	// Step 1: SSH Key
	console.log("\n📋 Step 1: SSH Key");
	await setupSSHKey();

	// Step 2: Firewall
	console.log("\n📋 Step 2: Firewall");
	await setupFirewall();

	// Step 3: Server
	console.log("\n📋 Step 3: Server");
	await setupServer();

	// Done
	console.log("\n✅ Infrastructure setup complete!");
	console.log("\nNext steps:");
	console.log("  1. Run 'bun run infra:ssh' to connect to the server");
	console.log("  2. Run 'bun run infra:deploy' to deploy the app");
}

async function setupSSHKey(): Promise<void> {
	// Check if key exists in hcloud
	const existing = await getSSHKey(config.sshKeyName);
	if (existing) {
		console.log(`  ✓ SSH key '${config.sshKeyName}' already exists (${existing.fingerprint})`);
		return;
	}

	// Check if local key exists
	const keyPath = config.sshKeyPath.replace("~", homedir());
	const pubKeyPath = `${keyPath}.pub`;

	if (!existsSync(pubKeyPath)) {
		console.log(`  → Generating new SSH key at ${keyPath}`);
		// Use Bun.spawn for better control over arguments
		const proc = Bun.spawn(["ssh-keygen", "-t", "ed25519", "-f", keyPath, "-N", "", "-C", config.sshKeyName], {
			stdout: "inherit",
			stderr: "inherit",
		});
		await proc.exited;
		if (proc.exitCode !== 0) {
			throw new Error(`ssh-keygen failed with exit code ${proc.exitCode}`);
		}
	}

	// Upload to hcloud
	console.log(`  → Uploading SSH key to Hetzner Cloud`);
	const result = await hcloud([
		"ssh-key",
		"create",
		"--name",
		config.sshKeyName,
		"--public-key-from-file",
		pubKeyPath,
	]);

	if (!result.success) {
		console.error(`  ✗ Failed to create SSH key: ${result.error}`);
		process.exit(1);
	}

	console.log(`  ✓ SSH key '${config.sshKeyName}' created`);
}

async function setupFirewall(): Promise<void> {
	// Check if firewall exists
	const existing = await getFirewall(config.firewallName);
	if (existing) {
		console.log(`  ✓ Firewall '${config.firewallName}' already exists`);
		return;
	}

	// Create firewall
	console.log(`  → Creating firewall '${config.firewallName}'`);
	const createResult = await hcloud(["firewall", "create", "--name", config.firewallName]);

	if (!createResult.success) {
		console.error(`  ✗ Failed to create firewall: ${createResult.error}`);
		process.exit(1);
	}

	// Add rules
	const rules = [
		// Inbound rules
		{
			direction: "in",
			protocol: "tcp",
			port: String(config.ports.ssh),
			sourceIps: ["0.0.0.0/0", "::/0"],
			description: "SSH",
		},
		{
			direction: "in",
			protocol: "tcp",
			port: String(config.ports.http),
			sourceIps: ["0.0.0.0/0", "::/0"],
			description: "HTTP",
		},
		{
			direction: "in",
			protocol: "tcp",
			port: String(config.ports.https),
			sourceIps: ["0.0.0.0/0", "::/0"],
			description: "HTTPS",
		},
		{
			direction: "in",
			protocol: "icmp",
			sourceIps: ["0.0.0.0/0", "::/0"],
			description: "Ping",
		},
		// Outbound rules (allow all)
		{
			direction: "out",
			protocol: "tcp",
			port: "1-65535",
			destIps: ["0.0.0.0/0", "::/0"],
			description: "All TCP out",
		},
		{
			direction: "out",
			protocol: "udp",
			port: "1-65535",
			destIps: ["0.0.0.0/0", "::/0"],
			description: "All UDP out",
		},
		{
			direction: "out",
			protocol: "icmp",
			destIps: ["0.0.0.0/0", "::/0"],
			description: "Ping out",
		},
	];

	for (const rule of rules) {
		const args = [
			"firewall",
			"add-rule",
			config.firewallName,
			"--direction",
			rule.direction,
			"--protocol",
			rule.protocol,
		];

		if (rule.port) {
			args.push("--port", rule.port);
		}

		if (rule.sourceIps) {
			for (const ip of rule.sourceIps) {
				args.push("--source-ips", ip);
			}
		}

		if (rule.destIps) {
			for (const ip of rule.destIps) {
				args.push("--destination-ips", ip);
			}
		}

		if (rule.description) {
			args.push("--description", rule.description);
		}

		const result = await hcloud(args);
		if (!result.success) {
			console.error(`  ✗ Failed to add rule '${rule.description}': ${result.error}`);
		} else {
			console.log(`  ✓ Added rule: ${rule.description}`);
		}
	}

	console.log(`  ✓ Firewall '${config.firewallName}' configured`);
}

async function setupServer(): Promise<void> {
	// Check if server exists
	const existing = await getServer(config.serverName);
	if (existing) {
		console.log(`  ✓ Server '${config.serverName}' already exists`);
		console.log(`    IP: ${existing.public_net.ipv4.ip}`);
		console.log(`    Status: ${existing.status}`);
		return;
	}

	// Read SSH public key to embed in cloud-init
	const keyPath = config.sshKeyPath.replace("~", homedir());
	const pubKeyPath = `${keyPath}.pub`;
	const sshPubKey = existsSync(pubKeyPath) ? (await Bun.file(pubKeyPath).text()).trim() : "";

	if (!sshPubKey) {
		console.error("  ✗ SSH public key not found. Run setup again after key is created.");
		process.exit(1);
	}

	// Create cloud-init user data with security hardening
	const userData = `#cloud-config

# ===========================================
# SECURITY HARDENED CLOUD-INIT CONFIGURATION
# ===========================================

# Create non-root deploy user with sudo access
users:
  - name: deploy
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${sshPubKey}

# System packages
package_update: true
package_upgrade: true
packages:
  - curl
  - git
  - unzip
  - ufw
  - fail2ban
  - unattended-upgrades
  - apt-listchanges
  - debian-keyring
  - debian-archive-keyring
  - apt-transport-https

# Write configuration files
write_files:
  # Fail2ban SSH jail configuration
  - path: /etc/fail2ban/jail.local
    content: |
      [sshd]
      enabled = true
      port = ssh
      filter = sshd
      logpath = /var/log/auth.log
      maxretry = 3
      bantime = 3600
      findtime = 600
      banaction = iptables-multiport

  # SSH hardening configuration
  - path: /etc/ssh/sshd_config.d/hardening.conf
    content: |
      # Disable root login
      PermitRootLogin no
      # Disable password authentication (key-only)
      PasswordAuthentication no
      KbdInteractiveAuthentication no
      ChallengeResponseAuthentication no
      # Limit authentication attempts
      MaxAuthTries 3
      LoginGraceTime 30
      # Disable forwarding
      AllowTcpForwarding no
      X11Forwarding no
      AllowAgentForwarding no
      # Only allow deploy user
      AllowUsers deploy

  # Automatic security updates configuration
  - path: /etc/apt/apt.conf.d/20auto-upgrades
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
      APT::Periodic::AutocleanInterval "7";

  # Vibes systemd service (runs as deploy user)
  - path: /etc/systemd/system/vibes.service
    content: |
      [Unit]
      Description=Vibes Being Transmitted
      After=network.target

      [Service]
      Type=simple
      User=deploy
      Group=deploy
      WorkingDirectory=/opt/vibes
      ExecStart=/usr/local/bin/bun run start
      Restart=always
      RestartSec=10
      Environment=NODE_ENV=production
      EnvironmentFile=-/opt/vibes/.env

      [Install]
      WantedBy=multi-user.target

runcmd:
  # ===================
  # INSTALL BUN (ARM64)
  # ===================
  - curl -fsSL https://github.com/oven-sh/bun/releases/latest/download/bun-linux-aarch64.zip -o /tmp/bun.zip
  - unzip -o /tmp/bun.zip -d /tmp
  - mv /tmp/bun-linux-aarch64/bun /usr/local/bin/bun
  - chmod +x /usr/local/bin/bun
  - rm -rf /tmp/bun.zip /tmp/bun-linux-aarch64
  - /usr/local/bin/bun --version

  # ===================
  # INSTALL CADDY
  # ===================
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update
  - DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
  # Configure Caddy for reverse proxy (after installation)
  - |
    cat > /etc/caddy/Caddyfile << 'EOF'
    vibesbeingtransmitted.com {
        reverse_proxy localhost:3000
    }
    EOF

  # ===================
  # SETUP APP DIRECTORY
  # ===================
  - mkdir -p /opt/vibes
  - chown deploy:deploy /opt/vibes

  # ===================
  # CONFIGURE FIREWALL (UFW)
  # ===================
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow ssh
  - ufw allow http
  - ufw allow https
  - ufw --force enable

  # ===================
  # ENABLE SECURITY SERVICES
  # ===================
  - systemctl enable fail2ban
  - systemctl start fail2ban
  # Restart SSH to apply hardening (Ubuntu uses 'ssh' not 'sshd')
  - systemctl restart ssh

  # ===================
  # ENABLE APP SERVICES
  # ===================
  - systemctl daemon-reload
  - systemctl enable vibes
  - systemctl reload caddy
`;

	// Write user data to temp file
	const userDataPath = "/tmp/vibes-cloud-init.yaml";
	await Bun.write(userDataPath, userData);

	// Create server
	console.log(`  → Creating server '${config.serverName}'`);
	console.log(`    Type: ${config.serverType}`);
	console.log(`    Image: ${config.image}`);
	console.log(`    Location: ${config.location}`);

	const result = await hcloud([
		"server",
		"create",
		"--name",
		config.serverName,
		"--type",
		config.serverType,
		"--image",
		config.image,
		"--location",
		config.location,
		"--ssh-key",
		config.sshKeyName,
		"--firewall",
		config.firewallName,
		"--user-data-from-file",
		userDataPath,
		"--label",
		`project=${config.projectName}`,
	]);

	if (!result.success) {
		console.error(`  ✗ Failed to create server: ${result.error}`);
		process.exit(1);
	}

	// Get server details
	const server = await getServer(config.serverName);
	if (server) {
		console.log(`  ✓ Server '${config.serverName}' created`);
		console.log(`    IP: ${server.public_net.ipv4.ip}`);
		console.log(`    Status: ${server.status}`);
		console.log(`\n  ⏳ Cloud-init is running. Wait ~2 minutes before deploying.`);
	}
}

main().catch(console.error);

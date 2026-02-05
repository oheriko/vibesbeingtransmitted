#!/usr/bin/env bun
/**
 * Diagnose server issues
 *
 * Checks cloud-init logs and bun installation
 *
 * Usage: bun run infra:diagnose
 */

import { homedir } from "node:os";
import { config } from "./config";
import { checkHcloud, getServer } from "./hcloud";

async function main() {
	console.log("🔍 Diagnosing server issues\n");

	// Verify hcloud CLI
	if (!(await checkHcloud())) {
		process.exit(1);
	}

	// Get server IP
	const server = await getServer(config.serverName);
	if (!server) {
		console.error(`Server '${config.serverName}' not found.`);
		process.exit(1);
	}

	const ip = server.public_net.ipv4.ip;
	const keyPath = config.sshKeyPath.replace("~", homedir());
	const sshArgs = [
		"ssh",
		"-i",
		keyPath,
		"-o",
		"StrictHostKeyChecking=no",
		"-o",
		"UserKnownHostsFile=/dev/null",
		"-o",
		"ConnectTimeout=10",
		`${config.deployUser}@${ip}`,
	];

	console.log(`Server IP: ${ip}\n`);

	// Check cloud-init status
	console.log("📋 Cloud-init status:");
	const statusProc = Bun.spawn([...sshArgs, "cloud-init status --long 2>/dev/null || echo 'cloud-init not available'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const statusOutput = await new Response(statusProc.stdout).text();
	await statusProc.exited;
	console.log(statusOutput);

	// Check if bun is installed
	console.log("\n📋 Bun installation check:");
	const bunProc = Bun.spawn([...sshArgs, "which bun 2>/dev/null || echo 'bun not in PATH'; ls -la /usr/local/bin/bun 2>/dev/null || echo '/usr/local/bin/bun not found'; ls -la /root/.bun/bin/bun 2>/dev/null || echo '/root/.bun/bin/bun not found'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const bunOutput = await new Response(bunProc.stdout).text();
	await bunProc.exited;
	console.log(bunOutput);

	// Check cloud-init logs for bun installation
	console.log("\n📋 Cloud-init log (bun related):");
	const logProc = Bun.spawn([...sshArgs, "grep -i bun /var/log/cloud-init-output.log 2>/dev/null | tail -20 || echo 'No bun entries found'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const logOutput = await new Response(logProc.stdout).text();
	await logProc.exited;
	console.log(logOutput);

	// Check cloud-init errors
	console.log("\n📋 Cloud-init errors:");
	const errProc = Bun.spawn([...sshArgs, "grep -i -E '(error|fail|fatal)' /var/log/cloud-init-output.log 2>/dev/null | tail -10 || echo 'No errors found'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const errOutput = await new Response(errProc.stdout).text();
	await errProc.exited;
	console.log(errOutput);

	// Check full runcmd output
	console.log("\n📋 Full cloud-init output (last 50 lines):");
	const fullProc = Bun.spawn([...sshArgs, "tail -50 /var/log/cloud-init-output.log 2>/dev/null"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const fullOutput = await new Response(fullProc.stdout).text();
	await fullProc.exited;
	console.log(fullOutput);

	// Check for curl bun.sh output
	console.log("\n📋 Looking for bun.sh in log:");
	const bunshProc = Bun.spawn([...sshArgs, "grep -A5 'bun.sh' /var/log/cloud-init-output.log 2>/dev/null || echo 'No bun.sh found in log'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const bunshOutput = await new Response(bunshProc.stdout).text();
	await bunshProc.exited;
	console.log(bunshOutput);

	// Check architecture
	console.log("\n📋 Server architecture:");
	const archProc = Bun.spawn([...sshArgs, "uname -m && cat /etc/os-release | grep -E '^(NAME|VERSION)='"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const archOutput = await new Response(archProc.stdout).text();
	await archProc.exited;
	console.log(archOutput);

	// Check vibes service status
	console.log("\n📋 Vibes service status:");
	const svcProc = Bun.spawn([...sshArgs, "systemctl status vibes 2>&1 | head -20 || true"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const svcOutput = await new Response(svcProc.stdout).text();
	await svcProc.exited;
	console.log(svcOutput);

	// Check vibes service logs
	console.log("\n📋 Vibes service logs:");
	const logProc2 = Bun.spawn([...sshArgs, "journalctl -u vibes -n 20 --no-pager 2>&1 || true"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const logOutput2 = await new Response(logProc2.stdout).text();
	await logProc2.exited;
	console.log(logOutput2);

	// Check if .env exists
	console.log("\n📋 Check .env file:");
	const envProc = Bun.spawn([...sshArgs, "ls -la /opt/vibes/.env 2>&1 || echo '.env not found'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const envOutput = await new Response(envProc.stdout).text();
	await envProc.exited;
	console.log(envOutput);

	// Check app health endpoint
	console.log("\n📋 App health check:");
	const healthProc = Bun.spawn([...sshArgs, "curl -s http://localhost:3000/health 2>&1 || echo 'Health check failed'"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const healthOutput = await new Response(healthProc.stdout).text();
	await healthProc.exited;
	console.log(healthOutput);

	// Check Caddy status
	console.log("\n📋 Caddy status:");
	const caddyProc = Bun.spawn([...sshArgs, "systemctl status caddy 2>&1 | head -10 || true"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const caddyOutput = await new Response(caddyProc.stdout).text();
	await caddyProc.exited;
	console.log(caddyOutput);
}

main().catch(console.error);

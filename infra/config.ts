/**
 * Infrastructure configuration for Hetzner Cloud
 */

export const config = {
	// Resource naming
	projectName: "vibes",
	serverName: "vibes-prod",
	firewallName: "vibes-firewall",
	sshKeyName: "vibes-deploy",

	// Server specs
	serverType: "cx22", // 2 vCPU, 4GB RAM, 40GB SSD - good for small apps
	image: "ubuntu-24.04",
	location: "fsn1", // Falkenstein, Germany

	// Network ports
	ports: {
		ssh: 22,
		http: 80,
		https: 443,
		app: 3000, // For direct app access during development
	},

	// Paths
	sshKeyPath: "~/.ssh/vibes_deploy",
	deployUser: "root",
} as const;

export type Config = typeof config;

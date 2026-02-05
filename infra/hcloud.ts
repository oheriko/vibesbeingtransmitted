/**
 * Wrapper for hcloud CLI commands
 *
 * Uses HCLOUD_TOKEN from .env (hcloud CLI reads this natively)
 */

import { $ } from "bun";

export interface HcloudResult<T = string> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Execute hcloud command and return parsed result
 */
export async function hcloud(args: string[]): Promise<HcloudResult> {
	try {
		const result = await $`hcloud ${args}`.text();
		return { success: true, data: result.trim() };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: message };
	}
}

/**
 * Execute hcloud command and return JSON result
 */
export async function hcloudJson<T>(args: string[]): Promise<HcloudResult<T>> {
	try {
		const result = await $`hcloud ${[...args, "-o", "json"]}`.json();
		return { success: true, data: result as T };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: message };
	}
}

/**
 * Check if hcloud CLI is installed and configured
 */
export async function checkHcloud(): Promise<boolean> {
	const result = await hcloud(["version"]);
	if (!result.success) {
		console.error("hcloud CLI not found. Install with: brew install hcloud");
		return false;
	}
	console.log(`hcloud version: ${result.data}`);

	// Check for API token
	if (!process.env.HCLOUD_TOKEN) {
		console.error("HCLOUD_TOKEN not set. Add it to your .env file.");
		return false;
	}
	console.log("Using HCLOUD_TOKEN from environment");

	return true;
}

// Server types
export interface HcloudServer {
	id: number;
	name: string;
	status: string;
	public_net: {
		ipv4: { ip: string };
		ipv6: { ip: string };
	};
	server_type: { name: string };
	datacenter: { name: string };
	image: { name: string };
}

export interface HcloudSSHKey {
	id: number;
	name: string;
	fingerprint: string;
	public_key: string;
}

export interface HcloudFirewall {
	id: number;
	name: string;
	rules: Array<{
		direction: string;
		protocol: string;
		port?: string;
		source_ips?: string[];
		destination_ips?: string[];
	}>;
}

/**
 * Get server by name
 */
export async function getServer(name: string): Promise<HcloudServer | null> {
	const result = await hcloudJson<HcloudServer[]>(["server", "list"]);
	if (!result.success || !result.data?.length) return null;
	return result.data.find((s) => s.name === name) ?? null;
}

/**
 * Get SSH key by name
 */
export async function getSSHKey(name: string): Promise<HcloudSSHKey | null> {
	const result = await hcloudJson<HcloudSSHKey[]>(["ssh-key", "list"]);
	if (!result.success || !result.data?.length) return null;
	return result.data.find((k) => k.name === name) ?? null;
}

/**
 * Get firewall by name
 */
export async function getFirewall(name: string): Promise<HcloudFirewall | null> {
	const result = await hcloudJson<HcloudFirewall[]>(["firewall", "list"]);
	if (!result.success || !result.data?.length) return null;
	return result.data.find((f) => f.name === name) ?? null;
}

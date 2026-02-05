import { db, schema } from "@db/index";
import type { User } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { auth } from "../auth";

type SessionEnv = {
	Variables: {
		domainUser: User;
	};
};

/** Resolve a better-auth session cookie → domain user (our `users` table).
 *
 * Flow:
 *   session cookie → better-auth session → better-auth userId
 *   → account table (providerId="slack") → accountId = Slack user ID
 *   → users table → domain user
 */
export const requireSession: MiddlewareHandler<SessionEnv> = async (c, next) => {
	const authSession = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!authSession) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	// Look up the Slack account linked to this better-auth user
	const slackAccount = await db.query.account.findFirst({
		where: (fields, { and, eq }) =>
			and(eq(fields.userId, authSession.user.id), eq(fields.providerId, "slack")),
	});

	if (!slackAccount) {
		return c.json({ error: "No linked Slack account" }, 403);
	}

	// The accountId for Slack provider is the Slack user ID
	const domainUser = await db.query.users.findFirst({
		where: eq(schema.users.id, slackAccount.accountId),
	});

	if (!domainUser) {
		return c.json({ error: "User not found — install the Slack app first" }, 403);
	}

	c.set("domainUser", domainUser);
	await next();
};

/** Helper to get the domain user from context (after requireSession middleware) */
export function getDomainUser(c: Context<SessionEnv>): User {
	return c.get("domainUser");
}

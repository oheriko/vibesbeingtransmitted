import { db } from "@db/index";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { config } from "./config";

export const auth = betterAuth({
	baseURL: config.betterAuth.url,
	secret: config.betterAuth.secret,
	database: drizzleAdapter(db, {
		provider: "sqlite",
	}),
	socialProviders: {
		slack: {
			clientId: config.slack.clientId,
			clientSecret: config.slack.clientSecret,
		},
	},
});

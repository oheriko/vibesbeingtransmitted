import { initializeDatabase } from "@db/index";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import dashboardPage from "../client/pages/dashboard.html";
import homepage from "../client/pages/index.html";
import privacyPage from "../client/pages/privacy.html";
import supportPage from "../client/pages/support.html";
import { auth as betterAuth } from "./auth";
import { config } from "./config";
import { rateLimit } from "./middleware/rateLimit";
import { api } from "./routes/api";
import { auth } from "./routes/auth";
import { extension } from "./routes/extension";
import { slack } from "./routes/slack";
import { startPoller } from "./services/poller";

// Initialize database
initializeDatabase();
console.log("Database initialized");

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
	"/api/*",
	cors({
		origin: (origin) => {
			if (!origin) return config.appUrl;
			if (origin === config.appUrl) return origin;
			if (origin.startsWith("chrome-extension://")) return origin;
			if (origin.startsWith("moz-extension://")) return origin;
			return null;
		},
		credentials: true,
	})
);

// Rate limiting
app.use("/auth/*", rateLimit({ windowMs: 60_000, max: 10 }));
app.use("/api/auth/*", rateLimit({ windowMs: 60_000, max: 20 }));
app.use(
	"/api/extension/*",
	rateLimit({
		windowMs: 60_000,
		max: 30,
		keyFn: (c) => c.req.header("X-Extension-Token") || "anonymous",
	})
);
app.use("/api/*", rateLimit({ windowMs: 60_000, max: 100 }));

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// better-auth handler (must be before other /api/* routes)
app.on(["POST", "GET"], "/api/auth/*", (c) => betterAuth.handler(c.req.raw));

// Mount routes
app.route("/auth", auth);
app.route("/slack", slack);
app.route("/api", api);
app.route("/api/extension", extension);

// Serve static files from public/ (fonts, favicon, extension zips)
app.use("/*", serveStatic({ root: "./public" }));

// Start background poller
startPoller();

// Start server
const server = Bun.serve({
	port: config.port,
	routes: {
		"/": homepage,
		"/dashboard": dashboardPage,
		"/privacy": privacyPage,
		"/support": supportPage,
	},
	fetch: app.fetch,
});

console.log(`Server running at http://localhost:${server.port}`);

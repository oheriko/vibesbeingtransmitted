import { initializeDatabase } from "@db/index";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { config } from "./config";
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
app.use(
	"/api/*",
	cors({
		origin: "*", // Allow extension requests from any origin
		credentials: true,
	})
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount routes
app.route("/auth", auth);
app.route("/slack", slack);
app.route("/api", api);
app.route("/api/extension", extension);

// Serve static files from dist/client for production
app.use("/*", serveStatic({ root: "./dist/client" }));

// Fallback to index.html for SPA routing
app.get("/*", serveStatic({ path: "./dist/client/index.html" }));

// Start background poller
startPoller();

// Start server
const server = Bun.serve({
	port: config.port,
	fetch: app.fetch,
});

console.log(`Server running at http://localhost:${server.port}`);

export default app;

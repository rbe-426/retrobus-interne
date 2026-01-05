/* eslint-env node */
/* eslint-disable no-console */
import express from "express";
import cors from "cors";

import siteUsersRouter from "./siteUsers.js";
// Note: 'members.js' is a frontend client. Use a mock router for local Express server.
import membersRouter from "./members.router.js";
import changelogRouter from "./changelog.js";
import flashesRouter from "./flashes.js";
import subventionsRouter from "./subventions.js";

const app = express();

// --- Basics
app.use(cors());
app.use(express.json());

// --- Health
app.get("/", (_req, res) => {
  res.type("text").send("RetroServers API up");
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- API routes (JSON only)
app.use("/api/site-users", siteUsersRouter);
app.use("/api/members", membersRouter);
app.use("/api/changelog", changelogRouter);
app.use("/api/subventions", subventionsRouter);
// Flashes: public listing + admin (kept outside /api for legacy)
app.use("/", flashesRouter);

// --- 404 JSON for /api
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Route API introuvable", path: req.originalUrl });
});

// --- Global error handler (JSON only)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  res.status(500).json({ error: "Erreur serveur", details: err.message });
});

// --- Start
// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
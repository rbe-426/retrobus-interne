import { Router } from "express";

let flashes = [
  { id: "f1", title: "Maintenance serveur", message: "Redémarrage 02:00 CET", active: true, createdAt: new Date().toISOString() },
  { id: "f2", title: "Nouvelle page", message: "Photothèque RBE", active: false, createdAt: new Date().toISOString() }
];

const router = Router();

// Public: GET /flashes (actifs)
router.get("/flashes", (_req, res) => {
  res.json(flashes.filter(f => f.active));
});

// Admin: GET /flashes/all
router.get("/flashes/all", (_req, res) => {
  res.json(flashes);
});

// Admin CRUD (optional guards)
router.post("/flashes", (req, res) => {
  const { title, message, active = false } = req.body || {};
  const item = { id: `f${Date.now()}`, title, message, active: !!active, createdAt: new Date().toISOString() };
  flashes.unshift(item);
  res.status(201).json(item);
});

router.put("/flashes/:id", (req, res) => {
  const { id } = req.params;
  const idx = flashes.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: "Flash introuvable" });
  flashes[idx] = { ...flashes[idx], ...req.body };
  res.json(flashes[idx]);
});

router.delete("/flashes/:id", (req, res) => {
  const { id } = req.params;
  const before = flashes.length;
  flashes = flashes.filter(f => f.id !== id);
  if (flashes.length === before) return res.status(404).json({ error: "Flash introuvable" });
  res.json({ ok: true });
});

export default router;
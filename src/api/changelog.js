import { Router } from "express";

let changelogs = [
  {
    id: "c1",
    title: "Première release",
    version: "1.0.0",
    date: new Date().toISOString(),
    changes: ["Page d'accueil", "Module Accès sites", "Changelog CRUD"]
  }
];

const router = Router();

// GET /api/changelog
router.get("/", (_req, res) => {
  res.json(changelogs);
});

// POST /api/changelog
router.post("/", (req, res) => {
  const { title, version, date, changes } = req.body || {};
  if (!title || !version) return res.status(400).json({ error: "title et version requis" });
  const item = { id: `c${Date.now()}`, title, version, date: date || new Date().toISOString(), changes: Array.isArray(changes) ? changes : [] };
  changelogs.unshift(item);
  res.status(201).json(item);
});

// PUT /api/changelog/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const idx = changelogs.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Changelog introuvable" });
  const { title, version, date, changes } = req.body || {};
  changelogs[idx] = {
    ...changelogs[idx],
    ...(title !== undefined ? { title } : {}),
    ...(version !== undefined ? { version } : {}),
    ...(date !== undefined ? { date } : {}),
    ...(changes !== undefined ? { changes: Array.isArray(changes) ? changes : [] } : {})
  };
  res.json(changelogs[idx]);
});

// DELETE /api/changelog/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const before = changelogs.length;
  changelogs = changelogs.filter(c => c.id !== id);
  if (changelogs.length === before) return res.status(404).json({ error: "Changelog introuvable" });
  res.json({ ok: true });
});

export default router;
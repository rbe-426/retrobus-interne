import { Router } from "express";

// In-memory mock for members; replace with real DB when wiring backend
let members = [
  {
    id: "m1",
    firstName: "Alice",
    lastName: "Martin",
    email: "alice.martin@example.com",
    status: "ACTIVE",
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "m2",
    firstName: "Bob",
    lastName: "Dupont",
    email: "bob.dupont@example.com",
    status: "ACTIVE",
    joinedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const router = Router();

// GET /api/members
router.get("/", (_req, res) => {
  res.json({ members });
});

// POST /api/members
router.post("/", (req, res) => {
  const { firstName, lastName, email, status = "ACTIVE" } = req.body || {};
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }
  const now = new Date().toISOString();
  const m = {
    id: `m${Date.now()}`,
    firstName,
    lastName,
    email,
    status,
    joinedAt: now,
    updatedAt: now,
  };
  members.unshift(m);
  res.status(201).json(m);
});

// PUT /api/members/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const idx = members.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "Membre introuvable" });
  const allowed = ["firstName", "lastName", "email", "status"];
  const patch = Object.fromEntries(
    Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
  );
  members[idx] = { ...members[idx], ...patch, updatedAt: new Date().toISOString() };
  return res.json(members[idx]);
});

// DELETE /api/members/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const before = members.length;
  members = members.filter((m) => m.id !== id);
  if (before === members.length) return res.status(404).json({ error: "Membre introuvable" });
  return res.json({ ok: true });
});

export default router;

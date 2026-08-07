import { Router } from "express";

// In-memory store for demo; replace with DB/Prisma as needed
let users = [
  {
    id: "u1",
    username: "a.admin",
    firstName: "Alice",
    lastName: "Admin",
    email: "alice@example.com",
    role: "ADMIN",
    isActive: true,
    hasInternalAccess: true,
    hasExternalAccess: true,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedMember: null
  },
  {
    id: "u2",
    username: "b.membre",
    firstName: "Bob",
    lastName: "Membre",
    email: "bob@example.com",
    role: "MEMBER",
    isActive: true,
    hasInternalAccess: true,
    hasExternalAccess: false,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkedMember: null
  }
];

const router = Router();

// GET /api/site-users
router.get("/", (_req, res) => {
  res.json(users);
});

// GET /api/site-users/stats
router.get("/stats", (_req, res) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const linkedUsers = users.filter(u => !!u.linkedMember).length;
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recentLogins = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt).getTime() >= since).length;
  res.json({ totalUsers, activeUsers, linkedUsers, recentLogins });
});

// POST /api/site-users
router.post("/", (req, res) => {
  const {
    username, firstName, lastName, email, role = "MEMBER",
    hasInternalAccess = true, hasExternalAccess = false,
    linkedMemberId = null, generatePassword = true, customPassword = ""
  } = req.body || {};

  if (!username || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  const id = `u${Date.now()}`;
  const now = new Date().toISOString();
  const newUser = {
    id, username, firstName, lastName, email, role,
    isActive: true, hasInternalAccess, hasExternalAccess,
    lastLoginAt: null, createdAt: now, updatedAt: now,
    linkedMember: linkedMemberId ? { id: linkedMemberId } : null
  };
  users.unshift(newUser);

  let temporaryPassword = null;
  if (generatePassword) {
    temporaryPassword = Math.random().toString(36).slice(-10);
  } else if (customPassword) {
    temporaryPassword = customPassword;
  }

  res.status(201).json({ ...newUser, temporaryPassword });
});

// PUT /api/site-users/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Utilisateur introuvable" });

  const allowed = ["username","firstName","lastName","email","role","isActive","hasInternalAccess","hasExternalAccess"];
  const payload = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
  users[idx] = { ...users[idx], ...payload, updatedAt: new Date().toISOString() };
  return res.json(users[idx]);
});

// PATCH /api/site-users/:id
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Utilisateur introuvable" });
  users[idx] = { ...users[idx], ...req.body, updatedAt: new Date().toISOString() };
  return res.json(users[idx]);
});

// POST /api/site-users/:id/link-member
router.post("/:id/link-member", (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body || {};
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Utilisateur introuvable" });
  if (!memberId) return res.status(400).json({ error: "memberId requis" });

  users[idx].linkedMember = { id: memberId };
  users[idx].updatedAt = new Date().toISOString();
  return res.json({ ok: true, user: users[idx] });
});

export default router;
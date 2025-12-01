export const USERS = {
  "w.belaidi": {
    password: "Waiyl9134#",
    prenom: "Waiyl",
    nom: "BELAIDI",
    roles: ["ADMIN"]
  },
  "m.ravichandran": {
    password: "RBE2025",
    prenom: "Méthusan",
    nom: "RAVICHANDRAN",
    roles: ["MEMBER"]
  },
  "g.champenois": {
    password: "RBE2026",
    prenom: "Gaëlle",
    nom: "CHAMPENOIS",
    roles: ["MEMBER"]
  },
  "n.tetillon": {
    password: "RBE185C",
    prenom: "Nathan",
    nom: "TETILLON",
    roles: ["MEMBER"]
  }
};

export async function login(username, password) {
  // 1) Essai API distante si configurée ou via proxy (base peut être vide => relatif)
  const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
  const url = `${base}/auth/login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password })
    });
    if (res.ok) {
      return await res.json();
    }
    // Si l'API répond mais refuse, on essaie un fallback local uniquement en dev
    // (utile quand l'API n'est pas disponible en local)
  } catch (_e) {
    // Réseau cassé => fallback local
  }

  // 2) Fallback local (développement): vérifie contre USERS ci-dessous
  const key = String(username || '').toLowerCase();
  const found = USERS[key];
  if (!found || found.password !== password) {
    throw new Error('Échec de connexion');
  }
  return {
    token: `local-dev-token-${key}`,
    user: {
      username: key,
      // compat: fournir aussi prenom/nom
      prenom: found.prenom,
      nom: found.nom,
      firstName: found.prenom,
      lastName: found.nom,
      roles: found.roles,
    }
  };
}

// Export de l'API d'authentification
export const authAPI = {
  login,
  USERS
};

// Connexion membre (matricule/email + mot de passe interne)
export async function memberLogin(identifier, password) {
  // 1) Essai API distante si dispo
  const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
  const url = `${base}/auth/member-login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (_e) {
    // réseau KO -> fallback
  }

  // 2) Fallback local: traite l'identifiant comme un username connu
  const key = String(identifier || '').toLowerCase();
  const found = USERS[key];
  if (!found || found.password !== password) {
    throw new Error('Échec de connexion');
  }
  return {
    token: `local-dev-token-${key}`,
    user: {
      username: key,
      prenom: found.prenom,
      nom: found.nom,
      firstName: found.prenom,
      lastName: found.nom,
      roles: found.roles,
    }
  };
}

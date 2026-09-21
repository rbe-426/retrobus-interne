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
  const url = `${base}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: username, password })
    });
    if (res.ok) {
      return await res.json();
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Échec de connexion');
  } catch (error) {
    throw error;
  }
}

// Export de l'API d'authentification
export const authAPI = {
  login,
  USERS
};

// Connexion membre (matricule/email + mot de passe interne)
export async function memberLogin(identifier, password) {
  // 1️⃣ Essayer l'API distante si dispo
  const base = (import.meta?.env?.VITE_API_URL || '').replace(/\/+$/, '');
  const url = `${base}/api/auth/member-login`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    
    // Si on a une réponse, utiliser sa réponse (200 ou 401, peu importe)
    // Ne PAS tomber en fallback local si l'API a répondu
    if (res.status === 200) {
      const data = await res.json();
      if (data.token && data.user) {
        return data;
      }
    }
    
    // API a répondu mais 401 -> c'est une erreur d'auth, pas un problème réseau
    if (res.status === 401) {
      const data = await res.json();
      throw new Error(data?.error || 'Échec de connexion');
    }
    
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `HTTP ${res.status}`);
  } catch (e) {
    throw e;
  }
}

// Utilities to consistently display user and member names across the app

export function displayNameFromUser(u, { preferUpperLast = true } = {}) {
  if (!u) return 'Utilisateur';
  const first = u.firstName || u.prenom || u.given_name || '';
  const last = u.lastName || u.nom || u.family_name || '';
  const username = u.username || u.matricule || '';
  const email = u.email || '';
  const parts = [];
  if (preferUpperLast && last) parts.push(String(last).toUpperCase());
  if (first) parts.push(first);
  if (!parts.length) {
    if (last || first) return [first, last].filter(Boolean).join(' ').trim();
    if (username) return username;
    if (email) return email;
    return 'Utilisateur';
  }
  return parts.join(' ').trim();
}

export function formatMemberLabel(m) {
  if (!m) return 'Adhérent';
  const first = m.firstName || '';
  const last = m.lastName || '';
  const memberNumber = m.memberNumber || '';
  const email = m.email || '';
  const full = [last ? String(last).toUpperCase() : '', first].filter(Boolean).join(' ').trim();
  const base = full || email || memberNumber || 'Adhérent';
  return memberNumber ? `${base} - #${memberNumber}` : base;
}

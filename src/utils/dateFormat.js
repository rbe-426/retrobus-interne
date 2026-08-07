/**
 * Format date to French long format with day name
 * Example: "2026-09-22T00:00:00.000Z" → "Lundi 22 Septembre 2026"
 */
export const formatDateFrLong = (dateString) => {
  if (!dateString) return 'Date non définie';
  
  try {
    const date = new Date(dateString);
    
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const jour = jours[date.getDay()];
    const numJour = date.getDate();
    const moisText = mois[date.getMonth()];
    const annee = date.getFullYear();
    
    return `${jour} ${numJour} ${moisText} ${annee}`;
  } catch (e) {
    console.error('Erreur formatage date:', e);
    return 'Date invalide';
  }
};

/**
 * Format date to French short format
 * Example: "2026-09-22T00:00:00.000Z" → "22 Septembre 2026"
 */
export const formatDateFrShort = (dateString) => {
  if (!dateString) return 'Date non définie';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    const mois = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const numJour = date.getDate();
    const moisText = mois[date.getMonth()];
    const annee = date.getFullYear();
    
    return `${numJour} ${moisText} ${annee}`;
  } catch (e) {
    console.error('Erreur formatage date:', e);
    return 'Date invalide';
  }
};

/**
 * Format date with time
 * Example: "2026-09-22T14:30:00.000Z" → "Lundi 22 Septembre 2026 à 14h30"
 */
export const formatDateTimeFullFr = (dateString, time) => {
  const dateFormatted = formatDateFrLong(dateString);
  
  if (time) {
    // Si on a l'heure au format HH:mm, on la formate aussi
    const timeFormatted = time.replace(':', 'h');
    return `${dateFormatted} à ${timeFormatted}`;
  }
  
  return dateFormatted;
};

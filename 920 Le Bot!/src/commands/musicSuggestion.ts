const suggestions = {
  calme: [
    { title: 'Sunset Lover', artist: 'Petit Biscuit' },
    { title: 'Le temps est bon', artist: 'Bon Entendeur' },
    { title: 'Holocene', artist: 'Bon Iver' },
  ],
  energie: [
    { title: 'Feel Good Inc.', artist: 'Gorillaz' },
    { title: 'Midnight City', artist: 'M83' },
    { title: 'Lisztomania', artist: 'Phoenix' },
  ],
  retro: [
    { title: 'Voyage, voyage', artist: 'Desireless' },
    { title: 'Les démons de minuit', artist: 'Images' },
    { title: 'D.A.N.C.E.', artist: 'Justice' },
  ],
  francais: [
    { title: 'La grenade', artist: 'Clara Luciani' },
    { title: 'Le temps est bon', artist: 'Bon Entendeur' },
    { title: 'La vie ne m’apprend rien', artist: 'Liane Foly' },
  ],
} as const;

export type MusicMood = keyof typeof suggestions;

export function formatMusicSuggestion(mood: MusicMood = 'calme', random: () => number = Math.random): string {
  const options = suggestions[mood] ?? suggestions.calme;
  const suggestion = options[Math.floor(random() * options.length)] ?? options[0];
  const query = encodeURIComponent(`${suggestion.artist} ${suggestion.title}`);
  return `🎧 **À écouter · ${mood}**\n\n**${suggestion.title}** — ${suggestion.artist}\nhttps://www.youtube.com/results?search_query=${query}`;
}
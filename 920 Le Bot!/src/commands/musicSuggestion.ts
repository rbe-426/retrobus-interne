const suggestions = [
  { title: 'Midnight City', artist: 'M83' },
  { title: 'Le temps est bon', artist: 'Bon Entendeur' },
  { title: 'Dreams', artist: 'Fleetwood Mac' },
  { title: 'Sunset Lover', artist: 'Petit Biscuit' },
  { title: 'Feel Good Inc.', artist: 'Gorillaz' },
  { title: 'La grenade', artist: 'Clara Luciani' },
];

export function formatMusicSuggestion(random: () => number = Math.random): string {
  const suggestion = suggestions[Math.floor(random() * suggestions.length)] ?? suggestions[0];
  const query = encodeURIComponent(`${suggestion.artist} ${suggestion.title}`);
  return `🎧 **À écouter**\n\n**${suggestion.title}** — ${suggestion.artist}\nhttps://www.youtube.com/results?search_query=${query}`;
}
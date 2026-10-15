const suggestions = {
  rap: [
    { title: 'Basique', artist: 'Orelsan' },
    { title: 'Je danse le Mia', artist: 'IAM' },
    { title: 'Caroline', artist: 'MC Solaar' },
  ],
  rock: [
    { title: 'Song 2', artist: 'Blur' },
    { title: 'Do I Wanna Know?', artist: 'Arctic Monkeys' },
    { title: 'L’Aventurier', artist: 'Indochine' },
  ],
  electro: [
    { title: 'D.A.N.C.E.', artist: 'Justice' },
    { title: 'One More Time', artist: 'Daft Punk' },
    { title: 'Midnight City', artist: 'M83' },
  ],
  pop: [
    { title: 'La grenade', artist: 'Clara Luciani' },
    { title: 'Levitating', artist: 'Dua Lipa' },
    { title: 'As It Was', artist: 'Harry Styles' },
  ],
} as const;

export type MusicStyle = keyof typeof suggestions | 'surprends_moi';

export function formatMusicSuggestion(style: MusicStyle = 'surprends_moi', random: () => number = Math.random): string {
  const surpriseOptions = Object.values(suggestions).flat();
  const options = style === 'surprends_moi' ? surpriseOptions : suggestions[style] ?? surpriseOptions;
  const suggestion = options[Math.floor(random() * options.length)] ?? options[0];
  const query = encodeURIComponent(`${suggestion.artist} ${suggestion.title}`);
  const styleLabel = style === 'surprends_moi' ? 'Surprends-moi' : style.charAt(0).toUpperCase() + style.slice(1);
  return `🎧 **À écouter · ${styleLabel}**\n\n**${suggestion.title}** — ${suggestion.artist}\nhttps://www.youtube.com/results?search_query=${query}`;
}
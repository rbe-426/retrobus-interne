export const bot920Subcommands = ['ping', 'about', 'anniversaire', 'phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage'] as const;

export type Bot920Subcommand = typeof bot920Subcommands[number];

export interface Bot920Configuration {
  general: { name: string; description: string };
  commands: { enabled: Record<Bot920Subcommand, boolean> };
  messages: { aboutStatus: string };
  socialLinks: { website: string; instagram: string; discord: string };
  welcome: { enabled: boolean; message: string };
  logs: { enabled: boolean };
  fun: { enabled: boolean };
}

export const defaultBot920Configuration: Bot920Configuration = {
  general: { name: '920 Le Bot !', description: 'Le bot communautaire officiel de RétroBus Essonne.' },
  commands: { enabled: Object.fromEntries(bot920Subcommands.map((command) => [command, true])) as Record<Bot920Subcommand, boolean> },
  messages: { aboutStatus: 'Socle technique en cours de déploiement' },
  socialLinks: { website: '', instagram: '', discord: '' },
  welcome: { enabled: false, message: 'Bienvenue sur le serveur RétroBus Essonne !' },
  logs: { enabled: true },
  fun: { enabled: true },
};

export function isBot920CommandEnabled(configuration: Bot920Configuration, command: Bot920Subcommand): boolean {
  const funCommands: readonly Bot920Subcommand[] = ['phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage'];
  return configuration.commands.enabled[command] !== false && (!funCommands.includes(command) || configuration.fun.enabled);
}
export const bot920Subcommands = ['ping', 'about', 'anniversaire', 'phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage', 'ecouter', 'kick', 'mute', 'unmute', 'ban', 'tempban', 'unban'] as const;

export type Bot920Subcommand = typeof bot920Subcommands[number];

export interface Bot920Configuration {
  general: { name: string; description: string };
  commands: { enabled: Record<Bot920Subcommand, boolean> };
  messages: { aboutStatus: string };
  socialLinks: { website: string; instagram: string; discord: string };
  welcome: {
    welcomeEnabled: boolean;
    welcomeChannelId: string;
    welcomeMessage: string;
    autoRoleId: string;
  };
  logs: { enabled: boolean };
  fun: { enabled: boolean };
  plugins: {
    reactionRoles: { enabled: boolean };
    tickets: { enabled: boolean };
    automations: { enabled: boolean };
    pollsGiveaways: { enabled: boolean };
    reminders: { enabled: boolean };
    levels: { enabled: boolean };
    socialAlerts: { enabled: boolean };
    statisticsChannels: { enabled: boolean };
    music: { enabled: boolean };
    automod: { enabled: boolean; antiSpam: boolean; antiRaid: boolean; blockedLinks: boolean; alertChannelId: string; spamMessageLimit: number; spamWindowSeconds: number; timeoutMinutes: number; raidJoinLimit: number; raidWindowSeconds: number };
  };
}

export const defaultBot920Configuration: Bot920Configuration = {
  general: { name: '920 Le Bot !', description: 'Le bot communautaire officiel de RétroBus Essonne.' },
  commands: { enabled: Object.fromEntries(bot920Subcommands.map((command) => [command, true])) as Record<Bot920Subcommand, boolean> },
  messages: { aboutStatus: 'Socle technique en cours de déploiement' },
  socialLinks: { website: '', instagram: '', discord: '' },
  welcome: {
    welcomeEnabled: false,
    welcomeChannelId: '',
    welcomeMessage: 'Bienvenue sur le serveur RétroBus Essonne !',
    autoRoleId: '',
  },
  logs: { enabled: true },
  fun: { enabled: true },
  plugins: {
    reactionRoles: { enabled: false },
    tickets: { enabled: false },
    automations: { enabled: false },
    pollsGiveaways: { enabled: false },
    reminders: { enabled: false },
    levels: { enabled: false },
    socialAlerts: { enabled: false },
    statisticsChannels: { enabled: false },
    music: { enabled: true },
    automod: { enabled: false, antiSpam: true, antiRaid: true, blockedLinks: false, alertChannelId: '', spamMessageLimit: 6, spamWindowSeconds: 10, timeoutMinutes: 10, raidJoinLimit: 8, raidWindowSeconds: 60 },
  },
};

export function isBot920CommandEnabled(configuration: Bot920Configuration, command: Bot920Subcommand): boolean {
  const funCommands: readonly Bot920Subcommand[] = ['phrase', 'bus', 'panne', 'destin', 'controle', 'diagnostic', 'tirage', 'ecouter'];
  return configuration.commands.enabled[command] !== false && (!funCommands.includes(command) || configuration.fun.enabled);
}
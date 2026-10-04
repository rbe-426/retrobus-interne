import type { Guild, GuildMember, Message, TextBasedChannel } from 'discord.js';
import type { Bot920Configuration } from '../config/bot920Configuration.js';
import { logger } from '../utils/logger.js';

function trimToWindow(timestamps: readonly number[], now: number, windowMs: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function reachesLimit(timestamps: readonly number[], now: number, limit: number, windowSeconds: number): boolean {
  return trimToWindow(timestamps, now, windowSeconds * 1_000).length >= limit;
}

export function containsLink(content: string): boolean {
  return /https?:\/\/\S+/i.test(content);
}

export class AutoModerationService {
  private readonly messages = new Map<string, number[]>();
  private readonly joins = new Map<string, number[]>();

  constructor(private readonly getConfiguration: () => Bot920Configuration) {}

  private async notify(guild: Guild, content: string) {
    const channelId = this.getConfiguration().plugins.automod.alertChannelId;
    if (!/^\d{17,20}$/.test(channelId)) return;
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased()) await (channel as TextBasedChannel).send({ content });
  }

  async handleMessage(message: Message) {
    if (!message.inGuild() || message.author.bot) return;
    const settings = this.getConfiguration().plugins.automod;
    if (!settings.enabled) return;

    const now = Date.now();
    const key = `${message.guildId}:${message.author.id}`;
    const recent = [...trimToWindow(this.messages.get(key) ?? [], now, settings.spamWindowSeconds * 1_000), now];
    this.messages.set(key, recent);
    const spam = settings.antiSpam && recent.length >= settings.spamMessageLimit;
    const link = settings.blockedLinks && containsLink(message.content);
    if (!spam && !link) return;

    const reason = spam ? 'Anti-spam RBE' : 'Lien non autorisé détecté par RBE';
    try {
      if (message.deletable) await message.delete();
      const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
      if (member?.moderatable) await member.timeout(settings.timeoutMinutes * 60_000, reason);
      await this.notify(message.guild, `⚠️ Automodération : ${message.author} a été ${member?.moderatable ? `mute ${settings.timeoutMinutes} min` : 'signalé'} (${reason}).`);
    } catch (error) {
      logger.error('automod', 'Échec de la modération automatique', error instanceof Error ? error : undefined);
    }
  }

  async handleMemberJoin(member: GuildMember) {
    const settings = this.getConfiguration().plugins.automod;
    if (!settings.enabled || !settings.antiRaid) return;

    const now = Date.now();
    const recent = [...trimToWindow(this.joins.get(member.guild.id) ?? [], now, settings.raidWindowSeconds * 1_000), now];
    this.joins.set(member.guild.id, recent);
    if (!reachesLimit(recent, now, settings.raidJoinLimit, settings.raidWindowSeconds)) return;

    await this.notify(member.guild, `🚨 Alerte anti-raid : ${recent.length} arrivées en moins de ${settings.raidWindowSeconds} secondes. Vérifiez immédiatement le serveur.`);
  }
}
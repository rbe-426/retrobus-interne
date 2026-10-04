import type { Guild, GuildMember, Message } from 'discord.js';
import type { AutoModConfiguration, AutoModRuleConfiguration } from '../config/bot920Configuration.js';
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

function matchesWord(content: string, phrase: string, matchType: string): boolean {
  const normalizedContent = content.toLocaleLowerCase('fr-FR');
  const normalizedPhrase = phrase.toLocaleLowerCase('fr-FR');
  return matchType === 'EXACT' ? normalizedContent.trim() === normalizedPhrase : normalizedContent.includes(normalizedPhrase);
}

export class AutoModerationService {
  private readonly messages = new Map<string, number[]>();
  constructor(private readonly getConfiguration: (guildId: string) => AutoModConfiguration) {}

  private async notify(guild: Guild, channelId: string | null, content: string) {
    const validChannelId = channelId ?? '';
    if (!/^\d{17,20}$/.test(validChannelId)) return;
    const channel = await guild.channels.fetch(validChannelId).catch(() => null);
    if (channel?.isSendable()) await channel.send({ content });
  }

  private isExcepted(rule: AutoModRuleConfiguration, message: Message, member: GuildMember | null): boolean {
    return rule.exceptions.some((exception) => (
      (exception.entityType === 'MEMBER' && exception.entityId === message.author.id)
      || (exception.entityType === 'CHANNEL' && exception.entityId === message.channelId)
      || (exception.entityType === 'ROLE' && member?.roles.cache.has(exception.entityId))
    ));
  }

  private async applyRule(message: Message, member: GuildMember | null, rule: AutoModRuleConfiguration, reason: string) {
    try {
      if ((rule.action === 'DELETE' || rule.deleteMessage) && message.deletable) await message.delete();
      let timedOut = false;
      if (rule.action === 'TIMEOUT' && member?.moderatable && rule.timeoutMinutes) {
        await member.timeout(rule.timeoutMinutes * 60_000, reason);
        timedOut = true;
      }
      if (rule.notifyUser) await message.author.send(`Votre message a été modéré sur ${message.guild?.name} : ${reason}.`).catch(() => null);
      if (message.guild) await this.notify(message.guild, rule.alertChannelId, `Automodération : ${message.author} a été ${timedOut ? `timeout ${rule.timeoutMinutes} min` : 'signalé'} (${reason}).`);
    } catch (error) {
      logger.error('automod', 'Échec de la modération automatique', error instanceof Error ? error : undefined);
    }
  }

  async handleMessage(message: Message) {
    if (!message.inGuild() || message.author.bot) return;
    const configuration = this.getConfiguration(message.guildId);
    const antiSpamRule = configuration.rules.find((rule) => rule.type === 'ANTI_SPAM');
    const linkRule = configuration.rules.find((rule) => rule.type === 'LINK');
    const wordRule = configuration.rules.find((rule) => rule.type === 'WORD');
    if (!antiSpamRule && !linkRule && !wordRule) return;

    const now = Date.now();
    const key = `${message.guildId}:${message.author.id}`;
    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    const recent = [...trimToWindow(this.messages.get(key) ?? [], now, (antiSpamRule?.windowSeconds ?? 10) * 1_000), now];
    this.messages.set(key, recent);
    if (antiSpamRule && !this.isExcepted(antiSpamRule, message, member) && recent.length >= (antiSpamRule.threshold ?? 6)) {
      return this.applyRule(message, member, antiSpamRule, 'Anti-spam RBE');
    }
    if (linkRule && containsLink(message.content) && !this.isExcepted(linkRule, message, member)) {
      return this.applyRule(message, member, linkRule, 'Lien non autorisé détecté par RBE');
    }
    const word = wordRule && !this.isExcepted(wordRule, message, member)
      ? configuration.words.find((entry) => matchesWord(message.content, entry.phrase, entry.matchType))
      : undefined;
    if (word && wordRule) {
      return this.applyRule(message, member, { ...wordRule, action: word.action }, `Expression filtrée : ${word.phrase}`);
    }
  }

  async handleMemberJoin(_member: GuildMember) {}
}
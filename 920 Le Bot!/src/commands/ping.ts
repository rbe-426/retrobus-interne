import type { ChatInputCommandInteraction } from 'discord.js';
import { formatPingMessage } from './pingMessage.js';

export async function executePing(interaction: ChatInputCommandInteraction) {
  const latencyMs = Math.max(0, Date.now() - interaction.createdTimestamp);
  await interaction.reply(formatPingMessage(latencyMs));
}
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Bot920Configuration } from '../config/bot920Configuration.js';

export async function executeAbout(interaction: ChatInputCommandInteraction, configuration: Bot920Configuration) {
  const socialLinks = Object.entries(configuration.socialLinks)
    .filter(([, value]) => value)
    .map(([label, value]) => `[${label.charAt(0).toUpperCase()}${label.slice(1)}](${value})`);
  const embed = new EmbedBuilder()
    .setColor('#D30C4C')
    .setTitle(configuration.general.name)
    .setDescription(configuration.general.description)
    .addFields(
      { name: 'État', value: configuration.messages.aboutStatus, inline: false },
      ...(socialLinks.length ? [{ name: 'Liens RBE', value: socialLinks.join(' | '), inline: false }] : []),
    )
    .setFooter({ text: 'RétroBus Essonne' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
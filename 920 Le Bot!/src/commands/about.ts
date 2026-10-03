import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

export async function executeAbout(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor('#D30C4C')
    .setTitle('920 Le Bot !')
    .setDescription('Le bot communautaire officiel de RétroBus Essonne.')
    .addFields({ name: 'État', value: 'Socle technique en cours de déploiement', inline: false })
    .setFooter({ text: 'RétroBus Essonne' });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
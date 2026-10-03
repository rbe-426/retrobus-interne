import { Client, Events, GatewayIntentBits } from 'discord.js';
import type { BotCommand } from '../commands/types.js';
import { createCommandRegistry } from './commandRegistry.js';
import type { BirthdayInteractions } from './birthdays/birthdayInteractions.js';
import { logger } from '../utils/logger.js';

export function createDiscordBot(commands: readonly BotCommand[], birthdayInteractions?: BirthdayInteractions) {
  const registry = createCommandRegistry(commands);
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info('discord', `Connecté comme ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      try {
        await birthdayInteractions?.handleButton(interaction);
      } catch (error) {
        logger.error('discord', 'Échec du bouton anniversaire', error instanceof Error ? error : undefined);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      try {
        await birthdayInteractions?.handleModal(interaction);
      } catch (error) {
        logger.error('discord', 'Échec du formulaire anniversaire', error instanceof Error ? error : undefined);
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = registry.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error('discord', `Échec de /${interaction.commandName}`, error instanceof Error ? error : undefined);
      const response = { content: 'Une erreur est survenue. L’équipe RBE a été informée.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(response);
      else await interaction.reply(response);
    }
  });

  client.on(Events.Error, (error) => logger.error('discord', 'Erreur client Discord', error));

  return {
    client,
    commandCount: registry.size,
    async start(token: string) {
      await client.login(token);
    },
    async stop() {
      client.destroy();
    },
  };
}
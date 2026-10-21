import { Client, Events, GatewayIntentBits } from 'discord.js';
import type { BotCommand } from '../commands/types.js';
import { defaultBot920Configuration, type AutoModConfiguration, type Bot920Configuration } from '../config/bot920Configuration.js';
import { createCommandRegistry } from './commandRegistry.js';
import type { BirthdayInteractions } from './birthdays/birthdayInteractions.js';
import { logger } from '../utils/logger.js';
import { isDiscordSnowflake, isWelcomeEnabled, renderWelcomeMessage } from './welcome.js';
import { AutoModerationService } from './autoModeration.js';
import type { CardCollectionInteractions } from './cardCollectionInteractions.js';

export function createDiscordBot(
  commands: readonly BotCommand[],
  birthdayInteractions?: BirthdayInteractions,
  getConfiguration: (guildId?: string) => Bot920Configuration = () => defaultBot920Configuration,
  getAutoModeration: (guildId: string) => AutoModConfiguration = () => ({ rules: [], words: [] }),
  cardCollectionInteractions?: CardCollectionInteractions,
) {
  const registry = createCommandRegistry(commands);
  const commandPayload = commands.map((command) => command.data.toJSON());
  const automoderation = new AutoModerationService(getAutoModeration);
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

  const registerGuildCommands = async (guildId: string, guildName: string) => {
    try {
      await client.application?.commands.set(commandPayload, guildId);
      logger.info('commands', `Commandes synchronisées pour ${guildName} (${guildId}).`);
    } catch (error) {
      logger.error('commands', `Synchronisation impossible pour ${guildName} (${guildId})`, error instanceof Error ? error : undefined);
    }
  };

  client.once(Events.ClientReady, (readyClient) => {
    logger.info('discord', `Connecté comme ${readyClient.user.tag}`);
    for (const guild of readyClient.guilds.cache.values()) {
      void registerGuildCommands(guild.id, guild.name);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    void registerGuildCommands(guild.id, guild.name);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isStringSelectMenu()) {
      try {
        if (await cardCollectionInteractions?.handleSelectMenu(interaction)) return;
      } catch (error) {
        logger.error('discord', 'Échec du détail de carte RBE', error instanceof Error ? error : undefined);
      }
      return;
    }

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

  client.on(Events.MessageCreate, (message) => void automoderation.handleMessage(message));

  client.on(Events.GuildMemberAdd, async (member) => {
    await automoderation.handleMemberJoin(member);
    const configuration = getConfiguration(member.guild.id);
    if (!isWelcomeEnabled(configuration)) return;

    const { welcome } = configuration;
    try {
      const channel = await member.guild.channels.fetch(welcome.welcomeChannelId);
      if (!channel?.isTextBased()) {
        logger.warn('welcome', `Canal d'accueil introuvable ou non textuel (${welcome.welcomeChannelId}).`);
      } else {
        const message = renderWelcomeMessage(welcome.welcomeMessage, {
          userId: member.user.id,
          username: member.user.username,
          serverName: member.guild.name,
          memberCount: member.guild.memberCount,
        });
        await channel.send({ content: message });
      }
    } catch (error) {
      logger.error('welcome', 'Échec de l’envoi du message d’accueil', error instanceof Error ? error : undefined);
    }

    try {
      if (isDiscordSnowflake(welcome.autoRoleId)) {
        const role = member.guild.roles.cache.get(welcome.autoRoleId);
        if (role && !role.managed && role.editable) await member.roles.add(role);
        else logger.warn('welcome', `Rôle automatique indisponible ou non attribuable (${welcome.autoRoleId}).`);
      }
    } catch (error) {
      logger.error('welcome', 'Échec de l’attribution du rôle automatique', error instanceof Error ? error : undefined);
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
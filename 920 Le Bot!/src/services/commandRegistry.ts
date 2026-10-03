import type { BotCommand } from '../commands/types.js';

export function createCommandRegistry(commands: readonly BotCommand[]): ReadonlyMap<string, BotCommand> {
  const registry = new Map<string, BotCommand>();

  for (const command of commands) {
    const name = command.data.name;
    if (registry.has(name)) throw new Error(`Commande Discord dupliquée : ${name}`);
    registry.set(name, command);
  }

  return registry;
}
export interface ModeratorRole {
  roleId: string;
  name: string;
  position: number;
}

export interface ModeratorRoleRepository {
  list(guildId: string): Promise<ModeratorRole[]>;
  add(guildId: string, roleId: string, actorId: string, actorName: string): Promise<void>;
  remove(guildId: string, roleId: string, actorId: string, actorName: string): Promise<void>;
}

export function createApiModeratorRoleRepository(apiUrl?: string, serviceToken?: string): ModeratorRoleRepository {
  const baseUrl = `${String(apiUrl || '').replace(/\/$/, '')}/api/bot920`;
  const headers = { 'content-type': 'application/json', 'x-bot920-service-token': serviceToken || '' };

  return {
    async list(guildId) {
      if (!apiUrl || !serviceToken) throw new Error('Moderator role API is not configured');
      const response = await fetch(`${baseUrl}/guilds/${guildId}/moderator-roles`, { headers, signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { roles?: Array<{ roleId: string; role: { name: string; position: number } | null }> };
      return (payload.roles ?? []).flatMap((entry) => entry.role ? [{ roleId: entry.roleId, name: entry.role.name, position: entry.role.position }] : []);
    },
    async add(guildId, roleId, actorId, actorName) {
      if (!apiUrl || !serviceToken) throw new Error('Moderator role API is not configured');
      const response = await fetch(`${baseUrl}/guilds/${guildId}/moderator-roles`, {
        method: 'POST', headers,
        body: JSON.stringify({ roleId, actorId, actorName }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
    async remove(guildId, roleId, actorId, actorName) {
      if (!apiUrl || !serviceToken) throw new Error('Moderator role API is not configured');
      const query = new URLSearchParams({ actorId, actorName });
      const response = await fetch(`${baseUrl}/guilds/${guildId}/moderator-roles/${roleId}?${query}`, {
        method: 'DELETE', headers,
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    },
  };
}

import { PrismaClient } from '@prisma/client';

export interface BirthdayRecord {
  guildId: string;
  userId: string;
  displayName: string;
  birthDate: Date;
}

export interface BirthdayRepository {
  listByGuild(guildId: string): Promise<readonly BirthdayRecord[]>;
  upsert(record: BirthdayRecord): Promise<void>;
}

export interface BirthdayDatabase {
  repository: BirthdayRepository;
  disconnect(): Promise<void>;
}

export function createBirthdayDatabase(databaseUrl: string): BirthdayDatabase {
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  return {
    repository: {
      async listByGuild(guildId) {
        const records = await client.guildBirthday.findMany({ where: { guildId } });
        return records
          .map((record) => ({
            guildId: record.guildId,
            userId: record.userId,
            displayName: record.displayName,
            birthDate: record.birthDate,
          }))
          .sort((left, right) => (
            left.birthDate.getUTCMonth() - right.birthDate.getUTCMonth()
            || left.birthDate.getUTCDate() - right.birthDate.getUTCDate()
          ));
      },
      async upsert(record) {
        await client.guildBirthday.upsert({
          where: { guildId_userId: { guildId: record.guildId, userId: record.userId } },
          create: record,
          update: { displayName: record.displayName, birthDate: record.birthDate },
        });
      },
    },
    async disconnect() {
      await client.$disconnect();
    },
  };
}
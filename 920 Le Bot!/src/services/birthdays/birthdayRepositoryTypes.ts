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
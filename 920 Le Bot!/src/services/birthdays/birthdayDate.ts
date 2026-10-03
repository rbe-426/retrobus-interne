const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function parseBirthdayDate(value: string, now = new Date()): Date {
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) throw new Error('Utilise le format JJ/MM/AAAA.');

  const [, dayValue, monthValue, yearValue] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error('Cette date est invalide.');
  }

  if (date > now) throw new Error('La date de naissance ne peut pas être dans le futur.');
  if (getAge(date, now) > 120) throw new Error('Cette date de naissance paraît invalide.');

  return date;
}

export function getAge(birthDate: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const hasHadBirthday = (
    now.getUTCMonth() > birthDate.getUTCMonth()
    || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate())
  );
  if (!hasHadBirthday) age -= 1;
  return age;
}

export function formatBirthdayDate(birthDate: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(birthDate);
}
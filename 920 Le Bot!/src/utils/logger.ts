type LogDetails = Record<string, unknown> | Error | undefined;

function write(level: 'INFO' | 'WARN' | 'ERROR', scope: string, message: string, details?: LogDetails) {
  const suffix = details
    ? ` ${details instanceof Error ? details.message : JSON.stringify(details)}`
    : '';
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${message}${suffix}`;

  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (scope: string, message: string, details?: LogDetails) => write('INFO', scope, message, details),
  warn: (scope: string, message: string, details?: LogDetails) => write('WARN', scope, message, details),
  error: (scope: string, message: string, details?: LogDetails) => write('ERROR', scope, message, details),
};
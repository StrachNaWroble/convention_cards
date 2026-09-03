export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type AppLogger = {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
};

type JsonLoggerOptions = {
  level?: LogLevel;
  now?: () => Date;
};

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVEL_WEIGHT[messageLevel] >= LOG_LEVEL_WEIGHT[configuredLevel];
}

function writeLog(level: LogLevel, message: string, fields: LogFields | undefined, now: () => Date): void {
  const entry = {
    level,
    message,
    timestamp: now().toISOString(),
    ...fields,
  };
  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export function createJsonLogger({ level = "info", now = () => new Date() }: JsonLoggerOptions = {}): AppLogger {
  return {
    debug(message, fields) {
      if (shouldLog("debug", level)) {
        writeLog("debug", message, fields, now);
      }
    },
    info(message, fields) {
      if (shouldLog("info", level)) {
        writeLog("info", message, fields, now);
      }
    },
    warn(message, fields) {
      if (shouldLog("warn", level)) {
        writeLog("warn", message, fields, now);
      }
    },
    error(message, fields) {
      if (shouldLog("error", level)) {
        writeLog("error", message, fields, now);
      }
    },
  };
}

export const consoleLogger = createJsonLogger();

import { appendFileSync, existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { isPathInsideProject } from './paths';

const severity: Record<typeof config.logLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function ensureLogDirectory(): void {
  const logDirectory = path.dirname(config.logFilePath);
  mkdirSync(logDirectory, { recursive: true });

  const canonicalRoot = realpathSync(config.projectRoot);
  const canonicalDirectory = realpathSync(logDirectory);
  if (!isPathInsideProject(canonicalRoot, canonicalDirectory)) {
    throw new Error('O diretório de logs resolvido está fora da raiz do projeto.');
  }

  if (existsSync(config.logFilePath) && lstatSync(config.logFilePath).isSymbolicLink()) {
    throw new Error('O arquivo de log não pode ser um link simbólico.');
  }
}

function writeLog(level: typeof config.logLevel, message: string): void {
  if (severity[level] < severity[config.logLevel]) {
    return;
  }

  ensureLogDirectory();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  appendFileSync(config.logFilePath, `${line}\n`, 'utf8');
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = Object.freeze({
  debug: (message: string): void => writeLog('debug', message),
  info: (message: string): void => writeLog('info', message),
  warn: (message: string): void => writeLog('warn', message),
  error: (message: string): void => writeLog('error', message),
});

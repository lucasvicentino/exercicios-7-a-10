import path from 'node:path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import Joi from 'joi';
import { findProjectRoot, resolveProjectPath } from './paths';

const projectRoot = findProjectRoot(__dirname);
const dotenvResult = dotenv.config({ path: path.resolve(projectRoot, '.env') });

if (dotenvResult.error && (dotenvResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  throw dotenvResult.error;
}
if (dotenvResult.parsed) {
  dotenvExpand.expand(dotenvResult);
}

const environments = ['development', 'production', 'test'] as const;
const logLevels = ['debug', 'info', 'warn', 'error'] as const;

type NodeEnvironment = (typeof environments)[number];
type LogLevel = (typeof logLevels)[number];

interface ValidatedEnvironment {
  NODE_ENV: NodeEnvironment;
  HOST: string;
  PORT: number;
  API_KEY: string;
  API_URL: string;
  LOG_PATH: string;
  LOG_LEVEL?: LogLevel;
}

const schema: Joi.ObjectSchema<ValidatedEnvironment> = Joi.object<ValidatedEnvironment>({
  NODE_ENV: Joi.string().valid(...environments).default('development'),
  HOST: Joi.string().trim().min(1).default('127.0.0.1'),
  PORT: Joi.number().integer().min(1024).max(65535).default(3000),
  API_KEY: Joi.string().trim().min(1).required(),
  API_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  LOG_PATH: Joi.string().trim().min(1).required(),
  LOG_LEVEL: Joi.string().valid(...logLevels).optional(),
});

const validation = schema.validate({
  NODE_ENV: process.env.NODE_ENV,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  API_KEY: process.env.API_KEY,
  API_URL: process.env.API_URL,
  LOG_PATH: process.env.LOG_PATH,
  LOG_LEVEL: process.env.LOG_LEVEL,
}, { abortEarly: false });

if (validation.error) {
  const invalidNames = [...new Set(validation.error.details.map((detail) => String(detail.path[0])))];
  throw new Error(`Configuração inválida nas variáveis: ${invalidNames.join(', ')}.`);
}

const validatedEnvironment = validation.value;
const defaultLogLevel: Record<NodeEnvironment, LogLevel> = {
  development: 'debug',
  production: 'info',
  test: 'info',
};

export interface Config {
  readonly projectRoot: string;
  readonly nodeEnv: NodeEnvironment;
  readonly host: string;
  readonly port: number;
  readonly apiKey: string;
  readonly apiUrl: string;
  readonly logFilePath: string;
  readonly logLevel: LogLevel;
}

export const config: Config = Object.freeze({
  projectRoot,
  nodeEnv: validatedEnvironment.NODE_ENV,
  host: validatedEnvironment.HOST,
  port: validatedEnvironment.PORT,
  apiKey: validatedEnvironment.API_KEY,
  apiUrl: validatedEnvironment.API_URL,
  logFilePath: resolveProjectPath(projectRoot, validatedEnvironment.LOG_PATH),
  logLevel: validatedEnvironment.LOG_LEVEL ?? defaultLogLevel[validatedEnvironment.NODE_ENV],
});

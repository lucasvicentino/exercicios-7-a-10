import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../src/paths';

export interface EnvCheckResult {
  readonly missingFile: boolean;
  readonly missingKeys: string[];
  readonly emptyKeys: string[];
  readonly undocumentedKeys: string[];
}

function parseEnvFile(content: string): Map<string, string> {
  const variables = new Map<string, string>();

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) {
      variables.set(match[1], match[2].trim().replace(/^(['"])(.*)\1$/, '$2').trim());
    }
  }

  return variables;
}

export function compareEnvFiles(projectRoot: string): EnvCheckResult {
  const examplePath = path.resolve(projectRoot, '.env.example');
  const localPath = path.resolve(projectRoot, '.env');

  if (!existsSync(examplePath)) {
    throw new Error('O arquivo .env.example não foi encontrado.');
  }
  if (!existsSync(localPath)) {
    return {
      missingFile: true,
      missingKeys: [],
      emptyKeys: [],
      undocumentedKeys: [],
    };
  }

  const exampleKeys = parseEnvFile(readFileSync(examplePath, 'utf8'));
  const localKeys = parseEnvFile(readFileSync(localPath, 'utf8'));

  return {
    missingFile: false,
    missingKeys: [...exampleKeys.keys()].filter((key) => !localKeys.has(key)),
    emptyKeys: [...localKeys.entries()]
      .filter(([key, value]) => exampleKeys.has(key) && value.length === 0)
      .map(([key]) => key),
    undocumentedKeys: [...localKeys.keys()].filter((key) => !exampleKeys.has(key)),
  };
}

function main(): void {
  const projectRoot = findProjectRoot(__dirname);
  const result = compareEnvFiles(projectRoot);

  if (result.missingFile) {
    console.error('Arquivo .env local ausente. Copie .env.example para .env e preencha os valores locais.');
    process.exitCode = 1;
    return;
  }

  if (result.missingKeys.length > 0) {
    console.error(`Variáveis ausentes no .env local: ${result.missingKeys.join(', ')}.`);
  }
  if (result.emptyKeys.length > 0) {
    console.error(`Variáveis sem valor no .env local: ${result.emptyKeys.join(', ')}.`);
  }
  if (result.undocumentedKeys.length > 0) {
    console.error(`Variáveis locais não documentadas em .env.example: ${result.undocumentedKeys.join(', ')}.`);
  }

  if (result.missingKeys.length > 0 || result.emptyKeys.length > 0) {
    process.exitCode = 1;
    return;
  }

  console.log('O .env local contém as variáveis documentadas.');
}

if (require.main === module) {
  main();
}

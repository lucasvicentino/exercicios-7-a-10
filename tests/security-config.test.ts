import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import dotenvExpand from 'dotenv-expand';
import { compareEnvFiles } from '../scripts/check-env';
import { createApiRequest } from '../src/api-request';
import { isPathInsideProject, resolveProjectPath } from '../src/paths';
import { createAuthorizationHeaders, maskApiKey } from '../src/secrets';

test('mascara chaves sem exibir o valor completo', () => {
  assert.equal(maskApiKey('sample_12345678904b7e'), 'sample_1****4b7e');
  assert.equal(maskApiKey('abcd'), '****');
});

test('expande caminhos de log dependentes do ambiente', () => {
  const expanded = dotenvExpand.expand({
    parsed: {
      NODE_ENV: 'development',
      LOG_PATH: './logs/${NODE_ENV}.log',
    },
    processEnv: {},
  });

  assert.equal(expanded.parsed?.LOG_PATH, './logs/development.log');
});

test('usa Authorization e rejeita caminhos fora da raiz do projeto', () => {
  assert.deepEqual(createAuthorizationHeaders('credential'), {
    Authorization: 'Bearer credential',
  });

  const request = createApiRequest('https://api.example.com/resource', 'credential');
  assert.equal(request.headers.Authorization, 'Bearer credential');
  assert.equal(request.url.searchParams.has('key'), false);
  assert.throws(
    () => createApiRequest('https://api.example.com/resource?key=credential', 'credential'),
    /não pode incluir uma chave/,
  );

  const root = path.resolve('test-project');
  const inside = resolveProjectPath(root, './logs/development.log');
  assert.equal(isPathInsideProject(root, inside), true);
  assert.throws(() => resolveProjectPath(root, '../outside.log'), /dentro da raiz do projeto/);
  assert.equal(isPathInsideProject(root, root), false);
});

test('compara as chaves locais com o arquivo de exemplo sem retornar valores', () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'env-check-'));

  try {
    mkdirSync(temporaryRoot, { recursive: true });
    writeFileSync(path.join(temporaryRoot, '.env.example'), 'API_KEY=\nPORT=3000\nLOG_PATH=./logs/app.log\n');
    writeFileSync(path.join(temporaryRoot, '.env'), 'API_KEY=\nPORT=3001\nEXTRA=value\n');

    assert.deepEqual(compareEnvFiles(temporaryRoot), {
      missingFile: false,
      missingKeys: ['LOG_PATH'],
      emptyKeys: ['API_KEY'],
      undocumentedKeys: ['EXTRA'],
    });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('avisa quando ainda não existe um .env local', () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'env-check-'));

  try {
    writeFileSync(path.join(temporaryRoot, '.env.example'), 'API_KEY=\n');
    assert.deepEqual(compareEnvFiles(temporaryRoot), {
      missingFile: true,
      missingKeys: [],
      emptyKeys: [],
      undocumentedKeys: [],
    });
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

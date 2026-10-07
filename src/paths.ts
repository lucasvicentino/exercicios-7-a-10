import { existsSync } from 'node:fs';
import path from 'node:path';

export function findProjectRoot(startDirectory: string): string {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (
      existsSync(path.join(currentDirectory, 'package.json'))
      && existsSync(path.join(currentDirectory, '.env.example'))
    ) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error('Não foi possível localizar a raiz do projeto.');
    }
    currentDirectory = parentDirectory;
  }
}

export function isPathInsideProject(projectRoot: string, targetPath: string): boolean {
  const relativePath = path.relative(path.resolve(projectRoot), path.resolve(targetPath));
  return relativePath !== ''
    && relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

export function resolveProjectPath(projectRoot: string, configuredPath: string): string {
  const resolvedPath = path.resolve(projectRoot, configuredPath);
  if (!isPathInsideProject(projectRoot, resolvedPath)) {
    throw new Error('LOG_PATH deve apontar para um caminho dentro da raiz do projeto.');
  }
  return resolvedPath;
}

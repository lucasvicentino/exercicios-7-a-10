import { createAuthorizationHeaders } from './secrets';

export function createApiRequest(url: string, apiKey: string): { url: URL; headers: Record<string, string> } {
  const requestUrl = new URL(url);
  const hasKeyParameter = [...requestUrl.searchParams.keys()]
    .some((parameter) => parameter.toLowerCase() === 'key');

  if (hasKeyParameter) {
    throw new Error('API_URL não pode incluir uma chave na query string.');
  }

  return {
    url: requestUrl,
    headers: createAuthorizationHeaders(apiKey),
  };
}

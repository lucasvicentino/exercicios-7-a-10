export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return '*'.repeat(apiKey.length);
  }

  const visiblePrefixLength = Math.min(8, apiKey.length - 4);
  return `${apiKey.slice(0, visiblePrefixLength)}****${apiKey.slice(-4)}`;
}

export function createAuthorizationHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

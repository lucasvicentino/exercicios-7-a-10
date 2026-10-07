import { config } from './config';
import { logger } from './logger';
import { createApiRequest } from './api-request';

export async function requestApi(url: string = config.apiUrl): Promise<Response> {
  const request = createApiRequest(url, config.apiKey);
  let response: Response;

  try {
    response = await fetch(request.url, { headers: request.headers });
  } catch {
    logger.error('Falha de rede na solicitação à API; detalhes sensíveis foram omitidos.');
    throw new Error('Não foi possível comunicar com a API.');
  }

  if (!response.ok) {
    logger.error(`A API respondeu com o status HTTP ${response.status}.`);
    throw new Error(`A solicitação à API falhou com o status HTTP ${response.status}.`);
  }

  return response;
}
